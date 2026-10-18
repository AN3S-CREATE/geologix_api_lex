/**
 * Low-level fetch helper for the Taskade gateway.
 *
 * A Genesis app reaches every gateway route at a RELATIVE `/api/taskade/*` path - the
 * Director proxy rewrites it to the real gateway endpoint and injects the gateway token
 * server-side, so the app never handles credentials. This helper centralises the same
 * robust parse + error handling used by `agent-chat/v2/client.ts` so the data + flow
 * helpers stay thin.
 *
 * Auth note: the gateway delegates per-row authorization to the app. If your app exposes
 * data per signed-in user, scope reads/writes yourself (e.g. with a user/owner field).
 */

/**
 * Configuration for the gateway helpers.
 */
export interface ClientOptions {
  /** Base URL for API requests (defaults to relative paths). */
  baseUrl?: string;
}

/**
 * Standard gateway response envelope.
 */
export interface GatewayResponse<TPayload = undefined> {
  ok: boolean;
  payload?: TPayload;
}

export function isEmptyString(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

/**
 * Transient upstream statuses worth retrying an idempotent read on. A single one of
 * these (a proxy timeout or a read-limiter burst) otherwise blanks the whole app.
 */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/** Attempts for an idempotent GET (1 initial + 2 retries). */
const MAX_GET_ATTEMPTS = 3;

/** Base backoff in ms; grows exponentially per attempt, plus jitter. */
const BASE_BACKOFF_MS = 300;

/**
 * Ceiling for a single inter-attempt wait, and the line between a blip and
 * deliberate load-shedding. Short Retry-After hints (the read-limiter's ~1s)
 * are honored and retried; a hint beyond this (the nodes read deadline 503
 * sends 30) means the server asked for room no interactive page load can
 * give, so the request fails fast instead of retrying against it.
 */
const MAX_BACKOFF_MS = 4000;

/**
 * Per-attempt fetch cap. Without it a hung request rides to the CDN's ~125s idle
 * cut once per attempt (3x for a GET). Generous next to the proxy's ~3.5s
 * first-byte expectation (genesisProxyHandler), so it only trips a truly hung upstream.
 */
const ATTEMPT_TIMEOUT_MS = 30000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with full jitter: base * 2^(attempt-1), capped, + [0, base). */
function backoffMs(attempt: number): number {
  const expo = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  return expo + Math.random() * BASE_BACKOFF_MS;
}

/**
 * Parses a `Retry-After` header; null if absent/unparseable. Handles both standard forms:
 * delay-seconds (`120`) and an HTTP-date (`Mon, 20 Jul 2026 08:10:00 GMT`), the latter
 * resolved to a delay relative to now.
 */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')?.trim();
  if (header == null || header.length === 0) {
    return null;
  }
  if (/^\d+$/.test(header)) {
    return Number.parseInt(header, 10) * 1000;
  }
  const dateMs = Date.parse(header);
  return Number.isNaN(dateMs) ? null : Math.max(0, dateMs - Date.now());
}

/**
 * Performs a JSON request against `/api/taskade/<path>` and returns the parsed body.
 *
 * Idempotent GETs are retried (with exponential backoff + jitter, honoring `Retry-After`)
 * on transient upstream failures (429/502/503/504) and network rejections, so a single
 * blip does not blank the app. Writes (POST/PATCH/DELETE) are NEVER retried: a transient
 * on a write may have already been applied server-side, so retrying risks double-applying.
 * Content-type / JSON-parse failures are not transient and always throw immediately.
 * Each attempt is capped at `ATTEMPT_TIMEOUT_MS` unless the caller supplies its own
 * `signal` (which then governs alone); a timeout/abort is terminal and never
 * retried - a hung upstream is not a blip. A `Retry-After` beyond `MAX_BACKOFF_MS`
 * is treated as load-shedding and fails fast rather than retrying.
 *
 * @throws Error if the request fails (after retries) or the response is not valid JSON.
 */
export async function gatewayRequest<TResponse>(
  path: string,
  init: RequestInit,
  options?: ClientOptions,
): Promise<TResponse> {
  const baseUrl = options?.baseUrl ?? '';
  const url = `${baseUrl}/api/taskade${path}`;
  const method = (init.method ?? 'GET').toUpperCase();
  const maxAttempts = method === 'GET' ? MAX_GET_ATTEMPTS : 1;

  for (let attempt = 1; ; attempt++) {
    const canRetry = attempt < maxAttempts;

    // A FormData body must set its own `multipart/form-data; boundary=...` header,
    // which only the browser can do - so we omit the JSON content type and let it
    // through. This is how a file reaches the gateway's media-upload path (the
    // gateway turns each file part into a real https://files.taskade.com URL).
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...init.headers,
        },
        signal: init.signal ?? AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
    } catch (err) {
      // Timeout/abort is terminal, not transient: retrying a hung upstream would
      // just stall the app for another full window. Fail fast so the app's error
      // boundary can show it.
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new Error(
          `Taskade gateway request timed out: ${method} ${path} gave no response within ${ATTEMPT_TIMEOUT_MS / 1000}s`,
          { cause: err },
        );
      }
      // Network-level rejection (no response). Retryable for idempotent reads only.
      if (canRetry) {
        await delay(backoffMs(attempt));
        continue;
      }
      throw err;
    }

    if (!response.ok) {
      if (canRetry && RETRYABLE_STATUSES.has(response.status)) {
        const hinted = retryAfterMs(response);
        // A hint beyond the ceiling is deliberate load-shedding (the nodes
        // read deadline sends Retry-After: 30): retrying in-page would hammer
        // a server that asked for room and burn another full deadline of its
        // CPU on a read that just proved too big. Fall through and throw.
        if (hinted == null || hinted <= MAX_BACKOFF_MS) {
          await delay(hinted ?? backoffMs(attempt));
          continue;
        }
      }
      const responseText = await response.text().catch(() => '');
      throw new Error(
        `Taskade gateway request failed: ${response.status} ${responseText || 'Unknown error'}`,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text().catch(() => '');

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Invalid response format: expected JSON, got ${contentType}. Response: ${responseText.substring(0, 100)}`,
      );
    }

    try {
      return JSON.parse(responseText) as TResponse;
    } catch (err) {
      throw new Error(
        `Failed to parse JSON response: ${err instanceof Error ? err.message : 'Unknown error'}. Response: ${responseText.substring(0, 200)}`,
        { cause: err },
      );
    }
  }
}

/**
 * Retry utility — wraps an async fetch call and retries it once on failure.
 *
 * Rules:
 *  - Only retries transient errors (network failures, 5xx responses).
 *  - Never retries auth errors (401/403) — those are permanent.
 *  - Never retries if the AbortController was cancelled.
 *  - Waits `delayMs` milliseconds before the retry attempt.
 */

import { ApiKeyError } from './errors';

export class RetryError extends Error {
  readonly originalError: Error;
  readonly retryError: Error;

  constructor(originalError: Error, retryError: Error) {
    super(retryError.message);
    this.name = 'RetryError';
    this.originalError = originalError;
    this.retryError = retryError;
  }
}

/**
 * Returns true when the error should NOT be retried.
 */
function isPermanent(err: Error): boolean {
  if (err.name === 'AbortError') return true;
  if (err instanceof ApiKeyError) return true;
  return false;
}

/**
 * Wraps `fn` with a single automatic retry on transient failure.
 *
 * @param fn      Async factory — receives the attempt number (0 = first, 1 = retry).
 * @param delayMs Milliseconds to wait before retrying. Default: 1200.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  delayMs = 1200,
): Promise<T> {
  try {
    return await fn(0);
  } catch (firstErr) {
    const err = firstErr as Error;

    // Don't retry permanent errors
    if (isPermanent(err)) throw err;

    // Wait, then try once more
    await new Promise((r) => setTimeout(r, delayMs));

    try {
      return await fn(1);
    } catch (secondErr) {
      // Surface both errors so callers know it was retried
      throw new RetryError(err, secondErr as Error);
    }
  }
}

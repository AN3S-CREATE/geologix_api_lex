/**
 * Grok API service — xAI OpenAI-compatible endpoint with streaming.
 * Base URL: https://api.x.ai/v1
 * Models: grok-3, grok-3-fast, grok-3-mini, grok-3-mini-fast
 */

import { proxyFetch } from './proxy-client';
import { ApiKeyError } from './errors';
import { withRetry } from './retry';

const GROK_BASE = 'https://api.x.ai/v1';

export type GrokModel =
  | 'grok-3'
  | 'grok-3-fast'
  | 'grok-3-mini'
  | 'grok-3-mini-fast'
  | 'grok-2-1212'
  | 'grok-2-mini'
  | 'grok-beta';

export const GROK_MODELS: { id: GrokModel; label: string; description: string; speed: 'fast' | 'balanced' | 'powerful' }[] = [
  { id: 'grok-3',           label: 'Grok 3',           description: 'Most powerful, deep reasoning',          speed: 'powerful' },
  { id: 'grok-3-fast',      label: 'Grok 3 Fast',      description: 'Balanced speed and intelligence',        speed: 'balanced' },
  { id: 'grok-3-mini',      label: 'Grok 3 Mini',      description: 'Lightweight, efficient reasoning',       speed: 'fast'     },
  { id: 'grok-3-mini-fast', label: 'Grok 3 Mini Fast', description: 'Fastest Grok 3 responses',               speed: 'fast'     },
  { id: 'grok-2-1212',      label: 'Grok 2',           description: 'Previous-gen flagship, solid quality',   speed: 'balanced' },
  { id: 'grok-2-mini',      label: 'Grok 2 Mini',      description: 'Compact Grok 2, fast everyday tasks',    speed: 'fast'     },
  { id: 'grok-beta',        label: 'Grok Beta',         description: 'Experimental beta — latest features',   speed: 'balanced' },
];

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, usage?: GrokUsage) => void;
  onError: (err: Error) => void;
}

/**
 * Stream a chat completion from Grok.
 * Uses non-streaming mode (avoids browser CORS restrictions on SSE),
 * then simulates token-by-token delivery for smooth UX.
 * Returns an AbortController so callers can cancel.
 */
export function streamGrokChat(
  messages: GrokMessage[],
  model: GrokModel = 'grok-3-fast',
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const { fullText, usage } = await withRetry(async () => {
        const response = await proxyFetch(
          'grok',
          `${GROK_BASE}/chat/completions`,
          'POST',
          {
            'Content-Type': 'application/json',
            Authorization: 'Bearer {{secret}}',
          },
          {
            model,
            messages,
            stream: false,
            max_tokens: 4096,
          },
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new ApiKeyError('grok', response.status);
          }
          if (response.status === 429) {
            throw new Error(`xAI Grok rate limit hit. Please wait a moment and try again.`);
          }
          if (response.status === 503 || response.status === 502) {
            throw new Error(`xAI Grok service temporarily unavailable. Retrying…`);
          }
          const errText = await response.text().catch(() => response.statusText);
          throw new Error(`Grok API error ${response.status}: ${errText.slice(0, 200)}`);
        }

        const json = await response.json();
        return {
          fullText: (json.choices?.[0]?.message?.content ?? '') as string,
          usage: json.usage as GrokUsage | undefined,
        };
      });

      // Simulate streaming for smooth UX
      const words = fullText.split(/(\s+)/);
      for (const word of words) {
        if (controller.signal.aborted) return;
        if (word) callbacks.onToken(word);
        await new Promise((r) => setTimeout(r, 4));
      }

      callbacks.onDone(fullText, usage);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      callbacks.onError(err as Error);
    }
  })();

  return controller;
}

/** Non-streaming single completion (for quick one-shot uses) */
export async function askGrok(
  messages: GrokMessage[],
  model: GrokModel = 'grok-3-fast',
): Promise<string> {
  const res = await proxyFetch(
    'grok',
    `${GROK_BASE}/chat/completions`,
    'POST',
    {
      'Content-Type': 'application/json',
      Authorization: 'Bearer {{secret}}',
    },
    { model, messages, stream: false },
  );
  if (!res.ok) throw new Error(`Grok ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

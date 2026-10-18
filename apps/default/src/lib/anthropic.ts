/**
 * Anthropic Claude API service — native Messages API with streaming.
 * Uses server-sent events (SSE) via the Anthropic messages stream endpoint.
 * Models: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-3-5, claude-3-5-haiku-latest
 */

import { proxyFetch } from './proxy-client';
import { ApiKeyError } from './errors';
import { withRetry } from './retry';

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';

export type AnthropicModel =
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-5'
  | 'claude-sonnet-4-5'
  | 'claude-3-5-sonnet-latest'
  | 'claude-3-5-haiku-latest'
  | 'claude-3-opus-latest'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307';

export const ANTHROPIC_MODELS: {
  id: AnthropicModel;
  label: string;
  description: string;
  tier: 'flagship' | 'balanced' | 'fast';
}[] = [
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    description: 'Latest balanced model — strong intelligence and speed',
    tier: 'balanced',
  },
  {
    id: 'claude-opus-4-5',
    label: 'Claude Opus 4.5',
    description: 'Most intelligent — complex reasoning and nuanced tasks',
    tier: 'flagship',
  },
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    description: 'Ideal balance of intelligence and speed',
    tier: 'balanced',
  },
  {
    id: 'claude-3-5-sonnet-latest',
    label: 'Claude 3.5 Sonnet',
    description: 'Previous-gen flagship, excellent coding & analysis',
    tier: 'balanced',
  },
  {
    id: 'claude-3-5-haiku-latest',
    label: 'Claude 3.5 Haiku',
    description: 'Fast and compact, great for everyday tasks',
    tier: 'fast',
  },
  {
    id: 'claude-3-opus-latest',
    label: 'Claude 3 Opus',
    description: 'Previous-gen flagship — deep, thoughtful responses',
    tier: 'flagship',
  },
  {
    id: 'claude-3-sonnet-20240229',
    label: 'Claude 3 Sonnet',
    description: 'Claude 3 balanced model — reliable and capable',
    tier: 'balanced',
  },
  {
    id: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku',
    description: 'Lightest and fastest Claude model',
    tier: 'fast',
  },
];

export const ANTHROPIC_TIER_COLORS: Record<
  'flagship' | 'balanced' | 'fast',
  { bg: string; text: string; label: string }
> = {
  flagship: { bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'Flagship' },
  balanced: { bg: 'bg-amber-500/10',  text: 'text-amber-500',  label: 'Balanced' },
  fast:     { bg: 'bg-yellow-500/10', text: 'text-yellow-600', label: 'Fast'     },
};

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, tokens?: number) => void;
  onError: (err: Error) => void;
}

/**
 * Stream a chat completion from Anthropic Claude.
 * Uses the non-streaming /messages endpoint to avoid browser CORS issues,
 * then simulates token-by-token delivery for smooth UX.
 * Returns an AbortController so callers can cancel.
 */
export function streamAnthropicChat(
  systemPrompt: string,
  messages: AnthropicMessage[],
  model: AnthropicModel = 'claude-sonnet-4-6',
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const { fullText, totalTokens } = await withRetry(async () => {
        const response = await proxyFetch(
          'anthropic',
          `${ANTHROPIC_BASE}/messages`,
          'POST',
          {
            'Content-Type': 'application/json',
            'x-api-key': '{{secret}}',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          {
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages,
            stream: false,
          },
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new ApiKeyError('anthropic', response.status);
          }
          if (response.status === 529 || response.status === 503) {
            throw new Error(`Anthropic is temporarily overloaded. Retrying…`);
          }
          if (response.status === 429) {
            throw new Error(`Anthropic rate limit hit. Please wait a moment or switch to a faster model like Claude Haiku.`);
          }
          const errBody = await response.json().catch(() => ({}));
          const msg = errBody?.error?.message ?? response.statusText;
          if (msg.includes('not found') || msg.includes('model')) {
            throw new Error(`Anthropic: model not available in your region or plan. Try Claude 3.5 Sonnet or Claude 3 Haiku.`);
          }
          throw new Error(`Anthropic API error ${response.status}: ${msg.slice(0, 200)}`);
        }

        const json = await response.json();
        const text: string = json.content?.[0]?.text ?? '';
        const inputTokens: number = json.usage?.input_tokens ?? 0;
        const outputTokens: number = json.usage?.output_tokens ?? 0;
        return {
          fullText: text,
          totalTokens: inputTokens + outputTokens || Math.ceil(text.length / 4),
        };
      });

      // Simulate streaming for smooth UX
      const words = fullText.split(/(\s+)/);
      for (const word of words) {
        if (controller.signal.aborted) return;
        if (word) callbacks.onToken(word);
        await new Promise((r) => setTimeout(r, 4));
      }

      callbacks.onDone(fullText, totalTokens);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      callbacks.onError(err as Error);
    }
  })();

  return controller;
}

/** Non-streaming single completion */
export async function askAnthropic(
  systemPrompt: string,
  messages: AnthropicMessage[],
  model: AnthropicModel = 'claude-sonnet-4-6',
): Promise<string> {
  const res = await proxyFetch(
    'anthropic',
    `${ANTHROPIC_BASE}/messages`,
    'POST',
    {
      'Content-Type': 'application/json',
      'x-api-key': '{{secret}}',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      stream: false,
    },
  );
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const json = await res.json();
  return json.content?.[0]?.text ?? '';
}

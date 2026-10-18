/**
 * Mistral AI — OpenAI-compatible /v1/chat/completions endpoint with streaming.
 * Docs: https://docs.mistral.ai/api/
 * Base URL: https://api.mistral.ai/v1
 */

import { proxyFetch } from './proxy-client';
import { ApiKeyError } from './errors';

const MISTRAL_BASE = 'https://api.mistral.ai/v1';

// ─── Model catalogue ──────────────────────────────────────────────────────────

export type MistralModelId =
  | 'mistral-large-latest'
  | 'mistral-medium-latest'
  | 'mistral-small-latest'
  | 'mistral-nemo'
  | 'codestral-latest'
  | 'open-mistral-nemo'
  | 'open-mixtral-8x22b'
  | 'open-mixtral-8x7b'
  | 'open-mistral-7b';

export type MistralModelTier = 'flagship' | 'balanced' | 'fast' | 'coder';

export interface MistralModelMeta {
  id: MistralModelId;
  label: string;
  description: string;
  tier: MistralModelTier;
  contextWindow: string;
}

export const MISTRAL_MODELS: MistralModelMeta[] = [
  {
    id: 'mistral-large-latest',
    label: 'Mistral Large',
    description: "Mistral's most intelligent — reasoning, coding, multilingual",
    tier: 'flagship',
    contextWindow: '128K',
  },
  {
    id: 'mistral-medium-latest',
    label: 'Mistral Medium',
    description: 'Ideal balance of quality and cost',
    tier: 'balanced',
    contextWindow: '128K',
  },
  {
    id: 'mistral-small-latest',
    label: 'Mistral Small',
    description: 'Efficient and fast for everyday tasks',
    tier: 'fast',
    contextWindow: '32K',
  },
  {
    id: 'codestral-latest',
    label: 'Codestral',
    description: "Mistral's dedicated code model — 80+ languages",
    tier: 'coder',
    contextWindow: '256K',
  },
  {
    id: 'mistral-nemo',
    label: 'Mistral Nemo',
    description: '12B model trained with Nvidia, great context',
    tier: 'balanced',
    contextWindow: '128K',
  },
  {
    id: 'open-mixtral-8x22b',
    label: 'Mixtral 8×22B',
    description: 'Large open MoE — best open-weight quality',
    tier: 'flagship',
    contextWindow: '64K',
  },
  {
    id: 'open-mixtral-8x7b',
    label: 'Mixtral 8×7B',
    description: 'Classic MoE — balanced quality and speed',
    tier: 'balanced',
    contextWindow: '32K',
  },
  {
    id: 'open-mistral-nemo',
    label: 'Open Mistral Nemo',
    description: 'Free open 12B multilingual model',
    tier: 'fast',
    contextWindow: '128K',
  },
  {
    id: 'open-mistral-7b',
    label: 'Mistral 7B',
    description: 'The original open Mistral — fast and lean',
    tier: 'fast',
    contextWindow: '32K',
  },
];

export const MISTRAL_TIER_COLORS: Record<MistralModelTier, { bg: string; text: string; label: string }> = {
  flagship: { bg: 'bg-violet-500/10',  text: 'text-violet-500',  label: 'Flagship' },
  balanced: { bg: 'bg-primary/10',     text: 'text-primary',     label: 'Balanced' },
  fast:     { bg: 'bg-cyan-500/10',    text: 'text-cyan-500',    label: 'Fast'     },
  coder:    { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Coder'    },
};

// ─── Message types ────────────────────────────────────────────────────────────

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, tokens?: number) => void;
  onError: (err: Error) => void;
}

// ─── Streaming chat ───────────────────────────────────────────────────────────

/**
 * Stream a chat completion from Mistral AI.
 * Uses the OpenAI-compatible /v1/chat/completions endpoint.
 * Returns an AbortController so callers can cancel mid-stream.
 */
export function streamMistralChat(
  messages: MistralMessage[],
  modelId: MistralModelId,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await proxyFetch(
        'mistral',
        `${MISTRAL_BASE}/chat/completions`,
        'POST',
        {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {{secret}}',
        },
        {
          model: modelId,
          messages,
          stream: true,
          max_tokens: 4096,
          temperature: 0.7,
        },
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new ApiKeyError('mistral', response.status);
        }
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`Mistral API error ${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body from Mistral AI');

      const decoder = new TextDecoder();
      let fullText = '';
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              tokenCount++;
              callbacks.onToken(delta);
            }
            if (json.usage?.completion_tokens) {
              tokenCount = json.usage.completion_tokens;
            }
          } catch {
            // Partial JSON — skip
          }
        }
      }

      callbacks.onDone(fullText, tokenCount || Math.ceil(fullText.length / 4));
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      callbacks.onError(err as Error);
    }
  })();

  return controller;
}

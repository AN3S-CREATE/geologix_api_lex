/**
 * Google AI Studio — Gemini streaming service.
 * Uses the generateContent REST endpoint with server-sent events (alt=sse).
 * Docs: https://ai.google.dev/api/generate-content
 *
 * Base: https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent
 */

import { proxyFetch } from './proxy-client';
import { ApiKeyError } from './errors';
import { withRetry } from './retry';

const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Model catalogue ──────────────────────────────────────────────────────────

export type GeminiModelId =
  | 'gemini-2.5-pro-preview-06-05'
  | 'gemini-2.5-flash-preview-05-20'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-flash-8b';

export interface GeminiModelMeta {
  id: GeminiModelId;
  label: string;
  description: string;
  tier: 'flagship' | 'balanced' | 'fast';
  contextWindow: string;
}

export const GEMINI_MODELS: GeminiModelMeta[] = [
  {
    id: 'gemini-2.5-pro-preview-06-05',
    label: 'Gemini 2.5 Pro',
    description: 'Most intelligent Gemini, deep reasoning',
    tier: 'flagship',
    contextWindow: '1M',
  },
  {
    id: 'gemini-2.5-flash-preview-05-20',
    label: 'Gemini 2.5 Flash',
    description: 'Best price-performance, adaptive thinking',
    tier: 'balanced',
    contextWindow: '1M',
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    description: 'Next-gen speed, multimodal ready',
    tier: 'fast',
    contextWindow: '1M',
  },
  {
    id: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    description: 'Ultra-fast, cost-efficient responses',
    tier: 'fast',
    contextWindow: '1M',
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    description: 'Long context, complex reasoning',
    tier: 'flagship',
    contextWindow: '2M',
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    description: 'Fast and versatile, great for chat',
    tier: 'balanced',
    contextWindow: '1M',
  },
  {
    id: 'gemini-1.5-flash-8b',
    label: 'Gemini 1.5 Flash 8B',
    description: 'Smallest, highest throughput',
    tier: 'fast',
    contextWindow: '1M',
  },
];

export const GEMINI_TIER_COLORS = {
  flagship: { bg: 'bg-blue-500/10',  text: 'text-blue-500',  label: 'Flagship' },
  balanced: { bg: 'bg-primary/10',   text: 'text-primary',   label: 'Balanced' },
  fast:     { bg: 'bg-cyan-500/10',  text: 'text-cyan-500',  label: 'Fast'     },
};

// ─── Message types ────────────────────────────────────────────────────────────

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, tokens?: number) => void;
  onError: (err: Error) => void;
}

// ─── Streaming chat ───────────────────────────────────────────────────────────

/**
 * Convert our internal message history (OpenAI-style) to Gemini's `contents` format.
 * System prompt is handled via `systemInstruction`.
 */
function buildContents(messages: GeminiMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));
}

/**
 * Stream a Gemini chat completion.
 * Uses the non-streaming generateContent endpoint to avoid browser CORS issues,
 * then simulates token-by-token delivery for smooth UX.
 * Returns an AbortController so callers can cancel.
 */
export function streamGeminiChat(
  systemPrompt: string,
  messages: GeminiMessage[],
  model: GeminiModelId = 'gemini-2.0-flash',
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const { fullText, totalTokens } = await withRetry(async () => {
        const url = `${GOOGLE_BASE}/${model}:generateContent?key={{secret}}`;

        const body: Record<string, unknown> = {
          contents: buildContents(messages),
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.7,
          },
        };

        if (systemPrompt && systemPrompt.trim()) {
          body.systemInstruction = {
            parts: [{ text: systemPrompt }],
          };
        }

        const response = await proxyFetch(
          'google',
          url,
          'POST',
          { 'Content-Type': 'application/json' },
          body,
        );

        if (!response.ok) {
          if (response.status === 400) {
            const errBody = await response.json().catch(() => ({}));
            const msg = errBody?.error?.message ?? 'Bad request';
            // API key format mismatch — common issue
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
              throw new ApiKeyError('google', 400);
            }
            throw new Error(`Google AI error: ${msg}`);
          }
          if (response.status === 401 || response.status === 403) {
            throw new ApiKeyError('google', response.status);
          }
          if (response.status === 429) {
            throw new Error(`Google AI rate limit or quota exceeded. Try again in a moment or switch to a smaller model.`);
          }
          const errText = await response.text().catch(() => response.statusText);
          throw new Error(`Google AI error ${response.status}: ${errText.slice(0, 200)}`);
        }

        const json = await response.json();

        // Handle safety blocks
        const finishReason = json?.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') {
          throw new Error(`Google Gemini blocked this response due to safety filters. Try rephrasing your message.`);
        }

        const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (!text && finishReason !== 'STOP') {
          throw new Error(`Google Gemini returned an empty response (finish reason: ${finishReason ?? 'unknown'}). Try a different model.`);
        }
        return {
          fullText: text,
          totalTokens: (json?.usageMetadata?.promptTokenCount ?? 0) + (json?.usageMetadata?.candidatesTokenCount ?? 0) || Math.ceil(text.length / 4),
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

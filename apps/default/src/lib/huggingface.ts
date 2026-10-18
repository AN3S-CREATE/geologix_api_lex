/**
 * HuggingFace Inference API — OpenAI-compatible /v1/chat/completions endpoint.
 * Supports streaming via SSE exactly like the Grok service.
 * Docs: https://huggingface.co/docs/api-inference/tasks/chat-completion
 */

import { proxyFetch } from './proxy-client';
import { ApiKeyError } from './errors';
import { withRetry } from './retry';

const HF_BASE = 'https://api-inference.huggingface.co/v1';

export type HFModelId =
  | 'meta-llama/Meta-Llama-3.1-8B-Instruct'
  | 'meta-llama/Meta-Llama-3.1-70B-Instruct'
  | 'meta-llama/Llama-3.2-3B-Instruct'
  | 'meta-llama/Llama-3.2-11B-Vision-Instruct'
  | 'meta-llama/CodeLlama-34b-Instruct-hf'
  | 'mistralai/Mistral-7B-Instruct-v0.3'
  | 'mistralai/Mistral-Nemo-Instruct-2407'
  | 'mistralai/Mixtral-8x7B-Instruct-v0.1'
  | 'Qwen/Qwen2.5-72B-Instruct'
  | 'Qwen/Qwen2.5-7B-Instruct'
  | 'Qwen/Qwen2.5-Coder-32B-Instruct'
  | 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B'
  | 'microsoft/Phi-3.5-mini-instruct'
  | 'microsoft/phi-4'
  | 'HuggingFaceH4/zephyr-7b-beta'
  | 'google/gemma-2-9b-it'
  | 'google/gemma-2-27b-it';

export interface HFModelMeta {
  id: HFModelId;
  label: string;
  description: string;
  tier: 'flagship' | 'balanced' | 'fast' | 'coder';
  org: 'Meta' | 'Mistral' | 'Qwen' | 'Microsoft' | 'HuggingFace' | 'Google' | 'DeepSeek';
}

export const HF_MODELS: HFModelMeta[] = [
  // ── Meta ──────────────────────────────────────────────────────────────────
  {
    id: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    label: 'Llama 3.1 70B',
    description: "Meta's flagship open model — powerful & precise",
    tier: 'flagship',
    org: 'Meta',
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    label: 'Llama 3.1 8B',
    description: 'Fast, lightweight Llama variant',
    tier: 'fast',
    org: 'Meta',
  },
  {
    id: 'meta-llama/Llama-3.2-3B-Instruct',
    label: 'Llama 3.2 3B',
    description: 'Ultra-compact latest Llama, great on-device',
    tier: 'fast',
    org: 'Meta',
  },
  {
    id: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
    label: 'Llama 3.2 11B Vision',
    description: 'Multimodal Llama with image understanding',
    tier: 'balanced',
    org: 'Meta',
  },
  {
    id: 'meta-llama/CodeLlama-34b-Instruct-hf',
    label: 'CodeLlama 34B',
    description: 'Meta\'s specialized code generation model',
    tier: 'coder',
    org: 'Meta',
  },
  // ── Mistral ───────────────────────────────────────────────────────────────
  {
    id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    label: 'Mixtral 8×7B',
    description: 'Mixture-of-experts, balanced quality',
    tier: 'flagship',
    org: 'Mistral',
  },
  {
    id: 'mistralai/Mistral-Nemo-Instruct-2407',
    label: 'Mistral Nemo 12B',
    description: '12B model trained with Nvidia — multilingual',
    tier: 'balanced',
    org: 'Mistral',
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    label: 'Mistral 7B',
    description: 'Efficient instruct model from Mistral',
    tier: 'fast',
    org: 'Mistral',
  },
  // ── Qwen ──────────────────────────────────────────────────────────────────
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    label: 'Qwen 2.5 72B',
    description: "Alibaba's top-tier multilingual model",
    tier: 'flagship',
    org: 'Qwen',
  },
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    label: 'Qwen 2.5 Coder 32B',
    description: 'Top open-source code generation model',
    tier: 'coder',
    org: 'Qwen',
  },
  {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    label: 'Qwen 2.5 7B',
    description: 'Compact Qwen — fast and multilingual',
    tier: 'fast',
    org: 'Qwen',
  },
  // ── DeepSeek ──────────────────────────────────────────────────────────────
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    label: 'DeepSeek R1 Distill 32B',
    description: 'R1 reasoning distilled into compact Qwen',
    tier: 'flagship',
    org: 'DeepSeek',
  },
  // ── Microsoft ─────────────────────────────────────────────────────────────
  {
    id: 'microsoft/phi-4',
    label: 'Phi-4 14B',
    description: "Microsoft's latest SLM — punches above its weight",
    tier: 'balanced',
    org: 'Microsoft',
  },
  {
    id: 'microsoft/Phi-3.5-mini-instruct',
    label: 'Phi-3.5 Mini',
    description: "Microsoft's tiny but capable SLM",
    tier: 'fast',
    org: 'Microsoft',
  },
  // ── Google ────────────────────────────────────────────────────────────────
  {
    id: 'google/gemma-2-27b-it',
    label: 'Gemma 2 27B',
    description: "Google's large open instruct model",
    tier: 'flagship',
    org: 'Google',
  },
  {
    id: 'google/gemma-2-9b-it',
    label: 'Gemma 2 9B',
    description: "Google's compact open instruct model",
    tier: 'balanced',
    org: 'Google',
  },
  // ── HuggingFace ───────────────────────────────────────────────────────────
  {
    id: 'HuggingFaceH4/zephyr-7b-beta',
    label: 'Zephyr 7B',
    description: 'HuggingFace fine-tuned chat model',
    tier: 'fast',
    org: 'HuggingFace',
  },
];

export interface HFMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, tokens?: number) => void;
  onError: (err: Error) => void;
}

/**
 * Stream a chat completion from HuggingFace.
 * Uses non-streaming mode to avoid browser CORS issues with SSE,
 * then simulates token-by-token delivery for smooth UX.
 * Returns an AbortController so callers can cancel.
 */
export function streamHFChat(
  messages: HFMessage[],
  modelId: HFModelId,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const { fullText, tokenCount } = await withRetry(async () => {
        const response = await proxyFetch(
          'huggingface',
          `${HF_BASE}/chat/completions`,
          'POST',
          {
            'Content-Type': 'application/json',
            Authorization: 'Bearer {{secret}}',
          },
          {
            model: modelId,
            messages,
            stream: false,
            max_tokens: 4096,
            temperature: 0.7,
          },
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new ApiKeyError('huggingface', response.status);
          }
          // 503 = model is loading (cold start) — treat as transient
          if (response.status === 503) {
            throw new Error(`HuggingFace model is loading (cold start). Retrying…`);
          }
          // 429 = rate limit
          if (response.status === 429) {
            throw new Error(`HuggingFace rate limit hit. Please wait a moment and try again.`);
          }
          const errText = await response.text().catch(() => response.statusText);
          // Some models require Pro subscription
          if (errText.includes('not supported') || errText.includes('subscription')) {
            throw new Error(`This HuggingFace model requires a Pro subscription. Try a smaller model like Llama 3.1 8B or Mistral 7B.`);
          }
          throw new Error(`HuggingFace API error ${response.status}: ${errText.slice(0, 200)}`);
        }

        const json = await response.json();
        const text: string = json.choices?.[0]?.message?.content ?? '';
        return {
          fullText: text,
          tokenCount: json.usage?.completion_tokens ?? Math.ceil(text.length / 4),
        };
      });

      // Simulate streaming for smooth UX
      const words = fullText.split(/(\s+)/);
      for (const word of words) {
        if (controller.signal.aborted) return;
        if (word) callbacks.onToken(word);
        await new Promise((r) => setTimeout(r, 4));
      }

      callbacks.onDone(fullText, tokenCount);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      callbacks.onError(err as Error);
    }
  })();

  return controller;
}

/** ORG → colour mapping for badge styling */
export const ORG_COLORS: Record<HFModelMeta['org'], { bg: string; text: string }> = {
  Meta:         { bg: 'bg-blue-500/10',    text: 'text-blue-500'    },
  Mistral:      { bg: 'bg-orange-500/10',  text: 'text-orange-500'  },
  Qwen:         { bg: 'bg-purple-500/10',  text: 'text-purple-500'  },
  Microsoft:    { bg: 'bg-sky-500/10',     text: 'text-sky-500'     },
  HuggingFace:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-600'  },
  Google:       { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  DeepSeek:     { bg: 'bg-indigo-500/10',  text: 'text-indigo-500'  },
};

export const TIER_COLORS = {
  flagship: { bg: 'bg-purple-500/10',  text: 'text-purple-500',  label: 'Flagship' },
  balanced: { bg: 'bg-primary/10',     text: 'text-primary',     label: 'Balanced' },
  fast:     { bg: 'bg-cyan-500/10',    text: 'text-cyan-500',    label: 'Fast'     },
  coder:    { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Coder'    },
};

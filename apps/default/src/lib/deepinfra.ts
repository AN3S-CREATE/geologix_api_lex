/**
 * DeepInfra Inference API — OpenAI-compatible /v1/chat/completions endpoint.
 * Docs: https://deepinfra.com/docs/advanced/openai_api
 * Base: https://api.deepinfra.com/v1/openai
 */

import { proxyFetch } from './proxy-client';
import { ApiKeyError } from './errors';
import { withRetry } from './retry';

const DI_BASE = 'https://api.deepinfra.com/v1/openai';

// ─── Model catalogue ──────────────────────────────────────────────────────────

export type DeepInfraModelId =
  // Meta Llama
  | 'meta-llama/Meta-Llama-3.1-405B-Instruct'
  | 'meta-llama/Meta-Llama-3.3-70B-Instruct'
  | 'meta-llama/Meta-Llama-3.1-8B-Instruct'
  | 'meta-llama/Llama-3.2-3B-Instruct'
  | 'meta-llama/Llama-3.2-11B-Vision-Instruct'
  | 'meta-llama/CodeLlama-70b-Instruct-hf'
  // DeepSeek
  | 'deepseek-ai/DeepSeek-R1'
  | 'deepseek-ai/DeepSeek-R1-0528'
  | 'deepseek-ai/DeepSeek-V3'
  | 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B'
  | 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B'
  // Qwen
  | 'Qwen/Qwen2.5-72B-Instruct'
  | 'Qwen/Qwen2.5-7B-Instruct'
  | 'Qwen/QwQ-32B'
  | 'Qwen/Qwen2.5-Coder-32B-Instruct'
  // Mistral
  | 'mistralai/Mistral-7B-Instruct-v0.3'
  | 'mistralai/Mixtral-8x22B-Instruct-v0.1'
  | 'mistralai/Mistral-Nemo-Instruct-2407'
  // Microsoft
  | 'microsoft/WizardLM-2-8x22B'
  | 'microsoft/phi-4'
  | 'microsoft/Phi-3-medium-4k-instruct'
  // Google
  | 'google/gemma-2-27b-it'
  | 'google/gemma-2-9b-it';

export type DeepInfraModelTier = 'flagship' | 'balanced' | 'fast' | 'coder';
export type DeepInfraModelOrg =
  | 'Meta' | 'DeepSeek' | 'Qwen' | 'Mistral' | 'Microsoft' | 'Google';

export interface DeepInfraModelMeta {
  id: DeepInfraModelId;
  label: string;
  description: string;
  tier: DeepInfraModelTier;
  org: DeepInfraModelOrg;
  params?: string; // e.g. "405B"
}

export const DEEPINFRA_MODELS: DeepInfraModelMeta[] = [
  // ── Meta ──────────────────────────────────────────────────────────────────
  {
    id: 'meta-llama/Meta-Llama-3.1-405B-Instruct',
    label: 'Llama 3.1 405B',
    description: "Meta's largest open model — near-GPT-4 quality",
    tier: 'flagship',
    org: 'Meta',
    params: '405B',
  },
  {
    id: 'meta-llama/Meta-Llama-3.3-70B-Instruct',
    label: 'Llama 3.3 70B',
    description: 'Latest Llama, excellent all-rounder',
    tier: 'balanced',
    org: 'Meta',
    params: '70B',
  },
  {
    id: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    label: 'Llama 3.1 8B',
    description: 'Lightweight, very fast Llama variant',
    tier: 'fast',
    org: 'Meta',
    params: '8B',
  },
  {
    id: 'meta-llama/Llama-3.2-3B-Instruct',
    label: 'Llama 3.2 3B',
    description: 'Ultra-compact latest Llama — fast & efficient',
    tier: 'fast',
    org: 'Meta',
    params: '3B',
  },
  {
    id: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
    label: 'Llama 3.2 11B Vision',
    description: 'Multimodal Llama with image understanding',
    tier: 'balanced',
    org: 'Meta',
    params: '11B',
  },
  {
    id: 'meta-llama/CodeLlama-70b-Instruct-hf',
    label: 'CodeLlama 70B',
    description: "Meta's largest code generation model",
    tier: 'coder',
    org: 'Meta',
    params: '70B',
  },
  // ── DeepSeek ──────────────────────────────────────────────────────────────
  {
    id: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek R1',
    description: 'Chain-of-thought reasoning powerhouse',
    tier: 'flagship',
    org: 'DeepSeek',
    params: '671B',
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-0528',
    label: 'DeepSeek R1 (May 28)',
    description: 'Latest R1 update — improved reasoning',
    tier: 'flagship',
    org: 'DeepSeek',
    params: '671B',
  },
  {
    id: 'deepseek-ai/DeepSeek-V3',
    label: 'DeepSeek V3',
    description: 'Balanced MoE model, strong at coding & math',
    tier: 'balanced',
    org: 'DeepSeek',
    params: '685B',
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
    label: 'DeepSeek R1 Distill 70B',
    description: 'R1 reasoning distilled into 70B Llama',
    tier: 'balanced',
    org: 'DeepSeek',
    params: '70B',
  },
  {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    label: 'DeepSeek R1 Distill 32B',
    description: 'Compact R1 reasoning in Qwen base',
    tier: 'balanced',
    org: 'DeepSeek',
    params: '32B',
  },
  // ── Qwen ──────────────────────────────────────────────────────────────────
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    label: 'Qwen 2.5 72B',
    description: "Alibaba's top multilingual instruct model",
    tier: 'flagship',
    org: 'Qwen',
    params: '72B',
  },
  {
    id: 'Qwen/QwQ-32B',
    label: 'QwQ 32B',
    description: 'Deep reasoning model rivalling o1',
    tier: 'flagship',
    org: 'Qwen',
    params: '32B',
  },
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    label: 'Qwen 2.5 Coder 32B',
    description: 'State-of-the-art open code model',
    tier: 'coder',
    org: 'Qwen',
    params: '32B',
  },
  {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    label: 'Qwen 2.5 7B',
    description: 'Compact Qwen — fast and multilingual',
    tier: 'fast',
    org: 'Qwen',
    params: '7B',
  },
  // ── Mistral ───────────────────────────────────────────────────────────────
  {
    id: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
    label: 'Mixtral 8×22B',
    description: 'Large MoE, great instruction following',
    tier: 'flagship',
    org: 'Mistral',
    params: '8×22B',
  },
  {
    id: 'mistralai/Mistral-Nemo-Instruct-2407',
    label: 'Mistral Nemo 12B',
    description: '12B model trained with Nvidia — multilingual',
    tier: 'balanced',
    org: 'Mistral',
    params: '12B',
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    label: 'Mistral 7B',
    description: 'Efficient, fast, solid quality',
    tier: 'fast',
    org: 'Mistral',
    params: '7B',
  },
  // ── Microsoft ─────────────────────────────────────────────────────────────
  {
    id: 'microsoft/WizardLM-2-8x22B',
    label: 'WizardLM 2 8×22B',
    description: 'Best-in-class complex instruction model',
    tier: 'flagship',
    org: 'Microsoft',
    params: '8×22B',
  },
  {
    id: 'microsoft/phi-4',
    label: 'Phi-4',
    description: "Microsoft's latest SLM — punches above its weight",
    tier: 'balanced',
    org: 'Microsoft',
    params: '14B',
  },
  {
    id: 'microsoft/Phi-3-medium-4k-instruct',
    label: 'Phi-3 Medium',
    description: "Microsoft's mid-size SLM, fast and capable",
    tier: 'fast',
    org: 'Microsoft',
    params: '14B',
  },
  // ── Google ────────────────────────────────────────────────────────────────
  {
    id: 'google/gemma-2-27b-it',
    label: 'Gemma 2 27B',
    description: "Google's large open instruct model",
    tier: 'flagship',
    org: 'Google',
    params: '27B',
  },
  {
    id: 'google/gemma-2-9b-it',
    label: 'Gemma 2 9B',
    description: "Google's compact open instruct model",
    tier: 'balanced',
    org: 'Google',
    params: '9B',
  },
];

// ─── Colour maps ──────────────────────────────────────────────────────────────

export const DI_ORG_COLORS: Record<DeepInfraModelOrg, { bg: string; text: string }> = {
  Meta:      { bg: 'bg-blue-500/10',    text: 'text-blue-500'    },
  DeepSeek:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-500'  },
  Qwen:      { bg: 'bg-purple-500/10',  text: 'text-purple-500'  },
  Mistral:   { bg: 'bg-orange-500/10',  text: 'text-orange-500'  },
  Microsoft: { bg: 'bg-sky-500/10',     text: 'text-sky-500'     },
  Google:    { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
};

export const DI_TIER_COLORS: Record<DeepInfraModelTier, { bg: string; text: string; label: string }> = {
  flagship: { bg: 'bg-purple-500/10',  text: 'text-purple-500',  label: 'Flagship' },
  balanced: { bg: 'bg-primary/10',     text: 'text-primary',     label: 'Balanced' },
  fast:     { bg: 'bg-cyan-500/10',    text: 'text-cyan-500',    label: 'Fast'     },
  coder:    { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Coder'    },
};

// ─── Message types ────────────────────────────────────────────────────────────

export interface DeepInfraMessage {
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
 * Stream a chat completion from DeepInfra.
 * Uses non-streaming mode to avoid browser CORS issues with SSE,
 * then simulates token-by-token delivery for smooth UX.
 * Returns an AbortController so callers can cancel.
 */
export function streamDeepInfraChat(
  messages: DeepInfraMessage[],
  modelId: DeepInfraModelId,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const { fullText, tokenCount } = await withRetry(async () => {
        const response = await proxyFetch(
          'deepinfra',
          `${DI_BASE}/chat/completions`,
          'POST',
          {
            'Content-Type': 'application/json',
            Authorization: 'Bearer {{secret}}',
          },
          {
            model: modelId,
            messages,
            stream: false,
            max_tokens: 8192,
            temperature: 0.7,
          },
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new ApiKeyError('deepinfra', response.status);
          }
          if (response.status === 404) {
            throw new Error(`DeepInfra: model "${modelId}" not found or unavailable. Try a different model.`);
          }
          if (response.status === 429) {
            throw new Error(`DeepInfra rate limit hit. Please wait a moment and try again.`);
          }
          if (response.status === 503 || response.status === 502) {
            throw new Error(`DeepInfra service temporarily unavailable. Retrying…`);
          }
          const errText = await response.text().catch(() => response.statusText);
          throw new Error(`DeepInfra API error ${response.status}: ${errText.slice(0, 200)}`);
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

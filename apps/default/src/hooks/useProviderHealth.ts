/**
 * useProviderHealth — shared hook for provider API key health checks.
 *
 * • Runs all checks once on first mount (app load)
 * • Re-runs automatically every AUTO_PING_INTERVAL_S seconds
 * • Exposes per-provider status so any component can read it
 * • Singleton-ish via module-level cache so the panel and picker
 *   share the same state without duplicate fetches
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { proxyFetch } from '../lib/proxy-client';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUTO_PING_INTERVAL_S = 300; // 5 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthStatus = 'idle' | 'checking' | 'ok' | 'error';

export interface ProviderHealthState {
  id: string;
  name: string;
  logo: string;
  color: string;
  accent: string;
  status: HealthStatus;
  latencyMs: number | null;
  error: string | null;
  model: string;
  note: string;
  changed: boolean;
}

// ─── Ping implementations ─────────────────────────────────────────────────────

async function pingGrok(): Promise<void> {
  const res = await proxyFetch(
    'grok',
    'https://api.x.ai/v1/chat/completions',
    'POST',
    {
      'Content-Type': 'application/json',
      Authorization: 'Bearer {{secret}}',
    },
    {
      model: 'grok-3-mini-fast',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
  }
}

async function pingHuggingFace(): Promise<void> {
  const res = await proxyFetch(
    'huggingface',
    'https://api-inference.huggingface.co/v1/chat/completions',
    'POST',
    {
      'Content-Type': 'application/json',
      Authorization: 'Bearer {{secret}}',
    },
    {
      model: 'mistralai/Mistral-7B-Instruct-v0.3',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
  }
}

async function pingGoogle(): Promise<void> {
  const res = await proxyFetch(
    'google',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={{secret}}',
    'POST',
    { 'Content-Type': 'application/json' },
    {
      contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
      generationConfig: { maxOutputTokens: 1 },
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
  }
}

async function pingDeepInfra(): Promise<void> {
  const res = await proxyFetch(
    'deepinfra',
    'https://api.deepinfra.com/v1/openai/chat/completions',
    'POST',
    {
      'Content-Type': 'application/json',
      Authorization: 'Bearer {{secret}}',
    },
    {
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
  }
}

async function pingAnthropic(): Promise<void> {
  const res = await proxyFetch(
    'anthropic',
    'https://api.anthropic.com/v1/messages',
    'POST',
    {
      'Content-Type': 'application/json',
      'x-api-key': '{{secret}}',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${body ? ': ' + body.slice(0, 120) : ''}`);
  }
}

// ─── Provider definitions ─────────────────────────────────────────────────────

type PingFn = () => Promise<void>;

interface ProviderDef {
  id: string;
  name: string;
  logo: string;
  color: string;
  accent: string;
  model: string;
  note: string;
  ping: PingFn;
}

export const PROVIDER_DEFS: ProviderDef[] = [
  {
    id: 'grok',
    name: 'xAI Grok',
    logo: '⚡',
    color: 'from-indigo-500/10 to-indigo-600/5',
    accent: 'text-indigo-400 border-indigo-500/30',
    model: 'grok-3-mini-fast',
    note: 'OpenAI-compatible',
    ping: pingGrok,
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    logo: '🤗',
    color: 'from-yellow-500/10 to-amber-600/5',
    accent: 'text-yellow-400 border-yellow-500/30',
    model: 'Mistral-7B-v0.3',
    note: 'Inference API',
    ping: pingHuggingFace,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    logo: '🔵',
    color: 'from-blue-500/10 to-cyan-600/5',
    accent: 'text-blue-400 border-blue-500/30',
    model: 'gemini-flash-latest',
    note: 'generateContent REST',
    ping: pingGoogle,
  },
  {
    id: 'deepinfra',
    name: 'DeepInfra',
    logo: '🟣',
    color: 'from-purple-500/10 to-purple-600/5',
    accent: 'text-purple-400 border-purple-500/30',
    model: 'Meta-Llama-3.1-8B',
    note: 'OpenAI-compatible',
    ping: pingDeepInfra,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    logo: '🟠',
    color: 'from-orange-500/10 to-orange-600/5',
    accent: 'text-orange-500 border-orange-500/30',
    model: 'claude-sonnet-4-6',
    note: 'Native Messages API',
    ping: pingAnthropic,
  },
];

// ─── Module-level shared state ────────────────────────────────────────────────
// All hook instances share the same state so we ping once, not per-component.

type Listener = (state: ProviderHealthState[]) => void;

let sharedState: ProviderHealthState[] = PROVIDER_DEFS.map((p) => ({
  ...p,
  status: 'idle' as HealthStatus,
  latencyMs: null,
  error: null,
  changed: false,
}));

let hasRunInitial = false;
const listeners = new Set<Listener>();

function notify() {
  const snap = [...sharedState];
  listeners.forEach((fn) => fn(snap));
}

function setProviderState(id: string, patch: Partial<ProviderHealthState>) {
  sharedState = sharedState.map((p) => (p.id === id ? { ...p, ...patch } : p));
  notify();
}

// ─── Core ping logic (module-level, shareable) ────────────────────────────────

export async function pingProvider(id: string): Promise<void> {
  const def = PROVIDER_DEFS.find((p) => p.id === id);
  if (!def) return;

  const prev = sharedState.find((p) => p.id === id);
  const prevStatus = prev?.status ?? 'idle';

  setProviderState(id, { status: 'checking', latencyMs: null, error: null, changed: false });

  const start = performance.now();
  try {
    await def.ping();
    const ms = Math.round(performance.now() - start);
    setProviderState(id, {
      status: 'ok',
      latencyMs: ms,
      error: null,
      changed: prevStatus === 'error',
    });
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    setProviderState(id, {
      status: 'error',
      latencyMs: ms,
      error: (err as Error).message,
      changed: prevStatus === 'ok',
    });
  }

  // Clear the "changed" highlight after 8 s
  setTimeout(() => {
    setProviderState(id, { changed: false });
  }, 8000);
}

export async function pingAll(): Promise<void> {
  await Promise.all(PROVIDER_DEFS.map((p) => pingProvider(p.id)));
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseProviderHealthReturn {
  providers: ProviderHealthState[];
  pingOne: (id: string) => Promise<void>;
  pingAll: () => Promise<void>;
  /** Quick lookup by provider id */
  statusOf: (id: string) => HealthStatus;
  /** True while any provider is being checked */
  anyChecking: boolean;
  lastChecked: Date | null;
  countdown: number;
  autoEnabled: boolean;
  setAutoEnabled: (v: boolean) => void;
}

export function useProviderHealth(): UseProviderHealthReturn {
  const [providers, setProviders] = useState<ProviderHealthState[]>(sharedState);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [countdown, setCountdown] = useState(AUTO_PING_INTERVAL_S);

  const autoEnabledRef = useRef(autoEnabled);
  useEffect(() => { autoEnabledRef.current = autoEnabled; }, [autoEnabled]);

  // Subscribe to shared state
  useEffect(() => {
    const listener: Listener = (state) => {
      setProviders(state);
      setLastChecked(new Date());
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  // Run initial check once across all hook instances
  useEffect(() => {
    if (!hasRunInitial) {
      hasRunInitial = true;
      // Small delay so the UI renders first
      setTimeout(() => pingAll(), 800);
    }
  }, []);

  // Auto-ping countdown
  useEffect(() => {
    setCountdown(AUTO_PING_INTERVAL_S);
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (autoEnabledRef.current) pingAll();
          return AUTO_PING_INTERVAL_S;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const statusOf = useCallback(
    (id: string): HealthStatus =>
      providers.find((p) => p.id === id)?.status ?? 'idle',
    [providers],
  );

  const anyChecking = providers.some((p) => p.status === 'checking');

  return {
    providers,
    pingOne: pingProvider,
    pingAll,
    statusOf,
    anyChecking,
    lastChecked,
    countdown,
    autoEnabled,
    setAutoEnabled,
  };
}

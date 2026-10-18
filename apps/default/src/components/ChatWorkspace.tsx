import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Square, Trash2, Settings2,
  User, Bot, Copy, Check, ChevronDown,
  Zap, Brain, Cpu, Sparkles, Star, Code2,
  Download, FlaskConical, History,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { Message } from '../types';
import { ApiKeyError, PROVIDER_INFO } from '../lib/errors';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { streamGrokChat, GROK_MODELS, type GrokModel, type GrokMessage } from '../lib/grok';
import {
  streamHFChat, HF_MODELS, ORG_COLORS, TIER_COLORS,
  type HFModelId, type HFMessage,
} from '../lib/huggingface';
import {
  streamGeminiChat, GEMINI_MODELS, GEMINI_TIER_COLORS,
  type GeminiModelId, type GeminiMessage,
} from '../lib/google';
import {
  streamDeepInfraChat, DEEPINFRA_MODELS, DI_ORG_COLORS, DI_TIER_COLORS,
  type DeepInfraModelId, type DeepInfraMessage,
} from '../lib/deepinfra';
import {
  streamAnthropicChat, ANTHROPIC_MODELS, ANTHROPIC_TIER_COLORS,
  type AnthropicModel, type AnthropicMessage,
} from '../lib/anthropic';
import {
  streamTestChat, TEST_MODELS,
  type TestModel, type TestMessage,
} from '../lib/testmode';

import { logConversation } from '../lib/api';
import { useProviderHealth, type HealthStatus } from '../hooks/useProviderHealth';
import { ExportModal } from './ExportModal';
import { ProviderHero } from './ProviderHero';
import { ConversationHistorySidebar } from './ConversationHistorySidebar';
import { useConversationHistory } from '../hooks/useConversationHistory';
import { useCommandPaletteStore } from '../hooks/useCommandPalette';

// ─── Provider registry ────────────────────────────────────────────────────────

type ProviderName = 'grok' | 'huggingface' | 'google' | 'deepinfra' | 'anthropic' | 'testmode';

const PROVIDER_META: Record<ProviderName, {
  label: string;
  shortLabel: string;
  colour: string;
  dotColour: string;
  description: string;
}> = {
  grok: {
    label: 'xAI Grok',
    shortLabel: 'Grok',
    colour: 'text-primary',
    dotColour: 'bg-primary',
    description: 'Streaming responses, full conversation context, stop anytime.',
  },
  huggingface: {
    label: 'HuggingFace',
    shortLabel: 'HF',
    colour: 'text-yellow-600 dark:text-yellow-400',
    dotColour: 'bg-yellow-500',
    description: '17 open-source models — Llama, Mixtral, Qwen, Gemma & more.',
  },
  google: {
    label: 'Google Gemini',
    shortLabel: 'Gemini',
    colour: 'text-blue-500',
    dotColour: 'bg-blue-500',
    description: "Google's flagship models with up to 2M token context window.",
  },
  deepinfra: {
    label: 'DeepInfra',
    shortLabel: 'DI',
    colour: 'text-indigo-500',
    dotColour: 'bg-indigo-500',
    description: '22 powerful models — DeepSeek R1, Llama 405B, QwQ & more.',
  },
  anthropic: {
    label: 'Anthropic Claude',
    shortLabel: 'Claude',
    colour: 'text-orange-500',
    dotColour: 'bg-orange-500',
    description: 'Claude Opus 4.5, Sonnet 4.5, 3.5 Sonnet and Haiku — nuanced and safe.',
  },
  testmode: {
    label: 'Test Mode',
    shortLabel: 'Test',
    colour: 'text-fuchsia-500',
    dotColour: 'bg-fuchsia-500',
    description: '⚡ Local · No API key · Unlimited · Instant — perfect for UI testing.',
  },
};

// ─── Grok speed config ────────────────────────────────────────────────────────

const GROK_SPEED_CONFIG = {
  powerful: { label: 'Powerful', colour: 'text-purple-500', bg: 'bg-purple-500/10' },
  balanced: { label: 'Balanced', colour: 'text-primary',    bg: 'bg-primary/10'    },
  fast:     { label: 'Fast',     colour: 'text-cyan-500',   bg: 'bg-cyan-500/10'   },
};

// ─── Picker health strip ──────────────────────────────────────────────────────

const HEALTH_PROVIDERS: { id: string; label: string }[] = [
  { id: 'grok',        label: 'Grok'   },
  { id: 'huggingface', label: 'HF'     },
  { id: 'google',      label: 'Gemini' },
  { id: 'deepinfra',   label: 'DI'     },
  { id: 'anthropic',   label: 'Claude' },
];

function PickerHealthStrip({ healthStatusOf }: { healthStatusOf: (id: string) => HealthStatus }) {
  const allIdle = HEALTH_PROVIDERS.every(p => healthStatusOf(p.id) === 'idle');
  if (allIdle) return null; // don't render before first check

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/30">
      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mr-0.5">API</span>
      {HEALTH_PROVIDERS.map(({ id, label }) => {
        const hs = healthStatusOf(id);
        const dot =
          hs === 'ok'       ? 'bg-emerald-500'
          : hs === 'error'  ? 'bg-red-500'
          : hs === 'checking' ? 'bg-amber-400 animate-pulse'
          : 'bg-muted-foreground/25';
        const text =
          hs === 'ok'       ? 'text-emerald-600 dark:text-emerald-400'
          : hs === 'error'  ? 'text-red-500'
          : 'text-muted-foreground';
        return (
          <span key={id} className={cn('inline-flex items-center gap-1 text-[9px] font-semibold', text)}
            title={`${label}: ${hs}`}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
            {label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Unified model picker ────────────────────────────────────────────────────

function UnifiedModelPicker({
  provider, onProviderChange,
  grokModel,       onGrokModelChange,
  hfModel,         onHFModelChange,
  geminiModel,     onGeminiModelChange,
  deepinfraModel,  onDeepInfraModelChange,
  anthropicModel,  onAnthropicModelChange,
  testModel,       onTestModelChange,
  healthStatusOf,
}: {
  provider: ProviderName;
  onProviderChange: (p: ProviderName) => void;
  grokModel: GrokModel;
  onGrokModelChange: (m: GrokModel) => void;
  hfModel: HFModelId;
  onHFModelChange: (m: HFModelId) => void;
  geminiModel: GeminiModelId;
  onGeminiModelChange: (m: GeminiModelId) => void;
  deepinfraModel: DeepInfraModelId;
  onDeepInfraModelChange: (m: DeepInfraModelId) => void;
  anthropicModel: AnthropicModel;
  onAnthropicModelChange: (m: AnthropicModel) => void;
  testModel: TestModel;
  onTestModelChange: (m: TestModel) => void;
  /** Returns the current health status for a provider id */
  healthStatusOf: (id: string) => HealthStatus;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeLabel =
    provider === 'grok'          ? (GROK_MODELS.find((m) => m.id === grokModel)?.label          ?? grokModel)
    : provider === 'huggingface' ? (HF_MODELS.find((m) => m.id === hfModel)?.label              ?? hfModel)
    : provider === 'google'      ? (GEMINI_MODELS.find((m) => m.id === geminiModel)?.label       ?? geminiModel)
    : provider === 'deepinfra'   ? (DEEPINFRA_MODELS.find((m) => m.id === deepinfraModel)?.label ?? deepinfraModel)
    : provider === 'testmode'    ? (TEST_MODELS.find((m) => m.id === testModel)?.label           ?? testModel)
    :                              (ANTHROPIC_MODELS.find((m) => m.id === anthropicModel)?.label  ?? anthropicModel);

  const provMeta = PROVIDER_META[provider];
  const ALL_PROVIDERS: ProviderName[] = ['testmode', 'grok', 'huggingface', 'google', 'deepinfra', 'anthropic'];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium text-foreground transition-colors"
      >
        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', provMeta.dotColour)} />
        <span className="hidden sm:inline">{activeLabel}</span>
        <span className="sm:hidden">{provMeta.shortLabel}</span>
        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1     }}
            exit={  { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full mt-1.5 left-0 z-50 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: '22rem' }}
          >
            {/* Provider tabs — 3-col × 2-row grid for 6 providers */}
            <div className="grid grid-cols-3 border-b border-border">
              {ALL_PROVIDERS.map((p, idx) => {
                const isActive = provider === p;
                const activeBorder =
                  p === 'testmode'      ? 'border-b-fuchsia-500'
                  : p === 'grok'        ? 'border-b-emerald-500'
                  : p === 'huggingface' ? 'border-b-yellow-400'
                  : p === 'google'      ? 'border-b-blue-500'
                  : p === 'deepinfra'   ? 'border-b-indigo-500'
                  :                       'border-b-orange-500';
                const notLastInRow = idx % 3 !== 2;
                const isBottomRow  = idx >= 3;

                // Health status indicator (testmode is always ok)
                const hs: HealthStatus = p === 'testmode' ? 'ok' : healthStatusOf(p);
                const healthDot =
                  hs === 'ok'       ? 'bg-emerald-500'
                  : hs === 'error'  ? 'bg-red-500'
                  : hs === 'checking' ? 'bg-amber-400 animate-pulse'
                  : 'bg-muted-foreground/30';

                return (
                  <button
                    key={p}
                    onClick={() => onProviderChange(p)}
                    className={cn(
                      'px-2 py-2.5 text-[10px] font-semibold transition-all duration-150 text-left',
                      isActive
                        ? `bg-accent text-foreground border-b-2 ${activeBorder}`
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      notLastInRow && 'border-r border-border',
                      !isBottomRow && 'border-b border-border',
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {/* Provider colour dot */}
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full inline-block shrink-0 transition-transform duration-150',
                        PROVIDER_META[p].dotColour,
                        isActive && 'scale-125',
                      )} />
                      {PROVIDER_META[p].shortLabel}
                      {/* Health status dot — only for real providers */}
                      {p !== 'testmode' && (
                        <span className={cn(
                          'w-1 h-1 rounded-full inline-block shrink-0 ml-0.5',
                          healthDot,
                        )} title={`API: ${hs}`} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Health summary strip */}
            <PickerHealthStrip healthStatusOf={healthStatusOf} />

            {/* Model list */}
            <div className="p-1.5 max-h-80 overflow-y-auto">

              {/* ── xAI Grok ── */}
              {provider === 'grok' && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
                    xAI Models
                  </p>
                  {GROK_MODELS.map((m) => {
                    const spd = GROK_SPEED_CONFIG[m.speed];
                    const isActive = m.id === grokModel;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onGrokModelChange(m.id); setOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          isActive ? 'bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', spd.bg)}>
                          {m.speed === 'powerful'
                            ? <Brain className={cn('w-3.5 h-3.5', spd.colour)} />
                            : <Zap   className={cn('w-3.5 h-3.5', spd.colour)} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.description}</p>
                        </div>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0', spd.bg, spd.colour)}>
                          {spd.label}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* ── HuggingFace ── */}
              {provider === 'huggingface' && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
                    HuggingFace Models
                  </p>
                  {HF_MODELS.map((m) => {
                    const org  = ORG_COLORS[m.org];
                    const tier = TIER_COLORS[m.tier];
                    const isActive = m.id === hfModel;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onHFModelChange(m.id); setOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          isActive ? 'bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold', org.bg, org.text)}>
                          {m.org.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                        </div>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0', tier.bg, tier.text)}>
                          {tier.label}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* ── Google Gemini ── */}
              {provider === 'google' && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
                    Google Gemini Models
                  </p>
                  {GEMINI_MODELS.map((m) => {
                    const tier = GEMINI_TIER_COLORS[m.tier];
                    const isActive = m.id === geminiModel;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onGeminiModelChange(m.id); setOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          isActive ? 'bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', tier.bg)}>
                          <Star className={cn('w-3.5 h-3.5', tier.text)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{m.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md', tier.bg, tier.text)}>
                            {tier.label}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{m.contextWindow} ctx</span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* ── DeepInfra ── */}
              {provider === 'deepinfra' && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
                    DeepInfra Models
                  </p>
                  {DEEPINFRA_MODELS.map((m) => {
                    const org  = DI_ORG_COLORS[m.org];
                    const tier = DI_TIER_COLORS[m.tier];
                    const isActive = m.id === deepinfraModel;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onDeepInfraModelChange(m.id); setOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          isActive ? 'bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', org.bg)}>
                          {m.tier === 'coder'
                            ? <Code2  className={cn('w-3.5 h-3.5', org.text)} />
                            : m.tier === 'flagship'
                            ? <Brain  className={cn('w-3.5 h-3.5', org.text)} />
                            : <Zap    className={cn('w-3.5 h-3.5', org.text)} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md', tier.bg, tier.text)}>
                            {tier.label}
                          </span>
                          {m.params && (
                            <span className="text-[9px] text-muted-foreground">{m.params}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {/* ── Anthropic Claude ── */}
              {provider === 'anthropic' && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
                    Anthropic Models
                  </p>
                  {ANTHROPIC_MODELS.map((m) => {
                    const tier = ANTHROPIC_TIER_COLORS[m.tier];
                    const isActive = m.id === anthropicModel;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onAnthropicModelChange(m.id); setOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          isActive ? 'bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', tier.bg)}>
                          {m.tier === 'flagship'
                            ? <Brain         className={cn('w-3.5 h-3.5', tier.text)} />
                            : m.tier === 'balanced'
                            ? <FlaskConical  className={cn('w-3.5 h-3.5', tier.text)} />
                            : <Zap           className={cn('w-3.5 h-3.5', tier.text)} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{m.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                        </div>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0', tier.bg, tier.text)}>
                          {tier.label}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* ── Test Mode ── */}
              {provider === 'testmode' && (
                <>
                  <div className="px-2.5 pt-2 pb-1">
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 mb-2">
                      <FlaskConical className="w-3.5 h-3.5 text-fuchsia-500 shrink-0" />
                      <p className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-medium leading-snug">
                        Local · No API key · Unlimited · Instant
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 pb-1">
                    Test Personalities
                  </p>
                  {TEST_MODELS.map((m) => {
                    const isActive = m.id === testModel;
                    const speedColor =
                      m.speed === 'instant' ? 'text-fuchsia-500 bg-fuchsia-500/10'
                      : m.speed === 'fast'  ? 'text-cyan-500 bg-cyan-500/10'
                      :                       'text-primary bg-primary/10';
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onTestModelChange(m.id); setOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          isActive ? 'bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-fuchsia-500/10">
                          <FlaskConical className="w-3.5 h-3.5 text-fuchsia-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{m.label.replace('Test · ', '')}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                        </div>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0', speedColor)}>
                          {m.speed}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Stats pill ───────────────────────────────────────────────────────────────

function StatsPill({ msg }: { msg: Message }) {
  const hasStats = msg.tokens || msg.responseTime;
  if (!hasStats) return null;

  const tokPerSec = (msg.tokens && msg.responseTime && msg.responseTime > 0)
    ? Math.round((msg.tokens / msg.responseTime) * 1000)
    : null;

  const fmtMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="flex items-center gap-1 flex-wrap"
    >
      {msg.tokens != null && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/80 border border-border/50 text-[10px] text-muted-foreground font-medium">
          <Cpu className="w-2.5 h-2.5 shrink-0" />
          {msg.tokens.toLocaleString()} tok
        </span>
      )}
      {tokPerSec != null && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/80 border border-border/50 text-[10px] text-muted-foreground font-medium">
          <Zap className="w-2.5 h-2.5 shrink-0 text-yellow-500" />
          {tokPerSec.toLocaleString()} tok/s
        </span>
      )}
      {msg.ttft != null && msg.ttft > 0 && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/80 border border-border/50 text-[10px] text-muted-foreground font-medium">
          <Sparkles className="w-2.5 h-2.5 shrink-0 text-primary" />
          {fmtMs(msg.ttft)} TTFT
        </span>
      )}
      {msg.responseTime != null && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/80 border border-border/50 text-[10px] text-muted-foreground font-medium">
          <Brain className="w-2.5 h-2.5 shrink-0 text-blue-400" />
          {fmtMs(msg.responseTime)} total
        </span>
      )}
    </motion.div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, streaming }: { msg: Message; streaming?: boolean }) {
  const isUser = msg.role === 'user';
  const showStats = !isUser && !streaming && (msg.tokens != null || msg.responseTime != null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn('flex gap-2.5 sm:gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={cn(
        'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-1',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
      )}>
        {isUser ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />}
      </div>

      <div className={cn('max-w-[82%] sm:max-w-[75%] flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm leading-relaxed',
          isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm',
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:text-xs break-words">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {streaming && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />}
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className={cn('flex items-center gap-1.5 sm:gap-2 flex-wrap', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.model && (
            <span className="text-[10px] sm:text-[11px] text-muted-foreground hidden sm:inline">
              · {msg.model}
            </span>
          )}
          {!isUser && !streaming && <CopyButton text={msg.content} />}
        </div>

        {/* Stats pills — animate in after streaming ends */}
        <AnimatePresence>
          {showStats && <StatsPill msg={msg} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Loading pulse indicator ──────────────────────────────────────────────────

function LoadingPulse({ provider }: { provider: ProviderName }) {
  const provMeta = PROVIDER_META[provider];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex gap-2.5 sm:gap-3"
    >
      {/* Avatar with rotating ring */}
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 mt-1">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ borderTopColor: 'hsl(var(--primary))' }}
        />
        <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
        </div>
      </div>

      {/* Bubble */}
      <div className="flex flex-col gap-1.5">
        <div className="px-4 py-3 bg-muted rounded-2xl rounded-tl-sm min-w-[120px]">
          {/* Shimmer bars */}
          <div className="flex flex-col gap-2">
            {[100, 72, 88].map((w, i) => (
              <motion.div
                key={i}
                className="h-2 rounded-full bg-muted-foreground/20 overflow-hidden"
                style={{ width: `${w}%` }}
              >
                <motion.div
                  className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.18,
                  }}
                />
              </motion.div>
            ))}
          </div>

          {/* Pulsing dots below bars */}
          <div className="flex items-center gap-1 mt-2.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full bg-primary/60"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>

        <span className={cn('text-[10px] font-medium px-1 flex items-center gap-1', provMeta.colour)}>
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            ●
          </motion.span>
          {provMeta.label} is thinking…
        </span>
      </div>
    </motion.div>
  );
}

// ─── Rich starter prompts ─────────────────────────────────────────────────────

const STARTERS: Record<ProviderName, { emoji: string; title: string; description: string; prompt: string }[]> = {
  testmode: [
    {
      emoji: '⚡',
      title: 'Test streaming',
      description: 'Verify real-time token streaming works end-to-end',
      prompt: 'Write me a long detailed explanation of how streaming AI responses work, step by step.',
    },
    {
      emoji: '💻',
      title: 'Generate code',
      description: 'Test code block rendering and syntax highlighting',
      prompt: 'Write a TypeScript function that debounces an async function with proper types and JSDoc.',
    },
    {
      emoji: '📋',
      title: 'Test lists',
      description: 'Check markdown list and formatting rendering',
      prompt: 'Give me a list of 10 best practices for building production-ready REST APIs.',
    },
    {
      emoji: '🔄',
      title: 'Multi-turn chat',
      description: 'Test conversation history and context retention',
      prompt: 'Remember that my name is Alex and I work on AI products. Now tell me something interesting.',
    },
  ],
  grok: [
    {
      emoji: '⚡',
      title: 'Quantum entanglement',
      description: 'Clear intuitive explanation with real-world analogies',
      prompt: 'Explain quantum entanglement in plain English with a real-world analogy',
    },
    {
      emoji: '🧠',
      title: 'Grok vs GPT-4o',
      description: 'Honest comparison of strengths, weaknesses, and use cases',
      prompt: 'What makes xAI Grok different from GPT-4o? Give me an honest comparison',
    },
    {
      emoji: '🛡️',
      title: 'API security guide',
      description: 'Best practices for auth, rate-limiting, and secrets management',
      prompt: 'Give me a comprehensive API security best-practices guide for 2025',
    },
    {
      emoji: '🚀',
      title: 'Viral AI thread',
      description: 'Write a punchy Twitter thread that gets shared',
      prompt: 'Write a viral 8-tweet Twitter thread on the most surprising things AI can do in 2025',
    },
  ],
  huggingface: [
    {
      emoji: '🤗',
      title: 'Local model guide',
      description: 'Which open-source models run well on consumer hardware',
      prompt: 'Which open-source LLMs can I run locally on a 16GB laptop? Compare them',
    },
    {
      emoji: '🐍',
      title: 'Async web scraper',
      description: 'Production-ready Python with error handling and rate limits',
      prompt: 'Write a production-ready Python async web scraper with httpx, rate limiting, and retry logic',
    },
    {
      emoji: '📊',
      title: 'Fine-tuning vs RAG',
      description: 'When to use each approach — trade-offs clearly explained',
      prompt: 'Explain the trade-offs between fine-tuning and RAG. When should I use each?',
    },
    {
      emoji: '🌍',
      title: 'French translation',
      description: 'Translate text with cultural nuance preserved',
      prompt: 'Translate the following to French, preserving tone and cultural nuance: "The early bird catches the worm, but the second mouse gets the cheese."',
    },
  ],
  google: [
    {
      emoji: '✨',
      title: '2M context window',
      description: 'Analyse long documents, codebases, or book-length content',
      prompt: "What can I do with Gemini's 2M token context window that I couldn't do before? Give me practical examples",
    },
    {
      emoji: '🎨',
      title: 'Cinematic sci-fi scene',
      description: 'Rich, vivid description ready for a screenplay',
      prompt: "Write a vivid 3-paragraph cinematic description of a sci-fi colony ship entering a gas giant's atmosphere",
    },
    {
      emoji: '💡',
      title: 'Gemini unique features',
      description: 'Things Gemini does that other models struggle with',
      prompt: "What can Google Gemini do that other frontier models genuinely can't match? Be specific",
    },
    {
      emoji: '📐',
      title: 'Maths step-by-step',
      description: 'Solve a problem with full working shown clearly',
      prompt: 'Solve this step by step: A train travels 240 km at 60 km/h, then 180 km at 90 km/h. What is the average speed for the whole journey?',
    },
  ],
  deepinfra: [
    {
      emoji: '🔥',
      title: 'DeepSeek R1 reasoning',
      description: 'How chain-of-thought training unlocks hard problems',
      prompt: "Explain how DeepSeek R1's chain-of-thought reasoning works and why it beats standard prompting",
    },
    {
      emoji: '💻',
      title: 'Rust async HTTP server',
      description: 'Full working example with Axum, middleware, and error handling',
      prompt: 'Write a production-ready Rust async HTTP server using Axum with middleware, error handling, and a /health endpoint',
    },
    {
      emoji: '🧮',
      title: '√2 is irrational',
      description: 'Classic proof by contradiction, step by step',
      prompt: 'Prove that √2 is irrational using proof by contradiction. Show every step clearly',
    },
    {
      emoji: '🤖',
      title: 'Llama 405B vs GPT-4o',
      description: 'Benchmarks, cost, licensing, and when to choose each',
      prompt: 'Compare Llama 3.1 405B vs GPT-4o: benchmarks, cost per token, licensing, and which to choose for different use cases',
    },
  ],
  anthropic: [
    {
      emoji: '🎭',
      title: 'Twist ending story',
      description: 'A short story that genuinely surprises on the last line',
      prompt: 'Write a 300-word short story with a shocking twist ending. The twist should be inevitable in hindsight',
    },
    {
      emoji: '🔬',
      title: 'CRISPR explained',
      description: 'Gene editing made intuitive for a non-scientist',
      prompt: 'Explain CRISPR gene editing to a curious 16-year-old. Use analogies, keep it accurate',
    },
    {
      emoji: '⚖️',
      title: 'AI consciousness debate',
      description: 'Steel-man both sides of the philosophical argument',
      prompt: "Debate the ethics of AI consciousness: steel-man both the \"AIs can't be conscious\" and \"AIs might already be conscious\" positions",
    },
    {
      emoji: '🏗️',
      title: 'Microservices architecture',
      description: 'Design a scalable system with trade-offs explained',
      prompt: 'Design a scalable microservices architecture for a high-traffic e-commerce platform. Include trade-offs and when NOT to use microservices',
    },
  ],
};

// ─── ChatWorkspace ────────────────────────────────────────────────────────────

export function ChatWorkspace() {
  const { chatSession, addMessage, clearMessages, setChatSystemPrompt, setActiveView } = useAppStore();
  const { openPalette } = useCommandPaletteStore();

  // Provider health (shared with HealthCheckPanel — triggers on-mount check)
  const { statusOf: healthStatusOf } = useProviderHealth();

  // Provider & model state
  const [provider, setProvider]             = useState<ProviderName>('testmode');
  const [grokModel, setGrokModel]           = useState<GrokModel>('grok-3-fast');
  const [hfModel, setHFModel]               = useState<HFModelId>('meta-llama/Meta-Llama-3.1-70B-Instruct');
  const [geminiModel, setGeminiModel]       = useState<GeminiModelId>('gemini-2.0-flash');
  const [deepinfraModel, setDeepInfraModel] = useState<DeepInfraModelId>('meta-llama/Meta-Llama-3.3-70B-Instruct');
  const [anthropicModel, setAnthropicModel] = useState<AnthropicModel>('claude-sonnet-4-5');
  const [testModel, setTestModel]           = useState<TestModel>('test-conversational');

  // Answer length
  type AnswerLength = 'short' | 'medium' | 'long';
  const ANSWER_LENGTH_META: Record<AnswerLength, { label: string; hint: string; suffix: string }> = {
    short:  { label: 'Short',  hint: 'Concise',  suffix: ' Respond concisely in 1–3 sentences max.' },
    medium: { label: 'Medium', hint: 'Balanced', suffix: ' Respond with a balanced level of detail — not too brief, not overly long.' },
    long:   { label: 'Long',   hint: 'Detailed', suffix: ' Respond thoroughly and in depth, covering all relevant aspects.' },
  };
  const [answerLength, setAnswerLength] = useState<AnswerLength>('medium');

  // UI state
  const [input, setInput]               = useState('');
  const [streamingId, setStreamingId]   = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [systemEdit, setSystemEdit]     = useState(chatSession.systemPrompt);
  const [error, setError]               = useState<Error | null>(null);
  const [showExport, setShowExport]     = useState(false);
  const [historyOpen, setHistoryOpen]   = useState(false);

  // History persistence
  const { saveConversation } = useConversationHistory();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const activeConvIdRef = useRef<string | null>(null);

  const abortRef        = useRef<AbortController | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef('');

  const isLoading = isConnecting || streamingId !== null;
  const isEmpty   = chatSession.messages.length === 0;

  // Derived labels
  const activeModelLabel =
    provider === 'grok'          ? (GROK_MODELS.find((m) => m.id === grokModel)?.label          ?? grokModel)
    : provider === 'huggingface' ? (HF_MODELS.find((m) => m.id === hfModel)?.label              ?? hfModel)
    : provider === 'google'      ? (GEMINI_MODELS.find((m) => m.id === geminiModel)?.label       ?? geminiModel)
    : provider === 'deepinfra'   ? (DEEPINFRA_MODELS.find((m) => m.id === deepinfraModel)?.label ?? deepinfraModel)
    : provider === 'testmode'    ? (TEST_MODELS.find((m) => m.id === testModel)?.label           ?? testModel)
    :                              (ANTHROPIC_MODELS.find((m) => m.id === anthropicModel)?.label  ?? anthropicModel);

  const providerDisplayName = PROVIDER_META[provider].label;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatSession.messages, isConnecting]);

  useEffect(() => { setSystemEdit(chatSession.systemPrompt); }, [chatSession.systemPrompt]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamingId(null);
    setIsConnecting(false);
  }, []);

  // ── Palette event bridge ──────────────────────────────────────────────────
  useEffect(() => {
    const onSwitchProvider = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      const p = detail as ProviderName;
      if (p && PROVIDER_META[p]) {
        stopGeneration();
        setProvider(p);
      }
    };
    const onClearChat = () => {
      stopGeneration();
      clearMessages();
      activeConvIdRef.current = null;
      setActiveConvId(null);
    };
    const onOpenExport    = () => setShowExport(true);
    const onToggleHistory = () => setHistoryOpen((o) => !o);

    window.addEventListener('geologix:switchProvider', onSwitchProvider);
    window.addEventListener('geologix:clearChat',      onClearChat);
    window.addEventListener('geologix:openExport',     onOpenExport);
    window.addEventListener('geologix:toggleHistory',  onToggleHistory);

    return () => {
      window.removeEventListener('geologix:switchProvider', onSwitchProvider);
      window.removeEventListener('geologix:clearChat',      onClearChat);
      window.removeEventListener('geologix:openExport',     onOpenExport);
      window.removeEventListener('geologix:toggleHistory',  onToggleHistory);
    };
  }, [stopGeneration, clearMessages]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('geologix:activeProviderChange', { detail: provider }));
  }, [provider]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('geologix:historyOpenChange', { detail: historyOpen }));
  }, [historyOpen]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    setError(null);

    addMessage({ id: `${Date.now()}-user`, role: 'user', content: text, timestamp: new Date() });
    if (!overrideText) setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsConnecting(true);
    const historySnapshot = chatSession.messages;

    const assistantId = `${Date.now()}-ai`;
    streamBufferRef.current = '';
    const sendTime = performance.now();

    const updateMsg = (content: string, extra?: Partial<Message>) => {
      useAppStore.setState((s) => ({
        chatSession: {
          ...s.chatSession,
          messages: s.chatSession.messages.map((m) =>
            m.id === assistantId ? { ...m, content, ...extra } : m,
          ),
        },
      }));
    };

    let firstToken = true;
    let ttft = 0;
    const onToken = (token: string) => {
      if (firstToken) {
        firstToken = false;
        ttft = Math.round(performance.now() - sendTime);
        // Now that we have data, reveal the message bubble and stop the pulse
        addMessage({
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          provider: providerDisplayName,
          model: activeModelLabel,
        });
        setIsConnecting(false);
        setStreamingId(assistantId);
      }
      streamBufferRef.current += token;
      updateMsg(streamBufferRef.current);
    };

    const onDone = (fullText: string, tokensOrUsage?: number | { total_tokens?: number; completion_tokens?: number }) => {
      const responseTime = Math.round(performance.now() - sendTime);
      // Providers pass either a plain number or a usage object — normalise both
      const finalTokens =
        typeof tokensOrUsage === 'number'
          ? tokensOrUsage
          : typeof tokensOrUsage === 'object' && tokensOrUsage !== null
            ? (tokensOrUsage.total_tokens ?? tokensOrUsage.completion_tokens ?? Math.ceil(fullText.length / 4))
            : Math.ceil(fullText.length / 4);
      updateMsg(fullText, { tokens: finalTokens, ttft, responseTime });
      setStreamingId(null);
      abortRef.current = null;

      const allMessages = [
        ...useAppStore.getState().chatSession.messages.filter((m) => m.id !== assistantId),
        {
          id: assistantId,
          role: 'assistant' as const,
          content: fullText,
          timestamp: new Date(),
          provider: providerDisplayName,
          model: activeModelLabel,
          tokens: finalTokens,
          ttft,
          responseTime,
        },
      ];
      const newId = saveConversation({
        activeId: activeConvIdRef.current,
        messages: allMessages,
        provider: providerDisplayName,
        model: activeModelLabel,
        systemPrompt: chatSession.systemPrompt,
        personaName: chatSession.persona?.name,
      });
      activeConvIdRef.current = newId;
      setActiveConvId(newId);

      if (historySnapshot.length <= 1) {
        logConversation({
          title: text.slice(0, 60),
          provider: providerDisplayName,
          model: activeModelLabel,
          persona: chatSession.persona?.name,
          messages: 2,
          tokens: finalTokens,
        }).catch(() => {});
      }
    };

    const onError = (err: Error) => {
      setError(err);
      setStreamingId(null);
      setIsConnecting(false);
      abortRef.current = null;
      useAppStore.setState((s) => ({
        chatSession: {
          ...s.chatSession,
          messages: s.chatSession.messages.filter((m) => m.id !== assistantId),
        },
      }));
    };

    // ── Route to correct provider ──────────────────────────────────────────
    const effectiveSystem = chatSession.systemPrompt + ANSWER_LENGTH_META[answerLength].suffix;

    if (provider === 'grok') {
      const history: GrokMessage[] = [
        { role: 'system', content: effectiveSystem },
        ...historySnapshot.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ];
      abortRef.current = streamGrokChat(history, grokModel, { onToken, onDone, onError });

    } else if (provider === 'huggingface') {
      const history: HFMessage[] = [
        { role: 'system', content: effectiveSystem },
        ...historySnapshot.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ];
      abortRef.current = streamHFChat(history, hfModel, { onToken, onDone, onError });

    } else if (provider === 'google') {
      const history: GeminiMessage[] = [
        ...historySnapshot.map((m) => ({
          role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
          content: m.content,
        })),
        { role: 'user', content: text },
      ];
      abortRef.current = streamGeminiChat(effectiveSystem, history, geminiModel, { onToken, onDone, onError });

    } else if (provider === 'deepinfra') {
      const history: DeepInfraMessage[] = [
        { role: 'system', content: effectiveSystem },
        ...historySnapshot.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ];
      abortRef.current = streamDeepInfraChat(history, deepinfraModel, { onToken, onDone, onError });

    } else if (provider === 'testmode') {
      const history: TestMessage[] = [
        { role: 'system', content: effectiveSystem },
        ...historySnapshot.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ];
      abortRef.current = streamTestChat(history, testModel, { onToken, onDone, onError });

    } else {
      const history: AnthropicMessage[] = [
        ...historySnapshot.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ];
      abortRef.current = streamAnthropicChat(effectiveSystem, history, anthropicModel, { onToken, onDone, onError });
    }
  }, [
    input, isLoading, chatSession, provider,
    grokModel, hfModel, geminiModel, deepinfraModel, anthropicModel, testModel,
    answerLength, providerDisplayName, activeModelLabel, addMessage, saveConversation,
  ]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleRestoreConversation = useCallback((
    messages: Message[],
    meta: { provider: string; model: string; systemPrompt: string },
  ) => {
    stopGeneration();

    const entries = Object.entries(PROVIDER_META) as [ProviderName, { label: string }][];
    const providerKey = entries.find(([, v]) => v.label === meta.provider)?.[0] ?? provider;
    setProvider(providerKey);

    setChatSystemPrompt(meta.systemPrompt);
    setSystemEdit(meta.systemPrompt);

    useAppStore.setState((s) => ({
      chatSession: { ...s.chatSession, messages, systemPrompt: meta.systemPrompt },
    }));

    activeConvIdRef.current = null;
    setActiveConvId(null);
  }, [stopGeneration, provider, setChatSystemPrompt]);

  // Build export meta outside JSX
  const exportMeta = {
    provider: providerDisplayName,
    model: activeModelLabel,
    systemPrompt: chatSession.systemPrompt,
    personaName: chatSession.persona?.name,
    exportedAt: new Date(),
  };

  // Extract boolean comparisons to avoid JSX parser issues
  const showClearButtons = !isEmpty;
  const isStreaming = streamingId !== null;
  const inputDisabled = isLoading;
  const sendDisabled = !input.trim();

  return (
    <div className="flex h-full bg-background overflow-hidden">

      {/* ── History sidebar ────────────────────────────────────── */}
      <ConversationHistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeConversationId={activeConvId}
        onRestoreConversation={handleRestoreConversation}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border bg-card shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UnifiedModelPicker
              provider={provider}
              onProviderChange={(p) => { setProvider(p); stopGeneration(); }}
              grokModel={grokModel}               onGrokModelChange={setGrokModel}
              hfModel={hfModel}                   onHFModelChange={setHFModel}
              geminiModel={geminiModel}           onGeminiModelChange={setGeminiModel}
              deepinfraModel={deepinfraModel}     onDeepInfraModelChange={setDeepInfraModel}
              anthropicModel={anthropicModel}     onAnthropicModelChange={setAnthropicModel}
              testModel={testModel}               onTestModelChange={setTestModel}
              healthStatusOf={healthStatusOf}
            />

            {/* Answer length toggle */}
            <div className="flex items-center rounded-lg border border-border bg-background p-0.5 shrink-0">
              {(['short', 'medium', 'long'] as AnswerLength[]).map((len) => {
                const isActive = answerLength === len;
                return (
                  <button
                    key={len}
                    onClick={() => setAnswerLength(len)}
                    title={ANSWER_LENGTH_META[len].hint}
                    className={cn(
                      'px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {ANSWER_LENGTH_META[len].label}
                  </button>
                );
              })}
            </div>

            {chatSession.persona && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground max-w-[140px]">
                <span>{chatSession.persona.emoji}</span>
                <span className="truncate">{chatSession.persona.name}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className={cn(
                'p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted',
                historyOpen && 'bg-accent text-accent-foreground',
              )}
              title="Conversation history"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSettings((s) => !s)}
              className={cn(
                'p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted',
                showSettings && 'bg-accent text-accent-foreground',
              )}
              title="System prompt"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {showClearButtons && (
              <>
                <button
                  onClick={() => setShowExport(true)}
                  className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Export conversation"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { stopGeneration(); clearMessages(); activeConvIdRef.current = null; setActiveConvId(null); }}
                  className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── System prompt panel ──────────────────────────────────── */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border bg-muted/40 overflow-hidden shrink-0"
            >
              <div className="px-4 sm:px-6 py-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  System Instructions
                </label>
                <textarea
                  value={systemEdit}
                  onChange={(e) => setSystemEdit(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="You are a helpful assistant…"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => { setChatSystemPrompt(systemEdit); setShowSettings(false); }}
                    className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Messages ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isEmpty ? (
            <ProviderHero
              provider={provider}
              starters={STARTERS[provider]}
              onStarterClick={(prompt) => {
                setInput(prompt);
                textareaRef.current?.focus();
              }}
            />
          ) : (
            <div className="px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 max-w-3xl mx-auto">
              {chatSession.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} streaming={msg.id === streamingId} />
              ))}
              <AnimatePresence>
                {isConnecting && <LoadingPulse provider={provider} />}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Error banner ──────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden border-t border-destructive/20"
            >
              {error instanceof ApiKeyError ? (
                <div className="px-4 py-3 bg-destructive/8 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="text-destructive text-base shrink-0 mt-0.5">🔑</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-destructive leading-snug">
                        {PROVIDER_INFO[error.provider].displayName} API key invalid or missing
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Get a free key at{' '}
                        <a
                          href={PROVIDER_INFO[error.provider].docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary hover:text-primary/80 transition-colors"
                        >
                          {PROVIDER_INFO[error.provider].docsUrl}
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setActiveView('providers'); setError(null); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      Fix in Settings →
                    </button>
                    <button
                      onClick={() => setError(null)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 bg-destructive/10 flex items-center justify-between gap-3">
                  <span className="text-sm text-destructive truncate">⚠️ {error.message}</span>
                  <button
                    onClick={() => setError(null)}
                    className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Export modal ──────────────────────────────────────────── */}
        <ExportModal
          open={showExport}
          onClose={() => setShowExport(false)}
          messages={chatSession.messages}
          meta={exportMeta}
        />

        {/* ── Input ─────────────────────────────────────────────────── */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-border bg-card shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 sm:gap-3 items-end bg-background border border-border rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKey}
                placeholder={isLoading ? `${providerDisplayName} is thinking…` : `Message ${activeModelLabel}… (Enter to send)`}
                rows={1}
                style={{ resize: 'none', minHeight: '24px', maxHeight: '160px' }}
                disabled={inputDisabled}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed overflow-y-auto disabled:opacity-60"
              />

              {isStreaming ? (
                <button
                  onClick={stopGeneration}
                  className="w-8 h-8 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center shrink-0 hover:bg-destructive/90 transition-all"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={sendDisabled}
                  className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  title="Send"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status strip */}
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isLoading ? 'bg-primary animate-pulse' : 'bg-emerald-500')} />
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                  {isLoading
                    ? `Streaming from ${activeModelLabel}…`
                    : `${providerDisplayName} · ${activeModelLabel} · Ready`
                  }
                </p>
              </div>
              <button
                onClick={openPalette}
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-muted/50 hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-all shrink-0"
                title="Open command palette"
              >
                <kbd className="font-semibold">⌘K</kbd>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

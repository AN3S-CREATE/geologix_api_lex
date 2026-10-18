import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const LOGO_URL = 'https://files.taskade.com/space-files/2767bafe-fede-43ff-b126-df55e6b93e81/original/GeoLogix Logo wh.png';

// ─── Provider config ──────────────────────────────────────────────────────────

export type ProviderName = 'grok' | 'huggingface' | 'google' | 'deepinfra' | 'anthropic' | 'testmode';

export const PROVIDER_HERO_CONFIG: Record<ProviderName, {
  label: string;
  tagline: string;
  glowColor: string;
  accentBorder: string;
  hoverGlow: string;
}> = {
  testmode: {
    label: 'Test Mode',
    tagline: '⚡ Local · No API key · Unlimited · Instant — perfect for unrestricted UI testing.',
    glowColor: 'rgba(217, 70, 239, 0.12)',
    accentBorder: 'border-l-fuchsia-500',
    hoverGlow: 'hover:shadow-fuchsia-500/10',
  },
  grok: {
    label: 'xAI Grok',
    tagline: 'Streaming responses, full conversation context, stop anytime.',
    glowColor: 'rgba(52, 211, 153, 0.12)',
    accentBorder: 'border-l-emerald-500',
    hoverGlow: 'hover:shadow-emerald-500/10',
  },
  huggingface: {
    label: 'HuggingFace',
    tagline: '17 open-source models — Llama, Mixtral, Qwen, Gemma & more.',
    glowColor: 'rgba(234, 179, 8, 0.10)',
    accentBorder: 'border-l-yellow-400',
    hoverGlow: 'hover:shadow-yellow-400/10',
  },
  google: {
    label: 'Google Gemini',
    tagline: "Google's flagship models with up to 2M token context window.",
    glowColor: 'rgba(59, 130, 246, 0.10)',
    accentBorder: 'border-l-blue-500',
    hoverGlow: 'hover:shadow-blue-500/10',
  },
  deepinfra: {
    label: 'DeepInfra',
    tagline: '22 powerful models — DeepSeek R1, Llama 405B, QwQ & more.',
    glowColor: 'rgba(99, 102, 241, 0.10)',
    accentBorder: 'border-l-indigo-500',
    hoverGlow: 'hover:shadow-indigo-500/10',
  },
  anthropic: {
    label: 'Anthropic Claude',
    tagline: 'Claude Opus 4.5, Sonnet 4.5 and Haiku — intelligent and nuanced.',
    glowColor: 'rgba(249, 115, 22, 0.10)',
    accentBorder: 'border-l-orange-500',
    hoverGlow: 'hover:shadow-orange-500/10',
  },
};

// ─── Stagger variants ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Suggestion card ──────────────────────────────────────────────────────────

interface SuggestionCardProps {
  emoji: string;
  title: string;
  description: string;
  accentBorder: string;
  hoverGlow: string;
  onClick: () => void;
}

export function SuggestionCard({
  emoji, title, description, accentBorder, hoverGlow, onClick,
}: SuggestionCardProps) {
  return (
    <motion.button
      variants={itemVariants}
      onClick={onClick}
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left',
        'border border-border bg-card/60 backdrop-blur-sm',
        'hover:bg-card hover:border-border/80',
        'shadow-sm hover:shadow-md',
        'transition-all duration-200 active:scale-[0.98]',
        'border-l-[3px]',
        accentBorder,
        hoverGlow,
      )}
    >
      {/* Shimmer overlay on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-white/[0.04] to-transparent" />

      <span className="text-xl shrink-0 leading-none mt-0.5 select-none">{emoji}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-foreground transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Provider hero ────────────────────────────────────────────────────────────

interface ProviderHeroProps {
  provider: ProviderName;
  starters: { emoji: string; title: string; description: string; prompt: string }[];
  onStarterClick: (prompt: string) => void;
}

export function ProviderHero({ provider, starters, onStarterClick }: ProviderHeroProps) {
  const cfg = PROVIDER_HERO_CONFIG[provider];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 sm:px-8 py-10 relative overflow-hidden">

      {/* Radial ambient glow behind hero icon */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 25%, ${cfg.glowColor}, transparent 70%)`,
        }}
      />

      <motion.div
        key={provider}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center gap-5 w-full max-w-lg"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="flex items-center justify-center">
          <img
            src={LOGO_URL}
            alt="NexusAI"
            className="h-14 sm:h-20 w-auto object-contain drop-shadow-lg"
          />
        </motion.div>

        {/* Tagline */}
        <motion.div variants={itemVariants} className="text-center">
          <p className="text-sm text-muted-foreground max-w-xs sm:max-w-sm leading-relaxed">
            {cfg.tagline}
          </p>
        </motion.div>

        {/* Suggestion cards — 2-col grid on sm+ */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full"
        >
          {starters.map((s) => (
            <SuggestionCard
              key={s.prompt}
              emoji={s.emoji}
              title={s.title}
              description={s.description}
              accentBorder={cfg.accentBorder}
              hoverGlow={cfg.hoverGlow}
              onClick={() => onStarterClick(s.prompt)}
            />
          ))}
        </motion.div>

        {/* Hint */}
        <motion.p variants={itemVariants} className="text-[11px] text-muted-foreground/60 text-center">
          Tap any card to start · Switch providers above for different models
        </motion.p>
      </motion.div>
    </div>
  );
}

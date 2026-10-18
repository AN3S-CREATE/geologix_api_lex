/**
 * EmptyState — illustrated empty state screens for each panel.
 *
 * Each illustration is a self-contained inline SVG using CSS semantic color
 * variables so it adapts to light/dark mode automatically.
 * Animations use framer-motion for a gentle entrance.
 */
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

// ─── Shared wrapper ───────────────────────────────────────────────────────────

interface EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-16 select-none',
        className,
      )}
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.05, ease: [0.34, 1.56, 0.64, 1] }}
        className="mb-7"
      >
        {illustration}
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
        className="space-y-2 mb-6 max-w-xs"
      >
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </motion.div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          {action && (
            <button
              onClick={action.onClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm shadow-primary/20"
            >
              {action.icon}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              {secondaryAction.label}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Illustrations ────────────────────────────────────────────────────────────

/** Providers: a network of nodes radiating from a central hub */
export function ProvidersIllustration() {
  return (
    <svg width="160" height="128" viewBox="0 0 160 128" fill="none" aria-hidden>
      {/* Ambient glow */}
      <ellipse cx="80" cy="72" rx="56" ry="28" fill="hsl(var(--primary))" fillOpacity="0.07" />

      {/* Connector lines */}
      <line x1="80" y1="64" x2="28" y2="38" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="80" y1="64" x2="132" y2="38" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="80" y1="64" x2="28" y2="90" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="80" y1="64" x2="132" y2="90" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="80" y1="64" x2="80" y2="18" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Satellite nodes */}
      <circle cx="28" cy="38" r="14" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="28" cy="38" r="5" fill="hsl(var(--muted-foreground))" fillOpacity="0.4" />

      <circle cx="132" cy="38" r="14" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="132" cy="38" r="5" fill="hsl(var(--muted-foreground))" fillOpacity="0.4" />

      <circle cx="28" cy="90" r="14" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="28" cy="90" r="5" fill="hsl(var(--muted-foreground))" fillOpacity="0.4" />

      <circle cx="132" cy="90" r="14" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="132" cy="90" r="5" fill="hsl(var(--muted-foreground))" fillOpacity="0.4" />

      <circle cx="80" cy="18" r="11" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="80" cy="18" r="4" fill="hsl(var(--muted-foreground))" fillOpacity="0.4" />

      {/* Central hub */}
      <circle cx="80" cy="64" r="22" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
      <circle cx="80" cy="64" r="14" fill="hsl(var(--primary))" fillOpacity="0.12" />
      {/* Plus icon in center */}
      <line x1="80" y1="57" x2="80" y2="71" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="73" y1="64" x2="87" y2="64" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Models: a layered stack of chips / cards suggesting a registry */
export function ModelsIllustration() {
  return (
    <svg width="160" height="128" viewBox="0 0 160 128" fill="none" aria-hidden>
      <ellipse cx="80" cy="90" rx="54" ry="16" fill="hsl(var(--primary))" fillOpacity="0.06" />

      {/* Back card */}
      <rect x="26" y="44" width="108" height="52" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Mid card */}
      <rect x="18" y="34" width="108" height="52" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Front card */}
      <rect x="10" y="24" width="108" height="52" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" />

      {/* Content on front card */}
      <rect x="22" y="36" width="36" height="6" rx="3" fill="hsl(var(--foreground))" fillOpacity="0.15" />
      <rect x="22" y="47" width="56" height="4" rx="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.25" />
      <rect x="22" y="55" width="42" height="4" rx="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.18" />

      {/* Status pill */}
      <rect x="80" y="35" width="30" height="14" rx="7" fill="hsl(var(--primary))" fillOpacity="0.15" />
      <rect x="83" y="40" width="24" height="4" rx="2" fill="hsl(var(--primary))" fillOpacity="0.5" />

      {/* Brain icon area */}
      <circle cx="134" cy="64" r="18" fill="hsl(var(--muted))" />
      <path d="M126 64c0-4.4 3.6-8 8-8s8 3.6 8 8c2.2 0 4 1.8 4 4s-1.8 4-4 4h-16c-2.2 0-4-1.8-4-4s1.8-4 4-4z"
        fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="134" y1="56" x2="134" y2="72" stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" strokeOpacity="0.5" />
    </svg>
  );
}

/** Models search empty state: magnifying glass over empty grid */
export function ModelsSearchIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden>
      <ellipse cx="60" cy="80" rx="40" ry="10" fill="hsl(var(--primary))" fillOpacity="0.06" />
      <circle cx="52" cy="46" r="26" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <circle cx="52" cy="46" r="17" fill="hsl(var(--muted))" />
      {/* Question mark */}
      <path d="M48 40c0-2.2 1.8-4 4-4s4 1.8 4 4c0 1.8-1.4 2.8-2.6 3.6-.8.6-1.4 1.2-1.4 2.4"
        stroke="hsl(var(--muted-foreground))" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="52" cy="50.5" r="1.2" fill="hsl(var(--muted-foreground))" />
      {/* Handle */}
      <line x1="72" y1="66" x2="88" y2="82" stroke="hsl(var(--muted-foreground))" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  );
}

/** Personas: abstract figure silhouettes */
export function PersonasIllustration() {
  return (
    <svg width="160" height="128" viewBox="0 0 160 128" fill="none" aria-hidden>
      <ellipse cx="80" cy="100" rx="60" ry="14" fill="hsl(var(--primary))" fillOpacity="0.06" />

      {/* Left ghost persona */}
      <circle cx="36" cy="46" r="16" fill="hsl(var(--muted))" />
      <rect x="22" y="64" width="28" height="22" rx="8" fill="hsl(var(--muted))" />
      <circle cx="36" cy="46" r="7" fill="hsl(var(--border))" />

      {/* Right ghost persona */}
      <circle cx="124" cy="46" r="16" fill="hsl(var(--muted))" />
      <rect x="110" y="64" width="28" height="22" rx="8" fill="hsl(var(--muted))" />
      <circle cx="124" cy="46" r="7" fill="hsl(var(--border))" />

      {/* Center main persona — highlighted */}
      <circle cx="80" cy="38" r="22" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
      <circle cx="80" cy="38" r="10" fill="hsl(var(--primary))" fillOpacity="0.18" />
      {/* Simple face hint */}
      <circle cx="75" cy="35" r="2" fill="hsl(var(--primary))" fillOpacity="0.5" />
      <circle cx="85" cy="35" r="2" fill="hsl(var(--primary))" fillOpacity="0.5" />
      <path d="M74 42 Q80 46 86 42" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeOpacity="0.6" />

      <rect x="58" y="62" width="44" height="28" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" />

      {/* Sparkle */}
      <path d="M110 22 L111.4 26 L115 27.4 L111.4 28.8 L110 32 L108.6 28.8 L105 27.4 L108.6 26 Z"
        fill="hsl(var(--primary))" fillOpacity="0.55" />
    </svg>
  );
}

/** Prompts: a scroll / document with a wand / sparkle */
export function PromptsIllustration() {
  return (
    <svg width="160" height="128" viewBox="0 0 160 128" fill="none" aria-hidden>
      <ellipse cx="80" cy="100" rx="54" ry="14" fill="hsl(var(--primary))" fillOpacity="0.06" />

      {/* Document */}
      <rect x="36" y="18" width="72" height="88" rx="12" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Dog-ear */}
      <path d="M88 18 L108 38 L88 38 Z" fill="hsl(var(--muted))" />
      <path d="M88 18 L108 38" stroke="hsl(var(--border))" strokeWidth="1.5" />

      {/* Lines of text */}
      <rect x="48" y="50" width="48" height="5" rx="2.5" fill="hsl(var(--muted-foreground))" fillOpacity="0.25" />
      <rect x="48" y="62" width="40" height="5" rx="2.5" fill="hsl(var(--muted-foreground))" fillOpacity="0.18" />
      <rect x="48" y="74" width="44" height="5" rx="2.5" fill="hsl(var(--muted-foreground))" fillOpacity="0.18" />
      <rect x="48" y="86" width="32" height="5" rx="2.5" fill="hsl(var(--muted-foreground))" fillOpacity="0.12" />

      {/* Wand badge overlay */}
      <circle cx="114" cy="28" r="18" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      {/* Wand */}
      <line x1="106" y1="36" x2="118" y2="22" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <circle cx="118" cy="22" r="3" fill="hsl(var(--primary))" fillOpacity="0.7" />
      {/* Sparkles */}
      <path d="M107 22 L107.7 24.3 L110 25 L107.7 25.7 L107 28 L106.3 25.7 L104 25 L106.3 24.3 Z"
        fill="hsl(var(--primary))" fillOpacity="0.6" />
    </svg>
  );
}

/** Prompts search/filter empty state */
export function PromptsSearchIllustration() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden>
      <ellipse cx="60" cy="82" rx="38" ry="10" fill="hsl(var(--primary))" fillOpacity="0.06" />
      {/* Folded paper */}
      <rect x="28" y="20" width="64" height="56" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="38" y="34" width="44" height="4" rx="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.2" />
      <rect x="38" y="44" width="32" height="4" rx="2" fill="hsl(var(--muted-foreground))" fillOpacity="0.15" />
      {/* X mark */}
      <circle cx="88" cy="72" r="16" fill="hsl(var(--muted))" />
      <line x1="81" y1="65" x2="95" y2="79" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="95" y1="65" x2="81" y2="79" stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  );
}

/** History: a chat bubble trail that fades to silence */
export function HistoryIllustration() {
  return (
    <svg width="160" height="128" viewBox="0 0 160 128" fill="none" aria-hidden>
      <ellipse cx="80" cy="104" rx="54" ry="14" fill="hsl(var(--primary))" fillOpacity="0.06" />

      {/* Faded background bubbles */}
      <rect x="54" y="78" width="64" height="24" rx="12" fill="hsl(var(--muted))" fillOpacity="0.5" />
      <rect x="42" y="78" width="14" height="14" rx="7" fill="hsl(var(--muted))" fillOpacity="0.5" />

      <rect x="42" y="48" width="52" height="24" rx="12" fill="hsl(var(--muted))" fillOpacity="0.7" />
      <rect x="102" y="48" width="16" height="16" rx="8" fill="hsl(var(--muted))" fillOpacity="0.7" />

      {/* Main foreground bubble */}
      <rect x="30" y="18" width="80" height="28" rx="14" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      {/* Tail */}
      <path d="M44 46 L36 58 L54 46 Z" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Dots inside bubble */}
      <circle cx="57" cy="32" r="4" fill="hsl(var(--primary))" fillOpacity="0.3" />
      <circle cx="70" cy="32" r="4" fill="hsl(var(--primary))" fillOpacity="0.55" />
      <circle cx="83" cy="32" r="4" fill="hsl(var(--primary))" fillOpacity="0.3" />

      {/* Clock badge */}
      <circle cx="122" cy="28" r="18" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="122" cy="28" r="10" fill="hsl(var(--muted))" />
      <line x1="122" y1="22" x2="122" y2="28" stroke="hsl(var(--muted-foreground))" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
      <line x1="122" y1="28" x2="127" y2="31" stroke="hsl(var(--muted-foreground))" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

// ─── Pre-composed panel empty states ─────────────────────────────────────────

interface PanelEmptyStateProps {
  onAction?: () => void;
}

export function ProvidersEmptyState({ onAction }: PanelEmptyStateProps) {
  return (
    <EmptyState
      illustration={<ProvidersIllustration />}
      title="No providers yet"
      description="Connect your first AI provider to start routing requests to models like GPT-4, Claude, or Gemini."
      action={
        onAction
          ? {
              label: 'Add Provider',
              onClick: onAction,
              icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

export function ModelsEmptyState({ onClearFilter }: { onClearFilter?: () => void }) {
  return (
    <EmptyState
      illustration={<ModelsSearchIllustration />}
      title="No models match"
      description="Try adjusting your search or switching to a different category filter."
      action={
        onClearFilter
          ? { label: 'Clear filters', onClick: onClearFilter }
          : undefined
      }
    />
  );
}

export function ModelsGlobalEmptyState() {
  return (
    <EmptyState
      illustration={<ModelsIllustration />}
      title="Model registry is empty"
      description="Models are pulled from connected providers. Add a provider first and they'll appear here automatically."
    />
  );
}

export function PersonasEmptyState({ onAction }: PanelEmptyStateProps) {
  return (
    <EmptyState
      illustration={<PersonasIllustration />}
      title="No custom personas yet"
      description="Create personas to give your AI a consistent voice — analytical, creative, friendly, or anything in between."
      action={
        onAction
          ? {
              label: 'Create Persona',
              onClick: onAction,
              icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

export function PromptsEmptyState({ onAction }: PanelEmptyStateProps) {
  return (
    <EmptyState
      illustration={<PromptsIllustration />}
      title="Your prompt library is empty"
      description="Save reusable prompts to instantly inject expert instructions into any conversation."
      action={
        onAction
          ? {
              label: 'Add First Prompt',
              onClick: onAction,
              icon: (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ),
            }
          : undefined
      }
    />
  );
}

export function PromptsSearchEmptyState({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      illustration={<PromptsSearchIllustration />}
      title="No prompts found"
      description="Nothing matched your search or filter. Try different keywords or clear the filters."
      action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
    />
  );
}

export function HistoryEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      illustration={<HistoryIllustration />}
      title="No conversations yet"
      description="Every chat you start gets recorded here so you can revisit, search, and learn from past sessions."
      action={
        onAction
          ? { label: 'Start chatting', onClick: onAction }
          : undefined
      }
    />
  );
}

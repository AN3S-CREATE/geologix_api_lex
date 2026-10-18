/**
 * Skeleton – shared shimmer primitives + panel-level skeleton screens.
 *
 * The shimmer uses a CSS custom property animation so it adapts to dark/light
 * mode through Tailwind semantic tokens automatically.
 */
import { cn } from '../lib/utils';

// ─── Base primitive ───────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  /** Rounded corners preset */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function Skeleton({ className, rounded = 'lg' }: SkeletonProps) {
  const roundedMap = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        roundedMap[rounded],
        // shimmer overlay
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.04] before:to-transparent',
        'before:translate-x-[-100%] before:animate-[shimmer_1.6s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}

// ─── Shimmer keyframe (injected once via CSS variable trick via Tailwind) ─────
// Add this to index.css:  @keyframes shimmer { to { transform: translateX(200%); } }
// We'll handle it via inline <style> injected once in main.tsx or here:
// (Nothing needed here – see index.css addition at end of file.)

// ─── Composed building blocks ─────────────────────────────────────────────────

/** A single text-line placeholder */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3.5 w-full', className)} rounded="full" />;
}

/** A small badge pill */
export function SkeletonBadge({ className }: { className?: string }) {
  return <Skeleton className={cn('h-5 w-16', className)} rounded="full" />;
}

/** A square / rect block */
export function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-10', className)} rounded="xl" />;
}

// ─── Provider card skeleton ───────────────────────────────────────────────────

export function ProviderCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <SkeletonLine className="w-32" />
        <SkeletonBadge className="w-14" />
      </div>
      {/* Description */}
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-3/4" />
      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <SkeletonLine className="w-16 h-2.5" />
          <SkeletonLine className="w-28" />
        </div>
        <div className="space-y-1.5">
          <SkeletonLine className="w-16 h-2.5" />
          <SkeletonLine className="w-20" />
        </div>
        <div className="space-y-1.5">
          <SkeletonLine className="w-16 h-2.5" />
          <SkeletonLine className="w-16" />
        </div>
      </div>
      {/* API key row */}
      <Skeleton className="h-8 w-full mt-1" rounded="lg" />
    </div>
  );
}

export function ProvidersPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <ProviderCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Model card skeleton ──────────────────────────────────────────────────────

export function ModelCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <SkeletonLine className="w-36" />
          <SkeletonLine className="w-24 h-2.5" />
        </div>
        <SkeletonBadge className="w-14 shrink-0" />
      </div>
      {/* Category + provider pills */}
      <div className="flex gap-2">
        <SkeletonBadge className="w-16 h-6" />
        <SkeletonBadge className="w-20 h-6" />
      </div>
      {/* Context / cost */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <SkeletonLine className="w-14 h-2.5" />
          <SkeletonLine className="w-10 h-5" />
        </div>
        <div className="space-y-1.5">
          <SkeletonLine className="w-14 h-2.5" />
          <SkeletonLine className="w-10 h-5" />
        </div>
      </div>
    </div>
  );
}

export function ModelsPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <ModelCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Persona card skeleton ────────────────────────────────────────────────────

export function PersonaCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start gap-3">
        {/* Emoji placeholder */}
        <Skeleton className="w-10 h-10 shrink-0" rounded="lg" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonLine className="w-28" />
            <SkeletonBadge className="w-16" />
          </div>
          <SkeletonLine className="w-40 h-2.5" />
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function PersonasPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Keep the "No Persona" dashed card from rendering — just show card skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <PersonaCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Prompt card skeleton ─────────────────────────────────────────────────────

export function PromptCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-2.5">
      {/* Name + badge row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <SkeletonLine className="w-36" />
          <div className="flex items-center gap-2 mt-1">
            <SkeletonBadge className="w-14" />
            <SkeletonLine className="w-12 h-2.5" />
          </div>
        </div>
        <SkeletonBlock className="w-6 h-6" />
      </div>
      {/* Content lines */}
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-3/4" />
    </div>
  );
}

export function PromptsPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <PromptCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── History row skeleton ─────────────────────────────────────────────────────

export function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 bg-card border border-border rounded-xl">
      {/* Icon block */}
      <SkeletonBlock className="w-10 h-10 shrink-0" />
      {/* Text */}
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <SkeletonLine className="w-48" />
          <SkeletonBadge className="w-10" />
        </div>
        <div className="flex gap-2">
          <SkeletonBadge className="w-16 h-4" />
          <SkeletonLine className="w-20 h-4" />
        </div>
      </div>
      {/* Right meta */}
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
        <SkeletonLine className="w-12 h-2.5" />
        <SkeletonLine className="w-16 h-2.5" />
      </div>
    </div>
  );
}

export function HistoryStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 mt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-muted rounded-xl px-4 py-3 space-y-2">
          <SkeletonLine className="w-20 h-2.5" />
          <SkeletonLine className="w-12 h-6" />
        </div>
      ))}
    </div>
  );
}

export function HistoryPanelSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <ConversationRowSkeleton key={i} />
      ))}
    </div>
  );
}

import React from 'react';
import { cn } from '../../lib/utils';

// ─── Base shimmer primitive ───────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        'before:animate-shimmer before:bg-[length:400%_100%]',
        className,
      )}
    />
  );
}

// ─── Composed shapes ──────────────────────────────────────────────────────────

export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3.5 rounded-md', className)} />;
}

export function SkeletonTitle({ className }: { className?: string }) {
  return <Skeleton className={cn('h-5 rounded-md', className)} />;
}

export function SkeletonBadge({ className }: { className?: string }) {
  return <Skeleton className={cn('h-5 w-16 rounded-full', className)} />;
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-10 rounded-xl shrink-0', className)} />;
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-9 w-28 rounded-lg', className)} />;
}

// ─── Panel-specific skeletons ─────────────────────────────────────────────────

/** Matches a ProviderCard */
export function ProviderCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonTitle className="w-32" />
            <SkeletonBadge className="w-14" />
          </div>
          <SkeletonText className="w-full" />
          <SkeletonText className="w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <SkeletonText className="w-12 h-2.5" />
          <SkeletonText className="w-28" />
        </div>
        <div className="space-y-1.5">
          <SkeletonText className="w-16 h-2.5" />
          <SkeletonText className="w-20" />
        </div>
        <div className="space-y-1.5">
          <SkeletonText className="w-14 h-2.5" />
          <SkeletonText className="w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-lg mt-1" />
    </div>
  );
}

/** Matches a ModelCard */
export function ModelCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <SkeletonTitle className="w-28" />
          <SkeletonText className="w-36 h-3" />
        </div>
        <SkeletonBadge className="w-16" />
      </div>
      <div className="flex gap-2">
        <SkeletonBadge className="w-14 h-6 rounded-lg" />
        <SkeletonBadge className="w-20 h-6 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <SkeletonText className="w-12 h-2.5" />
          <SkeletonTitle className="w-10 h-4" />
        </div>
        <div className="space-y-1.5">
          <SkeletonText className="w-16 h-2.5" />
          <SkeletonTitle className="w-14 h-4" />
        </div>
      </div>
    </div>
  );
}

/** Matches a PersonaCard */
export function PersonaCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <SkeletonTitle className="w-28" />
            <SkeletonBadge className="w-20" />
          </div>
          <SkeletonText className="w-40" />
          <SkeletonText className="w-full" />
          <SkeletonText className="w-5/6" />
          <SkeletonText className="w-3/4" />
        </div>
      </div>
    </div>
  );
}

/** Matches a PromptCard */
export function PromptCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <SkeletonTitle className="w-36" />
          <div className="flex items-center gap-2">
            <SkeletonBadge className="w-14" />
            <SkeletonText className="w-16 h-3" />
          </div>
        </div>
      </div>
      <SkeletonText className="w-full" />
      <SkeletonText className="w-full" />
      <SkeletonText className="w-2/3" />
    </div>
  );
}

/** Matches a ConversationRow */
export function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 bg-card border border-border rounded-xl">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <SkeletonTitle className="w-48" />
          <SkeletonBadge className="w-10 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBadge className="w-16 h-4 rounded-md" />
          <SkeletonText className="w-20 h-3" />
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
        <SkeletonText className="w-12 h-3" />
        <SkeletonText className="w-16 h-3" />
      </div>
      <div className="hidden md:block shrink-0">
        <SkeletonText className="w-20 h-3" />
      </div>
    </div>
  );
}

/** Stats strip used in HistoryPanel header */
export function StatCardSkeleton() {
  return (
    <div className="bg-muted rounded-xl px-4 py-3 space-y-2">
      <SkeletonText className="w-20 h-2.5" />
      <Skeleton className="h-7 w-12 rounded-md" />
    </div>
  );
}

/** Provider/model selector pill in ChatWorkspace header */
export function SelectorPillSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-8 rounded-lg', className)} />;
}

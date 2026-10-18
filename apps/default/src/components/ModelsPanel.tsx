import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, DollarSign, Layers, Zap, Brain, Eye, Code2 } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { fetchModels } from '../lib/api';
import type { Model } from '../types';
import { cn } from '../lib/utils';
import { ModelsPanelSkeleton } from './Skeleton';
import { ModelsEmptyState, ModelsGlobalEmptyState } from './EmptyState';

const CATEGORY_CONFIG: Record<Model['category'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  chat: { label: 'Chat', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  reasoning: { label: 'Reasoning', icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  vision: { label: 'Vision', icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  code: { label: 'Code', icon: Code2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  fast: { label: 'Fast', icon: Zap, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
};

const STATUS_COLORS = {
  available: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  beta: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  deprecated: 'text-muted-foreground bg-muted',
};

function ModelCard({ model }: { model: Model }) {
  const cat = CATEGORY_CONFIG[model.category];
  const CatIcon = cat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate">{model.name}</h3>
          <p className="text-xs text-muted-foreground font-mono">{model.modelId}</p>
        </div>
        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0', STATUS_COLORS[model.status])}>
          {model.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={cn('flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg', cat.bg, cat.color)}>
          <CatIcon className="w-3 h-3" />
          {cat.label}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-lg">
          {model.provider}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Context</p>
          <p className="text-sm font-semibold text-foreground">{model.contextWindow}K</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cost / 1M</p>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-primary" />
            <p className="text-sm font-semibold text-foreground">{model.costPer1M < 1 ? model.costPer1M.toFixed(2) : model.costPer1M}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const ALL_CATEGORIES = ['all', 'chat', 'reasoning', 'vision', 'code', 'fast'] as const;

export function ModelsPanel() {
  const { data: models = [], loading } = useQuery(fetchModels);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof ALL_CATEGORIES[number]>('all');

  const filtered = models.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase()) ||
      m.modelId.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || m.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-foreground">Model Registry</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{models.length} models available</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 mt-2.5 sm:mt-3 flex-wrap">
          {ALL_CATEGORIES.map((cat) => {
            const cfg = cat !== 'all' ? CATEGORY_CONFIG[cat as Model['category']] : null;
            const Icon = cfg?.icon;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                  filter === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                )}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <ModelsPanelSkeleton />
        ) : models.length === 0 ? (
          <ModelsGlobalEmptyState />
        ) : filtered.length === 0 ? (
          <ModelsEmptyState onClearFilter={() => { setSearch(''); setFilter('all'); }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

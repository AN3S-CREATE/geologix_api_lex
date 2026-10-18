import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Copy, Check, Search, X, TrendingUp } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { fetchPrompts, createPrompt } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Prompt } from '../types';
import { cn } from '../lib/utils';
import { PromptsPanelSkeleton } from './Skeleton';
import { PromptsEmptyState, PromptsSearchEmptyState } from './EmptyState';

const USE_CASE_COLORS: Record<Prompt['useCase'], { bg: string; text: string; label: string; icon: string }> = {
  code:      { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400',   label: 'Code',      icon: '💻' },
  writing:   { bg: 'bg-blue-50 dark:bg-blue-950/30',       text: 'text-blue-700 dark:text-blue-400',         label: 'Writing',   icon: '✍️' },
  analysis:  { bg: 'bg-amber-50 dark:bg-amber-950/30',     text: 'text-amber-700 dark:text-amber-400',       label: 'Analysis',  icon: '📊' },
  research:  { bg: 'bg-purple-50 dark:bg-purple-950/30',   text: 'text-purple-700 dark:text-purple-400',     label: 'Research',  icon: '🔬' },
  general:   { bg: 'bg-muted',                             text: 'text-muted-foreground',                    label: 'General',   icon: '💬' },
  law:       { bg: 'bg-slate-50 dark:bg-slate-900/40',     text: 'text-slate-700 dark:text-slate-300',       label: 'Law',       icon: '⚖️' },
  tax:       { bg: 'bg-orange-50 dark:bg-orange-950/30',   text: 'text-orange-700 dark:text-orange-400',     label: 'Tax',       icon: '🧾' },
  forensics: { bg: 'bg-red-50 dark:bg-red-950/30',         text: 'text-red-700 dark:text-red-400',           label: 'Forensics', icon: '🔍' },
  business:  { bg: 'bg-teal-50 dark:bg-teal-950/30',       text: 'text-teal-700 dark:text-teal-400',         label: 'Business',  icon: '📈' },
};

function PromptCard({ prompt, onUse }: { prompt: Prompt; onUse: () => void }) {
  const [copied, setCopied] = useState(false);
  const useCase = USE_CASE_COLORS[prompt.useCase];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group cursor-pointer"
      onClick={onUse}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-semibold text-foreground text-sm">{prompt.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', useCase.bg, useCase.text)}>
              <span>{useCase.icon}</span>
              {useCase.label}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              {prompt.uses} uses
            </span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{prompt.content}</p>
      <p className="text-[11px] text-primary font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        Click to use in chat →
      </p>
    </motion.div>
  );
}

function AddPromptModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: '', useCase: 'general' as Prompt['useCase'], content: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) return;
    setLoading(true);
    await createPrompt(form);
    setLoading(false);
    onAdded();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Add Prompt</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. SQL Query Generator"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Use Case</label>
            <select
              value={form.useCase}
              onChange={(e) => setForm((f) => ({ ...f, useCase: e.target.value as Prompt['useCase'] }))}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {Object.entries(USE_CASE_COLORS).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Prompt Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={6}
              placeholder="Write your reusable prompt here..."
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !form.name.trim() || !form.content.trim()}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save Prompt'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function PromptsPanel() {
  const { data: prompts = [], loading, refetch } = useQuery(fetchPrompts);
  const { setChatSystemPrompt, setActiveView } = useAppStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Prompt['useCase'] | 'all'>('all');
  // filter type covers all useCase values + 'all'
  const [showAdd, setShowAdd] = useState(false);

  const filtered = prompts.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.useCase === filter;
    return matchSearch && matchFilter;
  });

  const handleUse = (prompt: Prompt) => {
    setChatSystemPrompt(prompt.content);
    setActiveView('chat');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground">Prompt Library</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{prompts.length} prompts saved</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        <div className="relative mb-2.5 sm:mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {(Object.entries(USE_CASE_COLORS) as [Prompt['useCase'], typeof USE_CASE_COLORS[Prompt['useCase']]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === key ? 'bg-primary text-primary-foreground' : cn('bg-muted text-muted-foreground hover:text-foreground'),
              )}
            >
              <span>{meta.icon}</span>
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <PromptsPanelSkeleton />
        ) : prompts.length === 0 ? (
          <PromptsEmptyState onAction={() => setShowAdd(true)} />
        ) : filtered.length === 0 ? (
          <PromptsSearchEmptyState onClear={() => { setSearch(''); setFilter('all'); }} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <PromptCard key={p.id} prompt={p} onUse={() => handleUse(p)} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddPromptModal onClose={() => setShowAdd(false)} onAdded={refetch} />}
      </AnimatePresence>
    </div>
  );
}

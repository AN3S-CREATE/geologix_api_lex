import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Wand2 } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { fetchPersonas, createPersona } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Persona } from '../types';
import { cn } from '../lib/utils';
import { PersonasPanelSkeleton } from './Skeleton';
import { PersonasEmptyState } from './EmptyState';

const CATEGORY_COLORS: Record<Persona['category'], string> = {
  assistant: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30',
  creative: 'bg-pink-50 text-pink-700 dark:bg-pink-950/30',
  technical: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30',
  business: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30',
  education: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30',
};

function PersonaCard({ persona, onSelect }: { persona: Persona; onSelect: () => void }) {
  const { chatSession } = useAppStore();
  const isActive = chatSession.persona?.id === persona.id;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'bg-card border rounded-xl p-5 cursor-pointer hover:shadow-sm transition-all',
        isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{persona.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground">{persona.name}</h3>
            <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full capitalize', CATEGORY_COLORS[persona.category])}>
              {persona.category}
            </span>
            {isActive && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3 italic">"{persona.tone}"</p>
          <p className="text-xs text-foreground leading-relaxed line-clamp-3">{persona.systemPrompt}</p>
        </div>
      </div>
    </motion.div>
  );
}

function AddPersonaModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState<Omit<Persona, 'id'>>({
    name: '',
    emoji: '🤖',
    category: 'assistant',
    tone: '',
    systemPrompt: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    setLoading(true);
    await createPersona(form);
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
          <h2 className="font-semibold text-foreground">Create Persona</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                className="w-full text-center text-2xl bg-muted border border-border rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Data Scientist"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Persona['category'] }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {['assistant', 'creative', 'technical', 'business', 'education'].map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Tone</label>
              <input
                type="text"
                value={form.tone}
                onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                placeholder="e.g. Analytical, precise"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">System Prompt</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
              rows={5}
              placeholder="You are a..."
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !form.name.trim() || !form.systemPrompt.trim()}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Persona'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function PersonasPanel() {
  const { data: personas = [], loading, refetch } = useQuery(fetchPersonas);
  const { setChatPersona, setActiveView } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);

  const handleSelect = (persona: Persona) => {
    setChatPersona(persona);
    setActiveView('chat');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0 gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-foreground">Persona Templates</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Tap a persona to activate it in chat</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <PersonasPanelSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* No Persona option — always visible */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => { setChatPersona(null); setActiveView('chat'); }}
                className="bg-card border border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">No Persona</p>
                  <p className="text-xs text-muted-foreground">Use raw system instructions</p>
                </div>
              </motion.div>
              {personas.map((p) => (
                <PersonaCard key={p.id} persona={p} onSelect={() => handleSelect(p)} />
              ))}
            </div>
            {personas.length === 0 && (
              <PersonasEmptyState onAction={() => setShowAdd(true)} />
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddPersonaModal onClose={() => setShowAdd(false)} onAdded={refetch} />}
      </AnimatePresence>
    </div>
  );
}

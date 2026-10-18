import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, EyeOff, Trash2, CheckCircle2, AlertCircle, Circle, Zap, X, Globe } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { fetchProviders, createProvider, deleteProvider } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Provider } from '../types';
import { cn } from '../lib/utils';
import { ProvidersPanelSkeleton } from './Skeleton';
import { ProvidersEmptyState } from './EmptyState';

const STATUS_CONFIG = {
  active: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', label: 'Active' },
  inactive: { icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Inactive' },
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Error' },
};

function ApiKeyInput({ providerId }: { providerId: string }) {
  const { providerApiKeys, setProviderApiKey } = useAppStore();
  const [show, setShow] = useState(false);
  const key = providerApiKeys[providerId] || '';

  return (
    <div className="flex items-center gap-2 mt-3">
      <div className="relative flex-1">
        <input
          type={show ? 'text' : 'password'}
          value={key}
          onChange={(e) => setProviderApiKey(providerId, e.target.value)}
          placeholder="sk-... (stored securely in memory)"
          className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 pr-8 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
        <button
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      {key && (
        <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md whitespace-nowrap">
          Key set
        </span>
      )}
    </div>
  );
}

function ProviderCard({ provider, onDelete }: { provider: Provider; onDelete: () => void }) {
  const status = STATUS_CONFIG[provider.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{provider.name}</h3>
            <span className={cn('flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', status.bg, status.color)}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{provider.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Base URL</p>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                <p className="text-xs text-foreground font-mono truncate">{provider.baseUrl || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Auth Type</p>
              <p className="text-xs text-foreground">{provider.authType || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Rate Limit</p>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" />
                <p className="text-xs text-foreground">{provider.rateLimit} RPM</p>
              </div>
            </div>
          </div>

          <ApiKeyInput providerId={provider.id} />
        </div>

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function AddProviderModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    name: '',
    baseUrl: '',
    authType: 'Bearer Token',
    description: '',
    rateLimit: 60,
    status: 'active' as const,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    await createProvider(form);
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
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Add Provider</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { label: 'Provider Name', key: 'name', placeholder: 'e.g. Cohere' },
            { label: 'Base URL', key: 'baseUrl', placeholder: 'https://api.example.com/v1' },
            { label: 'Auth Type', key: 'authType', placeholder: 'Bearer Token' },
            { label: 'Description', key: 'description', placeholder: 'Short description' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
              <input
                type="text"
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Rate Limit (RPM)</label>
            <input
              type="number"
              value={form.rateLimit}
              onChange={(e) => setForm((f) => ({ ...f, rateLimit: Number(e.target.value) }))}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Adding...' : 'Add Provider'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function ProvidersPanel() {
  const { data: providers = [], loading, refetch } = useQuery(fetchProviders);
  const [showAdd, setShowAdd] = useState(false);

  const handleDelete = async (id: string) => {
    await deleteProvider(id);
    refetch();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0 gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-foreground">AI Providers</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{providers.length} providers configured</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Provider</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <ProvidersPanelSkeleton />
        ) : providers.length === 0 ? (
          <ProvidersEmptyState onAction={() => setShowAdd(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {providers.map((p) => (
                <ProviderCard key={p.id} provider={p} onDelete={() => handleDelete(p.id)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddProviderModal onClose={() => setShowAdd(false)} onAdded={refetch} />
        )}
      </AnimatePresence>
    </div>
  );
}

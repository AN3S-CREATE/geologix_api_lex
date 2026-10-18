import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, Copy, Check,
  FileText, Braces, ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Message } from '../types';
import {
  formatMarkdown, formatJSON, buildFilename, downloadFile, exportConversation,
  type ExportFormat, type ExportMeta,
} from '../lib/export';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  meta: ExportMeta;
}

// ─── Format tab definition ────────────────────────────────────────────────────

const FORMAT_TABS: { id: ExportFormat; label: string; ext: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    ext: '.md',
    icon: FileText,
    description: 'Human-readable document — great for notes, sharing, and documentation.',
  },
  {
    id: 'json',
    label: 'JSON',
    ext: '.json',
    icon: Braces,
    description: 'Structured data with full metadata — ideal for programmatic use.',
  },
];

// ─── ExportModal ──────────────────────────────────────────────────────────────

export function ExportModal({ open, onClose, messages, meta }: ExportModalProps) {
  const [format, setFormat]   = useState<ExportFormat>('markdown');
  const [copied, setCopied]   = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Derive preview content from current format selection
  const preview = useMemo(() => {
    if (messages.length === 0) return '';
    return format === 'markdown'
      ? formatMarkdown(messages, meta)
      : formatJSON(messages, meta);
  }, [format, messages, meta]);

  const filename = useMemo(() => buildFilename(messages, format), [messages, format]);

  const stats = useMemo(() => {
    const userCount      = messages.filter((m) => m.role === 'user').length;
    const assistantCount = messages.filter((m) => m.role === 'assistant').length;
    const totalTokens    = messages.reduce((s, m) => s + (m.tokens ?? 0), 0);
    return { userCount, assistantCount, totalTokens };
  }, [messages]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [preview]);

  const handleDownload = useCallback(() => {
    exportConversation(messages, meta, format);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }, [messages, meta, format]);

  // Approximate file size
  const byteSize = new TextEncoder().encode(preview).length;
  const sizeLabel = byteSize < 1024
    ? `${byteSize} B`
    : byteSize < 1024 * 1024
    ? `${(byteSize / 1024).toFixed(1)} KB`
    : `${(byteSize / 1024 / 1024).toFixed(2)} MB`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={  { opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.34, 1.1, 0.64, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh]"
            >

              {/* ── Header ──────────────────────────────────────────── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Download className="w-4 h-4 text-primary" />
                    Export Conversation
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.userCount} from you · {stats.assistantCount} from AI
                    {stats.totalTokens > 0 && ` · ${stats.totalTokens.toLocaleString()} tokens`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Format picker ──────────────────────────────────── */}
              <div className="px-5 pt-4 pb-3 shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Format
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {FORMAT_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = format === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFormat(tab.id)}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                          isActive
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border bg-muted/30 hover:bg-muted hover:border-border/80',
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                          isActive ? 'bg-primary/15' : 'bg-muted',
                        )}>
                          <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-sm font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                              {tab.label}
                            </span>
                            <span className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                              isActive ? 'text-primary border-primary/30 bg-primary/10' : 'text-muted-foreground border-border bg-muted',
                            )}>
                              {tab.ext}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            {tab.description}
                          </p>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Preview ────────────────────────────────────────── */}
              <div className="px-5 pb-3 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Preview
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-mono">{sizeLabel}</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copied
                        ? <><Check className="w-3 h-3 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
                        : <><Copy  className="w-3 h-3" /><span>Copy</span></>
                      }
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 rounded-xl border border-border bg-muted/30 overflow-hidden">
                  <div className="h-full overflow-y-auto p-3.5">
                    <pre className="text-[11px] leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap break-words">
                      {preview || 'No messages to export.'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* ── Footer ─────────────────────────────────────────── */}
              <div className="px-5 py-4 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between gap-3">
                {/* Filename pill */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">File:</span>
                  <code className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded-lg truncate max-w-[240px]">
                    {filename}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={messages.length === 0}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95',
                      downloaded
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                      messages.length === 0 && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {downloaded ? (
                      <><Check className="w-4 h-4" /> Downloaded!</>
                    ) : (
                      <><Download className="w-4 h-4" /> Download {format === 'markdown' ? '.md' : '.json'}</>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

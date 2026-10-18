import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Search, X, Trash2, MessageSquare,
  ChevronDown, ChevronRight, RotateCcw, Pencil,
  Check, Clock, Zap, AlertTriangle, Eraser,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  useConversationHistory,
  groupConversations,
  type StoredConversation,
  type DateGroup,
} from '../hooks/useConversationHistory';
import { format } from 'date-fns';
import type { Message } from '../types';

// ─── Provider dot colours ─────────────────────────────────────────────────────

const PROVIDER_DOT: Record<string, string> = {
  'xAI Grok':        'bg-emerald-500',
  'HuggingFace':     'bg-yellow-400',
  'Google Gemini':   'bg-blue-500',
  'DeepInfra':       'bg-indigo-500',
  'Anthropic Claude':'bg-orange-500',
};

function providerDot(name: string) {
  return PROVIDER_DOT[name] ?? 'bg-muted-foreground';
}

// ─── Inline rename input ──────────────────────────────────────────────────────

function RenameInput({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  const commit = () => { if (val.trim()) onSave(val.trim()); else onCancel(); };

  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={commit}
      className="flex-1 min-w-0 text-sm bg-background border border-primary/40 rounded-md px-2 py-0.5 text-foreground outline-none focus:ring-1 focus:ring-primary/30"
    />
  );
}

// ─── Single conversation row ──────────────────────────────────────────────────

interface ConvRowProps {
  conv: StoredConversation;
  isActive: boolean;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

function ConvRow({ conv, isActive, onRestore, onDelete, onRename }: ConvRowProps) {
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  let dateLabel = '';
  try {
    dateLabel = format(new Date(conv.updatedAt), 'MMM d, h:mm a');
  } catch { dateLabel = ''; }

  const dot = providerDot(conv.provider);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      className={cn(
        'group relative rounded-xl border transition-all duration-150 cursor-pointer',
        isActive
          ? 'border-primary/40 bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-muted/50',
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r-full" />
      )}

      <div
        className="flex items-start gap-2.5 px-3 py-2.5"
        onClick={() => !renaming && onRestore(conv.id)}
      >
        {/* Icon */}
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
          isActive ? 'bg-primary/15' : 'bg-muted',
        )}>
          <MessageSquare className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <RenameInput
              initial={conv.title}
              onSave={(v) => { onRename(conv.id, v); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <p className={cn(
              'text-sm font-medium leading-snug truncate',
              isActive ? 'text-primary' : 'text-foreground',
            )}>
              {conv.title}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Provider dot + name */}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={cn('w-1.5 h-1.5 rounded-full inline-block shrink-0', dot)} />
              {conv.provider}
            </span>
            {/* Message count */}
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {conv.messageCount}
            </span>
            {/* Tokens */}
            {conv.totalTokens > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Zap className="w-3 h-3" />
                {conv.totalTokens.toLocaleString()}
              </span>
            )}
          </div>

          <p className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-1">
            <Clock className="w-2.5 h-2.5" />
            {dateLabel}
          </p>
        </div>

        {/* Action buttons — visible on hover */}
        <AnimatePresence>
          {(hovered || isActive) && !renaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex items-center gap-0.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setRenaming(true)}
                title="Rename"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-3 h-3" />
              </button>

              {confirmDelete ? (
                <button
                  onClick={() => onDelete(conv.id)}
                  title="Confirm delete"
                  className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Check className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="Delete"
                  className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Date group section ───────────────────────────────────────────────────────

function GroupSection({
  group,
  items,
  activeId,
  onRestore,
  onDelete,
  onRename,
}: {
  group: DateGroup;
  items: StoredConversation[];
  activeId: string | null;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1.5 w-full px-1 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronDown  className="w-3 h-3" />
        }
        {group}
        <span className="ml-auto text-[10px] normal-case font-normal opacity-60">{items.length}</span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden space-y-0.5"
          >
            {items.map((conv) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeId}
                onRestore={onRestore}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export interface ConversationHistorySidebarProps {
  open: boolean;
  onClose: () => void;
  activeConversationId: string | null;
  onRestoreConversation: (messages: Message[], meta: {
    provider: string;
    model: string;
    systemPrompt: string;
  }) => void;
}

export function ConversationHistorySidebar({
  open,
  onClose,
  activeConversationId,
  onRestoreConversation,
}: ConversationHistorySidebarProps) {
  const {
    conversations,
    getMessages,
    deleteConversation,
    renameConversation,
    clearAll,
    search,
  } = useConversationHistory();

  const [query, setQuery]               = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search when opening
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 200);
    else { setQuery(''); setShowClearConfirm(false); }
  }, [open]);

  const results = query.trim() ? search(query) : conversations;
  const groups  = groupConversations(results);

  const handleRestore = useCallback((id: string) => {
    const messages = getMessages(id);
    const conv = conversations.find((c) => c.id === id);
    if (!conv || messages.length === 0) return;
    onRestoreConversation(messages, {
      provider: conv.provider,
      model: conv.model,
      systemPrompt: conv.systemPrompt,
    });
    onClose();
  }, [conversations, getMessages, onRestoreConversation, onClose]);

  const handleClearAll = useCallback(() => {
    if (showClearConfirm) {
      clearAll();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
    }
  }, [showClearConfirm, clearAll]);

  return (
    <>
      {/* Backdrop — mobile only */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <motion.aside
        initial={false}
        animate={{ width: open ? 288 : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative flex flex-col h-full border-r border-border bg-card overflow-hidden shrink-0',
          // On mobile: fixed overlay
          'fixed md:relative inset-y-0 left-0 z-40 md:z-auto',
          !open && 'pointer-events-none',
        )}
        style={{ width: open ? 288 : 0 }}
      >
        <div className="flex flex-col h-full" style={{ width: 288 }}>

          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">History</h2>
              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {conversations.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Search ───────────────────────────────────────────── */}
          <div className="px-3 py-2.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-muted rounded-lg pl-8 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── List ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <History className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No history yet</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Your conversations will appear here automatically after the first exchange.
                  </p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
                <Search className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No matches for <strong>"{query}"</strong></p>
              </div>
            ) : (
              <AnimatePresence>
                {groups.map(({ group, items }) => (
                  <GroupSection
                    key={group}
                    group={group}
                    items={items}
                    activeId={activeConversationId}
                    onRestore={handleRestore}
                    onDelete={deleteConversation}
                    onRename={renameConversation}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────── */}
          {conversations.length > 0 && (
            <div className="px-3 py-3 border-t border-border shrink-0">
              <button
                onClick={handleClearAll}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all',
                  showClearConfirm
                    ? 'bg-red-500/15 text-red-500 hover:bg-red-500/25 border border-red-500/25'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80',
                )}
              >
                {showClearConfirm ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Click again to clear all history
                  </>
                ) : (
                  <>
                    <Eraser className="w-3.5 h-3.5" />
                    Clear all history
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

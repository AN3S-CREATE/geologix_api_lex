/**
 * CommandPalette — ⌘K / Ctrl+K universal command interface
 * ─────────────────────────────────────────────────────────────────────────────
 * Groups:
 *   Navigation  — jump to any panel
 *   Providers   — switch AI provider + show active indicator
 *   Chat        — clear, export, toggle history sidebar, new conversation
 *   History     — fuzzy-search saved conversations and restore them
 *   Theme       — toggle dark / light mode
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X,
  MessageSquare, Layers, Cpu, UserCircle, BookOpen,
  History, Bot, Activity,
  Zap, Brain, Sparkles, Star, FlaskConical,
  Trash2, Download, SidebarOpen, Sun, Moon,
  ArrowRight, Clock, CornerDownLeft,
  Plus,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { useConversationHistory } from '../hooks/useConversationHistory';
import type { ActiveView } from '../types';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

type CommandGroup =
  | 'Navigation'
  | 'Providers'
  | 'Chat'
  | 'History'
  | 'Theme';

interface Command {
  id: string;
  group: CommandGroup;
  label: string;
  description?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  kbd?: string[];
  action: () => void;
  /** Extra tokens searched but not displayed */
  keywords?: string;
  /** Shown in the row as a small badge */
  badge?: string;
  badgeColor?: string;
}

// ─── Provider dot / accent colors ────────────────────────────────────────────

const PROVIDER_ICON_COLOR: Record<string, string> = {
  testmode:    'text-fuchsia-500',
  grok:        'text-emerald-500',
  huggingface: 'text-yellow-500',
  google:      'text-blue-500',
  deepinfra:   'text-indigo-400',
  anthropic:   'text-orange-500',
};
const PROVIDER_ICON_BG: Record<string, string> = {
  testmode:    'bg-fuchsia-500/15',
  grok:        'bg-emerald-500/15',
  huggingface: 'bg-yellow-400/15',
  google:      'bg-blue-500/15',
  deepinfra:   'bg-indigo-500/15',
  anthropic:   'bg-orange-500/15',
};
const PROVIDER_DOT: Record<string, string> = {
  'Test Mode':        'bg-fuchsia-500',
  'xAI Grok':         'bg-emerald-500',
  'HuggingFace':      'bg-yellow-400',
  'Google Gemini':    'bg-blue-500',
  'DeepInfra':        'bg-indigo-500',
  'Anthropic Claude': 'bg-orange-500',
};

// ─── Group ordering & color ───────────────────────────────────────────────────

const GROUP_ORDER: CommandGroup[] = [
  'Navigation', 'Providers', 'Chat', 'History', 'Theme',
];

const GROUP_COLOR: Record<CommandGroup, string> = {
  Navigation: 'text-blue-500',
  Providers:  'text-emerald-500',
  Chat:       'text-primary',
  History:    'text-violet-500',
  Theme:      'text-amber-500',
};

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function matchScore(cmd: Command, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const haystack = [
    cmd.label,
    cmd.description ?? '',
    cmd.keywords ?? '',
    cmd.group,
    cmd.badge ?? '',
  ].join(' ').toLowerCase();

  if (haystack.includes(q)) return 2;
  // partial word match
  const words = q.split(/\s+/);
  const matched = words.filter((w) => haystack.includes(w)).length;
  return matched / words.length;
}

// ─── Highlight match ──────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Kbd chip ─────────────────────────────────────────────────────────────────

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="hidden sm:flex items-center gap-0.5 shrink-0">
      {keys.map((k) => (
        <kbd
          key={k}
          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-muted border border-border text-muted-foreground leading-none"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

// ─── Command row ──────────────────────────────────────────────────────────────

interface CommandRowProps {
  cmd: Command;
  active: boolean;
  query: string;
  onSelect: () => void;
  onMouseEnter: () => void;
}

function CommandRow({ cmd, active, query, onSelect, onMouseEnter }: CommandRowProps) {
  const Icon = cmd.icon;
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <button
      ref={rowRef}
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100',
        active ? 'bg-accent' : 'hover:bg-muted/60',
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
        cmd.iconBg ?? 'bg-muted',
      )}>
        <Icon className={cn('w-4 h-4', cmd.iconColor ?? 'text-muted-foreground')} />
      </div>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">
          <Highlight text={cmd.label} query={query} />
        </p>
        {cmd.description && (
          <p className="text-xs text-muted-foreground truncate">
            <Highlight text={cmd.description} query={query} />
          </p>
        )}
      </div>

      {/* Badge */}
      {cmd.badge && (
        <span className={cn(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0',
          cmd.badgeColor ?? 'bg-muted text-muted-foreground',
        )}>
          {cmd.badge}
        </span>
      )}

      {/* Keyboard shortcut */}
      {cmd.kbd && <Kbd keys={cmd.kbd} />}

      {/* Active arrow */}
      {active && <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
        <Search className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No results for "{query}"</p>
        <p className="text-xs text-muted-foreground mt-1">Try a panel name, provider, or action</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Called when user triggers "Switch provider" — passes provider key */
  onSwitchProvider?: (provider: string) => void;
  /** Called when user triggers "Clear chat" */
  onClearChat?: () => void;
  /** Called when user triggers "Export" */
  onOpenExport?: () => void;
  /** Called when user triggers "Toggle history" */
  onToggleHistory?: () => void;
  /** Whether history sidebar is currently open */
  historyOpen?: boolean;
  /** Current active provider key */
  activeProvider?: string;
}

export function CommandPalette({
  open,
  onClose,
  onSwitchProvider,
  onClearChat,
  onOpenExport,
  onToggleHistory,
  historyOpen,
  activeProvider,
}: CommandPaletteProps) {
  const { setActiveView, clearMessages } = useAppStore();
  const { conversations, getMessages } = useConversationHistory();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dark-mode toggle
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  }, [isDark]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // ── Build command list ────────────────────────────────────────────────────

  const PANEL_COMMANDS: Command[] = useMemo(() => [
    {
      id: 'nav-chat',
      group: 'Navigation',
      label: 'Go to Chat',
      description: 'Open the main AI chat workspace',
      icon: MessageSquare,
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      kbd: ['G', 'C'],
      action: () => { setActiveView('chat'); onClose(); },
    },
    {
      id: 'nav-providers',
      group: 'Navigation',
      label: 'Go to Providers',
      description: 'Manage API provider settings',
      icon: Layers,
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-500',
      kbd: ['G', 'P'],
      action: () => { setActiveView('providers'); onClose(); },
    },
    {
      id: 'nav-models',
      group: 'Navigation',
      label: 'Go to Models',
      description: 'Browse all available AI models',
      icon: Cpu,
      iconBg: 'bg-violet-500/15',
      iconColor: 'text-violet-500',
      kbd: ['G', 'M'],
      action: () => { setActiveView('models'); onClose(); },
    },
    {
      id: 'nav-personas',
      group: 'Navigation',
      label: 'Go to Personas',
      description: 'Switch active AI persona',
      icon: UserCircle,
      iconBg: 'bg-pink-500/15',
      iconColor: 'text-pink-500',
      action: () => { setActiveView('personas'); onClose(); },
    },
    {
      id: 'nav-prompts',
      group: 'Navigation',
      label: 'Go to Prompts',
      description: 'Browse saved prompt templates',
      icon: BookOpen,
      iconBg: 'bg-cyan-500/15',
      iconColor: 'text-cyan-500',
      action: () => { setActiveView('prompts'); onClose(); },
    },
    {
      id: 'nav-history',
      group: 'Navigation',
      label: 'Go to History',
      description: 'View conversation history log',
      icon: History,
      iconBg: 'bg-violet-500/15',
      iconColor: 'text-violet-500',
      action: () => { setActiveView('history'); onClose(); },
    },
    {
      id: 'nav-assistant',
      group: 'Navigation',
      label: 'Go to Assistant',
      description: 'Open the AI assistant panel',
      icon: Bot,
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      badge: 'AI',
      badgeColor: 'bg-primary/15 text-primary',
      action: () => { setActiveView('assistant'); onClose(); },
    },
    {
      id: 'nav-health',
      group: 'Navigation',
      label: 'Go to Health Check',
      description: 'Check provider API status and latency',
      icon: Activity,
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-500',
      action: () => { setActiveView('health'); onClose(); },
    },
  ], [setActiveView, onClose]);

  const PROVIDER_COMMANDS: Command[] = useMemo(() => [
    {
      id: 'prov-testmode',
      group: 'Providers',
      label: 'Switch to Test Mode',
      description: 'Local · No API key · Unlimited · Instant',
      icon: FlaskConical,
      iconBg: PROVIDER_ICON_BG.testmode,
      iconColor: PROVIDER_ICON_COLOR.testmode,
      keywords: 'test local mock offline no key instant debug',
      badge: activeProvider === 'testmode' ? 'Active' : undefined,
      badgeColor: 'bg-fuchsia-500/15 text-fuchsia-500',
      action: () => { onSwitchProvider?.('testmode'); setActiveView('chat'); onClose(); },
    },
    {
      id: 'prov-grok',
      group: 'Providers',
      label: 'Switch to xAI Grok',
      description: 'Fast streaming, real-time knowledge',
      icon: Zap,
      iconBg: PROVIDER_ICON_BG.grok,
      iconColor: PROVIDER_ICON_COLOR.grok,
      keywords: 'grok xai elon',
      badge: activeProvider === 'grok' ? 'Active' : undefined,
      badgeColor: 'bg-emerald-500/15 text-emerald-500',
      action: () => { onSwitchProvider?.('grok'); setActiveView('chat'); onClose(); },
    },
    {
      id: 'prov-huggingface',
      group: 'Providers',
      label: 'Switch to HuggingFace',
      description: 'Open-source Llama, Mixtral, Qwen & more',
      icon: Sparkles,
      iconBg: PROVIDER_ICON_BG.huggingface,
      iconColor: PROVIDER_ICON_COLOR.huggingface,
      keywords: 'huggingface hf llama mixtral open source',
      badge: activeProvider === 'huggingface' ? 'Active' : undefined,
      badgeColor: 'bg-yellow-400/15 text-yellow-500',
      action: () => { onSwitchProvider?.('huggingface'); setActiveView('chat'); onClose(); },
    },
    {
      id: 'prov-google',
      group: 'Providers',
      label: 'Switch to Google Gemini',
      description: 'Up to 2M context window, multimodal',
      icon: Star,
      iconBg: PROVIDER_ICON_BG.google,
      iconColor: PROVIDER_ICON_COLOR.google,
      keywords: 'google gemini flash pro vision',
      badge: activeProvider === 'google' ? 'Active' : undefined,
      badgeColor: 'bg-blue-500/15 text-blue-500',
      action: () => { onSwitchProvider?.('google'); setActiveView('chat'); onClose(); },
    },
    {
      id: 'prov-deepinfra',
      group: 'Providers',
      label: 'Switch to DeepInfra',
      description: 'DeepSeek R1, Llama 405B, QwQ & more',
      icon: Brain,
      iconBg: PROVIDER_ICON_BG.deepinfra,
      iconColor: PROVIDER_ICON_COLOR.deepinfra,
      keywords: 'deepinfra deepseek llama qwq reasoning',
      badge: activeProvider === 'deepinfra' ? 'Active' : undefined,
      badgeColor: 'bg-indigo-500/15 text-indigo-400',
      action: () => { onSwitchProvider?.('deepinfra'); setActiveView('chat'); onClose(); },
    },
    {
      id: 'prov-anthropic',
      group: 'Providers',
      label: 'Switch to Anthropic Claude',
      description: 'Opus 4.5, Sonnet 4.5, Haiku — safe & nuanced',
      icon: FlaskConical,
      iconBg: PROVIDER_ICON_BG.anthropic,
      iconColor: PROVIDER_ICON_COLOR.anthropic,
      keywords: 'anthropic claude opus sonnet haiku',
      badge: activeProvider === 'anthropic' ? 'Active' : undefined,
      badgeColor: 'bg-orange-500/15 text-orange-500',
      action: () => { onSwitchProvider?.('anthropic'); setActiveView('chat'); onClose(); },
    },
  ], [activeProvider, onSwitchProvider, setActiveView, onClose]);

  const CHAT_COMMANDS: Command[] = useMemo(() => [
    {
      id: 'chat-new',
      group: 'Chat',
      label: 'New Conversation',
      description: 'Clear current chat and start fresh',
      icon: Plus,
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary',
      kbd: ['⌘', 'N'],
      action: () => {
        onClearChat?.();
        clearMessages();
        setActiveView('chat');
        onClose();
      },
    },
    {
      id: 'chat-clear',
      group: 'Chat',
      label: 'Clear Chat',
      description: 'Remove all messages from the current session',
      icon: Trash2,
      iconBg: 'bg-red-500/15',
      iconColor: 'text-red-500',
      keywords: 'clear delete remove reset wipe',
      action: () => { onClearChat?.(); clearMessages(); onClose(); },
    },
    {
      id: 'chat-export',
      group: 'Chat',
      label: 'Export Conversation',
      description: 'Download as Markdown or JSON',
      icon: Download,
      iconBg: 'bg-cyan-500/15',
      iconColor: 'text-cyan-500',
      kbd: ['⌘', 'E'],
      action: () => { onOpenExport?.(); onClose(); },
    },
    {
      id: 'chat-history-sidebar',
      group: 'Chat',
      label: historyOpen ? 'Close History Sidebar' : 'Open History Sidebar',
      description: 'Toggle the conversation history panel',
      icon: SidebarOpen,
      iconBg: 'bg-violet-500/15',
      iconColor: 'text-violet-500',
      kbd: ['⌘', 'H'],
      action: () => { onToggleHistory?.(); onClose(); },
    },
  ], [onClearChat, onOpenExport, onToggleHistory, historyOpen, clearMessages, setActiveView, onClose]);

  const THEME_COMMANDS: Command[] = useMemo(() => [
    {
      id: 'theme-toggle',
      group: 'Theme',
      label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle the colour theme',
      icon: isDark ? Sun : Moon,
      iconBg: 'bg-amber-400/15',
      iconColor: 'text-amber-500',
      kbd: ['⌘', '.'],
      action: () => { toggleTheme(); onClose(); },
    },
  ], [isDark, toggleTheme, onClose]);

  // History conversations as commands
  const HISTORY_COMMANDS: Command[] = useMemo(() => {
    const recent = conversations.slice(0, 20);
    return recent.map((conv) => {
      const dot = PROVIDER_DOT[conv.provider] ?? 'bg-muted-foreground';
      let dateLabel = '';
      try { dateLabel = format(new Date(conv.updatedAt), 'MMM d'); } catch { dateLabel = ''; }

      return {
        id: `hist-${conv.id}`,
        group: 'History' as CommandGroup,
        label: conv.title,
        description: `${conv.provider} · ${conv.messageCount} msgs · ${dateLabel}`,
        icon: History,
        iconBg: 'bg-violet-500/10',
        iconColor: 'text-violet-400',
        keywords: conv.provider + ' ' + conv.model,
        badge: conv.provider.split(' ')[0],
        badgeColor: `${dot.replace('bg-', 'bg-').replace('500', '500/15')} text-muted-foreground`,
        action: () => {
          // Restore conversation — navigate to chat
          const messages = getMessages(conv.id);
          if (messages.length > 0) {
            useAppStore.setState((s) => ({
              chatSession: {
                ...s.chatSession,
                messages,
                systemPrompt: conv.systemPrompt,
              },
            }));
            setActiveView('chat');
          }
          onClose();
        },
      } as Command;
    });
  }, [conversations, getMessages, setActiveView, onClose]);

  // ── Filter & sort ─────────────────────────────────────────────────────────

  const allCommands = useMemo(
    () => [...PANEL_COMMANDS, ...PROVIDER_COMMANDS, ...CHAT_COMMANDS, ...HISTORY_COMMANDS, ...THEME_COMMANDS],
    [PANEL_COMMANDS, PROVIDER_COMMANDS, CHAT_COMMANDS, HISTORY_COMMANDS, THEME_COMMANDS],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    return allCommands
      .map((cmd) => ({ cmd, score: matchScore(cmd, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }, [allCommands, query]);

  // Group the filtered results
  const grouped = useMemo(() => {
    const map = new Map<CommandGroup, Command[]>();
    for (const cmd of filtered) {
      if (!map.has(cmd.group)) map.set(cmd.group, []);
      map.get(cmd.group)!.push(cmd);
    }
    return GROUP_ORDER
      .filter((g) => map.has(g))
      .map((g) => ({ group: g, commands: map.get(g)! }));
  }, [filtered]);

  // Flat list for keyboard navigation
  const flatList = useMemo(() => filtered, [filtered]);

  // Reset active index when results change
  useEffect(() => { setActiveIndex(0); }, [query]);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flatList[activeIndex]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [flatList, activeIndex, onClose]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="palette-panel"
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1,    y: 0    }}
            exit={  { opacity: 0, scale: 0.96, y: -8  }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[12vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
            onKeyDown={handleKeyDown}
          >
            <div className="bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '70vh' }}>

              {/* ── Search bar ───────────────────────────────── */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands, providers, history…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-muted border border-border text-muted-foreground leading-none">
                  ESC
                </kbd>
              </div>

              {/* ── Results ──────────────────────────────────── */}
              <div className="overflow-y-auto p-2 space-y-4">
                {filtered.length === 0 ? (
                  <EmptyState query={query} />
                ) : (
                  grouped.map(({ group, commands }) => {
                    const groupColor = GROUP_COLOR[group];
                    return (
                      <div key={group}>
                        <p className={cn(
                          'text-[10px] font-semibold uppercase tracking-wider px-3 py-1',
                          groupColor,
                        )}>
                          {group}
                        </p>
                        <div className="space-y-0.5">
                          {commands.map((cmd) => {
                            const flatIdx = flatList.indexOf(cmd);
                            return (
                              <CommandRow
                                key={cmd.id}
                                cmd={cmd}
                                active={flatIdx === activeIndex}
                                query={query}
                                onSelect={() => cmd.action()}
                                onMouseEnter={() => setActiveIndex(flatIdx)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Footer ───────────────────────────────────── */}
              <div className="px-4 py-2.5 border-t border-border bg-muted/30 shrink-0 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-mono">↑↓</span>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded text-[10px] bg-muted border border-border font-semibold">ESC</kbd>
                  Close
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded text-[10px] bg-muted border border-border font-semibold">⌘K</kbd>
                  to reopen
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

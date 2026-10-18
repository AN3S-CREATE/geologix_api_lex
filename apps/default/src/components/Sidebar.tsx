import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Cpu, Layers, UserCircle, BookOpen,
  History, Bot, ChevronLeft, ChevronRight, Sun, Moon,
  MoreHorizontal, Activity, Search,
} from 'lucide-react';

const LOGO_URL = 'https://files.taskade.com/space-files/2767bafe-fede-43ff-b126-df55e6b93e81/original/GeoLogix Logo wh.png';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { useCommandPaletteStore } from '../hooks/useCommandPalette';
import { useProviderHealth } from '../hooks/useProviderHealth';
import type { ActiveView } from '../types';

// ─── Nav definition ───────────────────────────────────────────────────────────

const NAV_ITEMS: { id: ActiveView; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'chat',      label: 'Chat',         icon: MessageSquare },
  { id: 'providers', label: 'Providers',    icon: Layers        },
  { id: 'models',    label: 'Models',       icon: Cpu           },
  { id: 'personas',  label: 'Personas',     icon: UserCircle    },
  { id: 'prompts',   label: 'Prompts',      icon: BookOpen      },
  { id: 'history',   label: 'History',      icon: History       },
  { id: 'health',    label: 'Health Check', icon: Activity      },
  { id: 'assistant', label: 'Assistant',    icon: Bot, badge: 'AI' },
];

// Primary 4 in bottom bar; the rest go in the "More" sheet
const MOBILE_PRIMARY: ActiveView[] = ['chat', 'models', 'history', 'assistant'];
const mobilePrimary = NAV_ITEMS.filter((n) => MOBILE_PRIMARY.includes(n.id));
const mobileSecondary = NAV_ITEMS.filter((n) => !MOBILE_PRIMARY.includes(n.id));

// ─── Health badge ─────────────────────────────────────────────────────────────
// A compact animated dot that appears on the Health Check nav item whenever
// one or more API providers are erroring.

type HealthBadgeVariant = 'error' | 'checking' | 'ok' | 'idle';

function HealthBadge({
  variant,
  collapsed,
}: {
  variant: HealthBadgeVariant;
  collapsed: boolean;
}) {
  if (variant === 'idle' || variant === 'ok') return null;

  if (variant === 'checking') {
    return (
      <span
        className={cn(
          'absolute flex items-center justify-center',
          collapsed ? 'top-0.5 right-0.5' : '-top-0.5 -right-0.5',
        )}
        title="Checking provider status…"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      </span>
    );
  }

  // error
  return (
    <span
      className={cn(
        'absolute flex items-center justify-center',
        collapsed ? 'top-0.5 right-0.5' : '-top-0.5 -right-0.5',
      )}
      title="One or more API providers are unreachable"
    >
      <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

// ─── Theme toggle ─────────────────────────────────────────────────────────────

function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };
  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8',
      )}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark
        ? <Sun  className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
        : <Moon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      }
    </button>
  );
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar } = useAppStore();
  const { openPalette } = useCommandPaletteStore();
  const { providers } = useProviderHealth();

  // Derive the badge variant from live health state
  const hasError    = providers.some(p => p.status === 'error');
  const hasChecking = providers.some(p => p.status === 'checking');
  const healthBadgeVariant: HealthBadgeVariant =
    hasError    ? 'error'
    : hasChecking ? 'checking'
    : 'idle';

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 232 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="hidden md:flex relative flex-col border-r border-border bg-card h-full shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center justify-center px-3 py-3 border-b border-border shrink-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {sidebarCollapsed ? (
            <motion.div
              key="logo-collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-10 h-10 flex items-center justify-center shrink-0"
            >
              <img
                src={LOGO_URL}
                alt="NexusAI"
                className="max-w-full max-h-full w-full h-full object-contain"
                style={{ filter: 'none' }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="logo-expanded"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0  }}
              exit={  { opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="h-10 w-full flex items-center justify-start shrink-0"
            >
              <img
                src={LOGO_URL}
                alt="NexusAI"
                className="max-h-full max-w-[190px] w-auto object-contain"
                style={{ filter: 'none' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isHealth = item.id === 'health';
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {/* Icon wrapper — positions the health badge relative to the icon */}
              <span className="relative shrink-0">
                <Icon className="w-4 h-4" />
                {isHealth && (
                  <HealthBadge variant={healthBadgeVariant} collapsed={sidebarCollapsed} />
                )}
              </span>

              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="whitespace-nowrap flex-1 text-left"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Text-level badges (e.g. "AI") */}
              {!sidebarCollapsed && item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground">
                  {item.badge}
                </span>
              )}

              {/* Error count pill — only when sidebar is expanded */}
              {isHealth && !sidebarCollapsed && hasError && (
                <AnimatePresence>
                  <motion.span
                    key="error-pill"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 tabular-nums"
                  >
                    {providers.filter(p => p.status === 'error').length} error{providers.filter(p => p.status === 'error').length !== 1 ? 's' : ''}
                  </motion.span>
                </AnimatePresence>
              )}

              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="p-2 border-t border-border flex items-center gap-1 justify-between shrink-0">
        <ThemeToggle />

        {/* ⌘K palette trigger */}
        {sidebarCollapsed ? (
          <button
            onClick={openPalette}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Command palette (⌘K)"
          >
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={openPalette}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs font-medium"
            title="Command palette"
          >
            <Search className="w-3.5 h-3.5" />
            <span>⌘K</span>
          </button>
        )}

        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft  className="w-4 h-4" />
          }
        </button>
      </div>
    </motion.aside>
  );
}

// ─── Mobile "More" bottom sheet ───────────────────────────────────────────────

function MobileMoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeView, setActiveView } = useAppStore();
  const { providers } = useProviderHealth();
  const sheetRef = useRef<HTMLDivElement>(null);

  const mobileHasError    = providers.some(p => p.status === 'error');
  const mobileHasChecking = !mobileHasError && providers.some(p => p.status === 'checking');
  const mobileHealthVariant: HealthBadgeVariant =
    mobileHasError    ? 'error'
    : mobileHasChecking ? 'checking'
    : 'idle';

  // Close on outside tap
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-16 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl pb-safe"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                More
              </p>
              <div className="grid grid-cols-3 gap-2">
                {mobileSecondary.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  const isHealth = item.id === 'health';
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveView(item.id); onClose(); }}
                      className={cn(
                        'flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all relative',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {/* Icon with health badge overlay */}
                      <span className="relative">
                        <Icon className="w-5 h-5" />
                        {isHealth && (
                          <HealthBadge variant={mobileHealthVariant} collapsed={true} />
                        )}
                      </span>
                      <span className="text-xs font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-1 py-0.5 rounded-full bg-primary text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border px-1">
                <span className="text-xs text-muted-foreground">Appearance</span>
                <ThemeToggle size="sm" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Mobile bottom nav bar ────────────────────────────────────────────────────

export function MobileBottomNav() {
  const { activeView, setActiveView } = useAppStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const secondaryActive = mobileSecondary.some((n) => n.id === activeView);

  return (
    <>
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border pb-safe">
        <div className="flex items-center justify-around px-1 py-1">
          {mobilePrimary.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); setMoreOpen(false); }}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all min-w-0',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-bg"
                    className="absolute inset-0 bg-primary/10 rounded-2xl"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
                <span className="text-[10px] font-medium relative z-10 leading-none">{item.label}</span>
                {item.badge && isActive && (
                  <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full bg-primary text-primary-foreground z-10 leading-none">
                    AI
                  </span>
                )}
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              'relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all',
              (moreOpen || secondaryActive) ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {(moreOpen || secondaryActive) && (
              <motion.div
                layoutId="mobile-nav-bg"
                className="absolute inset-0 bg-primary/10 rounded-2xl"
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              />
            )}
            <MoreHorizontal className="w-5 h-5 relative z-10" />
            <span className="text-[10px] font-medium relative z-10 leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, RefreshCw, CheckCircle2, XCircle, Loader2,
  Clock, Zap, AlertTriangle, ChevronDown, ChevronUp, Shield,
  Timer, BellRing, BellOff,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  useProviderHealth,
  AUTO_PING_INTERVAL_S,
  type ProviderHealthState,
  type HealthStatus,
} from '../hooks/useProviderHealth';

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: HealthStatus }) {
  if (status === 'checking') return (
    <span className="flex items-center gap-1.5 text-primary">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-xs font-medium">Checking…</span>
    </span>
  );
  if (status === 'ok') return (
    <span className="flex items-center gap-1.5 text-emerald-500">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <span className="text-xs font-semibold">Online</span>
    </span>
  );
  if (status === 'error') return (
    <span className="flex items-center gap-1.5 text-red-500">
      <span className="relative flex h-2.5 w-2.5">
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
      <span className="text-xs font-semibold">Error</span>
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="relative flex h-2.5 w-2.5">
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/40" />
      </span>
      <span className="text-xs font-medium">Idle</span>
    </span>
  );
}

// ─── Latency badge ────────────────────────────────────────────────────────────

function LatencyBadge({ ms }: { ms: number | null }) {
  if (ms === null) return null;
  const fast = ms < 800, mid = ms < 2000;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
      fast ? 'bg-emerald-500/10 text-emerald-500'
        : mid ? 'bg-amber-500/10 text-amber-500'
        : 'bg-red-500/10 text-red-500',
    )}>
      <Clock className="w-3 h-3" />{ms}ms
    </span>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────

function ProviderCard({ provider, onCheck }: {
  provider: ProviderHealthState;
  onCheck: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isChecking = provider.status === 'checking';
  const borderClass = provider.changed
    ? provider.status === 'ok'
      ? 'border-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.18)]'
      : 'border-red-400 shadow-[0_0_0_3px_rgba(248,113,113,0.18)]'
    : provider.status === 'ok' ? 'border-emerald-500/25'
    : provider.status === 'error' ? 'border-red-500/25'
    : 'border-border';

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border bg-gradient-to-br overflow-hidden transition-all duration-300',
        provider.color, borderClass)}>
      <AnimatePresence>
        {provider.changed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className={cn('flex items-center gap-2 px-5 py-1.5 text-[11px] font-semibold',
              provider.status === 'ok' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}>
            <BellRing className="w-3 h-3" />
            {provider.status === 'ok' ? 'Status recovered — back online' : 'Status changed — now unreachable'}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 px-5 py-4">
        <div className="text-2xl select-none">{provider.logo}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-foreground text-sm">{provider.name}</h3>
            <LatencyBadge ms={provider.latencyMs} />
          </div>
          <div className="flex items-center gap-3">
            <StatusDot status={provider.status} />
            <span className="text-[11px] text-muted-foreground font-mono truncate">{provider.model}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onCheck(provider.id)} disabled={isChecking}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              isChecking
                ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-95')}>
            {isChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Ping
          </button>
          {provider.error && (
            <button onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && provider.error && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mx-4 mb-4 px-4 py-3 bg-red-500/8 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 font-mono leading-relaxed break-all">{provider.error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ providers }: { providers: ProviderHealthState[] }) {
  const total    = providers.length;
  const ok       = providers.filter(p => p.status === 'ok').length;
  const errors   = providers.filter(p => p.status === 'error').length;
  const checking = providers.filter(p => p.status === 'checking').length;
  const latencies = providers.filter(p => p.latencyMs !== null);
  const avgLatency = latencies.length
    ? latencies.reduce((a, p) => a + (p.latencyMs ?? 0), 0) / latencies.length
    : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Online',      value: ok,       icon: CheckCircle2, color: ok > 0      ? 'text-emerald-500' : 'text-muted-foreground', bg: ok > 0      ? 'bg-emerald-500/10' : 'bg-muted' },
        { label: 'Errors',      value: errors,   icon: XCircle,      color: errors > 0  ? 'text-red-500'     : 'text-muted-foreground', bg: errors > 0  ? 'bg-red-500/10'     : 'bg-muted' },
        { label: 'Checking',    value: checking, icon: Loader2,      color: checking > 0? 'text-primary'     : 'text-muted-foreground', bg: checking > 0? 'bg-primary/10'     : 'bg-muted' },
        { label: 'Avg Latency', value: avgLatency !== null ? `${Math.round(avgLatency)}ms` : '—', icon: Clock, color: 'text-foreground', bg: 'bg-muted' },
      ].map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={cn('rounded-xl p-3.5 flex items-center gap-3', bg)}>
          <Icon className={cn('w-5 h-5 shrink-0', color)} />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn('text-lg font-bold leading-none mt-0.5', color)}>
              {typeof value === 'number' && label !== 'Avg Latency' ? `${value}/${total}` : value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Countdown ring ───────────────────────────────────────────────────────────

function CountdownRing({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const r = 18, circ = 2 * Math.PI * r, dash = circ * (secondsLeft / total);
  const mins = Math.floor(secondsLeft / 60), secs = secondsLeft % 60;
  const label = mins > 0 ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${secs}s`;
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" className="stroke-muted" />
          <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
            className="stroke-primary transition-all duration-1000"
            strokeDasharray={`${dash} ${circ}`} />
        </svg>
        <Timer className="absolute inset-0 m-auto w-3.5 h-3.5 text-primary" />
      </div>
      <div className="hidden sm:block">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Next ping</p>
        <p className="text-sm font-bold text-foreground tabular-nums">{label}</p>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function HealthCheckPanel() {
  const { providers, pingOne, pingAll, anyChecking, lastChecked, countdown, autoEnabled, setAutoEnabled } = useProviderHealth();
  const changedCount = providers.filter(p => p.changed).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h1 className="text-base sm:text-lg font-semibold text-foreground">Health Check</h1>
            {changedCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                <BellRing className="w-3 h-3" />{changedCount} changed
              </motion.span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {lastChecked ? `Last checked ${lastChecked.toLocaleTimeString()}` : 'Running initial check on app load…'}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <AnimatePresence>
            {autoEnabled && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <CountdownRing secondsLeft={countdown} total={AUTO_PING_INTERVAL_S} />
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => setAutoEnabled(!autoEnabled)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
              autoEnabled
                ? 'bg-primary/10 text-primary border-primary/25 hover:bg-primary/20'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground hover:bg-muted/80')}>
            {autoEnabled ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{autoEnabled ? 'Auto on' : 'Auto off'}</span>
          </button>

          <button onClick={() => pingAll()} disabled={anyChecking}
            className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all active:scale-95',
              anyChecking
                ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm')}>
            <RefreshCw className={cn('w-4 h-4', anyChecking && 'animate-spin')} />
            <span className="hidden sm:inline">Check All</span>
            <span className="sm:hidden">All</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <SummaryBar providers={providers} />
        <div className="space-y-3">
          <AnimatePresence>
            {providers.map(p => <ProviderCard key={p.id} provider={p} onCheck={pingOne} />)}
          </AnimatePresence>
        </div>
        <div className="mt-6 flex items-start gap-2 px-4 py-3 rounded-xl bg-muted/60 border border-border">
          <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Checks run automatically on app load and every 5 minutes thereafter. Each ping sends
            1 token to the cheapest available model. Keys live in{' '}
            <strong>Space Settings → Secrets</strong>
            {' '}— add them there and the endpoints respond instantly, no rebuild required.
          </p>
        </div>
      </div>
    </div>
  );
}


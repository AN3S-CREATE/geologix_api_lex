import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional label shown in the error card header (e.g. "Providers Panel") */
  label?: string;
  /** Render a compact inline error instead of the full-page variant */
  compact?: boolean;
  /** Called after the user clicks "Try Again" */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  eventId: string | null;
  showStack: boolean;
}

// ─── Error Boundary class ─────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, eventId: null, showStack: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error, eventId: `${Date.now().toString(36).toUpperCase()}` };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to console so dev-tools / monitoring can pick it up
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null, eventId: null, showStack: false });
    this.props.onReset?.();
  };

  toggleStack = () => this.setState((s) => ({ showStack: !s.showStack }));

  render() {
    const { error, eventId, showStack } = this.state;
    const { children, label, compact } = this.props;

    if (!error) return <>{children}</>;

    if (compact) {
      return (
        <CompactErrorFallback
          label={label}
          error={error}
          eventId={eventId}
          showStack={showStack}
          onToggleStack={this.toggleStack}
          onReset={this.handleReset}
        />
      );
    }

    return (
      <PanelErrorFallback
        label={label}
        error={error}
        eventId={eventId}
        showStack={showStack}
        onToggleStack={this.toggleStack}
        onReset={this.handleReset}
      />
    );
  }
}

// ─── Full-panel fallback ──────────────────────────────────────────────────────

interface FallbackProps {
  label?: string;
  error: Error;
  eventId: string | null;
  showStack: boolean;
  onToggleStack: () => void;
  onReset: () => void;
}

function PanelErrorFallback({ label, error, eventId, showStack, onToggleStack, onReset }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {label ? `${label} crashed` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred. Your other panels are unaffected.
          </p>
        </div>

        {/* Error message box */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm font-mono text-destructive break-words leading-relaxed">
            {error.message || 'Unknown error'}
          </p>
        </div>

        {/* Stack trace toggle */}
        <button
          onClick={onToggleStack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 w-full justify-center"
        >
          {showStack ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showStack ? 'Hide' : 'Show'} stack trace
        </button>

        {showStack && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <pre className="bg-muted border border-border rounded-xl p-4 text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {error.stack || 'No stack available'}
            </pre>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-muted text-muted-foreground text-sm font-medium rounded-xl hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            Reload
          </button>
        </div>

        {/* Event ID */}
        {eventId && (
          <p className="text-center text-[11px] text-muted-foreground/60 mt-4 font-mono">
            Error ID: {eventId}
          </p>
        )}
      </motion.div>
    </div>
  );
}

// ─── Compact inline fallback ──────────────────────────────────────────────────

function CompactErrorFallback({ label, error, eventId, showStack, onToggleStack, onReset }: FallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {label ? `${label} failed to render` : 'Component error'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
            {error.message || 'Unknown error'}
          </p>

          {showStack && (
            <pre className="mt-2 bg-muted rounded-lg p-3 text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {error.stack || 'No stack available'}
            </pre>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleStack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title={showStack ? 'Hide stack' : 'Show stack'}
          >
            {showStack ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Try again"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Root-level fallback (full screen) ───────────────────────────────────────

interface RootErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function RootErrorFallback({ error, resetErrorBoundary }: RootErrorFallbackProps) {
  const [showStack, setShowStack] = React.useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-8">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">NexusAI encountered an error</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          An unexpected error brought down the application. Click below to restart — your data is safe.
        </p>

        <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-5 py-4 mb-6 text-left">
          <p className="text-sm font-mono text-destructive break-words leading-relaxed">
            {error.message || 'Unknown error'}
          </p>
        </div>

        <button
          onClick={() => setShowStack((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto mb-4"
        >
          {showStack ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showStack ? 'Hide' : 'Show'} stack trace
        </button>

        {showStack && (
          <pre className="bg-muted border border-border rounded-xl p-4 text-[11px] font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto mb-6 text-left">
            {error.stack || 'No stack available'}
          </pre>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Restart App
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-muted text-muted-foreground font-medium rounded-xl hover:bg-muted/80 hover:text-foreground transition-colors"
          >
            Hard Reload
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Convenience wrapper ──────────────────────────────────────────────────────

/** Drop-in wrapper that adds panel-level error isolation */
export function withErrorBoundary(
  Component: React.ComponentType,
  label?: string,
): React.FC {
  return function WrappedWithBoundary(props) {
    return (
      <ErrorBoundary label={label}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

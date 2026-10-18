import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary, RootErrorFallback } from './components/ErrorBoundary';
import { Sidebar, MobileBottomNav } from './components/Sidebar';
import { ChatWorkspace } from './components/ChatWorkspace';
import { ProvidersPanel } from './components/ProvidersPanel';
import { ModelsPanel } from './components/ModelsPanel';
import { PersonasPanel } from './components/PersonasPanel';
import { PromptsPanel } from './components/PromptsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { AssistantPanel } from './components/AssistantPanel';
import { HealthCheckPanel } from './components/HealthCheckPanel';
import { CommandPalette } from './components/CommandPalette';
import { FloatingAgentChat } from './components/blocks';
import { useAppStore } from './store/useAppStore';
import {
  useCommandPaletteStore,
  useCommandPaletteKeyBinding,
} from './hooks/useCommandPalette';

// ─── Custom event bridge ──────────────────────────────────────────────────────
// The palette lives outside ChatWorkspace, so we use lightweight custom events
// to reach actions that live inside the chat component.

export const PALETTE_EVENTS = {
  SWITCH_PROVIDER:  'geologix:switchProvider',
  CLEAR_CHAT:       'geologix:clearChat',
  OPEN_EXPORT:      'geologix:openExport',
  TOGGLE_HISTORY:   'geologix:toggleHistory',
} as const;

export function dispatchPaletteEvent(type: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

// ─── Global palette wrapper ───────────────────────────────────────────────────

function GlobalCommandPalette() {
  // Mount the ⌘K key binding once at root
  useCommandPaletteKeyBinding();

  const { open, closePalette } = useCommandPaletteStore();

  // Track historyOpen state via event
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [activeProvider, setActiveProvider] = React.useState<string>('grok');

  React.useEffect(() => {
    const onHistoryChange = (e: Event) => {
      setHistoryOpen((e as CustomEvent).detail as boolean);
    };
    const onProviderChange = (e: Event) => {
      setActiveProvider((e as CustomEvent).detail as string);
    };
    window.addEventListener('geologix:historyOpenChange', onHistoryChange);
    window.addEventListener('geologix:activeProviderChange', onProviderChange);
    return () => {
      window.removeEventListener('geologix:historyOpenChange', onHistoryChange);
      window.removeEventListener('geologix:activeProviderChange', onProviderChange);
    };
  }, []);

  return (
    <CommandPalette
      open={open}
      onClose={closePalette}
      activeProvider={activeProvider}
      historyOpen={historyOpen}
      onSwitchProvider={(p) => dispatchPaletteEvent(PALETTE_EVENTS.SWITCH_PROVIDER, p)}
      onClearChat={()   => dispatchPaletteEvent(PALETTE_EVENTS.CLEAR_CHAT)}
      onOpenExport={()  => dispatchPaletteEvent(PALETTE_EVENTS.OPEN_EXPORT)}
      onToggleHistory={() => dispatchPaletteEvent(PALETTE_EVENTS.TOGGLE_HISTORY)}
    />
  );
}

// Each panel gets its own isolated boundary so a crash in one
// never tears down the entire workspace.
function ActivePanel() {
  const { activeView } = useAppStore();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.16 }}
        className="h-full"
      >
        {activeView === 'chat' && (
          <ErrorBoundary label="Chat">
            <ChatWorkspace />
          </ErrorBoundary>
        )}
        {activeView === 'providers' && (
          <ErrorBoundary label="Providers">
            <ProvidersPanel />
          </ErrorBoundary>
        )}
        {activeView === 'models' && (
          <ErrorBoundary label="Models">
            <ModelsPanel />
          </ErrorBoundary>
        )}
        {activeView === 'personas' && (
          <ErrorBoundary label="Personas">
            <PersonasPanel />
          </ErrorBoundary>
        )}
        {activeView === 'prompts' && (
          <ErrorBoundary label="Prompts">
            <PromptsPanel />
          </ErrorBoundary>
        )}
        {activeView === 'history' && (
          <ErrorBoundary label="History">
            <HistoryPanel />
          </ErrorBoundary>
        )}
        {activeView === 'assistant' && (
          <ErrorBoundary label="Assistant">
            <AssistantPanel />
          </ErrorBoundary>
        )}
        {activeView === 'health' && (
          <ErrorBoundary label="Health Check">
            <HealthCheckPanel />
          </ErrorBoundary>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Root boundary catches anything that escapes panel boundaries
// (Sidebar crash, store corruption, etc.)
class RootBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RootBoundary] Fatal error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <RootErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.reset}
        />
      );
    }
    return <>{this.props.children}</>;
  }
}

const App: React.FC = function () {
  React.useEffect(() => {
    document.title = 'NexusAI';
  }, []);

  return (
    <RootBoundary>
      {/* Global command palette — rendered outside main flow so z-50 clears everything */}
      <GlobalCommandPalette />

      <div className="flex h-[100dvh] bg-background overflow-hidden">
        {/* Desktop sidebar */}
        <ErrorBoundary label="Sidebar" compact>
          <Sidebar />
        </ErrorBoundary>

        {/* Main content — adds bottom padding on mobile for the nav bar */}
        <main className="flex-1 min-w-0 overflow-hidden pb-[56px] md:pb-0">
          <ActivePanel />
        </main>

        {/* Mobile bottom nav */}
        <ErrorBoundary label="Navigation" compact>
          <MobileBottomNav />
        </ErrorBoundary>
      </div>

      {/* Floating agent chat — always accessible on every screen */}
      <FloatingAgentChat
        agentId="01KNSYW9HK6YT9VPFAP1AVEHRW"
        publicAgentId="01KNSYW9HQXVZNV7ZKKWBS0D08"
      />
    </RootBoundary>
  );
};

export default App;

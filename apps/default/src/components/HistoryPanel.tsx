import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Clock, Zap, Archive, Circle } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { fetchConversations } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import type { Conversation } from '../types';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { HistoryPanelSkeleton, HistoryStatsSkeleton } from './Skeleton';
import { HistoryEmptyState } from './EmptyState';

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40',
  Anthropic: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40',
  Google: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40',
  Groq: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40',
  Mistral: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40',
};

function ConversationRow({ conv }: { conv: Conversation }) {
  const providerColor = PROVIDER_COLORS[conv.provider] || 'bg-muted text-muted-foreground';
  const isActive = conv.status === 'active';

  let dateStr = '';
  try {
    dateStr = format(parseISO(conv.startedAt), 'MMM d, yyyy');
  } catch {
    dateStr = conv.startedAt?.split('T')[0] || '';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 px-4 py-3.5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
    >
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <MessageSquare className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-medium text-foreground truncate">{conv.title}</h3>
          {isActive ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-full shrink-0">
              <Circle className="w-1.5 h-1.5 fill-current" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
              <Archive className="w-2.5 h-2.5" />
              Archived
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded-md', providerColor)}>
            {conv.provider}
          </span>
          <span className="text-xs text-muted-foreground">{conv.model}</span>
          {conv.persona && (
            <span className="text-xs text-muted-foreground">· {conv.persona}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 shrink-0 text-right">
        <div className="hidden sm:block">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
            <MessageSquare className="w-3 h-3" />
            {conv.messages}
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
            <Zap className="w-3 h-3" />
            {conv.tokensUsed.toLocaleString()}
          </p>
        </div>
        <div className="hidden md:block">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {dateStr}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function HistoryPanel() {
  const { data: conversations = [], loading } = useQuery(fetchConversations);
  const { setActiveView } = useAppStore();

  const totalTokens = conversations.reduce((sum, c) => sum + c.tokensUsed, 0);
  const totalMessages = conversations.reduce((sum, c) => sum + c.messages, 0);
  const activeCount = conversations.filter((c) => c.status === 'active').length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border shrink-0">
        <h1 className="text-base sm:text-lg font-semibold text-foreground mb-0.5 sm:mb-1">Conversation History</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{conversations.length} sessions recorded</p>

        {/* Stats */}
        {loading ? (
          <HistoryStatsSkeleton />
        ) : (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Total Sessions', value: conversations.length },
              { label: 'Messages Sent', value: totalMessages.toLocaleString() },
              { label: 'Tokens Used', value: totalTokens.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xl font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <HistoryPanelSkeleton />
        ) : conversations.length === 0 ? (
          <HistoryEmptyState onAction={() => setActiveView('chat')} />
        ) : (
          <div className="space-y-2.5">
            {conversations.map((conv) => (
              <ConversationRow key={conv.id} conv={conv} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

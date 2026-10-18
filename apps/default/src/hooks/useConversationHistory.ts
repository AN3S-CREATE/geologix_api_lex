/**
 * useConversationHistory
 * ─────────────────────────────────────────────────────────────────────────────
 * Full localStorage persistence for chat sessions.
 * Stores complete message arrays so any conversation can be restored.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Message } from '../types';

// ─── Stored shape ─────────────────────────────────────────────────────────────

export interface StoredConversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  systemPrompt: string;
  personaName?: string;
  messages: SerializedMessage[];
  messageCount: number;
  totalTokens: number;
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
}

/** Messages serialized to plain JSON (Date → string) */
interface SerializedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
  tokens?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nexusai_history_v1';
const MAX_CONVERSATIONS = 200;

function loadFromStorage(): StoredConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredConversation[];
  } catch {
    return [];
  }
}

function saveToStorage(convs: StoredConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch {
    // Storage quota exceeded — prune oldest half
    const pruned = convs.slice(0, Math.floor(convs.length / 2));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned)); } catch { /* ignore */ }
  }
}

function serializeMessages(msgs: Message[]): SerializedMessage[] {
  return msgs.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
    provider: m.provider,
    model: m.model,
    tokens: m.tokens,
  }));
}

function deserializeMessages(msgs: SerializedMessage[]): Message[] {
  return msgs.map((m) => ({
    ...m,
    timestamp: new Date(m.timestamp),
  }));
}

function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New conversation';
  const text = firstUser.content.trim();
  return text.length > 60 ? text.slice(0, 58) + '…' : text;
}

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Date grouping ────────────────────────────────────────────────────────────

export type DateGroup = 'Today' | 'Yesterday' | 'This week' | 'This month' | 'Older';

export function getDateGroup(isoDate: string): DateGroup {
  const now = new Date();
  const d   = new Date(isoDate);
  const diffMs   = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1 && now.getDate() === d.getDate()) return 'Today';
  if (diffDays < 2 && now.getDate() - d.getDate() === 1) return 'Yesterday';
  if (diffDays < 7)  return 'This week';
  if (diffDays < 30) return 'This month';
  return 'Older';
}

export function groupConversations(
  convs: StoredConversation[],
): { group: DateGroup; items: StoredConversation[] }[] {
  const order: DateGroup[] = ['Today', 'Yesterday', 'This week', 'This month', 'Older'];
  const map = new Map<DateGroup, StoredConversation[]>();

  for (const c of convs) {
    const g = getDateGroup(c.updatedAt);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(c);
  }

  return order
    .filter((g) => map.has(g))
    .map((g) => ({ group: g, items: map.get(g)! }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseConversationHistoryReturn {
  conversations: StoredConversation[];
  /** Save (or update) a conversation. Pass activeId to update existing. */
  saveConversation: (opts: {
    activeId: string | null;
    messages: Message[];
    provider: string;
    model: string;
    systemPrompt: string;
    personaName?: string;
  }) => string; // returns the id (new or existing)
  /** Restore messages from a stored conversation */
  getMessages: (id: string) => Message[];
  /** Delete a conversation by id */
  deleteConversation: (id: string) => void;
  /** Rename a conversation */
  renameConversation: (id: string, title: string) => void;
  /** Clear all history */
  clearAll: () => void;
  /** Fuzzy search across titles and first messages */
  search: (query: string) => StoredConversation[];
}

export function useConversationHistory(): UseConversationHistoryReturn {
  const [conversations, setConversations] = useState<StoredConversation[]>(() =>
    loadFromStorage().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  );

  // Persist on every change
  useEffect(() => {
    saveToStorage(conversations);
  }, [conversations]);

  const saveConversation = useCallback((opts: {
    activeId: string | null;
    messages: Message[];
    provider: string;
    model: string;
    systemPrompt: string;
    personaName?: string;
  }): string => {
    const { activeId, messages, provider, model, systemPrompt, personaName } = opts;
    if (messages.length === 0) return activeId ?? generateId();

    const serialized = serializeMessages(messages);
    const totalTokens = messages.reduce((s, m) => s + (m.tokens ?? 0), 0);
    const now = new Date().toISOString();

    let id = activeId ?? '';

    setConversations((prev) => {
      const existing = activeId ? prev.find((c) => c.id === activeId) : null;

      if (existing) {
        // Update existing
        return prev
          .map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  title: deriveTitle(messages),
                  provider,
                  model,
                  systemPrompt,
                  personaName,
                  messages: serialized,
                  messageCount: messages.length,
                  totalTokens,
                  updatedAt: now,
                }
              : c,
          )
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      } else {
        // New conversation
        id = generateId();
        const entry: StoredConversation = {
          id,
          title: deriveTitle(messages),
          provider,
          model,
          systemPrompt,
          personaName,
          messages: serialized,
          messageCount: messages.length,
          totalTokens,
          createdAt: now,
          updatedAt: now,
        };
        const updated = [entry, ...prev].slice(0, MAX_CONVERSATIONS);
        return updated;
      }
    });

    return id;
  }, []);

  const getMessages = useCallback((id: string): Message[] => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return [];
    return deserializeMessages(conv.messages);
  }, [conversations]);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  }, []);

  const clearAll = useCallback(() => {
    setConversations([]);
  }, []);

  const search = useCallback((query: string): StoredConversation[] => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        (c.messages[0]?.content ?? '').toLowerCase().includes(q),
    );
  }, [conversations]);

  return {
    conversations,
    saveConversation,
    getMessages,
    deleteConversation,
    renameConversation,
    clearAll,
    search,
  };
}

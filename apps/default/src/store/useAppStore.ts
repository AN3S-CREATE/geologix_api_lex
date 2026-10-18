import { create } from 'zustand';
import type { ActiveView, Provider, Model, Persona, Prompt, Conversation, Message } from '../types';

interface ChatSession {
  provider: string;
  model: string;
  persona: Persona | null;
  systemPrompt: string;
  messages: Message[];
  conversationId?: string;
}

interface AppStore {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Chat state
  chatSession: ChatSession;
  setChatProvider: (provider: string) => void;
  setChatModel: (model: string) => void;
  setChatPersona: (persona: Persona | null) => void;
  setChatSystemPrompt: (prompt: string) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;

  // Provider panel
  selectedProvider: Provider | null;
  setSelectedProvider: (p: Provider | null) => void;
  providerApiKeys: Record<string, string>;
  setProviderApiKey: (providerId: string, key: string) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeView: 'chat',
  setActiveView: (view) => set({ activeView: view }),

  chatSession: {
    provider: 'OpenAI',
    model: 'GPT-4o',
    persona: null,
    systemPrompt: 'You are a helpful, harmless, and honest AI assistant.',
    messages: [],
  },
  setChatProvider: (provider) =>
    set((s) => ({ chatSession: { ...s.chatSession, provider } })),
  setChatModel: (model) =>
    set((s) => ({ chatSession: { ...s.chatSession, model } })),
  setChatPersona: (persona) =>
    set((s) => ({
      chatSession: {
        ...s.chatSession,
        persona,
        systemPrompt: persona?.systemPrompt ?? s.chatSession.systemPrompt,
      },
    })),
  setChatSystemPrompt: (systemPrompt) =>
    set((s) => ({ chatSession: { ...s.chatSession, systemPrompt } })),
  addMessage: (message) =>
    set((s) => ({
      chatSession: { ...s.chatSession, messages: [...s.chatSession.messages, message] },
    })),
  clearMessages: () =>
    set((s) => ({ chatSession: { ...s.chatSession, messages: [] } })),

  selectedProvider: null,
  setSelectedProvider: (p) => set({ selectedProvider: p }),
  providerApiKeys: {},
  setProviderApiKey: (providerId, key) =>
    set((s) => ({ providerApiKeys: { ...s.providerApiKeys, [providerId]: key } })),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

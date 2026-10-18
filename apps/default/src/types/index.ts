export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  status: 'active' | 'inactive' | 'error';
  authType: string;
  description: string;
  rateLimit: number;
  apiKey?: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  category: 'chat' | 'reasoning' | 'vision' | 'code' | 'fast';
  contextWindow: number;
  costPer1M: number;
  status: 'available' | 'beta' | 'deprecated';
}

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  category: 'assistant' | 'creative' | 'technical' | 'business' | 'education';
  tone: string;
  systemPrompt: string;
}

export interface Prompt {
  id: string;
  name: string;
  useCase: 'code' | 'writing' | 'analysis' | 'research' | 'general' | 'law' | 'tax' | 'forensics' | 'business';
  content: string;
  uses: number;
}

export interface Conversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  persona: string;
  messages: number;
  tokensUsed: number;
  status: 'active' | 'archived';
  startedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string;
  tokens?: number;
  /** Time-to-first-token in ms */
  ttft?: number;
  /** Total response time in ms */
  responseTime?: number;
}

export type ActiveView = 'chat' | 'providers' | 'models' | 'personas' | 'prompts' | 'history' | 'assistant' | 'health';

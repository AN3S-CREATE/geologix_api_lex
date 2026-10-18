import axios from 'axios';
import type { Provider, Model, Persona, Prompt, Conversation } from '../types';

const BASE = '/api/taskade';

// --- Raw node helpers ---
function nodeToProvider(node: any): Provider | null {
  const fv = node.fieldValues || {};
  const name = fv['/text'];
  if (!name) return null;
  return {
    id: node.id,
    name,
    baseUrl: fv['/attributes/@prov1'] || '',
    status: (fv['/attributes/@prov2'] as Provider['status']) || 'inactive',
    authType: fv['/attributes/@prov3'] || '',
    description: fv['/attributes/@prov4'] || '',
    rateLimit: fv['/attributes/@prov5'] || 0,
  };
}

function nodeToModel(node: any): Model | null {
  const fv = node.fieldValues || {};
  const name = fv['/text'];
  if (!name) return null;
  return {
    id: node.id,
    name,
    provider: fv['/attributes/@mod1'] || '',
    modelId: fv['/attributes/@mod2'] || '',
    category: (fv['/attributes/@mod3'] as Model['category']) || 'chat',
    contextWindow: fv['/attributes/@mod4'] || 0,
    costPer1M: fv['/attributes/@mod5'] || 0,
    status: (fv['/attributes/@mod6'] as Model['status']) || 'available',
  };
}

function nodeToPersona(node: any): Persona | null {
  const fv = node.fieldValues || {};
  const name = fv['/text'];
  if (!name) return null;
  return {
    id: node.id,
    name,
    emoji: fv['/attributes/@per4'] || '🤖',
    category: (fv['/attributes/@per1'] as Persona['category']) || 'assistant',
    tone: fv['/attributes/@per2'] || '',
    systemPrompt: fv['/attributes/@per3'] || '',
  };
}

function nodeToPrompt(node: any): Prompt | null {
  const fv = node.fieldValues || {};
  const name = fv['/text'];
  if (!name) return null;
  return {
    id: node.id,
    name,
    useCase: (fv['/attributes/@prm1'] as Prompt['useCase']) || 'general',
    content: fv['/attributes/@prm2'] || '',
    uses: fv['/attributes/@prm3'] || 0,
  };
}

function nodeToConversation(node: any): Conversation | null {
  const fv = node.fieldValues || {};
  const title = fv['/text'];
  if (!title) return null;
  return {
    id: node.id,
    title,
    provider: fv['/attributes/@cnv1'] || '',
    model: fv['/attributes/@cnv2'] || '',
    persona: fv['/attributes/@cnv3'] || '',
    messages: fv['/attributes/@cnv4'] || 0,
    tokensUsed: fv['/attributes/@cnv5'] || 0,
    status: (fv['/attributes/@cnv6'] as Conversation['status']) || 'active',
    startedAt: fv['/attributes/@cnv7'] || new Date().toISOString(),
  };
}

// --- API functions ---
export async function fetchProviders(): Promise<Provider[]> {
  try {
    const { data } = await axios.get(`${BASE}/projects/LD71h2TA9WzETTai/nodes`);
    return ((data?.payload?.nodes) || []).map(nodeToProvider).filter(Boolean) as Provider[];
  } catch {
    return [];
  }
}

export async function createProvider(p: Omit<Provider, 'id'>): Promise<void> {
  await axios.post(`${BASE}/projects/LD71h2TA9WzETTai/nodes`, {
    '/text': p.name,
    '/attributes/@prov1': p.baseUrl,
    '/attributes/@prov2': p.status,
    '/attributes/@prov3': p.authType,
    '/attributes/@prov4': p.description,
    '/attributes/@prov5': p.rateLimit,
  });
}

export async function deleteProvider(id: string): Promise<void> {
  await axios.delete(`${BASE}/projects/LD71h2TA9WzETTai/nodes/${id}`);
}

export async function fetchModels(): Promise<Model[]> {
  try {
    const { data } = await axios.get(`${BASE}/projects/mhyuN6VJR8suXYkK/nodes`);
    return ((data?.payload?.nodes) || []).map(nodeToModel).filter(Boolean) as Model[];
  } catch {
    return [];
  }
}

export async function fetchPersonas(): Promise<Persona[]> {
  try {
    const { data } = await axios.get(`${BASE}/projects/F3qPx9dfvbKSS1R2/nodes`);
    return ((data?.payload?.nodes) || []).map(nodeToPersona).filter(Boolean) as Persona[];
  } catch {
    return [];
  }
}

export async function createPersona(p: Omit<Persona, 'id'>): Promise<void> {
  await axios.post(`${BASE}/projects/F3qPx9dfvbKSS1R2/nodes`, {
    '/text': p.name,
    '/attributes/@per1': p.category,
    '/attributes/@per2': p.tone,
    '/attributes/@per3': p.systemPrompt,
    '/attributes/@per4': p.emoji,
  });
}

export async function fetchPrompts(): Promise<Prompt[]> {
  try {
    const { data } = await axios.get(`${BASE}/projects/ZpkEnTZ36xogJCGu/nodes`);
    return ((data?.payload?.nodes) || []).map(nodeToPrompt).filter(Boolean) as Prompt[];
  } catch {
    return [];
  }
}

export async function createPrompt(p: Omit<Prompt, 'id' | 'uses'>): Promise<void> {
  await axios.post(`${BASE}/projects/ZpkEnTZ36xogJCGu/nodes`, {
    '/text': p.name,
    '/attributes/@prm1': p.useCase,
    '/attributes/@prm2': p.content,
    '/attributes/@prm3': 0,
  });
}

export async function fetchConversations(): Promise<Conversation[]> {
  try {
    const { data } = await axios.get(`${BASE}/projects/wYUfzHZMDrJSbGNT/nodes`);
    return ((data?.payload?.nodes) || []).map(nodeToConversation).filter(Boolean) as Conversation[];
  } catch {
    return [];
  }
}

export async function logConversation(c: {
  title: string;
  provider: string;
  model: string;
  persona?: string;
  messages: number;
  tokens: number;
}): Promise<void> {
  await axios.post(`${BASE}/projects/wYUfzHZMDrJSbGNT/nodes`, {
    '/text': c.title,
    '/attributes/@cnv1': c.provider,
    '/attributes/@cnv2': c.model,
    '/attributes/@cnv3': c.persona || '',
    '/attributes/@cnv4': c.messages,
    '/attributes/@cnv5': c.tokens,
    '/attributes/@cnv6': 'active',
    '/attributes/@cnv7': new Date().toISOString(),
  });
}

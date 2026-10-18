/**
 * Conversation export utilities.
 * Supports Markdown (.md) and JSON (.json) formats.
 */

import type { Message } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat = 'markdown' | 'json';

export interface ExportMeta {
  provider: string;
  model: string;
  systemPrompt: string;
  personaName?: string;
  exportedAt: Date;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Format conversation as a clean Markdown document.
 */
export function formatMarkdown(messages: Message[], meta: ExportMeta): string {
  const lines: string[] = [];

  // Front-matter header
  lines.push('# Conversation Export');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`**Provider:** ${meta.provider}`);
  lines.push(`**Model:** ${meta.model}`);
  if (meta.personaName) {
    lines.push(`**Persona:** ${meta.personaName}`);
  }
  lines.push(`**Exported:** ${meta.exportedAt.toLocaleString()}`);
  lines.push(`**Messages:** ${messages.length}`);
  const totalTokens = messages.reduce((sum, m) => sum + (m.tokens ?? 0), 0);
  if (totalTokens > 0) {
    lines.push(`**Total Tokens:** ${totalTokens.toLocaleString()}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // System prompt (if non-default)
  if (meta.systemPrompt && meta.systemPrompt.trim()) {
    lines.push('## System Prompt');
    lines.push('');
    lines.push('```');
    lines.push(meta.systemPrompt.trim());
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Messages
  lines.push('## Conversation');
  lines.push('');

  for (const msg of messages) {
    const time = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const roleLabel = msg.role === 'user' ? '### 👤 You' : `### 🤖 ${msg.model ?? meta.model}`;

    lines.push(roleLabel);

    const meta_line_parts: string[] = [`\`${time}\``];
    if (msg.tokens) meta_line_parts.push(`${msg.tokens.toLocaleString()} tokens`);
    lines.push(`<sub>${meta_line_parts.join(' · ')}</sub>`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format conversation as a structured JSON document.
 */
export function formatJSON(messages: Message[], meta: ExportMeta): string {
  const totalTokens = messages.reduce((sum, m) => sum + (m.tokens ?? 0), 0);

  const output = {
    export: {
      format: 'taskade-chat-export-v1',
      exportedAt: meta.exportedAt.toISOString(),
    },
    session: {
      provider: meta.provider,
      model: meta.model,
      ...(meta.personaName ? { persona: meta.personaName } : {}),
      systemPrompt: meta.systemPrompt,
      messageCount: messages.length,
      ...(totalTokens > 0 ? { totalTokens } : {}),
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      ...(m.model    ? { model: m.model }    : {}),
      ...(m.provider ? { provider: m.provider } : {}),
      ...(m.tokens   ? { tokens: m.tokens }  : {}),
    })),
  };

  return JSON.stringify(output, null, 2);
}

// ─── File slug ────────────────────────────────────────────────────────────────

/**
 * Generate a safe filename slug from the first user message + timestamp.
 */
export function buildFilename(messages: Message[], format: ExportFormat): string {
  const firstUser = messages.find((m) => m.role === 'user')?.content ?? 'conversation';
  const slug = firstUser
    .slice(0, 40)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const ext  = format === 'markdown' ? 'md' : 'json';
  return `chat-${slug}-${date}.${ext}`;
}

// ─── Download trigger ─────────────────────────────────────────────────────────

/**
 * Trigger a browser file download for the given content string.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * One-shot export: format + download.
 */
export function exportConversation(
  messages: Message[],
  meta: ExportMeta,
  format: ExportFormat,
): void {
  if (messages.length === 0) return;

  const filename = buildFilename(messages, format);

  if (format === 'markdown') {
    const content = formatMarkdown(messages, meta);
    downloadFile(content, filename, 'text/markdown;charset=utf-8');
  } else {
    const content = formatJSON(messages, meta);
    downloadFile(content, filename, 'application/json;charset=utf-8');
  }
}

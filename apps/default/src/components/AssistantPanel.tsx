import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { createConversation, createAgentChat } from '@/lib/agent-chat/v2';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from '@/components/ai-elements/confirmation';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { isToolUIPart } from 'ai';
import type { UIMessage } from 'ai';
import { ulid } from 'ulidx';
import { Bot, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const AGENT_ID = '01KNSYW9HK6YT9VPFAP1AVEHRW';

function MessageParts({
  message,
  onApprove,
}: {
  message: UIMessage;
  onApprove: ReturnType<typeof useChat>['addToolApprovalResponse'];
}) {
  return (
    <>
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        if (part.type === 'text') {
          return message.role === 'user' ? (
            <p key={key} className="whitespace-pre-wrap">{part.text}</p>
          ) : (
            <MessageResponse key={key}>{part.text}</MessageResponse>
          );
        }
        if (isToolUIPart(part)) {
          return (
            <Tool key={key}>
              <ToolHeader type={part.type} state={part.state} />
              <ToolContent>
                <ToolInput input={part.input} />
                <Confirmation approval={part.approval} state={part.state}>
                  <ConfirmationRequest>
                    <ConfirmationTitle>Allow this tool to run?</ConfirmationTitle>
                  </ConfirmationRequest>
                  <ConfirmationAccepted>Approved</ConfirmationAccepted>
                  <ConfirmationRejected>Rejected</ConfirmationRejected>
                  <ConfirmationActions>
                    <ConfirmationAction
                      variant="outline"
                      onClick={() => part.approval != null && onApprove({ id: part.approval.id, approved: false })}
                    >
                      Deny
                    </ConfirmationAction>
                    <ConfirmationAction
                      onClick={() => part.approval != null && onApprove({ id: part.approval.id, approved: true })}
                    >
                      Approve
                    </ConfirmationAction>
                  </ConfirmationActions>
                </Confirmation>
                <ToolOutput output={part.output} errorText={part.errorText} />
              </ToolContent>
            </Tool>
          );
        }
        return null;
      })}
    </>
  );
}

function ActiveChat({ chat }: { chat: ReturnType<typeof createAgentChat> }) {
  const { messages, status, addToolApprovalResponse } = useChat({ chat, id: chat.id });
  const isSending = status === 'submitted' || status === 'streaming';
  const hasMessages = messages.length > 0;

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    await chat.sendMessage({
      id: ulid(),
      role: 'user',
      parts: [{ type: 'text', text }],
    });
  };

  return (
    <div className="flex flex-col h-full">
      <Conversation>
        <ConversationContent>
          {messages.map((msg) => (
            <Message key={msg.id} from={msg.role}>
              <MessageContent>
                <MessageParts message={msg} onApprove={addToolApprovalResponse} />
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {!hasMessages && (
        <Suggestions>
          <Suggestion suggestion="What model should I use for coding tasks?" onClick={handleSend} />
          <Suggestion suggestion="Explain the differences between providers" onClick={handleSend} />
          <Suggestion suggestion="How do I reduce my API costs?" onClick={handleSend} />
          <Suggestion suggestion="Build me a system prompt for data analysis" onClick={handleSend} />
        </Suggestions>
      )}

      <PromptInput onSubmit={({ text }) => handleSend(text)}>
        <PromptInputTextarea placeholder="Ask NexusAI anything..." />
        <PromptInputFooter>
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export function AssistantPanel() {
  const [chat, setChat] = useState<ReturnType<typeof createAgentChat> | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const { conversationId } = await createConversation(AGENT_ID);
      setChat(createAgentChat(AGENT_ID, conversationId));
    } catch (e) {
      setError('Failed to start conversation. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  if (chat) return <ActiveChat chat={chat} />;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">NexusAI Assistant</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your intelligent guide for provider selection, prompt engineering, and platform optimization
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">NexusAI Assistant</h2>
          <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
            Trained on your provider registry, model catalog, persona templates, and prompt library.
            Ask anything about optimizing your AI workflows.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-2 max-w-md w-full">
          {[
            { emoji: '🎯', text: 'Pick the right model' },
            { emoji: '💡', text: 'Craft perfect prompts' },
            { emoji: '💰', text: 'Optimize costs' },
            { emoji: '🚀', text: 'Build AI workflows' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-2 px-3 py-2.5 bg-muted rounded-xl text-sm text-muted-foreground">
              <span>{emoji}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleStart}
          disabled={starting}
          className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/20"
        >
          {starting ? 'Starting...' : 'Start Conversation'}
        </button>
      </div>
    </div>
  );
}

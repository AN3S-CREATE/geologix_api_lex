# 04 - Agent chat

Every Genesis app includes a visible agent interface. Default: drop in the
prebuilt block. Custom UIs: use the SDK v2 pattern. Full SDK reference:
`src/lib/agent-chat/v2/README.md`.

## Default: FloatingAgentChat

```tsx
import { FloatingAgentChat } from '@/components/blocks';

<FloatingAgentChat agentId={AGENT_ID} publicAgentId={PUBLIC_AGENT_ID} title="Assistant" />;
```

Handles the launcher, mobile-responsive panel, SDK wiring, error/retry state,
and a hosted-iframe fallback. Renders nothing when both ids are absent.

## The two ids (do not swap them)

| Prop            | What it is                                                                           | Drives                     |
| --------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| `agentId`       | SpaceAgent id from the `manage_agent` CreateAgent result ("The new agent id is ...") | the in-app SDK             |
| `publicAgentId` | trailing segment of the public `/a/{publicAgentId}` URL                              | the hosted iframe fallback |

Passing the `/a/...` id as `agentId` 404s against the SDK. The agent must have
PUBLIC visibility or conversation creation fails ("Public agent not found").

## Custom UI: SDK v2 two-component split

`useChat` crashes if passed `undefined` - create the chat first, render the
hook user only after:

```tsx
import { useChat } from '@ai-sdk/react';
import { createConversation, createAgentChat } from '@/lib/agent-chat/v2';
import { ulid } from 'ulidx';

function ChatLauncher() {
  const [chat, setChat] = useState<ReturnType<typeof createAgentChat> | null>(null);
  const start = async () => {
    const { conversationId } = await createConversation(AGENT_ID);
    setChat(createAgentChat(AGENT_ID, conversationId));
  };
  if (!chat) return <Button onClick={start}>Start chat</Button>;
  return <ActiveChat chat={chat} />;
}

function ActiveChat({ chat }: { chat: ReturnType<typeof createAgentChat> }) {
  const { messages, status, stop, error, addToolApprovalResponse } = useChat({ chat, id: chat.id });
  const send = (text: string) =>
    chat.sendMessage({ id: ulid(), role: 'user', parts: [{ type: 'text', text }] });
  // Pass `error` through so a failed send/stream is visible - never swallow it.
  return (
    <AIAssistantPanel
      messages={messages}
      onSend={send}
      status={status}
      onStop={stop}
      errorMessage={error != null ? 'Something went wrong - please try again.' : undefined}
      onApprove={(id, approved) => addToolApprovalResponse({ id, approved })}
    />
  );
}
```

Pair with `<AIAssistantPanel />` from `@/components/blocks` (pass `messages`,
`onSend`, `busy`, `status`, `onStop`, `onApprove`, and `errorMessage` derived
from `useChat`'s `error` so failures are visible) or compose
`@/components/ai-elements/*` directly.

## Rules that prevent the classic bugs

- Keep chat textareas user-resizable: the scaffold's `PromptInput` textarea
  ships with `resize-y` on purpose - do not strip it or lock the composer to a
  fixed height in custom chat UIs. Operators paste long briefs; a locked
  16px-tall composer is a recurring complaint.
- Never bind Send before the conversation exists (the "dead button"). A send
  handler wired while the `Chat` instance / `conversationId` is still null does
  nothing with zero feedback. Disable Send (and suggestion chips) until
  `createConversation` has resolved; never call a send with a null id.
- Never swallow send errors. An empty `catch {}` anywhere in the chat path is a
  bug - the user clicks Send and nothing happens. Every catch must set visible
  UI state (inline error line + retry); render `useChat`'s `error` too.
  `console.error` alone is not handling.
- Layout: inside a height-bounded `flex h-full flex-col` panel, the messages
  list must be `min-h-0 flex-1 overflow-y-auto` and the composer a plain flex
  SIBLING below it. A `flex-1` messages box missing `min-h-0`/`overflow-y-auto`
  inside an `overflow-hidden` panel grows past the panel while streaming and
  pushes the composer under the clipped edge - the streamed answer renders on
  top of where the input should be. `AIAssistantPanel`/`Conversation` already
  do this correctly.
- Render ALL message part types. Filter text parts AND handle
  `isToolUIPart(part)` - otherwise tool calls are silently dropped.
- Tool approval: call `addToolApprovalResponse({ id, approved })` with
  `part.approval.id`, NOT `toolCallId`. The wrong id updates nothing. The
  conversation auto-resumes after the response.
- Message ids: generate with `ulid()`.
- Busy state: `status === 'submitted' || status === 'streaming'`.
- Auto-scroll ONLY when the user is already at the bottom. Never
  `useEffect(() => bottomRef.current?.scrollIntoView(), [messages])` unguarded -
  it yanks the reader back down on every streamed token, and `behavior: 'smooth'`
  turns that yank into a per-token animation the user sees as the box "shaking".
  Strongly prefer `AIAssistantPanel` / `Conversation` (they ride
  `use-stick-to-bottom`, which sticks only while at the bottom and lets go the
  instant you scroll up). If you must hand-roll, capture "was at the bottom"
  from the user's OWN scrolling BEFORE the content grows - do NOT sample the
  distance after render, or one big chunk (>120px in a single update) reads as
  "scrolled up" and drops stick-to-bottom. And do NOT use smooth:

  ```tsx
  const atBottom = useRef(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  useEffect(() => {
    if (atBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);
  // <div ref={scrollRef} onScroll={onScroll}> …messages… <div ref={bottomRef} /> </div>
  ```

- Custom panels must be responsive: full-bleed on phones, fixed corner panel
  from `sm:` up (never a bare `w-[400px] h-[600px]`).

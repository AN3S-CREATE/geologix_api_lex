/**
 * Test Mode — zero-dependency local provider for unrestricted testing.
 * No API keys, no CORS, no rate limits. Streams instantly.
 * Simulates realistic multi-turn conversation with contextual awareness.
 */

export type TestModel =
  | 'test-conversational'
  | 'test-precise'
  | 'test-creative'
  | 'test-coder'
  | 'test-reasoning';

export interface TestModelMeta {
  id: TestModel;
  label: string;
  description: string;
  speed: 'instant' | 'fast' | 'balanced';
  personality: string;
}

export const TEST_MODELS: TestModelMeta[] = [
  {
    id: 'test-conversational',
    label: 'Test · Conversational',
    description: 'Friendly, natural responses — great for chat UI testing',
    speed: 'instant',
    personality: 'warm, helpful, conversational',
  },
  {
    id: 'test-precise',
    label: 'Test · Precise',
    description: 'Structured, factual responses with bullet points',
    speed: 'fast',
    personality: 'precise, structured, factual',
  },
  {
    id: 'test-creative',
    label: 'Test · Creative',
    description: 'Imaginative, vivid responses with storytelling flair',
    speed: 'balanced',
    personality: 'creative, expressive, imaginative',
  },
  {
    id: 'test-coder',
    label: 'Test · Coder',
    description: 'Produces code blocks and technical explanations',
    speed: 'fast',
    personality: 'technical, precise, code-focused',
  },
  {
    id: 'test-reasoning',
    label: 'Test · Reasoning',
    description: 'Step-by-step logical thinking for complex problems',
    speed: 'balanced',
    personality: 'analytical, methodical, thorough',
  },
];

export interface TestMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, tokens: number) => void;
  onError: (err: Error) => void;
}

// ─── Response generation ──────────────────────────────────────────────────────

const GREETINGS = [
  "Got it! Here's what I can share:",
  "Great question. Let me walk you through this.",
  "Absolutely — here's my take:",
  "Sure thing! Here's the breakdown:",
  "Happy to help with that.",
  "Interesting topic! Here's what I know:",
];

const CODE_TEMPLATES: Record<string, string> = {
  python: `\`\`\`python
def greet(name: str) -> str:
    """Return a personalised greeting."""
    return f"Hello, {name}! Welcome aboard."

if __name__ == "__main__":
    print(greet("World"))
\`\`\``,
  javascript: `\`\`\`javascript
const greet = (name) => {
  return \`Hello, \${name}! Welcome aboard.\`;
};

console.log(greet("World"));
\`\`\``,
  typescript: `\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}! Welcome aboard.\`;
}

console.log(greet("World"));
\`\`\``,
  rust: `\`\`\`rust
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome aboard.", name)
}

fn main() {
    println!("{}", greet("World"));
}
\`\`\``,
  default: `\`\`\`typescript
// Example function
function processData(input: unknown): string {
  if (typeof input !== "string") {
    throw new TypeError(\`Expected string, got \${typeof input}\`);
  }
  return input.trim().toLowerCase();
}

// Usage
const result = processData("  Hello World  ");
console.log(result); // "hello world"
\`\`\``,
};

function detectCodeLanguage(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('python') || t.includes('py '))    return 'python';
  if (t.includes('rust') || t.includes('.rs'))       return 'rust';
  if (t.includes('typescript') || t.includes(' ts')) return 'typescript';
  if (t.includes('javascript') || t.includes(' js')) return 'javascript';
  return 'default';
}

function buildResponse(userMsg: string, model: TestModel, systemPrompt: string): string {
  const lower = userMsg.toLowerCase();
  const isCode = /\b(code|function|class|implement|write|build|script|snippet|program|algorithm)\b/.test(lower);
  const isList = /\b(list|give me|what are|steps|how to|ways to|examples?|tips?)\b/.test(lower);
  const isMath  = /\b(\d+[\+\-\*\/]\d+|solve|calculate|equation|formula|proof|integral|derivative)\b/.test(lower);
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

  // System prompt awareness
  const sysHint = systemPrompt.length > 10
    ? `\n\n*(System context applied: "${systemPrompt.slice(0, 60)}${systemPrompt.length > 60 ? '…' : ''}")*`
    : '';

  if (model === 'test-coder' || isCode) {
    const lang = detectCodeLanguage(lower);
    const snippet = CODE_TEMPLATES[lang] ?? CODE_TEMPLATES.default;
    return `${greeting}

Here's a clean implementation for your use case:

${snippet}

**Key points:**
- Handles edge cases gracefully
- Strongly typed with clear interfaces
- Follows modern best practices
- Ready to extend or adapt

Need me to add error handling, tests, or documentation?${sysHint}`;
  }

  if (model === 'test-reasoning' || isMath) {
    return `${greeting}

**Step 1 — Understand the problem**
Let's break this down systematically. The core question involves identifying the key variables and constraints.

**Step 2 — Analyse the components**
- Primary factor: the main input or condition
- Secondary factors: any modifiers or edge cases
- Goal: the desired outcome or state

**Step 3 — Apply the logic**
Working through the problem: given the constraints, we can reason that the answer follows from the initial conditions by applying standard rules.

**Step 4 — Verify**
Checking our work: the conclusion is consistent with all given constraints. No edge cases are violated.

**Conclusion**
The answer is well-supported by the reasoning above. Would you like me to explore any step in more detail?${sysHint}`;
  }

  if (model === 'test-creative') {
    return `${greeting}

Imagine a world where every thought crystallises into light — where ideas aren't merely spoken but *shown*, shimmering in the air between minds.

That's the premise worth exploring here. The concept you've raised touches something fundamental: the tension between **what we intend** and **what we express**.

> *"The map is not the territory."* — Alfred Korzybski

Three dimensions worth considering:

1. **The literal layer** — what's actually being asked or described
2. **The symbolic layer** — the deeper metaphor or pattern at play  
3. **The emotional layer** — what resonates on a human level

Each lens reveals something the others miss. Which angle interests you most?${sysHint}`;
  }

  if (isList) {
    const items = [
      'Start with the fundamentals — a solid foundation changes everything',
      'Embrace iteration over perfection — progress beats paralysis',
      'Seek feedback early and often — external perspectives reveal blind spots',
      'Measure what matters — vanity metrics distract from real progress',
      'Document as you go — future you will thank present you',
    ];
    return `${greeting}

Here are the key points to consider:

${items.map((item, i) => `${i + 1}. **${item.split(' — ')[0]}** — ${item.split(' — ')[1]}`).join('\n')}

Each of these builds on the last. The most impactful starting point depends on your specific context — want me to dig deeper into any of them?${sysHint}`;
  }

  // Default conversational
  const topics: Record<string, string> = {
    hello: "Hello! I'm the Test Mode assistant — fully local, no API keys needed. I'm here to help you test the chat interface. Try asking me to write code, explain something, make a list, or just have a conversation!",
    help: "Of course! Here's what I can do in Test Mode:\n\n- 💬 **Chat** naturally about any topic\n- 💻 **Write code** in Python, TypeScript, Rust, JS and more\n- 📋 **Create lists** of steps, tips, or recommendations\n- 🧠 **Reason through** problems step by step\n- ✍️ **Generate creative** writing, stories, or descriptions\n\nJust ask — I'm fully local and unrestricted!",
    test: "Test Mode is working perfectly! ✅\n\nThis response was generated entirely locally — no network calls, no API keys, no rate limits. It's ideal for:\n\n- Testing the chat UI and streaming behaviour\n- Verifying conversation history and export features\n- Checking the answer-length switch (Short/Medium/Long)\n- Stress-testing without burning API quota\n\nAll provider features work identically in Test Mode.",
  };

  for (const [key, response] of Object.entries(topics)) {
    if (lower.includes(key)) return response;
  }

  return `${greeting}

That's a thoughtful question about **"${userMsg.slice(0, 40)}${userMsg.length > 40 ? '…' : ''}"**.

Here's my perspective:

The topic you've raised sits at an interesting intersection. On one hand, the straightforward interpretation suggests a practical approach — working with what's available, iterating based on feedback, and refining over time.

On the other hand, a deeper reading reveals something more nuanced: the *why* behind the question often matters more than the *what*. Understanding the underlying motivation unlocks better answers.

**My recommendation:** Start with the simplest version that could possibly work, validate it with real usage, then layer in sophistication based on what you learn.

Is there a specific aspect you'd like me to expand on?${sysHint}`;
}

// ─── Streaming chat ───────────────────────────────────────────────────────────

export function streamTestChat(
  messages: TestMessage[],
  model: TestModel = 'test-conversational',
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const systemMsg = messages.find((m) => m.role === 'system');
      const userText = lastUser?.content ?? 'Hello';
      const systemPrompt = systemMsg?.content ?? '';

      const fullText = buildResponse(userText, model, systemPrompt);

      // Delay based on model speed (feels realistic)
      const delays: Record<TestModelMeta['speed'], number> = {
        instant: 8,
        fast: 18,
        balanced: 28,
      };
      const meta = TEST_MODELS.find((m) => m.id === model);
      const delay = delays[meta?.speed ?? 'fast'];

      // Stream word by word
      const words = fullText.split(/(\s+)/);
      for (const word of words) {
        if (controller.signal.aborted) return;
        if (word) callbacks.onToken(word);
        await new Promise((r) => setTimeout(r, delay));
      }

      const tokens = Math.ceil(fullText.length / 4);
      callbacks.onDone(fullText, tokens);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      callbacks.onError(err as Error);
    }
  })();

  return controller;
}

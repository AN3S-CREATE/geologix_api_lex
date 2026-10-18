/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  SECRETS CONFIGURATION                       ║
 * ║                                                              ║
 * ║  API keys are stored server-side in Space Settings → Secrets.║
 * ║  All provider calls route through GenesisClient.proxy() so   ║
 * ║  raw keys never reach the browser.                           ║
 * ║                                                              ║
 * ║  Required secret aliases (add these in Space Settings):      ║
 * ║    grok        — xAI API key (https://console.x.ai)         ║
 * ║    huggingface — HF token (https://huggingface.co/settings)  ║
 * ║    google      — Gemini key (https://aistudio.google.com)    ║
 * ║    deepinfra   — DI key (https://deepinfra.com/dash)         ║
 * ║    anthropic   — Claude key (https://console.anthropic.com)  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const API_KEYS = {
  grok: '',
  huggingface: '',
  google: '',
  deepinfra: '',
  anthropic: '',
  mistral: '',
} as const;

export default API_KEYS;

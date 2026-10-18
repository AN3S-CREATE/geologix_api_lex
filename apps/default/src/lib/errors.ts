/**
 * Typed error thrown when a provider returns HTTP 401 / 403.
 * Carries enough context for the UI to show a useful message with a deep link.
 */

export type ProviderKey = 'grok' | 'huggingface' | 'google' | 'deepinfra' | 'anthropic' | 'mistral';

export interface ProviderInfo {
  displayName: string;
  docsUrl: string;
  envKey: string;
}

export const PROVIDER_INFO: Record<ProviderKey, ProviderInfo> = {
  grok: {
    displayName: 'xAI Grok',
    docsUrl: 'https://console.x.ai',
    envKey: 'grok',
  },
  huggingface: {
    displayName: 'HuggingFace',
    docsUrl: 'https://huggingface.co/settings/tokens',
    envKey: 'huggingface',
  },
  google: {
    displayName: 'Google Gemini',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    envKey: 'google',
  },
  deepinfra: {
    displayName: 'DeepInfra',
    docsUrl: 'https://deepinfra.com/dash/api_keys',
    envKey: 'deepinfra',
  },
  anthropic: {
    displayName: 'Anthropic Claude',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    envKey: 'anthropic',
  },
  mistral: {
    displayName: 'Mistral AI',
    docsUrl: 'https://console.mistral.ai/api-keys',
    envKey: 'mistral',
  },
};

export class ApiKeyError extends Error {
  readonly provider: ProviderKey;
  readonly statusCode: number;

  constructor(provider: ProviderKey, statusCode: number) {
    const info = PROVIDER_INFO[provider];
    super(
      `Invalid or missing API key for ${info.displayName}. ` +
      `Get a key at ${info.docsUrl} then update it in Providers settings.`,
    );
    this.name = 'ApiKeyError';
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

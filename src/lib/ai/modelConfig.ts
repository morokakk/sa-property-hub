/**
 * Centralized AI Model Configuration & Compatibility Migration Engine
 *
 * Single source of truth for AI providers (Anthropic Claude & Google Gemini),
 * active production models, documentation links, key prefix rules,
 * and transparent legacy model normalizers.
 */

export const DEFAULT_PROVIDER = 'anthropic' as const;

export const SUPPORTED_PROVIDERS = ['anthropic', 'google'] as const;
export type AiProvider = (typeof SUPPORTED_PROVIDERS)[number];

// Anthropic Configuration
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5' as const;

export const SUPPORTED_ANTHROPIC_MODELS = [
  'claude-sonnet-5',
  'claude-haiku-4-5',
  'claude-opus-5',
  'claude-fable-5-1',
  'claude-sonnet-4-6',
] as const;

export type SupportedAnthropicModel = (typeof SUPPORTED_ANTHROPIC_MODELS)[number];

// Google Gemini Configuration
export const DEFAULT_GOOGLE_MODEL = 'gemini-3.1-pro' as const;

export const SUPPORTED_GOOGLE_MODELS = [
  'gemini-3.1-pro',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
] as const;

export type SupportedGoogleModel = (typeof SUPPORTED_GOOGLE_MODELS)[number];

export interface AiProviderConfig {
  id: AiProvider;
  name: string;
  keyPrefix: string;
  keyPlaceholder: string;
  inputLabel: string;
  docUrl: string;
  docLabel: string;
  consoleUrl?: string;
  consoleLabel?: string;
  defaultModel: string;
  supportedModels: readonly string[];
}

export const AI_PROVIDER_CONFIGS: Record<AiProvider, AiProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-api03-...',
    inputLabel: 'Anthropic API Key',
    docUrl: 'https://platform.claude.com/docs/en/get-api-key',
    docLabel: 'How to get an Anthropic API key ↗',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    consoleLabel: 'Console Keys ↗',
    defaultModel: DEFAULT_ANTHROPIC_MODEL,
    supportedModels: SUPPORTED_ANTHROPIC_MODELS,
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    keyPrefix: 'AIzaSy',
    keyPlaceholder: 'AIzaSy...',
    inputLabel: 'Google AI Studio API Key',
    docUrl: 'https://aistudio.google.com/app/apikey',
    docLabel: 'Get a Google Gemini API key ↗',
    defaultModel: DEFAULT_GOOGLE_MODEL,
    supportedModels: SUPPORTED_GOOGLE_MODELS,
  },
};

export function getProviderConfig(provider?: AiProvider | null): AiProviderConfig {
  if (provider === 'google') {
    return AI_PROVIDER_CONFIGS.google;
  }
  return AI_PROVIDER_CONFIGS.anthropic;
}

export type ApiKeyValidationState = 'empty' | 'valid' | 'invalid_prefix';

/**
 * Validates an API key's format based on the selected AI provider.
 */
export function validateApiKeyFormat(
  provider: AiProvider = 'anthropic',
  key?: string | null
): ApiKeyValidationState {
  const trimmed = key ? key.trim() : '';
  if (!trimmed) return 'empty';

  if (provider === 'anthropic') {
    if (trimmed.startsWith('sk-ant-') && trimmed.length >= 20) {
      return 'valid';
    }
    return 'invalid_prefix';
  }

  if (provider === 'google') {
    // Google AI Studio keys typically start with AIzaSy and are ~39 chars
    if (trimmed.startsWith('AIzaSy') && trimmed.length >= 20) {
      return 'valid';
    }
    // Also accept valid Google keys of sufficient length even if prefix varies slightly
    if (trimmed.length >= 20) {
      return 'valid';
    }
    return 'invalid_prefix';
  }

  return trimmed.length >= 15 ? 'valid' : 'invalid_prefix';
}

/**
 * Normalizes an AI model identifier.
 *
 * Automatically migrates legacy/retired Claude 3.x models, dated snapshots (e.g. 2024, 2025),
 * or empty values to the recommended production model.
 * Preserves user-supplied valid custom models.
 */
export function normalizeAiModel(
  model?: string | null,
  provider: AiProvider = 'anthropic'
): string {
  const defaultModel =
    provider === 'google' ? DEFAULT_GOOGLE_MODEL : DEFAULT_ANTHROPIC_MODEL;

  if (!model) {
    return defaultModel;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return defaultModel;
  }

  // Check for retired Claude 3 family or deprecated dated snapshot identifiers
  const isRetiredOrLegacy =
    trimmed.startsWith('claude-3-') ||
    trimmed.includes('2024') ||
    trimmed.includes('2025');

  if (isRetiredOrLegacy) {
    return defaultModel;
  }

  return trimmed;
}

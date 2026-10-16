import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROVIDER,
  DEFAULT_ANTHROPIC_MODEL,
  SUPPORTED_ANTHROPIC_MODELS,
  DEFAULT_GOOGLE_MODEL,
  SUPPORTED_GOOGLE_MODELS,
  getProviderConfig,
  validateApiKeyFormat,
  normalizeAiModel,
} from '../modelConfig';

describe('AI Model Configuration & Normalization Engine', () => {
  it('exports the canonical default provider as anthropic', () => {
    expect(DEFAULT_PROVIDER).toBe('anthropic');
  });

  it('exports the canonical default model as claude-sonnet-5', () => {
    expect(DEFAULT_ANTHROPIC_MODEL).toBe('claude-sonnet-5');
    expect(SUPPORTED_ANTHROPIC_MODELS).toContain('claude-sonnet-5');
  });

  it('contains current active generation models in SUPPORTED_ANTHROPIC_MODELS', () => {
    expect(SUPPORTED_ANTHROPIC_MODELS).toEqual([
      'claude-sonnet-5',
      'claude-haiku-4-5',
      'claude-opus-5',
      'claude-fable-5-1',
      'claude-sonnet-4-6',
    ]);
  });

  it('contains modern Google Gemini models in SUPPORTED_GOOGLE_MODELS', () => {
    expect(DEFAULT_GOOGLE_MODEL).toBe('gemini-3.1-pro');
    expect(SUPPORTED_GOOGLE_MODELS).toEqual([
      'gemini-3.1-pro',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
    ]);
  });

  describe('getProviderConfig()', () => {
    it('returns Anthropic configuration with correct links and labels', () => {
      const config = getProviderConfig('anthropic');
      expect(config.id).toBe('anthropic');
      expect(config.docUrl).toBe('https://platform.claude.com/docs/en/get-api-key');
      expect(config.docLabel).toBe('How to get an Anthropic API key ↗');
      expect(config.consoleUrl).toBe('https://console.anthropic.com/settings/keys');
      expect(config.consoleLabel).toBe('Console Keys ↗');
      expect(config.keyPrefix).toBe('sk-ant-');
    });

    it('returns Google configuration with correct links and labels', () => {
      const config = getProviderConfig('google');
      expect(config.id).toBe('google');
      expect(config.docUrl).toBe('https://aistudio.google.com/app/apikey');
      expect(config.docLabel).toBe('Get a Google Gemini API key ↗');
      expect(config.keyPrefix).toBe('AIzaSy');
    });

    it('defaults to Anthropic if provider is undefined or null', () => {
      expect(getProviderConfig(undefined).id).toBe('anthropic');
      expect(getProviderConfig(null).id).toBe('anthropic');
    });
  });

  describe('validateApiKeyFormat()', () => {
    it('returns empty for missing or blank keys', () => {
      expect(validateApiKeyFormat('anthropic', '')).toBe('empty');
      expect(validateApiKeyFormat('anthropic', '   ')).toBe('empty');
      expect(validateApiKeyFormat('google', '')).toBe('empty');
      expect(validateApiKeyFormat('google', null)).toBe('empty');
    });

    it('validates Anthropic keys with sk-ant- prefix and length >= 20', () => {
      expect(validateApiKeyFormat('anthropic', 'sk-ant-api03-1234567890abcdef')).toBe('valid');
      expect(validateApiKeyFormat('anthropic', 'sk-ant-short')).toBe('invalid_prefix');
      expect(validateApiKeyFormat('anthropic', 'invalid-prefix-123456789012345')).toBe('invalid_prefix');
    });

    it('validates Google keys with length >= 20', () => {
      expect(validateApiKeyFormat('google', 'AIzaSyD-1234567890abcdefghijklmn')).toBe('valid');
      expect(validateApiKeyFormat('google', 'shortkey')).toBe('invalid_prefix');
    });
  });

  describe('normalizeAiModel()', () => {
    it('normalizes undefined, null, empty string, and whitespace to DEFAULT_ANTHROPIC_MODEL', () => {
      expect(normalizeAiModel(undefined)).toBe('claude-sonnet-5');
      expect(normalizeAiModel(null)).toBe('claude-sonnet-5');
      expect(normalizeAiModel('')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('   ')).toBe('claude-sonnet-5');
    });

    it('normalizes undefined model for google provider to DEFAULT_GOOGLE_MODEL', () => {
      expect(normalizeAiModel(undefined, 'google')).toBe('gemini-3.1-pro');
      expect(normalizeAiModel('', 'google')).toBe('gemini-3.1-pro');
    });

    it('migrates legacy Sonnet 3.5 variants to claude-sonnet-5', () => {
      expect(normalizeAiModel('claude-3-5-sonnet-20241022')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('claude-3-5-sonnet-latest')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('claude-3-5-sonnet')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('  claude-3-5-sonnet-20241022  ')).toBe('claude-sonnet-5');
    });

    it('migrates legacy Sonnet 3.7 variants to claude-sonnet-5', () => {
      expect(normalizeAiModel('claude-3-7-sonnet-20250219')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('claude-3-7-sonnet')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('claude-3-7-sonnet-latest')).toBe('claude-sonnet-5');
    });

    it('migrates retired Claude 3 Haiku and Opus models to claude-sonnet-5', () => {
      expect(normalizeAiModel('claude-3-haiku-20240307')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('claude-3-opus-20240229')).toBe('claude-sonnet-5');
    });

    it('migrates any identifier with legacy 2024 or 2025 date stamps to claude-sonnet-5', () => {
      expect(normalizeAiModel('custom-claude-20241101')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('test-model-2025')).toBe('claude-sonnet-5');
    });

    it('preserves all active supported production models unchanged', () => {
      SUPPORTED_ANTHROPIC_MODELS.forEach((model) => {
        expect(normalizeAiModel(model)).toBe(model);
      });
      SUPPORTED_GOOGLE_MODELS.forEach((model) => {
        expect(normalizeAiModel(model, 'google')).toBe(model);
      });
    });

    it('preserves and trims valid custom model identifiers', () => {
      expect(normalizeAiModel('claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
      expect(normalizeAiModel('  custom-enterprise-gateway  ')).toBe('custom-enterprise-gateway');
    });
  });
});

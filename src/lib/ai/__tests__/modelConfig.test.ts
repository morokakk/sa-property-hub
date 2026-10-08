import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ANTHROPIC_MODEL,
  SUPPORTED_ANTHROPIC_MODELS,
  normalizeAiModel,
} from '../modelConfig';

describe('AI Model Configuration & Normalization Engine', () => {
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

  describe('normalizeAiModel()', () => {
    it('normalizes undefined, null, empty string, and whitespace to DEFAULT_ANTHROPIC_MODEL', () => {
      expect(normalizeAiModel(undefined)).toBe('claude-sonnet-5');
      expect(normalizeAiModel(null)).toBe('claude-sonnet-5');
      expect(normalizeAiModel('')).toBe('claude-sonnet-5');
      expect(normalizeAiModel('   ')).toBe('claude-sonnet-5');
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
    });

    it('preserves and trims valid custom model identifiers', () => {
      expect(normalizeAiModel('claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
      expect(normalizeAiModel('  custom-enterprise-gateway  ')).toBe('custom-enterprise-gateway');
    });
  });
});

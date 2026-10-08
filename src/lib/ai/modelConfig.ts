/**
 * Centralized AI Model Configuration & Compatibility Migration Engine
 *
 * Defines active production models and transparently normalizes deprecated
 * or retired model strings (e.g. Claude 3.x series, dated snapshots) to the
 * recommended production standard.
 */

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5' as const;

export const SUPPORTED_ANTHROPIC_MODELS = [
  'claude-sonnet-5',
  'claude-haiku-4-5',
  'claude-opus-5',
  'claude-fable-5-1',
  'claude-sonnet-4-6',
] as const;

export type SupportedAnthropicModel = (typeof SUPPORTED_ANTHROPIC_MODELS)[number];

/**
 * Normalizes an AI model identifier.
 *
 * Automatically migrates legacy/retired Claude 3.x models, dated snapshots (e.g. 2024, 2025),
 * or empty values to the recommended production model (claude-sonnet-5).
 * Preserves user-supplied valid custom models.
 */
export function normalizeAiModel(model?: string | null): string {
  if (!model) {
    return DEFAULT_ANTHROPIC_MODEL;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return DEFAULT_ANTHROPIC_MODEL;
  }

  // Check for retired Claude 3 family or deprecated dated snapshot identifiers
  const isRetiredOrLegacy =
    trimmed.startsWith('claude-3-') ||
    trimmed.includes('2024') ||
    trimmed.includes('2025');

  if (isRetiredOrLegacy) {
    return DEFAULT_ANTHROPIC_MODEL;
  }

  return trimmed;
}

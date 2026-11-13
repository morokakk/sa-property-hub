import { DevelopmentProject } from '@/types';
import { isValidProjectComment } from '@/lib/calculations/commentsLedger';
import { INITIAL_DEVELOPMENTS } from '@/lib/store/initialData';

/**
 * Hydration Helpers for Zustand Portfolio Persistence
 * Sanitizes and normalizes persisted development projects.
 */
export function sanitizePersistedDevelopments(
  raw: unknown,
  defaultDevelopments?: DevelopmentProject[]
): DevelopmentProject[] {
  if (!Array.isArray(raw)) return defaultDevelopments || [];
  const seedLookup = new Map(
    (defaultDevelopments && defaultDevelopments.length > 0
      ? defaultDevelopments
      : INITIAL_DEVELOPMENTS
    ).map((d) => [d.id, d])
  );
  return (raw as any[]).map((dev) => {
    if (!dev || typeof dev !== 'object') return dev;
    const seededDev = typeof dev.id === 'string' ? seedLookup.get(dev.id) : undefined;
    const normalizedLedger =
      dev.commentsLedger === undefined
        ? Array.isArray(seededDev?.commentsLedger)
          ? seededDev.commentsLedger.filter(isValidProjectComment).map((c) => ({ ...c }))
          : []
        : Array.isArray(dev.commentsLedger)
        ? dev.commentsLedger.filter(isValidProjectComment)
        : [];
    const normalizedShareToken =
      typeof dev.shareToken === 'string' && dev.shareToken.trim()
        ? dev.shareToken.trim()
        : undefined;

    return {
      ...dev,
      softCosts: dev.softCosts || {},
      boqItems: Array.isArray(dev.boqItems) ? dev.boqItems : [],
      approvals: dev.approvals || {},
      units: Array.isArray(dev.units) ? dev.units : [],
      commentsLedger: normalizedLedger,
      shareToken: normalizedShareToken,
      developmentFacilityLimitZAR: Number(dev.developmentFacilityLimitZAR || 0),
      developmentFacilityDrawnZAR: Number(dev.developmentFacilityDrawnZAR || 0),
      developmentFacilityRepaidZAR: Number(dev.developmentFacilityRepaidZAR || 0),
    };
  });
}

// Re-export existing hydration helpers from persistence/hydrationHelpers
export {
  sanitizeCompletedGuideSteps,
  healClearwaterAgencyFee,
  sanitizeAnalyzerSectionOrder,
  sanitizeHiddenAnalyzerSections,
} from './persistence/hydrationHelpers';

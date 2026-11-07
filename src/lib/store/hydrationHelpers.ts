import { DevelopmentProject } from '@/types';

/**
 * Hydration Helpers for Zustand Portfolio Persistence
 * Sanitizes and normalizes persisted development projects.
 */
export function sanitizePersistedDevelopments(
  raw: unknown,
  defaultDevelopments?: DevelopmentProject[]
): DevelopmentProject[] {
  if (!Array.isArray(raw)) return defaultDevelopments || [];
  return (raw as any[]).map((dev) => {
    if (!dev || typeof dev !== 'object') return dev;
    return {
      ...dev,
      softCosts: dev.softCosts || {},
      boqItems: Array.isArray(dev.boqItems) ? dev.boqItems : [],
      approvals: dev.approvals || {},
      units: Array.isArray(dev.units) ? dev.units : [],
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

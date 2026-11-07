import { ZoningProfile, MunicipalZoningCode, ConsentUseFlags } from '@/types';

export interface ZoningEnvelopeResult {
  maxPermittedBulkSqm: number;
  maxGroundFootprintSqm: number;
  minStoreysRequired: number;
  maxPermittedUnitsByDensity?: number;
  bulkUtilizationPercent: number;
  isBulkExceeded: boolean;
  isHeightExceeded: boolean;
  isDensityExceeded: boolean;
  isSplumaRezoningTriggered: boolean;
}

export interface ZoningPresetDefinition {
  id: string;
  label: string;
  description: string;
  profile: Omit<ZoningProfile, 'erfSizeSqm'> & { defaultErfSizeSqm: number };
}

export const ZONING_PRESETS: readonly ZoningPresetDefinition[] = [
  {
    id: 'res-1',
    label: 'Res 1 (1 du / FAR 0.5)',
    description: 'Single-residential freehold stand with secondary dwelling / cottage consent',
    profile: {
      currentZoning: 'Residential 1',
      defaultErfSizeSqm: 1000,
      farRatio: 0.5,
      coveragePercent: 50,
      maxHeightStoreys: 2,
      maxDensityDuPerHa: 10,
      requiresRezoning: false,
      consentUses: {
        secondDwellingPermitted: true,
        studentCommuneConsent: false,
        backyardMicroUnitsPermitted: false,
        homeEnterprisePermitted: true,
      },
    },
  },
  {
    id: 'res-3',
    label: 'Res 3 (40 du/ha / FAR 0.8)',
    description: 'Medium-density cluster / walk-up townhouse residential development',
    profile: {
      currentZoning: 'Residential 3',
      defaultErfSizeSqm: 1500,
      farRatio: 0.8,
      coveragePercent: 50,
      maxHeightStoreys: 3,
      maxDensityDuPerHa: 40,
      requiresRezoning: false,
      consentUses: {
        secondDwellingPermitted: true,
        studentCommuneConsent: false,
        backyardMicroUnitsPermitted: true,
        homeEnterprisePermitted: true,
      },
    },
  },
  {
    id: 'res-4',
    label: 'Res 4 (80 du/ha / FAR 1.5)',
    description: 'High-density sectional title apartments / student housing scheme',
    profile: {
      currentZoning: 'Residential 4',
      defaultErfSizeSqm: 1200,
      farRatio: 1.5,
      coveragePercent: 60,
      maxHeightStoreys: 4,
      maxDensityDuPerHa: 80,
      requiresRezoning: false,
      consentUses: {
        secondDwellingPermitted: true,
        studentCommuneConsent: true,
        backyardMicroUnitsPermitted: true,
        homeEnterprisePermitted: true,
      },
    },
  },
  {
    id: 'township-infill',
    label: 'Township Infill (As-of-Right)',
    description: 'Township scheme high-density backyard micro-units with zero tribunal delay',
    profile: {
      currentZoning: 'Unzoned / Township Scheme',
      targetZoning: 'Unzoned / Township Scheme',
      defaultErfSizeSqm: 500,
      farRatio: 1.2,
      coveragePercent: 60,
      maxHeightStoreys: 3,
      maxDensityDuPerHa: 200,
      requiresRezoning: false,
      consentUses: {
        secondDwellingPermitted: true,
        studentCommuneConsent: false,
        backyardMicroUnitsPermitted: true,
        homeEnterprisePermitted: false,
      },
    },
  },
];

/**
 * Calculates the statutory town planning bulk envelope, density caps,
 * storey requirements, and SPLUMA rezoning triggers.
 *
 * Tier 4 Pure Deterministic Engine: Zero division by zero, zero side-effects.
 */
export function calculateZoningEnvelope(
  zoning: ZoningProfile,
  plannedBuildableSqm: number,
  plannedUnits: number
): ZoningEnvelopeResult {
  const safeErfSize = Math.max(0, zoning.erfSizeSqm || 0);
  const safeFar = Math.max(0, zoning.farRatio || 0);
  const safeCoverage = Math.max(0, zoning.coveragePercent || 0);
  const safePlannedBulk = Math.max(0, plannedBuildableSqm || 0);
  const safePlannedUnits = Math.max(0, plannedUnits || 0);

  const maxPermittedBulkSqm = Math.round(safeErfSize * safeFar);
  const maxGroundFootprintSqm = Math.round(safeErfSize * (safeCoverage / 100));

  const minStoreysRequired =
    maxGroundFootprintSqm > 0
      ? Math.max(1, Math.ceil(safePlannedBulk / maxGroundFootprintSqm))
      : 1;

  const maxPermittedUnitsByDensity =
    zoning.maxDensityDuPerHa && zoning.maxDensityDuPerHa > 0
      ? Math.max(1, Math.floor((safeErfSize / 10000) * zoning.maxDensityDuPerHa))
      : undefined;

  const bulkUtilizationPercent =
    maxPermittedBulkSqm > 0
      ? Number(((safePlannedBulk / maxPermittedBulkSqm) * 100).toFixed(1))
      : 0;

  const isBulkExceeded = safePlannedBulk > maxPermittedBulkSqm;
  const isHeightExceeded = minStoreysRequired > Math.max(1, zoning.maxHeightStoreys || 1);
  const isDensityExceeded =
    maxPermittedUnitsByDensity !== undefined && safePlannedUnits > maxPermittedUnitsByDensity;

  const isTargetDifferent =
    zoning.targetZoning !== undefined && zoning.targetZoning !== zoning.currentZoning;

  const isSplumaRezoningTriggered = Boolean(
    zoning.requiresRezoning ||
      isTargetDifferent ||
      isBulkExceeded ||
      isDensityExceeded
  );

  return {
    maxPermittedBulkSqm,
    maxGroundFootprintSqm,
    minStoreysRequired,
    maxPermittedUnitsByDensity,
    bulkUtilizationPercent,
    isBulkExceeded,
    isHeightExceeded,
    isDensityExceeded,
    isSplumaRezoningTriggered,
  };
}

/**
 * Returns a human-readable 1-line summary of the zoning rights and statutory approval pathway.
 * Supports passing a full `ZoningProfile` or individual `currentZoning` and optional `targetZoning`.
 */
export function formatZoningTransitionLabel(
  zoningOrCurrent: ZoningProfile | MunicipalZoningCode,
  target?: MunicipalZoningCode
): string {
  if (typeof zoningOrCurrent === 'object' && zoningOrCurrent !== null) {
    const zoning = zoningOrCurrent;
    if (zoning.targetZoning && zoning.targetZoning !== zoning.currentZoning) {
      return `${zoning.currentZoning} ➔ ${zoning.targetZoning} (SPLUMA Rezoning)`;
    }
    if (zoning.requiresRezoning) {
      return `${zoning.currentZoning} (Rezoning Required)`;
    }
    return `${zoning.currentZoning} (As-of-Right)`;
  }

  const current = zoningOrCurrent;
  if (target && target !== current) {
    return `${current} ➔ ${target} (SPLUMA Rezoning)`;
  }
  return `${current} (As-of-Right)`;
}

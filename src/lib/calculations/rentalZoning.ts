import {
  ConsentUseFlags,
  MunicipalZoningCode,
  PropertyTitleType,
  ZoningProfile,
} from '@/types';
import {
  calculateZoningEnvelope,
  formatZoningTransitionLabel,
  ZONING_PRESETS,
} from '@/lib/calculations/zoning';

export const MUNICIPAL_ZONING_CODES: readonly MunicipalZoningCode[] = [
  'Residential 1',
  'Residential 2',
  'Residential 3',
  'Residential 4',
  'Business 1',
  'Business 2',
  'Mixed Use',
  'Industrial 1',
  'Special',
  'Agricultural',
  'Unzoned / Township Scheme',
];

export const RENTAL_ZONING_PRESET_LABELS: Record<string, string> = {
  'res-1': 'Res 1',
  'res-3': 'Res 3',
  'res-4': 'Res 4',
  'township-infill': 'Township Infill',
};

const EMPTY_CONSENT_USES: ConsentUseFlags = {
  secondDwellingPermitted: false,
  studentCommuneConsent: false,
  backyardMicroUnitsPermitted: false,
  homeEnterprisePermitted: false,
};

/**
 * Determines whether the Municipal Zoning & Multi-Let Consent Rights accordion
 * should be rendered inside the Rental modal.
 */
export function shouldShowRentalZoningAccordion(
  propertyType: PropertyTitleType,
  unitCount: number,
  zoningProfile?: ZoningProfile
): boolean {
  if (propertyType === 'Sectional Title Apartment') {
    return false;
  }
  return unitCount > 1 || Boolean(zoningProfile);
}

/**
 * Strips zoningProfile when saving as Sectional Title Apartment or when unset.
 */
export function sanitizeRentalZoningForSave(
  propertyType: PropertyTitleType,
  zoningProfile?: ZoningProfile
): ZoningProfile | undefined {
  if (propertyType === 'Sectional Title Apartment' || !zoningProfile) {
    return undefined;
  }
  return zoningProfile;
}

/**
 * Safely parses locale decimals (supporting both `.` and `,` decimal separators).
 */
export function parseLocaleDecimal(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

/**
 * Applies one of the SA zoning presets while preserving any already-entered erfSizeSqm > 0.
 */
export function applyRentalZoningPreset(
  presetId: string,
  existing?: ZoningProfile
): ZoningProfile | undefined {
  const preset = ZONING_PRESETS.find((p) => p.id === presetId);
  if (!preset) return existing;

  return {
    currentZoning: preset.profile.currentZoning,
    targetZoning: preset.profile.targetZoning,
    erfSizeSqm:
      existing && existing.erfSizeSqm > 0
        ? existing.erfSizeSqm
        : preset.profile.defaultErfSizeSqm,
    farRatio: preset.profile.farRatio,
    coveragePercent: preset.profile.coveragePercent,
    maxHeightStoreys: preset.profile.maxHeightStoreys,
    maxDensityDuPerHa: preset.profile.maxDensityDuPerHa,
    requiresRezoning: preset.profile.requiresRezoning,
    consentUses: { ...preset.profile.consentUses },
  };
}

/**
 * Seeds a clean default ZoningProfile when a landlord manually edits zoning fields
 * before selecting a quick preset.
 */
export function createDefaultRentalZoningProfile(
  overrides?: Partial<ZoningProfile>
): ZoningProfile {
  const matchingPreset = overrides?.currentZoning
    ? ZONING_PRESETS.find((p) => p.profile.currentZoning === overrides.currentZoning)
    : undefined;

  const base: ZoningProfile = matchingPreset
    ? {
        currentZoning: matchingPreset.profile.currentZoning,
        targetZoning: matchingPreset.profile.targetZoning,
        erfSizeSqm: matchingPreset.profile.defaultErfSizeSqm,
        farRatio: matchingPreset.profile.farRatio,
        coveragePercent: matchingPreset.profile.coveragePercent,
        maxHeightStoreys: matchingPreset.profile.maxHeightStoreys,
        maxDensityDuPerHa: matchingPreset.profile.maxDensityDuPerHa,
        requiresRezoning: matchingPreset.profile.requiresRezoning,
        consentUses: { ...EMPTY_CONSENT_USES },
      }
    : {
        currentZoning: 'Residential 1',
        erfSizeSqm: 1000,
        farRatio: 0.5,
        coveragePercent: 50,
        maxHeightStoreys: 2,
        maxDensityDuPerHa: 10,
        requiresRezoning: false,
        consentUses: { ...EMPTY_CONSENT_USES },
      };

  return {
    ...base,
    ...overrides,
    consentUses: {
      ...base.consentUses,
      ...(overrides?.consentUses || {}),
    },
  };
}

/**
 * Checks whether a given SA preset matches the active zoning profile.
 */
export function isRentalZoningPresetActive(
  presetId: string,
  zoningProfile?: ZoningProfile
): boolean {
  if (!zoningProfile) return false;
  const preset = ZONING_PRESETS.find((p) => p.id === presetId);
  if (!preset) return false;

  return (
    preset.profile.currentZoning === zoningProfile.currentZoning &&
    (zoningProfile.maxDensityDuPerHa ?? 0) === (preset.profile.maxDensityDuPerHa ?? 0)
  );
}

export interface RentalDensityGuardrailResult {
  statutoryUnitCap?: number;
  isExceeded: boolean;
  isCoveredByConsent: boolean;
  showWarning: boolean;
  warningMessage?: string;
}

/**
 * Evaluates whether modeled lease units exceed statutory density without tiered SA consent use.
 */
export function evaluateRentalDensityGuardrail(
  zoningProfile: ZoningProfile | undefined,
  unitCount: number
): RentalDensityGuardrailResult {
  if (
    !zoningProfile ||
    !(zoningProfile.erfSizeSqm > 0) ||
    !(zoningProfile.maxDensityDuPerHa && zoningProfile.maxDensityDuPerHa > 0)
  ) {
    return {
      isExceeded: false,
      isCoveredByConsent: false,
      showWarning: false,
    };
  }

  const envelope = calculateZoningEnvelope(zoningProfile, 0, unitCount);
  const cap = envelope.maxPermittedUnitsByDensity!;
  const isExceeded = unitCount > cap;

  const hasMultiLetConsent = Boolean(
    zoningProfile.consentUses?.studentCommuneConsent ||
      zoningProfile.consentUses?.backyardMicroUnitsPermitted
  );
  const hasSecondDwellingCoverage =
    Boolean(zoningProfile.consentUses?.secondDwellingPermitted) &&
    unitCount <= Math.max(2, cap + 1);
  const isCoveredByConsent = hasMultiLetConsent || hasSecondDwellingCoverage;

  const showWarning = isExceeded && !isCoveredByConsent;
  return {
    statutoryUnitCap: cap,
    isExceeded,
    isCoveredByConsent,
    showWarning,
    warningMessage: showWarning
      ? `${unitCount} units modeled vs. ~${cap} as-of-right unit${cap === 1 ? '' : 's'} — verify Consent Use or rezoning compliance`
      : undefined,
  };
}

/**
 * Abbreviates SA municipal zoning codes for compact badges and chips.
 */
export function abbreviateZoningCode(code: MunicipalZoningCode): string {
  switch (code) {
    case 'Residential 1':
      return 'Res 1';
    case 'Residential 2':
      return 'Res 2';
    case 'Residential 3':
      return 'Res 3';
    case 'Residential 4':
      return 'Res 4';
    case 'Business 1':
      return 'Bus 1';
    case 'Business 2':
      return 'Bus 2';
    case 'Industrial 1':
      return 'Ind 1';
    case 'Unzoned / Township Scheme':
      return 'Township';
    default:
      return code;
  }
}

/**
 * Returns display labels for active multi-let consent uses.
 */
export function getActiveMultiLetConsentLabels(
  consentUses?: ConsentUseFlags
): string[] {
  if (!consentUses) return [];
  const labels: string[] = [];
  if (consentUses.secondDwellingPermitted) labels.push('2nd Dwelling');
  if (consentUses.studentCommuneConsent) labels.push('Student Commune');
  if (consentUses.backyardMicroUnitsPermitted) labels.push('Backyard Micro-Units');
  return labels;
}

/**
 * Formats the live status chip displayed in the collapsed/expanded RentalFormModal accordion header.
 */
export function formatRentalZoningAccordionChip(
  zoningProfile?: ZoningProfile
): string {
  if (!zoningProfile) return 'Not Set';

  const shortCurrent = abbreviateZoningCode(zoningProfile.currentZoning);
  const hasTransition = Boolean(
    zoningProfile.targetZoning &&
      zoningProfile.targetZoning !== zoningProfile.currentZoning
  );
  const shortCode = hasTransition
    ? `${shortCurrent} ➔ ${abbreviateZoningCode(zoningProfile.targetZoning!)}`
    : shortCurrent;

  const activeConsents = getActiveMultiLetConsentLabels(zoningProfile.consentUses);
  if (activeConsents.length > 0) {
    return `${shortCode} • Consent: ${activeConsents.join(', ')}`;
  }

  if (zoningProfile.requiresRezoning || hasTransition) {
    return `${shortCode} • Rezoning`;
  }

  return `${shortCode} • As-of-Right`;
}

/**
 * Formats the compact zoning badge label and descriptive hover tooltip for RentalCardHeader.
 */
export function formatCompactRentalZoningPill(zoningProfile: ZoningProfile): {
  label: string;
  tooltip: string;
} {
  const fullLabel = formatZoningTransitionLabel(zoningProfile);

  let label = fullLabel
    .replace(/Residential /g, 'Res ')
    .replace(/Business /g, 'Bus ')
    .replace(/Industrial /g, 'Ind ')
    .replace(/Unzoned \/ Township Scheme/g, 'Township')
    .replace(' (Rezoning Required)', ' (Rezoning)');

  if (label.includes('➔')) {
    label = label.replace(' (SPLUMA Rezoning)', '');
  }

  const tooltipParts: string[] = [`Municipal Zoning: ${fullLabel}`];

  if (zoningProfile.erfSizeSqm > 0) {
    tooltipParts.push(`Erf: ${zoningProfile.erfSizeSqm.toLocaleString('en-ZA')} m²`);
  }

  if (
    zoningProfile.erfSizeSqm > 0 &&
    zoningProfile.maxDensityDuPerHa &&
    zoningProfile.maxDensityDuPerHa > 0
  ) {
    const cap = calculateZoningEnvelope(zoningProfile, 0, 1).maxPermittedUnitsByDensity!;
    tooltipParts.push(
      `Density Cap: ~${cap} unit${cap === 1 ? '' : 's'} (${zoningProfile.maxDensityDuPerHa} du/ha)`
    );
  } else if (zoningProfile.maxDensityDuPerHa && zoningProfile.maxDensityDuPerHa > 0) {
    tooltipParts.push(`Max Density: ${zoningProfile.maxDensityDuPerHa} du/ha`);
  }

  const activeConsents = getActiveMultiLetConsentLabels(zoningProfile.consentUses);
  if (activeConsents.length > 0) {
    tooltipParts.push(`Consent Uses: ${activeConsents.join(', ')}`);
  }

  return {
    label,
    tooltip: tooltipParts.join(' • '),
  };
}

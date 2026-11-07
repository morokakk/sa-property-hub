import { describe, it, expect } from 'vitest';
import {
  calculateZoningEnvelope,
  formatZoningTransitionLabel,
  ZONING_PRESETS,
} from '../zoning';
import { ZoningProfile } from '@/types';

describe('src/lib/calculations/zoning.ts — Pure Town Planning Math', () => {
  const baseRes1Zoning: ZoningProfile = {
    currentZoning: 'Residential 1',
    erfSizeSqm: 1000,
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
  };

  it('calculates standard bulk, footprint, and density envelope within limits', () => {
    // 1000m² erf, FAR 0.5 = 500m² max bulk
    // Coverage 50% = 500m² max ground footprint
    // Planned 350m² buildable bulk, 1 unit
    const result = calculateZoningEnvelope(baseRes1Zoning, 350, 1);

    expect(result.maxPermittedBulkSqm).toBe(500);
    expect(result.maxGroundFootprintSqm).toBe(500);
    expect(result.minStoreysRequired).toBe(1);
    expect(result.maxPermittedUnitsByDensity).toBe(1); // (1000 / 10000) * 10 = 1 unit
    expect(result.bulkUtilizationPercent).toBe(70.0);
    expect(result.isBulkExceeded).toBe(false);
    expect(result.isHeightExceeded).toBe(false);
    expect(result.isDensityExceeded).toBe(false);
    expect(result.isSplumaRezoningTriggered).toBe(false);
  });

  it('detects when planned bulk exceeds maximum permitted FAR bulk', () => {
    // 1000m² erf, FAR 0.5 = 500m² max bulk
    // Planned 600m² buildable bulk -> exceeds by 100m²
    const result = calculateZoningEnvelope(baseRes1Zoning, 600, 1);

    expect(result.isBulkExceeded).toBe(true);
    expect(result.bulkUtilizationPercent).toBe(120.0);
    expect(result.isSplumaRezoningTriggered).toBe(true);
  });

  it('detects when required storeys exceed maximum height storeys', () => {
    // 1000m² erf, coverage 25% = 250m² ground footprint
    // Planned 600m² bulk -> requires ceil(600 / 250) = 3 storeys
    // Max height is 2 storeys -> height exceeded!
    const tightCoverageZoning: ZoningProfile = {
      ...baseRes1Zoning,
      coveragePercent: 25,
      farRatio: 0.8,
    };
    const result = calculateZoningEnvelope(tightCoverageZoning, 600, 1);

    expect(result.maxGroundFootprintSqm).toBe(250);
    expect(result.minStoreysRequired).toBe(3);
    expect(result.isHeightExceeded).toBe(true);
  });

  it('detects when planned units exceed density cap per hectare', () => {
    // 1000m² erf, 10 du/ha = 1 unit permitted
    // Planned units = 3 -> density exceeded!
    const result = calculateZoningEnvelope(baseRes1Zoning, 350, 3);

    expect(result.maxPermittedUnitsByDensity).toBe(1);
    expect(result.isDensityExceeded).toBe(true);
    expect(result.isSplumaRezoningTriggered).toBe(true);
  });

  it('triggers SPLUMA rezoning when requiresRezoning flag is explicitly true', () => {
    const rezoningZoning: ZoningProfile = {
      ...baseRes1Zoning,
      requiresRezoning: true,
      targetZoning: 'Residential 3',
    };
    const result = calculateZoningEnvelope(rezoningZoning, 300, 1);

    expect(result.isBulkExceeded).toBe(false);
    expect(result.isDensityExceeded).toBe(false);
    expect(result.isSplumaRezoningTriggered).toBe(true);
  });

  it('triggers SPLUMA rezoning when targetZoning differs from currentZoning', () => {
    const targetDifferent: ZoningProfile = {
      ...baseRes1Zoning,
      currentZoning: 'Residential 1',
      targetZoning: 'Residential 2',
      requiresRezoning: false,
    };
    const result = calculateZoningEnvelope(targetDifferent, 300, 1);

    expect(result.isSplumaRezoningTriggered).toBe(true);
  });

  it('safely handles zero and edge cases without NaN or division by zero', () => {
    const zeroZoning: ZoningProfile = {
      currentZoning: 'Special',
      erfSizeSqm: 0,
      farRatio: 0,
      coveragePercent: 0,
      maxHeightStoreys: 0,
      requiresRezoning: false,
      consentUses: {
        secondDwellingPermitted: false,
        studentCommuneConsent: false,
        backyardMicroUnitsPermitted: false,
        homeEnterprisePermitted: false,
      },
    };

    const result = calculateZoningEnvelope(zeroZoning, 0, 0);

    expect(result.maxPermittedBulkSqm).toBe(0);
    expect(result.maxGroundFootprintSqm).toBe(0);
    expect(result.minStoreysRequired).toBe(1);
    expect(result.bulkUtilizationPercent).toBe(0);
    expect(result.isBulkExceeded).toBe(false);
    expect(result.isHeightExceeded).toBe(false);
    expect(result.isDensityExceeded).toBe(false);
    expect(result.isSplumaRezoningTriggered).toBe(false);
  });

  describe('formatZoningTransitionLabel', () => {
    it('formats target transition with SPLUMA Rezoning label', () => {
      const z: ZoningProfile = {
        ...baseRes1Zoning,
        targetZoning: 'Residential 3',
      };
      expect(formatZoningTransitionLabel(z)).toBe('Residential 1 ➔ Residential 3 (SPLUMA Rezoning)');
    });

    it('formats requiresRezoning when targetZoning is unset', () => {
      const z: ZoningProfile = {
        ...baseRes1Zoning,
        requiresRezoning: true,
      };
      expect(formatZoningTransitionLabel(z)).toBe('Residential 1 (Rezoning Required)');
    });

    it('formats As-of-Right when no rezoning is required', () => {
      expect(formatZoningTransitionLabel(baseRes1Zoning)).toBe('Residential 1 (As-of-Right)');
    });
  });

  describe('ZONING_PRESETS', () => {
    it('provides 4 predefined South African municipal zoning presets', () => {
      expect(ZONING_PRESETS).toHaveLength(4);
      const ids = ZONING_PRESETS.map((p) => p.id);
      expect(ids).toEqual(['res-1', 'res-3', 'res-4', 'township-infill']);
    });

    it('ensures Township Infill preset evaluates cleanly as As-of-Right', () => {
      const townshipPreset = ZONING_PRESETS.find((p) => p.id === 'township-infill')!;
      const profile: ZoningProfile = {
        ...townshipPreset.profile,
        erfSizeSqm: townshipPreset.profile.defaultErfSizeSqm,
      };

      // 500m² erf * FAR 1.2 = 600m² bulk. 200 du/ha = 10 units.
      const result = calculateZoningEnvelope(profile, 260, 10);
      expect(result.isBulkExceeded).toBe(false);
      expect(result.isDensityExceeded).toBe(false);
      expect(result.isSplumaRezoningTriggered).toBe(false);
      expect(formatZoningTransitionLabel(profile)).toBe('Unzoned / Township Scheme (As-of-Right)');
    });
  });
});

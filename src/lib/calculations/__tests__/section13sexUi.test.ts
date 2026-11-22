import { describe, it, expect } from 'vitest';
import {
  calculateSection13sex,
  countActivePortfolioUnits,
  evaluateSection13sexUiState,
} from '../sarsTax';

describe('SARS Section 13sex Portfolio-Wide + Deal Unit Threshold & Manual Override UI', () => {
  describe('countActivePortfolioUnits', () => {
    it('returns 0 for an empty portfolio', () => {
      expect(countActivePortfolioUnits([])).toBe(0);
    });

    it('excludes Sold rentals and takes max(1, numberOfUnits, leases.length) per active property', () => {
      const units = countActivePortfolioUnits([
        { status: 'Occupied', numberOfUnits: 1, leases: [{}] },
        { status: 'Partially Vacant', numberOfUnits: 3, leases: [{}, {}] },
        { status: 'Occupied', leases: [{}, {}, {}, {}] },
        { status: 'Vacant' },
        { status: 'Sold', numberOfUnits: 8, leases: [{}, {}, {}, {}, {}, {}, {}, {}] },
      ]);
      // 1 + 3 + 4 + 1 + 0 (Sold excluded) = 9
      expect(units).toBe(9);
    });
  });

  describe('evaluateSection13sexUiState', () => {
    it('State A (deal >= 5, portfolio === 0): shows deal-only ≥5 units badge and manual confirmation copy', () => {
      const result = evaluateSection13sexUiState({
        dealUnits: 5,
        portfolioUnits: 0,
        isManuallyEligible: false,
      });

      expect(result.dealUnitCount).toBe(5);
      expect(result.portfolioUnitCount).toBe(0);
      expect(result.totalTrackedUnits).toBe(5);
      expect(result.meetsTrackedFiveUnitThreshold).toBe(true);
      expect(result.state).toBe('threshold_met');
      expect(result.badgeTone).toBe('emerald');
      expect(result.badgeLabel).toBe('✓ ≥5 Units (5 on deal)');
      expect(result.checkboxLabel).toBe('Section 13sex Eligible — Manual Confirmation (New / Off-Plan)');
      expect(result.helperCopy).toContain('brand-new, unused residential units');
      expect(result.helperCopy).toContain('5% p.a. on 55% of cost over 20 years');
    });

    it('State A (deal < 5, deal + portfolio >= 5): aggregates active portfolio units without auto-checking', () => {
      const result = evaluateSection13sexUiState({
        dealUnits: 1,
        portfolioUnits: 4,
        isManuallyEligible: false,
      });

      expect(result.dealUnitCount).toBe(1);
      expect(result.portfolioUnitCount).toBe(4);
      expect(result.totalTrackedUnits).toBe(5);
      expect(result.meetsTrackedFiveUnitThreshold).toBe(true);
      expect(result.state).toBe('threshold_met');
      expect(result.badgeTone).toBe('emerald');
      expect(result.badgeLabel).toBe('✓ ≥5 Units (1 deal + 4 portfolio)');
      expect(result.checkboxLabel).toBe('Section 13sex Eligible — Manual Confirmation (New / Off-Plan)');
    });

    it('State B (< 5 tracked & unchecked): renders slate counter badge and manual override prompt', () => {
      const result = evaluateSection13sexUiState({
        dealUnits: 1,
        portfolioUnits: 2,
        isManuallyEligible: false,
      });

      expect(result.totalTrackedUnits).toBe(3);
      expect(result.meetsTrackedFiveUnitThreshold).toBe(false);
      expect(result.state).toBe('below_threshold');
      expect(result.badgeTone).toBe('slate');
      expect(result.badgeLabel).toBe('3/5 Units Tracked (Deal + Portfolio)');
      expect(result.checkboxLabel).toBe('Manual Override: Apply Section 13sex Tax Shield');
      expect(result.helperCopy).toContain('Platform currently sees 3 of 5 required SA units');
      expect(result.helperCopy).toContain('including off-platform');
    });

    it('State C (< 5 tracked & checked): renders amber manual override active badge and disclosure copy', () => {
      const result = evaluateSection13sexUiState({
        dealUnits: 1,
        portfolioUnits: 2,
        isManuallyEligible: true,
      });

      expect(result.totalTrackedUnits).toBe(3);
      expect(result.meetsTrackedFiveUnitThreshold).toBe(false);
      expect(result.state).toBe('manual_override');
      expect(result.badgeTone).toBe('amber');
      expect(result.badgeLabel).toBe('Manual Override Active (3/5 Tracked)');
      expect(result.checkboxLabel).toBe('Manual Override: Apply Section 13sex Tax Shield');
      expect(result.helperCopy).toContain('Manual override applied: modeling 55% / 5% p.a. (20-yr) tax shield');
    });
  });

  describe('calculateSection13sex math preservation', () => {
    it('keeps 55% building base, 5% p.a. allowance, and 20-year cumulative math intact', () => {
      const calc = calculateSection13sex(1_000_000, 27, true);
      expect(calc).toEqual({
        isEligible: true,
        buildingDeductionBaseZAR: 550_000,
        annualAllowanceZAR: 27_500,
        taxRatePercent: 27,
        annualTaxSavingsZAR: 7_425,
        twentyYearCumulativeSavingsZAR: 148_500,
      });
    });
  });
});

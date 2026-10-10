import { describe, it, expect } from 'vitest';
import {
  getOccupantRiskDefaults,
  isEvictionActive,
  calculateEvictionCarryingCost,
  getFlipEvictionOffsetMonths,
  DAYS_PER_MONTH,
} from '../occupantRisk';
import { calculateDealMetrics } from '../propertyMetrics';
import { OccupantRiskProfile, AcquisitionCostBreakdown } from '@/types';

describe('Occupant & Eviction Risk Engine (PIE Act)', () => {
  describe('getOccupantRiskDefaults', () => {
    it('returns zero penalties for vacant possession', () => {
      const defaults = getOccupantRiskDefaults('vacant');
      expect(defaults.occupancyStatus).toBe('vacant');
      expect(defaults.evictionRequired).toBe(false);
      expect(defaults.evictionJurisdiction).toBe('none');
      expect(defaults.estimatedEvictionDelayDays).toBe(0);
      expect(defaults.budgetedLegalEvictionCostZAR).toBe(0);
      expect(defaults.monthlySiteSecurityZAR).toBe(0);
      expect(defaults.totalEvictionCarryingCostZAR).toBe(0);
    });

    it('returns zero penalties for verified tenanted possession', () => {
      const defaults = getOccupantRiskDefaults('tenanted_verified');
      expect(defaults.occupancyStatus).toBe('tenanted_verified');
      expect(defaults.evictionRequired).toBe(false);
      expect(defaults.evictionJurisdiction).toBe('none');
      expect(defaults.estimatedEvictionDelayDays).toBe(0);
      expect(defaults.budgetedLegalEvictionCostZAR).toBe(0);
    });

    it("defaults to Magistrate's Court (120 days, R 40,000) for unlawful occupants", () => {
      const defaults = getOccupantRiskDefaults('unlawful_occupant');
      expect(defaults.occupancyStatus).toBe('unlawful_occupant');
      expect(defaults.evictionRequired).toBe(true);
      expect(defaults.evictionJurisdiction).toBe('magistrates_court');
      expect(defaults.estimatedEvictionDelayDays).toBe(120);
      expect(defaults.budgetedLegalEvictionCostZAR).toBe(40000);
      expect(defaults.monthlySiteSecurityZAR).toBe(0);
    });

    it('defaults to High Court (240 days, R 85,000) when requested', () => {
      const defaults = getOccupantRiskDefaults('unlawful_occupant', 'high_court');
      expect(defaults.occupancyStatus).toBe('unlawful_occupant');
      expect(defaults.evictionRequired).toBe(true);
      expect(defaults.evictionJurisdiction).toBe('high_court');
      expect(defaults.estimatedEvictionDelayDays).toBe(240);
      expect(defaults.budgetedLegalEvictionCostZAR).toBe(85000);
    });
  });

  describe('isEvictionActive', () => {
    it('returns true when unlawful occupant has evictionRequired and no possession date', () => {
      const risk = getOccupantRiskDefaults('unlawful_occupant');
      expect(isEvictionActive(risk)).toBe(true);
    });

    it('returns false once possessionObtainedDate is recorded', () => {
      const risk: OccupantRiskProfile = {
        ...getOccupantRiskDefaults('unlawful_occupant'),
        possessionObtainedDate: '2026-10-10',
      };
      expect(isEvictionActive(risk)).toBe(false);
    });

    it('returns false for vacant and null/undefined', () => {
      expect(isEvictionActive(getOccupantRiskDefaults('vacant'))).toBe(false);
      expect(isEvictionActive(null)).toBe(false);
      expect(isEvictionActive(undefined)).toBe(false);
    });
  });

  describe('calculateEvictionCarryingCost', () => {
    it('returns all zeros when eviction is inactive', () => {
      const res = calculateEvictionCarryingCost({
        risk: getOccupantRiskDefaults('vacant'),
        monthlyBondInterestZAR: 10000,
        monthlyRatesZAR: 1500,
        monthlyLeviesZAR: 2000,
      });
      expect(res.dailyHoldingBurnZAR).toBe(0);
      expect(res.evictionDelayBurnZAR).toBe(0);
      expect(res.totalOccupantCostZAR).toBe(0);
      expect(res.monthlyFixedBurnZAR).toBe(0);
    });

    it('accurately computes daily holding burn and delay carrying burn', () => {
      const risk: OccupantRiskProfile = {
        ...getOccupantRiskDefaults('unlawful_occupant', 'magistrates_court'),
        monthlySiteSecurityZAR: 3000, // Armed guarding
      };
      // monthlyBondInterest: 12,000
      // rates: 1,800
      // levies: 2,200
      // security: 3,000
      // Total monthly burn = 19,000
      // Daily holding burn = 19,000 / 30.416 = 624.6712...
      // 120 days delay burn = round(624.6712... * 120) = round(74960.547...) = 74961
      // Total occupant cost = 40,000 + 74,961 = 114,961
      const res = calculateEvictionCarryingCost({
        risk,
        monthlyBondInterestZAR: 12000,
        monthlyRatesZAR: 1800,
        monthlyLeviesZAR: 2200,
      });

      expect(res.monthlyFixedBurnZAR).toBe(7000);
      expect(res.dailyHoldingBurnZAR).toBe(Number((19000 / DAYS_PER_MONTH).toFixed(2)));
      expect(res.evictionDelayBurnZAR).toBe(Math.round((19000 / DAYS_PER_MONTH) * 120));
      expect(res.totalOccupantCostZAR).toBe(40000 + res.evictionDelayBurnZAR);
    });

    it('handles zero delay days with non-zero legal fee', () => {
      const risk: OccupantRiskProfile = {
        ...getOccupantRiskDefaults('unlawful_occupant'),
        estimatedEvictionDelayDays: 0,
        budgetedLegalEvictionCostZAR: 40000,
      };
      const res = calculateEvictionCarryingCost({
        risk,
        monthlyBondInterestZAR: 10000,
      });
      expect(res.evictionDelayBurnZAR).toBe(0);
      expect(res.totalOccupantCostZAR).toBe(40000);
    });
  });

  describe('getFlipEvictionOffsetMonths', () => {
    it('returns months delay for active eviction', () => {
      const flip = {
        occupantRisk: getOccupantRiskDefaults('unlawful_occupant', 'magistrates_court'),
      };
      // 120 / 30.416 = 3.94529... -> 3.95
      expect(getFlipEvictionOffsetMonths(flip)).toBe(3.95);
    });

    it('returns 0 when vacant or possession recorded', () => {
      expect(getFlipEvictionOffsetMonths({ occupantRisk: getOccupantRiskDefaults('vacant') })).toBe(0);
      expect(
        getFlipEvictionOffsetMonths({
          occupantRisk: {
            ...getOccupantRiskDefaults('unlawful_occupant'),
            possessionObtainedDate: '2026-10-10',
          },
        })
      ).toBe(0);
    });
  });

  describe('Forward Deal Metrics Capital Stack Integration', () => {
    const baseCosts: AcquisitionCostBreakdown = {
      purchasePrice: 1500000,
      transferDuty: 35000,
      conveyancingFee: 30000,
      bondRegistrationFee: 25000,
      deedsOfficeFee: 1500,
      ficaSundries: 1500,
      totalAcquisitionCost: 1593000,
    };

    const baseDealParams = {
      purchasePrice: 1500000,
      estimatedRehabCost: 200000,
      monthlyRentalEstimate: 16000,
      monthlyLevies: 1500,
      monthlyRatesTaxes: 1200,
      annualInsurance: 6000,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
      targetExitPrice: 2400000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs: baseCosts,
    };

    it('capitalizes legal fees into Day-1 capital and reflects carrying burn in net flip profit', () => {
      const vacantMetrics = calculateDealMetrics({
        ...baseDealParams,
        occupantRisk: getOccupantRiskDefaults('vacant'),
      });

      const mcMetrics = calculateDealMetrics({
        ...baseDealParams,
        occupantRisk: getOccupantRiskDefaults('unlawful_occupant', 'magistrates_court'),
      });

      // Day-1 capital required increases by exactly legal eviction fee (R 40,000)
      expect(mcMetrics.initialCapitalRequired).toBe(vacantMetrics.initialCapitalRequired + 40000);
      expect(mcMetrics.evictionLegalCostZAR).toBe(40000);
      expect(mcMetrics.evictionDelayBurnZAR).toBeGreaterThan(0);
      expect(mcMetrics.totalOccupantCostZAR).toBe(
        40000 + (mcMetrics.evictionDelayBurnZAR || 0)
      );

      // Flip profit and ROI are strictly lower due to eviction carrying burn & legal fees
      expect(mcMetrics.projectedFlipNetProfit).toBeLessThan(vacantMetrics.projectedFlipNetProfit);
      expect(mcMetrics.projectedFlipRoi).toBeLessThan(vacantMetrics.projectedFlipRoi);
    });

    it('demonstrates High Court eviction incurs higher costs and lower ROI than Magistrate Court', () => {
      const mcMetrics = calculateDealMetrics({
        ...baseDealParams,
        occupantRisk: getOccupantRiskDefaults('unlawful_occupant', 'magistrates_court'),
      });

      const hcMetrics = calculateDealMetrics({
        ...baseDealParams,
        occupantRisk: getOccupantRiskDefaults('unlawful_occupant', 'high_court'),
      });

      // Day-1 capital difference: R 85,000 - R 40,000 = R 45,000
      expect(hcMetrics.initialCapitalRequired - mcMetrics.initialCapitalRequired).toBe(45000);
      expect(hcMetrics.totalOccupantCostZAR).toBeGreaterThan(mcMetrics.totalOccupantCostZAR!);
      expect(hcMetrics.projectedFlipNetProfit).toBeLessThan(mcMetrics.projectedFlipNetProfit);
      expect(hcMetrics.projectedFlipRoi).toBeLessThan(mcMetrics.projectedFlipRoi);
    });
  });
});

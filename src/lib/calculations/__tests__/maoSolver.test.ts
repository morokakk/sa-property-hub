import { describe, it, expect } from 'vitest';
import { calculateFlipMao, calculateRentalMao } from '../maoSolver';

describe('MAO Solver Engine', () => {
  describe('calculateFlipMao', () => {
    it('calculates max allowable bid correctly for a standard flip project', () => {
      // Exit: R 2,850,000, Target ROI: 15%, Rehab: R 450,000, Holding: R 135,000
      const result = calculateFlipMao({
        targetExitPrice: 2_850_000,
        desiredRoiPercent: 15,
        rehabCost: 450_000,
        holdingCost: 135_000,
        estimatedAcquisitionCostRate: 0.05,
      });

      // Total allowable outlay = 2,850,000 / 1.15 = 2,478,261
      // Non-purchase costs = 450k + 135k = 585,000
      // Allowable for acquisition = 2,478,261 - 585,000 = 1,893,261
      // Max bid (with 5% duty/legal) = 1,893,261 / 1.05 = ~1,803,106
      expect(result.totalAllowableOutlay).toBe(2_478_261);
      expect(result.nonPurchaseCosts).toBe(585_000);
      expect(result.maxAllowableBid).toBeGreaterThan(1_700_000);
      expect(result.maxAllowableBid).toBeLessThan(1_900_000);
      expect(result.projectedProfitAtMao).toBe(371_739);
    });

    it('returns 0 when costs exceed allowable outlay', () => {
      const result = calculateFlipMao({
        targetExitPrice: 1_000_000,
        desiredRoiPercent: 50,
        rehabCost: 800_000,
        holdingCost: 100_000,
      });
      // Outlay allowable = 1,000,000 / 1.5 = 666,667
      // Costs = 900,000 > 666,667 -> max bid must clamp to 0
      expect(result.maxAllowableBid).toBe(0);
    });

    it('handles zero or negative inputs gracefully', () => {
      const result = calculateFlipMao({
        targetExitPrice: 0,
        desiredRoiPercent: 15,
        rehabCost: 100_000,
        holdingCost: 20_000,
      });
      expect(result.maxAllowableBid).toBe(0);
    });
  });

  describe('calculateRentalMao', () => {
    it('calculates max purchase price using stress-tested NOI and target net yield', () => {
      // Monthly rent: R 16,500, Vacancy: 6%, Management: 8%, Levies: R 1,650, Rates: R 1,100, Ins: R 0
      // Target Net Yield: 8.0%
      const result = calculateRentalMao({
        monthlyRent: 16_500,
        vacancyRatePercent: 6.0,
        managementFeePercent: 8.0,
        monthlyLevies: 1_650,
        monthlyRates: 1_100,
        annualInsurance: 0,
        targetNetYieldPercent: 8.0,
      });

      // Gross annual rent = 16,500 * 12 = 198,000
      // Vacancy loss = 198,000 * 0.06 = 11,880
      // Effective Gross Rent = 186,120
      // Management fee = 198,000 * 0.08 = 15,840
      // Levies + Rates = (1,650 + 1,100) * 12 = 33,000
      // Total OpEx = 33,000 + 15,840 = 48,840
      // Stress-Tested NOI = 186,120 - 48,840 = 137,280
      // Max price @ 8% cap rate = 137,280 / 0.08 = 1,716,000
      expect(result.grossAnnualRent).toBe(198_000);
      expect(result.vacancyLossAnnual).toBe(11_880);
      expect(result.effectiveGrossRentAnnual).toBe(186_120);
      expect(result.managementFeeAnnual).toBe(15_840);
      expect(result.stressTestedNoi).toBe(137_280);
      expect(result.maxAllowablePrice).toBe(1_716_000);
    });

    it('returns 0 when target net yield is zero or negative', () => {
      const result = calculateRentalMao({
        monthlyRent: 16_500,
        vacancyRatePercent: 6.0,
        managementFeePercent: 8.0,
        monthlyLevies: 1_650,
        monthlyRates: 1_100,
        annualInsurance: 0,
        targetNetYieldPercent: 0,
      });
      expect(result.maxAllowablePrice).toBe(0);
    });

    it('returns 0 when operating expenses exceed gross rent', () => {
      const result = calculateRentalMao({
        monthlyRent: 5_000,
        vacancyRatePercent: 10.0,
        managementFeePercent: 10.0,
        monthlyLevies: 4_000,
        monthlyRates: 2_000,
        annualInsurance: 12_000,
        targetNetYieldPercent: 8.0,
      });
      expect(result.stressTestedNoi).toBeLessThan(0);
      expect(result.maxAllowablePrice).toBe(0);
    });
  });
});

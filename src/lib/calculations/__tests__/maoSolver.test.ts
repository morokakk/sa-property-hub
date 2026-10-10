import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
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
      expect(result.maxAllowableBid).toBe(1_803_106);
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
      expect(result.totalAllowableOutlay).toBe(0);
      expect(result.nonPurchaseCosts).toBe(0);
      expect(result.projectedProfitAtMao).toBe(0);
    });

    it('handles negative or zero exit commission without corrupting non-purchase costs', () => {
      const resZero = calculateFlipMao({
        targetExitPrice: 2_000_000,
        desiredRoiPercent: 15,
        rehabCost: 200_000,
        holdingCost: 50_000,
        exitCommissionPercent: 0,
      });
      expect(resZero.nonPurchaseCosts).toBe(250_000);

      const resNegative = calculateFlipMao({
        targetExitPrice: 2_000_000,
        desiredRoiPercent: 15,
        rehabCost: 200_000,
        holdingCost: 50_000,
        exitCommissionPercent: -5,
      });
      expect(resNegative.nonPurchaseCosts).toBe(250_000);
    });

    it('satisfies property: monotonicity with respect to exit price', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100_000, max: 10_000_000 }),
          fc.integer({ min: 1, max: 5_000_000 }),
          fc.integer({ min: 5, max: 40 }),
          fc.integer({ min: 10_000, max: 500_000 }),
          fc.integer({ min: 5_000, max: 100_000 }),
          (baseExitPrice, delta, roi, rehab, holding) => {
            const low = calculateFlipMao({
              targetExitPrice: baseExitPrice,
              desiredRoiPercent: roi,
              rehabCost: rehab,
              holdingCost: holding,
            });
            const high = calculateFlipMao({
              targetExitPrice: baseExitPrice + delta,
              desiredRoiPercent: roi,
              rehabCost: rehab,
              holdingCost: holding,
            });
            return high.maxAllowableBid >= low.maxAllowableBid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('satisfies property: zero or negative exit price or negative capex returns 0 max bid', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }),
          fc.integer({ min: -80, max: 100 }),
          fc.integer({ min: 0, max: 1_000_000 }),
          fc.integer({ min: 0, max: 500_000 }),
          (targetExitPrice, desiredRoiPercent, rehabCost, holdingCost) => {
            const res = calculateFlipMao({
              targetExitPrice,
              desiredRoiPercent,
              rehabCost,
              holdingCost,
            });
            return res.maxAllowableBid === 0 && res.totalAllowableOutlay === 0;
          }
        ),
        { numRuns: 100 }
      );

      // Property: negative rehabCost strictly returns 0
      fc.assert(
        fc.property(
          fc.integer({ min: 100_000, max: 10_000_000 }),
          fc.integer({ min: 5, max: 50 }),
          fc.integer({ max: -1 }),
          fc.integer({ min: 0, max: 100_000 }),
          (targetExitPrice, desiredRoiPercent, rehabCost, holdingCost) => {
            const res = calculateFlipMao({
              targetExitPrice,
              desiredRoiPercent,
              rehabCost,
              holdingCost,
            });
            return res.maxAllowableBid === 0 && res.totalAllowableOutlay === 0;
          }
        ),
        { numRuns: 100 }
      );

      // Property: negative holdingCost strictly returns 0
      fc.assert(
        fc.property(
          fc.integer({ min: 100_000, max: 10_000_000 }),
          fc.integer({ min: 5, max: 50 }),
          fc.integer({ min: 0, max: 100_000 }),
          fc.integer({ max: -1 }),
          (targetExitPrice, desiredRoiPercent, rehabCost, holdingCost) => {
            const res = calculateFlipMao({
              targetExitPrice,
              desiredRoiPercent,
              rehabCost,
              holdingCost,
            });
            return res.maxAllowableBid === 0 && res.totalAllowableOutlay === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('satisfies property: total outlay invariant and profit equation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 500_000, max: 15_000_000 }),
          fc.integer({ min: 5, max: 50 }),
          fc.integer({ min: 10_000, max: 300_000 }),
          fc.integer({ min: 5_000, max: 50_000 }),
          fc.double({ min: 0.01, max: 0.15, noNaN: true }),
          (targetExitPrice, desiredRoiPercent, rehabCost, holdingCost, rate) => {
            const res = calculateFlipMao({
              targetExitPrice,
              desiredRoiPercent,
              rehabCost,
              holdingCost,
              estimatedAcquisitionCostRate: rate,
            });

            // Invariant: total allowable outlay plus projected profit must exactly equal exit price
            const sumInvariant = res.totalAllowableOutlay + res.projectedProfitAtMao === targetExitPrice;
            const profitMatch = res.projectedProfitAtMao === targetExitPrice - res.totalAllowableOutlay;

            if (res.maxAllowableBid > 0) {
              // Bid plus acquisition friction plus non-purchase capex must not exceed allowable outlay (+2 for rounding)
              const impliedAcquisitionCost = res.maxAllowableBid * (1 + rate);
              const impliedOutlay = impliedAcquisitionCost + res.nonPurchaseCosts;
              return sumInvariant && profitMatch && impliedOutlay <= res.totalAllowableOutlay + 2;
            }

            return sumInvariant && profitMatch;
          }
        ),
        { numRuns: 100 }
      );
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
      // Management fee with 15% VAT = 198,000 * 0.08 * 1.15 = 18,216
      // Levies + Rates = (1,650 + 1,100) * 12 = 33,000
      // Total OpEx = 33,000 + 18,216 = 51,216
      // Stress-Tested NOI = 186,120 - 51,216 = 134,904
      // Max price @ 8% cap rate = 134,904 / 0.08 = 1,686,300
      expect(result.grossAnnualRent).toBe(198_000);
      expect(result.vacancyLossAnnual).toBe(11_880);
      expect(result.effectiveGrossRentAnnual).toBe(186_120);
      expect(result.managementFeeAnnual).toBe(18_216);
      expect(result.stressTestedNoi).toBe(134_904);
      expect(result.maxAllowablePrice).toBe(1_686_300);

      // When agencyVatApplicable is explicitly false (VAT-inclusive / flat)
      const flatResult = calculateRentalMao({
        monthlyRent: 16_500,
        vacancyRatePercent: 6.0,
        managementFeePercent: 8.0,
        agencyVatApplicable: false,
        monthlyLevies: 1_650,
        monthlyRates: 1_100,
        annualInsurance: 0,
        targetNetYieldPercent: 8.0,
      });
      expect(flatResult.managementFeeAnnual).toBe(15_840);
      expect(flatResult.stressTestedNoi).toBe(137_280);
      expect(flatResult.maxAllowablePrice).toBe(1_716_000);
    });

    it('calculates max purchase price with non-zero annual building insurance', () => {
      const result = calculateRentalMao({
        monthlyRent: 20_000,
        vacancyRatePercent: 5.0,
        managementFeePercent: 10.0,
        agencyVatApplicable: true,
        monthlyLevies: 1_200,
        monthlyRates: 800,
        annualInsurance: 6_000,
        targetNetYieldPercent: 9.0,
      });

      // Gross annual: 240,000
      // Vacancy 5%: 12,000 -> Effective Gross Rent = 228,000
      // Mgmt fee (10% + 15% VAT = 11.5%): 240,000 * 0.115 = 27,600
      // Levies + Rates: 2,000 * 12 = 24,000
      // Insurance: 6,000
      // Total OpEx: 27,600 + 24,000 + 6,000 = 57,600
      // Stress-Tested NOI: 228,000 - 57,600 = 170,400
      // Max price @ 9% cap rate: Math.round(170,400 / 0.09) = 1,893,333
      expect(result.annualOperatingExpenses).toBe(57_600);
      expect(result.stressTestedNoi).toBe(170_400);
      expect(result.maxAllowablePrice).toBe(1_893_333);
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

    it('satisfies property: monotonicity with respect to monthly rent', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5_000, max: 100_000 }),
          fc.integer({ min: 1, max: 50_000 }),
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 5, max: 15 }),
          (baseRent, delta, vacancy, mgmt, yieldPct) => {
            const low = calculateRentalMao({
              monthlyRent: baseRent,
              vacancyRatePercent: vacancy,
              managementFeePercent: mgmt,
              monthlyLevies: 1_000,
              monthlyRates: 800,
              annualInsurance: 6_000,
              targetNetYieldPercent: yieldPct,
            });
            const high = calculateRentalMao({
              monthlyRent: baseRent + delta,
              vacancyRatePercent: vacancy,
              managementFeePercent: mgmt,
              monthlyLevies: 1_000,
              monthlyRates: 800,
              annualInsurance: 6_000,
              targetNetYieldPercent: yieldPct,
            });
            return high.maxAllowablePrice >= low.maxAllowablePrice;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('satisfies property: zero or negative target yield returns 0 max price', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1_000, max: 100_000 }),
          fc.integer({ max: 0 }),
          (monthlyRent, targetNetYieldPercent) => {
            const res = calculateRentalMao({
              monthlyRent,
              vacancyRatePercent: 5,
              managementFeePercent: 8,
              monthlyLevies: 500,
              monthlyRates: 500,
              annualInsurance: 3_000,
              targetNetYieldPercent,
            });
            return res.maxAllowablePrice === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('satisfies property: NOI and operating expenses invariant', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1_000, max: 100_000 }),
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 10_000 }),
          fc.integer({ min: 0, max: 10_000 }),
          fc.integer({ min: 0, max: 50_000 }),
          fc.integer({ min: 1, max: 20 }),
          fc.boolean(),
          (rent, vacancy, mgmt, levies, rates, insurance, yieldPct, agencyVat) => {
            const res = calculateRentalMao({
              monthlyRent: rent,
              vacancyRatePercent: vacancy,
              managementFeePercent: mgmt,
              agencyVatApplicable: agencyVat,
              monthlyLevies: levies,
              monthlyRates: rates,
              annualInsurance: insurance,
              targetNetYieldPercent: yieldPct,
            });
            const expectedNoi = res.effectiveGrossRentAnnual - res.annualOperatingExpenses;
            return res.stressTestedNoi === expectedNoi && res.maxAllowablePrice >= 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('satisfies property: agency VAT always reduces or maintains max allowable price', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5_000, max: 100_000 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 4, max: 15 }),
          (monthlyRent, managementFeePercent, targetNetYieldPercent) => {
            const withVat = calculateRentalMao({
              monthlyRent,
              vacancyRatePercent: 5,
              managementFeePercent,
              agencyVatApplicable: true,
              monthlyLevies: 1_000,
              monthlyRates: 1_000,
              annualInsurance: 5_000,
              targetNetYieldPercent,
            });
            const withoutVat = calculateRentalMao({
              monthlyRent,
              vacancyRatePercent: 5,
              managementFeePercent,
              agencyVatApplicable: false,
              monthlyLevies: 1_000,
              monthlyRates: 1_000,
              annualInsurance: 5_000,
              targetNetYieldPercent,
            });
            return (
              withVat.managementFeeAnnual >= withoutVat.managementFeeAnnual &&
              withVat.maxAllowablePrice <= withoutVat.maxAllowablePrice
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('PIE Act Eviction Risk Adjustments', () => {
    const baseFlipParams = {
      targetExitPrice: 2_500_000,
      desiredRoiPercent: 18,
      rehabCost: 300_000,
      holdingCost: 90_000,
      estimatedAcquisitionCostRate: 0.05,
    };

    it('Flip MAO solver returns lower bid limits for unlawful occupant properties', () => {
      const vacantResult = calculateFlipMao(baseFlipParams);

      const unlawfulResult = calculateFlipMao({
        ...baseFlipParams,
        evictionLegalCostZAR: 40_000,
        evictionDelayDays: 120,
        evictionMonthlyFixedBurnZAR: 4_000,
        bondLtvPercent: 80,
        interestRatePercent: 11.75,
      });

      expect(unlawfulResult.maxAllowableBid).toBeLessThan(vacantResult.maxAllowableBid);
      expect(unlawfulResult.occupantRiskReductionZAR).toBeGreaterThan(0);
      expect(unlawfulResult.riskFreeMaxBid).toBe(vacantResult.maxAllowableBid);
      expect(unlawfulResult.evictionCostAtMaoZAR).toBeGreaterThan(40_000);
    });

    it('Flip MAO decreases monotonically as eviction delay days increase', () => {
      const delays = [0, 30, 90, 120, 180, 240, 365];
      let previousBid = Infinity;

      for (const days of delays) {
        const res = calculateFlipMao({
          ...baseFlipParams,
          evictionLegalCostZAR: 40_000,
          evictionDelayDays: days,
          evictionMonthlyFixedBurnZAR: 3_500,
          bondLtvPercent: 80,
          interestRatePercent: 11.75,
        });

        expect(res.maxAllowableBid).toBeLessThanOrEqual(previousBid);
        previousBid = res.maxAllowableBid;
      }
    });

    it('High Court eviction yields lower or equal MAO compared to Magistrates Court', () => {
      const mc = calculateFlipMao({
        ...baseFlipParams,
        evictionLegalCostZAR: 40_000,
        evictionDelayDays: 120,
        evictionMonthlyFixedBurnZAR: 3_000,
        bondLtvPercent: 80,
        interestRatePercent: 11.75,
      });

      const hc = calculateFlipMao({
        ...baseFlipParams,
        evictionLegalCostZAR: 85_000,
        evictionDelayDays: 240,
        evictionMonthlyFixedBurnZAR: 3_000,
        bondLtvPercent: 80,
        interestRatePercent: 11.75,
      });

      expect(hc.maxAllowableBid).toBeLessThan(mc.maxAllowableBid);
      expect(hc.occupantRiskReductionZAR).toBeGreaterThan(mc.occupantRiskReductionZAR!);
    });

    it('Rental MAO solver applies eviction penalties to target purchase price', () => {
      const baseRentalParams = {
        monthlyRent: 15_000,
        vacancyRatePercent: 5,
        managementFeePercent: 8,
        monthlyLevies: 1_200,
        monthlyRates: 1_000,
        annualInsurance: 6_000,
        targetNetYieldPercent: 9.0,
      };

      const vacant = calculateRentalMao(baseRentalParams);
      const unlawful = calculateRentalMao({
        ...baseRentalParams,
        evictionLegalCostZAR: 40_000,
        evictionDelayDays: 120,
        evictionMonthlyFixedBurnZAR: 2_500,
        bondLtvPercent: 80,
        interestRatePercent: 11.75,
      });

      expect(unlawful.maxAllowablePrice).toBeLessThan(vacant.maxAllowablePrice);
      expect(unlawful.occupantRiskReductionZAR).toBeGreaterThan(0);
      expect(unlawful.riskFreeMaxPrice).toBe(vacant.maxAllowablePrice);
    });

    it('clamps MAO bid to 0 when eviction costs exceed allowable outlay', () => {
      const clamped = calculateFlipMao({
        targetExitPrice: 500_000,
        desiredRoiPercent: 20,
        rehabCost: 350_000,
        evictionLegalCostZAR: 85_000,
        evictionDelayDays: 240,
        evictionMonthlyFixedBurnZAR: 5_000,
      });

      expect(clamped.maxAllowableBid).toBe(0);
    });
  });
});

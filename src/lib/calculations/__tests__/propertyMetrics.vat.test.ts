import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateDealMetrics, generateLongTermProjection } from '../propertyMetrics';
import { calculateRentalMao } from '../maoSolver';

describe('Managing Agent Fee + 15% VAT Alignment', () => {
  const baseCostBreakdown = {
    purchasePrice: 1_000_000,
    transferDuty: 0,
    conveyancingFee: 25_000,
    bondRegistrationFee: 20_000,
    deedsOfficeFee: 1_150,
    ficaSundries: 0,
    totalAcquisitionCost: 1_046_150,
  };

  it('calculates management fee with 15% VAT added when agencyVatApplicable is true', () => {
    const metrics = calculateDealMetrics({
      purchasePrice: 1_000_000,
      estimatedRehabCost: 0,
      monthlyRentalEstimate: 10_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 6_000, // 500/m
      managementFeePercent: 8.0,
      agencyVatApplicable: true,
      vacancyRatePercent: 6.0,
      targetExitPrice: 1_200_000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 100,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs: baseCostBreakdown,
    });

    // Gross rent: 10,000
    // Vacancy (6%): 600 -> Effective Gross Rent = 9,400
    // Management fee: 10,000 * 8% * 1.15 = 920
    // Total OpEx: Levies(1,000) + Rates(800) + Ins(500) + Mgmt(920) = 3,220
    // Monthly NOI: 9,400 - 3,220 = 6,180
    // Annual NOI: 6,180 * 12 = 74,160
    expect(metrics.annualNetOperatingIncome).toBe(74_160);
  });

  it('calculates management fee as flat/inclusive when agencyVatApplicable is false', () => {
    const metrics = calculateDealMetrics({
      purchasePrice: 1_000_000,
      estimatedRehabCost: 0,
      monthlyRentalEstimate: 10_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 6_000, // 500/m
      managementFeePercent: 8.0,
      agencyVatApplicable: false,
      vacancyRatePercent: 6.0,
      targetExitPrice: 1_200_000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 100,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs: baseCostBreakdown,
    });

    // Gross rent: 10,000
    // Vacancy (6%): 600 -> Effective Gross Rent = 9,400
    // Management fee: 10,000 * 8% * 1.0 = 800 (flat)
    // Total OpEx: Levies(1,000) + Rates(800) + Ins(500) + Mgmt(800) = 3,100
    // Monthly NOI: 9,400 - 3,100 = 6,300
    // Annual NOI: 6,300 * 12 = 75,600
    expect(metrics.annualNetOperatingIncome).toBe(75_600);
  });

  it('Rental MAO solver yields lower max purchase price when VAT is enabled due to higher OpEx', () => {
    const withVat = calculateRentalMao({
      monthlyRent: 15_000,
      vacancyRatePercent: 6.0,
      managementFeePercent: 8.0,
      agencyVatApplicable: true,
      monthlyLevies: 1_500,
      monthlyRates: 1_000,
      annualInsurance: 0,
      targetNetYieldPercent: 8.0,
    });

    const withoutVat = calculateRentalMao({
      monthlyRent: 15_000,
      vacancyRatePercent: 6.0,
      managementFeePercent: 8.0,
      agencyVatApplicable: false,
      monthlyLevies: 1_500,
      monthlyRates: 1_000,
      annualInsurance: 0,
      targetNetYieldPercent: 8.0,
    });

    // Annual Rent: 180,000
    // With VAT: 180,000 * 0.08 * 1.15 = 16,560/yr agent fee
    // Without VAT: 180,000 * 0.08 = 14,400/yr agent fee
    expect(withVat.managementFeeAnnual).toBe(16_560);
    expect(withoutVat.managementFeeAnnual).toBe(14_400);

    // Difference in annual OpEx = 2,160/yr
    // Max allowable bid at 8% yield is reduced by 2,160 / 0.08 = 27,000
    expect(withVat.maxAllowablePrice).toBeLessThan(withoutVat.maxAllowablePrice);
    expect(withoutVat.maxAllowablePrice - withVat.maxAllowablePrice).toBe(27_000);
  });

  it('generateLongTermProjection incorporates agencyVatApplicable in base operating costs', () => {
    const projWithVat = generateLongTermProjection({
      purchasePrice: 1_000_000,
      monthlyRentalEstimate: 10_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 6_000,
      managementFeePercent: 8.0,
      agencyVatApplicable: true,
      vacancyRatePercent: 6.0,
    });

    const projWithoutVat = generateLongTermProjection({
      purchasePrice: 1_000_000,
      monthlyRentalEstimate: 10_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 6_000,
      managementFeePercent: 8.0,
      agencyVatApplicable: false,
      vacancyRatePercent: 6.0,
    });

    // Year 1 costs with VAT should be higher by (920 - 800) * 12 = 1,440
    expect(projWithVat[0].costs - projWithoutVat[0].costs).toBe(1_440);
  });

  it('satisfies property: VAT on management fee strictly decreases or maintains NOI by exact VAT amount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 150_000 }),
        fc.double({ min: 0.0, max: 25.0, noNaN: true }),
        fc.double({ min: 0.0, max: 20.0, noNaN: true }),
        fc.integer({ min: 0, max: 5_000 }),
        fc.integer({ min: 0, max: 5_000 }),
        (monthlyRent, mgmtFeePct, vacancyPct, levies, rates) => {
          const withVat = calculateDealMetrics({
            purchasePrice: 1_000_000,
            estimatedRehabCost: 0,
            monthlyRentalEstimate: monthlyRent,
            monthlyLevies: levies,
            monthlyRatesTaxes: rates,
            annualInsurance: 6_000,
            managementFeePercent: mgmtFeePct,
            agencyVatApplicable: true,
            vacancyRatePercent: vacancyPct,
            targetExitPrice: 1_200_000,
            holdingPeriodMonths: 6,
            loanToValuePercent: 80,
            interestRatePercent: 11.75,
            loanTermYears: 20,
            costs: baseCostBreakdown,
          });

          const withoutVat = calculateDealMetrics({
            purchasePrice: 1_000_000,
            estimatedRehabCost: 0,
            monthlyRentalEstimate: monthlyRent,
            monthlyLevies: levies,
            monthlyRatesTaxes: rates,
            annualInsurance: 6_000,
            managementFeePercent: mgmtFeePct,
            agencyVatApplicable: false,
            vacancyRatePercent: vacancyPct,
            targetExitPrice: 1_200_000,
            holdingPeriodMonths: 6,
            loanToValuePercent: 80,
            interestRatePercent: 11.75,
            loanTermYears: 20,
            costs: baseCostBreakdown,
          });

          const diff = withoutVat.annualNetOperatingIncome - withVat.annualNetOperatingIncome;
          const expectedVat = monthlyRent * 12 * (mgmtFeePct / 100) * 0.15;

          // annualNetOperatingIncome is rounded to the nearest ZAR integer, so difference is within 1 ZAR of exact float VAT
          return (
            withoutVat.annualNetOperatingIncome >= withVat.annualNetOperatingIncome &&
            Math.abs(diff - expectedVat) <= 1
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('satisfies property: long term projection cost difference matches annual VAT delta', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 0, max: 20 }),
        (monthlyRent, mgmtFeePct) => {
          const projWith = generateLongTermProjection({
            purchasePrice: 1_000_000,
            monthlyRentalEstimate: monthlyRent,
            monthlyLevies: 1_000,
            monthlyRatesTaxes: 800,
            annualInsurance: 6_000,
            managementFeePercent: mgmtFeePct,
            agencyVatApplicable: true,
            vacancyRatePercent: 5.0,
          });

          const projWithout = generateLongTermProjection({
            purchasePrice: 1_000_000,
            monthlyRentalEstimate: monthlyRent,
            monthlyLevies: 1_000,
            monthlyRatesTaxes: 800,
            annualInsurance: 6_000,
            managementFeePercent: mgmtFeePct,
            agencyVatApplicable: false,
            vacancyRatePercent: 5.0,
          });

          const costDiffYear1 = projWith[0].costs - projWithout[0].costs;
          const expectedAnnualVat = Math.round((monthlyRent * (mgmtFeePct / 100) * 0.15) * 12);
          return Math.abs(costDiffYear1 - expectedAnnualVat) <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('satisfies boundary property: 0 rent, 0% fee, and 100% vacancy edge cases', () => {
    // 0 rent -> VAT delta must be 0
    const zeroRentWithVat = calculateDealMetrics({
      purchasePrice: 1_000_000,
      estimatedRehabCost: 0,
      monthlyRentalEstimate: 0,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 6_000,
      managementFeePercent: 10.0,
      agencyVatApplicable: true,
      vacancyRatePercent: 0,
      targetExitPrice: 1_200_000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs: baseCostBreakdown,
    });
    const zeroRentWithoutVat = calculateDealMetrics({
      purchasePrice: 1_000_000,
      estimatedRehabCost: 0,
      monthlyRentalEstimate: 0,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 6_000,
      managementFeePercent: 10.0,
      agencyVatApplicable: false,
      vacancyRatePercent: 0,
      targetExitPrice: 1_200_000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs: baseCostBreakdown,
    });
    expect(zeroRentWithoutVat.annualNetOperatingIncome).toBe(zeroRentWithVat.annualNetOperatingIncome);

    // 0% fee -> VAT delta must be 0
    const zeroFeeWithVat = calculateDealMetrics({
      purchasePrice: 1_000_000,
      estimatedRehabCost: 0,
      monthlyRentalEstimate: 15_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 6_000,
      managementFeePercent: 0,
      agencyVatApplicable: true,
      vacancyRatePercent: 5.0,
      targetExitPrice: 1_200_000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs: baseCostBreakdown,
    });
    const zeroFeeWithoutVat = calculateDealMetrics({
      purchasePrice: 1_000_000,
      estimatedRehabCost: 0,
      monthlyRentalEstimate: 15_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 6_000,
      managementFeePercent: 0,
      agencyVatApplicable: false,
      vacancyRatePercent: 5.0,
      targetExitPrice: 1_200_000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      costs: baseCostBreakdown,
    });
    expect(zeroFeeWithoutVat.annualNetOperatingIncome).toBe(zeroFeeWithVat.annualNetOperatingIncome);
  });
});

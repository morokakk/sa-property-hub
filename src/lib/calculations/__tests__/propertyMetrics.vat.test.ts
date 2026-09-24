import { describe, it, expect } from 'vitest';
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
});

import { describe, it, expect } from 'vitest';
import { generateLongTermProjection } from '../propertyMetrics';

describe('generateLongTermProjection Engine', () => {
  it('accurately computes 20-year bond amortization and zeroes out balance at year 20', () => {
    const projections = generateLongTermProjection({
      purchasePrice: 1_800_000,
      openMarketValueZAR: 2_150_000,
      depositZAR: 0,
      interestRatePercent: 11.75,
      bondTermYears: 20,
      annualCapitalGrowthPercent: 5.0,
      annualRentalEscalationPercent: 6.0,
      annualExpenseInflationPercent: 6.0,
      monthlyRentalEstimate: 16_500,
      monthlyLevies: 1_650,
      monthlyRatesTaxes: 1_100,
      annualInsurance: 7_200,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
    });

    expect(projections).toHaveLength(20);

    // Year 1 checks
    const yr1 = projections[0];
    expect(yr1.year).toBe(1);
    expect(yr1.rent).toBe(16_500 * 12);
    expect(yr1.outstandingBond).toBeGreaterThan(1_700_000);
    expect(yr1.propertyValue).toBe(Math.round(2_150_000 * 1.05));
    expect(yr1.netEquity).toBe(yr1.propertyValue - yr1.outstandingBond);

    // Year 20 (Maturity) checks
    const yr20 = projections[19];
    expect(yr20.year).toBe(20);
    expect(yr20.outstandingBond).toBe(0);
    expect(yr20.netEquity).toBe(yr20.propertyValue);
    expect(yr20.propertyValue).toBe(Math.round(2_150_000 * Math.pow(1.05, 20)));

    // Escalation compounding checks
    const yr2 = projections[1];
    expect(yr2.rent).toBe(Math.round(yr1.rent * 1.06));
    expect(yr2.costs).toBe(Math.round(yr1.costs * 1.06));
  });

  it('accurately computes 30-year bond amortization and zeroes out balance at year 30', () => {
    const projections = generateLongTermProjection({
      purchasePrice: 2_500_000,
      depositZAR: 250_000, // 90% LTV bond = 2,250,000
      interestRatePercent: 11.25,
      bondTermYears: 30,
      annualCapitalGrowthPercent: 6.0,
      annualRentalEscalationPercent: 5.5,
      annualExpenseInflationPercent: 5.0,
      monthlyRentalEstimate: 22_000,
    });

    expect(projections).toHaveLength(30);

    const yr30 = projections[29];
    expect(yr30.year).toBe(30);
    expect(yr30.outstandingBond).toBe(0);
    expect(yr30.netEquity).toBe(yr30.propertyValue);
  });

  it('handles 100% cash deals with 0 bond and 0 debt repayment', () => {
    const projections = generateLongTermProjection({
      purchasePrice: 1_200_000,
      depositZAR: 1_200_000, // 100% Cash
      bondTermYears: 20,
      monthlyRentalEstimate: 12_000,
    });

    expect(projections).toHaveLength(20);
    projections.forEach((snap) => {
      expect(snap.outstandingBond).toBe(0);
      expect(snap.bondPayment).toBe(0);
      expect(snap.netEquity).toBe(snap.propertyValue);
      expect(snap.netCashflow).toBe(snap.rent - snap.costs);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  generateLongTermProjection,
  generateRentalLongTermProjection,
  calculatePaydownImpact,
} from '../propertyMetrics';
import { RentalProperty } from '@/types';

describe('Phase C: Extra Monthly Payment Amortization & SARS Section 11(a) Tax Integrity', () => {
  const baseParams = {
    purchasePrice: 1_000_000,
    openMarketValueZAR: 1_000_000,
    depositZAR: 100_000,
    bondLTV: 90,
    loanToValuePercent: 90,
    interestRatePercent: 11.75,
    loanTermYears: 20,
    bondTermYears: 20,
    annualCapitalGrowthPercent: 5.0,
    annualRentalEscalationPercent: 6.0,
    annualExpenseInflationPercent: 6.0,
    monthlyRentalEstimate: 10_000,
    monthlyLevies: 1_200,
    monthlyRatesTaxes: 800,
    annualInsurance: 6_000,
    managementFeePercent: 8,
    agencyVatApplicable: true,
    vacancyRatePercent: 5,
  };

  it('guarantees zero regression when extraMonthlyPaymentZAR is undefined or 0', () => {
    const projectionDefault = generateLongTermProjection(baseParams);
    const projectionZero = generateLongTermProjection({
      ...baseParams,
      extraMonthlyPaymentZAR: 0,
    });

    expect(projectionDefault.length).toBe(20);
    expect(projectionZero.length).toBe(20);

    for (let i = 0; i < 20; i++) {
      expect(projectionZero[i].propertyValue).toBe(projectionDefault[i].propertyValue);
      expect(projectionZero[i].outstandingBond).toBe(projectionDefault[i].outstandingBond);
      expect(projectionZero[i].rent).toBe(projectionDefault[i].rent);
      expect(projectionZero[i].costs).toBe(projectionDefault[i].costs);
      expect(projectionZero[i].netCashflow).toBe(projectionDefault[i].netCashflow);
      expect(projectionZero[i].netEquity).toBe(projectionDefault[i].netEquity);
    }
  });

  it('enforces SARS Section 11(a) tax deduction integrity: operating costs MUST NOT include extra capital paydown', () => {
    const baseline = generateLongTermProjection(baseParams);
    const accelerated = generateLongTermProjection({
      ...baseParams,
      extraMonthlyPaymentZAR: 2_500,
    });

    // Tax deduction rule: extra principal paydown is a balance-sheet capital transaction,
    // not an allowable operating expense under SARS s11(a).
    // Operating costs across all 20 years must match the baseline identically.
    for (let yearIdx = 0; yearIdx < 20; yearIdx++) {
      expect(accelerated[yearIdx].costs).toBe(baseline[yearIdx].costs);
    }
  });

  it('accelerates bond amortization, reduces interest paid, and frees cashflow earlier', () => {
    const baseline = generateLongTermProjection(baseParams);
    const accelerated = generateLongTermProjection({
      ...baseParams,
      extraMonthlyPaymentZAR: 3_000,
    });

    // In early years, bond balance must be strictly lower
    expect(accelerated[0].outstandingBond).toBeLessThan(baseline[0].outstandingBond);
    expect(accelerated[4].outstandingBond).toBeLessThan(baseline[4].outstandingBond);

    // Baseline 20-year bond still has a balance around Year 10-15
    expect(baseline[10].outstandingBond).toBeGreaterThan(0);

    // Check that accelerated bond pays off years before the baseline
    const baselinePayoffYear = baseline.findIndex((y) => y.outstandingBond === 0);
    const acceleratedPayoffYear = accelerated.findIndex((y) => y.outstandingBond === 0);

    expect(acceleratedPayoffYear).toBeGreaterThan(0);
    expect(acceleratedPayoffYear).toBeLessThan(baselinePayoffYear === -1 ? 20 : baselinePayoffYear);

    // In year 1, extra principal is paid
    expect(accelerated[0].extraPrincipalPaid).toBe(36_000); // 3000 * 12
    expect(accelerated[0].interestPaid).toBeLessThan(baseline[0].interestPaid || Infinity);

    // After the accelerated bond is fully amortized, net cashflow jumps because bond payments are R0
    const postPayoffYear = accelerated[acceleratedPayoffYear + 1];
    const baselineSameYear = baseline[acceleratedPayoffYear + 1];
    expect(postPayoffYear.netCashflow).toBeGreaterThan(baselineSameYear.netCashflow);
  });

  it('works with RentalProperty via generateRentalLongTermProjection', () => {
    const mockRental: RentalProperty = {
      id: 'rental-test-1',
      title: 'Durban Beachfront Apt',
      address: '10 Marine Parade',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      status: 'Occupied',
      propertyType: 'Sectional Title Apartment',
      marketValueZAR: 1_200_000,
      purchasePriceZAR: 1_100_000,
      outstandingBondBalanceZAR: 900_000,
      monthlyGrossRentZAR: 11_000,
      monthlyLeviesZAR: 1_500,
      monthlyRatesTaxesZAR: 900,
      monthlyBondPaymentZAR: 9_763,
      extraMonthlyPaymentZAR: 2_000,
      leases: [],
      managementType: 'Self-Managed',
      agencyCommissionPercent: 0,
      agencyVatApplicable: false,
      purchaseDate: '2024-01-01',
      bondInterestRatePercent: 11.75,
      monthlyAgentFeeZAR: 0,
      monthlyMaintenanceReserveZAR: 500,
      maintenanceHistory: [],
    };

    const projWithExtra = generateRentalLongTermProjection(mockRental);
    const projWithoutExtra = generateRentalLongTermProjection({
      ...mockRental,
      extraMonthlyPaymentZAR: undefined,
    });

    expect(projWithExtra.length).toBe(20);
    expect(projWithExtra[4].outstandingBond).toBeLessThan(projWithoutExtra[4].outstandingBond);
    expect(projWithExtra[4].costs).toBe(projWithoutExtra[4].costs);
  });

  describe('calculatePaydownImpact', () => {
    it('returns zero savings when extraMonthlyPaymentZAR is 0', () => {
      const impact = calculatePaydownImpact({
        principal: 900_000,
        annualRatePercent: 11.75,
        termYears: 20,
        extraMonthlyPaymentZAR: 0,
        startPropertyValue: 1_000_000,
        annualGrowthPercent: 5.0,
      });

      expect(impact.scheduledMonths).toBe(240);
      expect(impact.acceleratedMonths).toBe(240);
      expect(impact.monthsSaved).toBe(0);
      expect(impact.interestSaved).toBe(0);
    });

    it('computes positive months and interest saved with R1,500/m extra repayment', () => {
      const impact = calculatePaydownImpact({
        principal: 900_000,
        annualRatePercent: 11.75,
        termYears: 20,
        extraMonthlyPaymentZAR: 1_500,
        startPropertyValue: 1_000_000,
        annualGrowthPercent: 5.0,
        refinanceLtvPercent: 75,
      });

      expect(impact.scheduledMonths).toBe(240);
      expect(impact.acceleratedMonths).toBeLessThan(240);
      expect(impact.monthsSaved).toBeGreaterThan(30); // At least 2.5+ years saved
      expect(impact.interestSaved).toBeGreaterThan(200_000); // Massive interest savings
      expect(impact.interestAccelerated).toBeLessThan(impact.interestScheduled);

      // Refinance milestone check
      if (impact.refiReadyYearAccelerated !== null && impact.refiReadyYearScheduled !== null) {
        expect(impact.refiReadyYearAccelerated).toBeLessThanOrEqual(impact.refiReadyYearScheduled);
      }
    });

    it('exhibits monotonicity: higher extra payment saves strictly more months and more interest', () => {
      const smallImpact = calculatePaydownImpact({
        principal: 1_000_000,
        annualRatePercent: 11.75,
        termYears: 20,
        extraMonthlyPaymentZAR: 1_000,
        startPropertyValue: 1_200_000,
        annualGrowthPercent: 5.0,
      });

      const largeImpact = calculatePaydownImpact({
        principal: 1_000_000,
        annualRatePercent: 11.75,
        termYears: 20,
        extraMonthlyPaymentZAR: 3_000,
        startPropertyValue: 1_200_000,
        annualGrowthPercent: 5.0,
      });

      expect(largeImpact.monthsSaved).toBeGreaterThan(smallImpact.monthsSaved);
      expect(largeImpact.interestSaved).toBeGreaterThan(smallImpact.interestSaved);
      expect(largeImpact.acceleratedMonths).toBeLessThan(smallImpact.acceleratedMonths);
    });
  });
});

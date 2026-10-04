import { describe, it, expect } from 'vitest';
import { evaluateDealCriteria, calculateDealMetrics, calculateEffectiveExitCommission, calculateDealDscr } from '../propertyMetrics';
import { getSaTaxYearInfo } from '@/components/dashboard/ActualVsBudgetKpiStrip';
import { InvestorProfile } from '@/types';

describe('Phase 1 & 2: Strategy-Aware Buy Box Hurdles & DSCR Evaluation', () => {
  const mockProfile: InvestorProfile = {
    entityName: 'Apex Properties',
    registrationOrId: '2023/123456/07',
    contactNumber: '+27 82 000 0000',
    email: 'test@apex.co.za',
    bioSummary: 'Test profile',
    baselineHurdleYieldPercent: 10.0,
    minNetYieldPercent: 8.5,
    minMonthlyCashflowZAR: 2000,
    minNetRoiPercent: 9.0,
    minFlipRoiPercent: 18.0,
    maxDay1CashZAR: 400_000,
    minDscr: 1.25,
    defaultPrimeRatePercent: 10.75,
    defaultAgentCommissionPercent: 5.0,
    vatExemptAgent: false,
    marginalTaxRatePercent: 31.0,
  };

  it('evaluates Flip strategy testing strictly minFlipRoi and maxDay1Cash hurdles', () => {
    // Deal meeting both Flip criteria:
    const passingFlip = evaluateDealCriteria(
      {
        projectedFlipRoi: 22.0, // >= 18.0
        initialCapitalRequired: 350_000, // <= 400,000
      },
      mockProfile,
      'Flip'
    );

    expect(passingFlip.totalCount).toBe(2);
    expect(passingFlip.passedCount).toBe(2);
    expect(passingFlip.meetsBuyBox).toBe(true);
    expect(passingFlip.criteriaMap['minFlipRoi']).toBe(true);
    expect(passingFlip.criteriaMap['maxDay1Cash']).toBe(true);

    // Deal failing on capital required:
    const failingFlip = evaluateDealCriteria(
      {
        projectedFlipRoi: 25.0,
        initialCapitalRequired: 450_000, // exceeds 400k max
      },
      mockProfile,
      'Flip'
    );

    expect(failingFlip.passedCount).toBe(1);
    expect(failingFlip.meetsBuyBox).toBe(false);
    expect(failingFlip.criteriaMap['maxDay1Cash']).toBe(false);
  });

  it('evaluates Rental strategy across minNetYield, minMonthlyCashflow, minNetRoi, maxDay1Cash, and minDscr', () => {
    // Deal passing all 5 hurdles
    const passingRental = evaluateDealCriteria(
      {
        capRate: 9.0, // >= 8.5
        monthlyCashFlow: 2500, // >= 2000
        netRoi: 10.5, // >= 9.0
        initialCapitalRequired: 300_000, // <= 400_000
        dscr: 1.35, // >= 1.25
      },
      mockProfile,
      'Rental'
    );

    expect(passingRental.totalCount).toBe(5);
    expect(passingRental.passedCount).toBe(5);
    expect(passingRental.meetsBuyBox).toBe(true);
    expect(passingRental.criteriaMap['minDscr']).toBe(true);
    expect(passingRental.criteriaMap['minNetYield']).toBe(true);

    // Deal failing on DSCR
    const lowDscrRental = evaluateDealCriteria(
      {
        capRate: 9.0,
        monthlyCashFlow: 2500,
        netRoi: 10.5,
        initialCapitalRequired: 300_000,
        dscr: 1.15, // < 1.25 hurdle
      },
      mockProfile,
      'Rental'
    );

    expect(lowDscrRental.totalCount).toBe(5);
    expect(lowDscrRental.passedCount).toBe(4);
    expect(lowDscrRental.meetsBuyBox).toBe(false);
    expect(lowDscrRental.criteriaMap['minDscr']).toBe(false);
  });

  it('correctly applies 1.15x VAT multiplier to exit commission unless vatExemptAgent is true', () => {
    // Standard agent (VAT applicable): 5% * 1.15 = 5.75%
    expect(calculateEffectiveExitCommission(5.0, false)).toBe(5.75);

    // VAT-exempt agent: 5% * 1.0 = 5.0%
    expect(calculateEffectiveExitCommission(5.0, true)).toBe(5.0);
  });

  it('computes correct DSCR within calculateDealMetrics', () => {
    const metrics = calculateDealMetrics({
      purchasePrice: 1_000_000,
      estimatedRehabCost: 0,
      monthlyRentalEstimate: 12_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 0,
      managementFeePercent: 8.0,
      agencyVatApplicable: true, // 12,000 * 8% * 1.15 = 1,104
      vacancyRatePercent: 5.0, // 600
      targetExitPrice: 1_200_000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      depositZAR: 200_000,
      bondLTV: 80,
      interestRatePercent: 11.5,
      loanTermYears: 20,
      costs: {
        purchasePrice: 1_000_000,
        transferDuty: 0,
        conveyancingFee: 25_000,
        deedsOfficeFee: 1_500,
        bondRegistrationFee: 25_000,
        ficaSundries: 7_500,
        totalAcquisitionCost: 1_059_000,
      },
      monthlyMaintenanceReserveZAR: 500,
      monthlyPrepaidVendingFeeZAR: 100,
    });

    // NOI = (12,000 - 600) - (1,000 + 800 + 1,104 + 0 + 500 + 100) = 11,400 - 3,504 = 7,896
    // Bond amount = 800,000 @ 11.5% 20yr = R8,521
    // DSCR = 7,896 / 8,521 = 0.93
    expect(metrics.dscr).toBeCloseTo(0.93, 2);
    expect(metrics.bondAmount).toBe(800_000);
  });

  it('fails maxDay1Cash hurdle when initialCapitalRequired is undefined/missing', () => {
    const missingCashFlip = evaluateDealCriteria(
      {
        projectedFlipRoi: 25.0,
        // initialCapitalRequired omitted
      },
      mockProfile,
      'Flip'
    );
    expect(missingCashFlip.criteriaMap['maxDay1Cash']).toBe(false);
    expect(missingCashFlip.meetsBuyBox).toBe(false);

    const missingCashRental = evaluateDealCriteria(
      {
        capRate: 9.0,
        monthlyCashFlow: 2500,
        netRoi: 10.5,
        dscr: 1.35,
        // initialCapitalRequired omitted
      },
      mockProfile,
      'Rental'
    );
    expect(missingCashRental.criteriaMap['maxDay1Cash']).toBe(false);
    expect(missingCashRental.meetsBuyBox).toBe(false);
  });

  it('unifies DSCR across calculateDealDscr and calculateDealMetrics without rounding discrepancies', () => {
    const dealParams = {
      purchasePrice: 1_000_000,
      monthlyRentalEstimate: 12_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 800,
      annualInsurance: 0,
      managementFeePercent: 8.0,
      agencyVatApplicable: true,
      vacancyRatePercent: 5.0,
      monthlyMaintenanceReserveZAR: 500,
      monthlyPrepaidVendingFeeZAR: 100,
      loanToValuePercent: 80,
      depositZAR: 200_000,
      bondLTV: 80,
      interestRatePercent: 11.5,
      loanTermYears: 20,
    };

    const dscrResult = calculateDealDscr(dealParams, 11.5);
    expect(dscrResult.dscr).toBe(0.93);
    expect(dscrResult.monthlyBondPayment).toBe(8_531);
    expect(dscrResult.monthlyNoi).toBe(7_896);

    // If maintenance reserve is explicitly 0, it should not default to 800
    const zeroMaintResult = calculateDealDscr({
      ...dealParams,
      monthlyMaintenanceReserveZAR: 0,
    }, 11.5);
    expect(zeroMaintResult.monthlyNoi).toBe(7_896 + 500);
  });

  it('computes flip holding bond interest as interest-only and includes holding cash in flip ROI denominator', () => {
    // Purchase: 1,000,000, Bond: 800,000 @ 12% (1% / mo = 8,000 / mo interest), Deposit: 200,000
    // Levies & Rates: 1,000 + 1,000 = 2,000 / mo
    // Holding: 6 months -> Bond interest = 48,000, Levies/Rates = 12,000 -> Total holding = 60,000
    // Day-1 cash = Deposit (200k) + acq fees (50k) + rehab (100k) = 350,000
    // Total cash invested = 350,000 + 60,000 = 410,000
    const metrics = calculateDealMetrics({
      purchasePrice: 1_000_000,
      estimatedRehabCost: 100_000,
      monthlyRentalEstimate: 10_000,
      monthlyLevies: 1_000,
      monthlyRatesTaxes: 1_000,
      annualInsurance: 0,
      managementFeePercent: 8.0,
      agencyVatApplicable: true,
      vacancyRatePercent: 5.0,
      targetExitPrice: 1_500_000,
      holdingPeriodMonths: 6,
      loanToValuePercent: 80,
      depositZAR: 200_000,
      bondLTV: 80,
      interestRatePercent: 12.0,
      loanTermYears: 20,
      costs: {
        purchasePrice: 1_000_000,
        transferDuty: 0,
        conveyancingFee: 25_000,
        deedsOfficeFee: 0,
        bondRegistrationFee: 25_000,
        ficaSundries: 0,
        totalAcquisitionCost: 1_050_000,
      },
      exitCommissionPercent: 5.0,
    });

    // Exit commission = 1,500,000 * 5% = 75,000
    // Total costs = 1,050,000 (acq) + 100,000 (rehab) + 60,000 (holding) + 75,000 (exit comm) = 1,285,000
    // Net profit = 1,500,000 - 1,285,000 = 215,000
    expect(metrics.projectedFlipNetProfit).toBe(215_000);
    // Flip ROI = (215,000 / 410,000) * 100 = 52.44%
    expect(metrics.projectedFlipRoi).toBeCloseTo(52.44, 1);
  });
});

describe('Phase 3: SA Tax Year Calendar Alignment (1 March – 28/29 February)', () => {
  it('correctly calculates tax year start, end, and elapsed months for dates in current tax year', () => {
    // Case A: October 2026 (Month 8 of tax year 2026/27)
    const octDate = new Date(2026, 9, 15); // Month index 9 = October
    const octTaxYear = getSaTaxYearInfo(octDate);

    expect(octTaxYear.startYear).toBe(2026);
    expect(octTaxYear.endYear).toBe(2027);
    expect(octTaxYear.startDateStr).toBe('2026-03-01');
    expect(octTaxYear.endDateStr).toBe('2027-02-28');
    expect(octTaxYear.elapsedMonths).toBe(8); // March to October = 8 months

    // Case B: January 2027 (Month 11 of tax year 2026/27)
    const janDate = new Date(2027, 0, 10); // Month index 0 = January
    const janTaxYear = getSaTaxYearInfo(janDate);

    expect(janTaxYear.startYear).toBe(2026);
    expect(janTaxYear.endYear).toBe(2027);
    expect(janTaxYear.startDateStr).toBe('2026-03-01');
    expect(janTaxYear.endDateStr).toBe('2027-02-28');
    expect(janTaxYear.elapsedMonths).toBe(11);

    // Case C: Leap year 2028 (Ends 29 Feb 2028)
    const febLeapDate = new Date(2028, 1, 15); // Month index 1 = Feb 2028
    const leapTaxYear = getSaTaxYearInfo(febLeapDate);

    expect(leapTaxYear.startYear).toBe(2027);
    expect(leapTaxYear.endYear).toBe(2028);
    expect(leapTaxYear.endDateStr).toBe('2028-02-29');
    expect(leapTaxYear.elapsedMonths).toBe(12);
  });
});

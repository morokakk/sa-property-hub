import { describe, it, expect } from 'vitest';
import {
  calculateDelaySensitivityMatrix,
  calculateZeroMarginDelayDays,
} from '../holdingSensitivity';

describe('Holding Delay Sensitivity & Carrying Burn Engine', () => {
  const baseInput = {
    baselineDurationMonths: 6,
    monthlyHoldingBurnZAR: 15_000, // Rates, security, insurance
    syndicateDebtBalanceZAR: 1_200_000, // R1.2m private syndicate debt
    syndicateInterestRatePercent: 14.0, // 14% p.a.
    targetExitPriceZAR: 3_800_000,
    totalCostBasisZAR: 2_600_000, // Purchase + transfer + BOQ spend
    taxRatePercent: 0, // Pre-tax baseline
  };

  it('calculates monthly debt interest and daily delay carrying burn accurately', () => {
    const result = calculateDelaySensitivityMatrix(baseInput);

    // Monthly debt interest = R1,200,000 * 0.14 / 12 = R14,000/month
    expect(result.monthlyDebtInterestZAR).toBe(14_000);
    // Total monthly delay burn = R15,000 (holding) + R14,000 (debt) = R29,000/month
    expect(result.totalMonthlyDelayBurnZAR).toBe(29_000);
    // Daily delay burn = R29,000 / 30 = ~R967/day
    expect(result.dailyDelayBurnZAR).toBe(967);
  });

  it('evaluates baseline (0 days) net profit and annualized ROI correctly', () => {
    const result = calculateDelaySensitivityMatrix(baseInput);

    // Baseline 6-month holding = 6 * 15,000 = 90,000
    // Baseline 6-month debt interest = 6 * 14,000 = 84,000
    // Total all-in cost = 2,600,000 + 90,000 + 84,000 = 2,774,000
    // Net profit = 3,800,000 - 2,774,000 = 1,026,000
    // Cash-on-cash ROI = (1,026,000 / 2,774,000) * 100 = ~36.986%
    // Annualized ROI = 36.986% * (12 / 6) = ~73.97%
    expect(result.baselineNetProfitZAR).toBe(1_026_000);
    expect(result.baselineRoiPercent).toBeCloseTo(36.986, 2);
    expect(result.baselineAnnualizedRoiPercent).toBeCloseTo(73.97, 1);
  });

  it('compounds carrying burn and compresses annualized ROI across +30, +60, +90, +120 days', () => {
    const result = calculateDelaySensitivityMatrix(baseInput);
    const scenarios = result.scenarios;

    expect(scenarios).toHaveLength(5);

    // Scenario 0: Baseline
    expect(scenarios[0].delayDays).toBe(0);
    expect(scenarios[0].totalAdditionalCarryingCostZAR).toBe(0);
    expect(scenarios[0].netProfitAfterTaxZAR).toBe(1_026_000);

    // Scenario 1: +30 Days (+1 month)
    // Additional burn = R29,000 (15k holding + 14k debt)
    expect(scenarios[1].delayDays).toBe(30);
    expect(scenarios[1].totalDurationMonths).toBe(7);
    expect(scenarios[1].additionalHoldingBurnZAR).toBe(15_000);
    expect(scenarios[1].additionalDebtInterestZAR).toBe(14_000);
    expect(scenarios[1].totalAdditionalCarryingCostZAR).toBe(29_000);
    expect(scenarios[1].netProfitAfterTaxZAR).toBe(1_026_000 - 29_000);
    expect(scenarios[1].annualizedRoiPercent).toBeLessThan(scenarios[0].annualizedRoiPercent);
    // Cash-on-cash ROI compresses by ~1.42% (from ~36.99% to ~35.57%)
    expect(scenarios[1].roiCompressionPercent).toBeCloseTo(1.42, 1);
    // Annualized ROI compresses by ~13.0% (from ~73.97% to ~60.98%) due to +1 month duration extension
    expect(scenarios[1].annualizedRoiCompressionPercent).toBeCloseTo(13.0, 1);

    // Scenario 3: +90 Days (CoJ billing dispute delay)
    // Additional burn = 3 months * 29,000 = 87,000
    expect(scenarios[3].delayDays).toBe(90);
    expect(scenarios[3].totalDurationMonths).toBe(9);
    expect(scenarios[3].totalAdditionalCarryingCostZAR).toBe(87_000);
    expect(scenarios[3].netProfitAfterTaxZAR).toBe(1_026_000 - 87_000);

    // Scenario 4: +120 Days
    // Additional burn = 4 months * 29,000 = 116,000
    expect(scenarios[4].delayDays).toBe(120);
    expect(scenarios[4].totalDurationMonths).toBe(10);
    expect(scenarios[4].totalAdditionalCarryingCostZAR).toBe(116_000);
    expect(scenarios[4].netProfitAfterTaxZAR).toBe(1_026_000 - 116_000);
  });

  it('incorporates Section 118 municipal arrears and advance deposits into cost basis', () => {
    const inputWithSec118 = {
      ...baseInput,
      sec118ArrearsZAR: 45_000, // 2-year arrears owed to City of Johannesburg
      advanceCouncilDepositZAR: 24_000, // 4 months advance rates deposit
    };

    const result = calculateDelaySensitivityMatrix(inputWithSec118);
    // Extra outlays = 45k + 24k = 69,000
    // Net profit reduced by 69,000 from 1,026,000 -> 957,000
    expect(result.baselineNetProfitZAR).toBe(1_026_000 - 69_000);
    expect(result.scenarios[0].totalAllInCostZAR).toBe(2_774_000 + 69_000);
  });

  it('applies 27% South African Corporate Tax to trading margins', () => {
    const inputWithTax = {
      ...baseInput,
      taxRatePercent: 27, // 27% Company Tax under Sec 1 trading stock
    };

    const result = calculateDelaySensitivityMatrix(inputWithTax);
    // Gross margin pre-tax = 1,026,000
    // Tax @ 27% = 1,026,000 * 0.27 = 277,020
    // Net cash after tax = 1,026,000 - 277,020 = 748,980
    expect(result.scenarios[0].grossMarginPreTaxZAR).toBe(1_026_000);
    expect(result.scenarios[0].estimatedTaxZAR).toBe(277_020);
    expect(result.scenarios[0].netProfitAfterTaxZAR).toBe(748_980);
    expect(result.baselineNetProfitZAR).toBe(748_980);
  });

  it('calculates the zero-margin delay threshold accurately', () => {
    // Net profit = 1,026,000
    // Monthly burn = 29,000
    // Months to wipe out profit = 1,026,000 / 29,000 = ~35.379 months
    // Days = ~1,061 days
    const zeroDays = calculateZeroMarginDelayDays(1_026_000, 29_000);
    expect(zeroDays).toBe(1_061);

    // Fast-burning deal with razor-thin margin:
    // Profit = 60,000, Burn = 30,000/month -> 60 days
    expect(calculateZeroMarginDelayDays(60_000, 30_000)).toBe(60);

    // When profit is already negative or zero
    expect(calculateZeroMarginDelayDays(0, 30_000)).toBe(0);
    expect(calculateZeroMarginDelayDays(-50_000, 30_000)).toBe(0);

    // When monthly burn is zero
    expect(calculateZeroMarginDelayDays(100_000, 0)).toBe(9999);
  });
});

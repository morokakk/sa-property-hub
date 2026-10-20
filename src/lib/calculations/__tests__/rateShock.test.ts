import { describe, it, expect } from 'vitest';
import {
  calculateRateShockScenarios,
  calculateMonthlyBondRepayment,
  calculateDealMetrics,
} from '../propertyMetrics';

describe('calculateRateShockScenarios', () => {
  const baseParams = {
    monthlyNoi: 18_000,
    bondAmount: 1_200_000,
    baseRatePercent: 11.5,
    loanTermYears: 20,
    minDscr: 1.25,
  };

  it('generates 3 scenarios: Current, +100 bps, and +200 bps', () => {
    const scenarios = calculateRateShockScenarios(baseParams);

    expect(scenarios).toHaveLength(3);
    expect(scenarios[0].label).toBe('Current');
    expect(scenarios[0].shockBps).toBe(0);
    expect(scenarios[0].ratePercent).toBe(11.5);

    expect(scenarios[1].label).toBe('+100 bps');
    expect(scenarios[1].shockBps).toBe(100);
    expect(scenarios[1].ratePercent).toBe(12.5);

    expect(scenarios[2].label).toBe('+200 bps');
    expect(scenarios[2].shockBps).toBe(200);
    expect(scenarios[2].ratePercent).toBe(13.5);
  });

  it('reproduces exact monthly bond repayment matching calculateMonthlyBondRepayment', () => {
    const scenarios = calculateRateShockScenarios(baseParams);

    const expectedCurrentBond = calculateMonthlyBondRepayment(1_200_000, 11.5, 20);
    const expectedP100Bond = calculateMonthlyBondRepayment(1_200_000, 12.5, 20);
    const expectedP200Bond = calculateMonthlyBondRepayment(1_200_000, 13.5, 20);

    expect(scenarios[0].monthlyBondPayment).toBe(expectedCurrentBond);
    expect(scenarios[1].monthlyBondPayment).toBe(expectedP100Bond);
    expect(scenarios[2].monthlyBondPayment).toBe(expectedP200Bond);
  });

  it('reflects monotonically increasing debt payments and decreasing cash flows', () => {
    const scenarios = calculateRateShockScenarios(baseParams);

    expect(scenarios[1].monthlyBondPayment).toBeGreaterThan(scenarios[0].monthlyBondPayment);
    expect(scenarios[2].monthlyBondPayment).toBeGreaterThan(scenarios[1].monthlyBondPayment);

    expect(scenarios[0].monthlyCashFlow).toBe(18_000 - scenarios[0].monthlyBondPayment);
    expect(scenarios[1].monthlyCashFlow).toBe(18_000 - scenarios[1].monthlyBondPayment);
    expect(scenarios[2].monthlyCashFlow).toBe(18_000 - scenarios[2].monthlyBondPayment);

    expect(scenarios[0].monthlyCashFlow).toBeGreaterThan(scenarios[1].monthlyCashFlow);
    expect(scenarios[1].monthlyCashFlow).toBeGreaterThan(scenarios[2].monthlyCashFlow);
  });

  it('evaluates DSCR hurdle bands correctly (pass, watch, fail)', () => {
    // Bond payments at 1.2m:
    // 11.5%: ~12,797 -> DSCR = 18000 / 12797 = 1.41 (pass, >= 1.25)
    // If NOI is exactly equal to 1.25 * bond: pass
    // If NOI is between bond and 1.25 * bond: watch
    // If NOI is < bond: fail
    const pmt = calculateMonthlyBondRepayment(1_000_000, 11.0, 20); // ~10,322

    // 1. Pass scenario: NOI is 1.3x bond
    const passResult = calculateRateShockScenarios({
      monthlyNoi: Math.round(pmt * 1.3),
      bondAmount: 1_000_000,
      baseRatePercent: 11.0,
      loanTermYears: 20,
      minDscr: 1.25,
      shocksBps: [0],
    });
    expect(passResult[0].band).toBe('pass');
    expect(passResult[0].dscr).toBeGreaterThanOrEqual(1.25);

    // 2. Watch scenario: NOI is 1.1x bond (above 1.0 but below 1.25 hurdle)
    const watchResult = calculateRateShockScenarios({
      monthlyNoi: Math.round(pmt * 1.1),
      bondAmount: 1_000_000,
      baseRatePercent: 11.0,
      loanTermYears: 20,
      minDscr: 1.25,
      shocksBps: [0],
    });
    expect(watchResult[0].band).toBe('watch');

    // 3. Fail scenario: NOI is 0.9x bond (deficit)
    const failResult = calculateRateShockScenarios({
      monthlyNoi: Math.round(pmt * 0.9),
      bondAmount: 1_000_000,
      baseRatePercent: 11.0,
      loanTermYears: 20,
      minDscr: 1.25,
      shocksBps: [0],
    });
    expect(failResult[0].band).toBe('fail');
    expect(failResult[0].monthlyCashFlow).toBeLessThan(0);
  });

  it('assigns cash band when bondAmount is 0', () => {
    const cashScenarios = calculateRateShockScenarios({
      monthlyNoi: 15_000,
      bondAmount: 0,
      baseRatePercent: 11.75,
      loanTermYears: 20,
    });

    expect(cashScenarios[0].band).toBe('cash');
    expect(cashScenarios[0].dscr).toBeNull();
    expect(cashScenarios[0].monthlyBondPayment).toBe(0);
    expect(cashScenarios[0].monthlyCashFlow).toBe(15_000);
  });
});

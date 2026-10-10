import { describe, it, expect } from 'vitest';
import {
  calculateTenantVetting,
  calculateRecommendedDeposit,
} from '../vettingEngine';
import { TenantVettingScorecardInputs } from '@/types';

describe('calculateTenantVetting Engine', () => {
  const baseInputs: TenantVettingScorecardInputs = {
    assessmentDate: '2026-10-10',
    popiaConsentRecorded: true,
    bureauCreditScore: 750,
    verifiedNetMonthlyIncomeZAR: 30000,
    monthlyCpaDebtCommitmentsZAR: 3000,
    hasOpenJudgmentsOrDefaults: false,
    unpaidDebitOrderCount: 0,
  };

  it('evaluates a perfect Grade A applicant reaching 100 points', () => {
    // Score: 750 (>=730 -> 35 pts)
    // Rent: 7000 / 30000 = 23.3% (<=28% -> 25 pts)
    // Total DTI: (7000 + 3000) / 30000 = 33.3% (<=45% -> 20 pts)
    // Clean history -> 10 pts
    // 0 unpaid debits -> 10 pts
    // Total = 35 + 25 + 20 + 10 + 10 = 100 pts
    const result = calculateTenantVetting(7000, baseInputs);

    expect(result.compositeScore).toBe(100);
    expect(result.creditScorePoints).toBe(35);
    expect(result.rentToIncomePoints).toBe(25);
    expect(result.debtToIncomePoints).toBe(20);
    expect(result.adverseHistoryPoints).toBe(10);
    expect(result.bankingStabilityPoints).toBe(10);
    expect(result.riskGrade).toBe('Grade A (Low Risk)');
    expect(result.recommendedDepositMultiplier).toBe(1.0);
    expect(result.isHardFailure).toBe(false);
  });

  it('evaluates exact lower bound of Grade B (70 points, 1.5x deposit)', () => {
    // Score: 680 (650-729 -> 20 pts)
    // Rent: 9000 / 30000 = 30.0% (29-33% -> 18 pts)
    // Total DTI: (9000 + 6000) / 30000 = 50.0% (46-55% -> 12 pts)
    // Clean history -> 10 pts
    // 0 unpaid debits -> 10 pts
    // Total = 20 + 18 + 12 + 10 + 10 = 70 pts
    const inputs: TenantVettingScorecardInputs = {
      ...baseInputs,
      bureauCreditScore: 680,
      monthlyCpaDebtCommitmentsZAR: 6000,
    };
    const result = calculateTenantVetting(9000, inputs);

    expect(result.compositeScore).toBe(70);
    expect(result.riskGrade).toBe('Grade B (Moderate Risk)');
    expect(result.recommendedDepositMultiplier).toBe(1.5);
  });

  it('evaluates exact lower bound of Grade C (55 points, 2.0x deposit)', () => {
    // Score: 660 (650-729 -> 20 pts)
    // Rent: 10500 / 30000 = 35.0% (34-39% -> 8 pts)
    // Total DTI: (10500 + 5000) / 30000 = 51.7% (46-55% -> 12 pts)
    // Clean history -> 10 pts
    // 1 unpaid debit -> 5 pts
    // Total = 20 + 8 + 12 + 10 + 5 = 55 pts
    const inputs: TenantVettingScorecardInputs = {
      ...baseInputs,
      bureauCreditScore: 660,
      monthlyCpaDebtCommitmentsZAR: 5000,
      unpaidDebitOrderCount: 1,
    };
    const result = calculateTenantVetting(10500, inputs);

    expect(result.compositeScore).toBe(55);
    expect(result.riskGrade).toBe('Grade C (High Risk)');
    expect(result.recommendedDepositMultiplier).toBe(2.0);
  });

  it('triggers immediate Grade D hard failure when active judgments exist regardless of credit score', () => {
    const inputs: TenantVettingScorecardInputs = {
      ...baseInputs,
      bureauCreditScore: 820,
      hasOpenJudgmentsOrDefaults: true,
    };
    const result = calculateTenantVetting(7000, inputs);

    expect(result.isHardFailure).toBe(true);
    expect(result.compositeScore).toBe(0);
    expect(result.riskGrade).toBe('Grade D (Decline)');
    expect(result.recommendedDepositMultiplier).toBe(0);
    expect(result.hardFailureReasons).toContain(
      'Active civil judgments or adverse defaults recorded on credit bureau'
    );
  });

  it('triggers immediate Grade D hard failure when bureau score is non-zero below 500', () => {
    const inputs: TenantVettingScorecardInputs = {
      ...baseInputs,
      bureauCreditScore: 480,
    };
    const result = calculateTenantVetting(7000, inputs);

    expect(result.isHardFailure).toBe(true);
    expect(result.compositeScore).toBe(0);
    expect(result.riskGrade).toBe('Grade D (Decline)');
    expect(result.recommendedDepositMultiplier).toBe(0);
    expect(result.hardFailureReasons?.[0]).toContain('below critical underwriting floor of 500');
  });

  describe('Critical Refinements & Edge Cases', () => {
    it('Refinement 1: Division-by-Zero Safety awards 0 points for zero or negative income', () => {
      const inputs: TenantVettingScorecardInputs = {
        ...baseInputs,
        verifiedNetMonthlyIncomeZAR: 0,
        monthlyCpaDebtCommitmentsZAR: 5000,
      };
      const result = calculateTenantVetting(8000, inputs);

      expect(result.rentToIncomePercent).toBe(100);
      expect(result.totalDebtToIncomePercent).toBe(100);
      expect(result.rentToIncomePoints).toBe(0);
      expect(result.debtToIncomePoints).toBe(0);
      // Ensure zero-income applicant does NOT get free 45 points
      expect(result.compositeScore).toBe(35 + 0 + 0 + 10 + 10); // 55 pts
    });

    it('Refinement 2: Initial State / Form Initialization does NOT trigger hard failure when score is 0', () => {
      const emptyInputs: TenantVettingScorecardInputs = {
        assessmentDate: '2026-10-10',
        popiaConsentRecorded: true,
        bureauCreditScore: 0,
        verifiedNetMonthlyIncomeZAR: 0,
        monthlyCpaDebtCommitmentsZAR: 0,
        hasOpenJudgmentsOrDefaults: false,
        unpaidDebitOrderCount: 0,
      };
      const result = calculateTenantVetting(8000, emptyInputs);

      expect(result.isPendingInputs).toBe(true);
      expect(result.isHardFailure).toBe(false);
      expect(result.hardFailureReasons).toBeUndefined();
    });

    it('Refinement 3: calculateRecommendedDeposit rounds half-cents on 1.5x multipliers', () => {
      // R 7,775 * 1.5 = 11,662.5 -> rounds to 11,663
      expect(calculateRecommendedDeposit(7775, 1.5)).toBe(11663);

      // R 11,325 * 1.5 = 16,987.5 -> rounds to 16,988
      expect(calculateRecommendedDeposit(11325, 1.5)).toBe(16988);

      // 1.0x on R 15,000 -> 15,000
      expect(calculateRecommendedDeposit(15000, 1.0)).toBe(15000);

      // 2.0x on R 12,000 -> 24,000
      expect(calculateRecommendedDeposit(12000, 2.0)).toBe(24000);

      // 0x multiplier -> 0
      expect(calculateRecommendedDeposit(15000, 0)).toBe(0);
    });

    it('evaluates banking stability penalty steps (0 debits = 10pts, 1-2 = 5pts, >2 = 0pts)', () => {
      const getDebitsResult = (count: number) =>
        calculateTenantVetting(7000, { ...baseInputs, unpaidDebitOrderCount: count });

      expect(getDebitsResult(0).bankingStabilityPoints).toBe(10);
      expect(getDebitsResult(1).bankingStabilityPoints).toBe(5);
      expect(getDebitsResult(2).bankingStabilityPoints).toBe(5);
      expect(getDebitsResult(3).bankingStabilityPoints).toBe(0);
      expect(getDebitsResult(5).bankingStabilityPoints).toBe(0);
    });

    it('evaluates high DTI penalty (>65% DTI awards 0 points)', () => {
      const inputs: TenantVettingScorecardInputs = {
        ...baseInputs,
        monthlyCpaDebtCommitmentsZAR: 15000, // (7000 + 15000) / 30000 = 73.3% > 65%
      };
      const result = calculateTenantVetting(7000, inputs);
      expect(result.totalDebtToIncomePercent).toBe(73.3);
      expect(result.debtToIncomePoints).toBe(0);
    });
  });
});

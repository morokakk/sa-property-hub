import {
  TenantRiskGrade,
  DepositMultiplier,
  TenantVettingScorecardInputs,
  TenantVettingScorecardOutputs,
} from '@/types';

/**
 * Pure deterministic calculation engine for pre-lease tenant vetting under South African
 * National Credit Act (NCA) guidelines and Prevention of Illegal Eviction (PIE) Act risk parameters.
 *
 * Point Distribution (100 Points Total):
 * - Credit Bureau Score: 35 pts (>=730: 35; 650-729: 20; 600-649: 10; <600: 0)
 * - Rent-to-Net-Income: 25 pts (<=28%: 25; 29-33%: 18; 34-39%: 8; >=40%: 0)
 * - Total Debt-to-Income: 20 pts (<=45%: 20; 46-55%: 12; 56-65%: 5; >65%: 0)
 * - Adverse Legal History: 10 pts (Clean: 10; Judgments/Defaults: 0)
 * - Banking Stability: 10 pts (0 unpaid debits: 10; 1-2 unpaid debits: 5; >2: 0)
 *
 * Hard Failure Gate:
 * If active judgments exist or bureau score is non-zero below 500, immediately bypass scoring,
 * return 0 points, assign Grade D (Decline), and set recommended deposit multiplier to 0.
 */
export function calculateTenantVetting(
  monthlyRentZAR: number,
  inputs: TenantVettingScorecardInputs
): TenantVettingScorecardOutputs {
  const rent = Math.max(0, monthlyRentZAR || 0);
  const netIncome = Math.max(0, inputs.verifiedNetMonthlyIncomeZAR || 0);
  const cpaDebt = Math.max(0, inputs.monthlyCpaDebtCommitmentsZAR || 0);
  const score = Math.max(0, inputs.bureauCreditScore || 0);
  const unpaidDebits = Math.max(0, inputs.unpaidDebitOrderCount || 0);

  // Initial State / Form Initialization Guard:
  // If bureau score is 0 and income is 0, inputs are pending rather than a verified applicant failure.
  const isPendingInputs = score === 0 && netIncome === 0;

  // Division-by-Zero Safety (No Free Points):
  // If net income is 0 or negative, ratios evaluate to 100% (max burden) and award 0 points.
  let rentToIncomePercent = 100;
  let totalDebtToIncomePercent = 100;
  let rentToIncomePoints = 0;
  let debtToIncomePoints = 0;

  if (netIncome > 0) {
    rentToIncomePercent = Number(((rent / netIncome) * 100).toFixed(1));
    totalDebtToIncomePercent = Number((((rent + cpaDebt) / netIncome) * 100).toFixed(1));

    // Rent-to-Income Scoring (25 pts)
    if (rentToIncomePercent <= 28) {
      rentToIncomePoints = 25;
    } else if (rentToIncomePercent <= 33) {
      rentToIncomePoints = 18;
    } else if (rentToIncomePercent <= 39) {
      rentToIncomePoints = 8;
    } else {
      rentToIncomePoints = 0;
    }

    // Total Debt-to-Income Scoring (20 pts)
    if (totalDebtToIncomePercent <= 45) {
      debtToIncomePoints = 20;
    } else if (totalDebtToIncomePercent <= 55) {
      debtToIncomePoints = 12;
    } else if (totalDebtToIncomePercent <= 65) {
      debtToIncomePoints = 5;
    } else {
      debtToIncomePoints = 0;
    }
  }

  // Hard Failure Gate (Only trigger bureau score < 500 when a non-zero score is entered)
  const hardFailureReasons: string[] = [];
  if (inputs.hasOpenJudgmentsOrDefaults) {
    hardFailureReasons.push('Active civil judgments or adverse defaults recorded on credit bureau');
  }
  if (score > 0 && score < 500) {
    hardFailureReasons.push(`Bureau credit score (${score}) is below critical underwriting floor of 500`);
  }

  if (hardFailureReasons.length > 0) {
    return {
      rentToIncomePercent,
      totalDebtToIncomePercent,
      creditScorePoints: 0,
      rentToIncomePoints: 0,
      debtToIncomePoints: 0,
      adverseHistoryPoints: 0,
      bankingStabilityPoints: 0,
      compositeScore: 0,
      riskGrade: 'Grade D (Decline)',
      recommendedDepositMultiplier: 0,
      isHardFailure: true,
      hardFailureReasons,
      isPendingInputs: false,
    };
  }

  // Bureau Credit Score Scoring (35 pts)
  let creditScorePoints = 0;
  if (score >= 730) {
    creditScorePoints = 35;
  } else if (score >= 650) {
    creditScorePoints = 20;
  } else if (score >= 600) {
    creditScorePoints = 10;
  } else {
    creditScorePoints = 0;
  }

  // Adverse Legal History Scoring (10 pts)
  const adverseHistoryPoints = !inputs.hasOpenJudgmentsOrDefaults ? 10 : 0;

  // Banking Stability Scoring (10 pts)
  let bankingStabilityPoints = 0;
  if (unpaidDebits === 0) {
    bankingStabilityPoints = 10;
  } else if (unpaidDebits <= 2) {
    bankingStabilityPoints = 5;
  } else {
    bankingStabilityPoints = 0;
  }

  // Composite Score (0..100)
  const compositeScore =
    creditScorePoints +
    rentToIncomePoints +
    debtToIncomePoints +
    adverseHistoryPoints +
    bankingStabilityPoints;

  // Grade Assignment & Deposit Multiplier
  let riskGrade: TenantRiskGrade = 'Grade D (Decline)';
  let recommendedDepositMultiplier: DepositMultiplier = 0;

  if (compositeScore >= 85) {
    riskGrade = 'Grade A (Low Risk)';
    recommendedDepositMultiplier = 1.0;
  } else if (compositeScore >= 70) {
    riskGrade = 'Grade B (Moderate Risk)';
    recommendedDepositMultiplier = 1.5;
  } else if (compositeScore >= 55) {
    riskGrade = 'Grade C (High Risk)';
    recommendedDepositMultiplier = 2.0;
  } else {
    riskGrade = 'Grade D (Decline)';
    recommendedDepositMultiplier = 0;
  }

  return {
    rentToIncomePercent,
    totalDebtToIncomePercent,
    creditScorePoints,
    rentToIncomePoints,
    debtToIncomePoints,
    adverseHistoryPoints,
    bankingStabilityPoints,
    compositeScore,
    riskGrade,
    recommendedDepositMultiplier,
    isHardFailure: false,
    isPendingInputs,
  };
}

/**
 * Calculates deposit in ZAR using clean integer rounding to avoid fractional cents on 1.5x multipliers.
 */
export function calculateRecommendedDeposit(
  monthlyRentZAR: number,
  multiplier: DepositMultiplier
): number {
  if (multiplier <= 0) return 0;
  return Math.round(Math.max(0, monthlyRentZAR) * multiplier);
}

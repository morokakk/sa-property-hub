import { AcquisitionCostBreakdown, AmenityDistance, AmenityScorecard } from '@/types';

/**
 * Computes Built-in Equity and discount percentage
 */
export function computeBuiltInEquity(openMarketValueZAR: number, purchasePriceZAR: number): {
  builtInEquityZAR: number;
  builtInEquityPercent: number;
} {
  const builtInEquityZAR = openMarketValueZAR - purchasePriceZAR;
  const builtInEquityPercent =
    openMarketValueZAR > 0 ? Number(((builtInEquityZAR / openMarketValueZAR) * 100).toFixed(1)) : 0;

  return {
    builtInEquityZAR: Math.round(builtInEquityZAR),
    builtInEquityPercent,
  };
}

/**
 * Computes Amenity Scorecard points and composite grade
 * 0-5km = 3 points, 6-10km = 2 points, 10+km = 1 point
 * Total points: 4 to 12
 * 11-12: A-Grade (Prime Hub)
 * 8-10: B-Grade (Accessible)
 * 4-7: C-Grade (Outlying)
 */
export function computeAmenityScore(distances: {
  schools: AmenityDistance;
  policeStation: AmenityDistance;
  medicalClinic: AmenityDistance;
  shoppingMall: AmenityDistance;
}): AmenityScorecard {
  const pointsMap: Record<AmenityDistance, number> = {
    '0-5km': 3,
    '6-10km': 2,
    '10+km': 1,
  };

  const schoolsPts = pointsMap[distances.schools] || 1;
  const policePts = pointsMap[distances.policeStation] || 1;
  const clinicPts = pointsMap[distances.medicalClinic] || 1;
  const mallPts = pointsMap[distances.shoppingMall] || 1;

  const compositeScore = schoolsPts + policePts + clinicPts + mallPts;

  let compositeGrade: AmenityScorecard['compositeGrade'] = 'B-Grade (Accessible)';
  if (compositeScore >= 11) {
    compositeGrade = 'A-Grade (Prime Hub)';
  } else if (compositeScore <= 7) {
    compositeGrade = 'C-Grade (Outlying)';
  }

  return {
    ...distances,
    compositeScore,
    compositeGrade,
  };
}

/**
 * Standard Mortgage / Bond Monthly Payment (PMT)
 */
export function calculateMonthlyBondRepayment(
  principal: number,
  annualInterestRate: number,
  years: number
): number {
  if (principal <= 0 || annualInterestRate <= 0 || years <= 0) return 0;
  const monthlyRate = annualInterestRate / 100 / 12;
  const totalMonths = years * 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  return Math.round((principal * (monthlyRate * factor)) / (factor - 1));
}

export interface OpportunityMetricsResult {
  grossYield: number;
  capRate: number;
  netRoi: number;
  monthlyCashFlow: number;
  annualNetOperatingIncome: number;
  totalCashRequired: number;
  monthlyBondPayment: number;
  projectedFlipNetProfit: number;
  projectedFlipRoi: number;
}

export function calculateDealMetrics(params: {
  purchasePrice: number;
  estimatedRehabCost: number;
  monthlyRentalEstimate: number;
  monthlyLevies: number;
  monthlyRatesTaxes: number;
  annualInsurance: number;
  managementFeePercent: number;
  vacancyRatePercent: number;
  targetExitPrice: number;
  holdingPeriodMonths: number;
  loanToValuePercent: number;
  interestRatePercent: number;
  loanTermYears: number;
  costs: AcquisitionCostBreakdown;
}): OpportunityMetricsResult {
  const {
    purchasePrice,
    estimatedRehabCost,
    monthlyRentalEstimate,
    monthlyLevies,
    monthlyRatesTaxes,
    annualInsurance,
    managementFeePercent,
    vacancyRatePercent,
    targetExitPrice,
    holdingPeriodMonths,
    loanToValuePercent,
    interestRatePercent,
    loanTermYears,
    costs,
  } = params;

  // Total Capital Outlay
  const totalCost = costs.totalAcquisitionCost + estimatedRehabCost;
  const bondAmount = (purchasePrice * loanToValuePercent) / 100;
  const cashDeposit = purchasePrice - bondAmount;
  const cashFees = costs.totalAcquisitionCost - purchasePrice;
  const totalCashRequired = cashDeposit + cashFees + estimatedRehabCost;

  // Monthly Bond Repayment
  const monthlyBondPayment = calculateMonthlyBondRepayment(
    bondAmount,
    interestRatePercent,
    loanTermYears
  );

  // Rental Cashflow Calculations
  const grossMonthlyRent = monthlyRentalEstimate;
  const vacancyLoss = (grossMonthlyRent * vacancyRatePercent) / 100;
  const effectiveGrossRent = grossMonthlyRent - vacancyLoss;
  const managementFee = (grossMonthlyRent * managementFeePercent) / 100;
  const monthlyInsurance = annualInsurance / 12;
  const totalMonthlyOperatingExpenses =
    monthlyLevies + monthlyRatesTaxes + managementFee + monthlyInsurance;

  const monthlyNetOperatingIncome = effectiveGrossRent - totalMonthlyOperatingExpenses;
  const annualNetOperatingIncome = monthlyNetOperatingIncome * 12;
  const monthlyCashFlow = monthlyNetOperatingIncome - monthlyBondPayment;
  const annualCashFlow = monthlyCashFlow * 12;

  // Yields
  const grossYield = totalCost > 0 ? ((grossMonthlyRent * 12) / totalCost) * 100 : 0;
  const capRate = totalCost > 0 ? (annualNetOperatingIncome / totalCost) * 100 : 0;
  const netRoi = totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;

  // Buy-and-Flip Projections
  // Assume 5% estate agent sales commission + VAT on exit price
  const exitCommission = targetExitPrice * 0.05 * 1.15;
  const holdingBondInterest = (monthlyBondPayment * holdingPeriodMonths);
  const holdingLeviesAndRates = (monthlyLevies + monthlyRatesTaxes) * holdingPeriodMonths;
  const totalHoldingCosts = holdingBondInterest + holdingLeviesAndRates;

  const totalFlipCosts =
    costs.totalAcquisitionCost +
    estimatedRehabCost +
    totalHoldingCosts +
    exitCommission;

  const projectedFlipNetProfit = targetExitPrice - totalFlipCosts;
  const projectedFlipRoi = totalCost > 0 ? (projectedFlipNetProfit / (totalCashRequired > 0 ? totalCashRequired : totalCost)) * 100 : 0;

  return {
    grossYield: Number(grossYield.toFixed(2)),
    capRate: Number(capRate.toFixed(2)),
    netRoi: Number(netRoi.toFixed(2)),
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualNetOperatingIncome: Math.round(annualNetOperatingIncome),
    totalCashRequired: Math.round(totalCashRequired),
    monthlyBondPayment: Math.round(monthlyBondPayment),
    projectedFlipNetProfit: Math.round(projectedFlipNetProfit),
    projectedFlipRoi: Number(projectedFlipRoi.toFixed(2)),
  };
}

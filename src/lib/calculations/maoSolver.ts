/**
 * Maximum Allowable Offer (MAO) Solver Engine
 *
 * Provides inverse-yield & target-ROI calculations for:
 * 1. Flip Projects: Solves for Max Allowable Bid given Target Exit Price, Desired ROI%, BOQ Rehab, Holding Reserves, and Acquisition Friction.
 * 2. Rental Acquisitions: Solves for Max Purchase Price given Target Net Yield (Cap Rate) and Stress-Tested NOI (with Vacancy & Management deductions).
 */

export interface FlipMaoParams {
  targetExitPrice: number;
  desiredRoiPercent: number; // e.g. 15 for 15%
  rehabCost: number;
  holdingCost: number; // e.g. 6-month holding reserve
  estimatedAcquisitionCostRate?: number; // e.g. 0.05 (5% duty + legal friction approximation)
}

export interface FlipMaoResult {
  maxAllowableBid: number;
  totalAllowableOutlay: number;
  nonPurchaseCosts: number;
  projectedProfitAtMao: number;
}

export interface RentalMaoParams {
  monthlyRent: number;
  vacancyRatePercent: number; // e.g. 6.0%
  managementFeePercent: number; // e.g. 8.0%
  monthlyLevies: number;
  monthlyRates: number;
  annualInsurance: number;
  targetNetYieldPercent: number; // Target Cap Rate, e.g. 8.5%
}

export interface RentalMaoResult {
  maxAllowablePrice: number;
  grossAnnualRent: number;
  vacancyLossAnnual: number;
  effectiveGrossRentAnnual: number;
  managementFeeAnnual: number;
  annualOperatingExpenses: number;
  stressTestedNoi: number;
}

/**
 * Solve Flip Maximum Allowable Bid
 * MAO = (Target Exit Price / (1 + Desired ROI%)) - BOQ Capex - Holding Reserve - Acquisition Friction
 */
export function calculateFlipMao(params: FlipMaoParams): FlipMaoResult {
  const {
    targetExitPrice,
    desiredRoiPercent,
    rehabCost,
    holdingCost,
    estimatedAcquisitionCostRate = 0.05,
  } = params;

  if (targetExitPrice <= 0 || desiredRoiPercent < -90) {
    return {
      maxAllowableBid: 0,
      totalAllowableOutlay: 0,
      nonPurchaseCosts: 0,
      projectedProfitAtMao: 0,
    };
  }

  // Total allowable capital outlay to hit desired ROI
  const totalAllowableOutlay = targetExitPrice / (1 + desiredRoiPercent / 100);
  const nonPurchaseCosts = rehabCost + holdingCost;
  const allowableForAcquisition = totalAllowableOutlay - nonPurchaseCosts;

  // Account for acquisition friction (transfer duty + legal fees ~5% on average)
  const maxBid = allowableForAcquisition > 0
    ? Math.round(allowableForAcquisition / (1 + estimatedAcquisitionCostRate))
    : 0;

  const clampedMaxBid = Math.max(0, maxBid);
  const projectedProfitAtMao = Math.round(targetExitPrice - totalAllowableOutlay);

  return {
    maxAllowableBid: clampedMaxBid,
    totalAllowableOutlay: Math.round(totalAllowableOutlay),
    nonPurchaseCosts: Math.round(nonPurchaseCosts),
    projectedProfitAtMao,
  };
}

/**
 * Solve Rental Maximum Purchase Price
 * MAO = Stress-Tested NOI / Target Net Yield%
 * where Stress-Tested NOI = (Gross Rent * (1 - Vacancy%)) - OpEx (Levies + Rates + Insurance + Management)
 */
export function calculateRentalMao(params: RentalMaoParams): RentalMaoResult {
  const {
    monthlyRent,
    vacancyRatePercent,
    managementFeePercent,
    monthlyLevies,
    monthlyRates,
    annualInsurance,
    targetNetYieldPercent,
  } = params;

  const grossAnnualRent = Math.max(0, monthlyRent * 12);
  const vacancyLossAnnual = Math.round(grossAnnualRent * (Math.max(0, vacancyRatePercent) / 100));
  const effectiveGrossRentAnnual = grossAnnualRent - vacancyLossAnnual;

  const managementFeeAnnual = Math.round(grossAnnualRent * (Math.max(0, managementFeePercent) / 100));
  const statutoryAndLeviesAnnual = (Math.max(0, monthlyLevies) + Math.max(0, monthlyRates)) * 12;
  const annualInsuranceClean = Math.max(0, annualInsurance);
  const annualOperatingExpenses = statutoryAndLeviesAnnual + annualInsuranceClean + managementFeeAnnual;

  const stressTestedNoi = effectiveGrossRentAnnual - annualOperatingExpenses;

  if (targetNetYieldPercent <= 0 || stressTestedNoi <= 0) {
    return {
      maxAllowablePrice: 0,
      grossAnnualRent,
      vacancyLossAnnual,
      effectiveGrossRentAnnual,
      managementFeeAnnual,
      annualOperatingExpenses,
      stressTestedNoi: Math.round(stressTestedNoi),
    };
  }

  const maxAllowablePrice = Math.max(0, Math.round(stressTestedNoi / (targetNetYieldPercent / 100)));

  return {
    maxAllowablePrice,
    grossAnnualRent,
    vacancyLossAnnual,
    effectiveGrossRentAnnual,
    managementFeeAnnual,
    annualOperatingExpenses,
    stressTestedNoi: Math.round(stressTestedNoi),
  };
}

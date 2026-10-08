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
  holdingCost?: number; // total holding reserve, or derived from monthlyHoldingCost * holdingPeriodMonths
  monthlyHoldingCost?: number;
  holdingPeriodMonths?: number;
  estimatedAcquisitionCostRate?: number; // e.g. 0.05 (5% duty + legal friction approximation)
  exitCommissionPercent?: number; // Optional exit sales commission (e.g. 5.75 for 5.75%)
  municipalClearanceZAR?: number; // Section 118 municipal arrears and council clearance
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
  agencyVatApplicable?: boolean; // Whether 15% VAT is added on agency commission (defaults to true)
  monthlyLevies: number;
  monthlyRates: number;
  annualInsurance: number;
  monthlyMaintenanceReserve?: number;
  monthlyPrepaidVendingFee?: number;
  monthlyCommunalServicesZAR?: number;
  rehabCost?: number;
  estimatedAcquisitionCostRate?: number;
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
  totalAllowableCost?: number;
}

/**
 * Solve Flip Maximum Allowable Bid
 * MAO = (Target Exit Price / (1 + Desired ROI%)) - BOQ Capex - Holding Reserve - Exit Commission - Section 118 - Acquisition Friction
 */
export function calculateFlipMao(params: FlipMaoParams): FlipMaoResult {
  const {
    targetExitPrice,
    desiredRoiPercent,
    rehabCost,
    holdingCost,
    monthlyHoldingCost,
    holdingPeriodMonths,
    estimatedAcquisitionCostRate = 0.05,
    exitCommissionPercent,
    municipalClearanceZAR = 0,
  } = params;

  const holdingMonths = typeof holdingPeriodMonths === 'number' && holdingPeriodMonths > 0
    ? holdingPeriodMonths
    : 6;

  const resolvedHoldingCost = typeof holdingCost === 'number'
    ? holdingCost
    : (typeof monthlyHoldingCost === 'number' ? monthlyHoldingCost * holdingMonths : 0);

  if (
    targetExitPrice <= 0 ||
    desiredRoiPercent < -90 ||
    rehabCost < 0 ||
    resolvedHoldingCost < 0
  ) {
    return {
      maxAllowableBid: 0,
      totalAllowableOutlay: 0,
      nonPurchaseCosts: 0,
      projectedProfitAtMao: 0,
    };
  }

  // Total allowable capital outlay to hit desired ROI (rounded to integer ZAR)
  const totalAllowableOutlay = Math.round(targetExitPrice / (1 + desiredRoiPercent / 100));
  const exitCommission = typeof exitCommissionPercent === 'number' && exitCommissionPercent > 0
    ? Math.round(targetExitPrice * (exitCommissionPercent / 100))
    : 0;
  const municipalClearance = Math.max(0, municipalClearanceZAR || 0);
  const nonPurchaseCosts = rehabCost + resolvedHoldingCost + exitCommission + municipalClearance;
  const allowableForAcquisition = totalAllowableOutlay - nonPurchaseCosts;

  // Account for acquisition friction (transfer duty + legal fees ~5% on average)
  const acqRate = Math.max(0, estimatedAcquisitionCostRate);
  const maxBid = allowableForAcquisition > 0
    ? Math.round(allowableForAcquisition / (1 + acqRate))
    : 0;

  const clampedMaxBid = Math.max(0, maxBid);
  const projectedProfitAtMao = targetExitPrice - totalAllowableOutlay;

  return {
    maxAllowableBid: clampedMaxBid,
    totalAllowableOutlay,
    nonPurchaseCosts: Math.round(nonPurchaseCosts),
    projectedProfitAtMao,
  };
}

/**
 * Solve Rental Maximum Purchase Price
 * MAO = Stress-Tested NOI / Target Net Yield%
 * where Stress-Tested NOI = (Gross Rent * (1 - Vacancy%)) - OpEx (Levies + Rates + Insurance + Management + Maintenance + Vending)
 * All-in cost includes acquisition friction and rehab matching the Buy Box capRate definition.
 */
export function calculateRentalMao(params: RentalMaoParams): RentalMaoResult {
  const {
    monthlyRent,
    vacancyRatePercent,
    managementFeePercent,
    agencyVatApplicable,
    monthlyLevies,
    monthlyRates,
    annualInsurance,
    monthlyMaintenanceReserve = 0,
    monthlyPrepaidVendingFee = 0,
    monthlyCommunalServicesZAR = 0,
    rehabCost = 0,
    estimatedAcquisitionCostRate = 0,
    targetNetYieldPercent,
  } = params;

  const grossAnnualRent = Math.max(0, monthlyRent * 12);
  const vacancyLossAnnual = Math.round(grossAnnualRent * (Math.max(0, vacancyRatePercent) / 100));
  const effectiveGrossRentAnnual = grossAnnualRent - vacancyLossAnnual;

  const vatMultiplier = agencyVatApplicable !== false ? 1.15 : 1.0;
  const managementFeeAnnual = Math.round(grossAnnualRent * (Math.max(0, managementFeePercent) / 100) * vatMultiplier);
  const statutoryAndLeviesAnnual = (Math.max(0, monthlyLevies) + Math.max(0, monthlyRates)) * 12;
  const annualInsuranceClean = Math.max(0, annualInsurance);
  const maintenanceAnnual = Math.max(0, monthlyMaintenanceReserve) * 12;
  const vendingAnnual = Math.max(0, monthlyPrepaidVendingFee) * 12;
  const communalAnnual = Math.max(0, monthlyCommunalServicesZAR) * 12;

  const annualOperatingExpenses =
    statutoryAndLeviesAnnual +
    annualInsuranceClean +
    managementFeeAnnual +
    maintenanceAnnual +
    vendingAnnual +
    communalAnnual;

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
      totalAllowableCost: 0,
    };
  }

  // All-in cost matches Buy Box capRate definition:
  // capRate = (stressTestedNoi / totalAllInCost) * 100 = targetNetYieldPercent
  const totalAllowableCost = Math.round(stressTestedNoi / (targetNetYieldPercent / 100));
  const allowableAcquisition = totalAllowableCost - Math.max(0, rehabCost);
  const acqRate = Math.max(0, estimatedAcquisitionCostRate);
  const maxAllowablePrice = allowableAcquisition > 0
    ? Math.max(0, Math.round(allowableAcquisition / (1 + acqRate)))
    : 0;

  return {
    maxAllowablePrice,
    grossAnnualRent,
    vacancyLossAnnual,
    effectiveGrossRentAnnual,
    managementFeeAnnual,
    annualOperatingExpenses,
    stressTestedNoi: Math.round(stressTestedNoi),
    totalAllowableCost,
  };
}

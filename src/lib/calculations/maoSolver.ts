/**
 * Maximum Allowable Offer (MAO) Solver Engine
 *
 * Provides inverse-yield & target-ROI calculations for:
 * 1. Flip Projects: Solves for Max Allowable Bid given Target Exit Price, Desired ROI%, BOQ Rehab, Holding Reserves, and Acquisition Friction.
 * 2. Rental Acquisitions: Solves for Max Purchase Price given Target Net Yield (Cap Rate) and Stress-Tested NOI (with Vacancy & Management deductions).
 * 3. PIE Act Risk Adjustments: Closed-form deduction for legal litigation reserves, interim rates/levies/security carrying burn, and debt carrying costs during eviction delays.
 */

import { OccupantRiskProfile } from '@/types';
import { isEvictionActive } from './occupantRisk';

export const DAYS_PER_MONTH = 30.416;

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
  bondCancellationFeeZAR?: number; // Conveyancer fee to cancel active bond
  defaultBondCancellationFeeZAR?: number; // e.g. 5200 ZAR
  earlyTerminationNoticeGiven?: boolean; // Defaults to true; if false, 90-day bank penalty applies
  earlyPenaltyZAR?: number; // Custom fixed penalty quote from bank
  // PIE Act Eviction Risk Adjustments
  occupantRisk?: OccupantRiskProfile;
  evictionLegalCostZAR?: number;
  evictionDelayDays?: number;
  evictionMonthlyFixedBurnZAR?: number; // municipal rates + levies + monthly site security
  bondLtvPercent?: number;
  interestRatePercent?: number;
  bondInterestRatePercent?: number;
}

export interface FlipMaoResult {
  maxAllowableBid: number;
  totalAllowableOutlay: number;
  nonPurchaseCosts: number;
  projectedProfitAtMao: number;
  occupantRiskReductionZAR: number;
  evictionCostAtMaoZAR: number;
  riskFreeMaxBid: number;
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
  tenantPlacementFeePercent?: number;
  annualSpvAdminAuditFeeZAR?: number;
  rehabCost?: number;
  estimatedAcquisitionCostRate?: number;
  targetNetYieldPercent: number; // Target Cap Rate, e.g. 8.5%
  // PIE Act Eviction Risk Adjustments
  occupantRisk?: OccupantRiskProfile;
  evictionLegalCostZAR?: number;
  evictionDelayDays?: number;
  evictionMonthlyFixedBurnZAR?: number;
  bondLtvPercent?: number;
  interestRatePercent?: number;
  bondInterestRatePercent?: number;
}

export interface RentalMaoResult {
  maxAllowablePrice: number;
  grossAnnualRent: number;
  vacancyLossAnnual: number;
  effectiveGrossRentAnnual: number;
  managementFeeAnnual: number;
  placementFeeAnnual?: number;
  spvAdminFeeAnnual?: number;
  annualOperatingExpenses: number;
  stressTestedNoi: number;
  totalAllowableCost?: number;
  occupantRiskReductionZAR: number;
  evictionCostAtMaoZAR: number;
  riskFreeMaxPrice: number;
}

/**
 * Solve Flip Maximum Allowable Bid
 * MAO = (Target Exit Price / (1 + Desired ROI%)) - BOQ Capex - Holding Reserve - Exit Commission - Section 118 - Acquisition Friction
 * With PIE Act Eviction Risk:
 * Closed-form solve: MAO = (Allowable - FixedEvictionCost) / (1 + acqRate + k)
 * where FixedEvictionCost = legalCost + (rates + levies + security) * (delayDays / 30.416)
 * and k = (LTV / 100) * (interestRate / 100 / 12) * (delayDays / 30.416)
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
    evictionLegalCostZAR = 0,
    evictionDelayDays = 0,
    evictionMonthlyFixedBurnZAR = 0,
    bondLtvPercent = 0,
    interestRatePercent = 0,
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
      occupantRiskReductionZAR: 0,
      evictionCostAtMaoZAR: 0,
      riskFreeMaxBid: 0,
    };
  }

  // Total allowable capital outlay to hit desired ROI (rounded to integer ZAR)
  const totalAllowableOutlay = Math.round(targetExitPrice / (1 + desiredRoiPercent / 100));
  const exitCommission = typeof exitCommissionPercent === 'number' && exitCommissionPercent > 0
    ? Math.round(targetExitPrice * (exitCommissionPercent / 100))
    : 0;
  const municipalClearance = Math.max(0, municipalClearanceZAR || 0);

  // Active bond indicator & Bond Cancellation Legal Fee
  const ltv = Math.max(0, bondLtvPercent);
  const rate = Math.max(0, interestRatePercent || (params.bondInterestRatePercent ?? 0));
  const hasBond = ltv > 0;
  const defaultBondCancel = params.defaultBondCancellationFeeZAR ?? 5200;
  const bondCancellation = !hasBond
    ? 0
    : (params.bondCancellationFeeZAR ?? defaultBondCancel);

  // 90-Day Early Settlement Penalty (Point 2 & 3: Strict Zero Guard & Closed-Form Factor)
  const isPenaltyActive = hasBond && params.earlyTerminationNoticeGiven === false;
  const hasFixedPenalty = isPenaltyActive && params.earlyPenaltyZAR !== undefined && params.earlyPenaltyZAR !== null;
  const fixedPenalty = hasFixedPenalty ? Math.max(0, params.earlyPenaltyZAR!) : 0;

  const nonPurchaseCosts = rehabCost + resolvedHoldingCost + exitCommission + municipalClearance + bondCancellation + fixedPenalty;
  const allowableForAcquisition = totalAllowableOutlay - nonPurchaseCosts;

  // Baseline risk-free acquisition friction
  const acqRate = Math.max(0, estimatedAcquisitionCostRate);
  const riskFreeMaxBid = allowableForAcquisition > 0
    ? Math.round(allowableForAcquisition / (1 + acqRate))
    : 0;

  // PIE Act Risk Adjustments
  const riskActive = params.occupantRisk ? isEvictionActive(params.occupantRisk) : false;
  const legal = riskActive
    ? params.occupantRisk!.budgetedLegalEvictionCostZAR
    : Math.max(0, evictionLegalCostZAR);
  const delayDays = riskActive
    ? params.occupantRisk!.estimatedEvictionDelayDays
    : Math.max(0, evictionDelayDays);
  const fixedBurn = riskActive
    ? params.occupantRisk!.monthlySiteSecurityZAR
    : Math.max(0, evictionMonthlyFixedBurnZAR);

  let finalMaxBid = Math.max(0, riskFreeMaxBid);
  let occupantRiskReductionZAR = 0;
  let evictionCostAtMaoZAR = 0;

  // Closed-form k factors for eviction delay interest AND 90-day early termination penalty
  const evictionMonths = delayDays > 0 ? delayDays / DAYS_PER_MONTH : 0;
  const fixedEvictionCost = legal + fixedBurn * evictionMonths;
  const kEviction = (ltv / 100) * (rate / 100 / 12) * evictionMonths;
  const kPenalty = (isPenaltyActive && !hasFixedPenalty)
    ? (ltv / 100) * (rate / 100) * (90 / 365)
    : 0;
  const totalK = kEviction + kPenalty;

  if (legal > 0 || delayDays > 0 || totalK > 0) {
    const netAllowable = allowableForAcquisition - fixedEvictionCost;

    finalMaxBid = netAllowable > 0
      ? Math.max(0, Math.round(netAllowable / (1 + acqRate + totalK)))
      : 0;

    occupantRiskReductionZAR = Math.max(0, riskFreeMaxBid - finalMaxBid);
    const bondInterestAtMao = finalMaxBid * kEviction;
    evictionCostAtMaoZAR = Math.round(fixedEvictionCost + bondInterestAtMao);
  }

  const projectedProfitAtMao = targetExitPrice - totalAllowableOutlay;

  return {
    maxAllowableBid: finalMaxBid,
    totalAllowableOutlay,
    nonPurchaseCosts: Math.round(nonPurchaseCosts),
    projectedProfitAtMao,
    occupantRiskReductionZAR,
    evictionCostAtMaoZAR,
    riskFreeMaxBid,
  };
}

/**
 * Solve Rental Maximum Purchase Price
 * MAO = Stress-Tested NOI / Target Net Yield%
 * where Stress-Tested NOI = (Gross Rent * (1 - Vacancy%)) - OpEx (Levies + Rates + Insurance + Management + Placement + SPV Admin + Maintenance + Vending)
 * With PIE Act Eviction Risk:
 * Deducts legal reserve and interim eviction carrying burn from the allowable acquisition ceiling.
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
    tenantPlacementFeePercent = 0,
    annualSpvAdminAuditFeeZAR = 0,
    rehabCost = 0,
    estimatedAcquisitionCostRate = 0,
    targetNetYieldPercent,
    evictionLegalCostZAR = 0,
    evictionDelayDays = 0,
    evictionMonthlyFixedBurnZAR = 0,
    bondLtvPercent = 0,
    interestRatePercent = 0,
  } = params;

  const grossAnnualRent = Math.max(0, monthlyRent * 12);
  const vacancyLossAnnual = Math.round(grossAnnualRent * (Math.max(0, vacancyRatePercent) / 100));
  const effectiveGrossRentAnnual = grossAnnualRent - vacancyLossAnnual;

  const vatMultiplier = agencyVatApplicable !== false ? 1.15 : 1.0;
  const managementFeeAnnual = Math.round(grossAnnualRent * (Math.max(0, managementFeePercent) / 100) * vatMultiplier);
  const placementFeeAnnual = Math.round(grossAnnualRent * (Math.max(0, tenantPlacementFeePercent) / 100) * vatMultiplier);
  const spvAdminFeeAnnual = Math.round(Math.max(0, annualSpvAdminAuditFeeZAR));
  const statutoryAndLeviesAnnual = (Math.max(0, monthlyLevies) + Math.max(0, monthlyRates)) * 12;
  const annualInsuranceClean = Math.max(0, annualInsurance);
  const maintenanceAnnual = Math.max(0, monthlyMaintenanceReserve) * 12;
  const vendingAnnual = Math.max(0, monthlyPrepaidVendingFee) * 12;
  const communalAnnual = Math.max(0, monthlyCommunalServicesZAR) * 12;

  const annualOperatingExpenses =
    statutoryAndLeviesAnnual +
    annualInsuranceClean +
    managementFeeAnnual +
    placementFeeAnnual +
    spvAdminFeeAnnual +
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
      placementFeeAnnual,
      spvAdminFeeAnnual,
      annualOperatingExpenses,
      stressTestedNoi: Math.round(stressTestedNoi),
      totalAllowableCost: 0,
      occupantRiskReductionZAR: 0,
      evictionCostAtMaoZAR: 0,
      riskFreeMaxPrice: 0,
    };
  }

  // All-in cost matches Buy Box capRate definition:
  // capRate = (stressTestedNoi / totalAllInCost) * 100 = targetNetYieldPercent
  const totalAllowableCost = Math.round(stressTestedNoi / (targetNetYieldPercent / 100));
  const allowableAcquisition = totalAllowableCost - Math.max(0, rehabCost);
  const acqRate = Math.max(0, estimatedAcquisitionCostRate);
  const riskFreeMaxPrice = allowableAcquisition > 0
    ? Math.max(0, Math.round(allowableAcquisition / (1 + acqRate)))
    : 0;

  // PIE Act Risk Adjustments
  const riskActive = params.occupantRisk ? isEvictionActive(params.occupantRisk) : false;
  const legal = riskActive
    ? params.occupantRisk!.budgetedLegalEvictionCostZAR
    : Math.max(0, evictionLegalCostZAR);
  const delayDays = riskActive
    ? params.occupantRisk!.estimatedEvictionDelayDays
    : Math.max(0, evictionDelayDays);
  const fixedBurn = riskActive
    ? params.occupantRisk!.monthlySiteSecurityZAR
    : Math.max(0, evictionMonthlyFixedBurnZAR);
  const ltv = Math.max(0, bondLtvPercent);
  const rate = Math.max(0, interestRatePercent || (params.bondInterestRatePercent ?? 0));

  let finalMaxPrice = Math.max(0, riskFreeMaxPrice);
  let occupantRiskReductionZAR = 0;
  let evictionCostAtMaoZAR = 0;

  if (legal > 0 || delayDays > 0) {
    const evictionMonths = delayDays / DAYS_PER_MONTH;
    const fixedEvictionCost = legal + fixedBurn * evictionMonths;
    const k = (ltv / 100) * (rate / 100 / 12) * evictionMonths;
    const netAllowable = allowableAcquisition - fixedEvictionCost;

    finalMaxPrice = netAllowable > 0
      ? Math.max(0, Math.round(netAllowable / (1 + acqRate + k)))
      : 0;

    occupantRiskReductionZAR = Math.max(0, riskFreeMaxPrice - finalMaxPrice);
    const bondInterestAtMao = finalMaxPrice * k;
    evictionCostAtMaoZAR = Math.round(fixedEvictionCost + bondInterestAtMao);
  }

  return {
    maxAllowablePrice: finalMaxPrice,
    grossAnnualRent,
    vacancyLossAnnual,
    effectiveGrossRentAnnual,
    managementFeeAnnual,
    placementFeeAnnual,
    spvAdminFeeAnnual,
    annualOperatingExpenses,
    stressTestedNoi: Math.round(stressTestedNoi),
    totalAllowableCost,
    occupantRiskReductionZAR,
    evictionCostAtMaoZAR,
    riskFreeMaxPrice,
  };
}

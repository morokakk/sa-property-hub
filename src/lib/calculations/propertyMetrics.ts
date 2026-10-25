import { AcquisitionCostBreakdown, AmenityDistance, AmenityScorecard, AncillaryIncome, DealStrategy, InvestorProfile, Lease, LongTermProjectionYear, OccupantRiskProfile, OpportunityDeal, PropertyTitleType, RentalProperty } from '@/types';
import { calculateEvictionCarryingCost } from './occupantRisk';
import { computeAcquisitionCosts, calculateBondRegistrationFee } from './sarsTax';

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

/**
 * Calculates mortgage principal balance from monthly bond repayment (inverse PMT).
 */
export function calculateBondPrincipalFromRepayment(
  monthlyPayment: number,
  annualInterestRate: number,
  years: number
): number {
  if (monthlyPayment <= 0 || annualInterestRate <= 0 || years <= 0) return 0;
  const monthlyRate = annualInterestRate / 100 / 12;
  const totalMonths = years * 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  return Math.round((monthlyPayment * (factor - 1)) / (monthlyRate * factor));
}

export interface DealDscrParams {
  purchasePrice: number;
  monthlyRentalEstimate?: number;
  vacancyRatePercent?: number;
  managementFeePercent?: number;
  agencyVatApplicable?: boolean;
  tenantPlacementFeePercent?: number;
  annualSpvAdminAuditFeeZAR?: number;
  monthlyLevies?: number;
  monthlyRatesTaxes?: number;
  annualInsurance?: number;
  monthlyMaintenanceReserveZAR?: number;
  monthlyPrepaidVendingFeeZAR?: number;
  monthlyCommunalServicesZAR?: number;
  propertyType?: PropertyTitleType;
  depositZAR?: number;
  bondLTV?: number;
  loanToValuePercent?: number;
  interestRatePercent?: number;
  interestRateMargin?: number;
  loanTermYears?: number;
  bondTermYears?: number;
  monthlyBondPaymentZAR?: number;
}

export interface DealDscrResult {
  monthlyNoi: number;
  annualNetOperatingIncome: number;
  monthlyBondPayment: number;
  dscr: number | null;
  rawDscr: number | null;
  operatingExpenses: number;
  effectiveGrossRent: number;
}

/**
 * Shared Net Operating Income (NOI) and Debt Service Coverage Ratio (DSCR) calculation helper.
 * Unifies calculations across Analyzer active form, Deal Card, and Compare Modal.
 */
export function calculateDealDscr(
  deal: DealDscrParams,
  profileOrPrime?: number | Partial<InvestorProfile>
): DealDscrResult {
  const prime = typeof profileOrPrime === 'number'
    ? profileOrPrime
    : (profileOrPrime?.defaultPrimeRatePercent ?? 10.75);

  const grossRent = deal.monthlyRentalEstimate || 0;
  const vacRate = deal.vacancyRatePercent ?? 6.0;
  const vacLoss = (grossRent * vacRate) / 100;
  const effectiveGrossRent = grossRent - vacLoss;

  const vatMult = deal.agencyVatApplicable !== false ? 1.15 : 1.0;
  const mgmtFeePercent = deal.managementFeePercent ?? 8.0;
  const agentMgt = (grossRent * (mgmtFeePercent / 100)) * vatMult;

  const placementFeePercent = deal.tenantPlacementFeePercent ?? 0;
  const monthlyPlacementFee = (grossRent * (placementFeePercent / 100)) * vatMult;
  const monthlySpvAdminZAR = (deal.annualSpvAdminAuditFeeZAR || 0) / 12;

  const levies = deal.propertyType === 'Freehold House' ? 0 : (deal.monthlyLevies || 0);
  const rates = deal.monthlyRatesTaxes || 0;
  const insurance = Math.round((deal.annualInsurance || 0) / 12);
  const maintenance = deal.monthlyMaintenanceReserveZAR ?? 0;
  const vending = deal.monthlyPrepaidVendingFeeZAR ?? 0;
  const communal = deal.monthlyCommunalServicesZAR ?? 0;

  const operatingExpenses =
    levies +
    rates +
    agentMgt +
    monthlyPlacementFee +
    monthlySpvAdminZAR +
    insurance +
    maintenance +
    vending +
    communal;
  const monthlyNoi = effectiveGrossRent - operatingExpenses;
  const annualNetOperatingIncome = monthlyNoi * 12;

  // Financed principal & bond repayment
  const effLtv = deal.bondLTV !== undefined ? deal.bondLTV : (deal.loanToValuePercent ?? 100);
  const deposit = deal.depositZAR !== undefined
    ? deal.depositZAR
    : Math.max(0, Math.round((deal.purchasePrice || 0) * (1 - effLtv / 100)));
  const debt = Math.max(0, (deal.purchasePrice || 0) - deposit);
  const rate = deal.interestRateMargin !== undefined
    ? prime + deal.interestRateMargin
    : (deal.interestRatePercent ?? prime);
  const termYears = deal.bondTermYears ?? deal.loanTermYears ?? 20;

  const monthlyBondPayment = deal.monthlyBondPaymentZAR ?? (
    debt > 0 ? calculateMonthlyBondRepayment(debt, rate, termYears) : 0
  );

  const rawDscr = monthlyBondPayment > 0
    ? monthlyNoi / monthlyBondPayment
    : null;
  const dscr = monthlyBondPayment > 0 && rawDscr !== null
    ? Number(rawDscr.toFixed(2))
    : null;

  return {
    monthlyNoi: Math.round(monthlyNoi),
    annualNetOperatingIncome: Math.round(annualNetOperatingIncome),
    monthlyBondPayment: Math.round(monthlyBondPayment),
    dscr,
    rawDscr,
    operatingExpenses: Math.round(operatingExpenses),
    effectiveGrossRent: Math.round(effectiveGrossRent),
  };
}

export type DscrBand = 'pass' | 'watch' | 'fail' | 'cash';

export interface RateShockScenario {
  label: string; // 'Current' | '+100 bps' | '+200 bps'
  shockBps: number;
  ratePercent: number;
  monthlyBondPayment: number;
  monthlyCashFlow: number;
  dscr: number | null;
  band: DscrBand;
}

/**
 * Calculates interest rate stress-test scenarios (0 bps, +100 bps, +200 bps)
 * evaluating monthly bond debt service, net cashflow, and DSCR hurdle status.
 */
export function calculateRateShockScenarios(params: {
  monthlyNoi: number;
  bondAmount: number;
  baseRatePercent: number; // effective prime + margin
  loanTermYears: number;
  minDscr?: number; // investorProfile.minDscr ?? 1.2
  shocksBps?: number[]; // default [0, 100, 200]
}): RateShockScenario[] {
  const {
    monthlyNoi,
    bondAmount,
    baseRatePercent,
    loanTermYears,
    minDscr = 1.2,
    shocksBps = [0, 100, 200],
  } = params;

  return shocksBps.map((bps) => {
    const ratePercent = Number((baseRatePercent + bps / 100).toFixed(2));
    const monthlyBondPayment =
      bondAmount > 0
        ? calculateMonthlyBondRepayment(bondAmount, ratePercent, loanTermYears)
        : 0;
    const rawDscr = monthlyBondPayment > 0 ? monthlyNoi / monthlyBondPayment : null;
    const dscr = rawDscr !== null ? Number(rawDscr.toFixed(2)) : null;
    const band: DscrBand =
      dscr === null
        ? 'cash'
        : dscr >= minDscr
        ? 'pass'
        : dscr >= 1.0
        ? 'watch'
        : 'fail';
    const monthlyCashFlow = Math.round(monthlyNoi - monthlyBondPayment);

    return {
      label: bps === 0 ? 'Current' : `+${bps} bps`,
      shockBps: bps,
      ratePercent,
      monthlyBondPayment,
      monthlyCashFlow,
      dscr,
      band,
    };
  });
}

/**
 * Solves the annualized Internal Rate of Return (IRR %) for an array of cashflows [CF0, CF1, ..., CFn]
 * using Newton-Raphson with a bisection fallback for numerical stability.
 */
export function solveIrrPercent(cashflows: number[]): number {
  if (!cashflows || cashflows.length < 2) return 0;
  const cf0 = cashflows[0];
  if (cf0 >= 0) return 0;

  const npv = (rate: number): number => {
    let sum = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      if (!Number.isFinite(denom) || denom === 0) return Number.NaN;
      sum += cashflows[t] / denom;
    }
    return sum;
  };

  // Bisection bracket search between -95% and +1000%
  let low = -0.95;
  let high = 10.0;
  let fLow = npv(low);
  let fHigh = npv(high);

  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh)) return 0;

  // Try Newton-Raphson first starting at 10%
  let guess = 0.1;
  for (let iter = 0; iter < 50; iter++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const factor = Math.pow(1 + guess, t);
      f += cashflows[t] / factor;
      if (t > 0) {
        df -= (t * cashflows[t]) / Math.pow(1 + guess, t + 1);
      }
    }
    if (Math.abs(f) < 1e-7) {
      return Number.isFinite(guess) ? Number((guess * 100).toFixed(2)) : 0;
    }
    if (Math.abs(df) < 1e-10) break;
    const next = guess - f / df;
    if (next <= -0.95 || next > 10.0 || !Number.isFinite(next)) break;
    guess = next;
  }

  // Fallback to bisection if Newton-Raphson did not converge cleanly
  if (fLow * fHigh > 0) {
    return 0;
  }
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7 || (high - low) / 2 < 1e-7) {
      return Number.isFinite(mid) ? Number((mid * 100).toFixed(2)) : 0;
    }
    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  const finalRate = (low + high) / 2;
  return Number.isFinite(finalRate) ? Number((finalRate * 100).toFixed(2)) : 0;
}

export interface OpportunityMetricsResult {
  grossYield: number;
  capRate: number;
  netRoi: number;
  monthlyCashFlow: number;
  monthlyNOI: number;
  annualNetOperatingIncome: number;
  totalCashRequired: number;
  initialCapitalRequired: number;
  bondAmount: number;
  cashDeposit: number;
  monthlyBondPayment: number;
  projectedFlipNetProfit: number;
  projectedFlipRoi: number;
  annualizedFlipRoi: number;
  monthlyHoldingBurnZAR: number;
  dscr: number | null;
  rawDscr?: number | null;
  fiveYearIrrPercent: number;
  purchasePricePerSqm: number;
  valuationPerSqm: number;
  averagePricePerUnit: number;
  rehabCostPerUnit: number;
  allInCostPerUnit: number;
  transferDutyZAR: number;
  monthlyPlacementFeeZAR: number;
  monthlySpvAdminZAR: number;
  brrrrRefinanceLoanZAR: number;
  brrrrCashLeftInDealZAR: number;
  brrrrEquityExtractedZAR: number;
  brrrrPostRefiBondPaymentZAR: number;
  brrrrPostRefiCashflowZAR: number;
  evictionLegalCostZAR?: number;
  evictionDelayBurnZAR?: number;
  totalOccupantCostZAR?: number;
  exitCommissionZAR?: number;
  bondCancellationFeeZAR?: number;
  earlyPenaltyZAR?: number;
  totalExitFrictionZAR?: number;
}

/**
 * Calculates effective exit commission percentage based on default commission and VAT exemption status.
 * Standard estate agent sales commission applies 15% SARS VAT (1.15 multiplier) unless vatExemptAgent is true.
 */
export function calculateEffectiveExitCommission(
  defaultAgentCommissionPercent: number = 5.0,
  vatExemptAgent: boolean = false,
  overridePercent?: number
): number {
  if (typeof overridePercent === 'number') {
    return overridePercent;
  }
  return vatExemptAgent ? defaultAgentCommissionPercent : Number((defaultAgentCommissionPercent * 1.15).toFixed(4));
}

export function calculateDealMetrics(params: {
  strategy?: DealStrategy;
  purchasePrice: number;
  openMarketValueZAR?: number;
  openMarketValue?: number;
  numberOfUnits?: number;
  floorAreaSqm?: number;
  isVatInclusiveDeveloperSale?: boolean;
  customTransferDutyZAR?: number;
  tenantPlacementFeePercent?: number;
  annualSpvAdminAuditFeeZAR?: number;
  refinanceLtvPercent?: number;
  estimatedRehabCost: number;
  monthlyRentalEstimate: number;
  monthlyLevies: number;
  monthlyRatesTaxes: number;
  annualInsurance?: number;
  managementFeePercent?: number;
  agencyVatApplicable?: boolean;
  monthlyMaintenanceReserveZAR?: number;
  monthlyPrepaidVendingFeeZAR?: number;
  monthlyCommunalServicesZAR?: number;
  vacancyRatePercent?: number;
  targetExitPrice: number;
  explicitFiveYearExitPriceZAR?: number;
  holdingPeriodMonths?: number;
  loanToValuePercent: number;
  depositZAR?: number;
  bondLTV?: number;
  interestRatePercent: number;
  interestRateMargin?: number;
  loanTermYears: number;
  extraMonthlyPaymentZAR?: number;
  annualCapitalGrowthPercent?: number;
  annualRentalEscalationPercent?: number;
  annualExpenseInflationPercent?: number;
  costs?: AcquisitionCostBreakdown;
  auctioneerCommissionZAR?: number;
  municipalArrearsZAR?: number;
  recomputeBondRegFromDeposit?: boolean;
  exitCommissionPercent?: number;
  defaultAgentCommissionPercent?: number;
  vatExemptAgent?: boolean;
  bondCancellationFeeZAR?: number;
  defaultBondCancellationFeeZAR?: number;
  earlyTerminationNoticeGiven?: boolean;
  earlyTerminationPenaltyZAR?: number;
  occupantRisk?: OccupantRiskProfile;
}): OpportunityMetricsResult {
  const {
    purchasePrice,
    openMarketValueZAR,
    openMarketValue,
    numberOfUnits = 1,
    floorAreaSqm = 0,
    isVatInclusiveDeveloperSale = false,
    customTransferDutyZAR,
    tenantPlacementFeePercent = 0,
    annualSpvAdminAuditFeeZAR = 0,
    refinanceLtvPercent = 75,
    estimatedRehabCost,
    monthlyRentalEstimate,
    monthlyLevies,
    monthlyRatesTaxes,
    annualInsurance = 0,
    managementFeePercent = 0,
    agencyVatApplicable,
    monthlyMaintenanceReserveZAR,
    monthlyPrepaidVendingFeeZAR,
    monthlyCommunalServicesZAR,
    vacancyRatePercent = 0,
    targetExitPrice,
    explicitFiveYearExitPriceZAR,
    holdingPeriodMonths = 6,
    loanToValuePercent,
    depositZAR,
    bondLTV,
    interestRatePercent,
    loanTermYears,
    annualCapitalGrowthPercent = 5.0,
    annualRentalEscalationPercent = 6.0,
    annualExpenseInflationPercent = 6.0,
    extraMonthlyPaymentZAR = 0,
    costs: providedCosts,
    auctioneerCommissionZAR,
    municipalArrearsZAR,
    recomputeBondRegFromDeposit = false,
    exitCommissionPercent,
    defaultAgentCommissionPercent = 5.0,
    vatExemptAgent = false,
    bondCancellationFeeZAR: providedBondCancellationFee,
    defaultBondCancellationFeeZAR = 5200,
    earlyTerminationNoticeGiven = true,
    earlyTerminationPenaltyZAR: providedEarlyPenalty,
    occupantRisk,
  } = params;

  const effectiveLTV = bondLTV !== undefined ? bondLTV : loanToValuePercent;
  const cashDeposit =
    depositZAR !== undefined
      ? depositZAR
      : Math.round(purchasePrice * (1 - effectiveLTV / 100));
  const bondAmount = Math.max(0, purchasePrice - cashDeposit);

  let costs: AcquisitionCostBreakdown = providedCosts ?? computeAcquisitionCosts(
    purchasePrice,
    effectiveLTV,
    {
      customTransferDuty: customTransferDutyZAR,
      isVatInclusiveDeveloperSale,
      bondAmountZAR: bondAmount,
    }
  );

  if (providedCosts && recomputeBondRegFromDeposit && !providedCosts.isBondRegOverridden) {
    const fee = calculateBondRegistrationFee(bondAmount);
    costs = {
      ...providedCosts,
      bondRegistrationFee: fee,
      totalAcquisitionCost: providedCosts.totalAcquisitionCost - providedCosts.bondRegistrationFee + fee,
    };
  }

  const effectiveMarketValue = openMarketValueZAR ?? openMarketValue ?? 0;
  const safeUnits = numberOfUnits && numberOfUnits > 0 ? numberOfUnits : 1;
  const safeSqm = floorAreaSqm && floorAreaSqm > 0 ? floorAreaSqm : 0;

  // 1. Rate per Square Metre (R/m²) & Unit Benchmarks
  const purchasePricePerSqm = safeSqm > 0 ? Math.round(purchasePrice / safeSqm) : 0;
  const valuationPerSqm = safeSqm > 0 && effectiveMarketValue > 0 ? Math.round(effectiveMarketValue / safeSqm) : 0;
  const averagePricePerUnit = safeUnits > 0 ? Math.round(purchasePrice / safeUnits) : purchasePrice;

  // 2. Developer VAT-Inclusive Transfer Duty Guard
  const hasNonZeroCustomDuty =
    (customTransferDutyZAR !== undefined && customTransferDutyZAR > 0) ||
    (costs.isTransferDutyOverridden && costs.transferDuty > 0);
  const transferDutyZAR = isVatInclusiveDeveloperSale && !hasNonZeroCustomDuty
    ? 0
    : (customTransferDutyZAR !== undefined ? customTransferDutyZAR : costs.transferDuty);

  const effectiveTotalAcquisitionCost =
    costs.totalAcquisitionCost - costs.transferDuty + transferDutyZAR;

  // Holding bond cost reflects bond interest only (not double-counting principal repayment)
  const monthlyBondInterest = bondAmount > 0 ? (bondAmount * (interestRatePercent / 100 / 12)) : 0;

  // PIE Act Eviction Carrying Burn & Legal Reserve
  const evictionCosts = calculateEvictionCarryingCost({
    risk: occupantRisk,
    monthlyBondInterestZAR: monthlyBondInterest,
    monthlyRatesZAR: monthlyRatesTaxes,
    monthlyLeviesZAR: monthlyLevies,
  });
  const evictionLegalFee = evictionCosts.totalOccupantCostZAR > 0 ? Math.max(0, occupantRisk?.budgetedLegalEvictionCostZAR || 0) : 0;
  const evictionHoldingBurn = evictionCosts.evictionDelayBurnZAR;
  const totalEvictionBurden = evictionCosts.totalOccupantCostZAR;

  // Auction & Distressed Municipal Outlays
  const auctionCosts = (auctioneerCommissionZAR || 0) + (municipalArrearsZAR || 0);

  // Total Capital Outlay & Day-1 Initial Capital Required
  const totalCost = effectiveTotalAcquisitionCost + estimatedRehabCost + auctionCosts + totalEvictionBurden;
  const rehabCostPerUnit = safeUnits > 0 ? Math.round(estimatedRehabCost / safeUnits) : Math.round(estimatedRehabCost);
  const allInCostPerUnit = safeUnits > 0 ? Math.round(totalCost / safeUnits) : Math.round(totalCost);
  const cashFees = effectiveTotalAcquisitionCost - purchasePrice;
  const initialCapitalRequired = cashDeposit + cashFees + estimatedRehabCost + auctionCosts + evictionLegalFee;
  const totalCashRequired = initialCapitalRequired;

  // Monthly Bond Repayment
  const monthlyBondPayment = calculateMonthlyBondRepayment(
    bondAmount,
    interestRatePercent,
    loanTermYears
  );

  // 3. Rental Cashflow Calculations (including amortized tenant placement fee & SPV admin fee)
  const grossMonthlyRent = monthlyRentalEstimate;
  const vacancyLoss = (grossMonthlyRent * vacancyRatePercent) / 100;
  const effectiveGrossRent = grossMonthlyRent - vacancyLoss;
  const vatMultiplier = agencyVatApplicable !== false ? 1.15 : 1.0;
  const managementFee = (grossMonthlyRent * (managementFeePercent / 100)) * vatMultiplier;
  const monthlyPlacementFee = (grossMonthlyRent * ((tenantPlacementFeePercent || 0) / 100)) * vatMultiplier;
  const monthlySpvAdminZAR = (annualSpvAdminAuditFeeZAR || 0) / 12;
  const monthlyInsurance = annualInsurance / 12;

  const totalMonthlyOperatingExpenses =
    monthlyLevies + 
    monthlyRatesTaxes + 
    managementFee + 
    monthlyPlacementFee +
    monthlySpvAdminZAR +
    monthlyInsurance + 
    (monthlyMaintenanceReserveZAR || 0) + 
    (monthlyPrepaidVendingFeeZAR || 0) +
    (monthlyCommunalServicesZAR || 0);

  const monthlyNetOperatingIncome = effectiveGrossRent - totalMonthlyOperatingExpenses;
  const annualNetOperatingIncome = monthlyNetOperatingIncome * 12;
  const monthlyCashFlow = monthlyNetOperatingIncome - monthlyBondPayment;
  const annualCashFlow = monthlyCashFlow * 12;

  // Yields
  const grossYield = totalCost > 0 ? ((grossMonthlyRent * 12) / totalCost) * 100 : 0;
  const capRate = totalCost > 0 ? (annualNetOperatingIncome / totalCost) * 100 : 0;
  const netRoi = totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;

  // 4. Debt Service Coverage Ratio (DSCR): Monthly NOI / Monthly Bond Repayment
  const rawDscr = monthlyBondPayment > 0
    ? (monthlyNetOperatingIncome / monthlyBondPayment)
    : null;
  const dscr = monthlyBondPayment > 0 && rawDscr !== null
    ? Number(rawDscr.toFixed(2))
    : null;

  // Buy-and-Flip Projections
  // Apply 15% SARS VAT (1.15 multiplier) to default agent commission unless vatExemptAgent is explicitly true
  const effectiveCommissionPercent =
    typeof exitCommissionPercent === 'number'
      ? exitCommissionPercent
      : calculateEffectiveExitCommission(defaultAgentCommissionPercent, vatExemptAgent);

  const commissionRate = effectiveCommissionPercent / 100;
  const exitCommission = targetExitPrice * commissionRate;
  const holdingBondInterest = monthlyBondInterest * holdingPeriodMonths;
  const holdingLeviesAndRates = (monthlyLevies + monthlyRatesTaxes) * holdingPeriodMonths;
  const totalHoldingCosts = holdingBondInterest + holdingLeviesAndRates;
  const monthlyHoldingBurnZAR = Math.round(
    monthlyBondPayment + monthlyLevies + monthlyRatesTaxes + monthlyInsurance + (occupantRisk?.monthlySiteSecurityZAR || 0)
  );

  // Active Bond Exit Friction: Bond Cancellation Legal Fee & 90-Day Early Settlement Penalty
  const hasActiveBond = bondAmount > 0;
  const bondCancellationFeeZAR = !hasActiveBond
    ? 0
    : (providedBondCancellationFee !== undefined && providedBondCancellationFee !== null
        ? providedBondCancellationFee
        : defaultBondCancellationFeeZAR);

  let earlyPenaltyZAR = 0;
  if (hasActiveBond && earlyTerminationNoticeGiven === false) {
    if (providedEarlyPenalty !== undefined && providedEarlyPenalty !== null) {
      earlyPenaltyZAR = Math.max(0, providedEarlyPenalty);
    } else {
      // 90 days bank early settlement interest: bondAmount * (interestRatePercent / 100) * (90 / 365)
      earlyPenaltyZAR = Math.round(bondAmount * (interestRatePercent / 100) * (90 / 365));
    }
  }
  const exitLegalCosts = bondCancellationFeeZAR + earlyPenaltyZAR;

  const totalFlipCosts =
    effectiveTotalAcquisitionCost +
    estimatedRehabCost +
    auctionCosts +
    totalHoldingCosts +
    exitCommission +
    exitLegalCosts +
    totalEvictionBurden;

  const projectedFlipNetProfit = targetExitPrice - totalFlipCosts;
  // Flip ROI denominator (cash invested) includes holding cash requirements alongside Day-1 cash and eviction burn
  const flipCashInvested = initialCapitalRequired + totalHoldingCosts + evictionHoldingBurn;
  const projectedFlipRoi = flipCashInvested > 0
    ? (projectedFlipNetProfit / flipCashInvested) * 100
    : (totalCost > 0 ? (projectedFlipNetProfit / totalCost) * 100 : 0);
  const safeHoldingMonths = holdingPeriodMonths > 0 ? holdingPeriodMonths : 6;
  const annualizedFlipRoi = projectedFlipRoi * (12 / safeHoldingMonths);

  // 4b. 5-Year IRR Calculation
  // Simulate 5-year cashflows + Year 5 disposal proceeds
  const baseValuationForGrowth = effectiveMarketValue > 0 ? effectiveMarketValue : purchasePrice;
  const year5GrossDisposalValue =
    explicitFiveYearExitPriceZAR && explicitFiveYearExitPriceZAR > 0
      ? explicitFiveYearExitPriceZAR
      : Math.round(baseValuationForGrowth * Math.pow(1 + annualCapitalGrowthPercent / 100, 5));

  // Calculate remaining bond balance at end of Year 5 (60 months)
  let remainingBondYear5 = bondAmount;
  const monthlyRate = interestRatePercent > 0 ? (interestRatePercent / 100) / 12 : 0;
  const totalLoanMonths = Math.max(1, loanTermYears * 12);
  let exactPmt = 0;
  if (bondAmount > 0 && monthlyRate > 0) {
    const factor = Math.pow(1 + monthlyRate, totalLoanMonths);
    exactPmt = (bondAmount * (monthlyRate * factor)) / (factor - 1);
  }
  const extraPmt = Number.isFinite(extraMonthlyPaymentZAR)
    ? Math.max(0, extraMonthlyPaymentZAR)
    : 0;

  const annualBondPayments5Y: number[] = [];
  const annualExtraPayments5Y: number[] = [];
  for (let y = 1; y <= 5; y++) {
    let yearBondPaid = 0;
    let yearExtraPaid = 0;
    for (let m = 1; m <= 12; m++) {
      if (remainingBondYear5 <= 0) {
        remainingBondYear5 = 0;
        continue;
      }
      const interest = remainingBondYear5 * monthlyRate;
      const principalPaid = exactPmt - interest;
      if (principalPaid >= remainingBondYear5) {
        yearBondPaid += interest + remainingBondYear5;
        remainingBondYear5 = 0;
      } else {
        remainingBondYear5 -= principalPaid;
        yearBondPaid += exactPmt;

        // Apply voluntary extra principal paydown
        if (extraPmt > 0 && remainingBondYear5 > 0) {
          const applied = Math.min(extraPmt, remainingBondYear5);
          remainingBondYear5 -= applied;
          yearExtraPaid += applied;
        }
      }
    }
    annualBondPayments5Y.push(yearBondPaid);
    annualExtraPayments5Y.push(yearExtraPaid);
  }

  const baseAnnualGrossRent = grossMonthlyRent * 12;
  const baseAnnualOpExAndVacancy = (totalMonthlyOperatingExpenses + vacancyLoss) * 12;
  const irrCashflows: number[] = [-Math.max(1, initialCapitalRequired)];
  for (let y = 1; y <= 5; y++) {
    const yrRent = baseAnnualGrossRent * Math.pow(1 + annualRentalEscalationPercent / 100, y - 1);
    const yrCosts = baseAnnualOpExAndVacancy * Math.pow(1 + annualExpenseInflationPercent / 100, y - 1);
    const yrBond = annualBondPayments5Y[y - 1] ?? 0;
    const yrExtra = annualExtraPayments5Y[y - 1] ?? 0;
    let yrNetCf = yrRent - yrCosts - yrBond - yrExtra;
    if (y === 5) {
      const year5ExitComm = year5GrossDisposalValue * commissionRate;
      const year5BondCancel = remainingBondYear5 > 0
        ? (providedBondCancellationFee !== undefined && providedBondCancellationFee !== null
            ? providedBondCancellationFee
            : defaultBondCancellationFeeZAR)
        : 0;
      const netExitProceeds = year5GrossDisposalValue - year5ExitComm - year5BondCancel - remainingBondYear5;
      yrNetCf += netExitProceeds;
    }
    irrCashflows.push(yrNetCf);
  }
  const fiveYearIrrPercent = initialCapitalRequired > 0 ? solveIrrPercent(irrCashflows) : 0;

  // 5. BRRRR Refinance Cash-Out Metrics
  const brrrrValuationBase = targetExitPrice > 0
    ? targetExitPrice
    : (effectiveMarketValue > 0 ? effectiveMarketValue : purchasePrice);
  const effectiveRefiLtv = refinanceLtvPercent ?? 75;
  const brrrrRefinanceLoanZAR = Math.round(brrrrValuationBase * (effectiveRefiLtv / 100));
  const totalDealAllInOutlay = initialCapitalRequired + bondAmount;
  const brrrrCashLeftInDealZAR = Math.max(0, Math.round(totalDealAllInOutlay - brrrrRefinanceLoanZAR));
  const brrrrEquityExtractedZAR = Math.max(0, Math.round(brrrrRefinanceLoanZAR - totalDealAllInOutlay));
  const brrrrPostRefiBondPaymentZAR = calculateMonthlyBondRepayment(
    brrrrRefinanceLoanZAR,
    interestRatePercent,
    loanTermYears
  );
  const brrrrPostRefiCashflowZAR = Math.round(monthlyNetOperatingIncome - brrrrPostRefiBondPaymentZAR);

  return {
    grossYield: Number(grossYield.toFixed(2)),
    capRate: Number(capRate.toFixed(2)),
    netRoi: Number(netRoi.toFixed(2)),
    monthlyCashFlow: Math.round(monthlyCashFlow),
    monthlyNOI: Math.round(monthlyNetOperatingIncome),
    annualNetOperatingIncome: Math.round(annualNetOperatingIncome),
    totalCashRequired: Math.round(totalCashRequired),
    initialCapitalRequired: Math.round(initialCapitalRequired),
    bondAmount: Math.round(bondAmount),
    cashDeposit: Math.round(cashDeposit),
    monthlyBondPayment: Math.round(monthlyBondPayment),
    projectedFlipNetProfit: Math.round(projectedFlipNetProfit),
    projectedFlipRoi: Number(projectedFlipRoi.toFixed(2)),
    annualizedFlipRoi: Number(annualizedFlipRoi.toFixed(2)),
    monthlyHoldingBurnZAR,
    dscr,
    rawDscr,
    fiveYearIrrPercent,
    purchasePricePerSqm,
    valuationPerSqm,
    averagePricePerUnit,
    rehabCostPerUnit,
    allInCostPerUnit,
    transferDutyZAR: Math.round(transferDutyZAR),
    monthlyPlacementFeeZAR: Math.round(monthlyPlacementFee),
    monthlySpvAdminZAR: Math.round(monthlySpvAdminZAR),
    brrrrRefinanceLoanZAR,
    brrrrCashLeftInDealZAR,
    brrrrEquityExtractedZAR,
    brrrrPostRefiBondPaymentZAR,
    brrrrPostRefiCashflowZAR,
    evictionLegalCostZAR: evictionLegalFee,
    evictionDelayBurnZAR: evictionHoldingBurn,
    totalOccupantCostZAR: totalEvictionBurden,
    exitCommissionZAR: Math.round(exitCommission),
    bondCancellationFeeZAR,
    earlyPenaltyZAR,
    totalExitFrictionZAR: Math.round(exitCommission + exitLegalCosts),
  };
}

export interface BuyBoxEvaluationResult {
  meetsBuyBox: boolean;
  passedCount: number;
  totalCount: number;
  criteriaMap: Record<string, boolean>;
}

/**
 * Strategy-aware evaluation of deal metrics against an InvestorProfile's Buy Box criteria.
 * Evaluates only relevant metrics based on deal.strategy ('Flip' | 'Rental' | 'BRRRR').
 */
export function evaluateDealCriteria(
  metrics: {
    capRate?: number;
    grossYield?: number;
    netRoi?: number;
    monthlyCashFlow?: number;
    initialCapitalRequired?: number;
    totalCashRequired?: number;
    projectedFlipRoi?: number;
    projectedFlipNetProfit?: number;
    dscr?: number | null;
    monthlyBondPayment?: number;
    annualNetOperatingIncome?: number;
  },
  profile: Partial<InvestorProfile>,
  strategy: DealStrategy = 'Rental'
): BuyBoxEvaluationResult {
  const minNetYield = profile.minNetYieldPercent ?? 8.0;
  const minMonthlyCashflow = profile.minMonthlyCashflowZAR ?? 1500;
  const minNetRoi = profile.minNetRoiPercent ?? 8.0;
  const minFlipRoi = profile.minFlipRoiPercent ?? 18.0;
  const maxDay1Cash = profile.maxDay1CashZAR ?? 500000;
  const minDscr = profile.minDscr ?? 1.20;

  // Day-1 Capital Required: missing or undefined critical data should not falsely pass as 0
  const rawDay1Cash = metrics.initialCapitalRequired ?? metrics.totalCashRequired;
  const hasDay1Cash = typeof rawDay1Cash === 'number';
  const day1Cash = hasDay1Cash ? rawDay1Cash : undefined;

  let dscr = metrics.dscr;
  if (dscr === undefined) {
    const bondPayment = metrics.monthlyBondPayment ?? 0;
    if (bondPayment > 0) {
      const noi = metrics.annualNetOperatingIncome !== undefined
        ? metrics.annualNetOperatingIncome / 12
        : (metrics.monthlyCashFlow ?? 0) + bondPayment;
      dscr = noi / bondPayment;
    } else {
      dscr = null;
    }
  }

  const criteriaMap: Record<string, boolean> = {};

  if (strategy === 'Flip') {
    criteriaMap['minFlipRoi'] = (metrics.projectedFlipRoi ?? 0) >= minFlipRoi;
    criteriaMap['maxDay1Cash'] = day1Cash !== undefined ? day1Cash <= maxDay1Cash : false;
  } else {
    // 'Rental' and 'BRRRR'
    criteriaMap['minNetYield'] = (metrics.capRate ?? 0) >= minNetYield;
    criteriaMap['minMonthlyCashflow'] = (metrics.monthlyCashFlow ?? 0) >= minMonthlyCashflow;
    criteriaMap['minNetRoi'] = (metrics.netRoi ?? 0) >= minNetRoi;
    criteriaMap['maxDay1Cash'] = day1Cash !== undefined ? day1Cash <= maxDay1Cash : false;
    // Unleveraged (all-cash) deals where dscr === null or monthlyBondPayment === 0 automatically pass minDscr
    const isUnleveragedCashDeal = dscr === null || metrics.monthlyBondPayment === 0;
    criteriaMap['minDscr'] = isUnleveragedCashDeal ? true : (dscr ?? 0) >= (minDscr - 1e-4);
  }

  const values = Object.values(criteriaMap);
  const totalCount = values.length;
  const passedCount = values.filter(Boolean).length;
  const meetsBuyBox = totalCount > 0 && passedCount === totalCount;

  return {
    meetsBuyBox,
    passedCount,
    totalCount,
    criteriaMap,
  };
}

export interface RentalPropertyMetricsResult {
  grossMonthlyRentZAR: number;
  ancillaryIncomeZAR: number;
  totalGrossIncomeZAR: number;
  monthlyOperatingExpensesZAR: number;
  totalMonthlyExpensesZAR: number;
  monthlyNOI: number;
  annualizedNOI: number;
  annualNetOperatingIncome: number;
  netMonthlyCashflowZAR: number;
  annualNetCashflowZAR: number;
  capRatePercent: number;
  cashOnCashPercent: number;
}

/**
 * Computes monthly agency commission and net cash flow for a rental property
 */
export function calculateRentalCashflow(property: {
  monthlyGrossRentZAR: number;
  monthlyLeviesZAR: number;
  monthlyRatesTaxesZAR: number;
  monthlyMaintenanceReserveZAR: number;
  monthlyBondPaymentZAR: number;
  propertyType?: PropertyTitleType;
  annualBuildingInsuranceZAR?: number;
  managementType?: 'Self-Managed' | 'Agency';
  agencyCommissionPercent?: number;
  agencyVatApplicable?: boolean;
  monthlyAgentFeeZAR?: number;
  unpaidUtilityArrearsZAR?: number;
  leases?: Lease[];
  ancillaryIncomes?: AncillaryIncome[];
  monthlyPrepaidVendingFeeZAR?: number;
  monthlyCommunalServicesZAR?: number;
}): {
  agencyCommissionZAR: number;
  monthlyInsuranceZAR: number;
  monthlyCommunalServicesZAR: number;
  communalServicesZAR: number;
  totalMonthlyExpensesZAR: number;
  unpaidUtilityArrearsZAR: number;
  netMonthlyCashflowZAR: number;
  grossRentZAR: number;
  ancillaryIncomeZAR: number;
  totalGrossIncomeZAR: number;
  monthlyNOI: number;
  annualizedNOI: number;
  annualNetOperatingIncome: number;
} {
  const leaseGross = (property.leases && property.leases.length > 0)
    ? property.leases.filter(l => l.status !== 'Vacant').reduce((sum, l) => sum + (l.monthlyRentZAR || 0), 0)
    : (property.monthlyGrossRentZAR || 0);
  const ancillaryIncomeZAR = (property.ancillaryIncomes || []).reduce((sum, a) => sum + (a.monthlyRentZAR || 0), 0);
  const totalGrossIncomeZAR = leaseGross + ancillaryIncomeZAR;

  let agencyCommissionZAR = 0;

  if (property.managementType === 'Agency') {
    if (typeof property.monthlyAgentFeeZAR === 'number' && property.monthlyAgentFeeZAR > 0) {
      agencyCommissionZAR = Math.round(property.monthlyAgentFeeZAR);
    } else if (typeof property.agencyCommissionPercent === 'number' && property.agencyCommissionPercent > 0) {
      const baseCommission = totalGrossIncomeZAR * (property.agencyCommissionPercent / 100);
      const vatMultiplier = property.agencyVatApplicable !== false ? 1.15 : 1.0;
      agencyCommissionZAR = Math.round(baseCommission * vatMultiplier);
    }
  }

  // Monthly building insurance is applicable specifically for Freehold properties
  const isFreehold = property.propertyType === 'Freehold House';
  const monthlyInsuranceZAR = isFreehold && property.annualBuildingInsuranceZAR
    ? Math.round(property.annualBuildingInsuranceZAR / 12)
    : 0;

  // Freehold properties have 0 body corporate levies
  const effectiveLevies = isFreehold ? 0 : (property.monthlyLeviesZAR || 0);
  const prepaidVendingFee = property.monthlyPrepaidVendingFeeZAR || 0;
  const communalServicesZAR = property.monthlyCommunalServicesZAR || 0;

  const totalMonthlyExpensesZAR =
    effectiveLevies +
    (property.monthlyRatesTaxesZAR || 0) +
    agencyCommissionZAR +
    (property.monthlyMaintenanceReserveZAR || 0) +
    monthlyInsuranceZAR +
    (property.monthlyBondPaymentZAR || 0) +
    prepaidVendingFee +
    communalServicesZAR;

  const unpaidUtilityArrearsZAR = property.unpaidUtilityArrearsZAR || 0;
  const netMonthlyCashflowZAR = totalGrossIncomeZAR - totalMonthlyExpensesZAR;

  // Monthly operating expenses (excluding bond debt service)
  const monthlyOperatingExpensesZAR =
    effectiveLevies +
    (property.monthlyRatesTaxesZAR || 0) +
    agencyCommissionZAR +
    (property.monthlyMaintenanceReserveZAR || 0) +
    monthlyInsuranceZAR +
    prepaidVendingFee +
    communalServicesZAR;
  const monthlyNOI = totalGrossIncomeZAR - monthlyOperatingExpensesZAR;
  const annualizedNOI = monthlyNOI * 12;

  return {
    agencyCommissionZAR,
    monthlyInsuranceZAR,
    monthlyCommunalServicesZAR: communalServicesZAR,
    communalServicesZAR,
    totalMonthlyExpensesZAR,
    unpaidUtilityArrearsZAR,
    netMonthlyCashflowZAR,
    grossRentZAR: leaseGross,
    ancillaryIncomeZAR,
    totalGrossIncomeZAR,
    monthlyNOI,
    annualizedNOI,
    annualNetOperatingIncome: annualizedNOI,
  };
}

/**
 * Computes comprehensive financial metrics for a rental property,
 * including Net Operating Income (NOI), cap rate, debt service, and cash flow.
 */
export function computeRentalPropertyMetrics(property: {
  monthlyGrossRentZAR?: number;
  monthlyLeviesZAR?: number;
  monthlyRatesTaxesZAR?: number;
  monthlyAgentFeeZAR?: number;
  monthlyMaintenanceReserveZAR?: number;
  monthlyBondPaymentZAR?: number;
  monthlyPrepaidVendingFeeZAR?: number;
  monthlyCommunalServicesZAR?: number;
  propertyType?: PropertyTitleType;
  annualBuildingInsuranceZAR?: number;
  managementType?: 'Self-Managed' | 'Agency';
  agencyCommissionPercent?: number;
  agencyVatApplicable?: boolean;
  leases?: Lease[];
  ancillaryIncomes?: AncillaryIncome[];
  marketValueZAR?: number;
  purchasePriceZAR?: number;
}): RentalPropertyMetricsResult {
  const leaseGross = (property.leases && property.leases.length > 0)
    ? property.leases.filter(l => l.status !== 'Vacant').reduce((sum, l) => sum + (l.monthlyRentZAR || 0), 0)
    : (property.monthlyGrossRentZAR || 0);
  const ancillaryIncomeZAR = (property.ancillaryIncomes || []).reduce((sum, a) => sum + (a.monthlyRentZAR || 0), 0);
  const totalGrossIncomeZAR = leaseGross + ancillaryIncomeZAR;

  let agentFee = property.monthlyAgentFeeZAR || 0;
  if (!agentFee && property.managementType === 'Agency' && property.agencyCommissionPercent) {
    const baseComm = totalGrossIncomeZAR * (property.agencyCommissionPercent / 100);
    const vatMult = property.agencyVatApplicable !== false ? 1.15 : 1.0;
    agentFee = Math.round(baseComm * vatMult);
  }

  const isFreehold = property.propertyType === 'Freehold House';
  const insuranceMonthly = isFreehold && property.annualBuildingInsuranceZAR
    ? Math.round(property.annualBuildingInsuranceZAR / 12)
    : 0;
  const effectiveLevies = isFreehold ? 0 : (property.monthlyLeviesZAR || 0);

  const totalMonthlyExpensesZAR =
    (property.monthlyRatesTaxesZAR || 0) +
    effectiveLevies +
    agentFee +
    (property.monthlyMaintenanceReserveZAR || 0) +
    insuranceMonthly +
    (property.monthlyBondPaymentZAR || 0) +
    (property.monthlyPrepaidVendingFeeZAR || 0) +
    (property.monthlyCommunalServicesZAR || 0);

  const monthlyOperatingExpensesZAR =
    (property.monthlyRatesTaxesZAR || 0) +
    effectiveLevies +
    agentFee +
    (property.monthlyMaintenanceReserveZAR || 0) +
    insuranceMonthly +
    (property.monthlyPrepaidVendingFeeZAR || 0) +
    (property.monthlyCommunalServicesZAR || 0);

  const monthlyNOI = totalGrossIncomeZAR - monthlyOperatingExpensesZAR;
  const annualizedNOI = monthlyNOI * 12;
  const netMonthlyCashflowZAR = totalGrossIncomeZAR - totalMonthlyExpensesZAR;
  const annualNetCashflowZAR = netMonthlyCashflowZAR * 12;

  const propertyVal = property.marketValueZAR || property.purchasePriceZAR || 0;
  const capRatePercent = propertyVal > 0 ? (annualizedNOI / propertyVal) * 100 : 0;
  const cashOnCashPercent = propertyVal > 0 ? (annualNetCashflowZAR / propertyVal) * 100 : 0;

  return {
    grossMonthlyRentZAR: leaseGross,
    ancillaryIncomeZAR,
    totalGrossIncomeZAR,
    monthlyOperatingExpensesZAR,
    totalMonthlyExpensesZAR,
    monthlyNOI,
    annualizedNOI,
    annualNetOperatingIncome: annualizedNOI,
    netMonthlyCashflowZAR,
    annualNetCashflowZAR,
    capRatePercent,
    cashOnCashPercent,
  };
}

/**
 * Generates 20/30-year financial, cashflow, and equity projections for an opportunity or rental deal.
 * Simulates standard South African mortgage bond amortization, accurately zeroing out principal at term maturity.
 * Applies compounding escalations to rent and expenses.
 */
export function generateLongTermProjection(
  deal: Partial<OpportunityDeal> & {
    purchasePrice?: number;
    openMarketValueZAR?: number;
    depositZAR?: number;
    loanToValuePercent?: number;
    bondLTV?: number;
    interestRatePercent?: number;
    loanTermYears?: number;
    bondTermYears?: number;
    annualCapitalGrowthPercent?: number;
    annualRentalEscalationPercent?: number;
    annualExpenseInflationPercent?: number;
    monthlyRentalEstimate?: number;
    monthlyLevies?: number;
    monthlyRatesTaxes?: number;
    annualInsurance?: number;
    managementFeePercent?: number;
    agencyVatApplicable?: boolean;
    vacancyRatePercent?: number;
    monthlyCommunalServicesZAR?: number;
    monthlyMaintenanceReserveZAR?: number;
    monthlyPrepaidVendingFeeZAR?: number;
    tenantPlacementFeePercent?: number;
    annualSpvAdminAuditFeeZAR?: number;
    extraMonthlyPaymentZAR?: number;
  }
): LongTermProjectionYear[] {
  const purchasePrice = deal.purchasePrice ?? 0;
  const openMarketValue =
    deal.openMarketValueZAR && deal.openMarketValueZAR > 0
      ? deal.openMarketValueZAR
      : purchasePrice;

  // Financed principal
  let cashDeposit = 0;
  if (deal.depositZAR !== undefined) {
    cashDeposit = deal.depositZAR;
  } else if (deal.bondLTV !== undefined) {
    cashDeposit = Math.round(purchasePrice * (1 - deal.bondLTV / 100));
  } else if (deal.loanToValuePercent !== undefined) {
    cashDeposit = Math.round(purchasePrice * (1 - deal.loanToValuePercent / 100));
  }
  const bondPrincipal = Math.max(0, purchasePrice - cashDeposit);

  const interestRate = deal.interestRatePercent ?? 11.75;
  const termYears = deal.bondTermYears || deal.loanTermYears || 20;
  const capitalGrowth = deal.annualCapitalGrowthPercent ?? 5.0;
  const rentEscalation = deal.annualRentalEscalationPercent ?? 6.0;
  const expenseInflation = deal.annualExpenseInflationPercent ?? 6.0;

  // Monthly bond payment
  const monthlyRate = interestRate > 0 ? (interestRate / 100) / 12 : 0;
  const totalMonths = termYears * 12;
  let pmt = 0;
  if (bondPrincipal > 0 && monthlyRate > 0 && totalMonths > 0) {
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    pmt = (bondPrincipal * (monthlyRate * factor)) / (factor - 1);
  }

  const extra = Number.isFinite(deal.extraMonthlyPaymentZAR)
    ? Math.max(0, deal.extraMonthlyPaymentZAR!)
    : 0;

  // Simulate month-by-month bond amortization schedule
  let currentBalance = bondPrincipal;
  const balancesAtEndOfYear: number[] = [];
  const annualBondPayments: number[] = [];
  const annualExtraPrincipal: number[] = [];
  const annualInterest: number[] = [];

  for (let y = 1; y <= termYears; y++) {
    let yearPayments = 0;
    let yearExtra = 0;
    let yearInterest = 0;
    for (let m = 1; m <= 12; m++) {
      if (currentBalance <= 0) {
        currentBalance = 0;
        continue;
      }
      const interest = currentBalance * monthlyRate;
      yearInterest += interest;
      const principalPaid = pmt - interest;

      // Final month of loan or principal exceeds remaining balance
      if (y === termYears && m === 12) {
        yearPayments += interest + currentBalance;
        currentBalance = 0;
      } else if (principalPaid >= currentBalance) {
        yearPayments += interest + currentBalance;
        currentBalance = 0;
      } else {
        currentBalance -= principalPaid;
        yearPayments += pmt;

        // Apply voluntary extra monthly payment strictly against principal balance
        if (extra > 0 && currentBalance > 0) {
          const applied = Math.min(extra, currentBalance);
          currentBalance -= applied;
          yearExtra += applied;
        }
      }
    }
    if (y === termYears) {
      currentBalance = 0;
    }
    balancesAtEndOfYear.push(Math.round(currentBalance));
    annualBondPayments.push(Math.round(yearPayments));
    annualExtraPrincipal.push(Math.round(yearExtra));
    annualInterest.push(Math.round(yearInterest));
  }

  // Baseline Annual Rental and Operating Costs
  const monthlyRent = deal.monthlyRentalEstimate ?? 0;
  const vacancyRate = deal.vacancyRatePercent ?? 5;
  const vacancyLoss = (monthlyRent * vacancyRate) / 100;
  const vatMultiplier = deal.agencyVatApplicable !== false ? 1.15 : 1.0;
  const managementFee = (monthlyRent * ((deal.managementFeePercent ?? 8) / 100)) * vatMultiplier;
  const placementFee = (monthlyRent * ((deal.tenantPlacementFeePercent ?? 0) / 100)) * vatMultiplier;
  const monthlySpvAdmin = (deal.annualSpvAdminAuditFeeZAR ?? 0) / 12;
  const monthlyInsurance = (deal.annualInsurance ?? 7_200) / 12;
  const monthlyLevies = deal.monthlyLevies ?? 0;
  const monthlyRates = deal.monthlyRatesTaxes ?? 0;
  const monthlyCommunal = deal.monthlyCommunalServicesZAR ?? 0;
  const monthlyMaintenance = deal.monthlyMaintenanceReserveZAR ?? 0;
  const monthlyVending = deal.monthlyPrepaidVendingFeeZAR ?? 0;

  const totalMonthlyCosts =
    monthlyLevies +
    monthlyRates +
    managementFee +
    placementFee +
    monthlySpvAdmin +
    monthlyInsurance +
    vacancyLoss +
    monthlyCommunal +
    monthlyMaintenance +
    monthlyVending;

  const baseAnnualRent = monthlyRent * 12;
  const baseAnnualCosts = totalMonthlyCosts * 12;

  const projections: LongTermProjectionYear[] = [];

  for (let y = 1; y <= termYears; y++) {
    const escalatedRent = Math.round(baseAnnualRent * Math.pow(1 + rentEscalation / 100, y - 1));
    const escalatedCosts = Math.round(baseAnnualCosts * Math.pow(1 + expenseInflation / 100, y - 1));
    const bondPayment = annualBondPayments[y - 1] ?? 0;
    const extraPrincipalPaid = annualExtraPrincipal[y - 1] ?? 0;

    // Section 11(a) integrity: costs remains strictly operating OpEx (untainted by extra capital).
    // netCashflow accounts for real cash outlay (rent - costs - contractual bond - voluntary extra principal).
    const netCashflow = escalatedRent - escalatedCosts - bondPayment - extraPrincipalPaid;

    const propertyValue = Math.round(openMarketValue * Math.pow(1 + capitalGrowth / 100, y));
    const outstandingBond = balancesAtEndOfYear[y - 1] ?? 0;
    const netEquity = Math.max(0, propertyValue - outstandingBond);

    projections.push({
      year: y,
      rent: escalatedRent,
      costs: escalatedCosts,
      bondPayment,
      netCashflow,
      propertyValue,
      outstandingBond,
      netEquity,
      ...(extra > 0 ? { extraPrincipalPaid, interestPaid: annualInterest[y - 1] ?? 0 } : {}),
    });
  }

  return projections;
}

/**
 * Adapts an existing RentalProperty into the 20-year Long-Term Projection engine.
 * Applies standard South African defaults:
 * - 5% annual capital growth
 * - 6% annual rental escalation (or property.annualEscalationPercent)
 * - 6% annual expense inflation
 * - 20-year term
 * - Accurate bond amortization starting strictly from property.outstandingBondBalanceZAR
 */
export function generateRentalLongTermProjection(property: RentalProperty): LongTermProjectionYear[] {
  const purchasePrice = property.marketValueZAR || property.purchasePriceZAR || 0;
  const currentBond = property.outstandingBondBalanceZAR ?? 0;
  const effectivePrice = Math.max(purchasePrice, currentBond);
  const depositZAR = Math.max(0, effectivePrice - currentBond);

  const grossRent = property.monthlyGrossRentZAR || 0;
  let agencyFeeMonthly = 0;
  if (property.managementType === 'Agency') {
    if (typeof property.monthlyAgentFeeZAR === 'number' && property.monthlyAgentFeeZAR > 0) {
      agencyFeeMonthly = property.monthlyAgentFeeZAR;
    } else if (typeof property.agencyCommissionPercent === 'number' && property.agencyCommissionPercent > 0) {
      const baseCommission = grossRent * (property.agencyCommissionPercent / 100);
      const vatMultiplier = property.agencyVatApplicable !== false ? 1.15 : 1.0;
      agencyFeeMonthly = baseCommission * vatMultiplier;
    }
  }

  const managementFeePercent = grossRent > 0 ? (agencyFeeMonthly / grossRent) * 100 : 0;
  const isFreehold = property.propertyType === 'Freehold House';
  const monthlyLevies = isFreehold ? 0 : (property.monthlyLeviesZAR || 0);
  const monthlyRatesTaxes = property.monthlyRatesTaxesZAR || 0;
  const annualInsurance = isFreehold ? (property.annualBuildingInsuranceZAR || 0) : 0;

  return generateLongTermProjection({
    purchasePrice: effectivePrice,
    openMarketValueZAR: property.marketValueZAR || property.purchasePriceZAR || 0,
    depositZAR,
    interestRatePercent: property.bondInterestRatePercent || 11.75,
    bondTermYears: property.loanTermYears ?? 20,
    annualCapitalGrowthPercent: 5.0,
    annualRentalEscalationPercent: property.leases?.[0]?.annualEscalationPercent || 6.0,
    annualExpenseInflationPercent: 6.0,
    monthlyRentalEstimate: grossRent,
    monthlyLevies,
    monthlyRatesTaxes,
    annualInsurance,
    managementFeePercent,
    vacancyRatePercent: property.status === 'Vacant' ? 10 : 0,
    monthlyMaintenanceReserveZAR: property.monthlyMaintenanceReserveZAR || 0,
    monthlyPrepaidVendingFeeZAR: property.monthlyPrepaidVendingFeeZAR || 0,
    monthlyCommunalServicesZAR: property.monthlyCommunalServicesZAR || 0,
    extraMonthlyPaymentZAR: property.extraMonthlyPaymentZAR,
  });
}

export interface PaydownImpact {
  scheduledMonths: number;
  acceleratedMonths: number;
  monthsSaved: number;
  interestScheduled: number;
  interestAccelerated: number;
  interestSaved: number;
  refiReadyYearScheduled: number | null; // first year-end where balance <= value * refiLtv
  refiReadyYearAccelerated: number | null;
}

/**
 * Calculates comparative paydown metrics between scheduled mortgage amortization
 * and accelerated voluntary extra principal injections (months saved, interest saved,
 * and BRRRR refinance eligibility milestone acceleration).
 */
export function calculatePaydownImpact(params: {
  principal: number;
  annualRatePercent: number;
  termYears: number;
  extraMonthlyPaymentZAR: number;
  startPropertyValue: number;
  annualGrowthPercent: number;
  refinanceLtvPercent?: number; // default 75
}): PaydownImpact {
  const {
    principal,
    annualRatePercent,
    termYears,
    extraMonthlyPaymentZAR,
    startPropertyValue,
    annualGrowthPercent,
    refinanceLtvPercent = 75,
  } = params;

  if (principal <= 0 || annualRatePercent <= 0 || termYears <= 0) {
    return {
      scheduledMonths: 0,
      acceleratedMonths: 0,
      monthsSaved: 0,
      interestScheduled: 0,
      interestAccelerated: 0,
      interestSaved: 0,
      refiReadyYearScheduled: null,
      refiReadyYearAccelerated: null,
    };
  }

  const monthlyRate = (annualRatePercent / 100) / 12;
  const totalMonths = termYears * 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const pmt = (principal * (monthlyRate * factor)) / (factor - 1);
  const extra = Math.max(0, extraMonthlyPaymentZAR || 0);

  // 1. Scheduled run
  let balSched = principal;
  let interestSched = 0;
  let monthsSched = 0;
  let refiYearSched: number | null = null;

  for (let m = 1; m <= totalMonths; m++) {
    if (balSched <= 0) break;
    const interest = balSched * monthlyRate;
    interestSched += interest;
    const principalPaid = pmt - interest;
    if (m === totalMonths || principalPaid >= balSched) {
      balSched = 0;
    } else {
      balSched -= principalPaid;
    }
    monthsSched = m;

    if (m % 12 === 0 && refiYearSched === null) {
      const yearIndex = m / 12;
      const propVal = startPropertyValue * Math.pow(1 + annualGrowthPercent / 100, yearIndex);
      const targetDebtCap = propVal * (refinanceLtvPercent / 100);
      if (balSched <= targetDebtCap) {
        refiYearSched = yearIndex;
      }
    }
  }

  // 2. Accelerated run
  let balAccel = principal;
  let interestAccel = 0;
  let monthsAccel = 0;
  let refiYearAccel: number | null = null;

  for (let m = 1; m <= totalMonths; m++) {
    if (balAccel <= 0) break;
    const interest = balAccel * monthlyRate;
    interestAccel += interest;
    const principalPaid = pmt - interest;
    if (m === totalMonths || principalPaid >= balAccel) {
      balAccel = 0;
    } else {
      balAccel -= principalPaid;
      if (extra > 0 && balAccel > 0) {
        const applied = Math.min(extra, balAccel);
        balAccel -= applied;
      }
    }
    monthsAccel = m;

    if (m % 12 === 0 && refiYearAccel === null) {
      const yearIndex = m / 12;
      const propVal = startPropertyValue * Math.pow(1 + annualGrowthPercent / 100, yearIndex);
      const targetDebtCap = propVal * (refinanceLtvPercent / 100);
      if (balAccel <= targetDebtCap) {
        refiYearAccel = yearIndex;
      }
    }
  }

  // If already <= refi LTV at day 1
  if (principal <= startPropertyValue * (refinanceLtvPercent / 100)) {
    refiYearSched = 0;
    refiYearAccel = 0;
  }

  return {
    scheduledMonths: monthsSched,
    acceleratedMonths: monthsAccel,
    monthsSaved: Math.max(0, monthsSched - monthsAccel),
    interestScheduled: Math.round(interestSched),
    interestAccelerated: Math.round(interestAccel),
    interestSaved: Math.max(0, Math.round(interestSched - interestAccel)),
    refiReadyYearScheduled: refiYearSched,
    refiReadyYearAccelerated: refiYearAccel,
  };
}



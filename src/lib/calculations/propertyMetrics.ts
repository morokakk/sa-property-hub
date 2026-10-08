import { AcquisitionCostBreakdown, AmenityDistance, AmenityScorecard, AncillaryIncome, DealStrategy, InvestorProfile, Lease, LongTermProjectionYear, OpportunityDeal, PropertyTitleType, RentalProperty } from '@/types';

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
  dscr: number;
  rawDscr: number;
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

  const levies = deal.propertyType === 'Freehold House' ? 0 : (deal.monthlyLevies || 0);
  const rates = deal.monthlyRatesTaxes || 0;
  const insurance = Math.round((deal.annualInsurance || 0) / 12);
  const maintenance = deal.monthlyMaintenanceReserveZAR ?? 0;
  const vending = deal.monthlyPrepaidVendingFeeZAR ?? 0;
  const communal = deal.monthlyCommunalServicesZAR ?? 0;

  const operatingExpenses = levies + rates + agentMgt + insurance + maintenance + vending + communal;
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
    : (monthlyNoi > 0 ? 99.0 : 0);
  const dscr = monthlyBondPayment > 0
    ? Number(rawDscr.toFixed(2))
    : (monthlyNoi > 0 ? 99.0 : 0);

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

export interface OpportunityMetricsResult {
  grossYield: number;
  capRate: number;
  netRoi: number;
  monthlyCashFlow: number;
  annualNetOperatingIncome: number;
  totalCashRequired: number;
  initialCapitalRequired: number;
  bondAmount: number;
  cashDeposit: number;
  monthlyBondPayment: number;
  projectedFlipNetProfit: number;
  projectedFlipRoi: number;
  dscr: number;
  rawDscr?: number;
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
  purchasePrice: number;
  estimatedRehabCost: number;
  monthlyRentalEstimate: number;
  monthlyLevies: number;
  monthlyRatesTaxes: number;
  annualInsurance: number;
  managementFeePercent: number;
  agencyVatApplicable?: boolean;
  monthlyMaintenanceReserveZAR?: number;
  monthlyPrepaidVendingFeeZAR?: number;
  monthlyCommunalServicesZAR?: number;
  vacancyRatePercent: number;
  targetExitPrice: number;
  holdingPeriodMonths: number;
  loanToValuePercent: number;
  depositZAR?: number;
  bondLTV?: number;
  interestRatePercent: number;
  interestRateMargin?: number;
  loanTermYears: number;
  costs: AcquisitionCostBreakdown;
  auctioneerCommissionZAR?: number;
  municipalArrearsZAR?: number;
  exitCommissionPercent?: number;
  defaultAgentCommissionPercent?: number;
  vatExemptAgent?: boolean;
}): OpportunityMetricsResult {
  const {
    purchasePrice,
    estimatedRehabCost,
    monthlyRentalEstimate,
    monthlyLevies,
    monthlyRatesTaxes,
    annualInsurance,
    managementFeePercent,
    agencyVatApplicable,
    monthlyMaintenanceReserveZAR,
    monthlyPrepaidVendingFeeZAR,
    monthlyCommunalServicesZAR,
    vacancyRatePercent,
    targetExitPrice,
    holdingPeriodMonths,
    loanToValuePercent,
    depositZAR,
    bondLTV,
    interestRatePercent,
    interestRateMargin,
    loanTermYears,
    costs,
    auctioneerCommissionZAR,
    municipalArrearsZAR,
    exitCommissionPercent,
    defaultAgentCommissionPercent = 5.0,
    vatExemptAgent = false,
  } = params;

  // Effective LTV and Deposit
  const effectiveLTV = bondLTV !== undefined ? bondLTV : loanToValuePercent;
  const cashDeposit =
    depositZAR !== undefined
      ? depositZAR
      : Math.round(purchasePrice * (1 - effectiveLTV / 100));

  // Financed principal must strictly equal purchasePrice - cashDeposit
  const bondAmount = Math.max(0, purchasePrice - cashDeposit);

  // Auction & Distressed Municipal Outlays
  const auctionCosts = (auctioneerCommissionZAR || 0) + (municipalArrearsZAR || 0);

  // Total Capital Outlay & Day-1 Initial Capital Required
  const totalCost = costs.totalAcquisitionCost + estimatedRehabCost + auctionCosts;
  const cashFees = costs.totalAcquisitionCost - purchasePrice;
  const initialCapitalRequired = cashDeposit + cashFees + estimatedRehabCost + auctionCosts;
  const totalCashRequired = initialCapitalRequired;

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
  const vatMultiplier = agencyVatApplicable !== false ? 1.15 : 1.0;
  const managementFee = (grossMonthlyRent * (managementFeePercent / 100)) * vatMultiplier;
  const monthlyInsurance = annualInsurance / 12;
  const totalMonthlyOperatingExpenses =
    monthlyLevies + 
    monthlyRatesTaxes + 
    managementFee + 
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

  // Debt Service Coverage Ratio (DSCR): Monthly NOI / Monthly Bond Repayment
  const rawDscr = monthlyBondPayment > 0
    ? (monthlyNetOperatingIncome / monthlyBondPayment)
    : (monthlyNetOperatingIncome > 0 ? 99.0 : 0);
  const dscr = monthlyBondPayment > 0
    ? Number(rawDscr.toFixed(2))
    : (monthlyNetOperatingIncome > 0 ? 99.0 : 0);

  // Buy-and-Flip Projections
  // Apply 15% SARS VAT (1.15 multiplier) to default agent commission unless vatExemptAgent is explicitly true
  const effectiveCommissionPercent =
    typeof exitCommissionPercent === 'number'
      ? exitCommissionPercent
      : calculateEffectiveExitCommission(defaultAgentCommissionPercent, vatExemptAgent);

  const commissionRate = effectiveCommissionPercent / 100;
  const exitCommission = targetExitPrice * commissionRate;
  // Holding bond cost reflects bond interest only (not double-counting principal repayment)
  const monthlyBondInterest = bondAmount > 0 ? (bondAmount * (interestRatePercent / 100 / 12)) : 0;
  const holdingBondInterest = monthlyBondInterest * holdingPeriodMonths;
  const holdingLeviesAndRates = (monthlyLevies + monthlyRatesTaxes) * holdingPeriodMonths;
  const totalHoldingCosts = holdingBondInterest + holdingLeviesAndRates;

  const totalFlipCosts =
    costs.totalAcquisitionCost +
    estimatedRehabCost +
    auctionCosts +
    totalHoldingCosts +
    exitCommission;

  const projectedFlipNetProfit = targetExitPrice - totalFlipCosts;
  // Flip ROI denominator (cash invested) includes holding cash requirements alongside Day-1 cash
  const flipCashInvested = initialCapitalRequired + totalHoldingCosts;
  const projectedFlipRoi = flipCashInvested > 0
    ? (projectedFlipNetProfit / flipCashInvested) * 100
    : (totalCost > 0 ? (projectedFlipNetProfit / totalCost) * 100 : 0);

  return {
    grossYield: Number(grossYield.toFixed(2)),
    capRate: Number(capRate.toFixed(2)),
    netRoi: Number(netRoi.toFixed(2)),
    monthlyCashFlow: Math.round(monthlyCashFlow),
    annualNetOperatingIncome: Math.round(annualNetOperatingIncome),
    totalCashRequired: Math.round(totalCashRequired),
    initialCapitalRequired: Math.round(initialCapitalRequired),
    bondAmount: Math.round(bondAmount),
    cashDeposit: Math.round(cashDeposit),
    monthlyBondPayment: Math.round(monthlyBondPayment),
    projectedFlipNetProfit: Math.round(projectedFlipNetProfit),
    projectedFlipRoi: Number(projectedFlipRoi.toFixed(2)),
    dscr,
    rawDscr,
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
    dscr?: number;
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
      dscr = 99.0;
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
    criteriaMap['minDscr'] = (dscr ?? 0) >= (minDscr - 1e-4);
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

  // Simulate month-by-month bond amortization schedule
  let currentBalance = bondPrincipal;
  const balancesAtEndOfYear: number[] = [];
  const annualBondPayments: number[] = [];

  for (let y = 1; y <= termYears; y++) {
    let yearPayments = 0;
    for (let m = 1; m <= 12; m++) {
      if (currentBalance <= 0) {
        currentBalance = 0;
        continue;
      }
      const interest = currentBalance * monthlyRate;
      const principalPaid = pmt - interest;

      // Final month of loan or principal exceeds remaining balance
      if (y === termYears && m === 12) {
        yearPayments += interest + currentBalance;
        currentBalance = 0;
      } else if (principalPaid > currentBalance) {
        yearPayments += interest + currentBalance;
        currentBalance = 0;
      } else {
        currentBalance -= principalPaid;
        yearPayments += pmt;
      }
    }
    if (y === termYears) {
      currentBalance = 0;
    }
    balancesAtEndOfYear.push(Math.round(currentBalance));
    annualBondPayments.push(Math.round(yearPayments));
  }

  // Baseline Annual Rental and Operating Costs
  const monthlyRent = deal.monthlyRentalEstimate ?? 0;
  const vacancyRate = deal.vacancyRatePercent ?? 5;
  const vacancyLoss = (monthlyRent * vacancyRate) / 100;
  const vatMultiplier = deal.agencyVatApplicable !== false ? 1.15 : 1.0;
  const managementFee = (monthlyRent * ((deal.managementFeePercent ?? 8) / 100)) * vatMultiplier;
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
    const netCashflow = escalatedRent - escalatedCosts - bondPayment;

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
    bondTermYears: 20,
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
  });
}



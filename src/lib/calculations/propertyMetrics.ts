import { AcquisitionCostBreakdown, AmenityDistance, AmenityScorecard, LongTermProjectionYear, OpportunityDeal, PropertyTitleType, RentalProperty } from '@/types';

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
  initialCapitalRequired: number;
  bondAmount: number;
  cashDeposit: number;
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
  agencyVatApplicable?: boolean;
  vacancyRatePercent: number;
  targetExitPrice: number;
  holdingPeriodMonths: number;
  loanToValuePercent: number;
  depositZAR?: number;
  bondLTV?: number;
  interestRatePercent: number;
  loanTermYears: number;
  costs: AcquisitionCostBreakdown;
  auctioneerCommissionZAR?: number;
  municipalArrearsZAR?: number;
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
    vacancyRatePercent,
    targetExitPrice,
    holdingPeriodMonths,
    loanToValuePercent,
    depositZAR,
    bondLTV,
    interestRatePercent,
    loanTermYears,
    costs,
    auctioneerCommissionZAR,
    municipalArrearsZAR,
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
    auctionCosts +
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
    initialCapitalRequired: Math.round(initialCapitalRequired),
    bondAmount: Math.round(bondAmount),
    cashDeposit: Math.round(cashDeposit),
    monthlyBondPayment: Math.round(monthlyBondPayment),
    projectedFlipNetProfit: Math.round(projectedFlipNetProfit),
    projectedFlipRoi: Number(projectedFlipRoi.toFixed(2)),
  };
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
}): {
  agencyCommissionZAR: number;
  monthlyInsuranceZAR: number;
  totalMonthlyExpensesZAR: number;
  unpaidUtilityArrearsZAR: number;
  netMonthlyCashflowZAR: number;
} {
  const gross = property.monthlyGrossRentZAR || 0;
  let agencyCommissionZAR = 0;

  if (property.managementType === 'Agency') {
    if (typeof property.monthlyAgentFeeZAR === 'number' && property.monthlyAgentFeeZAR > 0) {
      agencyCommissionZAR = Math.round(property.monthlyAgentFeeZAR);
    } else if (typeof property.agencyCommissionPercent === 'number' && property.agencyCommissionPercent > 0) {
      const baseCommission = gross * (property.agencyCommissionPercent / 100);
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

  const totalMonthlyExpensesZAR =
    effectiveLevies +
    (property.monthlyRatesTaxesZAR || 0) +
    agencyCommissionZAR +
    (property.monthlyMaintenanceReserveZAR || 0) +
    monthlyInsuranceZAR +
    (property.monthlyBondPaymentZAR || 0);

  const unpaidUtilityArrearsZAR = property.unpaidUtilityArrearsZAR || 0;
  const netMonthlyCashflowZAR = gross - totalMonthlyExpensesZAR - unpaidUtilityArrearsZAR;

  return {
    agencyCommissionZAR,
    monthlyInsuranceZAR,
    totalMonthlyExpensesZAR,
    unpaidUtilityArrearsZAR,
    netMonthlyCashflowZAR,
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

  const totalMonthlyCosts = monthlyLevies + monthlyRates + managementFee + monthlyInsurance + vacancyLoss;

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
  const monthlyLevies = (isFreehold ? 0 : (property.monthlyLeviesZAR || 0)) + (property.monthlyMaintenanceReserveZAR || 0);
  const monthlyRatesTaxes = property.monthlyRatesTaxesZAR || 0;
  const annualInsurance = isFreehold ? (property.annualBuildingInsuranceZAR || 0) : 0;

  return generateLongTermProjection({
    purchasePrice: effectivePrice,
    openMarketValueZAR: property.marketValueZAR || property.purchasePriceZAR || 0,
    depositZAR,
    interestRatePercent: property.bondInterestRatePercent || 11.75,
    bondTermYears: 20,
    annualCapitalGrowthPercent: 5.0,
    annualRentalEscalationPercent: property.annualEscalationPercent || 6.0,
    annualExpenseInflationPercent: 6.0,
    monthlyRentalEstimate: grossRent,
    monthlyLevies,
    monthlyRatesTaxes,
    annualInsurance,
    managementFeePercent,
    vacancyRatePercent: property.status === 'Vacant' ? 10 : 0,
  });
}



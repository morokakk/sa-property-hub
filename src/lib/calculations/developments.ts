/**
 * South African Property Portfolio Hub — Pure Calculations Engine: Developments
 * Tier 4 Pure Engine: 100% deterministic, side-effect-free math.
 * Zero imports from React, Next.js, or Zustand store slices.
 * Strictly adheres to ARCHITECTURE.md Separation of Concerns.
 */

import {
  ApprovalStatus,
  DevelopmentProject,
  DevelopmentSoftCosts,
  DevelopmentUnit,
  DevUnitStatus,
  DevelopmentTaxEntityType,
  PreConstructionApprovals,
  CustomNodeBenchmarkOverride,
} from '@/types';
import { formatZAR } from '@/lib/formatters';
import {
  findInvestmentNode,
  getEffectiveNodeBenchmarks,
} from '@/lib/constants/investmentNodes';
import {
  calculateDelaySensitivityMatrix,
  DelaySensitivityMatrixResult,
} from './holdingSensitivity';

export interface BankReadinessPillar {
  met: boolean;
  statusLabel: string;
  details: string;
}

export interface DevelopmentBankReadinessSummary {
  paperRights: BankReadinessPillar;
  qsAndGeotech: BankReadinessPillar;
  preSalesGate: BankReadinessPillar;
  deliveryTrackRecord: BankReadinessPillar & { partnerOrEntity: string; isJvPartnerBacked: boolean };
  overallBankable: boolean;
}

export interface DevelopmentFinancialSummary {
  // Cost Stack Breakdowns
  totalLandAndAcquisitionZAR: number;
  totalSoftCostsZAR: number;
  budgetedHardBuildCostZAR: number;
  actualBoqSpendZAR: number;
  activeHardBuildCostZAR: number;
  contingencyReserveZAR: number;

  // Carrying & Holding Costs
  totalPreApprovalCarryingCostZAR: number;
  totalConstructionCarryingCostZAR: number;
  totalCarryingCostZAR: number;

  // Total Development Cost (TDC)
  tdcZAR: number;
  tdcPerSqmZAR: number;
  tdcPerUnitZAR: number;

  // Gross Development Value (GDV) & SARS VAT
  totalUnitsCount: number;
  gdvInclVatZAR: number;
  isVatRegisteredDeveloper: boolean;
  outputVatZAR: number;
  claimableInputVatZAR: number;
  netRealizableGdvZAR: number;

  // Profitability & Tax
  netProfitBeforeTaxZAR: number;
  pocPercent: number;
  taxEntityType: DevelopmentTaxEntityType;
  effectiveTaxRatePercent: number;
  estimatedTaxProvisionZAR: number;
  netProfitAfterTaxZAR: number;
  afterTaxPocPercent: number;

  // Pre-Sales Hurdle & Debt Wipeout
  preSoldUnitsCount: number;
  preSoldGdvZAR: number;
  preSoldGdvPercent: number;
  preSalesHurdlePercent: number;
  isPreSalesHurdleMet: boolean;
  outstandingDevFacilityZAR: number;
  avgUnitListPriceZAR: number;
  unitsRequiredForDebtWipeout: number;

  // Hybrid Split-Exit Metrics
  unitsForSaleCount: number;
  unitsRetainedCount: number;
  unitsSoldAndTransferredCount: number;
  totalSoldProceedsZAR: number;
  netSalesProceedsAfterDebtZAR: number;
  netCashProceedsAfterDebtZAR: number; // Bidirectional alias for netSalesProceedsAfterDebtZAR
  remainingDebtOnRetainedUnitsZAR: number; // "Free-Carry" metric (R 0 = 100% debt-free)
  retainedMonthlyGrossRentZAR: number;
  retainedAnnualGrossRentZAR: number;
  projectedSalesGdvZAR: number;
  isSection13SexEligible: boolean; // >= 5 units retained for rental
  section13sexDeductionBaseZAR: number; // 55% of cost basis
  section13sexAnnualAllowanceZAR: number; // 5% of deduction base

  // --- NEW FIELDS FOR ZERO INLINE MATH REMEDIATION ---
  /** Actual BOQ construction spend per square meter of buildable area */
  actualBoqSpendPerSqmZAR: number;
  /** Percentage of Total Development Cost represented by professional & municipal soft costs */
  softCostsPercentOfTdc: number;
  /** Combined carrying burn and contingency buffer reserve */
  totalHoldingAndContingencyZAR: number;
  /** Undrawn available facility capacity: max(0, limit - drawn) */
  availableFacilityUndrawnZAR: number;
  /** Hurdle progress clamped between 0 and 100% */
  preSalesHurdleProgressRatioPercent: number;
  /** Senior loan repayment percentage against drawn facility */
  debtFacilityRepaidPercent: number;
  /** Units remaining after fully extinguishing senior debt */
  unencumberedUnitsCount: number;
  /** Total sum of all sectional title units' floor areas in m² */
  totalFloorAreaSqm: number;
  /** Total allocated cost basis across all recorded units */
  totalAllocatedCostBasisZAR: number;
  /** Total gross monthly rent across all units */
  totalMonthlyEstimatedRentZAR: number;
  /** Additional units needed to satisfy Section 13sex 5-unit threshold */
  unitsNeededForSection13Sex: number;
  /** Land & Acquisition cost as percentage of Total Development Cost */
  landPercentOfTdc: number;
  /** Active Hard Construction cost as percentage of Total Development Cost */
  hardBuildPercentOfTdc: number;
  /** Total carrying holding burn as percentage of Total Development Cost */
  carryingCostPercentOfTdc: number;
  /** Contingency reserve buffer as percentage of Total Development Cost */
  contingencyPercentOfTdc: number;
  /** Gross Development Value multiple over TDC: (gdvInclVat / tdc) */
  gdvToTdcMultiple: number;
  /** 20-Year cumulative SARS Section 13sex tax shield: 20 * annualAllowance */
  section13sexTwentyYearSavingsZAR: number;

  // --- SOUTH AFRICAN BANKABILITY & GUARDRAIL METRICS ---
  /** Land Purchase Price per planned unit */
  landCostPerUnitZAR: number;
  /** Land Purchase Price as percentage of GDV (incl VAT) */
  landToGdvPercent: number;
  /** Elevated land cost flag (> R60,000 for Township Infill, or > 25% GDV for other developments) */
  isLandCostElevated: boolean;
  /** Land Availability Agreement / Land JV mode (land deferred from Day-1 equity to unit transfers) */
  isDeferredLandPaymentLAA: boolean;
  /** Senior Co-Developer / JV Partner name for institutional track record (optional) */
  seniorJvPartnerName?: string;
  /** Day-1 sponsor equity cash outlay (excludes landPurchasePriceZAR when isDeferredLandPaymentLAA is active) */
  day1EquityOutlayZAR: number;
  /** Land payment liability settled pro-rata at unit transfers out of gross exit proceeds */
  deferredLandPayableAtExitZAR: number;
  /** Node-derived suburb end-user bond ceiling (R/m² midpoint × avg unit sqm, or R 800,000 fallback) */
  suburbEndUserBondCeilingZAR: number;
  /** Whether average unit selling price falls comfortably within bank retail mortgage ceiling (<= ceiling * 1.05) */
  isWithinEndUserBondCeiling: boolean;
  /** 4-Pillar South African Commercial Bank Readiness Checklist */
  bankReadiness: DevelopmentBankReadinessSummary;
}

const PRE_SOLD_STATUSES: ReadonlySet<DevUnitStatus> = new Set<DevUnitStatus>([
  'Reserved (OTP Signed)',
  'Bond Approved / Guarantees Issued',
  'Sold & Transferred',
]);

/**
 * Aggregates itemized professional fees, municipal contributions, and soft costs.
 * Strictly obeys the zero-override guard: explicit 0 is a valid override and not replaced.
 */
export function calculateDevelopmentSoftCostsTotal(
  softCosts?: DevelopmentSoftCosts | null
): number {
  if (!softCosts) return 0;

  const costKeys: (keyof DevelopmentSoftCosts)[] = [
    'townPlannerZAR',
    'architectZAR',
    'structuralCivilEngineerZAR',
    'quantitySurveyorZAR',
    'nhbrcEnrolmentFeeZAR',
    'councilBulkContributionsZAR',
    'planScrutinyAndSubdivisionFeesZAR',
    'marketingAndShowUnitZAR',
  ];

  let total = 0;
  for (const key of costKeys) {
    const val = softCosts[key];
    if (typeof val === 'number' && !isNaN(val)) {
      total += val;
    }
  }

  // Round to 2 decimal places to handle floating-point precision issues without erasing cents
  return Math.round(total * 100) / 100;
}

/**
 * Calculates comprehensive development financial feasibility, capital stack,
 * VAT mechanics, pre-sales hurdles, debt wipeout breakeven, and hybrid split-exit returns.
 */
export function calculateDevelopmentFinancials(
  dev?: DevelopmentProject | null,
  customNodeBenchmarks?: Record<string, CustomNodeBenchmarkOverride>,
  sponsorEntityName?: string
): DevelopmentFinancialSummary {
  if (!dev) {
    return {
      totalLandAndAcquisitionZAR: 0,
      totalSoftCostsZAR: 0,
      budgetedHardBuildCostZAR: 0,
      actualBoqSpendZAR: 0,
      activeHardBuildCostZAR: 0,
      contingencyReserveZAR: 0,
      totalPreApprovalCarryingCostZAR: 0,
      totalConstructionCarryingCostZAR: 0,
      totalCarryingCostZAR: 0,
      tdcZAR: 0,
      tdcPerSqmZAR: 0,
      tdcPerUnitZAR: 0,
      totalUnitsCount: 0,
      gdvInclVatZAR: 0,
      isVatRegisteredDeveloper: false,
      outputVatZAR: 0,
      claimableInputVatZAR: 0,
      netRealizableGdvZAR: 0,
      netProfitBeforeTaxZAR: 0,
      pocPercent: 0,
      taxEntityType: 'Company (27%)',
      effectiveTaxRatePercent: 27,
      estimatedTaxProvisionZAR: 0,
      netProfitAfterTaxZAR: 0,
      afterTaxPocPercent: 0,
      preSoldUnitsCount: 0,
      preSoldGdvZAR: 0,
      preSoldGdvPercent: 0,
      preSalesHurdlePercent: 0,
      isPreSalesHurdleMet: false,
      outstandingDevFacilityZAR: 0,
      avgUnitListPriceZAR: 0,
      unitsRequiredForDebtWipeout: 0,
      unitsForSaleCount: 0,
      unitsRetainedCount: 0,
      unitsSoldAndTransferredCount: 0,
      totalSoldProceedsZAR: 0,
      netSalesProceedsAfterDebtZAR: 0,
      netCashProceedsAfterDebtZAR: 0,
      remainingDebtOnRetainedUnitsZAR: 0,
      retainedMonthlyGrossRentZAR: 0,
      retainedAnnualGrossRentZAR: 0,
      projectedSalesGdvZAR: 0,
      isSection13SexEligible: false,
      section13sexDeductionBaseZAR: 0,
      section13sexAnnualAllowanceZAR: 0,
      actualBoqSpendPerSqmZAR: 0,
      softCostsPercentOfTdc: 0,
      totalHoldingAndContingencyZAR: 0,
      availableFacilityUndrawnZAR: 0,
      preSalesHurdleProgressRatioPercent: 0,
      debtFacilityRepaidPercent: 0,
      unencumberedUnitsCount: 0,
      totalFloorAreaSqm: 0,
      totalAllocatedCostBasisZAR: 0,
      totalMonthlyEstimatedRentZAR: 0,
      unitsNeededForSection13Sex: 5,
      landPercentOfTdc: 0,
      hardBuildPercentOfTdc: 0,
      carryingCostPercentOfTdc: 0,
      contingencyPercentOfTdc: 0,
      gdvToTdcMultiple: 0,
      section13sexTwentyYearSavingsZAR: 0,
      landCostPerUnitZAR: 0,
      landToGdvPercent: 0,
      isLandCostElevated: false,
      isDeferredLandPaymentLAA: false,
      seniorJvPartnerName: undefined,
      day1EquityOutlayZAR: 0,
      deferredLandPayableAtExitZAR: 0,
      suburbEndUserBondCeilingZAR: 800000,
      isWithinEndUserBondCeiling: true,
      bankReadiness: {
        paperRights: { met: false, statusLabel: 'Not Started', details: 'No statutory approvals recorded' },
        qsAndGeotech: { met: false, statusLabel: 'Not Validated', details: 'No professional fees recorded' },
        preSalesGate: { met: false, statusLabel: 'Under Target', details: '0% pre-sold' },
        deliveryTrackRecord: { met: false, statusLabel: 'Self-Delivered', details: 'Self-Delivered', partnerOrEntity: 'Self-Delivered', isJvPartnerBacked: false },
        overallBankable: false,
      },
    };
  }

  // 1. Land & Direct Acquisition Costs
  const landPurchasePriceZAR = dev.landPurchasePriceZAR ?? 0;
  const acquisitionCostsZAR = dev.acquisitionCostsZAR ?? 0;
  const sec118ArrearsZAR = dev.sec118ArrearsZAR ?? 0;
  const totalLandAndAcquisitionZAR =
    landPurchasePriceZAR + acquisitionCostsZAR + sec118ArrearsZAR;

  // 2. Soft Costs Aggregation
  const totalSoftCostsZAR = calculateDevelopmentSoftCostsTotal(dev.softCosts);

  // 3. Hard Construction Stack & BOQ Spend
  const totalBuildableAreaSqm = dev.totalBuildableAreaSqm ?? 0;
  const budgetedHardCostPerSqmZAR = dev.budgetedHardCostPerSqmZAR ?? 0;
  const budgetedHardBuildCostZAR = Math.round(
    Math.max(0, totalBuildableAreaSqm) * Math.max(0, budgetedHardCostPerSqmZAR)
  );

  const boqItems = dev.boqItems ?? [];
  const actualBoqSpendZAR = boqItems.reduce((acc, item) => {
    const itemCost =
      item.actualCostZAR !== undefined && item.actualCostZAR !== null
        ? item.actualCostZAR
        : item.baselineTotalZAR ?? 0;
    return acc + (typeof itemCost === 'number' && !isNaN(itemCost) ? itemCost : 0);
  }, 0);

  const activeHardBuildCostZAR = Math.max(
    budgetedHardBuildCostZAR,
    actualBoqSpendZAR
  );

  const contingencyPercent = dev.contingencyPercent ?? 0;
  const contingencyReserveZAR = Math.round(
    activeHardBuildCostZAR * (Math.max(0, contingencyPercent) / 100)
  );

  // 4. Carrying & Holding Burn
  const preApprovalMonths = dev.preApprovalMonths ?? 0;
  const monthlyPreApprovalHoldingBurnZAR =
    dev.monthlyPreApprovalHoldingBurnZAR ?? 0;
  const totalPreApprovalCarryingCostZAR = Math.round(
    Math.max(0, preApprovalMonths) * Math.max(0, monthlyPreApprovalHoldingBurnZAR)
  );

  const constructionMonths = dev.constructionMonths ?? 0;
  const monthlyConstructionHoldingBurnZAR =
    dev.monthlyConstructionHoldingBurnZAR ?? 0;
  const totalConstructionCarryingCostZAR = Math.round(
    Math.max(0, constructionMonths) * Math.max(0, monthlyConstructionHoldingBurnZAR)
  );

  const totalCarryingCostZAR =
    totalPreApprovalCarryingCostZAR + totalConstructionCarryingCostZAR;

  // 5. Total Development Cost (TDC)
  const tdcZAR =
    totalLandAndAcquisitionZAR +
    totalSoftCostsZAR +
    activeHardBuildCostZAR +
    contingencyReserveZAR +
    totalCarryingCostZAR;

  const units = dev.units ?? [];
  const totalUnitsCount = units.length;

  const tdcPerSqmZAR =
    totalBuildableAreaSqm > 0
      ? Math.round(tdcZAR / totalBuildableAreaSqm)
      : 0;

  const tdcPerUnitZAR =
    totalUnitsCount > 0
      ? Math.round(tdcZAR / totalUnitsCount)
      : 0;

  // 6. Gross Development Value (GDV) & SARS VAT Mechanics
  const gdvInclVatZAR = units.reduce((acc, u) => {
    const price = u.listPriceVatInclZAR;
    return acc + (typeof price === 'number' && !isNaN(price) ? price : 0);
  }, 0);

  const isVatRegisteredDeveloper = !!dev.isVatRegisteredDeveloper;

  let netRealizableGdvZAR: number;
  let outputVatZAR: number;
  let claimableInputVatZAR: number;
  let netProfitBeforeTaxZAR: number;

  if (isVatRegisteredDeveloper) {
    // VAT-registered: output VAT stripped via / 1.15; input VAT on build & soft costs claimed
    netRealizableGdvZAR = gdvInclVatZAR > 0 ? Math.round(gdvInclVatZAR / 1.15) : 0;
    outputVatZAR = gdvInclVatZAR - netRealizableGdvZAR;
    claimableInputVatZAR = Math.round(
      (totalSoftCostsZAR + activeHardBuildCostZAR) * 0.15
    );
    netProfitBeforeTaxZAR =
      (netRealizableGdvZAR + claimableInputVatZAR) - tdcZAR;
  } else {
    // Non-VAT: developer realizes full GDV without output VAT, cannot claim input VAT
    netRealizableGdvZAR = gdvInclVatZAR;
    outputVatZAR = 0;
    claimableInputVatZAR = 0;
    netProfitBeforeTaxZAR = netRealizableGdvZAR - tdcZAR;
  }

  // 7. Profit on Cost (POC %) & SARS Corporate Tax
  const pocPercent =
    tdcZAR > 0 ? (netProfitBeforeTaxZAR / tdcZAR) * 100 : 0;

  const taxEntityType: DevelopmentTaxEntityType =
    dev.taxEntityType || 'Company (27%)';

  const effectiveTaxRatePercent =
    taxEntityType === 'Trust'
      ? 45
      : taxEntityType === 'Individual'
        ? 45
        : 27;

  const estimatedTaxProvisionZAR =
    netProfitBeforeTaxZAR > 0
      ? Math.round(netProfitBeforeTaxZAR * (effectiveTaxRatePercent / 100))
      : 0;

  const netProfitAfterTaxZAR = netProfitBeforeTaxZAR - estimatedTaxProvisionZAR;

  const afterTaxPocPercent =
    tdcZAR > 0 ? (netProfitAfterTaxZAR / tdcZAR) * 100 : 0;

  // 8. Pre-Sales Hurdle Evaluation
  const preSoldUnits = units.filter((u) => PRE_SOLD_STATUSES.has(u.status));
  const preSoldUnitsCount = preSoldUnits.length;

  const preSoldGdvZAR = preSoldUnits.reduce((acc, u) => {
    const price = u.listPriceVatInclZAR;
    return acc + (typeof price === 'number' && !isNaN(price) ? price : 0);
  }, 0);

  const preSoldGdvPercent =
    gdvInclVatZAR > 0
      ? (preSoldGdvZAR / gdvInclVatZAR) * 100
      : 0;

  const preSalesHurdlePercent = dev.preSalesHurdlePercent ?? 0;
  const isPreSalesHurdleMet = preSoldGdvPercent >= preSalesHurdlePercent;

  // 9. Debt Facility & Debt Wipeout Breakeven
  const facilityDrawnZAR = dev.developmentFacilityDrawnZAR ?? 0;
  const facilityRepaidZAR = dev.developmentFacilityRepaidZAR ?? 0;
  const outstandingDevFacilityZAR = Math.max(0, facilityDrawnZAR - facilityRepaidZAR);

  const avgUnitListPriceZAR =
    totalUnitsCount > 0
      ? Math.round(gdvInclVatZAR / totalUnitsCount)
      : 0;

  const unitsRequiredForDebtWipeout =
    outstandingDevFacilityZAR <= 0 || avgUnitListPriceZAR <= 0
      ? 0
      : Math.ceil(outstandingDevFacilityZAR / avgUnitListPriceZAR);

  // 10. Hybrid Split-Exit Metrics & SARS Section 13sex
  const unitsForSale = units.filter((u) => u.status !== 'Retained for Rental');
  const unitsRetainedForRental = units.filter(
    (u) => u.status === 'Retained for Rental'
  );
  const soldAndTransferredUnits = units.filter(
    (u) => u.status === 'Sold & Transferred'
  );

  const unitsForSaleCount = unitsForSale.length;
  const unitsRetainedCount = unitsRetainedForRental.length;
  const unitsSoldAndTransferredCount = soldAndTransferredUnits.length;

  const totalSoldProceedsZAR = soldAndTransferredUnits.reduce((acc, u) => {
    const price = u.listPriceVatInclZAR;
    return acc + (typeof price === 'number' && !isNaN(price) ? price : 0);
  }, 0);

  // South African Bankability Metrics: Land economics & LAA Structure
  const landCostPerUnitZAR =
    totalUnitsCount > 0 ? Math.round(landPurchasePriceZAR / totalUnitsCount) : 0;

  const landToGdvPercent =
    gdvInclVatZAR > 0
      ? Math.round(((landPurchasePriceZAR / gdvInclVatZAR) * 100) * 10) / 10
      : 0;

  const isTownshipInfill =
    dev.developmentType === 'Township Micro-Units (Infill)' ||
    /township|infill/i.test(dev.developmentType || '');

  const isLandCostElevated = isTownshipInfill
    ? landCostPerUnitZAR > 60000
    : landToGdvPercent > 25.0;

  const isDeferredLandPaymentLAA = Boolean(dev.isDeferredLandPaymentLAA);
  const seniorJvPartnerName = dev.seniorJvPartnerName?.trim() || undefined;

  const day1EquityOutlayZAR = isDeferredLandPaymentLAA
    ? Math.round(acquisitionCostsZAR + sec118ArrearsZAR)
    : totalLandAndAcquisitionZAR;

  const totalSaleUnitsGdvZAR = unitsForSale.reduce(
    (sum, u) =>
      sum +
      (typeof u.listPriceVatInclZAR === 'number' && !isNaN(u.listPriceVatInclZAR)
        ? u.listPriceVatInclZAR
        : 0),
    0
  );

  const totalDebtToExtinguishZAR =
    dev.developmentFacilityDrawnZAR && dev.developmentFacilityDrawnZAR > 0
      ? dev.developmentFacilityDrawnZAR
      : dev.developmentFacilityLimitZAR || 0;

  const deferredLandPayableAtExitZAR = isDeferredLandPaymentLAA
    ? Math.min(landPurchasePriceZAR, landCostPerUnitZAR * (unitsSoldAndTransferredCount || unitsForSale.length))
    : 0;

  const netSalesProceedsAfterDebtZAR = Math.max(
    0,
    totalSaleUnitsGdvZAR - totalDebtToExtinguishZAR - deferredLandPayableAtExitZAR
  );
  const netCashProceedsAfterDebtZAR = Math.max(
    0,
    totalSoldProceedsZAR -
      outstandingDevFacilityZAR -
      (isDeferredLandPaymentLAA ? deferredLandPayableAtExitZAR : 0)
  );

  const remainingDebtOnRetainedUnitsZAR = Math.max(
    0,
    outstandingDevFacilityZAR - totalSoldProceedsZAR
  );

  const retainedMonthlyGrossRentZAR = unitsRetainedForRental.reduce(
    (acc, u) => {
      const rent = u.estimatedMonthlyRentZAR;
      return acc + (typeof rent === 'number' && !isNaN(rent) ? rent : 0);
    },
    0
  );
  const retainedAnnualGrossRentZAR = retainedMonthlyGrossRentZAR * 12;

  const projectedSalesGdvZAR = unitsForSale.reduce((acc, u) => {
    const price = u.listPriceVatInclZAR;
    return acc + (typeof price === 'number' && !isNaN(price) ? price : 0);
  }, 0);

  const isSection13SexEligible = unitsRetainedCount >= 5;

  const retainedCostBasisZAR = unitsRetainedForRental.reduce((acc, u) => {
    const basis = u.allocatedCostBasisZAR;
    return acc + (typeof basis === 'number' && !isNaN(basis) ? basis : 0);
  }, 0);

  const section13sexDeductionBaseZAR = isSection13SexEligible
    ? Math.round(retainedCostBasisZAR * 0.55)
    : 0;

  const section13sexAnnualAllowanceZAR = isSection13SexEligible
    ? Math.round(section13sexDeductionBaseZAR * 0.05)
    : 0;

  // 11. Additional Derived Fields for Zero-Inline-Math UI Presentation
  const actualBoqSpendPerSqmZAR =
    totalBuildableAreaSqm > 0
      ? Math.round(actualBoqSpendZAR / totalBuildableAreaSqm)
      : 0;

  const softCostsPercentOfTdc =
    tdcZAR > 0 ? (totalSoftCostsZAR / tdcZAR) * 100 : 0;

  const landPercentOfTdc =
    tdcZAR > 0 ? (totalLandAndAcquisitionZAR / tdcZAR) * 100 : 0;

  const hardBuildPercentOfTdc =
    tdcZAR > 0 ? (activeHardBuildCostZAR / tdcZAR) * 100 : 0;

  const carryingCostPercentOfTdc =
    tdcZAR > 0 ? (totalCarryingCostZAR / tdcZAR) * 100 : 0;

  const contingencyPercentOfTdc =
    tdcZAR > 0 ? (contingencyReserveZAR / tdcZAR) * 100 : 0;

  const gdvToTdcMultiple =
    tdcZAR > 0 ? Math.round((gdvInclVatZAR / tdcZAR) * 100) / 100 : 0;

  const section13sexTwentyYearSavingsZAR =
    section13sexAnnualAllowanceZAR * 20;

  const totalHoldingAndContingencyZAR =
    totalCarryingCostZAR + contingencyReserveZAR;

  const facilityLimitZAR = dev.developmentFacilityLimitZAR ?? 0;
  const availableFacilityUndrawnZAR = Math.max(
    0,
    facilityLimitZAR - facilityDrawnZAR
  );

  const preSalesHurdleProgressRatioPercent =
    preSalesHurdlePercent > 0
      ? Math.min(100, Math.round((preSoldGdvPercent / preSalesHurdlePercent) * 100))
      : 100;

  const debtFacilityRepaidPercent =
    facilityDrawnZAR > 0
      ? Math.min(100, Math.round((facilityRepaidZAR / facilityDrawnZAR) * 100))
      : 100;

  const unencumberedUnitsCount = Math.max(
    0,
    totalUnitsCount - unitsRequiredForDebtWipeout
  );

  const totalFloorAreaSqm = units.reduce(
    (acc, u) => acc + (typeof u.floorAreaSqm === 'number' && !isNaN(u.floorAreaSqm) ? u.floorAreaSqm : 0),
    0
  );
  const totalAllocatedCostBasisZAR = units.reduce(
    (acc, u) => acc + (typeof u.allocatedCostBasisZAR === 'number' && !isNaN(u.allocatedCostBasisZAR) ? u.allocatedCostBasisZAR : 0),
    0
  );
  const totalMonthlyEstimatedRentZAR = units.reduce(
    (acc, u) => acc + (typeof u.estimatedMonthlyRentZAR === 'number' && !isNaN(u.estimatedMonthlyRentZAR) ? u.estimatedMonthlyRentZAR : 0),
    0
  );

  const unitsNeededForSection13Sex = Math.max(0, 5 - unitsRetainedCount);

  // 12. Node-Derived Suburb End-User Bond Ceiling & 4-Pillar Bank Readiness
  const avgUnitSqm =
    totalUnitsCount > 0 && totalFloorAreaSqm > 0
      ? totalFloorAreaSqm / totalUnitsCount
      : totalUnitsCount > 0 && totalBuildableAreaSqm > 0
        ? totalBuildableAreaSqm / totalUnitsCount
        : 0;

  const matchedNode =
    (dev.investmentNodeId ? findInvestmentNode(dev.investmentNodeId) : undefined) ||
    findInvestmentNode(`${dev.address || ''} ${dev.title || ''} ${dev.city || ''}`) ||
    (dev.city ? findInvestmentNode(dev.city) : undefined);

  let suburbEndUserBondCeilingZAR = 800000;
  if (matchedNode && avgUnitSqm > 0) {
    const effective = getEffectiveNodeBenchmarks(matchedNode, customNodeBenchmarks);
    const range = effective?.pricePerSqmRangeZAR ?? matchedNode.benchmarks.pricePerSqmRangeZAR;
    const upperPricePerSqmZAR = range[1] || range[0] || 0;
    suburbEndUserBondCeilingZAR = Math.round(avgUnitSqm * upperPricePerSqmZAR * 1.15);
  }

  const isWithinEndUserBondCeiling =
    avgUnitListPriceZAR <= Math.round(suburbEndUserBondCeilingZAR * 1.05);

  // 4-Pillar Bank Readiness
  const splumaStatus = dev.approvals?.splumaRezoningSubdivision?.status || 'Not Started';
  const plansStatus = dev.approvals?.municipalBuildingPlans?.status || 'Not Started';
  const isPaperRightsMet =
    (splumaStatus === 'Approved' || splumaStatus === 'N/A') &&
    (plansStatus === 'Approved' || plansStatus === 'N/A');

  const nhbrcStatus = dev.approvals?.nhbrcEnrolment?.status || 'Not Started';
  const isNhbrcValid = nhbrcStatus === 'Approved' || nhbrcStatus === 'N/A';
  const hasQs = (dev.softCosts?.quantitySurveyorZAR ?? 0) > 0;
  const hasCivilEng = (dev.softCosts?.structuralCivilEngineerZAR ?? 0) > 0;
  const isQsGeotechMet = isNhbrcValid && hasQs && hasCivilEng;

  const isPreSalesMet = isPreSalesHurdleMet;

  const isJvPartnerBacked = Boolean(seniorJvPartnerName);
  const partnerOrEntity = seniorJvPartnerName || sponsorEntityName || 'Self-Delivered (Owner Entity)';

  const bankReadiness: DevelopmentBankReadinessSummary = {
    paperRights: {
      met: isPaperRightsMet,
      statusLabel: isPaperRightsMet ? 'Approved / Shovel-Ready' : 'Pending Approvals',
      details: isPaperRightsMet
        ? 'SPLUMA rezoning & municipal building plans approved'
        : `SPLUMA: ${splumaStatus} • Building Plans: ${plansStatus}`,
    },
    qsAndGeotech: {
      met: isQsGeotechMet,
      statusLabel: isQsGeotechMet ? 'Validated & Enrolled' : 'Incomplete Validation',
      details: isQsGeotechMet
        ? 'NHBRC enrolled with certified QS and Structural/Civil Engineer'
        : `NHBRC: ${nhbrcStatus} • QS: ${hasQs ? 'Engaged' : 'Missing'} • Engineer: ${hasCivilEng ? 'Engaged' : 'Missing'}`,
    },
    preSalesGate: {
      met: isPreSalesMet,
      statusLabel: isPreSalesMet ? 'Hurdle Cleared' : 'Under Target',
      details: `${preSoldGdvPercent.toFixed(1)}% pre-sold vs ${preSalesHurdlePercent}% hurdle target`,
    },
    deliveryTrackRecord: {
      met: isJvPartnerBacked,
      isJvPartnerBacked,
      partnerOrEntity,
      statusLabel: isJvPartnerBacked ? 'Senior JV Partnered' : 'Self-Delivered',
      details: isJvPartnerBacked
        ? `Institutional Co-Developer: ${partnerOrEntity}`
        : `Delivery track record evidenced via ${partnerOrEntity}`,
    },
    overallBankable: isPaperRightsMet && isQsGeotechMet && isPreSalesMet,
  };

  return {
    totalLandAndAcquisitionZAR,
    totalSoftCostsZAR,
    budgetedHardBuildCostZAR,
    actualBoqSpendZAR,
    activeHardBuildCostZAR,
    contingencyReserveZAR,
    totalPreApprovalCarryingCostZAR,
    totalConstructionCarryingCostZAR,
    totalCarryingCostZAR,
    tdcZAR,
    tdcPerSqmZAR,
    tdcPerUnitZAR,
    totalUnitsCount,
    gdvInclVatZAR,
    isVatRegisteredDeveloper,
    outputVatZAR,
    claimableInputVatZAR,
    netRealizableGdvZAR,
    netProfitBeforeTaxZAR,
    pocPercent,
    taxEntityType,
    effectiveTaxRatePercent,
    estimatedTaxProvisionZAR,
    netProfitAfterTaxZAR,
    afterTaxPocPercent,
    preSoldUnitsCount,
    preSoldGdvZAR,
    preSoldGdvPercent,
    preSalesHurdlePercent,
    isPreSalesHurdleMet,
    outstandingDevFacilityZAR,
    avgUnitListPriceZAR,
    unitsRequiredForDebtWipeout,
    unitsForSaleCount,
    unitsRetainedCount,
    unitsSoldAndTransferredCount,
    totalSoldProceedsZAR,
    netSalesProceedsAfterDebtZAR,
    netCashProceedsAfterDebtZAR,
    remainingDebtOnRetainedUnitsZAR,
    retainedMonthlyGrossRentZAR,
    retainedAnnualGrossRentZAR,
    projectedSalesGdvZAR,
    isSection13SexEligible,
    section13sexDeductionBaseZAR,
    section13sexAnnualAllowanceZAR,
    actualBoqSpendPerSqmZAR,
    softCostsPercentOfTdc,
    totalHoldingAndContingencyZAR,
    availableFacilityUndrawnZAR,
    preSalesHurdleProgressRatioPercent,
    debtFacilityRepaidPercent,
    unencumberedUnitsCount,
    totalFloorAreaSqm,
    totalAllocatedCostBasisZAR,
    totalMonthlyEstimatedRentZAR,
    unitsNeededForSection13Sex,
    landPercentOfTdc,
    hardBuildPercentOfTdc,
    carryingCostPercentOfTdc,
    contingencyPercentOfTdc,
    gdvToTdcMultiple,
    section13sexTwentyYearSavingsZAR,
    landCostPerUnitZAR,
    landToGdvPercent,
    isLandCostElevated,
    isDeferredLandPaymentLAA,
    seniorJvPartnerName,
    day1EquityOutlayZAR,
    deferredLandPayableAtExitZAR,
    suburbEndUserBondCeilingZAR,
    isWithinEndUserBondCeiling,
    bankReadiness,
  };
}

/**
 * Calculates BOQ trade line baseline total and budget variance.
 */
export function calculateBOQItemTotals(
  quantity: number,
  baselineUnitCostZAR: number,
  actualCostZAR: number
): { baselineTotalZAR: number; varianceZAR: number } {
  const qty = Number(quantity) || 0;
  const unitCost = Number(baselineUnitCostZAR) || 0;
  const actual = Number(actualCostZAR) || 0;
  const baselineTotalZAR = Math.round(qty * unitCost);
  const varianceZAR = actual - baselineTotalZAR;
  return { baselineTotalZAR, varianceZAR };
}

/**
 * Computes municipal delay sensitivity matrix for development holding burn.
 * Fully encapsulates monthly burn partitioning and debt/exit assumptions.
 */
export function calculateDevelopmentHoldingSensitivity(
  development: DevelopmentProject,
  financials?: DevelopmentFinancialSummary | null
): DelaySensitivityMatrixResult {
  const fin = financials || calculateDevelopmentFinancials(development);
  const monthlyHolding =
    (development.monthlyPreApprovalHoldingBurnZAR || 0) +
    (development.monthlyConstructionHoldingBurnZAR || 0) / 2;
  const drawnFacility = development.developmentFacilityDrawnZAR || 0;
  const totalCostBasis =
    (development.landPurchasePriceZAR || 0) +
    (development.acquisitionCostsZAR || 0) +
    fin.budgetedHardBuildCostZAR;

  return calculateDelaySensitivityMatrix({
    baselineDurationMonths:
      (development.preApprovalMonths || 0) + (development.constructionMonths || 0),
    monthlyHoldingBurnZAR: monthlyHolding > 0 ? monthlyHolding : 12500,
    syndicateDebtBalanceZAR: drawnFacility > 0 ? drawnFacility : totalCostBasis * 0.6,
    syndicateInterestRatePercent: 12.5,
    targetExitPriceZAR: totalCostBasis * 1.25,
    totalCostBasisZAR: totalCostBasis,
    taxRatePercent: 27,
  });
}

export interface ApprovalsProgressSummary {
  approvedCount: number;
  totalItems: number;
  progressPercent: number;
  isStage1Approved: boolean;
}

/**
 * Pure evaluation of statutory milestone completion and Stage 1 draw unlocking.
 */
export function calculateApprovalsProgress(
  approvals?: PreConstructionApprovals | null,
  totalItems: number = 6
): ApprovalsProgressSummary {
  if (!approvals) {
    return {
      approvedCount: 0,
      totalItems,
      progressPercent: 0,
      isStage1Approved: false,
    };
  }

  const STAGE_1_KEYS: (keyof PreConstructionApprovals)[] = [
    'splumaRezoningSubdivision',
    'sgDiagramApproval',
    'municipalBuildingPlans',
    'nhbrcEnrolment',
  ];

  const ALL_KEYS: (keyof PreConstructionApprovals)[] = [
    ...STAGE_1_KEYS,
    'sectionalTitleRegister',
    'occupancyCertificate',
  ];

  let approvedCount = 0;
  for (const k of ALL_KEYS) {
    const st = approvals[k]?.status;
    if (st === 'Approved' || st === 'N/A') {
      approvedCount++;
    }
  }

  const isStage1Approved = STAGE_1_KEYS.every((k) => {
    const st = approvals[k]?.status;
    return st === 'Approved' || st === 'N/A';
  });

  const progressPercent =
    totalItems > 0 ? Math.round((approvedCount / totalItems) * 100) : 0;

  return {
    approvedCount,
    totalItems,
    progressPercent,
    isStage1Approved,
  };
}

/**
 * Safe delta accumulator for financial modal adjustments.
 */
export function calculateIncreasedAmount(
  base?: number | null,
  delta?: number | null
): number {
  return (base || 0) + (delta || 0);
}

// ==========================================
// PROPOSAL FEASIBILITY PURE PRESENTATION HELPERS
// ==========================================

export interface CapitalStackCostItem {
  id: string;
  category: 'Land & Acquisition' | 'Soft Costs & SPLUMA' | 'Hard Construction' | 'Carrying Burn' | 'Contingency Buffer';
  title: string;
  statutoryBasis: string;
  amountZAR: number;
  percentOfTdc: number;
  drawCondition: string;
  subItems?: { label: string; amountZAR: number }[];
}

export interface DevelopmentCapitalStackSummary {
  items: CapitalStackCostItem[];
  tdcZAR: number;
  tdcPerSqmZAR: number;
  tdcPerUnitZAR: number;
  gdvInclVatZAR: number;
  netRealizableGdvZAR: number;
  gdvToTdcMultiple: number;
  pocPercent: number;
  afterTaxPocPercent: number;
  netProfitBeforeTaxZAR: number;
  estimatedTaxProvisionZAR: number;
  netProfitAfterTaxZAR: number;
  effectiveTaxRatePercent: number;
  isVatRegisteredDeveloper: boolean;
  outputVatZAR: number;
  claimableInputVatZAR: number;
  landPercentOfTdc: number;
  softCostsPercentOfTdc: number;
  hardBuildPercentOfTdc: number;
  carryingCostPercentOfTdc: number;
  contingencyPercentOfTdc: number;
}

export function calculateDevelopmentCapitalStack(
  development: DevelopmentProject,
  financials?: DevelopmentFinancialSummary | null
): DevelopmentCapitalStackSummary {
  const fin = financials || calculateDevelopmentFinancials(development);
  const tdc = Math.max(1, fin.tdcZAR);

  const landPercentOfTdc = fin.tdcZAR > 0 ? Math.round((fin.totalLandAndAcquisitionZAR / tdc) * 1000) / 10 : 0;
  const softCostsPercentOfTdc = fin.tdcZAR > 0 ? Math.round((fin.totalSoftCostsZAR / tdc) * 1000) / 10 : 0;
  const hardBuildPercentOfTdc = fin.tdcZAR > 0 ? Math.round((fin.activeHardBuildCostZAR / tdc) * 1000) / 10 : 0;
  const carryingCostPercentOfTdc = fin.tdcZAR > 0 ? Math.round((fin.totalCarryingCostZAR / tdc) * 1000) / 10 : 0;
  const contingencyPercentOfTdc = fin.tdcZAR > 0 ? Math.round((fin.contingencyReserveZAR / tdc) * 1000) / 10 : 0;
  const gdvToTdcMultiple = fin.tdcZAR > 0 ? Math.round((fin.gdvInclVatZAR / fin.tdcZAR) * 100) / 100 : 0;

  const items: CapitalStackCostItem[] = [
    {
      id: 'stack-land',
      category: 'Land & Acquisition',
      title: 'Land Purchase & Direct Acquisition',
      statutoryBasis: 'Deeds Office Conveyancing & Section 118 Municipal Clearance',
      amountZAR: fin.totalLandAndAcquisitionZAR,
      percentOfTdc: landPercentOfTdc,
      drawCondition: development.isDeferredLandPaymentLAA
        ? 'Deferred — Paid at Unit Transfer (LAA / Land JV)'
        : 'Day-1 Capital / 100% Sponsor Equity',
      subItems: [
        { label: 'Parent Erf Purchase Price', amountZAR: development.landPurchasePriceZAR || 0 },
        { label: 'Conveyancing & Transfer Costs', amountZAR: development.acquisitionCostsZAR || 0 },
        { label: 'Section 118(1) Historical Council Arrears', amountZAR: development.sec118ArrearsZAR || 0 },
      ],
    },
    {
      id: 'stack-soft',
      category: 'Soft Costs & SPLUMA',
      title: 'Professional Team Fees & Municipal Bulk Contributions',
      statutoryBasis: 'SPLUMA Section 42 & Municipal Planning By-laws',
      amountZAR: fin.totalSoftCostsZAR,
      percentOfTdc: softCostsPercentOfTdc,
      drawCondition: 'Stage 1 Paper Rights Ring-Fenced Milestone Draws',
      subItems: [
        { label: 'SPLUMA Sec 42 Council Bulk Infrastructure Contributions', amountZAR: development.softCosts?.councilBulkContributionsZAR || 0 },
        { label: 'Town Planner & Land Surveyor (SG Diagram)', amountZAR: development.softCosts?.townPlannerZAR || 0 },
        { label: 'Architect & Scrutiny Fees', amountZAR: (development.softCosts?.architectZAR || 0) + (development.softCosts?.planScrutinyAndSubdivisionFeesZAR || 0) },
        { label: 'Structural & Civil Consulting Engineers', amountZAR: development.softCosts?.structuralCivilEngineerZAR || 0 },
        { label: 'Quantity Surveyor (QS)', amountZAR: development.softCosts?.quantitySurveyorZAR || 0 },
        { label: 'NHBRC Enrolment & Warranty Fees', amountZAR: development.softCosts?.nhbrcEnrolmentFeeZAR || 0 },
        { label: 'Marketing, Branding & Show Unit Staging', amountZAR: development.softCosts?.marketingAndShowUnitZAR || 0 },
      ],
    },
    {
      id: 'stack-hard',
      category: 'Hard Construction',
      title: 'Hard Construction Build Works',
      statutoryBasis: 'Certified QS Measurement & Contract BOQ',
      amountZAR: fin.activeHardBuildCostZAR,
      percentOfTdc: hardBuildPercentOfTdc,
      drawCondition: 'Stage 2 Progressive Works Draws (Senior Debt Facility)',
      subItems: [
        { label: `Budgeted Build (${development.totalBuildableAreaSqm || 0}m² @ ${formatZAR(development.budgetedHardCostPerSqmZAR)}/m²)`, amountZAR: fin.budgetedHardBuildCostZAR },
        { label: 'Actual BOQ Measured Spend to Date', amountZAR: fin.actualBoqSpendZAR },
      ],
    },
    {
      id: 'stack-carrying',
      category: 'Carrying Burn',
      title: 'Carrying Cost & Holding Burn Reserve',
      statutoryBasis: 'Interim Holding Burn (Rates, Standby Security & Holding Interest)',
      amountZAR: fin.totalCarryingCostZAR,
      percentOfTdc: carryingCostPercentOfTdc,
      drawCondition: 'Monthly Operating Escrow Drawdown',
      subItems: [
        { label: `Pre-Approval Holding (${development.preApprovalMonths || 0} mos @ ${formatZAR(development.monthlyPreApprovalHoldingBurnZAR)}/mo)`, amountZAR: fin.totalPreApprovalCarryingCostZAR },
        { label: `Construction Holding (${development.constructionMonths || 0} mos @ ${formatZAR(development.monthlyConstructionHoldingBurnZAR)}/mo)`, amountZAR: fin.totalConstructionCarryingCostZAR },
      ],
    },
    {
      id: 'stack-contingency',
      category: 'Contingency Buffer',
      title: 'Contingency Buffer Reserve',
      statutoryBasis: `${development.contingencyPercent || 0}% Hard Build Risk Allocation`,
      amountZAR: fin.contingencyReserveZAR,
      percentOfTdc: contingencyPercentOfTdc,
      drawCondition: 'Escrow Ring-Fenced for Unforeseen Latent Defects / Delays',
    },
  ];

  return {
    items,
    tdcZAR: fin.tdcZAR,
    tdcPerSqmZAR: fin.tdcPerSqmZAR,
    tdcPerUnitZAR: fin.tdcPerUnitZAR,
    gdvInclVatZAR: fin.gdvInclVatZAR,
    netRealizableGdvZAR: fin.netRealizableGdvZAR,
    gdvToTdcMultiple,
    pocPercent: fin.pocPercent,
    afterTaxPocPercent: fin.afterTaxPocPercent,
    netProfitBeforeTaxZAR: fin.netProfitBeforeTaxZAR,
    estimatedTaxProvisionZAR: fin.estimatedTaxProvisionZAR,
    netProfitAfterTaxZAR: fin.netProfitAfterTaxZAR,
    effectiveTaxRatePercent: fin.effectiveTaxRatePercent,
    isVatRegisteredDeveloper: fin.isVatRegisteredDeveloper,
    outputVatZAR: fin.outputVatZAR,
    claimableInputVatZAR: fin.claimableInputVatZAR,
    landPercentOfTdc,
    softCostsPercentOfTdc,
    hardBuildPercentOfTdc,
    carryingCostPercentOfTdc,
    contingencyPercentOfTdc,
  };
}

export interface StatutoryGateItem {
  key: keyof PreConstructionApprovals;
  title: string;
  statutoryAct: string;
  authority: string;
  status: ApprovalStatus;
  approvedDate?: string;
  targetApprovalDate?: string;
  referenceNo?: string;
  isApproved: boolean;
  leadTimeDays: number;
}

export interface DevelopmentRiskGateSummary {
  // Stage 1: Paper Rights & Town Planning
  isStage1Approved: boolean;
  stage1ApprovedCount: number;
  stage1TotalCount: number;
  stage1ProgressPercent: number;
  stage1Items: StatutoryGateItem[];
  stage1RingFenceLabel: 'Ring-Fence Cleared' | 'Strictly Ring-Fenced';
  stage1RingFenceDescription: string;

  // Stage 2: Wet Works & Senior Debt Draws
  isStage2Unlocked: boolean;
  stage2ApprovedCount: number;
  stage2TotalCount: number;
  stage2ProgressPercent: number;
  stage2Items: StatutoryGateItem[];
  stage2DrawLabel: 'Senior Facility Active' | 'Draws Locked Pending Stage 1';
  stage2DrawDescription: string;

  // Senior Facility Tranche Metrics
  facilityLimitZAR: number;
  facilityDrawnZAR: number;
  facilityRepaidZAR: number;
  availableFacilityUndrawnZAR: number;
  debtFacilityRepaidPercent: number;
  isPreSalesHurdleMet: boolean;
  preSalesHurdlePercent: number;
  preSoldGdvPercent: number;

  // Overall Statutory Progress
  totalApprovedCount: number;
  totalStatutoryItems: number;
  overallProgressPercent: number;
}

export function calculateDevelopmentRiskGate(
  development: DevelopmentProject,
  financials?: DevelopmentFinancialSummary | null
): DevelopmentRiskGateSummary {
  const fin = financials || calculateDevelopmentFinancials(development);
  const approvals = development.approvals;

  const STAGE_1_DEFS: { key: keyof PreConstructionApprovals; title: string; act: string; auth: string; days: number }[] = [
    {
      key: 'splumaRezoningSubdivision',
      title: 'SPLUMA Section 42 Rezoning & Subdivision',
      act: 'Spatial Planning & Land Use Management Act 16 of 2013',
      auth: 'Municipal Planning Tribunal (MPT)',
      days: 120,
    },
    {
      key: 'sgDiagramApproval',
      title: 'Surveyor-General (SG) Cadastral Diagram Approval',
      act: 'Land Survey Act 8 of 1997',
      auth: 'Surveyor-General Office (SG)',
      days: 60,
    },
    {
      key: 'municipalBuildingPlans',
      title: 'Municipal Building Plans (NBR Sec 7(1))',
      act: 'National Building Regulations & Standards Act 103 of 1977',
      auth: 'City Development Planning Department',
      days: 45,
    },
    {
      key: 'nhbrcEnrolment',
      title: 'NHBRC Home Warranty Enrolment',
      act: 'Housing Consumers Protection Measures Act 95 of 1998',
      auth: 'National Home Builders Registration Council',
      days: 30,
    },
  ];

  const STAGE_2_DEFS: { key: keyof PreConstructionApprovals; title: string; act: string; auth: string; days: number }[] = [
    {
      key: 'sectionalTitleRegister',
      title: 'Sectional Title Register Proclamation',
      act: 'Sectional Titles Act 95 of 1986',
      auth: 'Deeds Registry Office',
      days: 45,
    },
    {
      key: 'occupancyCertificate',
      title: 'Municipal Occupancy Certificate (Sec 14 NBR)',
      act: 'Section 14 National Building Regulations',
      auth: 'City Chief Building Inspector',
      days: 14,
    },
  ];

  const stage1Items: StatutoryGateItem[] = STAGE_1_DEFS.map((def) => {
    const item = approvals?.[def.key];
    const status: ApprovalStatus = item?.status || 'Not Started';
    const isApproved = status === 'Approved' || status === 'N/A';
    return {
      key: def.key,
      title: def.title,
      statutoryAct: def.act,
      authority: def.auth,
      status,
      approvedDate: item?.approvedDate,
      targetApprovalDate: item?.targetApprovalDate,
      referenceNo: item?.referenceNo,
      isApproved,
      leadTimeDays: def.days,
    };
  });

  const stage2Items: StatutoryGateItem[] = STAGE_2_DEFS.map((def) => {
    const item = approvals?.[def.key];
    const status: ApprovalStatus = item?.status || 'Not Started';
    const isApproved = status === 'Approved' || status === 'N/A';
    return {
      key: def.key,
      title: def.title,
      statutoryAct: def.act,
      authority: def.auth,
      status,
      approvedDate: item?.approvedDate,
      targetApprovalDate: item?.targetApprovalDate,
      referenceNo: item?.referenceNo,
      isApproved,
      leadTimeDays: def.days,
    };
  });

  const stage1ApprovedCount = stage1Items.filter((i) => i.isApproved).length;
  const stage1TotalCount = stage1Items.length;
  const isStage1Approved = stage1ApprovedCount === stage1TotalCount;
  const stage1ProgressPercent = Math.round((stage1ApprovedCount / stage1TotalCount) * 100);

  const stage2ApprovedCount = stage2Items.filter((i) => i.isApproved).length;
  const stage2TotalCount = stage2Items.length;
  const stage2ProgressPercent = Math.round((stage2ApprovedCount / stage2TotalCount) * 100);

  const isStage2Unlocked = isStage1Approved;

  const totalApprovedCount = stage1ApprovedCount + stage2ApprovedCount;
  const totalStatutoryItems = stage1TotalCount + stage2TotalCount;
  const overallProgressPercent = Math.round((totalApprovedCount / totalStatutoryItems) * 100);

  return {
    isStage1Approved,
    stage1ApprovedCount,
    stage1TotalCount,
    stage1ProgressPercent,
    stage1Items,
    stage1RingFenceLabel: isStage1Approved ? 'Ring-Fence Cleared' : 'Strictly Ring-Fenced',
    stage1RingFenceDescription: isStage1Approved
      ? 'All Stage 1 town planning, cadastral, and building plan rights are proclaimed. Equity ring-fence is lifted.'
      : 'Sponsor equity and seed capital are strictly ring-fenced to paper rights. Zero senior bank debt is drawn during this stage.',
    isStage2Unlocked,
    stage2ApprovedCount,
    stage2TotalCount,
    stage2ProgressPercent,
    stage2Items,
    stage2DrawLabel: isStage2Unlocked ? 'Senior Facility Active' : 'Draws Locked Pending Stage 1',
    stage2DrawDescription: isStage2Unlocked
      ? 'Senior debt construction tranches and QS-certified wet works draws are actively unlocked.'
      : 'Senior bank facility drawdowns are contractually locked until all Stage 1 statutory paper rights are approved.',
    facilityLimitZAR: development.developmentFacilityLimitZAR || 0,
    facilityDrawnZAR: development.developmentFacilityDrawnZAR || 0,
    facilityRepaidZAR: development.developmentFacilityRepaidZAR || 0,
    availableFacilityUndrawnZAR: fin.availableFacilityUndrawnZAR,
    debtFacilityRepaidPercent: fin.debtFacilityRepaidPercent,
    isPreSalesHurdleMet: fin.isPreSalesHurdleMet,
    preSalesHurdlePercent: development.preSalesHurdlePercent || 0,
    preSoldGdvPercent: fin.preSoldGdvPercent,
    totalApprovedCount,
    totalStatutoryItems,
    overallProgressPercent,
  };
}

export interface UnitWaterfallItem {
  unitId: string;
  unitNumber: string;
  configuration: string;
  floorAreaSqm: number;
  listPriceVatInclZAR: number;
  status: DevUnitStatus;
  waterfallRole: 'Senior Debt Wipeout' | 'Unencumbered Cash Profit' | 'Free-Carry Retained Equity';
  roleBadgeText: string;
  roleBadgeColor: 'blue' | 'emerald' | 'purple';
  isDebtExtinguisher: boolean;
  debtSequenceIndex?: number;
}

export interface DevelopmentDebtWipeoutMatrix {
  avgUnitListPriceZAR: number;
  outstandingDebtZAR: number;
  unitsRequiredForDebtWipeout: number;
  unencumberedUnitsCount: number;
  totalUnitsCount: number;
  preSoldUnitsCount: number;
  preSoldGdvPercent: number;
  preSalesHurdlePercent: number;
  preSalesHurdleProgressRatioPercent: number;
  isPreSalesHurdleMet: boolean;
  unitsWaterfall: UnitWaterfallItem[];
  unitsForSaleCount: number;
  unitsRetainedCount: number;
  unitsSoldAndTransferredCount: number;
  totalSoldProceedsZAR: number;
  netSalesProceedsAfterDebtZAR: number;
  netCashProceedsAfterDebtZAR: number;
  remainingDebtOnRetainedUnitsZAR: number;
  isFreeCarryAchieved: boolean;
  retainedMonthlyGrossRentZAR: number;
  retainedAnnualGrossRentZAR: number;
  isSection13SexEligible: boolean;
  section13sexDeductionBaseZAR: number;
  section13sexAnnualAllowanceZAR: number;
  section13sexTwentyYearSavingsZAR: number;
  unitsNeededForSection13Sex: number;
}

export function calculateDevelopmentDebtWipeoutMatrix(
  development: DevelopmentProject,
  financials?: DevelopmentFinancialSummary | null
): DevelopmentDebtWipeoutMatrix {
  const fin = financials || calculateDevelopmentFinancials(development);
  const units = development.units || [];
  const wipeoutUnitsCount = fin.unitsRequiredForDebtWipeout;

  let debtCount = 0;
  const unitsWaterfall: UnitWaterfallItem[] = units.map((u) => {
    const isRetained = u.status === 'Retained for Rental';
    const isDebtExtinguisher = !isRetained && debtCount < wipeoutUnitsCount;
    if (isDebtExtinguisher) {
      debtCount++;
    }

    let waterfallRole: 'Senior Debt Wipeout' | 'Unencumbered Cash Profit' | 'Free-Carry Retained Equity';
    let roleBadgeText: string;
    let roleBadgeColor: 'blue' | 'emerald' | 'purple';

    if (isRetained) {
      waterfallRole = 'Free-Carry Retained Equity';
      roleBadgeText = 'Retained Equity';
      roleBadgeColor = 'purple';
    } else if (isDebtExtinguisher) {
      waterfallRole = 'Senior Debt Wipeout';
      roleBadgeText = `Debt #${debtCount}`;
      roleBadgeColor = 'blue';
    } else {
      waterfallRole = 'Unencumbered Cash Profit';
      roleBadgeText = 'Cash Profit';
      roleBadgeColor = 'emerald';
    }

    return {
      unitId: u.id,
      unitNumber: u.unitNumber,
      configuration: u.configuration,
      floorAreaSqm: u.floorAreaSqm,
      listPriceVatInclZAR: u.listPriceVatInclZAR,
      status: u.status,
      waterfallRole,
      roleBadgeText,
      roleBadgeColor,
      isDebtExtinguisher,
      debtSequenceIndex: isDebtExtinguisher ? debtCount : undefined,
    };
  });

  const isFreeCarryAchieved = fin.remainingDebtOnRetainedUnitsZAR === 0 && fin.unitsRetainedCount > 0;
  const section13sexTwentyYearSavingsZAR = fin.section13sexAnnualAllowanceZAR * 20;

  return {
    avgUnitListPriceZAR: fin.avgUnitListPriceZAR,
    outstandingDebtZAR: fin.outstandingDevFacilityZAR,
    unitsRequiredForDebtWipeout: fin.unitsRequiredForDebtWipeout,
    unencumberedUnitsCount: fin.unencumberedUnitsCount,
    totalUnitsCount: fin.totalUnitsCount,
    preSoldUnitsCount: fin.preSoldUnitsCount,
    preSoldGdvPercent: fin.preSoldGdvPercent,
    preSalesHurdlePercent: development.preSalesHurdlePercent || 0,
    preSalesHurdleProgressRatioPercent: fin.preSalesHurdleProgressRatioPercent,
    isPreSalesHurdleMet: fin.isPreSalesHurdleMet,
    unitsWaterfall,
    unitsForSaleCount: fin.unitsForSaleCount,
    unitsRetainedCount: fin.unitsRetainedCount,
    unitsSoldAndTransferredCount: fin.unitsSoldAndTransferredCount,
    totalSoldProceedsZAR: fin.totalSoldProceedsZAR,
    netSalesProceedsAfterDebtZAR: fin.netSalesProceedsAfterDebtZAR,
    netCashProceedsAfterDebtZAR: fin.netCashProceedsAfterDebtZAR,
    remainingDebtOnRetainedUnitsZAR: fin.remainingDebtOnRetainedUnitsZAR,
    isFreeCarryAchieved,
    retainedMonthlyGrossRentZAR: fin.retainedMonthlyGrossRentZAR,
    retainedAnnualGrossRentZAR: fin.retainedAnnualGrossRentZAR,
    isSection13SexEligible: fin.isSection13SexEligible,
    section13sexDeductionBaseZAR: fin.section13sexDeductionBaseZAR,
    section13sexAnnualAllowanceZAR: fin.section13sexAnnualAllowanceZAR,
    section13sexTwentyYearSavingsZAR,
    unitsNeededForSection13Sex: fin.unitsNeededForSection13Sex,
  };
}

export interface InitialUnitGeneratorInput {
  projectId: string;
  unitCount: number;
  unitConfiguration: string;
  totalBuildableAreaSqm: number;
  landPurchasePriceZAR: number;
  budgetedHardCostPerSqmZAR: number;
  listPriceVatInclZAR: number;
  estimatedMonthlyRentZAR: number;
}

export function generateInitialDevelopmentUnits(input: InitialUnitGeneratorInput): DevelopmentUnit[] {
  const count = Math.max(0, Math.round(Number(input.unitCount) || 0));
  if (count <= 0) return [];
  const areaSqm = Math.max(10, Math.round((Number(input.totalBuildableAreaSqm) || 0) / count));
  const estTdc =
    (Number(input.landPurchasePriceZAR) || 0) +
    (Number(input.totalBuildableAreaSqm) || 0) * (Number(input.budgetedHardCostPerSqmZAR) || 0);
  const allocatedCostBasisZAR = Math.round(estTdc / count);

  return Array.from({ length: count }, (_, idx) => ({
    id: `${input.projectId}-unit-${idx + 1}`,
    unitNumber: `Unit ${idx + 1}`,
    configuration: input.unitConfiguration || '2 Bed 1 Bath Cluster',
    floorAreaSqm: areaSqm,
    allocatedCostBasisZAR,
    listPriceVatInclZAR: Number(input.listPriceVatInclZAR) || 0,
    estimatedMonthlyRentZAR: Number(input.estimatedMonthlyRentZAR) || 0,
    status: 'Available' as const,
  }));
}



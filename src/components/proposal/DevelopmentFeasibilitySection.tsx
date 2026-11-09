'use client';

import React from 'react';
import {
  DevelopmentProject,
  FundingSource,
  DealStrategy,
  DealSource,
  ReturnTermType,
} from '@/types';
import {
  DevelopmentFinancialSummary,
  calculateDevelopmentFinancials,
  calculateDevelopmentCapitalStack,
  calculateDevelopmentRiskGate,
  calculateDevelopmentDebtWipeoutMatrix,
} from '@/lib/calculations/developments';
import { formatZoningTransitionLabel, calculateZoningEnvelope } from '@/lib/calculations/zoning';
import { formatZAR, formatPercent } from '@/lib/formatters';
import {
  Coins,
  TrendingUp,
  Building2,
  Hammer,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  Sparkles,
  ShieldCheck,
  Scale,
  FileCheck2,
  Layers,
  Percent,
} from 'lucide-react';

export interface DevelopmentFeasibilitySectionProps {
  /** The active development project entity */
  development: DevelopmentProject;
  /** Pre-calculated financial summary (optional; computes dynamically if omitted) */
  financials?: DevelopmentFinancialSummary;
  /** Whether after-tax figures are active by default (optional) */
  showAfterTax?: boolean;
  /** External callback for toggling tax view (optional) */
  onToggleAfterTax?: () => void;
  /** Class name override for outer container */
  className?: string;
}

/**
 * Normalizes a DevelopmentProject into the proposal deal candidate structure.
 * Sourced directly into allDeals in src/app/proposal/page.tsx.
 */
export function mapDevelopmentToProposalDeal(
  d: DevelopmentProject,
  fundingList: FundingSource[] = []
) {
  const fin = calculateDevelopmentFinancials(d);
  const holdingMonths = Math.max(
    1,
    (d.preApprovalMonths || 0) + (d.constructionMonths || 0) + (d.sellDownMonths || 0)
  );
  const activeHoldingMonths = Math.max(
    1,
    (d.preApprovalMonths || 0) + (d.constructionMonths || 0)
  );
  const monthlyHoldingCost = Math.round(fin.totalCarryingCostZAR / activeHoldingMonths);
  const isRetainedOnly =
    d.units && d.units.length > 0 && d.units.every((u) => u.status === 'Retained for Rental');
  const strategy: DealStrategy = isRetainedOnly ? 'Rental' : 'Flip';

  const linkedFunding = fundingList.find(
    (f) => f.id === d.linkedFundingSourceId || f.linkedDealId === d.id
  );
  const fundingRequiredZAR =
    linkedFunding?.capitalAmountZAR ?? d.developmentFacilityLimitZAR ?? 0;
  const capitalRaisedZAR =
    linkedFunding?.totalRepaidZAR ? 0 : (d.developmentFacilityDrawnZAR ?? 0);

  return {
    id: d.id,
    type: 'development' as const,
    title: d.title,
    address: d.address,
    city: d.city,
    openMarketValue: fin.gdvInclVatZAR,
    purchasePrice: d.landPurchasePriceZAR || 0,
    builtInEquity: Math.max(0, fin.netRealizableGdvZAR - fin.tdcZAR),
    builtInEquityPercent:
      fin.tdcZAR > 0
        ? Number(((fin.netProfitBeforeTaxZAR / fin.tdcZAR) * 100).toFixed(1))
        : 0,
    amenityScorecard: {
      schools: '0-5km' as const,
      policeStation: '0-5km' as const,
      medicalClinic: '0-5km' as const,
      shoppingMall: '0-5km' as const,
      compositeGrade: 'A-Grade (Prime Hub)' as const,
      compositeScore: 12,
    },
    acquisitionCosts: (d.acquisitionCostsZAR || 0) + fin.totalSoftCostsZAR,
    renovationBudget: fin.activeHardBuildCostZAR,
    strategy,
    source: 'Direct Owner' as DealSource,
    auctioneerCommission: 0,
    municipalArrears: d.sec118ArrearsZAR || 0,
    isSection13Eligible: fin.isSection13SexEligible,
    holdingDurationMonths: holdingMonths,
    exitCommissionPercent: 5.0,
    bondCancellationFeeZAR: undefined,
    earlyTerminationNoticeGiven: undefined,
    earlyTerminationPenaltyZAR: undefined,
    bondLTV: 0,
    monthlyBondHolding: 0,
    monthlyLeviesHolding: 0,
    monthlyRatesHolding: 0,
    monthlyOtherHolding: 0,
    monthlyHoldingCost,
    targetExitPrice: fin.gdvInclVatZAR,
    completionDate: undefined,
    boq: undefined,
    notes: d.notes,
    fundingRequiredZAR,
    capitalRaisedZAR,
    primaryFunderName: linkedFunding?.lenderName || 'Senior Bank / DFI Facility',
    primaryFunderContact: linkedFunding?.contactPerson || linkedFunding?.entityOrContact || '',
    primaryFunderType: (linkedFunding?.fundingType || 'Private Lender') as any,
    coFundersNotes: linkedFunding?.notes || '',
    promisedReturnType: (linkedFunding?.returnTermsType || 'Fixed Interest') as ReturnTermType,
    promisedReturnRatePercent: linkedFunding?.returnRatePercent || 13.5,
    promisedPayoutSchedule: (linkedFunding?.paymentSchedule || 'Monthly Interest') as any,
    securityOffered: linkedFunding?.securityOffered || '1st Covering Mortgage Bond over Land & Works',
    monthlyRent: fin.retainedMonthlyGrossRentZAR,
    monthlyLevies: 0,
    monthlyRates: 0,
    tenantPlacementFeePercent: undefined,
    annualSpvAdminAuditFeeZAR: undefined,
    refinanceLtvPercent: undefined,
    depositZAR: 0,
    loanToValue: 100,
    interestRatePercent: 11.75,
    loanTermYears: 20,
    annualCapitalGrowthPercent: 5.0,
    annualRentalEscalationPercent: 6.0,
    annualExpenseInflationPercent: 6.0,
    bondTermYears: 20,
    extraMonthlyPaymentZAR: undefined,
    ancillaryIncomes: [],
    tenantArrears: 0,
    overdueMonths: 0,
    collectionRate: 100,
    totalCollected12m: 0,
    totalBilled12m: 0,
    paidInFullMonths: 0,
    totalTrackedMonths: 0,
    arrearsWriteOffsTotal: 0,
    isCollectionRisk: false,
    actualCollectedRentAvg: 0,
    adjustedVacancyRate: 5,
    rawRental: undefined,
    rawDevelopment: d,
    developmentFinancials: fin,
    occupantRisk: undefined,
  };
}

/**
 * Institutional Development Feasibility & Capital Stack presentation section.
 * Mounts cleanly inside src/app/proposal/page.tsx when deal.type === 'development'.
 * Zero inline financial calculations in JSX.
 * Zero Unicode emojis or Dingbats glyphs.
 * Print/PDF compatible with explicit page-break avoidance.
 */
export function DevelopmentFeasibilitySection({
  development,
  financials,
  className = '',
}: DevelopmentFeasibilitySectionProps) {
  const fin = financials || calculateDevelopmentFinancials(development);
  const capitalStack = calculateDevelopmentCapitalStack(development, fin);
  const riskGate = calculateDevelopmentRiskGate(development, fin);
  const wipeoutMatrix = calculateDevelopmentDebtWipeoutMatrix(development, fin);
  const zoningEnvelope = development.zoningProfile
    ? calculateZoningEnvelope(
        development.zoningProfile,
        development.totalBuildableAreaSqm || 0,
        development.units?.length || 1
      )
    : null;

  return (
    <section className={`space-y-6 print:space-y-4 ${className}`}>
      {/* SECTION HEADER & REGULATORY BADGE STRIP */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-slate-300 print:bg-white print:text-slate-900 break-inside-avoid print:break-inside-avoid">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600 print:text-amber-700" />
              <h3 className="text-lg font-bold text-slate-900">
                Development Feasibility & Institutional Capital Stack
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              SPLUMA Section 42 Proclamation &bull; Senior Debt Tranche Controls &bull; Pre-Sales Wipeout Matrix
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 print:bg-amber-100 print:text-amber-800 print:border-amber-300">
              {development.developmentType || 'Sectional Title Apartments'}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 border border-sky-200 print:bg-sky-100 print:text-sky-800 print:border-sky-300">
              {capitalStack.isVatRegisteredDeveloper
                ? '15% VAT Registered Developer (R0 Buyer Duty)'
                : 'Non-VAT Developer'}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 print:bg-emerald-100 print:text-emerald-800 print:border-emerald-300">
              {fin.taxEntityType} ({fin.effectiveTaxRatePercent}% CIT)
            </span>
          </div>
        </div>

        {/* 1-Line Zoning & Town Planning Rights Summary */}
        {development.zoningProfile && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">Town Planning &amp; Zoning Rights:</span>
              <span className="font-bold text-slate-900">
                {formatZoningTransitionLabel(development.zoningProfile.currentZoning, development.zoningProfile.targetZoning)}
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-600">
                Erf: {development.zoningProfile.erfSizeSqm.toLocaleString('en-ZA')} m² &bull; FAR {development.zoningProfile.farRatio} ({development.totalBuildableAreaSqm} m² planned / {zoningEnvelope?.maxPermittedBulkSqm.toLocaleString('en-ZA')} m² max bulk)
              </span>
            </div>
            <div>
              {zoningEnvelope?.isSplumaRezoningTriggered ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 print:bg-amber-100 print:text-amber-900">
                  Subject to SPLUMA Section 42 Rezoning
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 print:bg-emerald-100 print:text-emerald-900">
                  As-of-Right Statutory Zoning (No Rezoning Required)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4-PILLAR BANK FINANCE CHECKLIST STRIP */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm print:border-slate-300 print:bg-white print:text-slate-900 break-inside-avoid print:break-inside-avoid space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 print:text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              4-Pillar Commercial Bank Lending Readiness
            </h4>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
            fin.bankReadiness.overallBankable
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 print:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 print:bg-amber-100'
          }`}>
            {fin.bankReadiness.overallBankable ? 'Bank Finance Pre-Vetted' : 'Bank Covenants In Progress'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Pillar 1: Paper Rights */}
          <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
            fin.bankReadiness.paperRights.met
              ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
              : 'bg-amber-50/50 border-amber-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-semibold text-slate-700 text-[11px]">1. Paper Rights</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                fin.bankReadiness.paperRights.met
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {fin.bankReadiness.paperRights.statusLabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {fin.bankReadiness.paperRights.details}
            </p>
          </div>

          {/* Pillar 2: QS & Geotech */}
          <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
            fin.bankReadiness.qsAndGeotech.met
              ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
              : 'bg-amber-50/50 border-amber-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-semibold text-slate-700 text-[11px]">2. QS &amp; Geotech</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                fin.bankReadiness.qsAndGeotech.met
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {fin.bankReadiness.qsAndGeotech.statusLabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {fin.bankReadiness.qsAndGeotech.details}
            </p>
          </div>

          {/* Pillar 3: Pre-Sales Gate */}
          <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
            fin.bankReadiness.preSalesGate.met
              ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
              : 'bg-amber-50/50 border-amber-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-semibold text-slate-700 text-[11px]">3. Pre-Sales Gate</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                fin.bankReadiness.preSalesGate.met
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {fin.bankReadiness.preSalesGate.statusLabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {fin.bankReadiness.preSalesGate.details}
            </p>
          </div>

          {/* Pillar 4: Delivery Track Record */}
          <div className={`p-2.5 rounded-lg border flex flex-col justify-between ${
            fin.bankReadiness.deliveryTrackRecord.met
              ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-semibold text-slate-700 text-[11px]">4. Delivery Record</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                fin.bankReadiness.deliveryTrackRecord.met
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {fin.bankReadiness.deliveryTrackRecord.statusLabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {fin.bankReadiness.deliveryTrackRecord.details}
            </p>
          </div>
        </div>
      </div>

      {/* PART 1: INSTITUTIONAL TDC VS GDV CAPITAL STACK */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-slate-300 print:bg-white print:text-slate-900 break-inside-avoid print:break-inside-avoid space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Coins className="w-5 h-5 text-amber-600 print:text-amber-700" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Part 1: Institutional TDC vs GDV Capital Stack
          </h4>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
          {/* Card 1: Total Development Cost */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 print:border-slate-200 print:bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
              Total Development Cost (TDC)
            </span>
            <span
              data-sensitive="true"
              className="text-lg font-bold font-mono text-slate-900 block mt-1"
            >
              {formatZAR(capitalStack.tdcZAR)}
            </span>
            <span className="text-[11px] text-slate-600 block mt-0.5">
              {formatZAR(capitalStack.tdcPerSqmZAR)}/m² &bull; {formatZAR(capitalStack.tdcPerUnitZAR)}/unit
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
              Land: {formatZAR(fin.landCostPerUnitZAR)}/unit ({fin.landToGdvPercent.toFixed(1)}% GDV)
              {fin.isLandCostElevated && (
                <span className="ml-1 text-amber-700 font-bold">(Elevated Land Cost)</span>
              )}
            </span>
            {fin.isDeferredLandPaymentLAA && (
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                Day-1 Equity: {formatZAR(fin.day1EquityOutlayZAR)} (LAA / Land JV)
              </span>
            )}
          </div>

          {/* Card 2: Gross Development Value */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 print:border-slate-200 print:bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
              Gross Development Value (GDV)
            </span>
            <span
              data-sensitive="true"
              className="text-lg font-bold font-mono text-slate-900 block mt-1"
            >
              {formatZAR(capitalStack.gdvInclVatZAR)}
            </span>
            <span className="text-[11px] text-slate-600 block mt-0.5">
              {formatZAR(capitalStack.netRealizableGdvZAR)} Net &bull; {capitalStack.gdvToTdcMultiple}x GDV
            </span>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                fin.isWithinEndUserBondCeiling
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 print:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-200 print:bg-rose-100'
              }`}>
                <span>Bond Ceiling:</span>
                <span>Avg {formatZAR(fin.avgUnitListPriceZAR)} vs {formatZAR(fin.suburbEndUserBondCeilingZAR)}</span>
                <span>({fin.isWithinEndUserBondCeiling ? 'Pass' : 'Exceeds'})</span>
              </span>
            </div>
          </div>

          {/* Card 3: Profit on Cost */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 print:border-slate-200 print:bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
              Profit on Cost (POC %)
            </span>
            <span className="text-lg font-bold font-mono text-emerald-700 block mt-1">
              {formatPercent(capitalStack.pocPercent)} Pre-Tax
            </span>
            <span
              data-sensitive="true"
              className="text-[11px] text-slate-600 block mt-0.5"
            >
              After-Tax: {formatPercent(capitalStack.afterTaxPocPercent)} &bull; {formatZAR(capitalStack.netProfitAfterTaxZAR)}
            </span>
          </div>

          {/* Card 4: Hard Construction Build */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 print:border-slate-200 print:bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
              Active Hard Build
            </span>
            <span
              data-sensitive="true"
              className="text-lg font-bold font-mono text-slate-900 block mt-1"
            >
              {formatZAR(fin.activeHardBuildCostZAR)}
            </span>
            <span className="text-[11px] text-slate-600 block mt-0.5">
              Budget: {formatZAR(development.budgetedHardCostPerSqmZAR || 0)}/m² &bull; Act: {formatZAR(fin.actualBoqSpendPerSqmZAR)}/m²
            </span>
          </div>
        </div>

        {/* Itemized Capital Stack Waterfall Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Tranche Component</th>
                <th className="py-2.5 px-3 font-semibold">Statutory / Operational Basis</th>
                <th className="py-2.5 px-3 font-semibold text-right">Allocation (ZAR)</th>
                <th className="py-2.5 px-3 font-semibold text-right">% of TDC</th>
                <th className="py-2.5 px-3 font-semibold">Draw Condition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {capitalStack.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    <span className="font-semibold block">{item.title}</span>
                    <span className="text-[10px] text-slate-500">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                    {item.statutoryBasis}
                  </td>
                  <td
                    data-sensitive="true"
                    className="py-2.5 px-3 font-mono font-semibold text-right text-slate-900"
                  >
                    {formatZAR(item.amountZAR)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-700">
                    {formatPercent(item.percentOfTdc)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                    {item.drawCondition}
                  </td>
                </tr>
              ))}
              {/* Summary Row */}
              <tr className="border-t-2 border-slate-400 font-bold bg-slate-100">
                <td className="py-3 px-3 text-slate-900">
                  TOTAL DEVELOPMENT COST (TDC)
                </td>
                <td className="py-3 px-3 text-slate-600 text-[11px]">
                  Full Capital Outlay Stack & Reserves
                </td>
                <td
                  data-sensitive="true"
                  className="py-3 px-3 font-mono text-right text-slate-900 text-sm"
                >
                  {formatZAR(capitalStack.tdcZAR)}
                </td>
                <td className="py-3 px-3 font-mono text-right text-slate-800">
                  100.0%
                </td>
                <td className="py-3 px-3 text-slate-700 text-[11px]">
                  Fully Funded Stack
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PART 2: 2-STAGE RISK GATE CALLOUT */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-slate-300 print:bg-white print:text-slate-900 break-inside-avoid print:break-inside-avoid space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Scale className="w-5 h-5 text-amber-600 print:text-amber-700" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Part 2: 2-Stage Risk Gate Callout (Senior Lender Tranche Controls)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
          {/* Stage 1: Paper Rights & Town Planning */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 print:border-slate-200 print:bg-slate-50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-xs uppercase text-slate-800">
                  Stage 1: Paper Rights & Statutory Approvals
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 print:bg-amber-100 print:text-amber-800 print:border-amber-300 flex items-center gap-1">
                {riskGate.isStage1Approved ? (
                  <Unlock className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-600" />
                )}
                {riskGate.stage1RingFenceLabel}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {riskGate.stage1RingFenceDescription}
            </p>

            <div className="space-y-1.5 pt-1">
              {riskGate.stage1Items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-200 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {item.isApproved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span className="text-slate-700 text-[11px]">
                      {item.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.isApproved
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 print:bg-emerald-100 print:text-emerald-800'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 print:bg-amber-100 print:text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[10px] text-slate-600 border-t border-slate-200">
              <span className="font-semibold text-slate-700">
                Lender Protection Covenant:
              </span>{' '}
              Stage 1 paper rights are 100% sponsor-funded. Zero senior bank debt is disbursed until all 4 statutory approvals are proclaimed.
            </div>
          </div>

          {/* Stage 2: Wet Works & Senior Debt Facility */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 print:border-slate-200 print:bg-slate-50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-xs uppercase text-slate-800">
                  Stage 2: Wet Works Draws & Facility
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200 print:bg-sky-100 print:text-sky-800 print:border-sky-300 flex items-center gap-1">
                {riskGate.isStage2Unlocked ? (
                  <Unlock className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-600" />
                )}
                {riskGate.stage2DrawLabel}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {riskGate.stage2DrawDescription}
            </p>

            {/* Senior Facility Tranche Progress */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Senior Facility Limit</span>
                <span data-sensitive="true" className="font-bold font-mono text-slate-900">
                  {formatZAR(riskGate.facilityLimitZAR)}
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Drawn to Date</span>
                <span data-sensitive="true" className="font-bold font-mono text-slate-900">
                  {formatZAR(riskGate.facilityDrawnZAR)}
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Repaid from Sales</span>
                <span data-sensitive="true" className="font-bold font-mono text-emerald-700">
                  {formatZAR(riskGate.facilityRepaidZAR)}
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Undrawn Capacity</span>
                <span data-sensitive="true" className="font-bold font-mono text-slate-900">
                  {formatZAR(riskGate.availableFacilityUndrawnZAR)}
                </span>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              {riskGate.stage2Items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-200 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    {item.isApproved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span className="text-slate-700 text-[11px]">
                      {item.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.isApproved
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 print:bg-emerald-100 print:text-emerald-800'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 print:bg-amber-100 print:text-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-[10px] text-slate-600 border-t border-slate-200">
              <span className="font-semibold text-slate-700">
                Disbursement Covenant:
              </span>{' '}
              Senior bank debt disbursements are released in progressive tranches strictly against registered Quantity Surveyor (QS) inspection certificates.
            </div>
          </div>
        </div>
      </div>

      {/* PART 3: DEBT WIPEOUT & PRE-SALES BREAKEVEN MATRIX */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-slate-300 print:bg-white print:text-slate-900 break-inside-avoid print:break-inside-avoid space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Layers className="w-5 h-5 text-amber-600 print:text-amber-700" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Part 3: Debt Wipeout & Pre-Sales Breakeven Matrix
          </h4>
        </div>

        {/* 4 Breakeven KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 print:border-slate-200 print:bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
              Average List Price
            </span>
            <span
              data-sensitive="true"
              className="text-lg font-bold font-mono text-slate-900 block mt-1"
            >
              {formatZAR(wipeoutMatrix.avgUnitListPriceZAR)}
            </span>
            <span className="text-[11px] text-slate-600 block mt-0.5">
              VAT-inclusive list price
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 print:border-slate-200 print:bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
              Units for 100% Debt Wipeout
            </span>
            <span className="text-lg font-bold font-mono text-sky-700 block mt-1">
              {wipeoutMatrix.unitsRequiredForDebtWipeout} of {wipeoutMatrix.totalUnitsCount} Units
            </span>
            <span
              data-sensitive="true"
              className="text-[11px] text-slate-600 block mt-0.5"
            >
              Remaining Debt: {formatZAR(wipeoutMatrix.outstandingDebtZAR)}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 print:border-slate-200 print:bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
              Unencumbered Units
            </span>
            <span className="text-lg font-bold font-mono text-emerald-700 block mt-1">
              {wipeoutMatrix.unencumberedUnitsCount} Units
            </span>
            <span className="text-[11px] text-slate-600 block mt-0.5">
              Debt-free profit / retained equity
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 print:border-slate-200 print:bg-slate-50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block">
              Pre-Sales Bank Hurdle
            </span>
            <span className="text-lg font-bold font-mono text-amber-700 block mt-1">
              {wipeoutMatrix.preSoldGdvPercent.toFixed(1)}% Pre-Sold
            </span>
            <span className="text-[11px] text-slate-600 block mt-0.5">
              {wipeoutMatrix.preSalesHurdlePercent}% Required &bull;{' '}
              {wipeoutMatrix.isPreSalesHurdleMet ? 'HURDLE MET' : 'PENDING'}
            </span>
          </div>
        </div>

        {/* Pre-Sales Hurdle Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Pre-Sales Hurdle Bank Coverage</span>
            <span className="font-semibold text-slate-800">
              {wipeoutMatrix.preSalesHurdleProgressRatioPercent}% of Target
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                wipeoutMatrix.isPreSalesHurdleMet ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${wipeoutMatrix.preSalesHurdleProgressRatioPercent}%` }}
            />
          </div>
        </div>

        {/* Unit-by-Unit Waterfall Grid */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
            Unit Inventory Waterfall Allocation
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {wipeoutMatrix.unitsWaterfall.map((unit) => (
              <div
                key={unit.unitId}
                className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 print:border-slate-200 print:bg-slate-50 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Unit {unit.unitNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      unit.roleBadgeColor === 'blue'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 print:bg-blue-100 print:text-blue-800'
                        : unit.roleBadgeColor === 'emerald'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 print:bg-emerald-100 print:text-emerald-800'
                        : 'bg-purple-50 text-purple-800 border border-purple-200 print:bg-purple-100 print:text-purple-800'
                    }`}
                  >
                    {unit.roleBadgeText}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 truncate">
                  {unit.configuration} &bull; {unit.floorAreaSqm}m²
                </div>
                <div
                  data-sensitive="true"
                  className="font-mono font-semibold text-slate-800 text-[11px]"
                >
                  {formatZAR(unit.listPriceVatInclZAR)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {unit.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hybrid Split-Exit & SARS Section 13sex 55% Tax Shield Callout */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/70 p-4 print:border-purple-300 print:bg-purple-50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <span className="font-bold text-sm text-purple-900">
                Hybrid Split-Exit & SARS Section 13sex Tax Shield
              </span>
            </div>
            <span className="text-xs font-semibold text-purple-800">
              {wipeoutMatrix.unitsForSaleCount} for Sale &bull; {wipeoutMatrix.unitsRetainedCount} Retained for Rental
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded border border-purple-200">
              <span className="text-purple-700 block text-[10px] font-semibold uppercase">
                Net Proceeds After Debt
              </span>
              <span
                data-sensitive="true"
                className="font-bold font-mono text-slate-900 text-sm block mt-0.5"
              >
                {formatZAR(wipeoutMatrix.netCashProceedsAfterDebtZAR)}
              </span>
              <span className="text-[10px] text-purple-600 block mt-0.5">
                Surplus cash credited to reserve
              </span>
            </div>

            <div className="bg-white p-2.5 rounded border border-purple-200">
              <span className="text-purple-700 block text-[10px] font-semibold uppercase">
                Free-Carry Retained Debt
              </span>
              <span
                data-sensitive="true"
                className="font-bold font-mono text-emerald-700 text-sm block mt-0.5"
              >
                {formatZAR(wipeoutMatrix.remainingDebtOnRetainedUnitsZAR)}
              </span>
              <span className="text-[10px] text-purple-600 block mt-0.5">
                {wipeoutMatrix.isFreeCarryAchieved
                  ? '100% Free-Carry (Debt-Free)'
                  : 'Partial Debt Remaining'}
              </span>
            </div>

            <div className="bg-white p-2.5 rounded border border-purple-200">
              <span className="text-purple-700 block text-[10px] font-semibold uppercase">
                Retained Gross Rent
              </span>
              <span
                data-sensitive="true"
                className="font-bold font-mono text-slate-900 text-sm block mt-0.5"
              >
                {formatZAR(wipeoutMatrix.retainedMonthlyGrossRentZAR)}/mo
              </span>
              <span
                data-sensitive="true"
                className="text-[10px] text-purple-600 block mt-0.5"
              >
                {formatZAR(wipeoutMatrix.retainedAnnualGrossRentZAR)}/yr gross income
              </span>
            </div>
          </div>

          {wipeoutMatrix.isSection13SexEligible ? (
            <div className="rounded-md bg-purple-100/60 p-3 border border-purple-300 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-bold text-purple-900">
                  SARS Section 13sex 55% Residential Building Tax Shield (Active & Unlocked)
                </span>
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                Portfolio qualifies with 5 or more new residential units retained for rental. Under Section 13sex of the Income Tax Act 58 of 1962, 55% of the acquisition/build cost basis is deductible at 5% straight-line per annum over 20 years against taxable income.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2 rounded border border-purple-200">
                  <span className="text-purple-600 block text-[10px]">55% Cost Basis Base</span>
                  <span data-sensitive="true" className="font-bold font-mono text-purple-900">
                    {formatZAR(wipeoutMatrix.section13sexDeductionBaseZAR)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-purple-200">
                  <span className="text-purple-600 block text-[10px]">Annual Tax Allowance (5%)</span>
                  <span data-sensitive="true" className="font-bold font-mono text-emerald-700">
                    {formatZAR(wipeoutMatrix.section13sexAnnualAllowanceZAR)}/yr
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-purple-200">
                  <span className="text-purple-600 block text-[10px]">20-Year Cumulative Shield</span>
                  <span data-sensitive="true" className="font-bold font-mono text-purple-900">
                    {formatZAR(wipeoutMatrix.section13sexTwentyYearSavingsZAR)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-slate-100 p-2.5 text-[11px] text-slate-600 flex items-center gap-2 border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                SARS Section 13sex Tax Shield: Requires 5+ units retained for rental ({wipeoutMatrix.unitsRetainedCount} currently retained; {wipeoutMatrix.unitsNeededForSection13Sex} more needed to activate the 55% tax shield).
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

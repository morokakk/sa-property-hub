'use client';

import React from 'react';
import { RentalProperty } from '@/types';
import { formatZAR, formatPercent } from '@/lib/formatters';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  FileCheck2,
  Info,
  AlertCircle,
} from 'lucide-react';
import { calculatePropertyArrears, getMonthKey } from '@/lib/calculations/arrears';

interface ActualVsBudgetKpiStripProps {
  rentals: RentalProperty[];
  title?: string;
  showSubtitle?: boolean;
}

export function getSaTaxYearInfo(targetDate: Date = new Date()) {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar...

  // SA Tax Year: 1 March to 28/29 February
  const startYear = month >= 2 ? year : year - 1;
  const endYear = startYear + 1;
  const startDateStr = `${startYear}-03-01`;
  const isLeap = (endYear % 4 === 0 && endYear % 100 !== 0) || endYear % 400 === 0;
  const endDateStr = `${endYear}-02-${isLeap ? '29' : '28'}`;

  let elapsedMonths = 0;
  if (month >= 2) {
    elapsedMonths = month - 2 + 1;
  } else {
    elapsedMonths = 10 + (month + 1);
  }

  const label = `SA Tax Year ${startYear}/${String(endYear).slice(2)} (1 Mar ${startYear} – ${isLeap ? '29' : '28'} Feb ${endYear})`;

  return {
    startYear,
    endYear,
    startDateStr,
    endDateStr,
    elapsedMonths: Math.min(12, Math.max(1, elapsedMonths)),
    label,
  };
}

export default function ActualVsBudgetKpiStrip({
  rentals,
  title = 'Actuals YTD vs. Budget (SA Tax Year)',
  showSubtitle = true,
}: ActualVsBudgetKpiStripProps) {
  const activeRentals = rentals.filter((r) => r.status !== 'Sold');
  const taxYearInfo = getSaTaxYearInfo();
  const elapsedMonths = taxYearInfo.elapsedMonths;

  // 1. Budget Calculations (Contractual / Baseline Pro-Rated to Elapsed Months)
  let budgetedGrossRentYTD = 0;
  let budgetedOpexYTD = 0;
  let budgetedBondPaymentYTD = 0;
  let budgetedSec11aInterestYTD = 0;

  activeRentals.forEach((r) => {
    const isFreehold = r.propertyType === 'Freehold House';
    const grossMonthly = r.monthlyGrossRentZAR || 0;
    const levies = isFreehold ? 0 : (r.monthlyLeviesZAR || 0);
    const rates = r.monthlyRatesTaxesZAR || 0;
    const maint = r.monthlyMaintenanceReserveZAR || 0;
    const insurance = isFreehold ? Math.round((r.annualBuildingInsuranceZAR || 0) / 12) : 0;

    let agentFee = 0;
    if (r.managementType === 'Agency') {
      if (typeof r.monthlyAgentFeeZAR === 'number' && r.monthlyAgentFeeZAR > 0) {
        agentFee = r.monthlyAgentFeeZAR;
      } else if (typeof r.agencyCommissionPercent === 'number' && r.agencyCommissionPercent > 0) {
        const baseComm = grossMonthly * (r.agencyCommissionPercent / 100);
        const vatMultiplier = r.agencyVatApplicable !== false ? 1.15 : 1.0;
        agentFee = Math.round(baseComm * vatMultiplier);
      }
    }
    const prepaidVending = r.monthlyPrepaidVendingFeeZAR || 0;
    const monthlyOpex = levies + rates + maint + insurance + agentFee + prepaidVending;
    const monthlyBond = r.monthlyBondPaymentZAR || 0;

    const monthlyInterest = (r.outstandingBondBalanceZAR && r.bondInterestRatePercent)
      ? Math.round((r.outstandingBondBalanceZAR * (r.bondInterestRatePercent / 100)) / 12)
      : 0;

    budgetedGrossRentYTD += grossMonthly * elapsedMonths;
    budgetedOpexYTD += monthlyOpex * elapsedMonths;
    budgetedBondPaymentYTD += monthlyBond * elapsedMonths;
    budgetedSec11aInterestYTD += monthlyInterest * elapsedMonths;
  });

  const budgetedNetCashflowYTD = budgetedGrossRentYTD - budgetedOpexYTD - budgetedBondPaymentYTD;

  // 2. Actuals Calculations (Audited Transactions & Recorded Payments within Tax Year)
  let actualGrossRentYTD = 0;
  let actualOpexYTD = 0;
  let actualBondInterestYTD = 0;
  let actualBondCapitalYTD = 0;
  let totalLoggedTransactionsCount = 0;

  activeRentals.forEach((r) => {
    const txList = r.transactions || [];
    txList.forEach((tx) => {
      if (tx.date >= taxYearInfo.startDateStr && tx.date <= taxYearInfo.endDateStr) {
        totalLoggedTransactionsCount += 1;
        const amt = tx.amountZAR || 0;
        if (tx.category === 'gross_rent') {
          actualGrossRentYTD += amt;
        } else if (
          tx.category === 'rates_taxes' ||
          tx.category === 'levies' ||
          tx.category === 'agent_commission' ||
          tx.category === 'repairs_maintenance' ||
          tx.category === 'insurance' ||
          tx.category === 'other'
        ) {
          actualOpexYTD += amt;
        } else if (tx.category === 'bond_interest') {
          actualBondInterestYTD += amt;
        } else if (tx.category === 'bond_capital') {
          actualBondCapitalYTD += amt;
        }
      }
    });
  });

  // 3. Logged Payment Records (count as collected rent when manual Transaction records are absent)
  let actualPaymentRecordsGrossRentYTD = 0;
  let hasLoggedPaymentRecords = false;

  activeRentals.forEach((r) => {
    (r.paymentRecords || []).forEach((p) => {
      if (p.paymentDate >= taxYearInfo.startDateStr && p.paymentDate <= taxYearInfo.endDateStr) {
        actualPaymentRecordsGrossRentYTD += p.amountReceivedZAR || 0;
        hasLoggedPaymentRecords = true;
      }
    });
  });

  // 4. Calculate tenant arrears strictly accrued within current tax year, plus total cumulative arrears
  const taxYearStartMonth = `${taxYearInfo.startYear}-03`;
  const currentMonthKey = getMonthKey();
  let currentTaxYearArrears = 0;
  let totalCumulativeArrears = 0;

  activeRentals.forEach((r) => {
    const arrearsResult = calculatePropertyArrears(r);
    totalCumulativeArrears += Math.max(0, arrearsResult.totalArrearsZAR);

    // Sum uncollected net variance for billing months strictly within current tax year up to current month
    const taxYearLedgerItems = (arrearsResult.ledger || []).filter(
      (item) => item.month >= taxYearStartMonth && item.month <= currentMonthKey
    );
    const rentalTaxYearArrears = taxYearLedgerItems.reduce(
      (sum, item) => sum + Math.max(0, item.netVariance),
      0
    );
    currentTaxYearArrears += rentalTaxYearArrears;
  });

  // Effective collected rent determination:
  // Preference 1: Manual Transaction ledger records
  // Preference 2: Logged paymentRecords within current tax year
  // Preference 3: Budgeted gross rent minus arrears accrued strictly within current tax year
  const hasTransactions = totalLoggedTransactionsCount > 0;
  const effectiveActualRent = hasTransactions
    ? actualGrossRentYTD
    : hasLoggedPaymentRecords
    ? actualPaymentRecordsGrossRentYTD
    : Math.max(0, budgetedGrossRentYTD - currentTaxYearArrears);

  const effectiveActualOpex = hasTransactions ? actualOpexYTD : budgetedOpexYTD;
  const effectiveActualInterest = hasTransactions ? actualBondInterestYTD : budgetedSec11aInterestYTD;
  const effectiveActualNet = effectiveActualRent - effectiveActualOpex - (hasTransactions ? (actualBondInterestYTD + actualBondCapitalYTD) : budgetedBondPaymentYTD);

  // Variances
  const rentVarianceZAR = effectiveActualRent - budgetedGrossRentYTD;
  const rentVariancePercent = budgetedGrossRentYTD > 0 ? (effectiveActualRent / budgetedGrossRentYTD) * 100 : 100;

  const opexVarianceZAR = effectiveActualOpex - budgetedOpexYTD;
  const opexVariancePercent = budgetedOpexYTD > 0 ? (effectiveActualOpex / budgetedOpexYTD) * 100 : 100;

  const netVarianceZAR = effectiveActualNet - budgetedNetCashflowYTD;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Header with SA Tax Year Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {taxYearInfo.label}
              </span>
              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Month {elapsedMonths} of 12 YTD
              </span>
            </div>
            {showSubtitle && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                {hasTransactions
                  ? 'Audited Section 11(a) operating comparison between budgeted income/expenses and actual ledger transactions.'
                  : 'Section 11(a) Operational Overview comparing pro-rated annual budget against tracked revenue and expenses.'}
              </p>
            )}
          </div>
        </div>

        {!hasTransactions && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {hasLoggedPaymentRecords
                ? `Derived from ${formatZAR(effectiveActualRent)} logged tenant payment records`
                : currentTaxYearArrears > 0
                ? `Adjusted for ${formatZAR(currentTaxYearArrears)} current tax year tenant arrears`
                : 'Tracking against budgeted baseline (0 transactions logged for YTD)'}
            </span>
          </div>
        )}
      </div>

      {/* 4-Column KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Gross Rental Income */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider">Collected Rent (Code 4210)</span>
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-slate-900">
              {formatZAR(effectiveActualRent)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center justify-between gap-1">
              <span>Budget YTD: <strong className="text-slate-700">{formatZAR(budgetedGrossRentYTD)}</strong></span>
              {!hasTransactions && !hasLoggedPaymentRecords && currentTaxYearArrears > 0 && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title="Active unpaid tenant arrears accrued in current tax year deducted from collected rent">
                  Tax Year Arrears: -{formatZAR(currentTaxYearArrears)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Target Pace:</span>
            <span className={`font-bold flex items-center gap-0.5 ${rentVarianceZAR >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {rentVarianceZAR >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatPercent(rentVariancePercent)} ({rentVarianceZAR >= 0 ? '+' : ''}{formatZAR(rentVarianceZAR)})
            </span>
          </div>
        </div>

        {/* 2. Operational Expense Burn */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider">Opex Burn (Levies, Rates, Fees)</span>
              <Scale className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg font-black text-slate-900">
              {formatZAR(effectiveActualOpex)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Budget YTD: <strong className="text-slate-700">{formatZAR(budgetedOpexYTD)}</strong>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Burn Variance:</span>
            <span className={`font-bold flex items-center gap-0.5 ${opexVarianceZAR <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {opexVarianceZAR <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {formatPercent(opexVariancePercent)} ({opexVarianceZAR <= 0 ? 'Under' : 'Over'} by {formatZAR(Math.abs(opexVarianceZAR))})
            </span>
          </div>
        </div>

        {/* 3. Net Cash Flow YTD */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-semibold uppercase tracking-wider">Net Cash Flow YTD</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className={`text-lg font-black ${effectiveActualNet >= 0 ? 'text-emerald-800' : 'text-rose-600'}`}>
              {formatZAR(effectiveActualNet)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Budget YTD: <strong className="text-slate-700">{formatZAR(budgetedNetCashflowYTD)}</strong>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Net Variance:</span>
            <span className={`font-bold ${netVarianceZAR >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {netVarianceZAR >= 0 ? '+' : ''}{formatZAR(netVarianceZAR)} vs Budget
            </span>
          </div>
        </div>

        {/* 4. Section 11(a) Deductible Bond Interest */}
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] text-emerald-800 mb-1">
              <span className="font-semibold uppercase tracking-wider">Sec 11(a) Deductible Interest</span>
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="text-lg font-black text-emerald-950">
              {formatZAR(effectiveActualInterest)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5" title="Bond interest is tax-deductible under SARS Section 11(a); capital repayments are strictly non-deductible.">
              Excludes bond capital repayments
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800">
            <span className="font-medium">ITR12 Code 4216</span>
            <span className="font-bold">SARS Shield Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  Calendar,
  Building,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  FileText,
  Zap,
  Droplets,
  CreditCard,
  Download,
} from 'lucide-react';
import { PublicTenantStatementPayload } from '@/types/tenantStatement';
import { TenantPaymentRecord } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';

interface TenantStatementViewerProps {
  statementData: PublicTenantStatementPayload;
}

export default function TenantStatementViewer({
  statementData,
}: TenantStatementViewerProps) {
  const { lease, property, landlord, utility_statements = [] } = statementData;

  // Chronologically sort statements descending (latest first)
  const sortedStatements = useMemo(() => {
    return [...utility_statements].sort((a, b) =>
      (b.statementDate || '').localeCompare(a.statementDate || '')
    );
  }, [utility_statements]);

  // Selected statement index (default to 0, most recent)
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const activeStatement = sortedStatements[selectedIndex];
  const previousStatement = sortedStatements[selectedIndex + 1];

  // Base rent from lease
  const baseRent = lease.monthlyRentZAR || 0;

  // Utility calculations based on active statement
  const isPrepaid = property.utility_type === 'prepaid_submeter';
  const isBundled =
    activeStatement?.billingType === 'bundled' ||
    activeStatement?.bundledUtilitiesZAR !== undefined;

  const elecZAR = isPrepaid ? 0 : activeStatement?.electricityZAR || 0;
  const waterZAR = isPrepaid ? 0 : activeStatement?.waterZAR || 0;
  const refuseZAR = activeStatement?.refuseZAR || 0;
  const sewerageZAR = activeStatement?.sewerageZAR || 0;
  const bundledZAR = isBundled ? activeStatement?.bundledUtilitiesZAR || 0 : 0;

  const totalUtilities = isBundled
    ? bundledZAR
    : isPrepaid
    ? refuseZAR + sewerageZAR
    : elecZAR + waterZAR + refuseZAR + sewerageZAR;

  const totalDue = baseRent + totalUtilities;

  // Previous statement numbers for MoM comparison
  const isPrevBundled =
    previousStatement?.billingType === 'bundled' ||
    previousStatement?.bundledUtilitiesZAR !== undefined;

  const prevElecZAR = previousStatement
    ? isPrepaid
      ? 0
      : previousStatement.electricityZAR || 0
    : undefined;
  const prevWaterZAR = previousStatement
    ? isPrepaid
      ? 0
      : previousStatement.waterZAR || 0
    : undefined;
  const prevRefuseZAR = previousStatement
    ? previousStatement.refuseZAR || 0
    : undefined;
  const prevSewerageZAR = previousStatement
    ? previousStatement.sewerageZAR || 0
    : undefined;
  const prevBundledZAR = previousStatement
    ? isPrevBundled
      ? previousStatement.bundledUtilitiesZAR || 0
      : undefined
    : undefined;

  const prevTotalDue = previousStatement
    ? baseRent +
      (isPrevBundled
        ? previousStatement.bundledUtilitiesZAR || 0
        : isPrepaid
        ? (previousStatement.refuseZAR || 0) + (previousStatement.sewerageZAR || 0)
        : (previousStatement.electricityZAR || 0) +
          (previousStatement.waterZAR || 0) +
          (previousStatement.refuseZAR || 0) +
          (previousStatement.sewerageZAR || 0))
    : undefined;

  // Payments & Arrears Calculations
  const paymentRecords = ((statementData.payment_records || statementData.property?.payment_records || []) as TenantPaymentRecord[]);
  const arrearsOpeningBalanceZAR = Number(
    statementData.lease?.arrears_opening_balance_zar ??
    statementData.arrears_opening_balance_zar ??
    statementData.property?.arrears_opening_balance_zar ??
    0
  );

  const relevantPayments = useMemo(() => {
    return paymentRecords.filter((p) => {
      if (p.leaseId) return p.leaseId === lease.id;
      return true;
    });
  }, [paymentRecords, lease.id]);

  const activeMonth = activeStatement?.statementDate ? activeStatement.statementDate.slice(0, 7) : '';
  const activePayments = relevantPayments.filter(
    (p) => !activeMonth || (p.periodMonth || p.paymentDate.slice(0, 7)) === activeMonth
  );
  const totalPaymentsForPeriod = activePayments.reduce((s, p) => s + (p.amountReceivedZAR || 0), 0);

  // Compute prior charges and prior payments for true Balance Brought Forward
  const priorCharges = useMemo(() => {
    if (!activeMonth) return 0;
    const priorMonthsSet = new Set<string>();
    const leaseStartKey = lease.leaseStartDate ? lease.leaseStartDate.slice(0, 7) : '';
    const leaseEndKey = lease.leaseEndDate ? lease.leaseEndDate.slice(0, 7) : '';

    if (leaseStartKey) {
      if (leaseStartKey < activeMonth) {
        const [startY, startM] = leaseStartKey.split('-').map(Number);
        const [actY, actM] = activeMonth.split('-').map(Number);
        const diff = (actY - startY) * 12 + (actM - startM);
        if (diff > 0 && diff <= 36) {
          const startDateObj = new Date(startY, startM - 1, 1);
          for (let i = 0; i < diff; i++) {
            const d = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + i, 1);
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            priorMonthsSet.add(`${y}-${mo}`);
          }
        }
      }
    } else {
      sortedStatements.forEach((stmt) => {
        const m = stmt.statementDate ? stmt.statementDate.slice(0, 7) : '';
        if (m && m < activeMonth) priorMonthsSet.add(m);
      });
    }

    let chargesSum = 0;
    priorMonthsSet.forEach((pm) => {
      const isActiveInMonth =
        (!leaseStartKey || pm >= leaseStartKey) && (!leaseEndKey || pm <= leaseEndKey);
      if (isActiveInMonth) {
        chargesSum += baseRent;
      }
      const matching = sortedStatements.filter((s) => s.statementDate?.startsWith(pm));
      matching.forEach((stmt) => {
        if (!isPrepaid && isActiveInMonth) {
          if (stmt.billingType === 'bundled' || stmt.bundledUtilitiesZAR !== undefined) {
            chargesSum += stmt.bundledUtilitiesZAR || 0;
          } else {
            chargesSum +=
              (stmt.electricityZAR || 0) +
              (stmt.waterZAR || 0) +
              (stmt.refuseZAR || 0) +
              (stmt.sewerageZAR || 0);
          }
        }
      });
    });
    return chargesSum;
  }, [activeMonth, sortedStatements, lease.leaseStartDate, lease.leaseEndDate, baseRent, isPrepaid]);

  const priorPayments = useMemo(() => {
    if (!activeMonth) return 0;
    return relevantPayments
      .filter((p) => {
        const pm = p.periodMonth || p.paymentDate.slice(0, 7);
        return pm < activeMonth;
      })
      .reduce((s, p) => s + (p.amountReceivedZAR || 0), 0);
  }, [activeMonth, relevantPayments]);

  const balanceBroughtForward = Math.round((arrearsOpeningBalanceZAR + priorCharges - priorPayments) * 100) / 100;
  const grandTotalDue = Math.round((balanceBroughtForward + totalDue - totalPaymentsForPeriod) * 100) / 100;

  const prevMonth = previousStatement?.statementDate ? previousStatement.statementDate.slice(0, 7) : '';
  const prevPayments = relevantPayments.filter(
    (p) => !prevMonth || (p.periodMonth || p.paymentDate.slice(0, 7)) === prevMonth
  );
  const prevTotalPayments = prevPayments.reduce((s, p) => s + (p.amountReceivedZAR || 0), 0);
  const prevGrandTotalDue =
    prevTotalDue !== undefined
      ? Math.round((prevTotalDue - prevTotalPayments) * 100) / 100
      : undefined;

  // Meter readings for active statement
  const elecMeterReading = useMemo(() => {
    const fromStatement = (activeStatement?.extractedMeterReadings || []).find(
      (m) => m.utilityType === 'electricity'
    );
    if (fromStatement) return fromStatement;

    return (statementData.meter_readings || [])
      .filter((m) => m.utilityType === 'electricity')
      .find(
        (m) =>
          m.date === activeStatement?.statementDate ||
          (activeStatement?.statementDate &&
            m.date.startsWith(activeStatement.statementDate.substring(0, 7)))
      );
  }, [activeStatement, statementData.meter_readings]);

  const waterMeterReading = useMemo(() => {
    const fromStatement = (activeStatement?.extractedMeterReadings || []).find(
      (m) => m.utilityType === 'water'
    );
    if (fromStatement) return fromStatement;

    return (statementData.meter_readings || [])
      .filter((m) => m.utilityType === 'water')
      .find(
        (m) =>
          m.date === activeStatement?.statementDate ||
          (activeStatement?.statementDate &&
            m.date.startsWith(activeStatement.statementDate.substring(0, 7)))
      );
  }, [activeStatement, statementData.meter_readings]);

  // Display Periods
  const billingPeriodLabel =
    activeStatement?.billingPeriod ||
    (activeStatement?.statementDate
      ? formatDate(activeStatement.statementDate)
      : 'Current Period');

  const previousPeriodLabel = previousStatement
    ? previousStatement.billingPeriod ||
      (previousStatement.statementDate
        ? formatDate(previousStatement.statementDate)
        : 'Previous Period')
    : 'Previous Period';

  // Variance visual badge helper
  const renderVariance = (curr: number, prev: number | undefined) => {
    if (prev === undefined) {
      return (
        <span className="text-slate-400 text-[11px] font-mono">
          — (Baseline Period)
        </span>
      );
    }
    const diff = curr - prev;
    if (Math.abs(diff) < 0.01) {
      return (
        <span className="text-slate-400 text-xs font-mono font-medium">
          0.00 (0%)
        </span>
      );
    }
    const pct = prev > 0 ? (diff / prev) * 100 : diff > 0 ? 100 : -100;
    const isIncrease = diff > 0;

    return (
      <span
        className={`inline-flex items-center gap-1 font-bold text-xs ${
          isIncrease ? 'text-rose-600' : 'text-emerald-600'
        }`}
      >
        {isIncrease ? '▲ +' : '▼ -'}
        {formatZAR(Math.abs(diff), { includeDecimals: true })} ({isIncrease ? '+' : ''}
        {pct.toFixed(1)}%)
      </span>
    );
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 text-slate-800 font-sans">
      {/* Strict CSS Print Isolation Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              #tenant-statement-print-root,
              #tenant-statement-print-root * {
                visibility: visible !important;
              }
              #tenant-statement-print-root {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                box-shadow: none !important;
                border: none !important;
                overflow: visible !important;
                z-index: 99999 !important;
              }
              .print-hidden-element {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm 12mm 10mm 12mm;
              }
              table {
                min-width: 100% !important;
                width: 100% !important;
              }
            }
          `,
        }}
      />

      <div className="max-w-4xl mx-auto space-y-4">
        {/* Interactive Screen Controls (Print-Hidden) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-hidden-element">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Official Tenant Statement
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {property.title} • {lease.unitName}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {/* Historical Month Selector */}
            {sortedStatements.length > 1 && (
              <div className="relative shrink-0 flex-1 sm:flex-none">
                <select
                  data-testid="month-selector-dropdown"
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number(e.target.value))}
                  className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
                >
                  {sortedStatements.map((stmt, idx) => (
                    <option key={stmt.id || idx} value={idx}>
                      {stmt.billingPeriod ||
                        (stmt.statementDate
                          ? formatDate(stmt.statementDate)
                          : `Statement #${idx + 1}`)}
                      {idx === 0 ? ' (Latest)' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Print & Download Button */}
            <button
              type="button"
              data-testid="download-pdf-btn"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              <span>Download Statement (PDF)</span>
            </button>
          </div>
        </div>

        {/* Statement A4 Container (The Document Root) */}
        <div
          id="tenant-statement-print-root"
          data-testid="statement-document"
          className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          {/* 1. Header: Landlord Branding & Invoice Summary */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200/80">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {landlord.logo_base64 ? (
                  <img
                    src={landlord.logo_base64}
                    alt={landlord.entity_name}
                    className="w-10 h-10 object-contain rounded-lg border border-slate-200 p-0.5"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <Building className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    {landlord.entity_name}
                  </h2>
                  {landlord.trading_as && (
                    <p className="text-xs text-slate-500">
                      Trading as: {landlord.trading_as}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                {landlord.physical_address && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{landlord.physical_address}</span>
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  {landlord.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{landlord.email}</span>
                    </span>
                  )}
                  {landlord.contact_number && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{landlord.contact_number}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Statement Invoice Badge */}
            <div className="text-left sm:text-right bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:min-w-[240px]">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-900 border border-emerald-200 mb-2">
                Tax Invoice & Statement
              </span>
              <p className="text-xs text-slate-500">Statement Number</p>
              <p className="text-xs font-mono font-bold text-slate-900">
                STMT-{property.id.substring(0, 8).toUpperCase()}-{lease.id.substring(0, 6).toUpperCase()}
              </p>
              <div className="pt-2 border-t border-slate-200/60 mt-2 space-y-0.5 text-xs">
                <p className="text-slate-500">
                  Statement Date:{' '}
                  <strong className="text-slate-800">
                    {activeStatement?.statementDate
                      ? formatDate(activeStatement.statementDate)
                      : formatDate(new Date().toISOString().split('T')[0])}
                  </strong>
                </p>
                <p className="text-slate-500">
                  Billing Period:{' '}
                  <strong className="text-emerald-700 font-bold">{billingPeriodLabel}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* 2. Tenant & Property Covenants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Billed To (Tenant)
              </span>
              <p className="text-sm font-bold text-slate-900">{lease.tenantName}</p>
              <p className="text-slate-600 font-medium">Designated Unit: {lease.unitName}</p>
              {lease.tenantEmail && (
                <p className="text-slate-500">{lease.tenantEmail}</p>
              )}
              {lease.tenantPhone && (
                <p className="text-slate-500">{lease.tenantPhone}</p>
              )}
            </div>

            <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Property Address
              </span>
              <p className="text-sm font-bold text-slate-900">{property.title}</p>
              <p className="text-slate-600">{property.address}</p>
              <p className="text-slate-500">{property.city}, South Africa</p>
              <p className="text-slate-400 text-[11px] pt-0.5">
                Lease Term: {formatDate(lease.leaseStartDate)} — {formatDate(lease.leaseEndDate)}
              </p>
            </div>
          </div>

          {/* 3. 4-Column Itemized Comparative Financial Ledger */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Itemized Tenant Recovery & Rent Breakdown
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium sm:hidden print-hidden-element">
                  Scroll horizontally for variance →
                </span>
                {previousStatement && (
                  <span className="text-[11px] font-medium text-slate-500">
                    Comparing {previousPeriodLabel} vs {billingPeriodLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase font-semibold text-[10px] tracking-wider">
                    <th className="p-3 pl-4">Billing Item / Municipal Line</th>
                    <th className="p-3 text-right whitespace-nowrap">
                      {previousPeriodLabel}
                    </th>
                    <th className="p-3 text-right whitespace-nowrap">
                      {billingPeriodLabel}
                    </th>
                    <th className="p-3 pr-4 text-right whitespace-nowrap">
                      Month-over-Month Variance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {/* 1. Balance Brought Forward (Prior Arrears) */}
                  <tr className="bg-slate-50/70 border-b border-slate-200">
                    <td className="p-3 pl-4">
                      <div className="font-bold text-slate-900">1. Balance Brought Forward</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Historical account balance accrued prior to this billing period
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                    <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${balanceBroughtForward > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                      {formatZAR(balanceBroughtForward, { includeDecimals: true })}
                    </td>
                    <td className="p-3 pr-4 text-right text-[10px] whitespace-nowrap font-medium">
                      {balanceBroughtForward > 0 ? (
                        <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          Prior Arrears
                        </span>
                      ) : balanceBroughtForward < 0 ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Prior Credit
                        </span>
                      ) : (
                        <span className="text-emerald-700">✓ Good Standing</span>
                      )}
                    </td>
                  </tr>

                  {/* 2. Base Rent Row */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="font-bold text-slate-900">Base Contract Rent</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Unit: {lease.unitName} • Fixed monthly residential lease fee
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      {previousStatement
                        ? formatZAR(baseRent, { includeDecimals: true })
                        : <span className="text-slate-400 font-mono">— (Baseline Period)</span>}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatZAR(baseRent, { includeDecimals: true })}
                    </td>
                    <td className="p-3 pr-4 text-right text-slate-400 font-mono text-xs whitespace-nowrap">
                      — (Contract Fixed)
                    </td>
                  </tr>

                  {/* 2. Prepaid Submeter Notice (if applicable) */}
                  {isPrepaid && (
                    <tr className="bg-sky-50/40">
                      <td colSpan={4} className="p-3.5 pl-4">
                        <div className="flex items-start gap-2.5">
                          <Zap className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-sky-950 text-xs">
                              Prepaid Utility Sub-Meter Active ({property.prepaid_vendor_name || 'Private Sub-Meter'})
                            </div>
                            <p className="text-[11px] text-sky-800 mt-0.5">
                              Electricity and water for <strong>{lease.unitName}</strong> are self-vended directly by the tenant via {property.prepaid_vendor_name || 'Citiq / Recharger'} sub-meter tokens. No municipal water or electricity recoveries are levied on this monthly statement (R 0.00 recovery).
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* 3. Bundled Utilities (if applicable) */}
                  {isBundled && (
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{activeStatement?.bundledUtilityLabel || 'Body Corporate Utilities & Recoveries'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Source: {activeStatement?.provider || 'Body Corporate'} • Consolidated Recovery (Unmetered)
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {prevBundledZAR !== undefined
                          ? formatZAR(prevBundledZAR, { includeDecimals: true })
                          : <span className="text-slate-400 font-mono">— (Baseline Period)</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatZAR(bundledZAR, { includeDecimals: true })}
                      </td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap">
                        {renderVariance(bundledZAR, prevBundledZAR)}
                      </td>
                    </tr>
                  )}

                  {/* 4. Municipal Electricity with Inline Meter Reading Dials */}
                  {!isPrepaid && !isBundled && (
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Municipal Electricity</span>
                        </div>
                        {elecMeterReading ? (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                            {elecMeterReading.meterNumber && (
                              <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                Meter #{elecMeterReading.meterNumber}
                              </span>
                            )}
                            <span className="text-slate-600 font-mono">
                              Prev: {elecMeterReading.previousReadingValue !== undefined ? elecMeterReading.previousReadingValue.toLocaleString('en-ZA') : '—'} kWh → Curr: {elecMeterReading.readingValue.toLocaleString('en-ZA')} kWh
                            </span>
                            {elecMeterReading.consumption !== undefined && (
                              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Usage: {elecMeterReading.consumption.toLocaleString('en-ZA')} kWh
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400">
                              • {elecMeterReading.readingType === 'Actual' ? 'Verified Actual Reading' : 'Municipal Reading'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Municipal consumption & service charges
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {prevElecZAR !== undefined
                          ? formatZAR(prevElecZAR, { includeDecimals: true })
                          : <span className="text-slate-400 font-mono">— (Baseline Period)</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatZAR(elecZAR, { includeDecimals: true })}
                      </td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap">
                        {renderVariance(elecZAR, prevElecZAR)}
                      </td>
                    </tr>
                  )}

                  {/* 5. Municipal Water with Inline Meter Reading Dials */}
                  {!isPrepaid && !isBundled && (
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span>Water & Sanitation Recovery</span>
                        </div>
                        {waterMeterReading ? (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                            {waterMeterReading.meterNumber && (
                              <span className="font-mono font-bold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                                Meter #{waterMeterReading.meterNumber}
                              </span>
                            )}
                            <span className="text-slate-600 font-mono">
                              Prev: {waterMeterReading.previousReadingValue !== undefined ? waterMeterReading.previousReadingValue.toLocaleString('en-ZA') : '—'} KL → Curr: {waterMeterReading.readingValue.toLocaleString('en-ZA')} KL
                            </span>
                            {waterMeterReading.consumption !== undefined && (
                              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Usage: {waterMeterReading.consumption.toLocaleString('en-ZA')} KL
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400">
                              • {waterMeterReading.readingType === 'Actual' ? 'Verified Actual Reading' : 'Municipal Reading'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Metered water consumption
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {prevWaterZAR !== undefined
                          ? formatZAR(prevWaterZAR, { includeDecimals: true })
                          : <span className="text-slate-400 font-mono">— (Baseline Period)</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatZAR(waterZAR, { includeDecimals: true })}
                      </td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap">
                        {renderVariance(waterZAR, prevWaterZAR)}
                      </td>
                    </tr>
                  )}

                  {/* 6. Refuse Removal */}
                  {!isBundled && (refuseZAR > 0 || (prevRefuseZAR && prevRefuseZAR > 0)) && (
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-slate-800">Refuse Removal</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Municipal waste collection tariff</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {prevRefuseZAR !== undefined
                          ? formatZAR(prevRefuseZAR, { includeDecimals: true })
                          : <span className="text-slate-400 font-mono">— (Baseline Period)</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatZAR(refuseZAR, { includeDecimals: true })}
                      </td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap">
                        {renderVariance(refuseZAR, prevRefuseZAR)}
                      </td>
                    </tr>
                  )}

                  {/* 7. Sewerage Tariff */}
                  {!isBundled && (sewerageZAR > 0 || (prevSewerageZAR && prevSewerageZAR > 0)) && (
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-slate-800">Sewerage & Effluent</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">City infrastructure domestic sewerage charge</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {prevSewerageZAR !== undefined
                          ? formatZAR(prevSewerageZAR, { includeDecimals: true })
                          : <span className="text-slate-400 font-mono">— (Baseline Period)</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatZAR(sewerageZAR, { includeDecimals: true })}
                      </td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap">
                        {renderVariance(sewerageZAR, prevSewerageZAR)}
                      </td>
                    </tr>
                  )}

                  {/* 2. Subtotal Current Period Charges */}
                  <tr className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-900">
                    <td className="p-2.5 pl-4 text-xs">
                      2. Subtotal Current Period Charges
                      <div className="text-[10px] font-normal text-slate-500">Base Rent + itemized utility recoveries</div>
                    </td>
                    <td className="p-2.5 text-right font-mono text-xs text-slate-700 whitespace-nowrap">
                      {prevTotalDue !== undefined ? formatZAR(prevTotalDue, { includeDecimals: true }) : '—'}
                    </td>
                    <td className="p-2.5 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                      {formatZAR(totalDue, { includeDecimals: true })}
                    </td>
                    <td className="p-2.5 pr-4 text-right whitespace-nowrap text-xs">
                      {renderVariance(totalDue, prevTotalDue)}
                    </td>
                  </tr>

                  {/* 3. Less: Payments Received */}
                  {activePayments.length > 0 ? (
                    activePayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors bg-emerald-50/30">
                        <td className="p-3 pl-4">
                          <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Payment Received: {formatDate(p.paymentDate)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Method: {p.paymentMethod} {p.reference ? `• Ref: ${p.reference}` : ''}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          -{formatZAR(p.amountReceivedZAR, { includeDecimals: true })}
                        </td>
                        <td className="p-3 pr-4 text-right whitespace-nowrap text-[10px] text-emerald-700 font-semibold">
                          Payment Applied
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-medium text-slate-700 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>3. Less: Payments Received</span>
                        </div>
                        <div className="text-[10px] text-slate-400">No payments recorded for this billing period yet</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                      <td className="p-3 text-right font-mono text-slate-500 whitespace-nowrap">R 0.00</td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap text-[10px] text-slate-400">Pending</td>
                    </tr>
                  )}

                  {/* 4. Total Balance Due Highlight */}
                  <tr className="bg-emerald-50/80 border-t-2 border-emerald-600 font-black">
                    <td className="p-3.5 pl-4 text-xs">
                      <div className="text-emerald-950 uppercase tracking-wider font-extrabold">
                        4. TOTAL AMOUNT DUE / OUTSTANDING BALANCE
                      </div>
                      <div className="text-[11px] font-normal text-emerald-800 mt-0.5">
                        Balance Brought Forward + Current Charges - Payments Received
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono text-xs text-slate-700 whitespace-nowrap font-bold">
                      {prevGrandTotalDue !== undefined
                        ? formatZAR(prevGrandTotalDue, { includeDecimals: true })
                        : <span className="text-slate-500 font-normal">— (Baseline Period)</span>}
                    </td>
                    <td className="p-3.5 text-right font-mono text-base text-emerald-950 font-black whitespace-nowrap">
                      <span data-testid="total-due-amount">
                        {formatZAR(grandTotalDue, { includeDecimals: true })}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                      {renderVariance(grandTotalDue, prevGrandTotalDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Payment Remittance & Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Remittance & Payment Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-[11px]">
              <div>
                <p>
                  <strong>Account Name:</strong> {landlord.entity_name}
                </p>
                <p>
                  <strong>Payment Due Date:</strong> 1st of every calendar month
                </p>
                <p>
                  <strong>Payment Reference:</strong>{' '}
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-sm border border-slate-200">
                    {lease.unitName.replace(/\s+/g, '').toUpperCase()}-{lease.tenantName.split(' ').slice(-1)[0].toUpperCase()}
                  </span>
                </p>
              </div>
              <div className="space-y-1 text-slate-500">
                <p>• Please email proof of payment to: <strong>{landlord.email || 'the landlord'}</strong></p>
                <p>• Use the exact payment reference above to ensure immediate automated allocation.</p>
                <p>• Interest may be charged on arrears in terms of your signed lease agreement.</p>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>Generated electronically via SA Property Hub • Legally binding statement</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

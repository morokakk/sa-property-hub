'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronDown,
  Landmark,
  Copy,
  Check,
} from 'lucide-react';
import { PublicTenantStatementPayload } from '@/types/tenantStatement';
import { RentalProperty, TenantPaymentRecord, ArrearsWriteOff } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import {
  formatAllocationsSummary,
  getStatementLedgerOptions,
  calculateTenantStatementTiers,
  getMonthKey,
  getPreviousMonthKey,
  formatMonthLabel,
  calculateRemainingLeaseTerm,
} from '@/lib/calculations/arrears';

interface TenantStatementViewerProps {
  statementData: PublicTenantStatementPayload;
  initialMonth?: string;
}

export default function TenantStatementViewer({
  statementData,
  initialMonth,
}: TenantStatementViewerProps) {
  const { lease, property, landlord, utility_statements = [] } = statementData;

  // Chronologically sort statements descending (latest first)
  const sortedStatements = useMemo(() => {
    return [...utility_statements].sort((a, b) =>
      (b.statementDate || '').localeCompare(a.statementDate || '')
    );
  }, [utility_statements]);

  // Construct a RentalProperty representation for calculation parity with landlord modal
  const viewerRental: RentalProperty = useMemo(() => {
    return {
      id: property.id,
      title: property.title,
      address: property.address,
      city: property.city,
      propertyType: 'Sectional Title Apartment',
      source: 'Private Agent',
      marketValueZAR: 0,
      purchasePriceZAR: 0,
      purchaseDate: '',
      outstandingBondBalanceZAR: 0,
      bondInterestRatePercent: 0,
      monthlyBondPaymentZAR: 0,
      monthlyGrossRentZAR: lease.monthlyRentZAR || 0,
      monthlyLeviesZAR: 0,
      monthlyRatesTaxesZAR: 0,
      monthlyAgentFeeZAR: 0,
      monthlyMaintenanceReserveZAR: 0,
      unpaidUtilityArrearsZAR: 0,
      utilityType: (property.utility_type as any) || undefined,
      prepaidVendorName: property.prepaid_vendor_name || undefined,
      arrearsOpeningBalanceZAR: Number(
        lease.arrears_opening_balance_zar ??
        statementData.arrears_opening_balance_zar ??
        property.arrears_opening_balance_zar ??
        0
      ),
      leases: [
        {
          id: lease.id,
          unitName: lease.unitName,
          tenantName: lease.tenantName,
          tenantPhone: lease.tenantPhone || '',
          tenantEmail: lease.tenantEmail || '',
          leaseStartDate: lease.leaseStartDate,
          leaseEndDate: lease.leaseEndDate,
          monthlyRentZAR: lease.monthlyRentZAR || 0,
          depositHeldZAR: lease.depositHeldZAR || 0,
          annualEscalationPercent: lease.annualEscalationPercent || 0,
          status: (lease.status as any) || 'Occupied',
          arrearsOpeningBalanceZAR: lease.arrears_opening_balance_zar ?? undefined,
        },
      ],
      utilityStatements: sortedStatements,
      paymentRecords: ((statementData.payment_records || property.payment_records || []) as TenantPaymentRecord[]),
      meterReadings: statementData.meter_readings || [],
      arrearsWriteOffs: statementData.arrears_write_offs || [],
      maintenanceHistory: [],
      status: 'Occupied',
    };
  }, [property, lease, statementData, sortedStatements]);

  // Billing period options for this property/lease in descending order
  const periodOptions = useMemo(() => {
    return getStatementLedgerOptions(viewerRental, { leaseId: lease.id });
  }, [viewerRental, lease.id]);

  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<string>(initialMonth || '');
  const [isBroughtForwardExpanded, setIsBroughtForwardExpanded] = useState<boolean>(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  const handleCopyAccount = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedBankField('account');
    setTimeout(() => setCopiedBankField(null), 2500);
  };

  // Active period month: defaults to initialMonth, or first ledger option (e.g. October 2026), or current month
  const activeMonth = useMemo(() => {
    if (selectedPeriodMonth && periodOptions.some((p) => p.month === selectedPeriodMonth)) {
      return selectedPeriodMonth;
    }
    if (initialMonth && periodOptions.some((p) => p.month === initialMonth)) {
      return initialMonth;
    }
    return periodOptions[0]?.month || getMonthKey();
  }, [selectedPeriodMonth, periodOptions, initialMonth]);

  useEffect(() => {
    if (initialMonth) {
      setSelectedPeriodMonth(initialMonth);
    }
  }, [initialMonth]);

  useEffect(() => {
    setIsBroughtForwardExpanded(false);
  }, [activeMonth]);

  // Active statement matching activeMonth (if uploaded)
  const activeStatement = useMemo(() => {
    return sortedStatements.find((s) => s.statementDate && s.statementDate.startsWith(activeMonth));
  }, [sortedStatements, activeMonth]);

  // Immediate preceding calendar month for true Month-over-Month (MoM) comparison
  const previousCalendarMonth = getPreviousMonthKey(activeMonth);

  // Statement for the immediate preceding calendar month (if uploaded)
  const previousStatement = useMemo(() => {
    return sortedStatements.find((s) => s.statementDate && s.statementDate.startsWith(previousCalendarMonth));
  }, [sortedStatements, previousCalendarMonth]);

  // 4-tier ledger calculation matching landlord modal exactly
  const tiers = useMemo(() => {
    return calculateTenantStatementTiers(viewerRental, activeMonth, { leaseId: lease.id });
  }, [viewerRental, activeMonth, lease.id]);

  const balanceBroughtForward = tiers.balanceBroughtForward;
  const priorUnpaidMonths = tiers.priorUnpaidMonths;
  const grandTotalDue = tiers.totalAmountDue;

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

  // Previous month tiers for MoM comparison
  const prevTiers = useMemo(() => {
    return calculateTenantStatementTiers(viewerRental, previousCalendarMonth, { leaseId: lease.id });
  }, [viewerRental, previousCalendarMonth, lease.id]);

  const prevTotalDue = prevTiers ? prevTiers.currentCharges : undefined;
  const prevGrandTotalDue = prevTiers ? prevTiers.totalAmountDue : undefined;

  // Payments & write-offs allocated to active period
  const activePayments = useMemo(() => {
    return tiers.periodAllocatedPayments.map(({ payment, allocatedAmountZAR }) => ({
      ...payment,
      allocatedAmountForPeriod: allocatedAmountZAR,
      isPartialAllocation: allocatedAmountZAR < payment.amountReceivedZAR,
    }));
  }, [tiers.periodAllocatedPayments]);

  const activeWriteOffs = useMemo(() => {
    return tiers.periodAllocatedWriteOffs.map(({ writeOff, allocatedAmountZAR }) => ({
      ...writeOff,
      allocatedAmountForPeriod: allocatedAmountZAR,
    }));
  }, [tiers.periodAllocatedWriteOffs]);

  // Meter readings for active statement
  const elecMeterReading = useMemo(() => {
    if (!activeStatement) return undefined;
    const fromStatement = (activeStatement.extractedMeterReadings || []).find(
      (m) => m.utilityType === 'electricity'
    );
    if (fromStatement) return fromStatement;

    return (statementData.meter_readings || [])
      .filter((m) => m.utilityType === 'electricity')
      .find(
        (m) =>
          m.date === activeStatement.statementDate ||
          (activeStatement.statementDate &&
            m.date.startsWith(activeStatement.statementDate.substring(0, 7)))
      );
  }, [activeStatement, statementData.meter_readings]);

  const waterMeterReading = useMemo(() => {
    if (!activeStatement) return undefined;
    const fromStatement = (activeStatement.extractedMeterReadings || []).find(
      (m) => m.utilityType === 'water'
    );
    if (fromStatement) return fromStatement;

    return (statementData.meter_readings || [])
      .filter((m) => m.utilityType === 'water')
      .find(
        (m) =>
          m.date === activeStatement.statementDate ||
          (activeStatement.statementDate &&
            m.date.startsWith(activeStatement.statementDate.substring(0, 7)))
      );
  }, [activeStatement, statementData.meter_readings]);

  // Display Periods
  const billingPeriodLabel =
    activeStatement?.billingPeriod ||
    formatMonthLabel(activeMonth);

  const previousPeriodLabel =
    previousStatement?.billingPeriod ||
    formatMonthLabel(previousCalendarMonth);

  // Variance visual badge helper
  const renderVariance = (curr: number, prev: number | undefined) => {
    if (prev === undefined) {
      return (
        <span className="variance-badge text-slate-400 text-[11px] font-mono">
          — (Baseline Period)
        </span>
      );
    }
    const diff = curr - prev;
    if (Math.abs(diff) < 0.01) {
      return (
        <span className="variance-badge text-slate-400 text-xs font-mono font-medium">
          0.00 (0%)
        </span>
      );
    }
    const pct = prev > 0 ? (diff / prev) * 100 : diff > 0 ? 100 : -100;
    const isIncrease = diff > 0;

    return (
      <span
        className={`variance-badge inline-flex items-center gap-1 font-bold text-xs ${
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
              .variance-badge {
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
            {periodOptions.length > 0 && (
              <div className="relative shrink-0 flex-1 sm:flex-none">
                <select
                  data-testid="month-selector-dropdown"
                  value={activeMonth}
                  onChange={(e) => setSelectedPeriodMonth(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold py-2 pl-3 pr-8 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
                >
                  {periodOptions.map((opt) => (
                    <option key={opt.month} value={opt.month}>
                      {opt.label}
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
              <p className="text-slate-600 text-[11px] font-medium pt-0.5">
                Remaining Lease Term:{' '}
                <strong className="text-slate-900 font-bold" data-testid="remaining-lease-term">
                  {calculateRemainingLeaseTerm(activeMonth, lease.leaseEndDate)}
                </strong>
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
                  <span className="variance-badge text-[11px] font-medium text-slate-500">
                    Comparing {previousPeriodLabel} vs {billingPeriodLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full min-w-[540px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase font-semibold text-[10px] tracking-wider">
                    <th className="p-3 pl-4">Billing Item / Municipal Line</th>
                    <th className="p-3 text-right whitespace-nowrap">
                      {billingPeriodLabel}
                    </th>
                    <th className="variance-badge p-3 pr-4 text-right whitespace-nowrap">
                      Month-over-Month Variance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {/* 1. Balance Brought Forward (Prior Arrears) */}
                  <tr className="bg-slate-50/70 border-b border-slate-200">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">1. Balance Brought Forward</span>
                        {priorUnpaidMonths.length > 0 && (
                          <button
                            type="button"
                            data-testid="toggle-brought-forward-btn"
                            onClick={() => setIsBroughtForwardExpanded(!isBroughtForwardExpanded)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                            title="Toggle overdue months breakdown"
                          >
                            <span>⚠️ {priorUnpaidMonths.length} Unpaid {priorUnpaidMonths.length === 1 ? 'Month' : 'Months'}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isBroughtForwardExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Historical account balance accrued prior to this billing period
                      </div>
                      {isBroughtForwardExpanded && priorUnpaidMonths.length > 0 && (
                        <div
                          data-testid="brought-forward-breakdown"
                          className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-950 space-y-1"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            Overdue Months Breakdown:
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono">
                            {priorUnpaidMonths.map((m, idx) => (
                              <span key={m.month} className="inline-flex items-center gap-1">
                                <span className="font-semibold text-slate-700">{m.shortLabel}:</span>
                                <span className="font-bold text-rose-700">{formatZAR(m.netVariance, { includeDecimals: true })}</span>
                                {idx < priorUnpaidMonths.length - 1 && <span className="text-slate-300 ml-1">|</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${balanceBroughtForward > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                      {formatZAR(balanceBroughtForward, { includeDecimals: true })}
                    </td>
                    <td className="variance-badge p-3 pr-4 text-right text-[10px] whitespace-nowrap font-medium">
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
                    <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatZAR(baseRent, { includeDecimals: true })}
                    </td>
                    <td className="variance-badge p-3 pr-4 text-right text-slate-400 font-mono text-xs whitespace-nowrap">
                      — (Contract Fixed)
                    </td>
                  </tr>

                  {/* 2. Prepaid Submeter Notice (if applicable) */}
                  {isPrepaid ? (
                    <tr className="bg-sky-50/40">
                      <td colSpan={3} className="p-3.5 pl-4">
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
                  ) : isBundled ? (
                    /* 3. Bundled Utilities (if applicable) */
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
                      <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatZAR(bundledZAR, { includeDecimals: true })}
                      </td>
                      <td className="variance-badge p-3 pr-4 text-right whitespace-nowrap">
                        {renderVariance(bundledZAR, prevBundledZAR)}
                      </td>
                    </tr>
                  ) : !activeStatement ? (
                    /* Municipal Utility Notice Row when Statement is Pending Upload */
                    <tr className="bg-slate-50/60 border-y border-slate-200">
                      <td colSpan={3} className="p-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">
                              Municipal utility invoice for this period pending upload (R 0.00 recovery billed)
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Only Base Contract Rent is currently billed for {billingPeriodLabel}. Itemized municipal recoveries will appear once council invoices are processed.
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* 4. Municipal Electricity with Inline Meter Reading Dials */}
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
                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatZAR(elecZAR, { includeDecimals: true })}
                        </td>
                        <td className="variance-badge p-3 pr-4 text-right whitespace-nowrap">
                          {renderVariance(elecZAR, prevElecZAR)}
                        </td>
                      </tr>

                      {/* 5. Municipal Water with Inline Meter Reading Dials */}
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
                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatZAR(waterZAR, { includeDecimals: true })}
                        </td>
                        <td className="variance-badge p-3 pr-4 text-right whitespace-nowrap">
                          {renderVariance(waterZAR, prevWaterZAR)}
                        </td>
                      </tr>

                      {/* 6. Refuse Removal */}
                      {(refuseZAR > 0 || (prevRefuseZAR && prevRefuseZAR > 0)) && (
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800">Refuse Removal</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Municipal waste collection tariff</div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatZAR(refuseZAR, { includeDecimals: true })}
                          </td>
                          <td className="variance-badge p-3 pr-4 text-right whitespace-nowrap">
                            {renderVariance(refuseZAR, prevRefuseZAR)}
                          </td>
                        </tr>
                      )}

                      {/* 7. Sewerage Tariff */}
                      {(sewerageZAR > 0 || (prevSewerageZAR && prevSewerageZAR > 0)) && (
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800">Sewerage & Effluent</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">City infrastructure domestic sewerage charge</div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatZAR(sewerageZAR, { includeDecimals: true })}
                          </td>
                          <td className="variance-badge p-3 pr-4 text-right whitespace-nowrap">
                            {renderVariance(sewerageZAR, prevSewerageZAR)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}

                  {/* 2. Subtotal Current Period Charges */}
                  <tr className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-900">
                    <td className="p-2.5 pl-4 text-xs">
                      2. Subtotal Current Period Charges
                      <div className="text-[10px] font-normal text-slate-500">Base Rent + itemized utility recoveries</div>
                    </td>
                    <td className="p-2.5 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                      {formatZAR(totalDue, { includeDecimals: true })}
                    </td>
                    <td className="variance-badge p-2.5 pr-4 text-right whitespace-nowrap text-xs">
                      {renderVariance(totalDue, prevTotalDue)}
                    </td>
                  </tr>

                  {/* 3. Less: Payments Received */}
                  {activePayments.length > 0 ? (
                    activePayments.map((p) => {
                      const isDeposit = p.paymentMethod === 'Deposit Applied';
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors bg-emerald-50/30">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{isDeposit ? 'Deposit applied to arrears' : `Payment Received: ${formatDate(p.paymentDate)}`}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Method: {isDeposit ? 'Deposit Applied' : p.paymentMethod} {p.reference ? `• Ref: ${p.reference}` : ''}
                              {p.allocations && p.allocations.length > 1 && (
                                <span className="ml-1 text-slate-600 font-medium">
                                  • {p.reference ? `${p.reference} — ` : ''}{formatZAR(p.amountReceivedZAR)} ({formatAllocationsSummary(p.allocations)})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            -{formatZAR(p.allocatedAmountForPeriod, { includeDecimals: true })}
                          </td>
                          <td className="variance-badge p-3 pr-4 text-right whitespace-nowrap text-[10px] text-emerald-700 font-semibold">
                            {isDeposit ? 'Deposit Applied' : 'Payment Applied'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-medium text-slate-700 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>3. Less: Payments Received</span>
                        </div>
                        <div className="text-[10px] text-slate-400">No payments recorded for this billing period yet</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500 whitespace-nowrap">R 0.00</td>
                      <td className="variance-badge p-3 pr-4 text-right whitespace-nowrap text-[10px] text-slate-400">Pending</td>
                    </tr>
                  )}

                  {/* Sanitized Credits / Balance Write-Offs */}
                  {activeWriteOffs.length > 0 &&
                    activeWriteOffs.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition-colors bg-slate-50/60">
                        <td className="p-3 pl-4">
                          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            <span>Credit: Balance written off</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Date: {formatDate(w.date)}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-600 whitespace-nowrap">
                          -{formatZAR(w.allocatedAmountForPeriod, { includeDecimals: true })}
                        </td>
                        <td className="variance-badge p-3 pr-4 text-right whitespace-nowrap text-[10px] text-slate-500 font-semibold">
                          Credit Applied
                        </td>
                      </tr>
                    ))}

                  {/* 4. Total Balance Due Highlight */}
                  <tr className="bg-emerald-50/80 border-t-2 border-emerald-600 font-black">
                    <td className="p-3.5 pl-4 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-emerald-950 uppercase tracking-wider font-extrabold">
                          4. TOTAL AMOUNT DUE / OUTSTANDING BALANCE
                        </span>
                        {grandTotalDue > 0 ? (
                          <span className="text-rose-700 font-bold bg-rose-100/90 px-2 py-0.5 rounded text-[11px] border border-rose-200">
                            ⚠️ In Arrears
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-100/90 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                            ✓ Paid Up
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-normal text-emerald-800 mt-0.5">
                        TOTAL AMOUNT PAYABLE • Balance Brought Forward + Current Charges - Payments Received
                      </div>
                    </td>
                    <td className="p-3.5 text-right font-mono text-base text-emerald-950 font-black whitespace-nowrap">
                      <span data-testid="total-due-amount">
                        {formatZAR(grandTotalDue, { includeDecimals: true })}
                      </span>
                    </td>
                    <td className="variance-badge p-3.5 pr-4 text-right whitespace-nowrap">
                      {renderVariance(grandTotalDue, prevGrandTotalDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Payment Remittance & Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Remittance & Payment Details</span>
              </div>
              {landlord.account_number && (
                <button
                  type="button"
                  data-testid="copy-bank-account-btn"
                  onClick={() => handleCopyAccount(landlord.account_number || '')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors cursor-pointer print-hidden-element"
                  title="Copy Account Number to Clipboard"
                >
                  {copiedBankField === 'account' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-emerald-600" />
                      <span>Copy Account No</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {landlord.account_number ? (
              <div data-testid="statement-banking-details" className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">
                  <Landmark className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Electronic Funds Transfer (EFT) Banking Details</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bank Name</span>
                    <span className="font-semibold text-slate-900">{landlord.bank_name || 'Standard Bank'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Account Holder</span>
                    <span className="font-semibold text-slate-900 truncate block" title={landlord.account_holder || landlord.entity_name}>
                      {landlord.account_holder || landlord.entity_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Account Number</span>
                    <span className="font-mono font-black text-slate-900 tracking-wide text-xs">{landlord.account_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Branch / Type</span>
                    <span className="font-mono font-medium text-slate-800 text-[11px]">
                      {landlord.branch_code || 'Universal'} ({landlord.account_type || 'Current'})
                    </span>
                  </div>
                </div>

                {landlord.swift_code && (
                  <div className="text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-50 flex items-center gap-2">
                    <span className="font-semibold text-slate-400">SWIFT / BIC:</span>
                    <span className="font-bold text-slate-700">{landlord.swift_code}</span>
                  </div>
                )}

                {landlord.remittance_instructions && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80 italic">
                    {landlord.remittance_instructions}
                  </div>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-[11px] pt-1">
              <div>
                {!landlord.account_number && (
                  <p>
                    <strong>Account Name:</strong> {landlord.entity_name}
                  </p>
                )}
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

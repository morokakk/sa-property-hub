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
  ShieldCheck,
  CreditCard,
  Download,
} from 'lucide-react';
import { PublicTenantStatementPayload } from '@/types/tenantStatement';
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

  // Display Period
  const billingPeriodLabel =
    activeStatement?.billingPeriod ||
    (activeStatement?.statementDate
      ? formatDate(activeStatement.statementDate)
      : 'Current Period');

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
                margin: 12mm 14mm 12mm 14mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Control Toolbar (Hidden during Print) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print-hidden-element">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">Official Tenant Statement</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  Verified Portal
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {property.title} • {lease.unitName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto w-full sm:w-auto">
            {/* Historical Month Dropdown */}
            {sortedStatements.length > 0 && (
              <div className="relative flex-1 sm:flex-initial">
                <label htmlFor="period-select" className="sr-only">
                  Billing Period
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    id="period-select"
                    data-testid="month-selector"
                    value={selectedIndex}
                    onChange={(e) => setSelectedIndex(Number(e.target.value))}
                    className="w-full sm:w-auto pl-8 pr-8 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none transition-colors"
                  >
                    {sortedStatements.map((stmt, idx) => (
                      <option key={stmt.id || idx} value={idx}>
                        {stmt.billingPeriod || (stmt.statementDate ? formatDate(stmt.statementDate) : `Statement ${idx + 1}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Print / Download Button */}
            <button
              type="button"
              data-testid="download-pdf-btn"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              title="Download Statement as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Statement (PDF)</span>
            </button>
          </div>
        </div>

        {/* Printable Statement Document Root */}
        <div
          id="tenant-statement-print-root"
          data-testid="statement-document"
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg space-y-6"
        >
          {/* 1. Official Header & Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-2 max-w-md">
              {landlord.logo_base64 ? (
                <div className="max-h-16 max-w-[200px] mb-2 flex items-center">
                  <img
                    src={landlord.logo_base64}
                    alt={landlord.entity_name}
                    className="max-h-16 max-w-[200px] object-contain"
                  />
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-emerald-700 font-bold text-lg mb-1">
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <Building className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span>{landlord.entity_name}</span>
                </div>
              )}

              {landlord.logo_base64 && (
                <h2 className="text-base font-bold text-slate-900">{landlord.entity_name}</h2>
              )}

              {landlord.trading_as && (
                <p className="text-xs font-semibold text-slate-600">
                  Trading as: {landlord.trading_as}
                </p>
              )}

              {landlord.physical_address && (
                <p className="text-xs text-slate-500 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{landlord.physical_address}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                {landlord.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {landlord.email}
                  </span>
                )}
                {landlord.contact_number && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {landlord.contact_number}
                  </span>
                )}
              </div>
            </div>

            {/* Statement Info Box */}
            <div className="sm:text-right space-y-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 min-w-[240px]">
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
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

          {/* 3. Itemized Financial Ledger Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold">
              <span>Description / Itemized Breakdown</span>
              <span>Amount (ZAR)</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Contract Base Rent */}
              <div className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors">
                <div>
                  <span className="font-bold text-slate-900 block">Monthly Contract Rent</span>
                  <span className="text-[11px] text-slate-500">
                    Unit: {lease.unitName} ({billingPeriodLabel})
                  </span>
                </div>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {formatZAR(baseRent, { includeDecimals: true })}
                </span>
              </div>

              {/* Prepaid Submeter Notice (if applicable) */}
              {isPrepaid && (
                <div className="p-3.5 flex items-center justify-between bg-sky-50/50 text-slate-700">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <div>
                      <span className="font-semibold block">Electricity & Water: Prepaid Sub-Meter</span>
                      <span className="text-[11px] text-slate-500">
                        Self-vended via {property.prepaid_vendor_name || 'Prepaid Sub-Meter'} tokens (R0 on statement)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-slate-500">R 0.00</span>
                </div>
              )}

              {/* Bundled Utilities (if applicable) */}
              {isBundled && (
                <div className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {activeStatement?.bundledUtilityLabel || 'Body Corporate Utilities & Recoveries'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Water, Sewerage, Refuse & Common levy recoveries
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatZAR(bundledZAR, { includeDecimals: true })}
                  </span>
                </div>
              )}

              {/* Itemized Electricity (if not bundled and not prepaid) */}
              {!isPrepaid && !isBundled && (
                <div className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 block">Electricity Recovery</span>
                      <span className="text-[11px] text-slate-500">
                        Municipal consumption & service charges
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatZAR(elecZAR, { includeDecimals: true })}
                  </span>
                </div>
              )}

              {/* Itemized Water (if not bundled and not prepaid) */}
              {!isPrepaid && !isBundled && (
                <div className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 block">Water & Sanitation Recovery</span>
                      <span className="text-[11px] text-slate-500">Metered water consumption</span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatZAR(waterZAR, { includeDecimals: true })}
                  </span>
                </div>
              )}

              {/* Refuse Removal (if not bundled) */}
              {!isBundled && refuseZAR > 0 && (
                <div className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors">
                  <div>
                    <span className="font-semibold text-slate-800 block">Refuse Removal</span>
                    <span className="text-[11px] text-slate-500">Municipal waste collection tariff</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatZAR(refuseZAR, { includeDecimals: true })}
                  </span>
                </div>
              )}

              {/* Sewerage Tariff (if not bundled) */}
              {!isBundled && sewerageZAR > 0 && (
                <div className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors">
                  <div>
                    <span className="font-semibold text-slate-800 block">Sewerage & Effluent</span>
                    <span className="text-[11px] text-slate-500">City infrastructure domestic sewerage charge</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatZAR(sewerageZAR, { includeDecimals: true })}
                  </span>
                </div>
              )}

              {/* Total Balance Due Highlight */}
              <div className="p-4 bg-emerald-50/70 border-t-2 border-emerald-600 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-extrabold text-emerald-950 tracking-wider block">
                    Total Amount Payable
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Includes base rent + all itemized utilities for {billingPeriodLabel}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    data-testid="total-due-amount"
                    className="text-lg sm:text-xl font-black text-emerald-900 font-mono"
                  >
                    {formatZAR(totalDue, { includeDecimals: true })}
                  </span>
                </div>
              </div>
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

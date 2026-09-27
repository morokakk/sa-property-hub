'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Share2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Zap,
  Droplets,
  Trash2,
  Gauge,
  ShieldCheck,
  Building,
  AlertTriangle,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatDate } from '@/lib/formatters';
import { UtilityStatement } from '@/types';
import { parseUtilityPdf } from '@/lib/utilities/pdfParser';

interface TenantStatementProps {
  propertyId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMeterReadings?: () => void;
}

export default function TenantStatement({
  propertyId,
  isOpen,
  onClose,
  onOpenMeterReadings,
}: TenantStatementProps) {
  const rental = usePortfolioStore((state) =>
    state.rentals.find((r) => r.id === propertyId)
  );
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const addUtilityStatement = usePortfolioStore((state) => state.addUtilityStatement);
  const deleteUtilityStatement = usePortfolioStore((state) => state.deleteUtilityStatement);
  const setStatementTenantBillingMethod = usePortfolioStore(
    (state) => state.setStatementTenantBillingMethod
  );
  const aiSettings = usePortfolioStore((state) => state.aiSettings);

  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !rental) return null;

  // Chronologically sort statements descending (latest first)
  const statements = [...(rental.utilityStatements || [])].sort((a, b) =>
    b.statementDate.localeCompare(a.statementDate)
  );

  const currentStatement = statements[0] as UtilityStatement | undefined;
  const previousStatement = statements[1] as UtilityStatement | undefined;

  // Municipal Meter Disputes for this Statement Period
  const activeElecDispute = (rental.meterReadings || []).find(
    (m) =>
      m.utilityType === 'electricity' &&
      m.isDisputed &&
      (m.disputedStatementId === currentStatement?.id ||
        (currentStatement?.statementDate &&
          m.date.startsWith(currentStatement.statementDate.substring(0, 7))))
  );

  const activeWaterDispute = (rental.meterReadings || []).find(
    (m) =>
      m.utilityType === 'water' &&
      m.isDisputed &&
      (m.disputedStatementId === currentStatement?.id ||
        (currentStatement?.statementDate &&
          m.date.startsWith(currentStatement.statementDate.substring(0, 7))))
  );

  const isElecResolved = activeElecDispute?.disputeStatus === 'Resolved';
  const isWaterResolved = activeWaterDispute?.disputeStatus === 'Resolved';

  const elecSettledCredit = isElecResolved && activeElecDispute
    ? activeElecDispute.disputeResolutionOutcome === 'dispute_rejected'
      ? 0
      : (activeElecDispute.disputeSettledCreditZAR ?? activeElecDispute.disputeEstimatedRandImpactZAR ?? 0)
    : 0;

  const waterSettledCredit = isWaterResolved && activeWaterDispute
    ? activeWaterDispute.disputeResolutionOutcome === 'dispute_rejected'
      ? 0
      : (activeWaterDispute.disputeSettledCreditZAR ?? activeWaterDispute.disputeEstimatedRandImpactZAR ?? 0)
    : 0;

  const hasAnyDispute = Boolean(activeElecDispute || activeWaterDispute);
  const hasActiveUnresolvedDispute = Boolean(
    (activeElecDispute && !isElecResolved) || (activeWaterDispute && !isWaterResolved)
  );
  const hasResolvedDispute = Boolean(
    (activeElecDispute && isElecResolved) || (activeWaterDispute && isWaterResolved)
  );
  const hasActiveDispute = hasAnyDispute;

  // Landlord Recovery Preference: 'independent_actuals' (default during dispute) vs 'municipal_statement'
  const effectiveBillingMethod =
    currentStatement?.tenantBillingMethod ||
    (hasActiveUnresolvedDispute ? 'independent_actuals' : 'municipal_statement');

  const isBilledOnActuals = effectiveBillingMethod === 'independent_actuals';

  // Effective Electricity charge billed to tenant
  const rawElecZAR = currentStatement?.electricityZAR ?? 0;
  const effectiveElecZAR = isElecResolved
    ? Math.max(0, rawElecZAR - elecSettledCredit)
    : isBilledOnActuals && activeElecDispute
    ? Math.max(0, rawElecZAR - (activeElecDispute.disputeEstimatedRandImpactZAR || 0))
    : rawElecZAR;

  // Effective Water charge billed to tenant
  const rawWaterZAR = currentStatement?.waterZAR ?? 0;
  const effectiveWaterZAR = isWaterResolved
    ? Math.max(0, rawWaterZAR - waterSettledCredit)
    : isBilledOnActuals && activeWaterDispute
    ? Math.max(0, rawWaterZAR - (activeWaterDispute.disputeEstimatedRandImpactZAR || 0))
    : rawWaterZAR;

  // Find matching or latest meter readings for this statement
  const elecMeterReading = (rental.meterReadings || [])
    .filter((m) => m.utilityType === 'electricity')
    .find(
      (m) =>
        m.date === currentStatement?.statementDate ||
        (currentStatement?.statementDate &&
          m.date.startsWith(currentStatement.statementDate.substring(0, 7)))
    ) || (rental.meterReadings || []).find((m) => m.utilityType === 'electricity');

  const waterMeterReading = (rental.meterReadings || [])
    .filter((m) => m.utilityType === 'water')
    .find(
      (m) =>
        m.date === currentStatement?.statementDate ||
        (currentStatement?.statementDate &&
          m.date.startsWith(currentStatement.statementDate.substring(0, 7)))
    ) || (rental.meterReadings || []).find((m) => m.utilityType === 'water');

  const isBundled =
    currentStatement?.billingType === 'bundled' ||
    currentStatement?.bundledUtilitiesZAR !== undefined ||
    Boolean(rental.agencyName?.toLowerCase().includes('igrow')) ||
    Boolean(currentStatement?.provider?.toLowerCase().includes('igrow'));

  // Base rent & recoveries
  const baseRent = currentStatement?.tenantRentBilledZAR || rental.monthlyGrossRentZAR || 0;

  const currentTenantUtilities = currentStatement
    ? isBundled
      ? (currentStatement.bundledUtilitiesZAR ?? 0)
      : effectiveElecZAR +
        effectiveWaterZAR +
        currentStatement.refuseZAR +
        currentStatement.sewerageZAR
    : 0;

  const previousTenantUtilities = previousStatement
    ? (previousStatement.billingType === 'bundled' || previousStatement.bundledUtilitiesZAR !== undefined || isBundled)
      ? (previousStatement.bundledUtilitiesZAR ?? 0)
      : previousStatement.electricityZAR +
        previousStatement.waterZAR +
        previousStatement.refuseZAR +
        previousStatement.sewerageZAR
    : undefined;

  const currentGrandTotal = baseRent + currentTenantUtilities;
  const previousGrandTotal =
    previousTenantUtilities !== undefined
      ? baseRent + previousTenantUtilities
      : undefined;

  // Month-over-month utility delta
  const utilityDelta =
    previousTenantUtilities !== undefined
      ? currentTenantUtilities - previousTenantUtilities
      : 0;
  const utilityPercentChange =
    previousTenantUtilities !== undefined && previousTenantUtilities > 0
      ? (utilityDelta / previousTenantUtilities) * 100
      : 0;

  // Handle PDF Upload & Parsing
  const handleProcessFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setStatusMessage(null);

    try {
      const result = await parseUtilityPdf(file, aiSettings);

      if (!result.success || !result.statement) {
        setStatusMessage({
          text: result.error || 'Failed to parse utility bill. Ensure PDF is valid.',
          isError: true,
        });
      } else {
        addUtilityStatement(rental.id, result.statement);
        setStatusMessage({
          text: `Successfully parsed ${result.statement.provider} statement (${result.statement.billingPeriod || result.statement.statementDate}) via ${result.parsedVia === 'byok-llm' ? 'BYOK AI' : 'Regex Fallback'}!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || 'An unexpected error occurred while parsing.',
        isError: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // WhatsApp 1-Click Copy
  const handleCopyWhatsApp = async () => {
    const periodStr =
      currentStatement?.billingPeriod ||
      (currentStatement?.statementDate ? formatDate(currentStatement.statementDate) : 'Current Month');

    let text = `🧾 *TENANT UTILITY RECOVERY & RENT STATEMENT*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏢 *Landlord Entity:* ${investorProfile?.entityName || 'Property Landlord'}\n`;
    text += `🏠 *Property:* ${rental.title}\n`;
    text += `📍 *Unit Address:* ${rental.address}, ${rental.city}\n`;
    text += `👤 *Tenant:* ${rental.tenantName}\n`;
    text += `📅 *Billing Period:* ${periodStr}\n\n`;

    text += `*FIXED CONTRACTUAL CHARGES:*\n`;
    text += `• Base Contract Rent: ${formatZAR(baseRent, { includeDecimals: true })}\n\n`;

    if (isBundled) {
      text += `*BODY CORPORATE UTILITY RECOVERY:*\n`;
      if (currentStatement && currentStatement.bundledUtilitiesZAR !== undefined) {
        text += `• ${currentStatement.bundledUtilityLabel || 'Water, Sewerage, Refuse & Common'}: ${formatZAR(currentStatement.bundledUtilitiesZAR, { includeDecimals: true })}\n`;
        text += `  └ Source: ${currentStatement.provider || 'iGrow Rentals / WeconnectU'} (Consolidated Recovery)\n`;
        text += `• Total Variable Recoveries: ${formatZAR(currentTenantUtilities, { includeDecimals: true })}\n`;
      } else {
        text += `• No utility recovery currently captured.\n`;
      }
    } else {
      text += `*ITEMIZED MUNICIPAL UTILITY RECOVERIES:*\n`;
      if (currentStatement) {
        if (effectiveElecZAR > 0) {
          text += `• Municipal Electricity: ${formatZAR(effectiveElecZAR, { includeDecimals: true })}\n`;
          if (isElecResolved && activeElecDispute) {
            if (activeElecDispute.disputeResolutionOutcome === 'dispute_rejected') {
              text += `  └ Council Dispute Dismissed: Original assessment stands (${formatZAR(rawElecZAR, { includeDecimals: true })}).\n`;
            } else {
              text += `  └ ✓ Council Dispute Resolved: Credit note of ${formatZAR(elecSettledCredit, { includeDecimals: true })} applied (Net Billed).\n`;
            }
          } else if (activeElecDispute) {
            text += `  ⚠️ Council Dispute Ref #${activeElecDispute.disputeReferenceNumber || 'Pending'} (${activeElecDispute.disputeStatus || 'Open'})\n`;
            if (isBilledOnActuals) {
              text += `  └ Billed on verified physical reading (${activeElecDispute.readingValue} kWh vs council estimate ${activeElecDispute.disputedMunicipalReadingValue} kWh). ${formatZAR(activeElecDispute.disputeEstimatedRandImpactZAR, { includeDecimals: true })} held in council query.\n`;
            } else {
              text += `  └ Billed council estimate. Council credit will be passed to tenant upon query resolution.\n`;
            }
          } else if (elecMeterReading && elecMeterReading.consumption !== undefined) {
            text += `  └ Meter #${elecMeterReading.meterNumber || '—'}: ${elecMeterReading.previousReadingValue ?? '—'} -> ${elecMeterReading.readingValue} kWh (Usage: ${elecMeterReading.consumption} kWh)\n`;
          }
        }
        if (effectiveWaterZAR > 0) {
          text += `• Municipal Water: ${formatZAR(effectiveWaterZAR, { includeDecimals: true })}\n`;
          if (isWaterResolved && activeWaterDispute) {
            if (activeWaterDispute.disputeResolutionOutcome === 'dispute_rejected') {
              text += `  └ Council Dispute Dismissed: Original assessment stands (${formatZAR(rawWaterZAR, { includeDecimals: true })}).\n`;
            } else {
              text += `  └ ✓ Council Dispute Resolved: Credit note of ${formatZAR(waterSettledCredit, { includeDecimals: true })} applied (Net Billed).\n`;
            }
          } else if (activeWaterDispute) {
            text += `  ⚠️ Council Dispute Ref #${activeWaterDispute.disputeReferenceNumber || 'Pending'} (${activeWaterDispute.disputeStatus || 'Open'})\n`;
            if (isBilledOnActuals) {
              text += `  └ Billed on verified physical reading (${activeWaterDispute.readingValue} KL vs council estimate ${activeWaterDispute.disputedMunicipalReadingValue} KL). ${formatZAR(activeWaterDispute.disputeEstimatedRandImpactZAR, { includeDecimals: true })} held in council query.\n`;
            } else {
              text += `  └ Billed council estimate. Council credit will be passed to tenant upon query resolution.\n`;
            }
          } else if (waterMeterReading && waterMeterReading.consumption !== undefined) {
            text += `  └ Meter #${waterMeterReading.meterNumber || '—'}: ${waterMeterReading.previousReadingValue ?? '—'} -> ${waterMeterReading.readingValue} KL (Usage: ${waterMeterReading.consumption} KL)\n`;
          }
        }
        if (currentStatement.refuseZAR > 0) {
          text += `• Pikitup Refuse Removal: ${formatZAR(currentStatement.refuseZAR, { includeDecimals: true })}\n`;
        }
        if (currentStatement.sewerageZAR > 0) {
          text += `• Municipal Sewerage & Sanitation: ${formatZAR(currentStatement.sewerageZAR, { includeDecimals: true })}\n`;
        }
        text += `• Total Variable Recoveries: ${formatZAR(currentTenantUtilities, { includeDecimals: true })}\n`;
      } else {
        text += `• No municipal bill currently captured.\n`;
      }
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *TOTAL AMOUNT DUE BY TENANT: ${formatZAR(currentGrandTotal, { includeDecimals: true })}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📌 *Payment Terms:* Due strictly on or before 1st of month.\n`;
    text += `🏦 *Payment Reference:* ${rental.tenantName.replace(/\s+/g, '-').toUpperCase()} - ${rental.title.substring(0, 15).replace(/\s+/g, '').toUpperCase()}\n\n`;
    text += isBundled
      ? `_Utility recoveries are based on the managing agent / body corporate statement. Landlord rates, taxes, and agency fees are excluded from tenant liability._`
      : `_Municipal recoveries are itemized from official council/Eskom invoices. Landlord rates and taxes are excluded from tenant liability._`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Ignore headless clipboard restriction
    }

    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Variance visual badge helper
  const renderVariance = (curr: number, prev: number | undefined) => {
    if (prev === undefined) {
      return <span className="text-slate-400 text-xs font-mono">—</span>;
    }
    const diff = curr - prev;
    if (Math.abs(diff) < 0.01) {
      return <span className="text-slate-400 text-xs font-mono font-medium">0.00 (0%)</span>;
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

  return (
    <>
      {/* Strict CSS Print Isolation Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              /* Hide all background dashboard elements */
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              /* Isolate and display only the tenant statement container */
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
                max-height: none !important;
                z-index: 99999 !important;
              }
              #tenant-statement-backdrop {
                background: transparent !important;
                backdrop-filter: none !important;
                position: static !important;
                padding: 0 !important;
                display: block !important;
              }
              /* Hide modal header, toasts, and upload dropzones in print */
              .print-hidden-element {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm 12mm 10mm 12mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      <div
        id="tenant-statement-backdrop"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      >
        <div
          id="tenant-statement-print-root"
          className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Header - Hidden on Print */}
          <div className="bg-slate-900 text-white px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print-hidden-element border-b border-slate-800">
            {/* Top Tier: Icon + Title + Mobile Close Button */}
            <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold tracking-tight truncate">
                    Tenant Utility Recovery & Variance
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    {rental.title} • {rental.tenantName}
                  </p>
                </div>
              </div>

              {/* Close Button on Mobile */}
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Tier: Action Buttons toolbar */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-start sm:justify-end">
              {currentStatement && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove parsed statement for ${currentStatement.billingPeriod || currentStatement.statementDate}?`)) {
                      deleteUtilityStatement(rental.id, currentStatement.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white text-[11px] sm:text-xs font-semibold px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-rose-800/70 transition-colors cursor-pointer shrink-0"
                  title="Delete this parsed statement"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Delete</span>
                </button>
              )}
              {onOpenMeterReadings && !isBundled && (
                <button
                  type="button"
                  onClick={onOpenMeterReadings}
                  className="inline-flex items-center gap-1 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 hover:text-white text-[11px] sm:text-xs font-semibold px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-cyan-800/70 transition-colors cursor-pointer shrink-0"
                  title="View physical and municipal meter readings"
                >
                  <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Meters</span>
                  {(rental.meterReadings?.length || 0) > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 bg-cyan-500 text-slate-950 rounded-full text-[9px] font-black">
                      {rental.meterReadings?.length}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
                title="Copy WhatsApp statement to clipboard"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span>Copy WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer shrink-0"
                title="Print or export as PDF"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>Print</span>
              </button>
              {/* Close Button on Desktop */}
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:inline-flex text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer ml-1 shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Statement Content */}
          <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 text-slate-800">
            {/* Status Message / Toast */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs print-hidden-element ${
                  statusMessage.isError
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {statusMessage.isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <p className="leading-relaxed font-medium">{statusMessage.text}</p>
              </div>
            )}

            {copiedToast && (
              <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in print-hidden-element">
                <CheckCircle2 className="w-4 h-4" />
                <span>WhatsApp Statement copied to clipboard!</span>
              </div>
            )}

            {/* Formal Statement Letterhead Header */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                      Monthly Tenant Recovery Statement
                    </span>
                    {investorProfile?.entityName && (
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Issued by: {investorProfile.entityName} {investorProfile.registrationOrId ? `(${investorProfile.registrationOrId})` : ''}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {rental.title}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    {rental.address}, {rental.city}
                  </p>
                  {investorProfile?.email && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Landlord Contact: {investorProfile.email} {investorProfile.contactNumber ? `• ${investorProfile.contactNumber}` : ''}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right text-xs space-y-1 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500">Billing Period:</span>{' '}
                    <span className="text-emerald-700 font-extrabold font-mono text-sm">
                      {currentStatement?.billingPeriod || 'Current Month'}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-400">Statement Date:</span>{' '}
                    <strong>
                      {currentStatement?.statementDate
                        ? formatDate(currentStatement.statementDate)
                        : formatDate(new Date().toISOString().split('T')[0])}
                    </strong>
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-400">Tenant:</span>{' '}
                    <strong className="text-slate-900">{rental.tenantName}</strong>
                  </div>
                  <div className="text-[11px] font-semibold text-rose-700">
                    Payment Due Date: 1st of each month
                  </div>
                </div>
              </div>
            </div>

            {/* Active Municipal Meter Dispute Alert Banner & Landlord Recovery Mode Toggle */}
            {hasActiveUnresolvedDispute && currentStatement && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-xs space-y-3 print-dispute-banner">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                          Active Municipal Meter Reading Dispute
                        </h4>
                        {activeElecDispute && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isElecResolved
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-200 text-amber-900 border-amber-300'
                          }`}>
                            Electricity: {activeElecDispute.disputeStatus || 'Open / Lodged'}
                            {activeElecDispute.disputeReferenceNumber && ` (Ref: ${activeElecDispute.disputeReferenceNumber})`}
                          </span>
                        )}
                        {activeWaterDispute && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isWaterResolved
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-cyan-100 text-cyan-900 border-cyan-300'
                          }`}>
                            Water: {activeWaterDispute.disputeStatus || 'Open / Lodged'}
                            {activeWaterDispute.disputeReferenceNumber && ` (Ref: ${activeWaterDispute.disputeReferenceNumber})`}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                        Physical dials recorded on site differ from council billed estimates.
                        {activeElecDispute && !isElecResolved && (
                          <span>
                            {' '}Council billed <strong>{activeElecDispute.disputedMunicipalReadingValue?.toLocaleString('en-ZA') ?? '—'} kWh</strong> vs verified actual <strong>{activeElecDispute.readingValue?.toLocaleString('en-ZA')} kWh</strong> (discrepancy: {activeElecDispute.disputeDifferenceConsumption?.toLocaleString('en-ZA')} kWh • <strong>{formatZAR(activeElecDispute.disputeEstimatedRandImpactZAR, { includeDecimals: true })}</strong>).
                          </span>
                        )}
                        {activeWaterDispute && !isWaterResolved && (
                          <span>
                            {' '}Council billed <strong>{activeWaterDispute.disputedMunicipalReadingValue?.toLocaleString('en-ZA') ?? '—'} KL</strong> vs verified actual <strong>{activeWaterDispute.readingValue?.toLocaleString('en-ZA')} KL</strong> (discrepancy: {activeWaterDispute.disputeDifferenceConsumption?.toLocaleString('en-ZA')} KL • <strong>{formatZAR(activeWaterDispute.disputeEstimatedRandImpactZAR, { includeDecimals: true })}</strong>).
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {onOpenMeterReadings && (
                    <button
                      type="button"
                      onClick={onOpenMeterReadings}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100/50 text-[11px] font-semibold text-amber-900 transition-colors shadow-2xs shrink-0 self-start sm:self-auto print-hidden-element cursor-pointer"
                    >
                      <Gauge className="w-3.5 h-3.5 text-amber-700" />
                      Manage Dispute
                    </button>
                  )}
                </div>

                {/* Landlord Tenant Recovery Selection */}
                <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print-hidden-element">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                      Tenant Billing Recovery Method
                    </span>
                    <span className="text-[11px] text-amber-900">
                      Choose whether to bill the tenant on verified physical actuals or pass through the full council invoice.
                    </span>
                  </div>
                  <div className="flex items-center p-1 bg-amber-100/80 rounded-lg border border-amber-300 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setStatementTenantBillingMethod(rental.id, currentStatement.id, 'independent_actuals')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        isBilledOnActuals
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-amber-900 hover:text-amber-950'
                      }`}
                    >
                      ✓ Bill Verified Actuals (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementTenantBillingMethod(rental.id, currentStatement.id, 'municipal_statement')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        !isBilledOnActuals
                          ? 'bg-amber-700 text-white shadow-2xs'
                          : 'text-amber-900 hover:text-amber-950'
                      }`}
                    >
                      Bill Council Invoice
                    </button>
                  </div>
                </div>

                {/* Print Notice for Tenant */}
                <div className="hidden print:block text-[10px] text-amber-900 italic pt-1 border-t border-amber-200">
                  {isBilledOnActuals
                    ? `* Note to Tenant: Charges for this period have been adjusted to reflect on-site verified meter readings. A dispute has been lodged with the municipality (Ref: ${activeElecDispute?.disputeReferenceNumber || activeWaterDispute?.disputeReferenceNumber || 'Lodged'}).`
                    : `* Note to Tenant: Charges reflect the official municipal bill. An active dispute (Ref: ${activeElecDispute?.disputeReferenceNumber || activeWaterDispute?.disputeReferenceNumber || 'Lodged'}) has been lodged with council; any resulting credit will be credited to your account.`}
                </div>
              </div>
            )}

            {/* Resolved Municipal Dispute Settlement Banner */}
            {!hasActiveUnresolvedDispute && hasResolvedDispute && currentStatement && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 shadow-xs space-y-2.5 print-dispute-banner">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                          Municipal Meter Dispute Resolved
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
                          Council Settlement Applied
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-900 mt-1 leading-relaxed">
                        {isWaterResolved && activeWaterDispute && (
                          <span>
                            Water: {activeWaterDispute.disputeResolutionOutcome === 'dispute_rejected'
                              ? 'Council upheld original bill (R 0.00 credit applied).'
                              : `Settled with council credit of ${formatZAR(waterSettledCredit, { includeDecimals: true })} applied against this invoice${activeWaterDispute.disputeCreditNoteNumber ? ` (Credit Note #${activeWaterDispute.disputeCreditNoteNumber})` : ''}.`}
                          </span>
                        )}
                        {isElecResolved && activeElecDispute && (
                          <span className={isWaterResolved ? 'ml-2' : ''}>
                            Electricity: {activeElecDispute.disputeResolutionOutcome === 'dispute_rejected'
                              ? 'Council upheld original bill (R 0.00 credit applied).'
                              : `Settled with council credit of ${formatZAR(elecSettledCredit, { includeDecimals: true })} applied against this invoice${activeElecDispute.disputeCreditNoteNumber ? ` (Credit Note #${activeElecDispute.disputeCreditNoteNumber})` : ''}.`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {onOpenMeterReadings && (
                    <button
                      type="button"
                      onClick={onOpenMeterReadings}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100/60 text-[11px] font-semibold text-emerald-900 transition-colors shadow-2xs shrink-0 self-start sm:self-auto print-hidden-element cursor-pointer"
                    >
                      <Gauge className="w-3.5 h-3.5 text-emerald-700" />
                      Dispute History
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Comparative Ledger Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Itemized Tenant Recovery & Rent Breakdown
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium sm:hidden">
                    Scroll horizontally for variance →
                  </span>
                  {previousStatement && (
                    <span className="text-[11px] font-medium text-slate-500">
                      Comparing {previousStatement.billingPeriod || formatDate(previousStatement.statementDate)} vs{' '}
                      {currentStatement?.billingPeriod || formatDate(currentStatement?.statementDate)}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                      <th className="p-3 pl-4">Billing Item / Municipal Line</th>
                      <th className="p-3 text-right whitespace-nowrap">
                        {previousStatement?.billingPeriod || 'Previous Month'}
                      </th>
                      <th className="p-3 text-right whitespace-nowrap">
                        {currentStatement?.billingPeriod || 'Current Month'}
                      </th>
                      <th className="p-3 pr-4 text-right whitespace-nowrap">Month-over-Month Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {/* 1. Base Rent Row */}
                    <tr className="bg-white font-medium">
                      <td className="p-3 pl-4">
                        <div className="font-bold text-slate-900">Base Contract Rent</div>
                        <div className="text-[11px] text-slate-400">Monthly fixed residential lease fee</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatZAR(baseRent, { includeDecimals: true })}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatZAR(baseRent, { includeDecimals: true })}
                      </td>
                      <td className="p-3 pr-4 text-right text-slate-400 font-mono text-xs whitespace-nowrap">
                        — (Contract Fixed)
                      </td>
                    </tr>

                    {isBundled ? (
                      /* Bundled Recovery Row (iGrow Rentals / Body Corporate) */
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-teal-600" />
                            <span>{currentStatement?.bundledUtilityLabel || 'Water, Sewerage, Refuse & Common'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Source: {currentStatement?.provider || 'iGrow Rentals / WeconnectU'} • Body Corporate Consolidated Recovery (Unmetered)
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          {previousStatement?.bundledUtilitiesZAR !== undefined
                            ? formatZAR(previousStatement.bundledUtilitiesZAR, { includeDecimals: true })
                            : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {currentStatement?.bundledUtilitiesZAR !== undefined
                            ? formatZAR(currentStatement.bundledUtilitiesZAR, { includeDecimals: true })
                            : 'R 0.00'}
                        </td>
                        <td className="p-3 pr-4 text-right whitespace-nowrap">
                          {currentStatement?.bundledUtilitiesZAR !== undefined
                            ? renderVariance(currentStatement.bundledUtilitiesZAR, previousStatement?.bundledUtilitiesZAR)
                            : '—'}
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* 2. Electricity with Embedded Meter Readings */}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>Municipal Electricity</span>
                              {isElecResolved && activeElecDispute ? (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
                                    activeElecDispute.disputeResolutionOutcome === 'dispute_rejected'
                                      ? 'bg-slate-100 text-slate-800 border-slate-300'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  }`}
                                >
                                  {activeElecDispute.disputeResolutionOutcome !== 'dispute_rejected' && (
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                                  )}
                                  <span>
                                    {activeElecDispute.disputeResolutionOutcome === 'dispute_rejected'
                                      ? 'Council Dismissed Dispute'
                                      : `✓ Dispute Resolved (-${formatZAR(elecSettledCredit)})`}
                                  </span>
                                </span>
                              ) : activeElecDispute ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                  Disputed ({activeElecDispute.disputeStatus || 'Open'})
                                </span>
                              ) : null}
                            </div>
                            {elecMeterReading ? (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                                {elecMeterReading.meterNumber && (
                                  <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                    Meter #{elecMeterReading.meterNumber}
                                  </span>
                                )}
                                <span className="text-slate-600 font-mono">
                                  Prev: {elecMeterReading.previousReadingValue?.toLocaleString('en-ZA') ?? '—'} kWh → Curr: {elecMeterReading.readingValue.toLocaleString('en-ZA')} kWh
                                </span>
                                {elecMeterReading.consumption !== undefined && (
                                  <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    Usage: {elecMeterReading.consumption.toLocaleString('en-ZA')} kWh
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-400">
                                  • Source: {elecMeterReading.source === 'pdf-extracted' ? (currentStatement?.provider || 'Eskom / Council Bill') : 'Manual On-Site Reading'} ({elecMeterReading.readingType || 'Actual'})
                                </span>
                                {isElecResolved && activeElecDispute && elecSettledCredit > 0 && (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                    ✓ Council Dispute Settled: Credit Applied (-{formatZAR(elecSettledCredit, { includeDecimals: true })}
                                    {activeElecDispute.disputeCreditNoteNumber ? ` • CN #${activeElecDispute.disputeCreditNoteNumber}` : ''})
                                  </span>
                                )}
                                {isElecResolved && activeElecDispute?.disputeResolutionOutcome === 'dispute_rejected' && (
                                  <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                                    Council upheld original billing. Billed in full.
                                  </span>
                                )}
                                {!isElecResolved && activeElecDispute && isBilledOnActuals && (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                    Adjusted to Verified Actuals (-{formatZAR(activeElecDispute.disputeEstimatedRandImpactZAR, { includeDecimals: true })} held in council query)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                {currentStatement?.provider === 'Eskom' ? 'Eskom direct supply' : 'City Power / Council meter'} • Unmetered or council direct debit
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {previousStatement ? formatZAR(previousStatement.electricityZAR, { includeDecimals: true }) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currentStatement ? (
                              <div>
                                <span>{formatZAR(effectiveElecZAR, { includeDecimals: true })}</span>
                                {((isElecResolved && elecSettledCredit > 0) || (!isElecResolved && isBilledOnActuals && activeElecDispute)) && (
                                  <div className="text-[10px] text-slate-400 line-through font-normal">
                                    {formatZAR(rawElecZAR, { includeDecimals: true })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              'R 0.00'
                            )}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap">
                            {currentStatement
                              ? renderVariance(effectiveElecZAR, previousStatement?.electricityZAR)
                              : '—'}
                          </td>
                        </tr>

                        {/* 3. Water with Embedded Meter Readings */}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <Droplets className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                              <span>Municipal Water Consumption</span>
                              {isWaterResolved && activeWaterDispute ? (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
                                    activeWaterDispute.disputeResolutionOutcome === 'dispute_rejected'
                                      ? 'bg-slate-100 text-slate-800 border-slate-300'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  }`}
                                >
                                  {activeWaterDispute.disputeResolutionOutcome !== 'dispute_rejected' && (
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                                  )}
                                  <span>
                                    {activeWaterDispute.disputeResolutionOutcome === 'dispute_rejected'
                                      ? 'Council Dismissed Dispute'
                                      : `✓ Dispute Resolved (-${formatZAR(waterSettledCredit)})`}
                                  </span>
                                </span>
                              ) : activeWaterDispute ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300">
                                  Disputed ({activeWaterDispute.disputeStatus || 'Open'})
                                </span>
                              ) : null}
                            </div>
                            {waterMeterReading ? (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                                {waterMeterReading.meterNumber && (
                                  <span className="font-mono font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded">
                                    Meter #{waterMeterReading.meterNumber}
                                  </span>
                                )}
                                <span className="text-slate-600 font-mono">
                                  Prev: {waterMeterReading.previousReadingValue?.toLocaleString('en-ZA') ?? '—'} KL → Curr: {waterMeterReading.readingValue.toLocaleString('en-ZA')} KL
                                </span>
                                {waterMeterReading.consumption !== undefined && (
                                  <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    Usage: {waterMeterReading.consumption.toLocaleString('en-ZA')} KL
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-400">
                                  • Source: {waterMeterReading.source === 'pdf-extracted' ? (currentStatement?.provider || 'Johannesburg Water') : 'Manual On-Site Reading'} ({waterMeterReading.readingType || 'Actual'})
                                </span>
                                {isWaterResolved && activeWaterDispute && waterSettledCredit > 0 && (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                    ✓ Council Dispute Settled: Credit Applied (-{formatZAR(waterSettledCredit, { includeDecimals: true })}
                                    {activeWaterDispute.disputeCreditNoteNumber ? ` • CN #${activeWaterDispute.disputeCreditNoteNumber}` : ''})
                                  </span>
                                )}
                                {isWaterResolved && activeWaterDispute?.disputeResolutionOutcome === 'dispute_rejected' && (
                                  <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                                    Council upheld original billing. Billed in full.
                                  </span>
                                )}
                                {!isWaterResolved && activeWaterDispute && isBilledOnActuals && (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                    Adjusted to Verified Actuals (-{formatZAR(activeWaterDispute.disputeEstimatedRandImpactZAR, { includeDecimals: true })} held in council query)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                Johannesburg Water meter & demand management levy
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {previousStatement ? formatZAR(previousStatement.waterZAR, { includeDecimals: true }) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currentStatement ? (
                              <div>
                                <span>{formatZAR(effectiveWaterZAR, { includeDecimals: true })}</span>
                                {((isWaterResolved && waterSettledCredit > 0) || (!isWaterResolved && isBilledOnActuals && activeWaterDispute)) && (
                                  <div className="text-[10px] text-slate-400 line-through font-normal">
                                    {formatZAR(rawWaterZAR, { includeDecimals: true })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              'R 0.00'
                            )}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap">
                            {currentStatement
                              ? renderVariance(effectiveWaterZAR, previousStatement?.waterZAR)
                              : '—'}
                          </td>
                        </tr>

                        {/* 4. Refuse */}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800">Pikitup Refuse Removal</div>
                            <div className="text-[10px] text-slate-500">
                              Source: {currentStatement?.provider || 'City of Johannesburg'} (PIKITUP Refuse Residential + 15% VAT)
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {previousStatement ? formatZAR(previousStatement.refuseZAR, { includeDecimals: true }) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currentStatement ? formatZAR(currentStatement.refuseZAR, { includeDecimals: true }) : 'R 0.00'}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap">
                            {currentStatement
                              ? renderVariance(currentStatement.refuseZAR, previousStatement?.refuseZAR)
                              : '—'}
                          </td>
                        </tr>

                        {/* 5. Sewerage */}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800">Municipal Sewerage & Sanitation</div>
                            <div className="text-[10px] text-slate-500">
                              Source: {currentStatement?.provider || 'City of Johannesburg'} (Stand Size Sanitation Charge + 15% VAT)
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {previousStatement ? formatZAR(previousStatement.sewerageZAR, { includeDecimals: true }) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currentStatement ? formatZAR(currentStatement.sewerageZAR, { includeDecimals: true }) : 'R 0.00'}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap">
                            {currentStatement
                              ? renderVariance(currentStatement.sewerageZAR, previousStatement?.sewerageZAR)
                              : '—'}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Subtotal Tenant Recoveries */}
                    <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                      <td className="p-3 pl-4 text-slate-900">
                        {isBundled ? 'Total Body Corporate Utility Recoveries' : 'Total Municipal Utility Recoveries'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {previousTenantUtilities !== undefined ? formatZAR(previousTenantUtilities, { includeDecimals: true }) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-800 whitespace-nowrap">
                        {formatZAR(currentTenantUtilities, { includeDecimals: true })}
                      </td>
                      <td className="p-3 pr-4 text-right whitespace-nowrap">
                        {currentStatement
                          ? renderVariance(currentTenantUtilities, previousTenantUtilities)
                          : '—'}
                      </td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr className="bg-emerald-50/70 font-black text-slate-900 border-t-2 border-emerald-600">
                      <td className="p-3.5 pl-4 text-sm">
                        TOTAL AMOUNT DUE BY TENANT
                        <div className="text-[11px] font-normal text-slate-500">
                          Base Rent + Itemized Utility Recoveries
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono text-sm text-slate-700 whitespace-nowrap">
                        {previousGrandTotal !== undefined ? formatZAR(previousGrandTotal, { includeDecimals: true }) : '—'}
                      </td>
                      <td className="p-3.5 text-right font-mono text-base text-emerald-950 font-black whitespace-nowrap">
                        {formatZAR(currentGrandTotal, { includeDecimals: true })}
                      </td>
                      <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                        {currentStatement
                          ? renderVariance(currentGrandTotal, previousGrandTotal)
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Landlord Audit Transparency Note */}
            {currentStatement?.propertyRatesZAR !== undefined && currentStatement.propertyRatesZAR > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <span className="font-bold text-slate-700">Municipal Audit Transparency:</span> Landlord Property Rates for this period were{' '}
                  <strong>{formatZAR(currentStatement.propertyRatesZAR, { includeDecimals: true })}</strong> (paid directly by landlord, excluded from tenant balance).
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {currentStatement.provider} Current Charges: {formatZAR(currentStatement.totalDueZAR, { includeDecimals: true })}
                </span>
              </div>
            )}

            {/* Payment Instructions & Banking Reference Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Payment Reference
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {rental.tenantName.replace(/\s+/g, '-').toUpperCase()} - {rental.title.substring(0, 15).replace(/\s+/g, '').toUpperCase()}
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Payment Terms
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Due strictly on or before 1st of month
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Payment must reflect in full on or before the 1st of each month. Base contract rent is fixed per the residential lease agreement. Municipal utility recoveries (electricity, water, refuse, sewerage) reflect verified billing line items from local municipal/Eskom tax invoices. Landlord municipal rates & taxes are excluded from the tenant liability.
              </p>
            </div>

            {/* Integrated Upload Box - Hidden on Print */}
            <div className="pt-2 border-t border-slate-200 print-hidden-element">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                Upload New CoJ / Eskom Tax Invoice (.pdf)
              </h4>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Processing bill through Dual-Parser Engine...</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">
                      Click to browse or drop municipal/Eskom statement PDF
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Auto-selects BYOK AI pipeline if configured; otherwise uses instant client-side Regex fallback.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Print Footer Notice */}
          <div className="p-3 text-[10px] text-slate-400 border-t border-slate-200 text-center bg-slate-50/50">
            Payment is due on or before the 1st of each month. Generated via SA Property Portfolio Hub.
          </div>
        </div>
      </div>
    </>
  );
}

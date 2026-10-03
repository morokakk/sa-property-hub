'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Radio,
  Tv,
  Layers,
  Receipt,
  Landmark,
  Link2,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatDate } from '@/lib/formatters';
import { UtilityStatement } from '@/types';
import { parseUtilityPdf } from '@/lib/utilities/pdfParser';
import { supabase } from '@/lib/supabaseClient';
import { migrateToCloud } from '@/lib/db/migrateToCloud';
import { DEMO_RENTAL_IDS, isDemoRentalProperty } from '@/lib/db/mergePortfolioState';
import { formatTenantAccountStatementForWhatsApp } from '@/lib/whatsappFormatter';
import {
  calculatePropertyArrears,
  calculateTenantStatementTiers,
  getMonthKey,
  getNextMonthKey,
  getPreviousMonthKey,
  formatMonthLabel,
  formatAllocationsSummary,
  getStatementLedgerOptions,
  StatementPeriodOption,
} from '@/lib/calculations/arrears';
import CloudPublishModal from './CloudPublishModal';

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
  const [copiedToastMessage, setCopiedToastMessage] = useState('WhatsApp Statement copied to clipboard!');
  const [showCloudPublishModal, setShowCloudPublishModal] = useState(false);
  const [isPublishingLink, setIsPublishingLink] = useState(false);

  // Multi-Target statement selection ('lease-{id}' | 'ancillary-{id}' | 'consolidated')
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<string>('');
  const [isBroughtForwardExpanded, setIsBroughtForwardExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (!rental) return;
    if (rental.leases && rental.leases.length > 0) {
      setSelectedTargetId(`lease-${rental.leases[0].id}`);
    } else if (rental.ancillaryIncomes && rental.ancillaryIncomes.length > 0) {
      setSelectedTargetId(`ancillary-${rental.ancillaryIncomes[0].id}`);
    } else {
      setSelectedTargetId('consolidated');
    }
  }, [rental?.id]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPeriodMonth('');
    }
  }, [isOpen, rental?.id]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target entity detection (computed early so period options can be scoped to selected lease)
  const selectedLease = (rental?.leases || []).find((l) => `lease-${l.id}` === selectedTargetId) || rental?.leases?.[0];
  const selectedAncillary = (rental?.ancillaryIncomes || []).find((a) => `ancillary-${a.id}` === selectedTargetId);
  const isConsolidated = selectedTargetId === 'consolidated';
  const isCommercial = Boolean(selectedAncillary);
  const isResidential = !isCommercial && !isConsolidated;

  // Billing period options for this property/lease
  const periodOptions = React.useMemo(() => {
    if (!rental) return [];
    return getStatementLedgerOptions(
      rental,
      !isConsolidated && selectedLease ? { leaseId: selectedLease.id } : undefined
    );
  }, [rental, isConsolidated, selectedLease?.id]);

  // Active period month (defaults to latest active ledger month, e.g. October 2026)
  const activePeriodMonth =
    (selectedPeriodMonth && periodOptions.some((p) => p.month === selectedPeriodMonth))
      ? selectedPeriodMonth
      : (periodOptions[0]?.month || getMonthKey());

  useEffect(() => {
    setIsBroughtForwardExpanded(false);
  }, [activePeriodMonth, selectedTargetId]);

  if (!isOpen || !rental) return null;

  // Current statement for activePeriodMonth (if municipal PDF was uploaded for this period)
  const currentStatement = (rental.utilityStatements || [])
    .filter((s) => s.statementDate && s.statementDate.startsWith(activePeriodMonth))
    .sort((a, b) => b.statementDate.localeCompare(a.statementDate))[0] as UtilityStatement | undefined;

  const billingPeriodLabel =
    currentStatement?.billingPeriod ||
    formatMonthLabel(activePeriodMonth);

  // Immediate preceding calendar month for true Month-over-Month (MoM) comparison
  const previousCalendarMonth = getPreviousMonthKey(activePeriodMonth);

  // Previous statement strictly for the immediate preceding calendar month (if uploaded)
  const previousStatement = (rental.utilityStatements || [])
    .find((s) => s.statementDate && s.statementDate.startsWith(previousCalendarMonth)) as UtilityStatement | undefined;

  const previousPeriodLabel =
    previousStatement?.billingPeriod ||
    formatMonthLabel(previousCalendarMonth);

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

  // Active occupied residential units count for splitting
  const occupiedLeases = (rental.leases || []).filter((l) => l.status === 'Occupied');
  const occupiedCount = Math.max(1, occupiedLeases.length);

  // Submeter / Hybrid detection
  // If property is prepaid_submeter: all residential units vend their own tokens via private submeter
  // If property is hybrid: non-main units (cottages/rooms) are prepaid submetered
  const isSubmeteredUnit =
    rental.utilityType === 'prepaid_submeter' ||
    (rental.utilityType === 'hybrid' &&
      !selectedLease?.unitName?.toLowerCase().includes('main') &&
      occupiedLeases.length > 1);

  // Split calculations
  // In hybrid mode: the main unit bears the post-paid municipal electric/water charges
  // In regular postpaid mode: equal split among occupied units
  const splitRatio = rental.utilityType === 'hybrid'
    ? (isSubmeteredUnit ? 0 : 1)
    : (1 / occupiedCount);

  // Unit-allocated municipal utilities
  const unitElecZAR = isSubmeteredUnit ? 0 : Math.round(effectiveElecZAR * splitRatio);
  const unitWaterZAR = isSubmeteredUnit ? 0 : Math.round(effectiveWaterZAR * splitRatio);
  const unitRefuseZAR = isSubmeteredUnit ? 0 : Math.round((currentStatement?.refuseZAR || 0) * splitRatio);
  const unitSewerageZAR = isSubmeteredUnit ? 0 : Math.round((currentStatement?.sewerageZAR || 0) * splitRatio);

  // Base rent calculation based on selected target
  const baseRent = isCommercial
    ? (selectedAncillary?.monthlyRentZAR || 0)
    : isConsolidated
    ? ((rental.leases || []).filter(l => l.status === 'Occupied').reduce((s, l) => s + l.monthlyRentZAR, 0) +
       (rental.ancillaryIncomes || []).reduce((s, a) => s + a.monthlyRentZAR, 0))
    : (selectedLease?.monthlyRentZAR || currentStatement?.tenantRentBilledZAR || rental.monthlyGrossRentZAR || 0);

  // Commercial VAT calculation (15% SA VAT)
  const commercialVatRate = 0.15;
  const commercialVatAmount = (isCommercial && selectedAncillary?.vatApplicable)
    ? Math.round(baseRent * commercialVatRate)
    : 0;

  // Total utilities billed for the selected target
  const currentTenantUtilities = isCommercial
    ? 0
    : isConsolidated
    ? (currentStatement
        ? (isBundled
            ? (currentStatement.bundledUtilitiesZAR ?? 0)
            : effectiveElecZAR + effectiveWaterZAR + currentStatement.refuseZAR + currentStatement.sewerageZAR)
        : 0)
    : (currentStatement
        ? (isBundled
            ? Math.round((currentStatement.bundledUtilitiesZAR ?? 0) * splitRatio)
            : unitElecZAR + unitWaterZAR + unitRefuseZAR + unitSewerageZAR)
        : 0);

  // Previous statement utilities for variance comparison
  const previousTenantUtilities = previousStatement
    ? (isCommercial
        ? 0
        : isConsolidated
        ? ((previousStatement.billingType === 'bundled' || previousStatement.bundledUtilitiesZAR !== undefined || isBundled)
            ? (previousStatement.bundledUtilitiesZAR ?? 0)
            : previousStatement.electricityZAR + previousStatement.waterZAR + previousStatement.refuseZAR + previousStatement.sewerageZAR)
        : isSubmeteredUnit
        ? 0
        : Math.round(
            ((previousStatement.billingType === 'bundled' || previousStatement.bundledUtilitiesZAR !== undefined || isBundled)
              ? (previousStatement.bundledUtilitiesZAR ?? 0)
              : previousStatement.electricityZAR + previousStatement.waterZAR + previousStatement.refuseZAR + previousStatement.sewerageZAR) * splitRatio
          ))
    : undefined;

  const currentGrandTotal = isCommercial
    ? baseRent + commercialVatAmount
    : baseRent + currentTenantUtilities;

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

  // Account Statement 4-Tier Ledger Calculations
  const statementPeriodKey = activePeriodMonth;
  const tiers = calculateTenantStatementTiers(
    rental,
    statementPeriodKey,
    !isConsolidated && selectedLease ? { leaseId: selectedLease.id } : undefined
  );
  const periodPayments = tiers.periodPayments;
  const periodAllocatedPayments = tiers.periodAllocatedPayments;
  const periodPaymentsTotal = tiers.periodPaymentsTotal;
  const periodWriteOffs = tiers.periodWriteOffs;
  const periodAllocatedWriteOffs = tiers.periodAllocatedWriteOffs;
  const periodWriteOffsTotal = tiers.periodWriteOffsTotal;
  const periodBroughtForward = tiers.balanceBroughtForward;
  const priorUnpaidMonths = tiers.priorUnpaidMonths || [];
  const periodNetOutstanding = Math.round(
    (periodBroughtForward + currentGrandTotal - periodPaymentsTotal - periodWriteOffsTotal) * 100
  ) / 100;

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
      formatMonthLabel(activePeriodMonth);

    // 1. COMMERCIAL ANCILLARY CONTRACT INVOICE
    if (isCommercial && selectedAncillary) {
      let text = `🧾 *COMMERCIAL TAX INVOICE & RENT REMITTANCE*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🏢 *Entity:* ${investorProfile?.entityName || 'Commercial Property Lessor'}\n`;
      text += `📋 *Company Reg / ID:* ${investorProfile?.registrationOrId || 'On Record'}\n`;
      text += `🏛️ *Property:* ${rental.title}\n`;
      text += `📍 *Site Address:* ${rental.address}, ${rental.city}\n`;
      text += `🏢 *Commercial Tenant:* ${selectedAncillary.tenantName}\n`;
      text += `📑 *Lease Type:* ${selectedAncillary.type.replace('_', ' ').toUpperCase()} LEASE\n`;
      text += `📅 *Billing Period:* ${periodStr}\n`;
      text += `⏳ *Contract Expiry:* ${selectedAncillary.contractEndDate} (${selectedAncillary.annualEscalationPercent}% p.a. escalation)\n\n`;

      text += `*INVOICE BREAKDOWN:*\n`;
      text += `• Net Monthly Site Lease: ${formatZAR(baseRent, { includeDecimals: true })}\n`;
      if (selectedAncillary.vatApplicable) {
        text += `• South African VAT (15%): ${formatZAR(commercialVatAmount, { includeDecimals: true })}\n`;
      }
      text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💰 *TOTAL AMOUNT DUE: ${formatZAR(currentGrandTotal, { includeDecimals: true })}*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📌 *Payment Terms:* Due on 1st of month per commercial contract.\n`;
      text += `🏦 *Payment Reference:* INV-${selectedAncillary.tenantName.substring(0, 10).replace(/\s+/g, '').toUpperCase()}-${rental.title.substring(0, 10).replace(/\s+/g, '').toUpperCase()}\n\n`;
      text += `_Commercial Tax Invoice issued in terms of the South African Value-Added Tax Act. Domestic municipal utilities not applicable._`;

      try {
        if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text);
      } catch {}
      setCopiedToastMessage('WhatsApp Statement copied to clipboard!');
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
      return;
    }

    // 2. CONSOLIDATED MASTER OVERVIEW FOR LANDLORD
    if (isConsolidated) {
      let text = `📊 *CONSOLIDATED PROPERTY REVENUE & AUDIT STATEMENT*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🏢 *Landlord Entity:* ${investorProfile?.entityName || 'Property Landlord'}\n`;
      text += `🏠 *Property:* ${rental.title}\n`;
      text += `📍 *Address:* ${rental.address}, ${rental.city}\n`;
      text += `📅 *Billing Period:* ${periodStr}\n\n`;

      text += `*RESIDENTIAL UNITS (${rental.leases?.length || 0} Units):*\n`;
      (rental.leases || []).forEach((l) => {
        text += `• ${l.unitName}: ${l.tenantName || '(Vacant)'} — ${formatZAR(l.monthlyRentZAR)}/m [${l.status}]\n`;
      });

      if ((rental.ancillaryIncomes?.length || 0) > 0) {
        text += `\n*COMMERCIAL ANCILLARY COVENANTS:*\n`;
        rental.ancillaryIncomes?.forEach((a) => {
          text += `• ${a.tenantName} (${a.type.replace('_', ' ')}): ${formatZAR(a.monthlyRentZAR)}/m ${a.vatApplicable ? '+15% VAT' : ''}\n`;
        });
      }

      text += `\n*MUNICIPAL RECONCILIATION:*\n`;
      text += `• Total Council Charges: ${formatZAR(currentStatement?.totalDueZAR || 0, { includeDecimals: true })}\n`;
      text += `• Landlord Rates & Taxes: ${formatZAR(currentStatement?.propertyRatesZAR || 0, { includeDecimals: true })}\n`;
      text += `• Total Tenant Recoveries Billed: ${formatZAR(currentTenantUtilities, { includeDecimals: true })}\n\n`;

      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💰 *TOTAL MONTHLY PORTFOLIO COLLECTION: ${formatZAR(currentGrandTotal, { includeDecimals: true })}*\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🏦 *Master Audit Ref:* MASTER-${rental.title.substring(0, 15).replace(/\s+/g, '').toUpperCase()}\n`;

      try {
        if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text);
      } catch {}
      setCopiedToastMessage('WhatsApp Statement copied to clipboard!');
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
      return;
    }

    // 3. INDIVIDUAL RESIDENTIAL TENANT STATEMENT
    const monthKey = activePeriodMonth;
    const text = formatTenantAccountStatementForWhatsApp(rental, {
      leaseId: selectedLease?.id,
      month: monthKey,
      investorProfile,
    });

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {}

    setCopiedToastMessage('WhatsApp Statement copied to clipboard!');
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Copy Secure Shareable Tenant Statement Link
  const handleCopySecureLink = async () => {
    if (isPublishingLink) return;

    if (!selectedLease?.id || !isResidential) {
      setStatusMessage({
        text: 'No residential lease unit selected. Please select a unit lease to generate a public link.',
        isError: true,
      });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/statement/${selectedLease.id}?month=${activePeriodMonth}`;

    // 1. Detect if current property is a demo property (rental-1..rental-4, demo-rental-*)
    const isDemo = isDemoRentalProperty(rental.id);

    if (isDemo) {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        }
      } catch {}

      setCopiedToastMessage('Secure Tenant Link copied to clipboard!');
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
      return;
    }

    // 2. USER-CREATED property: Show immediate loading state and check Supabase auth state
    setIsPublishingLink(true);
    try {
      let user = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user ?? null;
        if (!user) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user ?? null;
        }
      } catch {
        user = null;
      }

      if (!user) {
        setIsPublishingLink(false);
        // Local Storage Only mode: Do NOT copy a link that will 404 for the tenant.
        setShowCloudPublishModal(true);
        return;
      }

      // 3. Authenticated user: Automatically publish/upload property to Supabase on the fly
      const res = await migrateToCloud({ state: usePortfolioStore.getState() });

      if (!res.success) {
        setStatusMessage({
          text: `Cloud publish failed: ${res.error || 'Unable to publish statement to cloud.'}`,
          isError: true,
        });
        setTimeout(() => setStatusMessage(null), 5000);
        return;
      }

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        }
      } catch {}

      setCopiedToastMessage('Secure Tenant Link published & copied to clipboard!');
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3000);
    } catch (err: any) {
      setStatusMessage({
        text: `Error publishing link: ${err?.message || 'Unknown error'}`,
        isError: true,
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsPublishingLink(false);
    }
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
          {/* Header Tier 1: Title & Close Button (Print-Hidden) */}
          <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 print-hidden-element border-b border-slate-800">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                  {isCommercial
                    ? 'Commercial Tax Invoice & Remittance'
                    : isConsolidated
                    ? 'Consolidated Property Master Statement'
                    : 'Tenant Utility Recovery & Rent Statement'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {rental.title} •{' '}
                  {isCommercial
                    ? `${selectedAncillary?.tenantName} (${selectedAncillary?.type.replace('_', ' ')})`
                    : isConsolidated
                    ? 'All Units & Commercial Covenants'
                    : `${selectedLease?.unitName || 'Main'}: ${selectedLease?.tenantName || 'Vacant'}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header Tier 2: Dedicated Actions Toolbar (Print-Hidden) */}
          <div className="bg-slate-950/80 text-white px-4 py-2 sm:px-6 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 print-hidden-element border-b border-slate-800/80">
            {/* Left Tools: Secondary Utility Inspection */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {onOpenMeterReadings && !isBundled && (
                <button
                  type="button"
                  onClick={onOpenMeterReadings}
                  className="inline-flex items-center gap-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-cyan-800/70 transition-colors cursor-pointer shrink-0"
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
              {currentStatement && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove parsed statement for ${currentStatement.billingPeriod || currentStatement.statementDate}?`)) {
                      deleteUtilityStatement(rental.id, currentStatement.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-rose-800/70 transition-colors cursor-pointer shrink-0"
                  title="Delete this parsed statement"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Delete Statement</span>
                </button>
              )}
            </div>

            {/* Right Tools: Share & Export Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto">
              {selectedLease?.id && isResidential && (
                <button
                  type="button"
                  data-testid="copy-tenant-link-btn"
                  onClick={handleCopySecureLink}
                  disabled={isPublishingLink}
                  className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Copy shareable secure public statement URL to clipboard"
                >
                  {isPublishingLink ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Publishing Link...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Copy Secure Tenant Link</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
                title="Copy WhatsApp statement to clipboard"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span>Copy WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer shrink-0"
                title="Print or export as PDF"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>Print</span>
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
                <span>{copiedToastMessage}</span>
              </div>
            )}

            {/* Dedicated Billing Period Selector Dropdown (Print-Hidden) */}
            <div className="print-hidden-element p-3 sm:p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <label htmlFor="tenant-statement-period-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Billing Period:
                </label>
                <select
                  id="tenant-statement-period-select"
                  data-testid="statement-period-select"
                  value={activePeriodMonth}
                  onChange={(e) => setSelectedPeriodMonth(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:border-slate-400 rounded-xl px-3 py-1.5 shadow-2xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {periodOptions.map((opt) => (
                    <option key={opt.month} value={opt.month}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                {currentStatement ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Utility Bill Attached ({currentStatement.provider})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Municipal Bill Pending Upload (Base Rent Only)
                  </span>
                )}
              </div>
            </div>

            {/* Multi-Target Unit & Contract Statement Selector (Print-Hidden) */}
            {((rental.leases?.length || 0) + (rental.ancillaryIncomes?.length || 0) > 1) && (
              <div className="print-hidden-element p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Statement Target:
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                      {(rental.leases?.length || 0)} Units • {(rental.ancillaryIncomes?.length || 0)} Commercial
                    </span>
                    {rental.utilityType && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        {rental.utilityType === 'prepaid_submeter' ? 'Prepaid Sub-Meter' : rental.utilityType === 'hybrid' ? 'Hybrid Utility' : 'Post-Paid Municipal'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    Choose unit lease or commercial contract for itemized billing
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 shadow-2xs cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {(rental.leases?.length || 0) > 0 && (
                      <optgroup label="🏠 Residential Units">
                        {rental.leases?.map((lease) => (
                          <option key={lease.id} value={`lease-${lease.id}`}>
                            {lease.unitName}: {lease.tenantName || 'Vacant'} ({formatZAR(lease.monthlyRentZAR)}/m • {lease.status})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {(rental.ancillaryIncomes?.length || 0) > 0 && (
                      <optgroup label="🏢 Commercial Ancillary Contracts (15% VAT)">
                        {rental.ancillaryIncomes?.map((anc) => (
                          <option key={anc.id} value={`ancillary-${anc.id}`}>
                            {anc.tenantName} ({anc.type.replace('_', ' ')}) — {formatZAR(anc.monthlyRentZAR)}/m {anc.vatApplicable ? '+15% VAT' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="📊 Landlord Accounting">
                      <option value="consolidated">
                        📊 Consolidated Master Statement (All Units + Commercial Income)
                      </option>
                    </optgroup>
                  </select>
                </div>
              </div>
            )}

            {/* Formal Statement Letterhead Header */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${
                      isCommercial
                        ? 'text-indigo-800 bg-indigo-50 border-indigo-200'
                        : isConsolidated
                        ? 'text-purple-800 bg-purple-50 border-purple-200'
                        : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    }`}>
                      {isCommercial
                        ? 'Commercial Tax Invoice & Remittance'
                        : isConsolidated
                        ? 'Consolidated Property Master Statement'
                        : 'Monthly Tenant Recovery Statement'}
                    </span>
                    {investorProfile?.entityName && (
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Issued by: {investorProfile.entityName} {investorProfile.registrationOrId ? `(${investorProfile.registrationOrId})` : ''}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {isCommercial
                      ? `${selectedAncillary?.tenantName} — Site Lease`
                      : isConsolidated
                      ? `${rental.title} (Master Roll)`
                      : `${rental.title} — ${selectedLease?.unitName || 'Main Unit'}`}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    {rental.address}, {rental.city}
                    {isCommercial && ` • ${selectedAncillary?.type.replace('_', ' ').toUpperCase()} INFRASTRUCTURE COVENANT`}
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
                      {currentStatement?.billingPeriod || formatMonthLabel(activePeriodMonth)}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-400">Statement Date:</span>{' '}
                    <strong>
                      {currentStatement?.statementDate
                        ? formatDate(currentStatement.statementDate)
                        : formatDate(`${activePeriodMonth}-01`)}
                    </strong>
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-400">{isCommercial ? 'Corporate Lessee:' : isConsolidated ? 'Portfolio Scope:' : 'Tenant:'}</span>{' '}
                    <strong className="text-slate-900">
                      {isCommercial
                        ? (selectedAncillary?.tenantName || '')
                        : isConsolidated
                        ? `${occupiedLeases.length} Occupied Units • ${(rental.ancillaryIncomes?.length || 0)} Commercial`
                        : (selectedLease?.tenantName || 'Vacant')}
                    </strong>
                  </div>
                  <div className="text-[11px] font-semibold text-rose-700">
                    {isCommercial ? 'Payment Due: 1st of month per commercial contract' : 'Payment Due Date: 1st of each month'}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Municipal Meter Dispute Alert Banner & Landlord Recovery Mode Toggle (Residential Only) */}
            {hasActiveUnresolvedDispute && currentStatement && isResidential && (
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
            {!hasActiveUnresolvedDispute && hasResolvedDispute && currentStatement && isResidential && (
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

            {/* Dynamic Statement Ledger / Schedule */}
            {isCommercial && selectedAncillary ? (
              /* Commercial B2B Tax Invoice Schedule */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-blue-600" />
                      Commercial Tax Invoice Schedule
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Long-term infrastructure covenant • {selectedAncillary.type.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    B2B Commercial Covenant (Exempt from Municipal Utilities)
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[540px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="p-3 pl-4">Item Description / Contract Details</th>
                        <th className="p-3 text-center whitespace-nowrap">Tax Rate</th>
                        <th className="p-3 text-right whitespace-nowrap">Contract Escalation</th>
                        <th className="p-3 pr-4 text-right whitespace-nowrap">Total Due (ZAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr className="bg-white">
                        <td className="p-3 pl-4">
                          <div className="font-bold text-slate-900">
                            Monthly Infrastructure Site Lease: {selectedAncillary.tenantName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Covenant: {selectedAncillary.type.replace('_', ' ')} • Term: {selectedAncillary.contractStartDate} to {selectedAncillary.contractEndDate}
                          </div>
                          {selectedAncillary.notes && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                              Note: {selectedAncillary.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {selectedAncillary.vatApplicable ? 'Standard (15%)' : 'Zero-Rated / Exempt'}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {selectedAncillary.annualEscalationPercent}% p.a.
                        </td>
                        <td className="p-3 pr-4 text-right font-mono font-bold text-slate-900">
                          {formatZAR(baseRent, { includeDecimals: true })}
                        </td>
                      </tr>

                      {selectedAncillary.vatApplicable && (
                        <tr className="bg-white">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800">
                              Value-Added Tax (VAT @ 15%)
                            </div>
                            <div className="text-[10px] text-slate-400">
                              South African Revenue Service (SARS) Statutory Output Tax
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">15.00%</td>
                          <td className="p-3 text-right text-slate-400 font-mono">—</td>
                          <td className="p-3 pr-4 text-right font-mono font-bold text-slate-800">
                            {formatZAR(commercialVatAmount, { includeDecimals: true })}
                          </td>
                        </tr>
                      )}

                      <tr className="bg-blue-50/70 font-black text-slate-900 border-t-2 border-blue-600">
                        <td className="p-3.5 pl-4 text-sm" colSpan={3}>
                          TOTAL COMMERCIAL TAX INVOICE PAYABLE
                          <div className="text-[11px] font-normal text-slate-500">
                            {selectedAncillary.vatApplicable ? 'Net Site Lease + 15% VAT' : 'Net Commercial Site Lease'}
                          </div>
                        </td>
                        <td className="p-3.5 pr-4 text-right font-mono text-base text-blue-950 font-black whitespace-nowrap">
                          {formatZAR(currentGrandTotal, { includeDecimals: true })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isConsolidated ? (
              /* Consolidated Property Master Roll */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      Consolidated Rent Roll & Utility Recovery Master
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Reconciling {rental.leases?.length || 0} residential units and {rental.ancillaryIncomes?.length || 0} commercial covenants
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                    Master Landlord View
                  </span>
                </div>

                {/* 1. Residential Units Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="p-2.5 pl-3">Unit Name</th>
                        <th className="p-2.5">Tenant</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Base Rent</th>
                        <th className="p-2.5 text-right">Utility Allocation</th>
                        <th className="p-2.5 pr-3 text-right">Total Inflow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(rental.leases || []).map((lease) => {
                        const isUnitSubmetered = rental.utilityType === 'prepaid_submeter' ||
                          (rental.utilityType === 'hybrid' && !lease.unitName.toLowerCase().includes('main') && occupiedLeases.length > 1);
                        const unitShareUtilities = (lease.status !== 'Occupied' || isUnitSubmetered)
                          ? 0
                          : Math.round(currentTenantUtilities / Math.max(1, rental.utilityType === 'hybrid' ? 1 : occupiedLeases.length));
                        const totalUnit = lease.status === 'Occupied' ? lease.monthlyRentZAR + unitShareUtilities : 0;
                        return (
                          <tr key={lease.id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 pl-3 font-semibold text-slate-900">{lease.unitName}</td>
                            <td className="p-2.5 text-slate-700">{lease.tenantName || '—'}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                lease.status === 'Occupied'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : lease.status === 'Notice Given'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {lease.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                              {lease.status === 'Occupied' ? formatZAR(lease.monthlyRentZAR, { includeDecimals: true }) : '—'}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              {isUnitSubmetered ? (
                                <span className="text-[10px] text-slate-400 italic">Prepaid Sub-Meter</span>
                              ) : unitShareUtilities > 0 ? (
                                formatZAR(unitShareUtilities, { includeDecimals: true })
                              ) : (
                                'R 0.00'
                              )}
                            </td>
                            <td className="p-2.5 pr-3 text-right font-mono font-bold text-emerald-700">
                              {totalUnit > 0 ? formatZAR(totalUnit, { includeDecimals: true }) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. Commercial Ancillary Incomes (if any) */}
                {(rental.ancillaryIncomes || []).length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Commercial Ancillary Covenants
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[560px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                            <th className="p-2.5 pl-3">Stream / Lessee</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5">Escalation</th>
                            <th className="p-2.5 text-right">Net Rent</th>
                            <th className="p-2.5 text-right">VAT (15%)</th>
                            <th className="p-2.5 pr-3 text-right">Gross Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {rental.ancillaryIncomes!.map((anc) => {
                            const vat = anc.vatApplicable ? Math.round(anc.monthlyRentZAR * 0.15) : 0;
                            return (
                              <tr key={anc.id} className="hover:bg-slate-50/50">
                                <td className="p-2.5 pl-3 font-semibold text-slate-900">{anc.tenantName}</td>
                                <td className="p-2.5 capitalize text-slate-600">{anc.type.replace('_', ' ')}</td>
                                <td className="p-2.5 font-mono text-slate-600">{anc.annualEscalationPercent}% p.a.</td>
                                <td className="p-2.5 text-right font-mono text-slate-800">
                                  {formatZAR(anc.monthlyRentZAR, { includeDecimals: true })}
                                </td>
                                <td className="p-2.5 text-right font-mono text-slate-600">
                                  {anc.vatApplicable ? formatZAR(vat, { includeDecimals: true }) : '—'}
                                </td>
                                <td className="p-2.5 pr-3 text-right font-mono font-bold text-blue-700">
                                  {formatZAR(anc.monthlyRentZAR + vat, { includeDecimals: true })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Consolidated Grand Inflow Summary Banner */}
                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-purple-950 uppercase tracking-wide block">
                      Total Monthly Portfolio Collection (Gross Cash Inflow)
                    </span>
                    <span className="text-[11px] text-purple-800">
                      Combined Residential Rents + Commercial Ancillary Leases + Billed Municipal Recoveries
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl font-black text-purple-950 block">
                      {formatZAR(currentGrandTotal, { includeDecimals: true })}
                    </span>
                    <span className="text-[10px] text-purple-700">
                      Municipal bill: {formatZAR(currentStatement?.totalDueZAR || 0)} (Rates paid by Landlord: {formatZAR(currentStatement?.propertyRatesZAR || 0)})
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Comparative Ledger Table */
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Itemized Tenant Recovery & Rent Breakdown
                  </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium sm:hidden">
                    Scroll horizontally for variance →
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    Comparing {previousPeriodLabel} vs {billingPeriodLabel}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                      <th className="p-3 pl-4">Billing Item / Municipal Line</th>
                      <th className="p-3 text-right whitespace-nowrap">
                        {previousPeriodLabel}
                      </th>
                      <th className="p-3 text-right whitespace-nowrap">
                        {billingPeriodLabel}
                      </th>
                      <th className="p-3 pr-4 text-right whitespace-nowrap">Month-over-Month Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {/* 1. Balance Brought Forward (Prior Arrears / Credit) */}
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
                        <div className="text-[11px] text-slate-400">
                          Prior unpaid arrears or credit balance carried forward
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
                      <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                      <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${periodBroughtForward > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                        {formatZAR(periodBroughtForward, { includeDecimals: true })}
                      </td>
                      <td className="p-3 pr-4 text-right text-[10px] whitespace-nowrap font-medium">
                        {periodBroughtForward > 0 ? (
                          <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Prior Arrears
                          </span>
                        ) : periodBroughtForward < 0 ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Prior Credit
                          </span>
                        ) : (
                          <span className="text-emerald-700">✓ Paid Up</span>
                        )}
                      </td>
                    </tr>

                    {/* 2. Base Rent Row */}
                    <tr className="bg-white font-medium">
                      <td className="p-3 pl-4">
                        <div className="font-bold text-slate-900">Base Contract Rent</div>
                        <div className="text-[11px] text-slate-400">
                          {selectedLease?.unitName ? `Unit: ${selectedLease.unitName} • Fixed monthly residential lease fee` : 'Monthly fixed residential lease fee'}
                        </div>
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

                    {isSubmeteredUnit ? (
                      /* Prepaid Sub-Meter Notice Row */
                      <tr className="bg-blue-50/40">
                        <td colSpan={4} className="p-3.5 pl-4">
                          <div className="flex items-start gap-2.5">
                            <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-blue-950 text-xs">
                                Prepaid Utility Sub-Meter Active ({rental.prepaidVendorName || 'Private Sub-Meter'})
                              </div>
                              <p className="text-[11px] text-blue-800 mt-0.5">
                                Electricity and water for <strong>{selectedLease?.unitName}</strong> are self-vended directly by the tenant via {rental.prepaidVendorName || 'Citiq / Recharger'} sub-meter tokens. No municipal water or electricity recoveries are levied on this monthly statement (R 0.00 recovery).
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : isBundled ? (
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
                    ) : !currentStatement ? (
                      /* Municipal Utility Notice Row when Statement is Pending Upload */
                      <tr className="bg-slate-50/60 border-y border-slate-200">
                        <td colSpan={4} className="p-3.5 pl-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                              <div>
                                <div className="font-semibold text-slate-800 text-xs">
                                  Municipal utility invoice for this period pending upload (R 0.00 recovery billed)
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Only Base Contract Rent is currently billed for {formatMonthLabel(activePeriodMonth)}. Upload the municipal bill to itemize electricity, water, refuse & sewerage recoveries.
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto print-hidden-element"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Bill</span>
                            </button>
                          </div>
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
                                      ? 'Dispute Rejected by Council (Original Bill Upheld)'
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
                            {previousStatement ? formatZAR(Math.round(previousStatement.electricityZAR * splitRatio), { includeDecimals: true }) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currentStatement ? (
                              <div>
                                <span>{formatZAR(unitElecZAR, { includeDecimals: true })}</span>
                                {((isElecResolved && elecSettledCredit > 0) || (!isElecResolved && isBilledOnActuals && activeElecDispute)) && (
                                  <div className="text-[10px] text-slate-400 line-through font-normal">
                                    {formatZAR(Math.round(rawElecZAR * splitRatio), { includeDecimals: true })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              'R 0.00'
                            )}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap">
                            {currentStatement
                              ? renderVariance(unitElecZAR, previousStatement ? Math.round(previousStatement.electricityZAR * splitRatio) : undefined)
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
                                      ? 'Dispute Rejected by Council (Original Bill Upheld)'
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
                            {previousStatement ? formatZAR(Math.round(previousStatement.waterZAR * splitRatio), { includeDecimals: true }) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currentStatement ? (
                              <div>
                                <span>{formatZAR(unitWaterZAR, { includeDecimals: true })}</span>
                                {((isWaterResolved && waterSettledCredit > 0) || (!isWaterResolved && isBilledOnActuals && activeWaterDispute)) && (
                                  <div className="text-[10px] text-slate-400 line-through font-normal">
                                    {formatZAR(Math.round(rawWaterZAR * splitRatio), { includeDecimals: true })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              'R 0.00'
                            )}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap">
                            {currentStatement
                              ? renderVariance(unitWaterZAR, previousStatement ? Math.round(previousStatement.waterZAR * splitRatio) : undefined)
                              : '—'}
                          </td>
                        </tr>

                        {/* 4. Refuse */}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800">Pikitup Refuse Removal</div>
                            <div className="text-[10px] text-slate-500">
                              Source: {currentStatement?.provider || 'City of Johannesburg'} (PIKITUP Refuse Residential + 15% VAT) {occupiedCount > 1 && `• 1/${occupiedCount} Unit Share`}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {previousStatement ? formatZAR(Math.round(previousStatement.refuseZAR * splitRatio), { includeDecimals: true }) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currentStatement ? formatZAR(unitRefuseZAR, { includeDecimals: true }) : 'R 0.00'}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap">
                            {currentStatement
                              ? renderVariance(unitRefuseZAR, previousStatement ? Math.round(previousStatement.refuseZAR * splitRatio) : undefined)
                              : '—'}
                          </td>
                        </tr>

                        {/* 5. Sewerage */}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-800">Municipal Sewerage & Sanitation</div>
                            <div className="text-[10px] text-slate-500">
                              Source: {currentStatement?.provider || 'City of Johannesburg'} (Stand Size Sanitation Charge + 15% VAT) {occupiedCount > 1 && `• 1/${occupiedCount} Unit Share`}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {previousStatement ? formatZAR(Math.round(previousStatement.sewerageZAR * splitRatio), { includeDecimals: true }) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currentStatement ? formatZAR(unitSewerageZAR, { includeDecimals: true }) : 'R 0.00'}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap">
                            {currentStatement
                              ? renderVariance(unitSewerageZAR, previousStatement ? Math.round(previousStatement.sewerageZAR * splitRatio) : undefined)
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

                    {/* 2. Subtotal Current Period Charges */}
                    <tr className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-900">
                      <td className="p-2.5 pl-4 text-xs">
                        2. Subtotal Current Period Charges
                        <div className="text-[10px] font-normal text-slate-500">Base Rent + itemized utility recoveries</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-xs text-slate-700 whitespace-nowrap">
                        {previousGrandTotal !== undefined ? formatZAR(previousGrandTotal, { includeDecimals: true }) : '—'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                        {formatZAR(currentGrandTotal, { includeDecimals: true })}
                      </td>
                      <td className="p-2.5 pr-4 text-right whitespace-nowrap text-xs">
                        {currentStatement
                          ? renderVariance(currentGrandTotal, previousGrandTotal)
                          : '—'}
                      </td>
                    </tr>

                    {/* 3. Less: Payments Received */}
                    {periodAllocatedPayments && periodAllocatedPayments.length > 0 ? (
                      periodAllocatedPayments.map(({ payment: p, allocatedAmountZAR }) => {
                        const isDeposit = p.paymentMethod === 'Deposit Applied';
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors bg-emerald-50/30">
                            <td className="p-3 pl-4">
                              <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{isDeposit ? 'Deposit applied to arrears' : `Payment Received: ${formatDate(p.paymentDate)}`}</span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Method: {isDeposit ? 'Deposit Applied' : p.paymentMethod} {p.reference ? `• Ref: ${p.reference}` : ''}
                                {p.allocations && p.allocations.length > 1 && (
                                  <span className="ml-1 text-slate-600 font-medium">
                                    • {p.reference ? `${p.reference} — ` : ''}{formatZAR(p.amountReceivedZAR)} (${formatAllocationsSummary(p.allocations)})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                              -{formatZAR(allocatedAmountZAR, { includeDecimals: true })}
                            </td>
                            <td className="p-3 pr-4 text-right whitespace-nowrap text-[10px] text-emerald-700 font-semibold">
                              {isDeposit ? 'Deposit Applied' : 'Payment Applied'}
                            </td>
                          </tr>
                        );
                      })
                    ) : periodPayments.length > 0 ? (
                      periodPayments.map((p) => {
                        const isDeposit = p.paymentMethod === 'Deposit Applied';
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors bg-emerald-50/30">
                            <td className="p-3 pl-4">
                              <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
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
                            <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                              -{formatZAR(p.amountReceivedZAR, { includeDecimals: true })}
                            </td>
                            <td className="p-3 pr-4 text-right whitespace-nowrap text-[10px] text-emerald-700 font-semibold">
                              {isDeposit ? 'Deposit Applied' : 'Payment Applied'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="font-medium text-slate-700 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-slate-400" />
                            <span>3. Less: Payments Received</span>
                          </div>
                          <div className="text-[10px] text-slate-400">No payments recorded for this billing period yet</div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                        <td className="p-3 text-right font-mono text-slate-500 whitespace-nowrap">R 0.00</td>
                        <td className="p-3 pr-4 text-right whitespace-nowrap text-[10px] text-slate-400">Pending</td>
                      </tr>
                    )}

                    {/* Sanitized Credits / Balance Write-Offs */}
                    {periodAllocatedWriteOffs && periodAllocatedWriteOffs.length > 0 ? (
                      periodAllocatedWriteOffs.map(({ writeOff: w, allocatedAmountZAR }) => (
                        <tr key={w.id} className="hover:bg-slate-50/50 transition-colors bg-slate-50/60">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5 text-slate-500" />
                              <span>Credit: Balance written off</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Date: {formatDate(w.date)}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">—</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-600 whitespace-nowrap">
                            -{formatZAR(allocatedAmountZAR, { includeDecimals: true })}
                          </td>
                          <td className="p-3 pr-4 text-right whitespace-nowrap text-[10px] text-slate-500 font-semibold">
                            Credit Applied
                          </td>
                        </tr>
                      ))
                    ) : null}

                    {/* 4. Grand Total Row */}
                    <tr className="bg-emerald-50/70 font-black text-slate-900 border-t-2 border-emerald-600">
                      <td className="p-3.5 pl-4 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>TOTAL AMOUNT DUE / OUTSTANDING BALANCE</span>
                          {periodNetOutstanding > 0 ? (
                            <span className="text-rose-700 font-bold bg-rose-100/90 px-2 py-0.5 rounded text-xs border border-rose-200">
                              ⚠️ In Arrears
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold bg-emerald-100/90 px-2 py-0.5 rounded text-xs border border-emerald-200">
                              ✓ Paid Up
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-normal text-slate-500">
                          Balance Brought Forward + Current Charges - Payments Received
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono text-sm text-slate-700 whitespace-nowrap">
                        {previousGrandTotal !== undefined ? formatZAR(previousGrandTotal, { includeDecimals: true }) : '—'}
                      </td>
                      <td className="p-3.5 text-right font-mono text-base text-emerald-950 font-black whitespace-nowrap">
                        {formatZAR(periodNetOutstanding, { includeDecimals: true })}
                      </td>
                      <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                        {currentStatement
                          ? renderVariance(periodNetOutstanding, previousGrandTotal)
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

            {/* Landlord Audit Transparency Note */}
            {currentStatement?.propertyRatesZAR !== undefined && currentStatement.propertyRatesZAR > 0 && !isCommercial && (
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
                    {isCommercial && selectedAncillary
                      ? `INV-${selectedAncillary.tenantName.substring(0, 10).replace(/\s+/g, '').toUpperCase()}-${rental.title.substring(0, 10).replace(/\s+/g, '').toUpperCase()}`
                      : isConsolidated
                      ? `MASTER-${rental.title.substring(0, 15).replace(/\s+/g, '').toUpperCase()}`
                      : `${(selectedLease?.tenantName || 'TENANT').replace(/\s+/g, '-').toUpperCase()} - ${(selectedLease?.unitName || 'UNIT').replace(/\s+/g, '').toUpperCase()}`}
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Payment Terms
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {isCommercial ? 'Due strictly per commercial contract' : isConsolidated ? 'Landlord Internal Master Roll' : 'Due strictly on or before 1st of month'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isCommercial
                  ? 'Commercial lease remittance in terms of active contract agreement. Value-Added Tax (VAT) charged in accordance with South African tax legislation.'
                  : isConsolidated
                  ? 'Consolidated landlord master roll reconciling all residential unit leases, commercial ancillary covenants, and municipal tax invoices for this property.'
                  : 'Payment must reflect in full on or before the 1st of each month. Base contract rent is fixed per the residential lease agreement. Municipal utility recoveries (electricity, water, refuse, sewerage) reflect verified billing line items from local municipal/Eskom tax invoices. Landlord municipal rates & taxes are excluded from the tenant liability.'}
              </p>
            </div>

            {/* Integrated Upload Box - Hidden on Print */}
            {!isCommercial && (
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
            )}
          </div>

        {/* Print Footer Notice */}
          <div className="p-3 text-[10px] text-slate-400 border-t border-slate-200 text-center bg-slate-50/50">
            Payment is due on or before the 1st of each month. Generated via SA Property Portfolio Hub.
          </div>
        </div>
      </div>

      {/* Dedicated Cloud Publishing Modal for Unauthenticated Landlords */}
      <CloudPublishModal
        isOpen={showCloudPublishModal}
        onClose={() => setShowCloudPublishModal(false)}
        onCopyWhatsApp={async () => {
          setShowCloudPublishModal(false);
          await handleCopyWhatsApp();
        }}
      />
    </>
  );
}

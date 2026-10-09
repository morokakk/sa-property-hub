'use client';

import React, { useState, useEffect, useRef } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import {
  RentalProperty,
  MaintenanceLog,
  PropertyTitleType,
  CloudDriveVault,
  Lease,
  AncillaryIncome,
  PaymentMethod,
  TenantPaymentRecord,
  ArrearsWriteOff,
  ArrearsWriteOffReason,
  PaymentAllocation,
} from '@/types';
import {
  calculatePropertyArrears,
  reconcileOpeningBalanceForTargetArrears,
  getMonthKey,
  allocateOldestFirst,
  getUnpaidLedgerMonths,
  getNextMonthKey,
  formatAllocationsSummary,
  formatMonthLabel,
} from '@/lib/calculations/arrears';
import { formatTenantAccountStatementForWhatsApp, formatTenantPaymentReceiptForWhatsApp } from '@/lib/whatsappFormatter';
import { PropertyTypeBadge, AgmDateChip, isAgmUpcoming } from '@/components/common/PropertyTypeBadge';
import { calculateRentalCashflow, calculateMonthlyBondRepayment, generateRentalLongTermProjection } from '@/lib/calculations/propertyMetrics';
import {
  calculateRentalTaxProvision,
  calculateGrossYield,
  calculateBrrrrRefinanceProposal,
  calculateAgencyCommission,
  calculateDisposalMetrics,
  calculateAggregateRentalKPIs,
} from '@/lib/calculations/rentals';
import LongTermProjectionChart from '@/components/analytics/LongTermProjectionChart';
import { ExitSaleModal } from '@/components/rentals/modals/ExitSaleModal';
import { RefinanceModal } from '@/components/rentals/modals/RefinanceModal';
import { RefinanceAuditModal } from '@/components/rentals/modals/RefinanceAuditModal';
import { MaintenanceModal } from '@/components/rentals/modals/MaintenanceModal';
import { RentalFormModal } from '@/components/rentals/modals/RentalFormModal';
import { SarbPmtModal } from '@/components/rentals/modals/SarbPmtModal';
import { PaymentModal } from '@/components/rentals/modals/PaymentModal';
import { WriteOffModal } from '@/components/rentals/modals/WriteOffModal';
import {
  Building2,
  PlusCircle,
  Wrench,
  UserCheck,
  Calendar,
  CreditCard,
  ShieldCheck,
  FolderArchive,
  Phone,
  Mail,
  Trash2,
  AlertCircle,
  AlertTriangle,
  FileCheck2,
  Edit3,
  MessageCircle,
  Archive,
  RotateCcw,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  Sparkles,
  Calculator,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowRightLeft,
  History,
  FileText,
  Gauge,
  Loader2,
  MinusCircle,
} from 'lucide-react';
import { exportRentalsCSV } from '@/lib/export/csvExport';
import { exportITR12TaxReport } from '@/lib/export/excelExport';
import ActualVsBudgetKpiStrip from '@/components/dashboard/ActualVsBudgetKpiStrip';
import ImportDropdown from '@/components/common/ImportDropdown';
import TenantStatement from '@/components/rentals/TenantStatement';
import MeterReadingsModal from '@/components/rentals/MeterReadingsModal';
import UnifiedPdfVerificationModal from '@/components/rentals/UnifiedPdfVerificationModal';
import {
  useRentalModalState,
  useRentalForm,
  usePaymentModal,
  useWriteOffModal,
  useDirectPdfUpload,
} from '@/hooks/rentals';

export function renderPropertyTypeBadge(type?: PropertyTitleType) {
  switch (type) {
    case 'Freehold House':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span>🏡 Freehold House</span>
        </span>
      );
    case 'Townhouse / Cluster':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          <span>🏘️ Townhouse / Cluster</span>
        </span>
      );
    case 'Multi-unit Commercial':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          <span>🏬 Commercial</span>
        </span>
      );
    case 'Sectional Title Apartment':
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span>🏢 Sectional Title</span>
        </span>
      );
  }
}

export function renderAgmChip(agmDate?: string) {
  if (!agmDate) return null;
  const upcoming = isAgmUpcoming(agmDate);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        upcoming
          ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
          : 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
      title={upcoming ? 'Body Corporate AGM scheduled within next 30 days!' : 'Scheduled Body Corporate AGM'}
    >
      <Calendar className={`w-2.5 h-2.5 ${upcoming ? 'text-amber-700' : 'text-slate-500'}`} />
      <span>AGM: {formatDate(agmDate)}{upcoming ? ' (Upcoming)' : ''}</span>
    </span>
  );
}

function renderAgencyContactLinks(contact: string) {
  if (!contact) return null;
  const isEmail = contact.includes('@');
  const cleanPhone = contact.replace(/[^\d]/g, '');
  const isPhone = !isEmail && cleanPhone.length >= 7;

  return (
    <div className="flex items-center gap-1.5">
      {isPhone ? (
        <>
          <a
            href={`tel:${contact.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
            title={`Call ${contact}`}
          >
            <Phone className="w-2.5 h-2.5" />
            <span>Call</span>
          </a>
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
            title="WhatsApp Agent"
          >
            <MessageCircle className="w-2.5 h-2.5" />
            <span>WhatsApp</span>
          </a>
        </>
      ) : (
        <a
          href={`mailto:${contact.trim()}`}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
          title={`Email ${contact}`}
        >
          <Mail className="w-2.5 h-2.5" />
          <span>Email</span>
        </a>
      )}
    </div>
  );
}

function InlineEditableAmount({
  value,
  onSave,
  prefix = '- ',
  disabled = false,
  disabledLabel,
  title,
  className,
}: {
  value?: number | null;
  onSave: (val: number) => void;
  prefix?: string;
  disabled?: boolean;
  disabledLabel?: string;
  title?: string;
  className?: string;
}) {
  const safeVal = value ?? 0;
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(safeVal.toString());

  useEffect(() => {
    setInputVal((value ?? 0).toString());
  }, [value]);

  if (disabled) {
    return (
      <span className="text-slate-400 text-[11px]" title={disabledLabel}>
        {disabledLabel || 'R 0'}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-slate-400 text-[11px] font-bold">R</span>
        <input
          type="number"
          step="any"
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={() => {
            const num = Math.max(0, Number(inputVal) || 0);
            if (num !== safeVal) onSave(num);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const num = Math.max(0, Number(inputVal) || 0);
              if (num !== safeVal) onSave(num);
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setInputVal(safeVal.toString());
              setIsEditing(false);
            }
          }}
          className="w-24 px-1.5 py-0.5 text-xs font-mono font-bold bg-white border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 shadow-2xs"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={`group inline-flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer ${className || 'text-slate-700 font-medium'}`}
      title={title || 'Click to edit amount inline (auto-saves on blur or Enter)'}
    >
      <span>{prefix}{formatZAR(safeVal)}</span>
      <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function RentalPortfolioPage() {
  const rentals = usePortfolioStore((state) => state.rentals);
  const addRental = usePortfolioStore((state) => state.addRental);
  const updateRental = usePortfolioStore((state) => state.updateRental);
  const deleteRental = usePortfolioStore((state) => state.deleteRental);
  const addMaintenanceLog = usePortfolioStore((state) => state.addMaintenanceLog);
  const markRentalAsSold = usePortfolioStore((state) => state.markRentalAsSold);
  const reopenRental = usePortfolioStore((state) => state.reopenRental);
  const refinanceRental = usePortfolioStore((state) => state.refinanceRental);
  const recordTenantPayment = usePortfolioStore((state) => state.recordTenantPayment);
  const updateTenantPayment = usePortfolioStore((state) => state.updateTenantPayment);
  const deleteTenantPayment = usePortfolioStore((state) => state.deleteTenantPayment);
  const recordArrearsWriteOff = usePortfolioStore((state) => state.recordArrearsWriteOff);
  const deleteArrearsWriteOff = usePortfolioStore((state) => state.deleteArrearsWriteOff);
  const updateArrearsOpeningBalance = usePortfolioStore((state) => state.updateArrearsOpeningBalance);
  const rentalForecastView = usePortfolioStore((state) => state.rentalForecastView);
  const setRentalForecastView = usePortfolioStore((state) => state.setRentalForecastView);
  const aiSettings = usePortfolioStore((state) => state.aiSettings);
  const summary = usePortfolioSummary();
  const investorProfile = usePortfolioStore((state) => state.investorProfile);

  // Active vs Sold Archive View Tab
  const [viewTab, setViewTab] = useState<'active' | 'archive'>('active');
  const activeRentals = rentals.filter((r) => r.status !== 'Sold');
  const soldRentals = rentals.filter((r) => r.status === 'Sold');

  // Headless Custom Hooks & Modal State Controllers (Phase 4B)
  const rentalModals = useRentalModalState();
  const rentalForm = useRentalForm(rentalModals.editingProperty);
  const paymentModal = usePaymentModal();
  const writeOffModal = useWriteOffModal();
  const directPdf = useDirectPdfUpload(aiSettings);
  const smartPdfInputRef = useRef<HTMLInputElement>(null);

  // Per-card 20-Year forecast accordion expansion
  const [expandedForecasts, setExpandedForecasts] = useState<Record<string, boolean>>({});

  const toggleForecastExpansion = (rentalId: string) => {
    setExpandedForecasts((prev) => ({
      ...prev,
      [rentalId]: !prev[rentalId],
    }));
  };

  // Per-card tab selection ('financials' | 'payments' | 'coc' | 'vault')
  const [cardTab, setCardTab] = useState<Record<string, 'financials' | 'payments' | 'coc' | 'vault'>>({});

  // Per-property tenant selector sub-tab within Payments ('all' | leaseId)
  const [selectedTenantTab, setSelectedTenantTab] = useState<Record<string, string>>({});

  // Toast feedback state
  const [copyFeedbackToast, setCopyFeedbackToast] = useState<string | null>(null);
  useEffect(() => {
    if (!copyFeedbackToast) return;
    const t = setTimeout(() => setCopyFeedbackToast(null), 3500);
    return () => clearTimeout(t);
  }, [copyFeedbackToast]);

  const aggregateKPIs = calculateAggregateRentalKPIs(rentals);
  const totalGrossMonthlyRent = aggregateKPIs.totalGrossMonthlyRentZAR;
  const totalNetMonthlyRent = summary.monthlyNetRentalCashflow;

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Rental Portfolio"
        subtitle="Manage active income properties, tenant leases, trust deposits, and maintenance histories"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={smartPdfInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  directPdf.enqueueFiles(files.slice(0, 3));
                }
                e.target.value = '';
              }}
            />
            <button
              id="rentals-import"
              type="button"
              onClick={() => smartPdfInputRef.current?.click()}
              title="Upload managing agent payout statements or municipal / Eskom utility bills (PDF)"
              className="inline-flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Smart Document Import</span>
            </button>
            <ImportDropdown
              type="rentals"
              onPdfSelected={directPdf.enqueueFiles}
            />
            <button
              onClick={() => exportRentalsCSV(activeRentals)}
              title="Download active rentals register as CSV"
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              id="rentals-itr12"
              onClick={() => exportITR12TaxReport(rentals, 2026)}
              title="Download official SARS ITR12 Rental Tax Schedule (Sec 11(a) & 13sex) as Excel"
              className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
              <span>SARS ITR12 Export</span>
            </button>
            <button
              onClick={rentalModals.openAddRental}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Rental Property</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Rental Asset Value</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(summary.totalRentalValue)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{activeRentals.length} active rental units</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Gross Monthly Rent</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(totalGrossMonthlyRent)}/m</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Annual: {formatZAR(totalGrossMonthlyRent * 12)}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Net Monthly Cash Flow</span>
            <div className={`text-xl font-bold mt-1 ${totalNetMonthlyRent >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatZAR(totalNetMonthlyRent)}/m
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Operational pre-tax cash flow</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Rental Bonds Outstanding</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(summary.totalBondLiabilities)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active mortgage debt</p>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200 shadow-xs">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Rental Tax Reserve</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-900 mt-1">
              {formatZAR(summary.annualRentalTaxReserve)}
              <span className="text-xs font-normal text-amber-600">/yr</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5">
              {formatZAR(summary.monthlyRentalTaxReserve)}/m • SARS Liability Reserve
            </p>
          </div>
        </div>

        {/* Actuals YTD vs. Budget KPI Strip (SA Tax Year) */}
        <ActualVsBudgetKpiStrip rentals={rentals} />

        {/* Active vs Sold Archive Tab Toggle */}
        <div id="rentals-portfolio" className="scroll-mt-20 flex items-center justify-between bg-slate-100 p-1 rounded-xl max-w-md">
          <button
            type="button"
            onClick={() => setViewTab('active')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Portfolio ({activeRentals.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('archive')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewTab === 'archive'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sold Archive ({soldRentals.length})</span>
          </button>
        </div>

        {/* ACTIVE PORTFOLIO VIEW */}
        {viewTab === 'active' && (
          <>
            {rentalModals.refinanceSuccessBanner && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-purple-950">
                      Equity Pulled Out & Deposited into Seed Capital!
                    </h4>
                    <p className="text-[11px] text-purple-700">
                      <strong>{formatZAR(rentalModals.refinanceSuccessBanner.amount)}</strong> cash equity from {rentalModals.refinanceSuccessBanner.propertyTitle} is now instantly available in your global Liquid Capital Reserve for your next acquisition.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={rentalModals.clearRefinanceBanner}
                  className="text-purple-400 hover:text-purple-700 text-xs px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {activeRentals.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No active rental units in portfolio.</p>
                <p className="text-xs text-slate-400 mt-1">Add a rental unit or promote one from the Opportunity Analyzer.</p>
                {soldRentals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewTab('archive')}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>View {soldRentals.length} Sold Rental(s) in Archive</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeRentals.map((property) => {
                  const {
                    agencyCommissionZAR,
                    netMonthlyCashflowZAR: netCashflow,
                    totalGrossIncomeZAR,
                    ancillaryIncomeZAR,
                  } = calculateRentalCashflow(property);

                  const yieldGross = calculateGrossYield(totalGrossIncomeZAR, property.marketValueZAR);

                  const {
                    entityType,
                    taxRate,
                    taxRateLabel,
                    annualCashflow,
                    sec13Shield,
                    totalBadDebt,
                    taxableIncome,
                    annualTaxZAR,
                    monthlyTaxZAR,
                    taxSavingsZAR,
                    postTaxCashflow,
                    yieldPostTax,
                  } = calculateRentalTaxProvision(
                    property,
                    netCashflow,
                    investorProfile?.defaultTaxEntityType || 'Company (27%)'
                  );
                  const arrearsInfo = calculatePropertyArrears(property);

                  return (
                    <div
                      key={property.id}
                      data-testid={`rental-card-${property.id}`}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Property Header */}
                        <div className="p-4 border-b border-slate-100 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                <PropertyTypeBadge type={property.propertyType} />
                                <AgmDateChip agmDate={property.agmDate} />
                                {property.isBrrrrProperty && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    <ArrowRightLeft className="w-2.5 h-2.5 text-indigo-600" />
                                    <span>BRRRR Asset</span>
                                  </span>
                                )}
                                {(property.totalEquityExtractedZAR || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => rentalModals.openAuditHistory(property)}
                                    className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 hover:bg-purple-200 transition-colors cursor-pointer"
                                    title="View timestamped refinance and equity extraction history"
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                    <span>Equity Recycled: {formatZAR(property.totalEquityExtractedZAR || 0, { compact: true })}</span>
                                  </button>
                                )}
                              </div>
                              <h3 className="font-bold text-sm text-slate-900">{property.title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{property.address}, {property.city}</p>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                property.status === 'Occupied'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {property.status}
                            </span>
                          </div>

                          {/* Management Status & 1-Click Contact */}
                          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-50">
                            {property.managementType === 'Agency' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Building2 className="w-3 h-3 text-indigo-600" />
                                <span>🏢 Managed: {property.agencyName || 'Agency'} ({property.agencyCommissionPercent || 8}%{property.agencyVatApplicable !== false ? ` + VAT = ${((property.agencyCommissionPercent || 8) * 1.15).toFixed(1)}%` : ''})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                <span>👤 Self-Managed</span>
                              </span>
                            )}

                            {property.managementType === 'Agency' && property.agencyContact && (
                              <div className="flex items-center gap-1 text-[11px]">
                                {renderAgencyContactLinks(property.agencyContact)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tenant Default Risk Alert Banner */}
                        {arrearsInfo.totalArrearsZAR > 0 && (
                          <div className="bg-rose-50 border-y border-rose-200 px-4 py-2 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-bold text-rose-700">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                              ⚠️ Tenant Default Risk: Arrears Accruing
                            </span>
                            <span className="font-extrabold text-rose-700 font-mono">
                              -{formatZAR(arrearsInfo.totalArrearsZAR)}
                            </span>
                          </div>
                        )}

                        {/* Property Financial Highlights */}
                        <div className="p-4 bg-slate-50/60 grid grid-cols-3 gap-2 text-center border-b border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Market Value</span>
                            <strong className="text-slate-900">{formatZAR(property.marketValueZAR, { compact: true })}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Gross Yield</span>
                            <strong className="text-emerald-700">{formatPercent(yieldGross)}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Net Cashflow</span>
                            <strong className={netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                              {formatZAR(netCashflow)}/m
                            </strong>
                            <span className="text-[9px] text-slate-400 block font-normal">
                              Post-tax: {formatZAR(postTaxCashflow)}/m
                            </span>
                          </div>
                        </div>

                        {/* Card Tab Switcher */}
                        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 gap-1 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setCardTab((prev) => ({ ...prev, [property.id]: 'financials' }))}
                            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              (cardTab[property.id] || 'financials') === 'financials'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Lease & Costs</span>
                          </button>

                          <button
                            type="button"
                            data-testid={`tab-payments-${property.id}`}
                            onClick={() => setCardTab((prev) => ({ ...prev, [property.id]: 'payments' }))}
                            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              cardTab[property.id] === 'payments'
                                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Payments & Arrears</span>
                            {arrearsInfo.totalArrearsZAR > 0 && (
                              <span
                                className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                                title={`Outstanding Arrears: ${formatZAR(arrearsInfo.totalArrearsZAR)}`}
                              />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setCardTab((prev) => ({ ...prev, [property.id]: 'coc' }))}
                            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              cardTab[property.id] === 'coc'
                                ? 'bg-white text-emerald-800 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mandatory CoC</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCardTab((prev) => ({ ...prev, [property.id]: 'vault' }))}
                            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              cardTab[property.id] === 'vault'
                                ? 'bg-white text-indigo-800 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <FolderArchive className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Cloud Vault</span>
                          </button>
                        </div>

                        {(cardTab[property.id] || 'financials') === 'financials' && (
                          <>
                            {/* Tenant Lease Details */}
                            <div className="p-4 space-y-2 text-xs border-b border-slate-100">
                              {(property.leases?.length || 0) > 1 ? (
                                <>
                                  <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                      Units:
                                    </span>
                                    <strong className="text-slate-900">
                                      {property.leases.length} Units • {property.leases.filter(l => l.status === 'Occupied').length} Occupied • {formatZAR(property.leases.filter(l => l.status === 'Occupied').reduce((s, l) => s + l.monthlyRentZAR, 0))}/m
                                    </strong>
                                  </div>
                                  <div className="space-y-1 pl-5">
                                    {property.leases.map(l => (
                                      <div key={l.id} className="flex items-center justify-between text-[11px] gap-2 flex-wrap sm:flex-nowrap">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={l.status === 'Occupied' ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                                            {l.unitName}: {l.tenantName} ({l.status})
                                          </span>
                                          {l.roomType && (
                                            <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                              {l.roomType}
                                            </span>
                                          )}
                                          {l.guarantorName && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 max-w-[220px] truncate" title={`Guarantor: ${l.guarantorName}${l.guarantorContact ? ` (${l.guarantorContact})` : ''}`}>
                                              <span className="shrink-0">🛡️</span>
                                              <span className="truncate">Guarantor: {l.guarantorName}</span>
                                              {l.guarantorContact && (
                                                l.guarantorContact.includes('@') ? (
                                                  <a href={`mailto:${l.guarantorContact}`} className="text-indigo-600 hover:underline shrink-0" onClick={e => e.stopPropagation()} title={`Email guarantor: ${l.guarantorContact}`}>✉️</a>
                                                ) : (
                                                  <a href={`tel:${l.guarantorContact.replace(/\s+/g, '')}`} className="text-indigo-600 hover:underline shrink-0" onClick={e => e.stopPropagation()} title={`Call guarantor: ${l.guarantorContact}`}>📞</a>
                                                )
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        <span className="font-medium shrink-0">{formatZAR(l.monthlyRentZAR)}/m</span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                      Tenant:
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                      <strong className="text-slate-900">{property.leases?.[0]?.tenantName}</strong>
                                      {property.leases?.[0]?.roomType && (
                                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                          {property.leases[0].roomType}
                                        </span>
                                      )}
                                      {property.leases?.[0]?.guarantorName && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 max-w-[220px] truncate" title={`Guarantor: ${property.leases[0].guarantorName}${property.leases[0].guarantorContact ? ` (${property.leases[0].guarantorContact})` : ''}`}>
                                          <span className="shrink-0">🛡️</span>
                                          <span className="truncate">Guarantor: {property.leases[0].guarantorName}</span>
                                          {property.leases[0].guarantorContact && (
                                            property.leases[0].guarantorContact.includes('@') ? (
                                              <a href={`mailto:${property.leases[0].guarantorContact}`} className="text-indigo-600 hover:underline shrink-0" onClick={e => e.stopPropagation()} title={`Email guarantor: ${property.leases[0].guarantorContact}`}>✉️</a>
                                            ) : (
                                              <a href={`tel:${property.leases[0].guarantorContact.replace(/\s+/g, '')}`} className="text-indigo-600 hover:underline shrink-0" onClick={e => e.stopPropagation()} title={`Call guarantor: ${property.leases[0].guarantorContact}`}>📞</a>
                                            )
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      Lease Expiry:
                                    </span>
                                    <span>{formatDate(property.leases?.[0]?.leaseEndDate || '')}</span>
                                  </div>

                                  <div className="flex items-center justify-between text-slate-600">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                      Deposit Held in Trust:
                                    </span>
                                    <strong className="text-slate-800">{formatZAR(property.leases?.[0]?.depositHeldZAR || 0)}</strong>
                                  </div>

                                  <div className="flex items-center justify-between text-slate-600">
                                    <span className="text-slate-500">Annual Escalation:</span>
                                    <strong className="text-emerald-700">{property.leases?.[0]?.annualEscalationPercent || 0}% p.a.</strong>
                                  </div>
                                </>
                              )}

                              {/* Ancillary Income Summary */}
                              {(property.ancillaryIncomes?.length || 0) > 0 && (
                                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                                  <span className="text-[10px] font-medium text-teal-700">+ Ancillary Income:</span>
                                  <span className="text-[10px] font-bold text-teal-800">
                                    + {formatZAR(property.ancillaryIncomes!.reduce((s, a) => s + a.monthlyRentZAR, 0))}/m ({property.ancillaryIncomes!.map(a => {
                                      const typeLabels: Record<string, string> = { cell_tower: 'Tower', billboard: 'Billboard', parking: 'Parking', storage: 'Storage', other: 'Other' };
                                      return `${a.tenantName} ${typeLabels[a.type] || a.type}`;
                                    }).join(', ')})
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Monthly Expenses Breakdown */}
                            <div className="p-4 text-xs space-y-2 text-slate-600">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Gross Monthly Rent:</span>
                                <InlineEditableAmount
                                  value={property.monthlyGrossRentZAR || 0}
                                  onSave={(val) => updateRental(property.id, { monthlyGrossRentZAR: val })}
                                  title="Click to edit gross monthly rent inline"
                                  prefix=""
                                  className="text-slate-900 font-bold"
                                />
                              </div>

                              {ancillaryIncomeZAR > 0 && (
                                <div className="flex justify-between items-center text-teal-700 bg-teal-50/60 px-2 py-1 rounded border border-teal-100 text-[11px]">
                                  <span className="font-semibold">Commercial Ancillary Leases:</span>
                                  <span className="font-bold font-mono">+ {formatZAR(ancillaryIncomeZAR)}/m</span>
                                </div>
                              )}

                              {property.propertyType === 'Freehold House' ? (
                                <div className="flex justify-between items-center text-slate-500">
                                  <span>Building Insurance (Homeowner):</span>
                                  <InlineEditableAmount
                                    value={Math.round((property.annualBuildingInsuranceZAR || 0) / 12)}
                                    onSave={(val) => updateRental(property.id, { annualBuildingInsuranceZAR: Math.round(val * 12) })}
                                    title="Click to edit monthly building insurance inline"
                                  />
                                </div>
                              ) : (
                                <div className="flex justify-between items-center text-slate-500">
                                  <span>Body Corporate / HOA Levies:</span>
                                  <InlineEditableAmount
                                    value={property.monthlyLeviesZAR}
                                    onSave={(val) => updateRental(property.id, { monthlyLeviesZAR: val })}
                                    title="Click to edit monthly levies inline"
                                  />
                                </div>
                              )}

                              <div className="flex justify-between items-center text-slate-500">
                                <span>Municipal Rates & Taxes:</span>
                                <InlineEditableAmount
                                  value={property.monthlyRatesTaxesZAR}
                                  onSave={(val) => updateRental(property.id, { monthlyRatesTaxesZAR: val })}
                                  title="Click to edit municipal rates & taxes inline"
                                />
                              </div>

                              {property.managementType === 'Agency' ? (
                                <div className="flex justify-between items-center text-slate-700 font-medium bg-indigo-50/60 px-2 py-1 rounded border border-indigo-100">
                                  <span className="flex items-center gap-1 text-[11px]">
                                    <Building2 className="w-3 h-3 text-indigo-600" />
                                    Agency Fee ({property.agencyCommissionPercent || 8}%{property.agencyVatApplicable !== false ? ' + 15% VAT' : ''} - {property.agencyName || 'Agent'}):
                                  </span>
                                  <InlineEditableAmount
                                    value={agencyCommissionZAR}
                                    onSave={(val) => {
                                      const gross = property.monthlyGrossRentZAR || 0;
                                      const newPercent = gross > 0 ? Number(((val / gross) * 100).toFixed(1)) : (property.agencyCommissionPercent || 8);
                                      updateRental(property.id, {
                                        monthlyAgentFeeZAR: val,
                                        agencyCommissionPercent: newPercent,
                                        ...(property.agencyName === 'iGrow Rentals' ? { agencyVatApplicable: false } : {}),
                                      });
                                    }}
                                    title="Click to edit agency fee inline"
                                  />
                                </div>
                              ) : (
                                <div className="flex justify-between items-center text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <span>👤</span> Agency Fee (Self-Managed):
                                  </span>
                                  <span className="text-emerald-700 font-semibold">R 0 (0%)</span>
                                </div>
                              )}

                              <div className="flex justify-between items-center text-slate-500">
                                <span>Maintenance Reserve:</span>
                                <span>- {formatZAR(property.monthlyMaintenanceReserveZAR)}</span>
                              </div>

                              {(property.monthlyPrepaidVendingFeeZAR || 0) > 0 && (
                                <div className="flex justify-between items-center text-slate-500">
                                  <span>Prepaid Sub-Meter Fee ({property.prepaidVendorName || 'Vendor'}):</span>
                                  <span>- {formatZAR(property.monthlyPrepaidVendingFeeZAR || 0)}</span>
                                </div>
                              )}

                              {(property.monthlyCommunalServicesZAR || 0) > 0 && (
                                <div className="flex justify-between items-center text-slate-500">
                                  <span>Communal / Serviced:</span>
                                  <span>- {formatZAR(property.monthlyCommunalServicesZAR || 0)}</span>
                                </div>
                              )}

                              <div className="flex justify-between items-center text-slate-700 bg-slate-50/80 px-2 py-1.5 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-800 text-[11px]">Bank Bond Payment:</span>
                                  {property.bondPaymentEffectiveDate && (
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200"
                                      title={property.bondRevisionNote || 'Forward-only effective month'}
                                    >
                                      Effective: {property.bondPaymentEffectiveDate}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => rentalModals.openPmtCalculator(property)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
                                    title="SARB Repo Rate PMT Calculator - forward-only bond adjustment"
                                  >
                                    <Calculator className="w-3 h-3 text-indigo-600" />
                                    <span>SARB PMT</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => rentalModals.openRefinance(property)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shadow-2xs transition-colors cursor-pointer"
                                    title="BRRRR: Refinance and pull out equity into seed capital"
                                  >
                                    <ArrowUpRight className="w-3 h-3 text-purple-600" />
                                    <span>Refinance</span>
                                  </button>
                                </div>
                                <InlineEditableAmount
                                  value={property.monthlyBondPaymentZAR}
                                  onSave={(val) => updateRental(property.id, { monthlyBondPaymentZAR: val })}
                                  title="Click to edit bond repayment inline"
                                />
                              </div>

                              {(property.unpaidUtilityArrearsZAR || 0) > 0 && (
                                <div className="flex justify-between text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-200 text-[11px]">
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    Utility Arrears Deduction:
                                  </span>
                                  <span>- {formatZAR(property.unpaidUtilityArrearsZAR || 0)}</span>
                                </div>
                              )}

                              {/* SARS Income Tax Provision */}
                              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                                <div className="flex flex-col gap-2 text-slate-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-amber-950 text-[11px]">
                                          Est. SARS Tax Provision:
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                          {taxRateLabel} {property.taxEntityTypeOverride ? '(Override)' : '(Default)'}
                                        </span>
                                        {sec13Shield > 0 && (
                                          <span
                                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5"
                                            title={`Section 13sex Tax Shield: ${formatZAR(sec13Shield)}/yr allowance saves ${formatZAR(taxSavingsZAR)}/yr in SARS income tax`}
                                          >
                                            ✓ Sec 13sex Shield Active (-{formatZAR(taxSavingsZAR)}/yr)
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-amber-700 block mt-0.5">
                                        {taxRate === 0
                                          ? 'Pre-Tax entity structure (0% tax liability)'
                                          : netCashflow <= 0
                                          ? 'Assessed operational loss (R 0 tax liability)'
                                          : `${formatZAR(annualTaxZAR)}/yr tax reserve liability`}
                                      </span>
                                    </div>
                                    <span className="font-mono font-bold text-amber-900 text-xs shrink-0">
                                      {monthlyTaxZAR > 0 ? `- ${formatZAR(monthlyTaxZAR)}` : 'R 0'}
                                    </span>
                                  </div>

                                  {/* 1-Click Interactive Tax Entity Toggle */}
                                  <div className="flex items-center gap-1 pt-1.5 border-t border-amber-200/60 flex-wrap">
                                    <span className="text-[9px] font-bold text-amber-900/70 uppercase tracking-wider mr-0.5">
                                      Entity:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateRental(property.id, { taxEntityTypeOverride: undefined })}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                                        property.taxEntityTypeOverride === undefined
                                          ? 'bg-amber-700 text-white shadow-2xs'
                                          : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-amber-100 border border-amber-200'
                                      }`}
                                      title={`Inherit global default from Settings (${investorProfile?.defaultTaxEntityType || 'Company (27%)'})`}
                                    >
                                      Default ({investorProfile?.defaultTaxEntityType === 'Individual (45%)' ? '45%' : investorProfile?.defaultTaxEntityType === 'Pre-Tax' ? '0%' : '27%'})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateRental(property.id, { taxEntityTypeOverride: 'Company (27%)' })}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                                        property.taxEntityTypeOverride === 'Company (27%)'
                                          ? 'bg-amber-700 text-white shadow-2xs'
                                          : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-amber-100 border border-amber-200'
                                      }`}
                                    >
                                      Company 27%
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateRental(property.id, { taxEntityTypeOverride: 'Individual (45%)' })}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                                        property.taxEntityTypeOverride === 'Individual (45%)'
                                          ? 'bg-amber-700 text-white shadow-2xs'
                                          : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-amber-100 border border-amber-200'
                                      }`}
                                    >
                                      Individual 45%
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateRental(property.id, { taxEntityTypeOverride: 'Pre-Tax' })}
                                      className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                                        property.taxEntityTypeOverride === 'Pre-Tax'
                                          ? 'bg-amber-700 text-white shadow-2xs'
                                          : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-amber-100 border border-amber-200'
                                      }`}
                                    >
                                      Pre-Tax 0%
                                    </button>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-slate-900 bg-emerald-50/70 px-2.5 py-2 rounded-lg border border-emerald-200">
                                  <div>
                                    <span className="font-bold text-emerald-950 text-xs block">
                                      Net Post-Tax Cash Flow:
                                    </span>
                                    <span className="text-[10px] text-emerald-700">
                                      Post-tax yield: {formatPercent(yieldPostTax)}
                                    </span>
                                  </div>
                                  <span className={`font-mono font-black text-sm ${postTaxCashflow >= 0 ? 'text-emerald-900' : 'text-rose-700'}`}>
                                    {formatZAR(postTaxCashflow)}/m
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Inline Editable Utility Arrears Box */}
                            <div className={`mx-4 mb-4 p-3 rounded-lg border text-xs transition-colors ${
                              (property.unpaidUtilityArrearsZAR || 0) > 0
                                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[11px] uppercase tracking-wider">Utility Arrears</span>
                                  {(property.unpaidUtilityArrearsZAR || 0) > 0 ? (
                                    <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                                      ⚠️ Tenant Default Risk
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-emerald-600 font-semibold">✓ Paid Up</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => rentalModals.openStatementModal(property.id)}
                                    className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                    title="View tenant utility recovery and month-over-month variance statement"
                                  >
                                    <FileText className="w-2.5 h-2.5 text-teal-600" />
                                    <span>Statements ({(property.utilityStatements?.length || 0)})</span>
                                  </button>
                                  <span className="text-[10px] text-slate-400">Inline edit</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-1">
                                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">R</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    key={`${property.id}-${property.unpaidUtilityArrearsZAR || 0}`}
                                    defaultValue={property.unpaidUtilityArrearsZAR || 0}
                                    onBlur={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      if (val !== (property.unpaidUtilityArrearsZAR || 0)) {
                                        updateRental(property.id, { unpaidUtilityArrearsZAR: val });
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    className={`w-full pl-6 pr-2 py-1 text-xs font-mono font-bold rounded border transition-colors focus:outline-none focus:ring-1 ${
                                      (property.unpaidUtilityArrearsZAR || 0) > 0
                                        ? 'bg-white border-rose-300 text-rose-700 focus:ring-rose-400'
                                        : 'bg-white border-slate-300 text-slate-700 focus:ring-emerald-400'
                                    }`}
                                    placeholder="0"
                                    title="Edit utility arrears and press Enter or click away to save"
                                  />
                                </div>
                                {(property.unpaidUtilityArrearsZAR || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => updateRental(property.id, { unpaidUtilityArrearsZAR: 0 })}
                                    className="px-2 py-1 text-[10px] font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Mark arrears as cleared"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {(property.unpaidUtilityArrearsZAR || 0) > 0
                                  ? 'Unpaid municipal water/lights debt deducted directly from Net Monthly Cashflow.'
                                  : 'No outstanding municipal utility debt on this unit.'}
                              </p>
                            </div>
                          </>
                        )}

                        {cardTab[property.id] === 'payments' && (() => {
                          const activeTenantTab = selectedTenantTab[property.id] || 'all';
                          const activeTenantLease = activeTenantTab !== 'all'
                            ? (property.leases || []).find((l) => l.id === activeTenantTab)
                            : undefined;

                          const currentTabArrearsInfo = calculatePropertyArrears(
                            property,
                            undefined,
                            activeTenantLease ? { leaseId: activeTenantLease.id } : undefined
                          );

                          return (
                            <div className="p-4 space-y-4 bg-white text-xs">
                              {/* 1. Tenant / Unit Selector Pill Bar (Consolidated + Individual Leases) */}
                              {property.leases && property.leases.length > 0 && (
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
                                  <button
                                    type="button"
                                    data-testid={`tenant-tab-all-${property.id}`}
                                    onClick={() => setSelectedTenantTab((prev) => ({ ...prev, [property.id]: 'all' }))}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                      activeTenantTab === 'all'
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>All Units (Consolidated)</span>
                                    {property.unpaidUtilityArrearsZAR && property.unpaidUtilityArrearsZAR > 0 ? (
                                      <span className="text-[9px] font-extrabold bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                                        -{formatZAR(property.unpaidUtilityArrearsZAR, { compact: true })}
                                      </span>
                                    ) : null}
                                  </button>

                                  {property.leases.map((lease) => {
                                    const isSelected = activeTenantTab === lease.id;
                                    const leaseArrears = lease.unpaidUtilityArrearsZAR || 0;
                                    return (
                                      <button
                                        key={lease.id}
                                        type="button"
                                        data-testid={`tenant-tab-${lease.id}`}
                                        onClick={() => setSelectedTenantTab((prev) => ({ ...prev, [property.id]: lease.id }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                          isSelected
                                            ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        <span>{lease.unitName}: {lease.tenantName}</span>
                                        {leaseArrears > 0 && (
                                          <span
                                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                              isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700 border border-rose-200'
                                            }`}
                                          >
                                            -{formatZAR(leaseArrears, { compact: true })}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 2. Current Month Status Banner */}
                              <div
                                className={`p-3.5 rounded-xl border transition-all ${
                                  currentTabArrearsInfo.currentMonthStatus === 'Paid in Full'
                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                    : currentTabArrearsInfo.currentMonthStatus === 'Overpaid'
                                    ? 'bg-teal-50/80 border-teal-200 text-teal-950'
                                    : currentTabArrearsInfo.currentMonthStatus === 'Partial'
                                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                                    : 'bg-rose-50/90 border-rose-200 text-rose-950'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs uppercase tracking-wider">
                                      {currentTabArrearsInfo.currentMonthItem.monthLabel}
                                    </span>

                                    {activeTenantLease ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                                        <UserCheck className="w-3 h-3 text-emerald-700" />
                                        {activeTenantLease.unitName} ({activeTenantLease.tenantName})
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                                        <Building2 className="w-3 h-3 text-slate-600" />
                                        Consolidated ({property.leases?.length || 0} Units)
                                      </span>
                                    )}

                                    {currentTabArrearsInfo.currentMonthStatus === 'Paid in Full' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Paid in Full
                                      </span>
                                    )}
                                    {currentTabArrearsInfo.currentMonthStatus === 'Overpaid' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                                        <CheckCircle2 className="w-3 h-3 text-teal-600" />
                                        Overpaid (+{formatZAR(Math.abs(currentTabArrearsInfo.currentMonthItem.netVariance))})
                                      </span>
                                    )}
                                    {currentTabArrearsInfo.currentMonthStatus === 'Partial' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                                        Partial ({formatZAR(currentTabArrearsInfo.currentMonthDueZAR)} due)
                                      </span>
                                    )}
                                    {currentTabArrearsInfo.currentMonthStatus === 'Unpaid' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                        Unpaid (Due 1st: {formatZAR(currentTabArrearsInfo.currentMonthDueZAR)})
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {currentTabArrearsInfo.currentMonthDueZAR > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (activeTenantLease) {
                                            recordTenantPayment(property.id, {
                                              periodMonth: currentTabArrearsInfo.currentMonth,
                                              paymentDate: new Date().toISOString().split('T')[0],
                                              amountReceivedZAR: currentTabArrearsInfo.currentMonthDueZAR,
                                              paymentMethod: 'EFT',
                                              leaseId: activeTenantLease.id,
                                              reference: `${activeTenantLease.unitName} Full Rent`,
                                              notes: `Paid in full for ${currentTabArrearsInfo.currentMonthItem.monthLabel} (${activeTenantLease.tenantName})`,
                                            });
                                            setCopyFeedbackToast(
                                              `Marked ${activeTenantLease.unitName} as Paid in Full (${formatZAR(currentTabArrearsInfo.currentMonthDueZAR)})`
                                            );
                                          } else {
                                            if (property.leases && property.leases.length > 0) {
                                              let recordedCount = 0;
                                              property.leases.forEach((l) => {
                                                const leaseArrears = calculatePropertyArrears(property, undefined, { leaseId: l.id });
                                                if (leaseArrears.currentMonthDueZAR > 0) {
                                                  recordTenantPayment(property.id, {
                                                    periodMonth: currentTabArrearsInfo.currentMonth,
                                                    paymentDate: new Date().toISOString().split('T')[0],
                                                    amountReceivedZAR: leaseArrears.currentMonthDueZAR,
                                                    paymentMethod: 'EFT',
                                                    leaseId: l.id,
                                                    reference: `${l.unitName || 'Rent'} Paid in Full`,
                                                    notes: `Paid in full for ${currentTabArrearsInfo.currentMonthItem.monthLabel} (${l.tenantName})`,
                                                  });
                                                  recordedCount++;
                                                }
                                              });
                                              setCopyFeedbackToast(
                                                `Marked ${recordedCount} lease(s) as Paid in Full (${formatZAR(currentTabArrearsInfo.currentMonthDueZAR)})`
                                              );
                                            } else {
                                              recordTenantPayment(property.id, {
                                                periodMonth: currentTabArrearsInfo.currentMonth,
                                                paymentDate: new Date().toISOString().split('T')[0],
                                                amountReceivedZAR: currentTabArrearsInfo.currentMonthDueZAR,
                                                paymentMethod: 'EFT',
                                                reference: 'Full Rent & Utilities',
                                                notes: `Paid in full for ${currentTabArrearsInfo.currentMonthItem.monthLabel}`,
                                              });
                                              setCopyFeedbackToast(
                                                `Marked ${currentTabArrearsInfo.currentMonthItem.monthLabel} as Paid in Full (${formatZAR(currentTabArrearsInfo.currentMonthDueZAR)})`
                                              );
                                            }
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs transition-colors cursor-pointer"
                                        title="1-Click: Mark month as Paid in Full"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Mark Month as Paid ({formatZAR(currentTabArrearsInfo.currentMonthDueZAR)})</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        paymentModal.openLogPayment(
                                          property,
                                          currentTabArrearsInfo.currentMonth,
                                          currentTabArrearsInfo.currentMonthDueZAR > 0
                                            ? currentTabArrearsInfo.currentMonthDueZAR
                                            : currentTabArrearsInfo.currentMonthBilledZAR,
                                          activeTenantLease?.id
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded shadow-2xs transition-colors cursor-pointer"
                                      title="Log a tenant payment for this property"
                                    >
                                      <PlusCircle className="w-3 h-3 text-emerald-600" />
                                      <span>+ Log Payment</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
                                  <div className="bg-white/70 p-1.5 rounded-lg border border-slate-200/50">
                                    <span className="text-[10px] text-slate-500 block">Total Billed</span>
                                    <span className="font-bold text-slate-900 font-mono">
                                      {formatZAR(currentTabArrearsInfo.currentMonthBilledZAR)}
                                    </span>
                                    <span className="text-[9px] text-slate-400 block">
                                      Rent {formatZAR(currentTabArrearsInfo.currentMonthItem.baseRent)} + Util {formatZAR(currentTabArrearsInfo.currentMonthItem.utilitiesBilled)}
                                    </span>
                                  </div>
                                  <div className="bg-white/70 p-1.5 rounded-lg border border-slate-200/50">
                                    <span className="text-[10px] text-slate-500 block">Payments Received</span>
                                    <span className="font-bold text-emerald-700 font-mono">
                                      {formatZAR(currentTabArrearsInfo.currentMonthPaidZAR)}
                                    </span>
                                    <span className="text-[9px] text-slate-400 block">
                                      {currentTabArrearsInfo.currentMonthItem.payments.length} payment(s)
                                    </span>
                                  </div>
                                  <div className="bg-white/70 p-1.5 rounded-lg border border-slate-200/50">
                                    <span className="text-[10px] text-slate-500 block">Period Variance</span>
                                    <span
                                      className={`font-bold font-mono ${
                                        currentTabArrearsInfo.currentMonthItem.netVariance > 0
                                          ? 'text-rose-700'
                                          : currentTabArrearsInfo.currentMonthItem.netVariance < 0
                                          ? 'text-teal-700'
                                          : 'text-emerald-700'
                                      }`}
                                    >
                                      {currentTabArrearsInfo.currentMonthItem.netVariance > 0
                                        ? `${formatZAR(currentTabArrearsInfo.currentMonthItem.netVariance)} Due`
                                        : currentTabArrearsInfo.currentMonthItem.netVariance < 0
                                        ? `-${formatZAR(Math.abs(currentTabArrearsInfo.currentMonthItem.netVariance))} Credit`
                                        : 'R 0.00'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 block">
                                      Due 1st of month
                                    </span>
                                  </div>
                                </div>

                                {/* Multi-Tenant Unit Breakdown Roster in Consolidated View */}
                                {activeTenantTab === 'all' && (property.leases || []).length > 1 && (
                                  <div className="mt-3 pt-2.5 border-t border-slate-200/70">
                                    <div className="text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                      Tenant Unit Breakdown (This Month)
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {(property.leases || []).map((lease) => {
                                        const leaseArrears = calculatePropertyArrears(property, undefined, { leaseId: lease.id });
                                        const status = leaseArrears.currentMonthStatus;
                                        return (
                                          <div
                                            key={lease.id}
                                            className="p-2 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-between gap-2"
                                          >
                                            <div>
                                              <div className="font-bold text-slate-900 text-xs">
                                                {lease.unitName}: {lease.tenantName}
                                              </div>
                                              <div className="text-[10px] text-slate-500">
                                                Rent: {formatZAR(lease.monthlyRentZAR)}/m • Total Arrears: <strong className={leaseArrears.totalArrearsZAR > 0 ? 'text-rose-700' : 'text-emerald-700'}>{formatZAR(leaseArrears.totalArrearsZAR)}</strong>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span
                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                                  status === 'Paid in Full'
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                    : status === 'Partial'
                                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                                }`}
                                              >
                                                {status}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => setSelectedTenantTab((prev) => ({ ...prev, [property.id]: lease.id }))}
                                                className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                                              >
                                                View Tab →
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 3. Arrears Balance Box with Live Reconciliation */}
                              <div
                                className={`p-3.5 rounded-xl border transition-all ${
                                  currentTabArrearsInfo.totalArrearsZAR > 0
                                    ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[11px] uppercase tracking-wider">
                                      {activeTenantLease ? `${activeTenantLease.unitName} Arrears Balance` : 'Total Arrears Balance (All Units)'}
                                    </span>
                                    {currentTabArrearsInfo.totalArrearsZAR > 0 ? (
                                      <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                                        ⚠️ Arrears Outstanding
                                      </span>
                                    ) : currentTabArrearsInfo.totalArrearsZAR < 0 ? (
                                      <span className="text-[10px] text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded font-bold">
                                        In Credit
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                                        ✓ Account Paid Up
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono font-black text-sm text-slate-900">
                                    {currentTabArrearsInfo.totalArrearsZAR > 0
                                      ? formatZAR(currentTabArrearsInfo.totalArrearsZAR)
                                      : currentTabArrearsInfo.totalArrearsZAR < 0
                                      ? `-${formatZAR(Math.abs(currentTabArrearsInfo.totalArrearsZAR))}`
                                      : 'R 0.00'}
                                  </span>
                                </div>

                                <p className="text-[10px] text-slate-500 font-mono bg-white/60 p-1.5 rounded border border-slate-200/50">
                                  Opening Balance ({formatZAR(currentTabArrearsInfo.openingBalanceZAR)}) + Billed Charges ({formatZAR(currentTabArrearsInfo.totalBilledChargesZAR)}) - Payments ({formatZAR(currentTabArrearsInfo.totalPaymentsReceivedZAR)}) {currentTabArrearsInfo.totalWriteOffsZAR > 0 ? `- Write-offs (${formatZAR(currentTabArrearsInfo.totalWriteOffsZAR)}) ` : ''}= <strong className="text-slate-900">{formatZAR(currentTabArrearsInfo.totalArrearsZAR)}</strong>
                                </p>

                                {/* Opening Balance & Action Controls */}
                                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
                                    <span className="text-[10px] text-slate-600 font-semibold" title="Historical debt from before system tracking. Edit directly (>= 0).">
                                      Opening Balance (debt from before tracking):
                                    </span>
                                    <div className="relative flex-1 max-w-[120px]">
                                      <span className="absolute left-2.5 top-1 text-xs text-slate-400 font-bold">R</span>
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        key={`${property.id}-${activeTenantTab}-ob-${currentTabArrearsInfo.openingBalanceZAR}`}
                                        defaultValue={currentTabArrearsInfo.openingBalanceZAR}
                                        onBlur={(e) => {
                                          const targetVal = Math.max(0, Number(e.target.value) || 0);
                                          if (targetVal !== currentTabArrearsInfo.openingBalanceZAR) {
                                            updateArrearsOpeningBalance(property.id, targetVal, activeTenantLease?.id);
                                            setCopyFeedbackToast(
                                              activeTenantLease
                                                ? `${activeTenantLease.unitName} opening balance updated to ${formatZAR(targetVal)}`
                                                : `Opening balance updated to ${formatZAR(targetVal)}`
                                            );
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                          }
                                        }}
                                        className="w-full pl-6 pr-2 py-0.5 text-xs font-mono font-bold bg-white rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                                        title="Opening balance from before tracking. Direct edit (>= 0)."
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {currentTabArrearsInfo.totalArrearsZAR > 0 && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            paymentModal.openLogPayment(
                                              property,
                                              undefined,
                                              currentTabArrearsInfo.totalArrearsZAR,
                                              activeTenantLease?.id,
                                              true // isArrearsPayment
                                            )
                                          }
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer shadow-2xs"
                                          title="Receive payment towards accumulated arrears (allocated oldest-unpaid-month-first)"
                                        >
                                          <Coins className="w-3 h-3" />
                                          <span>Receive Arrears Payment</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            writeOffModal.openWriteOff(
                                              property,
                                              currentTabArrearsInfo.totalArrearsZAR,
                                              activeTenantLease?.id
                                            )
                                          }
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shadow-2xs"
                                          title="Write off uncollectable arrears with audit reason and tax deduction"
                                        >
                                          <MinusCircle className="w-3 h-3 text-rose-500" />
                                          <span>Write Off</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 4. Historical Billing & Payment Ledger */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-bold text-slate-800 text-xs">
                                      {activeTenantLease ? `${activeTenantLease.unitName} Billing & Payment Ledger` : 'Billing & Payment Ledger (All Units)'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      ({currentTabArrearsInfo.ledger.length} months)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const stmt = formatTenantAccountStatementForWhatsApp(property, {
                                          leaseId: activeTenantLease?.id,
                                          investorProfile,
                                        });
                                        if (navigator?.clipboard?.writeText) {
                                          await navigator.clipboard.writeText(stmt);
                                        }
                                        setCopyFeedbackToast('WhatsApp Statement copied to clipboard!');
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                                      title="Copy 4-tier account statement ready for WhatsApp"
                                    >
                                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                                      <span>WhatsApp Statement</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => rentalModals.openStatementModal(property.id)}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition-colors cursor-pointer"
                                      title="Open interactive tenant statement modal"
                                    >
                                      <FileText className="w-3 h-3 text-teal-600" />
                                      <span>Statement Viewer</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                  {[...currentTabArrearsInfo.ledger].reverse().map((item) => (
                                    <div
                                      key={item.month}
                                      className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-slate-800">
                                            {item.monthLabel}
                                          </span>
                                          <span
                                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                              item.status === 'Paid in Full'
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                : item.status === 'Overpaid'
                                                ? 'bg-teal-100 text-teal-800 border-teal-300'
                                                : item.status === 'Partial'
                                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                                : 'bg-rose-100 text-rose-800 border-rose-300'
                                            }`}
                                          >
                                            {item.status}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-500">
                                            Billed: <strong className="text-slate-800 font-mono">{formatZAR(item.totalBilled)}</strong>
                                          </span>
                                          <span className="text-slate-500">
                                            Paid: <strong className="text-emerald-700 font-mono">{formatZAR(item.paymentsReceived)}</strong>
                                          </span>
                                          {item.writeOffsApplied > 0 && (
                                            <span className="text-slate-500">
                                              Written off: <strong className="text-slate-600 font-mono">-{formatZAR(item.writeOffsApplied)}</strong>
                                            </span>
                                          )}
                                          <span
                                            className={`font-mono font-bold ${
                                              item.netVariance > 0
                                                ? 'text-rose-700'
                                                : item.netVariance < 0
                                                ? 'text-teal-700'
                                                : 'text-slate-400'
                                            }`}
                                          >
                                            {item.netVariance > 0
                                              ? `+${formatZAR(item.netVariance)}`
                                              : item.netVariance < 0
                                              ? `-${formatZAR(Math.abs(item.netVariance))}`
                                              : 'R 0'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Itemized Payments for this month */}
                                      {item.allocatedPayments && item.allocatedPayments.length > 0 ? (
                                        <div className="space-y-1 pt-1 border-t border-slate-200/60">
                                          {item.allocatedPayments.map(({ payment: p, allocatedAmountZAR }) => {
                                            const paymentLease = (property.leases || []).find((l) => l.id === p.leaseId);
                                            const isDeposit = p.paymentMethod === 'Deposit Applied';
                                            return (
                                              <div
                                                key={`${p.id}-${item.month}`}
                                                className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200 text-[11px]"
                                              >
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="font-semibold text-slate-700">
                                                    {formatDate(p.paymentDate)}
                                                  </span>
                                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                                    isDeposit
                                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                                  }`}>
                                                    {isDeposit ? 'Deposit Applied' : p.paymentMethod}
                                                  </span>
                                                  {paymentLease && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                      {paymentLease.unitName}
                                                    </span>
                                                  )}
                                                  {p.reference && (
                                                    <span className="text-[10px] text-slate-400">
                                                      Ref: {p.reference}
                                                    </span>
                                                  )}
                                                  {allocatedAmountZAR < p.amountReceivedZAR && (
                                                    <span className="text-[10px] text-slate-500 font-medium">
                                                      ({formatZAR(allocatedAmountZAR)} of {formatZAR(p.amountReceivedZAR)})
                                                    </span>
                                                  )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono font-bold text-emerald-700">
                                                    {formatZAR(allocatedAmountZAR)}
                                                  </span>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={async () => {
                                                        const receipt = formatTenantPaymentReceiptForWhatsApp(
                                                          property,
                                                          p,
                                                          investorProfile
                                                        );
                                                        if (navigator?.clipboard?.writeText) {
                                                          await navigator.clipboard.writeText(receipt);
                                                        }
                                                        setCopyFeedbackToast(
                                                          `WhatsApp Receipt for ${formatZAR(p.amountReceivedZAR)} copied!`
                                                        );
                                                      }}
                                                      className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                                      title="Copy WhatsApp payment receipt"
                                                    >
                                                      <MessageCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => paymentModal.openEditPayment(property, p)}
                                                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                      title="Edit payment"
                                                    >
                                                      <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        if (
                                                          window.confirm(
                                                            `Delete payment of ${formatZAR(
                                                              p.amountReceivedZAR
                                                            )} recorded on ${formatDate(p.paymentDate)}?`
                                                          )
                                                        ) {
                                                          deleteTenantPayment(property.id, p.id);
                                                          setCopyFeedbackToast('Payment deleted');
                                                        }
                                                      }}
                                                      className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                                      title="Delete payment"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                                          <span>No payments recorded for {item.monthLabel}</span>
                                        </div>
                                      )}

                                      {/* Itemized Write-offs for this month */}
                                      {item.allocatedWriteOffs && item.allocatedWriteOffs.length > 0 && (
                                        <div className="space-y-1 pt-1 border-t border-slate-200/60">
                                          {item.allocatedWriteOffs.map(({ writeOff: w, allocatedAmountZAR }) => (
                                            <div
                                              key={`woff-${w.id}-${item.month}`}
                                              className="flex items-center justify-between bg-slate-100/90 px-2 py-1 rounded border border-slate-200 text-[11px]"
                                            >
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-semibold text-slate-600">
                                                  {formatDate(w.date)}
                                                </span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 border border-slate-300">
                                                  Written off ({w.reason})
                                                </span>
                                                {allocatedAmountZAR < w.amountZAR && (
                                                  <span className="text-[10px] text-slate-500">
                                                    ({formatZAR(allocatedAmountZAR)} of {formatZAR(w.amountZAR)})
                                                  </span>
                                                )}
                                                {w.notes && (
                                                  <span className="text-[10px] text-slate-400 italic">
                                                    {w.notes}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-slate-600">
                                                  -{formatZAR(allocatedAmountZAR)}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (
                                                      window.confirm(
                                                        `Delete write-off of ${formatZAR(
                                                          w.amountZAR
                                                        )} recorded on ${formatDate(w.date)}? This will restore arrears.`
                                                      )
                                                    ) {
                                                      deleteArrearsWriteOff(property.id, w.id);
                                                      setCopyFeedbackToast('Write-off deleted and arrears restored');
                                                    }
                                                  }}
                                                  className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                                  title="Delete write-off"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Per-month + Add Payment shortcut */}
                                      <div className="flex justify-end pt-0.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            paymentModal.openLogPayment(
                                              property,
                                              item.month,
                                              item.netVariance > 0 ? item.netVariance : item.totalBilled,
                                              activeTenantLease?.id
                                            )
                                          }
                                          className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline text-[10px] cursor-pointer"
                                        >
                                          + Add Payment
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {cardTab[property.id] === 'coc' && (
                          <div className="p-3 bg-white">
                            <ComplianceChecklist
                              certificates={property.cocChecklist}
                              city={property.city}
                              onUpdate={(updated) => updateRental(property.id, { cocChecklist: updated })}
                              compact
                            />
                          </div>
                        )}

                        {cardTab[property.id] === 'vault' && (
                          <div className="p-3 bg-white">
                            <CloudDriveLinkVault
                              vault={property.driveVault}
                              onUpdate={(updated) => updateRental(property.id, { driveVault: updated })}
                              compact
                            />
                          </div>
                        )}
                      </div>

                      {/* 20-Year Long-Term Forecast Accordion */}
                      <div className="border-t border-slate-200 bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleForecastExpansion(property.id)}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors cursor-pointer select-none"
                          aria-expanded={Boolean(expandedForecasts[property.id])}
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            <span>📈 20-Year Long-Term Forecast</span>
                            <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">(5% Growth • 6% Esc.)</span>
                          </span>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <span className="text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5 rounded">
                              {rentalForecastView === 'wealth-only' ? 'Wealth Track' : 'Cashflow Track'}
                            </span>
                            {expandedForecasts[property.id] ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                        </button>

                        {expandedForecasts[property.id] && (
                          <div className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-3">
                            {/* Segmented View Mode Toggle */}
                            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                              <span className="text-[11px] font-semibold text-slate-500">
                                View Preference (Global):
                              </span>
                              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                                <button
                                  type="button"
                                  onClick={() => setRentalForecastView('wealth-only')}
                                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                    rentalForecastView === 'wealth-only'
                                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  title="View Capital Growth & Bond Amortization Track"
                                >
                                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                                  <span>Wealth & Equity</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRentalForecastView('cashflow-only')}
                                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                                    rentalForecastView === 'cashflow-only'
                                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  title="View Annual Rental Escalation & Net Cashflow Trajectory"
                                >
                                  <DollarSign className="w-3 h-3 text-indigo-600" />
                                  <span>Cashflow</span>
                                </button>
                              </div>
                            </div>

                            {/* Chart View */}
                            <div className="overflow-x-hidden">
                              <LongTermProjectionChart
                                data={generateRentalLongTermProjection(property)}
                                compact={true}
                                displayMode={rentalForecastView}
                                showMilestones={true}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer: Maintenance & Actions */}
                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => rentalModals.openMaintenance(property)}
                          className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Maintenance ({property.maintenanceHistory?.length || 0})</span>
                        </button>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => rentalModals.openMeterModal(property.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-md border border-cyan-200 transition-colors cursor-pointer"
                            title="View physical meter readings and log field inspections"
                          >
                            <Gauge className="w-3 h-3 text-cyan-600" />
                            <span>Log Meter</span>
                            {(property.meterReadings?.length || 0) > 0 && (
                              <span className="ml-0.5 px-1.5 py-0.2 bg-cyan-200 text-cyan-900 rounded-full text-[9px] font-black">
                                {property.meterReadings?.length}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => rentalModals.openStatementModal(property.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md border border-teal-200 transition-colors cursor-pointer"
                            title="View tenant utility recovery and month-over-month variance statement"
                          >
                            <FileText className="w-3 h-3 text-teal-600" />
                            <span>Utilities & Statement</span>
                            {(property.utilityStatements?.length || 0) > 0 && (
                              <span className="ml-0.5 px-1.5 py-0.2 bg-teal-200 text-teal-900 rounded-full text-[9px] font-black">
                                {property.utilityStatements?.length}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => rentalModals.openRefinance(property)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200 transition-colors cursor-pointer"
                            title="BRRRR: Refinance and pull out equity into seed capital pool"
                          >
                            <ArrowUpRight className="w-3 h-3 text-purple-600" />
                            <span>Refinance</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => rentalModals.openExit(property)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 transition-colors cursor-pointer"
                            title="Mark rental property as sold"
                          >
                            <Coins className="w-3 h-3 text-emerald-600" />
                            <span>Mark as Sold</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => rentalModals.openEditRental(property)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                            title="Edit property & agency mandate"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove rental "${property.title}"?`)) {
                                deleteRental(property.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete property"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* SOLD & EXITED ARCHIVE VIEW */}
        {viewTab === 'archive' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-600" />
                  <span>Sold & Exited Rental Properties Archive</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical record of disposed rental assets, realized capital gains, and liquid cash recycled into seed capital reserves.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                {soldRentals.length} Disposed Asset(s)
              </span>
            </div>

            {soldRentals.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No sold rentals in archive</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When you dispose of or sell a rental property, click &quot;Mark as Sold&quot; to cancel its bond liability, archive its historical record, and credit your seed capital.
                </p>
                <button
                  type="button"
                  onClick={() => setViewTab('active')}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Go to Active Portfolio</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {soldRentals.map((property) => {
                  const salePrice = property.actualSalePriceZAR || property.marketValueZAR || 0;
                  const purchasePrice = property.purchasePriceZAR || 0;
                  const {
                    grossCapitalGainZAR: grossCapitalGain,
                    capitalGainPercent: gainPercent,
                  } = calculateDisposalMetrics(
                    salePrice,
                    purchasePrice,
                    property.outstandingBondBalanceZAR || 0
                  );

                  return (
                    <div
                      key={property.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <PropertyTypeBadge type={property.propertyType} />
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>SOLD & EXITED</span>
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">{property.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{property.address}, {property.city}</p>
                          </div>
                          {property.soldDate && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                              {formatDate(property.soldDate)}
                            </span>
                          )}
                        </div>

                        {/* Realized Disposal Metrics */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Exit Price</span>
                            <strong className="text-slate-900 font-bold">{formatZAR(salePrice, { compact: true })}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Purchase</span>
                            <strong className="text-slate-700 font-bold">{formatZAR(purchasePrice, { compact: true })}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Gain</span>
                            <strong className={`font-bold ${grossCapitalGain >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {grossCapitalGain >= 0 ? `+${formatPercent(gainPercent)}` : formatPercent(gainPercent)}
                            </strong>
                          </div>
                        </div>

                        <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                              Liquid Cash Released to Seed Capital
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              Credited to Reserve for next purchase
                            </span>
                          </div>
                          <strong className="text-sm font-black text-emerald-900">
                            {formatZAR(property.netCashProceedsZAR || 0)}
                          </strong>
                        </div>

                        {property.exitNotes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700">Disposal Notes: </span>
                            <span>{property.exitNotes}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Bond liability settled & cancelled
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Reopen rental "${property.title}" back to active portfolio? This will revert the credited cash of ${formatZAR(property.netCashProceedsZAR || 0)} from Cash in Reserve.`)) {
                              reopenRental(property.id);
                              setViewTab('active');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reopen Unit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mark Rental as Sold Exit Modal */}
      <ExitSaleModal
        isOpen={rentalModals.isExitOpen}
        property={rentalModals.exitProperty}
        onClose={rentalModals.closeExit}
        onComplete={() => {
          rentalModals.closeExit();
          setViewTab('archive');
        }}
      />

      {/* Refinance & Pull Out Equity (BRRRR) Modal */}
      <RefinanceModal
        isOpen={rentalModals.isRefinanceOpen}
        property={rentalModals.refinanceProperty}
        currentLiquidReserve={summary.liquidCapitalReserve}
        onClose={rentalModals.closeRefinance}
        onSave={(params) => {
          refinanceRental(params);
          rentalModals.setRefinanceSuccessBanner({
            amount: params.cashEquityPulledOutZAR,
            propertyTitle: rentalModals.refinanceProperty?.title || 'Rental Property',
          });
          rentalModals.closeRefinance();
        }}
      />

      {/* Refinance Audit History Modal */}
      <RefinanceAuditModal
        isOpen={rentalModals.isAuditHistoryOpen}
        property={rentalModals.auditProperty}
        onClose={rentalModals.closeAuditHistory}
      />

      {/* Maintenance Log Modal */}
      <MaintenanceModal
        isOpen={rentalModals.isMaintenanceOpen}
        property={rentalModals.maintenanceProperty}
        onClose={rentalModals.closeMaintenance}
      />

      {/* Add / Edit Rental Property Modal */}
      <RentalFormModal
        isOpen={rentalModals.isRentalFormOpen}
        editingProperty={rentalModals.editingProperty}
        onClose={rentalModals.closeRentalForm}
        onSave={(payload, isNew) => {
          if (isNew) {
            const newUnit: RentalProperty = {
              id: `rental-${Date.now()}`,
              title: payload.title || 'New Rental Property',
              address: payload.address || `${payload.city || 'Johannesburg'} Property`,
              city: payload.city || 'Johannesburg',
              propertyType: payload.propertyType || 'Sectional Title Apartment',
              source: payload.source,
              agmDate: payload.agmDate,
              marketValueZAR: payload.marketValueZAR ?? 0,
              purchasePriceZAR: payload.purchasePriceZAR ?? 0,
              purchaseDate: payload.purchaseDate || new Date().toISOString().split('T')[0],
              outstandingBondBalanceZAR: payload.outstandingBondBalanceZAR ?? 0,
              bondInterestRatePercent: payload.bondInterestRatePercent ?? 11.75,
              monthlyBondPaymentZAR: payload.monthlyBondPaymentZAR ?? 0,
              bondPaymentEffectiveDate: payload.bondPaymentEffectiveDate,
              bondRevisionNote: payload.bondRevisionNote,
              leases: payload.leases || [],
              managementType: payload.managementType,
              agencyName: payload.agencyName,
              agencyCommissionPercent: payload.agencyCommissionPercent,
              agencyVatApplicable: payload.agencyVatApplicable,
              agencyContact: payload.agencyContact,
              monthlyGrossRentZAR: payload.monthlyGrossRentZAR ?? 0,
              monthlyLeviesZAR: payload.monthlyLeviesZAR ?? 0,
              monthlyRatesTaxesZAR: payload.monthlyRatesTaxesZAR ?? 0,
              monthlyAgentFeeZAR: payload.monthlyAgentFeeZAR ?? 0,
              monthlyMaintenanceReserveZAR: payload.monthlyMaintenanceReserveZAR ?? 600,
              monthlyCommunalServicesZAR: payload.monthlyCommunalServicesZAR,
              annualBuildingInsuranceZAR: payload.annualBuildingInsuranceZAR,
              paymentRecords: payload.paymentRecords,
              arrearsWriteOffs: payload.arrearsWriteOffs,
              arrearsOpeningBalanceZAR: payload.arrearsOpeningBalanceZAR,
              unpaidUtilityArrearsZAR: payload.unpaidUtilityArrearsZAR,
              maintenanceHistory: payload.maintenanceHistory || [],
              status: payload.status || (payload.leases?.some((l) => l.status === 'Occupied') ? 'Occupied' : 'Vacant'),
              cocChecklist: payload.cocChecklist,
              driveVault: payload.driveVault,
              notes: payload.notes,
              taxEntityTypeOverride: payload.taxEntityTypeOverride,
              section13sexAnnualShieldZAR: payload.section13sexAnnualShieldZAR,
              utilityType: payload.utilityType,
              prepaidVendorName: payload.prepaidVendorName,
              monthlyPrepaidVendingFeeZAR: payload.monthlyPrepaidVendingFeeZAR,
              ancillaryIncomes: payload.ancillaryIncomes,
              meterRegistry: payload.meterRegistry,
              transactions: payload.transactions,
            };
            addRental(newUnit);
          } else if (rentalModals.editingProperty) {
            updateRental(rentalModals.editingProperty.id, payload);
          }
          rentalModals.closeRentalForm();
        }}
      />

      {/* SARB Repo Rate PMT Calculator Modal */}
      <SarbPmtModal
        isOpen={rentalModals.isPmtOpen}
        property={rentalModals.pmtProperty}
        onClose={rentalModals.closePmtCalculator}
      />

      {/* Direct PDF Import Unified Verification Modal */}
      <UnifiedPdfVerificationModal
        isOpen={directPdf.queue.length > 0}
        onClose={directPdf.clearQueue}
        queue={directPdf.queue}
        onOpenTenantStatement={(propertyId: string) => {
          directPdf.clearQueue();
          rentalModals.openStatementModal(propertyId);
        }}
      />

      {/* Floating Processing Toast for Direct PDF Import */}
      {directPdf.isProcessing && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-purple-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
          <div>
            <div className="font-bold">
              {directPdf.parsingProgress
                ? `Analyzing Statement (${directPdf.parsingProgress.current} of ${directPdf.parsingProgress.total})...`
                : 'Analyzing PDF Statement...'}
            </div>
            <div className="text-[10px] text-slate-400">
              {directPdf.parsingProgress
                ? directPdf.parsingProgress.filename
                : 'Running auto-detection for iGrow, CoJ, Eskom, or managing agent'}
            </div>
          </div>
        </div>
      )}

      {/* Historical Tenant Utility Variance & Statement Modal */}
      <TenantStatement
        propertyId={rentalModals.statementPropertyId}
        isOpen={Boolean(rentalModals.statementPropertyId)}
        onClose={rentalModals.closeStatementModal}
        onOpenMeterReadings={() => {
          const currentId = rentalModals.statementPropertyId;
          rentalModals.closeStatementModal();
          if (currentId) {
            rentalModals.openMeterModal(currentId);
          }
        }}
      />

      {/* Physical & Municipal Meter Readings Modal */}
      <MeterReadingsModal
        propertyId={rentalModals.meterPropertyId}
        isOpen={Boolean(rentalModals.meterPropertyId)}
        onClose={rentalModals.closeMeterModal}
      />

      {/* Payment & Write-Off Modals */}
      <PaymentModal
        isOpen={paymentModal.isOpen && Boolean(paymentModal.property)}
        property={paymentModal.property}
        editingPayment={paymentModal.editingPayment}
        initialLeaseId={paymentModal.initialLeaseId}
        initialMonth={paymentModal.initialMonth}
        initialAmount={paymentModal.initialAmount}
        initialAllocations={paymentModal.initialAllocations}
        onClose={paymentModal.closePaymentModal}
        onSave={(payload, editingId) => {
          if (!paymentModal.property) return;
          if (editingId) {
            updateTenantPayment(paymentModal.property.id, editingId, payload);
            setCopyFeedbackToast('Payment updated successfully');
          } else {
            recordTenantPayment(paymentModal.property.id, payload);
            setCopyFeedbackToast('Payment recorded successfully');
          }
          paymentModal.closePaymentModal();
        }}
      />

      <WriteOffModal
        isOpen={writeOffModal.isOpen && Boolean(writeOffModal.property)}
        property={writeOffModal.property}
        initialLeaseId={writeOffModal.initialLeaseId}
        initialAmount={writeOffModal.initialAmount}
        initialAllocations={writeOffModal.initialAllocations}
        onClose={writeOffModal.closeWriteOffModal}
        onSave={(payload) => {
          if (!writeOffModal.property) return;
          recordArrearsWriteOff(writeOffModal.property.id, payload);
          setCopyFeedbackToast(`Written off ${formatZAR(payload.amountZAR)} (${payload.reason})`);
          writeOffModal.closeWriteOffModal();
        }}
      />

      {/* Floating Action / Clipboard Feedback Toast */}
      {copyFeedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/40 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{copyFeedbackToast}</span>
        </div>
      )}
    </div>
  );
}

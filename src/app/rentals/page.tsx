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
import { RentalCard } from '@/components/rentals/RentalCard';
import { RentalSoldCard } from '@/components/rentals/RentalSoldCard';
import { InlineEditableAmount } from '@/components/common/InlineEditableAmount';
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
                {activeRentals.map((property) => (
                  <RentalCard
                    key={property.id}
                    property={property}
                    investorDefaultTaxType={investorProfile?.defaultTaxEntityType}
                    investorProfile={investorProfile}
                    forecastView={rentalForecastView}
                    onForecastViewChange={setRentalForecastView}
                    onOpenEdit={rentalModals.openEditRental}
                    onOpenExit={rentalModals.openExit}
                    onOpenRefinance={rentalModals.openRefinance}
                    onOpenAuditHistory={rentalModals.openAuditHistory}
                    onOpenMaintenance={rentalModals.openMaintenance}
                    onOpenMeterModal={rentalModals.openMeterModal}
                    onOpenStatementModal={rentalModals.openStatementModal}
                    onOpenPmtCalculator={rentalModals.openPmtCalculator}
                    onOpenLogPayment={paymentModal.openLogPayment}
                    onOpenEditPayment={(payment) => paymentModal.openEditPayment(property, payment)}
                    onOpenWriteOff={writeOffModal.openWriteOff}
                    onUpdateOpeningBalance={(propId, amount, leaseId) => updateArrearsOpeningBalance(propId, amount, leaseId)}
                    onDeletePayment={(propId, paymentId) => deleteTenantPayment(propId, paymentId)}
                    onDeleteWriteOff={(propId, writeOffId) => deleteArrearsWriteOff(propId, writeOffId)}
                    onMarkMonthPaid={(propId, month, amountDue, leaseId) => {
                      const prop = rentals.find((p) => p.id === propId);
                      if (!prop) return;
                      if (leaseId) {
                        const lease = (prop.leases || []).find((l) => l.id === leaseId);
                        recordTenantPayment(propId, {
                          periodMonth: month,
                          paymentDate: new Date().toISOString().split('T')[0],
                          amountReceivedZAR: amountDue,
                          paymentMethod: 'EFT',
                          leaseId: lease?.id,
                          reference: `${lease?.unitName || 'Rent'} Paid in Full`,
                          notes: `Paid in full for ${month} (${lease?.tenantName || 'Tenant'})`,
                        });
                        setCopyFeedbackToast(
                          `Marked ${lease?.unitName || 'unit'} as Paid in Full (${formatZAR(amountDue)})`
                        );
                      } else if ((prop.leases || []).length > 0) {
                        let recordedCount = 0;
                        prop.leases.forEach((l) => {
                          const leaseArrears = calculatePropertyArrears(prop, undefined, { leaseId: l.id });
                          if (leaseArrears.currentMonthDueZAR > 0) {
                            recordTenantPayment(propId, {
                              periodMonth: month,
                              paymentDate: new Date().toISOString().split('T')[0],
                              amountReceivedZAR: leaseArrears.currentMonthDueZAR,
                              paymentMethod: 'EFT',
                              leaseId: l.id,
                              reference: `${l.unitName || 'Rent'} Paid in Full`,
                              notes: `Paid in full for ${month} (${l.tenantName})`,
                            });
                            recordedCount++;
                          }
                        });
                        setCopyFeedbackToast(
                          `Marked ${recordedCount} lease(s) as Paid in Full (${formatZAR(amountDue)})`
                        );
                      } else {
                        recordTenantPayment(propId, {
                          periodMonth: month,
                          paymentDate: new Date().toISOString().split('T')[0],
                          amountReceivedZAR: amountDue,
                          paymentMethod: 'EFT',
                          reference: 'Full Rent & Utilities',
                          notes: `Paid in full for ${month}`,
                        });
                        setCopyFeedbackToast(
                          `Marked ${month} as Paid in Full (${formatZAR(amountDue)})`
                        );
                      }
                    }}
                    onShowToast={(msg) => setCopyFeedbackToast(msg)}
                    onDeleteProperty={(propId) => deleteRental(propId)}
                    onUpdateProperty={(propId, updates) => updateRental(propId, updates)}
                  />
                ))}
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
                {soldRentals.map((property) => (
                  <RentalSoldCard
                    key={property.id}
                    property={property}
                    onReopenProperty={(propId) => {
                      reopenRental(propId);
                      setViewTab('active');
                    }}
                  />
                ))}
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

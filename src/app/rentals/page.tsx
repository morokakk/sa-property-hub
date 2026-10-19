'use client';

import React, { useRef, useState } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { useRentalPortfolio, useRentalModalState, usePaymentModal, useWriteOffModal, useDirectPdfUpload } from '@/hooks/rentals';
import { RentalSummaryKpis } from '@/components/rentals/RentalSummaryKpis';
import ActualVsBudgetKpiStrip from '@/components/dashboard/ActualVsBudgetKpiStrip';
import { RentalViewTabs } from '@/components/rentals/RentalViewTabs';
import { RentalCard } from '@/components/rentals/RentalCard';
import { RentalSoldCard } from '@/components/rentals/RentalSoldCard';
import RentalExportDropdown from '@/components/rentals/RentalExportDropdown';
import dynamic from 'next/dynamic';
import type { ValidationErrorItem } from '@/lib/import/excelImport';

const ValidationErrorModal = dynamic(() => import('@/components/common/ValidationErrorModal'), { ssr: false });
const TenantStatement = dynamic(() => import('@/components/rentals/TenantStatement'), { ssr: false });
const MeterReadingsModal = dynamic(() => import('@/components/rentals/MeterReadingsModal'), { ssr: false });
const UnifiedPdfVerificationModal = dynamic(() => import('@/components/rentals/UnifiedPdfVerificationModal'), { ssr: false });
const RentalFormModal = dynamic(() => import('@/components/rentals/modals/RentalFormModal').then((m) => m.RentalFormModal), { ssr: false });
const RefinanceModal = dynamic(() => import('@/components/rentals/modals/RefinanceModal').then((m) => m.RefinanceModal), { ssr: false });
const RefinanceAuditModal = dynamic(() => import('@/components/rentals/modals/RefinanceAuditModal').then((m) => m.RefinanceAuditModal), { ssr: false });
const MaintenanceModal = dynamic(() => import('@/components/rentals/modals/MaintenanceModal').then((m) => m.MaintenanceModal), { ssr: false });
const ExitSaleModal = dynamic(() => import('@/components/rentals/modals/ExitSaleModal').then((m) => m.ExitSaleModal), { ssr: false });
const SarbPmtModal = dynamic(() => import('@/components/rentals/modals/SarbPmtModal').then((m) => m.SarbPmtModal), { ssr: false });
const PaymentModal = dynamic(() => import('@/components/rentals/modals/PaymentModal').then((m) => m.PaymentModal), { ssr: false });
const WriteOffModal = dynamic(() => import('@/components/rentals/modals/WriteOffModal').then((m) => m.WriteOffModal), { ssr: false });
const TenantNoticeModal = dynamic(() => import('@/components/rentals/modals/TenantNoticeModal').then((m) => m.TenantNoticeModal), { ssr: false });
import { Sparkles, PlusCircle, CheckCircle2, Building2, Archive, Loader2, Check, X } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR } from '@/lib/formatters';

export default function RentalPortfolioPage() {
  const { rentals, activeRentals, soldRentals, summary, investorProfile, viewTab, setViewTab, forecastView, setForecastView, feedbackToast, showToast, handleExportCsv, handleExportAccountantJournal, handleExportItr12, handleDeleteProperty, handleReopenProperty, handleMarkMonthPaid, handleAddRental } = useRentalPortfolio();
  const modals = useRentalModalState();
  const paymentModal = usePaymentModal();
  const writeOffModal = useWriteOffModal();
  const directPdf = useDirectPdfUpload(usePortfolioStore((s) => s.aiSettings));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorItem[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const store = usePortfolioStore();
  const bulkAddRentals = usePortfolioStore((s) => s.bulkAddRentals);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    try {
      const { parseImportFile } = await import('@/lib/import/excelImport');
      const result = await parseImportFile<any>(file, 'rentals');
      if (!result.success) {
        setValidationErrors(result.errors);
        setErrorModalOpen(true);
      } else {
        const stats = bulkAddRentals(result.data);
        let msg = `Successfully imported ${stats.addedCount} rental properties!`;
        if (stats.duplicateCount > 0) {
          msg += ` (${stats.duplicateCount} duplicate properties detected)`;
        }
        showToast(msg);
      }
    } catch (err) {
      console.error('Rental import error:', err);
      showToast('Failed to parse import file');
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const { downloadRentalsTemplate } = await import('@/lib/import/excelImport');
      await downloadRentalsTemplate();
      showToast('Downloaded Rental Portfolio template (.xlsx)');
    } catch (err) {
      console.error('Template download error:', err);
      showToast('Failed to generate template workbook');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Rental Portfolio"
        subtitle="Manage active income properties, tenant leases, trust deposits, and maintenance histories"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const f = Array.from(e.target.files || []);
                if (f.length) directPdf.enqueueFiles(f.slice(0, 3));
                e.target.value = '';
              }}
            />
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleExcelUpload}
            />

            {/* 1. Primary CTA: + Add Rental Property (Emerald solid button) */}
            <button
              id="rentals-add-property-btn"
              data-testid="add-rental-btn"
              onClick={modals.openAddRental}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Rental Property</span>
            </button>

            {/* 2. AI Action: Smart Document Import (Indigo subtle button) */}
            <button
              id="rentals-import"
              data-testid="smart-doc-import"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer shrink-0 transition-colors shadow-xs"
              title="Upload utility bills, municipal rates or lease agreements via OCR"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Smart Document Import</span>
            </button>

            {/* 3. Unified Dropdown: Data & Exports */}
            <RentalExportDropdown
              id="rentals-itr12"
              label="Data & Exports"
              onTriggerImport={() => excelInputRef.current?.click()}
              onDownloadTemplate={handleDownloadTemplate}
              onExportCsv={handleExportCsv}
              onExportAccountantJournal={handleExportAccountantJournal}
              onExportItr12={() => handleExportItr12(2026)}
            />
          </div>
        }
      />
      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        <RentalSummaryKpis totalRentalValue={summary.totalRentalValue} totalGrossMonthlyRent={summary.totalGrossMonthlyRent} netMonthlyCashflow={summary.monthlyNetRentalCashflow} totalBondLiabilities={summary.totalBondLiabilities} annualRentalTaxReserve={summary.annualRentalTaxReserve} monthlyRentalTaxReserve={summary.monthlyRentalTaxReserve} activeRentalsCount={activeRentals.length} />
        <ActualVsBudgetKpiStrip rentals={rentals} />
        <RentalViewTabs id="rentals-portfolio" viewTab={viewTab} onTabChange={setViewTab} activeCount={activeRentals.length} archiveCount={soldRentals.length} />
        {viewTab === 'active' ? (
          <>
            {modals.refinanceSuccessBanner && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-purple-700 text-white flex items-center justify-center font-bold">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-purple-950">Equity Pulled Out & Deposited into Seed Capital!</h4>
                    <p className="text-[11px] text-purple-700"><strong>{formatZAR(modals.refinanceSuccessBanner.amount)}</strong> cash equity from {modals.refinanceSuccessBanner.propertyTitle} is now available in your Reserve.</p>
                  </div>
                </div>
                <button onClick={modals.clearRefinanceBanner} className="text-purple-400 hover:text-purple-700 p-1 rounded-md transition-colors" aria-label="Dismiss banner">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {activeRentals.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200"><Building2 className="w-8 h-8 text-slate-400 mx-auto mb-3" /><p className="text-sm font-semibold text-slate-700">No active rental units in portfolio.</p></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeRentals.map((property) => (
                  <RentalCard key={property.id} property={property} investorDefaultTaxType={investorProfile?.defaultTaxEntityType} investorProfile={investorProfile} forecastView={forecastView} onForecastViewChange={setForecastView} onOpenEdit={modals.openEditRental} onOpenExit={modals.openExit} onOpenRefinance={modals.openRefinance} onOpenAuditHistory={modals.openAuditHistory} onOpenMaintenance={modals.openMaintenance} onOpenMeterModal={modals.openMeterModal} onOpenStatementModal={modals.openStatementModal} onOpenPmtCalculator={modals.openPmtCalculator} onOpenNoticeModal={modals.openNoticeModal} onOpenLogPayment={paymentModal.openLogPayment} onOpenEditPayment={(p) => paymentModal.openEditPayment(property, p)} onOpenWriteOff={writeOffModal.openWriteOff} onUpdateOpeningBalance={(id, amt, lId) => store.updateArrearsOpeningBalance(id, amt, lId)} onDeletePayment={(id, pId) => store.deleteTenantPayment(id, pId)} onDeleteWriteOff={(id, wId) => store.deleteArrearsWriteOff(id, wId)} onMarkMonthPaid={handleMarkMonthPaid} onShowToast={showToast} onDeleteProperty={handleDeleteProperty} onUpdateProperty={(id, u) => store.updateRental(id, u)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {soldRentals.length === 0 ? <div className="col-span-full bg-white rounded-xl p-12 text-center border border-slate-200"><Archive className="w-8 h-8 text-slate-400 mx-auto mb-3" /><p className="text-sm font-semibold text-slate-700">No sold rentals in archive.</p></div> : soldRentals.map((property) => <RentalSoldCard key={property.id} property={property} onReopenProperty={handleReopenProperty} />)}
          </div>
        )}
      </main>
      <ExitSaleModal isOpen={modals.isExitOpen} property={modals.exitProperty} onClose={modals.closeExit} onComplete={() => { modals.closeExit(); setViewTab('archive'); }} />
      <RefinanceModal isOpen={modals.isRefinanceOpen} property={modals.refinanceProperty} currentLiquidReserve={summary.liquidCapitalReserve} onClose={modals.closeRefinance} onSave={(p) => { store.refinanceRental(p); modals.setRefinanceSuccessBanner({ amount: p.cashEquityPulledOutZAR, propertyTitle: modals.refinanceProperty?.title || 'Rental Property' }); modals.closeRefinance(); }} />
      <RefinanceAuditModal isOpen={modals.isAuditHistoryOpen} property={modals.auditProperty} onClose={modals.closeAuditHistory} />
      <MaintenanceModal isOpen={modals.isMaintenanceOpen} property={modals.maintenanceProperty} onClose={modals.closeMaintenance} />
      <RentalFormModal isOpen={modals.isRentalFormOpen} editingProperty={modals.editingProperty} onClose={modals.closeRentalForm} onOpenNoticeModal={modals.openNoticeModal} onSave={(p, isNew) => { handleAddRental(p, isNew, modals.editingProperty?.id); modals.closeRentalForm(); }} />
      <SarbPmtModal isOpen={modals.isPmtOpen} property={modals.pmtProperty} onClose={modals.closePmtCalculator} />
      <UnifiedPdfVerificationModal isOpen={directPdf.queue.length > 0} queue={directPdf.queue} onClose={directPdf.clearQueue} onOpenTenantStatement={(id) => { directPdf.clearQueue(); modals.openStatementModal(id); }} />
      <TenantStatement propertyId={modals.statementPropertyId} isOpen={Boolean(modals.statementPropertyId)} onClose={modals.closeStatementModal} onOpenMeterReadings={() => { const id = modals.statementPropertyId; modals.closeStatementModal(); if (id) modals.openMeterModal(id); }} />
      <MeterReadingsModal propertyId={modals.meterPropertyId} isOpen={Boolean(modals.meterPropertyId)} onClose={modals.closeMeterModal} />
      <TenantNoticeModal
        isOpen={modals.isNoticeModalOpen}
        property={modals.noticeProperty}
        initialLeaseId={modals.noticeLeaseId}
        onClose={modals.closeNoticeModal}
        onMarkNotice={(propertyId, leaseId, notice) => {
          store.markTenantNotice(propertyId, leaseId, notice);
          showToast('Notice recorded for tenant');
        }}
        onCancelNotice={(propertyId, leaseId) => {
          store.cancelTenantNotice(propertyId, leaseId);
          showToast('Notice retracted');
        }}
        onFinalizeMoveOut={(propertyId, leaseId, params) => {
          store.finalizeTenantMoveOut(propertyId, leaseId, params);
          showToast(params.action === 'replacement' ? 'Lease archived & replacement tenant assigned' : 'Lease archived & unit set to vacant');
        }}
      />
      <PaymentModal isOpen={paymentModal.isOpen && Boolean(paymentModal.property)} property={paymentModal.property} editingPayment={paymentModal.editingPayment} initialLeaseId={paymentModal.initialLeaseId} initialMonth={paymentModal.initialMonth} initialAmount={paymentModal.initialAmount} initialAllocations={paymentModal.initialAllocations} onClose={paymentModal.closePaymentModal} onSave={(p, eId) => { if (!paymentModal.property) return; if (eId) { store.updateTenantPayment(paymentModal.property.id, eId, p); showToast('Payment updated'); } else { store.recordTenantPayment(paymentModal.property.id, p); showToast('Payment recorded'); } paymentModal.closePaymentModal(); }} />
      <WriteOffModal isOpen={writeOffModal.isOpen && Boolean(writeOffModal.property)} property={writeOffModal.property} initialLeaseId={writeOffModal.initialLeaseId} initialAmount={writeOffModal.initialAmount} initialAllocations={writeOffModal.initialAllocations} onClose={writeOffModal.closeWriteOffModal} onSave={(p) => { if (!writeOffModal.property) return; store.recordArrearsWriteOff(writeOffModal.property.id, p); showToast(`Written off ${formatZAR(p.amountZAR)}`); writeOffModal.closeWriteOffModal(); }} />
      <ValidationErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        fileName={uploadedFileName}
        templateType="rentals"
        errors={validationErrors}
      />
      {directPdf.isProcessing && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-purple-500/30 flex items-center gap-3 animate-in fade-in">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
          <div><div className="font-bold">{directPdf.parsingProgress ? `Analyzing Statement (${directPdf.parsingProgress.current}/${directPdf.parsingProgress.total})...` : 'Analyzing PDF Statement...'}</div><div className="text-[10px] text-slate-400">{directPdf.parsingProgress?.filename || 'Running auto-detection'}</div></div>
        </div>
      )}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/40 flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /><span className="font-semibold">{feedbackToast}</span></div>
      )}
    </div>
  );
}

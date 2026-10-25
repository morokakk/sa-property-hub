'use client';

import React from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { useFlipSelection, useFlipModalManager, useFlipCalculations } from '@/hooks/flips';
import { FlipProjectTabs } from '@/components/flips/FlipProjectTabs';
import { FlipActivePipeline } from '@/components/flips/FlipActivePipeline';
import { FlipSoldArchiveView } from '@/components/flips/FlipSoldArchiveView';
import dynamic from 'next/dynamic';

const FlipProjectModal = dynamic(() => import('@/components/flips/modals/FlipProjectModal').then((m) => m.FlipProjectModal), { ssr: false });
const AddBOQItemModal = dynamic(() => import('@/components/flips/modals/AddBOQItemModal').then((m) => m.AddBOQItemModal), { ssr: false });
const FlipExitModal = dynamic(() => import('@/components/flips/modals/FlipExitModal').then((m) => m.FlipExitModal), { ssr: false });
const FlipToRentalModal = dynamic(() => import('@/components/flips/modals/FlipToRentalModal').then((m) => m.FlipToRentalModal), { ssr: false });
const FlipFundingModal = dynamic(() => import('@/components/flips/modals/FlipFundingModal').then((m) => m.FlipFundingModal), { ssr: false });
const SupplierDirectoryModal = dynamic(() => import('@/components/flips/modals/SupplierDirectoryModal').then((m) => m.SupplierDirectoryModal), { ssr: false });
const DelayMatrixModal = dynamic(() => import('@/components/flips/DelayMatrixModal'), { ssr: false });
import ImportDropdown from '@/components/common/ImportDropdown';
import { PlusCircle, Store } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { exportFlipBOQCSV } from '@/lib/export/csvExport';

export default function FlipsManagerPage() {
  const selection = useFlipSelection();
  const modals = useFlipModalManager();
  const { financials, fundingSummary } = useFlipCalculations(selection.activeFlip);
  const active = selection.activeFlip;

  const [convertedRentalId, setConvertedRentalId] = React.useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Buy-and-Flip Manager"
        subtitle="Dynamic budget tracker, Bill of Quantities (BOQ), and local South African trade suppliers"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => modals.openModal('addFlip')}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs hover:shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ New Flip Project</span>
            </button>
            <button
              onClick={() => modals.openModal('supplier')}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 transition-colors shrink-0 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Supplier Directory</span>
            </button>
            <ImportDropdown
              type="flips"
              label="Import / Export"
              exportCsvLabel="Export BOQ (CSV)"
              onExportCsv={active ? () => exportFlipBOQCSV(active) : undefined}
              onPdfSelected={() => modals.openModal('addFlip')}
            />
          </div>
        }
      />
      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        <FlipProjectTabs
          activeFlips={selection.activeFlips}
          selectedFlipId={selection.selectedFlipId}
          onSelectFlip={selection.setSelectedFlipId}
          activeFlip={active}
        />
        {selection.viewTab === 'active' ? (
          /* Onboarding tour anchors: id="flips-holding-cost" (FlipMetricsCards), id="flips-boq" (FlipBOQTable) */
          <FlipActivePipeline
            activeFlip={active}
            financials={financials}
            fundingSummary={fundingSummary}
            onOpenModal={modals.openModal}
            onUpdatePhase={(phase) => active && usePortfolioStore.getState().updateFlip(active.id, { currentPhase: phase })}
            onUpdateFlip={(u) => active && usePortfolioStore.getState().updateFlip(active.id, u)}
            onUpdateBOQItem={(id, u) => active && usePortfolioStore.getState().updateBOQItem(active.id, id, u)}
            onDeleteBOQItem={(id) => active && usePortfolioStore.getState().deleteBOQItem(active.id, id)}
            onExportBOQCSV={() => active && exportFlipBOQCSV(active)}
            onToggleDrawPhase={(k) => active && usePortfolioStore.getState().updateFlip(active.id, { drawSchedule: { ...active.drawSchedule, [k]: !active.drawSchedule?.[k] } as any })}
            onSyncLedgerToDeal={() => active && usePortfolioStore.getState().updateFlip(active.id, { capitalRaisedZAR: fundingSummary?.totalCapitalSecuredZAR })}
            onSwitchToArchive={() => selection.setViewTab('archive')}
            soldFlipsCount={selection.completedFlips.length}
            copiedWhatsApp={selection.copiedWhatsApp}
            onCopyWhatsApp={selection.copyWhatsAppSummary}
            whatsAppShareUrl={selection.shareViaWhatsAppUrl}
          />
        ) : (
          <FlipSoldArchiveView completedFlips={selection.completedFlips} onReopenFlip={(id) => { usePortfolioStore.getState().reopenFlip(id); selection.setSelectedFlipId(id); selection.setViewTab('active'); }} onSwitchToActive={() => selection.setViewTab('active')} convertedRentalId={convertedRentalId} onClearConvertedRentalBanner={() => setConvertedRentalId(null)} />
        )}
      </main>
      <FlipProjectModal isOpen={modals.isOpen('addFlip') || modals.isOpen('editFlip')} editingFlip={modals.isOpen('editFlip') ? active : null} onClose={modals.closeModal} onSave={(p, isNew) => { if (isNew) { const id = p.id || `flip-${Date.now()}`; usePortfolioStore.getState().addFlip({ ...p, id } as any); selection.setSelectedFlipId(id); } else if (active) { usePortfolioStore.getState().updateFlip(active.id, p); } modals.closeModal(); }} />
      <AddBOQItemModal isOpen={modals.isOpen('addBOQ') && Boolean(active)} flipId={selection.selectedFlipId} onClose={modals.closeModal} />
      {active && (
        <>
          <FlipExitModal isOpen={modals.isOpen('exit')} flip={active} totalCostBasisZAR={financials?.totalCostBasisZAR || active.purchasePriceZAR} onClose={modals.closeModal} onFlipCompleted={() => selection.setViewTab('archive')} />
          <FlipToRentalModal isOpen={modals.isOpen('convert')} flip={active} totalAllInCostZAR={financials?.totalAllInCostZAR || active.purchasePriceZAR} onClose={modals.closeModal} onConverted={({ marketValuationZAR, monthlyGrossRentZAR, numberOfUnits, loanTermYears, tenantName }) => { const created = usePortfolioStore.getState().convertFlipToRental({ flipId: active.id, initialGrossRentZAR: monthlyGrossRentZAR, marketValuationZAR, numberOfUnits, loanTermYears, tenantName }); setConvertedRentalId(created.id); selection.setViewTab('archive'); }} />
          <FlipFundingModal isOpen={modals.isOpen('funding')} flip={active} totalCostBasisZAR={financials?.totalCostBasisZAR || active.purchasePriceZAR} totalCapitalSecuredZAR={fundingSummary?.totalCapitalSecuredZAR || 0} onClose={modals.closeModal} />
          {modals.isOpen('delayMatrix') && <DelayMatrixModal isOpen={modals.isOpen('delayMatrix')} flip={active} totalCostBasisZAR={financials?.totalCostBasisZAR || active.purchasePriceZAR} onClose={modals.closeModal} />}
        </>
      )}
      <SupplierDirectoryModal isOpen={modals.isOpen('supplier')} onClose={modals.closeModal} />
    </div>
  );
}

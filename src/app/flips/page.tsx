'use client';

import React from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { useFlipSelection, useFlipModalManager, useFlipCalculations } from '@/hooks/flips';
import { FlipProjectTabs } from '@/components/flips/FlipProjectTabs';
import { FlipActivePipeline } from '@/components/flips/FlipActivePipeline';
import { FlipSoldArchiveView } from '@/components/flips/FlipSoldArchiveView';
import { FlipProjectModal } from '@/components/flips/modals/FlipProjectModal';
import { AddBOQItemModal } from '@/components/flips/modals/AddBOQItemModal';
import { FlipExitModal } from '@/components/flips/modals/FlipExitModal';
import { FlipToRentalModal } from '@/components/flips/modals/FlipToRentalModal';
import { FlipFundingModal } from '@/components/flips/modals/FlipFundingModal';
import { SupplierDirectoryModal } from '@/components/flips/modals/SupplierDirectoryModal';
import DelayMatrixModal from '@/components/flips/DelayMatrixModal';
import ImportDropdown from '@/components/common/ImportDropdown';
import { PlusCircle, Store } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { exportFlipBOQCSV } from '@/lib/export/csvExport';

export default function FlipsManagerPage() {
  const selection = useFlipSelection();
  const modals = useFlipModalManager();
  const { financials, fundingSummary } = useFlipCalculations(selection.activeFlip);
  const store = usePortfolioStore();
  const active = selection.activeFlip;

  const [convertedRentalId, setConvertedRentalId] = React.useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Buy-and-Flip Manager"
        subtitle="Dynamic budget tracker, Bill of Quantities (BOQ), and local South African trade suppliers"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <ImportDropdown type="flips" onPdfSelected={() => modals.openModal('addFlip')} />
            <button onClick={() => modals.openModal('supplier')} className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 transition-colors shrink-0 cursor-pointer">
              <Store className="w-3.5 h-3.5" /><span>Supplier Directory</span>
            </button>
            <button onClick={() => modals.openModal('addFlip')} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors shrink-0 cursor-pointer">
              <PlusCircle className="w-3.5 h-3.5" /><span>New Flip Project</span>
            </button>
          </div>
        }
      />
      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        <FlipProjectTabs activeFlips={selection.activeFlips} selectedFlipId={selection.selectedFlipId} onSelectFlip={selection.setSelectedFlipId} activeFlip={active} copiedWhatsApp={selection.copiedWhatsApp} onCopyWhatsApp={selection.copyWhatsAppSummary} whatsAppShareUrl={selection.shareViaWhatsAppUrl} />
        {selection.viewTab === 'active' ? (
          /* Onboarding tour anchors: id="flips-holding-cost" (FlipMetricsCards), id="flips-boq" (FlipBOQTable) */
          <FlipActivePipeline
            activeFlip={active} financials={financials} fundingSummary={fundingSummary} onOpenModal={modals.openModal}
            onUpdatePhase={(phase) => active && store.updateFlip(active.id, { currentPhase: phase })}
            onUpdateFlip={(u) => active && store.updateFlip(active.id, u)}
            onUpdateBOQItem={(id, u) => active && store.updateBOQItem(active.id, id, u)}
            onDeleteBOQItem={(id) => active && store.deleteBOQItem(active.id, id)}
            onExportBOQCSV={() => active && exportFlipBOQCSV(active)}
            onToggleDrawPhase={(k) => active && store.updateFlip(active.id, { drawSchedule: { ...active.drawSchedule, [k]: !active.drawSchedule?.[k] } as any })}
            onSyncLedgerToDeal={() => active && store.updateFlip(active.id, { capitalRaisedZAR: fundingSummary?.totalCapitalSecuredZAR })}
            onSwitchToArchive={() => selection.setViewTab('archive')} soldFlipsCount={selection.completedFlips.length}
          />
        ) : (
          <FlipSoldArchiveView completedFlips={selection.completedFlips} onReopenFlip={(id) => { store.reopenFlip(id); selection.setSelectedFlipId(id); selection.setViewTab('active'); }} onSwitchToActive={() => selection.setViewTab('active')} convertedRentalId={convertedRentalId} onClearConvertedRentalBanner={() => setConvertedRentalId(null)} />
        )}
      </main>
      <FlipProjectModal isOpen={modals.isOpen('addFlip') || modals.isOpen('editFlip')} editingFlip={modals.isOpen('editFlip') ? active : null} onClose={modals.closeModal} onSave={(p, isNew) => { if (isNew) { const id = p.id || `flip-${Date.now()}`; store.addFlip({ ...p, id } as any); selection.setSelectedFlipId(id); } else if (active) { store.updateFlip(active.id, p); } modals.closeModal(); }} />
      <AddBOQItemModal isOpen={modals.isOpen('addBOQ') && Boolean(active)} flipId={selection.selectedFlipId} onClose={modals.closeModal} />
      {active && (
        <>
          <FlipExitModal isOpen={modals.isOpen('exit')} flip={active} totalCostBasisZAR={financials?.totalCostBasisZAR || active.purchasePriceZAR} onClose={modals.closeModal} onFlipCompleted={() => selection.setViewTab('archive')} />
          <FlipToRentalModal isOpen={modals.isOpen('convert')} flip={active} totalAllInCostZAR={financials?.totalAllInCostZAR || active.purchasePriceZAR} onClose={modals.closeModal} onConverted={({ marketValuationZAR, monthlyGrossRentZAR, tenantName }) => { const created = store.convertFlipToRental({ flipId: active.id, initialGrossRentZAR: monthlyGrossRentZAR, marketValuationZAR, tenantName }); setConvertedRentalId(created.id); selection.setViewTab('archive'); }} />
          <FlipFundingModal isOpen={modals.isOpen('funding')} flip={active} totalCostBasisZAR={financials?.totalCostBasisZAR || active.purchasePriceZAR} totalCapitalSecuredZAR={fundingSummary?.totalCapitalSecuredZAR || 0} onClose={modals.closeModal} />
          {modals.isOpen('delayMatrix') && <DelayMatrixModal isOpen={modals.isOpen('delayMatrix')} flip={active} totalCostBasisZAR={financials?.totalCostBasisZAR || active.purchasePriceZAR} onClose={modals.closeModal} />}
        </>
      )}
      <SupplierDirectoryModal isOpen={modals.isOpen('supplier')} onClose={modals.closeModal} />
    </div>
  );
}

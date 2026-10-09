'use client';

import React, { useState } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { formatFlipForWhatsApp } from '@/lib/whatsappFormatter';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import { FlipProject, BOQItem, LocalSupplier, PropertyTitleType, CloudDriveVault } from '@/types';
import { PropertyTypeBadge, AgmDateChip } from '@/components/common/PropertyTypeBadge';
import {
  Hammer,
  PlusCircle,
  TrendingUp,
  AlertCircle,
  Building,
  CheckCircle2,
  Trash2,
  BookOpen,
  Phone,
  Store,
  ChevronRight,
  Filter,
  Copy,
  Check,
  Share2,
  Archive,
  RotateCcw,
  Sparkles,
  Coins,
  Edit3,
  FileSpreadsheet,
  FileText,
  ArrowRightLeft,
  Landmark,
  Clock,
  Scale,
  Gift,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { exportFlipBOQCSV } from '@/lib/export/csvExport';
import ImportDropdown from '@/components/common/ImportDropdown';
import { parseRentalPdfStatement } from '@/lib/utilities/pdfParser';
import DelayMatrixModal from '@/components/flips/DelayMatrixModal';
import { FlipExitModal } from '@/components/flips/modals/FlipExitModal';
import { FlipToRentalModal } from '@/components/flips/modals/FlipToRentalModal';
import { AddBOQItemModal } from '@/components/flips/modals/AddBOQItemModal';
import { FlipProjectModal } from '@/components/flips/modals/FlipProjectModal';
import { SupplierDirectoryModal } from '@/components/flips/modals/SupplierDirectoryModal';
import { FlipFundingModal } from '@/components/flips/modals/FlipFundingModal';
import { FlipProjectTabs } from '@/components/flips/FlipProjectTabs';
import { FlipActivePipeline } from '@/components/flips/FlipActivePipeline';
import { FlipSoldArchiveView } from '@/components/flips/FlipSoldArchiveView';

import {
  useFlipSelection,
  useFlipModalManager,
  useFlipCalculations,
  useFlipForm,
  useBoqForm,
  useFundingForm,
  useBrrrrConvertForm,
  useFlipExitForm,
} from '@/hooks/flips';
import {
  calculateFlipFinancials,
  calculateFundingCampaignSummary,
  calculateArchivedFlipFinancials,
  calculateMilestonePhaseTargets,
} from '@/lib/calculations/flips';
import { calculateGrossYield } from '@/lib/calculations/rentals';

export default function FlipsManagerPage() {
  const flips = usePortfolioStore((state) => state.flips);
  const addFlip = usePortfolioStore((state) => state.addFlip);
  const updateFlip = usePortfolioStore((state) => state.updateFlip);
  const deleteFlip = usePortfolioStore((state) => state.deleteFlip);
  const addBOQItem = usePortfolioStore((state) => state.addBOQItem);
  const updateBOQItem = usePortfolioStore((state) => state.updateBOQItem);
  const deleteBOQItem = usePortfolioStore((state) => state.deleteBOQItem);
  const markFlipAsCompleted = usePortfolioStore((state) => state.markFlipAsCompleted);
  const reopenFlip = usePortfolioStore((state) => state.reopenFlip);
  const convertFlipToRental = usePortfolioStore((state) => state.convertFlipToRental);
  const suppliers = usePortfolioStore((state) => state.suppliers);
  const addSupplier = usePortfolioStore((state) => state.addSupplier);
  const deleteSupplier = usePortfolioStore((state) => state.deleteSupplier);
  const funding = usePortfolioStore((state) => state.funding);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const aiSettings = usePortfolioStore((state) => state.aiSettings);

  // Headless Flips Domain Hooks (Phase 4B)
  const flipSelection = useFlipSelection(flips);
  const {
    viewTab,
    setViewTab,
    selectedFlipId,
    setSelectedFlipId,
    activeFlip,
    activeFlips,
    completedFlips,
    copiedWhatsApp,
    copyWhatsAppSummary,
    shareViaWhatsAppUrl,
  } = flipSelection;

  const flipModals = useFlipModalManager();
  const { financials: flipFinancialsCalc, fundingSummary: fundingSummaryCalc, milestoneTargets } = useFlipCalculations(activeFlip, funding);

  const flipForm = useFlipForm(activeFlip);
  const boqForm = useBoqForm();
  const fundingForm = useFundingForm(activeFlip);
  const brrrrConvertForm = useBrrrrConvertForm(
    activeFlip?.targetExitPriceZAR || 0,
    18000
  );
  const flipExitForm = useFlipExitForm(
    activeFlip?.targetExitPriceZAR || 0,
    flipFinancialsCalc?.totalCostBasisZAR || 0
  );

  const [showHoldingBreakdown, setShowHoldingBreakdown] = useState(false);
  const [convertedRentalId, setConvertedRentalId] = useState<string | null>(null);

  // Calculations for active flip (delegated to pure calculations engine via useFlipCalculations)
  const flipFinancials = flipFinancialsCalc ?? calculateFlipFinancials(null);
  const {
    totalBOQBaselineZAR: totalBOQBaseline,
    totalBOQActualZAR: totalBOQActual,
    totalBOQVarianceZAR: totalBOQVariance,
    effectiveRenoCostZAR: effectiveRenoCost,
    flipHoldingMonths,
    flipMonthlyHoldingCostZAR: flipMonthlyHoldingCost,
    totalHoldingCostZAR: totalHoldingCost,
    totalCostBasisZAR: totalCostBasis,
    sec118ArrearsZAR: sec118ArrearsVal,
    advanceCouncilDepositZAR: advanceCouncilDepositVal,
    totalMunicipalClearanceOutlayZAR: totalMunicipalClearanceOutlay,
    rccStatus: rccStatusVal,
    isRccDisputed,
    exitCommissionPercent,
    exitCommissionZAR,
    totalAllInCostZAR: totalAllInCost,
    projectedNetProfitZAR: projectedNetProfit,
    projectedRoiPercent: projectedROI,
    taxEntityType: currentTaxMode,
    effectiveTaxRatePercent: effectiveTaxRate,
    estimatedTaxProvisionZAR: estimatedTaxProvision,
    netProfitAfterTaxZAR: netProfitAfterTax,
    afterTaxRoiPercent: afterTaxROI,
    totalSponsorItemsCount,
    sponsorRetailTotalZAR: sponsorRetailTotal,
    sponsorCashTotalZAR: sponsorCashTotal,
    totalSponsorSavingsZAR: totalSponsorSavings,
    totalRetailBOQZAR: totalRetailBOQ,
    totalActualCashBOQZAR: totalActualCashBOQ,
    milestoneDraws,
    totalRetentionHeldZAR,
  } = flipFinancials;
  const activeFlipBoq = activeFlip?.boq || [];
  const preTaxProfit = projectedNetProfit;
  const currentDrawSchedule = activeFlip?.drawSchedule || {
    depositPaid: false,
    firstFixApproved: false,
    finishesApproved: false,
    retentionReleased: false,
  };

  // Funding Campaign Calculations (delegated via useFlipCalculations)
  const fundingSummary = fundingSummaryCalc ?? calculateFundingCampaignSummary(null, [], 0);
  const {
    fundingRequiredZAR: fundingRequiredVal,
    capitalRaisedZAR: capitalRaisedVal,
    capitalRemainingZAR: capitalRemainingVal,
    fundingProgressPercent,
    totalCapitalSecuredZAR: totalCapitalSecured,
  } = fundingSummary;

  const handleSyncLedgerToDeal = () => {
    if (!activeFlip) return;
    updateFlip(activeFlip.id, {
      capitalRaisedZAR: totalCapitalSecured,
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Buy-and-Flip Manager"
        subtitle="Dynamic budget tracker, Bill of Quantities (BOQ), and local South African trade suppliers"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <ImportDropdown type="flips" onPdfSelected={() => flipModals.openModal("addFlip")} />
            <button
              onClick={() => flipModals.openModal("supplier")}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              Supplier Directory ({suppliers.length})
            </button>
            <button
              onClick={() => {
                flipForm.resetForm(null);
                flipModals.openModal("addFlip");
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Flip Project
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Active vs Sold Archive Tab Toggle */}
        <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl max-w-md">
          <button
            type="button"
            onClick={() => setViewTab('active')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hammer className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Pipeline ({activeFlips.length})</span>
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
            <span>Sold Archive ({completedFlips.length})</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ------------------------------------------------------------- */}
        {/* ACTIVE FLIPS PIPELINE VIEW                                    */}
        {/* ------------------------------------------------------------- */}
        {viewTab === 'active' && (
          <>
            <FlipProjectTabs
              activeFlips={activeFlips}
              selectedFlipId={selectedFlipId}
              onSelectFlip={setSelectedFlipId}
              activeFlip={activeFlip}
              copiedWhatsApp={copiedWhatsApp}
              onCopyWhatsApp={copyWhatsAppSummary}
              whatsAppShareUrl={shareViaWhatsAppUrl}
            />

            {/* Onboarding deep link anchors: id="flips-holding-cost" id="flips-boq" */}
            <FlipActivePipeline
              activeFlip={activeFlip}
              financials={flipFinancialsCalc}
              fundingSummary={fundingSummaryCalc}
              onOpenModal={flipModals.openModal}
              onUpdatePhase={(phase) => activeFlip && updateFlip(activeFlip.id, { currentPhase: phase })}
              onUpdateFlip={(updates) => activeFlip && updateFlip(activeFlip.id, updates)}
              onUpdateBOQItem={(itemId, updates) => activeFlip && updateBOQItem(activeFlip.id, itemId, updates)}
              onDeleteBOQItem={(itemId) => activeFlip && deleteBOQItem(activeFlip.id, itemId)}
              onExportBOQCSV={() => activeFlip && exportFlipBOQCSV(activeFlip)}
              onToggleDrawPhase={(phaseKey) => {
                if (!activeFlip) return;
                const currentDrawSchedule = activeFlip.drawSchedule || {
                  depositPaid: false,
                  firstFixApproved: false,
                  finishesApproved: false,
                  retentionReleased: false,
                };
                updateFlip(activeFlip.id, {
                  drawSchedule: {
                    ...currentDrawSchedule,
                    [phaseKey]: !currentDrawSchedule[phaseKey],
                  },
                });
              }}
              onSyncLedgerToDeal={handleSyncLedgerToDeal}
              onSwitchToArchive={() => setViewTab('archive')}
              soldFlipsCount={completedFlips.length}
            />
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SOLD & COMPLETED ARCHIVE VIEW                                 */}
        {/* ------------------------------------------------------------- */}
        {viewTab === 'archive' && (
          <FlipSoldArchiveView
            completedFlips={completedFlips}
            onReopenFlip={(flipId) => {
              reopenFlip(flipId);
              setSelectedFlipId(flipId);
              setViewTab('active');
            }}
            onSwitchToActive={() => setViewTab('active')}
            convertedRentalId={convertedRentalId}
            onClearConvertedRentalBanner={() => setConvertedRentalId(null)}
          />
        )}
      </main>

      {/* Extracted Flips Modals */}
      <FlipExitModal
        isOpen={flipModals.isOpen('exit') && Boolean(activeFlip)}
        flip={activeFlip}
        totalCostBasisZAR={totalCostBasis}
        onClose={flipModals.closeModal}
        exitSalePrice={flipExitForm.salePrice}
        setExitSalePrice={flipExitForm.setSalePrice}
        exitNetProceeds={flipExitForm.netProceeds}
        setExitNetProceeds={flipExitForm.setNetProceeds}
        exitSoldDate={flipExitForm.soldDate}
        setExitSoldDate={flipExitForm.setSoldDate}
        exitNotes={flipExitForm.exitNotes}
        setExitNotes={flipExitForm.setExitNotes}
        onFlipCompleted={({ actualSalePriceZAR, soldDate, exitNotes }) => {
          if (!activeFlip) return;
          const netProceeds = Math.max(0, actualSalePriceZAR - totalCostBasis);
          markFlipAsCompleted(activeFlip.id, actualSalePriceZAR, netProceeds, soldDate, exitNotes);
          flipModals.closeModal();
          setViewTab('archive');
        }}
      />

      <FlipToRentalModal
        isOpen={flipModals.isOpen('convert') && Boolean(activeFlip)}
        flip={activeFlip}
        totalAllInCostZAR={totalAllInCost}
        totalBOQActual={totalBOQActual}
        totalHoldingCost={totalHoldingCost}
        flipHoldingMonths={flipHoldingMonths}
        convertMarketValue={brrrrConvertForm.marketValuation}
        setConvertMarketValue={brrrrConvertForm.setMarketValuation}
        convertGrossRent={brrrrConvertForm.grossRent}
        setConvertGrossRent={brrrrConvertForm.setGrossRent}
        convertTenantName={brrrrConvertForm.tenantName}
        setConvertTenantName={brrrrConvertForm.setTenantName}
        convertTenantPhone={brrrrConvertForm.tenantPhone}
        setConvertTenantPhone={brrrrConvertForm.setTenantPhone}
        convertTenantEmail={brrrrConvertForm.tenantEmail}
        setConvertTenantEmail={brrrrConvertForm.setTenantEmail}
        convertManagementType={brrrrConvertForm.managementType}
        setConvertManagementType={brrrrConvertForm.setManagementType}
        convertAgencyName={brrrrConvertForm.agencyName}
        setConvertAgencyName={brrrrConvertForm.setAgencyName}
        convertAgencyCommission={brrrrConvertForm.agencyCommission}
        setConvertAgencyCommission={brrrrConvertForm.setAgencyCommission}
        convertNotes={brrrrConvertForm.notes}
        setConvertNotes={brrrrConvertForm.setNotes}
        onClose={flipModals.closeModal}
        onConverted={({ marketValuationZAR, monthlyGrossRentZAR, tenantName }) => {
          if (!activeFlip) return;
          const created = convertFlipToRental({
            flipId: activeFlip.id,
            marketValuationZAR,
            initialGrossRentZAR: monthlyGrossRentZAR,
            tenantName,
          });
          flipModals.closeModal();
          setConvertedRentalId(created.id);
          setViewTab('archive');
        }}
      />

      <AddBOQItemModal
        isOpen={flipModals.isOpen('addBOQ') && Boolean(activeFlip)}
        flipId={activeFlip?.id}
        onClose={flipModals.closeModal}
        boqCategory={boqForm.category}
        setBoqCategory={boqForm.setCategory}
        boqStatus={boqForm.status}
        setBoqStatus={boqForm.setStatus}
        boqDescription={boqForm.description}
        setBoqDescription={boqForm.setDescription}
        boqUnit={boqForm.unit}
        setBoqUnit={boqForm.setUnit}
        boqQuantity={boqForm.quantity}
        setBoqQuantity={boqForm.setQuantity}
        boqBaselineUnitCost={boqForm.baselineUnitCost}
        setBoqBaselineUnitCost={boqForm.setBaselineUnitCost}
        boqMilestonePhase={boqForm.milestonePhase}
        setBoqMilestonePhase={boqForm.setMilestonePhase}
        boqRetentionPercent={boqForm.retentionPercent}
        setBoqRetentionPercent={boqForm.setRetentionPercent}
        boqIsSponsored={boqForm.isSponsored}
        setBoqIsSponsored={boqForm.setIsSponsored}
        boqCommercialRetailValue={boqForm.commercialRetailValue}
        setBoqCommercialRetailValue={boqForm.setCommercialRetailValue}
        boqActualCashOutflow={boqForm.actualCashOutflow}
        setBoqActualCashOutflow={boqForm.setActualCashOutflow}
        boqActualCost={boqForm.actualCost}
        setBoqActualCost={boqForm.setActualCost}
        boqSupplier={boqForm.supplier}
        setBoqSupplier={boqForm.setSupplier}
        onAdd={(item) => {
          if (activeFlip) addBOQItem(activeFlip.id, item);
          boqForm.resetForm();
          flipModals.closeModal();
        }}
      />

      <FlipProjectModal
        isOpen={flipModals.isOpen('addFlip') || flipModals.isOpen('editFlip')}
        editingFlip={flipModals.isOpen('editFlip') ? activeFlip : null}
        onClose={flipModals.closeModal}
        onSave={(payload, isNew) => {
          if (isNew) {
            const createdFlip: FlipProject = {
              id: `flip-${Date.now()}`,
              title: payload.title || 'New Flip Project',
              address: payload.address || `${payload.city || 'Cape Town'} Project`,
              city: payload.city || 'Cape Town',
              propertyType: payload.propertyType || 'Freehold House',
              agmDate: payload.agmDate,
              purchaseDate: new Date().toISOString().split('T')[0],
              purchasePriceZAR: payload.purchasePriceZAR || 0,
              acquisitionCostsZAR: payload.acquisitionCostsZAR || 0,
              baselineRenovationBudgetZAR: payload.baselineRenovationBudgetZAR || 0,
              estimatedDurationMonths: payload.estimatedDurationMonths || 6,
              monthlyHoldingCostZAR: payload.monthlyHoldingCostZAR || 0,
              monthlyBondPaymentZAR: payload.monthlyBondPaymentZAR,
              monthlyLeviesZAR: payload.monthlyLeviesZAR,
              monthlyRatesTaxesZAR: payload.monthlyRatesTaxesZAR,
              monthlyOtherHoldingCostZAR: payload.monthlyOtherHoldingCostZAR,
              targetExitPriceZAR: payload.targetExitPriceZAR || 0,
              exitCommissionPercent: payload.exitCommissionPercent ?? 5.75,
              targetCompletionDate: payload.targetCompletionDate || '',
              currentPhase: 'Acquisition & Conveyancing',
              boq: [],
              linkedFundingIds: [],
              status: 'Active',
              taxEntityType: payload.taxEntityType || investorProfile?.defaultTaxEntityType || 'Company (27%)',
              municipalClearance: payload.municipalClearance,
              driveVault: payload.driveVault,
              municipalValuationZAR: payload.municipalValuationZAR,
            };
            addFlip(createdFlip);
            setSelectedFlipId(createdFlip.id);
          } else if (activeFlip) {
            updateFlip(activeFlip.id, payload);
          }
          flipModals.closeModal();
        }}
      />

      <SupplierDirectoryModal
        isOpen={flipModals.isOpen('supplier')}
        onClose={flipModals.closeModal}
      />

      <FlipFundingModal
        isOpen={flipModals.isOpen('funding') && Boolean(activeFlip)}
        flip={activeFlip}
        totalCostBasisZAR={totalCostBasis}
        totalCapitalSecuredZAR={totalCapitalSecured}
        onClose={flipModals.closeModal}
        fundingRequired={fundingForm.fundingRequired}
        setFundingRequired={fundingForm.setFundingRequired}
        capitalRaised={fundingForm.capitalRaised}
        setCapitalRaised={fundingForm.setCapitalRaised}
        primaryFunderName={fundingForm.primaryFunderName}
        setPrimaryFunderName={fundingForm.setPrimaryFunderName}
        primaryFunderContact={fundingForm.primaryFunderContact}
        setPrimaryFunderContact={fundingForm.setPrimaryFunderContact}
        primaryFunderType={fundingForm.primaryFunderType}
        setPrimaryFunderType={fundingForm.setPrimaryFunderType}
        coFundersNotes={fundingForm.coFundersNotes}
        setCoFundersNotes={fundingForm.setCoFundersNotes}
        promisedReturnType={fundingForm.promisedReturnType}
        setPromisedReturnType={fundingForm.setPromisedReturnType}
        promisedReturnRatePercent={fundingForm.promisedReturnRatePercent}
        setPromisedReturnRatePercent={fundingForm.setPromisedReturnRatePercent}
        promisedPayoutSchedule={fundingForm.promisedPayoutSchedule}
        setPromisedPayoutSchedule={fundingForm.setPromisedPayoutSchedule}
        securityOffered={fundingForm.securityOffered}
        setSecurityOffered={fundingForm.setSecurityOffered}
        onSave={(campaign) => {
          if (activeFlip) {
            updateFlip(activeFlip.id, campaign);
          }
          flipModals.closeModal();
        }}
      />

      {/* Delay Sensitivity Matrix Modal (Requirement 2) */}
      {activeFlip && flipModals.isOpen('delayMatrix') && (
        <DelayMatrixModal
          key={activeFlip.id}
          isOpen={flipModals.isOpen('delayMatrix')}
          onClose={flipModals.closeModal}
          flip={activeFlip}
          totalCostBasisZAR={totalCostBasis}
        />
      )}

      </div>
  );
}

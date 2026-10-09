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
        {/* ACTIVE FLIPS PIPELINE VIEW                                    */}
        {/* ------------------------------------------------------------- */}
        {viewTab === 'active' && (
          <>
            {/* Flip Project Selector Tabs */}
            <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-slate-200 gap-3">
              <div className="flex items-center gap-2">
                {activeFlips.map((flip) => (
                  <button
                    key={flip.id}
                    onClick={() => setSelectedFlipId(flip.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeFlip?.id === flip.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>{flip.title}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {flip.city}
                    </span>
                  </button>
                ))}
              </div>

              {activeFlip && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={copyWhatsAppSummary}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Copy WhatsApp syndicate update to clipboard"
                  >
                    {copiedWhatsApp ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedWhatsApp ? 'Copied WhatsApp!' : 'Copy WhatsApp Summary'}</span>
                  </button>

                  <a
                    href={shareViaWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-emerald-700 hover:bg-emerald-100 bg-emerald-50 rounded-lg border border-emerald-300 transition-colors"
                    title="Share directly via WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </a>

                  <Link
                    href={`/proposal?dealId=${activeFlip.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <span>Pitch Deck</span> <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {activeFlip ? (
              <>
                {/* Active Flip Header Banner */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <PropertyTypeBadge type={activeFlip.propertyType} />
                      <AgmDateChip agmDate={activeFlip.agmDate} />
                      
                      {/* Interactive Phase Selector */}
                      <select
                        value={activeFlip.currentPhase}
                        onChange={(e) => updateFlip(activeFlip.id, { currentPhase: e.target.value as FlipProject['currentPhase'] })}
                        className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full cursor-pointer hover:bg-emerald-100 transition-colors"
                        title="Change current project phase"
                      >
                        <option value="Acquisition & Conveyancing">Acquisition & Conveyancing</option>
                        <option value="Strip & Demolition">Strip & Demolition</option>
                        <option value="First Fix (Plumbing/Elec)">First Fix (Plumbing/Elec)</option>
                        <option value="Finishes & Tiling">Finishes & Tiling</option>
                        <option value="Snagging">Snagging</option>
                        <option value="Staging & Marketing">Staging & Marketing</option>
                        <option value="Sold / Awaiting Transfer">Sold / Awaiting Transfer</option>
                      </select>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">{activeFlip.title}</h2>
                    <p className="text-xs text-slate-500">{activeFlip.address}, {activeFlip.city}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500 text-left md:text-right hidden sm:block">
                      <span className="block text-[10px] text-slate-400">Target Completion</span>
                      <span className="font-semibold text-slate-800">{formatDate(activeFlip.targetCompletionDate)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeFlip) flipForm.resetForm(activeFlip);
                        flipModals.openModal("editFlip");
                      }}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-2 rounded-lg border border-slate-300 shadow-2xs transition-all cursor-pointer"
                      title="Edit project duration, holding costs, budget & exit targets"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit Flip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        flipExitForm.resetForm(activeFlip?.targetExitPriceZAR || 0, flipFinancialsCalc?.totalCostBasisZAR || 0);
                        flipModals.openModal('exit');
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                      title="Record realized sale price and move to sold archive"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Mark as Flipped / Sold</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        brrrrConvertForm.resetForm(activeFlip?.targetExitPriceZAR || totalAllInCost || 0, 18000);
                        flipModals.openModal("convert");
                      }}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
                      title="Convert this flip project to a long-term rental property under BRRRR strategy"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-indigo-200" />
                      <span>Convert to Rental</span>
                    </button>
                  </div>
                </div>

                {/* Active Flip Overview & Financial Health Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Purchase & Costs</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {formatZAR(activeFlip.purchasePriceZAR + activeFlip.acquisitionCostsZAR + totalMunicipalClearanceOutlay)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate" title={`Legal/Duty: ${formatZAR(activeFlip.acquisitionCostsZAR)}${totalMunicipalClearanceOutlay > 0 ? ` • Sec 118: ${formatZAR(totalMunicipalClearanceOutlay)}` : ''}`}>
                      Legal: {formatZAR(activeFlip.acquisitionCostsZAR)}{totalMunicipalClearanceOutlay > 0 ? ` • Sec 118: ${formatZAR(totalMunicipalClearanceOutlay)}` : ''}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">BOQ Renovation Spend</span>
                    <div className="text-xl font-bold text-indigo-700 mt-1">
                      {formatZAR(totalBOQActual)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Budget: {formatZAR(activeFlip.baselineRenovationBudgetZAR)}
                    </div>
                  </div>

                  {/* Total Holding Carrying Cost Card (Expandable Itemization) */}
                  <div id="flips-holding-cost" className="scroll-mt-20 bg-white p-4 rounded-xl border border-amber-200/90 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Holding Cost</span>
                        <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                          {flipHoldingMonths} Mos
                        </span>
                      </div>
                      <div className="text-xl font-bold text-amber-700 mt-1">
                        - {formatZAR(totalHoldingCost)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5" title={`${formatZAR(flipMonthlyHoldingCost)}/mo carrying burn`}>
                        {formatZAR(flipMonthlyHoldingCost)}/mo carrying burn
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-amber-100 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowHoldingBreakdown((prev) => !prev)}
                        className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 flex items-center justify-between w-full cursor-pointer transition-colors"
                      >
                        <span>{showHoldingBreakdown ? '▲ Hide Breakdown' : '▼ Itemized Breakdown'}</span>
                        <span className="text-[9px] text-slate-400">Monthly</span>
                      </button>

                      {showHoldingBreakdown && (
                        <div className="mt-1 space-y-1 text-[10px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200/80 animate-in fade-in duration-150">
                          <div className="flex justify-between">
                            <span>Interim Bond:</span>
                            <strong className="text-slate-800 font-semibold">{formatZAR(activeFlip.monthlyBondPaymentZAR || 0)}/m</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>{activeFlip.propertyType === 'Freehold House' ? 'Levies (N/A):' : 'Body Corporate / HOA:'}</span>
                            <strong className="text-slate-800 font-semibold">{activeFlip.propertyType === 'Freehold House' ? 'R 0 (Freehold)' : `${formatZAR(activeFlip.monthlyLeviesZAR || 0)}/m`}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Rates & Taxes:</span>
                            <strong className="text-slate-800 font-semibold">{formatZAR(activeFlip.monthlyRatesTaxesZAR || 0)}/m</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Security & Other:</span>
                            <strong className="text-slate-800 font-semibold">{formatZAR(activeFlip.monthlyOtherHoldingCostZAR || 0)}/m</strong>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => flipModals.openModal("delayMatrix")}
                        className="w-full py-1.5 px-2 bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 font-bold text-[10px] rounded-lg border border-amber-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Simulate Council / Transfer Delay Matrix (+30, +60, +90, +120 Days)"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-800" />
                        <span>Simulate Delay Matrix (+30–120d)</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Budget Variance</span>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        totalBOQVariance <= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {totalBOQVariance > 0 ? `+${formatZAR(totalBOQVariance)}` : formatZAR(totalBOQVariance)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {totalBOQVariance <= 0 ? 'On or under budget' : 'Over budget'}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Target Exit Valuation</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {formatZAR(activeFlip.targetExitPriceZAR)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Target: {formatDate(activeFlip.targetCompletionDate)}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-4 rounded-xl shadow-sm">
                    <span className="text-[11px] font-semibold text-emerald-200 uppercase">Projected Net Upside</span>
                    <div className="text-xl font-extrabold text-white mt-1">
                      {effectiveTaxRate > 0 ? formatZAR(netProfitAfterTax) : formatZAR(projectedNetProfit)}
                    </div>
                    <div className="text-[11px] text-emerald-200 mt-0.5 font-bold flex items-center justify-between">
                      <span>{effectiveTaxRate > 0 ? formatPercent(afterTaxROI) : formatPercent(projectedROI)} {effectiveTaxRate > 0 ? 'After-Tax ROI' : 'Net ROI'}</span>
                      <span className="text-[9px] text-emerald-300 opacity-90 font-medium">
                        {effectiveTaxRate > 0 ? `${effectiveTaxRate}% Tax Deducted` : 'Pre-Tax Margin'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operational Math & Entity Tax Banner (Requirements 5 & 6) */}
                <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-3.5 px-4 space-y-2.5 text-xs shadow-2xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap text-slate-700">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Operational Math:</span>
                      </span>
                      <span>Exit {formatZAR(activeFlip.targetExitPriceZAR)}</span>
                      <span className="text-slate-400">−</span>
                      <span>Acquisition ({formatZAR(activeFlip.purchasePriceZAR + activeFlip.acquisitionCostsZAR)})</span>
                      <span className="text-slate-400">−</span>
                      <span>BOQ Spend ({formatZAR(totalBOQActual)})</span>
                      {totalMunicipalClearanceOutlay > 0 && (
                        <>
                          <span className="text-slate-400">−</span>
                          <span className="font-semibold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">
                            Sec 118 Clearance ({formatZAR(totalMunicipalClearanceOutlay)})
                          </span>
                        </>
                      )}
                      <span className="text-slate-400">−</span>
                      <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                        Holding ({flipHoldingMonths} mos × {formatZAR(flipMonthlyHoldingCost)}/mo = {formatZAR(totalHoldingCost)})
                      </span>
                      {exitCommissionZAR > 0 && (
                        <>
                          <span className="text-slate-400">−</span>
                          <span className="font-semibold text-rose-900 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded">
                            Exit Comm {exitCommissionPercent}% ({formatZAR(exitCommissionZAR)})
                          </span>
                        </>
                      )}
                    </div>

                    {/* Entity Tax Toggle (Pre-Tax / 27% Company / 45% Individual) */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Entity Tax:</span>
                      {(['Company (27%)', 'Individual (45%)', 'Pre-Tax'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => updateFlip(activeFlip.id, { taxEntityType: mode })}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            currentTaxMode === mode
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          {mode === 'Company (27%)' ? 'Company (27%)' : mode === 'Individual (45%)' ? 'Individual (45%)' : 'Pre-Tax'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-amber-200/60 gap-2">
                    {/* Sponsor / Barter Summary pill */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      {totalSponsorItemsCount > 0 ? (
                        <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-lg font-semibold">
                          <Gift className="w-3.5 h-3.5 text-purple-600" />
                          <span>Commercial Retail Value: <strong>{formatZAR(totalRetailBOQ)}</strong></span>
                          <span>•</span>
                          <span>Cash Outlay: <strong>{formatZAR(totalActualCashBOQ)}</strong></span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">Saved {formatZAR(totalSponsorSavings)} ({totalRetailBOQ > 0 ? ((totalSponsorSavings / totalRetailBOQ) * 100).toFixed(0) : 0}%)</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px]">
                          Pre-Tax Operational Profit: <strong>{formatZAR(preTaxProfit)}</strong> ({formatPercent(projectedROI)} Pre-Tax ROI)
                        </span>
                      )}
                    </div>

                    {/* Pre-Tax vs Post-Tax Result */}
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      {effectiveTaxRate > 0 ? (
                        <>
                          <div className="text-[11px] text-slate-500">
                            <span>Pre-Tax: <strong>{formatZAR(preTaxProfit)}</strong></span>
                            <span className="text-rose-600 font-medium ml-1.5">(-{formatZAR(estimatedTaxProvision)} tax)</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium mr-1.5 text-xs">= Net Cash After {effectiveTaxRate}% Tax:</span>
                            <strong className="text-emerald-700 font-black text-sm">{formatZAR(netProfitAfterTax)}</strong>
                            <span className="ml-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                              {formatPercent(afterTaxROI)} After-Tax
                            </span>
                          </div>
                        </>
                      ) : (
                        <div>
                          <span className="text-slate-500 font-medium mr-1.5 text-xs">= Pre-Tax Net Profit:</span>
                          <strong className="text-emerald-700 font-black text-sm">{formatZAR(projectedNetProfit)}</strong>
                          <span className="ml-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            {formatPercent(projectedROI)} Pre-Tax
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Funding Campaign & Investor Returns Section */}
                <div className="bg-slate-900 text-white rounded-xl shadow-xs border border-slate-800 overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">
                            Funding Campaign & Capital Progress
                          </h3>
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-semibold border border-slate-700">
                            {fundingProgressPercent}% Raised
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Track target facility, capital secured to date, lead funder, and promised return structure
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={handleSyncLedgerToDeal}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Sync 'Capital Raised' with active linked ledger tranches"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sync from Ledger</span>
                      </button>
                      <button
                        onClick={() => {
                          fundingForm.resetForm(activeFlip);
                          flipModals.openModal("funding");
                        }}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Edit Funding Terms
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Funding Required</span>
                        <div className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                          {formatZAR(fundingRequiredVal)}
                        </div>
                        <span className="text-[9px] text-slate-400">Target raise facility</span>
                      </div>

                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block">Capital Raised</span>
                        <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5">
                          {formatZAR(capitalRaisedVal)}
                        </div>
                        <span className="text-[9px] text-slate-400">Managed to raise</span>
                      </div>

                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">Remaining Required</span>
                        <div className="text-base sm:text-lg font-extrabold text-amber-400 mt-0.5">
                          {formatZAR(capitalRemainingVal)}
                        </div>
                        <span className="text-[9px] text-slate-400">
                          {capitalRemainingVal === 0 ? 'Fully funded! 🎉' : 'Still to secure'}
                        </span>
                      </div>

                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Cost Basis Drawn</span>
                        <div className="text-base sm:text-lg font-extrabold text-slate-200 mt-0.5">
                          {formatZAR(totalCostBasis)}
                        </div>
                        <span className="text-[9px] text-slate-400">Purchase + legal + spend</span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-300 text-[11px]">Fundraising Progress</span>
                        <span className="font-extrabold text-emerald-400 text-xs">
                          {formatZAR(capitalRaisedVal)} / {formatZAR(fundingRequiredVal)} ({fundingProgressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            fundingProgressPercent >= 100
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-emerald-600 to-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, fundingProgressPercent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Primary Funder & Promised Terms Detailed Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Primary Funder / Syndicate Lead
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                            {activeFlip.primaryFunderType || 'Private Lender'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-white">
                          {activeFlip.primaryFunderName || 'No Lead Funder Assigned'}
                        </div>
                        {activeFlip.primaryFunderContact && (
                          <div className="text-[11px] text-slate-400">
                            {activeFlip.primaryFunderContact}
                          </div>
                        )}
                        {activeFlip.coFundersNotes && (
                          <div className="text-[10px] text-indigo-300 italic pt-0.5">
                            Co-funders: {activeFlip.coFundersNotes}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Promised Return & Collateral
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                            {activeFlip.promisedReturnType || 'Fixed Interest'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-emerald-400">
                          {activeFlip.promisedReturnRatePercent ?? 14}%{' '}
                          {activeFlip.promisedReturnType === 'Fixed Interest'
                            ? 'p.a. Fixed Interest'
                            : activeFlip.promisedReturnType === 'Equity Profit Split'
                            ? 'Net Flip Profit Split'
                            : activeFlip.promisedReturnType || 'Fixed Interest'}
                        </div>
                        <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-x-2">
                          <span>Payout: {activeFlip.promisedPayoutSchedule || 'Monthly Interest'}</span>
                          <span>•</span>
                          <span className="text-slate-400">{activeFlip.securityOffered || '2nd Mortgage Bond registered'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 118 Rates Clearance Certificate (RCC) & Municipal Arrears Card (Requirement 3) */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            Section 118 Municipal Rates Clearance (RCC) & Arrears Tracker
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            rccStatusVal === 'Certificate Issued'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : rccStatusVal === 'Disputed'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : rccStatusVal === 'Paid & Awaiting Certificate'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {rccStatusVal}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Municipal Systems Act Section 118(1) 2-year clearance, advance rates deposit & Deeds Registry clearance
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={rccStatusVal}
                        onChange={(e) =>
                          updateFlip(activeFlip.id, {
                            municipalClearance: {
                              sec118ArrearsZAR: sec118ArrearsVal,
                              advanceCouncilDepositZAR: advanceCouncilDepositVal,
                              rccStatus: e.target.value as NonNullable<FlipProject['municipalClearance']>['rccStatus'],
                              rccApplicationDate: activeFlip.municipalClearance?.rccApplicationDate,
                              disputeNotes: activeFlip.municipalClearance?.disputeNotes,
                            },
                          })
                        }
                        className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer text-slate-800 shadow-2xs"
                      >
                        <option value="Pending Application">Pending Application</option>
                        <option value="Figures Issued">Figures Issued</option>
                        <option value="Paid & Awaiting Certificate">Paid & Awaiting Certificate</option>
                        <option value="Disputed">Disputed (CoJ Billing Error)</option>
                        <option value="Certificate Issued">Certificate Issued (Clear for Transfer)</option>
                      </select>
                    </div>
                  </div>

                  {/* Arrears and Advance Deposit Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Section 118(1) 2-Yr Arrears</span>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {formatZAR(sec118ArrearsVal)}
                      </div>
                      <span className="text-[9px] text-slate-400">Statutory municipal historical debt</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Advance Council Deposit</span>
                      <div className="text-base font-extrabold text-blue-700 mt-0.5">
                        {formatZAR(advanceCouncilDepositVal)}
                      </div>
                      <span className="text-[9px] text-slate-400">4–6 months rates required upfront</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total RCC Cash Outlay</span>
                      <div className="text-base font-extrabold text-slate-900 mt-0.5">
                        {formatZAR(totalMunicipalClearanceOutlay)}
                      </div>
                      <span className="text-[9px] text-slate-400">Total payable for clearance certificate</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">RCC Application Date</span>
                      <div className="text-base font-extrabold text-slate-800 mt-0.5">
                        {activeFlip.municipalClearance?.rccApplicationDate || 'Not Lodged'}
                      </div>
                      <span className="text-[9px] text-slate-400">Conveyancer lodgement date</span>
                    </div>
                  </div>

                  {/* Dispute & Holding Burn Warning */}
                  {isRccDisputed && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2 text-rose-900">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">CoJ Municipal Rates Dispute Active:</span>
                          <p className="text-[11px] text-rose-800 mt-0.5">
                            Municipal figures are disputed. Property transfer is halted while carrying costs burn at <strong>{formatZAR(flipMonthlyHoldingCost)}/month</strong>.
                            {activeFlip.municipalClearance?.disputeNotes && (
                              <span className="block mt-1 italic text-rose-900">Notes: {activeFlip.municipalClearance.disputeNotes}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => flipModals.openModal("delayMatrix")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs shrink-0 shadow-2xs cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Simulate Dispute Delay (+30–120d)</span>
                      </button>
                    </div>
                  )}

                  {!isRccDisputed && rccStatusVal === 'Pending Application' && (
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Conveyancer awaiting City of Johannesburg rates clearance figures. Council turnaround standard is 14 to 30 days.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => flipModals.openModal("delayMatrix")}
                        className="text-amber-900 hover:text-amber-950 font-bold underline cursor-pointer shrink-0 text-[10px]"
                      >
                        Check Delay Exposure →
                      </button>
                    </div>
                  )}
                </div>

                {/* SA Statutory Compliance (CoC) (Requirement 4: Auto-adapts by City) */}
                <ComplianceChecklist
                  key={activeFlip.id}
                  certificates={activeFlip.cocChecklist}
                  city={activeFlip.city}
                  onUpdate={(updated) => updateFlip(activeFlip.id, { cocChecklist: updated })}
                />

                {/* Cloud & Web Document Vault */}
                <CloudDriveLinkVault
                  vault={activeFlip.driveVault}
                  onUpdate={(updated) => updateFlip(activeFlip.id, { driveVault: updated })}
                />

                {/* Contractor Milestone Drawdown & Retention Schedule (Requirement 1) */}
                <div id="flips-drawdown" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Hammer className="w-4 h-4 text-emerald-600" />
                        <span>Contractor Milestone Drawdown & Retention Schedule</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Phase-gated progress payments structured to eliminate contractor abandonment risk (Flipping Johannesburg operator model).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                          {currentDrawSchedule.retentionReleased ? 'Total Retention Pool' : 'Total Retention Pool Held'}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                          currentDrawSchedule.retentionReleased
                            ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                            : 'text-amber-800 bg-amber-50 border-amber-200'
                        }`}>
                          {formatZAR(totalRetentionHeldZAR)} {currentDrawSchedule.retentionReleased ? '✓ Released' : 'Held (20%)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Phase Draw Gates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Gate 1: Deposit (20%) */}
                    <div className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      currentDrawSchedule.depositPaid
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-wide">Phase 1: Deposit</span>
                          <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            20% Target
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Mobilization, prep & materials deposit</p>
                        <div className="text-base font-extrabold text-slate-900">
                          {formatZAR(milestoneDraws.deposit || milestoneTargets.deposit)}
                        </div>
                        <span className="text-[10px] text-slate-400">Target: {formatZAR(milestoneTargets.deposit)}</span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={currentDrawSchedule.depositPaid}
                            onChange={(e) =>
                              updateFlip(activeFlip.id, {
                                drawSchedule: {
                                  ...currentDrawSchedule,
                                  depositPaid: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentDrawSchedule.depositPaid ? '✓ Deposit Paid' : 'Mark Deposit Paid'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Gate 2: First Fix / Wet Works (30%) */}
                    <div className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      currentDrawSchedule.firstFixApproved
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-wide">Phase 2: First Fix</span>
                          <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            30% Target
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Plumbing rough-in, electrical conduit & wet works</p>
                        <div className="text-base font-extrabold text-slate-900">
                          {formatZAR(milestoneDraws.firstFix || milestoneTargets.firstFix)}
                        </div>
                        <span className="text-[10px] text-slate-400">Target: {formatZAR(milestoneTargets.firstFix)}</span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={currentDrawSchedule.firstFixApproved}
                            onChange={(e) =>
                              updateFlip(activeFlip.id, {
                                drawSchedule: {
                                  ...currentDrawSchedule,
                                  firstFixApproved: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentDrawSchedule.firstFixApproved ? '✓ Inspected & Approved' : 'Sign Off First Fix'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Gate 3: Finishes & Tiling (30%) */}
                    <div className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      currentDrawSchedule.finishesApproved
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-wide">Phase 3: Finishes</span>
                          <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            30% Target
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Tiling, joinery, sanitaryware, ceilings & paint</p>
                        <div className="text-base font-extrabold text-slate-900">
                          {formatZAR(milestoneDraws.finishes || milestoneTargets.finishes)}
                        </div>
                        <span className="text-[10px] text-slate-400">Target: {formatZAR(milestoneTargets.finishes)}</span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={currentDrawSchedule.finishesApproved}
                            onChange={(e) =>
                              updateFlip(activeFlip.id, {
                                drawSchedule: {
                                  ...currentDrawSchedule,
                                  finishesApproved: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentDrawSchedule.finishesApproved ? '✓ Finishes Approved' : 'Sign Off Finishes'}</span>
                        </label>
                      </div>
                    </div>

                    {/* Gate 4: Practical Completion & Retention (20%) */}
                    <div className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      currentDrawSchedule.retentionReleased
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-amber-50/60 border-amber-200 text-amber-950'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs uppercase tracking-wide">Phase 4: Retention</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                            20% Snag Gate
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">Snag list completion, CoC delivery & handover</p>
                        <div className="text-base font-extrabold text-amber-900">
                          {formatZAR(milestoneDraws.retention || milestoneTargets.retention)}
                        </div>
                        <span className="text-[10px] text-amber-800 font-semibold">Withheld until 100% snag-free</span>
                      </div>

                      <div className="pt-3 mt-3 border-t border-amber-200/60">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                          <input
                            type="checkbox"
                            checked={currentDrawSchedule.retentionReleased}
                            onChange={(e) =>
                              updateFlip(activeFlip.id, {
                                drawSchedule: {
                                  ...currentDrawSchedule,
                                  retentionReleased: e.target.checked,
                                },
                              })
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentDrawSchedule.retentionReleased ? '✓ Retention Released' : 'Release Retention'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bill of Quantities (BOQ) Table */}
                <div id="flips-boq" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Bill of Quantities (BOQ)</span>
                        <span className="text-xs font-medium text-slate-500">
                          ({activeFlip.boq.length} Line Items)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Baseline estimates vs. actual contractor & supplier invoices with phase milestones and sponsor barter tracking.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeFlip.boq && activeFlip.boq.length > 0 && (
                        <button
                          onClick={() => exportFlipBOQCSV(activeFlip)}
                          title="Download Bill of Quantities as CSV"
                          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Export BOQ (CSV)</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          boqForm.resetForm();
                          flipModals.openModal("addBOQ");
                        }}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add BOQ Item
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                          <th className="p-3.5 pl-5">Trade Category</th>
                          <th className="p-3.5">Draw Phase</th>
                          <th className="p-3.5">Scope / Item Description</th>
                          <th className="p-3.5">Unit / Qty</th>
                          <th className="p-3.5">Baseline (ZAR)</th>
                          <th className="p-3.5">Actual (ZAR)</th>
                          <th className="p-3.5">Variance</th>
                          <th className="p-3.5">Supplier / Contractor</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 pr-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {activeFlip.boq.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3.5 pl-5 font-semibold text-slate-900">
                              {item.category}
                            </td>
                            <td className="p-3.5">
                              <select
                                value={item.milestonePhase || 'First Fix / Wet Works'}
                                onChange={(e) =>
                                  updateBOQItem(activeFlip.id, item.id, {
                                    milestonePhase: e.target.value as NonNullable<BOQItem['milestonePhase']>,
                                  })
                                }
                                className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-200 cursor-pointer bg-slate-50 text-slate-700 hover:bg-white shadow-2xs block"
                                title="Change milestone draw phase"
                              >
                                <option value="Deposit">Phase 1: Deposit (20%)</option>
                                <option value="First Fix / Wet Works">Phase 2: First Fix (30%)</option>
                                <option value="Finishes">Phase 3: Finishes (30%)</option>
                                <option value="Retention">Phase 4: Retention (20%)</option>
                              </select>
                              {item.retentionPercent && item.retentionPercent > 0 ? (
                                <span className="text-[9px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-1 inline-block">
                                  {item.retentionPercent}% Ret
                                </span>
                              ) : null}
                            </td>
                            <td className="p-3.5 max-w-xs">
                              <div className="font-medium text-slate-800">{item.itemDescription}</div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {item.invoiceRef && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    Ref: {item.invoiceRef}
                                  </span>
                                )}
                                {item.isSponsoredOrBarter && (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                                    <Gift className="w-2.5 h-2.5 text-purple-600" />
                                    <span>Sponsor Barter • Retail {formatZAR(item.commercialRetailValueZAR || item.baselineTotalZAR)}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-500">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-3.5 font-medium text-slate-700">
                              {formatZAR(item.baselineTotalZAR)}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900">
                              <div>{formatZAR(item.actualCostZAR)}</div>
                              {item.isSponsoredOrBarter && (
                                <div className="text-[9px] text-purple-700 font-normal">
                                  Retail: {formatZAR(item.commercialRetailValueZAR || item.baselineTotalZAR)}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`font-bold ${
                                  item.varianceZAR <= 0 ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {item.varianceZAR > 0 ? `+${formatZAR(item.varianceZAR)}` : formatZAR(item.varianceZAR)}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-600 font-medium">
                              {item.supplierOrContractor}
                            </td>
                            <td className="p-3.5">
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  updateBOQItem(activeFlip.id, item.id, {
                                    status: e.target.value as BOQItem['status'],
                                  })
                                }
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer ${
                                  item.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : item.status === 'In Progress'
                                    ? 'bg-indigo-50 text-indigo-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                <option value="Not Started">Not Started</option>
                                <option value="Quoted">Quoted</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td className="p-3.5 pr-5 text-right">
                              <button
                                onClick={() => {
                                  if (confirm(`Delete BOQ item "${item.itemDescription}"?`)) {
                                    deleteBOQItem(activeFlip.id, item.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete line item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Hammer className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No active flips in the portfolio.</p>
                <p className="text-xs text-slate-400 mt-1">Create your first flip project or promote a deal from the Opportunity Analyzer.</p>
                {completedFlips.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewTab('archive')}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>View {completedFlips.length} Sold Flip(s) in Archive</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SOLD & COMPLETED ARCHIVE VIEW                                 */}
        {/* ------------------------------------------------------------- */}
        {viewTab === 'archive' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Archive className="w-5 h-5 text-indigo-600" />
                  <span>Sold & Completed Flips Archive</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical performance record of realized exit prices, capital recycling, and net profits returned to seed capital.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                {completedFlips.length} Realized Exit(s)
              </span>
            </div>

            {convertedRentalId && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">Property Successfully Converted to Rental!</h4>
                    <p className="text-[11px] text-indigo-700">Initial capital basis and compliance documents transferred to the Rentals module.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/rentals"
                    className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-colors"
                  >
                    <span>Go to Rentals</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConvertedRentalId(null)}
                    className="text-indigo-400 hover:text-indigo-700 text-xs px-1.5 py-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {completedFlips.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No completed flips archived yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  When you complete a renovation and sale or convert to rental, click &quot;Mark as Flipped / Sold&quot; or &quot;Convert to Rental&quot; to archive the deal here.
                </p>
                <button
                  type="button"
                  onClick={() => setViewTab('active')}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Go to Active Pipeline</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {completedFlips.map((flip) => {
                  const isBrrrr = flip.exitStrategy === 'BRRRR';
                  const {
                    fullCostBasisZAR: fullCostBasis,
                    realizedSalePriceZAR: salePrice,
                    realizedNetProfitZAR: realizedNetProfit,
                    realizedRoiPercent: realizedROI,
                    brrrrTargetValuationZAR: brrrrTargetValuation,
                    brrrrEquityCreatedZAR: brrrrEquityCreated,
                  } = calculateArchivedFlipFinancials(flip);

                  return (
                    <div
                      key={flip.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <PropertyTypeBadge type={flip.propertyType} />
                              {isBrrrr ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  <ArrowRightLeft className="w-3 h-3 text-indigo-600" />
                                  <span>RETAINED AS RENTAL (BRRRR)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>FLIPPED / SOLD</span>
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-base">{flip.title}</h4>
                            <p className="text-xs text-slate-500">{flip.address}, {flip.city}</p>
                          </div>
                          {flip.soldDate && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                              {isBrrrr ? 'Converted' : 'Sold'} {formatDate(flip.soldDate)}
                            </span>
                          )}
                        </div>

                        {/* Financial Highlights */}
                        {isBrrrr ? (
                          <div className="grid grid-cols-3 gap-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-center">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Accumulated Basis</span>
                              <strong className="text-xs font-bold text-slate-900">{formatZAR(fullCostBasis)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Target Valuation</span>
                              <strong className="text-xs font-bold text-slate-700">{formatZAR(brrrrTargetValuation)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Equity Created</span>
                              <strong className="text-xs font-extrabold text-indigo-700">+{formatZAR(brrrrEquityCreated)}</strong>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Realized Sale</span>
                              <strong className="text-xs font-bold text-slate-900">{formatZAR(salePrice)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Cost Basis</span>
                              <strong className="text-xs font-bold text-slate-700">{formatZAR(fullCostBasis)}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Realized Profit</span>
                              <strong className={`text-xs font-extrabold ${realizedNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {realizedNetProfit >= 0 ? `+${formatZAR(realizedNetProfit)}` : formatZAR(realizedNetProfit)}
                              </strong>
                            </div>
                          </div>
                        )}

                        {isBrrrr ? (
                          <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-indigo-900 uppercase block">
                                Active in Rental Portfolio
                              </span>
                              <span className="text-[11px] text-indigo-700">
                                Eligible for Refinance & equity pull-out in Rentals module
                              </span>
                            </div>
                            <Link
                              href="/rentals"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors shrink-0 shadow-2xs"
                            >
                              <span>View in Rentals</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                                Liquid Cash Released to Seed Capital
                              </span>
                              <span className="text-[11px] text-emerald-700">
                                Credited to Reserve for next acquisition
                              </span>
                            </div>
                            <strong className="text-sm font-black text-emerald-900">
                              {formatZAR(flip.netCashProceedsZAR || 0)}
                            </strong>
                          </div>
                        )}

                        {flip.exitNotes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <span className="font-semibold text-slate-700">Exit Notes: </span>
                            <span>{flip.exitNotes}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          {isBrrrr ? (
                            <span>Strategy: <strong className="text-indigo-800 font-bold">BRRRR (Rent & Refinance)</strong></span>
                          ) : (
                            <span>Final Realized ROI: <strong className="text-slate-900 font-bold">{formatPercent(realizedROI)}</strong></span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(isBrrrr
                              ? `Reopen flip "${flip.title}" back to active pipeline? This will remove the linked rental property from your portfolio.`
                              : `Reopen flip "${flip.title}" back to active pipeline? This will revert the credited cash of ${formatZAR(flip.netCashProceedsZAR || 0)} from Cash in Reserve.`
                            )) {
                              reopenFlip(flip.id);
                              setSelectedFlipId(flip.id);
                              setViewTab('active');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reopen Project</span>
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

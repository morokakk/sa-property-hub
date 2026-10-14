'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { OpportunityDeal, PassReason, AmenityScorecard } from '@/types';
import { PropertyTypeBadge, AgmDateChip } from '@/components/common/PropertyTypeBadge';
import { findInvestmentNode, getNodeComplianceProfile } from '@/lib/constants/investmentNodes';
import { isEvictionActive } from '@/lib/calculations/occupantRisk';
import { formatOpportunityForWhatsApp } from '@/lib/whatsappFormatter';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { calculateDealDscr, evaluateDealCriteria } from '@/lib/calculations/propertyMetrics';
import {
  TrendingUp,
  Target,
  Info,
  MapPin,
  Check,
  Copy,
  Share2,
  Edit3,
  Trash2,
  MoreVertical,
  ArrowRight,
  XCircle,
  RotateCcw,
  Hammer,
  Building,
  FileText,
  ShieldCheck,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export interface PipelineDealCardProps {
  deal: OpportunityDeal;
  displayDeal: any;
  selected: boolean;
  onToggleSelect: (selected: boolean) => void;
  onEdit: (deal: any) => void;
  onDuplicate: (dealId: string) => void;
  onDelete: (dealId: string) => void;
  onAdvanceStage: (dealId: string) => void;
  onPass: (dealId: string, reason: PassReason, notes?: string) => void;
  onReactivate: (dealId: string) => void;
  onPromoteToFlip: (dealId: string) => void;
  onPromoteToRental: (dealId: string) => void;
  investorProfile: any;
  copiedDealId: string | null;
  onCopyWhatsApp: (deal: any) => void;
}

export function PipelineDealCard({
  deal,
  displayDeal,
  selected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onAdvanceStage,
  onPass,
  onReactivate,
  onPromoteToFlip,
  onPromoteToRental,
  investorProfile,
  copiedDealId,
  onCopyWhatsApp,
}: PipelineDealCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProximityOpen, setIsProximityOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passReason, setPassReason] = useState<PassReason>('Yield Too Low');
  const [passNotes, setPassNotes] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const proximityRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (proximityRef.current && !proximityRef.current.contains(event.target as Node)) {
        setIsProximityOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scorecard: AmenityScorecard = deal.amenityScorecard ?? {
    schools: '0-5km',
    policeStation: '0-5km',
    medicalClinic: '0-5km',
    shoppingMall: '0-5km',
    compositeScore: 12,
    compositeGrade: 'A-Grade (Prime Hub)',
  };

  const openMarket = deal.openMarketValueZAR ?? deal.purchasePrice;
  const builtInEquity = openMarket - deal.purchasePrice;
  const builtInPercent = openMarket > 0 ? (builtInEquity / openMarket) * 100 : 0;
  const dscrInfo = calculateDealDscr(deal, investorProfile?.defaultPrimeRatePercent);
  const dealDscr = dscrInfo.dscr;
  const buyBoxResult = evaluateDealCriteria(
    {
      capRate: deal.capRate,
      grossYield: deal.grossYield,
      netRoi: deal.netRoi,
      monthlyCashFlow: deal.monthlyCashFlow,
      initialCapitalRequired: deal.initialCapitalRequired,
      projectedFlipRoi: deal.projectedFlipRoi,
      projectedFlipNetProfit: deal.projectedFlipNetProfit,
      dscr: dscrInfo.rawDscr,
      monthlyBondPayment: dscrInfo.monthlyBondPayment,
    },
    investorProfile,
    deal.strategy ?? 'Rental'
  );

  const isFlipStrategy = deal.strategy === 'Flip';

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all shadow-2xs space-y-3">
      {/* 1. Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PropertyTypeBadge type={deal.propertyType} />
            <AgmDateChip agmDate={deal.agmDate} />
            <h4 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">{deal.title}</h4>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {deal.source}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                deal.status === 'Screening'
                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                  : deal.status === 'Offer Submitted'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : deal.status === 'Due Diligence'
                  ? 'bg-violet-100 text-violet-800 border-violet-300'
                  : deal.status === 'Passed'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : deal.status === 'Promoted to Flip'
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                  : 'bg-teal-100 text-teal-800 border-teal-300'
              }`}
            >
              {deal.status}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                deal.strategy === 'Flip'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : deal.strategy === 'BRRRR'
                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : 'bg-indigo-100 text-indigo-900 border-indigo-300'
              }`}
            >
              {deal.strategy === 'Flip' ? '🔄 Flip' : deal.strategy === 'BRRRR' ? '⚡ BRRRR' : '🏠 Rental'}
            </span>
            {deal.occupantRisk && isEvictionActive(deal.occupantRisk) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1">
                <span>⛔ Eviction Pending</span>
                <span className="text-[9px] opacity-80">({deal.occupantRisk.estimatedEvictionDelayDays}d)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {deal.address}, {deal.city} ({deal.province})
          </p>

          {/* Regional Compliance & Node Badges */}
          {(() => {
            const node = findInvestmentNode(deal.city);
            const compliance = getNodeComplianceProfile(deal.city, deal.province);
            return (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {node && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                    {node.regionGroup.split('—')[1]?.trim() || node.regionGroup}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    compliance.zone === 'western_cape'
                      ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                      : compliance.zone === 'coastal'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {compliance.zone === 'western_cape'
                    ? 'WC: Plumbing & Beetle'
                    : compliance.zone === 'coastal'
                    ? 'Coastal Beetle'
                    : 'Inland CoC'}
                </span>
              </div>
            );
          })()}

          {/* Pass Reason for Archived Deals */}
          {deal.status === 'Passed' && deal.passReason && (
            <div className="mt-2 text-[11px] bg-rose-50 border border-rose-200 text-rose-900 rounded-lg px-2.5 py-1 flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-rose-700">Passed:</span>
              <span className="font-semibold text-rose-800">{deal.passReason}</span>
              {deal.passNotes && <span className="text-slate-600 italic">— &ldquo;{deal.passNotes}&rdquo;</span>}
              {deal.passedAt && <span className="text-slate-400 text-[10px]">({deal.passedAt})</span>}
            </div>
          )}
        </div>

        {/* Top-Right Quick Utilities: Compare, WhatsApp Pill & ⋯ Overflow Menu */}
        <div className="flex items-center gap-1.5 shrink-0 self-start lg:self-center">
          {/* Compare Checkbox */}
          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer shadow-2xs select-none">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onToggleSelect(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Compare</span>
          </label>

          {/* WhatsApp Quick Pill */}
          <button
            type="button"
            onClick={() => onCopyWhatsApp(displayDeal)}
            title="Copy WhatsApp deal summary"
            className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            {copiedDealId === deal.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedDealId === deal.id ? 'Copied!' : 'WhatsApp'}</span>
          </button>

          {/* ⋯ Overflow Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(displayDeal);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit in Calculator</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDuplicate(deal.id);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Copy className="w-3.5 h-3.5 text-purple-600" />
                  <span>Duplicate Scenario</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(formatOpportunityForWhatsApp(displayDeal, investorProfile))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Share via WhatsApp</span>
                </a>

                {/* Alternate Promotion Option */}
                {isFlipStrategy ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (confirm(`Promote "${deal.title}" to Rental Portfolio?`)) {
                        onPromoteToRental(deal.id);
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-teal-800 hover:bg-teal-50 flex items-center gap-2 cursor-pointer font-medium border-t border-slate-100"
                  >
                    <Building className="w-3.5 h-3.5 text-teal-600" />
                    <span>Promote to Rental</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (confirm(`Promote "${deal.title}" to Buy-and-Flip Manager?`)) {
                        onPromoteToFlip(deal.id);
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-indigo-800 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer font-medium border-t border-slate-100"
                  >
                    <Hammer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Promote to Flip</span>
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (confirm(`Delete "${deal.title}" from pipeline?`)) {
                      onDelete(deal.id);
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Deal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Signals & Buy Box Row (With Interactive Proximity Popover) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            builtInEquity > 0
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}
        >
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          Built-in Equity: {formatZAR(builtInEquity)} ({builtInPercent >= 0 ? '+' : ''}{formatPercent(builtInPercent)} vs Val)
        </span>

        {/* Buy Box Match Badge */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            buyBoxResult.meetsBuyBox
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
          title={`Buy Box criteria: ${buyBoxResult.passedCount} of ${buyBoxResult.totalCount} hurdles met (${deal.strategy ?? 'Rental'})`}
        >
          <Target className="w-3 h-3 text-emerald-600" />
          Buy Box Match ({buyBoxResult.passedCount}/{buyBoxResult.totalCount})
        </span>

        {/* DSCR Badge */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            dealDscr >= (investorProfile?.minDscr ?? 1.20)
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
          title={`Debt Service Coverage Ratio: ${dealDscr >= 99 ? 'No Bond (Cash Deal)' : `${dealDscr}x`} (Hurdle: ${investorProfile?.minDscr ?? 1.20}x)`}
        >
          DSCR: {dealDscr >= 99 ? 'Cash' : `${dealDscr.toFixed(2)}x`}
        </span>

        {/* Section 11(a) Compliant */}
        <span
          className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-help"
          title="Reflects interest-only deduction per SARS ITR12 guidelines."
        >
          <Info className="w-3 h-3 text-slate-400" />
          Sec 11(a) Compliant
        </span>

        {/* Consolidated Amenity Scorecard Chip with Popover (saves 25% height) */}
        <div className="relative inline-block" ref={proximityRef}>
          <button
            type="button"
            onClick={() => setIsProximityOpen(!isProximityOpen)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors cursor-pointer ${
              scorecard.compositeGrade === 'A-Grade (Prime Hub)'
                ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : scorecard.compositeGrade === 'B-Grade (Accessible)'
                ? 'bg-teal-100/70 text-teal-800 border-teal-300 hover:bg-teal-100'
                : 'bg-amber-100/70 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Click to view itemized proximity distances"
          >
            <MapPin className="w-3 h-3 text-emerald-700" />
            <span>{scorecard.compositeGrade} ({scorecard.compositeScore}/12)</span>
            <ChevronDown className={`w-3 h-3 text-emerald-700 transition-transform ${isProximityOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProximityOpen && (
            <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
                <span>Node Proximity Details</span>
                <span className="text-emerald-700 font-bold">{scorecard.compositeScore}/12 Pts</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-700">
                <div className="flex justify-between">
                  <span>🏫 Schools &amp; Education:</span>
                  <strong className="text-slate-900">{scorecard.schools}</strong>
                </div>
                <div className="flex justify-between">
                  <span>👮 Police Station (SAPS):</span>
                  <strong className="text-slate-900">{scorecard.policeStation}</strong>
                </div>
                <div className="flex justify-between">
                  <span>🏥 Hospital / Clinic:</span>
                  <strong className="text-slate-900">{scorecard.medicalClinic}</strong>
                </div>
                <div className="flex justify-between">
                  <span>🛍️ Shopping Mall:</span>
                  <strong className="text-slate-900">{scorecard.shoppingMall}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Financial Metric Badges - Full Width Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-3 border-y border-slate-200/80 my-2 text-xs bg-slate-50/70 px-3.5 rounded-lg">
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Open Market Value</span>
          <span className="font-semibold text-slate-700">{formatZAR(openMarket)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Target Purchase Bid</span>
          <span className="font-bold text-slate-900">{formatZAR(deal.purchasePrice)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Financing / Deposit</span>
          <span className="font-semibold text-slate-800">
            {deal.bondLTV ?? deal.loanToValuePercent}% LTV ({formatZAR(deal.depositZAR ?? Math.round(deal.purchasePrice * (1 - (deal.bondLTV ?? deal.loanToValuePercent) / 100)))})
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Day-1 Capital Required</span>
          <span className="font-bold text-emerald-800">
            {formatZAR(
              deal.initialCapitalRequired ??
              ((deal.depositZAR ?? Math.round(deal.purchasePrice * (1 - (deal.bondLTV ?? deal.loanToValuePercent) / 100))) +
              (deal.costs.totalAcquisitionCost - deal.purchasePrice) +
              deal.estimatedRehabCost +
              (deal.auctioneerCommissionZAR || 0) +
              (deal.municipalArrearsZAR || 0))
            )}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Gross Yield / Cap Rate</span>
          <span className="font-bold text-emerald-700">
            {formatPercent(deal.grossYield)} / {formatPercent(deal.capRate)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Flip Profit / ROI</span>
          <span className="font-bold text-indigo-700">
            {formatZAR(deal.projectedFlipNetProfit)} ({formatPercent(deal.projectedFlipRoi)})
          </span>
        </div>
      </div>

      {/* 4. Tax Breakdown Sub-Bar */}
      <div className="pt-0.5 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span>SARS Transfer Duty: <strong className="text-slate-700">{formatZAR(deal.costs.transferDuty)}</strong></span>
        <span>Conveyancing: <strong className="text-slate-700">{formatZAR(deal.costs.conveyancingFee)}</strong></span>
        <span>Bond Reg: <strong className="text-slate-700">{formatZAR(deal.costs.bondRegistrationFee)}</strong></span>
        <span>Deeds Office: <strong className="text-slate-700">{formatZAR(deal.costs.deedsOfficeFee)}</strong></span>
        {deal.auctioneerCommissionZAR !== undefined && deal.auctioneerCommissionZAR > 0 && (
          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
            Auction Fee (10%+VAT): <strong>{formatZAR(deal.auctioneerCommissionZAR)}</strong>
          </span>
        )}
        {deal.municipalArrearsZAR !== undefined && deal.municipalArrearsZAR > 0 && (
          <span className="text-rose-800 bg-rose-50 px-2 py-0.5 rounded font-semibold border border-rose-200">
            Sec 118 Arrears: <strong>{formatZAR(deal.municipalArrearsZAR)}</strong>
          </span>
        )}
        <span>Net Monthly Cashflow: <strong className={deal.monthlyCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatZAR(deal.monthlyCashFlow)}</strong></span>
        {deal.section13sex?.isEligible && (
          <span className="text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-semibold flex items-center gap-1 border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-700" />
            SARS Sec 13sex: +{formatZAR(deal.section13sex.annualTaxSavingsZAR)}/yr Shield
          </span>
        )}
      </div>

      {/* 5. Bottom Action Bar: Stage-Gated Workflow */}
      <div className="pt-2.5 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">Strategy Target:</span>{' '}
          {isFlipStrategy ? 'Short-term flip liquidation' : 'Long-term rental compounding'}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
          {/* Stage Progression CTA (Screening -> Offer Submitted -> Due Diligence) */}
          {(deal.status === 'Screening' || deal.status === 'Offer Submitted') && (
            <button
              type="button"
              onClick={() => onAdvanceStage(deal.id)}
              title={deal.status === 'Screening' ? 'Advance to Offer Submitted' : 'Advance to Due Diligence'}
              className="px-3 py-1.5 text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
              <span>{deal.status === 'Screening' ? 'Submit Offer ➔' : 'Begin DD ➔'}</span>
            </button>
          )}

          {/* Primary Strategy-Matched Promotion CTA */}
          {deal.status !== 'Passed' && (
            isFlipStrategy ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Promote "${deal.title}" to Buy-and-Flip Manager?`)) {
                    onPromoteToFlip(deal.id);
                  }
                }}
                title="Promote to Buy-and-Flip Manager"
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                  deal.status === 'Due Diligence'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Promote to Flip</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Promote "${deal.title}" to Rental Portfolio?`)) {
                    onPromoteToRental(deal.id);
                  }
                }}
                title="Promote to Rental Portfolio"
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                  deal.status === 'Due Diligence'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Promote to Rental</span>
              </button>
            )
          )}

          {/* Pitch Deck Link */}
          <Link
            href={`/proposal?dealId=${deal.id}`}
            className="px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
            title="Generate investor proposal pitch deck"
          >
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span>Pitch Deck</span>
          </Link>

          {/* Pass Deal Button */}
          {(deal.status === 'Screening' || deal.status === 'Offer Submitted' || deal.status === 'Due Diligence') && (
            <button
              type="button"
              onClick={() => setIsPassModalOpen(true)}
              title="Pass on this deal"
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Pass</span>
            </button>
          )}

          {/* Reactivate Button for Passed Deals */}
          {deal.status === 'Passed' && (
            <button
              type="button"
              onClick={() => onReactivate(deal.id)}
              title="Reactivate deal back to Screening pipeline"
              className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reactivate</span>
            </button>
          )}
        </div>
      </div>

      {/* Pass Deal Modal Dialog */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsPassModalOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-200 text-left">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-rose-100 text-rose-700">
                  <XCircle className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">Pass Deal Reason</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
            <select
              value={passReason}
              onChange={(e) => setPassReason(e.target.value as PassReason)}
              className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg mb-3 bg-white text-slate-900"
            >
              <option value="Yield Too Low">Yield Too Low</option>
              <option value="High Arrears / Municipal Risk">High Arrears / Municipal Risk</option>
              <option value="Seller Countered Above MAO">Seller Countered Above MAO</option>
              <option value="Title Deed Issues">Title Deed Issues</option>
              <option value="Structural / Damp Report Failed">Structural / Damp Report Failed</option>
              <option value="Funding Not Secured">Funding Not Secured</option>
              <option value="Other">Other</option>
            </select>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (Optional)</label>
            <textarea
              value={passNotes}
              onChange={(e) => setPassNotes(e.target.value)}
              placeholder="E.g. Counter-offer rejected, repairs too high..."
              rows={2}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg mb-3 text-slate-800 resize-none"
            />
            <button
              type="button"
              onClick={() => {
                onPass(deal.id, passReason, passNotes);
                setIsPassModalOpen(false);
                setPassReason('Yield Too Low');
                setPassNotes('');
              }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Confirm Pass Deal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PipelineDealCard;

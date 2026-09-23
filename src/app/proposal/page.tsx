'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { generateLongTermProjection } from '@/lib/calculations/propertyMetrics';
import { formatProposalPitchForWhatsApp } from '@/lib/whatsappFormatter';
import LongTermProjectionChart from '@/components/analytics/LongTermProjectionChart';
import { DealStrategy, DealSource } from '@/types';
import {
  Printer,
  FileCheck2,
  Building,
  Coins,
  ShieldCheck,
  TrendingUp,
  Hammer,
  Calendar,
  Layers,
  ChevronDown,
  MapPin,
  GraduationCap,
  ShieldAlert,
  Stethoscope,
  ShoppingBag,
  Check,
  Save,
  Copy,
  Share2,
  Zap,
  Repeat,
  AlertTriangle,
} from 'lucide-react';

function getSafeLogoUri(uri?: string): string {
  if (!uri) return '';
  if (uri.startsWith('data:image/svg+xml;base64,')) {
    try {
      if (typeof window !== 'undefined') {
        const raw = atob(uri.slice('data:image/svg+xml;base64,'.length));
        const sanitized = raw.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');
        return `data:image/svg+xml;base64,${btoa(sanitized)}`;
      }
    } catch {
      return uri;
    }
  }
  return uri;
}

function ProposalGeneratorContent() {
  const searchParams = useSearchParams();
  const queryDealId = searchParams.get('dealId');

  const rentals = usePortfolioStore((state) => state.rentals);
  const flips = usePortfolioStore((state) => state.flips);
  const opportunities = usePortfolioStore((state) => state.opportunities);
  const suppliers = usePortfolioStore((state) => state.suppliers);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const updateRental = usePortfolioStore((state) => state.updateRental);
  const updateFlip = usePortfolioStore((state) => state.updateFlip);
  const updateOpportunity = usePortfolioStore((state) => state.updateOpportunity);

  // Combine Flips, Opportunities, and Active Rentals as pitch candidates
  const allDeals = [
    ...flips.map((f) => ({
      id: f.id,
      type: 'flip' as const,
      title: f.title,
      address: f.address,
      city: f.city,
      openMarketValue: f.targetExitPriceZAR,
      purchasePrice: f.purchasePriceZAR,
      builtInEquity: Math.max(0, f.targetExitPriceZAR - f.purchasePriceZAR),
      builtInEquityPercent: f.targetExitPriceZAR > 0
        ? Number((((f.targetExitPriceZAR - f.purchasePriceZAR) / f.targetExitPriceZAR) * 100).toFixed(1))
        : 0,
      amenityScorecard: {
        schools: '0-5km' as const,
        policeStation: '0-5km' as const,
        medicalClinic: '0-5km' as const,
        shoppingMall: '0-5km' as const,
        compositeGrade: 'A-Grade (Prime Hub)' as const,
        compositeScore: 12,
      },
      acquisitionCosts: f.acquisitionCostsZAR,
      renovationBudget: f.baselineRenovationBudgetZAR,
      strategy: f.strategy ?? 'Flip',
      source: f.source ?? 'Private Agent',
      auctioneerCommission: 0,
      municipalArrears: 0,
      isSection13Eligible: false,
      holdingDurationMonths: f.estimatedDurationMonths ?? 6,
      monthlyBondHolding: f.monthlyBondPaymentZAR ?? 0,
      monthlyLeviesHolding: f.monthlyLeviesZAR ?? 0,
      monthlyRatesHolding: f.monthlyRatesTaxesZAR ?? 0,
      monthlyOtherHolding: f.monthlyOtherHoldingCostZAR ?? 0,
      monthlyHoldingCost: f.monthlyHoldingCostZAR ?? (
        (f.monthlyBondPaymentZAR ?? 0) +
        (f.monthlyLeviesZAR ?? 0) +
        (f.monthlyRatesTaxesZAR ?? 0) +
        (f.monthlyOtherHoldingCostZAR ?? 0)
      ),
      targetExitPrice: f.targetExitPriceZAR,
      completionDate: f.targetCompletionDate,
      boq: f.boq,
      notes: f.notes,
      fundingRequiredZAR: f.fundingRequiredZAR,
      capitalRaisedZAR: f.capitalRaisedZAR,
      primaryFunderName: f.primaryFunderName,
      primaryFunderContact: f.primaryFunderContact,
      primaryFunderType: f.primaryFunderType,
      coFundersNotes: f.coFundersNotes,
      promisedReturnType: f.promisedReturnType,
      promisedReturnRatePercent: f.promisedReturnRatePercent,
      promisedPayoutSchedule: f.promisedPayoutSchedule,
      securityOffered: f.securityOffered,
      monthlyRent: Math.round(f.purchasePriceZAR * 0.009),
      monthlyLevies: f.monthlyLeviesZAR || 0,
      monthlyRates: f.monthlyRatesTaxesZAR || 0,
      depositZAR: 0,
      loanToValue: 100,
      interestRatePercent: 11.75,
      loanTermYears: 20,
      annualCapitalGrowthPercent: 5.0,
      annualRentalEscalationPercent: 6.0,
      annualExpenseInflationPercent: 6.0,
      bondTermYears: 20,
    })),
    ...opportunities.map((o) => {
      const openMarket = o.openMarketValueZAR || Math.round(o.purchasePrice * 1.2);
      const builtIn = o.builtInEquityZAR ?? (openMarket - o.purchasePrice);
      const builtInPct = o.builtInEquityPercent ?? Number(((builtIn / openMarket) * 100).toFixed(1));
      const scorecard = o.amenityScorecard ?? {
        schools: '0-5km' as const,
        policeStation: '0-5km' as const,
        medicalClinic: '0-5km' as const,
        shoppingMall: '0-5km' as const,
        compositeGrade: 'A-Grade (Prime Hub)' as const,
        compositeScore: 12,
      };

      return {
        id: o.id,
        type: 'opportunity' as const,
        title: o.title,
        address: o.address,
        city: o.city,
        openMarketValue: openMarket,
        purchasePrice: o.purchasePrice,
        builtInEquity: builtIn,
        builtInEquityPercent: builtInPct,
        amenityScorecard: scorecard,
        acquisitionCosts: o.costs.totalAcquisitionCost - o.purchasePrice,
        renovationBudget: o.estimatedRehabCost,
        strategy: o.strategy ?? 'Rental',
        source: o.source,
        auctioneerCommission: o.auctioneerCommissionZAR ?? 0,
        municipalArrears: o.municipalArrearsZAR ?? 0,
        isSection13Eligible: o.section13sex?.isEligible ?? false,
        section13Allowance: o.section13sex?.annualAllowanceZAR ?? 0,
        holdingDurationMonths: o.holdingPeriodMonths ?? 6,
        monthlyBondHolding: o.monthlyBondPaymentZAR ?? (o.bondLTV ? Math.round(o.purchasePrice * (o.bondLTV / 100) * 0.0108) : 0),
        monthlyLeviesHolding: o.monthlyLevies ?? 0,
        monthlyRatesHolding: o.monthlyRatesTaxes ?? 0,
        monthlyOtherHolding: o.monthlyOtherHoldingCostZAR ?? 1500,
        monthlyHoldingCost: o.monthlyHoldingCostZAR ?? (
          (o.monthlyLevies ?? 0) +
          (o.monthlyRatesTaxes ?? 0) +
          (o.monthlyBondPaymentZAR ?? (o.bondLTV ? Math.round(o.purchasePrice * (o.bondLTV / 100) * 0.0108) : 0)) +
          (o.monthlyOtherHoldingCostZAR ?? 1500)
        ),
        targetExitPrice: o.targetExitPrice,
        completionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        boq: [],
        notes: `Sourced via ${o.source}. Gross Yield: ${o.grossYield}%, Cap Rate: ${o.capRate}%`,
        fundingRequiredZAR: o.fundingRequiredZAR,
        capitalRaisedZAR: o.capitalRaisedZAR,
        primaryFunderName: o.primaryFunderName,
        primaryFunderContact: o.primaryFunderContact,
        primaryFunderType: o.primaryFunderType,
        coFundersNotes: o.coFundersNotes,
        promisedReturnType: o.promisedReturnType,
        promisedReturnRatePercent: o.promisedReturnRatePercent,
        promisedPayoutSchedule: o.promisedPayoutSchedule,
        securityOffered: o.securityOffered,
        monthlyRent: o.monthlyRentalEstimate,
        monthlyLevies: o.monthlyLevies,
        monthlyRates: o.monthlyRatesTaxes,
        depositZAR: o.depositZAR,
        loanToValue: o.loanToValuePercent,
        interestRatePercent: o.interestRatePercent,
        loanTermYears: o.loanTermYears,
        annualCapitalGrowthPercent: o.annualCapitalGrowthPercent ?? 5.0,
        annualRentalEscalationPercent: o.annualRentalEscalationPercent ?? 6.0,
        annualExpenseInflationPercent: o.annualExpenseInflationPercent ?? 6.0,
        bondTermYears: o.bondTermYears ?? o.loanTermYears ?? 20,
      };
    }),
    ...rentals.map((r) => {
      const openMarket = r.marketValueZAR || r.purchasePriceZAR;
      const builtIn = Math.max(0, openMarket - (r.outstandingBondBalanceZAR || r.purchasePriceZAR));
      const builtInPct = openMarket > 0 ? Number(((builtIn / openMarket) * 100).toFixed(1)) : 0;
      return {
        id: r.id,
        type: 'rental' as const,
        title: r.title,
        address: r.address,
        city: r.city,
        openMarketValue: openMarket,
        purchasePrice: r.purchasePriceZAR,
        builtInEquity: builtIn,
        builtInEquityPercent: builtInPct,
        amenityScorecard: {
          schools: '0-5km' as const,
          policeStation: '0-5km' as const,
          medicalClinic: '0-5km' as const,
          shoppingMall: '0-5km' as const,
          compositeGrade: 'A-Grade (Prime Hub)' as const,
          compositeScore: 12,
        },
        acquisitionCosts: Math.round(r.purchasePriceZAR * 0.05),
        renovationBudget: 0,
        strategy: 'Rental' as DealStrategy,
        source: r.source ?? 'Private Agent',
        auctioneerCommission: 0,
        municipalArrears: r.unpaidUtilityArrearsZAR ?? 0,
        isSection13Eligible: false,
        section13Allowance: 0,
        holdingDurationMonths: 12,
        monthlyBondHolding: r.monthlyBondPaymentZAR ?? 0,
        monthlyLeviesHolding: r.monthlyLeviesZAR ?? 0,
        monthlyRatesHolding: r.monthlyRatesTaxesZAR ?? 0,
        monthlyOtherHolding: (r.monthlyAgentFeeZAR || 0) + (r.monthlyMaintenanceReserveZAR || 0),
        monthlyHoldingCost: (r.monthlyBondPaymentZAR || 0) + (r.monthlyLeviesZAR || 0) + (r.monthlyRatesTaxesZAR || 0),
        targetExitPrice: openMarket,
        completionDate: r.leaseEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        boq: [],
        notes: `Seasoned portfolio asset. Tenant: ${r.tenantName || 'In-place'}. Gross Rent: ${formatZAR(r.monthlyGrossRentZAR)}/mo. Bond balance: ${formatZAR(r.outstandingBondBalanceZAR || 0)}.`,
        fundingRequiredZAR: Math.round(openMarket * 0.3),
        capitalRaisedZAR: 0,
        primaryFunderName: undefined,
        primaryFunderContact: undefined,
        primaryFunderType: undefined,
        coFundersNotes: undefined,
        promisedReturnType: 'Monthly Coupon',
        promisedReturnRatePercent: 13.5,
        promisedPayoutSchedule: 'Monthly Interest',
        securityOffered: '2nd Mortgage Bond registered over title deed',
        monthlyRent: r.monthlyGrossRentZAR,
        monthlyLevies: r.monthlyLeviesZAR,
        monthlyRates: r.monthlyRatesTaxesZAR,
        depositZAR: Math.max(0, openMarket - (r.outstandingBondBalanceZAR || 0)),
        loanToValue: openMarket > 0 ? Math.round(((r.outstandingBondBalanceZAR || 0) / openMarket) * 100) : 70,
        interestRatePercent: r.bondInterestRatePercent || 11.75,
        loanTermYears: 20,
        annualCapitalGrowthPercent: 5.0,
        annualRentalEscalationPercent: r.annualEscalationPercent || 6.0,
        annualExpenseInflationPercent: 6.0,
        bondTermYears: 20,
      };
    }),
  ];

  const [selectedDealId, setSelectedDealId] = useState<string>(
    queryDealId || allDeals[0]?.id || ''
  );

  useEffect(() => {
    if (queryDealId) {
      setSelectedDealId(queryDealId);
    }
  }, [queryDealId]);

  const deal = allDeals.find((d) => d.id === selectedDealId) || allDeals[0];

  const [pitchStrategy, setPitchStrategy] = useState<DealStrategy>(
    deal?.strategy ?? (deal?.type === 'flip' ? 'Flip' : 'Rental')
  );

  const isFlip = pitchStrategy === 'Flip';

  const projectionData = useMemo(() => {
    if (!deal || isFlip) return [];
    return generateLongTermProjection({
      purchasePrice: deal.purchasePrice,
      openMarketValueZAR: deal.openMarketValue,
      depositZAR: deal.depositZAR ?? 0,
      bondLTV: deal.loanToValue ?? 100,
      loanToValuePercent: deal.loanToValue ?? 100,
      interestRatePercent: deal.interestRatePercent ?? 11.75,
      loanTermYears: deal.bondTermYears ?? deal.loanTermYears ?? 20,
      bondTermYears: deal.bondTermYears ?? 20,
      annualCapitalGrowthPercent: deal.annualCapitalGrowthPercent ?? 5.0,
      annualRentalEscalationPercent: deal.annualRentalEscalationPercent ?? 6.0,
      annualExpenseInflationPercent: deal.annualExpenseInflationPercent ?? 6.0,
      monthlyRentalEstimate: deal.monthlyRent || Math.round(deal.purchasePrice * 0.009),
      monthlyLevies: deal.monthlyLevies || 0,
      monthlyRatesTaxes: deal.monthlyRates || 0,
      annualInsurance: 7_200,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
    });
  }, [deal, isFlip]);

  // Proposed Investor Terms state
  const [fundingOfferType, setFundingOfferType] = useState<'Fixed Interest' | 'Profit Share'>('Fixed Interest');
  const [offeredRate, setOfferedRate] = useState<number>(14.5);
  const [securityType, setSecurityType] = useState('2nd Mortgage Bond registered over title deed');
  const [capitalRequested, setCapitalRequested] = useState<number>(
    deal ? Math.round((deal.purchasePrice + deal.acquisitionCosts + deal.renovationBudget) * 0.7) : 1000000
  );
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Sync state when deal selection changes
  useEffect(() => {
    if (deal) {
      const initialStrategy = deal.strategy ?? (deal.type === 'flip' ? 'Flip' : 'Rental');
      setPitchStrategy(initialStrategy);

      const isDealFlip = initialStrategy === 'Flip';
      const duration = deal.holdingDurationMonths || 6;
      const burn = deal.monthlyHoldingCost || (deal.monthlyBondHolding + deal.monthlyLeviesHolding + deal.monthlyRatesHolding + deal.monthlyOtherHolding);
      const reserve = isDealFlip ? burn * duration : 0;
      const auctionFee = deal.auctioneerCommission || 0;
      const arrears = deal.municipalArrears || 0;
      const fullProjectOutlay = deal.purchasePrice + deal.acquisitionCosts + deal.renovationBudget + reserve + auctionFee + arrears;

      const defaultCapital =
        deal.fundingRequiredZAR ??
        Math.round(fullProjectOutlay * 0.7);
      const defaultOfferType =
        deal.promisedReturnType === 'Equity Profit Split' ? 'Profit Share' : 'Fixed Interest';
      const defaultRate = deal.promisedReturnRatePercent ?? 14.5;
      const defaultSec = deal.securityOffered ?? '2nd Mortgage Bond registered over title deed';
      setCapitalRequested(defaultCapital);
      setFundingOfferType(defaultOfferType);
      setOfferedRate(defaultRate);
      setSecurityType(defaultSec);
    }
  }, [selectedDealId]);

  const handleSaveTermsToDeal = () => {
    if (!deal) return;
    const returnTypeToSave = fundingOfferType === 'Profit Share' ? 'Equity Profit Split' : 'Fixed Interest';
    if (deal.type === 'flip') {
      updateFlip(deal.id, {
        strategy: pitchStrategy,
        fundingRequiredZAR: capitalRequested,
        promisedReturnType: returnTypeToSave,
        promisedReturnRatePercent: offeredRate,
        securityOffered: securityType,
      });
    } else if (deal.type === 'opportunity') {
      updateOpportunity(deal.id, {
        strategy: pitchStrategy,
        fundingRequiredZAR: capitalRequested,
        promisedReturnType: returnTypeToSave,
        promisedReturnRatePercent: offeredRate,
        securityOffered: securityType,
      });
    } else if (deal.type === 'rental') {
      updateRental(deal.id, {
        notes: `Private pitch terms: ${offeredRate}% ${fundingOfferType}, security: ${securityType}`,
      });
    }
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 2500);
  };

  // Financial calculations
  const holdingDuration = deal?.holdingDurationMonths || 6;
  const monthlyBond = deal?.monthlyBondHolding ?? 0;
  const monthlyLevies = deal?.monthlyLeviesHolding ?? 0;
  const monthlyRates = deal?.monthlyRatesHolding ?? 0;
  const monthlyOther = deal?.monthlyOtherHolding ?? 0;
  const monthlyBurnRate = deal?.monthlyHoldingCost || (monthlyBond + monthlyLevies + monthlyRates + monthlyOther);
  const totalHoldingReserve = isFlip ? monthlyBurnRate * holdingDuration : 0;
  const auctioneerCommission = deal?.auctioneerCommission ?? 0;
  const municipalArrears = deal?.municipalArrears ?? 0;

  const totalProjectCost =
    (deal?.purchasePrice || 0) +
    (deal?.acquisitionCosts || 0) +
    (deal?.renovationBudget || 0) +
    totalHoldingReserve +
    auctioneerCommission +
    municipalArrears;

  const projectedNetProfit = (deal?.targetExitPrice || 0) - totalProjectCost;
  const netProjectROI = totalProjectCost > 0 ? (projectedNetProfit / totalProjectCost) * 100 : 0;
  const loanToCost = totalProjectCost > 0 ? (capitalRequested / totalProjectCost) * 100 : 0;

  const [copiedPitchWhatsApp, setCopiedPitchWhatsApp] = useState(false);

  const pitchWhatsAppText = useMemo(() => {
    if (!deal) return '';
    return formatProposalPitchForWhatsApp({
      deal: {
        ...deal,
        auctioneerCommission,
        municipalArrears,
        isSection13Eligible: deal.isSection13Eligible,
      },
      strategy: pitchStrategy,
      capitalRequested,
      fundingOfferType,
      offeredRate,
      securityType,
      investorProfile,
    });
  }, [deal, pitchStrategy, capitalRequested, fundingOfferType, offeredRate, securityType, investorProfile, auctioneerCommission, municipalArrears]);

  const handleCopyPitchWhatsApp = async () => {
    if (!pitchWhatsAppText) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(pitchWhatsAppText);
      }
    } catch {
      // Ignore clipboard permission restrictions in headless/sandboxed browsers
    }
    setCopiedPitchWhatsApp(true);
    setTimeout(() => setCopiedPitchWhatsApp(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Proposal Generator"
        subtitle="Professional one-page executive tear-sheet to pitch deals to private lenders and JV partners"
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPitchWhatsApp}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Copy private lender pitch formatted for WhatsApp to clipboard"
            >
              {copiedPitchWhatsApp ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Copy className="w-4 h-4 text-emerald-100" />
              )}
              <span>{copiedPitchWhatsApp ? 'Copied Pitch!' : 'WhatsApp Pitch'}</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(pitchWhatsAppText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm transition-colors"
              title="Share pitch directly via WhatsApp Web/App"
            >
              <Share2 className="w-4 h-4 text-white" />
            </a>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print / Export PDF</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Deal Selector & Terms Customizer (Hidden on Print) */}
        <div className="no-print bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Select Deal & Tailor Pitch Terms</h3>
              <p className="text-xs text-slate-500">
                Choose an opportunity, flip project, or portfolio rental to render the executive pitch tear-sheet.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700">Active Pitch Deal:</label>
              <select
                value={selectedDealId}
                onChange={(e) => {
                  setSelectedDealId(e.target.value);
                  const selected = allDeals.find((d) => d.id === e.target.value);
                  if (selected) {
                    const selHold = selected.strategy === 'Flip' ? (selected.monthlyHoldingCost || 0) * (selected.holdingDurationMonths || 6) : 0;
                    const selAuction = selected.auctioneerCommission || 0;
                    const selArrears = selected.municipalArrears || 0;
                    const selTotal = selected.purchasePrice + selected.acquisitionCosts + selected.renovationBudget + selHold + selAuction + selArrears;
                    setCapitalRequested(
                      selected.fundingRequiredZAR ?? Math.round(selTotal * 0.7)
                    );
                  }
                }}
                className="text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white shadow-xs text-slate-900"
              >
                {allDeals.map((d) => {
                  let badge = '';
                  if (d.type === 'rental') {
                    badge = '[STABILIZED RENTAL]';
                  } else {
                    const stratTag = d.strategy?.toUpperCase() || (d.type === 'flip' ? 'FLIP' : 'RENTAL');
                    const srcTag = d.source ? ` • ${d.source}` : '';
                    badge = `[${stratTag}${srcTag}]`;
                  }
                  return (
                    <option key={d.id} value={d.id}>
                      {badge} {d.title} ({d.city})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Capital Facility Requested</label>
              <input
                type="number"
                step="50000"
                value={capitalRequested}
                onChange={(e) => setCapitalRequested(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Return Structure</label>
              <select
                value={fundingOfferType}
                onChange={(e) => setFundingOfferType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Fixed Interest">Fixed Interest Coupon</option>
                <option value="Profit Share">Equity / Profit Split</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Offered Return Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={offeredRate}
                onChange={(e) => setOfferedRate(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Security Offered</label>
              <input
                type="text"
                value={securityType}
                onChange={(e) => setSecurityType(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Strategy Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Pitch Strategy:</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPitchStrategy('Flip')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pitchStrategy === 'Flip'
                      ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🔄</span>
                  <span>Buy & Flip</span>
                  {pitchStrategy === 'Flip' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                </button>
                <button
                  type="button"
                  onClick={() => setPitchStrategy('Rental')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pitchStrategy === 'Rental'
                      ? 'bg-white text-indigo-800 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🏠</span>
                  <span>Buy & Hold Rental</span>
                  {pitchStrategy === 'Rental' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                </button>
                <button
                  type="button"
                  onClick={() => setPitchStrategy('BRRRR')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pitchStrategy === 'BRRRR'
                      ? 'bg-white text-purple-800 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>⚡</span>
                  <span>Hybrid BRRRR</span>
                  {pitchStrategy === 'BRRRR' && <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>}
                </button>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">
              {pitchStrategy === 'Flip'
                ? `Models ${holdingDuration}-month carrying cost burn rate & liquid escrow reserve.`
                : 'Models 20/30-year compounding rental cash flow & bond amortization.'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-2">
            <div className="text-[11px] text-slate-500">
              {deal.primaryFunderName ? (
                <span>
                  Assigned Lead Funder: <strong className="text-slate-800">{deal.primaryFunderName}</strong>{' '}
                  <span className="text-slate-400">({deal.primaryFunderContact || 'Syndicate Lead'})</span>
                </span>
              ) : (
                <span>No lead funder locked in yet. Pitch terms will update the deal&apos;s funding campaign.</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveTermsToDeal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              {isSavedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Saved to Deal!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Terms to Deal</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Printable Executive Pitch Proposal Tear-Sheet */}
        {deal && (
          <div
            id="proposal-document"
            className="bg-white rounded-xl border border-slate-200 shadow-md p-4 sm:p-8 md:p-12 text-slate-900 space-y-8 print:border-none print:shadow-none print:p-0"
          >
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-6 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[11px] uppercase tracking-widest font-black text-emerald-700">
                    Confidential Investment Memorandum
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                    South Africa (ZAR)
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isFlip 
                      ? 'bg-amber-50 text-amber-800 border-amber-200' 
                      : pitchStrategy === 'BRRRR'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  }`}>
                    {isFlip ? '🔄 Buy & Flip Mandate' : pitchStrategy === 'BRRRR' ? '⚡ Hybrid BRRRR Strategy' : '🏠 Buy & Hold Rental'}
                  </span>
                  {deal.source && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                      Channel: {deal.source}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                  {deal.title}
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {deal.address}, {deal.city}, South Africa
                </p>
                <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    Sponsor: {investorProfile.entityName}
                  </span>
                  {investorProfile.tradingAs && (
                    <span className="text-slate-500">
                      (T/A {investorProfile.tradingAs})
                    </span>
                  )}
                  <span>•</span>
                  <span className="font-mono text-slate-600">
                    Reg: {investorProfile.registrationOrId}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                {investorProfile.logoBase64 && getSafeLogoUri(investorProfile.logoBase64) ? (
                  <div className="mb-2 sm:ml-auto max-h-12 max-w-[170px] flex items-center justify-end">
                    <img
                      src={getSafeLogoUri(investorProfile.logoBase64)}
                      alt={investorProfile.entityName}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="max-h-12 max-w-[170px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">
                    {investorProfile.tradingAs || investorProfile.entityName}
                  </div>
                )}
                <div className="text-[11px] font-semibold text-slate-700">
                  {investorProfile.contactNumber}
                </div>
                <div className="text-[11px] text-slate-500">
                  {investorProfile.email}
                </div>
                {investorProfile.website && (
                  <div className="text-[10px] text-indigo-600">
                    {investorProfile.website}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-1">
                  Issued: {formatDate(new Date().toISOString())}
                </div>
              </div>
            </div>

            {/* Executive Key Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Purchase Price</span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {formatZAR(deal.purchasePrice)}
                </span>
                <span className="text-[9px] text-slate-500">Agreed contract</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-300">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Built-in Equity</span>
                <span className="text-sm font-extrabold text-emerald-900 block mt-0.5">
                  {formatZAR(deal.builtInEquity || 0)}
                </span>
                <span className="text-[9px] text-emerald-700 font-semibold">
                  {deal.builtInEquityPercent != null && deal.builtInEquityPercent > 0
                    ? `+${formatPercent(deal.builtInEquityPercent)} Below Valuation`
                    : 'Capital Upside'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Acquisition Costs</span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {formatZAR(deal.acquisitionCosts)}
                </span>
                <span className="text-[9px] text-slate-500">SARS duty & legal</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">BOQ Renovation</span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {formatZAR(deal.renovationBudget)}
                </span>
                <span className="text-[9px] text-slate-500">Fixed quote basis</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Exit Price</span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {formatZAR(deal.targetExitPrice)}
                </span>
                <span className="text-[9px] text-slate-500">Comparable CMA</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Projected Net Profit</span>
                <span className="text-sm font-extrabold text-emerald-900 block mt-0.5">
                  {formatZAR(projectedNetProfit)}
                </span>
                <span className="text-[9px] text-emerald-700 font-semibold">After all capex</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-900 text-white border border-emerald-950">
                <span className="text-[10px] uppercase font-bold text-emerald-200 block">Project ROI</span>
                <span className="text-sm font-extrabold text-white block mt-0.5">
                  {formatPercent(netProjectROI)}
                </span>
                <span className="text-[9px] text-emerald-200">On total capital</span>
              </div>
            </div>

            {/* Investment Opportunity & Business Case */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-1">
                <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900">
                  1. Executive Opportunity Summary & Sponsor Mandate
                </h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {deal.source === 'High-Street Auction' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      ⚡ 10% Cash Deposit Fall-of-Hammer • 21-Day Bank Guarantee
                    </span>
                  )}
                  {deal.source === 'Distressed Sale / Repo' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                      🛡️ Bank Repo Foreclosure • Section 118 Rates Clearance
                    </span>
                  )}
                  {deal.source === 'iGrow Rentals' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      🏢 Turnkey Developer Stock • Section 13sex Eligible • R0 Transfer Duty
                    </span>
                  )}
                  {deal.source === 'Direct Owner' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1">
                      🤝 Off-Market Sourcing • Zero Agent Commission
                    </span>
                  )}
                  {deal.source === 'Private Agent' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                      📋 Compliant OTP • Verified Deeds Office CMA Comps
                    </span>
                  )}
                  {deal.type === 'rental' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-300 flex items-center gap-1">
                      💼 Stabilized Portfolio Asset • In-Place Paying Tenancy
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {deal.source === 'High-Street Auction' ? (
                  <>The sponsor has secured competitive bidding position for <strong>{deal.address}, {deal.city}</strong> on auction block at a significant discount below open market valuation. Private equity / bridge funding will secure the mandatory 10% fall-of-hammer cash deposit and 21-day balance guarantees, unlocking rapid capital uplift through targeted value-add renovations.</>
                ) : deal.source === 'Distressed Sale / Repo' ? (
                  <>The sponsor has negotiated an urgent distressed acquisition for <strong>{deal.address}, {deal.city}</strong> under bank foreclosure / distressed liquidation terms. All municipal Section 118 clearance arrears have been factored into the project outlay, creating substantial built-in equity from day one.</>
                ) : deal.source === 'iGrow Rentals' ? (
                  <>The sponsor is acquiring brand-new turnkey sectional title development stock at <strong>{deal.address}, {deal.city}</strong>. Sourced directly via iGrow, this asset incurs <strong>R0 SARS Transfer Duty</strong> (VAT inclusive in developer price), qualifies for accelerated <strong>Section 13sex tax write-offs</strong>, and benefits from professional managing agent placement.</>
                ) : deal.source === 'Direct Owner' ? (
                  <>The sponsor has proprietary off-market access to <strong>{deal.address}, {deal.city}</strong> through direct seller negotiation. Eliminating traditional estate agency commission overhead allows for deep pricing discounts and clean transactional settlement terms.</>
                ) : deal.type === 'rental' ? (
                  <>The sponsor is pitching the seasoned, cash-flowing stabilized rental asset located at <strong>{deal.address}, {deal.city}</strong>. The property maintains strong in-place tenancy, generating predictable monthly yields with established municipal and body corporate records.</>
                ) : (
                  <>The sponsor has secured the high-value property located at <strong>{deal.address}, {deal.city}</strong> below market value via registered estate agent mandate. The asset presents an immediate opportunity to create substantial capital value through strategic modernization, leveraging verified trade suppliers (Builders Warehouse, Plumblink, Tile Africa) and experienced master contractors.</>
                )}
              </p>

              {/* Qualitative Location & Amenity Scorecard */}
              {deal.amenityScorecard && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Location & Infrastructure Node Assessment
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ⭐ {deal.amenityScorecard.compositeGrade} ({deal.amenityScorecard.compositeScore}/12 Points)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Schools</span>
                        <span className="font-bold text-slate-800 text-xs">{deal.amenityScorecard.schools}</span>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Police (SAPS)</span>
                        <span className="font-bold text-slate-800 text-xs">{deal.amenityScorecard.policeStation}</span>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Hospital / Clinic</span>
                        <span className="font-bold text-slate-800 text-xs">{deal.amenityScorecard.medicalClinic}</span>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Shopping Mall</span>
                        <span className="font-bold text-slate-800 text-xs">{deal.amenityScorecard.shoppingMall}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {deal.notes && (
                <div className="p-3 rounded-lg bg-slate-50 border-l-4 border-emerald-600 text-xs text-slate-700 font-medium italic">
                  &ldquo;{deal.notes}&rdquo;
                </div>
              )}
              {investorProfile.bioSummary && (
                <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-xs text-slate-700 leading-relaxed space-y-1">
                  <div className="font-bold text-emerald-950 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Sponsor Background & Investment Mandate ({investorProfile.entityName})
                  </div>
                  <p className="text-slate-600">{investorProfile.bioSummary}</p>
                </div>
              )}
            </div>

            {/* Capital Requirement & Use of Funds */}
            <div className="space-y-3">
              <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900 border-b border-slate-200 pb-1">
                2. Capital Requirements & Use of Funds
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Tranche Description</th>
                      <th className="p-2.5">Allocation (ZAR)</th>
                      <th className="p-2.5">% of Total</th>
                      <th className="p-2.5">Disbursement Schedule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr>
                      <td className="p-2.5 font-medium">
                        {deal.source === 'High-Street Auction'
                          ? 'Knockdown Bid Price (Fall of the Hammer)'
                          : deal.source === 'iGrow Rentals'
                          ? 'Developer Unit Acquisition (VAT Inclusive)'
                          : deal.source === 'Distressed Sale / Repo'
                          ? 'Bank Distressed Settlement Price'
                          : deal.type === 'rental'
                          ? 'Stabilized Property Valuation / Asset Basis'
                          : 'Property Acquisition (Purchase Price)'}
                      </td>
                      <td className="p-2.5 font-bold">{formatZAR(deal.purchasePrice)}</td>
                      <td className="p-2.5">{formatPercent((deal.purchasePrice / totalProjectCost) * 100)}</td>
                      <td className="p-2.5 text-slate-500">
                        {deal.source === 'High-Street Auction'
                          ? '10% Immediate Deposit + 21-Day Guarantees'
                          : 'Deeds Office Lodgement'}
                      </td>
                    </tr>
                    {auctioneerCommission > 0 && (
                      <tr className="bg-amber-50/50">
                        <td className="p-2.5 font-medium text-amber-950 flex items-center gap-1.5 flex-wrap">
                          <span>Auctioneer's Commission (Buyer's Premium 10% + 15% VAT)</span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                            Auction Surcharge
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-amber-900">{formatZAR(auctioneerCommission)}</td>
                        <td className="p-2.5 text-amber-900">{totalProjectCost > 0 ? formatPercent((auctioneerCommission / totalProjectCost) * 100) : '0%'}</td>
                        <td className="p-2.5 text-slate-500">Payable to auction house on fall of hammer</td>
                      </tr>
                    )}
                    {municipalArrears > 0 && (
                      <tr className="bg-rose-50/50">
                        <td className="p-2.5 font-medium text-rose-950 flex items-center gap-1.5 flex-wrap">
                          <span>Municipal Section 118 Rates Clearance Arrears</span>
                          <span className="text-[10px] bg-rose-100 text-rose-900 font-bold px-1.5 py-0.2 rounded border border-rose-200">
                            Statutory Clearance
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-rose-900">{formatZAR(municipalArrears)}</td>
                        <td className="p-2.5 text-rose-900">{totalProjectCost > 0 ? formatPercent((municipalArrears / totalProjectCost) * 100) : '0%'}</td>
                        <td className="p-2.5 text-slate-500">City Council clearance certificate requirement</td>
                      </tr>
                    )}
                    <tr>
                      <td className="p-2.5 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>
                          {deal.source === 'iGrow Rentals'
                            ? 'Conveyancing Legal Fees & Registration'
                            : 'SARS Transfer Duty & Conveyancing Legal Fees'}
                        </span>
                        {deal.source === 'iGrow Rentals' && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                            R0 SARS Transfer Duty (VAT Incl.)
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold">{formatZAR(deal.acquisitionCosts)}</td>
                      <td className="p-2.5">{formatPercent((deal.acquisitionCosts / totalProjectCost) * 100)}</td>
                      <td className="p-2.5 text-slate-500">On Contract Signing (Conveyancers)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>
                          {deal.renovationBudget === 0
                            ? 'Turnkey Delivery (Zero Renovation Capex Required)'
                            : 'Bill of Quantities (BOQ) Renovation & Materials'}
                        </span>
                        {deal.renovationBudget === 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                            Turnkey Delivery
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold">{formatZAR(deal.renovationBudget)}</td>
                      <td className="p-2.5">{totalProjectCost > 0 ? formatPercent((deal.renovationBudget / totalProjectCost) * 100) : '0%'}</td>
                      <td className="p-2.5 text-slate-500">
                        {deal.renovationBudget === 0 ? 'Brand-new developer snag warranty' : 'Milestone Tranches (1st Fix / Finishes)'}
                      </td>
                    </tr>
                    {isFlip && (
                      <tr className="bg-amber-50/50">
                        <td className="p-2.5 font-medium text-amber-950 flex items-center gap-1.5 flex-wrap">
                          <span>Holding Period Carrying Costs & Operational Burn Reserve</span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                            {holdingDuration} Months
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-amber-900">{formatZAR(totalHoldingReserve)}</td>
                        <td className="p-2.5 text-amber-900">{totalProjectCost > 0 ? formatPercent((totalHoldingReserve / totalProjectCost) * 100) : '0%'}</td>
                        <td className="p-2.5 text-slate-600 font-medium">
                          Escrow buffer ({formatZAR(monthlyBurnRate)}/mo)
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2.5">Total Project Capital Outlay</td>
                      <td className="p-2.5 text-emerald-800">{formatZAR(totalProjectCost)}</td>
                      <td className="p-2.5">100.0%</td>
                      <td className="p-2.5 text-slate-700">
                        {isFlip ? `${holdingDuration}-Month Flip Horizon` : 'Full Project Horizon'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deal Source Contextual Callouts */}
              {deal.source === 'High-Street Auction' && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Auction Terms & Settlement Mechanics:</span>
                    <span>
                      High-Street auctions require an immediate 10% non-refundable cash deposit (R{Math.round(deal.purchasePrice * 0.1).toLocaleString('en-ZA')}) plus auctioneer commission payable on the fall of the hammer. The 90% balance must be secured via bank or private facility guarantee within 21 days.
                    </span>
                  </div>
                </div>
              )}

              {deal.source === 'iGrow Rentals' && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">SARS Section 13sex Tax Shield & Rental Guarantee:</span>
                    <span>
                      Purchased directly from a VAT-registered developer, this asset attracts zero SARS transfer duty. Under Section 13sex, corporate and individual investors can claim a 5% annual building deduction (R{Math.round(deal.purchasePrice * 0.55 * 0.05).toLocaleString('en-ZA')}/year over 20 years), with tenant vetting and lease administration managed via iGrow / WeconnectU.
                    </span>
                  </div>
                </div>
              )}

              {/* Campaign Progress Sub-Row */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Target Capital Raise
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {formatZAR(deal.fundingRequiredZAR || capitalRequested)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Capital Secured to Date
                  </span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {formatZAR(deal.capitalRaisedZAR || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">
                    Remaining Tranche Open
                  </span>
                  <span className="font-extrabold text-amber-700 text-sm">
                    {formatZAR(Math.max(0, (deal.fundingRequiredZAR || capitalRequested) - (deal.capitalRaisedZAR || 0)))}
                  </span>
                </div>
                {deal.primaryFunderName && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Lead Syndicate Funder
                    </span>
                    <span className="font-bold text-slate-800">
                      {deal.primaryFunderName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Proposed Lender / JV Partner Financing Terms */}
            <div className="space-y-3">
              <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900 border-b border-slate-200 pb-1">
                3. Proposed Lender / Partner Return Structure
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Facility Principal:</span>
                    <strong className="text-slate-900 text-sm">{formatZAR(capitalRequested)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Loan-to-Cost (LTC):</span>
                    <strong className="text-slate-900">{formatPercent(loanToCost)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Proposed Return:</span>
                    <strong className="text-emerald-800 text-sm">
                      {offeredRate}% {fundingOfferType === 'Fixed Interest' ? 'p.a. Fixed Interest' : 'Net Profit Split'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Coupon Payout:</span>
                    <strong className="text-slate-800">
                      {fundingOfferType === 'Fixed Interest' ? 'Monthly in advance' : 'At property transfer'}
                    </strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Security / Collateral:</span>
                    <strong className="text-slate-900 text-right">{securityType}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Target Maturity / Exit:</span>
                    <strong className="text-slate-900">{formatDate(deal.completionDate)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Projected Lender Payout:</span>
                    <strong className="text-emerald-700 text-sm">
                      {fundingOfferType === 'Fixed Interest'
                        ? formatZAR(capitalRequested + (capitalRequested * (offeredRate / 100) * 0.5))
                        : formatZAR(capitalRequested + (projectedNetProfit * (offeredRate / 100)))}
                    </strong>
                  </div>
                </div>
              </div>

              {deal.primaryFunderName && (
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      Lead Funder Committed:
                    </span>
                    <strong className="text-slate-900">{deal.primaryFunderName}</strong>{' '}
                    <span className="text-slate-500">({deal.primaryFunderContact || 'Syndicate Lead'})</span>
                  </div>
                  {deal.coFundersNotes && (
                    <div className="text-[11px] text-slate-600">
                      Co-investors: {deal.coFundersNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Strategy-Adaptive Section 4: Holding Period Carrying Costs (Flip) OR Long-Term Projections (Rental/BRRRR) */}
            {isFlip ? (
              <div className="space-y-4 print:break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900">
                      4. Holding Period Carrying Costs & Renovation Burn Rate ({holdingDuration}-Month Horizon)
                    </h2>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">
                      Flip Liquidity Reserve
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Monthly Burn: {formatZAR(monthlyBurnRate)}/mo • {holdingDuration} Months Holding
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  During the active stripout, construction, and staging cycle, the property generates zero tenant revenue. To eliminate insolvency and completion risk, the project capitalizes an itemized carrying cost escrow of <strong>{formatZAR(totalHoldingReserve)}</strong> covering debt service, municipal rates, body corporate levies, and on-site builder risk insurance for the full {holdingDuration}-month flip horizon.
                </p>

                {/* 4 Summary Highlight Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Monthly Operational Burn</span>
                    <span className="text-sm font-extrabold text-slate-900 block mt-0.5 font-mono">
                      {formatZAR(monthlyBurnRate)}/mo
                    </span>
                    <span className="text-[9px] text-slate-400">All standing carrying lines</span>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-300">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">Total Holding Reserve</span>
                    <span className="text-sm font-extrabold text-amber-900 block mt-0.5 font-mono">
                      {formatZAR(totalHoldingReserve)}
                    </span>
                    <span className="text-[9px] text-amber-700 font-semibold">{holdingDuration}-month pre-funded buffer</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Flip Horizon</span>
                    <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                      {holdingDuration} Months
                    </span>
                    <span className="text-[9px] text-slate-400">Target exit: {formatDate(deal.completionDate)}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Lender Risk Protection</span>
                    <span className="text-sm font-extrabold text-emerald-900 block mt-0.5">
                      Ring-Fenced Escrow
                    </span>
                    <span className="text-[9px] text-emerald-700 font-semibold">Zero monthly out-of-pocket</span>
                  </div>
                </div>

                {/* Itemized Carrying Cost Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Carrying Cost Component</th>
                        <th className="p-2.5">Monthly Outlay (ZAR)</th>
                        <th className="p-2.5">{holdingDuration}-Month Reserve (ZAR)</th>
                        <th className="p-2.5">% of Burn</th>
                        <th className="p-2.5">Obligation & Statutory Mandate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      <tr>
                        <td className="p-2.5 font-medium">Interim Bond / Debt Facility Interest Service</td>
                        <td className="p-2.5 font-bold font-mono">{formatZAR(monthlyBond)}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{formatZAR(monthlyBond * holdingDuration)}</td>
                        <td className="p-2.5">{totalHoldingReserve > 0 ? formatPercent(((monthlyBond * holdingDuration) / totalHoldingReserve) * 100) : '0%'}</td>
                        <td className="p-2.5 text-slate-500">Senior mortgage or bridge facility interest during works</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Body Corporate / HOA Levies</td>
                        <td className="p-2.5 font-bold font-mono">{formatZAR(monthlyLevies)}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{formatZAR(monthlyLevies * holdingDuration)}</td>
                        <td className="p-2.5">{totalHoldingReserve > 0 ? formatPercent(((monthlyLevies * holdingDuration) / totalHoldingReserve) * 100) : '0%'}</td>
                        <td className="p-2.5 text-slate-500">
                          {monthlyLevies === 0 ? 'Freehold standalone title (R0 levies)' : 'Sectional title scheme statutory levies'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Municipal Rates & Taxes (City Council)</td>
                        <td className="p-2.5 font-bold font-mono">{formatZAR(monthlyRates)}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{formatZAR(monthlyRates * holdingDuration)}</td>
                        <td className="p-2.5">{totalHoldingReserve > 0 ? formatPercent(((monthlyRates * holdingDuration) / totalHoldingReserve) * 100) : '0%'}</td>
                        <td className="p-2.5 text-slate-500">Statutory municipal property rates & refuse service</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Site Operational Burn & Builder&apos;s Risk Insurance</td>
                        <td className="p-2.5 font-bold font-mono">{formatZAR(monthlyOther)}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{formatZAR(monthlyOther * holdingDuration)}</td>
                        <td className="p-2.5">{totalHoldingReserve > 0 ? formatPercent(((monthlyOther * holdingDuration) / totalHoldingReserve) * 100) : '0%'}</td>
                        <td className="p-2.5 text-slate-500">Active perimeter security, contractor insurance, and utilities</td>
                      </tr>
                      <tr className="bg-amber-50/70 font-bold">
                        <td className="p-2.5 text-amber-950">Total Carrying Cost Reserve (Escrow Tranche)</td>
                        <td className="p-2.5 text-amber-950 font-mono">{formatZAR(monthlyBurnRate)}/mo</td>
                        <td className="p-2.5 text-amber-950 font-mono">{formatZAR(totalHoldingReserve)}</td>
                        <td className="p-2.5 text-amber-950">100.0%</td>
                        <td className="p-2.5 text-amber-900 font-semibold">Pre-funded and capitalized into Total Project Outlay</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : pitchStrategy === 'BRRRR' ? (
              <div className="space-y-4 print:break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900">
                      4. Hybrid BRRRR Strategy: 2-Phase Refinance & Capital Recycling Model
                    </h2>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-300">
                      ⚡ BRRRR Lifecycle
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Phase 1 Execution (0-6 Mo) → Phase 2 Bank Refinance (Mo 6-9)
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  The BRRRR (Buy, Rehab, Rent, Refinance, Repeat) strategy forces substantial capital appreciation through cosmetic and structural modernization. Upon tenant stabilization, a Tier-1 South African commercial bank issues a new long-term mortgage bond against the higher After-Repair Value (ARV). The cash proceeds from the bank bond are utilized to repay private investor capital in full, allowing the sponsor to retain the asset indefinitely with minimal to zero net equity trapped.
                </p>

                {/* 4-Step Process Pipeline */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">1. Buy (Discounted)</div>
                    <div className="font-extrabold text-slate-900 text-xs mt-0.5">{formatZAR(deal.purchasePrice)}</div>
                    <div className="text-[9px] text-slate-500">Agreed contract price</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-[10px] uppercase font-bold text-amber-700">2. Rehab (Value-Add)</div>
                    <div className="font-extrabold text-amber-900 text-xs mt-0.5">{formatZAR(deal.renovationBudget)}</div>
                    <div className="text-[9px] text-amber-700">Modernize to high-spec</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                    <div className="text-[10px] uppercase font-bold text-indigo-700">3. Rent (Stabilize)</div>
                    <div className="font-extrabold text-indigo-900 text-xs mt-0.5">{formatZAR(deal.monthlyRent || Math.round(deal.purchasePrice * 0.009))}/mo</div>
                    <div className="text-[9px] text-indigo-700">Vetted tenant placed</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300">
                    <div className="text-[10px] uppercase font-bold text-emerald-800">4. Refi & Return</div>
                    <div className="font-extrabold text-emerald-900 text-xs mt-0.5">
                      {formatZAR(Math.round((deal.targetExitPrice || Math.round(deal.purchasePrice * 1.35)) * 0.75))}
                    </div>
                    <div className="text-[9px] text-emerald-700 font-semibold">Repay lender capital</div>
                  </div>
                </div>

                {/* Refinance Economics Metric Cards */}
                {(() => {
                  const postRehabArv = deal.targetExitPrice || Math.round(deal.purchasePrice * 1.35);
                  const refiLtvPercent = 75;
                  const newBankMortgage = Math.round(postRehabArv * (refiLtvPercent / 100));
                  const totalCapitalInvested = totalProjectCost;
                  const capitalExtracted = Math.min(totalCapitalInvested, newBankMortgage);
                  const netEquityTrapped = Math.max(0, totalCapitalInvested - newBankMortgage);
                  const monthlyRefiBond = Math.round(newBankMortgage * 0.0108); // ~11.75% 20y bond factor
                  const netRentalCashflowPostRefi = (deal.monthlyRent || Math.round(deal.purchasePrice * 0.009)) - (monthlyRefiBond + monthlyLevies + monthlyRates);

                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Day-1 Outlay</span>
                          <span className="text-sm font-extrabold text-slate-900 block mt-0.5 font-mono">
                            {formatZAR(totalCapitalInvested)}
                          </span>
                          <span className="text-[9px] text-slate-400">All acquisition + capex</span>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                          <span className="text-[10px] uppercase font-bold text-purple-800 block">Post-Rehab Bank ARV</span>
                          <span className="text-sm font-extrabold text-purple-900 block mt-0.5 font-mono">
                            {formatZAR(postRehabArv)}
                          </span>
                          <span className="text-[9px] text-purple-700 font-semibold">Re-appraised valuation</span>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Bank Refinance Facility</span>
                          <span className="text-sm font-extrabold text-emerald-900 block mt-0.5 font-mono">
                            {formatZAR(newBankMortgage)}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-semibold">{refiLtvPercent}% LTV bond payout</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900 text-white border border-slate-950">
                          <span className="text-[10px] uppercase font-bold text-slate-300 block">Net Capital Left in Deal</span>
                          <span className="text-sm font-extrabold text-emerald-400 block mt-0.5 font-mono">
                            {netEquityTrapped <= 0 ? 'R 0 (Infinite ROI)' : formatZAR(netEquityTrapped)}
                          </span>
                          <span className="text-[9px] text-slate-300">
                            {netEquityTrapped <= 0 ? '100% Capital Recycled' : `${formatPercent(((totalCapitalInvested - netEquityTrapped) / totalCapitalInvested) * 100)} Recycled`}
                          </span>
                        </div>
                      </div>

                      {/* 2-Phase Comparison Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="p-2.5">BRRRR Milestone Tranche</th>
                              <th className="p-2.5">Amount (ZAR)</th>
                              <th className="p-2.5">Capital Source</th>
                              <th className="p-2.5">Investor Impact & Liquidity Milestone</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-800">
                            <tr>
                              <td className="p-2.5 font-semibold">Phase 1: Total Initial Capital Deployed</td>
                              <td className="p-2.5 font-bold font-mono">{formatZAR(totalCapitalInvested)}</td>
                              <td className="p-2.5 text-slate-600">Private Lender Facility + Sponsor Equity</td>
                              <td className="p-2.5 text-slate-600">Fund acquisition, BOQ renovation, and carrying buffer</td>
                            </tr>
                            <tr className="bg-purple-50/40">
                              <td className="p-2.5 font-semibold text-purple-950">Phase 2: Post-Rehab Bank Mortgage Refinance</td>
                              <td className="p-2.5 font-bold font-mono text-purple-900">{formatZAR(newBankMortgage)}</td>
                              <td className="p-2.5 text-purple-900 font-medium">Tier-1 Commercial Bank (75% LTV)</td>
                              <td className="p-2.5 text-slate-600">Replaces short-term private bridge facility with 20-year term debt</td>
                            </tr>
                            <tr className="bg-emerald-50/70 font-bold">
                              <td className="p-2.5 text-emerald-950">Lender Principal Repayment Tranche</td>
                              <td className="p-2.5 text-emerald-950 font-mono">{formatZAR(capitalRequested)}</td>
                              <td className="p-2.5 text-emerald-900">Refinance Proceeds Drawdown</td>
                              <td className="p-2.5 text-emerald-900">
                                100% of Private Lender Principal + Return settled in full from bank refinance
                              </td>
                            </tr>
                            <tr className="bg-slate-50">
                              <td className="p-2.5 font-semibold">Post-Refinance Net Monthly Cash Flow</td>
                              <td className={`p-2.5 font-bold font-mono ${netRentalCashflowPostRefi >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {formatZAR(netRentalCashflowPostRefi)}/mo
                              </td>
                              <td className="p-2.5 text-slate-600">Tenant Rental Income</td>
                              <td className="p-2.5 text-slate-600">
                                After R{monthlyRefiBond.toLocaleString('en-ZA')} new bond, levies (R{monthlyLevies.toLocaleString('en-ZA')}), and rates (R{monthlyRates.toLocaleString('en-ZA')})
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-3 print:break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900">
                      4. Long-Term Wealth & Equity Projections ({projectionData.length}-Year Horizon)
                    </h2>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200">
                      🏠 Buy & Hold Rental
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Assumptions: {deal.annualCapitalGrowthPercent ?? 5}% Capital • {deal.annualRentalEscalationPercent ?? 6}% Rent Escalation
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Projected asset valuation, net equity accumulation, and mortgage debt amortization schedule over a {projectionData.length}-year holding horizon. Compounding rental income covers operating expenses and amortizes the outstanding mortgage bond principal to zero.
                </p>

                {/* Custom SVG Trend Chart */}
                <div className="print:border print:border-slate-300 rounded-xl overflow-hidden">
                  <LongTermProjectionChart data={projectionData} />
                </div>
              </div>
            )}

            {/* Sensitivity / Scenario Analysis Table */}
            <div className="space-y-3 print:break-inside-avoid">
              <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900 border-b border-slate-200 pb-1">
                5. Sensitivity & Scenario Analysis
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Scenario</th>
                      <th className="p-2.5">Exit Valuation (ZAR)</th>
                      <th className="p-2.5">Gross Net Profit</th>
                      <th className="p-2.5">Sponsor ROI</th>
                      <th className="p-2.5">Lender Security Cushion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    <tr className="bg-rose-50/40">
                      <td className="p-2.5 font-bold text-rose-800">Conservative (-10%)</td>
                      <td className="p-2.5">{formatZAR(deal.targetExitPrice * 0.9)}</td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {formatZAR(deal.targetExitPrice * 0.9 - totalProjectCost)}
                      </td>
                      <td className="p-2.5">{formatPercent(((deal.targetExitPrice * 0.9 - totalProjectCost) / totalProjectCost) * 100)}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">100% Principal Covered</td>
                    </tr>
                    <tr className="bg-emerald-50/40">
                      <td className="p-2.5 font-bold text-emerald-800">Base Case (Target)</td>
                      <td className="p-2.5 font-bold">{formatZAR(deal.targetExitPrice)}</td>
                      <td className="p-2.5 font-bold text-emerald-800">{formatZAR(projectedNetProfit)}</td>
                      <td className="p-2.5 font-bold text-emerald-800">{formatPercent(netProjectROI)}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">100% Principal Covered</td>
                    </tr>
                    <tr className="bg-teal-50/40">
                      <td className="p-2.5 font-bold text-teal-800">Optimistic (+10%)</td>
                      <td className="p-2.5">{formatZAR(deal.targetExitPrice * 1.1)}</td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {formatZAR(deal.targetExitPrice * 1.1 - totalProjectCost)}
                      </td>
                      <td className="p-2.5">{formatPercent(((deal.targetExitPrice * 1.1 - totalProjectCost) / totalProjectCost) * 100)}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">100% Principal Covered</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sign-off / Confidentiality Notice */}
            <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[10px] text-slate-500">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-700">
                  © {new Date().getFullYear()} {investorProfile.entityName} {investorProfile.registrationOrId ? `(Reg: ${investorProfile.registrationOrId})` : ''} • All calculations in ZAR.
                </p>
                <p>
                  {investorProfile.physicalAddress ? `${investorProfile.physicalAddress} • ` : ''}
                  Tel: {investorProfile.contactNumber} | Email: {investorProfile.email}
                </p>
                <p className="text-slate-400">
                  Private & Confidential. Prepared solely for invited private lenders and joint venture syndicate partners.
                </p>
              </div>
              <div className="flex items-center gap-6 self-end sm:self-auto shrink-0">
                <div className="border-t border-slate-400 w-36 pt-1 text-center font-semibold text-slate-700">
                  Investor Signature
                </div>
                <div className="border-t border-slate-400 w-44 pt-1 text-center font-semibold text-slate-700">
                  <div>For: {investorProfile.entityName}</div>
                  <div className="text-[9px] text-slate-400 font-normal">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProposalGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">Loading Investment Proposal...</span>
          </div>
        </div>
      }
    >
      <ProposalGeneratorContent />
    </Suspense>
  );
}

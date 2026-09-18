'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
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

export default function ProposalGeneratorPage() {
  const searchParams = useSearchParams();
  const queryDealId = searchParams.get('dealId');

  const flips = usePortfolioStore((state) => state.flips);
  const opportunities = usePortfolioStore((state) => state.opportunities);
  const suppliers = usePortfolioStore((state) => state.suppliers);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);

  // Combine Flips and Opportunities as pitch candidates
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
      targetExitPrice: f.targetExitPriceZAR,
      completionDate: f.targetCompletionDate,
      boq: f.boq,
      notes: f.notes,
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
        targetExitPrice: o.targetExitPrice,
        completionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        boq: [],
        notes: `Sourced via ${o.source}. Gross Yield: ${o.grossYield}%, Cap Rate: ${o.capRate}%`,
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

  // Proposed Investor Terms state
  const [fundingOfferType, setFundingOfferType] = useState<'Fixed Interest' | 'Profit Share'>('Fixed Interest');
  const [offeredRate, setOfferedRate] = useState<number>(14.5);
  const [securityType, setSecurityType] = useState('2nd Mortgage Bond registered over title deed');
  const [capitalRequested, setCapitalRequested] = useState<number>(
    deal ? Math.round((deal.purchasePrice + deal.acquisitionCosts + deal.renovationBudget) * 0.7) : 1000000
  );

  // Financial calculations
  const totalProjectCost = (deal?.purchasePrice || 0) + (deal?.acquisitionCosts || 0) + (deal?.renovationBudget || 0);
  const projectedNetProfit = (deal?.targetExitPrice || 0) - totalProjectCost;
  const netProjectROI = totalProjectCost > 0 ? (projectedNetProfit / totalProjectCost) * 100 : 0;
  const loanToCost = totalProjectCost > 0 ? (capitalRequested / totalProjectCost) * 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Proposal Generator"
        subtitle="Professional one-page executive tear-sheet to pitch deals to private lenders and JV partners"
        actionButton={
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Print / Export PDF
          </button>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Deal Selector & Terms Customizer (Hidden on Print) */}
        <div className="no-print bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Select Deal & Tailor Pitch Terms</h3>
              <p className="text-xs text-slate-500">
                Choose an opportunity or flip to render the executive pitch tear-sheet.
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
                    setCapitalRequested(
                      Math.round(
                        (selected.purchasePrice + selected.acquisitionCosts + selected.renovationBudget) * 0.7
                      )
                    );
                  }
                }}
                className="text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white shadow-xs text-slate-900"
              >
                {allDeals.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.type.toUpperCase()}] {d.title} ({d.city})
                  </option>
                ))}
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
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] uppercase tracking-widest font-black text-emerald-700">
                    Confidential Investment Memorandum
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                    South Africa (ZAR)
                  </span>
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
              <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900 border-b border-slate-200 pb-1">
                1. Executive Opportunity Summary & Sponsor Mandate
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                The sponsor has secured the distressed/high-value property located at{' '}
                <strong>{deal.address}, {deal.city}</strong> below market value. The asset presents an immediate
                opportunity to create substantial capital value through strategic modernization, leveraging verified
                trade suppliers (Builders Warehouse, Plumblink, Tile Africa) and experienced master contractors.
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
                      <td className="p-2.5 font-medium">Property Acquisition (Purchase Price)</td>
                      <td className="p-2.5 font-bold">{formatZAR(deal.purchasePrice)}</td>
                      <td className="p-2.5">{formatPercent((deal.purchasePrice / totalProjectCost) * 100)}</td>
                      <td className="p-2.5 text-slate-500">Deeds Office Lodgement</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">SARS Transfer Duty & Conveyancing Legal Fees</td>
                      <td className="p-2.5 font-bold">{formatZAR(deal.acquisitionCosts)}</td>
                      <td className="p-2.5">{formatPercent((deal.acquisitionCosts / totalProjectCost) * 100)}</td>
                      <td className="p-2.5 text-slate-500">On Contract Signing</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">Bill of Quantities (BOQ) Renovation & Materials</td>
                      <td className="p-2.5 font-bold">{formatZAR(deal.renovationBudget)}</td>
                      <td className="p-2.5">{formatPercent((deal.renovationBudget / totalProjectCost) * 100)}</td>
                      <td className="p-2.5 text-slate-500">Milestone Tranches (1st Fix / Finishes)</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2.5">Total Project Capital Outlay</td>
                      <td className="p-2.5 text-emerald-800">{formatZAR(totalProjectCost)}</td>
                      <td className="p-2.5">100.0%</td>
                      <td className="p-2.5 text-slate-700">Full Project Horizon</td>
                    </tr>
                  </tbody>
                </table>
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
            </div>

            {/* Sensitivity / Scenario Analysis Table */}
            <div className="space-y-3">
              <h2 className="text-sm uppercase tracking-wider font-extrabold text-slate-900 border-b border-slate-200 pb-1">
                4. Sensitivity & Scenario Analysis
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

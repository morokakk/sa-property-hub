'use client';

import React, { useState, useMemo } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { computeAcquisitionCosts, calculateSection13sex } from '@/lib/calculations/sarsTax';
import {
  calculateDealMetrics,
  computeBuiltInEquity,
  computeAmenityScore,
} from '@/lib/calculations/propertyMetrics';
import { formatOpportunityForWhatsApp } from '@/lib/whatsappFormatter';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { OpportunityDeal, DealSource, AmenityDistance, AmenityScorecard } from '@/types';
import {
  Calculator,
  PlusCircle,
  Building,
  Hammer,
  FileText,
  Trash2,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Info,
  Scale,
  Copy,
  Check,
  Share2,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  ShieldAlert,
  Stethoscope,
  ShoppingBag,
  MapPin,
  TrendingUp,
  Edit3,
} from 'lucide-react';
import Link from 'next/link';

export default function OpportunityAnalyzerPage() {
  const opportunities = usePortfolioStore((state) => state.opportunities);
  const addOpportunity = usePortfolioStore((state) => state.addOpportunity);
  const updateOpportunity = usePortfolioStore((state) => state.updateOpportunity);
  const deleteOpportunity = usePortfolioStore((state) => state.deleteOpportunity);
  const promoteOpportunityToFlip = usePortfolioStore((state) => state.promoteOpportunityToFlip);
  const promoteOpportunityToRental = usePortfolioStore((state) => state.promoteOpportunityToRental);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);

  // Form State for Deal Sourcing Calculator
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Johannesburg');
  const [province, setProvince] = useState<'Gauteng' | 'Western Cape' | 'KwaZulu-Natal' | 'Eastern Cape' | 'Free State' | 'Other'>('Gauteng');
  const [source, setSource] = useState<DealSource>('High-Street Auction');

  // Valuation vs. Purchase Price
  const [openMarketValue, setOpenMarketValue] = useState<number>(2_150_000);
  const [purchasePrice, setPurchasePrice] = useState<number>(1_800_000);
  const [rehabCost, setRehabCost] = useState<number>(200_000);
  const [monthlyRent, setMonthlyRent] = useState<number>(16_500);
  const [monthlyLevies, setMonthlyLevies] = useState<number>(1_650);
  const [monthlyRates, setMonthlyRates] = useState<number>(1_100);
  const [targetExitPrice, setTargetExitPrice] = useState<number>(2_450_000);

  // Amenity Distance State
  const [schoolsDistance, setSchoolsDistance] = useState<AmenityDistance>('0-5km');
  const [policeDistance, setPoliceDistance] = useState<AmenityDistance>('0-5km');
  const [clinicDistance, setClinicDistance] = useState<AmenityDistance>('0-5km');
  const [mallDistance, setMallDistance] = useState<AmenityDistance>('0-5km');

  // Financing
  const [loanToValue, setLoanToValue] = useState<number>(80);
  const [interestRate, setInterestRate] = useState<number>(11.75); // SA Prime Rate
  const [loanTermYears, setLoanTermYears] = useState<number>(20);

  // Manual Overrides
  const [overrideTax, setOverrideTax] = useState(false);
  const [customTransferDuty, setCustomTransferDuty] = useState<number>(0);
  const [overrideLegal, setOverrideLegal] = useState(false);
  const [customConveyancing, setCustomConveyancing] = useState<number>(0);

  // Section 13sex Tax Incentive State
  const [isSection13Eligible, setIsSection13Eligible] = useState(false);
  const [section13TaxRate, setSection13TaxRate] = useState<number>(27);

  // WhatsApp Copy Toast State
  const [copiedDealId, setCopiedDealId] = useState<string | null>(null);
  const [copiedCalc, setCopiedCalc] = useState(false);

  // Status Filter
  const [selectedDeal, setSelectedDeal] = useState<OpportunityDeal | null>(null);

  // Real-time Built-in Equity calculation
  const calculatedBuiltInEquity = useMemo(() => {
    return computeBuiltInEquity(openMarketValue, purchasePrice);
  }, [openMarketValue, purchasePrice]);

  // Real-time Amenity Scorecard calculation
  const calculatedAmenityScorecard = useMemo(() => {
    return computeAmenityScore({
      schools: schoolsDistance,
      policeStation: policeDistance,
      medicalClinic: clinicDistance,
      shoppingMall: mallDistance,
    });
  }, [schoolsDistance, policeDistance, clinicDistance, mallDistance]);

  // Real-time calculation
  const calculatedCosts = useMemo(() => {
    return computeAcquisitionCosts(purchasePrice, loanToValue, {
      customTransferDuty: overrideTax ? customTransferDuty : undefined,
      customConveyancing: overrideLegal ? customConveyancing : undefined,
    });
  }, [purchasePrice, loanToValue, overrideTax, customTransferDuty, overrideLegal, customConveyancing]);

  const calculatedMetrics = useMemo(() => {
    return calculateDealMetrics({
      purchasePrice,
      estimatedRehabCost: rehabCost,
      monthlyRentalEstimate: monthlyRent,
      monthlyLevies,
      monthlyRatesTaxes: monthlyRates,
      annualInsurance: 7_200,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
      targetExitPrice,
      holdingPeriodMonths: 6,
      loanToValuePercent: loanToValue,
      interestRatePercent: interestRate,
      loanTermYears,
      costs: calculatedCosts,
    });
  }, [
    purchasePrice,
    rehabCost,
    monthlyRent,
    monthlyLevies,
    monthlyRates,
    targetExitPrice,
    loanToValue,
    interestRate,
    loanTermYears,
    calculatedCosts,
  ]);

  // Section 13sex Tax Incentive Engine
  const calculatedSection13 = useMemo(() => {
    return calculateSection13sex(purchasePrice, section13TaxRate, isSection13Eligible);
  }, [purchasePrice, section13TaxRate, isSection13Eligible]);

  const handleCopyCurrentCalcWhatsApp = () => {
    const tempDeal: OpportunityDeal = {
      id: 'current-calc',
      title: title || `${city} Investment Opportunity`,
      address: address || `${city} Metro Corridor`,
      city,
      province,
      source,
      openMarketValueZAR: openMarketValue,
      purchasePrice,
      builtInEquityZAR: calculatedBuiltInEquity.builtInEquityZAR,
      builtInEquityPercent: calculatedBuiltInEquity.builtInEquityPercent,
      amenityScorecard: calculatedAmenityScorecard,
      estimatedRehabCost: rehabCost,
      monthlyRentalEstimate: monthlyRent,
      monthlyLevies,
      monthlyRatesTaxes: monthlyRates,
      annualInsurance: 7_200,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
      targetExitPrice,
      holdingPeriodMonths: 6,
      loanToValuePercent: loanToValue,
      interestRatePercent: interestRate,
      loanTermYears,
      costs: calculatedCosts,
      grossYield: calculatedMetrics.grossYield,
      capRate: calculatedMetrics.capRate,
      netRoi: calculatedMetrics.netRoi,
      monthlyCashFlow: calculatedMetrics.monthlyCashFlow,
      projectedFlipNetProfit: calculatedMetrics.projectedFlipNetProfit,
      projectedFlipRoi: calculatedMetrics.projectedFlipRoi,
      status: 'Analyzing',
      section13sex: isSection13Eligible ? calculatedSection13 : undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const text = formatOpportunityForWhatsApp(tempDeal, investorProfile);
    navigator.clipboard.writeText(text);
    setCopiedCalc(true);
    setTimeout(() => setCopiedCalc(false), 2500);
  };

  // Active Deal Editing State
  const [editingDealId, setEditingDealId] = useState<string | null>(null);

  const handleEditDeal = (deal: OpportunityDeal) => {
    setEditingDealId(deal.id);
    setTitle(deal.title);
    setAddress(deal.address || '');
    setCity(deal.city);
    setProvince(deal.province as any);
    setSource(deal.source);
    setOpenMarketValue(deal.openMarketValueZAR || Math.round(deal.purchasePrice * 1.2));
    setPurchasePrice(deal.purchasePrice);
    setRehabCost(deal.estimatedRehabCost || 0);
    setMonthlyRent(deal.monthlyRentalEstimate);
    setMonthlyLevies(deal.monthlyLevies);
    setMonthlyRates(deal.monthlyRatesTaxes);
    setTargetExitPrice(deal.targetExitPrice || 0);
    setLoanToValue(deal.loanToValuePercent);
    setInterestRate(deal.interestRatePercent);
    setLoanTermYears(deal.loanTermYears);
    setIsSection13Eligible(!!deal.section13sex);
    setSection13TaxRate(deal.section13sex?.taxRatePercent || 27);
    if (deal.amenityScorecard) {
      setSchoolsDistance(deal.amenityScorecard.schools);
      setPoliceDistance(deal.amenityScorecard.policeStation);
      setClinicDistance(deal.amenityScorecard.medicalClinic);
      setMallDistance(deal.amenityScorecard.shoppingMall);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingDealId(null);
    setTitle('');
    setAddress('');
  };

  const handleSaveOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert('Please enter a property or deal name.');
      return;
    }

    if (editingDealId) {
      updateOpportunity(editingDealId, {
        title,
        address: address || `${city} Asset`,
        city,
        province,
        source,
        openMarketValueZAR: openMarketValue,
        purchasePrice,
        builtInEquityZAR: calculatedBuiltInEquity.builtInEquityZAR,
        builtInEquityPercent: calculatedBuiltInEquity.builtInEquityPercent,
        amenityScorecard: calculatedAmenityScorecard,
        estimatedRehabCost: rehabCost,
        monthlyRentalEstimate: monthlyRent,
        monthlyLevies,
        monthlyRatesTaxes: monthlyRates,
        targetExitPrice,
        loanToValuePercent: loanToValue,
        interestRatePercent: interestRate,
        loanTermYears,
        customTransferDuty: overrideTax ? customTransferDuty : undefined,
        customConveyancing: overrideLegal ? customConveyancing : undefined,
        costs: calculatedCosts,
        section13sex: isSection13Eligible ? calculatedSection13 : undefined,
        grossYield: calculatedMetrics.grossYield,
        capRate: calculatedMetrics.capRate,
        netRoi: calculatedMetrics.netRoi,
        monthlyCashFlow: calculatedMetrics.monthlyCashFlow,
        projectedFlipNetProfit: calculatedMetrics.projectedFlipNetProfit,
        projectedFlipRoi: calculatedMetrics.projectedFlipRoi,
      });
      alert(`Deal "${title}" updated with new metrics!`);
      setEditingDealId(null);
      setTitle('');
      setAddress('');
      return;
    }

    const newDeal: OpportunityDeal = {
      id: `opp-${Date.now()}`,
      title,
      address: address || `${city} Asset`,
      city,
      province,
      source,
      openMarketValueZAR: openMarketValue,
      purchasePrice,
      builtInEquityZAR: calculatedBuiltInEquity.builtInEquityZAR,
      builtInEquityPercent: calculatedBuiltInEquity.builtInEquityPercent,
      amenityScorecard: calculatedAmenityScorecard,
      estimatedRehabCost: rehabCost,
      monthlyRentalEstimate: monthlyRent,
      monthlyLevies,
      monthlyRatesTaxes: monthlyRates,
      annualInsurance: 7_200,
      managementFeePercent: 8,
      vacancyRatePercent: 5,
      targetExitPrice,
      holdingPeriodMonths: 6,
      loanToValuePercent: loanToValue,
      interestRatePercent: interestRate,
      loanTermYears,
      customTransferDuty: overrideTax ? customTransferDuty : undefined,
      customConveyancing: overrideLegal ? customConveyancing : undefined,
      costs: calculatedCosts,
      section13sex: isSection13Eligible ? calculatedSection13 : undefined,
      grossYield: calculatedMetrics.grossYield,
      capRate: calculatedMetrics.capRate,
      netRoi: calculatedMetrics.netRoi,
      monthlyCashFlow: calculatedMetrics.monthlyCashFlow,
      projectedFlipNetProfit: calculatedMetrics.projectedFlipNetProfit,
      projectedFlipRoi: calculatedMetrics.projectedFlipRoi,
      status: 'Analyzing',
      createdAt: new Date().toISOString().split('T')[0],
    };

    addOpportunity(newDeal);
    setTitle('');
    setAddress('');
    alert(`Deal "${title}" added to Deal Pipeline!`);
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Opportunity Analyzer"
        subtitle="Deal-sourcing calculator with official progressive SARS transfer duty brackets and yield engines"
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Deal Calculator Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">South African Acquisition & Yield Calculator</h2>
                <p className="text-xs text-slate-500">
                  Evaluates deals from iGrow, Sheriff Auctions, Distressed Repos, or Private Agents.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> SARS 2024/2026 Brackets
            </span>
          </div>

          {editingDealId && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 text-xs shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Editing active pipeline deal: <strong>&ldquo;{title || 'Selected Deal'}&rdquo;</strong>. Modify any prices, quotes, yields, or amenities below.
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-semibold px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg shrink-0 self-start sm:self-auto transition-colors"
              >
                Cancel Edit
              </button>
            </div>
          )}

          <form onSubmit={handleSaveOpportunity} className="space-y-6">
            {/* General Property Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deal / Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Point 2-Bed Repo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 14 Somerset Road"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="Johannesburg">Johannesburg</option>
                  <option value="Cape Town">Cape Town</option>
                  <option value="Durban">Durban</option>
                  <option value="Pretoria">Pretoria</option>
                  <option value="Gqeberha">Gqeberha (PE)</option>
                  <option value="Stellenbosch">Stellenbosch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Sourcing Channel</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as DealSource)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="iGrow Rentals">iGrow Rentals (Off-Plan/Sectional)</option>
                  <option value="High-Street Auction">High-Street Auction</option>
                  <option value="Distressed Sale / Repo">Distressed Sale / Bank Repo</option>
                  <option value="Private Agent">Private Agent / MLS</option>
                  <option value="Direct Owner">Direct Owner</option>
                </select>
              </div>
            </div>

            {/* Location & Amenity Scorecard */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Location & Amenity Scorecard
                    </h3>
                    <span className="text-[10px] text-slate-500">Qualitative Macro-Accessibility & Node Proximity</span>
                  </div>
                </div>

                {/* Live Composite Grade Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Composite Grade:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs ${
                      calculatedAmenityScorecard.compositeGrade === 'A-Grade (Prime Hub)'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : calculatedAmenityScorecard.compositeGrade === 'B-Grade (Accessible)'
                        ? 'bg-teal-100 text-teal-800 border border-teal-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {calculatedAmenityScorecard.compositeGrade} ({calculatedAmenityScorecard.compositeScore}/12 Pts)
                  </span>
                </div>
              </div>

              {/* 4 Amenity Distance Pill Groups */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Schools */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Schools & Education</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {(['0-5km', '6-10km', '10+km'] as AmenityDistance[]).map((dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => setSchoolsDistance(dist)}
                        className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                          schoolsDistance === dist
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Police Station */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Police Station (SAPS)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {(['0-5km', '6-10km', '10+km'] as AmenityDistance[]).map((dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => setPoliceDistance(dist)}
                        className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                          policeDistance === dist
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Hospital / Medical Clinic */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    <span>Hospital / Medical Clinic</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {(['0-5km', '6-10km', '10+km'] as AmenityDistance[]).map((dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => setClinicDistance(dist)}
                        className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                          clinicDistance === dist
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Major Shopping Mall */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <span>Major Shopping Mall</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {(['0-5km', '6-10km', '10+km'] as AmenityDistance[]).map((dist) => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => setMallDistance(dist)}
                        className={`py-1 text-[11px] font-semibold rounded-md transition-all ${
                          mallDistance === dist
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Valuation vs. Purchase Price & Built-in Equity */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Valuation vs. Acquisition Bid
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Lightstone CMA / Bank Valuation Baseline</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Open Market Value (ZAR) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">Open Market Value (ZAR) *</label>
                    <span className="text-[10px] text-slate-400">Professional Valuation</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                    <input
                      type="number"
                      min="50000"
                      step="10000"
                      value={openMarketValue}
                      onChange={(e) => setOpenMarketValue(Number(e.target.value))}
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Target Purchase Price / Max Bid (ZAR) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">Target Purchase Price / Max Bid (ZAR) *</label>
                    <span className="text-[10px] text-slate-400">Agreed / Auction Cap</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                    <input
                      type="number"
                      min="50000"
                      step="10000"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Calculated Built-in Equity Highlight Callout */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                    calculatedBuiltInEquity.builtInEquityZAR > 0
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                      : calculatedBuiltInEquity.builtInEquityZAR === 0
                      ? 'bg-slate-100 border-slate-300 text-slate-800'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                      Built-in Equity (Capital Upside)
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        calculatedBuiltInEquity.builtInEquityZAR > 0
                          ? 'bg-emerald-200/80 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {calculatedBuiltInEquity.builtInEquityPercent >= 0 ? '+' : ''}
                      {formatPercent(calculatedBuiltInEquity.builtInEquityPercent)} Below Valuation
                    </span>
                  </div>
                  <div className="text-lg font-black mt-1">
                    {formatZAR(calculatedBuiltInEquity.builtInEquityZAR)}
                  </div>
                  <span className="text-[10px] opacity-80 block">
                    {calculatedBuiltInEquity.builtInEquityZAR > 0
                      ? 'Immediate equity cushion upon transfer'
                      : 'Target bid equals or exceeds market valuation'}
                  </span>
                </div>
              </div>
            </div>

            {/* Operational Capex, Rental & Flip Exit Projections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Renovation / Capex (ZAR)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={rehabCost}
                    onChange={(e) => setRehabCost(Number(e.target.value))}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Est. Gross Monthly Rent</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Monthly Levies (BC)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={monthlyLevies}
                    onChange={(e) => setMonthlyLevies(Number(e.target.value))}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rates & Taxes (City)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={monthlyRates}
                    onChange={(e) => setMonthlyRates(Number(e.target.value))}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Flip Exit Price</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    min="0"
                    step="25000"
                    value={targetExitPrice}
                    onChange={(e) => setTargetExitPrice(Number(e.target.value))}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-emerald-700 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Bond Finance, SARS Overrides & Section 13sex Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Financing Terms */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>Mortgage / Bond Financing</span>
                  <span className="text-[11px] text-slate-400 font-normal">0% for 100% Cash Purchase</span>
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Loan-to-Value (LTV)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={loanToValue}
                        onChange={(e) => setLoanToValue(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                      <span className="ml-1 text-xs text-slate-500">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Interest Rate (Prime)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        step="0.25"
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                      <span className="ml-1 text-xs text-slate-500">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Loan Term</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="5"
                        max="30"
                        value={loanTermYears}
                        onChange={(e) => setLoanTermYears(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                      <span className="ml-1 text-xs text-slate-500">yrs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SARS Tax & Legal Overrides */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                  <span>SARS Tax & Legal Overrides</span>
                  <span className="text-[11px] text-emerald-600 font-semibold">Automated Formulas Active</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideTax}
                        onChange={(e) => setOverrideTax(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span>Override Transfer Duty</span>
                    </label>
                    {overrideTax ? (
                      <input
                        type="number"
                        placeholder="R Amount"
                        value={customTransferDuty}
                        onChange={(e) => setCustomTransferDuty(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                    ) : (
                      <div className="text-slate-500 text-xs py-1.5 font-medium">
                        Auto SARS: <span className="font-semibold text-slate-800">{formatZAR(calculatedCosts.transferDuty)}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideLegal}
                        onChange={(e) => setOverrideLegal(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span>Override Conveyancing</span>
                    </label>
                    {overrideLegal ? (
                      <input
                        type="number"
                        placeholder="R Amount"
                        value={customConveyancing}
                        onChange={(e) => setCustomConveyancing(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                      />
                    ) : (
                      <div className="text-slate-500 text-xs py-1.5 font-medium">
                        Auto LPC: <span className="font-semibold text-slate-800">{formatZAR(calculatedCosts.conveyancingFee)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 13sex SARS Estimator Engine */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold text-slate-900">SARS Section 13sex Tax Shield</h4>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    55% Base • 20 Yrs
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSection13Eligible}
                        onChange={(e) => setIsSection13Eligible(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[11px]">Section 13sex Eligible (New / Off-plan)</span>
                    </label>

                    {isSection13Eligible && (
                      <select
                        value={section13TaxRate}
                        onChange={(e) => setSection13TaxRate(Number(e.target.value))}
                        className="text-[11px] font-semibold py-1 px-2 border border-emerald-300 rounded-md bg-white text-emerald-900"
                      >
                        <option value={27}>27% (Company/Trust)</option>
                        <option value={31}>31% (Mid Individual)</option>
                        <option value={45}>45% (Top Marginal)</option>
                      </select>
                    )}
                  </div>

                  {isSection13Eligible ? (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">55% Building Base</span>
                        <span className="font-bold text-slate-800 text-xs">
                          {formatZAR(calculatedSection13.buildingDeductionBaseZAR)}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block">Annual Write-off (5%)</span>
                        <span className="font-bold text-emerald-700 text-xs">
                          {formatZAR(calculatedSection13.annualAllowanceZAR)}/yr
                        </span>
                      </div>
                      <div className="bg-emerald-100/70 p-2 rounded-lg border border-emerald-200 col-span-2 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-emerald-900 font-medium block">
                            Annual Tax Shield Cash Savings
                          </span>
                          <span className="text-sm font-extrabold text-emerald-800">
                            +{formatZAR(calculatedSection13.annualTaxSavingsZAR)}/year
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 block">20-Yr Cumulative</span>
                          <span className="text-xs font-bold text-slate-800">
                            {formatZAR(calculatedSection13.twentyYearCumulativeSavingsZAR)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 leading-tight">
                      For new residential units acquired for letting (min 5 units). SARS allows a 55% building deduction amortized at 5% annually for 20 years.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Real-time Calculation Result Bar */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm">
              <div className="flex items-center justify-between pb-1 mb-2">
                <div className="text-xs uppercase font-semibold text-emerald-400 tracking-wider">
                  Calculated Acquisition & Returns Breakdown
                </div>
                {isSection13Eligible && (
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Sec 13sex Active: +{formatZAR(calculatedSection13.annualTaxSavingsZAR)}/yr Shield
                  </span>
                )}
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-3 ${isSection13Eligible ? 'lg:grid-cols-4 xl:grid-cols-8' : 'lg:grid-cols-4 xl:grid-cols-7'} gap-4 text-xs`}>
                <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/40">
                  <span className="text-emerald-400 block text-[10px] font-semibold">Built-in Equity</span>
                  <span className="text-sm font-extrabold text-emerald-300">{formatZAR(calculatedBuiltInEquity.builtInEquityZAR)}</span>
                  <span className="text-[10px] text-emerald-400/80 block">{calculatedBuiltInEquity.builtInEquityPercent >= 0 ? '+' : ''}{formatPercent(calculatedBuiltInEquity.builtInEquityPercent)} vs Val</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Acquisition Cost</span>
                  <span className="text-sm font-bold text-white">{formatZAR(calculatedCosts.totalAcquisitionCost)}</span>
                  <span className="text-[10px] text-slate-400 block">Duty + Deeds + Legal</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Gross Rental Yield</span>
                  <span className="text-sm font-bold text-emerald-400">{formatPercent(calculatedMetrics.grossYield)}</span>
                  <span className="text-[10px] text-slate-400 block">Annual Rent / Cost</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Cap Rate (Net Yield)</span>
                  <span className="text-sm font-bold text-teal-300">{formatPercent(calculatedMetrics.capRate)}</span>
                  <span className="text-[10px] text-slate-400 block">Net Operating Income</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Net Cashflow (p.m.)</span>
                  <span className={`text-sm font-bold ${calculatedMetrics.monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatZAR(calculatedMetrics.monthlyCashFlow)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">After Bond & Levies</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Projected Flip Profit</span>
                  <span className="text-sm font-bold text-amber-300">{formatZAR(calculatedMetrics.projectedFlipNetProfit)}</span>
                  <span className="text-[10px] text-slate-400 block">Net after commission</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Projected Flip ROI</span>
                  <span className="text-sm font-bold text-white">{formatPercent(calculatedMetrics.projectedFlipRoi)}</span>
                  <span className="text-[10px] text-slate-400 block">On invested capital</span>
                </div>
                {isSection13Eligible && (
                  <div className="bg-emerald-950/70 p-2 rounded-lg border border-emerald-500/40">
                    <span className="text-emerald-400 block text-[10px] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Sec 13sex Shield
                    </span>
                    <span className="text-sm font-bold text-emerald-300">
                      +{formatZAR(calculatedSection13.annualTaxSavingsZAR)}/yr
                    </span>
                    <span className="text-[9px] text-emerald-400/70 block">
                      20y: {formatZAR(calculatedSection13.twentyYearCumulativeSavingsZAR)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action & WhatsApp Copy Bar */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCurrentCalcWhatsApp}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                title="Format calculated deal metrics into clean WhatsApp pitch text and copy to clipboard"
              >
                {copiedCalc ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-emerald-700" />}
                <span>{copiedCalc ? 'Copied WhatsApp Deal Summary!' : 'Copy WhatsApp Summary'}</span>
              </button>

              <button
                type="submit"
                className={`${
                  editingDealId
                    ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                } text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors`}
              >
                {editingDealId ? (
                  <>
                    <Check className="w-4 h-4" /> Update Deal in Pipeline
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" /> Save Deal to Sourcing Pipeline
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Opportunity Pipeline List */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Active Deal Sourcing Pipeline</h3>
              <p className="text-xs text-slate-500">
                Track candidates, promote them to live Flips or Rentals, or generate a lender pitch proposal.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {opportunities.length} Pipeline Deals
            </span>
          </div>

          <div className="space-y-4">
            {opportunities.map((deal) => {
              const openMarket = deal.openMarketValueZAR || Math.round(deal.purchasePrice * 1.2);
              const builtInEquity = deal.builtInEquityZAR ?? (openMarket - deal.purchasePrice);
              const builtInPercent = deal.builtInEquityPercent ?? Number(((builtInEquity / openMarket) * 100).toFixed(1));
              const scorecard = deal.amenityScorecard ?? {
                schools: '0-5km' as const,
                policeStation: '0-5km' as const,
                medicalClinic: '0-5km' as const,
                shoppingMall: '0-5km' as const,
                compositeGrade: 'A-Grade (Prime Hub)' as const,
                compositeScore: 12,
              };
              const displayDeal = {
                ...deal,
                openMarketValueZAR: openMarket,
                builtInEquityZAR: builtInEquity,
                builtInEquityPercent: builtInPercent,
                amenityScorecard: scorecard,
              };

              return (
              <div
                key={deal.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Property Header */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{deal.title}</h4>
                      <span className="text-[10px] font-semibold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                        {deal.source}
                      </span>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        {deal.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {deal.address}, {deal.city} ({deal.province})
                    </p>

                    {/* Built-in Equity & Location Grade Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
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

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          scorecard.compositeGrade === 'A-Grade (Prime Hub)'
                            ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
                            : scorecard.compositeGrade === 'B-Grade (Accessible)'
                            ? 'bg-teal-100/70 text-teal-800 border-teal-300'
                            : 'bg-amber-100/70 text-amber-800 border-amber-300'
                        }`}
                      >
                        <MapPin className="w-3 h-3 text-emerald-700" />
                        {scorecard.compositeGrade} ({scorecard.compositeScore}/12)
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Operational Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start">
                    <button
                      onClick={() => {
                        const text = formatOpportunityForWhatsApp(displayDeal, investorProfile);
                        navigator.clipboard.writeText(text);
                        setCopiedDealId(deal.id);
                        setTimeout(() => setCopiedDealId(null), 2500);
                      }}
                      title="Copy WhatsApp deal summary with key metrics to clipboard"
                      className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      {copiedDealId === deal.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedDealId === deal.id ? 'Copied!' : 'WhatsApp'}</span>
                    </button>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(formatOpportunityForWhatsApp(displayDeal, investorProfile))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-emerald-700 hover:bg-emerald-100 bg-emerald-50 rounded-lg border border-emerald-300 transition-colors"
                      title="Share directly via WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleEditDeal(displayDeal)}
                      title="Load deal parameters into calculator to edit or recalculate"
                      className="px-2.5 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Deal</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Promote "${deal.title}" to Buy-and-Flip Manager?`)) {
                          promoteOpportunityToFlip(deal.id);
                        }
                      }}
                      title="Promote to Buy-and-Flip Manager"
                      className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Hammer className="w-3.5 h-3.5" />
                      <span>Promote to Flip</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Promote "${deal.title}" to Rental Portfolio?`)) {
                          promoteOpportunityToRental(deal.id);
                        }
                      }}
                      title="Promote to Rental Portfolio"
                      className="px-2.5 py-1.5 text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Building className="w-3.5 h-3.5" />
                      <span>Promote to Rental</span>
                    </button>

                    <Link
                      href={`/proposal?dealId=${deal.id}`}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Pitch Deck</span>
                    </Link>

                    <button
                      onClick={() => {
                        if (confirm(`Delete "${deal.title}" from pipeline?`)) {
                          deleteOpportunity(deal.id);
                        }
                      }}
                      title="Delete opportunity"
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Financial Metric Badges - Full Width Responsive Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 py-3 border-y border-slate-200/80 my-3 text-xs bg-white/70 px-3 rounded-lg">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Open Market Value</span>
                    <span className="font-semibold text-slate-700">{formatZAR(openMarket)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Target Purchase Bid</span>
                    <span className="font-bold text-slate-900">{formatZAR(deal.purchasePrice)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Acquisition All-in</span>
                    <span className="font-semibold text-slate-700">{formatZAR(deal.costs.totalAcquisitionCost)}</span>
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

                {/* Tax Breakdown Sub-Bar */}
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex flex-wrap items-center gap-4">
                  <span>SARS Transfer Duty: <strong className="text-slate-700">{formatZAR(deal.costs.transferDuty)}</strong></span>
                  <span>Conveyancing: <strong className="text-slate-700">{formatZAR(deal.costs.conveyancingFee)}</strong></span>
                  <span>Bond Reg: <strong className="text-slate-700">{formatZAR(deal.costs.bondRegistrationFee)}</strong></span>
                  <span>Deeds Office: <strong className="text-slate-700">{formatZAR(deal.costs.deedsOfficeFee)}</strong></span>
                  <span>Net Monthly Cashflow: <strong className={deal.monthlyCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatZAR(deal.monthlyCashFlow)}</strong></span>
                  {deal.section13sex?.isEligible && (
                    <span className="text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-semibold flex items-center gap-1 border border-emerald-200">
                      <Sparkles className="w-3 h-3 text-emerald-700" />
                      SARS Sec 13sex: +{formatZAR(deal.section13sex.annualTaxSavingsZAR)}/yr Shield (55% Base: {formatZAR(deal.section13sex.buildingDeductionBaseZAR)})
                    </span>
                  )}
                </div>

                {/* Amenity Scorecard Summary Bar */}
                <div className="mt-2 pt-2 border-t border-slate-200/40 text-[10px] text-slate-500 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    Node Proximity:
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">🏫 Schools: <strong className="text-slate-700">{scorecard.schools}</strong></span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">👮 Police: <strong className="text-slate-700">{scorecard.policeStation}</strong></span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">🏥 Hospital: <strong className="text-slate-700">{scorecard.medicalClinic}</strong></span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">🛍️ Mall: <strong className="text-slate-700">{scorecard.shoppingMall}</strong></span>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </main>
    </div>
  );
}

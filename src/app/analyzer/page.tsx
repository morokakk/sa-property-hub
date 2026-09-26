'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { computeAcquisitionCosts, calculateSection13sex } from '@/lib/calculations/sarsTax';
import {
  calculateDealMetrics,
  computeBuiltInEquity,
  computeAmenityScore,
  generateLongTermProjection,
} from '@/lib/calculations/propertyMetrics';
import { calculateFlipMao, calculateRentalMao } from '@/lib/calculations/maoSolver';
import { formatOpportunityForWhatsApp } from '@/lib/whatsappFormatter';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { OpportunityDeal, DealSource, AmenityDistance, AmenityScorecard, PropertyTitleType, DealStrategy, PassReason } from '@/types';
import { PropertyTypeBadge, AgmDateChip } from '@/components/common/PropertyTypeBadge';
import LongTermProjectionChart from '@/components/analytics/LongTermProjectionChart';
import {
  Calculator,
  PlusCircle,
  Building,
  Hammer,
  FileText,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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
  FileSpreadsheet,
  ArrowRight,
  XCircle,
  RotateCcw,
  Target,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { exportOpportunitiesCSV } from '@/lib/export/csvExport';
import ImportDropdown from '@/components/common/ImportDropdown';

export default function OpportunityAnalyzerPage() {
  const opportunities = usePortfolioStore((state) => state.opportunities);
  const addOpportunity = usePortfolioStore((state) => state.addOpportunity);
  const updateOpportunity = usePortfolioStore((state) => state.updateOpportunity);
  const deleteOpportunity = usePortfolioStore((state) => state.deleteOpportunity);
  const passOpportunity = usePortfolioStore((state) => state.passOpportunity);
  const reactivateOpportunity = usePortfolioStore((state) => state.reactivateOpportunity);
  const advanceOpportunityStage = usePortfolioStore((state) => state.advanceOpportunityStage);
  const promoteOpportunityToFlip = usePortfolioStore((state) => state.promoteOpportunityToFlip);
  const promoteOpportunityToRental = usePortfolioStore((state) => state.promoteOpportunityToRental);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const liquidCapitalReserve = usePortfolioStore((state) => state.liquidCapitalReserve);
  const analyzerDraft = usePortfolioStore((state) => state.analyzerDraft);
  const updateAnalyzerDraft = usePortfolioStore((state) => state.updateAnalyzerDraft);

  // Form State for Deal Sourcing Calculator
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Johannesburg');
  const [province, setProvince] = useState<'Gauteng' | 'Western Cape' | 'KwaZulu-Natal' | 'Eastern Cape' | 'Free State' | 'Other'>('Gauteng');
  const [source, setSource] = useState<DealSource>(analyzerDraft?.source ?? 'High-Street Auction');
  const [feeResetToast, setFeeResetToast] = useState<string | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyTitleType>('Sectional Title Apartment');
  const [agmDate, setAgmDate] = useState<string>('');

  // Valuation vs. Purchase Price
  const [openMarketValue, setOpenMarketValue] = useState<number>(analyzerDraft?.openMarketValue ?? 2_150_000);
  const [purchasePrice, setPurchasePrice] = useState<number>(analyzerDraft?.purchasePrice ?? 1_800_000);
  const [rehabCost, setRehabCost] = useState<number>(analyzerDraft?.rehabCost ?? 200_000);
  const [monthlyRent, setMonthlyRent] = useState<number>(analyzerDraft?.monthlyRent ?? 16_500);
  const [monthlyLevies, setMonthlyLevies] = useState<number>(analyzerDraft?.monthlyLevies ?? 1_650);
  const [annualInsurance, setAnnualInsurance] = useState<number>(analyzerDraft?.annualInsurance ?? (propertyType === 'Freehold House' ? 7_200 : 0));
  const [monthlyRates, setMonthlyRates] = useState<number>(analyzerDraft?.monthlyRates ?? 1_100);
  const [targetExitPrice, setTargetExitPrice] = useState<number>(analyzerDraft?.targetExitPrice ?? 2_450_000);

  // Vacancy Buffer & Credit Loss + Property Management State
  const [vacancyRate, setVacancyRate] = useState<number>(analyzerDraft?.vacancyRatePercent ?? 6.0);
  const [managementFee, setManagementFee] = useState<number>(analyzerDraft?.managementFeePercent ?? 8.0);
  const [agencyVatApplicable, setAgencyVatApplicable] = useState<boolean>(analyzerDraft?.agencyVatApplicable ?? true);

  // MAO Quick Solver State
  const [showMaoSolver, setShowMaoSolver] = useState(false);
  const [maoSolverMode, setMaoSolverMode] = useState<'Flip' | 'Rental'>(analyzerDraft?.strategy === 'Flip' ? 'Flip' : 'Rental');
  const [maoTargetExitPrice, setMaoTargetExitPrice] = useState<number>(analyzerDraft?.targetExitPrice ?? 2_450_000);
  const [maoDesiredRoi, setMaoDesiredRoi] = useState<number>(15);
  const [maoTargetYield, setMaoTargetYield] = useState<number>(8.0);
  const maoSolverRef = useRef<HTMLDivElement>(null);

  // Deal Triage & Filter State
  const [pipelineFilter, setPipelineFilter] = useState<'active' | 'passed'>('active');
  const [showPromoted, setShowPromoted] = useState(false);
  const [passingDealId, setPassingDealId] = useState<string | null>(null);
  const [passReason, setPassReason] = useState<PassReason>('Yield Too Low');
  const [passNotes, setPassNotes] = useState('');

  // Auction Outlays & Distressed Arrears State
  const [auctioneerCommission, setAuctioneerCommission] = useState<number>(analyzerDraft?.auctioneerCommission ?? 0);
  const [municipalArrears, setMunicipalArrears] = useState<number>(analyzerDraft?.municipalArrears ?? 0);

  // Amenity Distance State
  const [schoolsDistance, setSchoolsDistance] = useState<AmenityDistance>('0-5km');
  const [policeDistance, setPoliceDistance] = useState<AmenityDistance>('0-5km');
  const [clinicDistance, setClinicDistance] = useState<AmenityDistance>('0-5km');
  const [mallDistance, setMallDistance] = useState<AmenityDistance>('0-5km');

  // Financing & Bidirectional Deposit / LTV (Defaults to 100% LTV / 0% Deposit)
  const [loanToValue, setLoanToValue] = useState<number>(analyzerDraft?.loanToValue ?? 100);
  const [depositZAR, setDepositZAR] = useState<number>(analyzerDraft?.depositZAR ?? 0);
  const [interestRate, setInterestRate] = useState<number>(11.75); // SA Prime Rate
  const [loanTermYears, setLoanTermYears] = useState<number>(analyzerDraft?.bondTermYears ?? 20);

  // Strategy Selection
  const [strategy, setStrategy] = useState<DealStrategy>(analyzerDraft?.strategy ?? 'Rental');

  // Long-Term Projections & Escalation Assumptions
  const [annualCapitalGrowth, setAnnualCapitalGrowth] = useState<number>(analyzerDraft?.annualCapitalGrowthPercent ?? 5.0);
  const [annualRentalEscalation, setAnnualRentalEscalation] = useState<number>(analyzerDraft?.annualRentalEscalationPercent ?? 6.0);
  const [annualExpenseInflation, setAnnualExpenseInflation] = useState<number>(analyzerDraft?.annualExpenseInflationPercent ?? 6.0);
  const [bondTermYears, setBondTermYears] = useState<number>(analyzerDraft?.bondTermYears ?? 20);
  const [showAdvancedAssumptions, setShowAdvancedAssumptions] = useState<boolean>(false);

  // Synchronize scratchpad calculator inputs when store draft changes (e.g. Clear Demo Data or Reset Demo)
  useEffect(() => {
    if (analyzerDraft) {
      if (analyzerDraft.strategy) setStrategy(analyzerDraft.strategy);
      if (analyzerDraft.source) setSource(analyzerDraft.source);
      setOpenMarketValue(analyzerDraft.openMarketValue ?? 0);
      setPurchasePrice(analyzerDraft.purchasePrice ?? 0);
      setRehabCost(analyzerDraft.rehabCost ?? 0);
      setMonthlyRent(analyzerDraft.monthlyRent ?? 0);
      setMonthlyLevies(analyzerDraft.monthlyLevies ?? 0);
      if (analyzerDraft.annualInsurance !== undefined) {
        setAnnualInsurance(analyzerDraft.annualInsurance);
      }
      setMonthlyRates(analyzerDraft.monthlyRates ?? 0);
      setTargetExitPrice(analyzerDraft.targetExitPrice ?? 0);
      setAuctioneerCommission(analyzerDraft.auctioneerCommission ?? 0);
      setMunicipalArrears(analyzerDraft.municipalArrears ?? 0);
      setDepositZAR(analyzerDraft.depositZAR ?? 0);
      setLoanToValue(analyzerDraft.loanToValue ?? 0);
      if (analyzerDraft.annualCapitalGrowthPercent !== undefined) setAnnualCapitalGrowth(analyzerDraft.annualCapitalGrowthPercent);
      if (analyzerDraft.annualRentalEscalationPercent !== undefined) setAnnualRentalEscalation(analyzerDraft.annualRentalEscalationPercent);
      if (analyzerDraft.annualExpenseInflationPercent !== undefined) setAnnualExpenseInflation(analyzerDraft.annualExpenseInflationPercent);
      if (analyzerDraft.bondTermYears !== undefined) {
        setBondTermYears(analyzerDraft.bondTermYears);
        setLoanTermYears(analyzerDraft.bondTermYears);
      }
      if (analyzerDraft.vacancyRatePercent !== undefined) setVacancyRate(analyzerDraft.vacancyRatePercent);
      if (analyzerDraft.managementFeePercent !== undefined) setManagementFee(analyzerDraft.managementFeePercent);
      if (analyzerDraft.agencyVatApplicable !== undefined) setAgencyVatApplicable(analyzerDraft.agencyVatApplicable);
    }
  }, [analyzerDraft]);

  // Sync MAO solver mode when deal strategy changes
  useEffect(() => {
    if (strategy === 'Flip') {
      setMaoSolverMode('Flip');
    } else {
      setMaoSolverMode('Rental');
    }
  }, [strategy]);

  // Sync exit price if user modifies targetExitPrice
  useEffect(() => {
    if (targetExitPrice > 0) {
      setMaoTargetExitPrice(targetExitPrice);
    }
  }, [targetExitPrice]);

  // Click outside listener for MAO popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (maoSolverRef.current && !maoSolverRef.current.contains(e.target as Node)) {
        setShowMaoSolver(false);
      }
    };
    if (showMaoSolver) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMaoSolver]);

  // Auto-dismiss fee reset toast after 3 seconds
  useEffect(() => {
    if (!feeResetToast) return;
    const timer = setTimeout(() => {
      setFeeResetToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [feeResetToast]);

  const isDistressedSource = source === 'High-Street Auction' || source === 'Distressed Sale / Repo';

  const handleSourceChange = (newSource: DealSource) => {
    const isCurrentDistressed = source === 'High-Street Auction' || source === 'Distressed Sale / Repo';
    const isNewDistressed = newSource === 'High-Street Auction' || newSource === 'Distressed Sale / Repo';

    setSource(newSource);

    if (isCurrentDistressed && !isNewDistressed) {
      const hadFees = (auctioneerCommission || 0) > 0 || (municipalArrears || 0) > 0;
      if (hadFees) {
        setAuctioneerCommission(0);
        setMunicipalArrears(0);
        updateAnalyzerDraft({
          source: newSource,
          auctioneerCommission: 0,
          municipalArrears: 0,
        });
        setFeeResetToast(
          'Switched to standard retail channel. Auction commission and municipal arrears reset to R0.'
        );
      } else {
        updateAnalyzerDraft({ source: newSource });
      }
    } else {
      updateAnalyzerDraft({ source: newSource });
    }
  };

  const handleStrategyChange = (newStrategy: DealStrategy) => {
    setStrategy(newStrategy);
    updateAnalyzerDraft({ strategy: newStrategy });
  };

  const handleCapitalGrowthChange = (val: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    setAnnualCapitalGrowth(safeVal);
    updateAnalyzerDraft({ annualCapitalGrowthPercent: safeVal });
  };

  const handleRentalEscalationChange = (val: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    setAnnualRentalEscalation(safeVal);
    updateAnalyzerDraft({ annualRentalEscalationPercent: safeVal });
  };

  const handleExpenseInflationChange = (val: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    setAnnualExpenseInflation(safeVal);
    updateAnalyzerDraft({ annualExpenseInflationPercent: safeVal });
  };

  const handleBondTermChange = (val: number) => {
    const safeVal = Math.max(1, isNaN(val) ? 20 : val);
    setBondTermYears(safeVal);
    setLoanTermYears(safeVal);
    updateAnalyzerDraft({ bondTermYears: safeVal });
  };

  // Bidirectional Handlers for Deposit, LTV, and Purchase Price
  const handlePurchasePriceChange = (val: number) => {
    const safePrice = Math.max(0, isNaN(val) ? 0 : val);
    setPurchasePrice(safePrice);
    // Preserve current LTV % and recalculate Deposit ZAR
    const updatedDeposit = Math.max(0, Math.round(safePrice * (1 - loanToValue / 100)));
    setDepositZAR(updatedDeposit);
    updateAnalyzerDraft({ purchasePrice: safePrice, depositZAR: updatedDeposit });
  };

  const handleDepositChange = (val: number) => {
    const safeDeposit = Math.max(0, isNaN(val) ? 0 : val);
    setDepositZAR(safeDeposit);
    // Recalculate LTV: ((purchasePrice - deposit) / purchasePrice) * 100
    if (purchasePrice > 0) {
      const calculatedLTV = Math.max(0, Math.min(100, Math.round(((purchasePrice - safeDeposit) / purchasePrice) * 100)));
      setLoanToValue(calculatedLTV);
      updateAnalyzerDraft({ depositZAR: safeDeposit, loanToValue: calculatedLTV });
    } else {
      setLoanToValue(0);
      updateAnalyzerDraft({ depositZAR: safeDeposit, loanToValue: 0 });
    }
  };

  const handleLTVChange = (val: number) => {
    const safeLTV = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    setLoanToValue(safeLTV);
    // Recalculate Deposit: purchasePrice * (1 - LTV / 100)
    const calculatedDeposit = Math.max(0, Math.round(purchasePrice * (1 - safeLTV / 100)));
    setDepositZAR(calculatedDeposit);
    updateAnalyzerDraft({ loanToValue: safeLTV, depositZAR: calculatedDeposit });
  };

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
      monthlyLevies: propertyType === 'Freehold House' ? 0 : monthlyLevies,
      monthlyRatesTaxes: monthlyRates,
      annualInsurance: propertyType === 'Freehold House' ? annualInsurance : 0,
      managementFeePercent: managementFee,
      agencyVatApplicable,
      vacancyRatePercent: vacancyRate,
      targetExitPrice,
      holdingPeriodMonths: 6,
      loanToValuePercent: loanToValue,
      depositZAR,
      bondLTV: loanToValue,
      interestRatePercent: interestRate,
      loanTermYears,
      costs: calculatedCosts,
      auctioneerCommissionZAR: auctioneerCommission,
      municipalArrearsZAR: municipalArrears,
    });
  }, [
    purchasePrice,
    rehabCost,
    monthlyRent,
    monthlyLevies,
    monthlyRates,
    annualInsurance,
    managementFee,
    agencyVatApplicable,
    vacancyRate,
    propertyType,
    targetExitPrice,
    loanToValue,
    depositZAR,
    interestRate,
    loanTermYears,
    calculatedCosts,
    auctioneerCommission,
    municipalArrears,
  ]);

  // Day-1 Capital Required vs Liquid Capital Reserve comparison
  const reserveDelta = liquidCapitalReserve - calculatedMetrics.initialCapitalRequired;
  const isReserveSufficient = reserveDelta >= 0;

  // Section 13sex Tax Incentive Engine
  const calculatedSection13 = useMemo(() => {
    return calculateSection13sex(purchasePrice, section13TaxRate, isSection13Eligible);
  }, [purchasePrice, section13TaxRate, isSection13Eligible]);

  // Long-Term Wealth & Cashflow Projections Engine
  const calculatedProjections = useMemo(() => {
    return generateLongTermProjection({
      purchasePrice,
      openMarketValueZAR: openMarketValue,
      depositZAR,
      bondLTV: loanToValue,
      loanToValuePercent: loanToValue,
      interestRatePercent: interestRate,
      loanTermYears: bondTermYears,
      bondTermYears,
      annualCapitalGrowthPercent: annualCapitalGrowth,
      annualRentalEscalationPercent: annualRentalEscalation,
      annualExpenseInflationPercent: annualExpenseInflation,
      monthlyRentalEstimate: monthlyRent,
      monthlyLevies: propertyType === 'Freehold House' ? 0 : monthlyLevies,
      monthlyRatesTaxes: monthlyRates,
      annualInsurance: propertyType === 'Freehold House' ? annualInsurance : 0,
      managementFeePercent: managementFee,
      agencyVatApplicable,
      vacancyRatePercent: vacancyRate,
    });
  }, [
    purchasePrice,
    openMarketValue,
    depositZAR,
    loanToValue,
    interestRate,
    bondTermYears,
    annualCapitalGrowth,
    annualRentalEscalation,
    annualExpenseInflation,
    monthlyRent,
    monthlyLevies,
    monthlyRates,
    annualInsurance,
    managementFee,
    agencyVatApplicable,
    vacancyRate,
    propertyType,
  ]);

  // Holding reserve estimation for Flip MAO solver (6 months holding of rates, levies, insurance + buffer)
  const flipHoldingReserve = useMemo(() => {
    const leviesClean = propertyType === 'Freehold House' ? 0 : monthlyLevies;
    const insuranceClean = propertyType === 'Freehold House' ? Math.round(annualInsurance / 12) : 0;
    return (leviesClean + monthlyRates + insuranceClean + 1500) * 6;
  }, [propertyType, monthlyLevies, monthlyRates, annualInsurance]);

  const computedFlipMao = useMemo(() => {
    return calculateFlipMao({
      targetExitPrice: maoTargetExitPrice,
      desiredRoiPercent: maoDesiredRoi,
      rehabCost,
      holdingCost: flipHoldingReserve,
      estimatedAcquisitionCostRate: 0.05,
    });
  }, [maoTargetExitPrice, maoDesiredRoi, rehabCost, flipHoldingReserve]);

  const computedRentalMao = useMemo(() => {
    return calculateRentalMao({
      monthlyRent,
      vacancyRatePercent: vacancyRate,
      managementFeePercent: managementFee,
      agencyVatApplicable,
      monthlyLevies: propertyType === 'Freehold House' ? 0 : monthlyLevies,
      monthlyRates,
      annualInsurance: propertyType === 'Freehold House' ? annualInsurance : 0,
      targetNetYieldPercent: maoTargetYield,
    });
  }, [monthlyRent, vacancyRate, managementFee, agencyVatApplicable, propertyType, monthlyLevies, monthlyRates, annualInsurance, maoTargetYield]);

  const handleApplyMaoBid = (bidAmount: number) => {
    if (bidAmount <= 0) return;
    handlePurchasePriceChange(bidAmount);
    setShowMaoSolver(false);
  };

  const handleCopyCurrentCalcWhatsApp = () => {
    const isScheme = propertyType === 'Sectional Title Apartment' || propertyType === 'Townhouse / Cluster';
    const finalAgmDate = isScheme && agmDate ? agmDate : undefined;
    const finalLevies = propertyType === 'Freehold House' ? 0 : monthlyLevies;
    const finalInsurance = propertyType === 'Freehold House' ? annualInsurance : 0;
    const monthlyInsurance = Math.round(finalInsurance / 12);

    const monthlyHolding = (finalLevies || 0) + (monthlyRates || 0) + monthlyInsurance + (calculatedMetrics.monthlyBondPayment || 0) + 1500;

    const tempDeal: OpportunityDeal = {
      id: 'current-calc',
      title: title || `${city} Investment Opportunity`,
      address: address || `${city} Metro Corridor`,
      city,
      province,
      source,
      propertyType,
      strategy,
      agmDate: finalAgmDate,
      openMarketValueZAR: openMarketValue,
      purchasePrice,
      builtInEquityZAR: calculatedBuiltInEquity.builtInEquityZAR,
      builtInEquityPercent: calculatedBuiltInEquity.builtInEquityPercent,
      amenityScorecard: calculatedAmenityScorecard,
      estimatedRehabCost: rehabCost,
      monthlyRentalEstimate: monthlyRent,
      monthlyLevies: finalLevies,
      monthlyRatesTaxes: monthlyRates,
      annualInsurance: finalInsurance,
      managementFeePercent: managementFee,
      agencyVatApplicable,
      vacancyRatePercent: vacancyRate,
      targetExitPrice,
      holdingPeriodMonths: 6,
      monthlyBondPaymentZAR: calculatedMetrics.monthlyBondPayment,
      monthlyOtherHoldingCostZAR: 1500,
      monthlyHoldingCostZAR: monthlyHolding,
      loanToValuePercent: loanToValue,
      bondLTV: loanToValue,
      depositZAR,
      interestRatePercent: interestRate,
      loanTermYears: bondTermYears,
      bondTermYears,
      annualCapitalGrowthPercent: annualCapitalGrowth,
      annualRentalEscalationPercent: annualRentalEscalation,
      annualExpenseInflationPercent: annualExpenseInflation,
      costs: calculatedCosts,
      auctioneerCommissionZAR: auctioneerCommission,
      municipalArrearsZAR: municipalArrears,
      grossYield: calculatedMetrics.grossYield,
      capRate: calculatedMetrics.capRate,
      netRoi: calculatedMetrics.netRoi,
      monthlyCashFlow: calculatedMetrics.monthlyCashFlow,
      initialCapitalRequired: calculatedMetrics.initialCapitalRequired,
      projectedFlipNetProfit: calculatedMetrics.projectedFlipNetProfit,
      projectedFlipRoi: calculatedMetrics.projectedFlipRoi,
      status: 'Screening',
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
    setPropertyType(deal.propertyType || 'Sectional Title Apartment');
    setAgmDate(deal.agmDate || '');
    setOpenMarketValue(deal.openMarketValueZAR || Math.round(deal.purchasePrice * 1.2));
    setPurchasePrice(deal.purchasePrice);
    setRehabCost(deal.estimatedRehabCost || 0);
    setMonthlyRent(deal.monthlyRentalEstimate);
    setMonthlyLevies(deal.propertyType === 'Freehold House' ? 0 : deal.monthlyLevies);
    setAnnualInsurance(deal.propertyType === 'Freehold House' ? (deal.annualInsurance || 7_200) : 0);
    setMonthlyRates(deal.monthlyRatesTaxes);
    setTargetExitPrice(deal.targetExitPrice || 0);
    setAuctioneerCommission(deal.auctioneerCommissionZAR || 0);
    setMunicipalArrears(deal.municipalArrearsZAR || 0);
    setStrategy(deal.strategy ?? 'Rental');
    setVacancyRate(deal.vacancyRatePercent ?? 6.0);
    setManagementFee(deal.managementFeePercent ?? 8.0);
    setAgencyVatApplicable(deal.agencyVatApplicable !== false);
    const effectiveLtv = deal.bondLTV !== undefined ? deal.bondLTV : (deal.loanToValuePercent ?? 100);
    setLoanToValue(effectiveLtv);
    const effectiveDep = deal.depositZAR !== undefined ? deal.depositZAR : Math.max(0, Math.round(deal.purchasePrice * (1 - effectiveLtv / 100)));
    setDepositZAR(effectiveDep);
    setInterestRate(deal.interestRatePercent);
    setLoanTermYears(deal.bondTermYears ?? deal.loanTermYears);
    setBondTermYears(deal.bondTermYears ?? deal.loanTermYears ?? 20);
    setAnnualCapitalGrowth(deal.annualCapitalGrowthPercent ?? 5.0);
    setAnnualRentalEscalation(deal.annualRentalEscalationPercent ?? 6.0);
    setAnnualExpenseInflation(deal.annualExpenseInflationPercent ?? 6.0);
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
    setPropertyType('Sectional Title Apartment');
    setAgmDate('');
    setAnnualInsurance(0);
    setStrategy('Rental');
    setAuctioneerCommission(0);
    setMunicipalArrears(0);
    setLoanToValue(100);
    setDepositZAR(0);
    setAnnualCapitalGrowth(5.0);
    setAnnualRentalEscalation(6.0);
    setAnnualExpenseInflation(6.0);
    setBondTermYears(20);
    setLoanTermYears(20);
    setVacancyRate(analyzerDraft?.vacancyRatePercent ?? 6.0);
    setManagementFee(analyzerDraft?.managementFeePercent ?? 8.0);
    setAgencyVatApplicable(analyzerDraft?.agencyVatApplicable ?? true);
  };

  const handleSaveOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert('Please enter a property or deal name.');
      return;
    }

    const finalLevies = propertyType === 'Freehold House' ? 0 : monthlyLevies;
    const finalInsurance = propertyType === 'Freehold House' ? annualInsurance : 0;
    const monthlyInsurance = Math.round(finalInsurance / 12);
    const isScheme = propertyType === 'Sectional Title Apartment' || propertyType === 'Townhouse / Cluster';
    const finalAgmDate = isScheme && agmDate ? agmDate : undefined;

    if (editingDealId) {
      updateOpportunity(editingDealId, {
        title,
        address: address || `${city} Asset`,
        city,
        province,
        source,
        propertyType,
        strategy,
        agmDate: finalAgmDate,
        openMarketValueZAR: openMarketValue,
        purchasePrice,
        builtInEquityZAR: calculatedBuiltInEquity.builtInEquityZAR,
        builtInEquityPercent: calculatedBuiltInEquity.builtInEquityPercent,
        amenityScorecard: calculatedAmenityScorecard,
        estimatedRehabCost: rehabCost,
        monthlyRentalEstimate: monthlyRent,
        monthlyLevies: finalLevies,
        annualInsurance: finalInsurance,
        monthlyRatesTaxes: monthlyRates,
        vacancyRatePercent: vacancyRate,
        managementFeePercent: managementFee,
        agencyVatApplicable,
        targetExitPrice,
        holdingPeriodMonths: 6,
        monthlyBondPaymentZAR: calculatedMetrics.monthlyBondPayment,
        monthlyOtherHoldingCostZAR: 1500,
        monthlyHoldingCostZAR: (finalLevies || 0) + (monthlyRates || 0) + monthlyInsurance + (calculatedMetrics.monthlyBondPayment || 0) + 1500,
        auctioneerCommissionZAR: auctioneerCommission,
        municipalArrearsZAR: municipalArrears,
        loanToValuePercent: loanToValue,
        bondLTV: loanToValue,
        depositZAR,
        interestRatePercent: interestRate,
        loanTermYears: bondTermYears,
        bondTermYears,
        annualCapitalGrowthPercent: annualCapitalGrowth,
        annualRentalEscalationPercent: annualRentalEscalation,
        annualExpenseInflationPercent: annualExpenseInflation,
        customTransferDuty: overrideTax ? customTransferDuty : undefined,
        customConveyancing: overrideLegal ? customConveyancing : undefined,
        costs: calculatedCosts,
        section13sex: isSection13Eligible ? calculatedSection13 : undefined,
        grossYield: calculatedMetrics.grossYield,
        capRate: calculatedMetrics.capRate,
        netRoi: calculatedMetrics.netRoi,
        monthlyCashFlow: calculatedMetrics.monthlyCashFlow,
        initialCapitalRequired: calculatedMetrics.initialCapitalRequired,
        projectedFlipNetProfit: calculatedMetrics.projectedFlipNetProfit,
        projectedFlipRoi: calculatedMetrics.projectedFlipRoi,
      });
      alert(`Deal "${title}" updated with new metrics!`);
      setEditingDealId(null);
      setTitle('');
      setAddress('');
      setPropertyType('Sectional Title Apartment');
      setAgmDate('');
      setAnnualInsurance(0);
      setStrategy('Rental');
      setAuctioneerCommission(0);
      setMunicipalArrears(0);
      setLoanToValue(100);
      setDepositZAR(0);
      setAnnualCapitalGrowth(5.0);
      setAnnualRentalEscalation(6.0);
      setAnnualExpenseInflation(6.0);
      setBondTermYears(20);
      setLoanTermYears(20);
      setVacancyRate(analyzerDraft?.vacancyRatePercent ?? 6.0);
      setManagementFee(analyzerDraft?.managementFeePercent ?? 8.0);
      setAgencyVatApplicable(analyzerDraft?.agencyVatApplicable ?? true);
      return;
    }

    const newDeal: OpportunityDeal = {
      id: `opp-${Date.now()}`,
      title,
      address: address || `${city} Asset`,
      city,
      province,
      source,
      propertyType,
      strategy,
      agmDate: finalAgmDate,
      openMarketValueZAR: openMarketValue,
      purchasePrice,
      builtInEquityZAR: calculatedBuiltInEquity.builtInEquityZAR,
      builtInEquityPercent: calculatedBuiltInEquity.builtInEquityPercent,
      amenityScorecard: calculatedAmenityScorecard,
      estimatedRehabCost: rehabCost,
      monthlyRentalEstimate: monthlyRent,
      monthlyLevies: finalLevies,
      monthlyRatesTaxes: monthlyRates,
      annualInsurance: finalInsurance,
      managementFeePercent: managementFee,
      agencyVatApplicable,
      vacancyRatePercent: vacancyRate,
      targetExitPrice,
      holdingPeriodMonths: 6,
      monthlyBondPaymentZAR: calculatedMetrics.monthlyBondPayment,
      monthlyOtherHoldingCostZAR: 1500,
      monthlyHoldingCostZAR: (finalLevies || 0) + (monthlyRates || 0) + monthlyInsurance + (calculatedMetrics.monthlyBondPayment || 0) + 1500,
      auctioneerCommissionZAR: auctioneerCommission,
      municipalArrearsZAR: municipalArrears,
      loanToValuePercent: loanToValue,
      bondLTV: loanToValue,
      depositZAR,
      interestRatePercent: interestRate,
      loanTermYears: bondTermYears,
      bondTermYears,
      annualCapitalGrowthPercent: annualCapitalGrowth,
      annualRentalEscalationPercent: annualRentalEscalation,
      annualExpenseInflationPercent: annualExpenseInflation,
      customTransferDuty: overrideTax ? customTransferDuty : undefined,
      customConveyancing: overrideLegal ? customConveyancing : undefined,
      costs: calculatedCosts,
      section13sex: isSection13Eligible ? calculatedSection13 : undefined,
      grossYield: calculatedMetrics.grossYield,
      capRate: calculatedMetrics.capRate,
      netRoi: calculatedMetrics.netRoi,
      monthlyCashFlow: calculatedMetrics.monthlyCashFlow,
      initialCapitalRequired: calculatedMetrics.initialCapitalRequired,
      projectedFlipNetProfit: calculatedMetrics.projectedFlipNetProfit,
      projectedFlipRoi: calculatedMetrics.projectedFlipRoi,
      status: 'Screening',
      createdAt: new Date().toISOString().split('T')[0],
    };

    addOpportunity(newDeal);
    setTitle('');
    setAddress('');
    setPropertyType('Sectional Title Apartment');
    setAgmDate('');
    setAnnualInsurance(0);
    setAuctioneerCommission(0);
    setMunicipalArrears(0);
    setLoanToValue(100);
    setDepositZAR(0);
    setVacancyRate(analyzerDraft?.vacancyRatePercent ?? 6.0);
    setManagementFee(analyzerDraft?.managementFeePercent ?? 8.0);
    setAgencyVatApplicable(analyzerDraft?.agencyVatApplicable ?? true);
    alert(`Deal "${title}" added to Deal Pipeline!`);
  };

  // Pipeline Triage computed filter sets
  const activeDeals = useMemo(
    () => opportunities.filter((d) => d.status === 'Screening' || d.status === 'Offer Submitted' || d.status === 'Due Diligence'),
    [opportunities]
  );
  const passedDeals = useMemo(() => opportunities.filter((d) => d.status === 'Passed'), [opportunities]);
  const promotedDeals = useMemo(
    () => opportunities.filter((d) => d.status === 'Promoted to Flip' || d.status === 'Promoted to Rental'),
    [opportunities]
  );
  const displayedOpportunities = useMemo(() => {
    if (pipelineFilter === 'passed') return passedDeals;
    return showPromoted ? [...activeDeals, ...promotedDeals] : activeDeals;
  }, [pipelineFilter, activeDeals, passedDeals, promotedDeals, showPromoted]);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Opportunity Analyzer"
        subtitle="Deal-sourcing calculator with official progressive SARS transfer duty brackets and yield engines"
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Deal Calculator Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 flex-wrap gap-3">
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
            <div className="flex items-center gap-2">
              {/* Solve Max Bid Popover Button */}
              <div className="relative" ref={maoSolverRef}>
                <button
                  type="button"
                  onClick={() => setShowMaoSolver(!showMaoSolver)}
                  className="bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-300 text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Solve Maximum Allowable Offer based on Target ROI% or Cap Rate"
                >
                  <Target className="w-4 h-4 text-violet-600" />
                  <span>Solve Max Bid</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMaoSolver ? 'rotate-180' : ''}`} />
                </button>

                {showMaoSolver && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-2xl p-4 z-50 animate-fadeIn text-slate-900">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-violet-600" />
                        <h4 className="text-xs font-bold text-slate-900">MAO Quick Solver</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMaoSolver(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Mode Toggle Tabs (Defaults to current strategy) */}
                    <div className="flex rounded-lg bg-slate-100 p-1 mb-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setMaoSolverMode('Flip')}
                        className={`flex-1 py-1 px-2 font-bold rounded-md transition-all cursor-pointer ${
                          maoSolverMode === 'Flip'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🔄 Flip Exit ROI
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaoSolverMode('Rental')}
                        className={`flex-1 py-1 px-2 font-bold rounded-md transition-all cursor-pointer ${
                          maoSolverMode === 'Rental'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🏠 Rental Net Yield
                      </button>
                    </div>

                    {maoSolverMode === 'Flip' ? (
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-500">
                          Solves the maximum bid that satisfies your target ROI after factoring in BOQ rehab, 6-month holding costs, and 5% acquisition friction.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Target Exit Price</label>
                            <input
                              type="number"
                              name="maoTargetExitPriceZAR"
                              autoComplete="off"
                              min="0"
                              step="any"
                              value={maoTargetExitPrice}
                              onChange={(e) => setMaoTargetExitPrice(Number(e.target.value))}
                              className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-md bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Desired ROI (%)</label>
                            <input
                              type="number"
                              name="maoDesiredRoiPercent"
                              autoComplete="off"
                              min="0"
                              step="any"
                              value={maoDesiredRoi}
                              onChange={(e) => setMaoDesiredRoi(Number(e.target.value))}
                              className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-md bg-white"
                            />
                          </div>
                        </div>

                        <div className="bg-violet-50/80 border border-violet-200 rounded-lg p-3 space-y-1.5 text-xs text-violet-950">
                          <div className="flex justify-between text-[11px] text-slate-600">
                            <span>Allowable Total Capital:</span>
                            <span className="font-semibold">{formatZAR(computedFlipMao.totalAllowableOutlay)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-600">
                            <span>Less BOQ + 6M Holding:</span>
                            <span className="text-rose-600 font-semibold">-{formatZAR(computedFlipMao.nonPurchaseCosts)}</span>
                          </div>
                          <div className="border-t border-violet-200 pt-1.5 flex justify-between items-center">
                            <span className="font-bold text-violet-900">Max Allowable Bid (MAO):</span>
                            <span className="text-sm font-black text-violet-800">{formatZAR(computedFlipMao.maxAllowableBid)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyMaoBid(computedFlipMao.maxAllowableBid)}
                          disabled={computedFlipMao.maxAllowableBid <= 0}
                          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Set as Target Bid ({formatZAR(computedFlipMao.maxAllowableBid)})</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-500">
                          Solves the maximum purchase price based on your target net yield (Cap Rate) and stress-tested NOI (with {vacancyRate}% vacancy &amp; {managementFee}%{agencyVatApplicable ? ' + 15% VAT' : ''} agent fee).
                        </p>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-semibold text-slate-600">Target Net Yield / Cap Rate (%)</label>
                            <span className="text-[10px] text-slate-400">SA prime corridor: 8.0%–11.0%</span>
                          </div>
                          <input
                            type="number"
                            name="maoTargetYieldPercent"
                            autoComplete="off"
                            min="0"
                            step="any"
                            value={maoTargetYield}
                            onChange={(e) => setMaoTargetYield(Number(e.target.value))}
                            className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-md bg-white"
                          />
                        </div>

                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 space-y-1.5 text-xs text-emerald-950">
                          <div className="flex justify-between text-[11px] text-slate-600">
                            <span>Stress-Tested Annual NOI:</span>
                            <span className="font-semibold text-emerald-800">{formatZAR(computedRentalMao.stressTestedNoi)}/yr</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Vacancy Buffer ({vacancyRate}%):</span>
                            <span>-{formatZAR(computedRentalMao.vacancyLossAnnual)}/yr</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Agent Fee ({managementFee}%{agencyVatApplicable ? '+VAT' : ''}):</span>
                            <span>-{formatZAR(computedRentalMao.managementFeeAnnual)}/yr</span>
                          </div>
                          <div className="border-t border-emerald-200 pt-1.5 flex justify-between items-center">
                            <span className="font-bold text-emerald-950">Max Purchase Price:</span>
                            <span className="text-sm font-black text-emerald-800">{formatZAR(computedRentalMao.maxAllowablePrice)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyMaoBid(computedRentalMao.maxAllowablePrice)}
                          disabled={computedRentalMao.maxAllowablePrice <= 0}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Set as Target Bid ({formatZAR(computedRentalMao.maxAllowablePrice)})</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> SARS 2024–2026 Brackets
              </span>
            </div>
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

          <form onSubmit={handleSaveOpportunity} noValidate className="space-y-6">
            {/* General Property Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deal / Property Name *</label>
                <input
                  type="text"
                  name="opportunityTitle"
                  autoComplete="off"
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
                  name="propertyAddress"
                  autoComplete="off"
                  placeholder="e.g. 14 Somerset Road"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
                <select
                  name="propertyCity"
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
                  onChange={(e) => handleSourceChange(e.target.value as DealSource)}
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

            {/* Investment Strategy: Buy & Hold Rental vs Buy & Flip vs Hybrid BRRRR */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Investment Strategy & Exit Horizon
                  </label>
                </div>
                <span className="text-[10px] text-slate-500">Tailors carrying burn rate vs 20/30-yr projection models</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: 'Rental' as const, label: '🏠 Buy & Hold Rental', desc: 'Long-term cash flow & equity compounding' },
                    { id: 'Flip' as const, label: '🔄 Buy & Flip', desc: 'Short-term renovation & capital liquidation' },
                    { id: 'BRRRR' as const, label: '⚡ Hybrid BRRRR', desc: 'Rehab, refinance & compound hold' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStrategyChange(st.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all text-left border cursor-pointer ${
                      strategy === st.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{st.label}</span>
                      {strategy === st.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    </div>
                    <div className={`text-[10px] truncate mt-0.5 ${strategy === st.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {st.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Property Title Type & Body Corporate AGM Schedule */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Property Title Type & Governance
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-500">STSMA Schemes vs Freehold Standalone</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'Sectional Title Apartment', label: '🏢 Sectional Title' },
                      { id: 'Freehold House', label: '🏡 Freehold House' },
                      { id: 'Townhouse / Cluster', label: '🏘️ Townhouse / Cluster' },
                      { id: 'Multi-unit Commercial', label: '🏬 Commercial' },
                    ] as const
                  ).map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => {
                        setPropertyType(pt.id);
                        if (pt.id === 'Freehold House') {
                          setMonthlyLevies(0);
                          const newIns = annualInsurance > 0 ? annualInsurance : 7_200;
                          setAnnualInsurance(newIns);
                          updateAnalyzerDraft({ monthlyLevies: 0, annualInsurance: newIns });
                        } else {
                          setAnnualInsurance(0);
                          updateAnalyzerDraft({ annualInsurance: 0 });
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all text-center border ${
                        propertyType === pt.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(propertyType === 'Sectional Title Apartment' || propertyType === 'Townhouse / Cluster') && (
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-800">
                      📅 Scheduled Body Corporate AGM Date
                    </label>
                    <span className="text-[10px] text-indigo-600 font-medium">
                      Auto-schedules reminder task 14 days prior to AGM
                    </span>
                  </div>
                  <input
                    type="date"
                    name="agmDate"
                    autoComplete="off"
                    value={agmDate}
                    onChange={(e) => setAgmDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}
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
                      name="openMarketValueZAR"
                      autoComplete="off"
                      min="0"
                      step="any"
                      value={openMarketValue}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setOpenMarketValue(val);
                        updateAnalyzerDraft({ openMarketValue: val });
                      }}
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
                      name="purchasePriceZAR"
                      autoComplete="off"
                      min="0"
                      step="any"
                      value={purchasePrice}
                      onChange={(e) => handlePurchasePriceChange(Number(e.target.value))}
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
                    name="rehabCostZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={rehabCost}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRehabCost(val);
                      updateAnalyzerDraft({ rehabCost: val });
                    }}
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
                    name="monthlyRentZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={monthlyRent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMonthlyRent(val);
                      updateAnalyzerDraft({ monthlyRent: val });
                    }}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>

              {propertyType === 'Freehold House' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Annual Building Insurance (ZAR)
                    </label>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1 rounded">
                      R{Math.round((annualInsurance || 0) / 12).toLocaleString()}/pm
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                    <input
                      type="number"
                      name="annualInsuranceZAR"
                      autoComplete="off"
                      min="0"
                      step="any"
                      value={annualInsurance}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAnnualInsurance(val);
                        updateAnalyzerDraft({ annualInsurance: val });
                      }}
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Monthly Levies (BC)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                    <input
                      type="number"
                      name="monthlyLeviesZAR"
                      autoComplete="off"
                      min="0"
                      step="any"
                      value={monthlyLevies}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setMonthlyLevies(val);
                        updateAnalyzerDraft({ monthlyLevies: val });
                      }}
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rates & Taxes (City)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    name="monthlyRatesZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={monthlyRates}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMonthlyRates(val);
                      updateAnalyzerDraft({ monthlyRates: val });
                    }}
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
                    name="targetExitPriceZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={targetExitPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTargetExitPrice(val);
                      updateAnalyzerDraft({ targetExitPrice: val });
                    }}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Vacancy Buffer & Credit Loss Stress-Testing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Vacancy & Credit Loss Buffer (%)
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                    -{formatZAR(Math.round(monthlyRent * (vacancyRate / 100)))}/pm
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    name="vacancyRatePercent"
                    autoComplete="off"
                    min="0"
                    max="30"
                    step="any"
                    value={vacancyRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setVacancyRate(val);
                      updateAnalyzerDraft({ vacancyRatePercent: val });
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Deducts from gross rent before computing NOI, Cap Rate, and Cash-on-Cash yields. Default: 6.0%.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Managing Agent Fee (%)
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={agencyVatApplicable}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAgencyVatApplicable(checked);
                          updateAnalyzerDraft({ agencyVatApplicable: checked });
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                      />
                      <span>+ 15% VAT</span>
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100/80 px-1.5 py-0.5 rounded">
                    {agencyVatApplicable ? (
                      <>
                        {managementFee}% + VAT = {(managementFee * 1.15).toFixed(1)}% &bull; -{formatZAR(Math.round(monthlyRent * (managementFee / 100) * 1.15))}/pm
                      </>
                    ) : (
                      <>
                        {managementFee.toFixed(1)}% (VAT Incl.) &bull; -{formatZAR(Math.round(monthlyRent * (managementFee / 100)))}/pm
                      </>
                    )}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    name="managementFeePercent"
                    autoComplete="off"
                    min="0"
                    max="20"
                    step="any"
                    value={managementFee}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setManagementFee(val);
                      updateAnalyzerDraft({ managementFeePercent: val });
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Professional rental agent tenant placement & collection fee (iGrow / WeconnectU baseline: 8.0%{agencyVatApplicable ? ' + 15% VAT = 9.2%' : ''}).
                </p>
              </div>
            </div>

            {/* Auction / Distressed Costs Input Row - Conditionally rendered only for Auction & Distressed Bank Repo */}
            {isDistressedSource && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-700" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Auction / Distressed Costs
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Immediate Day-1 cash outlays: buyer&apos;s commission & municipal clearance debt
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">Total Auction Outlays:</span>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                      {formatZAR((auctioneerCommission || 0) + (municipalArrears || 0))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Auctioneer Commission */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Auctioneer Commission / Buyer&apos;s Premium (ZAR)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const fee = Math.round(purchasePrice * 0.10 * 1.15);
                          setAuctioneerCommission(fee);
                          updateAnalyzerDraft({ auctioneerCommission: fee });
                        }}
                        className="text-[10px] text-amber-900 hover:text-amber-950 font-bold bg-amber-100/90 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 transition-colors cursor-pointer"
                        title="Auto-calculate standard SA auction commission: 10% + 15% VAT = 11.5% of hammer price"
                      >
                        Calc 10% + VAT
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                      <input
                        type="number"
                        name="auctioneerCommissionZAR"
                        autoComplete="off"
                        min="0"
                        step="any"
                        value={auctioneerCommission || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAuctioneerCommission(val);
                          updateAnalyzerDraft({ auctioneerCommission: val });
                        }}
                        placeholder="0"
                        className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold text-slate-900 bg-white"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Mandatory buyer&apos;s premium payable immediately on auction day.
                    </span>
                  </div>

                  {/* 2. Municipal Arrears */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Municipal Arrears & Taxes Settlement (ZAR)
                      </label>
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                        Section 118
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                      <input
                        type="number"
                        name="municipalArrearsZAR"
                        autoComplete="off"
                        min="0"
                        step="any"
                        value={municipalArrears || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMunicipalArrears(val);
                          updateAnalyzerDraft({ municipalArrears: val });
                        }}
                        placeholder="0"
                        className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold text-slate-900 bg-white"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Historical city council rates/water debt settlement required for transfer clearance.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mortgage / Bond Financing & Cash Deposit Sync Engine */}
            <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Mortgage Financing & Cash Deposit Engine
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Bidirectional LTV & down-payment sync with live principal calculation
                    </p>
                  </div>
                </div>

                {/* Live Financed Principal Readout Badge */}
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">Financed Bond:</span>
                  <span className="text-xs font-black text-slate-900 font-mono">
                    {formatZAR(calculatedMetrics.bondAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    ({loanToValue}% LTV)
                  </span>
                </div>
              </div>

              {/* Main Inputs: Side-by-Side Deposit ZAR and LTV Slider */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* Column 1: Deposit (ZAR) */}
                <div className="lg:col-span-4 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Cash Deposit (ZAR)
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {purchasePrice > 0 ? ((depositZAR / purchasePrice) * 100).toFixed(1) : 0}% Equity
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R</span>
                    <input
                      type="number"
                      name="depositZAR"
                      autoComplete="off"
                      min="0"
                      max={purchasePrice}
                      step="any"
                      value={depositZAR}
                      onChange={(e) => handleDepositChange(Number(e.target.value))}
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-bold text-slate-900 bg-white"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Paid directly to conveyancing attorney upon transfer.
                  </p>
                </div>

                {/* Column 2: Bond LTV (%) Slider + Presets */}
                <div className="lg:col-span-5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Bond Loan-to-Value (LTV)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-emerald-800 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                        {loanToValue}%
                      </span>
                    </div>
                  </div>

                  {/* LTV Range Slider */}
                  <div className="pt-1">
                    <input
                      type="range"
                      name="loanToValuePercent"
                      autoComplete="off"
                      min="0"
                      max="100"
                      step="1"
                      value={loanToValue}
                      onChange={(e) => handleLTVChange(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                      <span>0% (All Cash)</span>
                      <span>50%</span>
                      <span>80%</span>
                      <span>90%</span>
                      <span>100% (Zero Down)</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { ltv: 100, label: '100% (0% Dep)' },
                      { ltv: 90, label: '90% (10% Dep)' },
                      { ltv: 80, label: '80% (20% Dep)' },
                      { ltv: 0, label: '0% (All Cash)' },
                    ].map((preset) => (
                      <button
                        key={preset.ltv}
                        type="button"
                        onClick={() => handleLTVChange(preset.ltv)}
                        className={`flex-1 text-[10px] py-1 px-1.5 rounded-md font-semibold border transition-all ${
                          loanToValue === preset.ltv
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column 3: Interest Rate & Loan Term & Monthly Bond Repayment */}
                <div className="lg:col-span-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Interest Rate</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          name="interestRatePercent"
                          autoComplete="off"
                          min="0"
                          step="any"
                          value={interestRate}
                          onChange={(e) => setInterestRate(Number(e.target.value))}
                          className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg font-semibold bg-white"
                        />
                        <span className="ml-1 text-xs text-slate-500 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Loan Term</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          name="loanTermYears"
                          autoComplete="off"
                          min="5"
                          max="30"
                          value={loanTermYears}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLoanTermYears(val);
                            handleBondTermChange(val);
                          }}
                          className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg font-semibold bg-white"
                        />
                        <span className="ml-1 text-xs text-slate-500 font-bold">yr</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Monthly Bond Repayment:</span>
                    <span className="text-xs font-black text-slate-900 font-mono">
                      {loanToValue > 0 ? `${formatZAR(calculatedMetrics.monthlyBondPayment)}/pm` : 'R 0 (Cash Deal)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Assumptions & Long-Term Projections Collapsible Section */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setShowAdvancedAssumptions(!showAdvancedAssumptions)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Advanced Assumptions & Long-Term Wealth Projections
                      </h4>
                      <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                        {bondTermYears}-Year Model
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Model 20/30-year capital appreciation, rent escalation, inflation, and bond amortization
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                    {showAdvancedAssumptions ? 'Hide Projections' : 'Expand Projections & Graph'}
                  </span>
                  <div className="p-1 rounded-md text-slate-400">
                    {showAdvancedAssumptions ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>

              {showAdvancedAssumptions && (
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50 space-y-5">
                  {/* Assumptions Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Annual Capital Growth */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Annual Capital Growth
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">SA Avg: 5.0%</span>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="number"
                          name="annualCapitalGrowthPercent"
                          autoComplete="off"
                          step="any"
                          min="0"
                          max="25"
                          value={annualCapitalGrowth}
                          onChange={(e) => handleCapitalGrowthChange(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-emerald-700 bg-white"
                        />
                        <span className="ml-1.5 text-xs text-slate-500 font-bold">% p.a.</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Annual property valuation appreciation</p>
                    </div>

                    {/* Annual Rental Escalation */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Rental Escalation
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">SA Avg: 6.0%</span>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="number"
                          name="annualRentalEscalationPercent"
                          autoComplete="off"
                          step="any"
                          min="0"
                          max="25"
                          value={annualRentalEscalation}
                          onChange={(e) => handleRentalEscalationChange(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700 bg-white"
                        />
                        <span className="ml-1.5 text-xs text-slate-500 font-bold">% p.a.</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Compounding yearly tenant lease increase</p>
                    </div>

                    {/* Annual Expense Inflation */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Expense Inflation
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">SA Avg: 6.0%</span>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="number"
                          name="annualExpenseInflationPercent"
                          autoComplete="off"
                          step="any"
                          min="0"
                          max="25"
                          value={annualExpenseInflation}
                          onChange={(e) => handleExpenseInflationChange(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-amber-700 bg-white"
                        />
                        <span className="ml-1.5 text-xs text-slate-500 font-bold">% p.a.</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Municipal rates & levy inflation</p>
                    </div>

                    {/* Bond / Projection Term */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Projection Horizon
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleBondTermChange(20)}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                              bondTermYears === 20
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            20y
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBondTermChange(30)}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                              bondTermYears === 30
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            30y
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="number"
                          name="bondTermYears"
                          autoComplete="off"
                          min="5"
                          max="35"
                          value={bondTermYears}
                          onChange={(e) => handleBondTermChange(Number(e.target.value))}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-white"
                        />
                        <span className="ml-1.5 text-xs text-slate-500 font-bold">Years</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Term for amortization & wealth buildup</p>
                    </div>
                  </div>

                  {/* Reset to SA Averages Button */}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        handleCapitalGrowthChange(5.0);
                        handleRentalEscalationChange(6.0);
                        handleExpenseInflationChange(6.0);
                        handleBondTermChange(20);
                      }}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline transition-colors cursor-pointer"
                    >
                      Reset to South African Benchmark Averages (5% Growth / 6% Escalation / 20 Yrs)
                    </button>
                  </div>

                  {/* Embedded Custom SVG Multi-line Projection Chart */}
                  <div className="pt-2">
                    <LongTermProjectionChart data={calculatedProjections} />
                  </div>
                </div>
              )}
            </div>

            {/* SARS Tax & Legal Overrides + Section 13sex Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        name="customTransferDutyZAR"
                        autoComplete="off"
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
                        name="customConveyancingZAR"
                        autoComplete="off"
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
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-700/60">
                <div className="text-xs uppercase font-semibold text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Calculated Acquisition & Returns Breakdown
                </div>
                <div className="flex items-center gap-2">
                  {isSection13Eligible && (
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Sec 13sex Active: +{formatZAR(calculatedSection13.annualTaxSavingsZAR)}/yr Shield
                    </span>
                  )}
                </div>
              </div>

              {/* Prominent Day-1 Initial Capital Required Hero Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="lg:col-span-5 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isReserveSufficient
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Initial Capital Required (Day 1)
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isReserveSufficient
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {isReserveSufficient
                          ? `Reserve Surplus: +${formatZAR(reserveDelta)}`
                          : `Reserve Shortfall: -${formatZAR(Math.abs(reserveDelta))}`}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-white font-mono mt-0.5">
                      {formatZAR(calculatedMetrics.initialCapitalRequired)}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-wrap items-center gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="font-semibold text-slate-400">Day-1 Outlay Breakdown:</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white">
                    Deposit: <strong className="text-emerald-400">{formatZAR(calculatedMetrics.cashDeposit)}</strong>
                  </span>
                  <span className="text-slate-500">+</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white">
                    SARS Duty: <strong className="text-slate-200">{formatZAR(calculatedCosts.transferDuty)}</strong>
                  </span>
                  <span className="text-slate-500">+</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white">
                    Legal & Bond Fees: <strong className="text-slate-200">{formatZAR(calculatedCosts.conveyancingFee + calculatedCosts.bondRegistrationFee + calculatedCosts.deedsOfficeFee + calculatedCosts.ficaSundries)}</strong>
                  </span>
                  <span className="text-slate-500">+</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white">
                    Rehab/Capex: <strong className="text-amber-400">{formatZAR(rehabCost)}</strong>
                  </span>
                  {auctioneerCommission > 0 && (
                    <>
                      <span className="text-slate-500">+</span>
                      <span className="bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 text-amber-200">
                        Auction Fee: <strong className="text-amber-300">{formatZAR(auctioneerCommission)}</strong>
                      </span>
                    </>
                  )}
                  {municipalArrears > 0 && (
                    <>
                      <span className="text-slate-500">+</span>
                      <span className="bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/40 text-rose-200">
                        Rates Arrears: <strong className="text-rose-300">{formatZAR(municipalArrears)}</strong>
                      </span>
                    </>
                  )}
                  <span className="text-slate-400 text-[10px] block w-full mt-1 border-t border-slate-800 pt-1">
                    Liquid Capital Reserve: <strong className="text-white">{formatZAR(liquidCapitalReserve)}</strong>
                    {isReserveSufficient
                      ? ' • Capital buffer intact for emergency reserves.'
                      : ' • Outlay exceeds current liquid reserve; external syndicate/funder needed.'}
                  </span>
                </div>
              </div>

              {/* Standard Performance & Returns Metric Badges */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 ${isSection13Eligible ? 'lg:grid-cols-4 xl:grid-cols-8' : 'lg:grid-cols-4 xl:grid-cols-7'} gap-3 text-xs pt-1`}>
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
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                  <span className="text-teal-400 block text-[10px] font-semibold">{bondTermYears}y Net Equity</span>
                  <span className="text-sm font-bold text-teal-300">
                    {formatZAR(calculatedProjections[calculatedProjections.length - 1]?.netEquity || 0)}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Compounding asset</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Deal Sourcing Pipeline</h3>
              <p className="text-xs text-slate-500">
                Triage candidates, solve max allowable bids, promote to live Flips or Rentals, or archive passed deals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ImportDropdown type="pipeline" />
              {opportunities.length > 0 && (
                <button
                  onClick={() => exportOpportunitiesCSV(opportunities)}
                  title="Download deal sourcing pipeline as CSV"
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Pipeline (CSV)</span>
                </button>
              )}
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {activeDeals.length} Active / {passedDeals.length} Passed
              </span>
            </div>
          </div>

          {/* Pipeline Triage Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPipelineFilter('active')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  pipelineFilter === 'active'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Active Deals ({activeDeals.length})
              </button>
              <button
                type="button"
                onClick={() => setPipelineFilter('passed')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  pipelineFilter === 'passed'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Passed Deals ({passedDeals.length})
              </button>
            </div>

            {pipelineFilter === 'active' && promotedDeals.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPromoted(!showPromoted)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                {showPromoted ? 'Hide' : 'Show'} {promotedDeals.length} promoted deals
              </button>
            )}
          </div>

          <div className="space-y-4">
            {displayedOpportunities.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
                <Calculator className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">
                  {pipelineFilter === 'passed' ? 'No passed deals in archive' : 'No active deals in sourcing pipeline'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {pipelineFilter === 'passed'
                    ? 'Deals that fail due diligence or exceed your MAO can be passed with rejection reasons and archived here for forensic record.'
                    : 'Use the South African deal analyzer form above to model purchase price, bond leverage, transfer duty, and projected returns, then save candidates to your pipeline.'}
                </p>
              </div>
            ) : (
              displayedOpportunities.map((deal) => {
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
              const effectiveLtv = deal.bondLTV !== undefined ? deal.bondLTV : (deal.loanToValuePercent ?? 100);
              const bondPayment = deal.monthlyBondPaymentZAR ?? (
                effectiveLtv > 0 ? Math.round(deal.purchasePrice * (effectiveLtv / 100) * 0.0108) : 0
              );
              const holdingLevies = deal.propertyType === 'Freehold House' ? 0 : (deal.monthlyLevies ?? 0);
              const holdingRates = deal.monthlyRatesTaxes ?? 0;
              const holdingInsurance = deal.propertyType === 'Freehold House' ? Math.round((deal.annualInsurance ?? 0) / 12) : 0;
              const holdingOther = deal.monthlyOtherHoldingCostZAR ?? 1500;
              const holdingCost = deal.monthlyHoldingCostZAR ?? (bondPayment + holdingLevies + holdingRates + holdingInsurance + holdingOther);

              const displayDeal: OpportunityDeal = {
                ...deal,
                strategy: deal.strategy ?? 'Rental',
                holdingPeriodMonths: deal.holdingPeriodMonths ?? 6,
                monthlyBondPaymentZAR: bondPayment,
                monthlyHoldingCostZAR: holdingCost,
                monthlyOtherHoldingCostZAR: holdingOther,
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
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <PropertyTypeBadge type={deal.propertyType} />
                      <AgmDateChip agmDate={deal.agmDate} />
                      <h4 className="font-bold text-sm text-slate-900">{deal.title}</h4>
                      <span className="text-[10px] font-semibold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                        {deal.source}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
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
                      }`}>
                        {deal.status}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        deal.strategy === 'Flip'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : deal.strategy === 'BRRRR'
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                      }`}>
                        {deal.strategy === 'Flip' ? '🔄 Flip' : deal.strategy === 'BRRRR' ? '⚡ BRRRR' : '🏠 Rental'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {deal.address}, {deal.city} ({deal.province})
                    </p>

                    {/* Rejection / Pass Reason for Archived Deals */}
                    {deal.status === 'Passed' && deal.passReason && (
                      <div className="mt-2 text-[11px] bg-rose-50 border border-rose-200 text-rose-900 rounded-lg px-2.5 py-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-rose-700">Passed:</span>
                        <span className="font-semibold text-rose-800">{deal.passReason}</span>
                        {deal.passNotes && <span className="text-slate-600 italic">— &ldquo;{deal.passNotes}&rdquo;</span>}
                        {deal.passedAt && <span className="text-slate-400 text-[10px]">({deal.passedAt})</span>}
                      </div>
                    )}

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

                    {/* Stage Advancement Button */}
                    {(deal.status === 'Screening' || deal.status === 'Offer Submitted') && (
                      <button
                        type="button"
                        onClick={() => advanceOpportunityStage(deal.id)}
                        title={deal.status === 'Screening' ? 'Advance to Offer Submitted' : 'Advance to Due Diligence'}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
                        <span>{deal.status === 'Screening' ? 'Submit Offer →' : 'Begin DD →'}</span>
                      </button>
                    )}

                    {/* Pass Deal Button with Inline Popover */}
                    {(deal.status === 'Screening' || deal.status === 'Offer Submitted' || deal.status === 'Due Diligence') && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setPassingDealId(passingDealId === deal.id ? null : deal.id)}
                          title="Pass on this deal"
                          className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Pass Deal</span>
                        </button>

                        {passingDealId === deal.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl border border-slate-200 shadow-2xl p-3.5 z-50 text-left animate-fadeIn">
                            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-800">Pass Deal Reason</span>
                              <button
                                type="button"
                                onClick={() => setPassingDealId(null)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 text-xs cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Reason</label>
                            <select
                              value={passReason}
                              onChange={(e) => setPassReason(e.target.value as PassReason)}
                              className="w-full text-xs font-medium px-2 py-1.5 border border-slate-300 rounded-lg mb-2.5 bg-white text-slate-900"
                            >
                              <option value="Yield Too Low">Yield Too Low</option>
                              <option value="High Arrears / Municipal Risk">High Arrears / Municipal Risk</option>
                              <option value="Seller Countered Above MAO">Seller Countered Above MAO</option>
                              <option value="Title Deed Issues">Title Deed Issues</option>
                              <option value="Structural / Damp Report Failed">Structural / Damp Report Failed</option>
                              <option value="Funding Not Secured">Funding Not Secured</option>
                              <option value="Other">Other</option>
                            </select>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Notes (Optional)</label>
                            <textarea
                              value={passNotes}
                              onChange={(e) => setPassNotes(e.target.value)}
                              placeholder="E.g. Counter-offer rejected, repairs too high..."
                              rows={2}
                              className="w-full text-xs p-2 border border-slate-300 rounded-lg mb-2.5 text-slate-800 resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                passOpportunity(deal.id, passReason, passNotes);
                                setPassingDealId(null);
                                setPassReason('Yield Too Low');
                                setPassNotes('');
                              }}
                              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              Confirm Pass Deal
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reactivate Button for Passed Deals */}
                    {deal.status === 'Passed' && (
                      <button
                        type="button"
                        onClick={() => reactivateOpportunity(deal.id)}
                        title="Reactivate deal back to Screening pipeline"
                        className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Reactivate</span>
                      </button>
                    )}

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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-3 border-y border-slate-200/80 my-3 text-xs bg-white/70 px-3 rounded-lg">
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

                {/* Tax Breakdown Sub-Bar */}
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex flex-wrap items-center gap-4">
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
          })
        )}
        </div>
        </div>

        {/* Fee Reset Toast Notification */}
        {feeResetToast && (
          <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Scale className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{feeResetToast}</span>
          </div>
        )}
      </main>
    </div>
  );
}

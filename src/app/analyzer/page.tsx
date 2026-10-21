'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { computeAcquisitionCosts, calculateSection13sex } from '@/lib/calculations/sarsTax';
import {
  calculateDealMetrics,
  calculateDealDscr,
  computeBuiltInEquity,
  computeAmenityScore,
  generateLongTermProjection,
  calculateMonthlyBondRepayment,
  evaluateDealCriteria,
  calculateEffectiveExitCommission,
  calculateRateShockScenarios,
  calculatePaydownImpact,
} from '@/lib/calculations/propertyMetrics';
import { calculateFlipMao, calculateRentalMao } from '@/lib/calculations/maoSolver';
import { formatOpportunityForWhatsApp } from '@/lib/whatsappFormatter';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { OpportunityDeal, DealSource, AmenityDistance, AmenityScorecard, PropertyTitleType, DealStrategy, PassReason, OccupantRiskProfile, Province } from '@/types';
import { PropertyTypeBadge, AgmDateChip } from '@/components/common/PropertyTypeBadge';
import LongTermProjectionChart from '@/components/analytics/LongTermProjectionChart';
import { OccupancyRiskCard } from '@/components/analyzer/OccupancyRiskCard';
import { getOccupantRiskDefaults, isEvictionActive } from '@/lib/calculations/occupantRisk';
import InvestmentNodeSelect, { InvestmentNodeBanner } from '@/components/common/InvestmentNodeSelect';
import { findInvestmentNode, getNodeComplianceProfile, INVESTMENT_REGION_GROUPS } from '@/lib/constants/investmentNodes';
import {
  Calculator,
  Zap,
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
  Layers,
  Sliders,
  ArrowRightLeft,
  Building2,
  Home,
  Warehouse,
  Briefcase,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { exportOpportunitiesCSV } from '@/lib/export/csvExport';
import ImportDropdown from '@/components/common/ImportDropdown';
import AnalyzerModeSwitcher from '@/components/analyzer/AnalyzerModeSwitcher';
import AnalyzerStickyRibbon from '@/components/analyzer/AnalyzerStickyRibbon';
import AnalyzerResultsGrid from '@/components/analyzer/AnalyzerResultsGrid';
import RateShockStrip from '@/components/analytics/RateShockStrip';
import PipelineDealCard from '@/components/analyzer/PipelineDealCard';

export default function OpportunityAnalyzerPage() {
  const opportunities = usePortfolioStore((state) => state.opportunities);
  const addOpportunity = usePortfolioStore((state) => state.addOpportunity);
  const updateOpportunity = usePortfolioStore((state) => state.updateOpportunity);
  const deleteOpportunity = usePortfolioStore((state) => state.deleteOpportunity);
  const duplicateOpportunity = usePortfolioStore((state) => state.duplicateOpportunity);
  const passOpportunity = usePortfolioStore((state) => state.passOpportunity);
  const reactivateOpportunity = usePortfolioStore((state) => state.reactivateOpportunity);
  const advanceOpportunityStage = usePortfolioStore((state) => state.advanceOpportunityStage);
  const promoteOpportunityToFlip = usePortfolioStore((state) => state.promoteOpportunityToFlip);
  const promoteOpportunityToRental = usePortfolioStore((state) => state.promoteOpportunityToRental);
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const liquidCapitalReserve = usePortfolioStore((state) => state.liquidCapitalReserve);
  const analyzerDraft = usePortfolioStore((state) => state.analyzerDraft);
  const draftDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDraftUpdatesRef = useRef<Record<string, unknown>>({});

  const debouncedUpdateAnalyzerDraft = useCallback((patch: Record<string, unknown>) => {
    pendingDraftUpdatesRef.current = { ...pendingDraftUpdatesRef.current, ...patch };
    if (draftDebounceTimerRef.current) {
      clearTimeout(draftDebounceTimerRef.current);
    }
    draftDebounceTimerRef.current = setTimeout(() => {
      usePortfolioStore.getState().updateAnalyzerDraft(pendingDraftUpdatesRef.current as any);
      pendingDraftUpdatesRef.current = {};
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (draftDebounceTimerRef.current) {
        clearTimeout(draftDebounceTimerRef.current);
        if (Object.keys(pendingDraftUpdatesRef.current).length > 0) {
          usePortfolioStore.getState().updateAnalyzerDraft(pendingDraftUpdatesRef.current as any);
        }
      }
    };
  }, []);

  const updateAnalyzerDraft = debouncedUpdateAnalyzerDraft;

  // Form State for Deal Sourcing Calculator
  const [title, setTitle] = useState(analyzerDraft?.title ?? '');
  const [address, setAddress] = useState(analyzerDraft?.address ?? '');
  const [city, setCity] = useState(analyzerDraft?.city ?? 'Johannesburg');
  const [province, setProvince] = useState<Province>(analyzerDraft?.province ?? 'Gauteng');
  const [source, setSource] = useState<DealSource>(analyzerDraft?.source ?? 'Private Agent');
  const [feeResetToast, setFeeResetToast] = useState<string | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyTitleType>(analyzerDraft?.propertyType ?? 'Sectional Title Apartment');
  const [agmDate, setAgmDate] = useState<string>(analyzerDraft?.agmDate ?? '');

  // Valuation vs. Purchase Price
  const [openMarketValue, setOpenMarketValue] = useState<number>(analyzerDraft?.openMarketValue ?? 1_450_000);
  const [purchasePrice, setPurchasePrice] = useState<number>(analyzerDraft?.purchasePrice ?? 1_250_000);
  const [rehabCost, setRehabCost] = useState<number>(analyzerDraft?.rehabCost ?? 30_000);
  const [monthlyRent, setMonthlyRent] = useState<number>(analyzerDraft?.monthlyRent ?? 17_500);
  const [monthlyLevies, setMonthlyLevies] = useState<number>(analyzerDraft?.monthlyLevies ?? 1_400);
  const [annualInsurance, setAnnualInsurance] = useState<number>(analyzerDraft?.annualInsurance ?? (propertyType === 'Freehold House' ? 7_200 : 0));
  const [monthlyRates, setMonthlyRates] = useState<number>(analyzerDraft?.monthlyRates ?? 800);
  const [targetExitPrice, setTargetExitPrice] = useState<number>(analyzerDraft?.targetExitPrice ?? 1_650_000);

  // Vacancy Buffer & Credit Loss + Property Management State
  const [vacancyRate, setVacancyRate] = useState<number>(analyzerDraft?.vacancyRatePercent ?? 6.0);
  const [managementFee, setManagementFee] = useState<number>(analyzerDraft?.managementFeePercent ?? 8.0);
  const [agencyVatApplicable, setAgencyVatApplicable] = useState<boolean>(analyzerDraft?.agencyVatApplicable ?? true);
  const [monthlyMaintenanceReserve, setMonthlyMaintenanceReserve] = useState<number>(analyzerDraft?.monthlyMaintenanceReserveZAR ?? 800);
  const [monthlyPrepaidVendingFee, setMonthlyPrepaidVendingFee] = useState<number>(analyzerDraft?.monthlyPrepaidVendingFeeZAR ?? 150);
  const [monthlyCommunalServices, setMonthlyCommunalServices] = useState<number>(analyzerDraft?.monthlyCommunalServicesZAR ?? 0);

  // Multi-Unit, Syndication & BRRRR Underwriting State
  const [numberOfUnits, setNumberOfUnits] = useState<number>(analyzerDraft?.numberOfUnits ?? 1);
  const [floorAreaSqm, setFloorAreaSqm] = useState<number>(analyzerDraft?.floorAreaSqm ?? 0);
  const [isVatInclusiveDeveloperSale, setIsVatInclusiveDeveloperSale] = useState<boolean>(
    analyzerDraft?.isVatInclusiveDeveloperSale ?? (analyzerDraft?.source === 'iGrow Rentals')
  );
  const [tenantPlacementFeePercent, setTenantPlacementFeePercent] = useState<number>(analyzerDraft?.tenantPlacementFeePercent ?? 0);
  const [annualSpvAdminAuditFeeZAR, setAnnualSpvAdminAuditFeeZAR] = useState<number>(analyzerDraft?.annualSpvAdminAuditFeeZAR ?? 0);
  const [refinanceLtvPercent, setRefinanceLtvPercent] = useState<number>(analyzerDraft?.refinanceLtvPercent ?? 75);
  const [isFiveYearExitOverridden, setIsFiveYearExitOverridden] = useState<boolean>(false);

  // Exit VAT & Holding Sensitivity State
  const [holdingPeriodMonths, setHoldingPeriodMonths] = useState<number>(analyzerDraft?.holdingPeriodMonths ?? 6);
  const [vatExemptAgent, setVatExemptAgent] = useState<boolean>(analyzerDraft?.vatExemptAgent ?? investorProfile?.vatExemptAgent ?? false);

  // MAO Quick Solver State
  const [showMaoSolver, setShowMaoSolver] = useState(false);
  const [maoSolverMode, setMaoSolverMode] = useState<'Flip' | 'Rental'>(analyzerDraft?.strategy === 'Flip' ? 'Flip' : 'Rental');
  const [maoTargetExitPrice, setMaoTargetExitPrice] = useState<number>(analyzerDraft?.targetExitPrice ?? 2_450_000);
  const [maoDesiredRoi, setMaoDesiredRoi] = useState<number>(15);
  const [maoTargetYield, setMaoTargetYield] = useState<number>(8.0);
  const maoSolverRef = useRef<HTMLDivElement>(null);

  // Top Mode Switcher & Workspace Tabs
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'calculator' | 'pipeline'>('calculator');
  const [isStackedView, setIsStackedView] = useState(false);

  // Form reference for live ribbon Save CTA
  const formRef = useRef<HTMLFormElement>(null);

  // Strategy-Aware Progressive Disclosure Accordion States
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [isHoldingOpen, setIsHoldingOpen] = useState(
    analyzerDraft?.strategy === 'Flip' || analyzerDraft?.strategy === 'BRRRR'
  );
  const [isOpExReservesOpen, setIsOpExReservesOpen] = useState(
    (analyzerDraft?.monthlyMaintenanceReserveZAR !== undefined && analyzerDraft?.monthlyMaintenanceReserveZAR !== 800) ||
    (analyzerDraft?.monthlyPrepaidVendingFeeZAR !== undefined && analyzerDraft?.monthlyPrepaidVendingFeeZAR !== 150) ||
    (analyzerDraft?.monthlyCommunalServicesZAR !== undefined && analyzerDraft?.monthlyCommunalServicesZAR > 0) ||
    (analyzerDraft?.tenantPlacementFeePercent !== undefined && analyzerDraft?.tenantPlacementFeePercent > 0) ||
    (analyzerDraft?.annualSpvAdminAuditFeeZAR !== undefined && analyzerDraft?.annualSpvAdminAuditFeeZAR > 0)
  );
  const [isStressAndTaxOpen, setIsStressAndTaxOpen] = useState(
    analyzerDraft?.interestRateMargin !== undefined && analyzerDraft?.interestRateMargin !== 0
  );

  // Deal Triage & Filter State
  const [pipelineFilter, setPipelineFilter] = useState<'active' | 'passed'>('active');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [showPromoted, setShowPromoted] = useState(false);
  const [passingDealId, setPassingDealId] = useState<string | null>(null);
  const [passReason, setPassReason] = useState<PassReason>('Yield Too Low');
  const [passNotes, setPassNotes] = useState('');

  // Deal Comparison State
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Auction Outlays & Distressed Arrears State
  const [auctioneerCommission, setAuctioneerCommission] = useState<number>(analyzerDraft?.auctioneerCommission ?? 0);
  const [municipalArrears, setMunicipalArrears] = useState<number>(analyzerDraft?.municipalArrears ?? 0);

  // Occupant & Eviction Risk State (PIE Act)
  const [occupantRisk, setOccupantRisk] = useState<OccupantRiskProfile>(
    analyzerDraft?.occupantRisk ?? getOccupantRiskDefaults('vacant')
  );

  // Amenity Distance State
  const [schoolsDistance, setSchoolsDistance] = useState<AmenityDistance>('0-5km');
  const [policeDistance, setPoliceDistance] = useState<AmenityDistance>('0-5km');
  const [clinicDistance, setClinicDistance] = useState<AmenityDistance>('0-5km');
  const [mallDistance, setMallDistance] = useState<AmenityDistance>('0-5km');

  // Financing & Bidirectional Deposit / LTV (Defaults to 80% LTV / 20% Deposit)
  const defaultPrimeRate = investorProfile?.defaultPrimeRatePercent ?? 10.75;
  const [loanToValue, setLoanToValue] = useState<number>(analyzerDraft?.loanToValue ?? 80);
  const [depositZAR, setDepositZAR] = useState<number>(analyzerDraft?.depositZAR ?? 250_000);
  const [interestRateMargin, setInterestRateMargin] = useState<number>(analyzerDraft?.interestRateMargin ?? 0.0);
  const [interestRate, setInterestRate] = useState<number>(
    Number((defaultPrimeRate + (analyzerDraft?.interestRateMargin ?? 0.0)).toFixed(2))
  );
  const [loanTermYears, setLoanTermYears] = useState<number>(analyzerDraft?.bondTermYears ?? 20);

  // Strategy Selection
  const [strategy, setStrategy] = useState<DealStrategy>(analyzerDraft?.strategy ?? 'Rental');

  // Long-Term Projections & Escalation Assumptions
  const [annualCapitalGrowth, setAnnualCapitalGrowth] = useState<number>(analyzerDraft?.annualCapitalGrowthPercent ?? 5.0);
  const [annualRentalEscalation, setAnnualRentalEscalation] = useState<number>(analyzerDraft?.annualRentalEscalationPercent ?? 6.0);
  const [annualExpenseInflation, setAnnualExpenseInflation] = useState<number>(analyzerDraft?.annualExpenseInflationPercent ?? 6.0);
  const [bondTermYears, setBondTermYears] = useState<number>(analyzerDraft?.bondTermYears ?? 20);
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState<number>(analyzerDraft?.extraMonthlyPaymentZAR ?? 0);
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
      if (analyzerDraft.extraMonthlyPaymentZAR !== undefined) {
        setExtraMonthlyPayment(analyzerDraft.extraMonthlyPaymentZAR);
      }
      if (analyzerDraft.vacancyRatePercent !== undefined) setVacancyRate(analyzerDraft.vacancyRatePercent);
      if (analyzerDraft.managementFeePercent !== undefined) setManagementFee(analyzerDraft.managementFeePercent);
      if (analyzerDraft.agencyVatApplicable !== undefined) setAgencyVatApplicable(analyzerDraft.agencyVatApplicable);
      if (analyzerDraft.monthlyMaintenanceReserveZAR !== undefined) setMonthlyMaintenanceReserve(analyzerDraft.monthlyMaintenanceReserveZAR);
      if (analyzerDraft.monthlyPrepaidVendingFeeZAR !== undefined) setMonthlyPrepaidVendingFee(analyzerDraft.monthlyPrepaidVendingFeeZAR);
      if (analyzerDraft.monthlyCommunalServicesZAR !== undefined) setMonthlyCommunalServices(analyzerDraft.monthlyCommunalServicesZAR);
      if (analyzerDraft.numberOfUnits !== undefined) setNumberOfUnits(analyzerDraft.numberOfUnits);
      if (analyzerDraft.floorAreaSqm !== undefined) setFloorAreaSqm(analyzerDraft.floorAreaSqm);
      if (analyzerDraft.isVatInclusiveDeveloperSale !== undefined) {
        setIsVatInclusiveDeveloperSale(analyzerDraft.isVatInclusiveDeveloperSale);
      }
      if (analyzerDraft.tenantPlacementFeePercent !== undefined) setTenantPlacementFeePercent(analyzerDraft.tenantPlacementFeePercent);
      if (analyzerDraft.annualSpvAdminAuditFeeZAR !== undefined) setAnnualSpvAdminAuditFeeZAR(analyzerDraft.annualSpvAdminAuditFeeZAR);
      if (analyzerDraft.refinanceLtvPercent !== undefined) setRefinanceLtvPercent(analyzerDraft.refinanceLtvPercent);
      if (analyzerDraft.interestRateMargin !== undefined) {
        setInterestRateMargin(analyzerDraft.interestRateMargin);
        setInterestRate(Number(((investorProfile?.defaultPrimeRatePercent ?? 10.75) + analyzerDraft.interestRateMargin).toFixed(2)));
      }
      if (analyzerDraft.vatExemptAgent !== undefined) {
        setVatExemptAgent(analyzerDraft.vatExemptAgent);
      } else if (investorProfile?.vatExemptAgent !== undefined) {
        setVatExemptAgent(investorProfile.vatExemptAgent);
      }
      if (analyzerDraft.holdingPeriodMonths !== undefined) setHoldingPeriodMonths(analyzerDraft.holdingPeriodMonths);
      if (analyzerDraft.occupantRisk) {
        setOccupantRisk(analyzerDraft.occupantRisk);
      } else {
        setOccupantRisk(getOccupantRiskDefaults('vacant'));
      }
    }
  }, [analyzerDraft, investorProfile?.defaultPrimeRatePercent, investorProfile?.vatExemptAgent]);

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

  // Deep link hash listener for Get Started Guide and external links
  useEffect(() => {
    const syncWorkspaceTabWithHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      if (hash === '#analyzer-pipeline') {
        setActiveWorkspaceTab('pipeline');
      } else if (hash === '#analyzer-calculator' || hash === '#analyzer-results' || hash === '#analyzer-sensitivity') {
        setActiveWorkspaceTab('calculator');
      }
    };
    syncWorkspaceTabWithHash();
    window.addEventListener('hashchange', syncWorkspaceTabWithHash);
    return () => window.removeEventListener('hashchange', syncWorkspaceTabWithHash);
  }, []);

  const isDistressedSource = source === 'High-Street Auction' || source === 'Distressed Sale / Repo';

  const handleSourceChange = (newSource: DealSource) => {
    const isCurrentDistressed = source === 'High-Street Auction' || source === 'Distressed Sale / Repo';
    const isNewDistressed = newSource === 'High-Street Auction' || newSource === 'Distressed Sale / Repo';
    const isIGrowDeveloper = newSource === 'iGrow Rentals';

    setSource(newSource);
    if (isIGrowDeveloper) {
      setIsVatInclusiveDeveloperSale(true);
    }

    if (isCurrentDistressed && !isNewDistressed) {
      const hadFees = (auctioneerCommission || 0) > 0 || (municipalArrears || 0) > 0;
      if (hadFees) {
        setAuctioneerCommission(0);
        setMunicipalArrears(0);
        updateAnalyzerDraft({
          source: newSource,
          auctioneerCommission: 0,
          municipalArrears: 0,
          ...(isIGrowDeveloper ? { isVatInclusiveDeveloperSale: true } : {}),
        });
        setFeeResetToast(
          'Switched to standard retail channel. Auction commission and municipal arrears reset to R0.'
        );
      } else {
        updateAnalyzerDraft({
          source: newSource,
          ...(isIGrowDeveloper ? { isVatInclusiveDeveloperSale: true } : {}),
        });
      }
    } else {
      updateAnalyzerDraft({
        source: newSource,
        ...(isIGrowDeveloper ? { isVatInclusiveDeveloperSale: true } : {}),
      });
    }
  };

  const handleStrategyChange = (newStrategy: DealStrategy) => {
    setStrategy(newStrategy);
    if (newStrategy === 'Flip' || newStrategy === 'BRRRR') {
      setIsHoldingOpen(true);
    } else {
      setIsHoldingOpen(false);
    }
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

  const handleExtraMonthlyPaymentChange = (val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setExtraMonthlyPayment(safeVal);
    updateAnalyzerDraft({ extraMonthlyPaymentZAR: safeVal > 0 ? safeVal : undefined });
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
      customTransferDuty: overrideTax ? customTransferDuty : (isVatInclusiveDeveloperSale ? 0 : undefined),
      customConveyancing: overrideLegal ? customConveyancing : undefined,
      isVatInclusiveDeveloperSale,
      bondAmountZAR: Math.max(0, purchasePrice - depositZAR),
    });
  }, [purchasePrice, loanToValue, depositZAR, overrideTax, customTransferDuty, overrideLegal, customConveyancing, isVatInclusiveDeveloperSale]);

  const defaultAgentCommission = investorProfile?.defaultAgentCommissionPercent ?? 5.0;
  const effectiveExitCommissionPercent = useMemo(() => {
    return calculateEffectiveExitCommission(defaultAgentCommission, vatExemptAgent);
  }, [defaultAgentCommission, vatExemptAgent]);

  const calculatedMetrics = useMemo(() => {
    return calculateDealMetrics({
      purchasePrice,
      openMarketValueZAR: openMarketValue,
      numberOfUnits,
      floorAreaSqm,
      isVatInclusiveDeveloperSale,
      customTransferDutyZAR: overrideTax ? customTransferDuty : undefined,
      tenantPlacementFeePercent,
      annualSpvAdminAuditFeeZAR,
      refinanceLtvPercent,
      estimatedRehabCost: rehabCost,
      monthlyRentalEstimate: monthlyRent,
      monthlyLevies: propertyType === 'Freehold House' ? 0 : monthlyLevies,
      monthlyRatesTaxes: monthlyRates,
      annualInsurance: propertyType === 'Freehold House' ? annualInsurance : 0,
      managementFeePercent: managementFee,
      agencyVatApplicable,
      vacancyRatePercent: vacancyRate,
      targetExitPrice,
      explicitFiveYearExitPriceZAR: strategy === 'Rental' && isFiveYearExitOverridden && targetExitPrice > 0 ? targetExitPrice : undefined,
      holdingPeriodMonths,
      loanToValuePercent: loanToValue,
      depositZAR,
      bondLTV: loanToValue,
      interestRatePercent: interestRate,
      interestRateMargin,
      vatExemptAgent,
      defaultAgentCommissionPercent: defaultAgentCommission,
      loanTermYears,
      annualCapitalGrowthPercent: annualCapitalGrowth,
      annualRentalEscalationPercent: annualRentalEscalation,
      annualExpenseInflationPercent: annualExpenseInflation,
      extraMonthlyPaymentZAR: extraMonthlyPayment,
      costs: calculatedCosts,
      recomputeBondRegFromDeposit: true,
      auctioneerCommissionZAR: auctioneerCommission,
      municipalArrearsZAR: municipalArrears,
      exitCommissionPercent: effectiveExitCommissionPercent,
      monthlyMaintenanceReserveZAR: monthlyMaintenanceReserve,
      monthlyPrepaidVendingFeeZAR: monthlyPrepaidVendingFee,
      monthlyCommunalServicesZAR: monthlyCommunalServices,
      occupantRisk,
    });
  }, [
    purchasePrice,
    openMarketValue,
    numberOfUnits,
    floorAreaSqm,
    isVatInclusiveDeveloperSale,
    overrideTax,
    customTransferDuty,
    tenantPlacementFeePercent,
    annualSpvAdminAuditFeeZAR,
    refinanceLtvPercent,
    rehabCost,
    monthlyRent,
    monthlyLevies,
    monthlyRates,
    annualInsurance,
    managementFee,
    agencyVatApplicable,
    monthlyMaintenanceReserve,
    monthlyPrepaidVendingFee,
    monthlyCommunalServices,
    vacancyRate,
    propertyType,
    targetExitPrice,
    strategy,
    isFiveYearExitOverridden,
    holdingPeriodMonths,
    loanToValue,
    depositZAR,
    interestRate,
    interestRateMargin,
    vatExemptAgent,
    defaultAgentCommission,
    effectiveExitCommissionPercent,
    loanTermYears,
    annualCapitalGrowth,
    annualRentalEscalation,
    annualExpenseInflation,
    calculatedCosts,
    auctioneerCommission,
    municipalArrears,
    extraMonthlyPayment,
    occupantRisk,
  ]);

  // Day-1 Capital Required vs Liquid Capital Reserve comparison
  const reserveDelta = liquidCapitalReserve - calculatedMetrics.initialCapitalRequired;
  const isReserveSufficient = reserveDelta >= 0;

  // Rate-Shock Sensitivity Scenarios (Rental & BRRRR)
  const rateShockScenarios = useMemo(() => {
    if (strategy === 'Flip' || calculatedMetrics.bondAmount <= 0) return [];
    return calculateRateShockScenarios({
      monthlyNoi: calculatedMetrics.monthlyNOI,
      bondAmount: calculatedMetrics.bondAmount,
      baseRatePercent: interestRate,
      loanTermYears: bondTermYears,
      minDscr: investorProfile?.minDscr ?? 1.2,
    });
  }, [strategy, calculatedMetrics.monthlyNOI, calculatedMetrics.bondAmount, interestRate, bondTermYears, investorProfile?.minDscr]);

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
      monthlyCommunalServicesZAR: monthlyCommunalServices,
      monthlyMaintenanceReserveZAR: monthlyMaintenanceReserve,
      monthlyPrepaidVendingFeeZAR: monthlyPrepaidVendingFee,
      tenantPlacementFeePercent,
      annualSpvAdminAuditFeeZAR,
      extraMonthlyPaymentZAR: extraMonthlyPayment,
    });
  }, [
    purchasePrice,
    openMarketValue,
    depositZAR,
    loanToValue,
    interestRate,
    bondTermYears,
    extraMonthlyPayment,
    annualCapitalGrowth,
    annualRentalEscalation,
    annualExpenseInflation,
    monthlyRent,
    monthlyLevies,
    monthlyRates,
    annualInsurance,
    managementFee,
    agencyVatApplicable,
    monthlyCommunalServices,
    monthlyMaintenanceReserve,
    monthlyPrepaidVendingFee,
    tenantPlacementFeePercent,
    annualSpvAdminAuditFeeZAR,
    vacancyRate,
    propertyType,
  ]);

  // Comparative Paydown & BRRRR Refinance Acceleration Impact
  const paydownImpact = useMemo(() => {
    if (strategy === 'Flip' || extraMonthlyPayment <= 0 || calculatedMetrics.bondAmount <= 0) return null;
    return calculatePaydownImpact({
      principal: calculatedMetrics.bondAmount,
      annualRatePercent: interestRate,
      termYears: bondTermYears,
      extraMonthlyPaymentZAR: extraMonthlyPayment,
      startPropertyValue: openMarketValue > 0 ? openMarketValue : purchasePrice,
      annualGrowthPercent: annualCapitalGrowth,
      refinanceLtvPercent,
    });
  }, [
    strategy,
    extraMonthlyPayment,
    calculatedMetrics.bondAmount,
    interestRate,
    bondTermYears,
    openMarketValue,
    purchasePrice,
    annualCapitalGrowth,
    refinanceLtvPercent,
  ]);

  // Holding reserve estimation for Flip MAO solver accounting for actual holdingPeriodMonths
  const flipHoldingReserve = useMemo(() => {
    const leviesClean = propertyType === 'Freehold House' ? 0 : monthlyLevies;
    const insuranceClean = propertyType === 'Freehold House' ? Math.round(annualInsurance / 12) : 0;
    const siteSecurityAndUtilitiesAllowance = 1500;
    const holdingMonths = holdingPeriodMonths > 0 ? holdingPeriodMonths : 6;
    return (leviesClean + monthlyRates + insuranceClean + siteSecurityAndUtilitiesAllowance) * holdingMonths;
  }, [propertyType, monthlyLevies, monthlyRates, annualInsurance, holdingPeriodMonths]);

  const computedFlipMao = useMemo(() => {
    return calculateFlipMao({
      targetExitPrice: maoTargetExitPrice,
      desiredRoiPercent: maoDesiredRoi,
      rehabCost,
      holdingCost: flipHoldingReserve,
      holdingPeriodMonths,
      estimatedAcquisitionCostRate: 0.05,
      exitCommissionPercent: effectiveExitCommissionPercent,
      municipalClearanceZAR: municipalArrears,
      occupantRisk,
      bondLtvPercent: loanToValue,
      bondInterestRatePercent: interestRate,
    });
  }, [
    maoTargetExitPrice,
    maoDesiredRoi,
    rehabCost,
    flipHoldingReserve,
    holdingPeriodMonths,
    effectiveExitCommissionPercent,
    municipalArrears,
    occupantRisk,
    loanToValue,
    interestRate,
  ]);

  const computedRentalMao = useMemo(() => {
    return calculateRentalMao({
      monthlyRent,
      vacancyRatePercent: vacancyRate,
      managementFeePercent: managementFee,
      agencyVatApplicable,
      monthlyLevies: propertyType === 'Freehold House' ? 0 : monthlyLevies,
      monthlyRates,
      annualInsurance: propertyType === 'Freehold House' ? annualInsurance : 0,
      monthlyMaintenanceReserve,
      monthlyPrepaidVendingFee,
      monthlyCommunalServicesZAR: monthlyCommunalServices,
      tenantPlacementFeePercent,
      annualSpvAdminAuditFeeZAR,
      rehabCost,
      estimatedAcquisitionCostRate: 0.05,
      targetNetYieldPercent: maoTargetYield,
      occupantRisk,
      bondLtvPercent: loanToValue,
      bondInterestRatePercent: interestRate,
    });
  }, [
    monthlyRent,
    vacancyRate,
    managementFee,
    agencyVatApplicable,
    propertyType,
    monthlyLevies,
    monthlyRates,
    annualInsurance,
    monthlyMaintenanceReserve,
    monthlyPrepaidVendingFee,
    monthlyCommunalServices,
    tenantPlacementFeePercent,
    annualSpvAdminAuditFeeZAR,
    rehabCost,
    maoTargetYield,
    occupantRisk,
    loanToValue,
    interestRate,
  ]);

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
      monthlyCommunalServicesZAR: monthlyCommunalServices,
      numberOfUnits,
      floorAreaSqm,
      isVatInclusiveDeveloperSale,
      tenantPlacementFeePercent,
      annualSpvAdminAuditFeeZAR,
      refinanceLtvPercent,
      managementFeePercent: managementFee,
      agencyVatApplicable,
      vacancyRatePercent: vacancyRate,
      targetExitPrice,
      exitCommissionPercent: 5.75,
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
      extraMonthlyPaymentZAR: extraMonthlyPayment,
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
      occupantRisk: {
        ...occupantRisk,
        totalEvictionCarryingCostZAR: calculatedMetrics.totalOccupantCostZAR ?? 0,
      },
      createdAt: new Date().toISOString().split('T')[0],
    };

    const text = formatOpportunityForWhatsApp(tempDeal, investorProfile);
    navigator.clipboard.writeText(text);
    setCopiedCalc(true);
    setTimeout(() => setCopiedCalc(false), 2500);
  };

  const handleCopyOpportunityWhatsApp = (deal: OpportunityDeal) => {
    const text = formatOpportunityForWhatsApp(deal, investorProfile);
    navigator.clipboard.writeText(text);
    setCopiedDealId(deal.id);
    setTimeout(() => setCopiedDealId(null), 2500);
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
    setHoldingPeriodMonths(deal.holdingPeriodMonths ?? 6);
    setInterestRateMargin(deal.interestRateMargin ?? 0.0);
    setVatExemptAgent(deal.vatExemptAgent ?? (investorProfile?.vatExemptAgent ?? false));
    setMonthlyMaintenanceReserve(deal.monthlyMaintenanceReserveZAR !== undefined ? deal.monthlyMaintenanceReserveZAR : (analyzerDraft?.monthlyMaintenanceReserveZAR ?? 800));
    setMonthlyPrepaidVendingFee(deal.monthlyPrepaidVendingFeeZAR !== undefined ? deal.monthlyPrepaidVendingFeeZAR : (analyzerDraft?.monthlyPrepaidVendingFeeZAR ?? 150));
    setMonthlyCommunalServices(deal.monthlyCommunalServicesZAR !== undefined ? deal.monthlyCommunalServicesZAR : (analyzerDraft?.monthlyCommunalServicesZAR ?? 0));
    setNumberOfUnits(deal.numberOfUnits ?? 1);
    setFloorAreaSqm(deal.floorAreaSqm ?? 0);
    const isDevSale = deal.isVatInclusiveDeveloperSale ?? (deal.source === 'iGrow Rentals');
    setIsVatInclusiveDeveloperSale(isDevSale);
    setTenantPlacementFeePercent(deal.tenantPlacementFeePercent ?? 0);
    setAnnualSpvAdminAuditFeeZAR(deal.annualSpvAdminAuditFeeZAR ?? 0);
    setRefinanceLtvPercent(deal.refinanceLtvPercent ?? 75);
    setIsFiveYearExitOverridden(false);
    const hasCustomDuty = deal.customTransferDuty !== undefined && (!isDevSale || deal.customTransferDuty > 0);
    setOverrideTax(hasCustomDuty);
    setCustomTransferDuty(hasCustomDuty ? (deal.customTransferDuty ?? 0) : 0);
    const hasCustomLegal = deal.customConveyancing !== undefined;
    setOverrideLegal(hasCustomLegal);
    setCustomConveyancing(hasCustomLegal ? (deal.customConveyancing ?? 0) : 0);
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
    setExtraMonthlyPayment(deal.extraMonthlyPaymentZAR ?? 0);
    setIsSection13Eligible(!!deal.section13sex);
    setSection13TaxRate(deal.section13sex?.taxRatePercent || 27);
    if (deal.amenityScorecard) {
      setSchoolsDistance(deal.amenityScorecard.schools);
      setPoliceDistance(deal.amenityScorecard.policeStation);
      setClinicDistance(deal.amenityScorecard.medicalClinic);
      setMallDistance(deal.amenityScorecard.shoppingMall);
    }
    setOccupantRisk(deal.occupantRisk ?? getOccupantRiskDefaults('vacant'));
    setActiveWorkspaceTab('calculator');
    if (deal.strategy === 'Flip' || deal.strategy === 'BRRRR') {
      setIsHoldingOpen(true);
    } else {
      setIsHoldingOpen(false);
    }
    if (deal.interestRateMargin || deal.section13sex || hasCustomDuty || hasCustomLegal) {
      setIsStressAndTaxOpen(true);
    }
    if (
      (deal.monthlyMaintenanceReserveZAR !== undefined && deal.monthlyMaintenanceReserveZAR !== 800) ||
      (deal.tenantPlacementFeePercent && deal.tenantPlacementFeePercent > 0) ||
      (deal.annualSpvAdminAuditFeeZAR && deal.annualSpvAdminAuditFeeZAR > 0)
    ) {
      setIsOpExReservesOpen(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingDealId(null);
    setTitle(analyzerDraft?.title ?? '');
    setAddress(analyzerDraft?.address ?? '');
    setPropertyType(analyzerDraft?.propertyType ?? 'Sectional Title Apartment');
    setAgmDate(analyzerDraft?.agmDate ?? '');
    setAnnualInsurance(0);
    setStrategy(analyzerDraft?.strategy ?? 'Rental');
    setAuctioneerCommission(0);
    setMunicipalArrears(0);
    setLoanToValue(analyzerDraft?.loanToValue ?? 80);
    setDepositZAR(analyzerDraft?.depositZAR ?? 250_000);
    setInterestRateMargin(0.0);
    setInterestRate(defaultPrimeRate);
    setHoldingPeriodMonths(6);
    setVatExemptAgent(investorProfile?.vatExemptAgent ?? false);
    setMonthlyMaintenanceReserve(analyzerDraft?.monthlyMaintenanceReserveZAR ?? 800);
    setMonthlyPrepaidVendingFee(analyzerDraft?.monthlyPrepaidVendingFeeZAR ?? 150);
    setMonthlyCommunalServices(analyzerDraft?.monthlyCommunalServicesZAR ?? 0);
    setNumberOfUnits(analyzerDraft?.numberOfUnits ?? 1);
    setFloorAreaSqm(analyzerDraft?.floorAreaSqm ?? 0);
    setIsVatInclusiveDeveloperSale(analyzerDraft?.isVatInclusiveDeveloperSale ?? false);
    setTenantPlacementFeePercent(analyzerDraft?.tenantPlacementFeePercent ?? 0);
    setAnnualSpvAdminAuditFeeZAR(analyzerDraft?.annualSpvAdminAuditFeeZAR ?? 0);
    setRefinanceLtvPercent(analyzerDraft?.refinanceLtvPercent ?? 75);
    setIsFiveYearExitOverridden(false);
    setOverrideTax(false);
    setCustomTransferDuty(0);
    setOverrideLegal(false);
    setCustomConveyancing(0);
    setAnnualCapitalGrowth(5.0);
    setAnnualRentalEscalation(6.0);
    setAnnualExpenseInflation(6.0);
    setExtraMonthlyPayment(0);
    setBondTermYears(20);
    setLoanTermYears(20);
    setVacancyRate(analyzerDraft?.vacancyRatePercent ?? 6.0);
    setManagementFee(analyzerDraft?.managementFeePercent ?? 8.0);
    setAgencyVatApplicable(analyzerDraft?.agencyVatApplicable ?? true);
    setOccupantRisk(analyzerDraft?.occupantRisk ?? getOccupantRiskDefaults('vacant'));
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
        numberOfUnits,
        floorAreaSqm,
        isVatInclusiveDeveloperSale,
        tenantPlacementFeePercent,
        annualSpvAdminAuditFeeZAR,
        refinanceLtvPercent,
        targetExitPrice,
        holdingPeriodMonths,
        exitCommissionPercent: effectiveExitCommissionPercent,
        vatExemptAgent,
        interestRateMargin,
        monthlyBondPaymentZAR: calculatedMetrics.monthlyBondPayment,
        monthlyOtherHoldingCostZAR: (monthlyMaintenanceReserve || 0) + (monthlyPrepaidVendingFee || 0) + (monthlyCommunalServices || 0),
        monthlyMaintenanceReserveZAR: monthlyMaintenanceReserve,
        monthlyPrepaidVendingFeeZAR: monthlyPrepaidVendingFee,
        monthlyCommunalServicesZAR: monthlyCommunalServices || undefined,
        monthlyHoldingCostZAR: (finalLevies || 0) + (monthlyRates || 0) + monthlyInsurance + (calculatedMetrics.monthlyBondPayment || 0) + (monthlyMaintenanceReserve || 0) + (monthlyPrepaidVendingFee || 0) + (monthlyCommunalServices || 0),
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
        extraMonthlyPaymentZAR: extraMonthlyPayment > 0 ? extraMonthlyPayment : undefined,
        customTransferDuty: overrideTax ? customTransferDuty : (isVatInclusiveDeveloperSale ? 0 : undefined),
        customConveyancing: overrideLegal ? customConveyancing : undefined,
        costs: calculatedCosts,
        section13sex: isSection13Eligible ? calculatedSection13 : undefined,
        occupantRisk: {
          ...occupantRisk,
          totalEvictionCarryingCostZAR: calculatedMetrics.totalOccupantCostZAR ?? 0,
        },
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
      setCity('Johannesburg CBD & Maboneng');
      setProvince('Gauteng');
      setPropertyType('Sectional Title Apartment');
      setAgmDate('');
      setAnnualInsurance(0);
      setStrategy('Rental');
      setAuctioneerCommission(0);
      setMunicipalArrears(0);
      setLoanToValue(100);
      setDepositZAR(0);
      setInterestRateMargin(0.0);
      setInterestRate(defaultPrimeRate);
      setHoldingPeriodMonths(6);
      setVatExemptAgent(investorProfile?.vatExemptAgent ?? false);
      setMonthlyMaintenanceReserve(analyzerDraft?.monthlyMaintenanceReserveZAR ?? 800);
      setMonthlyPrepaidVendingFee(analyzerDraft?.monthlyPrepaidVendingFeeZAR ?? 150);
      setMonthlyCommunalServices(analyzerDraft?.monthlyCommunalServicesZAR ?? 0);
      setNumberOfUnits(analyzerDraft?.numberOfUnits ?? 1);
      setFloorAreaSqm(analyzerDraft?.floorAreaSqm ?? 0);
      setIsVatInclusiveDeveloperSale(analyzerDraft?.isVatInclusiveDeveloperSale ?? false);
      setTenantPlacementFeePercent(analyzerDraft?.tenantPlacementFeePercent ?? 0);
      setAnnualSpvAdminAuditFeeZAR(analyzerDraft?.annualSpvAdminAuditFeeZAR ?? 0);
      setRefinanceLtvPercent(analyzerDraft?.refinanceLtvPercent ?? 75);
      setIsFiveYearExitOverridden(false);
      setOverrideTax(false);
      setCustomTransferDuty(0);
      setOverrideLegal(false);
      setCustomConveyancing(0);
      setAnnualCapitalGrowth(5.0);
      setAnnualRentalEscalation(6.0);
      setAnnualExpenseInflation(6.0);
      setBondTermYears(20);
      setLoanTermYears(20);
      setVacancyRate(analyzerDraft?.vacancyRatePercent ?? 6.0);
      setManagementFee(analyzerDraft?.managementFeePercent ?? 8.0);
      setAgencyVatApplicable(analyzerDraft?.agencyVatApplicable ?? true);
      setOccupantRisk(getOccupantRiskDefaults('vacant'));
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
      numberOfUnits,
      floorAreaSqm,
      isVatInclusiveDeveloperSale,
      tenantPlacementFeePercent,
      annualSpvAdminAuditFeeZAR,
      refinanceLtvPercent,
      targetExitPrice,
      exitCommissionPercent: effectiveExitCommissionPercent,
      vatExemptAgent,
      interestRateMargin,
      holdingPeriodMonths,
      monthlyBondPaymentZAR: calculatedMetrics.monthlyBondPayment,
      monthlyOtherHoldingCostZAR: (monthlyMaintenanceReserve || 0) + (monthlyPrepaidVendingFee || 0) + (monthlyCommunalServices || 0),
      monthlyMaintenanceReserveZAR: monthlyMaintenanceReserve,
      monthlyPrepaidVendingFeeZAR: monthlyPrepaidVendingFee,
      monthlyCommunalServicesZAR: monthlyCommunalServices || undefined,
      monthlyHoldingCostZAR: (finalLevies || 0) + (monthlyRates || 0) + monthlyInsurance + (calculatedMetrics.monthlyBondPayment || 0) + (monthlyMaintenanceReserve || 0) + (monthlyPrepaidVendingFee || 0) + (monthlyCommunalServices || 0),
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
      extraMonthlyPaymentZAR: extraMonthlyPayment > 0 ? extraMonthlyPayment : undefined,
      customTransferDuty: overrideTax ? customTransferDuty : (isVatInclusiveDeveloperSale ? 0 : undefined),
      customConveyancing: overrideLegal ? customConveyancing : undefined,
      costs: calculatedCosts,
      section13sex: isSection13Eligible ? calculatedSection13 : undefined,
      occupantRisk: {
        ...occupantRisk,
        totalEvictionCarryingCostZAR: calculatedMetrics.totalOccupantCostZAR ?? 0,
      },
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
    setExtraMonthlyPayment(0);
    setTitle('');
    setAddress('');
    setCity(analyzerDraft?.city ?? 'Johannesburg');
    setProvince(analyzerDraft?.province ?? 'Gauteng');
    setPropertyType(analyzerDraft?.propertyType ?? 'Sectional Title Apartment');
    setAgmDate(analyzerDraft?.agmDate ?? '');
    setAnnualInsurance(0);
    setAuctioneerCommission(0);
    setMunicipalArrears(0);
    setLoanToValue(analyzerDraft?.loanToValue ?? 80);
    setDepositZAR(analyzerDraft?.depositZAR ?? 250_000);
    setVatExemptAgent(investorProfile?.vatExemptAgent ?? false);
    setMonthlyMaintenanceReserve(analyzerDraft?.monthlyMaintenanceReserveZAR ?? 800);
    setMonthlyPrepaidVendingFee(analyzerDraft?.monthlyPrepaidVendingFeeZAR ?? 150);
    setMonthlyCommunalServices(analyzerDraft?.monthlyCommunalServicesZAR ?? 0);
    setNumberOfUnits(analyzerDraft?.numberOfUnits ?? 1);
    setFloorAreaSqm(analyzerDraft?.floorAreaSqm ?? 0);
    setIsVatInclusiveDeveloperSale(analyzerDraft?.isVatInclusiveDeveloperSale ?? false);
    setTenantPlacementFeePercent(analyzerDraft?.tenantPlacementFeePercent ?? 0);
    setAnnualSpvAdminAuditFeeZAR(analyzerDraft?.annualSpvAdminAuditFeeZAR ?? 0);
    setRefinanceLtvPercent(analyzerDraft?.refinanceLtvPercent ?? 75);
    setIsFiveYearExitOverridden(false);
    setOverrideTax(false);
    setCustomTransferDuty(0);
    setOverrideLegal(false);
    setCustomConveyancing(0);
    setVacancyRate(analyzerDraft?.vacancyRatePercent ?? 6.0);
    setManagementFee(analyzerDraft?.managementFeePercent ?? 8.0);
    setAgencyVatApplicable(analyzerDraft?.agencyVatApplicable ?? true);
    setOccupantRisk(getOccupantRiskDefaults('vacant'));
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
    const base = pipelineFilter === 'passed' ? passedDeals : (showPromoted ? [...activeDeals, ...promotedDeals] : activeDeals);
    if (regionFilter === 'all') return base;
    return base.filter((deal) => {
      const node = findInvestmentNode(deal.city);
      if (node) return node.regionGroupId === regionFilter;
      if (regionFilter === 'gauteng_jhb' || regionFilter === 'gauteng_tshwane') return deal.province === 'Gauteng';
      if (regionFilter === 'western_cape') return deal.province === 'Western Cape';
      if (regionFilter === 'kzn') return deal.province === 'KwaZulu-Natal';
      if (regionFilter === 'coastal_emerging') return ['Eastern Cape', 'Free State', 'Limpopo'].includes(deal.province);
      return false;
    });
  }, [pipelineFilter, activeDeals, passedDeals, promotedDeals, showPromoted, regionFilter]);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Opportunity Analyzer"
        subtitle="Deal-sourcing calculator with official progressive SARS transfer duty brackets and yield engines"
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto pb-32">
        {/* Top Mode Switcher */}
        <AnalyzerModeSwitcher
          activeTab={activeWorkspaceTab}
          onTabChange={setActiveWorkspaceTab}
          activeDealsCount={activeDeals.length}
          passedDealsCount={passedDeals.length}
          isStacked={isStackedView}
          onToggleStacked={() => setIsStackedView(!isStackedView)}
        />

        {/* Sticky Live Underwriting Ribbon */}
        {(activeWorkspaceTab === 'calculator' || isStackedView) && (
          <AnalyzerStickyRibbon
            strategy={strategy}
            dayOneCapitalRequired={calculatedMetrics.initialCapitalRequired}
            builtInEquity={calculatedBuiltInEquity.builtInEquityZAR}
            builtInEquityPercent={calculatedBuiltInEquity.builtInEquityPercent}
            grossYield={calculatedMetrics.grossYield}
            netCapRate={calculatedMetrics.capRate}
            monthlyNetCashFlow={calculatedMetrics.monthlyCashFlow}
            netRoi={calculatedMetrics.netRoi}
            dscr={calculatedMetrics.dscr}
            fiveYearIrrPercent={calculatedMetrics.fiveYearIrrPercent}
            projectedFlipProfit={calculatedMetrics.projectedFlipNetProfit}
            projectedFlipROI={calculatedMetrics.projectedFlipRoi}
            annualizedFlipROI={calculatedMetrics.annualizedFlipRoi}
            monthlyHoldingBurnZAR={calculatedMetrics.monthlyHoldingBurnZAR}
            brrrrPostRefiCashflowZAR={calculatedMetrics.brrrrPostRefiCashflowZAR}
            brrrrEquityExtractedZAR={calculatedMetrics.brrrrEquityExtractedZAR}
            brrrrCashLeftInDealZAR={calculatedMetrics.brrrrCashLeftInDealZAR}
            isEditing={Boolean(editingDealId)}
            onSaveDeal={() => formRef.current?.requestSubmit()}
            onScrollToResults={() => {
              document.getElementById('analyzer-results')?.scrollIntoView({ behavior: 'smooth' });
            }}
            cashDeposit={calculatedMetrics.cashDeposit}
            transferDuty={calculatedMetrics.transferDutyZAR}
            legalFees={
              calculatedCosts.conveyancingFee +
              calculatedCosts.bondRegistrationFee +
              calculatedCosts.deedsOfficeFee +
              calculatedCosts.ficaSundries
            }
            rehabCost={rehabCost}
            auctioneerCommission={auctioneerCommission}
            municipalArrears={municipalArrears}
          />
        )}

        {/* Deal Calculator Card */}
        {(activeWorkspaceTab === 'calculator' || isStackedView) && (
          <div id="analyzer-calculator" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs">
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
              <div className="relative">
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
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="fixed inset-0" onClick={() => setShowMaoSolver(false)} />
                    <div
                      ref={maoSolverRef}
                      className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-200 sm:duration-150 sm:zoom-in-95 text-slate-900"
                    >
                      {/* Mobile Drag Indicator */}
                      <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-violet-100 text-violet-700 rounded-xl">
                            <Target className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">MAO Quick Solver</h4>
                            <p className="text-[11px] text-slate-500">Maximum Allowable Offer Calculator</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowMaoSolver(false)}
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-sm cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Mode Toggle Tabs (Defaults to current strategy) */}
                      <div className="flex rounded-lg bg-slate-100 p-1 mb-4 text-xs">
                        <button
                          type="button"
                          onClick={() => setMaoSolverMode('Flip')}
                          className={`flex-1 py-1.5 px-3 font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            maoSolverMode === 'Flip'
                              ? 'bg-white text-slate-900 shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Hammer className="w-3.5 h-3.5" />
                          <span>Flip Exit ROI</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaoSolverMode('Rental')}
                          className={`flex-1 py-1.5 px-3 font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            maoSolverMode === 'Rental'
                              ? 'bg-white text-slate-900 shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Rental Net Yield</span>
                        </button>
                      </div>

                      {maoSolverMode === 'Flip' ? (
                        <div className="space-y-4">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Solves the maximum bid that satisfies your target ROI after factoring in BOQ rehab, 6-month holding costs, and 5% acquisition friction.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Exit Price (ZAR)</label>
                              <input
                                type="number"
                                name="maoTargetExitPriceZAR"
                                autoComplete="off"
                                min="0"
                                step="any"
                                value={maoTargetExitPrice}
                                onChange={(e) => setMaoTargetExitPrice(Number(e.target.value))}
                                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Desired ROI (%)</label>
                              <input
                                type="number"
                                name="maoDesiredRoiPercent"
                                autoComplete="off"
                                min="0"
                                step="any"
                                value={maoDesiredRoi}
                                onChange={(e) => setMaoDesiredRoi(Number(e.target.value))}
                                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                              />
                            </div>
                          </div>

                          <div className="bg-violet-50/80 border border-violet-200 rounded-xl p-3.5 space-y-2 text-xs text-violet-950">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Allowable Total Capital:</span>
                              <span className="font-semibold text-slate-800">{formatZAR(computedFlipMao.totalAllowableOutlay)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Less BOQ, Holding & Exit Friction:</span>
                              <span className="text-rose-600 font-semibold">-{formatZAR(computedFlipMao.nonPurchaseCosts)}</span>
                            </div>
                            {(computedFlipMao.occupantRiskReductionZAR ?? 0) > 0 && (
                              <div className="flex justify-between text-xs text-rose-700 bg-rose-50/80 px-2 py-1 rounded border border-rose-200">
                                <span>PIE Act Eviction Risk Reduction:</span>
                                <span className="font-bold">-{formatZAR(computedFlipMao.occupantRiskReductionZAR ?? 0)}</span>
                              </div>
                            )}
                            <div className="border-t border-violet-200 pt-2 flex justify-between items-center">
                              <span className="font-bold text-violet-900">Max Allowable Bid (MAO):</span>
                              <span className="text-base font-black text-violet-800">{formatZAR(computedFlipMao.maxAllowableBid)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyMaoBid(computedFlipMao.maxAllowableBid)}
                            disabled={computedFlipMao.maxAllowableBid <= 0}
                            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Target className="w-4 h-4" />
                            <span>Set as Target Bid ({formatZAR(computedFlipMao.maxAllowableBid)})</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Solves the maximum purchase price based on your target net yield (Cap Rate) and stress-tested NOI (with {vacancyRate}% vacancy &amp; {managementFee}%{agencyVatApplicable ? ' + 15% VAT' : ''} agent fee).
                          </p>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-semibold text-slate-600">Target Net Yield / Cap Rate (%)</label>
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
                              className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>

                          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs text-emerald-950">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Stress-Tested Annual NOI:</span>
                              <span className="font-semibold text-emerald-800">{formatZAR(computedRentalMao.stressTestedNoi)}/yr</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Vacancy Buffer ({vacancyRate}%):</span>
                              <span>-{formatZAR(computedRentalMao.vacancyLossAnnual)}/yr</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Agent Fee ({managementFee}%{agencyVatApplicable ? '+VAT' : ''}):</span>
                              <span>-{formatZAR(computedRentalMao.managementFeeAnnual)}/yr</span>
                            </div>
                            {(computedRentalMao.occupantRiskReductionZAR ?? 0) > 0 && (
                              <div className="flex justify-between text-xs text-rose-700 bg-rose-50/80 px-2 py-1 rounded border border-rose-200">
                                <span>PIE Act Eviction Risk Reduction:</span>
                                <span className="font-bold">-{formatZAR(computedRentalMao.occupantRiskReductionZAR ?? 0)}</span>
                              </div>
                            )}
                            <div className="border-t border-emerald-200 pt-2 flex justify-between items-center">
                              <span className="font-bold text-emerald-950">Max Purchase Price:</span>
                              <span className="text-base font-black text-emerald-800">{formatZAR(computedRentalMao.maxAllowablePrice)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyMaoBid(computedRentalMao.maxAllowablePrice)}
                            disabled={computedRentalMao.maxAllowablePrice <= 0}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Target className="w-4 h-4" />
                            <span>Set as Target Bid ({formatZAR(computedRentalMao.maxAllowablePrice)})</span>
                          </button>
                        </div>
                      )}
                    </div>
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

          <form ref={formRef} onSubmit={handleSaveOpportunity} noValidate className="space-y-6">
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
                <InvestmentNodeSelect
                  value={city}
                  province={province}
                  onChange={(newCity, newProvince) => {
                    setCity(newCity);
                    setProvince(newProvince);
                  }}
                  showProfileBanner={false}
                />
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

            {/* Selected Investment Node Profile & Regional Compliance Strip */}
            <InvestmentNodeBanner city={city} province={province} />

            {/* Investment Strategy & Property Title Type 2-Column Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                      { id: 'Rental' as const, label: 'Buy & Hold Rental', icon: Building2, desc: 'Long-term cash flow & equity compounding' },
                      { id: 'Flip' as const, label: 'Buy & Flip', icon: Hammer, desc: 'Short-term renovation & capital liquidation' },
                      { id: 'BRRRR' as const, label: 'Hybrid BRRRR', icon: RefreshCw, desc: 'Rehab, refinance & compound hold' },
                    ] as const
                  ).map((st) => {
                    const StrategyIcon = st.icon;
                    return (
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
                          <span className="flex items-center gap-1.5">
                            <StrategyIcon className="w-3.5 h-3.5" />
                            {st.label}
                          </span>
                          {strategy === st.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                        </div>
                        <div className={`text-[10px] truncate mt-0.5 ${strategy === st.id ? 'text-slate-300' : 'text-slate-500'}`}>
                          {st.desc}
                        </div>
                      </button>
                    );
                  })}
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
                        { id: 'Sectional Title Apartment', label: 'Sectional Title', icon: Building2 },
                        { id: 'Freehold House', label: 'Freehold House', icon: Home },
                        { id: 'Townhouse / Cluster', label: 'Townhouse / Cluster', icon: Warehouse },
                        { id: 'Multi-unit Commercial', label: 'Commercial', icon: Briefcase },
                      ] as const
                    ).map((pt) => {
                      const TypeIcon = pt.icon;
                      return (
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
                          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all text-center border flex items-center justify-center gap-1.5 cursor-pointer ${
                            propertyType === pt.id
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <TypeIcon className="w-3.5 h-3.5" />
                          <span>{pt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Unit Count & Total Floor Area (m²) Inputs for Multi-Unit / Bulk SPVs */}
                <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Units (Qty)
                      </label>
                      {numberOfUnits >= 5 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          ≥5 Units (Sec 13sex)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      name="numberOfUnits"
                      autoComplete="off"
                      min="1"
                      step="1"
                      value={numberOfUnits}
                      onChange={(e) => {
                        const val = Math.max(1, Math.round(Number(e.target.value) || 1));
                        setNumberOfUnits(val);
                        updateAnalyzerDraft({ numberOfUnits: val });
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Total Size (m²)
                      </label>
                      <span className="text-[10px] text-slate-400">Optional (e.g. 420)</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        name="floorAreaSqm"
                        autoComplete="off"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={floorAreaSqm || ''}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setFloorAreaSqm(val);
                          updateAnalyzerDraft({ floorAreaSqm: val });
                        }}
                        className="w-full text-xs px-3 pr-8 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900"
                      />
                      <span className="absolute right-2.5 top-2 text-[11px] text-slate-400 font-bold">m²</span>
                    </div>
                  </div>
                </div>

                {(propertyType === 'Sectional Title Apartment' || propertyType === 'Townhouse / Cluster') && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Scheduled Body Corporate AGM Date</span>
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
            </div>

            {/* Location & Amenity Scorecard */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setIsScorecardOpen(!isScorecardOpen)}
                className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-100/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Location & Amenity Scorecard
                    </h3>
                    <span className="text-[10px] text-slate-500">Qualitative Macro-Accessibility & Node Proximity</span>
                  </div>
                </div>

                {/* Live Composite Grade Badge & Expand Chevron */}
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
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isScorecardOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isScorecardOpen && (
                <div className="p-4 pt-0 border-t border-slate-200/70">
                  {/* 4 Amenity Distance Pill Groups */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
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
              )}
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
                  <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                    <label className="text-[11px] font-semibold text-slate-700">Target Purchase Price / Max Bid (ZAR) *</label>
                    <label
                      className={`inline-flex items-center gap-1 cursor-pointer text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors select-none ${
                        isVatInclusiveDeveloperSale
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                      title="VAT-registered developer / off-plan sale — SARS Transfer Duty is R 0"
                    >
                      <input
                        type="checkbox"
                        checked={isVatInclusiveDeveloperSale}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsVatInclusiveDeveloperSale(checked);
                          updateAnalyzerDraft({ isVatInclusiveDeveloperSale: checked });
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                      />
                      <span>Developer / VAT-Incl. (R0 Transfer Duty)</span>
                    </label>
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
                  {(floorAreaSqm > 0 || numberOfUnits > 1) ? (
                    <div className="text-[10px] font-semibold opacity-90 flex flex-wrap items-center gap-1.5 mt-0.5">
                      {floorAreaSqm > 0 && (
                        <span>
                          Bid: {formatZAR(calculatedMetrics.purchasePricePerSqm)}/m² vs Val: {formatZAR(calculatedMetrics.valuationPerSqm)}/m²
                        </span>
                      )}
                      {floorAreaSqm > 0 && numberOfUnits > 1 && <span>&bull;</span>}
                      {numberOfUnits > 1 && (
                        <span>
                          Avg {formatZAR(calculatedMetrics.averagePricePerUnit)} / unit ({numberOfUnits} units)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] opacity-80 block">
                      {calculatedBuiltInEquity.builtInEquityZAR > 0
                        ? 'Immediate equity cushion upon transfer'
                        : 'Target bid equals or exceeds market valuation'}
                    </span>
                  )}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {strategy === 'Rental'
                      ? 'Est. 5-Year Exit Value (Optional)'
                      : strategy === 'BRRRR'
                      ? 'Post-Rehab ARV Valuation (ZAR)'
                      : 'Target Flip Exit Price'}
                  </label>
                  {strategy === 'Rental' && isFiveYearExitOverridden && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsFiveYearExitOverridden(false);
                        setTargetExitPrice(0);
                        updateAnalyzerDraft({ targetExitPrice: 0 });
                      }}
                      className="text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Auto 5Y
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    name="targetExitPriceZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={strategy === 'Rental' && !isFiveYearExitOverridden ? '' : targetExitPrice}
                    placeholder={
                      strategy === 'Rental'
                        ? `${Math.round((openMarketValue > 0 ? openMarketValue : purchasePrice) * Math.pow(1 + (annualCapitalGrowth || 0) / 100, 5)).toLocaleString()} (Auto 5Y)`
                        : '0'
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (strategy === 'Rental' && raw === '') {
                        setIsFiveYearExitOverridden(false);
                        setTargetExitPrice(0);
                        updateAnalyzerDraft({ targetExitPrice: 0 });
                        return;
                      }
                      const val = Number(raw);
                      if (strategy === 'Rental') {
                        setIsFiveYearExitOverridden(val > 0);
                      }
                      setTargetExitPrice(val);
                      updateAnalyzerDraft({ targetExitPrice: val });
                    }}
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Hybrid BRRRR Post-Rehab Refinance Modeling Panel */}
            {strategy === 'BRRRR' && (
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-700 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Hybrid BRRRR Post-Rehab Refinance Engine
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        Model bank refinance proceeds on stabilized ARV, trapped capital &amp; post-refi cashflow
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-purple-900 bg-white px-2.5 py-0.5 rounded border border-purple-200 font-mono">
                      Refinance Loan: {formatZAR(calculatedMetrics.brrrrRefinanceLoanZAR)}
                    </span>
                    <span className="font-bold text-indigo-900 bg-indigo-100/80 px-2.5 py-0.5 rounded border border-indigo-200 font-mono">
                      Cash Left in Deal: {formatZAR(calculatedMetrics.brrrrCashLeftInDealZAR)}
                    </span>
                    <span className={`font-bold px-2.5 py-0.5 rounded border font-mono ${
                      calculatedMetrics.brrrrPostRefiCashflowZAR >= 0
                        ? 'text-emerald-900 bg-emerald-100/80 border-emerald-300'
                        : 'text-rose-900 bg-rose-100/80 border-rose-300'
                    }`}>
                      Post-Refi Cashflow: {formatZAR(calculatedMetrics.brrrrPostRefiCashflowZAR)}/m
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-800">
                        Post-Rehab Refinance LTV (%)
                      </label>
                      <span className="font-mono font-extrabold text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-200">
                        {refinanceLtvPercent}% of ARV
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="90"
                      step="5"
                      value={refinanceLtvPercent}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRefinanceLtvPercent(val);
                        updateAnalyzerDraft({ refinanceLtvPercent: val });
                      }}
                      className="w-full accent-purple-600 cursor-pointer h-1.5 bg-purple-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-medium px-0.5">
                      <span>50% (Conservative)</span>
                      <span>70% (Standard Bank Refi)</span>
                      <span>75% (Target)</span>
                      <span>80%</span>
                      <span>90% (Aggressive)</span>
                    </div>
                  </div>

                  <div className="md:col-span-5 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                      <span className="text-[10px] text-slate-500 block">Equity Recycled</span>
                      <span className="font-black text-emerald-700 font-mono">
                        {formatZAR(calculatedMetrics.brrrrEquityExtractedZAR)}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-purple-200">
                      <span className="text-[10px] text-slate-500 block">Post-Refi Bond ({interestRate}%)</span>
                      <span className="font-black text-slate-900 font-mono">
                        {formatZAR(calculatedMetrics.brrrrPostRefiBondPaymentZAR)}/m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Holding Period Sensitivity (1-12 Months) & Agent Commission VAT */}
            <div id="analyzer-sensitivity" className="scroll-mt-20 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shadow-2xs">
              {strategy === 'Rental' ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsHoldingOpen(!isHoldingOpen)}
                    className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-100/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                          Holding Period & Exit VAT Sensitivity
                        </span>
                        <span className="text-[10px] text-slate-500">Fine-tune holding duration & sales commission</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                        {holdingPeriodMonths} Mos &bull; Exit Comm: {formatPercent(effectiveExitCommissionPercent)}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isHoldingOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isHoldingOpen && (
                    <div className="p-4 pt-0 border-t border-slate-200/70 space-y-3 pt-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700">Holding Period Duration</span>
                          <span className="font-mono font-bold text-indigo-800">{holdingPeriodMonths} Months</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="12"
                          step="1"
                          value={holdingPeriodMonths}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setHoldingPeriodMonths(val);
                            updateAnalyzerDraft({ holdingPeriodMonths: val });
                          }}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-medium px-0.5 mt-0.5">
                          <span>1 Mo (Quick Flip)</span>
                          <span>3 Mo</span>
                          <span>6 Mo (Standard)</span>
                          <span>9 Mo</span>
                          <span>12 Mo (Long Reno)</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={vatExemptAgent}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setVatExemptAgent(checked);
                              updateAnalyzerDraft({ vatExemptAgent: checked });
                            }}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>VAT-Exempt Real Estate Agent (Off-market / Private Seller, skips 15% VAT)</span>
                        </label>
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {vatExemptAgent ? `${defaultAgentCommission.toFixed(1)}% (Exempt)` : `${calculateEffectiveExitCommission(defaultAgentCommission, false).toFixed(2)}% (Standard ${defaultAgentCommission.toFixed(1)}% + 15% VAT)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Holding Period & Exit VAT Sensitivity
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200 self-start sm:self-auto">
                      {holdingPeriodMonths} Months Holding &bull; Exit Comm: {formatPercent(effectiveExitCommissionPercent)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">Holding Period Duration</span>
                      <span className="font-mono font-bold text-indigo-800">{holdingPeriodMonths} Months</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={holdingPeriodMonths}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setHoldingPeriodMonths(val);
                        updateAnalyzerDraft({ holdingPeriodMonths: val });
                      }}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-medium px-0.5 mt-0.5">
                      <span>1 Mo (Quick Flip)</span>
                      <span>3 Mo</span>
                      <span>6 Mo (Standard)</span>
                      <span>9 Mo</span>
                      <span>12 Mo (Long Reno)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={vatExemptAgent}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setVatExemptAgent(checked);
                          updateAnalyzerDraft({ vatExemptAgent: checked });
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>VAT-Exempt Real Estate Agent (Off-market / Private Seller, skips 15% VAT)</span>
                    </label>
                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {vatExemptAgent ? `${defaultAgentCommission.toFixed(1)}% (Exempt)` : `${calculateEffectiveExitCommission(defaultAgentCommission, false).toFixed(2)}% (Standard ${defaultAgentCommission.toFixed(1)}% + 15% VAT)`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Vacancy Buffer & Managing Agent Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
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
                {/* Vacancy Sensitivity Range Slider 0-15% */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="font-semibold flex items-center gap-1 text-slate-700">
                      <Sliders className="w-3 h-3 text-amber-600" />
                      Vacancy Sensitivity (0–15%)
                    </span>
                    <span className="font-bold text-amber-800">{vacancyRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={vacancyRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setVacancyRate(val);
                      updateAnalyzerDraft({ vacancyRatePercent: val });
                    }}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-medium px-0.5 mt-0.5">
                    <span>0% (Full Occ.)</span>
                    <span>5% (SA Avg)</span>
                    <span>10% (Suburban)</span>
                    <span>15% (Stress)</span>
                  </div>
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

            {/* Fine-Tune OpEx Reserves Accordion */}
            {strategy !== 'Flip' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsOpExReservesOpen(!isOpExReservesOpen)}
                  className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-100/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                        Fine-Tune OpEx Reserves
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Maintenance, Prepaid Vending, Communal Services, Placement &amp; SPV Audit Fees
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                      Total Reserves: <strong className="text-emerald-700">-{formatZAR(monthlyMaintenanceReserve + monthlyPrepaidVendingFee + (monthlyCommunalServices || 0) + (calculatedMetrics.monthlyPlacementFeeZAR || 0) + (calculatedMetrics.monthlySpvAdminZAR || 0))}/pm</strong>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpExReservesOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpExReservesOpen && (
                  <div className="p-4 pt-0 border-t border-slate-200/70">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Monthly Maintenance Reserve (ZAR)
                          </label>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                            -{formatZAR(monthlyMaintenanceReserve)}/pm
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R</span>
                          <input
                            type="number"
                            name="monthlyMaintenanceReserveZAR"
                            autoComplete="off"
                            min="0"
                            step="50"
                            value={monthlyMaintenanceReserve}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setMonthlyMaintenanceReserve(val);
                              updateAnalyzerDraft({ monthlyMaintenanceReserveZAR: val });
                            }}
                            className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Provisioning for general repairs, wear-and-tear, and appliance servicing. Default: R 800.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Prepaid Meter Vending Fee (ZAR)
                          </label>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                            -{formatZAR(monthlyPrepaidVendingFee)}/pm
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R</span>
                          <input
                            type="number"
                            name="monthlyPrepaidVendingFeeZAR"
                            autoComplete="off"
                            min="0"
                            step="10"
                            value={monthlyPrepaidVendingFee}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setMonthlyPrepaidVendingFee(val);
                              updateAnalyzerDraft({ monthlyPrepaidVendingFeeZAR: val });
                            }}
                            className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          CitiQ / Recharger monthly fixed admin fee for prepaid electricity/water recovery. Default: R 150.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Communal / Serviced OpEx (ZAR)
                          </label>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                            -{formatZAR(monthlyCommunalServices)}/pm
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R</span>
                          <input
                            type="number"
                            name="monthlyCommunalServicesZAR"
                            autoComplete="off"
                            min="0"
                            step="50"
                            value={monthlyCommunalServices || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setMonthlyCommunalServices(val);
                              updateAnalyzerDraft({ monthlyCommunalServicesZAR: val });
                            }}
                            placeholder="0"
                            className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Consolidated communal amenities (uncapped Wi-Fi, communal cleaning, security, garden care). Default: R 0.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Tenant Placement Fee (% Rent)
                          </label>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                            -{formatZAR(calculatedMetrics.monthlyPlacementFeeZAR)}/pm
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            name="tenantPlacementFeePercent"
                            autoComplete="off"
                            min="0"
                            max="20"
                            step="0.5"
                            value={tenantPlacementFeePercent || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setTenantPlacementFeePercent(val);
                              updateAnalyzerDraft({ tenantPlacementFeePercent: val });
                            }}
                            className="w-full text-xs px-3 pr-7 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                          />
                          <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Amortized leasing / procurement commission{agencyVatApplicable ? ' (+15% VAT applied)' : ''}. Default: 0%.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Annual SPV Audit / Admin (ZAR/yr)
                          </label>
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                            -{formatZAR(calculatedMetrics.monthlySpvAdminZAR)}/pm
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R</span>
                          <input
                            type="number"
                            name="annualSpvAdminAuditFeeZAR"
                            autoComplete="off"
                            min="0"
                            step="1000"
                            value={annualSpvAdminAuditFeeZAR || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setAnnualSpvAdminAuditFeeZAR(val);
                              updateAnalyzerDraft({ annualSpvAdminAuditFeeZAR: val });
                            }}
                            className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900 bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          For syndications, body corporate audits, or Pty Ltd accounting — divided by 12 p.m.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {/* Occupancy & Site Possession (PIE Act Eviction Risk Engine) */}
            <OccupancyRiskCard
              value={occupantRisk}
              onChange={(updated) => {
                setOccupantRisk(updated);
                updateAnalyzerDraft({ occupantRisk: updated });
              }}
              maoReductionZAR={
                strategy === 'Flip'
                  ? computedFlipMao.occupantRiskReductionZAR
                  : computedRentalMao.occupantRiskReductionZAR
              }
              evictionDelayBurnZAR={calculatedMetrics.evictionDelayBurnZAR ?? 0}
              totalOccupantCostZAR={calculatedMetrics.totalOccupantCostZAR ?? 0}
              maoMode={strategy === 'Flip' ? 'Flip' : 'Rental'}
            />

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

                  {/* Prime Spread (±200 bps) Sensitivity Slider */}
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-emerald-600" />
                        Prime Spread (±200 bps)
                      </span>
                      <span className="font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {interestRateMargin >= 0 ? `+${interestRateMargin.toFixed(2)}%` : `${interestRateMargin.toFixed(2)}%`} ({((interestRateMargin) * 100).toFixed(0)} bps)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.25"
                      value={interestRateMargin}
                      onChange={(e) => {
                        const margin = Number(e.target.value);
                        setInterestRateMargin(margin);
                        const prime = investorProfile?.defaultPrimeRatePercent ?? 10.75;
                        setInterestRate(Number((prime + margin).toFixed(2)));
                        updateAnalyzerDraft({ interestRateMargin: margin });
                      }}
                      className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>-200 bps</span>
                      <span>Prime ({(investorProfile?.defaultPrimeRatePercent ?? 10.75).toFixed(2)}%)</span>
                      <span>+200 bps</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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

                    {/* Extra Monthly Bond Payment (Voluntary Capital Injection) */}
                    {strategy !== 'Flip' && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            Extra Monthly Bond
                          </label>
                          <span className="text-[10px] text-indigo-600 font-semibold">Accelerate Paydown</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1.5 text-xs text-slate-500 font-bold">R</span>
                          <input
                            type="number"
                            name="extraMonthlyPaymentZAR"
                            autoComplete="off"
                            step="500"
                            min="0"
                            placeholder="0"
                            value={extraMonthlyPayment || ''}
                            onChange={(e) => handleExtraMonthlyPaymentChange(Number(e.target.value) || 0)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700 bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">Voluntary capital: reduces principal only (Sec 11(a))</p>
                      </div>
                    )}
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
                        handleExtraMonthlyPaymentChange(0);
                      }}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline transition-colors cursor-pointer"
                    >
                      Reset to South African Benchmark Averages (5% Growth / 6% Escalation / 20 Yrs)
                    </button>
                  </div>

                  {/* Accelerated Paydown Impact Summary Banner */}
                  {paydownImpact && paydownImpact.monthsSaved > 0 && (
                    <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                          <Zap className="w-4 h-4 text-indigo-600" />
                          <span>Accelerated Paydown Impact (+{formatZAR(extraMonthlyPayment)}/m)</span>
                        </div>
                        <p className="text-[11px] text-indigo-700">
                          Bond settled in{' '}
                          <strong className="font-semibold text-indigo-950">
                            {Math.floor(paydownImpact.acceleratedMonths / 12)} yrs {paydownImpact.acceleratedMonths % 12} mos
                          </strong>{' '}
                          (saves <strong className="font-semibold text-indigo-950">{paydownImpact.monthsSaved} months</strong> &amp;{' '}
                          <strong className="font-semibold text-indigo-950">{formatZAR(paydownImpact.interestSaved)}</strong> in total bank interest).
                        </p>
                      </div>
                      {paydownImpact.refiReadyYearAccelerated !== null && (
                        <div className="shrink-0 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-right">
                          <span className="block text-[10px] uppercase font-bold text-slate-400">BRRRR Refi-Ready (≤{refinanceLtvPercent}% LTV)</span>
                          <span className="font-bold text-indigo-900">
                            Year {paydownImpact.refiReadyYearAccelerated}{' '}
                            <span className="text-[10px] text-slate-500 font-normal">
                              {paydownImpact.refiReadyYearScheduled !== null && paydownImpact.refiReadyYearScheduled !== paydownImpact.refiReadyYearAccelerated
                                ? `(vs Year ${paydownImpact.refiReadyYearScheduled})`
                                : ''}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Embedded Custom SVG Multi-line Projection Chart */}
                  <div className="pt-2">
                    <LongTermProjectionChart data={calculatedProjections} />
                  </div>
                </div>
              )}
            </div>

            {/* Stress-Test & Tax Overrides Accordion */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setIsStressAndTaxOpen(!isStressAndTaxOpen)}
                className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-100/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Stress-Test & Tax Overrides
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Conveyancing, SARS Transfer Duty Overrides & Section 13sex Tax Shield
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {numberOfUnits >= 5 && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ Meets SARS ≥5-Unit Sec 13sex Threshold
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                    {overrideTax || overrideLegal ? 'Custom Overrides Active' : `Auto SARS: ${formatZAR(calculatedCosts.transferDuty)}`}
                    {isSection13Eligible ? ` • Sec 13sex (+${formatZAR(calculatedSection13.annualTaxSavingsZAR)}/yr)` : ''}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStressAndTaxOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isStressAndTaxOpen && (
                <div className="p-4 pt-0 border-t border-slate-200/70">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
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
                            <div className="text-slate-500 text-xs py-1.5 font-medium" title="Recommended fee incl. 15% VAT (LSSA July 2026 guideline; negotiable)">
                              LSSA guideline (July 2026): <span className="font-semibold text-slate-800">{formatZAR(calculatedCosts.conveyancingFee)}</span>
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
                        <div className="flex items-center gap-1.5">
                          {numberOfUnits >= 5 && (
                            <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                              ✓ ≥5 Units ({numberOfUnits})
                            </span>
                          )}
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            55% Base • 20 Yrs
                          </span>
                        </div>
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
                </div>
              )}
            </div>

            {/* Real-time Calculation Result Bar */}
            <div id="analyzer-results" className="scroll-mt-28 p-4 sm:p-5 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800">
                <div className="text-xs uppercase font-semibold text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Calculated Acquisition &amp; Returns Breakdown
                </div>
                <div className="flex items-center gap-2">
                  {isSection13Eligible && (
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 tabular-nums">
                      <Sparkles className="w-3 h-3" /> Sec 13sex Active: +{formatZAR(calculatedSection13.annualTaxSavingsZAR)}/yr Shield
                    </span>
                  )}
                </div>
              </div>

              {/* Prominent Day-1 Initial Capital Required Hero Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center bg-slate-800/70 p-3.5 rounded-xl border border-slate-700/80">
                <div className="lg:col-span-5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 ${
                    isReserveSufficient
                      ? 'bg-slate-800 border-slate-700 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-rose-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Initial Capital Required (Day 1)
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border tabular-nums ${
                        isReserveSufficient
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                      }`}>
                        {isReserveSufficient
                          ? `Reserve Surplus: +${formatZAR(reserveDelta)}`
                          : `Reserve Shortfall: -${formatZAR(Math.abs(reserveDelta))}`}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white tabular-nums tracking-tight mt-0.5">
                      {formatZAR(calculatedMetrics.initialCapitalRequired)}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-wrap items-center gap-2 text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-semibold text-slate-400">Day-1 Outlay Breakdown:</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white tabular-nums">
                    Deposit: <strong className="text-emerald-400 font-semibold">{formatZAR(calculatedMetrics.cashDeposit)}</strong>
                  </span>
                  <span className="text-slate-500">+</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white tabular-nums">
                    SARS Duty: <strong className="text-slate-200 font-semibold">{formatZAR(calculatedMetrics.transferDutyZAR)}</strong>
                  </span>
                  <span className="text-slate-500">+</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white tabular-nums">
                    Legal &amp; Bond Fees: <strong className="text-slate-200 font-semibold">{formatZAR(calculatedCosts.conveyancingFee + calculatedCosts.bondRegistrationFee + calculatedCosts.deedsOfficeFee + calculatedCosts.ficaSundries)}</strong>
                  </span>
                  <span className="text-slate-500">+</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white tabular-nums">
                    Rehab/Capex: <strong className="text-amber-400 font-semibold">{formatZAR(rehabCost)}</strong>
                  </span>
                  {auctioneerCommission > 0 && (
                    <>
                      <span className="text-slate-500">+</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded border border-amber-600/40 text-amber-200 tabular-nums">
                        Auction Fee: <strong className="text-amber-300 font-semibold">{formatZAR(auctioneerCommission)}</strong>
                      </span>
                    </>
                  )}
                  {municipalArrears > 0 && (
                    <>
                      <span className="text-slate-500">+</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded border border-rose-600/40 text-rose-200 tabular-nums">
                        Rates Arrears: <strong className="text-rose-300 font-semibold">{formatZAR(municipalArrears)}</strong>
                      </span>
                    </>
                  )}
                  <span className="text-slate-400 text-[10px] block w-full mt-1 border-t border-slate-800 pt-1">
                    Liquid Capital Reserve: <strong className="text-white tabular-nums">{formatZAR(liquidCapitalReserve)}</strong>
                    {isReserveSufficient
                      ? ' • Capital buffer intact for emergency reserves.'
                      : ' • Outlay exceeds current liquid reserve; external syndicate/funder needed.'}
                  </span>
                </div>
              </div>

              {/* Standard Performance & Returns Metric Badges */}
              <AnalyzerResultsGrid
                strategy={strategy}
                builtInEquityZAR={calculatedBuiltInEquity.builtInEquityZAR}
                builtInEquityPercent={calculatedBuiltInEquity.builtInEquityPercent}
                totalAcquisitionCost={calculatedCosts.totalAcquisitionCost - calculatedCosts.transferDuty + calculatedMetrics.transferDutyZAR + rehabCost + (auctioneerCommission || 0) + (municipalArrears || 0)}
                grossYield={calculatedMetrics.grossYield}
                capRate={calculatedMetrics.capRate}
                monthlyCashFlow={calculatedMetrics.monthlyCashFlow}
                projectedFlipNetProfit={calculatedMetrics.projectedFlipNetProfit}
                projectedFlipRoi={calculatedMetrics.projectedFlipRoi}
                bondTermYears={bondTermYears}
                netEquityFinal={calculatedProjections[calculatedProjections.length - 1]?.netEquity || 0}
                isSection13Eligible={isSection13Eligible}
                section13AnnualSavings={calculatedSection13.annualTaxSavingsZAR}
                section13TwentyYearSavings={calculatedSection13.twentyYearCumulativeSavingsZAR}
                netRoi={calculatedMetrics.netRoi}
                minNetRoiHurdle={investorProfile?.minNetRoiPercent ?? 8}
                dscr={calculatedMetrics.dscr}
                minDscrHurdle={investorProfile?.minDscr ?? 1.2}
                fiveYearIrrPercent={calculatedMetrics.fiveYearIrrPercent}
                purchasePricePerSqm={calculatedMetrics.purchasePricePerSqm}
                valuationPerSqm={calculatedMetrics.valuationPerSqm}
                numberOfUnits={numberOfUnits}
                averagePricePerUnit={calculatedMetrics.averagePricePerUnit}
                annualizedFlipRoi={calculatedMetrics.annualizedFlipRoi}
                monthlyHoldingBurnZAR={calculatedMetrics.monthlyHoldingBurnZAR}
                holdingPeriodMonths={holdingPeriodMonths}
                brrrrPostRefiCashflowZAR={calculatedMetrics.brrrrPostRefiCashflowZAR}
                brrrrEquityExtractedZAR={calculatedMetrics.brrrrEquityExtractedZAR}
                brrrrCashLeftInDealZAR={calculatedMetrics.brrrrCashLeftInDealZAR}
                brrrrRefinanceLoanZAR={calculatedMetrics.brrrrRefinanceLoanZAR}
              />

              {/* Interest Rate Stress-Test Strip (Rental & BRRRR) */}
              {strategy !== 'Flip' && (
                <div className="mt-4">
                  {calculatedMetrics.bondAmount > 0 && rateShockScenarios.length > 0 ? (
                    <RateShockStrip
                      scenarios={rateShockScenarios}
                      minDscr={investorProfile?.minDscr ?? 1.2}
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">All-Cash Acquisition:</span>
                      <span className="text-slate-500">100% equity funding eliminates monthly mortgage bond interest-rate risk.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Action & WhatsApp Copy Bar */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCurrentCalcWhatsApp}
                className="bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Format calculated deal metrics into clean WhatsApp pitch text and copy to clipboard"
              >
                {copiedCalc ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-slate-700" />}
                <span>{copiedCalc ? 'Copied WhatsApp Deal Summary!' : 'Copy WhatsApp Summary'}</span>
              </button>

              <button
                type="submit"
                className={`${
                  editingDealId
                    ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                } text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-xs border-t border-white/15 flex items-center gap-1.5 transition-colors cursor-pointer`}
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
      )}

      {/* Opportunity Pipeline List */}
      {(activeWorkspaceTab === 'pipeline' || isStackedView) && (
        <div id="analyzer-pipeline" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
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
            <div className="flex flex-wrap items-center gap-2">
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

              {/* Region Filter Dropdown */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto mt-1 sm:mt-0">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Region:</span>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto max-w-[240px]"
                >
                  <option value="all">All Regions</option>
                  {INVESTMENT_REGION_GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
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
              // Strategy-aware DSCR & Buy Box Evaluation using shared helper
              const dscrInfo = calculateDealDscr(deal, investorProfile?.defaultPrimeRatePercent);
              const bondPayment = dscrInfo.monthlyBondPayment;
              const holdingLevies = deal.propertyType === 'Freehold House' ? 0 : (deal.monthlyLevies ?? 0);
              const holdingRates = deal.monthlyRatesTaxes ?? 0;
              const holdingInsurance = deal.propertyType === 'Freehold House' ? Math.round((deal.annualInsurance ?? 0) / 12) : 0;
              const holdingOther = deal.monthlyOtherHoldingCostZAR ?? 1500;
              const holdingCost = deal.monthlyHoldingCostZAR ?? (bondPayment + holdingLevies + holdingRates + holdingInsurance + holdingOther);
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
                  monthlyBondPayment: bondPayment,
                },
                investorProfile,
                deal.strategy ?? 'Rental'
              );

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
                <PipelineDealCard
                  key={deal.id}
                  deal={deal}
                  displayDeal={displayDeal}
                  selected={selectedDealIds.includes(deal.id)}
                  onToggleSelect={(selected) => {
                    if (selected) {
                      setSelectedDealIds((prev) => [...prev, deal.id]);
                    } else {
                      setSelectedDealIds((prev) => prev.filter((id) => id !== deal.id));
                    }
                  }}
                  onEdit={handleEditDeal}
                  onDuplicate={duplicateOpportunity}
                  onDelete={deleteOpportunity}
                  onAdvanceStage={advanceOpportunityStage}
                  onPass={(dealId, reason, notes) => passOpportunity(dealId, reason, notes)}
                  onReactivate={reactivateOpportunity}
                  onPromoteToFlip={(dealId) => {
                    if (confirm(`Promote "${deal.title}" to Buy-and-Flip Manager?`)) {
                      promoteOpportunityToFlip(dealId);
                    }
                  }}
                  onPromoteToRental={(dealId) => {
                    if (confirm(`Promote "${deal.title}" to Rental Portfolio?`)) {
                      promoteOpportunityToRental(dealId);
                    }
                  }}
                  investorProfile={investorProfile}
                  copiedDealId={copiedDealId}
                  onCopyWhatsApp={handleCopyOpportunityWhatsApp}
                />
              );
          })
        )}
        </div>
        </div>
      )}

        {/* Side-by-Side Deal Comparison Floating Bar */}
        {selectedDealIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold">
                {selectedDealIds.length} deal{selectedDealIds.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedDealIds.length < 2}
                onClick={() => setShowComparisonModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Compare Side-by-Side {selectedDealIds.length < 2 ? '(Select 2+)' : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDealIds([])}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Side-by-Side Deal Comparison Modal */}
        {showComparisonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="fixed inset-0" onClick={() => setShowComparisonModal(false)} />
            <div className="relative bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto z-10 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Side-by-Side Deal Comparison</h3>
                    <p className="text-xs text-slate-500">
                      Cross-compare purchase price, Day-1 capital, yields, DSCR, and strategy Buy Box hurdles.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Responsive Side-by-Side Comparison Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-700 w-48 min-w-[180px]">Metric / Parameter</th>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => (
                          <th key={deal.id} className="p-3 font-bold text-slate-900 min-w-[200px] border-l border-slate-200">
                            <div className="space-y-1">
                              <div className="font-extrabold text-sm text-slate-900 truncate" title={deal.title}>
                                {deal.title}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  deal.strategy === 'Flip' ? 'bg-amber-100 text-amber-900' : deal.strategy === 'BRRRR' ? 'bg-purple-100 text-purple-900' : 'bg-indigo-100 text-indigo-900'
                                }`}>
                                  {deal.strategy ?? 'Rental'}
                                </span>
                                <span className="text-[10px] text-slate-500">{deal.city}</span>
                              </div>
                            </div>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* 1. Target Purchase Price */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">Target Purchase Bid</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => (
                          <td key={deal.id} className="p-3 font-black text-slate-900 border-l border-slate-100 font-mono">
                            {formatZAR(deal.purchasePrice)}
                          </td>
                        ))}
                    </tr>

                    {/* 2. Open Market Value & Built-in Equity */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">Open Market Value</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => (
                          <td key={deal.id} className="p-3 text-slate-700 border-l border-slate-100">
                            {formatZAR(deal.openMarketValueZAR || deal.purchasePrice * 1.2)}
                            <span className="block text-[10px] text-emerald-700 font-semibold">
                              Built-in: {formatZAR(deal.builtInEquityZAR ?? ((deal.openMarketValueZAR || deal.purchasePrice * 1.2) - deal.purchasePrice))}
                            </span>
                          </td>
                        ))}
                    </tr>

                    {/* 3. Day-1 Capital Required */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">Day-1 Capital Required</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => {
                          const effLtv = deal.bondLTV ?? deal.loanToValuePercent ?? 100;
                          const dep = deal.depositZAR !== undefined ? deal.depositZAR : Math.max(0, Math.round(deal.purchasePrice * (1 - effLtv / 100)));
                          const day1 = deal.initialCapitalRequired ?? (
                            dep +
                            ((deal.costs?.totalAcquisitionCost || deal.purchasePrice) - deal.purchasePrice) +
                            (deal.estimatedRehabCost || 0) +
                            (deal.auctioneerCommissionZAR || 0) +
                            (deal.municipalArrearsZAR || 0)
                          );
                          return (
                            <td key={deal.id} className="p-3 font-bold text-emerald-800 border-l border-slate-100 font-mono">
                              {formatZAR(day1)}
                            </td>
                          );
                        })}
                    </tr>

                    {/* 4. Monthly Net Cashflow */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">Monthly Net Cash Flow</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => (
                          <td key={deal.id} className={`p-3 font-bold border-l border-slate-100 font-mono ${deal.monthlyCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {formatZAR(deal.monthlyCashFlow)}/m
                          </td>
                        ))}
                    </tr>

                    {/* 5. Gross Yield / Cap Rate */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">Gross Yield / Cap Rate</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => (
                          <td key={deal.id} className="p-3 text-slate-800 border-l border-slate-100">
                            <span className="font-semibold text-emerald-700">{formatPercent(deal.grossYield)}</span>
                            {' / '}
                            <span className="font-semibold text-teal-700">{formatPercent(deal.capRate)}</span>
                          </td>
                        ))}
                    </tr>

                    {/* 6. Cash-on-Cash ROI */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">Cash-on-Cash Net ROI</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => (
                          <td key={deal.id} className={`p-3 font-black border-l border-slate-100 ${deal.netRoi >= (investorProfile?.minNetRoiPercent ?? 8) ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {formatPercent(deal.netRoi)}
                          </td>
                        ))}
                    </tr>

                    {/* 7. Debt Service Coverage Ratio (DSCR) */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">DSCR (Coverage Ratio)</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => {
                          const dscrInfo = calculateDealDscr(deal, investorProfile?.defaultPrimeRatePercent);
                          const dscr = dscrInfo.dscr;
                          const meetsHurdle = dscrInfo.rawDscr === null || dscrInfo.rawDscr >= (investorProfile?.minDscr ?? 1.20) - 1e-4;
                          return (
                            <td key={deal.id} className="p-3 border-l border-slate-100">
                              <span className={`font-bold px-2 py-0.5 rounded text-xs ${meetsHurdle ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {dscr === null || dscr >= 99 ? 'N/A (Cash)' : `${dscr.toFixed(2)}x`}
                              </span>
                            </td>
                          );
                        })}
                    </tr>

                    {/* 8. Buy Box Match Status */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">Buy Box Match Status</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => {
                          const dscrInfo = calculateDealDscr(deal, investorProfile?.defaultPrimeRatePercent);

                          const evalResult = evaluateDealCriteria(
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

                          return (
                            <td key={deal.id} className="p-3 border-l border-slate-100">
                              <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs ${
                                evalResult.meetsBuyBox ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                <Target className="w-3 h-3" />
                                {evalResult.meetsBuyBox ? 'PASSED' : 'MISSED'} ({evalResult.passedCount}/{evalResult.totalCount})
                              </span>
                            </td>
                          );
                        })}
                    </tr>

                    {/* 9. Section 13sex Tax Shield */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 bg-slate-50/30">SARS Sec 13sex Shield</td>
                      {opportunities
                        .filter((d) => selectedDealIds.includes(d.id))
                        .map((deal) => (
                          <td key={deal.id} className="p-3 text-slate-700 border-l border-slate-100 text-[11px]">
                            {deal.section13sex?.isEligible ? (
                              <span className="font-bold text-emerald-700 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                +{formatZAR(deal.section13sex.annualTaxSavingsZAR)}/yr
                              </span>
                            ) : (
                              <span className="text-slate-400">Not eligible</span>
                            )}
                          </td>
                        ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Tip: Use sensitivity sliders to test stress scenarios across prime interest spread, vacancies, and holding burn.
                </span>
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Close Comparison
                </button>
              </div>
            </div>
          </div>
        )}

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

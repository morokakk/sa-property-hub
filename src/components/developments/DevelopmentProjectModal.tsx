'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  DevelopmentProject,
  DevelopmentType,
  DevelopmentPhase,
  DevelopmentTaxEntityType,
  Province,
  MunicipalZoningCode,
  ZoningProfile,
  ConsentUseFlags,
} from '@/types';
import { generateInitialDevelopmentUnits } from '@/lib/calculations/developments';
import { calculateZoningEnvelope, ZONING_PRESETS } from '@/lib/calculations/zoning';
import { findInvestmentNode } from '@/lib/constants/investmentNodes';
import InvestmentNodeSelect from '@/components/common/InvestmentNodeSelect';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  Building2,
  Calendar,
  Coins,
  HardHat,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface DevelopmentProjectModalProps {
  isOpen: boolean;
  editingDevelopment: DevelopmentProject | null;
  onClose: () => void;
  onSave: (project: Partial<DevelopmentProject>, isNew: boolean) => void;
}

const DEVELOPMENT_TYPES: DevelopmentType[] = [
  'Subdivision & Cluster',
  'Sectional Title Apartments',
  'Township Micro-Units (Infill)',
  'Commercial-to-Residential Conversion',
];

const DEVELOPMENT_PHASES: DevelopmentPhase[] = [
  'Feasibility',
  'Land & Paper Rights',
  'Earthworks & Services',
  'Superstructure',
  'Finishes & Practical Completion',
  'Sell-Down / Handover',
  'Completed',
];

const TAX_ENTITIES: DevelopmentTaxEntityType[] = [
  'Company (27%)',
  'Individual',
  'Trust',
];

const SA_PROVINCES: Province[] = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Mpumalanga',
  'Limpopo',
  'North West',
  'Northern Cape',
];

const MUNICIPAL_ZONING_CODES: MunicipalZoningCode[] = [
  'Residential 1',
  'Residential 2',
  'Residential 3',
  'Residential 4',
  'Business 1',
  'Business 2',
  'Mixed Use',
  'Industrial 1',
  'Special',
  'Agricultural',
  'Unzoned / Township Scheme',
];

export function DevelopmentProjectModal({
  isOpen,
  editingDevelopment,
  onClose,
  onSave,
}: DevelopmentProjectModalProps) {
  const isNew = !editingDevelopment;
  const investorProfile = usePortfolioStore((state) => state.investorProfile);
  const defaultVatReg = investorProfile?.defaultVatRegisteredDeveloper ?? true;
  const defaultHardRate = investorProfile?.defaultHardBuildRatePerSqmZAR ?? 9800;

  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Johannesburg');
  const [province, setProvince] = useState<Province>('Gauteng');
  const [investmentNodeId, setInvestmentNodeId] = useState<string | undefined>(undefined);
  const [developmentType, setDevelopmentType] = useState<DevelopmentType>('Sectional Title Apartments');
  const [currentPhase, setCurrentPhase] = useState<DevelopmentPhase>('Feasibility');
  const [isVatRegisteredDeveloper, setIsVatRegisteredDeveloper] = useState(defaultVatReg);
  const [taxEntityType, setTaxEntityType] = useState<DevelopmentTaxEntityType>('Company (27%)');

  // Timeline
  const [preApprovalMonths, setPreApprovalMonths] = useState(6);
  const [constructionMonths, setConstructionMonths] = useState(10);
  const [sellDownMonths, setSellDownMonths] = useState(4);

  // Land & Build
  const [landPurchasePriceZAR, setLandPurchasePriceZAR] = useState(1500000);
  const [acquisitionCostsZAR, setAcquisitionCostsZAR] = useState(85000);
  const [sec118ArrearsZAR, setSec118ArrearsZAR] = useState(0);
  const [totalBuildableAreaSqm, setTotalBuildableAreaSqm] = useState(480);
  const [budgetedHardCostPerSqmZAR, setBudgetedHardCostPerSqmZAR] = useState(defaultHardRate);
  const [contingencyPercent, setContingencyPercent] = useState(7.5);

  // Holding & Facilities
  const defaultPreSales = investorProfile?.defaultPreSalesHurdlePercent ?? 40;
  const [monthlyPreApprovalHoldingBurnZAR, setMonthlyPreApprovalHoldingBurnZAR] = useState(9500);
  const [monthlyConstructionHoldingBurnZAR, setMonthlyConstructionHoldingBurnZAR] = useState(16500);
  const [developmentFacilityLimitZAR, setDevelopmentFacilityLimitZAR] = useState(4500000);
  const [preSalesHurdlePercent, setPreSalesHurdlePercent] = useState(defaultPreSales);
  const [isDeferredLandPaymentLAA, setIsDeferredLandPaymentLAA] = useState(false);
  const [seniorJvPartnerName, setSeniorJvPartnerName] = useState('');
  const [notes, setNotes] = useState('');

  // Initial Unit Schedule Generator (new projects)
  const [initialUnitCount, setInitialUnitCount] = useState(6);
  const [defaultUnitConfiguration, setDefaultUnitConfiguration] = useState('2 Bed 1 Bath Cluster');
  const [targetListPricePerUnitZAR, setTargetListPricePerUnitZAR] = useState(1350000);
  const [estMonthlyRentPerUnitZAR, setEstMonthlyRentPerUnitZAR] = useState(11500);

  // Statutory Municipal Zoning & Rights Profile
  const [currentZoning, setCurrentZoning] = useState<MunicipalZoningCode>('Residential 3');
  const [targetZoning, setTargetZoning] = useState<MunicipalZoningCode | ''>('');
  const [erfSizeSqm, setErfSizeSqm] = useState<number>(1200);
  const [farRatio, setFarRatio] = useState<number>(0.8);
  const [farInput, setFarInput] = useState<string>('0.8');
  const [coveragePercent, setCoveragePercent] = useState<number>(50);
  const [coverageInput, setCoverageInput] = useState<string>('50');
  const [maxHeightStoreys, setMaxHeightStoreys] = useState<number>(3);
  const [maxDensityDuPerHa, setMaxDensityDuPerHa] = useState<number | ''>(40);
  const [requiresRezoning, setRequiresRezoning] = useState<boolean>(false);
  const [consentUses, setConsentUses] = useState<ConsentUseFlags>({
    secondDwellingPermitted: true,
    studentCommuneConsent: false,
    backyardMicroUnitsPermitted: false,
    homeEnterprisePermitted: true,
  });

  const parseDecimal = (val: string, fallback: number = 0): number => {
    const cleaned = val.replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  };

  const isPresetActive = (preset: typeof ZONING_PRESETS[number]) => {
    const currentMatches = currentZoning === preset.profile.currentZoning;
    const targetMatches = (targetZoning || '') === (preset.profile.targetZoning || '');
    const farMatches = Math.abs(farRatio - preset.profile.farRatio) < 0.001;
    const covMatches = Math.abs(coveragePercent - preset.profile.coveragePercent) < 0.001;
    const heightMatches = maxHeightStoreys === preset.profile.maxHeightStoreys;
    return currentMatches && targetMatches && farMatches && covMatches && heightMatches;
  };

  // Statutory Density Guardrail
  const plannedUnits = isNew ? Number(initialUnitCount) : (editingDevelopment?.units?.length || 0);
  const maxAllowedUnits =
    maxDensityDuPerHa !== '' && Number(maxDensityDuPerHa) > 0
      ? Math.max(1, Math.floor((erfSizeSqm / 10000) * Number(maxDensityDuPerHa)))
      : undefined;
  const isDensityCapExceeded = Boolean(maxAllowedUnits !== undefined && plannedUnits > maxAllowedUnits);

  const prevDensityExceededRef = useRef(false);
  useEffect(() => {
    if (isDensityCapExceeded && !prevDensityExceededRef.current) {
      setRequiresRezoning(true);
    }
    prevDensityExceededRef.current = isDensityCapExceeded;
  }, [isDensityCapExceeded]);

  const applyZoningPreset = (presetId: string) => {
    const preset = ZONING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCurrentZoning(preset.profile.currentZoning);
    setTargetZoning(preset.profile.targetZoning || '');
    setFarRatio(preset.profile.farRatio);
    setFarInput(String(preset.profile.farRatio));
    setCoveragePercent(preset.profile.coveragePercent);
    setCoverageInput(String(preset.profile.coveragePercent));
    setMaxHeightStoreys(preset.profile.maxHeightStoreys);
    setMaxDensityDuPerHa(preset.profile.maxDensityDuPerHa ?? '');
    setRequiresRezoning(preset.profile.requiresRezoning);
    setConsentUses({ ...preset.profile.consentUses });
    if (!erfSizeSqm || erfSizeSqm === 1200) {
      setErfSizeSqm(preset.profile.defaultErfSizeSqm);
    }
  };

  useEffect(() => {
    if (editingDevelopment) {
      setTitle(editingDevelopment.title || '');
      setAddress(editingDevelopment.address || '');
      setCity(editingDevelopment.city || 'Johannesburg');
      setProvince(editingDevelopment.province || 'Gauteng');
      setInvestmentNodeId(editingDevelopment.investmentNodeId);
      setDevelopmentType(editingDevelopment.developmentType || 'Sectional Title Apartments');
      setCurrentPhase(editingDevelopment.currentPhase || 'Feasibility');
      setIsVatRegisteredDeveloper(editingDevelopment.isVatRegisteredDeveloper ?? true);
      setTaxEntityType(editingDevelopment.taxEntityType || 'Company (27%)');
      setPreApprovalMonths(editingDevelopment.preApprovalMonths ?? 6);
      setConstructionMonths(editingDevelopment.constructionMonths ?? 10);
      setSellDownMonths(editingDevelopment.sellDownMonths ?? 4);
      setLandPurchasePriceZAR(editingDevelopment.landPurchasePriceZAR ?? 1500000);
      setAcquisitionCostsZAR(editingDevelopment.acquisitionCostsZAR ?? 85000);
      setSec118ArrearsZAR(editingDevelopment.sec118ArrearsZAR ?? 0);
      setTotalBuildableAreaSqm(editingDevelopment.totalBuildableAreaSqm ?? 480);
      setBudgetedHardCostPerSqmZAR(editingDevelopment.budgetedHardCostPerSqmZAR ?? 10500);
      setContingencyPercent(editingDevelopment.contingencyPercent ?? 7.5);
      setMonthlyPreApprovalHoldingBurnZAR(editingDevelopment.monthlyPreApprovalHoldingBurnZAR ?? 9500);
      setMonthlyConstructionHoldingBurnZAR(editingDevelopment.monthlyConstructionHoldingBurnZAR ?? 16500);
      setDevelopmentFacilityLimitZAR(editingDevelopment.developmentFacilityLimitZAR ?? 4500000);
      setPreSalesHurdlePercent(editingDevelopment.preSalesHurdlePercent ?? (investorProfile?.defaultPreSalesHurdlePercent ?? 40));
      setIsDeferredLandPaymentLAA(editingDevelopment.isDeferredLandPaymentLAA ?? false);
      setSeniorJvPartnerName(editingDevelopment.seniorJvPartnerName || '');
      setNotes(editingDevelopment.notes || '');
      if (editingDevelopment.zoningProfile) {
        setCurrentZoning(editingDevelopment.zoningProfile.currentZoning);
        setTargetZoning(editingDevelopment.zoningProfile.targetZoning || '');
        setErfSizeSqm(editingDevelopment.zoningProfile.erfSizeSqm || 1200);
        const loadedFar = editingDevelopment.zoningProfile.farRatio ?? 0.8;
        const loadedCov = editingDevelopment.zoningProfile.coveragePercent ?? 50;
        setFarRatio(loadedFar);
        setFarInput(String(loadedFar));
        setCoveragePercent(loadedCov);
        setCoverageInput(String(loadedCov));
        setMaxHeightStoreys(editingDevelopment.zoningProfile.maxHeightStoreys ?? 3);
        setMaxDensityDuPerHa(editingDevelopment.zoningProfile.maxDensityDuPerHa ?? 40);
        setRequiresRezoning(editingDevelopment.zoningProfile.requiresRezoning ?? false);
        setConsentUses({ ...editingDevelopment.zoningProfile.consentUses });
      } else {
        setCurrentZoning('Residential 3');
        setTargetZoning('');
        setErfSizeSqm(1200);
        setFarRatio(0.8);
        setFarInput('0.8');
        setCoveragePercent(50);
        setCoverageInput('50');
        setMaxHeightStoreys(3);
        setMaxDensityDuPerHa(40);
        setRequiresRezoning(false);
        setConsentUses({
          secondDwellingPermitted: true,
          studentCommuneConsent: false,
          backyardMicroUnitsPermitted: false,
          homeEnterprisePermitted: true,
        });
      }
    } else {
      setTitle('');
      setAddress('');
      setCity('Johannesburg');
      setProvince('Gauteng');
      setInvestmentNodeId(undefined);
      setDevelopmentType('Sectional Title Apartments');
      setCurrentPhase('Feasibility');
      setIsVatRegisteredDeveloper(defaultVatReg);
      setTaxEntityType('Company (27%)');
      setPreApprovalMonths(6);
      setConstructionMonths(10);
      setSellDownMonths(4);
      setLandPurchasePriceZAR(1500000);
      setAcquisitionCostsZAR(85000);
      setSec118ArrearsZAR(0);
      setTotalBuildableAreaSqm(480);
      setBudgetedHardCostPerSqmZAR(defaultHardRate);
      setContingencyPercent(7.5);
      setMonthlyPreApprovalHoldingBurnZAR(9500);
      setMonthlyConstructionHoldingBurnZAR(16500);
      setDevelopmentFacilityLimitZAR(4500000);
      setPreSalesHurdlePercent(investorProfile?.defaultPreSalesHurdlePercent ?? 40);
      setIsDeferredLandPaymentLAA(false);
      setSeniorJvPartnerName('');
      setNotes('');
      setInitialUnitCount(6);
      setDefaultUnitConfiguration('2 Bed 1 Bath Cluster');
      setTargetListPricePerUnitZAR(1350000);
      setEstMonthlyRentPerUnitZAR(11500);
      setCurrentZoning('Residential 3');
      setTargetZoning('');
      setErfSizeSqm(1200);
      setFarRatio(0.8);
      setFarInput('0.8');
      setCoveragePercent(50);
      setCoverageInput('50');
      setMaxHeightStoreys(3);
      setMaxDensityDuPerHa(40);
      setRequiresRezoning(false);
      setConsentUses({
        secondDwellingPermitted: true,
        studentCommuneConsent: false,
        backyardMicroUnitsPermitted: false,
        homeEnterprisePermitted: true,
      });
    }
  }, [editingDevelopment, isOpen, defaultVatReg, defaultHardRate]);

  // Close on Escape key press (matches rental modal behavior)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const projectData: Partial<DevelopmentProject> = {
      title,
      address,
      city,
      province,
      investmentNodeId: investmentNodeId || findInvestmentNode(city)?.id,
      developmentType,
      currentPhase,
      isVatRegisteredDeveloper,
      taxEntityType,
      preApprovalMonths: Number(preApprovalMonths),
      constructionMonths: Number(constructionMonths),
      sellDownMonths: Number(sellDownMonths),
      landPurchasePriceZAR: Number(landPurchasePriceZAR),
      acquisitionCostsZAR: Number(acquisitionCostsZAR),
      sec118ArrearsZAR: Number(sec118ArrearsZAR),
      totalBuildableAreaSqm: Number(totalBuildableAreaSqm),
      budgetedHardCostPerSqmZAR: Number(budgetedHardCostPerSqmZAR),
      contingencyPercent: Number(contingencyPercent),
      monthlyPreApprovalHoldingBurnZAR: Number(monthlyPreApprovalHoldingBurnZAR),
      monthlyConstructionHoldingBurnZAR: Number(monthlyConstructionHoldingBurnZAR),
      developmentFacilityLimitZAR: Number(developmentFacilityLimitZAR),
      preSalesHurdlePercent: Number(preSalesHurdlePercent),
      isDeferredLandPaymentLAA,
      seniorJvPartnerName: seniorJvPartnerName.trim() || undefined,
      notes,
    };

    const zoningProfile: ZoningProfile = {
      currentZoning,
      targetZoning: targetZoning ? targetZoning : undefined,
      erfSizeSqm: Number(erfSizeSqm),
      farRatio: Number(farRatio),
      coveragePercent: Number(coveragePercent),
      maxHeightStoreys: Number(maxHeightStoreys),
      maxDensityDuPerHa: maxDensityDuPerHa !== '' ? Number(maxDensityDuPerHa) : undefined,
      requiresRezoning,
      consentUses,
    };
    projectData.zoningProfile = zoningProfile;

    if (isNew) {
      const newProjectId = `dev-${Date.now()}`;
      projectData.id = newProjectId;
      projectData.createdAt = new Date().toISOString().split('T')[0];
      projectData.developmentFacilityDrawnZAR = 0;
      projectData.developmentFacilityRepaidZAR = 0;
      projectData.softCosts = {
        townPlannerZAR: 45000,
        architectZAR: 85000,
        structuralCivilEngineerZAR: 55000,
        quantitySurveyorZAR: 35000,
        nhbrcEnrolmentFeeZAR: 40000,
        councilBulkContributionsZAR: 120000,
        planScrutinyAndSubdivisionFeesZAR: 25000,
        marketingAndShowUnitZAR: 30000,
      };

      const envelope = calculateZoningEnvelope(
        zoningProfile,
        Number(totalBuildableAreaSqm),
        Number(initialUnitCount)
      );
      const splumaStatus = envelope.isSplumaRezoningTriggered ? 'Not Started' : 'N/A';
      projectData.approvals = {
        splumaRezoningSubdivision: {
          status: splumaStatus,
          notes:
            splumaStatus === 'N/A'
              ? 'As-of-Right municipal zoning rights confirmed. No SPLUMA Section 42 rezoning tribunal required.'
              : undefined,
        },
        sgDiagramApproval: { status: 'Not Started' },
        municipalBuildingPlans: { status: 'Not Started' },
        nhbrcEnrolment: { status: 'Not Started' },
        sectionalTitleRegister: { status: 'Not Started' },
        occupancyCertificate: { status: 'Not Started' },
      };
      projectData.boqItems = [];
      projectData.commentsLedger = [];
      projectData.units = generateInitialDevelopmentUnits({
        projectId: newProjectId,
        unitCount: Number(initialUnitCount),
        unitConfiguration: defaultUnitConfiguration,
        totalBuildableAreaSqm: Number(totalBuildableAreaSqm),
        landPurchasePriceZAR: Number(landPurchasePriceZAR),
        budgetedHardCostPerSqmZAR: Number(budgetedHardCostPerSqmZAR),
        listPriceVatInclZAR: Number(targetListPricePerUnitZAR),
        estimatedMonthlyRentZAR: Number(estMonthlyRentPerUnitZAR),
      });
    }

    onSave(projectData, isNew);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="development-project-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] overflow-y-auto cursor-default"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 id="development-project-modal-title" className="text-base font-bold text-slate-900">
                {isNew ? 'Create New Development Project' : `Edit ${editingDevelopment?.title}`}
              </h3>
              <p className="text-xs text-slate-500">
                Configure strategy, land purchase, construction budget, VAT status, and timelines.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5 text-xs">
          {/* Section 1: Identity & Location */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-1">
              <span>1. Identity, Strategy & Location</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parkview Infill Clusters"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Development Strategy</label>
                <select
                  value={developmentType}
                  onChange={(e) => setDevelopmentType(e.target.value as DevelopmentType)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 bg-white"
                >
                  {DEVELOPMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14 Tyrone Avenue, Parkview"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <InvestmentNodeSelect
                  label="City / Suburb Investment Node"
                  name="developmentCity"
                  value={city}
                  province={province}
                  onChange={(newCity, newProvince) => {
                    setCity(newCity);
                    setProvince(newProvince);
                    const node = findInvestmentNode(newCity);
                    if (node) {
                      setInvestmentNodeId(node.id);
                    }
                  }}
                  showProfileBanner={false}
                  selectClassName="w-full rounded border border-slate-300 px-3 py-1.5 bg-white text-xs text-slate-800 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Phase, Tax Entity & VAT */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-1">
              <span>2. Phase, VAT & Tax Entity</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Phase</label>
                <select
                  value={currentPhase}
                  onChange={(e) => setCurrentPhase(e.target.value as DevelopmentPhase)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 bg-white"
                >
                  {DEVELOPMENT_PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Entity Type</label>
                <select
                  value={taxEntityType}
                  onChange={(e) => setTaxEntityType(e.target.value as DevelopmentTaxEntityType)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 bg-white"
                >
                  {TAX_ENTITIES.map((te) => (
                    <option key={te} value={te}>
                      {te}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={isVatRegisteredDeveloper}
                    onChange={(e) => setIsVatRegisteredDeveloper(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>VAT Registered (15% Output / Input VAT)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Municipal Zoning Rights & Town Planning Envelope */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
              <div>
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span>Municipal Zoning Rights &amp; Statutory Envelope</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Defines maximum permitted bulk floor area (FAR), ground coverage, height, and density.
                </p>
              </div>
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-500">Presets:</span>
                {ZONING_PRESETS.map((preset) => {
                  const active = isPresetActive(preset);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyZoningPreset(preset.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors ${
                        active
                          ? 'bg-slate-900 text-white border border-slate-900'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Current Zoning</label>
                <select
                  value={currentZoning}
                  onChange={(e) => setCurrentZoning(e.target.value as MunicipalZoningCode)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 bg-white text-xs font-medium"
                >
                  {MUNICIPAL_ZONING_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Target Zoning (Optional)</label>
                <select
                  value={targetZoning}
                  onChange={(e) => setTargetZoning((e.target.value as MunicipalZoningCode) || '')}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 bg-white text-xs font-medium"
                >
                  <option value="">Same (As-of-Right)</option>
                  {MUNICIPAL_ZONING_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Erf Stand Size (m²)</label>
                <input
                  type="number"
                  min={1}
                  step={50}
                  value={erfSizeSqm}
                  onChange={(e) => setErfSizeSqm(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Floor Area Ratio (FAR)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={farInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFarInput(val);
                    const parsed = parseDecimal(val, 0);
                    if (parsed > 0) setFarRatio(parsed);
                  }}
                  onBlur={() => {
                    const parsed = parseDecimal(farInput, farRatio);
                    if (parsed > 0) {
                      setFarRatio(parsed);
                      setFarInput(String(parsed));
                    } else {
                      setFarInput(String(farRatio));
                    }
                  }}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Max Coverage (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={coverageInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCoverageInput(val);
                    const parsed = parseDecimal(val, 0);
                    if (parsed > 0) setCoveragePercent(parsed);
                  }}
                  onBlur={() => {
                    const parsed = parseDecimal(coverageInput, coveragePercent);
                    if (parsed > 0) {
                      setCoveragePercent(parsed);
                      setCoverageInput(String(parsed));
                    } else {
                      setCoverageInput(String(coveragePercent));
                    }
                  }}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Max Height (Storeys)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={maxHeightStoreys}
                  onChange={(e) => setMaxHeightStoreys(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Max Density (du / ha)</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={10}
                  value={maxDensityDuPerHa}
                  placeholder="Unrestricted"
                  onChange={(e) => setMaxDensityDuPerHa(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="h-[34px] flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 text-[11px] select-none">
                    <input
                      type="checkbox"
                      checked={requiresRezoning}
                      onChange={(e) => setRequiresRezoning(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <span>SPLUMA Rezoning Required</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Density Cap Exceeded Amber Alert */}
            {isDensityCapExceeded && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  <strong>Density Cap Exceeded:</strong> Planned {plannedUnits} units exceeds {maxAllowedUnits} units permitted on this {erfSizeSqm.toLocaleString('en-ZA')} m² stand ({maxDensityDuPerHa} du/ha). SPLUMA Section 42 rezoning tribunal required.
                </span>
              </div>
            )}

            {/* Consent Uses */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-4 text-[11px]">
              <span className="font-semibold text-slate-600">Consent Uses:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={consentUses.secondDwellingPermitted}
                  onChange={(e) => setConsentUses((prev) => ({ ...prev, secondDwellingPermitted: e.target.checked }))}
                  className="rounded border-slate-300 text-emerald-600 w-3.5 h-3.5"
                />
                <span>2nd Dwelling</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={consentUses.backyardMicroUnitsPermitted}
                  onChange={(e) => setConsentUses((prev) => ({ ...prev, backyardMicroUnitsPermitted: e.target.checked }))}
                  className="rounded border-slate-300 text-emerald-600 w-3.5 h-3.5"
                />
                <span>Backyard Micro-Units</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={consentUses.studentCommuneConsent}
                  onChange={(e) => setConsentUses((prev) => ({ ...prev, studentCommuneConsent: e.target.checked }))}
                  className="rounded border-slate-300 text-emerald-600 w-3.5 h-3.5"
                />
                <span>Student Commune</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={consentUses.homeEnterprisePermitted}
                  onChange={(e) => setConsentUses((prev) => ({ ...prev, homeEnterprisePermitted: e.target.checked }))}
                  className="rounded border-slate-300 text-emerald-600 w-3.5 h-3.5"
                />
                <span>Home Enterprise</span>
              </label>
            </div>
          </div>

          {/* Section 3: Land, Construction & Area Stack */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-1">
              <span>3. Land Acquisition & Construction Budget</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Land Purchase (ZAR)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={landPurchasePriceZAR}
                  onChange={(e) => setLandPurchasePriceZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
                <label className="mt-2 flex items-center gap-1.5 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={isDeferredLandPaymentLAA}
                    onChange={(e) => setIsDeferredLandPaymentLAA(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium text-slate-600 leading-snug">
                    Deferred Land Payment (LAA / Land JV — Paid from Unit Sales)
                  </span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Legal / Conveyancing (ZAR)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={acquisitionCostsZAR}
                  onChange={(e) => setAcquisitionCostsZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sec 118 Arrears (ZAR)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={sec118ArrearsZAR}
                  onChange={(e) => setSec118ArrearsZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Buildable Floor Area (m²)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={totalBuildableAreaSqm}
                  onChange={(e) => setTotalBuildableAreaSqm(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Budgeted Hard Cost (R/m²)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={budgetedHardCostPerSqmZAR}
                  onChange={(e) => setBudgetedHardCostPerSqmZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contingency Buffer (%)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={contingencyPercent}
                  onChange={(e) => setContingencyPercent(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Timeline & Carrying Burn */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-1">
              <span>4. Project Timelines & Carrying Burn</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pre-Approval Mo.</label>
                <input
                  type="number"
                  min={0}
                  value={preApprovalMonths}
                  onChange={(e) => setPreApprovalMonths(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Construction Mo.</label>
                <input
                  type="number"
                  min={1}
                  value={constructionMonths}
                  onChange={(e) => setConstructionMonths(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sell-Down Mo.</label>
                <input
                  type="number"
                  min={0}
                  value={sellDownMonths}
                  onChange={(e) => setSellDownMonths(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pre-Approval (R/mo)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={monthlyPreApprovalHoldingBurnZAR}
                  onChange={(e) => setMonthlyPreApprovalHoldingBurnZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Construction (R/mo)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={monthlyConstructionHoldingBurnZAR}
                  onChange={(e) => setMonthlyConstructionHoldingBurnZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Senior Bank Debt & Pre-Sales */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-1">
              <span>5. Senior Debt Facility & Bank Hurdle</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Senior Facility Limit (ZAR)
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={developmentFacilityLimitZAR}
                  onChange={(e) => setDevelopmentFacilityLimitZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pre-Sales Hurdle (% of GDV)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={preSalesHurdlePercent}
                  onChange={(e) => setPreSalesHurdlePercent(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Commercial bank requirement before releasing tranche draws (typically 50-70%)
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Senior JV / Co-Developer Partner (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. WBHO, Stefanutti Stocks, or leave blank for self-delivered"
                  value={seniorJvPartnerName}
                  onChange={(e) => setSeniorJvPartnerName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Optional institutional co-developer / JV partner name for commercial bank delivery track record (falls back to your entity name)
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Initial Unit Schedule Generator */}
          {isNew && (
            <div className="space-y-3 bg-emerald-50/40 border border-emerald-200 rounded-xl p-3.5">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-emerald-100 pb-1">
                <span>6. Initial Unit Schedule Generator</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Initial Unit Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={initialUnitCount}
                    onChange={(e) => setInitialUnitCount(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Default Unit Configuration
                  </label>
                  <input
                    type="text"
                    value={defaultUnitConfiguration}
                    onChange={(e) => setDefaultUnitConfiguration(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Target List Price / Unit (ZAR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={targetListPricePerUnitZAR}
                    onChange={(e) => setTargetListPricePerUnitZAR(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Est. Rent / Unit (ZAR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={estMonthlyRentPerUnitZAR}
                    onChange={(e) => setEstMonthlyRentPerUnitZAR(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Project Notes & Feasibility Assumptions</label>
            <textarea
              rows={2}
              placeholder="Zoning rights details, erf number, municipal tribunal notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-1.5 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              {isNew ? 'Create Development Project' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

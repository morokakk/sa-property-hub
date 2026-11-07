'use client';

import React, { useState, useEffect } from 'react';
import {
  DevelopmentProject,
  DevelopmentType,
  DevelopmentPhase,
  DevelopmentTaxEntityType,
  Province,
} from '@/types';
import { generateInitialDevelopmentUnits } from '@/lib/calculations/developments';
import {
  Building2,
  Calendar,
  Coins,
  HardHat,
  X,
  ShieldCheck,
  CheckCircle2,
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

export function DevelopmentProjectModal({
  isOpen,
  editingDevelopment,
  onClose,
  onSave,
}: DevelopmentProjectModalProps) {
  const isNew = !editingDevelopment;

  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Johannesburg');
  const [province, setProvince] = useState<Province>('Gauteng');
  const [developmentType, setDevelopmentType] = useState<DevelopmentType>('Sectional Title Apartments');
  const [currentPhase, setCurrentPhase] = useState<DevelopmentPhase>('Feasibility');
  const [isVatRegisteredDeveloper, setIsVatRegisteredDeveloper] = useState(true);
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
  const [budgetedHardCostPerSqmZAR, setBudgetedHardCostPerSqmZAR] = useState(10500);
  const [contingencyPercent, setContingencyPercent] = useState(7.5);

  // Holding & Facilities
  const [monthlyPreApprovalHoldingBurnZAR, setMonthlyPreApprovalHoldingBurnZAR] = useState(9500);
  const [monthlyConstructionHoldingBurnZAR, setMonthlyConstructionHoldingBurnZAR] = useState(16500);
  const [developmentFacilityLimitZAR, setDevelopmentFacilityLimitZAR] = useState(4500000);
  const [preSalesHurdlePercent, setPreSalesHurdlePercent] = useState(60);
  const [notes, setNotes] = useState('');

  // Initial Unit Schedule Generator (new projects)
  const [initialUnitCount, setInitialUnitCount] = useState(6);
  const [defaultUnitConfiguration, setDefaultUnitConfiguration] = useState('2 Bed 1 Bath Cluster');
  const [targetListPricePerUnitZAR, setTargetListPricePerUnitZAR] = useState(1350000);
  const [estMonthlyRentPerUnitZAR, setEstMonthlyRentPerUnitZAR] = useState(11500);

  useEffect(() => {
    if (editingDevelopment) {
      setTitle(editingDevelopment.title || '');
      setAddress(editingDevelopment.address || '');
      setCity(editingDevelopment.city || 'Johannesburg');
      setProvince(editingDevelopment.province || 'Gauteng');
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
      setPreSalesHurdlePercent(editingDevelopment.preSalesHurdlePercent ?? 60);
      setNotes(editingDevelopment.notes || '');
    } else {
      setTitle('');
      setAddress('');
      setCity('Johannesburg');
      setProvince('Gauteng');
      setDevelopmentType('Sectional Title Apartments');
      setCurrentPhase('Feasibility');
      setIsVatRegisteredDeveloper(true);
      setTaxEntityType('Company (27%)');
      setPreApprovalMonths(6);
      setConstructionMonths(10);
      setSellDownMonths(4);
      setLandPurchasePriceZAR(1500000);
      setAcquisitionCostsZAR(85000);
      setSec118ArrearsZAR(0);
      setTotalBuildableAreaSqm(480);
      setBudgetedHardCostPerSqmZAR(10500);
      setContingencyPercent(7.5);
      setMonthlyPreApprovalHoldingBurnZAR(9500);
      setMonthlyConstructionHoldingBurnZAR(16500);
      setDevelopmentFacilityLimitZAR(4500000);
      setPreSalesHurdlePercent(60);
      setNotes('');
      setInitialUnitCount(6);
      setDefaultUnitConfiguration('2 Bed 1 Bath Cluster');
      setTargetListPricePerUnitZAR(1350000);
      setEstMonthlyRentPerUnitZAR(11500);
    }
  }, [editingDevelopment, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const projectData: Partial<DevelopmentProject> = {
      title,
      address,
      city,
      province,
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
      notes,
    };

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
      projectData.approvals = {
        splumaRezoningSubdivision: { status: 'Not Started' },
        sgDiagramApproval: { status: 'Not Started' },
        municipalBuildingPlans: { status: 'Not Started' },
        nhbrcEnrolment: { status: 'Not Started' },
        sectionalTitleRegister: { status: 'Not Started' },
        occupancyCertificate: { status: 'Not Started' },
      };
      projectData.boqItems = [];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
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

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Province</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value as Province)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 bg-white"
                >
                  {SA_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
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
                  step={10000}
                  value={landPurchasePriceZAR}
                  onChange={(e) => setLandPurchasePriceZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Legal / Conveyancing (ZAR)</label>
                <input
                  type="number"
                  min={0}
                  step={5000}
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
                  step={5000}
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
                  step={500}
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
                  step={500}
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
                  step={500}
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
                  step={50000}
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
                  <label className="block font-semibold text-slate-700 mb-1">
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
                  <label className="block font-semibold text-slate-700 mb-1">
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target List Price / Unit (ZAR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={targetListPricePerUnitZAR}
                    onChange={(e) => setTargetListPricePerUnitZAR(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Est. Monthly Rent / Unit (ZAR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
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

'use client';

import React, { useState, useEffect } from 'react';
import { DevelopmentProject, BOQItem, DevelopmentSoftCosts } from '@/types';
import { DevelopmentFinancialSummary, calculateBOQItemTotals } from '@/lib/calculations/developments';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { FlipBOQTable } from '@/components/flips/FlipBOQTable';
import { exportFlipBOQCSV } from '@/lib/export/csvExport';
import {
  Coins,
  Building,
  HardHat,
  Clock,
  ShieldAlert,
  PlusCircle,
  FileSpreadsheet,
  X,
  FileCheck,
} from 'lucide-react';

export interface DevelopmentCostStackTabProps {
  development: DevelopmentProject;
  financials: DevelopmentFinancialSummary;
  readOnly?: boolean;
  onUpdateSoftCosts: (softCosts: Partial<DevelopmentSoftCosts>) => void;
  onUpdateDevelopment: (updates: Partial<DevelopmentProject>) => void;
  onAddBOQItem?: (item: Omit<BOQItem, 'id'>) => void;
  onUpdateBOQItem: (itemId: string, updates: Partial<BOQItem>) => void;
  onDeleteBOQItem: (itemId: string) => void;
  onExportBOQCSV?: () => void;
}

export function DevelopmentCostStackTab({
  development,
  financials,
  readOnly = false,
  onUpdateSoftCosts,
  onUpdateDevelopment,
  onAddBOQItem,
  onUpdateBOQItem,
  onDeleteBOQItem,
  onExportBOQCSV,
}: DevelopmentCostStackTabProps) {
  const softCosts = development.softCosts || {
    townPlannerZAR: 0,
    architectZAR: 0,
    structuralCivilEngineerZAR: 0,
    quantitySurveyorZAR: 0,
    nhbrcEnrolmentFeeZAR: 0,
    councilBulkContributionsZAR: 0,
    planScrutinyAndSubdivisionFeesZAR: 0,
    marketingAndShowUnitZAR: 0,
  };

  // Add BOQ Item Modal State
  const [isAddBOQOpen, setIsAddBOQOpen] = useState(false);
  const [boqDesc, setBoqDesc] = useState('');
  const [boqCategory, setBoqCategory] = useState<BOQItem['category']>('Roofing & Structural');
  const [boqMilestone, setBoqMilestone] = useState<NonNullable<BOQItem['milestonePhase']>>('First Fix / Wet Works');
  const [boqUnit, setBoqUnit] = useState('m²');
  const [boqQty, setBoqQty] = useState(1);
  const [boqBaselineCost, setBoqBaselineCost] = useState(10000);
  const [boqActualCost, setBoqActualCost] = useState(10000);
  const [boqSupplier, setBoqSupplier] = useState('');

  useEffect(() => {
    if (readOnly) setIsAddBOQOpen(false);
  }, [readOnly]);

  useEffect(() => {
    if (!isAddBOQOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddBOQOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddBOQOpen]);

  const handleExportCSV = () => {
    if (onExportBOQCSV) {
      onExportBOQCSV();
    } else {
      exportFlipBOQCSV({
        ...development,
        boq: development.boqItems || [],
      } as any);
    }
  };

  const handleCreateBOQItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !boqDesc) return;

    if (onAddBOQItem) {
      const { baselineTotalZAR, varianceZAR } = calculateBOQItemTotals(
        Number(boqQty) || 1,
        Number(boqBaselineCost) || 0,
        Number(boqActualCost) || 0
      );

      onAddBOQItem({
        category: boqCategory,
        itemDescription: boqDesc,
        unit: boqUnit,
        quantity: Number(boqQty) || 1,
        baselineUnitCostZAR: Number(boqBaselineCost) || 0,
        baselineTotalZAR,
        actualCostZAR: Number(boqActualCost) || 0,
        varianceZAR,
        status: 'Not Started',
        milestonePhase: boqMilestone,
        supplierOrContractor: boqSupplier || 'Direct Trade',
      });
    }

    setIsAddBOQOpen(false);
    setBoqDesc('');
    setBoqSupplier('');
  };

  const handleSoftCostChange = (field: keyof DevelopmentSoftCosts, val: number) => {
    if (readOnly) return;
    onUpdateSoftCosts({ [field]: val });
  };

  return (
    <div data-testid="development-cost-stack-tab" className="space-y-6">
      {/* Overview Cards: Land, Soft, Hard, Holding */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Land & Acquisition */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Land & Acquisition</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {formatZAR(financials.totalLandAndAcquisitionZAR)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
            <div>Purchase: {formatZAR(development.landPurchasePriceZAR)}</div>
            <div>Legal & Fees: {formatZAR(development.acquisitionCostsZAR)}</div>
            {development.sec118ArrearsZAR > 0 && (
              <div className="text-rose-600">Sec 118 Arrears: {formatZAR(development.sec118ArrearsZAR)}</div>
            )}
          </div>
        </div>

        {/* Soft Costs & Contributions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Soft Costs & SPLUMA</span>
            <Coins className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {formatZAR(financials.totalSoftCostsZAR)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>{formatPercent(financials.softCostsPercentOfTdc)} of Total TDC</span>
            <div className="text-[10px] text-slate-400 mt-0.5">Council bulk + Professional fees</div>
          </div>
        </div>

        {/* Hard Construction BOQ */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Hard Build BOQ</span>
            <HardHat className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {formatZAR(financials.activeHardBuildCostZAR)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Budget: {formatZAR(financials.budgetedHardBuildCostZAR)}</span>
            <div className="text-[10px] text-slate-400 mt-0.5">
              BOQ Spend: {formatZAR(financials.actualBoqSpendZAR)}
            </div>
          </div>
        </div>

        {/* Carrying Burn & Contingency */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Holding & Buffer</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {formatZAR(financials.totalHoldingAndContingencyZAR)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
            <div>Carrying Burn: {formatZAR(financials.totalCarryingCostZAR)}</div>
            <div>Contingency ({development.contingencyPercent}%): {formatZAR(financials.contingencyReserveZAR)}</div>
          </div>
        </div>
      </div>

      {/* Section A: Professional Team Fees & Municipal Bulk Contributions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>Professional Team Soft Costs & Municipal Bulk Contributions</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized town planning, architectural, engineering, statutory scrutiny, and SPLUMA Section 42 engineering contributions.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Soft Costs:</span>
            <div className="text-base font-bold text-blue-900">{formatZAR(financials.totalSoftCostsZAR)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Town Planner (SPLUMA)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              disabled={readOnly}
              value={softCosts.townPlannerZAR || 0}
              onChange={(e) => !readOnly && handleSoftCostChange('townPlannerZAR', Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Rezoning, SDP & subdivision</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Architect / Draftsperson
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              disabled={readOnly}
              value={softCosts.architectZAR || 0}
              onChange={(e) => !readOnly && handleSoftCostChange('architectZAR', Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Working drawings & council</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Structural & Civil Engineer
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              disabled={readOnly}
              value={softCosts.structuralCivilEngineerZAR || 0}
              onChange={(e) => !readOnly && handleSoftCostChange('structuralCivilEngineerZAR', Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Slabs, raft foundations, stormwater</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Quantity Surveyor (QS)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              disabled={readOnly}
              value={softCosts.quantitySurveyorZAR || 0}
              onChange={(e) => !readOnly && handleSoftCostChange('quantitySurveyorZAR', Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Bank drawdown verification</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Council Bulk Contributions
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              disabled={readOnly}
              value={softCosts.councilBulkContributionsZAR || 0}
              onChange={(e) => !readOnly && handleSoftCostChange('councilBulkContributionsZAR', Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">SPLUMA Section 42 bulk services</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              NHBRC Enrolment Fee
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              disabled={readOnly}
              value={softCosts.nhbrcEnrolmentFeeZAR || 0}
              onChange={(e) => !readOnly && handleSoftCostChange('nhbrcEnrolmentFeeZAR', Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Housing warranty certificate</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Plan Scrutiny & Council Fees
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              disabled={readOnly}
              value={softCosts.planScrutinyAndSubdivisionFeesZAR || 0}
              onChange={(e) => !readOnly && handleSoftCostChange('planScrutinyAndSubdivisionFeesZAR', Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Municipal submission & approvals</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Marketing & Show Unit
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              disabled={readOnly}
              value={softCosts.marketingAndShowUnitZAR || 0}
              onChange={(e) => !readOnly && handleSoftCostChange('marketingAndShowUnitZAR', Number(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">CGI renders, hoarding & brochures</span>
          </div>
        </div>
      </div>

      {/* Section B: Hard Construction BOQ Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-amber-600" />
            <span>Hard Construction Bill of Quantities (BOQ)</span>
          </h4>
        </div>

        <FlipBOQTable
          flip={{
            ...development,
            boq: development.boqItems || [],
            baselineRenovationBudgetZAR: financials.budgetedHardBuildCostZAR,
            numberOfUnits: development.units?.length || 0,
          } as any}
          readOnly={readOnly}
          onOpenAddBOQ={() => !readOnly && setIsAddBOQOpen(true)}
          onUpdateBOQItem={onUpdateBOQItem}
          onDeleteBOQItem={onDeleteBOQItem}
          onExportCSV={handleExportCSV}
        />
      </div>

      {/* Section C: Holding Burn & Contingency Parameters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-4 h-4 text-purple-600" />
          <span>Timeline, Holding Burn & Contingency Reserves</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pre-Approval Months</label>
            <input
              type="number"
              min={0}
              disabled={readOnly}
              value={development.preApprovalMonths}
              onChange={(e) => !readOnly && onUpdateDevelopment({ preApprovalMonths: Number(e.target.value) })}
              className="w-full rounded border border-slate-300 px-3 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Paper rights & zoning timeline</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pre-Approval Holding (R/mo)</label>
            <input
              type="number"
              min={0}
              step={500}
              disabled={readOnly}
              value={development.monthlyPreApprovalHoldingBurnZAR}
              onChange={(e) =>
                !readOnly &&
                onUpdateDevelopment({ monthlyPreApprovalHoldingBurnZAR: Number(e.target.value) })
              }
              className="w-full rounded border border-slate-300 px-3 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Rates, basic utilities, site security</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Construction Months</label>
            <input
              type="number"
              min={1}
              disabled={readOnly}
              value={development.constructionMonths}
              onChange={(e) => !readOnly && onUpdateDevelopment({ constructionMonths: Number(e.target.value) })}
              className="w-full rounded border border-slate-300 px-3 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Wet works to practical completion</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Construction Holding (R/mo)</label>
            <input
              type="number"
              min={0}
              step={500}
              disabled={readOnly}
              value={development.monthlyConstructionHoldingBurnZAR}
              onChange={(e) =>
                !readOnly &&
                onUpdateDevelopment({ monthlyConstructionHoldingBurnZAR: Number(e.target.value) })
              }
              className="w-full rounded border border-slate-300 px-3 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Water, temporary power, security</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contingency Reserve (%)</label>
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              disabled={readOnly}
              value={development.contingencyPercent}
              onChange={(e) => !readOnly && onUpdateDevelopment({ contingencyPercent: Number(e.target.value) })}
              className="w-full rounded border border-slate-300 px-3 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Reserve: {formatZAR(financials.contingencyReserveZAR)}
            </span>
          </div>
        </div>
      </div>

      {/* Add BOQ Item Modal */}
      {isAddBOQOpen && !readOnly && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsAddBOQOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">Add BOQ Trade Item</h4>
                <p className="text-xs text-slate-500">Record a trade item in the bill of quantities.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBOQOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBOQItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raft foundation concrete pour & steel rebar"
                  value={boqDesc}
                  onChange={(e) => setBoqDesc(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trade Category</label>
                  <select
                    value={boqCategory}
                    onChange={(e) => setBoqCategory(e.target.value as any)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 bg-white"
                  >
                    <option value="Demolition & Prep">Demolition & Prep</option>
                    <option value="Plumbing & Wet Works">Plumbing & Wet Works</option>
                    <option value="Electrical & Lighting">Electrical & Lighting</option>
                    <option value="Ceilings & Drywall">Ceilings & Drywall</option>
                    <option value="Kitchen & Cabinetry">Kitchen & Cabinetry</option>
                    <option value="Bathrooms">Bathrooms</option>
                    <option value="Flooring & Tiling">Flooring & Tiling</option>
                    <option value="Painting & Finishes">Painting & Finishes</option>
                    <option value="Roofing & Structural">Roofing & Structural</option>
                    <option value="Security & Exterior">Security & Exterior</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Milestone Phase</label>
                  <select
                    value={boqMilestone}
                    onChange={(e) => setBoqMilestone(e.target.value as any)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 bg-white"
                  >
                    <option value="Deposit">Deposit</option>
                    <option value="First Fix / Wet Works">First Fix / Wet Works</option>
                    <option value="Finishes">Finishes</option>
                    <option value="Retention">Retention</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={boqUnit}
                    onChange={(e) => setBoqUnit(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={boqQty}
                    onChange={(e) => setBoqQty(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baseline Cost</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={boqBaselineCost}
                    onChange={(e) => setBoqBaselineCost(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Actual Spend (ZAR)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={boqActualCost}
                    onChange={(e) => setBoqActualCost(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier / Trade</label>
                  <input
                    type="text"
                    placeholder="e.g. Builders Warehouse"
                    value={boqSupplier}
                    onChange={(e) => setBoqSupplier(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBOQOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Add Line Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { BOQItem, LocalSupplier } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { PlusCircle, Gift } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface AddBOQItemModalProps {
  isOpen: boolean;
  flipId?: string;
  onClose: () => void;
  onAdd?: (item: Omit<BOQItem, 'id'>) => void;
  // Controlled props for Phase 4A backward compatibility with page.tsx
  boqCategory?: BOQItem['category'];
  setBoqCategory?: (cat: BOQItem['category']) => void;
  boqStatus?: BOQItem['status'];
  setBoqStatus?: (st: BOQItem['status']) => void;
  boqDescription?: string;
  setBoqDescription?: (desc: string) => void;
  boqUnit?: string;
  setBoqUnit?: (u: string) => void;
  boqQuantity?: number;
  setBoqQuantity?: (q: number) => void;
  boqBaselineUnitCost?: number;
  setBoqBaselineUnitCost?: (cost: number) => void;
  boqMilestonePhase?: NonNullable<BOQItem['milestonePhase']>;
  setBoqMilestonePhase?: (phase: NonNullable<BOQItem['milestonePhase']>) => void;
  boqRetentionPercent?: number;
  setBoqRetentionPercent?: (ret: number) => void;
  boqIsSponsored?: boolean;
  setBoqIsSponsored?: (s: boolean) => void;
  boqCommercialRetailValue?: number;
  setBoqCommercialRetailValue?: (val: number) => void;
  boqActualCashOutflow?: number;
  setBoqActualCashOutflow?: (val: number) => void;
  boqActualCost?: number;
  setBoqActualCost?: (cost: number) => void;
  boqSupplier?: string;
  setBoqSupplier?: (sup: string) => void;
  suppliers?: LocalSupplier[];
  onSubmit?: (e: React.FormEvent) => void;
}

export const AddBOQItemModal: React.FC<AddBOQItemModalProps> = ({
  isOpen,
  flipId,
  onClose,
  onAdd,
  boqCategory: propBoqCategory,
  setBoqCategory: propSetBoqCategory,
  boqStatus: propBoqStatus,
  setBoqStatus: propSetBoqStatus,
  boqDescription: propBoqDescription,
  setBoqDescription: propSetBoqDescription,
  boqUnit: propBoqUnit,
  setBoqUnit: propSetBoqUnit,
  boqQuantity: propBoqQuantity,
  setBoqQuantity: propSetBoqQuantity,
  boqBaselineUnitCost: propBoqBaselineUnitCost,
  setBoqBaselineUnitCost: propSetBoqBaselineUnitCost,
  boqMilestonePhase: propBoqMilestonePhase,
  setBoqMilestonePhase: propSetBoqMilestonePhase,
  boqRetentionPercent: propBoqRetentionPercent,
  setBoqRetentionPercent: propSetBoqRetentionPercent,
  boqIsSponsored: propBoqIsSponsored,
  setBoqIsSponsored: propSetBoqIsSponsored,
  boqCommercialRetailValue: propBoqCommercialRetailValue,
  setBoqCommercialRetailValue: propSetBoqCommercialRetailValue,
  boqActualCashOutflow: propBoqActualCashOutflow,
  setBoqActualCashOutflow: propSetBoqActualCashOutflow,
  boqActualCost: propBoqActualCost,
  setBoqActualCost: propSetBoqActualCost,
  boqSupplier: propBoqSupplier,
  setBoqSupplier: propSetBoqSupplier,
  suppliers: propSuppliers,
  onSubmit: propOnSubmit,
}) => {
  const storeSuppliers = usePortfolioStore((s) => s.suppliers);
  const addBOQItemStore = usePortfolioStore((s) => s.addBOQItem);
  const suppliers = propSuppliers || storeSuppliers;

  // Local state fallbacks
  const [localCategory, setLocalCategory] = useState<BOQItem['category']>('Demolition & Prep');
  const [localStatus, setLocalStatus] = useState<BOQItem['status']>('Not Started');
  const [localDescription, setLocalDescription] = useState('');
  const [localUnit, setLocalUnit] = useState('units');
  const [localQuantity, setLocalQuantity] = useState<number>(1);
  const [localBaselineUnitCost, setLocalBaselineUnitCost] = useState<number>(0);
  const [localMilestonePhase, setLocalMilestonePhase] = useState<NonNullable<BOQItem['milestonePhase']>>('Deposit');
  const [localRetentionPercent, setLocalRetentionPercent] = useState<number>(0);
  const [localIsSponsored, setLocalIsSponsored] = useState(false);
  const [localCommercialRetailValue, setLocalCommercialRetailValue] = useState<number>(0);
  const [localActualCashOutflow, setLocalActualCashOutflow] = useState<number>(0);
  const [localActualCost, setLocalActualCost] = useState<number>(0);
  const [localSupplier, setLocalSupplier] = useState('Builders Warehouse Sandton');

  const category = propBoqCategory !== undefined ? propBoqCategory : localCategory;
  const setCategory = propSetBoqCategory || setLocalCategory;
  const status = propBoqStatus !== undefined ? propBoqStatus : localStatus;
  const setStatus = propSetBoqStatus || setLocalStatus;
  const description = propBoqDescription !== undefined ? propBoqDescription : localDescription;
  const setDescription = propSetBoqDescription || setLocalDescription;
  const unit = propBoqUnit !== undefined ? propBoqUnit : localUnit;
  const setUnit = propSetBoqUnit || setLocalUnit;
  const quantity = propBoqQuantity !== undefined ? propBoqQuantity : localQuantity;
  const setQuantity = propSetBoqQuantity || setLocalQuantity;
  const baselineUnitCost = propBoqBaselineUnitCost !== undefined ? propBoqBaselineUnitCost : localBaselineUnitCost;
  const setBaselineUnitCost = propSetBoqBaselineUnitCost || setLocalBaselineUnitCost;
  const milestonePhase = propBoqMilestonePhase !== undefined ? propBoqMilestonePhase : localMilestonePhase;
  const setMilestonePhase = propSetBoqMilestonePhase || setLocalMilestonePhase;
  const retentionPercent = propBoqRetentionPercent !== undefined ? propBoqRetentionPercent : localRetentionPercent;
  const setRetentionPercent = propSetBoqRetentionPercent || setLocalRetentionPercent;
  const isSponsored = propBoqIsSponsored !== undefined ? propBoqIsSponsored : localIsSponsored;
  const setIsSponsored = propSetBoqIsSponsored || setLocalIsSponsored;
  const commercialRetailValue = propBoqCommercialRetailValue !== undefined ? propBoqCommercialRetailValue : localCommercialRetailValue;
  const setCommercialRetailValue = propSetBoqCommercialRetailValue || setLocalCommercialRetailValue;
  const actualCashOutflow = propBoqActualCashOutflow !== undefined ? propBoqActualCashOutflow : localActualCashOutflow;
  const setActualCashOutflow = propSetBoqActualCashOutflow || setLocalActualCashOutflow;
  const actualCost = propBoqActualCost !== undefined ? propBoqActualCost : localActualCost;
  const setActualCost = propSetBoqActualCost || setLocalActualCost;
  const supplier = propBoqSupplier !== undefined ? propBoqSupplier : localSupplier;
  const setSupplier = propSetBoqSupplier || setLocalSupplier;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }

    if (!description.trim()) return;

    const baselineTotal = quantity * baselineUnitCost;
    const finalActual = isSponsored && actualCashOutflow !== undefined ? actualCashOutflow : actualCost;

    const boqData: Omit<BOQItem, 'id'> = {
      category,
      itemDescription: description,
      unit,
      quantity,
      baselineUnitCostZAR: baselineUnitCost,
      baselineTotalZAR: baselineTotal,
      actualCostZAR: finalActual,
      varianceZAR: finalActual - baselineTotal,
      supplierOrContractor: supplier,
      status,
      milestonePhase,
      retentionPercent,
      isSponsoredOrBarter: isSponsored,
      commercialRetailValueZAR: isSponsored ? commercialRetailValue : undefined,
      actualCashOutflowZAR: isSponsored ? actualCashOutflow : undefined,
    };

    if (onAdd) {
      onAdd(boqData);
    } else if (flipId) {
      addBOQItemStore(flipId, boqData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-600" />
          Add Bill of Quantities (BOQ) Line Item
        </h3>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trade Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BOQItem['category'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
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
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BOQItem['status'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Not Started">Not Started</option>
                <option value="Quoted">Quoted</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Scope / Item Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. 1200x600 Rectified Polished Porcelain Floor Tiles"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                placeholder="m2, linear m, units"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Baseline Cost (ZAR)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={baselineUnitCost}
                onChange={(e) => setBaselineUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contractor Milestone Draw Phase</label>
              <select
                value={milestonePhase}
                onChange={(e) => setMilestonePhase(e.target.value as NonNullable<BOQItem['milestonePhase']>)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Deposit">Phase 1: Deposit (20%)</option>
                <option value="First Fix / Wet Works">Phase 2: First Fix / Wet Works (30%)</option>
                <option value="Finishes">Phase 3: Finishes & Tiling (30%)</option>
                <option value="Retention">Phase 4: Practical Completion Retention (20%)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Retention Withheld (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={retentionPercent}
                onChange={(e) => setRetentionPercent(Number(e.target.value))}
                placeholder="e.g. 20"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Held until practical completion</span>
            </div>
          </div>

          {/* Sponsor / Barter Accounting Section */}
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-purple-950">
              <input
                type="checkbox"
                checked={isSponsored}
                onChange={(e) => setIsSponsored(e.target.checked)}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-purple-700" />
                <span>Sponsor Barter / Trade Partner Item (Builders Warehouse, Saint-Gobain, Sonae Arauco)</span>
              </span>
            </label>

            {isSponsored && (
              <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                    Commercial Retail Value (ZAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={commercialRetailValue}
                    onChange={(e) => setCommercialRetailValue(Number(e.target.value))}
                    placeholder="e.g. 45000"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Full store retail price</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                    Net Cash Outflow (ZAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={actualCashOutflow}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setActualCashOutflow(val);
                      setActualCost(val);
                    }}
                    placeholder="e.g. 15000"
                    className="w-full px-2.5 py-1.5 border border-purple-300 rounded-lg bg-white font-bold text-purple-900"
                  />
                  <span className="text-[9px] text-emerald-700 font-bold mt-0.5 block">
                    Saved: {formatZAR(Math.max(0, commercialRetailValue - actualCashOutflow))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Actual Invoice Cost (ZAR)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={actualCost}
                onChange={(e) => setActualCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier / Contractor</label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.branchLocation})
                  </option>
                ))}
                <option value="Builders Warehouse Sandton">Builders Warehouse Sandton</option>
                <option value="Saint-Gobain Gyproc">Saint-Gobain Gyproc</option>
                <option value="Sonae Arauco Panels">Sonae Arauco Panels</option>
                <option value="Independent Contractor">Independent Contractor</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

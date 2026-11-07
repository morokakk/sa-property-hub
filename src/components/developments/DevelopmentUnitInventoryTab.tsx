'use client';

import React, { useState } from 'react';
import { DevelopmentProject, DevelopmentUnit, DevUnitStatus } from '@/types';
import { DevelopmentFinancialSummary } from '@/lib/calculations/developments';
import { formatZAR } from '@/lib/formatters';
import {
  PlusCircle,
  Building2,
  Sparkles,
  Trash2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';

export interface DevelopmentUnitInventoryTabProps {
  development: DevelopmentProject;
  financials: DevelopmentFinancialSummary;
  onUpdateUnit: (unitId: string, updates: Partial<DevelopmentUnit>) => void;
  onAddUnit?: (unit: Omit<DevelopmentUnit, 'id'>) => void;
  onDeleteUnit?: (unitId: string) => void;
  onMarkUnitSold: (unitId: string, buyerName?: string, salePriceZAR?: number) => void;
  onGraduateRetainedUnits: () => void;
}

const DEV_UNIT_STATUSES: DevUnitStatus[] = [
  'Available',
  'Reserved (OTP Signed)',
  'Bond Approved / Guarantees Issued',
  'Sold & Transferred',
  'Retained for Rental',
];

export function DevelopmentUnitInventoryTab({
  development,
  financials,
  onUpdateUnit,
  onAddUnit,
  onDeleteUnit,
  onMarkUnitSold,
  onGraduateRetainedUnits,
}: DevelopmentUnitInventoryTabProps) {
  const units = development.units || [];

  // Sale modal state
  const [sellingUnit, setSellingUnit] = useState<DevelopmentUnit | null>(null);
  const [saleBuyerName, setSaleBuyerName] = useState('');
  const [salePriceZAR, setSalePriceZAR] = useState<number>(0);
  const [conveyancerRef, setConveyancerRef] = useState('');

  // Add Unit modal state
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newConfig, setNewConfig] = useState('2 Bed 1 Bath');
  const [newFloorArea, setNewFloorArea] = useState<number>(65);
  const [newListPrice, setNewListPrice] = useState<number>(850000);
  const [newEstRent, setNewEstRent] = useState<number>(7500);
  const [newCostBasis, setNewCostBasis] = useState<number>(600000);

  // Ungraduated retained units
  const ungraduatedRetainedUnits = units.filter(
    (u) => u.status === 'Retained for Rental' && !u.graduatedRentalId
  );
  const canGraduate = ungraduatedRetainedUnits.length > 0;
  const isSection13Eligible = ungraduatedRetainedUnits.length >= 5 || financials.isSection13SexEligible;

  // Open Sale Modal
  const handleOpenSaleModal = (unit: DevelopmentUnit) => {
    setSellingUnit(unit);
    setSaleBuyerName(unit.buyerName || '');
    setSalePriceZAR(unit.listPriceVatInclZAR || 0);
    setConveyancerRef(unit.conveyancerRef || '');
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingUnit) return;
    onMarkUnitSold(sellingUnit.id, saleBuyerName || 'Private Buyer', salePriceZAR);
    if (conveyancerRef) {
      onUpdateUnit(sellingUnit.id, { conveyancerRef });
    }
    setSellingUnit(null);
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitNumber) return;

    if (onAddUnit) {
      onAddUnit({
        unitNumber: newUnitNumber,
        configuration: newConfig,
        floorAreaSqm: Number(newFloorArea) || 0,
        allocatedCostBasisZAR: Number(newCostBasis) || 0,
        listPriceVatInclZAR: Number(newListPrice) || 0,
        estimatedMonthlyRentZAR: Number(newEstRent) || 0,
        status: 'Available',
      });
    }

    setIsAddUnitOpen(false);
    setNewUnitNumber('');
  };

  const handleOpenAddUnitModal = () => {
    const nextIndex = units.length + 1;
    setNewUnitNumber(`Unit ${nextIndex}`);
    setIsAddUnitOpen(true);
  };

  // Status counters
  const statusCounts = DEV_UNIT_STATUSES.reduce((acc, status) => {
    acc[status] = units.filter((u) => u.status === status).length;
    return acc;
  }, {} as Record<DevUnitStatus, number>);

  // Totals for sticky footer
  const totalFloorArea = financials.totalFloorAreaSqm;
  const totalCostBasis = financials.totalAllocatedCostBasisZAR;
  const totalListGdv = financials.gdvInclVatZAR;
  const totalEstRent = financials.totalMonthlyEstimatedRentZAR;

  return (
    <div data-testid="development-unit-inventory-tab" className="space-y-4">
      {/* Header bar with controls & Section 13sex callout */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Unit Inventory & Split-Exit Schedule</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {units.length} Units
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage sectional title units, pre-sales contracts, OTP debt wipeout, and graduate retained units to the rental portfolio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddUnitModal}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
              <span>+ Add Unit</span>
            </button>

            <button
              type="button"
              onClick={onGraduateRetainedUnits}
              disabled={!canGraduate}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer ${
                canGraduate
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title={
                canGraduate
                  ? `Graduate ${ungraduatedRetainedUnits.length} retained units to /rentals`
                  : 'No ungraduated retained units available'
              }
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{`Graduate Retained Units to Rentals (${ungraduatedRetainedUnits.length})`}</span>
            </button>
          </div>
        </div>

        {/* Status Breakdown Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-400 mr-1">Status:</span>
          {DEV_UNIT_STATUSES.map((status) => {
            const count = statusCounts[status] || 0;
            let badgeStyle = 'bg-slate-50 text-slate-600 border-slate-200';
            if (status === 'Sold & Transferred') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
            if (status === 'Retained for Rental') badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
            if (status === 'Bond Approved / Guarantees Issued') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
            if (status === 'Reserved (OTP Signed)') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <span
                key={status}
                className={`text-[11px] px-2 py-0.5 rounded-full border ${badgeStyle}`}
              >
                {`${status}: ${count}`}
              </span>
            );
          })}
        </div>

        {/* Section 13sex Banner */}
        {isSection13Eligible && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-purple-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>SARS Section 13sex Tax Shield Qualified:</strong> Holding ≥ 5 residential units unlocks a 55% tax deduction base written off at 5% per annum for 20 years in <code>/rentals</code>.
              </span>
            </div>
            <span className="font-bold shrink-0 ml-2">
              {formatZAR(financials.section13sexAnnualAllowanceZAR)} / year tax shield
            </span>
          </div>
        )}
      </div>

      {/* Interactive Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                <th className="py-2.5 px-3">Unit #</th>
                <th className="py-2.5 px-3">Configuration</th>
                <th className="py-2.5 px-3 text-right">Floor (m²)</th>
                <th className="py-2.5 px-3 text-right">Cost Basis</th>
                <th className="py-2.5 px-3 text-right">List Price (incl. VAT)</th>
                <th className="py-2.5 px-3 text-right">Est. Rent</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Buyer / Ref</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No units recorded for this development. Click &quot;+ Add Unit&quot; above to add inventory.
                  </td>
                </tr>
              ) : (
                units.map((unit) => {
                  const isSold = unit.status === 'Sold & Transferred';
                  const isRetained = unit.status === 'Retained for Rental';

                  return (
                    <tr
                      key={unit.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSold ? 'bg-emerald-50/20' : isRetained ? 'bg-purple-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {unit.unitNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {unit.configuration}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {`${unit.floorAreaSqm} m²`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatZAR(unit.allocatedCostBasisZAR)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatZAR(unit.listPriceVatInclZAR)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatZAR(unit.estimatedMonthlyRentZAR)}/mo
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={unit.status}
                          onChange={(e) =>
                            onUpdateUnit(unit.id, {
                              status: e.target.value as DevUnitStatus,
                            })
                          }
                          aria-label={`Status for ${unit.unitNumber}`}
                          className={`text-xs rounded border px-2 py-1 font-medium focus:ring-1 focus:ring-slate-400 outline-hidden ${
                            isSold
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isRetained
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : 'bg-white text-slate-800 border-slate-300'
                          }`}
                        >
                          {DEV_UNIT_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {isSold ? (
                          <div className="leading-tight">
                            <span className="font-semibold text-slate-900">{unit.buyerName || 'Private Buyer'}</span>
                            {unit.conveyancerRef && (
                              <div className="text-[10px] text-slate-400">{`Ref: ${unit.conveyancerRef}`}</div>
                            )}
                          </div>
                        ) : isRetained ? (
                          unit.graduatedRentalId ? (
                            <span className="text-[11px] text-purple-700 font-medium inline-flex items-center gap-1">
                              <span>Graduated to /rentals</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 inline" />
                            </span>
                          ) : (
                            <span className="text-[11px] text-purple-600 font-medium">Retained Asset</span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {!isSold && !isRetained && (
                          <button
                            type="button"
                            onClick={() => handleOpenSaleModal(unit)}
                            title="Record sale and pay down debt"
                            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Mark Sold</span>
                          </button>
                        )}
                        {onDeleteUnit && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${unit.unitNumber} from inventory?`)) {
                                onDeleteUnit(unit.id);
                              }
                            }}
                            title="Delete unit"
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Sticky Totals Footer */}
            {units.length > 0 && (
              <tfoot className="bg-slate-100/95 font-semibold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10">
                <tr>
                  <td className="py-2.5 px-3">Total / Portfolio</td>
                  <td className="py-2.5 px-3 text-slate-500 font-normal">{`${units.length} Units`}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{`${totalFloorArea} m²`}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatZAR(totalCostBasis)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatZAR(totalListGdv)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-800">{formatZAR(totalEstRent)}/mo</td>
                  <td colSpan={3} className="py-2.5 px-3 text-right text-xs text-slate-500 font-normal">
                    {`${financials.unitsSoldAndTransferredCount} Sold • ${financials.unitsRetainedCount} Retained • ${financials.unitsForSaleCount} Available`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Mark Sold & Pay Down Debt Modal */}
      {sellingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Mark {sellingUnit.unitNumber} as Sold
                </h4>
                <p className="text-xs text-slate-500">
                  1-Click sale settlement: automatically repays senior development debt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSellingUnit(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSale} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Buyer Name / Purchasing SPV
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Blue Sky Trust"
                  value={saleBuyerName}
                  onChange={(e) => setSaleBuyerName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Agreed Sale Price (ZAR incl. VAT)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  value={salePriceZAR}
                  onChange={(e) => setSalePriceZAR(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  List price was {formatZAR(sellingUnit.listPriceVatInclZAR)}.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Conveyancer / Deeds Office File Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ST-2026/0491-CT"
                  value={conveyancerRef}
                  onChange={(e) => setConveyancerRef(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-800 text-[11px] space-y-0.5">
                <div className="font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Waterfall Debt Extinguishment
                </div>
                <div>
                  Net proceeds will pay down senior debt. Current outstanding facility:{' '}
                  <strong>{formatZAR(financials.outstandingDevFacilityZAR)}</strong>.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSellingUnit(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Confirm Sale & Pay Down Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {isAddUnitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">Add Sectional Title Unit</h4>
                <p className="text-xs text-slate-500">Record a new unit in the development schedule.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUnitOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit 4B"
                    value={newUnitNumber}
                    onChange={(e) => setNewUnitNumber(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Configuration</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2 Bed 1 Bath"
                    value={newConfig}
                    onChange={(e) => setNewConfig(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor Area (m²)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newFloorArea}
                    onChange={(e) => setNewFloorArea(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Allocated Cost Basis (ZAR)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newCostBasis}
                    onChange={(e) => setNewCostBasis(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">List Price (ZAR incl. VAT)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={newListPrice}
                    onChange={(e) => setNewListPrice(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Est. Monthly Rent (ZAR)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={newEstRent}
                    onChange={(e) => setNewEstRent(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUnitOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

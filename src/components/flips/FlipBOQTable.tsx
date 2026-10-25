'use client';

import React from 'react';
import { FlipProject, BOQItem } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { FileSpreadsheet, PlusCircle, Gift, Trash2, CheckCircle2 } from 'lucide-react';

export interface FlipBOQTableProps {
  flip: FlipProject;
  onOpenAddBOQ: () => void;
  onUpdateBOQItem: (itemId: string, updates: Partial<BOQItem>) => void;
  onDeleteBOQItem: (itemId: string) => void;
  onExportCSV: () => void;
}

export function FlipBOQTable({
  flip,
  onOpenAddBOQ,
  onUpdateBOQItem,
  onDeleteBOQItem,
  onExportCSV,
}: FlipBOQTableProps) {
  const boqItems = flip.boq || [];

  // Table summary calculations
  const totalBaselineZAR = boqItems.reduce((acc, i) => acc + (i.baselineTotalZAR || 0), 0);
  const totalActualCostZAR = boqItems.reduce((acc, i) => acc + (i.actualCostZAR || 0), 0);
  const totalVarianceZAR = totalActualCostZAR - totalBaselineZAR;
  const totalSponsorSavingsZAR = boqItems.reduce((acc, i) => {
    if (!i.isSponsoredOrBarter) return acc;
    const retail = i.commercialRetailValueZAR || i.baselineTotalZAR || 0;
    return acc + Math.max(0, retail - (i.actualCostZAR || 0));
  }, 0);
  const contingencyBufferZAR = Math.max(0, flip.baselineRenovationBudgetZAR - totalBaselineZAR);

  const completedCount = boqItems.filter((i) => i.status === 'Completed').length;
  const inProgressCount = boqItems.filter((i) => i.status === 'In Progress').length;

  return (
    <div id="flips-boq" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Bill of Quantities (BOQ)</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {boqItems.length} Line Items
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Baseline estimates vs. actual contractor & supplier invoices with phase milestones and sponsor barter tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {boqItems.length > 0 && (
            <button
              type="button"
              onClick={onExportCSV}
              title="Download Bill of Quantities as CSV"
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export BOQ (CSV)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddBOQ}
            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add BOQ Item</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto relative">
        <table className="w-full min-w-[850px] text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs">
            <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
              <th className="py-3 px-3.5 pl-5">Trade Category</th>
              <th className="py-3 px-3.5">Draw Phase</th>
              <th className="py-3 px-3.5">Scope / Item Description</th>
              <th className="py-3 px-3.5">Unit / Qty</th>
              <th className="py-3 px-3.5">Baseline (ZAR)</th>
              <th className="py-3 px-3.5">Actual (ZAR)</th>
              <th className="py-3 px-3.5">Variance</th>
              <th className="py-3 px-3.5">Supplier / Contractor</th>
              <th className="py-3 px-3.5">Status</th>
              <th className="py-3 px-3.5 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {boqItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-3.5 pl-5 font-semibold text-slate-900 whitespace-nowrap">
                  {item.category}
                </td>
                <td className="py-3.5 px-3.5">
                  <select
                    value={item.milestonePhase || 'First Fix / Wet Works'}
                    onChange={(e) =>
                      onUpdateBOQItem(item.id, {
                        milestonePhase: e.target.value as NonNullable<BOQItem['milestonePhase']>,
                      })
                    }
                    className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-200 cursor-pointer bg-slate-50 text-slate-700 hover:bg-white shadow-2xs block"
                    title="Change milestone draw phase"
                  >
                    <option value="Deposit">Phase 1: Deposit (20%)</option>
                    <option value="First Fix / Wet Works">Phase 2: First Fix (30%)</option>
                    <option value="Finishes">Phase 3: Finishes (30%)</option>
                    <option value="Retention">Phase 4: Retention (20%)</option>
                  </select>
                  {item.retentionPercent && item.retentionPercent > 0 ? (
                    <span className="text-[9px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-1 inline-block">
                      {item.retentionPercent}% Ret
                    </span>
                  ) : null}
                </td>
                <td className="py-3.5 px-3.5 max-w-xs">
                  <div className="font-medium text-slate-800 leading-snug">{item.itemDescription}</div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {item.invoiceRef && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ref: {item.invoiceRef}
                      </span>
                    )}
                    {item.isSponsoredOrBarter && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                        <Gift className="w-2.5 h-2.5 text-purple-600" />
                        <span>Sponsor Barter • Retail {formatZAR(item.commercialRetailValueZAR || item.baselineTotalZAR)}</span>
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-3.5 text-slate-500 whitespace-nowrap">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-3.5 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                  {formatZAR(item.baselineTotalZAR)}
                </td>
                <td className="py-3.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                  <div className="leading-snug">{formatZAR(item.actualCostZAR)}</div>
                  {item.isSponsoredOrBarter && (
                    <div className="text-[9px] text-purple-700 font-normal">
                      Retail: {formatZAR(item.commercialRetailValueZAR || item.baselineTotalZAR)}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-3.5 whitespace-nowrap">
                  <span
                    className={`font-bold leading-snug ${
                      item.varianceZAR <= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {item.varianceZAR > 0 ? `+${formatZAR(item.varianceZAR)}` : formatZAR(item.varianceZAR)}
                  </span>
                </td>
                <td className="py-3.5 px-3.5 text-slate-600 font-medium max-w-[180px] truncate" title={item.supplierOrContractor}>
                  {item.supplierOrContractor}
                </td>
                <td className="py-3.5 px-3.5">
                  <select
                    value={item.status}
                    onChange={(e) =>
                      onUpdateBOQItem(item.id, {
                        status: e.target.value as BOQItem['status'],
                      })
                    }
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border border-slate-200 cursor-pointer ${
                      item.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-800'
                        : item.status === 'In Progress'
                        ? 'bg-indigo-50 text-indigo-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="Quoted">Quoted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </td>
                <td className="py-3.5 px-3.5 pr-5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete BOQ item "${item.itemDescription}"?`)) {
                        onDeleteBOQItem(item.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                    title="Delete line item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Sticky Totals Summary Footer */}
          <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 backdrop-blur-xs border-t-2 border-slate-300 font-bold text-slate-900 text-xs shadow-xs">
            <tr>
              <td className="py-3.5 px-3.5 pl-5 text-slate-900 whitespace-nowrap">
                Total BOQ ({boqItems.length} Items)
              </td>
              <td className="py-3.5 px-3.5 text-[11px] text-slate-600 whitespace-nowrap">
                4 Draw Phases
              </td>
              <td className="py-3.5 px-3.5 text-[11px] text-slate-600 whitespace-nowrap" title={`Master Budget: ${formatZAR(flip.baselineRenovationBudgetZAR)}`}>
                Master: {formatZAR(flip.baselineRenovationBudgetZAR, { compact: true })}{' '}
                <span className="text-emerald-700 font-semibold">({formatZAR(contingencyBufferZAR, { compact: true })} Reserve)</span>
              </td>
              <td className="py-3.5 px-3.5 text-slate-400 text-center">
                —
              </td>
              <td className="py-3.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                {formatZAR(totalBaselineZAR)}
              </td>
              <td className="py-3.5 px-3.5 font-bold text-indigo-900 whitespace-nowrap">
                <div>{formatZAR(totalActualCostZAR)}</div>
                {(flip.numberOfUnits || 1) > 1 && (
                  <div className="text-[10px] font-semibold text-indigo-600">
                    {formatZAR(Math.round((totalActualCostZAR || flip.baselineRenovationBudgetZAR || 0) / Math.max(1, flip.numberOfUnits || 1)), { compact: true })} / unit
                  </div>
                )}
              </td>
              <td className="py-3.5 px-3.5 whitespace-nowrap">
                <span className={`font-black ${totalVarianceZAR <= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {totalVarianceZAR > 0 ? `+${formatZAR(totalVarianceZAR)}` : formatZAR(totalVarianceZAR)}
                </span>
              </td>
              <td className="py-3.5 px-3.5 text-[11px] whitespace-nowrap">
                {totalSponsorSavingsZAR > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                    <Gift className="w-3 h-3 text-purple-600" />
                    <span>Saved {formatZAR(totalSponsorSavingsZAR)}</span>
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="py-3.5 px-3.5 text-[10px] text-slate-600 whitespace-nowrap">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{completedCount} Done • {inProgressCount} Active</span>
                </span>
              </td>
              <td className="py-3.5 px-3.5 pr-5 text-right text-slate-400">
                —
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default FlipBOQTable;

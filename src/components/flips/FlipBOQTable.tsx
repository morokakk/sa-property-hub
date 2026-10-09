'use client';

import React from 'react';
import { FlipProject, BOQItem } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { FileSpreadsheet, PlusCircle, Gift, Trash2 } from 'lucide-react';

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

  return (
    <div id="flips-boq" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Bill of Quantities (BOQ)</span>
            <span className="text-xs font-medium text-slate-500">
              ({boqItems.length} Line Items)
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Baseline estimates vs. actual contractor & supplier invoices with phase milestones and sponsor barter tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add BOQ Item</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
              <th className="p-3.5 pl-5">Trade Category</th>
              <th className="p-3.5">Draw Phase</th>
              <th className="p-3.5">Scope / Item Description</th>
              <th className="p-3.5">Unit / Qty</th>
              <th className="p-3.5">Baseline (ZAR)</th>
              <th className="p-3.5">Actual (ZAR)</th>
              <th className="p-3.5">Variance</th>
              <th className="p-3.5">Supplier / Contractor</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {boqItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3.5 pl-5 font-semibold text-slate-900">
                  {item.category}
                </td>
                <td className="p-3.5">
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
                <td className="p-3.5 max-w-xs">
                  <div className="font-medium text-slate-800">{item.itemDescription}</div>
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
                <td className="p-3.5 text-slate-500">
                  {item.quantity} {item.unit}
                </td>
                <td className="p-3.5 font-medium text-slate-700">
                  {formatZAR(item.baselineTotalZAR)}
                </td>
                <td className="p-3.5 font-bold text-slate-900">
                  <div>{formatZAR(item.actualCostZAR)}</div>
                  {item.isSponsoredOrBarter && (
                    <div className="text-[9px] text-purple-700 font-normal">
                      Retail: {formatZAR(item.commercialRetailValueZAR || item.baselineTotalZAR)}
                    </div>
                  )}
                </td>
                <td className="p-3.5">
                  <span
                    className={`font-bold ${
                      item.varianceZAR <= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {item.varianceZAR > 0 ? `+${formatZAR(item.varianceZAR)}` : formatZAR(item.varianceZAR)}
                  </span>
                </td>
                <td className="p-3.5 text-slate-600 font-medium">
                  {item.supplierOrContractor}
                </td>
                <td className="p-3.5">
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
                <td className="p-3.5 pr-5 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete BOQ item "${item.itemDescription}"?`)) {
                        onDeleteBOQItem(item.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Delete line item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FlipBOQTable;

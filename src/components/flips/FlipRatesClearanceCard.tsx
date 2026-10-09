'use client';

import React from 'react';
import { FlipProject } from '@/types';
import { FlipFinancialSummary } from '@/lib/calculations/flips';
import { formatZAR } from '@/lib/formatters';
import { Landmark, ShieldAlert, Clock, AlertCircle } from 'lucide-react';

export interface FlipRatesClearanceCardProps {
  flip: FlipProject;
  financials: FlipFinancialSummary;
  onUpdateClearance: (updates: Partial<NonNullable<FlipProject['municipalClearance']>>) => void;
  onOpenDelayMatrix?: () => void;
}

export function FlipRatesClearanceCard({
  flip,
  financials,
  onUpdateClearance,
  onOpenDelayMatrix,
}: FlipRatesClearanceCardProps) {
  const {
    sec118ArrearsZAR: sec118ArrearsVal,
    advanceCouncilDepositZAR: advanceCouncilDepositVal,
    totalMunicipalClearanceOutlayZAR: totalMunicipalClearanceOutlay,
    rccStatus: rccStatusVal,
    isRccDisputed,
    flipMonthlyHoldingCostZAR: flipMonthlyHoldingCost,
  } = financials;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Section 118 Municipal Rates Clearance (RCC) & Arrears Tracker
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  rccStatusVal === 'Certificate Issued'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : rccStatusVal === 'Disputed'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : rccStatusVal === 'Paid & Awaiting Certificate'
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {rccStatusVal}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Municipal Systems Act Section 118(1) 2-year clearance, advance rates deposit & Deeds Registry clearance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={rccStatusVal}
            onChange={(e) =>
              onUpdateClearance({
                sec118ArrearsZAR: sec118ArrearsVal,
                advanceCouncilDepositZAR: advanceCouncilDepositVal,
                rccStatus: e.target.value as NonNullable<FlipProject['municipalClearance']>['rccStatus'],
                rccApplicationDate: flip.municipalClearance?.rccApplicationDate,
                disputeNotes: flip.municipalClearance?.disputeNotes,
              })
            }
            className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer text-slate-800 shadow-2xs"
          >
            <option value="Pending Application">Pending Application</option>
            <option value="Figures Issued">Figures Issued</option>
            <option value="Paid & Awaiting Certificate">Paid & Awaiting Certificate</option>
            <option value="Disputed">Disputed (CoJ Billing Error)</option>
            <option value="Certificate Issued">Certificate Issued (Clear for Transfer)</option>
          </select>
        </div>
      </div>

      {/* Arrears and Advance Deposit Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Section 118(1) 2-Yr Arrears</span>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">
            {formatZAR(sec118ArrearsVal)}
          </div>
          <span className="text-[9px] text-slate-400">Statutory municipal historical debt</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Advance Council Deposit</span>
          <div className="text-base font-extrabold text-blue-700 mt-0.5">
            {formatZAR(advanceCouncilDepositVal)}
          </div>
          <span className="text-[9px] text-slate-400">4–6 months rates required upfront</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total RCC Cash Outlay</span>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">
            {formatZAR(totalMunicipalClearanceOutlay)}
          </div>
          <span className="text-[9px] text-slate-400">Total payable for clearance certificate</span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">RCC Application Date</span>
          <div className="text-base font-extrabold text-slate-800 mt-0.5">
            {flip.municipalClearance?.rccApplicationDate || 'Not Lodged'}
          </div>
          <span className="text-[9px] text-slate-400">Conveyancer lodgement date</span>
        </div>
      </div>

      {/* Dispute & Holding Burn Warning */}
      {isRccDisputed && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-rose-900">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">CoJ Municipal Rates Dispute Active:</span>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Municipal figures are disputed. Property transfer is halted while carrying costs burn at{' '}
                <strong>{formatZAR(flipMonthlyHoldingCost)}/month</strong>.
                {flip.municipalClearance?.disputeNotes && (
                  <span className="block mt-1 italic text-rose-900">
                    Notes: {flip.municipalClearance.disputeNotes}
                  </span>
                )}
              </p>
            </div>
          </div>
          {onOpenDelayMatrix && (
            <button
              type="button"
              onClick={onOpenDelayMatrix}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs shrink-0 shadow-2xs cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Simulate Dispute Delay (+30–120d)</span>
            </button>
          )}
        </div>
      )}

      {!isRccDisputed && rccStatusVal === 'Pending Application' && (
        <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Conveyancer awaiting City of Johannesburg rates clearance figures. Council turnaround standard is 14 to 30 days.
            </span>
          </div>
          {onOpenDelayMatrix && (
            <button
              type="button"
              onClick={onOpenDelayMatrix}
              className="text-amber-900 hover:text-amber-950 font-bold underline cursor-pointer shrink-0 text-[10px]"
            >
              Check Delay Exposure →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FlipRatesClearanceCard;

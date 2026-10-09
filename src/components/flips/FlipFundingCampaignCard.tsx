'use client';

import React from 'react';
import { FlipProject } from '@/types';
import { FundingCampaignSummary } from '@/lib/calculations/flips';
import { formatZAR } from '@/lib/formatters';
import { Coins, RotateCcw } from 'lucide-react';

export interface FlipFundingCampaignCardProps {
  flip: FlipProject;
  fundingSummary: FundingCampaignSummary;
  onOpenFundingModal: () => void;
  totalCostBasis?: number;
  onSyncLedgerToDeal?: () => void;
}

export function FlipFundingCampaignCard({
  flip,
  fundingSummary,
  onOpenFundingModal,
  totalCostBasis = 0,
  onSyncLedgerToDeal,
}: FlipFundingCampaignCardProps) {
  const {
    fundingRequiredZAR: fundingRequiredVal,
    capitalRaisedZAR: capitalRaisedVal,
    capitalRemainingZAR: capitalRemainingVal,
    fundingProgressPercent,
  } = fundingSummary;

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-xs border border-slate-800 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Funding Campaign & Capital Progress
              </h3>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-semibold border border-slate-700">
                {fundingProgressPercent}% Raised
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Track target facility, capital secured to date, lead funder, and promised return structure
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onSyncLedgerToDeal && (
            <button
              type="button"
              onClick={onSyncLedgerToDeal}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sync 'Capital Raised' with active linked ledger tranches"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Sync from Ledger</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenFundingModal}
            className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Edit Funding Terms
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Funding Required</span>
            <div className="text-base sm:text-lg font-extrabold text-white mt-0.5">
              {formatZAR(fundingRequiredVal)}
            </div>
            <span className="text-[9px] text-slate-400">Target raise facility</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Capital Raised</span>
            <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-0.5">
              {formatZAR(capitalRaisedVal)}
            </div>
            <span className="text-[9px] text-slate-400">Managed to raise</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Remaining Required</span>
            <div className="text-base sm:text-lg font-extrabold text-amber-400 mt-0.5">
              {formatZAR(capitalRemainingVal)}
            </div>
            <span className="text-[9px] text-slate-400">
              {capitalRemainingVal === 0 ? 'Fully funded! 🎉' : 'Still to secure'}
            </span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Cost Basis Drawn</span>
            <div className="text-base sm:text-lg font-extrabold text-slate-200 mt-0.5">
              {formatZAR(totalCostBasis)}
            </div>
            <span className="text-[9px] text-slate-400">Purchase + legal + spend</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300 text-[11px]">Fundraising Progress</span>
            <span className="font-extrabold text-emerald-400 text-xs">
              {formatZAR(capitalRaisedVal)} / {formatZAR(fundingRequiredVal)} ({fundingProgressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                fundingProgressPercent >= 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-emerald-600 to-indigo-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, fundingProgressPercent))}%` }}
            />
          </div>
        </div>

        {/* Primary Funder & Promised Terms Detailed Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Primary Funder / Syndicate Lead
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                {flip.primaryFunderType || 'Private Lender'}
              </span>
            </div>
            <div className="text-sm font-bold text-white">
              {flip.primaryFunderName || 'No Lead Funder Assigned'}
            </div>
            {flip.primaryFunderContact && (
              <div className="text-[11px] text-slate-400">{flip.primaryFunderContact}</div>
            )}
            {flip.coFundersNotes && (
              <div className="text-[10px] text-indigo-300 italic pt-0.5">
                Co-funders: {flip.coFundersNotes}
              </div>
            )}
          </div>

          <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Promised Return & Collateral
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                {flip.promisedReturnType || 'Fixed Interest'}
              </span>
            </div>
            <div className="text-sm font-bold text-emerald-400">
              {flip.promisedReturnRatePercent ?? 14}%{' '}
              {flip.promisedReturnType === 'Fixed Interest'
                ? 'p.a. Fixed Interest'
                : flip.promisedReturnType === 'Equity Profit Split'
                ? 'Net Flip Profit Split'
                : flip.promisedReturnType || 'Fixed Interest'}
            </div>
            <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-x-2">
              <span>Payout: {flip.promisedPayoutSchedule || 'Monthly Interest'}</span>
              <span>•</span>
              <span className="text-slate-400">{flip.securityOffered || '2nd Mortgage Bond registered'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlipFundingCampaignCard;

'use client';

import React from 'react';
import Link from 'next/link';
import { FlipProject } from '@/types';
import { calculateArchivedFlipFinancials } from '@/lib/calculations/flips';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { PropertyTypeBadge } from '@/components/common/PropertyTypeBadge';
import {
  Archive,
  Hammer,
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

export interface FlipSoldArchiveViewProps {
  completedFlips: FlipProject[];
  onReopenFlip: (flipId: string, title: string) => void;
  onSwitchToActive: () => void;
  convertedRentalId?: string | null;
  onClearConvertedRentalBanner?: () => void;
}

export function FlipSoldArchiveView({
  completedFlips,
  onReopenFlip,
  onSwitchToActive,
  convertedRentalId,
  onClearConvertedRentalBanner,
}: FlipSoldArchiveViewProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-600" />
            <span>Sold & Completed Flips Archive</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Historical performance record of realized exit prices, capital recycling, and net profits returned to seed capital.
          </p>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
          {completedFlips.length} Realized Exit(s)
        </span>
      </div>

      {/* Converted to Rental Success Banner */}
      {convertedRentalId && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-950">Property Successfully Converted to Rental!</h4>
              <p className="text-[11px] text-indigo-700">Initial capital basis and compliance documents transferred to the Rentals module.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/rentals"
              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-colors"
            >
              <span>Go to Rentals</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            {onClearConvertedRentalBanner && (
              <button
                type="button"
                onClick={onClearConvertedRentalBanner}
                className="text-indigo-400 hover:text-indigo-700 text-xs px-1.5 py-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {completedFlips.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">No completed flips archived yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            When you complete a renovation and sale or convert to rental, click &quot;Mark as Flipped / Sold&quot; or &quot;Convert to Rental&quot; to archive the deal here.
          </p>
          <button
            type="button"
            onClick={onSwitchToActive}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white font-semibold text-xs rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Go to Active Pipeline</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {completedFlips.map((flip) => {
            const isBrrrr = flip.exitStrategy === 'BRRRR';
            const {
              fullCostBasisZAR: fullCostBasis,
              realizedSalePriceZAR: salePrice,
              realizedNetProfitZAR: realizedNetProfit,
              realizedRoiPercent: realizedROI,
              brrrrTargetValuationZAR: brrrrTargetValuation,
              brrrrEquityCreatedZAR: brrrrEquityCreated,
            } = calculateArchivedFlipFinancials(flip);

            return (
              <div
                key={flip.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <PropertyTypeBadge type={flip.propertyType} />
                        {isBrrrr ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <ArrowRightLeft className="w-3 h-3 text-indigo-600" />
                            <span>RETAINED AS RENTAL (BRRRR)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>FLIPPED / SOLD</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{flip.title}</h4>
                      <p className="text-xs text-slate-500">{flip.address}, {flip.city}</p>
                    </div>
                    {flip.soldDate && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                        {isBrrrr ? 'Converted' : 'Sold'} {formatDate(flip.soldDate)}
                      </span>
                    )}
                  </div>

                  {/* Financial Highlights */}
                  {isBrrrr ? (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Accumulated Basis</span>
                        <strong className="text-xs font-bold text-slate-900">{formatZAR(fullCostBasis)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Target Valuation</span>
                        <strong className="text-xs font-bold text-slate-700">{formatZAR(brrrrTargetValuation)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Equity Created</span>
                        <strong className="text-xs font-extrabold text-indigo-700">+{formatZAR(brrrrEquityCreated)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Realized Sale</span>
                        <strong className="text-xs font-bold text-slate-900">{formatZAR(salePrice)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Cost Basis</span>
                        <strong className="text-xs font-bold text-slate-700">{formatZAR(fullCostBasis)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Realized Profit</span>
                        <strong className={`text-xs font-extrabold ${realizedNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {realizedNetProfit >= 0 ? `+${formatZAR(realizedNetProfit)}` : formatZAR(realizedNetProfit)}
                        </strong>
                      </div>
                    </div>
                  )}

                  {isBrrrr ? (
                    <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-900 uppercase block">
                          Active in Rental Portfolio
                        </span>
                        <span className="text-[11px] text-indigo-700">
                          Eligible for Refinance & equity pull-out in Rentals module
                        </span>
                      </div>
                      <Link
                        href="/rentals"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors shrink-0 shadow-2xs"
                      >
                        <span>View in Rentals</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                          Liquid Cash Released to Seed Capital
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Credited to Reserve for next acquisition
                        </span>
                      </div>
                      <strong className="text-sm font-black text-emerald-900">
                        {formatZAR(flip.netCashProceedsZAR || 0)}
                      </strong>
                    </div>
                  )}

                  {flip.exitNotes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-semibold text-slate-700">Exit Notes: </span>
                      <span>{flip.exitNotes}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {isBrrrr ? (
                      <span>Strategy: <strong className="text-indigo-800 font-bold">BRRRR (Rent & Refinance)</strong></span>
                    ) : (
                      <span>Final Realized ROI: <strong className="text-slate-900 font-bold">{formatPercent(realizedROI)}</strong></span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          isBrrrr
                            ? `Reopen flip "${flip.title}" back to active pipeline? This will remove the linked rental property from your portfolio.`
                            : `Reopen flip "${flip.title}" back to active pipeline? This will revert the credited cash of ${formatZAR(
                                flip.netCashProceedsZAR || 0
                              )} from Cash in Reserve.`
                        )
                      ) {
                        onReopenFlip(flip.id, flip.title);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reopen Project</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FlipSoldArchiveView;

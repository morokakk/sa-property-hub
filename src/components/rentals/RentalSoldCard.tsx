'use client';

import React from 'react';
import { RentalProperty } from '@/types';
import { calculateDisposalMetrics } from '@/lib/calculations/rentals';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { PropertyTypeBadge } from '@/components/common/PropertyTypeBadge';
import { CheckCircle2, RotateCcw } from 'lucide-react';

export interface RentalSoldCardProps {
  property: RentalProperty;
  onReopenProperty: (propertyId: string, propertyTitle: string, cashToRevert: number) => void;
}

export function RentalSoldCard({ property, onReopenProperty }: RentalSoldCardProps) {
  const salePrice = property.actualSalePriceZAR || property.marketValueZAR || 0;
  const purchasePrice = property.purchasePriceZAR || 0;
  const {
    grossCapitalGainZAR: grossCapitalGain,
    capitalGainPercent: gainPercent,
  } = calculateDisposalMetrics(
    salePrice,
    purchasePrice,
    property.outstandingBondBalanceZAR || 0
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <PropertyTypeBadge type={property.propertyType} />
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>SOLD & EXITED</span>
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">{property.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{property.address}, {property.city}</p>
          </div>
          {property.soldDate && (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
              {formatDate(property.soldDate)}
            </span>
          )}
        </div>

        {/* Realized Disposal Metrics */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Exit Price</span>
            <strong className="text-slate-900 font-bold">{formatZAR(salePrice, { compact: true })}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Purchase</span>
            <strong className="text-slate-700 font-bold">{formatZAR(purchasePrice, { compact: true })}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Gain</span>
            <strong className={`font-bold ${grossCapitalGain >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {grossCapitalGain >= 0 ? `+${formatPercent(gainPercent)}` : formatPercent(gainPercent)}
            </strong>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
              Liquid Cash Released to Seed Capital
            </span>
            <span className="text-[11px] text-emerald-700">
              Credited to Reserve for next purchase
            </span>
          </div>
          <strong className="text-sm font-black text-emerald-900">
            {formatZAR(property.netCashProceedsZAR || 0)}
          </strong>
        </div>

        {property.exitNotes && (
          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-700">Disposal Notes: </span>
            <span>{property.exitNotes}</span>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Bond liability settled & cancelled
        </span>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                `Reopen rental "${property.title}" back to active portfolio? This will revert the credited cash of ${formatZAR(
                  property.netCashProceedsZAR || 0
                )} from Cash in Reserve.`
              )
            ) {
              onReopenProperty(property.id, property.title, property.netCashProceedsZAR || 0);
            }
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reopen Unit</span>
        </button>
      </div>
    </div>
  );
}

export default RentalSoldCard;

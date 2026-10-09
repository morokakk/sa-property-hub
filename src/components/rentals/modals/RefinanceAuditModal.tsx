'use client';

import React from 'react';
import { RentalProperty } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import { History } from 'lucide-react';

export interface RefinanceAuditModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  onClose: () => void;
}

export const RefinanceAuditModal: React.FC<RefinanceAuditModalProps> = ({
  isOpen,
  property,
  onClose,
}) => {
  if (!isOpen || !property) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in max-h-[92vh] sm:max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <span>Refinance & Equity Extraction History</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{property.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-bold text-purple-900 uppercase block">Total Equity Recycled to Date</span>
            <span className="text-xs text-purple-700">Cumulative capital extracted via BRRRR</span>
          </div>
          <strong className="text-lg font-extrabold text-purple-900">
            {formatZAR(property.totalEquityExtractedZAR || 0)}
          </strong>
        </div>

        {(!property.refinanceHistory || property.refinanceHistory.length === 0) ? (
          <p className="text-xs text-slate-400 text-center py-6">No refinance records logged for this property.</p>
        ) : (
          <div className="space-y-3">
            {property.refinanceHistory.map((rec, idx) => (
              <div key={rec.id || idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{formatDate(rec.refinanceDate)}</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    +{formatZAR(rec.cashEquityPulledOutZAR)} Pulled Out
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Bank Valuation</span>
                    <strong>{formatZAR(rec.newBankValuationZAR)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">New Bond Balance</span>
                    <strong>{formatZAR(rec.newBondBalanceZAR)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">New Monthly Bond</span>
                    <strong>{formatZAR(rec.newMonthlyBondPaymentZAR)}/m</strong>
                  </div>
                </div>
                {rec.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                    {rec.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefinanceAuditModal;

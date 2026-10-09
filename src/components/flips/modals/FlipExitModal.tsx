'use client';

import React, { useState, useEffect } from 'react';
import { FlipProject } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { CheckCircle2 } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface FlipExitModalProps {
  isOpen: boolean;
  flip: FlipProject | null;
  totalCostBasisZAR: number;
  onClose: () => void;
  onFlipCompleted: (exitDetails: {
    actualSalePriceZAR: number;
    soldDate: string;
    exitNotes?: string;
  }) => void;
  // Controlled props for Phase 4A backward compatibility
  exitSalePrice?: number;
  setExitSalePrice?: (price: number) => void;
  exitNetProceeds?: number;
  setExitNetProceeds?: (proceeds: number) => void;
  exitSoldDate?: string;
  setExitSoldDate?: (date: string) => void;
  exitNotes?: string;
  setExitNotes?: (notes: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const FlipExitModal: React.FC<FlipExitModalProps> = ({
  isOpen,
  flip,
  totalCostBasisZAR,
  onClose,
  onFlipCompleted,
  exitSalePrice: propSalePrice,
  setExitSalePrice: propSetSalePrice,
  exitNetProceeds: propNetProceeds,
  setExitNetProceeds: propSetNetProceeds,
  exitSoldDate: propSoldDate,
  setExitSoldDate: propSetSoldDate,
  exitNotes: propNotes,
  setExitNotes: propSetNotes,
  onSubmit: propOnSubmit,
}) => {
  const markFlipAsCompleted = usePortfolioStore((s) => s.markFlipAsCompleted);

  const [localSalePrice, setLocalSalePrice] = useState<number>(0);
  const [localNetProceeds, setLocalNetProceeds] = useState<number>(0);
  const [localSoldDate, setLocalSoldDate] = useState<string>('');
  const [localNotes, setLocalNotes] = useState<string>('');

  useEffect(() => {
    if (flip && isOpen && propSalePrice === undefined) {
      const estExit = flip.targetExitPriceZAR || 0;
      setLocalSalePrice(estExit);
      setLocalNetProceeds(Math.max(0, estExit - totalCostBasisZAR));
      setLocalSoldDate(new Date().toISOString().split('T')[0]);
      setLocalNotes('');
    }
  }, [flip, isOpen, totalCostBasisZAR, propSalePrice]);

  if (!isOpen || !flip) return null;

  const salePrice = propSalePrice !== undefined ? propSalePrice : localSalePrice;
  const netProceeds = propNetProceeds !== undefined ? propNetProceeds : localNetProceeds;
  const soldDate = propSoldDate !== undefined ? propSoldDate : localSoldDate;
  const notes = propNotes !== undefined ? propNotes : localNotes;

  const handleSalePriceChange = (price: number) => {
    if (propSetSalePrice) {
      propSetSalePrice(price);
    } else {
      setLocalSalePrice(price);
    }
    const proceeds = Math.max(0, price - totalCostBasisZAR);
    if (propSetNetProceeds) {
      propSetNetProceeds(proceeds);
    } else {
      setLocalNetProceeds(proceeds);
    }
  };

  const handleNetProceedsChange = (val: number) => {
    if (propSetNetProceeds) {
      propSetNetProceeds(val);
    } else {
      setLocalNetProceeds(val);
    }
  };

  const handleSoldDateChange = (val: string) => {
    if (propSetSoldDate) {
      propSetSoldDate(val);
    } else {
      setLocalSoldDate(val);
    }
  };

  const handleNotesChange = (val: string) => {
    if (propSetNotes) {
      propSetNotes(val);
    } else {
      setLocalNotes(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }
    e.preventDefault();
    if (salePrice <= 0) return;
    markFlipAsCompleted(flip.id, salePrice, netProceeds, soldDate, notes);
    onFlipCompleted({
      actualSalePriceZAR: salePrice,
      soldDate,
      exitNotes: notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in max-h-[92vh] sm:max-h-none overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Mark Project as Flipped &amp; Record Sale</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Finalize <strong>{flip.title}</strong>. This records your realized sale price, archives the flip into historical records, and automatically deposits the net cash proceeds directly into your <strong>Liquid Cash Reserve / Seed Capital</strong> for your next deal.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Cost Basis</span>
              <strong className="text-sm text-slate-800">{formatZAR(totalCostBasisZAR)}</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Purchase + BOQ Spend</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Exit (Estimate)</span>
              <strong className="text-sm text-indigo-600">{formatZAR(flip.targetExitPriceZAR)}</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Target Completion</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Actual Realized Sale Price (ZAR) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={salePrice || ''}
              onChange={(e) => handleSalePriceChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700 text-sm"
              placeholder="e.g. 3850000"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                Net Cash Proceeds Received (ZAR) *
              </label>
              <span className="text-[10px] text-emerald-600 font-semibold">
                Deposited 100% to Cash in Reserve
              </span>
            </div>
            <input
              type="number"
              required
              min="0"
              step="any"
              value={netProceeds || ''}
              onChange={(e) => handleNetProceedsChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm"
              placeholder="Net cash received after commissions/settlement"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sale / Transfer Date *</label>
              <input
                type="date"
                required
                value={soldDate}
                onChange={(e) => handleSoldDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Realized Net Profit</label>
              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800">
                {formatZAR((salePrice || 0) - totalCostBasisZAR)}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Exit Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Sold via Pam Golding private buyer, 45 days on market"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Sale &amp; Credit Reserve</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlipExitModal;

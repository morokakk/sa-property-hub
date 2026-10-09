'use client';

import React, { useState, useEffect } from 'react';
import { RentalProperty } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import { calculateDisposalMetrics } from '@/lib/calculations/rentals';
import { CheckCircle2 } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface ExitSaleModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  onClose: () => void;
  onComplete: () => void;
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

export const ExitSaleModal: React.FC<ExitSaleModalProps> = ({
  isOpen,
  property,
  onClose,
  onComplete,
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
  const markRentalAsSold = usePortfolioStore((s) => s.markRentalAsSold);

  const [localSalePrice, setLocalSalePrice] = useState<number>(0);
  const [localNetProceeds, setLocalNetProceeds] = useState<number>(0);
  const [localSoldDate, setLocalSoldDate] = useState<string>('');
  const [localNotes, setLocalNotes] = useState<string>('');

  useEffect(() => {
    if (property && isOpen) {
      const estSale = property.marketValueZAR || property.purchasePriceZAR || 0;
      const metrics = calculateDisposalMetrics(
        estSale,
        property.purchasePriceZAR || 0,
        property.outstandingBondBalanceZAR || 0
      );
      if (propSalePrice === undefined) {
        setLocalSalePrice(estSale);
        setLocalNetProceeds(metrics.netCashProceedsZAR);
        setLocalSoldDate(new Date().toISOString().split('T')[0]);
        setLocalNotes('');
      }
    }
  }, [property, isOpen, propSalePrice]);

  if (!isOpen || !property) return null;

  const salePrice = propSalePrice !== undefined ? propSalePrice : localSalePrice;
  const netProceeds = propNetProceeds !== undefined ? propNetProceeds : localNetProceeds;
  const soldDate = propSoldDate !== undefined ? propSoldDate : localSoldDate;
  const notes = propNotes !== undefined ? propNotes : localNotes;

  const handleSalePriceChange = (val: number) => {
    if (propSetSalePrice) {
      propSetSalePrice(val);
    } else {
      setLocalSalePrice(val);
    }

    const calculatedProceeds = calculateDisposalMetrics(
      val,
      property.purchasePriceZAR || 0,
      property.outstandingBondBalanceZAR || 0
    ).netCashProceedsZAR;

    if (propSetNetProceeds) {
      propSetNetProceeds(calculatedProceeds);
    } else {
      setLocalNetProceeds(calculatedProceeds);
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
    markRentalAsSold(property.id, salePrice, netProceeds, soldDate, notes);
    if (onComplete) onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in max-h-[92vh] sm:max-h-none overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Mark Rental Property as Sold</span>
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
          Disposal of <strong>{property.title}</strong>. This records your realized exit price, removes the unit and its bond from active portfolio liabilities, and automatically deposits the net cash proceeds directly into your <strong>Liquid Cash Reserve / Seed Capital</strong>.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Original Purchase Price</span>
              <strong className="text-sm text-slate-800">{formatZAR(property.purchasePriceZAR)}</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Purchased {formatDate(property.purchaseDate)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Outstanding Bond Debt</span>
              <strong className="text-sm text-rose-600">{formatZAR(property.outstandingBondBalanceZAR)}</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Cancelled / Settled upon transfer</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Actual Realized Sale Price (ZAR) *
            </label>
            <input
              type="number"
              name="exitSalePriceZAR"
              autoComplete="off"
              required
              min="0"
              step="any"
              value={salePrice || ''}
              onChange={(e) => handleSalePriceChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-emerald-700 text-sm"
              placeholder="e.g. 2100000"
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
              name="exitNetProceedsZAR"
              autoComplete="off"
              required
              min="0"
              step="any"
              value={netProceeds || ''}
              onChange={(e) => handleNetProceedsChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm"
              placeholder="Net cash received after bond settlement & agent fee"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sale / Registration Date *</label>
              <input
                type="date"
                name="exitSoldDate"
                autoComplete="off"
                required
                value={soldDate}
                onChange={(e) => handleSoldDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gross Capital Gain</label>
              <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800">
                {formatZAR((salePrice || 0) - property.purchasePriceZAR)}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Disposal Notes (Optional)</label>
            <input
              type="text"
              name="exitNotes"
              autoComplete="off"
              placeholder="e.g. Sold with sitting tenant, conveyanced by STBB"
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
              <span>Confirm Sale & Credit Reserve</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExitSaleModal;

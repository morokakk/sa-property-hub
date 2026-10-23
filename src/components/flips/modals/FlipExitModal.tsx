'use client';

import React, { useState, useEffect } from 'react';
import { FlipProject } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { CheckCircle2, X, FileText, AlertTriangle } from 'lucide-react';
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
  const investorProfile = usePortfolioStore((s) => s.investorProfile);

  const defaultComm = investorProfile?.vatExemptAgent
    ? (investorProfile?.defaultAgentCommissionPercent ?? 5.0)
    : Number(((investorProfile?.defaultAgentCommissionPercent ?? 5.0) * 1.15).toFixed(2));
  const defaultBondCancel = investorProfile?.defaultBondCancellationFeeZAR ?? 5200;
  const hasActiveBond = (flip?.monthlyBondPaymentZAR || 0) > 0;

  const [localSalePrice, setLocalSalePrice] = useState<number>(0);
  const [localNetProceeds, setLocalNetProceeds] = useState<number>(0);
  const [localSoldDate, setLocalSoldDate] = useState<string>('');
  const [localNotes, setLocalNotes] = useState<string>('');
  const [commissionPercent, setCommissionPercent] = useState<number>(defaultComm);
  const [isPrivateSale, setIsPrivateSale] = useState<boolean>(false);
  const [bondCancellationFee, setBondCancellationFee] = useState<number>(defaultBondCancel);
  const [earlyNoticeGiven, setEarlyNoticeGiven] = useState<boolean>(true);
  const [customPenalty, setCustomPenalty] = useState<string>('');
  const [isManualNetProceeds, setIsManualNetProceeds] = useState<boolean>(false);

  useEffect(() => {
    if (flip && isOpen) {
      const estExit = flip.targetExitPriceZAR || 0;
      const initialComm = flip.exitCommissionPercent !== undefined ? flip.exitCommissionPercent : defaultComm;
      const initialPrivate = initialComm === 0;
      const initialBondCancel = !hasActiveBond ? 0 : (flip.bondCancellationFeeZAR ?? defaultBondCancel);
      const initialNotice = flip.earlyTerminationNoticeGiven ?? true;
      const initialPenalty = flip.earlyTerminationPenaltyZAR !== undefined ? String(flip.earlyTerminationPenaltyZAR) : '';

      setCommissionPercent(initialComm > 0 ? initialComm : defaultComm);
      setIsPrivateSale(initialPrivate);
      setBondCancellationFee(initialBondCancel);
      setEarlyNoticeGiven(initialNotice);
      setCustomPenalty(initialPenalty);

      const commZAR = initialPrivate ? 0 : Math.round(estExit * ((initialComm > 0 ? initialComm : defaultComm) / 100));
      const penaltyZAR = !hasActiveBond || initialNotice
        ? 0
        : (initialPenalty !== '' ? Number(initialPenalty) : Math.round(3 * (flip.monthlyBondPaymentZAR || 0)));
      const frictionZAR = commZAR + (hasActiveBond ? initialBondCancel : 0) + penaltyZAR;
      const calcProceeds = Math.max(0, estExit - totalCostBasisZAR - frictionZAR);

      if (propSalePrice === undefined) {
        setLocalSalePrice(estExit);
        setLocalNetProceeds(calcProceeds);
        setLocalSoldDate(new Date().toISOString().split('T')[0]);
        setLocalNotes('');
        setIsManualNetProceeds(false);
      }
    }
  }, [flip, isOpen, totalCostBasisZAR, propSalePrice, defaultComm, defaultBondCancel, hasActiveBond]);

  if (!isOpen || !flip) return null;

  const salePrice = propSalePrice !== undefined ? propSalePrice : localSalePrice;
  const netProceeds = propNetProceeds !== undefined ? propNetProceeds : localNetProceeds;
  const soldDate = propSoldDate !== undefined ? propSoldDate : localSoldDate;
  const notes = propNotes !== undefined ? propNotes : localNotes;

  const effectiveCommissionRate = isPrivateSale ? 0 : commissionPercent;
  const currentCommissionZAR = Math.round(salePrice * (effectiveCommissionRate / 100));
  const currentPenaltyZAR = !hasActiveBond || earlyNoticeGiven
    ? 0
    : (customPenalty !== '' ? Number(customPenalty) : Math.round(3 * (flip.monthlyBondPaymentZAR || 0)));
  const currentExitLegalZAR = (hasActiveBond ? bondCancellationFee : 0) + currentPenaltyZAR;
  const currentTotalExitFrictionZAR = currentCommissionZAR + currentExitLegalZAR;
  const realizedNetProfitZAR = salePrice - totalCostBasisZAR - currentTotalExitFrictionZAR;

  const recomputeNetProceeds = (
    newPrice: number,
    privateSale: boolean,
    commPct: number,
    bondCancel: number,
    notice: boolean,
    penaltyStr: string
  ) => {
    const cZAR = privateSale ? 0 : Math.round(newPrice * (commPct / 100));
    const pZAR = !hasActiveBond || notice
      ? 0
      : (penaltyStr !== '' ? Number(penaltyStr) : Math.round(3 * (flip.monthlyBondPaymentZAR || 0)));
    const totalFriction = cZAR + (hasActiveBond ? bondCancel : 0) + pZAR;
    const calcProceeds = Math.max(0, newPrice - totalCostBasisZAR - totalFriction);

    if (!isManualNetProceeds) {
      if (propSetNetProceeds) {
        propSetNetProceeds(calcProceeds);
      } else {
        setLocalNetProceeds(calcProceeds);
      }
    }
  };

  const handleSalePriceChange = (price: number) => {
    if (propSetSalePrice) {
      propSetSalePrice(price);
    } else {
      setLocalSalePrice(price);
    }
    recomputeNetProceeds(price, isPrivateSale, commissionPercent, bondCancellationFee, earlyNoticeGiven, customPenalty);
  };

  const handleNetProceedsChange = (val: number) => {
    setIsManualNetProceeds(true);
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
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
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

          {/* Itemized Exit Friction Section */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Exit Friction &amp; Legal Deductions
              </span>
              <span className="text-[11px] font-semibold text-rose-600">
                -{formatZAR(currentTotalExitFrictionZAR)}
              </span>
            </div>

            {/* Estate Agent Sales Commission */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Estate Agent Commission</label>
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivateSale}
                    onChange={(e) => {
                      setIsPrivateSale(e.target.checked);
                      recomputeNetProceeds(salePrice, e.target.checked, commissionPercent, bondCancellationFee, earlyNoticeGiven, customPenalty);
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                  />
                  <span>Private Sale (0%)</span>
                </label>
              </div>
              {!isPrivateSale && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={commissionPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCommissionPercent(val);
                      recomputeNetProceeds(salePrice, isPrivateSale, val, bondCancellationFee, earlyNoticeGiven, customPenalty);
                    }}
                    className="w-24 px-2 py-1 border border-slate-300 rounded bg-white font-medium"
                  />
                  <span className="text-slate-500">%</span>
                  <span className="ml-auto text-slate-700 font-semibold">
                    -{formatZAR(currentCommissionZAR)}
                  </span>
                </div>
              )}
            </div>

            {/* Bond Cancellation Attorney Fee */}
            {hasActiveBond && (
              <div className="space-y-1 pt-1.5 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-slate-700 block">Bond Cancellation Conveyance Fee</label>
                    <span className="text-[10px] text-slate-400">LSSA tariff, cancellation levy &amp; VAT</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">R</span>
                    <input
                      type="number"
                      min="0"
                      value={bondCancellationFee}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBondCancellationFee(val);
                        recomputeNetProceeds(salePrice, isPrivateSale, commissionPercent, val, earlyNoticeGiven, customPenalty);
                      }}
                      className="w-24 px-2 py-1 border border-slate-300 rounded bg-white font-medium text-right"
                    />
                  </div>
                </div>

                {/* 90-Day Early Termination Notice Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!earlyNoticeGiven}
                      onChange={(e) => {
                        const noNotice = e.target.checked;
                        setEarlyNoticeGiven(!noNotice);
                        recomputeNetProceeds(salePrice, isPrivateSale, commissionPercent, bondCancellationFee, !noNotice, customPenalty);
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span>No 90-Day Bond Cancellation Notice Given (Apply Penalty)</span>
                  </label>

                  {!earlyNoticeGiven && (
                    <div className="mt-1.5 pl-5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Bank Penalty (3 mos interim bond):</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">R</span>
                          <input
                            type="number"
                            min="0"
                            placeholder={String(currentPenaltyZAR)}
                            value={customPenalty}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomPenalty(val);
                              recomputeNetProceeds(salePrice, isPrivateSale, commissionPercent, bondCancellationFee, earlyNoticeGiven, val);
                            }}
                            className="w-28 px-2 py-1 border border-slate-300 rounded bg-white font-medium text-right text-rose-700"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Default calculated from 3 months interim bond payments ({formatZAR(flip.monthlyBondPaymentZAR || 0)}/m). Override if bank issued written quote.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
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
            {isManualNetProceeds && (
              <button
                type="button"
                onClick={() => {
                  setIsManualNetProceeds(false);
                  const calcProceeds = Math.max(0, salePrice - totalCostBasisZAR - currentTotalExitFrictionZAR);
                  if (propSetNetProceeds) {
                    propSetNetProceeds(calcProceeds);
                  } else {
                    setLocalNetProceeds(calcProceeds);
                  }
                }}
                className="text-[10px] text-indigo-600 hover:underline mt-1 block"
              >
                Reset to calculated proceeds
              </button>
            )}
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
                {formatZAR(realizedNetProfitZAR)}
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

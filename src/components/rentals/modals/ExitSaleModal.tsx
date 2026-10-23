'use client';

import React, { useState, useEffect } from 'react';
import { RentalProperty } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import { calculateDisposalMetrics } from '@/lib/calculations/rentals';
import { CheckCircle2, X, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
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
  const investorProfile = usePortfolioStore((s) => s.investorProfile);

  const defaultComm = investorProfile?.vatExemptAgent
    ? (investorProfile?.defaultAgentCommissionPercent ?? 5.0)
    : Number(((investorProfile?.defaultAgentCommissionPercent ?? 5.0) * 1.15).toFixed(2));
  const defaultBondCancel = investorProfile?.defaultBondCancellationFeeZAR ?? 5200;
  const hasActiveBond = (property?.outstandingBondBalanceZAR || 0) > 0;

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
    if (property && isOpen) {
      const estSale = property.marketValueZAR || property.purchasePriceZAR || 0;
      const initialComm = property.exitCommissionPercent !== undefined
        ? property.exitCommissionPercent
        : defaultComm;
      const initialPrivate = initialComm === 0;
      const initialBondCancel = !hasActiveBond
        ? 0
        : (property.bondCancellationFeeZAR ?? defaultBondCancel);
      const initialNotice = property.earlyTerminationNoticeGiven ?? true;
      const initialPenalty = property.earlyTerminationPenaltyZAR !== undefined
        ? String(property.earlyTerminationPenaltyZAR)
        : '';

      setCommissionPercent(initialComm > 0 ? initialComm : defaultComm);
      setIsPrivateSale(initialPrivate);
      setBondCancellationFee(initialBondCancel);
      setEarlyNoticeGiven(initialNotice);
      setCustomPenalty(initialPenalty);

      const metrics = calculateDisposalMetrics(
        estSale,
        property.purchasePriceZAR || 0,
        property.outstandingBondBalanceZAR || 0,
        {
          exitCommissionPercent: initialPrivate ? 0 : (initialComm > 0 ? initialComm : defaultComm),
          bondCancellationFeeZAR: initialBondCancel,
          earlyTerminationNoticeGiven: initialNotice,
          earlyPenaltyZAR: initialPenalty !== '' ? Number(initialPenalty) : undefined,
          bondInterestRatePercent: property.bondInterestRatePercent || 11.5,
          hasActiveBond,
          defaultBondCancellationFeeZAR: defaultBondCancel,
        }
      );

      if (propSalePrice === undefined) {
        setLocalSalePrice(estSale);
        setLocalNetProceeds(metrics.netCashProceedsZAR);
        setLocalSoldDate(new Date().toISOString().split('T')[0]);
        setLocalNotes('');
        setIsManualNetProceeds(false);
      }
    }
  }, [property, isOpen, propSalePrice, defaultComm, defaultBondCancel, hasActiveBond]);

  if (!isOpen || !property) return null;

  const salePrice = propSalePrice !== undefined ? propSalePrice : localSalePrice;
  const netProceeds = propNetProceeds !== undefined ? propNetProceeds : localNetProceeds;
  const soldDate = propSoldDate !== undefined ? propSoldDate : localSoldDate;
  const notes = propNotes !== undefined ? propNotes : localNotes;

  const currentMetrics = calculateDisposalMetrics(
    salePrice,
    property.purchasePriceZAR || 0,
    property.outstandingBondBalanceZAR || 0,
    {
      exitCommissionPercent: isPrivateSale ? 0 : commissionPercent,
      bondCancellationFeeZAR: hasActiveBond ? bondCancellationFee : 0,
      earlyTerminationNoticeGiven: earlyNoticeGiven,
      earlyPenaltyZAR: customPenalty !== '' ? Number(customPenalty) : undefined,
      bondInterestRatePercent: property.bondInterestRatePercent || 11.5,
      hasActiveBond,
      defaultBondCancellationFeeZAR: defaultBondCancel,
    }
  );

  const recomputeNetProceeds = (
    newSalePrice: number,
    privateSale: boolean,
    commPct: number,
    bondCancel: number,
    notice: boolean,
    penaltyStr: string
  ) => {
    const calc = calculateDisposalMetrics(
      newSalePrice,
      property.purchasePriceZAR || 0,
      property.outstandingBondBalanceZAR || 0,
      {
        exitCommissionPercent: privateSale ? 0 : commPct,
        bondCancellationFeeZAR: hasActiveBond ? bondCancel : 0,
        earlyTerminationNoticeGiven: notice,
        earlyPenaltyZAR: penaltyStr !== '' ? Number(penaltyStr) : undefined,
        bondInterestRatePercent: property.bondInterestRatePercent || 11.5,
        hasActiveBond,
        defaultBondCancellationFeeZAR: defaultBondCancel,
      }
    );
    if (!isManualNetProceeds) {
      if (propSetNetProceeds) {
        propSetNetProceeds(calc.netCashProceedsZAR);
      } else {
        setLocalNetProceeds(calc.netCashProceedsZAR);
      }
    }
  };

  const handleSalePriceChange = (val: number) => {
    if (propSetSalePrice) {
      propSetSalePrice(val);
    } else {
      setLocalSalePrice(val);
    }
    recomputeNetProceeds(val, isPrivateSale, commissionPercent, bondCancellationFee, earlyNoticeGiven, customPenalty);
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
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
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

          {/* Itemized Exit Friction Section */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Exit Friction &amp; Legal Deductions
              </span>
              <span className="text-[11px] font-semibold text-rose-600">
                -{formatZAR(currentMetrics.totalExitFrictionZAR)}
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
                    -{formatZAR(currentMetrics.exitCommissionZAR)}
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
                        <span className="text-slate-500">Bank Penalty (90 days interest):</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">R</span>
                          <input
                            type="number"
                            min="0"
                            placeholder={String(currentMetrics.earlyPenaltyZAR)}
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
                        Default calculated from NCA 90-day interest on R{Math.round(property.outstandingBondBalanceZAR).toLocaleString('en-ZA')}. Override if bank issued written quote.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Point 5: Negative Equity / Shortfall Warning Callout */}
          {currentMetrics.shortfallToSettleZAR > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Negative Equity / Cash Shortfall Warning</span>
              </div>
              <p>
                Estimated net sale proceeds are insufficient to cover the outstanding bond balance and exit friction. You will need to contribute <strong>{formatZAR(currentMetrics.shortfallToSettleZAR)}</strong> in cash at transfer to obtain bond clearance from the bank.
              </p>
            </div>
          )}

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
            {isManualNetProceeds && (
              <button
                type="button"
                onClick={() => {
                  setIsManualNetProceeds(false);
                  if (propSetNetProceeds) {
                    propSetNetProceeds(currentMetrics.netCashProceedsZAR);
                  } else {
                    setLocalNetProceeds(currentMetrics.netCashProceedsZAR);
                  }
                }}
                className="text-[10px] text-indigo-600 hover:underline mt-1 block"
              >
                Reset to calculated proceeds ({formatZAR(currentMetrics.netCashProceedsZAR)})
              </button>
            )}
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

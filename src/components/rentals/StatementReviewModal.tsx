'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  Calculator,
  RotateCcw,
  Info,
  Edit3,
} from 'lucide-react';
import { ExtractedRentalUnit, RentalProperty } from '@/types';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR } from '@/lib/formatters';
import { checkAccountingVariance } from '@/lib/ai/statementValidation';

interface StatementReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedUnits: ExtractedRentalUnit[];
  onConfirmSync: (units: ExtractedRentalUnit[]) => void;
}

export default function StatementReviewModal({
  isOpen,
  onClose,
  extractedUnits,
  onConfirmSync,
}: StatementReviewModalProps) {
  const rentals = usePortfolioStore((state) => state.rentals);
  const [editableUnits, setEditableUnits] = useState<ExtractedRentalUnit[]>([]);

  const normalizeKey = (s?: string) =>
    s ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

  const findMatch = (unit: ExtractedRentalUnit): RentalProperty | undefined => {
    const unitKey = normalizeKey(unit.propertyName);
    const unitAddrKey = normalizeKey(unit.address);
    return rentals.find((r) => {
      const titleKey = normalizeKey(r.title);
      const addrKey = normalizeKey(r.address);
      if (!unitKey) return false;
      return (
        titleKey === unitKey ||
        (unitAddrKey && addrKey === unitAddrKey) ||
        titleKey.includes(unitKey) ||
        unitKey.includes(titleKey)
      );
    });
  };

  useEffect(() => {
    if (!extractedUnits) return;
    const cloned: ExtractedRentalUnit[] = JSON.parse(JSON.stringify(extractedUnits));
    const initialized = cloned.map((unit) => {
      const matched = findMatch(unit);
      const estMarketValue =
        unit.estimatedMarketValueZAR && unit.estimatedMarketValueZAR > 0
          ? unit.estimatedMarketValueZAR
          : matched
          ? matched.marketValueZAR
          : Math.round(unit.grossRentZAR * 120);

      const isVatInc = unit.isCommissionInclusiveOfVat !== false;
      const vatAmount =
        unit.agencyCommissionVatZAR !== undefined
          ? unit.agencyCommissionVatZAR
          : isVatInc && unit.agencyCommissionZAR
          ? Number(((unit.agencyCommissionZAR * 0.15) / 1.15).toFixed(2))
          : 0;

      const bondPayment =
        unit.monthlyBondPaymentZAR !== undefined && unit.monthlyBondPaymentZAR > 0
          ? unit.monthlyBondPaymentZAR
          : matched
          ? matched.monthlyBondPaymentZAR
          : 0;

      return {
        ...unit,
        estimatedMarketValueZAR: estMarketValue,
        isCommissionInclusiveOfVat: isVatInc,
        agencyCommissionVatZAR: vatAmount,
        monthlyBondPaymentZAR: bondPayment,
        bondPaymentEffectiveDate:
          unit.bondPaymentEffectiveDate || (matched ? matched.bondPaymentEffectiveDate : undefined),
      };
    });
    setEditableUnits(initialized);
  }, [extractedUnits, rentals]);

  const handleFieldChange = (
    index: number,
    field: keyof ExtractedRentalUnit,
    val: any
  ) => {
    setEditableUnits((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirmSync(editableUnits);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
                <span>Statement Reconciliation Review</span>
                <span className="text-xs bg-indigo-500 text-white font-semibold px-2 py-0.5 rounded-full">
                  {editableUnits.length} {editableUnits.length === 1 ? 'Unit' : 'Units'} Extracted
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review extracted ledger items and mathematical accounting cross-checks prior to syncing to your portfolio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {editableUnits.map((unit, idx) => {
            const matched = findMatch(unit);
            const varianceInfo = checkAccountingVariance(unit);

            const estVal = unit.estimatedMarketValueZAR || 0;
            const grossYield =
              estVal > 0 && unit.grossRentZAR > 0
                ? Number((((unit.grossRentZAR * 12) / estVal) * 100).toFixed(1))
                : 0;

            const commTotal = unit.agencyCommissionZAR || 0;
            const isVatInc = unit.isCommissionInclusiveOfVat !== false;
            const vatAmount =
              unit.agencyCommissionVatZAR !== undefined
                ? unit.agencyCommissionVatZAR
                : isVatInc && commTotal > 0
                ? Number(((commTotal * 0.15) / 1.15).toFixed(2))
                : 0;
            const commExVat = isVatInc ? Math.max(0, commTotal - vatAmount) : commTotal;
            const effectivePercent =
              unit.grossRentZAR > 0 && commTotal > 0
                ? ((commExVat / unit.grossRentZAR) * 100).toFixed(1)
                : '8.0';

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-5 space-y-4 transition-all ${
                  matched
                    ? 'border-amber-200 bg-amber-50/20 shadow-2xs'
                    : 'border-emerald-200 bg-emerald-50/20 shadow-2xs'
                }`}
              >
                {/* Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    {matched ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        Update Existing Property: &ldquo;{matched.title}&rdquo;
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                        New Property Detected (Will be added to portfolio)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Ledger Line Item #{idx + 1}
                  </div>
                </div>

                {/* Property & Tenant Meta Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Property Name / Unit</label>
                    <input
                      type="text"
                      value={unit.propertyName}
                      onChange={(e) => handleFieldChange(idx, 'propertyName', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={unit.address || ''}
                      onChange={(e) => handleFieldChange(idx, 'address', e.target.value)}
                      placeholder="Address if available"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tenant Name</label>
                    <input
                      type="text"
                      value={unit.tenantName}
                      onChange={(e) => handleFieldChange(idx, 'tenantName', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Lease Expiry Date</label>
                    <input
                      type="date"
                      value={unit.leaseExpiryDate || ''}
                      onChange={(e) => handleFieldChange(idx, 'leaseExpiryDate', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
                    />
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-800">Estimated Market Value</label>
                      {grossYield > 0 && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                          {grossYield}% Yield
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="font-bold text-slate-400 mr-1">R</span>
                      <input
                        type="number"
                        name="estimatedMarketValueZAR"
                        autoComplete="off"
                        min="0"
                        step="any"
                        value={unit.estimatedMarketValueZAR || ''}
                        onChange={(e) => handleFieldChange(idx, 'estimatedMarketValueZAR', Number(e.target.value))}
                        placeholder="828000"
                        className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-slate-900 bg-white text-xs"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1 truncate">
                      {matched
                        ? `Current: ${formatZAR(matched.marketValueZAR)}`
                        : 'Baseline: 10% capitalization yield'}
                    </span>
                  </div>
                </div>

                {/* Financial Ledger Breakdown (Inline Editable) */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-slate-600" />
                      Monthly Ledger Outlays (Editable)
                    </span>
                    <span className="text-[10px] text-slate-400 italic">
                      Click any amount to adjust before syncing
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-medium">Gross Contract Rent</span>
                      <div className="flex items-center mt-1">
                        <span className="font-bold text-slate-400 mr-1">R</span>
                        <input
                          type="number"
                          name="grossRentZAR"
                          autoComplete="off"
                          min="0"
                          step="any"
                          value={unit.grossRentZAR}
                          onChange={(e) => handleFieldChange(idx, 'grossRentZAR', Number(e.target.value))}
                          className="w-full font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      {matched && (
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Current: {formatZAR(matched.monthlyGrossRentZAR)}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-medium">Levies Deducted</span>
                      <div className="flex items-center mt-1">
                        <span className="font-bold text-slate-400 mr-1">R</span>
                        <input
                          type="number"
                          name="leviesZAR"
                          autoComplete="off"
                          min="0"
                          step="any"
                          value={unit.leviesZAR}
                          onChange={(e) => handleFieldChange(idx, 'leviesZAR', Number(e.target.value))}
                          className="w-full font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      {matched && (
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Current: {formatZAR(matched.monthlyLeviesZAR)}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-medium">Municipal Rates & Taxes</span>
                      <div className="flex items-center mt-1">
                        <span className="font-bold text-slate-400 mr-1">R</span>
                        <input
                          type="number"
                          name="municipalRatesZAR"
                          autoComplete="off"
                          min="0"
                          step="any"
                          value={unit.municipalRatesZAR}
                          onChange={(e) => handleFieldChange(idx, 'municipalRatesZAR', Number(e.target.value))}
                          className="w-full font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      {matched && (
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Current: {formatZAR(matched.monthlyRatesTaxesZAR)}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 block font-medium">Agency Commission</span>
                        {isVatInc && (
                          <span className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 rounded">
                            Incl. VAT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="font-bold text-slate-400 mr-1">R</span>
                        <input
                          type="number"
                          name="agencyCommissionZAR"
                          autoComplete="off"
                          min="0"
                          step="any"
                          value={unit.agencyCommissionZAR ?? 0}
                          onChange={(e) => handleFieldChange(idx, 'agencyCommissionZAR', Number(e.target.value))}
                          className="w-full font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>

                      <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer text-[10px] text-slate-600 select-none">
                        <input
                          type="checkbox"
                          checked={isVatInc}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            handleFieldChange(idx, 'isCommissionInclusiveOfVat', checked);
                            if (checked && !unit.agencyCommissionVatZAR && unit.agencyCommissionZAR) {
                              handleFieldChange(
                                idx,
                                'agencyCommissionVatZAR',
                                Number(((unit.agencyCommissionZAR * 0.15) / 1.15).toFixed(2))
                              );
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                        />
                        <span className="font-medium text-slate-700">15% VAT included</span>
                      </label>

                      <span className="text-[9px] text-slate-500 block mt-0.5 font-mono truncate">
                        {isVatInc
                          ? `Ex-VAT: ${formatZAR(commExVat)} (${effectivePercent}%)`
                          : `Pre-tax: ${effectivePercent}%`}
                      </span>

                      {matched && (
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Current: {formatZAR(matched.monthlyAgentFeeZAR)}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 block font-medium">Bank Bond Payment</span>
                        <span className="text-[9px] font-semibold text-slate-600 bg-slate-200/80 px-1 rounded">
                          Debit Order
                        </span>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="font-bold text-slate-400 mr-1">R</span>
                        <input
                          type="number"
                          name="monthlyBondPaymentZAR"
                          autoComplete="off"
                          min="0"
                          step="any"
                          value={unit.monthlyBondPaymentZAR ?? 0}
                          onChange={(e) => handleFieldChange(idx, 'monthlyBondPaymentZAR', Number(e.target.value))}
                          placeholder="0"
                          className="w-full font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-1 truncate">
                        {matched && matched.monthlyBondPaymentZAR
                          ? `Current: ${formatZAR(matched.monthlyBondPaymentZAR)}`
                          : 'Owner direct debit'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                      <span className="text-[10px] text-indigo-700 block font-bold">Statement Net Payout</span>
                      <div className="flex items-center mt-1">
                        <span className="font-bold text-indigo-400 mr-1">R</span>
                        <input
                          type="number"
                          name="netOperatingIncomeZAR"
                          autoComplete="off"
                          step="any"
                          value={unit.netOperatingIncomeZAR}
                          onChange={(e) => handleFieldChange(idx, 'netOperatingIncomeZAR', Number(e.target.value))}
                          className="w-full font-bold text-indigo-950 bg-white border border-indigo-300 rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <span className="text-[10px] text-indigo-600 block mt-1 font-semibold">
                        Calculated: R {varianceInfo.calculatedNOI.toLocaleString('en-ZA')}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Variance Inspector Card */}
                  {varianceInfo.hasVariance ? (
                    <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Accounting Variance Detected: R {Math.abs(varianceInfo.varianceDelta).toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                          Formula: Rent - (Levies + Rates + Agent)
                        </span>
                      </div>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        {varianceInfo.explanation}
                      </p>
                      <div className="text-[11px] font-mono bg-white/80 p-2 rounded border border-amber-200 text-slate-800">
                        R {unit.grossRentZAR.toLocaleString('en-ZA')} - (R {(unit.leviesZAR || 0).toLocaleString('en-ZA')} + R {(unit.municipalRatesZAR || 0).toLocaleString('en-ZA')} + R {(unit.agencyCommissionZAR || 0).toLocaleString('en-ZA')}) = <strong>R {varianceInfo.calculatedNOI.toLocaleString('en-ZA')}</strong> vs Statement Payout: <strong>R {(unit.netOperatingIncomeZAR || 0).toLocaleString('en-ZA')}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg p-2 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Accounting Balanced: Calculated NOI matches statement payout within R1.00.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Sync {editableUnits.length} Unit(s) to Portfolio</span>
          </button>
        </div>
      </div>
    </div>
  );
}

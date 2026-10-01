'use client';

import React, { useState } from 'react';
import { FlipProject } from '@/types';
import { formatZAR, formatPercent } from '@/lib/formatters';
import {
  calculateDelaySensitivityMatrix,
  DelaySensitivityInput,
} from '@/lib/calculations/holdingSensitivity';
import {
  Clock,
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  Coins,
  Building,
  RotateCcw,
  Landmark,
  Scale,
  X,
} from 'lucide-react';

interface DelayMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  flip: FlipProject;
  totalCostBasisZAR: number;
}

export default function DelayMatrixModal({
  isOpen,
  onClose,
  flip,
  totalCostBasisZAR,
}: DelayMatrixModalProps) {
  // Local adjustable simulation state
  const operationalRatesAndLevies =
    (flip.monthlyRatesTaxesZAR || 0) +
    (flip.propertyType === 'Freehold House' ? 0 : flip.monthlyLeviesZAR || 0) +
    (flip.monthlyOtherHoldingCostZAR || 0) +
    (flip.monthlyBondPaymentZAR || 0);

  const defaultHoldingBurn =
    operationalRatesAndLevies > 0
      ? operationalRatesAndLevies
      : (flip.monthlyHoldingCostZAR || 0) || 6500;

  const [monthlyHoldingBurn, setMonthlyHoldingBurn] = useState<number>(defaultHoldingBurn);
  const [debtPrincipal, setDebtPrincipal] = useState<number>(
    flip.capitalRaisedZAR || flip.fundingRequiredZAR || Math.round(totalCostBasisZAR * 0.6)
  );
  const [debtInterestRate, setDebtInterestRate] = useState<number>(
    flip.promisedReturnRatePercent ?? 14.0
  );
  const [taxEntity, setTaxEntity] = useState<'Company (27%)' | 'Individual (45%)' | 'Pre-Tax'>(
    flip.taxEntityType || 'Company (27%)'
  );

  const handleResetToDefaults = () => {
    setMonthlyHoldingBurn(defaultHoldingBurn);
    setDebtPrincipal(
      flip.capitalRaisedZAR || flip.fundingRequiredZAR || Math.round(totalCostBasisZAR * 0.6)
    );
    setDebtInterestRate(flip.promisedReturnRatePercent ?? 14.0);
    setTaxEntity(flip.taxEntityType || 'Company (27%)');
  };

  React.useEffect(() => {
    if (isOpen) {
      handleResetToDefaults();
    }
  }, [isOpen, flip.id]);

  if (!isOpen) return null;

  const taxRate = taxEntity === 'Company (27%)' ? 27 : taxEntity === 'Individual (45%)' ? 45 : 0;
  const sec118Arrears = flip.municipalClearance?.sec118ArrearsZAR || 0;
  const advanceCouncil = flip.municipalClearance?.advanceCouncilDepositZAR || 0;

  const matrixInput: DelaySensitivityInput = {
    baselineDurationMonths: flip.estimatedDurationMonths ?? 6,
    monthlyHoldingBurnZAR: Number(monthlyHoldingBurn),
    syndicateDebtBalanceZAR: Number(debtPrincipal),
    syndicateInterestRatePercent: Number(debtInterestRate),
    targetExitPriceZAR: flip.targetExitPriceZAR,
    totalCostBasisZAR,
    taxRatePercent: taxRate,
    sec118ArrearsZAR: sec118Arrears,
    advanceCouncilDepositZAR: advanceCouncil,
  };

  const matrixResult = calculateDelaySensitivityMatrix(matrixInput);
  const {
    totalMonthlyDelayBurnZAR,
    dailyDelayBurnZAR,
    monthlyDebtInterestZAR,
    zeroMarginDelayDays,
    scenarios,
    baselineNetProfitZAR,
    baselineAnnualizedRoiPercent,
  } = matrixResult;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Dynamic Delay Sensitivity Matrix (+30, +60, +90, +120 Days)
                </h3>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200 hidden sm:inline-block">
                  SA Municipal & Capital Time-Decay
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Stress-test <strong>{flip.title}</strong> against City of Johannesburg / Deeds Office transfer delays and compounding 14% private syndicate debt.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Simulation Controls */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <span>Interactive Stress-Test Variables</span>
            </span>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Deal Terms</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Monthly Holding Burn (ZAR/m)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={monthlyHoldingBurn}
                onChange={(e) => setMonthlyHoldingBurn(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
              />
              <span className="text-[9px] text-slate-400 mt-0.5 block">Rates, security, insurance</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Syndicate Debt Balance (ZAR)
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                value={debtPrincipal}
                onChange={(e) => setDebtPrincipal(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
              />
              <span className="text-[9px] text-slate-400 mt-0.5 block">Private lender capital</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Debt Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={debtInterestRate}
                onChange={(e) => setDebtInterestRate(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
              />
              <span className="text-[9px] text-slate-400 mt-0.5 block">Standard ~12%-15% p.a.</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Entity Tax Model
              </label>
              <select
                value={taxEntity}
                onChange={(e) => setTaxEntity(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-xs"
              >
                <option value="Company (27%)">Company (27% SARS Sec 1)</option>
                <option value="Individual (45%)">Individual (45% Top Tier)</option>
                <option value="Pre-Tax">Pre-Tax (Gross Operational)</option>
              </select>
              <span className="text-[9px] text-slate-400 mt-0.5 block">
                {taxRate === 27 ? 'SARS trading stock provision' : taxRate === 45 ? 'Max individual rate' : 'No tax deduction'}
              </span>
            </div>
          </div>
        </div>

        {/* High-Impact Carrying Burn & Zero-Margin Warning Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block">
              Total Monthly Delay Burn
            </span>
            <div className="text-xl font-black text-amber-900 mt-0.5">
              {formatZAR(totalMonthlyDelayBurnZAR)}/mo
            </div>
            <div className="text-[11px] text-amber-800/90 mt-1 space-y-0.5">
              <div>• Holding Burn: <strong>{formatZAR(matrixInput.monthlyHoldingBurnZAR)}/m</strong></div>
              <div>• 14% Syndicate Debt: <strong>{formatZAR(monthlyDebtInterestZAR)}/m</strong></div>
              <div className="font-semibold text-amber-950 pt-0.5">Burn Rate: ~{formatZAR(dailyDelayBurnZAR)} / day</div>
            </div>
          </div>

          <div className="p-3.5 bg-rose-50/70 border border-rose-200/90 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-rose-800 tracking-wider block flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Zero-Margin Delay Point</span>
            </span>
            <div className="text-xl font-black text-rose-900 mt-0.5">
              {zeroMarginDelayDays >= 9999 ? 'No Burn' : `~${zeroMarginDelayDays} Days`}
            </div>
            <p className="text-[11px] text-rose-800/90 mt-1 leading-snug">
              {zeroMarginDelayDays >= 9999
                ? 'Holding costs are zero; margin is static.'
                : zeroMarginDelayDays <= 0
                ? 'Project is already operating at zero or negative net profit.'
                : `A delay of ~${Math.round(zeroMarginDelayDays / 30)} months will completely eradicate the project's profit margin.`}
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/90 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
              Baseline Target Return
            </span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">
              {formatZAR(baselineNetProfitZAR)}
            </div>
            <div className="text-[11px] text-emerald-800/90 mt-1 font-semibold space-y-0.5">
              <div>Annualized ROI: <strong>{formatPercent(baselineAnnualizedRoiPercent)}</strong></div>
              <div className="text-[10px] text-emerald-700 font-normal">
                Duration: {flip.estimatedDurationMonths ?? 6} Mos • Exit: {formatZAR(flip.targetExitPriceZAR)}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Comparison Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3 pl-4">Delay Scenario</th>
                  <th className="p-3 text-center">Duration</th>
                  <th className="p-3 text-right">Holding Burn</th>
                  <th className="p-3 text-right">Syndicate Debt</th>
                  <th className="p-3 text-right">Extra Cost</th>
                  <th className="p-3 text-right">Net Profit</th>
                  <th className="p-3 text-right">Cash ROI</th>
                  <th className="p-3 pr-4 text-right">Annualized ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {scenarios.map((row) => {
                  const isBaseline = row.delayDays === 0;
                  const isDispute = row.delayDays === 90;
                  const isCritical = row.delayDays === 120;

                  return (
                    <tr
                      key={row.delayDays}
                      className={`transition-colors ${
                        isBaseline
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70 font-semibold'
                          : row.isNegativeProfit
                          ? 'bg-rose-50/60 hover:bg-rose-50/80'
                          : isDispute
                          ? 'bg-amber-50/40 hover:bg-amber-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{row.scenarioName}</span>
                          {isBaseline && (
                            <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded">
                              Target
                            </span>
                          )}
                          {isDispute && (
                            <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded" title="Typical CoJ Rates Clearance Dispute">
                              CoJ Dispute
                            </span>
                          )}
                          {isCritical && (
                            <span className="text-[9px] bg-rose-200 text-rose-900 font-bold px-1.5 py-0.2 rounded">
                              Critical
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {row.scenarioDescription}
                        </div>
                      </td>

                      <td className="p-3 text-center font-medium">
                        {row.totalDurationMonths.toFixed(1)} mos
                      </td>

                      <td className="p-3 text-right text-slate-600">
                        {row.additionalHoldingBurnZAR === 0
                          ? '—'
                          : `+${formatZAR(row.additionalHoldingBurnZAR)}`}
                      </td>

                      <td className="p-3 text-right text-slate-600">
                        {row.additionalDebtInterestZAR === 0
                          ? '—'
                          : `+${formatZAR(row.additionalDebtInterestZAR)}`}
                      </td>

                      <td className="p-3 text-right font-bold text-amber-700">
                        {row.totalAdditionalCarryingCostZAR === 0
                          ? 'R 0'
                          : `+${formatZAR(row.totalAdditionalCarryingCostZAR)}`}
                      </td>

                      <td className="p-3 text-right">
                        <div
                          className={`font-black ${
                            row.isNegativeProfit ? 'text-rose-700' : 'text-slate-900'
                          }`}
                        >
                          {formatZAR(row.netProfitAfterTaxZAR)}
                        </div>
                        {!isBaseline && (
                          <span className="text-[10px] text-rose-600 font-medium block">
                            {row.netProfitErosionZAR > 0 ? `-${formatZAR(row.netProfitErosionZAR)}` : 'R 0'}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-semibold text-slate-800">
                          {formatPercent(row.cashOnCashRoiPercent)}
                        </div>
                        {!isBaseline && (
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {row.roiCompressionPercent > 0 ? `-${formatPercent(row.roiCompressionPercent)}` : '0.0%'}
                          </span>
                        )}
                      </td>

                      <td className="p-3 pr-4 text-right">
                        <div
                          className={`font-black ${
                            row.annualizedRoiPercent < 0
                              ? 'text-rose-700'
                              : row.annualizedRoiPercent < 15
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {formatPercent(row.annualizedRoiPercent)}
                        </div>
                        {!isBaseline && (
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {row.annualizedRoiCompressionPercent > 0 ? `-${formatPercent(row.annualizedRoiCompressionPercent)}` : '0.0%'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>



        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import {
  TenantVettingScorecard,
  TenantVettingScorecardInputs,
} from '@/types';
import {
  calculateTenantVetting,
  calculateRecommendedDeposit,
} from '@/lib/calculations/vettingEngine';
import { formatZAR } from '@/lib/formatters';
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Scale,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

export interface TenantVettingDrawerProps {
  scorecard?: TenantVettingScorecard;
  monthlyRentZAR: number;
  onUpdateScorecard: (scorecard: TenantVettingScorecard) => void;
  onApplyDeposit: (calculatedDepositZAR: number) => void;
  isGuarantorNeeded?: boolean;
}

export const TenantVettingDrawer: React.FC<TenantVettingDrawerProps> = ({
  scorecard,
  monthlyRentZAR,
  onUpdateScorecard,
  onApplyDeposit,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Local editable input values fallback to scorecard or defaults
  const todayIso = new Date().toISOString().split('T')[0];

  const currentInputs: TenantVettingScorecardInputs = useMemo(() => {
    return {
      assessmentDate: scorecard?.assessmentDate || todayIso,
      popiaConsentRecorded: Boolean(scorecard?.popiaConsentRecorded),
      bureauCreditScore: scorecard?.bureauCreditScore ?? 0,
      verifiedNetMonthlyIncomeZAR: scorecard?.verifiedNetMonthlyIncomeZAR ?? 0,
      monthlyCpaDebtCommitmentsZAR: scorecard?.monthlyCpaDebtCommitmentsZAR ?? 0,
      hasOpenJudgmentsOrDefaults: Boolean(scorecard?.hasOpenJudgmentsOrDefaults),
      unpaidDebitOrderCount: scorecard?.unpaidDebitOrderCount ?? 0,
    };
  }, [scorecard, todayIso]);

  // Reactive calculation on-the-fly
  const evaluation = useMemo(() => {
    return calculateTenantVetting(monthlyRentZAR, currentInputs);
  }, [monthlyRentZAR, currentInputs]);

  // Sync changes up to parent
  const handleInputChange = <K extends keyof TenantVettingScorecardInputs>(
    key: K,
    value: TenantVettingScorecardInputs[K]
  ) => {
    const updatedInputs: TenantVettingScorecardInputs = {
      ...currentInputs,
      [key]: value,
    };
    const outputs = calculateTenantVetting(monthlyRentZAR, updatedInputs);
    onUpdateScorecard({
      ...updatedInputs,
      ...outputs,
    });
  };

  const isPopiaChecked = currentInputs.popiaConsentRecorded;
  const isVetted =
    isPopiaChecked &&
    !evaluation.isPendingInputs &&
    (currentInputs.bureauCreditScore > 0 || currentInputs.verifiedNetMonthlyIncomeZAR > 0);

  const recommendedDepositAmount = calculateRecommendedDeposit(
    monthlyRentZAR,
    evaluation.recommendedDepositMultiplier
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden transition-all">
      {/* Expand / Collapse Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-200/60"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-800 tracking-tight">
                Pre-Lease Tenant Vetting & PIE Act Risk Assessment
              </span>
            </div>
            <p className="text-[9px] text-slate-500 truncate">
              National Credit Act & Prevention of Illegal Eviction risk modeling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Header Status Badge */}
          {!isVetted ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Unvetted / Risk Pending
            </span>
          ) : evaluation.riskGrade === 'Grade A (Low Risk)' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Grade A (Low Risk) • 1.0× Deposit
            </span>
          ) : evaluation.riskGrade === 'Grade B (Moderate Risk)' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Info className="w-3 h-3 text-blue-600" />
              Grade B (Moderate Risk) • 1.5× Deposit
            </span>
          ) : evaluation.riskGrade === 'Grade C (High Risk)' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              Grade C (High Risk) • 2.0× Deposit
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-3 h-3 text-rose-600" />
              Grade D (Decline) • High Default Risk
            </span>
          )}

          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {/* Drawer Content */}
      {isOpen && (
        <div className="p-3 space-y-3 bg-white">
          {/* POPIA Compliance Gate */}
          <div
            className={`p-2.5 rounded-lg border transition-all ${
              isPopiaChecked
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPopiaChecked}
                onChange={(e) => handleInputChange('popiaConsentRecorded', e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="text-[10px] text-slate-700 leading-tight">
                <span className="font-bold text-slate-900">
                  Mandatory POPIA Consent & Identification Verified:
                </span>{' '}
                I affirm that signed consent under the Protection of Personal Information Act No. 4 of 2013 and verified tenant identity documentation (RSA ID / Passport) were obtained prior to capturing credit bureau and financial metrics.
              </div>
            </label>
          </div>

          {/* Disabled Overlay Prompt if POPIA unchecked */}
          {!isPopiaChecked && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[10px]">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Tenant financial and credit inputs are locked. Confirm POPIA consent above to unlock the vetting scorecard inputs.
              </span>
            </div>
          )}

          {/* Input Grid */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 transition-opacity ${
              !isPopiaChecked ? 'opacity-40 pointer-events-none' : 'opacity-100'
            }`}
          >
            {/* Assessment Date */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                Assessment Date
              </label>
              <input
                type="date"
                disabled={!isPopiaChecked}
                value={currentInputs.assessmentDate}
                onChange={(e) => handleInputChange('assessmentDate', e.target.value)}
                className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
              />
            </div>

            {/* Bureau Credit Score */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                Bureau Credit Score (0–999)
              </label>
              <input
                type="number"
                min="0"
                max="999"
                disabled={!isPopiaChecked}
                placeholder="e.g. 680"
                value={currentInputs.bureauCreditScore || ''}
                onChange={(e) =>
                  handleInputChange('bureauCreditScore', Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white font-semibold disabled:bg-slate-100"
              />
              <span className="text-[9px] text-slate-400">
                Experian / TransUnion / TPN bureau rating
              </span>
            </div>

            {/* Verified Net Monthly Income */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                Verified Net Monthly Income (ZAR)
              </label>
              <input
                type="number"
                min="0"
                disabled={!isPopiaChecked}
                placeholder="e.g. 35000"
                value={currentInputs.verifiedNetMonthlyIncomeZAR || ''}
                onChange={(e) =>
                  handleInputChange(
                    'verifiedNetMonthlyIncomeZAR',
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white font-semibold disabled:bg-slate-100"
              />
              <span className="text-[9px] text-slate-400">Net salary after tax / payslip average</span>
            </div>

            {/* Monthly CPA Debt Commitments */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                Monthly CPA Bureau Debt (ZAR)
              </label>
              <input
                type="number"
                min="0"
                disabled={!isPopiaChecked}
                placeholder="e.g. 5000"
                value={currentInputs.monthlyCpaDebtCommitmentsZAR || ''}
                onChange={(e) =>
                  handleInputChange(
                    'monthlyCpaDebtCommitmentsZAR',
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
              />
              <span className="text-[9px] text-slate-400">Credit cards, vehicle finance, retail debt</span>
            </div>

            {/* Bank Statement Unpaid Debit Orders */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                Unpaid Debit Orders (Last 3 Mo)
              </label>
              <input
                type="number"
                min="0"
                disabled={!isPopiaChecked}
                placeholder="0"
                value={currentInputs.unpaidDebitOrderCount}
                onChange={(e) =>
                  handleInputChange(
                    'unpaidDebitOrderCount',
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
              />
              <span className="text-[9px] text-slate-400">Count of returned / unpaid debit items</span>
            </div>

            {/* Active Judgments / Defaults Toggle */}
            <div className="flex flex-col justify-center">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                Civil Judgments / Adverse Defaults
              </label>
              <label className="inline-flex items-center gap-2 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isPopiaChecked}
                  checked={currentInputs.hasOpenJudgmentsOrDefaults}
                  onChange={(e) =>
                    handleInputChange('hasOpenJudgmentsOrDefaults', e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-[10px] font-semibold text-slate-700">
                  {currentInputs.hasOpenJudgmentsOrDefaults ? (
                    <span className="text-rose-600 font-bold">Yes (Active Adverse Record)</span>
                  ) : (
                    <span className="text-emerald-700">Clean Legal History</span>
                  )}
                </span>
              </label>
              <span className="text-[9px] text-slate-400">
                Triggers immediate Grade D hard decline
              </span>
            </div>
          </div>

          {/* Real-time Reactive Feedback Strip */}
          <div className="pt-2 border-t border-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Rent-to-Income */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                    Rent-to-Income
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1 rounded ${
                      evaluation.rentToIncomePercent <= 28
                        ? 'bg-emerald-100 text-emerald-800'
                        : evaluation.rentToIncomePercent <= 33
                        ? 'bg-blue-100 text-blue-800'
                        : evaluation.rentToIncomePercent <= 39
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {evaluation.rentToIncomePoints}/25 pts
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {currentInputs.verifiedNetMonthlyIncomeZAR > 0
                    ? `${evaluation.rentToIncomePercent}%`
                    : 'N/A'}
                </div>
                <div className="text-[9px] text-slate-400">Benchmark: ≤ 28% net</div>
              </div>

              {/* Total DTI */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total DTI
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1 rounded ${
                      evaluation.totalDebtToIncomePercent <= 45
                        ? 'bg-emerald-100 text-emerald-800'
                        : evaluation.totalDebtToIncomePercent <= 55
                        ? 'bg-blue-100 text-blue-800'
                        : evaluation.totalDebtToIncomePercent <= 65
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {evaluation.debtToIncomePoints}/20 pts
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {currentInputs.verifiedNetMonthlyIncomeZAR > 0
                    ? `${evaluation.totalDebtToIncomePercent}%`
                    : 'N/A'}
                </div>
                <div className="text-[9px] text-slate-400">(Rent + CPA Debt) / Net</div>
              </div>

              {/* 100-Point Composite Score */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                    Composite Score
                  </span>
                  <span className="text-[9px] font-bold text-slate-600">/ 100 pts</span>
                </div>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{evaluation.compositeScore}</span>
                  <div className="grow h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        evaluation.compositeScore >= 85
                          ? 'bg-emerald-500'
                          : evaluation.compositeScore >= 70
                          ? 'bg-blue-500'
                          : evaluation.compositeScore >= 55
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, evaluation.compositeScore))}%` }}
                    />
                  </div>
                </div>
                <div className="text-[9px] text-slate-400">Min 55 required for lease</div>
              </div>

              {/* Risk Grade & Deposit Multiplier */}
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                  Risk Grade & Deposit
                </div>
                <div className="text-xs font-bold truncate">
                  {evaluation.isPendingInputs ? (
                    <span className="text-slate-500">Pending Inputs</span>
                  ) : evaluation.riskGrade === 'Grade A (Low Risk)' ? (
                    <span className="text-emerald-700">Grade A (1.0×)</span>
                  ) : evaluation.riskGrade === 'Grade B (Moderate Risk)' ? (
                    <span className="text-blue-700">Grade B (1.5×)</span>
                  ) : evaluation.riskGrade === 'Grade C (High Risk)' ? (
                    <span className="text-amber-700">Grade C (2.0×)</span>
                  ) : (
                    <span className="text-rose-700">Grade D (Decline)</span>
                  )}
                </div>
                <div className="text-[9px] text-slate-400">
                  {evaluation.recommendedDepositMultiplier > 0
                    ? `Req: ${evaluation.recommendedDepositMultiplier}× rent`
                    : 'No lease recommended'}
                </div>
              </div>
            </div>
          </div>

          {/* Hard Failure Gate Warning Strip */}
          {evaluation.isHardFailure && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Hard Failure Gate Triggered — Automatic Grade D (Decline)</span>
              </div>
              <ul className="list-disc list-inside text-[10px] text-rose-700 space-y-0.5">
                {evaluation.hardFailureReasons?.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
              <p className="text-[9px] text-rose-600 mt-1">
                <strong>PIE Act Risk:</strong> High default probability. Eviction proceedings under South African law (Prevention of Illegal Eviction Act) typically take 4–8 months, with significant legal expenses.
              </p>
            </div>
          )}

          {/* Grade C Warning Strip */}
          {!evaluation.isHardFailure && evaluation.riskGrade === 'Grade C (High Risk)' && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Grade C Conditional Acceptance — High Eviction Risk Under PIE Act</span>
              </div>
              <p className="text-[10px] text-amber-700">
                To mitigate tenancy default risk, a <strong>2.0× monthly deposit ({formatZAR(monthlyRentZAR * 2)})</strong> and a <strong>Parent / Corporate Guarantor with a signed Deed of Suretyship</strong> are mandatory before issuing the lease contract.
              </p>
            </div>
          )}

          {/* Bottom Action Strip: Apply Recommended Deposit */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-slate-100">
            <div className="text-[10px] text-slate-500">
              {evaluation.riskGrade === 'Grade D (Decline)' ? (
                <span className="text-rose-600 font-semibold">
                  ⚠️ Deposit application disabled: Prospective tenant does not meet PIE Act risk thresholds.
                </span>
              ) : (
                <span>
                  Calculated Deposit Requirement:{' '}
                  <strong className="text-slate-800">
                    {formatZAR(recommendedDepositAmount)}
                  </strong>{' '}
                  ({evaluation.recommendedDepositMultiplier}× monthly rent of {formatZAR(monthlyRentZAR)})
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={
                !isPopiaChecked ||
                evaluation.riskGrade === 'Grade D (Decline)' ||
                evaluation.isPendingInputs ||
                recommendedDepositAmount <= 0
              }
              onClick={() => onApplyDeposit(recommendedDepositAmount)}
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shrink-0 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply Recommended Deposit ({formatZAR(recommendedDepositAmount)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

'use client';

import React from 'react';
import { FlipProject } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { calculateMilestonePhaseTargets } from '@/lib/calculations/flips';
import { Hammer, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { isEvictionActive } from '@/lib/calculations/occupantRisk';

export interface FlipMilestoneDrawdownCardProps {
  flip: FlipProject;
  milestoneDraws: { deposit: number; firstFix: number; finishes: number; retention: number };
  milestoneTargets?: { deposit: number; firstFix: number; finishes: number; retention: number };
  totalRetentionHeldZAR?: number;
  drawSchedule?: FlipProject['drawSchedule'];
  onToggleDrawPhase: (phaseKey: keyof NonNullable<FlipProject['drawSchedule']>) => void;
  onUpdateFlip?: (updates: Partial<FlipProject>) => void;
}

export function FlipMilestoneDrawdownCard({
  flip,
  milestoneDraws,
  milestoneTargets: explicitTargets,
  totalRetentionHeldZAR: explicitRetentionHeld,
  drawSchedule,
  onToggleDrawPhase,
  onUpdateFlip,
}: FlipMilestoneDrawdownCardProps) {
  const currentDrawSchedule =
    drawSchedule ||
    flip.drawSchedule || {
      depositPaid: false,
      firstFixApproved: false,
      finishesApproved: false,
      retentionReleased: false,
    };

  const milestoneTargets =
    explicitTargets || calculateMilestonePhaseTargets(flip.baselineRenovationBudgetZAR || 0);

  const totalRetentionHeldZAR =
    explicitRetentionHeld !== undefined
      ? explicitRetentionHeld
      : (flip.boq || []).reduce((sum, item) => {
          const retPct = item.retentionPercent || 0;
          return sum + (item.actualCostZAR || item.baselineTotalZAR || 0) * (retPct / 100);
        }, 0);

  const evictionActive = flip.occupantRisk ? isEvictionActive(flip.occupantRisk) : false;

  return (
    <div id="flips-drawdown" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Hammer className="w-4 h-4 text-emerald-600" />
            <span>Contractor Milestone Drawdown & Retention Schedule</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Phase-gated progress payments structured to eliminate contractor abandonment risk (Flipping Johannesburg operator model).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">
              {currentDrawSchedule.retentionReleased ? 'Total Retention Pool' : 'Total Retention Pool Held'}
            </span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded border ${
                currentDrawSchedule.retentionReleased
                  ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
                  : 'text-amber-800 bg-amber-50 border-amber-200'
              }`}
            >
              {formatZAR(totalRetentionHeldZAR)}{' '}
              {currentDrawSchedule.retentionReleased ? '✓ Released' : 'Held (20%)'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Phase Draw Gates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gate 1: Deposit (20%) */}
        <div
          className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
            currentDrawSchedule.depositPaid
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : evictionActive
              ? 'bg-rose-50/50 border-rose-300 text-rose-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs uppercase tracking-wide">Phase 1: Deposit</span>
              <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                20% Target
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">Mobilization, prep & materials deposit</p>
            <div className="text-base font-extrabold text-slate-900">
              {formatZAR(milestoneDraws.deposit || milestoneTargets.deposit)}
            </div>
            <span className="text-[10px] text-slate-400">Target: {formatZAR(milestoneTargets.deposit)}</span>

            {/* Eviction Active Notice & Site Access Gating */}
            {evictionActive && (
              <div className="mt-2.5 p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-950 text-[10px] space-y-1.5">
                <div className="font-bold flex items-center gap-1 text-rose-900">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-700" />
                  <span>Site Access Blocked: PIE Act Eviction</span>
                </div>
                <p className="text-rose-800 leading-tight">
                  Unlawful occupants on site ({flip.occupantRisk?.estimatedEvictionDelayDays}d delay). Contractor site mobilization prohibited until vacant possession is secured.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!flip.occupantRisk) return;
                    onUpdateFlip?.({
                      occupantRisk: {
                        ...flip.occupantRisk,
                        occupancyStatus: 'vacant',
                        evictionRequired: false,
                        possessionObtainedDate: new Date().toISOString().split('T')[0],
                      },
                    });
                  }}
                  className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Mark Vacant Possession Obtained</span>
                </button>
              </div>
            )}

            {flip.occupantRisk?.occupancyStatus === 'vacant' && flip.occupantRisk.possessionObtainedDate && (
              <div className="mt-2 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Vacant possession secured ({flip.occupantRisk.possessionObtainedDate})</span>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
              <input
                type="checkbox"
                checked={currentDrawSchedule.depositPaid}
                onChange={() => onToggleDrawPhase('depositPaid')}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>{currentDrawSchedule.depositPaid ? '✓ Deposit Paid' : 'Mark Deposit Paid'}</span>
            </label>
          </div>
        </div>

        {/* Gate 2: First Fix / Wet Works (30%) */}
        <div
          className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
            currentDrawSchedule.firstFixApproved
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs uppercase tracking-wide">Phase 2: First Fix</span>
              <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                30% Target
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">Plumbing rough-in, electrical conduit & wet works</p>
            <div className="text-base font-extrabold text-slate-900">
              {formatZAR(milestoneDraws.firstFix || milestoneTargets.firstFix)}
            </div>
            <span className="text-[10px] text-slate-400">Target: {formatZAR(milestoneTargets.firstFix)}</span>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
              <input
                type="checkbox"
                checked={currentDrawSchedule.firstFixApproved}
                onChange={() => onToggleDrawPhase('firstFixApproved')}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>{currentDrawSchedule.firstFixApproved ? '✓ Inspected & Approved' : 'Sign Off First Fix'}</span>
            </label>
          </div>
        </div>

        {/* Gate 3: Finishes & Tiling (30%) */}
        <div
          className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
            currentDrawSchedule.finishesApproved
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs uppercase tracking-wide">Phase 3: Finishes</span>
              <span className="text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                30% Target
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">Tiling, joinery, sanitaryware, ceilings & paint</p>
            <div className="text-base font-extrabold text-slate-900">
              {formatZAR(milestoneDraws.finishes || milestoneTargets.finishes)}
            </div>
            <span className="text-[10px] text-slate-400">Target: {formatZAR(milestoneTargets.finishes)}</span>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200/60">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
              <input
                type="checkbox"
                checked={currentDrawSchedule.finishesApproved}
                onChange={() => onToggleDrawPhase('finishesApproved')}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>{currentDrawSchedule.finishesApproved ? '✓ Finishes Approved' : 'Sign Off Finishes'}</span>
            </label>
          </div>
        </div>

        {/* Gate 4: Practical Completion & Retention (20%) */}
        <div
          className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
            currentDrawSchedule.retentionReleased
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/60 border-amber-200 text-amber-950'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs uppercase tracking-wide">Phase 4: Retention</span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                20% Snag Gate
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">Snag list completion, CoC delivery & handover</p>
            <div className="text-base font-extrabold text-amber-900">
              {formatZAR(milestoneDraws.retention || milestoneTargets.retention)}
            </div>
            <span className="text-[10px] text-amber-800 font-semibold">Withheld until 100% snag-free</span>
          </div>

          <div className="pt-3 mt-3 border-t border-amber-200/60">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
              <input
                type="checkbox"
                checked={currentDrawSchedule.retentionReleased}
                onChange={() => onToggleDrawPhase('retentionReleased')}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>{currentDrawSchedule.retentionReleased ? '✓ Retention Released' : 'Release Retention'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlipMilestoneDrawdownCard;

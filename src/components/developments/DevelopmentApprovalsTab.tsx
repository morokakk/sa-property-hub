'use client';

import React, { useState, useMemo } from 'react';
import {
  DevelopmentProject,
  PreConstructionApprovals,
  ApprovalStatus,
  PreConstructionApprovalItem,
} from '@/types';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import {
  calculateDevelopmentHoldingSensitivity,
  calculateApprovalsProgress,
  DevelopmentFinancialSummary,
} from '@/lib/calculations/developments';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  AlertCircle,
  TrendingDown,
  Layers,
  MapPin,
  Building,
  Calendar,
  X,
  Scale,
  Sparkles,
} from 'lucide-react';

export interface DevelopmentApprovalsTabProps {
  development: DevelopmentProject;
  financials?: DevelopmentFinancialSummary;
  onUpdateApproval: (
    key: keyof PreConstructionApprovals,
    updates: Partial<PreConstructionApprovalItem>
  ) => void;
  onOpenDelayMatrix?: () => void;
}

interface ApprovalDefinition {
  key: keyof PreConstructionApprovals;
  title: string;
  stage: 'Stage 1: Paper Rights' | 'Stage 2: Municipal & Deeds Proclamation';
  statutoryAct: string;
  description: string;
  authority: string;
  leadTimeDays: number;
}

const APPROVAL_DEFS: ApprovalDefinition[] = [
  {
    key: 'splumaRezoningSubdivision',
    title: 'SPLUMA Section 42 Rezoning & Subdivision',
    stage: 'Stage 1: Paper Rights',
    statutoryAct: 'Spatial Planning & Land Use Management Act 16 of 2013',
    description: 'Municipal Planning Tribunal departure rights, density increase, and parent erf subdivision approval.',
    authority: 'Municipal Planning Tribunal (MPT)',
    leadTimeDays: 120,
  },
  {
    key: 'sgDiagramApproval',
    title: 'Surveyor-General (SG) Diagram Approval',
    stage: 'Stage 1: Paper Rights',
    statutoryAct: 'Land Survey Act 8 of 1997',
    description: 'Cadastral land survey, boundary beacon certification, and new erf/sectional diagrams framed by the SG Office.',
    authority: 'Surveyor-General Office (SG)',
    leadTimeDays: 60,
  },
  {
    key: 'municipalBuildingPlans',
    title: 'Municipal Building Plans (NBR Sec 7(1))',
    stage: 'Stage 1: Paper Rights',
    statutoryAct: 'National Building Regulations & Standards Act 103 of 1977',
    description: 'Architectural, structural civil, stormwater, fire and municipal service connection plan approval.',
    authority: 'Local Municipality Development Planning Dept',
    leadTimeDays: 45,
  },
  {
    key: 'nhbrcEnrolment',
    title: 'NHBRC Enrolment Certificate',
    stage: 'Stage 1: Paper Rights',
    statutoryAct: 'Housing Consumers Protection Measures Act 95 of 1998',
    description: 'Home warranty enrolment, geotechnical site classification and structural engineer sign-off.',
    authority: 'National Home Builders Registration Council',
    leadTimeDays: 30,
  },
  {
    key: 'sectionalTitleRegister',
    title: 'Sectional Title Register Proclamation',
    stage: 'Stage 2: Municipal & Deeds Proclamation',
    statutoryAct: 'Sectional Titles Act 95 of 1986',
    description: 'Deeds Office opening of the sectional title register, common property delineation & unit title deed proclamation.',
    authority: 'Deeds Registry Office',
    leadTimeDays: 45,
  },
  {
    key: 'occupancyCertificate',
    title: 'Municipal Occupancy Certificate (Sec 14 NBR)',
    stage: 'Stage 2: Municipal & Deeds Proclamation',
    statutoryAct: 'Section 14 National Building Regulations',
    description: 'Final municipal building inspector sign-off, structural engineer certificate, electrical & plumbing CoCs.',
    authority: 'City Chief Building Inspector',
    leadTimeDays: 14,
  },
];

const APPROVAL_STATUSES: ApprovalStatus[] = [
  'Not Started',
  'Submitted',
  'Objection / Query',
  'Approved',
  'N/A',
];

export function DevelopmentApprovalsTab({
  development,
  financials,
  onUpdateApproval,
  onOpenDelayMatrix,
}: DevelopmentApprovalsTabProps) {
  const approvals = development.approvals || ({} as PreConstructionApprovals);

  // Delay simulation modal state
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [simulatedObjectionMonths, setSimulatedObjectionMonths] = useState(3);

  // Approvals progress and stage 1 gate status
  const approvalsProgress = useMemo(
    () => calculateApprovalsProgress(approvals, APPROVAL_DEFS.length),
    [approvals]
  );
  const {
    approvedCount,
    totalItems,
    progressPercent,
    isStage1Approved: stage1Approved,
  } = approvalsProgress;

  // Calculate holding delay matrix
  const delayMatrix = useMemo(() => {
    return calculateDevelopmentHoldingSensitivity(development, financials);
  }, [development, financials]);

  const handleTriggerDelayMatrix = () => {
    if (onOpenDelayMatrix) {
      onOpenDelayMatrix();
    } else {
      setIsDelayModalOpen(true);
    }
  };

  return (
    <div data-testid="development-approvals-tab" className="space-y-6">
      {/* Stage-Gate Callout Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Statutory Governance & Compliance
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  stage1Approved
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                {stage1Approved ? (
                  <span className="inline-flex items-center gap-1">
                    <span>Stage 1 Unlocked: Construction Draws Approved</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 inline" />
                  </span>
                ) : (
                  'Stage 1 Ring-Fenced: Wet Works Draws Locked'
                )}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              6-Card Statutory &quot;Paper Rights&quot; Compliance Tracker
            </h3>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Institutional South African risk gate: Senior construction debt cannot be drawn down
              until Stage 1 milestones (SPLUMA Rezoning, SG Diagram, Municipal Building Plans, NHBRC Enrolment)
              are formally certified. Prevents capital exposure during municipal objections.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400">Compliance Progress:</div>
              <div className="text-base font-bold text-slate-900">
                {approvedCount} of {totalItems} Milestones
              </div>
            </div>
            <button
              type="button"
              onClick={handleTriggerDelayMatrix}
              className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Simulate Objection Delay</span>
            </button>
          </div>
        </div>

        {/* Progress Visual Tracker */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              approvedCount === totalItems
                ? 'bg-emerald-500'
                : approvedCount >= 4
                ? 'bg-blue-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 6 Statutory Approval Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {APPROVAL_DEFS.map((def) => {
          const item = approvals[def.key] || { status: 'Not Started' };
          const status = item.status || 'Not Started';

          let statusBadgeClasses = 'bg-slate-100 text-slate-600 border-slate-300';
          if (status === 'Approved') {
            statusBadgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
          } else if (status === 'Submitted') {
            statusBadgeClasses = 'bg-amber-50 text-amber-700 border-amber-300 font-semibold';
          } else if (status === 'Objection / Query') {
            statusBadgeClasses = 'bg-rose-50 text-rose-700 border-rose-300 font-bold';
          } else if (status === 'N/A') {
            statusBadgeClasses = 'bg-slate-50 text-slate-400 border-slate-200';
          }

          return (
            <div
              key={def.key}
              className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3 h-auto ${
                status === 'Approved'
                  ? 'border-emerald-200'
                  : status === 'Objection / Query'
                  ? 'border-rose-200'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {def.stage}
                  </span>
                  <select
                    value={status}
                    onChange={(e) =>
                      onUpdateApproval(def.key, {
                        status: e.target.value as ApprovalStatus,
                        approvedDate:
                          e.target.value === 'Approved'
                            ? new Date().toISOString().split('T')[0]
                            : undefined,
                      })
                    }
                    aria-label={`Status for ${def.title}`}
                    className={`text-xs rounded border px-2 py-0.5 outline-hidden ${statusBadgeClasses}`}
                  >
                    {APPROVAL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug">{def.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">{def.description}</p>
                <div className="text-[10px] text-slate-400 mt-1 italic">
                  Statute: {def.statutoryAct}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                {/* Reference Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1 leading-normal">
                    Authority Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MPT-2026/0812"
                    value={item.referenceNo || ''}
                    onChange={(e) => onUpdateApproval(def.key, { referenceNo: e.target.value })}
                    className="w-full rounded border border-slate-300 px-2.5 py-1 text-xs focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 leading-normal">
                      Submitted Date
                    </label>
                    <input
                      type="date"
                      value={item.submittedDate || ''}
                      onChange={(e) => onUpdateApproval(def.key, { submittedDate: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 leading-normal">
                      Target Approval
                    </label>
                    <input
                      type="date"
                      value={item.targetApprovalDate || ''}
                      onChange={(e) =>
                        onUpdateApproval(def.key, { targetApprovalDate: e.target.value })
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1 text-[11px]"
                    />
                  </div>
                </div>

                {/* 14-day statutory lead reminder badge */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Synced to /tasks with 14-day statutory reminder</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delay Sensitivity Modal (Embedded Simulator) */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Municipal Objection & Carrying Burn Simulator</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Assess how municipal planning tribunal appeals or deeds office bottlenecks erode project margin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDelayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">
                  Daily Holding Burn
                </div>
                <div className="text-base font-bold text-rose-700">
                  {formatZAR(delayMatrix.dailyDelayBurnZAR)} / day
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">
                  Monthly Total Delay Cost
                </div>
                <div className="text-base font-bold text-rose-700">
                  {formatZAR(delayMatrix.totalMonthlyDelayBurnZAR)} / month
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">
                  Zero-Profit Delay Limit
                </div>
                <div className="text-base font-bold text-slate-800">
                  {delayMatrix.zeroMarginDelayDays > 0
                    ? `${delayMatrix.zeroMarginDelayDays} Days`
                    : 'Unconstrained'}
                </div>
              </div>
            </div>

            {/* Delay Scenarios Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2 px-3">Scenario</th>
                    <th className="py-2 px-3 text-right">Carrying Cost</th>
                    <th className="py-2 px-3 text-right">Net Profit</th>
                    <th className="py-2 px-3 text-right">Margin Erosion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {delayMatrix.scenarios.map((sc, idx) => (
                    <tr
                      key={idx}
                      className={sc.delayDays === 0 ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}
                    >
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{sc.scenarioName}</div>
                        <div className="text-[10px] text-slate-400">{sc.scenarioDescription}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-700">
                        {formatZAR(sc.totalAdditionalCarryingCostZAR)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {formatZAR(sc.netProfitAfterTaxZAR)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {sc.delayDays === 0 ? '—' : `-${formatZAR(sc.netProfitErosionZAR)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDelayModalOpen(false)}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

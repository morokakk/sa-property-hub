'use client';

import React from 'react';
import { FlipProject, BOQItem } from '@/types';
import { FlipModalType } from '@/hooks/flips';
import {
  FlipFinancialSummary,
  FundingCampaignSummary,
  calculateFlipFinancials,
  calculateFundingCampaignSummary,
} from '@/lib/calculations/flips';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import { FlipProjectHeader } from './FlipProjectHeader';
import { FlipMetricsCards } from './FlipMetricsCards';
import { FlipOperationalMathBanner } from './FlipOperationalMathBanner';
import { FlipFundingCampaignCard } from './FlipFundingCampaignCard';
import { FlipRatesClearanceCard } from './FlipRatesClearanceCard';
import { FlipMilestoneDrawdownCard } from './FlipMilestoneDrawdownCard';
import { FlipBOQTable } from './FlipBOQTable';
import { Hammer, Archive } from 'lucide-react';

export interface FlipActivePipelineProps {
  activeFlip: FlipProject | null;
  financials: FlipFinancialSummary | null;
  fundingSummary: FundingCampaignSummary | null;
  onOpenModal: (modal: Exclude<FlipModalType, null>) => void;
  onUpdatePhase: (phase: FlipProject['currentPhase']) => void;
  onUpdateFlip?: (updates: Partial<FlipProject>) => void;
  onUpdateBOQItem?: (itemId: string, updates: Partial<BOQItem>) => void;
  onDeleteBOQItem?: (itemId: string) => void;
  onExportBOQCSV?: () => void;
  onToggleDrawPhase?: (phaseKey: keyof NonNullable<FlipProject['drawSchedule']>) => void;
  onSyncLedgerToDeal?: () => void;
  onSwitchToArchive?: () => void;
  soldFlipsCount?: number;
}

export function FlipActivePipeline({
  activeFlip,
  financials: propFinancials,
  fundingSummary: propFundingSummary,
  onOpenModal,
  onUpdatePhase,
  onUpdateFlip,
  onUpdateBOQItem = () => {},
  onDeleteBOQItem = () => {},
  onExportBOQCSV = () => {},
  onToggleDrawPhase = () => {},
  onSyncLedgerToDeal,
  onSwitchToArchive,
  soldFlipsCount = 0,
}: FlipActivePipelineProps) {
  if (!activeFlip) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
        <Hammer className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">No active flips in the portfolio.</p>
        <p className="text-xs text-slate-400 mt-1">
          Create your first flip project or promote a deal from the Opportunity Analyzer.
        </p>
        {soldFlipsCount > 0 && onSwitchToArchive && (
          <button
            type="button"
            onClick={onSwitchToArchive}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>View {soldFlipsCount} Sold Flip(s) in Archive</span>
          </button>
        )}
      </div>
    );
  }

  const financials = propFinancials || calculateFlipFinancials(activeFlip);
  const fundingSummary = propFundingSummary || calculateFundingCampaignSummary(activeFlip, [], 0);

  return (
    <>
      {/* 1. Active Flip Header Banner */}
      <FlipProjectHeader
        flip={activeFlip}
        onUpdatePhase={onUpdatePhase}
        onOpenEdit={() => onOpenModal('editFlip')}
        onOpenExit={() => onOpenModal('exit')}
        onOpenConvert={() => onOpenModal('convert')}
      />

      {/* 2. Overview & Financial Health Cards */}
      <FlipMetricsCards
        flip={activeFlip}
        financials={financials}
        onOpenDelayMatrix={() => onOpenModal('delayMatrix')}
      />

      {/* 3. Operational Math & Entity Tax Banner */}
      <FlipOperationalMathBanner
        flip={activeFlip}
        financials={financials}
        onUpdateTaxMode={(mode) => onUpdateFlip?.({ taxEntityType: mode })}
      />

      {/* 4. Funding Campaign & Investor Returns Section */}
      <FlipFundingCampaignCard
        flip={activeFlip}
        fundingSummary={fundingSummary}
        totalCostBasis={financials.totalCostBasisZAR}
        onOpenFundingModal={() => onOpenModal('funding')}
        onSyncLedgerToDeal={onSyncLedgerToDeal}
      />

      {/* 5. Section 118 Rates Clearance Certificate (RCC) Card */}
      <FlipRatesClearanceCard
        flip={activeFlip}
        financials={financials}
        onUpdateClearance={(updates) =>
          onUpdateFlip?.({
            municipalClearance: {
              sec118ArrearsZAR: financials.sec118ArrearsZAR,
              advanceCouncilDepositZAR: financials.advanceCouncilDepositZAR,
              rccStatus: activeFlip.municipalClearance?.rccStatus || 'Pending Application',
              rccApplicationDate: activeFlip.municipalClearance?.rccApplicationDate,
              disputeNotes: activeFlip.municipalClearance?.disputeNotes,
              ...updates,
            },
          })
        }
        onOpenDelayMatrix={() => onOpenModal('delayMatrix')}
      />

      {/* 6. SA Statutory Compliance (CoC) */}
      <ComplianceChecklist
        key={activeFlip.id}
        certificates={activeFlip.cocChecklist}
        city={activeFlip.city}
        onUpdate={(updated) => onUpdateFlip?.({ cocChecklist: updated })}
      />

      {/* 7. Cloud & Web Document Vault */}
      <CloudDriveLinkVault
        vault={activeFlip.driveVault}
        onUpdate={(updated) => onUpdateFlip?.({ driveVault: updated })}
      />

      {/* 8. Contractor Milestone Drawdown & Retention Schedule */}
      <FlipMilestoneDrawdownCard
        flip={activeFlip}
        milestoneDraws={financials.milestoneDraws}
        milestoneTargets={financials.milestoneTargets}
        totalRetentionHeldZAR={financials.totalRetentionHeldZAR}
        drawSchedule={activeFlip.drawSchedule}
        onToggleDrawPhase={onToggleDrawPhase}
      />

      {/* 9. Bill of Quantities (BOQ) Table */}
      <FlipBOQTable
        flip={activeFlip}
        onOpenAddBOQ={() => onOpenModal('addBOQ')}
        onUpdateBOQItem={onUpdateBOQItem}
        onDeleteBOQItem={onDeleteBOQItem}
        onExportCSV={onExportBOQCSV}
      />
    </>
  );
}

export default FlipActivePipeline;

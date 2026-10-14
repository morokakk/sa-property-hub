'use client';

import React, { useState } from 'react';
import { FlipProject, BOQItem } from '@/types';
import { FlipModalType } from '@/hooks/flips';
import {
  FlipFinancialSummary,
  FundingCampaignSummary,
  calculateFlipFinancials,
  calculateFundingCampaignSummary,
} from '@/lib/calculations/flips';
import { formatZAR } from '@/lib/formatters';
import ComplianceChecklist from '@/components/common/ComplianceChecklist';
import CloudDriveLinkVault from '@/components/common/CloudDriveLinkVault';
import { FlipProjectHeader } from './FlipProjectHeader';
import { FlipMetricsCards } from './FlipMetricsCards';
import { FlipOperationalMathBanner } from './FlipOperationalMathBanner';
import { FlipFundingCampaignCard } from './FlipFundingCampaignCard';
import { FlipRatesClearanceCard } from './FlipRatesClearanceCard';
import { FlipMilestoneDrawdownCard } from './FlipMilestoneDrawdownCard';
import { FlipBOQTable } from './FlipBOQTable';
import {
  Hammer,
  Archive,
  Layers,
  Building2,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

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
  copiedWhatsApp?: boolean;
  onCopyWhatsApp?: () => void;
  whatsAppShareUrl?: string;
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
  copiedWhatsApp,
  onCopyWhatsApp,
  whatsAppShareUrl,
}: FlipActivePipelineProps) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'boq' | 'compliance' | 'funding'>('boq');

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

  // Status metrics for tabs and cross-tab glance strip
  const fundingRequired = activeFlip.fundingRequiredZAR || 0;
  const fundingSecured = fundingSummary.totalCapitalSecuredZAR || 0;
  const fundingPercent = fundingRequired > 0 ? Math.min(100, Math.round((fundingSecured / fundingRequired) * 100)) : 100;
  const fundingShortfall = Math.max(0, fundingRequired - fundingSecured);

  // CoC Status
  const cocValues = Object.values(activeFlip.cocChecklist || {});
  const applicableCoCs = cocValues.filter((c) => c && c.status !== 'Not Applicable');
  const certifiedCoCs = applicableCoCs.filter((c) => c && c.status === 'Certified / Valid');

  // Vault links count
  const vaultLinksCount = Object.values(activeFlip.driveVault || {}).filter(Boolean).length;

  // Draw phases approved
  const drawSchedule = activeFlip.drawSchedule;
  const approvedDrawsCount = [
    drawSchedule?.depositPaid,
    drawSchedule?.firstFixApproved,
    drawSchedule?.finishesApproved,
    drawSchedule?.retentionReleased,
  ].filter(Boolean).length;

  const rccStatus = activeFlip.municipalClearance?.rccStatus || 'Pending Application';

  return (
    <div className="space-y-4">
      {/* 1. Active Flip Header Banner */}
      <FlipProjectHeader
        flip={activeFlip}
        onUpdatePhase={onUpdatePhase}
        onOpenEdit={() => onOpenModal('editFlip')}
        onOpenExit={() => onOpenModal('exit')}
        onOpenConvert={() => onOpenModal('convert')}
        copiedWhatsApp={copiedWhatsApp}
        onCopyWhatsApp={onCopyWhatsApp}
        whatsAppShareUrl={whatsAppShareUrl}
      />

      {/* 2. Overview & Financial Health Cards */}
      <FlipMetricsCards
        flip={activeFlip}
        financials={financials}
        onOpenDelayMatrix={() => onOpenModal('delayMatrix')}
      />

      {/* 3. Operational Math & Entity Tax Banner (With Integrated Delay Matrix Trigger) */}
      <FlipOperationalMathBanner
        flip={activeFlip}
        financials={financials}
        onUpdateTaxMode={(mode) => onUpdateFlip?.({ taxEntityType: mode })}
        onOpenDelayMatrix={() => onOpenModal('delayMatrix')}
      />

      {/* 4. Persistent 1-Line Cross-Tab Glance Strip */}
      <div className="bg-slate-900 text-white rounded-xl p-2.5 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
        <button
          type="button"
          onClick={() => setActiveWorkspaceTab('funding')}
          className="flex items-center gap-2 hover:text-emerald-300 transition-colors cursor-pointer text-left group"
          title="Click to view Funding & Syndicate Campaign"
        >
          <span className="p-1 rounded bg-slate-800 text-emerald-400 group-hover:bg-slate-700">
            <Briefcase className="w-3.5 h-3.5" />
          </span>
          <span className="text-slate-300">
            Funding: <strong className="text-white">{fundingPercent}% Raised</strong>{' '}
            ({formatZAR(fundingSecured, { compact: true })} / {formatZAR(fundingRequired, { compact: true })})
            {fundingShortfall > 0 ? (
              <span className="text-amber-400 font-semibold ml-1.5">
                • {formatZAR(fundingShortfall, { compact: true })} Shortfall
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold ml-1.5">• 100% Fully Funded</span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveWorkspaceTab('compliance')}
          className="flex items-center gap-2 hover:text-indigo-300 transition-colors cursor-pointer text-left group"
          title="Click to view Section 118 RCC & CoC Compliance Checklist"
        >
          <span className="p-1 rounded bg-slate-800 text-indigo-400 group-hover:bg-slate-700">
            <Building2 className="w-3.5 h-3.5" />
          </span>
          <span className="text-slate-300">
            Transfer Readiness:{' '}
            <strong className={rccStatus === 'Certificate Issued' ? 'text-emerald-400' : 'text-amber-300'}>
              {rccStatus === 'Certificate Issued' ? 'RCC Issued ✓' : 'RCC In Progress'}
            </strong>{' '}
            • {certifiedCoCs.length}/{applicableCoCs.length} CoCs Certified
            {vaultLinksCount > 0 && <span className="text-slate-400 ml-1.5">• {vaultLinksCount} Docs in Vault</span>}
          </span>
        </button>
      </div>

      {/* 5. 3-Tab Execution Workspace Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl p-1 gap-1 text-xs font-semibold shadow-2xs">
        {/* Tab 1: BOQ & Contractor Draws (Default Active Tab) */}
        <button
          type="button"
          data-testid="tab-flips-boq"
          onClick={() => setActiveWorkspaceTab('boq')}
          className={`flex-1 py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeWorkspaceTab === 'boq'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Hammer className={`w-4 h-4 ${activeWorkspaceTab === 'boq' ? 'text-amber-400' : 'text-slate-500'}`} />
          <span>🔨 BOQ & Contractor Draws</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeWorkspaceTab === 'boq' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {activeFlip.boq?.length || 0} Trades • {approvedDrawsCount}/4 Draws
          </span>
        </button>

        {/* Tab 2: Transfer & Compliance */}
        <button
          type="button"
          data-testid="tab-flips-compliance"
          onClick={() => setActiveWorkspaceTab('compliance')}
          className={`flex-1 py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeWorkspaceTab === 'compliance'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeWorkspaceTab === 'compliance' ? 'text-indigo-400' : 'text-slate-500'}`} />
          <span>🏛️ Transfer & Compliance</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeWorkspaceTab === 'compliance' ? 'bg-slate-800 text-indigo-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Sec 118 • {certifiedCoCs.length}/{applicableCoCs.length} CoCs • {vaultLinksCount} Vault
          </span>
        </button>

        {/* Tab 3: Funding & Syndicate */}
        <button
          type="button"
          data-testid="tab-flips-funding"
          onClick={() => setActiveWorkspaceTab('funding')}
          className={`flex-1 py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeWorkspaceTab === 'funding'
              ? 'bg-slate-900 text-white shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Briefcase className={`w-4 h-4 ${activeWorkspaceTab === 'funding' ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>💼 Funding & Syndicate</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeWorkspaceTab === 'funding' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {fundingPercent}% Raised {fundingShortfall > 0 ? `• -${formatZAR(fundingShortfall, { compact: true })}` : '• ✓'}
          </span>
        </button>
      </div>

      {/* 6. Tab Content Body */}
      {activeWorkspaceTab === 'boq' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Milestone Drawdowns Schedule */}
          <FlipMilestoneDrawdownCard
            flip={activeFlip}
            milestoneDraws={financials.milestoneDraws}
            milestoneTargets={financials.milestoneTargets}
            totalRetentionHeldZAR={financials.totalRetentionHeldZAR}
            drawSchedule={activeFlip.drawSchedule}
            onToggleDrawPhase={onToggleDrawPhase}
            onUpdateFlip={onUpdateFlip}
          />

          {/* Bill of Quantities (BOQ) Table with Sticky Totals Footer */}
          <FlipBOQTable
            flip={activeFlip}
            onOpenAddBOQ={() => onOpenModal('addBOQ')}
            onUpdateBOQItem={onUpdateBOQItem}
            onDeleteBOQItem={onDeleteBOQItem}
            onExportCSV={onExportBOQCSV}
          />
        </div>
      )}

      {activeWorkspaceTab === 'compliance' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Section 118 Rates Clearance Certificate (RCC) Card */}
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

          {/* SA Statutory Compliance (CoC) */}
          <ComplianceChecklist
            key={activeFlip.id}
            certificates={activeFlip.cocChecklist}
            city={activeFlip.city}
            onUpdate={(updated) => onUpdateFlip?.({ cocChecklist: updated })}
          />

          {/* Cloud & Web Document Vault */}
          <CloudDriveLinkVault
            vault={activeFlip.driveVault}
            onUpdate={(updated) => onUpdateFlip?.({ driveVault: updated })}
          />
        </div>
      )}

      {activeWorkspaceTab === 'funding' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Funding Campaign & Investor Returns Section */}
          <FlipFundingCampaignCard
            flip={activeFlip}
            fundingSummary={fundingSummary}
            totalCostBasis={financials.totalCostBasisZAR}
            onOpenFundingModal={() => onOpenModal('funding')}
            onSyncLedgerToDeal={onSyncLedgerToDeal}
          />
        </div>
      )}
    </div>
  );
}

export default FlipActivePipeline;

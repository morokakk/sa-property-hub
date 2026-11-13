'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { calculateDevelopmentFinancials } from '@/lib/calculations/developments';
import { calculateZoningEnvelope, formatZoningTransitionLabel } from '@/lib/calculations/zoning';
import {
  countOpenProjectComments,
  buildTaskFromProjectComment,
  transitionProjectCommentStatus,
  removeProjectComment,
  isDemoDevelopment,
} from '@/lib/calculations/commentsLedger';
import { exportDevelopmentProjectToExcel } from '@/lib/export/excelExport';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { DevelopmentKpiBanner } from '@/components/developments/DevelopmentKpiBanner';
import { DevelopmentUnitInventoryTab } from '@/components/developments/DevelopmentUnitInventoryTab';
import { DevelopmentCostStackTab } from '@/components/developments/DevelopmentCostStackTab';
import { DevelopmentApprovalsTab } from '@/components/developments/DevelopmentApprovalsTab';
import { DevelopmentFinanceTab } from '@/components/developments/DevelopmentFinanceTab';
import { DevelopmentProjectModal } from '@/components/developments/DevelopmentProjectModal';
import CloudPublishModal from '@/components/rentals/CloudPublishModal';
import { supabase } from '@/lib/supabaseClient';
import { migrateToCloud } from '@/lib/db/migrateToCloud';
import {
  PlusCircle,
  HardHat,
  FileSpreadsheet,
  FileCheck,
  Coins,
  Edit2,
  Trash2,
  Building,
  Copy,
  Check,
  FileText,
  MessageSquare,
  Download,
  Share2,
  ChevronDown,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  DevelopmentProject,
  DevelopmentUnit,
  DevelopmentPhase,
  ProjectComment,
  ProjectCommentStatus,
} from '@/types';
import { trackPrivacySafeEvent } from '@/lib/analytics/posthogClient';

const ProjectCommentsLedgerModal = dynamic(
  () => import('@/components/developments/ProjectCommentsLedgerModal'),
  { ssr: false }
);

type OperationalTab = 'units' | 'costs' | 'approvals' | 'finance';

const DEVELOPMENT_PHASES: DevelopmentPhase[] = [
  'Feasibility',
  'Land & Paper Rights',
  'Earthworks & Services',
  'Superstructure',
  'Finishes & Practical Completion',
  'Sell-Down / Handover',
  'Completed',
];

export default function DevelopmentsPage() {
  const store = usePortfolioStore();
  const storeDevelopments = usePortfolioStore((state) => state.developments);
  const developments = (typeof window === 'undefined' ? usePortfolioStore.getState().developments : storeDevelopments) ?? [];
  const storeInvestorProfile = usePortfolioStore((state) => state.investorProfile);
  const investorProfile =
    (typeof window === 'undefined'
      ? usePortfolioStore.getState().investorProfile
      : storeInvestorProfile) ?? usePortfolioStore.getState().investorProfile;
  const storeTasks = usePortfolioStore((state) => state.tasks);
  const tasks = (typeof window === 'undefined' ? usePortfolioStore.getState().tasks : storeTasks) ?? [];

  const [selectedDevId, setSelectedDevId] = useState<string>(developments[0]?.id || '');
  const [activeTab, setActiveTab] = useState<OperationalTab>('units');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAfterTax, setShowAfterTax] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isPublishingDealRoom, setIsPublishingDealRoom] = useState(false);
  const [showCloudPublishModal, setShowCloudPublishModal] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.replace('#', '');
      if (hash === 'developments-inventory') setActiveTab('units');
      else if (hash === 'developments-costs') setActiveTab('costs');
      else if (hash === 'developments-approvals') setActiveTab('approvals');
      else if (hash === 'developments-finance') setActiveTab('finance');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (!exportToast) return;
    const timer = window.setTimeout(() => setExportToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [exportToast]);

  useEffect(() => {
    if (!shareError) return;
    const timer = window.setTimeout(() => setShareError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [shareError]);

  useEffect(() => {
    if (!isShareMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsShareMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShareMenuOpen]);

  const activeDev = useMemo(
    () => developments.find((d) => d.id === selectedDevId) || developments[0] || null,
    [developments, selectedDevId]
  );
  const financials = useMemo(
    () =>
      activeDev
        ? calculateDevelopmentFinancials(
            activeDev,
            investorProfile?.customNodeBenchmarks,
            investorProfile?.entityName
          )
        : null,
    [activeDev, investorProfile?.customNodeBenchmarks, investorProfile?.entityName]
  );
  const activeDevEnvelope = useMemo(() => {
    if (!activeDev?.zoningProfile) return null;
    return calculateZoningEnvelope(
      activeDev.zoningProfile,
      activeDev.totalBuildableAreaSqm,
      activeDev.units?.length || 0
    );
  }, [activeDev]);
  const openCommentsCount = useMemo(
    () => (activeDev ? countOpenProjectComments(activeDev.commentsLedger) : 0),
    [activeDev]
  );
  const existingTaskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks]);

  const handleDeleteProject = () => {
    if (!activeDev || !confirm(`Delete development "${activeDev.title}"?`)) return;
    store.deleteDevelopment(activeDev.id);
    const remaining = developments.filter((d) => d.id !== activeDev.id);
    if (remaining[0]) setSelectedDevId(remaining[0].id);
  };

  const handleUpdateUnit = (unitId: string, updates: Partial<DevelopmentUnit>) => {
    if (!activeDev) return;
    const units = (activeDev.units || []).map((u) => (u.id === unitId ? { ...u, ...updates } : u));
    store.updateDevelopment(activeDev.id, { units });
  };

  const handleAddUnit = (unit: Omit<DevelopmentUnit, 'id'>) => {
    if (!activeDev) return;
    const newUnit = { ...unit, id: `dev-unit-${Date.now()}-${(activeDev.units?.length || 0) + 1}` };
    store.updateDevelopment(activeDev.id, { units: [...(activeDev.units || []), newUnit] });
  };

  const handleDeleteUnit = (unitId: string) => {
    if (!activeDev) return;
    store.updateDevelopment(activeDev.id, {
      units: (activeDev.units || []).filter((u) => u.id !== unitId),
    });
  };

  const handleExportTeamExcel = async () => {
    if (!activeDev || !financials) return;
    await exportDevelopmentProjectToExcel(
      activeDev,
      financials,
      investorProfile?.customNodeBenchmarks,
      investorProfile?.entityName
    );
    trackPrivacySafeEvent('development_excel_team_pack_exported', {
      development_type: activeDev.developmentType,
      units_count: financials.totalUnitsCount,
    });
    setExportToast('5-Sheet External Team Workbook (.xlsx) exported!');
  };

  const handleAddComment = (comment: ProjectComment) => {
    if (!activeDev) return;
    const existing = activeDev.commentsLedger ?? [];
    if (existing.some((c) => c.id === comment.id)) return;
    store.updateDevelopment(activeDev.id, {
      commentsLedger: [comment, ...existing],
    });
  };

  const handleTransitionCommentStatus = (
    commentId: string,
    nextStatus: ProjectCommentStatus
  ) => {
    if (!activeDev) return;
    const updated = transitionProjectCommentStatus(
      activeDev.commentsLedger,
      commentId,
      nextStatus
    );
    store.updateDevelopment(activeDev.id, { commentsLedger: updated });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!activeDev) return;
    const updated = removeProjectComment(activeDev.commentsLedger, commentId);
    store.updateDevelopment(activeDev.id, { commentsLedger: updated });
  };

  const handleSyncCommentToTask = (comment: ProjectComment) => {
    if (!activeDev) return;
    const task = buildTaskFromProjectComment(activeDev, comment);
    store.addTask(task);
  };

  const resolveDealRoomToken = async (): Promise<string | null> => {
    if (!activeDev) return null;
    setShareError(null);

    if (isDemoDevelopment(activeDev.id)) {
      return activeDev.shareToken || activeDev.id;
    }

    setIsPublishingDealRoom(true);
    try {
      let user = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user ?? null;
        if (!user) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData?.user ?? null;
        }
      } catch {
        user = null;
      }

      if (!user) {
        setShowCloudPublishModal(true);
        return null;
      }

      let token = activeDev.shareToken?.trim();
      if (!token) {
        token = crypto.randomUUID();
        store.updateDevelopment(activeDev.id, { shareToken: token });
      }

      const res = await migrateToCloud({ state: usePortfolioStore.getState() });
      if (!res.success) {
        setShareError(`Cloud publish failed: ${res.error || 'Unable to publish Deal Room online.'}`);
        return null;
      }

      return token;
    } catch (err: any) {
      setShareError(`Error publishing Deal Room: ${err?.message || 'Unknown error'}`);
      return null;
    } finally {
      setIsPublishingDealRoom(false);
    }
  };

  const handleShareDealRoom = async (mode: 'copy' | 'preview') => {
    if (!activeDev || isPublishingDealRoom) return;
    setIsShareMenuOpen(false);

    const token = await resolveDealRoomToken();
    if (!token) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const relativePath = `/deal-room/${token}`;
    const fullUrl = `${origin}${relativePath}`;

    if (mode === 'copy') {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(fullUrl);
        }
      } catch {
        // Fallback silently if clipboard permission unavailable
      }
      trackPrivacySafeEvent('development_deal_room_link_copied', {
        development_type: activeDev.developmentType,
        is_demo: isDemoDevelopment(activeDev.id),
      });
      setExportToast(
        isDemoDevelopment(activeDev.id)
          ? `Deal Room Link copied: ${relativePath}`
          : `Deal Room published & link copied: ${relativePath}`
      );
      return;
    }

    trackPrivacySafeEvent('development_deal_room_preview_opened', {
      development_type: activeDev.developmentType,
      is_demo: isDemoDevelopment(activeDev.id),
    });
    if (typeof window !== 'undefined') {
      window.open(relativePath, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyWhatsApp = () => {
    if (!activeDev || !financials) return;
    const lines = [
      `*DEVELOPMENT FEASIBILITY: ${activeDev.title.toUpperCase()}*`,
      `Location: ${activeDev.address}, ${activeDev.city} (${activeDev.province || 'Gauteng'})`,
      `Type: ${activeDev.developmentType} | Phase: ${activeDev.currentPhase}`,
      `----------------------------------------`,
      `*KEY METRICS*`,
      `- Total Development Cost (TDC): ${formatZAR(financials.tdcZAR)} (${formatZAR(financials.tdcPerSqmZAR)}/m2)`,
      `- Gross Development Value (GDV): ${formatZAR(financials.gdvInclVatZAR)}`,
      `- Projected Net Profit (Before Tax): ${formatZAR(financials.netProfitBeforeTaxZAR)}`,
      `- Profit on Cost (POC): ${formatPercent(financials.pocPercent)} (After Tax: ${formatPercent(financials.afterTaxPocPercent)})`,
      `----------------------------------------`,
      `*INVENTORY & SPLIT-EXIT*`,
      `- Units: ${financials.totalUnitsCount} Total (${financials.totalFloorAreaSqm} m2 buildable)`,
      `- For Sale: ${financials.unitsForSaleCount} | Retained: ${financials.unitsRetainedCount}`,
      `- Pre-Sales Hurdle: ${financials.preSoldGdvPercent.toFixed(1)}% / ${activeDev.preSalesHurdlePercent}% Target`,
      `- Debt Wipeout Breakeven: ${financials.unitsRequiredForDebtWipeout} Unit Sales Needed`,
      `----------------------------------------`,
      `Generated by Moremela Property Hub`,
    ];
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n'));
    }
    trackPrivacySafeEvent('development_whatsapp_copied', {
      development_type: activeDev.developmentType,
      units_count: financials.totalUnitsCount,
    });
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Developments Manager"
        subtitle="Township infill, sectional title clusters, statutory approvals, and hybrid split-exit models"
        actionButton={
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setIsProjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs hover:shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ New Development Project</span>
          </button>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {exportToast && (
          <div
            role="status"
            data-testid="export-toast-banner"
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setExportToast(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {shareError && (
          <div
            role="alert"
            data-testid="deal-room-share-error"
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{shareError}</span>
            </div>
            <button
              type="button"
              onClick={() => setShareError(null)}
              className="text-rose-700 hover:text-rose-900 text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {developments.length > 0 ? (
          <div
            data-testid="developments-header-toolbar"
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-200"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {developments.map((dev) => {
                const isSelected = activeDev?.id === dev.id;
                return (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => setSelectedDevId(dev.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected ? 'bg-slate-900 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <HardHat className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{dev.title}</span>
                    <span className="text-[10px] opacity-75 font-normal">({dev.units?.length || 0}u)</span>
                  </button>
                );
              })}
            </div>

            {activeDev && (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  aria-label="Current Development Phase"
                  value={activeDev.currentPhase}
                  onChange={(e) =>
                    store.updateDevelopment(activeDev.id, {
                      currentPhase: e.target.value as DevelopmentPhase,
                    })
                  }
                  className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200/80 text-slate-800 cursor-pointer outline-hidden"
                >
                  {DEVELOPMENT_PHASES.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  data-testid="open-team-ledger-btn"
                  onClick={() => setIsLedgerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 text-xs font-semibold px-2.5 py-1 rounded border border-amber-300 cursor-pointer whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{`Team Ledger (${openCommentsCount} Open)`}</span>
                </button>
                <button
                  type="button"
                  data-testid="export-team-excel-btn"
                  onClick={handleExportTeamExcel}
                  className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 text-xs font-semibold px-2.5 py-1 rounded border border-blue-200 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Team Excel (.xlsx)</span>
                </button>

                {/* Share Deal Room Split Control */}
                <div ref={shareMenuRef} className="relative inline-flex rounded border border-slate-900 bg-slate-900 text-white shadow-2xs">
                  <button
                    type="button"
                    disabled={isPublishingDealRoom}
                    data-testid="share-deal-room-btn"
                    onClick={() => void handleShareDealRoom('copy')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 hover:bg-slate-800 rounded-l transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                  >
                    {isPublishingDealRoom ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{isPublishingDealRoom ? 'Publishing...' : 'Share Deal Room'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPublishingDealRoom}
                    data-testid="share-deal-room-menu-btn"
                    aria-label="Deal Room sharing options"
                    aria-haspopup="menu"
                    aria-expanded={isShareMenuOpen}
                    onClick={() => setIsShareMenuOpen((prev) => !prev)}
                    className="inline-flex items-center justify-center px-1.5 py-1 border-l border-slate-700 hover:bg-slate-800 rounded-r transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {isShareMenuOpen && (
                    <div
                      role="menu"
                      data-testid="share-deal-room-menu"
                      className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-white text-slate-800 border border-slate-200 shadow-xl py-1.5 z-40"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        data-testid="copy-deal-room-link-item"
                        onClick={() => void handleShareDealRoom('copy')}
                        className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 flex items-start gap-2.5 cursor-pointer"
                      >
                        <Copy className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-slate-900">Copy Deal Room Link</div>
                          <div className="text-[11px] text-slate-500">
                            POPIA-masked link for QS, planner & funders
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        data-testid="open-external-preview-btn"
                        onClick={() => void handleShareDealRoom('preview')}
                        className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 flex items-start gap-2.5 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-slate-900">Open External Preview</div>
                          <div className="text-[11px] text-slate-500">
                            Launch /deal-room/[token] in a new tab
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                >
                  {copiedWhatsApp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedWhatsApp ? 'Copied' : 'Copy WhatsApp'}</span>
                </button>
                <Link
                  href={`/proposal?dealId=${activeDev.id}`}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold px-2.5 py-1 rounded border border-emerald-200 whitespace-nowrap"
                >
                  <FileText className="w-3 h-3" />
                  <span>Pitch Deck</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setIsProjectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  aria-label="Delete development project"
                  onClick={handleDeleteProject}
                  className="p-1.5 rounded transition-colors text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
            <HardHat className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Development Projects</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Get started by creating your first sectional title or township infill project.</p>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setIsProjectModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Development Project</span>
            </button>
          </div>
        )}

        {activeDev && financials && (
          <div className="space-y-4">
            {activeDev.zoningProfile && activeDevEnvelope && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-amber-400">
                    {formatZoningTransitionLabel(
                      activeDev.zoningProfile.currentZoning,
                      activeDev.zoningProfile.targetZoning
                    )}
                  </span>
                  <span className="text-slate-500">&bull;</span>
                  <span className="text-slate-300">
                    Erf: {activeDev.zoningProfile.erfSizeSqm.toLocaleString('en-ZA')} m² &bull; FAR {activeDev.zoningProfile.farRatio} ({activeDev.totalBuildableAreaSqm} / {activeDevEnvelope.maxPermittedBulkSqm} m² Bulk &bull; {activeDevEnvelope.bulkUtilizationPercent}%)
                  </span>
                </div>
                <div>
                  {activeDevEnvelope.isSplumaRezoningTriggered ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      SPLUMA Rezoning Tribunal Triggered
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                      As-of-Right Statutory Rights
                    </span>
                  )}
                </div>
              </div>
            )}

            <DevelopmentKpiBanner
              development={activeDev}
              financials={financials}
              showAfterTax={showAfterTax}
              onToggleAfterTax={() => setShowAfterTax((prev) => !prev)}
            />

            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
              {[
                { id: 'units', label: `Unit Inventory & Split-Exit (${activeDev.units?.length || 0})`, icon: Building },
                { id: 'costs', label: 'Cost Stack & Hard Build BOQ', icon: FileSpreadsheet },
                { id: 'approvals', label: 'Paper Rights & Approvals (6)', icon: FileCheck },
                { id: 'finance', label: 'Finance & Pre-Sales Gate', icon: Coins },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id as OperationalTab);
                    trackPrivacySafeEvent('development_tab_switched', { tab: id });
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === id
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'units' && (
              <div id="developments-inventory">
                <DevelopmentUnitInventoryTab
                  development={activeDev}
                  financials={financials}
                  onUpdateUnit={handleUpdateUnit}
                  onAddUnit={handleAddUnit}
                  onDeleteUnit={handleDeleteUnit}
                  onMarkUnitSold={(unitId, buyer, price) =>
                    store.sellDevelopmentUnit(activeDev.id, unitId, buyer, price)
                  }
                  onGraduateRetainedUnits={() =>
                    store.graduateRetainedUnitsToRental(activeDev.id)
                  }
                />
              </div>
            )}

            {activeTab === 'costs' && (
              <div id="developments-costs">
                <DevelopmentCostStackTab
                  development={activeDev}
                  financials={financials}
                  onUpdateSoftCosts={(sc) =>
                    store.updateDevelopment(activeDev.id, {
                      softCosts: { ...activeDev.softCosts, ...sc },
                    })
                  }
                  onUpdateDevelopment={(updates) =>
                    store.updateDevelopment(activeDev.id, updates)
                  }
                  onAddBOQItem={(item) => store.addDevelopmentBOQItem(activeDev.id, item)}
                  onUpdateBOQItem={(id, u) => store.updateDevelopmentBOQItem(activeDev.id, id, u)}
                  onDeleteBOQItem={(id) => store.deleteDevelopmentBOQItem(activeDev.id, id)}
                />
              </div>
            )}

            {activeTab === 'approvals' && (
              <div id="developments-approvals">
                <DevelopmentApprovalsTab
                  development={activeDev}
                  financials={financials}
                  onUpdateApproval={(key, u) =>
                    store.updateDevelopment(activeDev.id, {
                      approvals: {
                        ...activeDev.approvals,
                        [key]: { ...activeDev.approvals[key], ...u },
                      },
                    })
                  }
                />
              </div>
            )}

            {activeTab === 'finance' && (
              <div id="developments-finance">
                <DevelopmentFinanceTab
                  development={activeDev}
                  financials={financials}
                  onUpdateDevelopment={(u) => store.updateDevelopment(activeDev.id, u)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {activeDev && (
        <ProjectCommentsLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          development={activeDev}
          defaultAuthorName={investorProfile?.entityName || activeDev.seniorJvPartnerName || 'Lead Sponsor'}
          existingTaskIds={existingTaskIds}
          onAddComment={handleAddComment}
          onTransitionStatus={handleTransitionCommentStatus}
          onDeleteComment={handleDeleteComment}
          onSyncCommentToTask={handleSyncCommentToTask}
        />
      )}

      <DevelopmentProjectModal
        isOpen={isProjectModalOpen}
        editingDevelopment={isEditing ? activeDev : null}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={(project, isNew) => {
          if (isNew) {
            store.addDevelopment(project as DevelopmentProject);
            if (project.id) setSelectedDevId(project.id);
          } else if (activeDev) {
            store.updateDevelopment(activeDev.id, project);
          }
        }}
      />

      <CloudPublishModal
        isOpen={showCloudPublishModal}
        onClose={() => setShowCloudPublishModal(false)}
        mode="development"
        offlineFallbackLabel="Copy WhatsApp Summary Instead"
        onCopyWhatsApp={() => {
          setShowCloudPublishModal(false);
          handleCopyWhatsApp();
          setExportToast('WhatsApp deal summary copied to clipboard!');
        }}
      />
    </div>
  );
}

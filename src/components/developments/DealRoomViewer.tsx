'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building,
  CheckCircle2,
  Coins,
  Download,
  FileCheck,
  FileSpreadsheet,
  HardHat,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  ShieldCheck,
  Tag,
  User,
} from 'lucide-react';
import { PublicDealRoomPayload } from '@/types/dealRoom';
import {
  ProjectCollaboratorRole,
  ProjectComment,
  ProjectCommentSectionTag,
  ProjectCommentStatus,
} from '@/types';
import { calculateDevelopmentFinancials } from '@/lib/calculations/developments';
import { calculateZoningEnvelope, formatZoningTransitionLabel } from '@/lib/calculations/zoning';
import {
  PROJECT_COLLABORATOR_ROLES,
  PROJECT_COMMENT_SECTION_TAGS,
  PROJECT_COMMENT_STATUSES,
  countOpenProjectComments,
  filterProjectComments,
  getProjectCommentCounts,
  maskDevelopmentForPublicDealRoom,
  mergeProjectComments,
} from '@/lib/calculations/commentsLedger';
import { exportDevelopmentProjectToExcel } from '@/lib/export/excelExport';
import { submitDevelopmentComment } from '@/app/actions/submitDevelopmentComment';
import { DevelopmentKpiBanner } from '@/components/developments/DevelopmentKpiBanner';
import { DevelopmentUnitInventoryTab } from '@/components/developments/DevelopmentUnitInventoryTab';
import { DevelopmentCostStackTab } from '@/components/developments/DevelopmentCostStackTab';
import { DevelopmentApprovalsTab } from '@/components/developments/DevelopmentApprovalsTab';
import { DevelopmentFinanceTab } from '@/components/developments/DevelopmentFinanceTab';
import { trackPrivacySafeEvent } from '@/lib/analytics/posthogClient';

type OperationalTab = 'units' | 'costs' | 'approvals' | 'finance';

export interface DealRoomViewerProps {
  dealRoomData: PublicDealRoomPayload;
  token: string;
}

const STATUS_BADGE_STYLES: Record<ProjectCommentStatus, string> = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-300',
  'In Progress': 'bg-blue-50 text-blue-800 border-blue-300',
  Resolved: 'bg-emerald-50 text-emerald-800 border-emerald-300',
};

function formatDateBadge(iso?: string): string {
  if (!iso) return 'Just now';
  return iso.slice(0, 10);
}

export default function DealRoomViewer({ dealRoomData, token }: DealRoomViewerProps) {
  const maskedBaseDev = useMemo(
    () => maskDevelopmentForPublicDealRoom(dealRoomData.development),
    [dealRoomData.development]
  );

  const [comments, setComments] = useState<ProjectComment[]>(
    () => maskedBaseDev.commentsLedger ?? []
  );
  const [activeTab, setActiveTab] = useState<OperationalTab>('units');
  const [showAfterTax, setShowAfterTax] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  // External Comment Ledger Filter & Submission Form State
  const [activeFilter, setActiveFilter] = useState<'All' | ProjectCommentStatus>('All');
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState<ProjectCollaboratorRole>('Quantity Surveyor (QS)');
  const [sectionTag, setSectionTag] = useState<ProjectCommentSectionTag>('General');
  const [message, setMessage] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);

  const effectiveDevelopment = useMemo(
    () => ({
      ...maskedBaseDev,
      commentsLedger: comments,
    }),
    [maskedBaseDev, comments]
  );

  const financials = useMemo(
    () =>
      calculateDevelopmentFinancials(
        effectiveDevelopment,
        undefined,
        dealRoomData.sponsor.entityName
      ),
    [effectiveDevelopment, dealRoomData.sponsor.entityName]
  );

  const zoningEnvelope = useMemo(() => {
    if (!effectiveDevelopment.zoningProfile) return null;
    return calculateZoningEnvelope(
      effectiveDevelopment.zoningProfile,
      effectiveDevelopment.totalBuildableAreaSqm,
      effectiveDevelopment.units?.length || 0
    );
  }, [effectiveDevelopment]);

  const commentCounts = useMemo(() => getProjectCommentCounts(comments), [comments]);
  const openCommentsCount = useMemo(() => countOpenProjectComments(comments), [comments]);
  const filteredComments = useMemo(
    () => filterProjectComments(comments, activeFilter),
    [comments, activeFilter]
  );

  const handleExportTeamExcel = async () => {
    await exportDevelopmentProjectToExcel(
      effectiveDevelopment,
      financials,
      undefined,
      dealRoomData.sponsor.entityName
    );
    trackPrivacySafeEvent('deal_room_excel_exported', {
      development_type: effectiveDevelopment.developmentType,
      units_count: financials.totalUnitsCount,
      is_demo: dealRoomData.isDemo,
    });
    setExportToast('5-Sheet External Team Workbook (.xlsx) exported!');
    window.setTimeout(() => setExportToast(null), 4000);
  };

  const handleJumpToLedger = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('deal-room-ledger');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmitExternalComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    setCommentSuccess(null);

    const trimmedAuthor = authorName.trim();
    const trimmedMessage = message.trim();

    if (!trimmedAuthor || !trimmedMessage) {
      setCommentError('Please enter your name/practice and a team note before submitting.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await submitDevelopmentComment({
        token,
        authorName: trimmedAuthor,
        authorRole,
        sectionTag,
        message: trimmedMessage,
      });

      if (!res.success || !res.comment) {
        setCommentError(res.error || 'Unable to submit comment right now.');
        return;
      }

      setComments((prev) => mergeProjectComments([res.comment!], prev));
      setMessage('');
      setCommentSuccess(
        'Note submitted as Pending. The developer will review and triage your query.'
      );
      trackPrivacySafeEvent('deal_room_external_comment_submitted', {
        role: authorRole,
        section_tag: sectionTag,
        development_type: effectiveDevelopment.developmentType,
      });
    } catch (err: any) {
      setCommentError(err?.message || 'Unexpected error submitting comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const noop = () => {};

  return (
    <div
      data-sensitive="true"
      data-testid="public-deal-room-viewer"
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col"
    >
      {/* Standalone Institutional Deal Room Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                <Lock className="w-3 h-3" />
                External Deal Room &bull; Read-Only
              </span>
              <span
                data-testid="deal-room-popia-badge"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
              >
                <ShieldCheck className="w-3 h-3" />
                POPIA Privacy Masked
              </span>
              {dealRoomData.isDemo && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Demo Portfolio
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <HardHat className="w-5 h-5 text-amber-400 shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                {effectiveDevelopment.title}
              </h1>
            </div>

            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>
                {effectiveDevelopment.address}, {effectiveDevelopment.city}
                {effectiveDevelopment.province ? ` (${effectiveDevelopment.province})` : ''}
              </span>
              <span>&bull;</span>
              <span className="text-slate-300 font-medium">
                {effectiveDevelopment.developmentType}
              </span>
              <span>&bull;</span>
              <span className="text-slate-300">Phase: {effectiveDevelopment.currentPhase}</span>
              <span>&bull;</span>
              <span className="text-slate-300">
                Sponsor: <strong className="text-white">{dealRoomData.sponsor.entityName}</strong>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              data-testid="deal-room-ledger-jump-btn"
              onClick={handleJumpToLedger}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/40 cursor-pointer transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{`Team Ledger (${openCommentsCount} Open)`}</span>
            </button>
            <button
              type="button"
              data-testid="deal-room-export-excel-btn"
              onClick={handleExportTeamExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Team Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {exportToast && (
          <div
            role="status"
            data-testid="deal-room-export-toast"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportToast}</span>
          </div>
        )}

        {/* Zoning & Bulk Envelope Strip */}
        {effectiveDevelopment.zoningProfile && zoningEnvelope && (
          <div
            data-testid="deal-room-zoning-strip"
            className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-400">
                {formatZoningTransitionLabel(
                  effectiveDevelopment.zoningProfile.currentZoning,
                  effectiveDevelopment.zoningProfile.targetZoning
                )}
              </span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-300">
                Erf: {effectiveDevelopment.zoningProfile.erfSizeSqm.toLocaleString('en-ZA')} m²
                &bull; FAR {effectiveDevelopment.zoningProfile.farRatio} (
                {effectiveDevelopment.totalBuildableAreaSqm} / {zoningEnvelope.maxPermittedBulkSqm} m²
                Bulk &bull; {zoningEnvelope.bulkUtilizationPercent}%)
              </span>
            </div>
            <div>
              {zoningEnvelope.isSplumaRezoningTriggered ? (
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

        {/* Executive KPI & Debt-Wipeout Banner */}
        <DevelopmentKpiBanner
          development={effectiveDevelopment}
          financials={financials}
          showAfterTax={showAfterTax}
          onToggleAfterTax={() => setShowAfterTax((prev) => !prev)}
        />

        {/* 4 Read-Only Operational Tabs */}
        <section className="space-y-4">
          <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
            {[
              {
                id: 'units',
                label: `Unit Inventory & Split-Exit (${effectiveDevelopment.units?.length || 0})`,
                icon: Building,
              },
              { id: 'costs', label: 'Cost Stack & Hard Build BOQ', icon: FileSpreadsheet },
              { id: 'approvals', label: 'Paper Rights & Approvals (6)', icon: FileCheck },
              { id: 'finance', label: 'Finance & Pre-Sales Gate', icon: Coins },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                data-testid={`deal-room-tab-${id}`}
                onClick={() => setActiveTab(id as OperationalTab)}
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
            <div id="deal-room-inventory">
              <DevelopmentUnitInventoryTab
                development={effectiveDevelopment}
                financials={financials}
                readOnly={true}
                onUpdateUnit={noop}
                onAddUnit={noop}
                onDeleteUnit={noop}
                onMarkUnitSold={noop}
                onGraduateRetainedUnits={noop}
              />
            </div>
          )}

          {activeTab === 'costs' && (
            <div id="deal-room-costs">
              <DevelopmentCostStackTab
                development={effectiveDevelopment}
                financials={financials}
                readOnly={true}
                onUpdateSoftCosts={noop}
                onUpdateDevelopment={noop}
                onAddBOQItem={noop}
                onUpdateBOQItem={noop}
                onDeleteBOQItem={noop}
              />
            </div>
          )}

          {activeTab === 'approvals' && (
            <div id="deal-room-approvals">
              <DevelopmentApprovalsTab
                development={effectiveDevelopment}
                financials={financials}
                readOnly={true}
                onUpdateApproval={noop}
              />
            </div>
          )}

          {activeTab === 'finance' && (
            <div id="deal-room-finance">
              <DevelopmentFinanceTab
                development={effectiveDevelopment}
                financials={financials}
                readOnly={true}
                onUpdateDevelopment={noop}
              />
            </div>
          )}
        </section>

        {/* External Collaborator Comments & Action Ledger */}
        <section
          id="deal-room-ledger"
          data-testid="deal-room-ledger-section"
          className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
        >
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">
                    Team Comments & Action Ledger
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {openCommentsCount} Open
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consultants can filter notes and submit new Pending queries. Status triage and deletion are restricted to the developer.
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['All', ...PROJECT_COMMENT_STATUSES] as const).map((statusKey) => {
                const isActive = activeFilter === statusKey;
                const count = commentCounts[statusKey];
                return (
                  <button
                    key={statusKey}
                    type="button"
                    data-testid={`deal-room-filter-${statusKey}`}
                    onClick={() => setActiveFilter(statusKey)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {statusKey} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Existing Comments List */}
            <div className="lg:col-span-7 space-y-3">
              {filteredComments.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/70">
                  <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    {comments.length === 0
                      ? 'No team notes logged on this project yet.'
                      : `No comments matching "${activeFilter}".`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Use the form alongside to log a Pending query for the developer.
                  </p>
                </div>
              ) : (
                filteredComments.map((comment) => (
                  <article
                    key={comment.id}
                    data-testid={`deal-room-comment-${comment.id}`}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-900 text-white">
                        {comment.authorRole}
                      </span>
                      {comment.sectionTag && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-slate-300">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {comment.sectionTag}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          STATUS_BADGE_STYLES[comment.status]
                        }`}
                      >
                        {comment.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {comment.message}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        {comment.authorName}
                      </span>
                      <span>Logged {formatDateBadge(comment.createdAt)}</span>
                      {comment.status === 'Resolved' && comment.resolvedAt && (
                        <span className="text-emerald-700 font-medium">
                          Resolved {formatDateBadge(comment.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* External Collaborator Pending Comment Form */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleSubmitExternalComment}
                data-testid="deal-room-add-comment-form"
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    Submit External Review Note
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Logs as Pending
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="deal-room-author-input"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    Your Name / Practice
                  </label>
                  <input
                    id="deal-room-author-input"
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Thabo Mokoena (QS)"
                    data-testid="deal-room-author-input"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="deal-room-role-select"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Discipline / Role
                    </label>
                    <select
                      id="deal-room-role-select"
                      value={authorRole}
                      onChange={(e) =>
                        setAuthorRole(e.target.value as ProjectCollaboratorRole)
                      }
                      data-testid="deal-room-role-select"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      {PROJECT_COLLABORATOR_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="deal-room-section-select"
                      className="block text-[11px] font-semibold text-slate-600 mb-1"
                    >
                      Project Section
                    </label>
                    <select
                      id="deal-room-section-select"
                      value={sectionTag}
                      onChange={(e) =>
                        setSectionTag(e.target.value as ProjectCommentSectionTag)
                      }
                      data-testid="deal-room-section-select"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      {PROJECT_COMMENT_SECTION_TAGS.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="deal-room-message-input"
                    className="block text-[11px] font-semibold text-slate-600 mb-1"
                  >
                    Review Query or Scope Note
                  </label>
                  <textarea
                    id="deal-room-message-input"
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (commentError) setCommentError(null);
                    }}
                    placeholder="Flag BOQ variances, municipal bulk conditions, or funding covenants..."
                    data-testid="deal-room-message-input"
                    className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {commentError && (
                  <p
                    role="alert"
                    data-testid="deal-room-comment-error"
                    className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-2"
                  >
                    {commentError}
                  </p>
                )}

                {commentSuccess && (
                  <p
                    role="status"
                    data-testid="deal-room-comment-success"
                    className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2"
                  >
                    {commentSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  data-testid="deal-room-submit-comment-btn"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmittingComment ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Submit Pending Comment</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center text-xs text-slate-500 py-5 border-t border-slate-200 bg-white">
        Operated by{' '}
        <strong className="font-semibold text-slate-700">Moremela Properties (Pty) Ltd</strong>{' '}
        (2026/838397/07) as POPIA Operator &bull;{' '}
        <Link
          href="/privacy"
          className="text-emerald-700 hover:text-emerald-800 underline font-semibold"
        >
          Privacy Notice
        </Link>
      </footer>
    </div>
  );
}

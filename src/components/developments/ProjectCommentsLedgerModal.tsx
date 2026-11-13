'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  ListTodo,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  DevelopmentProject,
  ProjectCollaboratorRole,
  ProjectComment,
  ProjectCommentSectionTag,
  ProjectCommentStatus,
} from '@/types';
import {
  PROJECT_COLLABORATOR_ROLES,
  PROJECT_COMMENT_SECTION_TAGS,
  PROJECT_COMMENT_STATUSES,
  buildProjectCommentTaskId,
  countOpenProjectComments,
  createProjectComment,
  filterProjectComments,
  getProjectCommentCounts,
} from '@/lib/calculations/commentsLedger';
import { trackPrivacySafeEvent } from '@/lib/analytics/posthogClient';
import { hydrateNow, useCloudSyncStore } from '@/hooks/useAutoCloudSync';
import { getExternalDevelopmentComments } from '@/app/actions/submitDevelopmentComment';

export interface ProjectCommentsLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  development: DevelopmentProject;
  defaultAuthorName?: string;
  readOnly?: boolean;
  existingTaskIds: Set<string>;
  onAddComment: (comment: ProjectComment) => void;
  onTransitionStatus: (commentId: string, nextStatus: ProjectCommentStatus) => void;
  onDeleteComment: (commentId: string) => void;
  onSyncCommentToTask: (comment: ProjectComment) => void;
}

const STATUS_BADGE_CLASSES: Record<ProjectCommentStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  Resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

const FILTER_OPTIONS: readonly ('All' | ProjectCommentStatus)[] = [
  'All',
  'Pending',
  'In Progress',
  'Resolved',
];

export default function ProjectCommentsLedgerModal({
  isOpen,
  onClose,
  development,
  defaultAuthorName,
  readOnly = false,
  existingTaskIds,
  onAddComment,
  onTransitionStatus,
  onDeleteComment,
  onSyncCommentToTask,
}: ProjectCommentsLedgerModalProps) {
  const [activeFilter, setActiveFilter] = useState<'All' | ProjectCommentStatus>('All');
  const [authorName, setAuthorName] = useState<string>(defaultAuthorName || 'Lead Sponsor');
  const [authorRole, setAuthorRole] = useState<ProjectCollaboratorRole>('Quantity Surveyor (QS)');
  const [sectionTag, setSectionTag] = useState<ProjectCommentSectionTag>('General');
  const [status, setStatus] = useState<ProjectCommentStatus>('Pending');
  const [message, setMessage] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const hasEditedAuthorRef = useRef(false);
  const latestDevRef = useRef(development);
  const onAddCommentRef = useRef(onAddComment);
  const isMountedRef = useRef(true);

  latestDevRef.current = development;
  onAddCommentRef.current = onAddComment;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkExternalComments = async () => {
    if (readOnly || !latestDevRef.current?.id) return;
    if (isMountedRef.current) setIsSyncingCloud(true);
    try {
      const auth = useCloudSyncStore.getState().isAuthenticated;
      if (auth) {
        await hydrateNow();
      }
      const currentDev = latestDevRef.current;
      const res = await getExternalDevelopmentComments({
        developmentId: currentDev.id,
        shareToken: currentDev.shareToken,
      });
      if (res.success && Array.isArray(res.comments) && res.comments.length > 0) {
        const existingIds = new Set(
          (currentDev.commentsLedger ?? []).map((c) => c.id)
        );
        for (const incoming of res.comments) {
          if (incoming && incoming.id && !existingIds.has(incoming.id)) {
            existingIds.add(incoming.id);
            onAddCommentRef.current(incoming);
          }
        }
      }
    } catch {
      // Gracefully continue offline
    } finally {
      if (isMountedRef.current) setIsSyncingCloud(false);
    }
  };

  useEffect(() => {
    if (isOpen && !readOnly && development?.id) {
      void checkExternalComments();
    }
  }, [isOpen, readOnly, development?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setActiveFilter('All');
    setFormError('');
  }, [development.id]);

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    const fallbackAuthor = defaultAuthorName?.trim();
    if (fallbackAuthor) {
      setAuthorName((prev) => {
        if (!hasEditedAuthorRef.current || !prev.trim()) {
          hasEditedAuthorRef.current = false;
          return fallbackAuthor;
        }
        return prev;
      });
    }
  }, [isOpen, defaultAuthorName, development.id]);

  if (!isOpen) return null;

  const comments = development.commentsLedger ?? [];
  const counts = getProjectCommentCounts(comments);
  const openCount = countOpenProjectComments(comments);
  const filteredComments = filterProjectComments(comments, activeFilter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setFormError('Please enter a comment or action note before logging.');
      return;
    }

    const effectiveAuthor = authorName.trim() || defaultAuthorName?.trim() || 'Lead Sponsor';
    const newComment = createProjectComment({
      authorName: effectiveAuthor,
      authorRole,
      sectionTag,
      message: trimmedMsg,
      status,
    });

    onAddComment(newComment);
    trackPrivacySafeEvent('development_comment_added', {
      role: newComment.authorRole,
      section_tag: newComment.sectionTag || 'General',
      status: newComment.status,
      development_type: development.developmentType,
    });

    if (!authorName.trim()) {
      hasEditedAuthorRef.current = false;
      setAuthorName(effectiveAuthor);
    }
    setMessage('');
    setStatus('Pending');
    setFormError('');
  };

  const handleStatusChange = (comment: ProjectComment, nextStatus: ProjectCommentStatus) => {
    if (readOnly || comment.status === nextStatus) return;
    onTransitionStatus(comment.id, nextStatus);
    trackPrivacySafeEvent('development_comment_status_updated', {
      role: comment.authorRole,
      section_tag: comment.sectionTag || 'General',
      previous_status: comment.status,
      next_status: nextStatus,
    });
  };

  const handleSyncToTask = (comment: ProjectComment) => {
    if (readOnly) return;
    onSyncCommentToTask(comment);
    trackPrivacySafeEvent('development_comment_synced_to_task', {
      role: comment.authorRole,
      section_tag: comment.sectionTag || 'General',
      status: comment.status,
    });
  };

  const getFilterPillClass = (pill: 'All' | ProjectCommentStatus, isSelected: boolean): string => {
    if (pill === 'All') {
      return isSelected
        ? 'bg-slate-900 text-white border-slate-900'
        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
    }
    const baseColor = STATUS_BADGE_CLASSES[pill];
    return isSelected
      ? `${baseColor} ring-2 ring-offset-1 ring-slate-400 font-semibold`
      : `${baseColor} opacity-80 hover:opacity-100`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-comments-ledger-title"
      data-testid="project-comments-ledger-modal"
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="project-comments-ledger-title"
                  className="text-lg font-bold text-slate-900 truncate"
                >
                  Team Comments & Action Ledger
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {openCount} Open
                </span>
                {readOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                    <Lock className="w-3 h-3" />
                    Read-Only View
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {development.title} — External consultant queries, municipal conditions, and JV action triage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!readOnly && (
              <button
                type="button"
                disabled={isSyncingCloud}
                onClick={checkExternalComments}
                data-testid="sync-ledger-cloud-btn"
                title="Sync external Deal Room & cloud comments"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">{isSyncingCloud ? 'Syncing...' : 'Sync Cloud'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close team comments ledger"
              data-testid="close-ledger-modal-btn"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Read-Only Banner */}
        {readOnly && (
          <div
            className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs font-medium text-slate-700"
            data-testid="ledger-readonly-banner"
          >
            <Lock className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              Read-Only Deal Room Preview is active. You can filter and inspect consultant notes, while adding, triaging, deleting, and task syncing are locked.
            </span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Filter comments by status">
            {FILTER_OPTIONS.map((pill) => {
              const isSelected = activeFilter === pill;
              return (
                <button
                  key={pill}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`ledger-filter-${pill}`}
                  onClick={() => setActiveFilter(pill)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer ${getFilterPillClass(
                    pill,
                    isSelected
                  )}`}
                >
                  {`${pill} (${counts[pill]})`}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredComments.length} of {counts.All} logged notes
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Add Comment Form (Hidden in Read-Only mode) */}
          {!readOnly && (
            <form
              onSubmit={handleSubmit}
              data-testid="add-comment-form"
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Log New Team Note or Consultant Query
                </h3>
                <span className="text-[11px] text-slate-500">
                  Persisted with project &amp; included in 5-sheet Excel export
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label
                    htmlFor="comment-author-name"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Author Name
                  </label>
                  <input
                    id="comment-author-name"
                    type="text"
                    value={authorName}
                    onChange={(e) => {
                      hasEditedAuthorRef.current = true;
                      setAuthorName(e.target.value);
                    }}
                    placeholder="e.g. K. Naidoo (QS)"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="comment-author-role"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Collaborator Role
                  </label>
                  <select
                    id="comment-author-role"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value as ProjectCollaboratorRole)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    htmlFor="comment-section-tag"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Section Tag
                  </label>
                  <select
                    id="comment-section-tag"
                    value={sectionTag}
                    onChange={(e) => setSectionTag(e.target.value as ProjectCommentSectionTag)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {PROJECT_COMMENT_SECTION_TAGS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="comment-initial-status"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Initial Status
                  </label>
                  <select
                    id="comment-initial-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectCommentStatus)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {PROJECT_COMMENT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="comment-message"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Comment / Action Note
                </label>
                <textarea
                  id="comment-message"
                  rows={2}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Document QS allowances, council SPLUMA conditions, bank credit queries, or JV pricing alignment..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {formError && (
                  <p className="text-xs text-rose-600 mt-1" role="alert">
                    {formError}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  data-testid="submit-comment-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Project Ledger
                </button>
              </div>
            </form>
          )}

          {/* Comment Cards */}
          {filteredComments.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">
                No {activeFilter === 'All' ? '' : `${activeFilter} `}comments logged yet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {readOnly
                  ? 'Switch filters above to inspect other ledger statuses.'
                  : 'Log external consultant notes above to track action items across builds and approvals.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="comments-ledger-list">
              {filteredComments.map((comment) => {
                const taskId = buildProjectCommentTaskId(development.id, comment.id);
                const isAlreadySynced = existingTaskIds.has(taskId);
                const badgeClass = STATUS_BADGE_CLASSES[comment.status] || STATUS_BADGE_CLASSES.Pending;

                return (
                  <article
                    key={comment.id}
                    data-testid={`comment-card-${comment.id}`}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {comment.authorName}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {comment.authorRole}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Tag className="w-3 h-3" />
                          {comment.sectionTag || 'General'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {comment.createdAt ? comment.createdAt.slice(0, 10) : ''}
                        </span>
                        <span
                          data-testid={`comment-status-badge-${comment.id}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${badgeClass}`}
                        >
                          {comment.status === 'Pending' && <Clock className="w-3 h-3" />}
                          {comment.status === 'In Progress' && <Loader2 className="w-3 h-3" />}
                          {comment.status === 'Resolved' && <CheckCircle2 className="w-3 h-3" />}
                          {comment.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {comment.message}
                    </p>

                    {comment.status === 'Resolved' && comment.resolvedAt && (
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Resolved on {comment.resolvedAt.slice(0, 10)}
                      </p>
                    )}

                    {/* Action Bar (Hidden in Read-Only mode) */}
                    {!readOnly && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        {/* 1-Click Inline Status Triage */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-medium text-slate-500 mr-1">
                            Triage:
                          </span>
                          {PROJECT_COMMENT_STATUSES.map((st) => {
                            const isActive = comment.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                data-testid={`triage-btn-${comment.id}-${st}`}
                                onClick={() => handleStatusChange(comment, st)}
                                aria-pressed={isActive}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                                  isActive
                                    ? `${STATUS_BADGE_CLASSES[st]} font-semibold shadow-2xs`
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>

                        {/* Sync to /tasks & Delete */}
                        <div className="flex items-center gap-2">
                          {(comment.status !== 'Resolved' || isAlreadySynced) && (
                            <button
                              type="button"
                              disabled={isAlreadySynced}
                              data-testid={`sync-task-btn-${comment.id}`}
                              onClick={() => handleSyncToTask(comment)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                                isAlreadySynced
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              {isAlreadySynced ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Synced to /tasks
                                </>
                              ) : (
                                <>
                                  <ListTodo className="w-3 h-3" />
                                  Sync to /tasks
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            data-testid={`delete-comment-btn-${comment.id}`}
                            aria-label={`Delete comment from ${comment.authorName}`}
                            onClick={() => onDeleteComment(comment.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

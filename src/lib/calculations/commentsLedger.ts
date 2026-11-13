/**
 * South African Property Portfolio Hub — Pure Calculations Engine: Project Comments & Action Ledger
 * Tier 4 Pure Engine: 100% deterministic, side-effect-free helpers.
 * Zero imports from React, Next.js, or Zustand store slices.
 * Strictly adheres to ARCHITECTURE.md Separation of Concerns.
 */

import {
  DevelopmentProject,
  ProjectCollaboratorRole,
  ProjectComment,
  ProjectCommentSectionTag,
  ProjectCommentStatus,
  TaskItem,
} from '@/types';

export const PROJECT_COMMENT_STATUSES: readonly ProjectCommentStatus[] = [
  'Pending',
  'In Progress',
  'Resolved',
];

export const PROJECT_COLLABORATOR_ROLES: readonly ProjectCollaboratorRole[] = [
  'Lead Sponsor',
  'Co-Developer / JV',
  'Quantity Surveyor (QS)',
  'Town Planner',
  'Architect / Engineer',
  'Lender / Funder',
  'Sales Agent',
  'External Team',
];

export const PROJECT_COMMENT_SECTION_TAGS: readonly ProjectCommentSectionTag[] = [
  'General',
  'Unit Schedule',
  'BOQ & Cost Stack',
  'Paper Rights & Approvals',
  'Finance & Pre-Sales',
];

export interface CreateProjectCommentInput {
  id?: string;
  authorName: string;
  authorRole?: ProjectCollaboratorRole;
  sectionTag?: ProjectCommentSectionTag;
  message: string;
  status?: ProjectCommentStatus;
  createdAt?: string;
}

export function isValidProjectComment(value: unknown): value is ProjectComment {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as ProjectComment).id === 'string' &&
    typeof (value as ProjectComment).message === 'string'
  );
}

/**
 * Counts open collaboration ledger items ('Pending' or 'In Progress').
 */
export function countOpenProjectComments(
  comments?: ProjectComment[] | null
): number {
  if (!Array.isArray(comments) || comments.length === 0) return 0;
  return comments.filter(
    (c) =>
      isValidProjectComment(c) &&
      (c.status === 'Pending' || c.status === 'In Progress')
  ).length;
}

/**
 * Computes summary counts across all comment ledger statuses.
 */
export function getProjectCommentCounts(
  comments?: ProjectComment[] | null
): Record<'All' | ProjectCommentStatus, number> {
  const safe = Array.isArray(comments) ? comments.filter(isValidProjectComment) : [];
  let pending = 0;
  let inProgress = 0;
  let resolved = 0;

  for (const c of safe) {
    if (c.status === 'Pending') pending++;
    else if (c.status === 'In Progress') inProgress++;
    else if (c.status === 'Resolved') resolved++;
  }

  return {
    All: safe.length,
    Pending: pending,
    'In Progress': inProgress,
    Resolved: resolved,
  };
}

/**
 * Filters comments by status and sorts newest-first without mutating the source array.
 */
export function filterProjectComments(
  comments: ProjectComment[] | null | undefined,
  filter: 'All' | ProjectCommentStatus
): ProjectComment[] {
  if (!Array.isArray(comments) || comments.length === 0) return [];
  const valid = comments.filter(isValidProjectComment);
  const filtered =
    filter === 'All'
      ? valid
      : valid.filter((c) => c.status === filter);

  return [...filtered].sort((a, b) => {
    const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
    const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
    const safeA = Number.isFinite(timeA) ? timeA : 0;
    const safeB = Number.isFinite(timeB) ? timeB : 0;
    if (safeB !== safeA) return safeB - safeA;
    return (b.id || '').localeCompare(a.id || '');
  });
}

/**
 * Creates a normalized ProjectComment record.
 * Trims inputs, applies safe author/role/section fallbacks, and auto-stamps resolvedAt when initial status is 'Resolved'.
 */
export function createProjectComment(
  input: CreateProjectCommentInput,
  nowIso?: string
): ProjectComment {
  const timestamp = nowIso || input.createdAt || new Date().toISOString();
  const trimmedAuthor = (input.authorName || '').trim() || 'External Collaborator';
  const trimmedMessage = (input.message || '').trim();
  const status: ProjectCommentStatus = input.status || 'Pending';
  const authorRole: ProjectCollaboratorRole = input.authorRole || 'External Team';
  const sectionTag: ProjectCommentSectionTag = input.sectionTag || 'General';
  const id =
    (input.id || '').trim() ||
    `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const comment: ProjectComment = {
    id,
    authorName: trimmedAuthor,
    authorRole,
    sectionTag,
    message: trimmedMessage,
    status,
    createdAt: timestamp,
  };

  if (status === 'Resolved') {
    comment.resolvedAt = timestamp;
  }

  return comment;
}

/**
 * Transitions a comment's status immutably.
 * Stamps resolvedAt when moving to 'Resolved', and clears resolvedAt when reopened to 'Pending' or 'In Progress'.
 */
export function transitionProjectCommentStatus(
  comments: ProjectComment[] | null | undefined,
  commentId: string,
  nextStatus: ProjectCommentStatus,
  nowIso?: string
): ProjectComment[] {
  if (!Array.isArray(comments)) return [];
  const timestamp = nowIso || new Date().toISOString();

  return comments.map((c) => {
    if (!c || c.id !== commentId) return c;
    if (nextStatus === 'Resolved') {
      return {
        ...c,
        status: 'Resolved',
        resolvedAt: c.status === 'Resolved' && c.resolvedAt ? c.resolvedAt : timestamp,
      };
    }
    const { resolvedAt: _cleared, ...rest } = c;
    return {
      ...rest,
      status: nextStatus,
    };
  });
}

/**
 * Immutably removes a comment from the project ledger.
 */
export function removeProjectComment(
  comments: ProjectComment[] | null | undefined,
  commentId: string
): ProjectComment[] {
  if (!Array.isArray(comments)) return [];
  return comments.filter((c) => c && c.id !== commentId);
}

/**
 * Deterministic TaskItem ID for a synced development comment.
 * Distinct from `task-dev-approval-${devId}-` in taskSync.ts.
 */
export function buildProjectCommentTaskId(devId: string, commentId: string): string {
  return `task-dev-comment-${devId}-${commentId}`;
}

function normalizeIsoDateOnly(baseIso?: string): string {
  const fallback = new Date().toISOString().split('T')[0];
  if (!baseIso || typeof baseIso !== 'string') return fallback;
  const datePart = baseIso.trim().slice(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
      dt.getUTCFullYear() === year &&
      dt.getUTCMonth() === month - 1 &&
      dt.getUTCDate() === day
    ) {
      return datePart;
    }
  }
  const parsed = Date.parse(baseIso);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().split('T')[0] : fallback;
}

function addDaysToIsoDate(baseIso: string, days: number): string {
  const normalized = normalizeIsoDateOnly(baseIso);
  const [year, month, day] = normalized.split('-').map(Number);
  const utcMs = Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000;
  return new Date(utcMs).toISOString().split('T')[0];
}

/**
 * Builds a deterministic TaskItem from a ProjectComment for 1-click syncing to `/tasks`.
 */
export function buildTaskFromProjectComment(
  dev: Pick<DevelopmentProject, 'id' | 'title'>,
  comment: ProjectComment,
  todayIso?: string
): TaskItem {
  const baseDate = normalizeIsoDateOnly(todayIso);
  const dueDate = addDaysToIsoDate(baseDate, 3);
  const sectionLabel = comment.sectionTag || 'General';
  const cleanMsg = (comment.message || '').trim();
  const shortSummary =
    cleanMsg.length > 72 ? `${cleanMsg.slice(0, 69)}...` : cleanMsg || 'Follow up on team note';

  return {
    id: buildProjectCommentTaskId(dev.id, comment.id),
    title: `[${sectionLabel}] ${comment.authorRole}: ${shortSummary}`,
    description: [
      `Project: ${dev.title}`,
      `Section: ${sectionLabel}`,
      `Collaborator: ${comment.authorName} (${comment.authorRole})`,
      `Ledger Status: ${comment.status}`,
      '',
      cleanMsg,
    ].join('\n'),
    dueDate,
    priority: comment.status === 'Pending' ? 'High' : 'Medium',
    status: 'Pending',
    linkedEntity: {
      type: 'development',
      id: dev.id,
      name: dev.title,
    },
    createdAt: baseDate,
  };
}

/**
 * Pure predicate identifying stock demo development IDs (`dev-1`, `dev-2`, `demo-dev-*`).
 */
export function isDemoDevelopment(devId?: string | null): boolean {
  if (!devId || typeof devId !== 'string') return false;
  return devId === 'dev-1' || devId === 'dev-2' || devId.startsWith('demo-dev-');
}

/**
 * POPIA-safe masker for external `/deal-room/[token]` viewers and external Excel packs.
 * Strips capability `shareToken`, strips `conveyancerRef`, and masks individual `buyerName`
 * while preserving unit financials, counts, and sale status for consultant review.
 */
export function maskDevelopmentForPublicDealRoom(dev: DevelopmentProject): DevelopmentProject {
  const {
    shareToken: _strippedToken,
    driveVault: _strippedDriveVault,
    notes: _strippedNotes,
    ...devRest
  } = dev;
  const maskedUnits = Array.isArray(dev.units)
    ? dev.units.map((unit) => {
        const {
          buyerName,
          conveyancerRef: _strippedConveyancerRef,
          ...unitRest
        } = unit;
        const hasBuyer = typeof buyerName === 'string' && buyerName.trim().length > 0;
        const isCommittedSale =
          unit.status === 'Sold & Transferred' ||
          unit.status === 'Bond Approved / Guarantees Issued' ||
          unit.status === 'Reserved (OTP Signed)';
        return {
          ...unitRest,
          buyerName: hasBuyer || isCommittedSale ? 'Private Buyer (Masked)' : undefined,
        };
      })
    : [];

  return {
    ...devRest,
    units: maskedUnits,
    commentsLedger: Array.isArray(dev.commentsLedger)
      ? dev.commentsLedger.filter(isValidProjectComment).map((c) => ({ ...c }))
      : [],
  };
}

/**
 * Merges incoming comments into an existing ledger, deduplicating by comment `id`
 * and preserving existing entries first so developer triage states are not clobbered.
 */
export function mergeProjectComments(
  existing: ProjectComment[] | null | undefined,
  incoming: ProjectComment[] | null | undefined
): ProjectComment[] {
  const result: ProjectComment[] = [];
  const seenIds = new Set<string>();

  if (Array.isArray(existing)) {
    for (const c of existing) {
      if (isValidProjectComment(c) && !seenIds.has(c.id)) {
        seenIds.add(c.id);
        result.push(c);
      }
    }
  }

  if (Array.isArray(incoming)) {
    for (const c of incoming) {
      if (isValidProjectComment(c) && !seenIds.has(c.id)) {
        seenIds.add(c.id);
        result.push(c);
      }
    }
  }

  return result;
}

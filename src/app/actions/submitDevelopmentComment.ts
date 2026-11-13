'use server';

import { createClient } from '@supabase/supabase-js';
import {
  ProjectCollaboratorRole,
  ProjectComment,
  ProjectCommentSectionTag,
} from '@/types';
import { INITIAL_DEVELOPMENTS } from '@/lib/store/initialData';
import {
  PROJECT_COLLABORATOR_ROLES,
  PROJECT_COMMENT_SECTION_TAGS,
  createProjectComment,
  isDemoDevelopment,
  isValidProjectComment,
  mergeProjectComments,
} from '@/lib/calculations/commentsLedger';

export interface SubmitDevelopmentCommentPayload {
  token: string;
  authorName: string;
  authorRole?: ProjectCollaboratorRole;
  sectionTag?: ProjectCommentSectionTag;
  message: string;
}

export interface SubmitDevelopmentCommentResult {
  success: boolean;
  comment?: ProjectComment;
  error?: string;
}

export interface GetExternalDevelopmentCommentsParams {
  developmentId?: string;
  shareToken?: string;
}

export interface GetExternalDevelopmentCommentsResult {
  success: boolean;
  comments: ProjectComment[];
  error?: string;
}

// Sliding-window rate limiting map (token -> submission timestamps ms)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_TOKEN = 3;

// In-memory store for external collaborator submissions keyed by devId and/or shareToken
// Avoids mutating INITIAL_DEVELOPMENTS while surviving across requests in a server session.
const inMemoryDealRoomComments = new Map<string, ProjectComment[]>();

function isRateLimited(tokenKey: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(tokenKey) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_TOKEN) {
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(tokenKey, validTimestamps);
  return false;
}

function recordInMemoryComment(key: string, comment: ProjectComment): void {
  if (!key) return;
  const existing = inMemoryDealRoomComments.get(key) || [];
  inMemoryDealRoomComments.set(key, mergeProjectComments(existing, [comment]));
}

function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function parseLedgerArray(raw: unknown): ProjectComment[] {
  if (Array.isArray(raw)) return raw.filter(isValidProjectComment);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isValidProjectComment) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Server Action: Rate-limited external intake for `/deal-room/[token]`.
 * Always forces `status: 'Pending'` server-side and validates token ownership.
 */
export async function submitDevelopmentComment(
  payload: SubmitDevelopmentCommentPayload
): Promise<SubmitDevelopmentCommentResult> {
  try {
    const cleanToken = typeof payload?.token === 'string' ? payload.token.trim() : '';
    const cleanMessage = typeof payload?.message === 'string' ? payload.message.trim() : '';
    const cleanAuthor = typeof payload?.authorName === 'string' ? payload.authorName.trim() : '';

    if (!cleanToken || !cleanMessage) {
      return {
        success: false,
        error: 'Missing required deal room token or collaborator comment.',
      };
    }

    if (!cleanAuthor) {
      return {
        success: false,
        error: 'Please enter your name or practice before posting a comment.',
      };
    }

    if (isRateLimited(cleanToken)) {
      return {
        success: false,
        error:
          'Too many team notes submitted recently on this deal room link. Please wait before posting again.',
      };
    }

    const validRole: ProjectCollaboratorRole = PROJECT_COLLABORATOR_ROLES.includes(
      payload.authorRole as ProjectCollaboratorRole
    )
      ? (payload.authorRole as ProjectCollaboratorRole)
      : 'External Team';

    const validSection: ProjectCommentSectionTag = PROJECT_COMMENT_SECTION_TAGS.includes(
      payload.sectionTag as ProjectCommentSectionTag
    )
      ? (payload.sectionTag as ProjectCommentSectionTag)
      : 'General';

    const newComment: ProjectComment = createProjectComment({
      id: `comment-ext-${crypto.randomUUID()}`,
      authorName: cleanAuthor.slice(0, 100),
      authorRole: validRole,
      sectionTag: validSection,
      message: cleanMessage.slice(0, 1000),
      status: 'Pending',
      createdAt: new Date().toISOString(),
    });

    const supabase = getServerSupabaseClient();
    if (supabase) {
      const { data: rows, error: fetchErr } = await supabase
        .from('developments')
        .select('id, comments_ledger, share_token')
        .eq('share_token', cleanToken);

      const matchingDev = !fetchErr && Array.isArray(rows) ? rows[0] : undefined;

      if (matchingDev) {
        const existingLedger = parseLedgerArray(matchingDev.comments_ledger);
        const updatedLedger = mergeProjectComments([newComment], existingLedger);

        const { error: updateErr } = await supabase
          .from('developments')
          .update({
            comments_ledger: updatedLedger as any,
            updated_at: new Date().toISOString(),
          })
          .eq('share_token', cleanToken);

        if (updateErr) {
          return {
            success: false,
            error: updateErr.message || 'Unable to save comment to cloud ledger.',
          };
        }

        recordInMemoryComment(cleanToken, newComment);
        if (matchingDev.id) {
          recordInMemoryComment(matchingDev.id, newComment);
        }

        return {
          success: true,
          comment: newComment,
        };
      }
    }

    // Demo development fallback (never mutates INITIAL_DEVELOPMENTS)
    const normalizedDemoId = cleanToken.startsWith('demo-')
      ? cleanToken.replace(/^demo-/, '')
      : cleanToken;
    const demoDev = INITIAL_DEVELOPMENTS.find(
      (d) =>
        isDemoDevelopment(d.id) &&
        (d.id === cleanToken || d.id === normalizedDemoId || d.shareToken === cleanToken)
    );

    if (demoDev) {
      recordInMemoryComment(cleanToken, newComment);
      if (normalizedDemoId && normalizedDemoId !== cleanToken) {
        recordInMemoryComment(normalizedDemoId, newComment);
      }
      recordInMemoryComment(demoDev.id, newComment);
      return {
        success: true,
        comment: newComment,
      };
    }

    return {
      success: false,
      error: 'Invalid or expired deal room link. Ask the developer to share a valid link.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to submit external comment.',
    };
  }
}

/**
 * Server Action: Collects externally submitted & cloud-persisted development comments
 * for a given project ID or share token so `/developments` auto-syncs on ledger open.
 */
export async function getExternalDevelopmentComments(
  params: GetExternalDevelopmentCommentsParams
): Promise<GetExternalDevelopmentCommentsResult> {
  try {
    const devId = typeof params?.developmentId === 'string' ? params.developmentId.trim() : '';
    const token = typeof params?.shareToken === 'string' ? params.shareToken.trim() : '';
    const normalizedDevId = devId.startsWith('demo-') ? devId.replace(/^demo-/, '') : devId;
    const normalizedTokenId = token.startsWith('demo-') ? token.replace(/^demo-/, '') : token;

    let collected: ProjectComment[] = [];

    // Capability model: a share token (or a stock demo project id) is required.
    // A guessable development id alone never unlocks cloud or in-memory ledger reads.
    if (devId && isDemoDevelopment(devId)) {
      collected = mergeProjectComments(collected, inMemoryDealRoomComments.get(devId));
    }
    if (normalizedDevId && normalizedDevId !== devId && isDemoDevelopment(normalizedDevId)) {
      collected = mergeProjectComments(collected, inMemoryDealRoomComments.get(normalizedDevId));
    }
    if (token) {
      collected = mergeProjectComments(collected, inMemoryDealRoomComments.get(token));
    }
    if (normalizedTokenId && normalizedTokenId !== token && isDemoDevelopment(normalizedTokenId)) {
      collected = mergeProjectComments(collected, inMemoryDealRoomComments.get(normalizedTokenId));
    }

    const supabase = getServerSupabaseClient();
    if (supabase && token) {
      const { data: rowsByToken, error: tokenErr } = await supabase
        .from('developments')
        .select('id, comments_ledger, share_token')
        .eq('share_token', token);

      if (!tokenErr && Array.isArray(rowsByToken)) {
        for (const row of rowsByToken) {
          collected = mergeProjectComments(collected, parseLedgerArray(row.comments_ledger));
        }
      }
    }

    return {
      success: true,
      comments: collected,
    };
  } catch (err: any) {
    return {
      success: false,
      comments: [],
      error: err?.message || 'Failed to retrieve external comments.',
    };
  }
}

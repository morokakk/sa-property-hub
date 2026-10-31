import { supabase } from '@/lib/supabaseClient';
import { sendFeedbackEmail } from '@/app/actions/sendFeedbackEmail';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import type { Json } from '@/types/supabase';

export type FeedbackCategory = 'bug' | 'feature' | 'data_math' | 'ux';

export interface FeedbackDiagnostics {
  viewport: string;
  storageMode: string;
  demoStatus: string;
  timestamp: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface FeedbackSubmissionPayload {
  category: FeedbackCategory;
  moduleRoute: string;
  message: string;
  contactOptional?: string | null;
  userId?: string | null;
  diagnostics: FeedbackDiagnostics;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  savedLocally: boolean;
  savedToSupabase: boolean;
  emailDispatched: boolean;
  entryId: string;
  error?: string;
}

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug / Issue',
  feature: 'Feature Request',
  data_math: 'SA Tax / Municipal Math',
  ux: 'General UX Feedback',
};

/**
 * Collects runtime client environment context for fast troubleshooting and diagnostics.
 * Adheres to POPIA data minimization (no passwords, banking numbers, or names).
 */
export function collectClientDiagnostics(): FeedbackDiagnostics {
  const isBrowser = typeof window !== 'undefined';
  const width = isBrowser && typeof window.innerWidth === 'number' ? window.innerWidth : 1280;
  const height = isBrowser && typeof window.innerHeight === 'number' ? window.innerHeight : 800;
  const deviceType = width < 768 ? 'Mobile' : width < 1024 ? 'Tablet' : 'Desktop';
  const viewport = `${width}x${height} (${deviceType})`;

  let storageMode = 'Local-First (Browser)';
  try {
    if (typeof localStorage !== 'undefined') {
      const isSynced = localStorage.getItem('cloud_sync_completed') === 'true';
      if (isSynced) {
        storageMode = 'Cloud Synced (Supabase)';
      }
    }
  } catch {
    // Storage access restricted
  }

  let demoStatus = 'Clean Slate';
  try {
    const { rentals = [], flips = [] } = usePortfolioStore.getState() || {};
    const hasDemoRentals = rentals.some((r) => r.id === 'rental-1' || r.id?.startsWith('demo-'));
    const hasDemoFlips = flips.some((f) => f.id === 'flip-1' || f.id?.startsWith('demo-'));

    if (hasDemoRentals || hasDemoFlips) {
      demoStatus = 'Demo Dataset Loaded';
    } else if (rentals.length === 0 && flips.length === 0) {
      demoStatus = 'Clean Slate / Empty Portfolio';
    } else {
      demoStatus = `Custom Portfolio (${rentals.length} rentals, ${flips.length} flips)`;
    }
  } catch {
    // Fallback if store is uninitialized
  }

  return {
    viewport,
    storageMode,
    demoStatus,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
}

/**
 * Dispatches feedback across 3 resilient layers:
 * 1. Synchronous localStorage fallback log (`sa_prop_hub_feedback_log`)
 * 2. Supabase `user_feedback` table (write-only RLS)
/**
 * Generates an RFC 4122 v4 UUID, falling back to a standards-compliant
 * random hex generator when crypto.randomUUID is not available (e.g. non-secure contexts or older mobile runtimes).
 */
export function generateFeedbackUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sanitizes a userId for PostgreSQL uuid column insertion.
 * Returns valid UUID or null if not valid UUID format.
 */
export function sanitizeFeedbackUuid(id?: string | null): string | null {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Dispatches feedback across 3 resilient layers:
 * 1. Synchronous localStorage fallback log (`sa_prop_hub_feedback_log`)
 * 2. Supabase `user_feedback` table (write-only RLS)
 * 3. Asynchronous Resend transactional email notification to the founder
 */
export async function submitFeedback(
  payload: FeedbackSubmissionPayload
): Promise<FeedbackSubmissionResult> {
  const entryId = generateFeedbackUuid();

  let rawUserId: string | null = payload.userId || null;
  if (!rawUserId) {
    try {
      const { data } = await supabase.auth.getSession();
      rawUserId = data?.session?.user?.id || null;
    } catch {
      // Offline or guest
    }
  }

  // Postgres uuid column requires valid UUID format; non-uuid identities remain in raw payload/email
  const dbUserId = sanitizeFeedbackUuid(rawUserId);

  // Layer 1: LocalStorage fallback log
  let savedLocally = false;
  try {
    if (typeof localStorage !== 'undefined') {
      const existingRaw = localStorage.getItem('sa_prop_hub_feedback_log');
      const existingList = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedList = [
        {
          id: entryId,
          userId: rawUserId,
          category: payload.category,
          moduleRoute: payload.moduleRoute,
          message: payload.message,
          contactOptional: payload.contactOptional || null,
          diagnostics: payload.diagnostics,
          createdAt: new Date().toISOString(),
        },
        ...(Array.isArray(existingList) ? existingList : []),
      ].slice(0, 50);

      localStorage.setItem('sa_prop_hub_feedback_log', JSON.stringify(updatedList));
      savedLocally = true;
    }
  } catch {
    // Quota exceeded or private browsing
  }

  // Layer 2: Supabase user_feedback table insert
  let savedToSupabase = false;
  try {
    const { error } = await supabase.from('user_feedback').insert({
      id: entryId,
      user_id: rawUserId,
      category: payload.category,
      module_route: payload.moduleRoute,
      message: payload.message,
      contact_optional: payload.contactOptional || null,
      diagnostics: payload.diagnostics as unknown as Json,
    });

    if (!error) {
      savedToSupabase = true;
    }
  } catch {
    // Supabase downtime or network failure
  }

  // Layer 3: Server Action Resend Email Alert
  let emailDispatched = false;
  try {
    const emailRes = await sendFeedbackEmail({
      category: payload.category,
      moduleRoute: payload.moduleRoute,
      message: payload.message,
      contactOptional: payload.contactOptional,
      userId: rawUserId,
      diagnostics: payload.diagnostics,
    });
    if (emailRes.success) {
      emailDispatched = true;
    }
  } catch {
    // Non-blocking email dispatch failure
  }

  const overallSuccess = savedLocally || savedToSupabase || emailDispatched;

  return {
    success: overallSuccess,
    savedLocally,
    savedToSupabase,
    emailDispatched,
    entryId,
    error: overallSuccess
      ? undefined
      : 'Failed to record feedback to local storage, database, or email notification.',
  };
}

/**
 * Formats a clean WhatsApp message payload for the user.
 */
export function formatFeedbackForWhatsApp(payload: FeedbackSubmissionPayload): string {
  const categoryLabel = FEEDBACK_CATEGORY_LABELS[payload.category] || payload.category;
  const diag = payload.diagnostics || {};
  const diagSummary = [diag.viewport, diag.storageMode, diag.demoStatus].filter(Boolean).join(' | ');

  return [
    `*SA PROP HUB — USER FEEDBACK*`,
    `📌 *Category:* ${categoryLabel}`,
    `📍 *Module:* ${payload.moduleRoute || '/'}`,
    `💬 *Message:*`,
    `${(payload.message || '').trim()}`,
    `📞 *Contact:* ${payload.contactOptional?.trim() || 'Not provided'}`,
    `⚙️ *Diagnostics:* ${diagSummary}`,
  ].join('\n');
}

/**
 * Generates direct wa.me link with founder WhatsApp number or universal fallback.
 */
export function buildFeedbackWhatsAppUrl(payload: FeedbackSubmissionPayload): string {
  const text = formatFeedbackForWhatsApp(payload);
  const rawNumber = process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP;
  let digits = '';

  if (rawNumber && rawNumber.trim()) {
    // Strip all non-digits except initial +
    let cleaned = rawNumber.trim().replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(1);
    }
    // Handle South Africa local format (082... -> 2782...)
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '27' + cleaned.slice(1);
    } else if (cleaned.startsWith('270') && cleaned.length === 12) {
      // Handle +27 (0)82... -> 27082... -> 2782...
      cleaned = '27' + cleaned.slice(3);
    }
    if (/^\d{8,15}$/.test(cleaned)) {
      digits = cleaned;
    }
  }

  const encodedText = encodeURIComponent(text);
  if (digits) {
    return `https://wa.me/${digits}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

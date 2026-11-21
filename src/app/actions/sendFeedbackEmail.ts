'use server';

import { Resend } from 'resend';
import {
  generateFeedbackEmailHtml,
  FEEDBACK_CATEGORY_LABELS,
  SendFeedbackEmailPayload,
} from '@/lib/feedback/feedbackEmailTemplate';

export type {
  FeedbackDiagnosticsPayload,
  SendFeedbackEmailPayload,
} from '@/lib/feedback/feedbackEmailTemplate';

export interface SendFeedbackEmailResult {
  success: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

// In-memory rate limiting map (IP/client -> timestamp array)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_RATE_LIMIT_KEYS = 500;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_DIAGNOSTIC_VALUE_LENGTH = 500;
const MAX_DIAGNOSTICS_KEYS = 10;

function pruneRateLimitMap(now: number): void {
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else if (valid.length !== timestamps.length) {
      rateLimitMap.set(key, valid);
    }
  }
  while (rateLimitMap.size >= MAX_RATE_LIMIT_KEYS) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey === undefined) break;
    rateLimitMap.delete(oldestKey);
  }
}

function sanitizeDiagnostics(
  diagnostics?: SendFeedbackEmailPayload['diagnostics']
): SendFeedbackEmailPayload['diagnostics'] {
  if (!diagnostics || typeof diagnostics !== 'object') return undefined;
  const clean: Record<string, unknown> = {};
  let count = 0;
  for (const [key, value] of Object.entries(diagnostics)) {
    if (count >= MAX_DIAGNOSTICS_KEYS) break;
    if (typeof value === 'string') {
      clean[key] = value.slice(0, MAX_DIAGNOSTIC_VALUE_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      clean[key] = value;
    }
    count += 1;
  }
  return clean as SendFeedbackEmailPayload['diagnostics'];
}

/**
 * Server action to dispatch instant transactional feedback email via Resend.
 * Fails gracefully (never crashes client) if Resend API key is unconfigured.
 */
export async function sendFeedbackEmail(
  payload: SendFeedbackEmailPayload
): Promise<SendFeedbackEmailResult> {
  try {
    const { category, moduleRoute, message } = payload;

    if (!message || !message.trim()) {
      return {
        success: false,
        error: 'Feedback message is required.',
      };
    }

    // Rate limiting guard (bypassed in test environment)
    if (process.env.NODE_ENV !== 'test') {
      let clientIp = 'unknown-client';
      try {
        const { headers } = await import('next/headers');
        const headerList = await headers();
        clientIp =
          headerList.get('x-forwarded-for')?.split(',')[0].trim() ||
          headerList.get('x-real-ip') ||
          'unknown-client';
      } catch {
        // Fallback when headers context is unavailable
      }

      const now = Date.now();
      pruneRateLimitMap(now);
      const timestamps = (rateLimitMap.get(clientIp) || []).filter(
        (ts) => now - ts < RATE_LIMIT_WINDOW_MS
      );

      if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait a few minutes before submitting additional feedback.',
        };
      }

      timestamps.push(now);
      rateLimitMap.set(clientIp, timestamps);
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Gracefully skip when RESEND_API_KEY is absent
      return {
        success: false,
        skipped: true,
        error: 'Resend API key is not configured. Feedback recorded without email alert.',
      };
    }

    const recipient = process.env.FEEDBACK_NOTIFY_EMAIL || 'morokakk@outlook.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const rawCategoryLabel = FEEDBACK_CATEGORY_LABELS[category] || category || 'Feedback';
    const safeCategoryLabel = String(rawCategoryLabel).replace(/[\r\n]+/g, ' ').trim();
    const safeRoute = String(moduleRoute || '/').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
    const subject = `[SA Prop Hub Feedback] ${safeCategoryLabel} — ${safeRoute}`.replace(/[\r\n]+/g, ' ').trim();

    const sanitizedPayload: SendFeedbackEmailPayload = {
      ...payload,
      moduleRoute: safeRoute,
      message: message.trim().slice(0, MAX_MESSAGE_LENGTH),
      contactOptional:
        typeof payload.contactOptional === 'string'
          ? payload.contactOptional.slice(0, 300)
          : payload.contactOptional,
      diagnostics: sanitizeDiagnostics(payload.diagnostics),
    };

    const html = generateFeedbackEmailHtml(sanitizedPayload);

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipient.trim(),
      subject,
      html,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to dispatch feedback notification email.',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected feedback email error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

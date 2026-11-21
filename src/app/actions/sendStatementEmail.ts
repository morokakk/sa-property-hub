'use server';

import { Resend } from 'resend';
import { generateStatementEmailHtml } from '@/lib/email/statementEmailTemplate';
import { formatMonthLabel } from '@/lib/calculations/arrears';
import { StatementBankingDetails } from '@/types';

export interface SendStatementEmailPayload {
  to: string;
  tenantName?: string;
  propertyName: string;
  unitName?: string;
  billingPeriod: string;
  totalAmountDueFormatted: string;
  statementUrl: string;
  pdfBase64: string;
  landlordName?: string;
  remainingLeaseTerm?: string;
  bankingDetails?: StatementBankingDetails;
}

export interface SendStatementEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// In-memory rate limiting map (IP/client -> timestamp array)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_RATE_LIMIT_KEYS = 500;
const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const EMAIL_REGEX = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

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

/**
 * Server Action for sending tenant statements via Resend with PDF attachment.
 */
export async function sendStatementEmail(
  payload: SendStatementEmailPayload
): Promise<SendStatementEmailResult> {
  try {
    const {
      to,
      tenantName,
      propertyName,
      unitName,
      billingPeriod,
      totalAmountDueFormatted,
      statementUrl,
      pdfBase64,
      landlordName,
      remainingLeaseTerm,
      bankingDetails,
    } = payload;

    // Rate limiting (bypassed in test environment)
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
          error: 'Rate limit exceeded or invalid PDF format',
        };
      }

      timestamps.push(now);
      rateLimitMap.set(clientIp, timestamps);
    }

    if (!to || !to.trim()) {
      return {
        success: false,
        error: 'Tenant email address is required.',
      };
    }

    const trimmedTo = to.trim();
    if (/[\r\n]/.test(to) || !EMAIL_REGEX.test(trimmedTo)) {
      return {
        success: false,
        error: 'Invalid tenant email address format.',
      };
    }

    if (billingPeriod && /[\r\n]/.test(billingPeriod)) {
      return {
        success: false,
        error: 'Invalid billing period format.',
      };
    }

    if (!pdfBase64 || !pdfBase64.trim()) {
      return {
        success: false,
        error: 'Statement PDF payload is missing or empty.',
      };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error:
          'Resend API key is not configured. Please set RESEND_API_KEY in your environment variables.',
      };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const displayPeriod = /^\d{4}-\d{2}$/.test((billingPeriod || '').trim())
      ? formatMonthLabel(billingPeriod.trim())
      : (billingPeriod || 'Statement').trim();

    const sanitizedPeriod = displayPeriod
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `Statement_${sanitizedPeriod}.pdf`;

    // Strip data URI scheme prefix if present
    const cleanBase64 = pdfBase64
      .replace(/^data:application\/pdf;[^,]*,/, '')
      .replace(/\s+/g, '');

    if (cleanBase64.length > Math.ceil((MAX_PDF_BYTES * 4) / 3) + 16) {
      return {
        success: false,
        error: 'Statement PDF exceeds the maximum allowed size of 10 MB.',
      };
    }

    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    if (pdfBuffer.length === 0) {
      return {
        success: false,
        error: 'Statement PDF payload is invalid or empty.',
      };
    }

    if (pdfBuffer.length > MAX_PDF_BYTES) {
      return {
        success: false,
        error: 'Statement PDF exceeds the maximum allowed size of 10 MB.',
      };
    }

    // Enforce PDF format validation: verify %PDF- magic bytes
    if (pdfBuffer.length < 5 || !pdfBuffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return {
        success: false,
        error: 'Rate limit exceeded or invalid PDF format',
      };
    }

    const subject = `Your Monthly Rental & Utility Statement - ${displayPeriod}`.replace(/[\r\n]+/g, ' ').trim();

    const html = generateStatementEmailHtml({
      tenantName,
      propertyName,
      unitName,
      billingPeriod: displayPeriod,
      totalAmountDueFormatted,
      statementUrl,
      landlordName,
      filename,
      remainingLeaseTerm,
      bankingDetails,
    });

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: trimmedTo,
      subject,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to send statement email.',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while sending email.',
    };
  }
}

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

    if (!to || !to.trim()) {
      return {
        success: false,
        error: 'Tenant email address is required.',
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

    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    if (pdfBuffer.length === 0) {
      return {
        success: false,
        error: 'Statement PDF payload is invalid or empty.',
      };
    }

    const subject = `Your Monthly Rental & Utility Statement - ${displayPeriod}`;

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
      to: to.trim(),
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

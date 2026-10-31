import { escapeHtml } from '@/lib/email/statementEmailTemplate';

export interface FeedbackDiagnosticsPayload {
  viewport?: string;
  storageMode?: string;
  demoStatus?: string;
  timestamp?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface SendFeedbackEmailPayload {
  category: string;
  moduleRoute: string;
  message: string;
  contactOptional?: string | null;
  userId?: string | null;
  diagnostics?: FeedbackDiagnosticsPayload;
}

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug / Calculation Issue',
  feature: 'Feature Request',
  data_math: 'SA Tax / Municipal Math',
  ux: 'General UX Feedback',
};

/**
 * Extracts email and WhatsApp-compatible digits from optional contact string.
 */
export function parseContactDetails(contact?: string | null): { email?: string; waDigits?: string } {
  if (!contact || !contact.trim()) return {};
  const trimmed = contact.trim();
  const result: { email?: string; waDigits?: string } = {};

  const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Extract phone number allowing parentheses, spaces, hyphens, and leading +
  const phoneMatch = trimmed.match(/(\+?\(?\d[\d\s\-()]{7,}\d)/);
  if (phoneMatch) {
    let digits = phoneMatch[0].replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) {
      digits = digits.slice(1);
    }
    if (digits.startsWith('0') && digits.length === 10) {
      // South Africa 10-digit number (082... -> 2782...)
      digits = '27' + digits.slice(1);
    } else if (digits.startsWith('270') && digits.length === 12) {
      // Handle +27 (0)82... -> 27082... -> 2782...
      digits = '27' + digits.slice(3);
    }
    if (/^\d{8,15}$/.test(digits)) {
      result.waDigits = digits;
    }
  }

  return result;
}

/**
 * Generates structured HTML email for feedback alerts.
 */
export function generateFeedbackEmailHtml(payload: SendFeedbackEmailPayload): string {
  const categoryLabel = FEEDBACK_CATEGORY_LABELS[payload.category] || payload.category || 'Feedback';
  const moduleRoute = payload.moduleRoute || '/';
  const safeMessage = escapeHtml(payload.message || '').replace(/\r?\n/g, '<br/>');
  const safeContact = escapeHtml(payload.contactOptional || 'Not provided');
  const { email, waDigits } = parseContactDetails(payload.contactOptional);

  const diag = payload.diagnostics || {};
  const safeViewport = escapeHtml(diag.viewport || 'N/A');
  const safeStorageMode = escapeHtml(diag.storageMode || 'N/A');
  const safeDemoStatus = escapeHtml(diag.demoStatus || 'N/A');
  const safeUserId = escapeHtml(payload.userId || 'Guest / Local-First');
  const safeTimestamp = escapeHtml(diag.timestamp || new Date().toISOString());

  let quickReplyHtml = '';
  if (email || waDigits) {
    const buttons: string[] = [];
    if (email) {
      buttons.push(
        `<a href="mailto:${escapeHtml(email)}?subject=Re:%20[SA%20Prop%20Hub]%20Feedback%20Response" style="display:inline-block;padding:8px 14px;background-color:#0284c7;color:#ffffff;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;margin-right:8px;">📧 Reply via Email (${escapeHtml(email)})</a>`
      );
    }
    if (waDigits) {
      buttons.push(
        `<a href="https://wa.me/${escapeHtml(waDigits)}" style="display:inline-block;padding:8px 14px;background-color:#16a34a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:12px;font-weight:600;">💬 Reply via WhatsApp</a>`
      );
    }
    quickReplyHtml = `
      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1;">
        <span style="font-size:11px;color:#64748b;display:block;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Quick Reply:</span>
        <div>${buttons.join(' ')}</div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>[SA Prop Hub Feedback] ${escapeHtml(categoryLabel)} — ${escapeHtml(moduleRoute)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:620px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color:#0f172a;padding:20px 24px;border-bottom:3px solid #10b981;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:-0.2px;">Moremela Property Hub</span>
        <span style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:11px;font-weight:700;padding:3px 9px;border-radius:9999px;text-transform:uppercase;">Feedback Engine</span>
      </div>
      <h1 style="color:#f8fafc;font-size:18px;margin:12px 0 4px 0;font-weight:600;">
        ${escapeHtml(categoryLabel)}
      </h1>
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Module / Route: <code style="background-color:#1e293b;color:#38bdf8;padding:2px 6px;border-radius:4px;font-family:monospace;">${escapeHtml(moduleRoute)}</code>
      </p>
    </div>

    <!-- Message Body -->
    <div style="padding:24px;">
      <h2 style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin:0 0 8px 0;font-weight:700;">
        User Message
      </h2>
      <div style="background-color:#f8fafc;border-left:4px solid #0284c7;padding:14px 16px;border-radius:0 8px 8px 0;color:#1e293b;font-size:14px;line-height:1.6;word-break:break-word;">
        ${safeMessage}
      </div>

      <!-- Contact Block -->
      <div style="margin-top:20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
        <span style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px;">Contact Provided:</span>
        <span style="font-size:13px;color:#0f172a;font-weight:500;">${safeContact}</span>
        ${quickReplyHtml}
      </div>

      <!-- Diagnostics Table -->
      <div style="margin-top:24px;">
        <h3 style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;margin:0 0 8px 0;font-weight:700;">
          Environment Diagnostics (POPIA-Scrubbed)
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 12px;background-color:#f8fafc;color:#64748b;font-weight:600;width:35%;">Viewport</td>
              <td style="padding:8px 12px;color:#0f172a;font-family:monospace;">${safeViewport}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 12px;background-color:#f8fafc;color:#64748b;font-weight:600;">Storage Mode</td>
              <td style="padding:8px 12px;color:#0f172a;">${safeStorageMode}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 12px;background-color:#f8fafc;color:#64748b;font-weight:600;">Demo Status</td>
              <td style="padding:8px 12px;color:#0f172a;">${safeDemoStatus}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 12px;background-color:#f8fafc;color:#64748b;font-weight:600;">User / Auth</td>
              <td style="padding:8px 12px;color:#0f172a;font-family:monospace;">${safeUserId}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background-color:#f8fafc;color:#64748b;font-weight:600;">Timestamp</td>
              <td style="padding:8px 12px;color:#0f172a;font-family:monospace;">${safeTimestamp}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color:#f8fafc;padding:12px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
      Moremela Properties (Pty) Ltd (2026/838397/07) • In-App Feedback Notification
    </div>
  </div>
</body>
</html>
  `.trim();
}

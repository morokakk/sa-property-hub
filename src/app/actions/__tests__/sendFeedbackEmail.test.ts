import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendFeedbackEmail,
  SendFeedbackEmailPayload,
} from '../sendFeedbackEmail';
import {
  generateFeedbackEmailHtml,
  parseContactDetails,
} from '@/lib/feedback/feedbackEmailTemplate';

const mockSend = vi.fn();

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: mockSend,
      };
    },
  };
});

describe('sendFeedbackEmail Server Action', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validPayload: SendFeedbackEmailPayload = {
    category: 'bug',
    moduleRoute: '/rentals',
    message: 'The arrears calculation did not update after payment recording.',
    contactOptional: 'investor@example.com',
    userId: 'user-uuid-1234',
    diagnostics: {
      viewport: '1280x800 (Desktop)',
      storageMode: 'Cloud Synced (Supabase)',
      demoStatus: 'Custom User Data',
      timestamp: '2026-10-31T12:00:00.000Z',
    },
  };

  describe('1. Validation and Guardrails', () => {
    it('returns error when message is empty or whitespace only', async () => {
      process.env.RESEND_API_KEY = 're_test_key';
      const res1 = await sendFeedbackEmail({ ...validPayload, message: '' });
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('Feedback message is required');

      const res2 = await sendFeedbackEmail({ ...validPayload, message: '   \n  ' });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('Feedback message is required');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('gracefully degrades when RESEND_API_KEY is not configured', async () => {
      delete process.env.RESEND_API_KEY;
      const res = await sendFeedbackEmail(validPayload);
      expect(res.success).toBe(false);
      expect(res.skipped).toBe(true);
      expect(res.error).toContain('Resend API key is not configured');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('returns error without throwing when Resend API fails', async () => {
      process.env.RESEND_API_KEY = 're_test_key';
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Domain not verified on Resend' },
      });

      const res = await sendFeedbackEmail(validPayload);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Domain not verified on Resend');
    });

    it('catches unexpected thrown errors and returns clean failure', async () => {
      process.env.RESEND_API_KEY = 're_test_key';
      mockSend.mockRejectedValueOnce(new Error('Network connectivity failure'));

      const res = await sendFeedbackEmail(validPayload);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Network connectivity failure');
    });
  });

  describe('2. Dispatch and Configuration', () => {
    it('sends email to default founder email when FEEDBACK_NOTIFY_EMAIL is not set', async () => {
      process.env.RESEND_API_KEY = 're_test_key';
      delete process.env.FEEDBACK_NOTIFY_EMAIL;
      delete process.env.RESEND_FROM_EMAIL;
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_123' }, error: null });

      const res = await sendFeedbackEmail(validPayload);

      expect(res.success).toBe(true);
      expect(res.messageId).toBe('msg_123');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'morokakk@outlook.com',
          from: 'onboarding@resend.dev',
          subject: '[SA Prop Hub Feedback] Bug / Calculation Issue — /rentals',
        })
      );
    });

    it('uses custom FEEDBACK_NOTIFY_EMAIL and RESEND_FROM_EMAIL when configured', async () => {
      process.env.RESEND_API_KEY = 're_test_key';
      process.env.FEEDBACK_NOTIFY_EMAIL = 'custom-founder@domain.co.za';
      process.env.RESEND_FROM_EMAIL = 'support@domain.co.za';
      mockSend.mockResolvedValueOnce({ data: { id: 'msg_456' }, error: null });

      const res = await sendFeedbackEmail({
        ...validPayload,
        category: 'feature',
        moduleRoute: '/analyzer',
      });

      expect(res.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'custom-founder@domain.co.za',
          from: 'support@domain.co.za',
          subject: '[SA Prop Hub Feedback] Feature Request — /analyzer',
        })
      );
    });

    it('formats category labels properly for standard categories', async () => {
      process.env.RESEND_API_KEY = 're_test_key';
      mockSend.mockResolvedValue({ data: { id: 'msg_test' }, error: null });

      await sendFeedbackEmail({ ...validPayload, category: 'data_math', moduleRoute: '/flips' });
      expect(mockSend).toHaveBeenLastCalledWith(
        expect.objectContaining({
          subject: '[SA Prop Hub Feedback] SA Tax / Municipal Math — /flips',
        })
      );

      await sendFeedbackEmail({ ...validPayload, category: 'ux', moduleRoute: '/settings' });
      expect(mockSend).toHaveBeenLastCalledWith(
        expect.objectContaining({
          subject: '[SA Prop Hub Feedback] General UX Feedback — /settings',
        })
      );
    });
  });

  describe('3. Contact Parsing & Quick-Reply Links', () => {
    it('parses email from contact string', () => {
      const parsed = parseContactDetails('Contact me at investor@moremela.co.za please');
      expect(parsed.email).toBe('investor@moremela.co.za');
    });

    it('parses and normalizes South African 082 number to 2782 for WhatsApp', () => {
      const parsed = parseContactDetails('082 123 4567');
      expect(parsed.waDigits).toBe('27821234567');
    });

    it('parses international +27 number for WhatsApp', () => {
      const parsed = parseContactDetails('+27 83 999 0001');
      expect(parsed.waDigits).toBe('27839990001');
    });

    it('handles contact with both email and phone number', () => {
      const parsed = parseContactDetails('test@prop.co.za or call 071-234-5678');
      expect(parsed.email).toBe('test@prop.co.za');
      expect(parsed.waDigits).toBe('27712345678');
    });

    it('parses phone number formatted with brackets and spaces', () => {
      const parsed1 = parseContactDetails('(082) 123 4567');
      expect(parsed1.waDigits).toBe('27821234567');

      const parsed2 = parseContactDetails('+27 (0)82 123 4567');
      expect(parsed2.waDigits).toBe('27821234567');
    });

    it('handles empty or undefined contact strings gracefully', () => {
      expect(parseContactDetails(null)).toEqual({});
      expect(parseContactDetails(undefined)).toEqual({});
      expect(parseContactDetails('   ')).toEqual({});
    });
  });

  describe('4. HTML Email Generation & XSS Sanitization', () => {
    it('escapes user message and metadata preventing HTML/script injection', () => {
      const payload: SendFeedbackEmailPayload = {
        category: 'bug',
        moduleRoute: '<script>alert("xss")</script>',
        message: 'Hello <img src=x onerror=alert(1)> & "world"',
        contactOptional: '<b>Hacker</b> <hack@evil.com>',
        userId: '<uuid>',
        diagnostics: {
          viewport: '<1280x800>',
          storageMode: 'Cloud <b style="color:red">test</b>',
          demoStatus: 'Custom <script>',
        },
      };

      const html = generateFeedbackEmailHtml(payload);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;world&quot;');
      expect(html).toContain('mailto:hack@evil.com');
      expect(html).toContain('&lt;1280x800&gt;');
    });

    it('renders diagnostics table and quick reply buttons when present', () => {
      const html = generateFeedbackEmailHtml({
        category: 'feature',
        moduleRoute: '/rentals',
        message: 'Line 1\nLine 2',
        contactOptional: '0821234567',
        userId: 'auth-user-999',
        diagnostics: {
          viewport: '390x844 (Mobile)',
          storageMode: 'Local-First (Browser)',
          demoStatus: 'Demo Dataset Loaded',
          timestamp: '2026-10-31T12:30:00.000Z',
        },
      });

      expect(html).toContain('Line 1<br/>Line 2');
      expect(html).toContain('https://wa.me/27821234567');
      expect(html).toContain('390x844 (Mobile)');
      expect(html).toContain('Local-First (Browser)');
      expect(html).toContain('Demo Dataset Loaded');
      expect(html).toContain('auth-user-999');
      expect(html).toContain('2026-10-31T12:30:00.000Z');
    });
  });
});

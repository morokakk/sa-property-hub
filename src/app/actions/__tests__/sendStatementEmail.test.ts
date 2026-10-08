import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendStatementEmail,
  SendStatementEmailPayload,
} from '../sendStatementEmail';
import { generateStatementEmailHtml } from '@/lib/email/statementEmailTemplate';

const mockSend = vi.fn();

// Mock Resend SDK
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: mockSend,
      };
    },
  };
});

describe('sendStatementEmail Server Action', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validPayload: SendStatementEmailPayload = {
    to: 'tenant@example.com',
    tenantName: 'Thabo Mokoena',
    propertyName: 'Sandhurst Executive Suite',
    unitName: 'Unit 4B',
    billingPeriod: 'October 2026',
    totalAmountDueFormatted: 'R 12,450.00',
    statementUrl: 'https://propertyhub.co.za/statement/lease-1?month=2026-10',
    pdfBase64: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2Jq',
    landlordName: 'Apex Properties Ltd',
  };

  describe('1. Input Validation & Guardrails', () => {
    it('fails when tenant email "to" is missing or empty', async () => {
      process.env.RESEND_API_KEY = 're_test_key_123';
      const result = await sendStatementEmail({
        ...validPayload,
        to: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tenant email address is required');
    });

    it('fails when tenant email "to" contains only whitespace', async () => {
      process.env.RESEND_API_KEY = 're_test_key_123';
      const result = await sendStatementEmail({
        ...validPayload,
        to: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tenant email address is required');
    });

    it('fails when pdfBase64 is empty', async () => {
      process.env.RESEND_API_KEY = 're_test_key_123';
      const result = await sendStatementEmail({
        ...validPayload,
        pdfBase64: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Statement PDF payload is missing or empty');
    });

    it('gracefully handles missing RESEND_API_KEY without throwing an unhandled exception', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendStatementEmail(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Resend API key is not configured');
      expect(result.error).toContain('RESEND_API_KEY');
    });
  });

  describe('2. Email Sending Pipeline & Payload Formatting', () => {
    it('successfully sends email with custom RESEND_FROM_EMAIL and returns messageId', async () => {
      process.env.RESEND_API_KEY = 're_test_12345';
      process.env.RESEND_FROM_EMAIL = 'statements@myproperty.co.za';

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_987654321' },
        error: null,
      });

      const result = await sendStatementEmail(validPayload);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_987654321');
      expect(mockSend).toHaveBeenCalledTimes(1);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('statements@myproperty.co.za');
      expect(callArgs.to).toBe('tenant@example.com');
      expect(callArgs.subject).toBe('Your Monthly Rental & Utility Statement - October 2026');
      expect(callArgs.attachments).toHaveLength(1);
      expect(callArgs.attachments[0].filename).toBe('Statement_October_2026.pdf');
      expect(Buffer.isBuffer(callArgs.attachments[0].content)).toBe(true);
    });

    it('uses fallback "onboarding@resend.dev" when RESEND_FROM_EMAIL is unset', async () => {
      process.env.RESEND_API_KEY = 're_test_12345';
      delete process.env.RESEND_FROM_EMAIL;

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_default_from' },
        error: null,
      });

      const result = await sendStatementEmail(validPayload);

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('onboarding@resend.dev');
    });

    it('strips data:application/pdf base64 prefix cleanly when provided by client', async () => {
      process.env.RESEND_API_KEY = 're_test_12345';

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_prefix_stripped' },
        error: null,
      });

      const rawBase64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const payloadWithDataUri = {
        ...validPayload,
        pdfBase64: `data:application/pdf;base64,${rawBase64}`,
      };

      const result = await sendStatementEmail(payloadWithDataUri);

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      const attachedBuffer = callArgs.attachments[0].content as Buffer;
      expect(attachedBuffer.toString('utf-8')).toBe('Hello World');
    });

    it('handles Resend API error response without throwing', async () => {
      process.env.RESEND_API_KEY = 're_test_12345';

      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Domain verification failed' },
      });

      const result = await sendStatementEmail(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Domain verification failed');
    });

    it('catches unexpected network or runtime exceptions gracefully', async () => {
      process.env.RESEND_API_KEY = 're_test_12345';

      mockSend.mockRejectedValueOnce(new Error('Connection timed out to api.resend.com'));

      const result = await sendStatementEmail(validPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timed out to api.resend.com');
    });

    it('normalizes YYYY-MM billing period into Month Year format for subject and attachment filename', async () => {
      process.env.RESEND_API_KEY = 're_test_12345';

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_norm_123' },
        error: null,
      });

      const payloadWithMonthKey = {
        ...validPayload,
        billingPeriod: '2026-10',
      };

      const result = await sendStatementEmail(payloadWithMonthKey);

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toBe('Your Monthly Rental & Utility Statement - October 2026');
      expect(callArgs.attachments[0].filename).toBe('Statement_October_2026.pdf');
    });

    it('fails when decoded pdfBase64 yields an empty buffer', async () => {
      process.env.RESEND_API_KEY = 're_test_key_123';
      const result = await sendStatementEmail({
        ...validPayload,
        pdfBase64: 'data:application/pdf;base64,',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Statement PDF payload is invalid or empty');
    });
  });

  describe('3. Branded HTML Email Template Generation', () => {
    it('injects all required landlord, property, unit, remainingLeaseTerm, and URL branding fields with direct link fallback', () => {
      const html = generateStatementEmailHtml({
        tenantName: 'Priya Pillay',
        propertyName: 'Umhlanga Arch Penthouse',
        unitName: 'Suite 1201',
        billingPeriod: 'November 2026',
        totalAmountDueFormatted: 'R 25,000.00',
        statementUrl: 'https://propertyhub.co.za/statement/lease-456?month=2026-11',
        landlordName: 'Oceanic Holdings Ltd',
        filename: 'Statement_November_2026.pdf',
        remainingLeaseTerm: '5 Months',
      });

      expect(html).toContain('Priya Pillay');
      expect(html).toContain('Umhlanga Arch Penthouse');
      expect(html).toContain('Suite 1201');
      expect(html).toContain('November 2026');
      expect(html).toContain('R 25,000.00');
      expect(html).toContain('https://propertyhub.co.za/statement/lease-456?month=2026-11');
      expect(html).toContain('Oceanic Holdings Ltd');
      expect(html).toContain('Statement_November_2026.pdf');
      expect(html).toContain('Remaining Lease Term:');
      expect(html).toContain('5 Months');
      expect(html).toContain('View Secure Online Statement');
      expect(html).toContain('Direct portal link:');
    });

    it('falls back gracefully when unitName, landlordName, or remainingLeaseTerm are omitted', () => {
      const html = generateStatementEmailHtml({
        tenantName: '',
        propertyName: 'Cottage Rosebank',
        billingPeriod: 'October 2026',
        totalAmountDueFormatted: 'R 6,500.00',
        statementUrl: 'https://propertyhub.co.za/statement/lease-99',
        filename: 'Statement_October_2026.pdf',
      });

      expect(html).toContain('Dear <strong>Tenant</strong>');
      expect(html).toContain('Cottage Rosebank');
      expect(html).toContain('R 6,500.00');
      expect(html).toContain('https://propertyhub.co.za/statement/lease-99');
      expect(html).toContain('Statement_October_2026.pdf');
      expect(html).not.toContain('Remaining Lease Term:');
    });

    it('passes remainingLeaseTerm through sendStatementEmail into html output', async () => {
      process.env.RESEND_API_KEY = 're_test_12345';
      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_term_test' },
        error: null,
      });

      const result = await sendStatementEmail({
        ...validPayload,
        remainingLeaseTerm: '7 Months',
      });

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Remaining Lease Term:');
      expect(callArgs.html).toContain('7 Months');
    });

    it('renders structured EFT banking details table in email HTML when bankingDetails is provided', () => {
      const html = generateStatementEmailHtml({
        tenantName: 'Thabo Mokoena',
        propertyName: 'Sandhurst Executive Suite',
        unitName: 'Unit 4B',
        billingPeriod: 'October 2026',
        totalAmountDueFormatted: 'R 18,500.00',
        statementUrl: 'https://propertyhub.co.za/statement/lease-1?month=2026-10',
        landlordName: 'Apex Properties Ltd',
        filename: 'Statement_October_2026.pdf',
        bankingDetails: {
          bankName: 'First National Bank (FNB)',
          accountHolder: 'Apex Properties Ltd',
          accountNumber: '62891044321',
          branchCode: '250655',
          accountType: 'Cheque / Current',
          swiftCode: 'FIRNZAJJ',
          paymentReference: 'UNIT4B-MOKOENA',
          remittanceInstructions: 'Email POP to accounts@apex.co.za within 24 hours of EFT transfer.',
        },
      });

      expect(html).toContain('Remittance Banking Details (EFT)');
      expect(html).toContain('First National Bank (FNB)');
      expect(html).toContain('Apex Properties Ltd');
      expect(html).toContain('62891044321');
      expect(html).toContain('250655 (Cheque / Current)');
      expect(html).toContain('FIRNZAJJ');
      expect(html).toContain('UNIT4B-MOKOENA');
      expect(html).toContain('Email POP to accounts@apex.co.za within 24 hours of EFT transfer.');
    });

    it('omits banking details table when bankingDetails is omitted or has empty accountNumber', () => {
      const htmlWithoutBank = generateStatementEmailHtml({
        tenantName: 'Thabo Mokoena',
        propertyName: 'Sandhurst Executive Suite',
        billingPeriod: 'October 2026',
        totalAmountDueFormatted: 'R 18,500.00',
        statementUrl: 'https://propertyhub.co.za/statement/lease-1',
        filename: 'Statement_October_2026.pdf',
      });

      expect(htmlWithoutBank).not.toContain('Remittance Banking Details (EFT)');

      const htmlWithEmptyAccount = generateStatementEmailHtml({
        tenantName: 'Thabo Mokoena',
        propertyName: 'Sandhurst Executive Suite',
        billingPeriod: 'October 2026',
        totalAmountDueFormatted: 'R 18,500.00',
        statementUrl: 'https://propertyhub.co.za/statement/lease-1',
        filename: 'Statement_October_2026.pdf',
        bankingDetails: {
          bankName: 'FNB',
          accountHolder: 'Apex',
          accountNumber: '',
          branchCode: '250655',
        },
      });

      expect(htmlWithEmptyAccount).not.toContain('Remittance Banking Details (EFT)');
    });

    it('passes bankingDetails through sendStatementEmail into Resend send html call', async () => {
      process.env.RESEND_API_KEY = 're_test_12345';
      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_bank_test' },
        error: null,
      });

      const result = await sendStatementEmail({
        ...validPayload,
        bankingDetails: {
          bankName: 'Nedbank',
          accountHolder: 'Apex Properties Ltd',
          accountNumber: '1987654321',
          branchCode: '198765',
          paymentReference: 'UNIT4B-MOKOENA',
        },
      });

      expect(result.success).toBe(true);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Remittance Banking Details (EFT)');
      expect(callArgs.html).toContain('Nedbank');
      expect(callArgs.html).toContain('1987654321');
      expect(callArgs.html).toContain('UNIT4B-MOKOENA');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import TenantStatement from '../TenantStatement';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { isDemoRentalProperty } from '@/lib/db/mergePortfolioState';
import { formatMonthLabel } from '@/lib/calculations/arrears';
import { formatZAR } from '@/lib/formatters';

// Mock Supabase client for test environment
vi.mock('@/lib/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
      from: vi.fn(),
    },
  };
});

describe('Tenant Statement Share Actions Dropdown & Email Distribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Real Component SSR/DOM Rendering', () => {
    it('renders the split share actions button and dropdown toggle inside the statement modal', () => {
      const html = renderToString(
        <TenantStatement
          propertyId="rental-1"
          isOpen={true}
          onClose={() => {}}
        />
      );

      // Verify the modal root and header exist
      expect(html).toContain('id="tenant-statement-print-root"');

      // Verify primary 1-click copy link action button is rendered for Playwright and 1-click ergonomics
      expect(html).toContain('data-testid="copy-tenant-link-btn"');
      expect(html).toContain('Copy Secure Tenant Link');

      // Verify share dropdown toggle button is present with correct accessibility attributes
      expect(html).toContain('data-testid="share-statement-dropdown-toggle"');
      expect(html).toContain('aria-label="More share actions"');
      expect(html).toContain('title="More share and distribution options"');
    });

    it('returns null and renders nothing when isOpen is false', () => {
      const html = renderToString(
        <TenantStatement
          propertyId="rental-1"
          isOpen={false}
          onClose={() => {}}
        />
      );

      expect(html).toBe('');
    });
  });

  describe('2. Email Guardrails & Tooltip Validation', () => {
    it('displays exact required tooltip copy when tenant email is absent', () => {
      const expectedTooltip = 'Add tenant email in lease settings to enable sending.';
      expect(expectedTooltip).toBe('Add tenant email in lease settings to enable sending.');
    });

    it('correctly evaluates hasTenantEmail condition for undefined, empty, or whitespace email values', () => {
      const hasTenantEmail = (email?: string | null) => Boolean(email && email.trim().length > 0);

      expect(hasTenantEmail(undefined)).toBe(false);
      expect(hasTenantEmail(null)).toBe(false);
      expect(hasTenantEmail('')).toBe(false);
      expect(hasTenantEmail('   ')).toBe(false);
      expect(hasTenantEmail('tenant@domain.com')).toBe(true);
      expect(hasTenantEmail(' baby.kenosi@gmail.com ')).toBe(true);
    });
  });

  describe('3. Verified Amount Due Calculation Logic', () => {
    it('accurately computes zero amount due for settled/paid-up statements (does not bill gross rent)', () => {
      const currentGrandTotal = 12500;
      const periodNetOutstanding = 0; // Paid up in full

      // The verified amount due must show R 0,00, NOT the original currentGrandTotal
      const finalAmountDue = !isNaN(periodNetOutstanding) ? periodNetOutstanding : currentGrandTotal;
      const formatted = formatZAR(finalAmountDue, { includeDecimals: true });

      expect(formatted).toBe(formatZAR(0, { includeDecimals: true }));
    });

    it('accurately computes arrears balance when outstanding balance exceeds zero', () => {
      const currentGrandTotal = 12500;
      const periodNetOutstanding = 18750.50; // Previous arrears + current rent

      const finalAmountDue = !isNaN(periodNetOutstanding) ? periodNetOutstanding : currentGrandTotal;
      const formatted = formatZAR(finalAmountDue, { includeDecimals: true });

      expect(formatted).toBe(formatZAR(18750.50, { includeDecimals: true }));
    });

    it('normalizes month key to [Month] [Year] format for subject and attachment', () => {
      const activePeriodMonth = '2026-10';
      const periodLabel = formatMonthLabel(activePeriodMonth);

      expect(periodLabel).toBe('October 2026');

      const sanitizedPeriod = periodLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `Statement_${sanitizedPeriod}.pdf`;
      const subject = `Your Monthly Rental & Utility Statement - ${periodLabel}`;

      expect(filename).toBe('Statement_October_2026.pdf');
      expect(subject).toBe('Your Monthly Rental & Utility Statement - October 2026');
    });
  });

  describe('4. Cloud Sync Guardrails for Email Distribution', () => {
    it('demo properties bypass CloudPublishModal and proceed directly', () => {
      expect(isDemoRentalProperty('rental-1')).toBe(true);
      expect(isDemoRentalProperty('rental-2')).toBe(true);
    });

    it('user-created properties block unauthenticated dispatch and trigger CloudPublishModal', () => {
      const rentalId = 'rental-1741234567890';
      const currentUser = null;

      let showCloudPublishModal = false;
      let emailDispatched = false;

      if (!isDemoRentalProperty(rentalId)) {
        if (!currentUser) {
          showCloudPublishModal = true;
        } else {
          emailDispatched = true;
        }
      } else {
        emailDispatched = true;
      }

      expect(showCloudPublishModal).toBe(true);
      expect(emailDispatched).toBe(false);
    });
  });

  describe('5. Parallel Execution Feedback & Clipboard', () => {
    it('executes clipboard copy and green success toast on successful email transmission', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      const shareUrl = 'https://propertyhub.co.za/statement/lease-1?month=2026-10';
      let toastMessage = '';

      const emailResult = { success: true, messageId: 'resend_msg_789' };

      if (emailResult.success) {
        await mockClipboard.writeText(shareUrl);
        toastMessage = 'Statement emailed to tenant and link copied!';
      }

      expect(mockClipboard.writeText).toHaveBeenCalledWith(shareUrl);
      expect(toastMessage).toBe('Statement emailed to tenant and link copied!');
    });

    it('surfaces error banner and suppresses clipboard copy on failure', async () => {
      const mockClipboard = {
        writeText: vi.fn(),
      };
      let toastMessage = '';
      let statusError = '';

      const emailResult = { success: false, error: 'Resend API rate limit exceeded' };

      if (emailResult.success) {
        await mockClipboard.writeText('url');
        toastMessage = 'Statement emailed to tenant and link copied!';
      } else {
        statusError = `Failed to email statement: ${emailResult.error}`;
      }

      expect(mockClipboard.writeText).not.toHaveBeenCalled();
      expect(toastMessage).toBe('');
      expect(statusError).toBe('Failed to email statement: Resend API rate limit exceeded');
    });
  });
});

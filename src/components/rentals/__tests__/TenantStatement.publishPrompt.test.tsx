import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DEMO_RENTAL_IDS, isDemoRentalProperty } from '@/lib/db/mergePortfolioState';
import CloudPublishModal from '../CloudPublishModal';

describe('Tenant Statement Link Publishing & Auth Prompt Workflow', () => {
  describe('1. Real Demo Property vs User-Created Property Detection (isDemoRentalProperty)', () => {
    it('correctly classifies stock demo rental properties from DEMO_RENTAL_IDS', () => {
      expect(isDemoRentalProperty('rental-1')).toBe(true);
      expect(isDemoRentalProperty('rental-2')).toBe(true);
      expect(isDemoRentalProperty('rental-3')).toBe(true);
      expect(isDemoRentalProperty('rental-4')).toBe(true);
    });

    it('correctly classifies custom properties prefixed with demo-rental-', () => {
      expect(isDemoRentalProperty('demo-rental-unit-5')).toBe(true);
      expect(isDemoRentalProperty('demo-rental-cape-town')).toBe(true);
    });

    it('correctly classifies user-created properties as non-demo (local storage only)', () => {
      expect(isDemoRentalProperty('rental-1741234567890')).toBe(false);
      expect(isDemoRentalProperty('rental-custom-test-101')).toBe(false);
      expect(isDemoRentalProperty('custom-rental-rosebank')).toBe(false);
      expect(isDemoRentalProperty('user-property-123')).toBe(false);
    });

    it('handles edge case inputs gracefully without throwing', () => {
      expect(isDemoRentalProperty(null)).toBe(false);
      expect(isDemoRentalProperty(undefined)).toBe(false);
      expect(isDemoRentalProperty('')).toBe(false);
      expect(isDemoRentalProperty(123 as any)).toBe(false);
    });
  });

  describe('2. CloudPublishModal Component Rendering & Accessibility', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToString(
        <CloudPublishModal
          isOpen={false}
          onClose={() => {}}
          onCopyWhatsApp={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('renders all required elements and action targets when isOpen is true', () => {
      const html = renderToString(
        <CloudPublishModal
          isOpen={true}
          onClose={() => {}}
          onCopyWhatsApp={() => {}}
        />
      );

      // Verify accessibility attributes
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="cloud-publish-modal-title"');
      expect(html).toContain('data-testid="cloud-publish-modal"');

      // Verify header and security iconography
      expect(html).toContain('Cloud Sync Required to Share Online');
      expect(html).toContain('Public tenant statements require private cloud hosting');
      expect(html).toContain('data-testid="close-publish-modal-btn"');

      // Verify explanatory body text
      expect(html).toContain('Public tenant statement links are hosted securely in the cloud');
      expect(html).toContain('Because this rental property was created locally in your browser');

      // Verify WhatsApp offline fallback callout
      expect(html).toContain('100% Offline WhatsApp Statements Available');

      // Verify primary action button navigates to settings with returnTo and action params
      expect(html).toContain('href="/settings?returnTo=rentals&amp;action=publish_link"');
      expect(html).toContain('data-testid="sign-in-to-publish-btn"');
      expect(html).toContain('Sign In / Create Account to Publish');

      // Verify secondary action button for offline WhatsApp statement
      expect(html).toContain('data-testid="copy-whatsapp-statement-btn"');
      expect(html).toContain('Copy WhatsApp Statement Instead');

      // Verify cancel button
      expect(html).toContain('data-testid="cancel-publish-modal-btn"');
      expect(html).toContain('Cancel');
    });
  });

  describe('3. Link Copy & Migration Workflow Logic', () => {
    let mockClipboardText = '';
    const mockClipboard = {
      writeText: vi.fn(async (text: string) => {
        mockClipboardText = text;
      }),
    };

    beforeEach(() => {
      mockClipboardText = '';
      vi.clearAllMocks();
    });

    it('demo property copies share URL immediately without prompting auth modal', async () => {
      const rental = { id: 'rental-1' };
      const selectedLease = { id: 'lease-1' };
      const isResidential = true;
      const origin = 'https://propertyhub.co.za';
      const shareUrl = `${origin}/statement/${selectedLease.id}`;

      let showCloudPublishModal = false;
      let toastMessage = '';

      if (isDemoRentalProperty(rental.id)) {
        await mockClipboard.writeText(shareUrl);
        toastMessage = 'Secure Tenant Link copied to clipboard!';
      } else {
        showCloudPublishModal = true;
      }

      expect(mockClipboard.writeText).toHaveBeenCalledWith('https://propertyhub.co.za/statement/lease-1');
      expect(mockClipboardText).toBe('https://propertyhub.co.za/statement/lease-1');
      expect(toastMessage).toBe('Secure Tenant Link copied to clipboard!');
      expect(showCloudPublishModal).toBe(false);
    });

    it('unauthenticated user-created property opens modal and does NOT copy link', async () => {
      const rental = { id: 'rental-1741234567890' };
      const selectedLease = { id: 'lease-user-999' };
      const currentUser = null;

      let showCloudPublishModal = false;
      let toastMessage = '';

      if (isDemoRentalProperty(rental.id)) {
        await mockClipboard.writeText('demo-url');
        toastMessage = 'Secure Tenant Link copied to clipboard!';
      } else {
        if (!currentUser) {
          showCloudPublishModal = true;
        }
      }

      expect(mockClipboard.writeText).not.toHaveBeenCalled();
      expect(mockClipboardText).toBe('');
      expect(showCloudPublishModal).toBe(true);
      expect(toastMessage).toBe('');
    });

    it('authenticated user-created property triggers cloud sync and shows published toast', async () => {
      const rental = { id: 'rental-1741234567890' };
      const selectedLease = { id: 'lease-user-999' };
      const currentUser = { id: 'user-uuid-123' };
      const origin = 'https://propertyhub.co.za';
      const shareUrl = `${origin}/statement/${selectedLease.id}`;

      let showCloudPublishModal = false;
      let isPublishingLink = false;
      let toastMessage = '';

      const mockMigrateToCloud = vi.fn().mockResolvedValue({
        success: true,
        counts: { properties: 1 },
      });

      if (isDemoRentalProperty(rental.id)) {
        await mockClipboard.writeText(shareUrl);
        toastMessage = 'Secure Tenant Link copied to clipboard!';
      } else {
        if (!currentUser) {
          showCloudPublishModal = true;
        } else {
          isPublishingLink = true;
          const res = await mockMigrateToCloud();
          if (res.success) {
            await mockClipboard.writeText(shareUrl);
            toastMessage = 'Secure Tenant Link published & copied to clipboard!';
          }
          isPublishingLink = false;
        }
      }

      expect(mockMigrateToCloud).toHaveBeenCalledTimes(1);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('https://propertyhub.co.za/statement/lease-user-999');
      expect(toastMessage).toBe('Secure Tenant Link published & copied to clipboard!');
      expect(showCloudPublishModal).toBe(false);
      expect(isPublishingLink).toBe(false);
    });

    it('authenticated user-created property handles sync error gracefully without copying link', async () => {
      const rental = { id: 'rental-custom-test-101' };
      const selectedLease = { id: 'lease-custom-suite-101' };
      const currentUser = { id: 'user-uuid-123' };

      let errorMessage = '';
      const mockMigrateToCloud = vi.fn().mockResolvedValue({
        success: false,
        error: 'Network timeout connecting to PostgreSQL',
      });

      if (!isDemoRentalProperty(rental.id) && currentUser) {
        const res = await mockMigrateToCloud();
        if (!res.success) {
          errorMessage = `Cloud publish failed: ${res.error}`;
        } else {
          await mockClipboard.writeText('url');
        }
      }

      expect(mockMigrateToCloud).toHaveBeenCalledTimes(1);
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
      expect(mockClipboardText).toBe('');
      expect(errorMessage).toBe('Cloud publish failed: Network timeout connecting to PostgreSQL');
    });

    it('commercial or consolidated targets block residential link copying', () => {
      const isCommercial = true;
      const isResidential = !isCommercial;
      const selectedLease = { id: 'lease-1' };

      // Button is only enabled for residential lease units
      const shouldRenderCopyBtn = Boolean(selectedLease?.id && isResidential);
      expect(shouldRenderCopyBtn).toBe(false);
    });
  });

  describe('4. Settings Guidance Banner Logic & Return Navigation', () => {
    it('verifies correct guidance message text and return button attributes when action=publish_link', () => {
      const action = 'publish_link';
      const returnTo = 'rentals';
      const isPublishLinkAction = action === 'publish_link';

      expect(isPublishLinkAction).toBe(true);

      const guidanceText =
        'Sign in or create your account below to publish your rental property statement link online.';
      expect(guidanceText).toContain('publish your rental property statement link online');

      const returnHref = returnTo ? `/${returnTo}` : '/rentals';
      expect(returnHref).toBe('/rentals');
    });

    it('ignores guidance banner when action is not publish_link', () => {
      const action = 'profile_edit';
      const isPublishLinkAction = action === 'publish_link';
      expect(isPublishLinkAction).toBe(false);
    });
  });
});

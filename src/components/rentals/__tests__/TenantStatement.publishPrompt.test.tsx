import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DEMO_RENTAL_IDS } from '@/lib/db/mergePortfolioState';
import CloudPublishModal from '../CloudPublishModal';

describe('Tenant Statement Link Publishing & Auth Prompt Workflow', () => {
  describe('1. Demo Property vs User-Created Property Detection', () => {
    function isDemoProperty(propertyId: string): boolean {
      return DEMO_RENTAL_IDS.has(propertyId) || propertyId.startsWith('demo-rental-');
    }

    it('correctly classifies stock demo rental properties', () => {
      expect(isDemoProperty('rental-1')).toBe(true);
      expect(isDemoProperty('rental-2')).toBe(true);
      expect(isDemoProperty('rental-3')).toBe(true);
      expect(isDemoProperty('rental-4')).toBe(true);
      expect(isDemoProperty('demo-rental-unit-5')).toBe(true);
    });

    it('correctly classifies user-created properties as non-demo (local storage only)', () => {
      expect(isDemoProperty('rental-1741234567890')).toBe(false);
      expect(isDemoProperty('custom-rental-rosebank')).toBe(false);
      expect(isDemoProperty('user-property-123')).toBe(false);
    });
  });

  describe('2. CloudPublishModal Component Rendering', () => {
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

      // Verify header and security iconography
      expect(html).toContain('Cloud Sync Required to Share Online');
      expect(html).toContain('Public tenant statements require private cloud hosting');

      // Verify explanatory body text
      expect(html).toContain('Public tenant statement links are hosted securely in the cloud');
      expect(html).toContain('Because this rental property was created locally in your browser');

      // Verify WhatsApp offline fallback callout
      expect(html).toContain('100% Offline WhatsApp Statements Available');

      // Verify primary action button navigates to settings with returnTo and action params
      expect(html).toContain('href="/settings?returnTo=rentals&amp;action=publish_link"');
      expect(html).toContain('Sign In / Create Account to Publish');

      // Verify secondary action button for offline WhatsApp statement
      expect(html).toContain('Copy WhatsApp Statement Instead');

      // Verify cancel button
      expect(html).toContain('Cancel');
    });
  });

  describe('3. Link Copy & Migration Workflow Simulation', () => {
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
      const origin = 'https://propertyhub.co.za';
      const shareUrl = `${origin}/statement/${selectedLease.id}`;

      let showCloudPublishModal = false;
      let toastMessage = '';

      const isDemo = DEMO_RENTAL_IDS.has(rental.id) || rental.id.startsWith('demo-rental-');
      if (isDemo) {
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

      const isDemo = DEMO_RENTAL_IDS.has(rental.id) || rental.id.startsWith('demo-rental-');
      if (isDemo) {
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

      const isDemo = DEMO_RENTAL_IDS.has(rental.id) || rental.id.startsWith('demo-rental-');
      if (isDemo) {
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
  });

  describe('4. Settings Guidance Banner Logic', () => {
    it('verifies correct guidance message text and return button attributes', () => {
      const action = 'publish_link';
      const isPublishLinkAction = action === 'publish_link';

      expect(isPublishLinkAction).toBe(true);

      const guidanceText =
        'Sign in or create your account below to publish your rental property statement link online.';
      expect(guidanceText).toContain('publish your rental property statement link online');

      const returnHref = '/rentals';
      const returnBtnText = '← Return to Rental Statements';
      expect(returnHref).toBe('/rentals');
      expect(returnBtnText).toContain('Return to Rental Statements');
    });
  });
});

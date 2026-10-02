import { test, expect } from '@playwright/test';

const SUPABASE_PROJECT_ID = 'wawpfdbymgseodftemsz';
const SUPABASE_BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

const mockUser = {
  id: 'usr_playwright_landlord_888',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'landlord.publish@propertyhub.co.za',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const customRentalProperty = {
  id: 'rental-custom-test-101',
  title: 'Sandton Grand Luxury Suite',
  address: '150 West Street',
  city: 'Johannesburg',
  propertyType: 'Sectional Title Apartment',
  marketValueZAR: 2800000,
  purchasePriceZAR: 2400000,
  purchaseDate: '2024-03-01',
  monthlyGrossRentZAR: 19500,
  outstandingBondBalanceZAR: 1800000,
  bondInterestRatePercent: 11.75,
  monthlyMaintenanceReserveZAR: 600,
  maintenanceHistory: [],
  status: 'Occupied',
  leases: [
    {
      id: 'lease-custom-suite-101',
      unitName: 'Suite 101',
      tenantName: 'Keabetswe Motsepe',
      monthlyRentZAR: 19500,
      depositHeldZAR: 39000,
      annualEscalationPercent: 8,
      status: 'Occupied',
      leaseStartDate: '2025-01-01',
      leaseEndDate: '2025-12-31',
    },
  ],
  utilityStatements: [],
  meterReadings: [],
};

test.describe('Tenant Statement Link Publishing & Auth Prompt Workflow', () => {
  test('1. Demo property copies link directly without modal prompt', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });

    // Open Tenant Statement modal on the first rental property (demo property rental-1)
    const statementBtn = page.locator('button:has-text("Utilities & Statement")').first();
    await expect(statementBtn).toBeVisible({ timeout: 15_000 });
    await statementBtn.click();

    // Verify statement modal is open
    const printRoot = page.locator('#tenant-statement-print-root');
    await expect(printRoot).toBeVisible({ timeout: 10_000 });

    // Click Copy Secure Tenant Link
    const copyLinkBtn = page.locator('[data-testid="copy-tenant-link-btn"]');
    await expect(copyLinkBtn).toBeVisible();
    await copyLinkBtn.click();

    // Verify CloudPublishModal is NOT opened for demo property
    const publishModal = page.locator('[data-testid="cloud-publish-modal"]');
    await expect(publishModal).not.toBeVisible();

    // Verify green toast confirmation
    await expect(page.getByText('Secure Tenant Link copied to clipboard!')).toBeVisible({ timeout: 5_000 });
  });

  test('2. User-created property while logged out opens CloudPublishModal with WhatsApp fallback and Settings navigation', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Pre-seed local storage with custom user property and clear any auth tokens
    await page.addInitScript(({ customProp, projectId }) => {
      window.localStorage.removeItem(`sb-${projectId}-auth-token`);
      window.localStorage.removeItem('cloud_sync_completed');

      const raw = window.localStorage.getItem('sa_property_portfolio_hub_v1');
      const parsed = raw ? JSON.parse(raw) : { state: { rentals: [] } };
      parsed.state.rentals = [customProp, ...(parsed.state.rentals || [])];
      window.localStorage.setItem('sa_property_portfolio_hub_v1', JSON.stringify(parsed));
    }, { customProp: customRentalProperty, projectId: SUPABASE_PROJECT_ID });

    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });

    // Locate the custom property card and open statement modal
    const customCard = page.locator('[data-testid="rental-card-rental-custom-test-101"]');
    await expect(customCard).toBeVisible({ timeout: 15_000 });

    const statementBtn = customCard.locator('button:has-text("Utilities & Statement")').first();
    await expect(statementBtn).toBeVisible();
    await statementBtn.click();

    // Click Copy Secure Tenant Link on the un-synced custom property
    const copyLinkBtn = page.locator('[data-testid="copy-tenant-link-btn"]');
    await expect(copyLinkBtn).toBeVisible();
    await copyLinkBtn.click();

    // Verify CloudPublishModal appears
    const publishModal = page.locator('[data-testid="cloud-publish-modal"]');
    await expect(publishModal).toBeVisible({ timeout: 5_000 });
    await expect(publishModal).toContainText('Cloud Sync Required to Share Online');
    await expect(publishModal).toContainText('Public tenant statement links are hosted securely in the cloud');

    // Test secondary action: Copy WhatsApp Statement Instead
    const whatsappBtn = publishModal.locator('[data-testid="copy-whatsapp-statement-btn"]');
    await expect(whatsappBtn).toBeVisible();
    await whatsappBtn.click();

    // Verify modal dismissed and WhatsApp copied toast displayed
    await expect(publishModal).not.toBeVisible();
    await expect(page.getByText('WhatsApp Statement copied to clipboard!')).toBeVisible({ timeout: 5_000 });

    // Click Copy Secure Tenant Link again (statement modal remains open) to test primary action navigation
    await copyLinkBtn.click();
    await expect(publishModal).toBeVisible();

    const signInBtn = publishModal.locator('[data-testid="sign-in-to-publish-btn"]');
    await expect(signInBtn).toBeVisible();
    await expect(signInBtn).toHaveAttribute('href', '/settings?returnTo=rentals&action=publish_link');

    await signInBtn.click();
    await page.waitForURL('**/settings?returnTo=rentals&action=publish_link');

    // Verify settings guidance banner is rendered
    const guidanceBanner = page.locator('[data-testid="publish-link-guidance-banner"]');
    await expect(guidanceBanner).toBeVisible();
    await expect(guidanceBanner).toContainText(
      'Sign in or create your account below to publish your rental property statement link online.'
    );

    // Verify return button is not visible while unauthenticated
    const returnBtn = guidanceBanner.locator('[data-testid="return-to-rentals-btn"]');
    await expect(returnBtn).not.toBeVisible();
  });

  test('3. User-created property while logged in automatically triggers on-the-fly sync and copies link', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Route Supabase auth user check and token refresh
    await page.route(`${SUPABASE_BASE_URL}/auth/v1/user*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      });
    });

    await page.route(`${SUPABASE_BASE_URL}/auth/v1/token*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-jwt-token-authenticated',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh-token',
          user: mockUser,
        }),
      });
    });

    // Route Supabase REST API upsert endpoints
    await page.route(`${SUPABASE_BASE_URL}/rest/v1/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Seed authenticated session and custom property in localStorage
    await page.addInitScript(({ customProp, projectId, user }) => {
      window.localStorage.setItem(
        `sb-${projectId}-auth-token`,
        JSON.stringify({
          access_token: 'mock-jwt-token-authenticated',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh-token',
          user,
        })
      );

      const raw = window.localStorage.getItem('sa_property_portfolio_hub_v1');
      const parsed = raw ? JSON.parse(raw) : { state: { rentals: [] } };
      parsed.state.rentals = [customProp, ...(parsed.state.rentals || [])];
      window.localStorage.setItem('sa_property_portfolio_hub_v1', JSON.stringify(parsed));
    }, { customProp: customRentalProperty, projectId: SUPABASE_PROJECT_ID, user: mockUser });

    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });

    // Open statement modal on custom property
    const customCard = page.locator('[data-testid="rental-card-rental-custom-test-101"]');
    await expect(customCard).toBeVisible({ timeout: 15_000 });

    const statementBtn = customCard.locator('button:has-text("Utilities & Statement")').first();
    await expect(statementBtn).toBeVisible();
    await statementBtn.click();

    // Click Copy Secure Tenant Link
    const copyLinkBtn = page.locator('[data-testid="copy-tenant-link-btn"]');
    await expect(copyLinkBtn).toBeVisible();
    await copyLinkBtn.click();

    // Verify CloudPublishModal is NOT opened
    const publishModal = page.locator('[data-testid="cloud-publish-modal"]');
    await expect(publishModal).not.toBeVisible();

    // Verify toast confirms on-the-fly publication & link copy
    await expect(page.getByText('Secure Tenant Link published & copied to clipboard!')).toBeVisible({
      timeout: 10_000,
    });

    // Visit settings page with publish_link action while authenticated
    await page.goto('/settings?returnTo=rentals&action=publish_link', { waitUntil: 'domcontentloaded' });

    const guidanceBanner = page.locator('[data-testid="publish-link-guidance-banner"]');
    await expect(guidanceBanner).toBeVisible();

    // Verify "← Return to Rental Statements" button is visible and links to /rentals
    const returnBtn = guidanceBanner.locator('[data-testid="return-to-rentals-btn"]');
    await expect(returnBtn).toBeVisible();
    await expect(returnBtn).toContainText('Return to Rental Statements');
    await expect(returnBtn).toHaveAttribute('href', '/rentals');
  });
});

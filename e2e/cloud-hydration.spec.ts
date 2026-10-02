import { test, expect } from '@playwright/test';

const SUPABASE_PROJECT_ID = 'wawpfdbymgseodftemsz';
const SUPABASE_BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

test.describe('Cross-Device Cloud Hydration and Safe Data Merge', () => {
  const mockUser = {
    id: 'usr_playwright_test_999',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'investor.hydration@propertyhub.co.za',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  const cloudProperties = [
    {
      id: 'cloud-rental-playwright-1',
      user_id: 'usr_playwright_test_999',
      title: 'Umhlanga Beachfront Villa',
      address: '1 Ocean Way, Umhlanga',
      city: 'Durban',
      market_value_zar: 5000000,
      purchase_price_zar: 4500000,
      monthly_gross_rent_zar: 35000,
      monthly_levies_zar: 3000,
      monthly_rates_taxes_zar: 2000,
      monthly_agent_fee_zar: 2800,
      monthly_maintenance_reserve_zar: 1000,
      status: 'Occupied',
      leases: [],
      maintenance_history: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const cloudProfile = [
    {
      id: 'usr_playwright_test_999',
      user_id: 'usr_playwright_test_999',
      entity_name: 'Cloud Playwright Holdings',
      liquid_capital_reserve_zar: 750000,
      rental_forecast_view: 'wealth-only',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  test('1. Hydrates cloud portfolio, merges non-conflicting local items, and resets to demo on sign-out', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // Mock Supabase auth endpoints
    await page.route(`${SUPABASE_BASE_URL}/auth/v1/token*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-jwt-token-playwright',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: mockUser,
        }),
      });
    });

    await page.route(`${SUPABASE_BASE_URL}/auth/v1/user*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
      });
    });

    await page.route(`${SUPABASE_BASE_URL}/auth/v1/logout*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Mock Supabase table queries
    await page.route(`${SUPABASE_BASE_URL}/rest/v1/**`, async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'GET') {
        if (url.includes('/properties')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(cloudProperties),
          });
          return;
        }
        if (url.includes('/profiles')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(cloudProfile),
          });
          return;
        }
      }

      // Default empty array for other tables / upsert / delete
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate to settings page
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    // Seed local storage with a user-created local rental before signing in
    await page.evaluate(() => {
      const raw = localStorage.getItem('sa_property_portfolio_hub_v1');
      const parsed = raw ? JSON.parse(raw) : { state: {} };
      if (!parsed.state) parsed.state = {};
      parsed.state.rentals = [
        {
          id: 'rental-local-unique-777',
          title: 'Unique Local Rosebank Studio',
          address: '77 Oxford Road, Rosebank',
          city: 'Johannesburg',
          marketValueZAR: 1500000,
          purchasePriceZAR: 1300000,
          monthlyGrossRentZAR: 12000,
          status: 'Occupied',
          leases: [],
          maintenanceHistory: [],
        },
      ];
      parsed.state.analyzerDraft = {
        purchasePrice: 2450000,
        openMarketValue: 3100000,
      };
      localStorage.setItem('sa_property_portfolio_hub_v1', JSON.stringify(parsed));
    });

    // Sign in using the settings form
    const cloudSyncCard = page.locator('[data-testid="cloud-sync-card"]');
    await expect(cloudSyncCard).toBeVisible({ timeout: 30000 });

    const emailInput = cloudSyncCard.locator('input[type="email"]');
    const passwordInput = cloudSyncCard.locator('input[type="password"]');
    const signInBtn = cloudSyncCard.locator('button[type="submit"]');

    await emailInput.fill('investor.hydration@propertyhub.co.za');
    await passwordInput.fill('Password123!');
    await signInBtn.click();

    // Verify Cloud Connected badge appears
    const connectedBadge = page.locator('[data-testid="cloud-status-badge"]');
    await expect(connectedBadge).toBeVisible({ timeout: 30000 });

    // Verify Refresh from Cloud button exists
    const refreshBtn = page.locator('[data-testid="refresh-cloud-btn"]');
    await expect(refreshBtn).toBeVisible({ timeout: 30000 });

    // Click Refresh from Cloud
    await refreshBtn.click();

    // Verify hydration success banner
    const hydrateBanner = page.locator('[data-testid="hydrate-success-banner"]');
    await expect(hydrateBanner).toBeVisible({ timeout: 30000 });
    await expect(hydrateBanner).toContainText('Cloud Refresh Complete');

    // Verify local storage / store state has merged both cloud and unique local properties
    const stateCheck = await page.evaluate(() => {
      const raw = localStorage.getItem('sa_property_portfolio_hub_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const rentals = parsed.state?.rentals || [];
      return {
        rentalCount: rentals.length,
        hasCloudItem: rentals.some((r: any) => r.id === 'cloud-rental-playwright-1'),
        hasLocalItem: rentals.some((r: any) => r.id === 'rental-local-unique-777'),
        hasStockDemoItem: rentals.some((r: any) => r.id === 'rental-1'),
        profileName: parsed.state?.investorProfile?.entityName,
        analyzerPurchasePrice: parsed.state?.analyzerDraft?.purchasePrice,
      };
    });

    expect(stateCheck).not.toBeNull();
    expect(stateCheck?.hasCloudItem).toBe(true);
    expect(stateCheck?.hasLocalItem).toBe(true);
    // Stock demo item (rental-1) should NOT be present in merged state
    expect(stateCheck?.hasStockDemoItem).toBe(false);
    expect(stateCheck?.profileName).toBe('Cloud Playwright Holdings');
    // Active in-flight analyzer draft must have been preserved during hydration
    expect(stateCheck?.analyzerPurchasePrice).toBe(2450000);

    // Now test Sign Out
    const signOutBtn = page.locator('button:has-text("Sign Out")');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // After sign-out, verify return to unauthenticated state
    await expect(page.locator('[data-testid="local-mode-badge"]')).toBeVisible({ timeout: 10000 });

    // Verify localStorage has been reset to stock demo data
    const resetCheck = await page.evaluate(() => {
      const raw = localStorage.getItem('sa_property_portfolio_hub_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const rentals = parsed.state?.rentals || [];
      const syncCompleted = localStorage.getItem('cloud_sync_completed');
      return {
        hasStockDemo: rentals.some((r: any) => r.id === 'rental-1'),
        hasCloudItem: rentals.some((r: any) => r.id === 'cloud-rental-playwright-1'),
        hasLocalUniqueItem: rentals.some((r: any) => r.id === 'rental-local-unique-777'),
        syncCompleted,
      };
    });

    expect(resetCheck?.hasStockDemo).toBe(true);
    expect(resetCheck?.hasCloudItem).toBe(false);
    expect(resetCheck?.hasLocalUniqueItem).toBe(false);
    expect(resetCheck?.syncCompleted).toBeNull();
  });
});

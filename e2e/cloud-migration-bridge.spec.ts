import { test, expect } from '@playwright/test';

const SUPABASE_PROJECT_ID = 'wawpfdbymgseodftemsz';
const SUPABASE_BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

test.describe('Local-to-Cloud Database Migration Bridge', () => {
  test('1. POC Freedom: Unauthenticated users can navigate all pages without any auth gate', async ({ page }) => {
    test.setTimeout(120_000);

    const pages = [
      { name: 'Dashboard', path: '/' },
      { name: 'Analyzer', path: '/analyzer' },
      { name: 'Flips', path: '/flips' },
      { name: 'Funding', path: '/funding' },
      { name: 'Rentals', path: '/rentals' },
      { name: 'Tasks', path: '/tasks' },
      { name: 'Proposal', path: '/proposal' },
      { name: 'Settings', path: '/settings' },
    ];

    for (const p of pages) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });

      // Verify no forced redirect to auth / login
      expect(page.url()).toContain(p.path);

      // Verify main container renders
      await expect(page.locator('main')).toBeVisible();

      // Ensure no blocking modal forcing login
      const forcedLoginModal = page.locator('text="Please log in to continue"');
      await expect(forcedLoginModal).not.toBeVisible();
    }
  });

  test('2. Settings page renders the Cloud Sync card with Local Storage Only badge and inline auth controls', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    // Verify Cloud Database Synchronization card exists
    const cloudSyncCard = page.locator('[data-testid="cloud-sync-card"]');
    await expect(cloudSyncCard).toBeVisible();
    await expect(cloudSyncCard).toContainText('Cloud Database Synchronization');

    // Verify "Local Storage Only" status badge is shown
    const localBadge = page.locator('[data-testid="local-mode-badge"]');
    await expect(localBadge).toBeVisible();
    await expect(localBadge).toContainText('Local Storage Only');

    // Verify non-intrusive POC explanation
    await expect(cloudSyncCard).toContainText('POC Zero-Gate Experience');

    // Verify inline auth toggles
    const signInTab = page.locator('[data-testid="auth-mode-signin"]');
    const signUpTab = page.locator('[data-testid="auth-mode-signup"]');
    await expect(signInTab).toBeVisible();
    await expect(signUpTab).toBeVisible();

    // Default mode is Sign In
    const submitBtn = cloudSyncCard.locator('button[type="submit"]');
    await expect(submitBtn).toContainText('Sign In');

    // Toggle to Create Account
    await signUpTab.click();
    await expect(submitBtn).toContainText('Create Account');

    // Toggle back to Sign In
    await signInTab.click();
    await expect(submitBtn).toContainText('Sign In');
  });

  test('3. Authenticated session displays Cloud Connected status and handles Sync Local Data to Cloud trigger', async ({ page }) => {
    test.setTimeout(90_000);

    const mockUser = {
      id: 'usr_playwright_test_999',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'investor.bridge@propertyhub.co.za',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    // Route Supabase password sign-in endpoint
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

    // Route Supabase auth user check
    await page.route(`${SUPABASE_BASE_URL}/auth/v1/user*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser),
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

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    // Use the inline sign-in form to log in
    const cloudSyncCard = page.locator('[data-testid="cloud-sync-card"]');
    await expect(cloudSyncCard).toBeVisible();

    const emailInput = cloudSyncCard.locator('input[type="email"]');
    const passwordInput = cloudSyncCard.locator('input[type="password"]');
    const signInBtn = cloudSyncCard.locator('button[type="submit"]');

    await emailInput.fill('investor.bridge@propertyhub.co.za');
    await passwordInput.fill('SecurePass123!');
    await signInBtn.click();

    // Verify Cloud Connected badge appears
    const connectedBadge = page.locator('[data-testid="cloud-status-badge"]');
    await expect(connectedBadge).toBeVisible({ timeout: 10000 });
    await expect(connectedBadge).toContainText('Cloud Connected');

    // Verify user email is displayed
    await expect(cloudSyncCard).toContainText('investor.bridge@propertyhub.co.za');

    // Verify Sync button exists
    const syncBtn = page.locator('[data-testid="sync-cloud-btn"]');
    await expect(syncBtn).toBeVisible();
    await expect(syncBtn).toContainText('Sync Local Data to Cloud');

    // Trigger sync
    await syncBtn.click();

    // Verify success banner appears
    const successBanner = page.locator('[data-testid="sync-success-banner"]');
    await expect(successBanner).toBeVisible({ timeout: 15000 });
    await expect(successBanner).toContainText('Cloud Portfolio Migration Complete');
    await expect(successBanner).toContainText('Profile: 1');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Cloud Database Authentication & Password Recovery Flow', () => {
  test('1. Switches to Forgot Password view and returns Back to Sign In', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' });

    // Verify Cloud Database Synchronization card is visible
    const syncCard = page.locator('text=Cloud Database Synchronization').first();
    await expect(syncCard).toBeVisible({ timeout: 15_000 });

    // Locate "Forgot password?" link on Sign In form
    const forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    await expect(forgotPasswordLink).toBeVisible();

    // Click "Forgot password?"
    await forgotPasswordLink.click();

    // Verify form transitions to Reset Your Password view
    await expect(page.locator('text=Reset Your Password')).toBeVisible();
    await expect(page.locator('[data-testid="forgot-password-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-reset-link-btn"]')).toBeVisible();

    // Click "Back to Sign In"
    const backBtn = page.locator('[data-testid="back-to-signin-btn"]');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Verify restored Sign In form
    await expect(forgotPasswordLink).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")').first()).toBeVisible();
  });

  test('2. Enforces minimum 8-character password constraint on Sign Up and Sign In', async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' });

    // Switch to Create Account mode
    const signUpTab = page.locator('[data-testid="auth-mode-signup"]');
    await expect(signUpTab).toBeVisible({ timeout: 15_000 });
    await signUpTab.click();

    // Verify min. 8 characters hint is displayed
    await expect(page.locator('text=Min. 8 characters')).toBeVisible();

    // Verify password input has minLength="8" attribute
    const passwordInput = page.locator('[data-testid="auth-password-input"]');
    await expect(passwordInput).toHaveAttribute('minLength', '8');
  });

  test('3. Detects password recovery session and renders Set New Password form', async ({ page }) => {
    // Navigate with recovery hash parameter
    await page.goto('/settings#recovery', { waitUntil: 'networkidle' });

    // Verify Set New Password view is active
    await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Recovery Session', { exact: true })).toBeVisible();

    // Verify New Password and Confirm New Password inputs exist with minLength=8
    const newPwd = page.locator('[data-testid="new-password-input"]');
    const confirmPwd = page.locator('[data-testid="confirm-new-password-input"]');
    await expect(newPwd).toBeVisible();
    await expect(confirmPwd).toBeVisible();
    await expect(newPwd).toHaveAttribute('minLength', '8');
    await expect(confirmPwd).toHaveAttribute('minLength', '8');

    // Verify save button exists
    await expect(page.locator('[data-testid="save-new-password-btn"]')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('Secure Tenant Statement Portal', () => {
  test('1. Security Guardrail: Non-existent lease ID displays 404 Not Found', async ({ page }) => {
    await page.goto('/statement/invalid-lease-id-99999');

    // Verify 404 Not Found content is rendered to user
    const notFoundHeading = page.locator('h1:has-text("404")').or(page.locator('text="404 - Not Found"'));
    await expect(notFoundHeading).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/could not be found|404/i);
  });

  test('2. Landlord View: Modal includes Copy Secure Tenant Link button', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });

    // Open Tenant Statement modal on the first rental property using "Utilities & Statement" button
    const statementBtn = page.locator('button:has-text("Utilities & Statement")').first();
    await expect(statementBtn).toBeVisible({ timeout: 15_000 });
    await statementBtn.click();

    // Verify modal print root is visible
    const printRoot = page.locator('#tenant-statement-print-root');
    await expect(printRoot).toBeVisible({ timeout: 10_000 });

    // Verify Copy Secure Tenant Link button is visible
    const copyLinkBtn = page.locator('[data-testid="copy-tenant-link-btn"]');
    await expect(copyLinkBtn).toBeVisible();
    await expect(copyLinkBtn).toContainText('Copy Secure Tenant Link');

    // Click the copy button
    await copyLinkBtn.click();

    // Verify clipboard feedback toast or status notification is shown
    await expect(page.getByText(/Link copied/i)).toBeVisible({ timeout: 5_000 });
  });

  test('3. Tenant Portal View: Valid lease link renders statement with month selector and ledger', async ({ page }) => {
    await page.goto('/statement/lease-1', { waitUntil: 'networkidle' });

    // Verify print root is rendered
    const printRoot = page.locator('#tenant-statement-print-root');
    await expect(printRoot).toBeVisible({ timeout: 15_000 });

    // Verify landlord branding & tenant details
    await expect(printRoot.getByText('Dr. Thabo Mokoena')).toBeVisible();
    await expect(printRoot.getByText('Sandhurst Executive Suite').first()).toBeVisible();

    // Verify download PDF button
    const downloadBtn = page.locator('button:has-text("Download Statement (PDF)")');
    await expect(downloadBtn).toBeVisible();

    // Verify financial breakdown total
    await expect(printRoot.getByText('TOTAL AMOUNT PAYABLE')).toBeVisible();

    // Capture visual snapshot into test results
    await page.screenshot({ path: 'test-results/tenant-statement-portal.png', fullPage: true });
  });
});

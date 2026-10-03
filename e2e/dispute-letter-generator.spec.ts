import { test, expect } from '@playwright/test';

test.describe('Municipal Bill Dispute Letter & Meter Registry Flow', () => {
  test('navigates to rentals, opens meter readings for disputed property, manages meter registry, and generates dispute letter', async ({ page }) => {
    // Navigate to Rentals page
    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });

    // Wait for client hydration to complete
    await page.locator('text=Initializing SA Property Hub...').waitFor({ state: 'detached', timeout: 30_000 });

    // Open Meter Readings for the 2nd rental property (Umhlanga Ridge Coastal Vista, which has active dispute in demo data)
    const logMeterButtons = page.locator('button:has-text("Log Meter")');
    await expect(logMeterButtons.first()).toBeVisible({ timeout: 20_000 });

    const umhlangaBtn = logMeterButtons.nth(1);
    await umhlangaBtn.click();

    // Verify Meter Readings Modal is visible
    const meterModalHeading = page.locator('text=Physical & Municipal Meter Readings').first();
    await expect(meterModalHeading).toBeVisible({ timeout: 10_000 });

    // Verify Property Meters registry button / counter chip is visible on larger screens
    const metersChip = page.locator('button:has-text("Meters (")').first();
    if (await metersChip.isVisible()) {
      await metersChip.click();

      // Verify Property Meter Registry modal opens
      const registryTitle = page.locator('text=Property Meter Registry').first();
      await expect(registryTitle).toBeVisible();

      // Close Property Meter Registry modal using its Close button
      const closeRegistryBtn = page.locator('button:has-text("Close")').last();
      await closeRegistryBtn.click();
      await expect(registryTitle).toBeHidden();
    }

    // Verify Generate Dispute PDF button is visible in the active dispute banner
    const generatePdfBtn = page.locator('button:has-text("Generate Dispute PDF")').first();
    await expect(generatePdfBtn).toBeVisible({ timeout: 10_000 });
    await generatePdfBtn.click();

    // Verify Dispute Letter Modal opens
    const disputeModalTitle = page.locator('text=Municipal Bill Dispute Letter & PDF Generator').first();
    await expect(disputeModalTitle).toBeVisible({ timeout: 10_000 });

    // Verify pre-populated fields in editor tab
    await expect(page.locator('text=Municipal Authority & Account Information')).toBeVisible();
    await expect(page.locator('text=Physical Meter Reading & Statement Discrepancy')).toBeVisible();
    await expect(page.locator('text=Photographic Evidence (Annexure A - Direct PDF Embed)')).toBeVisible();
    await expect(page.locator('text=Zero Supabase Upload')).toBeVisible();

    // Verify 1-Click Mailto & Copy actions in footer
    const mailtoLink = page.locator('a:has-text("Open in Email")').first();
    await expect(mailtoLink).toBeVisible();

    const copyBtn = page.locator('button:has-text("Copy Letter")').first();
    await expect(copyBtn).toBeVisible();

    // Verify Download Dispute PDF button exists
    const downloadPdfBtn = page.locator('button:has-text("Download Dispute PDF")').first();
    await expect(downloadPdfBtn).toBeVisible();

    // Switch to Official Letter Preview tab
    const previewTab = page.locator('button:has-text("Official Letter Preview")').first();
    await expect(previewTab).toBeVisible();
    await previewTab.click();

    // Verify template layout in Preview
    await expect(page.locator('text=MUNICIPAL BILL DISPUTE LETTER TEMPLATE').first()).toBeVisible();
    await expect(page.locator('text=Grounds for Dispute:').first()).toBeVisible();
    await expect(page.locator('text=Requested Action:').first()).toBeVisible();
    await expect(page.locator('text=To:').first()).toBeVisible();
    await expect(page.locator('text=Evidence Provided:').first()).toBeVisible();
  });
});

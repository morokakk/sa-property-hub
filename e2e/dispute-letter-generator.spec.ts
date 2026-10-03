import { test, expect } from '@playwright/test';

test.describe('Municipal Bill Dispute Letter & Meter Registry Flow', () => {
  test('navigates to rentals, manages meter registry, and opens dispute letter generator modal', async ({ page }) => {
    // Navigate to Rentals page
    await page.goto('/rentals');
    await expect(page).toHaveTitle(/Property/i);

    // Locate Umhlanga Ridge or first rental property card
    const rentalCard = page.locator('div').filter({ hasText: /Umhlanga Ridge Coastal Vista|Sandhurst Executive Suite/i }).first();
    await expect(rentalCard).toBeVisible({ timeout: 15_000 });

    // Open Meter Readings Modal
    const meterReadingsBtn = page.locator('button:has-text("Meter Readings"), button:has-text("Meters")').first();
    await meterReadingsBtn.click();

    // Verify Meter Readings Modal is visible
    const meterModal = page.locator('text=Meter Readings & Consumption Ledger').first();
    await expect(meterModal).toBeVisible({ timeout: 10_000 });

    // Verify Property Meters registry button / counter chip is visible
    const metersChip = page.locator('button:has-text("Meters"), button:has-text("Property Meters")').first();
    await expect(metersChip).toBeVisible();
    await metersChip.click();

    // Verify Property Meter Registry modal opens
    const registryTitle = page.locator('text=Property Meter Registry').first();
    await expect(registryTitle).toBeVisible();

    // Close Property Meter Registry modal
    const closeRegistryBtn = page.locator('button[aria-label="Close"], button:has-text("Cancel"), button:has-text("Done")').last();
    await closeRegistryBtn.click();

    // Switch to Disputes tab in Meter Readings Modal
    const disputesTab = page.locator('button:has-text("Disputes")').first();
    if (await disputesTab.isVisible()) {
      await disputesTab.click();
    }

    // Find and click "Generate Dispute Letter" or "Dispute Letter (PDF)"
    const disputeLetterBtn = page.locator('button:has-text("Dispute Letter"), button:has-text("Generate Dispute Letter")').first();
    await expect(disputeLetterBtn).toBeVisible({ timeout: 10_000 });
    await disputeLetterBtn.click();

    // Verify Dispute Letter Modal opens
    const disputeModalTitle = page.locator('text=Municipal Dispute Letter Generator').first();
    await expect(disputeModalTitle).toBeVisible();

    // Check pre-populated recipient, grounds for dispute, and account number
    await expect(page.locator('text=TO (REVENUE DEPT)')).toBeVisible();
    await expect(page.locator('text=Subject: FORMAL BILLING DISPUTE')).toBeVisible();

    // Switch to Live Preview Tab
    const previewTab = page.locator('button:has-text("Live Document Preview"), button:has-text("Preview")').first();
    if (await previewTab.isVisible()) {
      await previewTab.click();
      await expect(page.locator('text=MUNICIPAL BILL DISPUTE LETTER TEMPLATE').first()).toBeVisible();
      await expect(page.locator('text=Grounds for Dispute:').first()).toBeVisible();
      await expect(page.locator('text=Requested Action:').first()).toBeVisible();
    }

    // Verify 1-Click Mailto & Copy buttons exist
    const mailtoBtn = page.locator('a:has-text("Open Mail Client"), button:has-text("Open Mail Client")').first();
    await expect(mailtoBtn).toBeVisible();

    const copyBtn = page.locator('button:has-text("Copy Full Email Text")').first();
    await expect(copyBtn).toBeVisible();

    // Verify Download PDF button exists
    const downloadPdfBtn = page.locator('button:has-text("Download Dispute Letter PDF")').first();
    await expect(downloadPdfBtn).toBeVisible();

    // Close Dispute Letter Modal
    const closeDisputeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).last();
    if (await closeDisputeBtn.isVisible()) {
      await closeDisputeBtn.click();
    }
  });
});

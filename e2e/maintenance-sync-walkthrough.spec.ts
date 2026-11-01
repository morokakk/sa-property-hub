import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/morok/.gemini/antigravity/brain/edbb21de-f9fe-46e9-aebd-5d35a8ab8cde';

test.describe('Maintenance Ticketing & Cloud Sync Visual Walkthrough', () => {
  test('capture cloud sync status, tenant reporting flow, and verified appearance in landlord history', async ({ page }) => {
    test.setTimeout(180_000);

    // 1. Visit Rentals Dashboard
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });

    // Wait for ClientOnly initialization
    await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Screenshot 1: Cloud Sync Status Pill in Header
    const syncPill = page.locator('[data-testid="cloud-sync-status-pill"]');
    await expect(syncPill).toBeVisible();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_1_cloud_sync_pill.png'),
      fullPage: false,
    });

    // 2. Open Maintenance Modal on the first rental card
    const maintBtn = page.locator('button:has-text("Maintenance (")').first();
    await expect(maintBtn).toBeVisible();
    await maintBtn.click();
    await page.waitForTimeout(1500);

    // Verify modal header is visible
    const modalHeading = page.locator('h3:has-text("Maintenance History:")');
    await expect(modalHeading).toBeVisible();

    // Screenshot 2: Initial Maintenance Modal
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_2_maintenance_modal_lifecycle.png'),
      fullPage: false,
    });

    // Close modal by clicking X
    const closeIconBtn = page.locator('div.fixed.inset-0 button').first();
    if (await closeIconBtn.isVisible()) {
      await closeIconBtn.click();
      await page.waitForTimeout(800);
    }

    // 3. Navigate to Tenant Public Statement (/statement/lease-1)
    await page.goto('/statement/lease-1', { waitUntil: 'domcontentloaded' });
    await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Verify "Report Maintenance" button fits cleanly without spilling out
    const tenantMaintBtn = page.locator('[data-testid="report-maintenance-whatsapp-btn"]');
    await expect(tenantMaintBtn).toBeVisible();
    await tenantMaintBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);

    // Screenshot 3: Tenant Statement Viewer with compact Period Selector and Report Maintenance button
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_3_tenant_statement_maintenance_action.png'),
      fullPage: false,
    });

    // 4. Open and populate Tenant Maintenance Intake Modal
    await tenantMaintBtn.click();
    const intakeModal = page.locator('[data-testid="tenant-maintenance-modal"]');
    await expect(intakeModal).toBeVisible();

    // Select category Plumbing
    const catSelect = page.locator('[data-testid="tenant-maint-category"]');
    await catSelect.selectOption('Plumbing');

    // Click Urgency Emergency
    const emergencyBtn = page.locator('[data-testid="urgency-btn-emergency"]');
    await emergencyBtn.click();

    // Fill description
    const intakeDesc = page.locator('[data-testid="tenant-maint-description"]');
    await intakeDesc.fill('Geyser thermostat burst leaking severely into ceiling above main bathroom');

    // Fill preferred access
    const accessInput = page.locator('[data-testid="tenant-maint-access"]');
    await accessInput.fill('Immediate / Tenant home all day today');
    await page.waitForTimeout(600);

    // Screenshot 4: Tenant Intake Modal Populated
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_4_tenant_maintenance_intake_modal.png'),
      fullPage: false,
    });

    // Stub window.open to prevent popup in headless test
    await page.evaluate(() => {
      window.open = () => null;
    });

    // Submit ticket
    const submitTenantBtn = page.locator('[data-testid="submit-tenant-maintenance-whatsapp-btn"]');
    await submitTenantBtn.click();
    await expect(intakeModal).toBeHidden({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // 5. Navigate back to Rentals Dashboard and verify ticket appears in Landlord Maintenance History
    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });
    await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Re-open Maintenance modal on Sandhurst Executive Suite
    const maintBtnUpdated = page.locator('button:has-text("Maintenance (")').first();
    await expect(maintBtnUpdated).toBeVisible();
    await maintBtnUpdated.scrollIntoViewIfNeeded();
    await maintBtnUpdated.click();
    await page.waitForTimeout(2000);

    // Ensure Maintenance Modal is open
    await expect(page.locator('h3:has-text("Maintenance History:")')).toBeVisible();

    // Verify that the newly submitted ticket with Tenant Reported badge is visible in landlord modal!
    const tenantReportedBadge = page.locator('text=Tenant Reported').first();
    await expect(tenantReportedBadge).toBeVisible({ timeout: 10000 });

    // Verify the "Mark Resolved" button opens the final invoice amount input
    const markResolvedBtn = page.locator('[data-testid^="mark-resolved-btn-"]').first();
    await expect(markResolvedBtn).toBeVisible();
    await markResolvedBtn.click();
    await page.waitForTimeout(600);

    // Enter final invoice amount
    const resolvingInput = page.locator('[data-testid^="resolving-amount-input-"]').first();
    await expect(resolvingInput).toBeVisible();
    await resolvingInput.fill('1850');

    // Screenshot 5: Landlord Maintenance History showing tenant ticket with final resolution amount input!
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_5_landlord_maintenance_history_with_tenant_ticket.png'),
      fullPage: false,
    });
  });
});

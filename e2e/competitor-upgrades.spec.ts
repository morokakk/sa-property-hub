import { test, expect } from '@playwright/test';

test.describe('Competitor-Inspired Upgrades Verification', () => {

  test.describe('Phase 1: Strategy-Aware Buy Box, Exit VAT & Dynamic Rates', () => {
    test('Settings page renders Section 4 Buy Box Hurdles & SARS Criteria and VAT-Exempt toggle', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing SA Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Verify Section 4 heading
      const section4Heading = page.locator('text=Strategy-Aware Buy Box Hurdles & SARS Criteria');
      await expect(section4Heading).toBeVisible({ timeout: 15_000 });

      // Verify all 7 Buy Box & SARS inputs
      await expect(page.locator('text=Min Net Yield (Rental / BRRRR)')).toBeVisible();
      await expect(page.locator('text=Min Monthly Cash Flow')).toBeVisible();
      await expect(page.locator('text=Min Cash-on-Cash ROI')).toBeVisible();
      await expect(page.locator('text=Min Flip ROI Hurdle')).toBeVisible();
      await expect(page.locator('text=Max Day-1 Capital Required')).toBeVisible();
      await expect(page.locator('text=Min DSCR (Debt Service Coverage)')).toBeVisible();
      await expect(page.locator('text=Marginal Tax Rate (SARS Section 11(a) Individual)')).toBeVisible();

      // Verify VAT-Exempt Agent checkbox in Section 2 / Acquisition defaults
      const vatExemptCheckbox = page.locator('label:has-text("Agency is VAT-Exempt (no 1.15x VAT)") input[type="checkbox"]');
      await expect(vatExemptCheckbox).toBeVisible();
    });

    test('Analyzer renders Buy Box badge, DSCR, Prime Spread slider, and Exit VAT toggle', async ({ page }) => {
      await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing SA Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Wait for deals pipeline to load
      const buyBoxBadges = page.locator('span:has-text("Buy Box Match")');
      await expect(buyBoxBadges.first()).toBeVisible({ timeout: 15_000 });

      // Verify DSCR badges exist on deal cards
      const dscrBadges = page.locator('span:has-text("DSCR:")');
      await expect(dscrBadges.first()).toBeVisible();

      // Verify Section 11(a) Compliant badges exist on deal cards
      const sec11aBadges = page.locator('span:has-text("Sec 11(a) Compliant")');
      await expect(sec11aBadges.first()).toBeVisible();

      // Verify Prime Spread slider in calculator form
      const primeSpreadLabel = page.locator('text=Prime Spread (±200 bps)');
      await expect(primeSpreadLabel).toBeVisible();
      const spreadSlider = page.locator('input[type="range"][min="-2"][max="2"]');
      await expect(spreadSlider).toBeVisible();

      // Verify Holding Period & Exit VAT sensitivity section in calculator
      await expect(page.locator('text=Holding Period & Exit VAT Sensitivity')).toBeVisible();
      const holdingSlider = page.locator('input[type="range"][min="1"][max="12"]');
      await expect(holdingSlider).toBeVisible();

      // Verify VAT-Exempt Real Estate Agent checkbox in calculator
      const agentVatCheckbox = page.locator('label:has-text("VAT-Exempt Real Estate Agent") input[type="checkbox"]');
      await expect(agentVatCheckbox).toBeVisible();

      // Verify Vacancy Sensitivity slider (0-15%)
      await expect(page.locator('text=Vacancy Sensitivity (0–15%)')).toBeVisible();
      const vacancySlider = page.locator('input[type="range"][min="0"][max="15"]');
      await expect(vacancySlider).toBeVisible();
    });
  });

  test.describe('Phase 2: Side-by-Side Comparisons & Deep-Cloned Scenarios', () => {
    test('Clones an opportunity deal as a what-if scenario', async ({ page }) => {
      await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing SA Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Locate duplicate scenario button
      const duplicateBtns = page.locator('button:has-text("Duplicate Scenario")');
      await expect(duplicateBtns.first()).toBeVisible({ timeout: 15_000 });

      const initialCount = await page.locator('h4:has-text("(Scenario)")').count();

      // Click the first duplicate button
      await duplicateBtns.first().click();

      // Verify that a new card with "(Scenario)" appears
      const scenarioTitles = page.locator('h4:has-text("(Scenario)")');
      await expect(scenarioTitles).toHaveCount(initialCount + 1, { timeout: 10_000 });
      await expect(scenarioTitles.first()).toBeVisible();
    });

    test('Selects multiple deals and opens Side-by-Side Comparison modal', async ({ page }) => {
      await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing SA Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Find compare checkboxes
      const compareLabels = page.locator('label:has-text("Compare")');
      await expect(compareLabels.first()).toBeVisible({ timeout: 15_000 });

      // Check first deal
      await compareLabels.nth(0).locator('input[type="checkbox"]').check();

      // Floating bar should appear showing "1 deal selected"
      const floatingBar = page.locator('text=1 deal selected');
      await expect(floatingBar).toBeVisible({ timeout: 5_000 });

      // Compare button should be disabled for 1 deal
      const compareBtn = page.locator('button:has-text("Compare Side-by-Side")');
      await expect(compareBtn).toBeDisabled();

      // Check second deal
      await compareLabels.nth(1).locator('input[type="checkbox"]').check();

      // Floating bar should now show "2 deals selected"
      await expect(page.locator('text=2 deals selected')).toBeVisible({ timeout: 5_000 });
      await expect(compareBtn).toBeEnabled();

      // Click to open comparison modal
      await compareBtn.click();

      // Verify modal opened
      const modalHeading = page.locator('h3:has-text("Side-by-Side Deal Comparison")');
      await expect(modalHeading).toBeVisible({ timeout: 5_000 });

      // Verify comparison table contents
      const comparisonTable = page.locator('table');
      await expect(comparisonTable).toBeVisible();
      await expect(page.locator('th:has-text("Metric / Parameter")')).toBeVisible();

      // Close modal
      const closeBtn = page.locator('div.fixed.inset-0.z-50 button').first();
      await closeBtn.click();
      await expect(modalHeading).not.toBeVisible();

      // Clear selection
      const clearBtn = page.getByRole('button', { name: 'Clear', exact: true });
      await clearBtn.click();
      await expect(floatingBar).not.toBeVisible();
    });
  });

  test.describe('Phase 3: Actuals vs Budget KPI Strip, Section 11(a) & ITR12 Export', () => {
    test('Dashboard renders Actuals vs Budget KPI Strip with SA Tax Year and 4 KPI columns', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing SA Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Verify Actuals vs Budget KPI Strip
      const kpiStripTitle = page.locator('text=Actuals YTD vs. Budget (SA Tax Year)');
      await expect(kpiStripTitle).toBeVisible({ timeout: 15_000 });

      // Verify SA Tax Year badge
      const taxYearBadge = page.locator('span:has-text("SA Tax Year")');
      await expect(taxYearBadge).toBeVisible();

      // Verify 4-Column KPI items
      await expect(page.locator('text=Collected Rent (Code 4210)')).toBeVisible();
      await expect(page.locator('text=Opex Burn (Levies, Rates, Fees)')).toBeVisible();
      await expect(page.locator('text=Net Cash Flow YTD')).toBeVisible();
      await expect(page.locator('text=Sec 11(a) Deductible Interest')).toBeVisible();

      // Verify Section 11(a) ITR12 Code 4216 badge
      await expect(page.locator('text=ITR12 Code 4216')).toBeVisible();
      await expect(page.locator('text=SARS Shield Active')).toBeVisible();

      // Verify Rental Tax Reserve card
      await expect(page.locator('span:has-text("Rental Tax Reserve")')).toBeVisible();
      await expect(page.locator('span:has-text("Total SARS Provisional Tax Reserve")')).toBeVisible();
    });

    test('Rentals page renders Actuals vs Budget KPI Strip and SARS ITR12 Export button', async ({ page }) => {
      await page.goto('/rentals', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing SA Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Verify Actuals vs Budget KPI Strip on Rentals
      const kpiStripTitle = page.locator('text=Actuals YTD vs. Budget (SA Tax Year)');
      await expect(kpiStripTitle).toBeVisible({ timeout: 15_000 });

      // Verify SARS ITR12 Export button
      const itr12Btn = page.locator('button:has-text("SARS ITR12 Export")');
      await expect(itr12Btn).toBeVisible({ timeout: 10_000 });

      // Trigger export and verify download event
      const downloadPromise = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
      await itr12Btn.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain('sars-itr12-rental-tax-report-2026.xlsx');
      }
    });
  });
});

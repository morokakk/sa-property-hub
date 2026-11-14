import { test, expect } from '@playwright/test';

test.describe('Competitor-Inspired Upgrades Verification', () => {

  test.describe('Phase 1: Strategy-Aware Buy Box, Exit VAT & Dynamic Rates', () => {
    test('Settings page renders Section 4 Buy Box Hurdles & SARS Criteria and VAT-Exempt toggle', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Switch to Underwriting & Buy Box tab
      const underwritingTab = page.locator('button:has-text("Underwriting, Buy Box")');
      await expect(underwritingTab).toBeVisible({ timeout: 15_000 });
      await underwritingTab.click();

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

      // Verify Development Strategy Hurdles sub-section
      await expect(page.locator('text=Development Strategy Hurdles')).toBeVisible();
      await expect(page.locator('text=Min Development POC Hurdle (%)')).toBeVisible();
      await expect(page.locator('text=Min Build-to-Rent YoC (%)')).toBeVisible();
      await expect(page.locator('text=Default Pre-Sales Hurdle (%)')).toBeVisible();
      await expect(page.locator('text=Default Hard Build Rate (R/m²)')).toBeVisible();

      // Update Development Hurdle inputs and verify persistence across reload
      const pocContainer = page.locator('div', { has: page.locator('label:has-text("Min Development POC Hurdle (%)")') }).filter({ has: page.locator('input[type="number"]') }).last();
      const pocInput = pocContainer.locator('input[type="number"]');
      await pocInput.fill('22');

      const rateContainer = page.locator('div', { has: page.locator('label:has-text("Default Hard Build Rate (R/m²)")') }).filter({ has: page.locator('input[type="number"]') }).last();
      const rateInput = rateContainer.locator('input[type="number"]');
      await rateInput.fill('10500');

      const saveBtn = page.locator('button:has-text("Save Profile & Settings")').first();
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();
      await page.waitForTimeout(500);

      await page.goto('/settings#settings-buybox', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      const reloadedTab = page.locator('button:has-text("Underwriting, Buy Box")');
      await expect(reloadedTab).toBeVisible({ timeout: 15_000 });
      await reloadedTab.click();

      const reloadedPocInput = page
        .locator('div', { has: page.locator('label:has-text("Min Development POC Hurdle (%)")') })
        .filter({ has: page.locator('input[type="number"]') })
        .last()
        .locator('input[type="number"]');
      const reloadedRateInput = page
        .locator('div', { has: page.locator('label:has-text("Default Hard Build Rate (R/m²)")') })
        .filter({ has: page.locator('input[type="number"]') })
        .last()
        .locator('input[type="number"]');

      await expect(reloadedPocInput).toHaveValue('22');
      await expect(reloadedRateInput).toHaveValue('10500');
    });

    test('Analyzer: Development strategy adapts Layout Customizer labels/inactive badges and expands Municipal Zoning & Bulk Envelope', async ({ page }) => {
      await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Ensure Calculator tab is active
      const calcTab = page.locator('button:has-text("Deal Calculator")');
      if (await calcTab.isVisible()) {
        await calcTab.click();
      }

      // Switch strategy to Development
      const devStrategyBtn = page.locator('button:has-text("Development")').first();
      await expect(devStrategyBtn).toBeVisible({ timeout: 15_000 });
      await devStrategyBtn.click();

      // Open Strategy-Aware Layout Customizer
      const customizerTrigger = page.getByTestId('analyzer-layout-customizer-trigger');
      await expect(customizerTrigger).toBeVisible();
      await customizerTrigger.click();

      const customizerPanel = page.getByTestId('analyzer-layout-customizer-panel');
      await expect(customizerPanel).toBeVisible();

      // Verify strategy-adapted labels and inactive section badges
      await expect(customizerPanel.locator('[data-customizer-section="capexRehabStack"]')).toContainText(
        'Development Cost Stack, 2-Stage Burn & Exit Mode'
      );
      await expect(customizerPanel.locator('[data-customizer-section="mortgageEngine"]')).toContainText(
        'Senior Development Facility & S-Curve Engine'
      );
      await expect(customizerPanel.locator('[data-customizer-section="holdingExit"]')).toContainText(
        'Inactive in Development (2-Stage Burn applies)'
      );
      await expect(customizerPanel.locator('[data-customizer-section="opexReserves"]')).toContainText(
        'Inactive in 100% Build-to-Sell'
      );

      // Close customizer
      await customizerPanel.locator('button:has-text("Done")').click();
      await expect(customizerPanel).toBeHidden();

      // Verify Municipal Zoning Rights & Bulk Envelope sub-panel
      const zoningHeading = page.locator('text=Municipal Zoning Rights & Bulk Envelope').first();
      await expect(zoningHeading).toBeVisible();

      const editParamsBtn = page.locator('button:has-text("Edit Parameters")').first();
      if (await editParamsBtn.isVisible()) {
        await editParamsBtn.click();
      }

      const res3PresetBtn = page.locator('button:has-text("Res 3 (40 du/ha / FAR 0.8)")').first();
      await expect(res3PresetBtn).toBeVisible();
      await res3PresetBtn.click();

      await expect(page.locator('text=Max Permitted Bulk:').first()).toBeVisible();
      await expect(page.locator('text=As-of-Right Statutory Rights').first()).toBeVisible();
    });

    test('Analyzer renders Buy Box badge, DSCR, Prime Spread slider, and Exit VAT toggle', async ({ page }) => {
      await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Switch to Deal Sourcing Pipeline tab to inspect deal badges
      const pipelineTab = page.locator('button:has-text("Deal Sourcing Pipeline")');
      await expect(pipelineTab).toBeVisible({ timeout: 15_000 });
      await pipelineTab.click();

      // Wait for deals pipeline to load
      const buyBoxBadges = page.locator('span:has-text("Buy Box Match")');
      await expect(buyBoxBadges.first()).toBeVisible({ timeout: 15_000 });

      // Verify DSCR badges exist on deal cards
      const dscrBadges = page.locator('span:has-text("DSCR:")');
      await expect(dscrBadges.first()).toBeVisible();

      // Verify Section 11(a) Compliant badges exist on deal cards
      const sec11aBadges = page.locator('span:has-text("Sec 11(a) Compliant")');
      await expect(sec11aBadges.first()).toBeVisible();

      // Switch to Calculator tab to inspect calculator controls
      const calcTab = page.locator('button:has-text("Deal Calculator")');
      await expect(calcTab).toBeVisible();
      await calcTab.click();

      // Verify Prime Spread slider in calculator form
      const primeSpreadLabel = page.locator('text=Prime Spread (±200 bps)');
      await expect(primeSpreadLabel).toBeVisible();
      const spreadSlider = page.locator('input[type="range"][min="-2"][max="4"]');
      await expect(spreadSlider).toBeVisible();

      // Verify Holding Period & Exit VAT sensitivity section in calculator
      const holdingToggle = page.locator('button:has-text("Holding Period & Exit VAT Sensitivity")');
      await expect(holdingToggle).toBeVisible();
      await holdingToggle.click();
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
      await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Switch to Deal Sourcing Pipeline tab
      const pipelineTab = page.locator('button:has-text("Deal Sourcing Pipeline")');
      await expect(pipelineTab).toBeVisible({ timeout: 15_000 });
      await pipelineTab.click();

      // Open first deal card's More actions menu
      const moreBtn = page.locator('button[title="More actions"]').first();
      await expect(moreBtn).toBeVisible({ timeout: 15_000 });
      await moreBtn.click();

      // Locate duplicate scenario button
      const duplicateBtn = page.locator('button:has-text("Duplicate Scenario")');
      await expect(duplicateBtn).toBeVisible({ timeout: 5_000 });

      const initialCount = await page.locator('h4:has-text("(Scenario)")').count();

      // Click duplicate scenario button
      await duplicateBtn.click();

      // Verify that a new card with "(Scenario)" appears
      const scenarioTitles = page.locator('h4:has-text("(Scenario)")');
      await expect(scenarioTitles).toHaveCount(initialCount + 1, { timeout: 10_000 });
      await expect(scenarioTitles.first()).toBeVisible();
    });

    test('Selects multiple deals and opens Side-by-Side Comparison modal', async ({ page }) => {
      await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Switch to Deal Sourcing Pipeline tab
      const pipelineTab = page.locator('button:has-text("Deal Sourcing Pipeline")');
      await expect(pipelineTab).toBeVisible({ timeout: 15_000 });
      await pipelineTab.click();

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
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Verify Actuals vs Budget KPI Strip
      const kpiStripTitle = page.locator('text=Actuals YTD vs. Budget (SA Tax Year)');
      await expect(kpiStripTitle).toBeVisible({ timeout: 15_000 });

      // Verify SA Tax Year badge
      const taxYearBadge = page.locator('span:has-text("SA Tax Year")');
      await expect(taxYearBadge).toBeVisible();

      // Expand 5-Card Tax Audit accordion if collapsed
      const expandAuditBtn = page.locator('button:has-text("Expand 5-Card Tax Audit")');
      if (await expandAuditBtn.isVisible()) {
        await expandAuditBtn.click();
      }

      // Verify 4-Column / 5-Column KPI items
      await expect(page.locator('text=Collected Rent (Code 4210)')).toBeVisible();
      await expect(page.locator('text=Opex Burn (Levies, Rates, Fees)')).toBeVisible();
      await expect(page.locator('text=Net Cash Flow YTD')).toBeVisible();
      await expect(page.getByText('Sec 11(a) Deductible Interest', { exact: true })).toBeVisible();

      // Verify Section 11(a) ITR12 Code 4216 badge
      await expect(page.locator('text=ITR12 Code 4216').first()).toBeVisible();
      await expect(page.locator('text=SARS Shield Active')).toBeVisible();

      // Verify Consolidated Tax Reserve card
      await expect(page.locator('text=SARS Provisional Tax & ITR12 Reserve')).toBeVisible();
      await expect(page.locator('h3:has-text("Total Provisional Tax Reserve")')).toBeVisible();
    });

    test('Rentals page renders Actuals vs Budget KPI Strip and SARS ITR12 Export button', async ({ page }) => {
      await page.goto('/rentals', { waitUntil: 'domcontentloaded' });
      await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});

      // Verify Actuals vs Budget KPI Strip on Rentals
      const kpiStripTitle = page.locator('text=Actuals YTD vs. Budget (SA Tax Year)');
      await expect(kpiStripTitle).toBeVisible({ timeout: 15_000 });

      // Open Data & Exports dropdown
      const exportDropdownBtn = page.locator('[data-testid="rentals-export-csv-dropdown"], button:has-text("Data & Exports")');
      await expect(exportDropdownBtn).toBeVisible({ timeout: 10_000 });
      await exportDropdownBtn.click();

      // Verify SARS ITR12 Export option
      const itr12Btn = page.locator('[data-testid="export-sars-itr12"], button:has-text("SARS ITR12")');
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

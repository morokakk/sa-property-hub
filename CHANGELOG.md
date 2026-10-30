# Changelog

All notable changes to this project will be documented in this file.

## [Task Engine Upgrade: Calendar View, Chronological Sorting & Overdue Triage] - 2026-10-30

### Added
- **Segmented View Switcher**: High-ergonomics toggle on the toolbar allowing one-click switching between `[ 📋 Task Ledger ]` (default) and `[ 📅 Calendar View ]`, with active cross-view filter dropdowns.
- **Interactive Monthly Calendar Grid (`📅 Calendar View`)**: Zero-dependency 7-column Monday-first responsive calendar grid with month navigation (`[◀ Prev]`, `[Today]`, `[Next ▶]`), color-coded priority pills (`Urgent`/`Overdue` in rose, `High` in amber, `Medium`/`Low` in slate, `Completed` in emerald), and overflow counter.
- **Recurring Ghost Projections**: Projection engine (`projectRecurringGhostTasks`) mapping active recurring commitments (Weekly, Monthly, Quarterly, Annually) onto future calendar dates with dashed styling (`border-dashed border-indigo-300`) and dedicated scheduled preview cards, respecting `recurrenceEndDate`.
- **Selected Date Inspector & In-Place Actions**: Interactive right-hand agenda panel displaying full task cards with checkbox toggle, status select, linked entity chip, delete button, quick `[+ Add Task on Selected Date]` modal launcher, and monthly agenda list.
- **Mobile Calendar Adaptations**: Compact priority dot indicators and automatic smooth-scroll to the day inspector upon tapping any calendar cell on mobile viewports (`< md`).

### Changed
- **Strict Chronological Sorting**: Sorted active tasks strictly by `dueDate` ascending (`new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()`), breaking same-day ties by priority weight (`Urgent` → `High` → `Medium` → `Low`), and pinning `Completed` tasks to the bottom of the ledger.
- **Overdue Visual Triage**: Active overdue tasks (`task.status !== 'Completed' && task.dueDate < todayISO`) receive prominent rose left border accents (`border-l-4 border-l-rose-500`) and rose badges (`⚠️ Overdue: DD MMM YYYY`).
- **KPI Card Overdue Counter**: Added a `{overdueCount} overdue` rose sub-badge inside the `Pending Tasks` KPI card when overdue tasks exist.

### Fixed
- **Safe Memory Storage Fallback in Persistence**: Added in-memory fallback storage in `portfolioMigrations.ts` to prevent Node 22+ environments without `--localstorage-file` from crashing during test runs.

### Updated
- Ran `npm update` upgrading runtime and build dependencies to their latest compatible semver releases:
  - **`html2canvas-pro`** (`2.5.2` &rarr; `2.6.0`): Canvas rendering engine minor upgrade.
  - **`lucide-react`** (`1.63.0` &rarr; `1.65.0`): Icon component library update.
  - **`posthog-js`** (`1.441.2` &rarr; `1.444.0`): Product analytics client update (`@posthog/core` `1.62.0`).
  - **`resend`** (`6.35.0` &rarr; `6.36.0`): Transactional email SDK update.
  - **Build & Transitive Tooling**: `@babel/*` (`8.0.10`), `rolldown` (`1.2.16`), `node-releases` (`2.0.62`).

## [Regional Node Benchmarks, Deal Intelligence & POPIA Telemetry] - 2026-10-28

### Added
- **Deterministic Deal Intelligence & Strategy Verdict (`dealIntelligence.ts`, `DealIntelligencePanel.tsx`)**: Multi-strategy evaluation (Rental, Flip, BRRRR) with collapsible verdict panel and automated deal-repair levers (strike bid adjustments, rent uplift targets, rehab trims) benchmarked against 35 South African investment corridors (`investmentNodes.ts`) updated with official 2026/27 statutory municipal tariffs.
- **Deterministic Funding Structurer (`proposalIntelligence.ts`)**: Automated capital-stack structuring recommendations in `/proposal` tailored to deal cashflow coverage, holding duration, and sponsor equity margin.
- **Regional Node Market Benchmark Editor (`NodeBenchmarkEditor.tsx`)**: Settings module for customizing regional yield, cap rate, price-per-$m^2$, and municipal tariff baselines across all 35 SA nodes with CSV/JSON import/export and Supabase cloud sync.
- **Google OAuth & POPIA-Compliant PostHog Telemetry**: Integrated Google OAuth cloud sign-in with query parameter preservation and PostHog client telemetry (`PostHogProvider.tsx`) with statutory POPIA input masking.

## [E2E Test Suite Stabilization & Root Cause Analysis] - 2026-10-23

### Fixed
- **Root Cause Analysis & Spec Alignment across Target Test Suites**:
  - `e2e/cloud-hydration.spec.ts`: Expanded collapsed inline auth accordion (`[data-testid="toggle-cloud-auth-btn"]`) prior to submitting credentials, resolving form input detachment timeouts.
  - `e2e/communal-guarantor-verification.spec.ts`:
    - Updated rental property edit trigger to navigate via the card's secondary actions overflow menu (`button[title="More actions"]` &rarr; `Edit Property`).
    - Aligned guarantor name placeholder selector with current form markup (`input[placeholder*="Parent Name"]`) and expanded lease guarantor accordion (`text=Guarantor / Corporate Sponsor`).
    - Handled collapsible OpEx accordion expansion (`button:has-text("View Itemized OpEx")`) before asserting `Communal / Serviced` line items on both active and pre-seeded communal cards (`rental-4`).
  - `e2e/competitor-upgrades.spec.ts`:
    - Switched to the `Underwriting, Buy Box & SARS Tax` tab in Settings to render Section 5 Buy Box Hurdles & SARS Criteria and VAT-exempt settings.
    - Switched between the `Deal Sourcing Pipeline` and `Deal Calculator` tabs in Analyzer to test deal badges and sensitivity sliders.
    - Interacted with deal card overflow menu (`button[title="More actions"]` &rarr; `Duplicate Scenario`) for scenario cloning.
    - Expanded the Dashboard 5-Card Tax Audit accordion (`button:has-text("Expand 5-Card Tax Audit")`) and targeted exact text for Section 11(a) deductible interest.
    - Opened the top-header `Data & Exports` dropdown on `/rentals` to trigger the `SARS ITR12 Tax Schedule (.xlsx)` export.
  - Zero application code regressions; strict preservation of production business logic and UI components.

## [Dependencies Update] - 2026-10-23

### Updated
- Ran `npm update` upgrading runtime dependencies to their latest compatible semver releases:
  - **`next`** (`16.4.2` &rarr; `16.4.3`): Framework patch update with Turbopack and compilation optimizations.
  - **`lucide-react`** (`1.59.0` &rarr; `1.61.0`): Icon component library update.
  - **`zustand`** (`5.0.15` &rarr; `5.0.16`): Store state management patch release.

## [E2E Workflow Live Browser Verification] - 2026-10-23

### Added
- **Multi-Module End-to-End Browser Workflow Verification**:
  - Live interactive Playwright verification of the complete real estate deal lifecycle with comprehensive audit artifact report (`workflow_verification_report.md`):
    - **Opportunity Analyzer (`/analyzer`)**: Verified modular `Customize Layout` popover drawer and `⚡ Quick Napkin Screen` preset (middle underwriting sections cleanly collapse down to Vacancy/Agent and Mortgage Financing while keeping core Valuation and Results cards pinned). Verified live real-time recalculation of Day-1 Cash outlay (`R 745,326`), Net Cap Rate (`7.1%`), and DSCR (`0.78x`) on the sticky bottom ribbon for *7th Avenue Parktown North* (R 2,400,000 purchase price, R 350,000 rehab, R 24,000/mo rent, 90% LTV bond). Confirmed pipeline save action.
    - **Deal Sourcing Pipeline Triage**: Located candidate deal in the pipeline view, validated Buy Box match badge, calculated built-in equity highlight (`+R 400,000 / +14.3%`), and promoted candidate to `Buy-and-Flip`.
    - **Executive Investor Pitch (`/proposal`)**: Verified active deal selection with strategy/source tags (`[RENTAL • Private Agent]`), configured target pitch terms (`R 600,000` facility, `15% p.a. Fixed Interest`, `Personal Suretyship + 2nd Bond`), and validated interactive `WhatsApp Pitch` generator reflecting holding burn, project outlay, and debt terms.
    - **Capital Funding Ledger (`/funding`)**: Verified `+ Add to Capital Ledger` modal auto-prefilling with exact pitch facility parameters (`R 600,000` at `15% p.a.`), locked facility under *Atlas Private Capital (Pty) Ltd*, and confirmed standby capacity tracking with exact drawn (`R 0`) and undrawn (`R 600,000`) amounts in the debt ledger.

## [Opportunity Analyzer & Cross-Module Syndication Underwriting] - 2026-10-16

### Added
- **Multi-Unit & Syndication Underwriting Engine**:
  - Added `numberOfUnits`, `floorAreaSqm`, `isVatInclusiveDeveloperSale`, `tenantPlacementFeePercent`, `annualSpvAdminAuditFeeZAR`, and `refinanceLtvPercent` across `OpportunityDeal`, `AnalyzerDraft`, `FlipProject`, and `RentalProperty`.
  - Rate per square metre ($R/m^2$) benchmarks for bid and open market valuation with division-by-zero guards.
  - Developer off-plan VAT-inclusive toggle automatically setting SARS Transfer Duty to $R\ 0$ (auto-enabled for iGrow Rentals).
  - Monthly amortized tenant placement fee and SPV administration/audit reserves deducted from effective gross income into Net Operating Income (NOI).
  - Debt Service Coverage Ratio (`DSCR`) with cash deal exemption (`dscr: null` -> `"N/A (Cash)"`) and 5-Year Internal Rate of Return (`fiveYearIrrPercent`) with Newton-Raphson / bisection numerical solving.
  - Hybrid BRRRR Refinance Cash-Out metrics (`brrrrRefinanceLoanZAR`, `brrrrCashLeftInDealZAR`, `brrrrEquityExtractedZAR`, and `brrrrPostRefiCashflowZAR`).
- **Strategy-Aware KPI Scoreboard & Progressive Disclosure**:
  - Contextual Row 2 KPI scoreboard in `AnalyzerResultsGrid` dynamically adapting for Rental, Flip, and Hybrid BRRRR strategies.
  - Section 13sex 5-unit SARS threshold hint pill.
  - Live $R/m^2$ badges across Analyzer, Pipeline cards, Flip Project Header, and Rental Card Header.
- **Cross-Module Integration & Cloud Sync**:
  - **Rental Promotion**: Promotes multi-unit opportunities into $N$ individual unit leases, amortizes placement fees into management commission, folds SPV audit fees into maintenance reserves, and retains Section 13sex and BRRRR tags.
  - **Flip Promotion**: Carries over holding costs, municipal valuation, and multi-unit / floor area notes.
  - **Proposal & WhatsApp**: Proposal 20-year wealth projections factor in SPV/placement OpEx; WhatsApp formatter includes multi-unit / $R/m^2$ benchmarks, DSCR, 5-Yr IRR, and Phase 2 BRRRR cash-out models.
  - **Supabase Cloud Sync**: Lossless serialization/deserialization of new underwriting fields inside existing `costs` JSONB column.

## [Dependencies Update] - 2026-10-16

### Updated
- Ran `npm update` upgrading runtime and dev dependencies to their latest compatible semver releases:
  - **`@supabase/supabase-js`** (`2.117.3` &rarr; `2.118.0`): Supabase JavaScript client update and core subpackages (`@supabase/auth-js`, `@supabase/functions-js`, `@supabase/postgrest-js`, `@supabase/realtime-js`, `@supabase/storage-js`).
  - **`next`** (`16.4.1` &rarr; `16.4.2`): Framework patch update including `@next/env` and platform SWC binaries.
  - **`lucide-react`** (`1.57.0` &rarr; `1.58.0`): Icon component library update.
  - **`vitest`** (`5.0.4` &rarr; `5.0.5`): Test runner update and test utilities (`@vitest/mocker`, `@vitest/spy`).
  - **Build & Transitive Tooling**:
    - `baseline-browser-mapping`: `2.11.28` &rarr; `2.11.29`
    - `electron-to-chromium`: `1.5.456` &rarr; `1.5.458`
    - `node-releases`: `2.0.58` &rarr; `2.0.59`

## [Unreleased] - 2026-10-02

### Added
- **Mutation Testing Architecture**: Integrated Stryker Mutator (`@stryker-mutator/core`, `@stryker-mutator/vitest-runner`) configured via `stryker.config.mjs` for Vitest, achieving an 88.17% mutation score on core financial solvers.
- **Property-Based Testing**: Added `fast-check` invariant suites across `maoSolver.test.ts` and `propertyMetrics.vat.test.ts` to mathematically guarantee capital conservation ($\text{outlay} + \text{profit} = \text{exit price}$), monotonicity, and VAT OpEx differentials across arbitrary randomized inputs.
- **PublishLinkGuidanceBanner**: Extracted modular component in `src/components/rentals/PublishLinkGuidanceBanner.tsx` with secure URL path sanitization preventing protocol-relative (`//`) open redirects.

### Fixed
- **Tautological Assertion in Audit Suite**: Replaced circular local-variable calculation (`expect(salePrice - fullCostBasis).toBe(realizedNetProfit)`) in `auditFormulaConsistency.test.ts` with direct calls to `computePortfolioSummary` and dynamic holding cost sensitivity verification.
- **Loose Inequality Bounds**: Tightened wide ±R100k inequalities in `maoSolver.test.ts` (`> 1.7m`, `< 1.9m`) to exact integer assertions (`1_803_106`) and guarded `maoSolver.ts` against negative costs and outlays.
- **Dummy Component Tests**: Replaced hardcoded string comparison test in `TenantStatement.publishPrompt.test.tsx` with full DOM rendering and URL boundary tests.
- **Git Ignore**: Added `/.stryker-tmp/` and `/reports/` to `.gitignore` to prevent test sandbox artifacts from polluting the working tree.

### Updated
- Ran `npm update` updating `@types/node` and `lucide-react` to latest semver patches.

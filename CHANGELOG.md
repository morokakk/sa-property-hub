# Changelog

All notable changes to this project will be documented in this file.

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

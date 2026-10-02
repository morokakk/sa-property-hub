# Changelog

All notable changes to this project will be documented in this file.

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

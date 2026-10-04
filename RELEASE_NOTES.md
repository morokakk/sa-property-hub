# Release Notes — Sprint 19 Sep – 3 Oct 2026

## Highlights
- **Tenant statement portal**: secure shareable tenant statements with a 4-column comparative ledger, meter reading dials, month-on-month variance and print-to-PDF.
- **Municipal dispute workflow**: meter reading dispute tracking, SA tiered tariff engine, 4-state settlement engine, dispute letter PDF generator and meter registry.
- **Cloud sync**: local-to-cloud migration, multi-tenant schema, cross-device hydration and non-conflicting merge.
- **Smart Document Import**: one hub for PDF statements (CoJ, Eskom, iGrow) with automatic address and property extraction.

## New Features

### Rentals & Tenants
- Tenant payment ledger, recurring payment tracking, and calculated/editable arrears.
- Arrears write-offs, deposit allocation and a statement billing period selector.
- Multi-tenant and ancillary commercial statement generator with mobile-responsive checklists.
- Tenant link publishing with a cloud-sync prompt and auto-sync on copy.
- Rental tax toggle (1-click), per-property reserve aggregation, and post-tax net cash flow in the portfolio.
- Globally persistent, toggleable 20-year rental forecasts.
- Manual owner expense tracking and forward-only SARB PMT recalculator.
- Conditional Freehold building insurance inputs with state guardrails.
- Source and Municipal/Eskom Account No added to the rental Excel template and parser.

### Municipal Disputes & Meters
- Meter reading dispute tracking and tenant recovery engine.
- SA municipal tiered tariffs engine with dispute capping rule.
- Settlement engine with statement audit transparency and baseline benchmarking.
- Dispute letter PDF generator, meter registry and directory.
- Unified meter reading extraction and tenant variance statements, with print isolation.

### Import & AI
- Multi-PDF upload (max 3 files) with batch verification queue.
- Smart Document Import routed to the unified PDF verification modal, preserving municipal valuations.
- AI and BYOK uploads aligned with Excel imports for rental and flip card parity.
- Flip scaffolding, holding costs and municipal valuation auto-populated from PDF statements.

### Analyzer, Flips & BRRRR
- Vacancy buffer, MAO quick solver and deal triage pipeline.
- +15% VAT toggle on managing agent fee.
- Deal Source dropdown drives Distressed Costs visibility.
- BRRRR transition and rental refinance workflow.
- Itemized flip holding costs, carrying cost burn rate and holding reserve.
- Buy-and-flip operator enhancements with portfolio and funding integration.
- Analyzer operational expenses aligned with proposal module cash flow.

### Proposals & Sharing
- Strategy-adaptive proposal generator and WhatsApp summaries.
- Pitch templates tailored by deal source and strategy.
- 20/30-year long-term cashflow and equity projections.
- 1-click WhatsApp payment receipts for funders.
- WhatsApp memoranda reformatted without emojis, in a standard institutional format.

### Funding & Dashboard
- Capital can be linked to portfolio rentals.
- Dashboard syncs live arrears, lease expiries and AGMs.

### Account & Settings
- Forgot-password recovery flow and 8-character password minimum.

### Mobile & UX
- Responsive layout audit, mobile bottom sheets and improved navigation (top nav, drawer portfolio tools).
- Mobile responsiveness for proposal and rental modals, unified flip modal and browser autofill support.

## Fixes
- Total Purchasing Power now deducts ring-fenced capital.
- Financial formulas, dashboard metrics and export calculations audited and standardized.
- Rental card cash flow and tax provision now include ancillary income and prepaid fees.
- iGrow commission VAT, multi-PDF matching and CoJ valuation corrected.
- Embedded extracted readings in initial statements; legacy 2025 store data auto-healed.
- Dispute wording: "Dispute Dismissed" replaced with "Dispute Rejected by Council" and "Council Accepted Physical Reading".
- Funding labels harmonized for active deals and profit splits.
- Tenant statement modal header split into two tiers to stop button overlap.
- Auth submit button visibility and error messages for role-based emails.
- Invalid logo upload shows an inline banner instead of `window.alert`, and the file input resets.
- Currency inputs accept arbitrary values in BRRRR modals.
- MAO quick solver and deal popovers use responsive bottom sheets.
- CoC checklist and Cloud Document Vault moved to separate full-width rows.

## Quality & Maintenance
- Test suite audit with mutation and property tests; tautologies removed.
- Arithmetic-validated regression suite for core financial engines.
- Playwright e2e for the tenant statement portal, municipal dispute letter and meter registry.
- Dependency updates: Next, Vitest, lucide-react, `@types/node` 26.6.3.

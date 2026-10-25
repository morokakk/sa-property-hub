# Production-Readiness Master Audit & Surgical Remediation Plan
**Project:** South African Property Portfolio Hub (`sa-property-hub`)  
**Audit Completed:** October 19, 2026  
**Auditors:** Teamwork Multi-Agent Specialist Squad (Security, DB & Cloud Sync, Bundle Optimization, Runtime Performance)  
**Integrity Mode:** Strictly Read-Only Architecture & Implementation Verification  
**Project Root:** `c:\Users\morok\OneDrive\L and M trading`

---

## 1. Executive Summary & Readiness Score

### 1.1 Readiness Scorecard

| Audit Pillar | Focus Domain | Readiness Verdict | Health Score | Blockers (P0) | High-Value Quick Wins (P1) | Post-POC Polish (P2) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Pillar 1: Security Essentials & Privacy** | RLS boundaries, BYOK keys, unauthenticated RPCs, open email relay, POPIA | <span style="color:red">**CRITICAL FAIL**</span> | **38 / 100** | 3 | 4 | 3 |
| **Pillar 2: Database & Cloud Sync Integrity** | Supabase migrations, mapper parity, deletion traps, cross-account contamination | <span style="color:red">**FAIL**</span> | **44 / 100** | 4 | 6 | 2 |
| **Pillar 3: Bundle & Asset Optimization** | SheetJS/PDF-Lib ingestion, route modal chunking, root SSR blinding (`ClientOnly`) | <span style="color:red">**FAIL**</span> | **49 / 100** | 4 | 2 | 2 |
| **Pillar 4: Runtime & Render Performance** | Zustand selector hygiene, unmemoized financial loops, base64 localStorage quota | <span style="color:orange">**WARNING**</span> | **58 / 100** | 4 | 6 | 3 |
| **COMPOSITE VERDICT** | **Full Production Deployment** | <span style="color:red">**BLOCKED**</span> | **47 / 100** | **15** | **18** | **10** |

---

### 1.2 Core Executive Assessment

The **Moremela Property Hub** is an exceptionally well-engineered application from a functional perspective. It delivers deep, domain-accurate South African real estate underwriting: SARS Section 11(a) and 13*sex* tax provisions, municipal utility reconciliation with dispute letter compilation, multi-lease tenancy tracking, and multi-unit flip syndication calculators. Its hybrid local-first architecture (combining Zustand `localStorage` persistence with opt-in Supabase cloud sync) offers zero-friction onboarding for property investors.

However, **deploying the current codebase to live production users is strictly blocked by 15 critical (P0) vulnerabilities**:

1. **Catastrophic Cloud Data Erasure (DBSYNC-01):** When a user's local state has empty arrays (e.g., no flips, or flips with empty BOQ lists), `migrateToCloud.ts` executes an unconditional `DELETE FROM table WHERE user_id = userId`, permanently erasing cloud records.
2. **Complete RLS Bypass & Landlord PII / Key Exposure (SEC-01):** A backward-compatible view (`public.investor_profiles`) created without `security_invoker = true` evaluates as the `postgres` superuser, allowing any anonymous visitor with the public Supabase anon key to dump all landlord identities, banking details, South African national ID numbers, and plaintext AI API keys.
3. **Severe POPIA Violations on Public Tenant Routes (SEC-02, DBSYNC-03):** The `get_public_tenant_statement` RPC uses sequential, guessable IDs (`lease-1`, `lease-2`) and dumps unredacted lease JSONB payloads—exposing tenants' confidential **Credit Bureau Scores**, **Verified Net Monthly Salaries**, and **Debt Commitments** to anyone browsing the web.
4. **Unauthenticated Open Email Relay (SEC-03):** The Next.js Server Action `sendStatementEmail` possesses no authentication, session checks, or rate limiting, turning the application into an open spam relay powered by the owner's paid Resend credentials.
5. **Cross-Account Session Contamination (DBSYNC-02):** `AuthHydrator.tsx` does not listen for `SIGNED_OUT`. If User A logs out and User B logs in on the same browser, User A's private portfolio in `localStorage` is merged into User B's account and automatically synced to User B's Supabase database.
6. **Severe Bundle Bloat & Destroyed SSR (F-01, F-02, F-03, F-04):** `xlsx` (~1MB) and `pdf-lib` (~450KB) are statically imported into global shell components (`Sidebar`, `TopHeader`, and page headers), loading massive vendor bundles on every page. Worse, `RootLayout` wraps `{children}` in a client-side mounting spinner (`ClientOnly`), completely disabling Server-Side Rendering (SSR) for the entire application and breaking SEO on public tenant routes.
7. **Storage Quota Crashes & Cascading Render Freezes (PERF-01, PERF-02, PERF-03, PERF-04):** Settings allows uncompressed 2MB image uploads stored as ~2.7MB base64 in `localStorage`, consuming >50% of the entire 5MB browser origin quota and triggering unhandled `QuotaExceededError` crashes. Simultaneously, blanket `usePortfolioStore()` subscriptions in `/rentals` and `/flips` cause every keystroke to trigger full re-renders and unmemoized 20-year financial compounding recalculations.

### 1.3 The Lean Remediation Mandate
In strict accordance with the project guidelines, **zero enterprise over-engineering is permitted**:
- **NO** mandatory login walls that break zero-gate local-first POC usability.
- **NO** Redis, Kafka, or external caching microservices.
- **NO** full store rewrites or destructive architectural shifts.
- Every fix is surgical, localized, and designed to preserve passing status for existing Vitest unit tests and Playwright end-to-end suites.

---

## 2. Prioritized Findings Matrix

Findings are strictly classified into three actionable tiers:
- **P0: Must-Fix Before Live Users** (Data loss, critical security/POPIA breaches, quota crashes, broken SSR).
- **P1: High-Value Quick Wins (< 1 hr)** (Bundle slashes, schema parity, unmemoized loops, rate guards).
- **P2: Defer / Post-POC Polish** (Architectural cleanliness, developer telemetry, non-critical enhancements).

---

### Tier P0: Must-Fix Before Live Users (15 Findings)

#### 1. SEC-01 [P0]: Complete RLS Bypass via `investor_profiles` View
- **Pillar:** Security Essentials & Privacy
- **File Reference:** `supabase/migrations/20261008_banking_and_statement_rpc.sql:24-26`
- **Failure Mechanism:** The migration defines `CREATE OR REPLACE VIEW public.investor_profiles AS SELECT * FROM public.profiles;`. In PostgreSQL, standard views run with `SECURITY DEFINER` semantics (superuser privileges). Supabase exposes this view to `anon`. Any unauthenticated actor querying `/rest/v1/investor_profiles` with `NEXT_PUBLIC_SUPABASE_ANON_KEY` can dump all landlord records, contact details, bank accounts, South African national ID numbers, and plaintext AI API keys.
- **Surgical Fix:** Drop the view or recreate with `WITH (security_invoker = true)` and revoke permissions from `anon`:
  ```sql
  DROP VIEW IF EXISTS public.investor_profiles;
  CREATE OR REPLACE VIEW public.investor_profiles WITH (security_invoker = true) AS SELECT * FROM public.profiles;
  REVOKE ALL ON public.investor_profiles FROM anon;
  GRANT SELECT ON public.investor_profiles TO authenticated;
  ```

#### 2. SEC-02 [P0]: Public Lease Enumeration & Tenant PII Leak in `get_public_tenant_statement`
- **Pillar:** Security Essentials & Privacy
- **File References:** `supabase/migrations/20261011_archived_leases.sql:9-116`, `src/app/statement/[lease_id]/page.tsx:9-46`
- **Failure Mechanism:** The `get_public_tenant_statement` RPC is `SECURITY DEFINER` with `GRANT EXECUTE TO anon`. It accepts sequential IDs (`lease-1`, `lease-2`) and queries across all landlords' properties without ownership checks or cryptographic access tokens. Web crawlers or malicious tenants can scrape every tenant profile, rent amount, and banking detail in the system.
- **Surgical Fix (pre-flight amended):** When a cloud-synced user shares a statement, mint an unguessable `statementToken` (`crypto.randomUUID()`) onto the lease. Keep the RPC signature `p_lease_id text`, set `search_path = public, pg_temp`, and match `l->>'statementToken' = p_lease_id OR (l->>'statementToken' IS NULL AND l->>'id' = p_lease_id)` across both `leases` and `archived_leases`. Filter payments and write-offs by the resolved `v_lease->>'id'`. Un-tokenised demo leases (`lease-1`) keep working.

#### 3. SEC-03 [P0]: Unauthenticated Open Email Relay in `sendStatementEmail`
- **Pillar:** Security Essentials & Privacy
- **File Reference:** `src/app/actions/sendStatementEmail.ts:31-135`
- **Failure Mechanism:** The Next.js Server Action is publicly callable via HTTP POST without session verification, CSRF token, or IP rate-limiting. Attackers can dispatch arbitrary spam, malware attachments, or phishing invoices from the platform's verified Resend sender domain, rapidly consuming paid quotas and causing domain blacklisting.
- **Surgical Fix:** Validate payload format, verify PDF magic bytes (`%PDF-`), enforce in-memory IP/session rate limits (max 5 emails/hour per client), and verify caller authentication if user is in cloud-synced mode.

#### 4. DBSYNC-01 [P0]: Catastrophic Empty-Array Deletion Trap
- **Pillar:** Database & Cloud Sync Integrity
- **File Reference:** `src/lib/db/migrateToCloud.ts:800-805`
- **Failure Mechanism:** In `deleteRecordsNotInPayload`, if `localIds.length === 0`, it executes:
  `await supabase.from(table).delete().eq('user_id', userId);`
  If a user has flips with zero BOQ items, or if local storage loads empty before hydration, this unconditionally erases the user's entire cloud table.
- **Surgical Fix:** Guard against empty array wipes. Query existing cloud records first; if `localIds.length === 0` and cloud records exist, skip deletion unless an explicit delete intent flag is passed. Perform positive set-difference deletes chunked in batches of 50.

#### 5. DBSYNC-02 [P0]: Cross-User State Contamination on Session Switch
- **Pillar:** Database & Cloud Sync Integrity
- **File References:** `src/components/AuthHydrator.tsx:18-30`, `src/lib/db/hydrateFromCloud.ts:583-599`
- **Failure Mechanism:** `AuthHydrator` ignores `SIGNED_OUT`. When User A logs out, their portfolio remains in `localStorage`. When User B signs in, `hydrateFromCloud()` merges User A's local portfolio into User B's state (`hasNewLocalItems = true`) and immediately executes `migrateToCloud()`, permanently uploading User A's private assets to User B's account.
- **Surgical Fix:** In `AuthHydrator.tsx`, listen for `SIGNED_OUT`, clear sync metadata (`last_sync_user_id`, `cloud_sync_completed`), and call `usePortfolioStore.getState().resetToDemoData()`. In `hydrateFromCloud.ts`, verify `last_sync_user_id === userId` before merging.

#### 6. DBSYNC-03 [P0]: Public Statement RPC Leaks Tenant Credit Bureau Score & Salary
- **Pillar:** Database & Cloud Sync Integrity / POPIA
- **File Reference:** `supabase/migrations/20261011_archived_leases.sql:38-40, 93`
- **Failure Mechanism:** `get_public_tenant_statement` bundles the raw `v_lease` JSONB into the returned payload. This exposes `vettingScorecard` (credit bureau score, verified net monthly income, debt commitments, default history) and guarantor contact details to anyone viewing the public statement route. This is an egregious breach of South Africa's POPIA legislation.
- **Surgical Fix:** In the SQL RPC, sanitize the lease before returning:
  `v_lease := v_lease - 'vettingScorecard' - 'guarantorContact' - 'deedOfSuretyshipRef';`

#### 7. DBSYNC-04 [P0]: Missing Baseline Schema Migration (`00000000_initial_schema.sql`)
- **Pillar:** Database & Cloud Sync Integrity
- **File Reference:** `supabase/migrations/` (Directory structure)
- **Failure Mechanism:** The directory contains 7 incremental `ALTER TABLE` scripts but lacks an initial `CREATE TABLE` migration for the 8 core tables (`profiles`, `properties`, `flips`, `boq_items`, `funding_sources`, `opportunities`, `tasks`, `suppliers`). Fresh staging environments or local `supabase db reset` commands fail immediately.
- **Surgical Fix:** Create `supabase/migrations/20261001_initial_schema.sql` defining baseline DDL for all 8 tables with primary keys, foreign keys, and RLS enabled.

#### 8. F-01 [P0]: Global Static Ingestion of SheetJS (`xlsx`) in Shell Components
- **Pillar:** Bundle & Asset Optimization
- **File References:** `src/lib/export/excelExport.ts:1`, `src/components/navigation/Sidebar.tsx:29`, `src/components/navigation/TopHeader.tsx:19`
- **Failure Mechanism:** Top-level static import of `xlsx` (~1MB) in `excelExport.ts` is pulled into `Sidebar.tsx` and `TopHeader.tsx`. Because `Sidebar` is mounted in `RootLayout`, `xlsx` is bundled into the initial critical JS bundle of every single route across the application.
- **Surgical Fix:** Convert `import * as XLSX from 'xlsx'` to dynamic `const XLSX = await import('xlsx')` inside `exportPortfolioToExcel` and `exportITR12TaxReport`. In `Sidebar.tsx` and `TopHeader.tsx`, dynamically import `excelExport.ts` inside export click handlers.

#### 9. F-02 [P0]: Static Import of Excel Import Engine into Route Pages
- **Pillar:** Bundle & Asset Optimization
- **File References:** `src/lib/import/excelImport.ts:1`, `src/app/rentals/page.tsx:13`, `src/components/common/ImportDropdown.tsx:21`
- **Failure Mechanism:** `excelImport.ts` (1,268 lines, statically importing `xlsx`) is imported at the top level of `/rentals` and `/flips` (via `ImportDropdown.tsx`), keeping `xlsx` in page bundles even if export is dynamic.
- **Surgical Fix:** Dynamically import `excelImport.ts` inside file upload event handlers (`handleExcelUpload`, `handleDownloadTemplate`). Change `ValidationErrorModal.tsx:5` to `import type { ValidationErrorItem }`.

#### 10. F-03 [P0]: Unbroken Static Import Chain Dragging `pdf-lib` into `/rentals`
- **Pillar:** Bundle & Asset Optimization
- **File References:** `src/lib/pdf/generateDisputeLetterPdf.ts:1`, `src/components/rentals/DisputeLetterModal.tsx:32`, `src/components/rentals/MeterReadingsModal.tsx:37`, `src/app/rentals/page.tsx:15`
- **Failure Mechanism:** `pdf-lib` (~450KB) is statically imported by `generateDisputeLetterPdf.ts`, which is imported by `DisputeLetterModal.tsx`, which is imported by `MeterReadingsModal.tsx`, which is imported by `src/app/rentals/page.tsx`. Every visitor to `/rentals` downloads `pdf-lib` and 3,300 lines of municipal dispute code.
- **Surgical Fix:** Dynamically import `pdf-lib` inside `generateDisputeLetterPdf`. Wrap `DisputeLetterModal` in `next/dynamic` inside `MeterReadingsModal.tsx`.

#### 11. F-04 [P0]: Root `ClientOnly` Wrapper Blinding SSR Across Entire Application
- **Pillar:** Bundle & Asset Optimization
- **File References:** `src/components/ClientOnly.tsx:8-23`, `src/app/layout.tsx:25`, `src/app/statement/[lease_id]/page.tsx:1-156`
- **Failure Mechanism:** `RootLayout` wraps `{children}` in `<ClientOnly>`. Because `ClientOnly` initializes `hasMounted = false`, Next.js renders only a spinning loading indicator on the server. The client receives blank HTML, destroying Server-Side Rendering (SSR), harming LCP, and breaking public tenant statement SSR.
- **Surgical Fix (pre-flight amended):** Keep `<ClientOnly>` in `src/app/layout.tsx`, because dashboard routes read persisted `localStorage` state on first render and removing the gate causes hydration mismatches. Instead, add a `usePathname()` bypass in `ClientOnly.tsx` so `/statement/*` renders `{children}` directly (SSR, no `AuthHydrator`), mirroring the existing bypass in `Sidebar.tsx:36`.

#### 12. PERF-01 [P0]: Blanket Store Subscription in `src/app/rentals/page.tsx`
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/app/rentals/page.tsx:41`
- **Failure Mechanism:** `const store = usePortfolioStore();` subscribes the entire rentals page to every store mutation. Modifying an AI key, adding a task, or typing in the analyzer causes `RentalPortfolioPage`, all `RentalCard` instances, and KPI strips to re-render.
- **Surgical Fix:** Replace `const store = usePortfolioStore();` with atomic action selectors (`usePortfolioStore((s) => s.updateRental)`, etc.) or call `usePortfolioStore.getState().action(...)` directly in event callbacks.

#### 13. PERF-02 [P0]: Blanket Store Subscription in `src/app/flips/page.tsx`
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/app/flips/page.tsx:25`
- **Failure Mechanism:** `const store = usePortfolioStore();` subscribes the entire flips manager page to all store changes, triggering cascading re-renders across `FlipActivePipeline`, `FlipMetricsCards`, and `FlipBOQTable`.
- **Surgical Fix:** Replace line 25 with atomic action selectors or direct `usePortfolioStore.getState()` invocations in event handlers.

#### 14. PERF-03 [P0]: Reactive Multi-Loop Calculation in `portfolioSummarySelector.ts`
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/lib/store/selectors/portfolioSummarySelector.ts:256-275`
- **Failure Mechanism:** `usePortfolioSummary()` uses a root store selector `(state) => ...`, re-executing `computePortfolioSummary` and `JSON.stringify(computeEquityAlerts)` across all rentals, flips, tax provisions, and funding sources on *any* store mutation. Mounted in `TopHeader.tsx`, this blocks the main thread on every keystroke.
- **Surgical Fix:** Refactor `usePortfolioSummary()` to subscribe atomically only to the 6 relevant slices (`rentals`, `flips`, `funding`, `liquidCapitalReserve`, `investorProfile`, `opportunities`), computing the summary inside React's `useMemo`.

#### 15. PERF-04 [P0]: Uncompressed 2MB Logo Upload Stored in `localStorage`
- **Pillar:** Runtime & Render Performance / Memory
- **File References:** `src/app/settings/page.tsx:532-545`, `src/lib/store/usePortfolioStore.ts:19-35`
- **Failure Mechanism:** Settings allows 2MB image uploads without downscaling. `FileReader.readAsDataURL` generates a ~2.7MB base64 string saved to Zustand and persisted into `localStorage`. This consumes >50% of the entire 5MB browser quota, causing unhandled `QuotaExceededError` exceptions that break data saving.
- **Surgical Fix:** Use `downscaleImage` (`src/lib/utils/imageDownscale.ts`) in `handleLogoUpload` to constrain logos to max 360×100px at 0.85 quality before saving. Reduces payload from ~2.7MB to <20KB (99.3% reduction).

---

### Tier P1: High-Value Quick Wins (< 1 hr) (18 Findings)

#### 16. SEC-04 [P1]: BYOK AI API Key Synced to Cloud DB & Plaintext Storage
- **Pillar:** Security Essentials & Privacy
- **File References:** `src/lib/db/migrateToCloud.ts:268`, `src/lib/db/mergePortfolioState.ts:248-253`, `src/lib/store/persistence/portfolioMigrations.ts:209-213`
- **Failure Mechanism:** Despite UI privacy promises, `migrateToCloud.ts` uploads raw Anthropic/Gemini API keys to the Supabase `profiles` table in plaintext JSONB.
- **Surgical Fix:** In `migrateToCloud.ts`, strip `apiKey: ''` from `ai_settings` before uploading. Keep the secret key strictly in local device memory.

#### 17. SEC-05 [P1]: Client-Side AI Calls via `dangerouslyAllowBrowser` & Query String Keys
- **Pillar:** Security Essentials & Privacy
- **File References:** `src/lib/ai/anthropicParser.ts:221`, `src/lib/utilities/pdfParser.ts:1206, 1287`
- **Failure Mechanism:** Anthropic calls include `'anthropic-dangerous-direct-browser-access': 'true'`. Gemini calls pass `?key=${apiKey}` in the URL query string, exposing secret keys in browser history, proxy logs, and error trackers.
- **Surgical Fix:** For Gemini, pass the key via HTTP header `x-goog-api-key: apiKey.trim()`. For Anthropic, validate inputs strictly and document BYOK trust boundaries clearly.

#### 18. SEC-06 [P1]: Public Statement Route Predictable Enumeration & SEO Metadata PII
- **Pillar:** Security Essentials & Privacy / POPIA
- **File References:** `src/app/statement/[lease_id]/page.tsx:118-129, 140-155`
- **Failure Mechanism:** `generateMetadata` puts full tenant legal names into `<title>` and `<meta name="description">` without setting `robots: { index: false, follow: false }`, allowing Googlebot to index tenant PII.
- **Surgical Fix:** Set `robots: { index: false, follow: false }` and generic titles in `generateMetadata`.

#### 19. SEC-07 [P1]: HTML Injection in Transactional Statement Emails
- **Pillar:** Security Essentials & Privacy
- **File Reference:** `src/lib/email/statementEmailTemplate.ts:52, 64, 78, 91, 96, 106`
- **Failure Mechanism:** Unescaped template literal interpolation of `tenantName`, `propertyName`, and amounts into email HTML enables injection of malicious hyperlinks or phishing markup.
- **Surgical Fix:** Add a 5-line `escapeHtml()` sanitizer and wrap all interpolated variables.

#### 20. DBSYNC-05 [P1]: PostgREST URI Overflow & Silent Deletion Failure via `.not('id', 'in', ...)`
- **Pillar:** Database & Cloud Sync Integrity
- **File Reference:** `src/lib/db/migrateToCloud.ts:806-814`
- **Failure Mechanism:** Deletion reconciliation uses `.not('id', 'in', ...)`. For collections of >50 items (BOQ tasks or payments), the URL exceeds the 2,048-byte limit, resulting in HTTP 414 errors.
- **Surgical Fix:** Replace negative URI filter with positive set-difference chunked deletion (`supabase.from(table).delete().in('id', chunk50)`).

#### 21. DBSYNC-06 [P1]: Silent Data Loss on `RentalProperty` (`province`, `numberOfUnits`, `floorAreaSqm`, `meterRegistry`)
- **Pillar:** Database & Cloud Sync Integrity
- **File References:** `src/lib/db/migrateToCloud.ts:281-350`, `src/lib/db/hydrateFromCloud.ts:124-199`, `src/types/index.ts:584-650`
- **Failure Mechanism:** `mapRentals` and `unmapRentals` fail to map `province`, `numberOfUnits`, `floorAreaSqm`, and `meterRegistry`, silently dropping unit counts and meter data on sync.
- **Surgical Fix:** Add columns in an SQL migration and map fields bidirectionally in `migrateToCloud.ts` and `hydrateFromCloud.ts`.

#### 22. DBSYNC-07 [P1]: Silent Data Loss on `FlipProject` (`province`, `numberOfUnits`, `floorAreaSqm`)
- **Pillar:** Database & Cloud Sync Integrity
- **File References:** `src/lib/db/migrateToCloud.ts:353-406`, `src/lib/db/hydrateFromCloud.ts:201-284`
- **Failure Mechanism:** Multi-unit flip acquisitions lose their unit count, square meterage, and province upon cloud sync.
- **Surgical Fix:** Add columns to `public.flips` and include in `mapFlips` and `unmapFlips`.

#### 23. DBSYNC-08 [P1]: Silent Data Loss on `InvestorProfile` (`bioSummary`)
- **Pillar:** Database & Cloud Sync Integrity
- **File References:** `src/lib/db/migrateToCloud.ts:243-278`, `src/lib/db/hydrateFromCloud.ts:93`
- **Failure Mechanism:** `bio_summary` column exists in the database and is read during hydration, but `mapProfile` never writes it, causing user bios to be wiped on reload.
- **Surgical Fix:** Add `bio_summary: profile.bioSummary || null` to `mapProfile`.

#### 24. DBSYNC-09 [P1]: Absence of `user_id` and Foreign Key Indexes Across All 8 Tables
- **Pillar:** Database & Cloud Sync Integrity / Performance
- **File Reference:** `supabase/migrations/`
- **Failure Mechanism:** None of the 8 tables have B-Tree indexes on `user_id` or `flip_id`. Cloud hydration queries perform full sequential scans across all tables.
- **Surgical Fix:** Create migration adding `CREATE INDEX IF NOT EXISTS` on `user_id` across all 8 tables and `flip_id` on `boq_items`.

#### 25. DBSYNC-10 [P1]: Unoptimized RLS Policy Evaluation & Missing GIN Indexes
- **Pillar:** Database & Cloud Sync Integrity / Performance
- **File References:** `supabase/migrations/`, `supabase/migrations/20261011_archived_leases.sql:27-31`
- **Failure Mechanism:** Policies evaluate `auth.uid() = user_id` per-row instead of `(select auth.uid()) = user_id`. Leases JSONB lacks GIN indexing.
- **Surgical Fix:** Standardize RLS to `(select auth.uid()) = user_id` and create GIN indexes on `leases` and `archived_leases`.

#### 26. F-05 [P1]: Massive Modal Monolith Static Ingestion in Route Pages
- **Pillar:** Bundle & Asset Optimization
- **File References:** `src/app/rentals/page.tsx:14-25`, `src/app/flips/page.tsx:9-15`
- **Failure Mechanism:** 12 modals in `/rentals` and 7 modals in `/flips` (>10,000 lines of JSX) are statically imported, bloating initial page chunks by ~1MB.
- **Surgical Fix:** Convert all dialog modal imports to `next/dynamic` with `{ ssr: false }`.

#### 27. F-06 [P1]: Dual Pipeline PDF Parser Statically Importing into Initial Bundles
- **Pillar:** Bundle & Asset Optimization
- **File References:** `src/lib/utilities/pdfParser.ts:10, 12, 134`, `src/hooks/rentals/useDirectPdfUpload.ts:2`, `src/components/flips/modals/FlipProjectModal.tsx:6`
- **Failure Mechanism:** `pdfParser.ts` (75KB) is statically imported into hooks loaded on initial render, even though parsing only happens on file drop.
- **Surgical Fix:** Dynamically import `parseRentalPdfStatement` inside the upload callback (`enqueueFiles`).

#### 28. PERF-05 [P1]: Multi-Loop Financial Calculations in `ActualVsBudgetKpiStrip.tsx`
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/components/dashboard/ActualVsBudgetKpiStrip.tsx:68-202`
- **Failure Mechanism:** 5 nested loops iterating over properties, transactions, and payment ledgers execute on every render without `useMemo`.
- **Surgical Fix:** Wrap lines 72–203 in a single `useMemo(..., [rentals])`.

#### 29. PERF-06 [P1]: Unmemoized Pure Math in `RentalCard.tsx`
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/components/rentals/RentalCard.tsx:108-116`
- **Failure Mechanism:** 4 pure financial engines (`calculateRentalCashflow`, `calculateGrossYield`, `calculateRentalTaxProvision`, `calculatePropertyArrears`) run on every render per card.
- **Surgical Fix:** Wrap calculations in `useMemo` and wrap component export in `React.memo(RentalCard)`.

#### 30. PERF-07 [P1]: Unmemoized 20-Year Long-Term Forecast in `RentalForecastSection.tsx`
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/components/rentals/RentalForecastSection.tsx:104`
- **Failure Mechanism:** 240-month compounding math runs directly inside JSX prop expression `generateRentalLongTermProjection(property)`.
- **Surgical Fix:** Memoize projection data via `useMemo(() => generateRentalLongTermProjection(property), [property])`.

#### 31. PERF-08 [P1]: Unmemoized Underwriting Math in `PipelineDealCard.tsx`
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/components/analyzer/PipelineDealCard.tsx:105-121, 178-180`
- **Failure Mechanism:** DSCR and 10 buy-box criteria checks execute directly in the render body for every deal card in the pipeline.
- **Surgical Fix:** Memoize `dscrInfo` and `buyBoxResult`, and wrap card in `React.memo`.

#### 32. PERF-09 [P1]: Unthrottled Scratchpad Persistence on Keystrokes in `analyzer/page.tsx`
- **Pillar:** Runtime & Render Performance
- **File References:** `src/app/analyzer/page.tsx:89-90, 401-432`, `portfolioMigrations.ts:209-234`
- **Failure Mechanism:** Every numeric keystroke updates `analyzerDraft`, triggering synchronous `localStorage.setItem` serialization of the entire store.
- **Surgical Fix:** Exclude `analyzerDraft` from store persistence via `partialize`, keeping it in transient component state or debouncing store sync.

#### 33. PERF-10 [P1]: Persistence Bloat from Statement `rawText` in `localStorage`
- **Pillar:** Runtime & Render Performance / Memory
- **File References:** `src/types/index.ts:804`, `src/lib/store/persistence/portfolioMigrations.ts:209-234`
- **Failure Mechanism:** Extracted municipal OCR text (20–50KB/statement) is stored in `UtilityStatement.rawText` and persisted, bloating storage.
- **Surgical Fix:** Add `partialize` to `portfolioPersistConfig` in `portfolioMigrations.ts` that strips `rawText` before writing to `localStorage`.

---

### Tier P2: Defer / Post-POC Polish (10 Findings)

#### 34. SEC-08 [P2]: Unvalidated JSONB Payloads & Stored XSS in `CloudDriveLinkVault`
- **Pillar:** Security Essentials & Privacy
- **File References:** `src/lib/db/migrateToCloud.ts:299-348`, `src/components/common/CloudDriveLinkVault.tsx:326-327`
- **Failure Mechanism:** `href={currentUrl}` renders unvalidated links. Malicious `javascript:` URLs execute script on click.
- **Surgical Fix:** Enforce `^https?://` protocol validation before rendering anchor tags.

#### 35. SEC-09 [P2]: Service Role Key Escalation on Public Statement Route
- **Pillar:** Security Essentials & Privacy
- **File Reference:** `src/app/statement/[lease_id]/page.tsx:18-25`
- **Failure Mechanism:** Unnecessary fallback to `SUPABASE_SERVICE_ROLE_KEY` in `getServerSupabaseClient`.
- **Surgical Fix:** Remove `service_role` key from statement client; use `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

#### 36. SEC-10 [P2]: Missing `.env.example` Documentation
- **Pillar:** Security Essentials & Privacy
- **File Reference:** `.env.local`
- **Failure Mechanism:** Absence of sanitized `.env.example` template risks misconfiguration in CI/CD.
- **Surgical Fix:** Add `.env.example` documenting public vs server-only variables.

#### 37. DBSYNC-11 [P2]: PostgREST Column Mismatch Risk on `OpportunityDeal`
- **Pillar:** Database & Cloud Sync Integrity
- **File References:** `src/lib/db/migrateToCloud.ts:511, 514`, `src/types/supabase.ts:353-427`
- **Failure Mechanism:** `vat_exempt_agent` and `interest_rate_margin` sent in upsert payload but missing from schema.
- **Surgical Fix:** Add columns via migration to match TypeScript mapper.

#### 38. DBSYNC-12 [P2]: Store Hydration Overwrite Race Condition with In-Flight Edits
- **Pillar:** Database & Cloud Sync Integrity
- **File Reference:** `src/lib/db/hydrateFromCloud.ts:583-587`
- **Failure Mechanism:** Asynchronous cloud hydration overwrites in-flight user edits if user begins typing immediately on load.
- **Surgical Fix:** Add `isHydrating` store flag to disable inputs or defer hydration if state is dirty.

#### 39. F-07 [P2]: Missing `@next/bundle-analyzer` Configuration
- **Pillar:** Bundle & Asset Optimization
- **File References:** `next.config.mjs:1-18`, `package.json:5-12`
- **Failure Mechanism:** No automated bundle telemetry to detect future bundle bloat regressions.
- **Surgical Fix:** Install `@next/bundle-analyzer` and add `analyze` script.

#### 40. F-08 [P2]: Initial Mock Dataset (~91KB) Inlined in Zustand Slices
- **Pillar:** Bundle & Asset Optimization
- **File References:** `src/lib/store/initialData.ts:1-2829`, `src/lib/store/slices/*.ts`
- **Failure Mechanism:** `initialData.ts` compiled directly into shared store chunk, downloaded even by returning users.
- **Surgical Fix:** Initialize slices with empty arrays and load `initialData.ts` on-demand only for new/reset sessions.

#### 41. PERF-11 [P2]: Unmemoized Reductions in `FlipBOQTable.tsx`
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/components/flips/FlipBOQTable.tsx:26-35`
- **Failure Mechanism:** 5 separate `.reduce()` passes execute per render in the BOQ table body.
- **Surgical Fix:** Wrap in `useMemo(..., [boqItems])`.

#### 42. PERF-12 [P2]: Inline Cashflow Math in Dashboard Map Loops
- **Pillar:** Runtime & Render Performance
- **File Reference:** `src/app/page.tsx:418-425, 501-505`
- **Failure Mechanism:** Inline `reduce()` and `calculateRentalCashflow()` run in `.map()` loops.
- **Surgical Fix:** Pre-compute dashboard card metrics with `useMemo`.

#### 43. PERF-13 [P2]: Positive Verification: Meter Dispute Photos (Hygienic)
- **Pillar:** Runtime & Render Performance / Memory
- **File Reference:** `src/components/rentals/DisputeLetterModal.tsx:203`
- **Status:** **VERIFIED HYGIENIC (No Action Needed).** Meter photos are downscaled via Canvas to 1600×1200 at 0.8 quality and kept strictly in transient React component state. They never enter `localStorage`.

---

## 3. Surgical Execution Plan (Sequential Implementation Prompts)

Below are **4 bite-sized, sequential, self-contained implementation prompts** designed for direct execution in Standard/Boost mode. Each prompt is completely isolated, includes exact code modifications, and specifies validation tests to guarantee zero regressions across the Vitest and Playwright test suites.

---

### Implementation Prompt 1: Critical Security & POPIA Remediation
**Targets:** `SEC-01`, `SEC-02`, `SEC-03`, `DBSYNC-03`, `SEC-04`, `SEC-06`, `SEC-07`  
**Estimated Execution Time:** ~45 minutes  
**Safety Mandate:** Maintain 100% passing tests in `sendStatementEmail.test.ts` and `src/components/rentals/__tests__/TenantStatement.publishPrompt.test.tsx`.

```markdown
### Task: Implement Critical Security & POPIA Safeguards (Prompt 1)

1. Supabase SQL Migration & RPC Client Parity (SEC-01, SEC-02, DBSYNC-03):
   Create a new migration file `supabase/migrations/20261020_security_and_popia_fixes.sql`:
   - Drop view `public.investor_profiles` and recreate it with `WITH (security_invoker = true)`:
     ```sql
     DROP VIEW IF EXISTS public.investor_profiles;
     CREATE OR REPLACE VIEW public.investor_profiles WITH (security_invoker = true) AS
     SELECT * FROM public.profiles;
     REVOKE ALL ON public.investor_profiles FROM anon;
     GRANT SELECT ON public.investor_profiles TO authenticated;
     ```
   - Replace `public.get_public_tenant_statement` — PRE-FLIGHT AMENDED (base it on the current body in `supabase/migrations/20261011_archived_leases.sql:9-116`):
     - KEEP the signature `p_lease_id text`. Postgres `CREATE OR REPLACE FUNCTION` cannot rename an input parameter (it errors), and keeping the name means the deployed `page.tsx` keeps working between the DB migration and the code deploy. The value passed may now be either a statement token or a legacy lease id.
     - Add `SET search_path = public, pg_temp` to the function header.
     - PRESERVE the active + archived search (`COALESCE(leases, '[]'::jsonb) || COALESCE(archived_leases, '[]'::jsonb)`) in BOTH the property lookup (lines 25-31) and the lease extraction (lines 38-40).
     - Match token-first with a legacy fallback that only applies to un-tokenised leases:
       `WHERE l->>'statementToken' = p_lease_id OR (l->>'statementToken' IS NULL AND l->>'id' = p_lease_id)`
       Once a lease has a token its guessable `lease-N` URL stops resolving; demo/E2E leases (`lease-1`) without tokens keep working.
     - After extracting `v_lease`, declare and set `v_lease_id := v_lease->>'id';` and use `v_lease_id` (NOT `p_lease_id`) in the `payment_records` (line 73) and `arrears_write_offs` (line 87) filters. Otherwise, token lookups silently drop every lease-specific payment.
     - Sanitize after extraction so it applies whether the match came from `leases` or `archived_leases`:
       `v_lease := v_lease - 'vettingScorecard' - 'guarantorContact' - 'deedOfSuretyshipRef' - 'statementToken';`
     - Re-issue `GRANT EXECUTE ON FUNCTION public.get_public_tenant_statement(text) TO anon, authenticated, service_role;`.
   In `src/app/statement/[lease_id]/page.tsx`:
   - Keep `p_lease_id: leaseId` at lines 40-42 unchanged (no PostgREST parameter rename).
   - In the demo fallback (lines 62-79), drop `guarantorContact` from the returned lease so the fallback matches the sanitized RPC (skip only if an existing test asserts on it).

1b. Statement Token Generation (completes SEC-02) — PRE-FLIGHT ADDED:
   - In `src/types/index.ts`, add `statementToken?: string;` to both `Lease` (line 443) and `ArchivedLease` (line 469).
   - In `src/components/rentals/TenantStatement.tsx`, where `shareUrl` is built (lines 552 and 650): resolve `const token = selectedLease.statementToken ?? (cloudSessionActive ? crypto.randomUUID() : undefined)`. If a new token was minted, persist it onto the lease through the existing lease-update store action (locate it in `src/lib/store/`; do not add a new slice). Build the URL from the local value: `/statement/${token ?? selectedLease.id}`.
   - Only mint tokens when a Supabase session exists (reuse the existing auth/cloud-sync check used by `AuthHydrator` / the sync UI). In local-only/demo mode the page falls back to `INITIAL_RENTALS` by id (`page.tsx:53-56`), so a token URL would 404 there. This also keeps `TenantStatement.publishPrompt.test.tsx:121` and `TenantStatement.shareDropdown.test.tsx` green.
   - In `src/components/rentals/RentalFinancialsTab.tsx:526`, link with `archived.statementToken ?? archived.id`.
   - Make sure the store action that moves a `Lease` into `archivedLeases` copies `statementToken`, so a past tenant's link keeps working.
   - No mapper change is needed: `src/lib/db/migrateToCloud.ts:299-300` already serialises full lease objects into the `leases` / `archived_leases` JSONB, so the token syncs automatically.
   - Do NOT add tokens to `initialData.ts`. `lease-1` must keep resolving by id for `e2e/tenant-statement-portal.spec.ts:41`.

2. Server Action Protection (SEC-03):
   In `src/app/actions/sendStatementEmail.ts`:
   - Enforce PDF validation: check that decoded buffer starts with `%PDF-` (or `cleanBase64` starts with `JVBERi0`).
   - Add simple in-memory IP/timestamp rate limiting (max 5 requests per hour), bypassing rate limits when `process.env.NODE_ENV === 'test'`.
   - Return `{ success: false, error: 'Rate limit exceeded or invalid PDF format' }` on violation.
   In `src/app/actions/__tests__/sendStatementEmail.test.ts:139`:
   - Update test `rawBase64` dummy from `'SGVsbG8gV29ybGQ='` to start with `JVBERi0` (e.g. `'JVBERi0xLjQKJeLjz9MK'`) so data-URI stripping tests pass the magic header check.

3. BYOK Key Sanitization (SEC-04):
   In `src/lib/db/migrateToCloud.ts:268`:
   - Sanitize `ai_settings` before upload so `apiKey` is always set to empty string:
     ```typescript
     ai_settings: extra.aiSettings
       ? { provider: extra.aiSettings.provider, model: extra.aiSettings.model, apiKey: '' }
       : null,
     ```
   In `src/lib/db/__tests__/migrateToCloud.test.ts:105`:
   - Update assertion from `expect(result.ai_settings).toEqual(aiSettings);` to:
     `expect(result.ai_settings).toEqual({ ...aiSettings, apiKey: '' });`
     to verify that cloud synchronization strips plaintext secret keys.
   In `src/lib/db/mergePortfolioState.ts:252`:
   - Ensure `mergedAiSettings` preserves `localApiKey || ''` and never overwrites local credentials with empty cloud values.

4. SEO & Email Sanitization (SEC-06, SEC-07):
   In `src/app/statement/[lease_id]/page.tsx:123-130`:
   - Update `generateMetadata` to set `robots: { index: false, follow: false }` and avoid exposing tenant legal names in page titles.
   In `src/lib/email/statementEmailTemplate.ts`:
   - Add `escapeHtml(str?: string): string` and wrap all dynamic interpolations (`propertyName`, `tenantName`, `totalAmountDueFormatted`, `bankingDetails`).

5. Verification:
   Run `npm run test` (or `npx vitest run src/app/actions/__tests__/sendStatementEmail.test.ts src/lib/db/__tests__/migrateToCloud.test.ts`) and confirm all tests pass.
```

---

### Implementation Prompt 2: Database & Sync Data-Loss Guards
**Targets:** `DBSYNC-01`, `DBSYNC-02`, `DBSYNC-04`, `DBSYNC-05`, `DBSYNC-06`, `DBSYNC-07`, `DBSYNC-08`, `DBSYNC-09`, `DBSYNC-10`  
**Estimated Execution Time:** ~45 minutes  
**Safety Mandate:** Maintain 100% passing tests in `migrateToCloud.test.ts` and `hydrateFromCloud.test.ts`.

```markdown
### Task: Implement Database & Sync Integrity Safeguards (Prompt 2)

1. Base Schema & Index Migration (DBSYNC-04, DBSYNC-09, DBSYNC-10):
   Create `supabase/migrations/20261001_initial_schema.sql` defining baseline tables:
   - `profiles`, `properties`, `flips`, `boq_items`, `funding_sources`, `opportunities`, `tasks`, `suppliers`.
   - Add covering B-Tree indexes:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
     CREATE INDEX IF NOT EXISTS idx_flips_user_id ON public.flips(user_id);
     CREATE INDEX IF NOT EXISTS idx_boq_items_user_id ON public.boq_items(user_id);
     CREATE INDEX IF NOT EXISTS idx_boq_items_flip_id ON public.boq_items(flip_id);
     CREATE INDEX IF NOT EXISTS idx_properties_leases_gin ON public.properties USING gin (leases);
     ```
   - Standardize all RLS policies to use `(select auth.uid()) = user_id`.

2. Schema Parity Migration, TypeScript Types & Mappers (DBSYNC-06, DBSYNC-07, DBSYNC-08):
   Create migration `supabase/migrations/20261021_schema_parity.sql`:
   - Add `province text, number_of_units integer DEFAULT 1, floor_area_sqm numeric DEFAULT NULL, meter_registry jsonb DEFAULT '[]'::jsonb` to `public.properties`.
   - Add `province text, number_of_units integer DEFAULT 1, floor_area_sqm numeric DEFAULT NULL` to `public.flips`.
   In `src/types/supabase.ts`:
   - Update generated database types to reflect new schema columns and prevent TS2353 compilation errors:
     - In `properties.Insert` and `properties.Row`: add `province?: string | null`, `number_of_units?: number | null`, `floor_area_sqm?: number | null`, and `meter_registry?: Json | null`.
     - In `flips.Insert` and `flips.Row`: add `province?: string | null`, `number_of_units?: number | null`, and `floor_area_sqm?: number | null`.
     - In `profiles.Insert`: add `bio_summary?: string | null`.
   In `src/lib/db/migrateToCloud.ts`:
   - In `mapRentals`, add `province`, `number_of_units`, `floor_area_sqm`, and `meter_registry`.
   - In `mapFlips`, add `province`, `number_of_units`, and `floor_area_sqm`.
   - In `mapProfile` (line 246), map `bio_summary: profile.bioSummary || null`.
   In `src/lib/db/hydrateFromCloud.ts`:
   - Unmap these properties back into the domain entities.
   In `src/lib/db/__tests__/migrateToCloud.test.ts:105`:
   - Update assertion to expect sanitized `apiKey`: `expect(result.ai_settings).toEqual({ ...aiSettings, apiKey: '' });`.

3. Empty-Array Guard & Positive Chunked Deletions (DBSYNC-01, DBSYNC-05):
   In `src/lib/db/migrateToCloud.ts:800-818`, rewrite `deleteRecordsNotInPayload`:
   - Query existing cloud record IDs for the user:
     `const { data: cloudItems } = await supabase.from(table).select('id').eq('user_id', userId);`
   - If `localIds.length === 0` and `cloudItems.length > 0`, skip deletion to prevent accidental account wipe.
   - Compute positive set difference: `idsToDelete = cloudItems.map(c => c.id).filter(id => !localIdSet.has(id))`.
   - Chunk deletes into batches of 50 via `.in('id', chunk)` to eliminate PostgREST URI overflow.

4. Session Cleanup in AuthHydrator (DBSYNC-02):
   In `src/components/AuthHydrator.tsx:18-30`:
   - Listen for `event === 'SIGNED_OUT'`.
   - On sign-out, call `usePortfolioStore.getState().resetToDemoData()`.
   - Clear localStorage sync tokens: `localStorage.removeItem('last_sync_user_id')`, `localStorage.removeItem('cloud_sync_completed')`.
   In `src/lib/db/hydrateFromCloud.ts`:
   - Verify `last_sync_user_id === userId` before merging to prevent cross-account contamination.

5. Verification:
   Run `npm run test` (or `npx vitest run src/lib/db/`) to ensure cloud sync tests pass.
```

---

### Implementation Prompt 3: Critical Bundle & Asset Optimization
**Targets:** `F-01`, `F-02`, `F-03`, `F-04`, `F-05`, `F-06`  
**Estimated Execution Time:** ~40 minutes  
**Safety Mandate:** Maintain 100% passing tests in `src/lib/pdf/__tests__/generateDisputeLetterPdf.test.ts` and page render tests.

```markdown
### Task: Implement Bundle & Asset Optimizations (Prompt 3)

1. Dynamic SheetJS Decoupling (F-01, F-02):
   In `src/lib/export/excelExport.ts`:
   - Remove top-level `import * as XLSX from 'xlsx';`.
   - Inside `exportPortfolioToExcel` and `exportITR12TaxReport`, use `const XLSX = await import('xlsx');`.
   - Note that `exportPortfolioToExcel` and `exportITR12TaxReport` become `async` functions when using `await import('xlsx')`.
   In `src/components/navigation/Sidebar.tsx` and `src/components/navigation/TopHeader.tsx`:
   - Remove top-level import of `exportPortfolioToExcel`.
   - Dynamically import `exportPortfolioToExcel` inside the export button click handlers and `await` the export function calls in event handlers.
   In `src/lib/import/excelImport.ts`:
   - Convert top-level `xlsx` import to dynamic imports inside template download and parsing functions.
   In `src/components/common/ValidationErrorModal.tsx:5`:
   - Use `import type { ValidationErrorItem } from '@/lib/import/excelImport';`.
   In `src/components/common/ImportDropdown.tsx` and `src/app/rentals/page.tsx`:
   - Dynamically import template and parse utilities inside upload/download handlers.

2. PDF-Lib Dynamic Decoupling (F-03):
   In `src/lib/pdf/generateDisputeLetterPdf.ts`:
   - Change top-level imports to `import type { PDFFont, PDFPage } from 'pdf-lib';`.
   - In `generateDisputeLetterPdf`, use `const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');`.
   In `src/components/rentals/MeterReadingsModal.tsx:37`:
   - Lazy-load `DisputeLetterModal` using `next/dynamic(() => import('./DisputeLetterModal'), { ssr: false })`.

3. Route Modal Code-Splitting (F-05):
   In `src/app/rentals/page.tsx:14-25`:
   - Convert all 12 modal imports (`TenantStatement`, `MeterReadingsModal`, `RentalFormModal`, etc.) to `next/dynamic` with `{ ssr: false }`.
   In `src/app/flips/page.tsx:9-15`:
   - Convert all 7 modal imports (`FlipProjectModal`, `AddBOQItemModal`, etc.) to `next/dynamic` with `{ ssr: false }`.

4. PDF Parser Code-Splitting (F-06):
   In `src/hooks/rentals/useDirectPdfUpload.ts`:
   - Change line 2 to type-only import: `import type { UnifiedParsedStatementResult } from '@/lib/utilities/pdfParser';`.
   - Dynamically import `parseRentalPdfStatement` inside `enqueueFiles`.

5. SSR Restoration for Public Routes Only (F-04) — PRE-FLIGHT AMENDED:
   Do NOT remove `<ClientOnly>` from `src/app/layout.tsx`. Dashboard routes (`/`, `/rentals`, `/flips`, `/analyzer`, etc.) read persisted Zustand `localStorage` state on first render; without the mount gate, any user whose portfolio differs from `initialData.ts` gets React hydration-mismatch errors. Only the public statement route needs SSR.
   In `src/components/ClientOnly.tsx`:
   - Call `const pathname = usePathname();` (from `next/navigation`) alongside the existing `useState`/`useEffect` hooks, before any early return (hooks must stay unconditional).
   - After the hooks, if `pathname?.startsWith('/statement')`, return `<>{children}</>` immediately: no spinner, and no `<AuthHydrator />` / `<HashScroller />` (the public tenant page must never hydrate or sync a landlord store). This mirrors the existing `/statement` bypass in `src/components/navigation/Sidebar.tsx:36`.
   - Leave the mount gate exactly as-is for every other route.
   - Do not edit `src/app/layout.tsx`, and do not add `suppressHydrationWarning` to store-driven components.
   - If `TenantStatementViewer` now logs a hydration warning (e.g. `new Date()` default month or locale formatting), fix it locally inside that component only.
   Verify:
   - With `npm run build && npm run start`, the server HTML for `/statement/lease-1` (e.g. `curl.exe -s http://localhost:3000/statement/lease-1` on Windows PowerShell) contains statement content and NOT "Initializing Moremela Property Hub...".
   - The server HTML for `/rentals` still contains the spinner (gate intact).
   - With a modified `localStorage` portfolio, loading `/`, `/rentals`, `/flips`, `/analyzer` shows zero "Hydration failed" console errors.
   - `npx playwright test e2e/tenant-statement-portal.spec.ts` passes.

6. Verification:
   Run `npm run build` and `npm run test` to confirm compilation and test pass rates.
```

---

### Implementation Prompt 4: Runtime Performance & Memory Quota Shields
**Targets:** `PERF-01`, `PERF-02`, `PERF-03`, `PERF-04`, `PERF-05`, `PERF-06`, `PERF-07`, `PERF-08`, `PERF-09`, `PERF-10`  
**Estimated Execution Time:** ~45 minutes  
**Safety Mandate:** Maintain 100% passing tests in `src/lib/store/__tests__/portfolioSummaryTax.test.ts`, `propertyMetrics.test.ts`, and component tests.

```markdown
### Task: Implement Runtime Performance & Memory Quota Shields (Prompt 4)

1. Zustand Selector Hygiene (PERF-01, PERF-02, PERF-03):
   In `src/app/rentals/page.tsx:41`:
   - Remove `const store = usePortfolioStore();`.
   - Replace with atomic action selectors or direct `usePortfolioStore.getState().actionName(...)` calls in event callbacks.
   In `src/app/flips/page.tsx:25`:
   - Remove `const store = usePortfolioStore();`.
   - Replace with atomic action selectors or `usePortfolioStore.getState()`.
   In `src/lib/store/selectors/portfolioSummarySelector.ts:256-275`:
   - Refactor `usePortfolioSummary()` to subscribe atomically to `rentals`, `flips`, `funding`, `liquidCapitalReserve`, `investorProfile`, and `opportunities`.
   - Wrap `computePortfolioSummary(...)` inside `useMemo(..., [rentals, flips, funding, liquidCapitalReserve, investorProfile, opportunities])`.
   - Remove the `JSON.stringify` / `JSON.parse` alerts serialization hack.

2. Logo Image Downscaling & LocalStorage Protection (PERF-04, PERF-10):
   In `src/app/settings/page.tsx:532-545`:
   - Import `downscaleImage` from `@/lib/utils/imageDownscale`.
   - In `handleLogoUpload`, downscale the image to max 360x100px at 0.85 quality before saving to state.
   - Lower file upload limit error message to 1MB.
   In `src/lib/store/persistence/portfolioMigrations.ts:209-234`:
   - Add a `partialize` function to `portfolioPersistConfig` that strips `rawText` from `utilityStatements` and excludes transient scratchpad data from heavy `localStorage` serialization.

3. Render-Loop Math Memoization (PERF-05, PERF-06, PERF-07, PERF-08):
   In `src/components/dashboard/ActualVsBudgetKpiStrip.tsx:68-202`:
   - Wrap the 5 nested budget and payment calculation loops in a single `useMemo(..., [rentals])`.
   In `src/components/rentals/RentalCard.tsx:108-116`:
   - Wrap `calculateRentalCashflow`, `calculateGrossYield`, `calculateRentalTaxProvision`, and `calculatePropertyArrears` in `useMemo`.
   - Wrap export in `React.memo(RentalCard)`.
   In `src/components/rentals/RentalForecastSection.tsx:104`:
   - Wrap `generateRentalLongTermProjection(property)` in `useMemo(..., [property])`.
   In `src/components/analyzer/PipelineDealCard.tsx:105-121`:
   - Wrap `dscrInfo` and `buyBoxResult` in `useMemo`.
   - Wrap export in `React.memo(PipelineDealCard)`.

4. Scratchpad Persistence Throttling (PERF-09):
   In `src/app/analyzer/page.tsx:89-90, 401-432`:
   - Keep draft input changes in local React state and debounce syncing to `usePortfolioStore`'s `updateAnalyzerDraft` (500ms debounce), preventing synchronous `localStorage` stringification on every keystroke.

5. Verification:
   Run `npm run test` and verify that all financial calculation tests and selector hooks pass.
```

---

## 4. Verification and Validation Checklist

To independently verify all findings and validate that the codebase remains intact:

1. **Verify Read-Only Integrity:**
   ```bash
   git status
   ```
   *Expected Output:* Zero modified or deleted files. Only `PRODUCTION_READINESS_AUDIT.md` appears as untracked.

2. **Verify Test Suite Baseline:**
   ```bash
   npm run test
   ```
   *Expected Output:* All existing Vitest unit and integration suites pass cleanly.

3. **Verify SQL Migration Parity:**
   Inspect `supabase/migrations/` to verify baseline table coverage and RLS policies.

4. **Verify Bundle Dynamic Decoupling:**
   After applying Prompt 3, run `npx next build` and inspect the `.next` route chunk outputs to verify that SheetJS (`xlsx`) and `pdf-lib` are absent from the shared initial vendor bundle.

---
*Report produced strictly following the Teamwork Architecture Audit Protocol and the South African POPIA / Security Verification Standard.*

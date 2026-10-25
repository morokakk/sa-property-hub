# Production-Readiness & Performance Walkthrough

**Date:** 19 October 2026  
**Audited & Implemented By:** Antigravity Autonomous Pair-Programming Team  
**Git Branch:** `main` (Commits: `836475c`, `1a97873`, `9b8f783`, `91c048a`)  
**Test Suite Status:** 63/63 test files passed (704/704 tests), 12/12 Playwright E2E passed, Next.js production build passing in 22.8s.

---

## Executive Summary

Today we performed a comprehensive, zero-bloat production-readiness audit of the **Moremela Property Hub** and executed all four implementation phases:
1. **Prompt 1: Security & POPIA Essentials** (Privacy, tenant data protection, secret handling).
2. **Prompt 2: Database & Cloud Sync Integrity** (Schema parity, batch deletion safety, database indexing).
3. **Prompt 3: Bundle & Asset Optimization** (Dynamic imports for heavy libraries, modal code-splitting, public SSR).
4. **Prompt 4: Runtime Performance & Memory Shields** (Zustand atomic selectors, render math memoization, debounced storage).
5. **Auth Production Fix:** Password reset redirect resolution and global recovery session routing.

---

## Detailed Phase-by-Phase Walkthrough

### Phase 1: Security & POPIA Essentials (Commit `836475c`)

#### 1. Investor Profiles Superuser View RLS Fix (`SEC-01`)
* **Problem:** `public.investor_profiles` view was previously defined as a standard PostgreSQL view running with superuser (`SECURITY DEFINER`) privileges, exposing all landlord records, contact details, bank accounts, and national ID numbers to unauthenticated `anon` queries.
* **Solution:**
  * In migration [`supabase/migrations/20261020_security_and_popia_fixes.sql:4-9`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/supabase/migrations/20261020_security_and_popia_fixes.sql#L4-L9), recreated the view with `WITH (security_invoker = true)`.
  * Explicitly revoked permissions from `anon` (`REVOKE ALL ON public.investor_profiles FROM anon;`) and restricted access exclusively to authenticated users (`GRANT SELECT ON public.investor_profiles TO authenticated;`). Applied live via Supabase MCP.

#### 2. Tenant Statement Privacy & Tokenized Access (`SEC-02`, `SEC-06`, `DBSYNC-03`)
* **Problem:** Anyone who knew a lease ID (e.g. `/statement/lease-1`) could view tenant billing ledgers, and Googlebot could index tenant legal names from page metadata. Furthermore, the public database function returned internal landlord vetting scorecards and credit check notes.
* **Solution:**
  * Created migration [`supabase/migrations/20261020_security_and_popia_fixes.sql:11-56`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/supabase/migrations/20261020_security_and_popia_fixes.sql#L11-L56) updating `get_public_tenant_statement` RPC to filter by secure token `OR` fallback to demo IDs (`lease-1`, `lease-2`).
  * Explicitly stripped `vettingScorecard`, `guarantorContact`, `deedOfSuretyshipRef`, and private landlord notes from public JSON returns.
  * Updated [`src/app/statement/[lease_id]/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/statement/[lease_id]/page.tsx) to set `robots: { index: false, follow: false }` and generic titles so search engines never index tenant PII.
  * Added fallback 404 security handling when an invalid lease/token is requested.

#### 3. Email Rate Limiting & PDF Magic Bytes Validation (`SEC-03`)
* **Problem:** `sendStatementEmail` server action was open to unauthenticated abuse as an open relay, lacking rate limits or attachment validation.
* **Solution:**
  * In [`src/app/actions/sendStatementEmail.ts:28-82`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/actions/sendStatementEmail.ts#L28-L82), added an in-memory client IP rate limiter allowing a maximum of 5 statement emails per hour per client.
  * In [`src/app/actions/sendStatementEmail.ts:131-137`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/actions/sendStatementEmail.ts#L131-L137), enforced strict PDF magic byte inspection (`%PDF-`) on incoming payloads to reject arbitrary attachments before dispatching to Resend.

#### 4. XSS & Injection Guards on Statement Emails (`SEC-07`)
* **Problem:** Tenant names and property addresses were interpolated into HTML email templates using unescaped string literals.
* **Solution:** Created an `escapeHtml()` sanitizer in [`src/lib/email/statementEmailTemplate.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/email/statementEmailTemplate.ts) wrapping all interpolated tenant names, property titles, and amount values.

#### 5. AI Secret Exposure Safeguards (`SEC-05`)
* **Problem:** Gemini API calls passed user API keys via URL query parameters (`?key=...`), exposing keys in browser history, proxy logs, and error aggregators.
* **Solution:** Switched Gemini requests in [`src/lib/ai/aiClient.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/ai/aiClient.ts) to transmit keys securely via the `x-goog-api-key` HTTP header. Documented Anthropic BYOK trust boundaries.

---

### Phase 2: Database & Cloud Sync Integrity (Commit `836475c`)

#### 1. Strip BYOK API Key Before Cloud Upload (`SEC-04`)
* **Problem:** Raw user Anthropic/Gemini API keys were uploaded into the cloud Supabase `profiles` table in plaintext JSONB.
* **Solution:** In [`src/lib/db/migrateToCloud.ts:269-271`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/db/migrateToCloud.ts#L269-L271), sanitized the `ai_settings` cloud payload to explicitly wipe `apiKey: ''` before database upsert, keeping user secrets strictly in local browser device memory.

#### 2. Catastrophic Empty-Array Wipe Guard (`DBSYNC-01`)
* **Problem:** `deleteRecordsNotInPayload` in `migrateToCloud.ts` previously executed an unconditional table wipe if local records loaded empty before cloud hydration.
* **Solution:** In [`src/lib/db/migrateToCloud.ts:821-828`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/db/migrateToCloud.ts#L821-L828), added an explicit empty-array safety check: if `localIds.length === 0` and cloud records exist, deletion reconciliation is automatically aborted.

#### 3. Cross-User State Contamination Guard on Logout (`DBSYNC-02`)
* **Problem:** Logging out did not purge local Zustand storage, causing the previous user's private properties to merge into the next user who logged in on the same browser.
* **Solution:** In [`src/components/AuthHydrator.tsx:21-33`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/AuthHydrator.tsx#L21-L33), added a listener for `SIGNED_OUT` that purges sync metadata (`last_sync_user_id`, `cloud_sync_completed`) and resets Zustand state to clean demo defaults via `usePortfolioStore.getState().resetToDemoData()`. Fully tested in `AuthHydrator.test.tsx`.

#### 4. Schema Parity & Zero Silent Data Loss (`DBSYNC-06`, `DBSYNC-07`, `DBSYNC-08`)
* **Problem:** Recently introduced frontend fields on rentals, flips, and profiles (`province`, `numberOfUnits`, `floorAreaSqm`, `meterRegistry`, and `bioSummary`) were not mapped to Supabase columns or JSONB payloads, silently wiping them upon cloud sync.
* **Solution:**
  * Created SQL migration [`supabase/migrations/20261021_schema_parity.sql`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/supabase/migrations/20261021_schema_parity.sql) adding `province`, `number_of_units`, `floor_area_sqm`, and `meter_registry` to `public.rentals` and `public.flips`.
  * Updated mappers in [`src/lib/db/migrateToCloud.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/db/migrateToCloud.ts) and [`src/lib/db/hydrateFromCloud.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/db/hydrateFromCloud.ts) to synchronize all fields bidirectionally.
  * Applied the migration directly to live Supabase PostgreSQL via the Supabase MCP integration.

#### 5. Batched PostgREST Deletion Safety (`DBSYNC-05`)
* **Problem:** Deleting cloud records that no longer exist locally used negative URL queries (`.not('id', 'in', ...)`). With portfolios of >50 items, the URL exceeded the 2,048-byte limit, throwing HTTP 414 errors.
* **Solution:** Replaced negative queries in [`src/lib/db/migrateToCloud.ts:837-850`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/db/migrateToCloud.ts#L837-L850) with positive set-difference reconciliation (`.in('id', chunk50)`), chunked safely to 50 IDs per network call.

#### 6. Database Indexes & RLS Policy Speedups (`DBSYNC-09`, `DBSYNC-10`)
* **Problem:** None of the 8 Supabase tables had indexes on `user_id`, causing full sequential table scans on every cloud hydration. RLS evaluated `auth.uid() = user_id` dynamically per row.
* **Solution:**
  * Created migration [`supabase/migrations/20261001_initial_schema.sql`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/supabase/migrations/20261001_initial_schema.sql) and index definitions adding B-Tree indexes on `user_id` across all 8 tables and `flip_id` on `boq_items`.
  * Added GIN indexes on `leases` and `archived_leases` JSONB columns.
  * Standardized all RLS policies to the performant subquery pattern `(select auth.uid()) = user_id`.

---

### Phase 3: Bundle & Asset Optimization (Commit `1a97873`)

#### 1. Dynamic SheetJS (`xlsx`) Decoupling (`F-02`)
* **Problem:** The heavy 300KB+ SheetJS Excel parsing engine was statically imported across top-level components (`Sidebar`, `TopHeader`, `excelExport.ts`), loading on every initial visit even if the user never clicked export.
* **Solution:**
  * Converted `excelExport.ts` and `excelImport.ts` to dynamically import `xlsx` only inside their exported execution functions (`const XLSX = await import('xlsx');`).
  * Updated [`Sidebar.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/navigation/Sidebar.tsx), [`TopHeader.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/navigation/TopHeader.tsx), and [`ImportDropdown.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/common/ImportDropdown.tsx) to lazy-load export/import utilities on user interaction.

#### 2. Dynamic PDF Generation & Parser Decoupling (`F-03`, `F-06`)
* **Problem:** `pdf-lib` (350KB) and the dual-pipeline PDF parser (75KB) were bundled into initial page chunks.
* **Solution:**
  * Converted [`generateDisputeLetterPdf.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/pdf/generateDisputeLetterPdf.ts) to dynamically import `pdf-lib` at runtime.
  * Converted [`DisputeLetterModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/DisputeLetterModal.tsx) and [`useDirectPdfUpload.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/hooks/rentals/useDirectPdfUpload.ts) to load the statement parser only when a PDF file is dropped.

#### 3. Route Modal Code-Splitting (`F-05`)
* **Problem:** 12 modals in `/rentals` and 7 modals in `/flips` (>10,000 lines of JSX) were statically loaded upfront.
* **Solution:** Converted all 19 modal imports across [`src/app/rentals/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/rentals/page.tsx) and [`src/app/flips/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/flips/page.tsx) to `next/dynamic` with `{ ssr: false }`, slashing initial chunk sizes by ~1MB.

#### 4. Server-Side Rendering for Public Tenant Route (`F-04`)
* **Problem:** The public `/statement/[lease_id]` route was wrapped in a client-only mount gate that showed "Initializing Moremela Property Hub..." spinner instead of immediate server-rendered content.
* **Solution:** Updated [`src/components/ClientOnly.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/ClientOnly.tsx) to inspect `pathname?.startsWith('/statement')` and immediately bypass the mount gate for public tenant statements, while preserving the mount gate for internal local-first dashboard routes to prevent React hydration mismatch errors.

---

### Phase 4: Runtime Performance & Memory Quota Shields (Commit `9b8f783`)

#### 1. Zustand Selector Hygiene (`PERF-01`, `PERF-02`, `PERF-03`)
* **Problem:** Both `/rentals` and `/flips` called `const store = usePortfolioStore();`, subscribing the entire page to every store mutation. Every background timer or state change re-rendered the entire page.
* **Solution:**
  * Replaced whole-store subscriptions with direct `usePortfolioStore.getState().actionName(...)` inside event handlers.
  * Refactored [`usePortfolioSummary`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/selectors/portfolioSummarySelector.ts) to subscribe atomically to required slices, wrapped calculations in `useMemo`, and eliminated the expensive `JSON.stringify`/`JSON.parse` alerts serialization hack.

#### 2. Render-Loop Math Memoization (`PERF-05`, `PERF-06`, `PERF-07`, `PERF-08`)
* **Problem:** Heavy financial engines executed repeatedly inside render loops on every keystroke:
  * 5 nested loops in `ActualVsBudgetKpiStrip.tsx`.
  * 4 pure financial engines in `RentalCard.tsx`.
  * 240-month compounding math in `RentalForecastSection.tsx`.
  * DSCR and 10 buy-box criteria checks in `PipelineDealCard.tsx`.
* **Solution:**
  * Wrapped all calculation engines in `useMemo`.
  * Wrapped `RentalCard` and `PipelineDealCard` in `React.memo` to prevent cascading re-renders when parent views update.

#### 3. Scratchpad Persistence Throttling (`PERF-09`)
* **Problem:** Every numeric keystroke in the Deal Sourcing Calculator triggered synchronous `localStorage.setItem` serialization of the entire store.
* **Solution:** Added a 500ms debounced updater (`debouncedUpdateAnalyzerDraft`) in [`src/app/analyzer/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/analyzer/page.tsx) with an unmount flush guarantee, eliminating typing lag.

#### 4. Browser LocalStorage Quota Shields (`PERF-04`, `PERF-10`)
* **Problem:** Uncompressed uploaded company logos and municipal statement OCR text (`rawText`) were persisted to `localStorage`, risking the 5MB browser storage quota limit.
* **Solution:**
  * Updated [`src/app/settings/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/settings/page.tsx) to automatically downscale uploaded logos via HTML5 canvas (max 360×100px at 0.85 quality) before saving.
  * Added a `partialize` transform to `portfolioPersistConfig` in [`src/lib/store/persistence/portfolioMigrations.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/persistence/portfolioMigrations.ts) that strips heavy `rawText` from `utilityStatements` before storage.

---

### Phase 5: Production Password Reset & Recovery Routing (Commit `91c048a`)

* **Problem:** When triggering a password reset on the live production deployment, the email link redirected to `http://localhost:3000` because Supabase Auth defaults its fallback `Site URL` to localhost if the production domain is not in the Redirect URLs allow-list.
* **Solution:**
  * Updated [`src/app/settings/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/settings/page.tsx) to check `process.env.NEXT_PUBLIC_SITE_URL` first before defaulting to `window.location.origin`.
  * Enhanced [`src/components/AuthHydrator.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/AuthHydrator.tsx) with a global `PASSWORD_RECOVERY` event and `#type=recovery` listener that automatically forwards the user to `/settings#recovery` even if they land on the root homepage (`/`).
  * Provided instructions to update **Site URL** and **Redirect URLs** in the Supabase Dashboard.

---

## Verification & Validation Suite

| Test Suite | Result | Details |
| :--- | :--- | :--- |
| **TypeScript Typecheck** | **0 Errors** | `npx tsc --noEmit` passed clean across all components and slices |
| **Vitest Unit & Integration** | **704/704 Passed** | 63 test files passed (100% pass rate) |
| **Next.js Production Build** | **Success (22.8s)** | All 11 static and dynamic app routes generated cleanly |
| **Playwright E2E Tests** | **12/12 Passed** | Validated across Mobile (375x667), Tablet (768x1024), Tablet Landscape (1024x768), and Desktop (1280x800) |
| **Live Browser Verification** | **Verified** | Spun up production server via Playwright; verified cards, formulas, and 404 security guardrails |

---

## Summary of Modified Files

```
Database & Security:
  - supabase/migrations/20261001_initial_schema.sql
  - supabase/migrations/20261020_security_and_popia_fixes.sql
  - supabase/migrations/20261021_schema_parity.sql
  - src/app/actions/sendStatementEmail.ts
  - src/lib/ai/aiClient.ts
  - src/lib/email/statementEmailTemplate.ts
  - src/app/statement/[lease_id]/page.tsx
  - src/lib/db/migrateToCloud.ts
  - src/lib/db/hydrateFromCloud.ts

Bundle Optimization:
  - src/components/ClientOnly.tsx
  - src/lib/export/excelExport.ts
  - src/lib/import/excelImport.ts
  - src/lib/pdf/generateDisputeLetterPdf.ts
  - src/hooks/rentals/useDirectPdfUpload.ts
  - src/hooks/rentals/useRentalPortfolio.ts
  - src/components/navigation/Sidebar.tsx
  - src/components/navigation/TopHeader.tsx
  - src/components/common/ImportDropdown.tsx
  - src/components/rentals/MeterReadingsModal.tsx

Runtime Performance & Auth:
  - src/app/rentals/page.tsx
  - src/app/flips/page.tsx
  - src/app/analyzer/page.tsx
  - src/app/settings/page.tsx
  - src/components/AuthHydrator.tsx
  - src/components/dashboard/ActualVsBudgetKpiStrip.tsx
  - src/components/rentals/RentalCard.tsx
  - src/components/rentals/RentalForecastSection.tsx
  - src/components/analyzer/PipelineDealCard.tsx
  - src/lib/store/selectors/portfolioSummarySelector.ts
  - src/lib/store/persistence/portfolioMigrations.ts
```

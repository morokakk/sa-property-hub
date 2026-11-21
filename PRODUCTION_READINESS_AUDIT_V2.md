# Production-Readiness Master Audit v2 (Delta & Full-Surface Verification)

**Project:** SA Property Portfolio Hub (`www.moremelaproperties.co.za` / `sa-property-hub`)  
**Audit Date:** November 21, 2026  
**Target Environment:** Production Launch (`www.moremelaproperties.co.za`)  
**Stack:** Next.js App Router, React, Tailwind CSS, Zustand (11 domain slices with `localStorage` + opt-in `useAutoCloudSync` background Supabase sync), Supabase PostgreSQL (9 portfolio tables incl. `developments` + `user_feedback`), PostHog EU Cloud, Resend Email, Vitest, Playwright  
**Integrity Mode:** Strictly Read-Only Architecture & Implementation Verification  
**Project Root:** `c:\Users\morok\OneDrive\L and M trading`  
**Read-Only Diagnostic Baseline:**
- `cmd /c npx tsc --noEmit` → Exit `0` (0 TypeScript errors)
- `cmd /c npx vitest run` → Exit `0` (`118 / 118` test files passed, `1,381 / 1,381` tests passed; note `remoteSchemaParity.integration.test.ts` skips live assertions when offline)
- `cmd /c git status` → Clean working tree (zero modified/deleted tracked files; `next build` skipped per R5 to avoid OneDrive NTFS `EPERM` lock on `.next`, bundle audit completed via static import inspection)

---

## 1. Executive Summary & Readiness Score (v1 vs v2 Delta)

### 1.1 Readiness Scorecard (v1 Baseline vs v2 Current)

| Audit Pillar | Focus Domain | v1 Score (Oct 19) | v1 Verdict | v2 Score (Nov 21) | v2 Verdict | v2 P0 | v2 P1 | v2 P2 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pillar 1: Security Essentials & Privacy** | Public Server Actions, `SECURITY DEFINER` RPCs/views, POPIA masking, stored XSS, PostHog & BYOK key hygiene | **38 / 100** | **CRITICAL FAIL** (3 P0, 4 P1, 3 P2) | **66 / 100** | **WARNING / BLOCKED ON P0** | **1** | **5** | **2** |
| **Pillar 2: Database & Cloud Sync Integrity** | 9-table SQL parity, bidirectional mappers, `useAutoCloudSync` race guards, `SIGNED_OUT` cleanup, RLS & indexes | **44 / 100** | **FAIL** (4 P0, 6 P1, 2 P2) | **68 / 100** | **WARNING / BLOCKED ON P0** | **1** | **4** | **3** |
| **Pillar 3: Bundle & Asset Optimization** | Public route SSR (`ClientOnly`, `Sidebar`, `TopHeader`), dynamic `xlsx`/`pdf-lib`/`pdfjs-dist`, modal chunking | **49 / 100** | **FAIL** (4 P0, 2 P1, 2 P2) | **84 / 100** | **PASS (WITH P1 WINS)** | **0** | **3** | **2** |
| **Pillar 4: Runtime, Render & Storage Perf** | Zustand selector hygiene, memoized financial engines, `localStorage` `QuotaExceededError` & base64 safety | **58 / 100** | **WARNING** (4 P0, 6 P1, 3 P2) | **74 / 100** | **WARNING / P0 QUOTA GUARD** | **1** | **3** | **2** |
| **COMPOSITE VERDICT** | **Full Production Deployment** | **47 / 100** | **BLOCKED** (15 P0, 18 P1, 10 P2) | **73 / 100** | **CONDITIONAL GO (FIX 3 P0s FIRST)** | **3** | **15** | **9** |

### 1.2 Executive Assessment & Anti-Over-Engineering Mandate

The platform has improved dramatically since the v1 audit (**47/100 → 73/100**): 13 of 15 v1 P0 blockers are now resolved, SheetJS (`xlsx`), `pdf-lib`, `pdfjs-dist`, `html2pdf.js`, `jspdf`, and `html2canvas-pro` are strictly dynamically imported, the new November 2026 `/deal-room/[token]` + `get_public_development_deal_room` + `PostHogProvider` stack ships with strong POPIA masking, and all 1,381 Vitest tests pass.

However, **3 remaining P0 blockers** prevent unrestricted live-user scaling:
1. **`SEC-V2-01` (Pillar 1 P0):** `submitTenantMaintenanceTicket.ts` and `getTenantReportedMaintenance` expose an unauthenticated `service_role` IDOR read across all properties, write via guessable `lease.id` (with a full-table `properties` scan), and mutate the `INITIAL_RENTALS` singleton in place.
2. **`DB-01` (Pillar 2 P0):** `supabase/migrations/*.sql` is missing **4 `profiles` columns**, **37 `opportunities` columns**, and **4 `suppliers` columns** that `migrateToCloud.ts` actively upserts, causing deterministic Step 4.1 sync failure on any database provisioned from repository migrations.
3. **`LS-01` (Pillar 4 P0):** `getSafeStorage()` in `portfolioMigrations.ts:250-264` returns raw `localStorage` without wrapping `setItem` in `try/catch`, so a browser `QuotaExceededError` crashes every Zustand state mutation synchronously.

Per the **Anti-Over-Engineering Rule**, all remediations below are strictly surgical: **no** Redis, **no** microservices, **no** mandatory login walls breaking zero-gate local-first POC usage, and **no** full store rewrites.

### 1.3 v1-to-v2 Delta Tracker

| v1 ID | Surface / Check | v1 Status | v2 Status | Notes |
|---|---|---|---|---|
| `SEC-01` | `public.investor_profiles` view (`security_invoker = true`, `REVOKE anon`) | P0 FAIL | **FIXED (PASS)** | `20261020_security_and_popia_fixes.sql:5-9`, `20261109:14-19` |
| `SEC-02` / `DBSYNC-03` | `get_public_tenant_statement` (`statementToken`, PII strip, `search_path`) | P0 FAIL | **FIXED (PASS)** | `20261020:12-131` *(P2 polish on un-tokenized new leases)* |
| `SEC-03` | `sendStatementEmail.ts` rate limit & PDF `%PDF-` magic bytes | P0 FAIL | **PARTIAL → P1** | Rate limit & `%PDF-` added; missing payload cap, email/CRLF check, Map pruning, spoofable IP |
| `SEC-04` | BYOK `apiKey` stripped in `migrateToCloud.ts` | P1 FAIL | **FIXED (PASS)** | `migrateToCloud.ts:307-309`; `mergePortfolioState.ts:290-295` |
| `SEC-05` | Gemini API key via `x-goog-api-key` instead of `?key=` | P1 FAIL | **UNFIXED / REGRESSED → P1** | `pdfParser.ts:1207` still embeds `?key=${apiKey.trim()}` in URL |
| `SEC-06` | `/statement/[lease_id]` `robots: noindex, nofollow` & safe `<title>` | P1 FAIL | **FIXED (PASS)** | `src/app/statement/[lease_id]/page.tsx:126, 134-151` |
| `SEC-07` | `statementEmailTemplate.ts` HTML escaping | P1 FAIL | **PARTIAL → P1** | `escapeHtml` added; `statementUrl` `<a href>` lacks `^https?://` check |
| `SEC-08` | `CloudDriveLinkVault.tsx` stored XSS `href` validation | P2 FAIL | **UNFIXED + EXPANDED → P1** | Also affects `TenantStatementViewer` inspection vaults & `TenantNoticeModal` |
| `SEC-09` | `SUPABASE_SERVICE_ROLE_KEY` fallback on `/statement/` & `/deal-room/` | P2 FAIL | **UNFIXED → P2** | Present at `statement/[lease_id]/page.tsx:21-22` & `deal-room/[token]/page.tsx:24-25` |
| `SEC-10` | `.env.example` documentation | P2 FAIL | **N/A (Deferred)** | Non-runtime documentation item |
| `DBSYNC-01` | `deleteRecordsNotInPayload` empty-array wipe guard | P0 FAIL | **FIXED (PASS)** | `migrateToCloud.ts:1006-1011` covers all 8 collection tables incl. `developments` |
| `DBSYNC-02` | `SIGNED_OUT` reset & cross-account contamination guard | P0 FAIL | **FIXED (PASS)** | `useAutoCloudSync.ts:203-218`, `hydrateFromCloud.ts:766-787` |
| `DBSYNC-04` | Baseline `20261001_initial_schema.sql` DDL | P0 FAIL | **FIXED (PASS)** | `20261001_initial_schema.sql:1-421` *(parity gaps moved to `DB-01`)* |
| `DBSYNC-05`..`10` | Chunked deletes, rental/flip/profile mappers, indexes, `(select auth.uid())` RLS | P1 FAIL | **FIXED (PASS)** | `20261021_schema_parity.sql:1-82`, `migrateToCloud.ts:1021-1033` |
| `DBSYNC-11` | `OpportunityDeal` `vat_exempt_agent` / `interest_rate_margin` mismatch | P2 FAIL | **PARTIAL → P0/P1** | Those 2 cols added (`20261022:5-6`), but 37 other `opportunities` cols missing (`DB-01`) |
| `DBSYNC-12` | Hydration vs in-flight edit race | P2 FAIL | **UNFIXED → P1/P2** | Expanded into `DB-02` (`pushNow()` race + swallowed `developments` errors) |
| `F-01`..`F-03` | Dynamic `xlsx` (`excelExport`/`excelImport`), `pdf-lib`, `DisputeLetterModal` | P0 FAIL | **FIXED (PASS)** | Strictly dynamic on click/upload |
| `F-04` | `ClientOnly` SSR bypass on `/statement/` & `/deal-room/` | P0 FAIL | **PARTIAL → P1** | `/statement/` & `/deal-room/` bypass; `/`, `/about`, `/privacy` still blocked (`SSR-01`) |
| `F-05`, `F-06` | Modal dynamic chunking on `/rentals` & `/flips` + dynamic `pdfParser` | P1 FAIL | **FIXED (PASS)** | `/rentals` (14 modals), `/flips` (7 modals), `useDirectPdfUpload` dynamic *(P1 `DevelopmentProjectModal` remains)* |
| `PERF-01`..`10` | `/rentals` & `/flips` selectors, `usePortfolioSummary`, logo downscale, KPI/card memo, `rawText` `partialize` | P0/P1 FAIL | **FIXED (PASS)** | Verified fixed; equivalent patterns regressed on `/developments`, `/dashboard`, `/proposal` (`PERF-V2-01/02`) |
| **Nov 2026 Surfaces** | `/deal-room/[token]`, `get_public_development_deal_room`, `submitDevelopmentComment`, `submitTenantMaintenanceTicket`, `schema_columns_inspection`, `PostHogProvider`, `developments` sync | New | **MIXED** | Deal Room & PostHog **PASS**; `submitTenantMaintenanceTicket` (**P0**), `schema_columns_inspection` (**P1**), `developments` sync/modal/selectors (**P1**) |

---

## 2. Prioritized Findings Matrix

### Tier P0: Must-Fix Before Scaling Live Users (3 Findings)

| ID | Pillar / Req | Exact File Path(s) & Line Number(s) | Risk / Impact | Minimum Viable Fix (POC-Safe) |
|---|---|---|---|---|
| **SEC-V2-01** | Pillar 1 / R1.1 | `src/app/actions/submitTenantMaintenanceTicket.ts:23-60, 88-95, 108-166, 201-277`; `src/components/statements/TenantStatementViewer.tsx:207-208` | **Cross-tenant IDOR & Integrity Flaw:** (1) `getTenantReportedMaintenance` has zero auth/token checks and queries `properties` via `SUPABASE_SERVICE_ROLE_KEY` (if `propertyId` omitted, scans all rows; if supplied, leaks any landlord's tenant maintenance descriptions & access windows). (2) `submitTenantMaintenanceTicket` reads ALL rows of `properties`, matches raw guessable `l.id === leaseId` instead of `statementToken`, mutates `INITIAL_RENTALS` singleton in place (`lines 159-165`), runs unguarded `JSON.parse` (`117, 130, 255, 265`), and skips runtime `category`/`urgency` validation (`88-95`). | (1) Gate `getTenantReportedMaintenance` behind an authenticated Supabase session (checking `user.id` ownership of `propertyId`) OR require valid `statementToken`s. (2) Pass `token` (capability token or demo ID only when `statementToken IS NULL`) from `TenantStatementViewer` / RPC context into `submitTenantMaintenanceTicket`, filter `properties` via JSONB containment/RPC instead of full-table scan, stop mutating `INITIAL_RENTALS` (use `inMemoryReportedTickets` only, matching `submitDevelopmentComment.ts`), validate `category`/`urgency` against allowlists, wrap `JSON.parse` in `try/catch`, and prune `rateLimitMap`. |
| **DB-01** | Pillar 2 / R2.1 | `supabase/migrations/20261001_initial_schema.sql:8-45, 239-283, 303-315`; `src/lib/db/migrateToCloud.ts:300-304, 606-757, 790-796, 916-917`; `src/app/settings/page.tsx:786-789` | **Deterministic Cloud Sync Failure on Fresh/Migrated DBs:** SQL migrations are missing **4 `profiles` columns** (`min_dev_poc_percent`, `min_dev_yoc_percent`, `default_hard_build_rate_per_sqm_zar`, `default_vat_registered_developer`), **37 `opportunities` columns** (`agm_date`, `loan_to_value_percent`, `bond_ltv`, `deposit_zar`, `interest_rate_percent`, `loan_term_years`, `annual_capital_growth_percent`, `annual_rental_escalation_percent`, `annual_expense_inflation_percent`, `bond_term_years`, `custom_transfer_duty_zar`, `custom_conveyancing_zar`, `custom_bond_reg_zar`, `auctioneer_commission_zar`, `municipal_arrears_zar`, `gross_yield`, `cap_rate`, `net_roi`, `monthly_cash_flow_zar`, `initial_capital_required_zar`, `projected_flip_net_profit_zar`, `projected_flip_roi`, `funding_required_zar`, `capital_raised_zar`, `primary_funder_name`, `primary_funder_contact`, `primary_funder_type`, `co_funders_notes`, `promised_return_type`, `promised_return_rate_percent`, `promised_payout_schedule`, `security_offered`, `section_13sex`, `ancillary_incomes`, `pass_reason`, `pass_notes`, `passed_at`), and **4 `suppliers` columns** (`branch_location`, `account_number`, `discount_terms`, `has_coc`). Step 4.1 `profiles.upsert` fails immediately. | Add one idempotent SQL parity migration (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) covering all 4 `profiles` cols, 37 `opportunities` cols, and 4 `suppliers` cols, and recreate `public.investor_profiles` (`WITH (security_invoker = true)`) so the view exposes the new `profiles` columns. |
| **LS-01** | Pillar 4 / R4.3 | `src/lib/store/persistence/portfolioMigrations.ts:250-264`; `node_modules/zustand/esm/middleware.mjs:475, 526-542`; `src/hooks/useAutoCloudSync.ts:249` | **Synchronous Runtime Crash on `localStorage` Full/Restricted:** `getSafeStorage()` returns raw `globalThis.localStorage`. Zustand's `createJSONStorage` and `persistImpl` call `storage.setItem(...)` without `try/catch`. When origin quota (~5 MB) is reached or storage is restricted, every store mutation throws an uncaught `DOMException: QuotaExceededError`. (`useAutoCloudSync.ts:249` also lacks `try/catch` on `localStorage.setItem`.) | Wrap `getItem`/`setItem`/`removeItem` in a safe `Storage` adapter inside `getSafeStorage()` catching quota/security errors and logging a non-fatal warning (preserving in-memory Zustand usability); wrap `useAutoCloudSync.ts:249` in `try/catch`. |

---

### Tier P1: High-Value Quick Wins < 1 hr (15 Findings)

| ID | Pillar / Req | Exact File Path(s) & Line Number(s) | Risk / Impact | Minimum Viable Fix (POC-Safe) |
|---|---|---|---|---|
| **SEC-05** | Pillar 1 / R1.4 | `src/lib/utilities/pdfParser.ts:1207` | **BYOK API Key Query String Leak (v1 Regression):** Gemini endpoint embeds `?key=${apiKey.trim()}` directly in URL query string, exposing user keys in browser history, proxies, and logs. | Remove `?key=${apiKey.trim()}` from `endpoint` and pass `'x-goog-api-key': apiKey.trim()` in `headers` (matching Anthropic's `'x-api-key'` header at line 1286). |
| **SEC-V2-02** | Pillar 1 / R1.2 | `supabase/migrations/20261022_schema_inspection_rpc.sql:9-30`; `src/lib/db/__tests__/remoteSchemaParity.integration.test.ts:70-73` | **Supabase `security_definer_view` Advisor Alert & `anon` Schema Exposure:** `public.schema_columns_inspection` lacks `WITH (security_invoker = true)` and grants `SELECT` to `anon, authenticated`; `public.get_schema_columns` grants `EXECUTE` to `anon, authenticated`. | Recreate `schema_columns_inspection` with `WITH (security_invoker = true)`, `REVOKE ALL` on both view and `get_schema_columns(text)` from `anon`, and `GRANT` to `authenticated, service_role` (update `remoteSchemaParity.integration.test.ts` to prefer `SUPABASE_SERVICE_ROLE_KEY`). |
| **SEC-08** | Pillar 1 / R1.3 | `src/components/statements/TenantStatementViewer.tsx:962-972, 993-1003`; `src/components/common/CloudDriveLinkVault.tsx:326-335`; `src/components/rentals/modals/TenantNoticeModal.tsx:676-685`; `src/lib/email/statementEmailTemplate.ts:54, 202, 206` | **Stored XSS via Unvalidated `href` Schemes:** Imported/cloud-hydrated `ingoingPhotoVaultUrl`, `exitPhotoVaultUrl`, `driveVault` URLs, and email `statementUrl` render directly into `<a href={...}>` without checking `^https?://` (`javascript:` / `data:` execute on click). | Add a tiny shared `sanitizeSafeHttpUrl(url?: string): string \| undefined` helper enforcing `^https?://` (case-insensitive) and apply it to all 4 render/email sites (and `CloudDriveLinkVault.handleSaveUrl`). |
| **SEC-03 / SEC-V2-03** | Pillar 1 / R1.1 | `src/app/actions/sendStatementEmail.ts:29-31, 55-139, 157`; `src/app/actions/sendFeedbackEmail.ts:23-25, 45-88`; `src/app/actions/submitDevelopmentComment.ts:45-65, 129-135` | **Server Action Abuse & Lockout Gaps:** `sendStatementEmail` lacks a max `pdfBase64` byte cap (e.g. 10 MB), email format + `\r`/`\n` validation on `to`/`billingPeriod`, and `rateLimitMap` eviction; `sendFeedbackEmail` lacks `\r`/`\n` stripping in `subject`, message/diagnostics length caps, and `rateLimitMap` eviction; `submitDevelopmentComment` rate-limits by `cleanToken` alone (3 notes from 1 collaborator locks out all other collaborators on the same deal room for 1 hr) and never prunes Maps. | Enforce max 10 MB PDF payload + strict email/CRLF validation in `sendStatementEmail.ts`; cap `message`/`diagnostics` and strip `\r`/`\n` from `subject` in `sendFeedbackEmail.ts`; key `submitDevelopmentComment` rate limiting by `${cleanToken}:${clientIp}` and add periodic/max-size Map eviction across all 3 actions. |
| **SEC-V2-04** | Pillar 1 / R1.4 | `src/lib/analytics/posthogClient.ts:18-62` | **Incomplete Telemetry Scrub Keys:** `SENSITIVE_PROPERTY_KEYS` and the regex omit `buyerName`, `buyer_name`, `propertyTitle`, `property_title`, and `title`. | Add `'buyerName'`, `'buyer_name'`, `'propertyTitle'`, `'property_title'`, `'title'` to `SENSITIVE_PROPERTY_KEYS` in `posthogClient.ts`. |
| **DB-02** | Pillar 2 / R2.2 | `src/hooks/useAutoCloudSync.ts:109-146`; `src/lib/db/migrateToCloud.ts:949-960`; `src/lib/db/hydrateFromCloud.ts:712-714` | **Concurrent `pushNow()` Deletion Race & Silent `developments` Failure:** Overlapping `migrateToCloud` runs can cause an older push's `deleteRecordsNotInPayload` to delete records created by a newer push. Meanwhile `migrateToCloud.ts:950-959` swallows `developments` upsert errors (showing green `'Synced'`), and `hydrateFromCloud.ts:712-714` warns instead of throwing on `devsRes.error` (risking cloud deletion on next push if `hasNewLocalItems` fires). | Add a lightweight `isPushing` + `pendingRepush` single-flight mutex in `useAutoCloudSync.ts:pushNow()`, throw on `devsRes.error` in `hydrateFromCloud.ts:712`, and fail `migrateToCloud` on `devError` in `migrateToCloud.ts:952`. |
| **DB-03** | Pillar 2 / R2.3 | `supabase/migrations/20261001_initial_schema.sql:49, 125, 184, 209, 240, 287, 304` (vs `20261107_developments.sql:5, 56`) | **Cross-User Demo ID Collision on 7 Legacy Tables:** `developments` uses `PRIMARY KEY (user_id, id)`, but `properties`, `flips`, `boq_items`, `funding_sources`, `opportunities`, `tasks`, and `suppliers` use global `id text PRIMARY KEY`. When User B edits and syncs a seeded demo ID (`rental-1`, `flip-1`, etc.) after User A already synced it, `ON CONFLICT (id) DO UPDATE` hits an RLS error. | Either scope/UUID-remap stock demo IDs on first user mutation/sync (`migrateToCloud.ts` or store edit actions) for the 7 legacy tables, or migrate their PKs to `(user_id, id)`. Client-side remapping on edit/first sync requires zero schema migration. |
| **DB-04** | Pillar 2 / R2.1 | `src/types/supabase.ts:526-756, 892-1122, 1123-1173, 1174-1212, 1215-1311`; `src/lib/db/migrateToCloud.ts:323, 597`; `src/lib/db/hydrateFromCloud.ts:159, 501-528, 622-624` | **TypeScript Schema Drift Hidden by `.map()` & `as any`:** `supabase.ts` omits `properties.archived_leases`, 8 SQL columns on `opportunities`, `tasks.recurrence*`, `suppliers.notes`, and 12 columns on `Views.investor_profiles`. | Regenerate or patch `src/types/supabase.ts` to match all 20+1 SQL migrations and remove `(r as any)` / `(opp as any)` workarounds. |
| **DB-05** | Pillar 2 / R2.2 | `src/lib/store/persistence/portfolioMigrations.ts`; `src/hooks/useAutoCloudSync.ts` | **Multi-Tab Stale State Overwrite:** Zero `storage` event or `visibilitychange` listeners exist; a stale Tab B editing any slice overwrites Tab A's newer cloud data across all 9 tables on its next 1.5s push. | Add a `window` `storage` event listener on `PORTFOLIO_STORAGE_KEY` calling `usePortfolioStore.persist.rehydrate()` (when not hydrating) and a `visibilitychange` re-hydrate check when authenticated. |
| **LS-02** | Pillar 4 / R4.3 | `src/app/settings/page.tsx:655-675` | **Un-Downscaled 1 MB Fallback `logoBase64` Bloat:** If `downscaleImage` fails (e.g., SVG upload or canvas fallback), `FileReader.readAsDataURL` stores up to ~1.37 MB base64 into `localStorage` and `profiles.logo_base64`. | Enforce a post-`FileReader` max base64 length guard (e.g., `<= 200 * 1024` chars) in `settings/page.tsx:668-675` with a clear validation error before calling `setLogoBase64`. |
| **SSR-01** | Pillar 3 / R3.1 | `src/components/ClientOnly.tsx:18-31`; `src/app/layout.tsx:76`; `src/app/page.tsx`; `src/app/about/page.tsx`; `src/app/privacy/page.tsx` | **Marketing & Legal Routes Blocked Behind Client Spinner:** `ClientOnly.tsx` only exempts `/statement` and `/deal-room`, forcing `/`, `/about` (a Server Component), and `/privacy` to emit `"Initializing Moremela Property Hub..."` spinner in SSR HTML, hurting SEO, FCP, and LCP. | Expand `ClientOnly.tsx:18` bypass to include `pathname === '/' \|\| pathname?.startsWith('/about') \|\| pathname?.startsWith('/privacy')` (fix `new Date().getFullYear()` in `privacy/page.tsx:876` if needed for deterministic SSR). |
| **SSR-02** | Pillar 3 / R3.1 | `src/components/navigation/Sidebar.tsx:44-70, 167-183`; `src/app/layout.tsx:74` | **Conditional Hooks in Persistent `Sidebar`:** `Sidebar` is mounted in `RootLayout` and returns `null` at lines 51–53 before calling `usePortfolioStore`, `useState`, `useRef`, and `useEffect`. Navigating `/` → `/dashboard` transitions the same component instance from 0 hooks to >10 hooks, risking a React hook-order crash. | Split `Sidebar` into a thin route-guard wrapper returning `null` for `isStandalonePublicRoute` and an inner `SidebarContent` component holding all hooks unconditionally. |
| **BND-01** | Pillar 3 / R3.2 | `src/app/developments/page.tsx:24, 807` | **Static Import of 1,097-Line `DevelopmentProjectModal`:** Loaded eagerly in `/developments` initial JS bundle even when modal is closed. | Convert to `dynamic(() => import('@/components/developments/DevelopmentProjectModal').then((m) => m.DevelopmentProjectModal), { ssr: false })` matching `ProjectCommentsLedgerModal` (`lines 57-60`). |
| **PERF-V2-01** | Pillar 4 / R4.1 | `src/app/developments/page.tsx:75` | **Blanket `usePortfolioStore()` Subscription on `/developments`:** `const store = usePortfolioStore();` re-renders the entire page on any unrelated slice mutation (`rentals`, `flips`, `tasks`, `analyzerDraft`). | Remove line 75 and invoke `usePortfolioStore.getState().*` inside event handlers (`lines 215..785`), matching `/rentals` and `/flips`. |
| **PERF-V2-02** | Pillar 4 / R4.2 | `src/app/dashboard/page.tsx:512-513`; `src/app/proposal/page.tsx:2322`; `src/components/proposal/DevelopmentFeasibilitySection.tsx:182-192` | **Unmemoized `calculateDevelopmentFinancials` & Feasibility Engines:** `/dashboard` calls `calculateDevelopmentFinancials(dev)` inside JSX `.map()`, and `/proposal` omits `financials={(deal as any).developmentFinancials}` when rendering `DevelopmentFeasibilitySection`, re-running 5 development engines on every keystroke. | Pass `financials={(deal as any).developmentFinancials}` at `proposal/page.tsx:2322`, wrap the 5 engines in `useMemo` inside `DevelopmentFeasibilitySection.tsx:182-192`, and precompute `activeDevelopmentsWithFinancials` via `useMemo` in `dashboard/page.tsx`. |

---

### Tier P2: Defer / Post-POC Polish (9 Findings)

| ID | Pillar / Req | Exact File Path(s) & Line Number(s) | Risk / Impact | Minimum Viable Fix (Post-POC) |
|---|---|---|---|---|
| **SEC-09** | Pillar 1 / R1.2 | `src/app/statement/[lease_id]/page.tsx:21-22`; `src/app/deal-room/[token]/page.tsx:24-25` | Unnecessary `SUPABASE_SERVICE_ROLE_KEY` fallback when calling `anon`-executable `SECURITY DEFINER` RPCs. | Remove `SUPABASE_SERVICE_ROLE_KEY` fallback; use `NEXT_PUBLIC_SUPABASE_ANON_KEY` only. |
| **SEC-V2-05** | Pillar 1 / R1.2, R1.3 | `src/lib/store/slices/rentalSlice.ts:184, 227, 561`; `supabase/migrations/20261020:61`; `src/components/rentals/RentalCardHeader.tsx:37, 53` | New leases lack `statementToken` until Share/Email is clicked; `v_landlord` includes `registration_or_id` (unused in `TenantStatementViewer`); `RentalCardHeader` lacks `0xx -> 27xx` SA WhatsApp normalization. | Mint `statementToken: crypto.randomUUID()` on lease creation (preserve demo `lease-1`..`lease-4` in `initialData.ts`); drop `registration_or_id` if unneeded; reuse `normalizeWhatsAppPhone`. |
| **DB-06** | Pillar 2 / R2.1 | `src/lib/db/migrateToCloud.ts`, `hydrateFromCloud.ts`; `src/app/settings/page.tsx:761-796` | Secondary fields (`defaultBondCancellationFeeZAR`, `RentalProperty` exit/BRRRR metadata, `FlipProject`/`OpportunityDeal` `commentsLedger` & early-termination fields) omitted from cloud sync; `settings/page.tsx:761` omits `default_pre_sales_hurdle_percent`. | Map via existing JSONB bags or additive columns post-launch; add `default_pre_sales_hurdle_percent` to `settings/page.tsx:761`. |
| **DB-07** | Pillar 2 / R2.2 | `src/lib/store/slices/systemSlice.ts:72-88`; `src/hooks/useAutoCloudSync.ts:80-105, 167`; `src/lib/db/migrateToCloud.ts:1006-1011` | `completedGuideSteps` omitted from `resetToDemoData()`; `hydrateNow()` drops edits made during in-flight fetch; `deleteRecordsNotInPayload` preserves last item on empty-array guard. | Reset `completedGuideSteps: []` in `resetToDemoData()`; add `mutatedDuringHydration` flag; add explicit single-item delete hook post-POC. |
| **DB-08** | Pillar 2 / R2.3 | `supabase/migrations/20261020_security_and_popia_fixes.sql:31-37` | `leases \|\| archived_leases` inside `jsonb_array_elements` bypasses GIN indexes and triggers sequential scan at large tenant scale. | Split `WHERE` into separate `@>` containment branches if property count scales into thousands. |
| **BND-02** | Pillar 3 / R3.2 | `src/app/developments/page.tsx:17, 241`; `src/components/developments/DealRoomViewer.tsx:40, 125` | Static import of `excelExport.ts` wrapper (1,128 lines + transitive math imports), although `xlsx` itself is already dynamically imported at `excelExport.ts:1118`. | Switch to `const { exportDevelopmentProjectToExcel } = await import('@/lib/export/excelExport');` on click. |
| **BND-03** | Pillar 3 / R3.2 | `src/components/rentals/modals/RentalFormModal.tsx:18, 1441`; `src/app/developments/page.tsx:25`; `src/app/funding/page.tsx:5`; `src/app/proposal/page.tsx:18` | `LeaseInspectionDrawer` is static inside lazy `RentalFormModal`; `CloudPublishModal` & `AddFundingModal` are static on `/developments`, `/funding`, `/proposal`. | Wrap in `next/dynamic(..., { ssr: false })` if further chunk trimming is desired. |
| **PERF-V2-03** | Pillar 4 / R4.2 | `src/app/proposal/page.tsx:220-587`; `src/components/rentals/RentalForecastSection.tsx:38-41` | `allDeals` recomputes `calculate12MonthCollectionMetrics` and `calculateDevelopmentFinancials` on `showTenantNames` NDA toggle; `RentalForecastSection` computes 20-year projection when collapsed. | Mask tenant names at render time instead of in `allDeals` deps; gate `generateRentalLongTermProjection` on `isExpanded`. |
| **LS-03** | Pillar 4 / R4.3 | `src/lib/db/migrateToCloud.ts:381`; `src/types/index.ts` | `migrateToCloud.ts:381` does not strip `UtilityStatement.rawText` (unlike `partialize`); `archivedLeases`, `commentsLedger`, `maintenanceHistory` grow monotonically. | Strip `rawText` inside `mapRentals` (`migrateToCloud.ts:381`); add archival/pagination post-POC. |

---

## 3. Complete R1–R4 Point-by-Point Surface Verification Ledger

Every file, module, route, RPC, view, and function required by **R1–R4** is explicitly verified below:

### R1 — Security, POPIA & Public Surface Ledger

| Req | Surface / File / Symbol | Verified Path & Lines | Status | Finding Ref / Verification Notes |
|---|---|---|---|---|
| **R1.1** | `sendStatementEmail` | `src/app/actions/sendStatementEmail.ts:29-185` | **PARTIAL** | Enforces `%PDF-` magic bytes (`132`) and 5/hr rate limit (`55-82`), but lacks `pdfBase64` byte cap, email format/CRLF check (`84, 139, 157`), Map eviction, and non-spoofable IP (`60-63`). → `SEC-03 / SEC-V2-03` |
| **R1.1** | `submitDevelopmentComment` & `getExternalDevelopmentComments` | `src/app/actions/submitDevelopmentComment.ts:45-288` | **PARTIAL** | Strictly enforces `.eq('share_token', ...)` (`164, 178, 268`), blocks guessable `developmentId` reads (`248-261`), validates role/tag enums (`137-147`), forces `status: 'Pending'` (`155`), avoids mutating `INITIAL_DEVELOPMENTS`. Rate limit is token-only (collaborator lockout) & Maps lack eviction (`45-65`). → `SEC-03 / SEC-V2-03` |
| **R1.1** | `submitTenantMaintenanceTicket` & `getTenantReportedMaintenance` | `src/app/actions/submitTenantMaintenanceTicket.ts:1-282` | **FAIL (P0)** | Unauthenticated `service_role` read (`201-277`), full-table `properties` scan & raw `leaseId` write (`110-149`), `INITIAL_RENTALS` singleton mutation (`159-165`), unguarded `JSON.parse` (`117, 130, 255, 265`), missing `category`/`urgency` validation (`88-95`), unbounded Maps (`23, 28`). → `SEC-V2-01` |
| **R1.1** | `sendFeedbackEmail` | `src/app/actions/sendFeedbackEmail.ts:1-118` | **PARTIAL** | Escapes HTML (`feedbackEmailTemplate.ts:66-92`), 10/15m rate limit (`45-72`). Lacks `\r`/`\n` stripping in `subject` (`88`), message/diagnostics caps, Map pruning. → `SEC-03 / SEC-V2-03` |
| **R1.2** | `get_public_tenant_statement` | `supabase/migrations/20261020_security_and_popia_fixes.sql:12-131` | **PASS** *(P2 polish)* | `SECURITY DEFINER`, `SET search_path = public, pg_temp` (`16`), token-first matching (`36, 46`), strips `vettingScorecard`, `guarantorContact`, `deedOfSuretyshipRef`, `statementToken` (`55`), omits `applicants`, `notes`, `drive_vault` (`109-117`), omits write-off reasons (`91-102`). Un-tokenized new leases & `registration_or_id` noted in `SEC-V2-05`. |
| **R1.2** | `get_public_development_deal_room` | `supabase/migrations/20261110_development_comments_ledger.sql:28-164` | **PASS** | `SECURITY DEFINER`, `SET search_path = public, pg_temp` (`32`), strictly requires `share_token = v_clean_token` (`53-66`), strips `conveyancerRef` & masks `buyerName` (`78-83`), omits `drive_vault`, `notes`, `share_token`, banking/contact (`110-157`), reinforced by `maskDevelopmentForPublicDealRoom` (`src/lib/calculations/commentsLedger.ts:289-322`). |
| **R1.2** | SEO `robots` metadata (`/statement/[lease_id]` & `/deal-room/[token]`) | `src/app/statement/[lease_id]/page.tsx:126, 134-151`; `src/app/deal-room/[token]/page.tsx:123, 133-148`; `src/app/robots.ts:8` | **PASS** | Both routes set `robots: { index: false, follow: false }` in all `generateMetadata` branches and exclude PII from `<title>`; `robots.ts` disallows `/statement/` and `/deal-room/`. *(P2 `SEC-09`: remove `SERVICE_ROLE` fallback at lines `21-22` / `24-25`.)* |
| **R1.2** | `public.schema_columns_inspection` & `public.get_schema_columns` | `supabase/migrations/20261022_schema_inspection_rpc.sql:9-30` | **FAIL (P1)** | View lacks `WITH (security_invoker = true)` (Supabase `security_definer_view` alert); both view and `SECURITY DEFINER` RPC grant access to `anon`. → `SEC-V2-02` |
| **R1.3** | `inspectionRecord` photo vault URLs (`/statement/[lease_id]?tab=inspection`, `TenantNoticeModal`) | `src/components/statements/TenantStatementViewer.tsx:962-972, 993-1003`; `src/components/rentals/modals/TenantNoticeModal.tsx:676-685` | **FAIL (P1)** | `ingoingPhotoVaultUrl` and `exitPhotoVaultUrl` rendered directly in `<a href={...}>` with zero `^https?://` check. → `SEC-08` |
| **R1.3** | `CloudDriveLinkVault.tsx` & `statementEmailTemplate.ts` | `src/components/common/CloudDriveLinkVault.tsx:164-168, 326-335`; `src/lib/email/statementEmailTemplate.ts:54, 202, 206` | **FAIL (P1)** | `currentUrl` and `statementUrl` rendered in `<a href={...}>` without `^https?://` validation (`escapeHtml` does not block `javascript:`). → `SEC-08` |
| **R1.3** | WhatsApp links | `TenantStatementViewer.tsx:173-175, 270-272`; `src/lib/calculations/inspections.ts:133-145`; `RentalCardHeader.tsx:37, 53`; `LeaseInspectionDrawer.tsx:161-164`; `MaintenanceModal.tsx:215, 235-237`; `RentalApplicantsModal.tsx:392-394`; `PipelineDealCard.tsx:318`; `proposal/page.tsx:1177`; `useFlipSelection.ts:63`; `submitFeedback.ts:272-275` | **PASS** *(P2 polish)* | All use `https://wa.me/...` with digit-stripped phone numbers and `encodeURIComponent`. (`RentalCardHeader` lacks `0xx -> 27xx` normalization → `SEC-V2-05`.) Also only 3 static `dangerouslySetInnerHTML` occurrences exist (`layout.tsx:69`, `TenantStatement.tsx:797`, `TenantStatementViewer.tsx:500`) — all safe. |
| **R1.4** | `posthogClient.ts`, `PostHogProvider.tsx`, `/privacy` parity | `src/lib/analytics/posthogClient.ts:15-249`; `src/components/analytics/PostHogProvider.tsx:24-58`; `src/hooks/useAutoCloudSync.ts:203-217`; `src/app/privacy/page.tsx:373-716` | **PASS** *(P1 key gap)* | `respect_dnt: true`, `autocapture: true` with `$el_text` deletion in `posthogBeforeSend`, `maskAllInputs: true`, `posthog.reset(true)` on `SIGNED_OUT`, capability token scrubbing on `/statement/*` and `/deal-room/*`, full alignment with `/privacy`. Missing `buyerName`/`propertyTitle`/`title` in `SENSITIVE_PROPERTY_KEYS` → `SEC-V2-04`. |
| **R1.4** | BYOK AI keys (`src/lib/ai/` & `pdfParser.ts`) | `src/lib/db/migrateToCloud.ts:307-309`; `src/lib/db/mergePortfolioState.ts:290-295`; `src/lib/store/slices/systemSlice.ts:84`; `src/lib/ai/anthropicParser.ts:219`; `src/lib/utilities/pdfParser.ts:1207, 1286` | **PARTIAL (P1)** | `apiKey: ''` stripped on cloud sync and reset on sign-out; Anthropic uses `x-api-key` header. **Gemini call at `pdfParser.ts:1207` still passes `?key=${apiKey.trim()}` in URL query string** → `SEC-05`. |

### R2 — Database, Schema Parity & Auto-Sync Integrity Ledger

| Req | Surface / Table / Function | Verified Path & Lines | Status | Finding Ref / Verification Notes |
|---|---|---|---|---|
| **R2.1** | `public.profiles` & `investor_profiles` | `20261001:8-45`, `20261020:5-9`, `20261022_profiles:5-12`, `20261028:5`, `20261109:11-19`; `migrateToCloud.ts:272-320`; `hydrateFromCloud.ts:80-128`; `settings/page.tsx:760-796`; `supabase.ts:757-891, 1215-1311` | **FAIL (P0)** | **4 columns missing from SQL migrations** (`min_dev_poc_percent`, `min_dev_yoc_percent`, `default_hard_build_rate_per_sqm_zar`, `default_vat_registered_developer`) → `DB-01`. `Views.investor_profiles` in `supabase.ts` omits 12 cols → `DB-04`. `settings/page.tsx:761` omits `default_pre_sales_hurdle_percent` → `DB-06`. |
| **R2.1** | `public.properties` (`applicants`, `archived_leases`, `extra_monthly_payment_zar`, `inspectionRecord`) | `20261001:48-121`, `20261008:10-11`, `20261011:5-6`, `20261017`, `20261021:5-8`, `20261023:7-8`, `20261026:7-8`, `20261120:2-13`; `migrateToCloud.ts:323-398`; `hydrateFromCloud.ts:130-210`; `supabase.ts:892-1122` | **PARTIAL (P1)** | Bidirectional runtime parity **PASS** for `applicants`, `archived_leases`, `extra_monthly_payment_zar`, and `inspectionRecord` (nested in `leases[]`/`archivedLeases[]`). `archived_leases` is missing from `src/types/supabase.ts` (`hydrateFromCloud.ts:159` uses `as any`) → `DB-04`. Secondary exit/BRRRR fields omitted → `DB-06`. |
| **R2.1** | `public.developments` (`comments_ledger`, `share_token`, `approvals._zoningProfile`) | `20261107_developments.sql`, `20261109_development_bankability_columns.sql`, `20261110_development_comments_ledger.sql`; `migrateToCloud.ts:476-520`; `hydrateFromCloud.ts:330-405`; `supabase.ts:130-258` | **PASS** | 40/40 SQL columns match `supabase.ts`, `migrateToCloud.ts`, and `hydrateFromCloud.ts`. `comments_ledger`, `share_token`, and `approvals._zoningProfile` extraction/stripping have full round-trip parity. |
| **R2.1** | `public.flips` & `public.boq_items` | `20261001:124-205`, `20261010:12-13`, `20261021:11-13`, `20261026:4-5`; `migrateToCloud.ts:400-474, 522-555`; `hydrateFromCloud.ts:212-328, 407-445`; `supabase.ts:1-129, 259-388` | **PASS** *(P2 fields)* | Core SQL/type/mapper parity intact; secondary `commentsLedger` & early-termination fields omitted → `DB-06`. |
| **R2.1** | `public.funding_sources` | `20261001:208-236`, `20261016`; `migrateToCloud.ts:557-595`; `hydrateFromCloud.ts:447-485`; `supabase.ts:389-524` | **PASS** | Full parity across SQL, types, and mappers. |
| **R2.1** | `public.opportunities` (`extra_monthly_payment_zar` + parity) | `20261001:239-283`, `20261008:14-15`, `20261010:8-9`, `20261022:5-6`, `20261023:4-5`; `migrateToCloud.ts:597-760`; `hydrateFromCloud.ts:487-610`; `supabase.ts:526-756` | **FAIL (P0)** | `extra_monthly_payment_zar` has full parity. However, **37 columns** mapped by `mapOpportunities` (`migrateToCloud.ts:606-757`) & declared in `supabase.ts` are **absent from SQL migrations** (45 SQL columns vs 75 mapped, 38 overlapping + 37 missing) → `DB-01`. `supabase.ts` also omits 8 SQL columns (`vat_exempt_agent`, `interest_rate_margin`, plus 6 packed in `costs`) → `DB-04`. |
| **R2.1** | `public.tasks` | `20261001:286-300`; `migrateToCloud.ts:762-782`; `hydrateFromCloud.ts:612-640`; `supabase.ts:1174-1212` | **PARTIAL (P1)** | Recurrence round-trips via `linked_entity` JSONB, but `supabase.ts` omits SQL columns `recurrence`, `recurrence_end_date`, `recurrence_group_id` → `DB-04`. |
| **R2.1** | `public.suppliers` | `20261001:303-315`; `migrateToCloud.ts:784-800`; `hydrateFromCloud.ts:642-665`; `supabase.ts:1123-1173` | **FAIL (P0)** | **4 columns missing from SQL migrations** (`branch_location`, `account_number`, `discount_terms`, `has_coc`) → `DB-01`. `supabase.ts` omits SQL column `notes` → `DB-04`. |
| **R2.2** | `useAutoCloudSync` & `AuthHydrator.tsx` (races, multi-tab) | `src/components/AuthHydrator.tsx:12-15`; `src/hooks/useAutoCloudSync.ts:76-270`; `migrateToCloud.ts:949-960`; `hydrateFromCloud.ts:681-714` | **FAIL (P1)** | `pushNow()` lacks single-flight lock; `developments` errors are swallowed in `migrateToCloud` & `hydrateFromCloud` → `DB-02`. Zero `storage` / `visibilitychange` multi-tab sync → `DB-05`. In-flight hydration mutation drop → `DB-07`. |
| **R2.2** | `SIGNED_OUT` cleanup across all 11 slices | `src/lib/store/usePortfolioStore.ts:23-33`; `src/lib/store/slices/systemSlice.ts:63-89`; `src/hooks/useAutoCloudSync.ts:203-218` | **PASS** *(P2 gap)* | Resets `rentals`, `flips`, `funding`, `opportunities`, `developments` (`INITIAL_DEVELOPMENTS`, line 77), `suppliers`, `tasks`, `municipalDirectory`, `liquidCapitalReserve`, `investorProfile`, `analyzerDraft`, `aiSettings`, `rentalForecastView`, `analyzerSectionOrder`, `hiddenAnalyzerSections`, and clears localStorage sync keys + PostHog. Only `completedGuideSteps` is omitted → `DB-07`. |
| **R2.2** | `deleteRecordsNotInPayload` (`developments` wipe guard) | `src/lib/db/migrateToCloud.ts:985-1075` | **PASS** | `if (localIds.length === 0 && cloudItems.length > 0) return;` (`1006-1011`) protects `developments` (`1047-1050`) and all 7 other collection tables against empty-array wipes, using 50-ID chunks (`1021-1033`). *(Last-item delete caveat → `DB-07`.)* |
| **R2.3** | RLS `(select auth.uid()) = user_id`, indexes, PKs | `20261001:318-421`, `20261021:16-82`, `20261107:56-90`, `20261110:21-23` | **PARTIAL (P1)** | All 9 portfolio tables have initPlan-cached `(SELECT auth.uid()) = user_id` RLS, B-Tree `user_id` / `boq_items(flip_id)` indexes, `leases`/`archived_leases` GIN indexes, and `developments(share_token)` partial unique index + `(user_id, id)` PK. However, the 7 legacy tables still use global `id text PRIMARY KEY` → `DB-03`. (`get_public_tenant_statement` GIN bypass → `DB-08`.) |

### R3 — Bundle, Asset & Public Route SSR Ledger

| Req | Surface / File / Symbol | Verified Path & Lines | Status | Finding Ref / Verification Notes |
|---|---|---|---|---|
| **R3.1** | `ClientOnly.tsx`, `/`, `/about`, `/privacy` | `src/components/ClientOnly.tsx:18-31`; `src/app/layout.tsx:76`; `src/app/page.tsx:1, 70-74`; `src/app/about/page.tsx:5-15`; `src/app/privacy/page.tsx:1, 876` | **FAIL (P1)** | `/`, `/about`, and `/privacy` are still gated behind `"Initializing Moremela Property Hub..."` spinner in SSR HTML → `SSR-01`. |
| **R3.1** | `/statement/[lease_id]` & `/deal-room/[token]` SSR | `src/components/ClientOnly.tsx:18-20`; `src/app/statement/[lease_id]/page.tsx:121-178`; `src/app/deal-room/[token]/page.tsx:14, 118-164`; `DealRoomViewer.tsx` | **PASS** | Both bypass `ClientOnly` and render full SSR HTML without `AuthHydrator` or store hydration mismatches. |
| **R3.1** | `Sidebar.tsx` & `TopHeader.tsx` | `src/components/navigation/Sidebar.tsx:44-70, 167-183`; `src/components/navigation/TopHeader.tsx:85-118, 233-254` | **FAIL (P1)** | `Sidebar` is mounted persistently in `RootLayout` (`layout.tsx:74`) and returns `null` before hooks (`51-53`), risking hook-order errors on `/` → `/dashboard` navigation → `SSR-02`. `TopHeader` is per-page (only on dashboard routes) and uses `isMounted` + `suppressHydrationWarning`. |
| **R3.2** | SheetJS (`xlsx`) in `exportDevelopmentProjectToExcel`, `excelExport.ts`, `excelImport.ts` | `src/lib/export/excelExport.ts:37, 484, 1118`; `src/lib/import/excelImport.ts:90, 189, 373, 495`; `TopHeader.tsx:146`; `Sidebar.tsx:101`; `useRentalPortfolio.ts:88`; `rentals/page.tsx:51, 74`; `ImportDropdown.tsx:75, 130`; `developments/page.tsx:17, 241`; `DealRoomViewer.tsx:40, 125` | **PASS** *(P2 wrapper)* | `xlsx` itself is strictly dynamically imported inside async handlers across all routes (`TopHeader`, `Sidebar`, `/rentals`, `/flips`, `/developments`, `/deal-room/[token]`). Static wrapper import in `developments/page.tsx:17` & `DealRoomViewer.tsx:40` → `BND-02`. |
| **R3.2** | `pdf-lib` & PDF parser (`pdfParser.ts`) | `src/lib/pdf/generateDisputeLetterPdf.ts:1, 77`; `src/lib/pdf/generateTenantStatementPdf.ts:324-327, 482, 491`; `src/lib/utilities/pdfParser.ts:135`; `src/hooks/rentals/useDirectPdfUpload.ts:2, 39` | **PASS** | `pdf-lib`, `pdfjs-dist`, `html2canvas-pro`, `jspdf`, `html2pdf.js`, and `pdfParser` are strictly dynamically imported on click/upload. |
| **R3.2** | Modals (`DevelopmentProjectModal`, `ProjectCommentsLedgerModal`, `TenantNoticeModal`, `LeaseInspectionDrawer`) | `src/app/developments/page.tsx:24, 57-60, 794, 807`; `src/app/rentals/page.tsx:15-28, 193`; `src/components/rentals/modals/RentalFormModal.tsx:18, 1441` | **PARTIAL (P1)** | `ProjectCommentsLedgerModal` and `TenantNoticeModal` (plus all 14 `/rentals` & 7 `/flips` modals) use `next/dynamic(..., { ssr: false })`. **`DevelopmentProjectModal` is statically imported on `/developments`** → `BND-01`. `LeaseInspectionDrawer` is static inside lazy `RentalFormModal` → `BND-03`. |

### R4 — Runtime, Render & Storage Performance Ledger

| Req | Surface / File / Function | Verified Path & Lines | Status | Finding Ref / Verification Notes |
|---|---|---|---|---|
| **R4.1** | Zustand selectors (`/developments`, `/proposal`, `/funding`, `/analyzer`, `/dashboard`, `DealRoomViewer`, `src/lib/store/`) | `developments/page.tsx:75`; `proposal/page.tsx:205-215`; `funding/page.tsx:52-61`; `analyzer/page.tsx:130-149`; `dashboard/page.tsx:40-45`; `DealRoomViewer.tsx:1-688`; `portfolioSummarySelector.ts:300-322` | **PARTIAL (P1)** | `/proposal`, `/funding`, `/analyzer`, `/dashboard`, `DealRoomViewer`, and `usePortfolioSummary()` are clean. **`/developments` retains blanket `const store = usePortfolioStore();` at line 75** → `PERF-V2-01`. |
| **R4.2** | `calculateDevelopmentFinancials` | `dashboard/page.tsx:512-513`; `DevelopmentFeasibilitySection.tsx:182-192`; `proposal/page.tsx:586, 2322`; `developments/page.tsx:188-198`; `DealRoomViewer.tsx:98-106` | **FAIL (P1)** | Memoized on `/developments` and `DealRoomViewer`, but **unmemoized in render loops** on `/dashboard:512-513` and `DevelopmentFeasibilitySection:182-192` (`proposal/page.tsx:2322` omits `financials` prop) → `PERF-V2-02`. |
| **R4.2** | `calculate12MonthCollectionMetrics` & `calculate6MonthTrackRecordSummary` | `src/app/proposal/page.tsx:248, 470, 587`; `src/lib/calculations/proposalMetrics.ts:135` | **PASS** *(P2 dep opt)* | `calculate12MonthCollectionMetrics` runs inside `allDeals` `useMemo` (though `showTenantNames` in deps causes extra runs → `PERF-V2-03`). `calculate6MonthTrackRecordSummary` is only used in unit tests. |
| **R4.2** | `buildFourPhaseBoqTranches` | `src/app/funding/page.tsx:132`; `src/components/funding/AddFundingModal.tsx:160, 168` | **PASS** | Event handlers only; never runs in render loops. |
| **R4.2** | `calculateProposalStressScenarios` | `src/app/proposal/page.tsx:1007-1037` | **PASS** | Wrapped in `useMemo`. |
| **R4.2** | `generateLongTermProjection` | `src/app/analyzer/page.tsx:945-996`; `src/app/proposal/page.tsx:609-641`; `src/components/rentals/RentalForecastSection.tsx:38-41` | **PASS** *(P2 lazy expand)* | Wrapped in `useMemo` at all 3 sites; `RentalForecastSection` computes eagerly even when `isExpanded === false` → `PERF-V2-03`. |
| **R4.3** | `portfolioMigrations.ts` (`partialize`, `getSafeStorage`), growing arrays & base64 | `src/lib/store/persistence/portfolioMigrations.ts:250-291`; `useAutoCloudSync.ts:249`; `settings/page.tsx:644-676`; `DisputeLetterModal.tsx:204, 242`; `migrateToCloud.ts:381` | **FAIL (P0/P1)** | `partialize` strips `rawText`, and `DisputeLetterModal` keeps `photoBase64` transient. However, `getSafeStorage()` does not catch `QuotaExceededError` on `setItem` (**P0** `LS-01`), `settings/page.tsx:666-675` allows up-to-1MB fallback `logoBase64` (**P1** `LS-02`), and growing arrays + `migrateToCloud.ts:381` `rawText` noted in `LS-03`. |

---

## 4. Surgical Execution Plan (3 Sequential Standard-Mode Prompts)

Execute these **3 prompts sequentially** in Standard Mode. Each prompt is self-contained, preserves zero-gate local-first POC usage, and includes exact verification commands.

### Prompt 1: Security, POPIA & Schema Parity Foundation (`SEC-V2-01`, `DB-01`, `SEC-05`, `SEC-V2-02`, `SEC-08`, `SEC-03/V2-03`, `SEC-V2-04`)

```markdown
### Task: Fix P0/P1 Security, POPIA & SQL Schema Parity (Prompt 1 of 3)
Preserve local-first POC zero-gate usability and 100% Vitest pass rate.

1. **Fix `submitTenantMaintenanceTicket` & `getTenantReportedMaintenance` (`SEC-V2-01` — P0):**
   - In `src/app/actions/submitTenantMaintenanceTicket.ts`:
     - Replace raw `leaseId` lookup with capability-token validation: accept `token` (or `leaseId` fallback ONLY for demo leases where `statementToken` is null/absent), and update `src/components/statements/TenantStatementViewer.tsx:207-208` to pass the portal route parameter (`token` / `lease_id` from `useParams()` or prop) so tokenized leases never rely on raw `lease.id`.
     - Replace the unauthenticated full-table `supabase.from('properties').select(...)` scan (`lines 110-112`) with a targeted lookup (e.g., matching `statementToken` via JSONB containment `.contains('leases', [{ statementToken: token }])` / dedicated RPC) and never mutate `INITIAL_RENTALS` in place (`lines 159-165` — store demo session tickets only in `inMemoryReportedTickets`, mirroring `submitDevelopmentComment.ts`).
     - Validate `category` against `MaintenanceLog['category']` allowlist and `urgency` against `['Routine', 'Urgent', 'Emergency']`; wrap `JSON.parse` (`lines 117, 130, 255, 265`) in `try/catch`; prune expired entries in `rateLimitMap` / cap `inMemoryReportedTickets`.
     - Gate `getTenantReportedMaintenance` (`lines 201-277`) behind an authenticated Supabase user check (requiring `accessToken` / session verification so `propertyId` ownership is verified) OR require matching capability tokens — unauthenticated callers must never dump arbitrary landlord `properties.maintenance_history` rows.
   - Update/add tests in `src/app/actions/__tests__/submitTenantMaintenanceTicket.test.ts` (or create one if absent).

2. **Add Idempotent SQL Parity Migration (`DB-01` — P0):**
   - Create `supabase/migrations/20261121_schema_parity_v2.sql` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`:
     - `public.profiles`: `min_dev_poc_percent numeric DEFAULT 20.0`, `min_dev_yoc_percent numeric DEFAULT 12.0`, `default_hard_build_rate_per_sqm_zar numeric DEFAULT 9800`, `default_vat_registered_developer boolean DEFAULT true`.
     - Refresh `public.investor_profiles` view with `WITH (security_invoker = true)`, `REVOKE ALL ON public.investor_profiles FROM anon`, `GRANT SELECT ON public.investor_profiles TO authenticated`.
     - `public.opportunities`: add all 37 missing columns (`agm_date date`, `loan_to_value_percent numeric DEFAULT 80.0`, `bond_ltv numeric DEFAULT 80.0`, `deposit_zar numeric DEFAULT 0`, `interest_rate_percent numeric DEFAULT 11.75`, `loan_term_years integer DEFAULT 20`, `annual_capital_growth_percent numeric DEFAULT 5.0`, `annual_rental_escalation_percent numeric DEFAULT 6.0`, `annual_expense_inflation_percent numeric DEFAULT 6.0`, `bond_term_years integer DEFAULT 20`, `custom_transfer_duty_zar numeric`, `custom_conveyancing_zar numeric`, `custom_bond_reg_zar numeric`, `auctioneer_commission_zar numeric DEFAULT 0`, `municipal_arrears_zar numeric DEFAULT 0`, `gross_yield numeric DEFAULT 0`, `cap_rate numeric DEFAULT 0`, `net_roi numeric DEFAULT 0`, `monthly_cash_flow_zar numeric DEFAULT 0`, `initial_capital_required_zar numeric DEFAULT 0`, `projected_flip_net_profit_zar numeric DEFAULT 0`, `projected_flip_roi numeric DEFAULT 0`, `funding_required_zar numeric DEFAULT 0`, `capital_raised_zar numeric DEFAULT 0`, `primary_funder_name text`, `primary_funder_contact text`, `primary_funder_type text`, `co_funders_notes text`, `promised_return_type text`, `promised_return_rate_percent numeric DEFAULT 0`, `promised_payout_schedule text`, `security_offered text`, `section_13sex jsonb DEFAULT '{}'::jsonb`, `ancillary_incomes jsonb DEFAULT '[]'::jsonb`, `pass_reason text`, `pass_notes text`, `passed_at timestamp with time zone`).
     - `public.suppliers`: `branch_location text DEFAULT 'Johannesburg'`, `account_number text`, `discount_terms text`, `has_coc boolean DEFAULT false`.

3. **Revoke `anon` Schema Inspection (`SEC-V2-02` — P1):**
   - In `supabase/migrations/20261121_schema_parity_v2.sql`: recreate `public.schema_columns_inspection` with `WITH (security_invoker = true)`, `REVOKE ALL` on both `public.schema_columns_inspection` and `public.get_schema_columns(text)` from `anon`, and `GRANT` to `authenticated, service_role`.
   - In `src/lib/db/__tests__/remoteSchemaParity.integration.test.ts:70-73`, prefer `process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` (skipping gracefully if unprivileged/offline).

4. **Fix Gemini Header, URL Sanitization, Server Actions & PostHog Keys (`SEC-05`, `SEC-08`, `SEC-03/V2-03`, `SEC-V2-04` — P1):**
   - In `src/lib/utilities/pdfParser.ts:1207-1212`: remove `?key=${apiKey.trim()}` from `endpoint` and pass `'x-goog-api-key': apiKey.trim()` in `headers`.
   - Create a tiny helper `sanitizeSafeHttpUrl(url?: string): string | undefined` (e.g. in `src/lib/utils/urlSanitizer.ts`) enforcing `/^https?:\/\//i` after trimming; apply it to:
     - `src/components/statements/TenantStatementViewer.tsx:962-972, 993-1003`
     - `src/components/common/CloudDriveLinkVault.tsx:164-168, 326-335`
     - `src/components/rentals/modals/TenantNoticeModal.tsx:676-685`
     - `src/lib/email/statementEmailTemplate.ts:54, 202, 206`
   - In `src/app/actions/sendStatementEmail.ts`: enforce max decoded PDF size (10 MB), validate email format + reject `\r`/`\n` in `to` and `billingPeriod`, prune expired `rateLimitMap` keys.
   - In `src/app/actions/sendFeedbackEmail.ts`: strip `\r`/`\n` from `subject`, cap `message` (5,000 chars) & `diagnostics`, prune `rateLimitMap`.
   - In `src/app/actions/submitDevelopmentComment.ts`: key rate limiting by `${cleanToken}:${clientIp}` (via `next/headers` IP fallback) so one collaborator cannot lock out the entire deal room, and prune expired Map entries.
   - In `src/lib/analytics/posthogClient.ts:18-62`: add `'buyerName'`, `'buyer_name'`, `'propertyTitle'`, `'property_title'`, `'title'` to `SENSITIVE_PROPERTY_KEYS`.

5. **Verification:**
   Run `cmd /c "npx tsc --noEmit && npx vitest run src/app/actions/__tests__/ src/lib/ai/__tests__/ src/lib/email/__tests__/ src/components/analytics/__tests__/ src/lib/db/__tests__/"`
```

---

### Prompt 2: Auto-Sync Resilience, PK Collision Guard, Type Parity & LocalStorage Quota Safety (`LS-01`, `DB-02`, `DB-03`, `DB-04`, `DB-05`, `LS-02`)

```markdown
### Task: Harden LocalStorage Quota Safety, Cloud Auto-Sync & Type Parity (Prompt 2 of 3)
Preserve local-first POC zero-gate usability and 100% Vitest pass rate.

1. **LocalStorage Quota Shield & Logo Guard (`LS-01` — P0, `LS-02` — P1):**
   - In `src/lib/store/persistence/portfolioMigrations.ts:250-264`: wrap `globalThis.localStorage` in a safe `Storage` adapter inside `getSafeStorage()` so `setItem`, `getItem`, and `removeItem` execute inside `try/catch` (catching `QuotaExceededError` / security exceptions, logging a non-fatal warning, and falling back cleanly without crashing Zustand mutations). Add a unit test simulating `QuotaExceededError` in `src/lib/store/persistence/__tests__/portfolioMigrations.test.ts`.
   - In `src/hooks/useAutoCloudSync.ts:249`: wrap `localStorage.setItem(signupKey, 'true')` in `try/catch`.
   - In `src/app/settings/page.tsx:668-675`: enforce a max base64 length guard (e.g. `result.length <= 200 * 1024`) on the `FileReader` fallback path before calling `setLogoBase64`, setting `logoError` if exceeded.

2. **Auto-Sync Single-Flight Lock & `developments` Error Propagation (`DB-02` — P1):**
   - In `src/hooks/useAutoCloudSync.ts:109-146`: add `isPushing` + `pendingRepush` single-flight serialization inside `pushNow()` so overlapping mutations queue one trailing push instead of running concurrent `migrateToCloud` calls that race on `deleteRecordsNotInPayload`.
   - In `src/lib/db/migrateToCloud.ts:949-960`: throw on `devError` (`throw new Error(\`Developments sync failed: \${devError.message}\`)`) once `20261107_developments.sql` is standard, instead of reporting green `'Synced'`.
   - In `src/lib/db/hydrateFromCloud.ts:712-714`: throw on `devsRes.error` (`throw new Error(\`Developments fetch failed: \${devsRes.error.message}\`)`) so transient fetch errors never leave `developments = []` and trigger `deleteRecordsNotInPayload` wipes.

3. **Cross-User Demo ID Collision Guard (`DB-03` — P1):**
   - In `src/lib/db/migrateToCloud.ts` (and `hydrateFromCloud.ts` / `mergePortfolioState.ts` if needed): for the 7 legacy tables using global `id text PRIMARY KEY` (`properties`, `flips`, `boq_items`, `funding_sources`, `opportunities`, `tasks`, `suppliers`), deterministically namespace stock demo IDs (`rental-1`, `flip-1`, etc.) with a per-user prefix or UUID remapping on first sync/mutation when `isStockDemoState()` is false (updating `linked_entity` / `flip_id` / `linked_deal_id` / `linked_funding_ids` references consistently), OR document/apply composite `(user_id, id)` PK migration carefully without breaking `boq_items` FK. Keep `INITIAL_RENTALS` / `INITIAL_DEVELOPMENTS` demo IDs intact in local-only mode.

4. **Multi-Tab Sync & `supabase.ts` Type Parity (`DB-05`, `DB-04` — P1):**
   - In `src/hooks/useAutoCloudSync.ts`: add a lightweight `window` `'storage'` listener on `PORTFOLIO_STORAGE_KEY` (`usePortfolioStore.persist.rehydrate()` when `!isHydratingFromCloud.current`) and a `'visibilitychange'` listener calling `hydrateNow()` when `document.visibilityState === 'visible'` and authenticated.
   - Update `src/types/supabase.ts` to include `properties.archived_leases`, the 8 missing SQL columns on `opportunities`, `tasks.recurrence*`, `suppliers.notes`, all new columns from Prompt 1's migration, and updated `Views.investor_profiles`; remove `(r as any)` / `(opp as any)` casts in `hydrateFromCloud.ts:159, 501-528, 622-624` and add explicit insert return types in `migrateToCloud.ts`.

5. **Verification:**
   Run `cmd /c "npx tsc --noEmit && npx vitest run src/lib/db/__tests__/ src/hooks/__tests__/ src/lib/store/persistence/__tests__/ src/components/__tests__/AuthHydrator.test.tsx"`
```

---

### Prompt 3: Public SSR, Hydration Safety & Render/Bundle Quick Wins (`SSR-01`, `SSR-02`, `BND-01`, `PERF-V2-01`, `PERF-V2-02`)

```markdown
### Task: Restore Public Route SSR, Fix Sidebar Hook Order & Eliminate Render/Bundle Bottlenecks (Prompt 3 of 3)
Preserve 100% pass rates across Vitest and Playwright (`e2e/tenant-statement-portal.spec.ts` & marketing routes).

1. **Restore SSR on `/`, `/about`, `/privacy` (`SSR-01` — P1):**
   - In `src/components/ClientOnly.tsx:18-20`: expand the bypass condition to:
     `if (pathname === '/' || pathname?.startsWith('/about') || pathname?.startsWith('/privacy') || pathname?.startsWith('/statement') || pathname?.startsWith('/deal-room')) { return <>{children}</>; }`
   - Check `src/app/privacy/page.tsx:876` (`{new Date().getFullYear()}`) so SSR and client hydration match deterministically without warnings.

2. **Fix Conditional Hooks in Persistent `Sidebar.tsx` (`SSR-02` — P1):**
   - In `src/components/navigation/Sidebar.tsx:40-183`: split the exported `Sidebar` into a thin guard wrapper that reads `usePathname()`, checks `isStandalonePublicRoute`, and returns `null` when true, rendering `<SidebarContent />` (containing all `usePortfolioStore`, `useState`, `useRef`, and `useEffect` hooks unconditionally) otherwise.

3. **Chunk `DevelopmentProjectModal` & Remove Blanket Store Subscription on `/developments` (`BND-01`, `PERF-V2-01` — P1):**
   - In `src/app/developments/page.tsx`:
     - Line 24: replace static `import { DevelopmentProjectModal }` with `dynamic(() => import('@/components/developments/DevelopmentProjectModal').then((m) => m.DevelopmentProjectModal), { ssr: false })`.
     - Line 75: remove `const store = usePortfolioStore();` and replace all `store.*` action calls in event handlers (`lines 215..785`) with `usePortfolioStore.getState().*`.

4. **Memoize Development Feasibility Engines on `/dashboard` & `/proposal` (`PERF-V2-02` — P1):**
   - In `src/app/proposal/page.tsx:2322`: pass `financials={(deal as any).developmentFinancials}` to `<DevelopmentFeasibilitySection />`.
   - In `src/components/proposal/DevelopmentFeasibilitySection.tsx:182-192`: wrap `fin`, `capitalStack`, `riskGate`, `wipeoutMatrix`, and `zoningEnvelope` in `useMemo` keyed on `[development, financials]`.
   - In `src/app/dashboard/page.tsx:512-513`: precompute `activeDevelopmentsWithFinancials = useMemo(() => activeDevelopments.map((dev) => ({ dev, financials: calculateDevelopmentFinancials(dev) })), [activeDevelopments])` outside JSX and render from the memoized list.

5. **Final Verification:**
   - Run `cmd /c "npx tsc --noEmit && npx vitest run"` (confirm 0 TS errors and 118/118 test files passing).
   - If running local Next.js server (`npm run build && npm run start`), verify `curl.exe -s http://localhost:3000/` and `http://localhost:3000/about` stream real SSR HTML (not `"Initializing Moremela Property Hub..."`), and run `npx playwright test` to confirm zero hydration errors or E2E regressions.
```

---

## 5. Verification & Read-Only Integrity Attestation

1. **Read-Only Tree Verification:**
   ```cmd
   cmd /c git status --short
   ```
   Expected: only `?? PRODUCTION_READINESS_AUDIT_V2.md` (zero modified or deleted tracked source, test, migration, or config files).
2. **Baseline Diagnostic Commands:**
   ```cmd
   cmd /c npx tsc --noEmit
   cmd /c npx vitest run
   ```
   Verified clean: `0` TypeScript errors, `118/118` Vitest files (`1,381/1,381` tests passed).

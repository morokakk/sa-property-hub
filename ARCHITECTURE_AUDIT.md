# Architecture Audit & Decomposition Blueprint: Separation of Concerns (SoC) & Component Slicing

> **Document Type:** Production Architecture Audit & Component Slicing Master Blueprint  
> **Target System:** SA Property Portfolio Hub (`L and M trading`)  
> **Audit Mode:** Strictly Read-Only  
> **Auditors:** Architecture Audit Team (Specialist & Synthesis Worker `teamwork_preview_worker_synthesis_1`)  
> **Audit Date:** 2026-10-09  
> **Deliverable Path:** `c:\Users\morok\OneDrive\L and M trading\ARCHITECTURE_AUDIT.md`  

---

## Table of Contents

1. [Executive Summary & Architectural Context](#1-executive-summary--architectural-context)
   - [1.1 Architectural Vision & Target State](#11-architectural-vision--target-state)
   - [1.2 Current Health & Baseline Verification Inventory](#12-current-health--baseline-verification-inventory)
   - [1.3 High-Level Pathology: The Monolith Trinity & The Modal Giants](#13-high-level-pathology-the-monolith-trinity--the-modal-giants)
2. [Requirement 1 (R1): Deep Hotspot & Responsibility Mixing Analysis](#2-requirement-1-r1-deep-hotspot--responsibility-mixing-analysis)
   - [2.1 Hotspot 1: `src/app/rentals/page.tsx` (5,172 Lines)](#21-hotspot-1-srcapprentalspagetsx-5172-lines)
   - [2.2 Hotspot 2: `src/app/flips/page.tsx` (3,510 Lines)](#22-hotspot-2-srcappflipspagetsx-3510-lines)
   - [2.3 Hotspot 3: `src/lib/store/usePortfolioStore.ts` (2,580 Lines)](#23-hotspot-3-srclibstoreuseportfoliostorets-2580-lines)
   - [2.4 Hotspot 4 & 5: The Heavy Modal Giants (`MeterReadingsModal.tsx` & `TenantStatement.tsx`)](#24-hotspot-4--5-the-heavy-modal-giants)
   - [2.5 Secondary Page & Component Hotspots](#25-secondary-page--component-hotspots)
3. [Requirement 2 (R2): Impact & Blast-Radius Prioritization Matrix](#3-requirement-2-r2-impact--blast-radius-prioritization-matrix)
   - [3.1 Prioritization Methodology & Scoring Rubric](#31-prioritization-methodology--scoring-rubric)
   - [3.2 Master Prioritization Matrix Table](#32-master-prioritization-matrix-table)
   - [3.3 Detailed Risk Profile Analysis by Priority Tier](#33-detailed-risk-profile-analysis-by-priority-tier)
4. [Requirement 3 (R3): Actionable Component & Module Slicing Blueprints](#4-requirement-3-r3-actionable-component--module-slicing-blueprints)
   - [4.1 Rentals Module Slicing Blueprint (`src/app/rentals/page.tsx`)](#41-rentals-module-slicing-blueprint)
     - [4.1.1 Proposed Target Directory Layout](#411-proposed-target-directory-layout)
     - [4.1.2 Line-by-Line Responsibility Mapping Table](#412-line-by-line-responsibility-mapping-table)
     - [4.1.3 Complete TypeScript Contract Signatures (Props & Hooks)](#413-complete-typescript-contract-signatures-props--hooks)
     - [4.1.4 Pure Calculations Extraction (`src/lib/calculations/rentals.ts`)](#414-pure-calculations-extraction-srclibcalculationsrentalsts)
     - [4.1.5 Refactored Thin View Component Sketch (<120 LOC)](#415-refactored-thin-view-component-sketch-120-loc)
   - [4.2 Flips Module Slicing Blueprint (`src/app/flips/page.tsx`)](#42-flips-module-slicing-blueprint)
     - [4.2.1 Proposed Target Directory Layout](#421-proposed-target-directory-layout)
     - [4.2.2 Line-by-Line Responsibility Mapping Table](#422-line-by-line-responsibility-mapping-table)
     - [4.2.3 Complete TypeScript Contract Signatures (Props & Hooks)](#423-complete-typescript-contract-signatures-props--hooks)
     - [4.2.4 Pure Calculations Extraction (`src/lib/calculations/flips.ts`)](#424-pure-calculations-extraction-srclibcalculationsflipsts)
     - [4.2.5 Refactored Thin View Component Sketch (<90 LOC)](#425-refactored-thin-view-component-sketch-90-loc)
   - [4.3 Zustand Store Slicing Blueprint (`src/lib/store/usePortfolioStore.ts`)](#43-zustand-store-slicing-blueprint)
     - [4.3.1 Proposed Target Directory Layout](#431-proposed-target-directory-layout-1)
     - [4.3.2 10-Slice Decomposition & Domain Boundaries](#432-10-slice-decomposition--domain-boundaries)
     - [4.3.3 TypeScript Slice Interfaces & Action Signatures](#433-typescript-slice-interfaces--action-signatures)
     - [4.3.4 Root Store Facade Assembly & 100% Backward Compatibility](#434-root-store-facade-assembly--100-backward-compatibility)
     - [4.3.5 Persistence & Selectors Extraction](#435-persistence--selectors-extraction)
5. [Requirement 4 (R4): Phased Refactoring Execution Roadmap](#5-requirement-4-r4-phased-refactoring-execution-roadmap)
   - [5.1 Refactoring Paradigms: Dependency Inversion & Incremental Safety](#51-refactoring-paradigms-dependency-inversion--incremental-safety)
   - [5.2 Detailed Phase Execution Plan (Phases 1 through 5B)](#52-detailed-phase-execution-plan-phases-1-through-5)
     - [Phase 1: Pure Mathematical & Algorithmic Extraction](#phase-1-pure-mathematical--algorithmic-extraction-zero-ui-risk)
     - [Phase 2: Persistence, Migration & Selectors Extraction](#phase-2-persistence-migration--selectors-extraction)
     - [Phase 3: Zustand Slice Pattern Migration](#phase-3-zustand-slice-pattern-migration-root-facade-preserved)
     - [Phase 4A: Isolated Dialog & Modal Extraction](#phase-4a-isolated-dialog--modal-extraction)
     - [Phase 4B: Headless Custom Hooks & State Extraction](#phase-4b-headless-custom-hooks--state-extraction)
     - [Phase 5A: Decomposed Sub-Tabs & Presentational Cards](#phase-5a-decomposed-sub-tabs--presentational-cards)
     - [Phase 5B: Ultra-Thin Page Layout Shell Orchestration](#phase-5b-ultra-thin-page-layout-shell-orchestration)
   - [5.3 Regression Mitigation Checkpoints & Verification Harness](#53-regression-mitigation-checkpoints--verification-harness)
   - [5.4 Definition of Done (DoD) Gateways](#54-definition-of-done-dod-gateways)
6. [Requirement 5 (R5): Verification & Zero-Change Enforcement](#6-requirement-5-r5-verification--zero-change-enforcement)
   - [6.1 Strict Read-Only Audit Execution Log](#61-strict-read-only-audit-execution-log)
   - [6.2 Working Tree Cleanliness Attestation](#62-working-tree-cleanliness-attestation)
   - [6.3 Baseline Test & Compilation Evidence](#63-baseline-test--compilation-evidence)

---

## 1. Executive Summary & Architectural Context

### 1.1 Architectural Vision & Target State

The **SA Property Portfolio Hub** is an advanced South African real estate investment, asset management, and accounting platform built on modern web technologies:
- **Framework & Routing**: Next.js 16+ App Router (`src/app/`).
- **UI & Presentation**: React 19 functional components, Tailwind CSS, Lucide React icons.
- **Client State Management**: Zustand with `persist` middleware (`src/lib/store/`).
- **Testing & Quality Assurance**: Vitest unit/integration test harness, Playwright End-to-End browser suite.
- **Domain Specialization**: South African tax law (SARS corporate income tax 27%, personal marginal rates up to 45%, Section 13sex building tax shield, Section 11(a) deductions), municipal utility tariffs (City of Johannesburg, Eskom, COJ split-metering, Section 118 Rates Clearance Certificates), BRRRR (Buy, Refurbish, Rent, Refinance, Repeat) capital recycling, and private syndicated debt facilities.

#### Target Architectural Topology

To achieve high velocity, testability, and zero regression risk, the target architecture enforces a strict **4-Tier Separation of Concerns**:

```
+---------------------------------------------------------------------------------------+
|                                    TARGET ARCHITECTURE                                |
|                                                                                       |
|   Tier 1: Thin View Controllers (< 150 LOC)                                           |
|   - Declarative page orchestration                                                    |
|   - Zero business math, zero form state arrays, zero inline modal JSX                 |
|   - Examples: `src/app/rentals/page.tsx`, `src/app/flips/page.tsx`                    |
|                                                                                       |
|   Tier 2: Headless Domain UI Hooks (`src/hooks/`)                                     |
|   - Encapsulated form state machines, filter state, and modal open/close lifecycles   |
|   - Expose strongly typed action dispatchers and memoized view models                 |
|   - Examples: `useRentalModalState.ts`, `useRentalForm.ts`, `useFlipCalculations.ts`  |
|                                                                                       |
|   Tier 3: Modular Component Trees & Isolated Modals (`src/components/`)               |
|   - Pure presentation cards, KPI summary strips, data tables, and distinct dialogs    |
|   - Prop-driven interfaces, fully decoupled from page layout internals                |
|   - Examples: `RentalCard.tsx`, `RentalPaymentsTab.tsx`, `FlipProjectModal.tsx`       |
|                                                                                       |
|   Tier 4: Pure Calculation Engines (`src/lib/calculations/`)                          |
|   - 100% deterministic, side-effect free mathematical and financial functions         |
|   - Zero React/Zustand imports; independently testable via unit tests                 |
|   - Examples: `rentals.ts`, `flips.ts`, `arrears.ts`, `holdingSensitivity.ts`        |
|                                                                                       |
|   Tier 5: Modular Zustand Store Slices (`src/lib/store/slices/`)                      |
|   - Domain-bounded state mutators assembled into a backward-compatible root facade    |
|   - Pure persistence auto-healing and separated selector queries                      |
+---------------------------------------------------------------------------------------+
```

---

### 1.2 Current Health & Baseline Verification Inventory

Before conducting this audit, an exhaustive verification of the project's test suite, compiler health, and git status was conducted on the live repository:

| Verification Dimension | Tooling | Scope | Measured Result | Status |
|---|---|---|---|---|
| **Unit & Integration Suite** | Vitest v5.0.1 | 49 test files across `src/` | **481 / 481 tests passing (0 failures)** | **GREEN (PASS)** |
| **Static Type Checking** | TypeScript v6.0.0 | Full workspace (`tsc --noEmit`) | **0 diagnostic errors** | **GREEN (PASS)** |
| **End-to-End Suite** | Playwright v1.63.0 | 10 spec files in `e2e/` | Mobile, Tablet, Desktop viewports | **CONFIGURED & READY** |
| **Working Tree Cleanliness** | Git v2.48.1 | `git status --porcelain` | 0 modified, 0 deleted, 0 untracked | **100% CLEAN** |

**Crucial Takeaway:** The application possesses strong test coverage and high functional reliability. However, this reliability is locked behind monolithic components where modifying a single line of presentation code requires running through thousands of lines of mixed concerns.

---

### 1.3 High-Level Pathology: The Monolith Trinity & The Modal Giants

Five critical files represent **over 16,000 lines** of entangled code, forming the core target of this architectural audit:

```
+---------------------------------------------------------------------------------------------------------+
|                                    CODEBASE MONOLITHS AT A GLANCE                                       |
|                                                                                                         |
|  1. `src/app/rentals/page.tsx`               : 5,172 LOC | 294 KB | 8 Inline Modals  | 35+ useState Hooks |
|  2. `src/app/flips/page.tsx`                 : 3,510 LOC | 192 KB | 6 Inline Modals  | 41+ useState Hooks |
|  3. `src/lib/store/usePortfolioStore.ts`     : 2,580 LOC | 103 KB | 14 Domains       | 49 Actions / Math  |
|  4. `src/components/rentals/MeterReadingsModal.tsx`: 2,319 LOC | 132 KB | 4 Nested Modals  | 20+ useState Hooks |
|  5. `src/components/rentals/TenantStatement.tsx`   : 2,303 LOC | 136 KB | Canvas/PDF Engine | 9 Store Actions    |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Requirement 1 (R1): Deep Hotspot & Responsibility Mixing Analysis

This section delivers an exhaustive, verified line-by-line audit of Separation of Concerns (SoC) and Single Responsibility Principle (SRP) violations across the codebase hotspots.

---

### 2.1 Hotspot 1: `src/app/rentals/page.tsx` (5,172 Lines)

`src/app/rentals/page.tsx` is the largest monolith in the application. Spanning 5,172 lines (293,913 bytes), a single client component (`RentalPortfolioPage`, lines 249–5171) contains the entire rental lifecycle, financial forecasting, multi-tenant billing, and 8 inline modal dialogs.

```
+----------------------------------------------------------------------------------------------------+
|                                    RENTALS PAGE LINE MAP                                           |
| Lines 1–80        : Imports, types, and external icon definitions                                 |
| Lines 81–127      : Redundant helper renderers (`renderPropertyTypeBadge`, `renderAgmChip`)       |
| Lines 129–170     : Agent contact phone/WhatsApp/email link generators                            |
| Lines 172–247     : `InlineEditableAmount` component definition (76 lines)                        |
| Lines 249–384     : Top-level store bindings (18 selectors/actions) & modal/tab state (25+ hooks)  |
| Lines 385–991     : Imperative business logic, payment allocations, write-offs, and form setters   |
| Lines 992–1130    : Route header, file upload dropzone, export buttons, and top summary KPI strip |
| Lines 1131–2690   : Active property card grid (pure math in JSX loops, 4 tabs, nested ledger)     |
| Lines 2691–2825   : Sold archive property card grid with inline capital gain calculations         |
| Lines 2826–5161   : 8 inline modal dialog implementations, complex forms, and ledger editors      |
| Lines 5162–5171   : Floating toast notification & component closure                               |
+----------------------------------------------------------------------------------------------------+
```

#### Category A: Pure Financial Math & Calculation Logic in JSX Handlers / Render Loops
1. **Card Tax Modeling & Section 13sex Deduction Arithmetic** (`lines 1177–1202`):
   Inside the active rental `.map((property) => { ... })` JSX callback, the component computes gross yields, corporate tax rates (27%) vs individual rates (45%) vs pre-tax (0%), annual cashflow capitalization, Section 13sex building tax shield allowances, bad debt deductions, SARS annual/monthly reserves, and post-tax yield on every render:
   ```typescript
   // Lines 1184-1200: Executed on every render loop
   const yieldGross = property.marketValueZAR > 0 ? ((totalGrossIncomeZAR * 12) / property.marketValueZAR) * 100 : 0;
   const entityType = property.taxEntityTypeOverride || investorProfile?.defaultTaxEntityType || 'Company (27%)';
   const taxRate = entityType === 'Individual (45%)' ? 0.45 : entityType === 'Pre-Tax' ? 0 : 0.27;
   const annualCashflow = Math.max(0, netCashflow * 12);
   const sec13Shield = property.section13sexAnnualShieldZAR || 0;
   const totalBadDebt = (property.arrearsWriteOffs || []).reduce((sum, w) => sum + (w.amountZAR || 0), 0);
   const taxableIncome = Math.max(0, annualCashflow - totalBadDebt - sec13Shield);
   const annualTaxZAR = Math.round(taxableIncome * taxRate);
   const monthlyTaxZAR = Math.round(annualTaxZAR / 12);
   const taxSavingsZAR = sec13Shield > 0 ? Math.round(Math.min(annualCashflow, sec13Shield) * taxRate) : 0;
   const postTaxCashflow = netCashflow - monthlyTaxZAR;
   const yieldPostTax = property.marketValueZAR > 0 ? ((postTaxCashflow * 12) / property.marketValueZAR) * 100 : 0;
   ```
   *Violation*: Untested domain rules coupled to React render cycles.
2. **BRRRR Refinance Capital Extraction Heuristics** (`lines 706–725` & `3078–3082`):
   Algorithmic rules for 15% estimated appreciation rounded to nearest R50,000, target 70% Loan-to-Value (LTV) rounded to nearest R10,000, and cash equity pull-out formulas reside inside UI click and change handlers.
3. **Agency Commission & VAT Calculation Rules with Vendor Hardcoding** (`lines 897–899`, `1539–1547`, `3636`):
   Estate agency fee percentages, South African VAT (1.15x multiplier), and a hardcoded vendor exception (`iGrow Rentals` does not charge VAT) are scattered across UI event handlers.
4. **Disposal Capital Gains & Net Proceeds Calculation** (`lines 865–868`, `2729–2733`, `2879–2882`):
   Realized capital gain, percentage gain, and net liquid cash proceeds after bond liabilities deduction are computed directly in markup.
5. **Ledger Allocation Difference & Debt Balancing** (`lines 4825–4834`, `5115–5124`):
   Immediately Invoked Function Expressions (IIFEs) in JSX calculate allocation discrepancies between total payment amount and line-item allocations.

#### Category B: Complex Modal & Dialog State Machines Mixed into Page Layouts
The page contains **8 fully inline modal dialogs** totaling **2,333 lines of modal JSX** (45.1% of the entire file):
- **Mark as Sold Exit Modal**: Lines 2827–2968 (142 lines).
- **BRRRR Refinance & Equity Extraction Modal**: Lines 2970–3181 (212 lines).
- **Refinance Audit History Modal**: Lines 3183–3268 (86 lines).
- **Maintenance History & Work Order Modal**: Lines 3270–3392 (123 lines).
- **Add / Edit Rental Property Modal**: Lines 3394–4357 (**964 lines!**).
- **SARB Repo Rate PMT Calculator Modal**: Lines 4359–4509 (151 lines).
- **Log / Edit Tenant Payment Modal**: Lines 4561–4892 (332 lines).
- **Arrears Write-Off Modal**: Lines 4894–5160 (267 lines).

#### Category C: Form Handling & Validation Coupled with Presentation
- **Primitive State Explosion** (`lines 606–668`): 35 separate `useState` hooks manage property attributes (`title`, `marketValue`, `monthlyBondPayment`, `agencyCommissionPercent`, etc.). Every keystroke triggers a full 5,000-line re-render.
- **Imperative Reset Handlers** (`lines 746–861`): 116 lines of code manually resetting and repopulating all 35 variables.
- **Synchronous Browser `alert()` and `confirm()` Dialogs** (`lines 296, 309, 472, 480, 556, 563, 2399, 2460, 2673, 2806`): Presentation relies on blocking browser primitives.

#### Category D: Direct Zustand Store Mutations in JSX & Table Rows
- **18 Direct Action Ingestions** (`lines 250–269`).
- **Inline Store Mutations in Event Handlers**:
  * Lines 1488, 1507, 1516, 1526: `InlineEditableAmount` directly calls `updateRental(property.id, { ... })`.
  * Lines 1667, 1679, 1690, 1701: 1-click tax entity toggle buttons directly invoke `updateRental`.
  * Lines 1938–1983: 1-Click "Mark Month as Paid" iterates over leases and directly mutates the store in JSX `onClick`.
  * Line 2164: Opening balance input blur directly calls `updateArrearsOpeningBalance`.
  * Lines 2405, 2466, 2674, 2807: Delete payment, delete write-off, delete property, and reopen unit buttons directly mutate store.

#### Category E: Monolithic Table & Ledger Rendering Concerns
- **Payments & Arrears Sub-Tab Monolith** (`lines 1808–2505`, **698 lines**): Houses multi-tenant unit selector pills, current month status banners, arrears live reconciliation boxes, historical billing ledger, itemized payments, itemized debt write-offs, and WhatsApp string formatters.
- **20-Year Long-Term Forecast Accordion** (`lines 2528–2601`, 74 lines): Integrates projections and charts directly into card markup.

#### Category F: Redundant Helper Definitions & Leaked Snippets
- `lines 81–127`: `renderPropertyTypeBadge` and `renderAgmChip` duplicate existing components in `@/components/common/PropertyTypeBadge`.
- `lines 172–247`: `InlineEditableAmount` is a 76-line interactive input widget embedded at the top of the page file.

---

### 2.2 Hotspot 2: `src/app/flips/page.tsx` (3,510 Lines)

`src/app/flips/page.tsx` is an ultra-dense, 3,510-line client component that manages active flips, Bill of Quantities (BOQ) costing, private syndicate debt tranches, Section 118 municipal rates clearance, contractor milestone drawdowns, and historical completed deals.

```
+----------------------------------------------------------------------------------------------------+
|                                      FLIPS PAGE LINE MAP                                           |
| Lines 1–48        : Imports, Lucide icons, formatters, and calculation helpers                    |
| Lines 50–66       : 14 direct Zustand store selector subscriptions                                 |
| Lines 68–171      : 41 top-level `useState` hooks (8 modal booleans, 30+ form state fields)        |
| Lines 173–269     : `handleFlipPdfSelected` async PDF parsing & heuristic property type extraction |
| Lines 280–515     : Imperative handlers (BOQ add, flip edit/save, supplier add, flip complete)     |
| Lines 517–593     : Pure financial calculations (holding burn, Section 118 outlay, SARS tax, draws)|
| Lines 594–682     : BRRRR conversion handler, syndicate funding progress math, and sync handlers  |
| Lines 684–805     : TopHeader, action bar, project pills, WhatsApp share button, and pitch deck    |
| Lines 808–998     : Active Flip Header Card & 6-card financial overview grid                       |
| Lines 1000–1101   : Operational math banner, SARS tax entity toggle, and sponsor barter pill       |
| Lines 1103–1252   : Funding campaign dashboard card, progress bar, terms & sync button             |
| Lines 1254–1385   : Section 118 RCC municipal rates clearance card & CoJ dispute alert             |
| Lines 1387–1592   : Compliance checklist, drive vault, contractor milestone draw cards (4 gates)  |
| Lines 1594–1775   : Bill of Quantities (BOQ) data table (162 lines of raw HTML table) & empty state|
| Lines 1780–2012   : Sold & Completed deals archive view grid & deal reopen actions                 |
| Lines 2015–3505   : 6 inline modal dialogs (Exit, BRRRR Convert, BOQ, Flip Add/Edit, Suppliers)    |
+----------------------------------------------------------------------------------------------------+
```

#### Concern A: Pure Financial Math & Tax Modeling in Component Body & JSX
- **BOQ Aggregates & Effective Renovation Cost** (`lines 518–525`): Baseline, actual, variance, and fallback budget logic.
- **Holding Period Carrying Cost Burn** (`lines 527–530`): Multiplier of holding months by monthly holding cost.
- **Section 118 Rates Clearance Outlay** (`lines 536–542`): Arrears plus advance council deposit calculations.
- **Exit Sales Commission & All-In Project Cost** (`lines 544–551`): 5.75% agent commission, projected net profit, and cash-on-cash ROI.
- **SARS Tax Entity Provisioning** (`lines 553–559`): Company 27% vs Individual 45% vs Pre-Tax 0%, tax reserves, after-tax ROI.
- **Sponsor / Barter Dual-Value Accounting** (`lines 560–572`): Commercial retail total vs actual cash outflow vs trade partner savings.
- **Contractor Milestone Drawdown Allocations** (`lines 574–593`): 20% Deposit, 30% First Fix, 30% Finishes, 20% Retention pool.
- **Syndicate Funding Progress** (`lines 634–641`): Capital raised vs debt facility required.
- **Historical Deal Financials in JSX Loops** (`lines 1848–1870`): In-loop calculation of realized ROI and capital gains for archived deals.

#### Concern B: State Explosion & Disjointed Modal State Machines
- **41 Top-Level `useState` Hooks** (`lines 68–171`): Includes 8 separate boolean modal flags (`showAddBOQModal`, `showFlipModal`, `showSupplierModal`, `showExitModal`, `showFundingModal`, `showConvertModal`, `showDelayMatrixModal`, `editingFlipId`), plus 30+ form state fields.
- Multiple modals can theoretically be active simultaneously, and any keystroke triggers a complete virtual DOM re-evaluation of all 3,500 lines.

#### Concern C: Heuristic Document Parsing & Business Rules in UI Handlers
- **PDF Heuristic Ingestion** (`lines 173–269`): Async file reading, regex string parsing for Sectional Title vs Freehold House, CoJ municipal valuation extraction, and direct form hydration embedded in a UI event handler.
- **Domain Object Assembly in JSX Handlers** (`lines 388–484`): Constructing `CloudDriveVault`, `municipalClearance`, `drawSchedule`, defaulting debt facilities to 70%, and mutating store.

#### Concern D: Direct Store Mutations in Presentation Elements
- Lines 818: Project phase select directly mutates store (`updateFlip`).
- Lines 1042: Tax entity toggle directly mutates store.
- Lines 1127: Funding ledger sync directly mutates store.
- Lines 1287–1296: Municipal clearance dropdown directly mutates store.
- Lines 1458–1585: 4 Draw schedule checkboxes directly mutate store.
- Lines 1656–1744: BOQ table phase/status select and row delete directly mutate store.
- Lines 1995–1998: Archive deal reopen button directly calls `reopenFlip`.

#### Concern E: Monolithic UI Presentation & Monolithic Table Rendering
- **BOQ Data Table** (`lines 1594–1756`, 162 lines): Raw HTML table with 10 columns, inline dropdowns, delete triggers, and CSV export.
- **6 Inline Modals** (`lines 2015–3505`, **1,480+ lines of modal JSX**):
  * Mark as Flipped/Sold Exit Modal: Lines 2015–2142 (126 lines).
  * Convert Flip to Rental (BRRRR) Modal: Lines 2144–2363 (218 lines).
  * Add BOQ Line Item Modal: Lines 2365–2596 (230 lines).
  * Unified Flip Project Modal (Add/Edit): Lines 2598–3165 (567 lines).
  * Supplier Directory Modal: Lines 3167–3325 (157 lines).
  * Edit Funding Campaign Modal: Lines 3326–3494 (167 lines).

---

### 2.3 Hotspot 3: `src/lib/store/usePortfolioStore.ts` (2,580 Lines)

`src/lib/store/usePortfolioStore.ts` is the application's central **God Store**. It concentrates **14 distinct business domains**, 49 actions, 12 state collections, complex localStorage schema migrations, and 332 lines of portfolio tax/aggregation calculations into a single 2,580-line file.

#### 14 Business Domains Packed into a Single File

| Domain # | Domain Name | State Fields | Action / Function Signatures | Exact Line Ranges | Primary Conflict / Anti-Pattern |
|---|---|---|---|---|---|
| **D1** | **Rental Lifecycle & Properties** | `rentals: RentalProperty[]` | `addRental`, `bulkAddRentals`, `reconcileImportedRentals`, `updateRental`, `deleteRental`, `addMaintenanceLog`, `markRentalAsSold`, `reopenRental`, `refinanceRental` | `lines 60, 94–102, 410–781` | Direct mutation of `liquidCapitalReserve` on sale/reopen/refinance; 184 lines of raw OCR reconciliation logic and lease fabrication embedded in `reconcileImportedRentals`. |
| **D2** | **Utility Statements & Disputes** | Nested in `rentals[].utilityStatements` | `addUtilityStatement`, `deleteUtilityStatement`, `setStatementTenantBillingMethod` | `lines 103–104, 112–116, 782–850, 932–947` | Inline statement sorting, auto-extraction of meter readings, and synchronous recalculation of property arrears inside statement actions. |
| **D3** | **Meter Readings & Hardware Registry** | Nested in `rentals[].meterReadings`, `rentals[].meterRegistry` | `addMeterReading`, `deleteMeterReading`, `updateMeterReadingDispute`, `addPropertyMeter`, `updatePropertyMeter`, `deletePropertyMeter` | `lines 105–111, 139–142, 851–931` | Dispute resolution state machine mixed with utility hardware registry inside rental property entities. |
| **D4** | **Tenant Accounting & Arrears Ledger** | Nested in `rentals[].paymentRecords`, `rentals[].arrearsWriteOffs` | `recordTenantPayment`, `updateTenantPayment`, `deleteTenantPayment`, `recordArrearsWriteOff`, `deleteArrearsWriteOff`, `updateArrearsOpeningBalance` | `lines 117–137, 948–1217` | 270 lines of complex accounting logic: security deposit deductions/restitutions (`Deposit Applied`), per-lease ledger balance recomputations, and cascading property arrear recalculations. |
| **D5** | **Flip Projects & BOQ Costing** | `flips: FlipProject[]` | `addFlip`, `bulkAddFlips`, `updateFlip`, `deleteFlip`, `addBOQItem`, `updateBOQItem`, `deleteBOQItem`, `markFlipAsCompleted`, `reopenFlip`, `convertFlipToRental` | `lines 61, 144–154, 1219–1501` | BOQ variance math in actions; `markFlipAsCompleted` directly injects proceeds into `liquidCapitalReserve`; `reopenFlip` deletes converted rentals; `convertFlipToRental` spans 129 lines orchestrating 4 domains simultaneously. |
| **D6** | **Private Funding Facilities** | `funding: FundingSource[]` | `addFunding`, `updateFunding`, `deleteFunding`, `syncFundingWithDealDelay` | `lines 62, 156–160, 1503–1540` | Facility date recalculations and note concatenations inside state setters; cross-linked deal mutation when flips convert to rentals. |
| **D7** | **Opportunity Sourcing Pipeline** | `opportunities: OpportunityDeal[]` | `addOpportunity`, `bulkAddOpportunities`, `updateOpportunity`, `deleteOpportunity`, `passOpportunity`, `reactivateOpportunity`, `advanceOpportunityStage`, `promoteOpportunityToFlip`, `promoteOpportunityToRental`, `duplicateOpportunity` | `lines 63, 162–172, 1542–1845` | 186 lines of promotion logic (`promoteOpportunityToFlip` and `promoteOpportunityToRental`) fabricating full entities, calculating financing bonds via LTV, generating default BOQ items, and creating tasks. |
| **D8** | **SARS ITR12 Property Transactions** | Nested in `rentals[].transactions` | `addTransaction`, `deleteTransaction` | `lines 174–176, 1846–1872` | Tax ledger transactions co-located inside rental entities without standalone query or reconciliation boundaries. |
| **D9** | **Task Management & Automation** | `tasks: TaskItem[]` | `addTask`, `toggleTaskStatus`, `updateTask`, `deleteTask`, `syncAgmReminderTask`, `syncLeaseExpiryTasks` | `lines 65, 178–182, 203–343, 1874–1954` | Task recurrence logic executed in toggle/update; 140 lines of AGM and 60-day lease expiry synchronization functions executing silent side-effects during rental, flip, and opportunity mutations. |
| **D10** | **Trade Suppliers Directory** | `suppliers: LocalSupplier[]` | `addSupplier`, `deleteSupplier` | `lines 64, 184–186, 1956–1962` | Simple supplier directory co-located with heavy calculation state. |
| **D11** | **Municipal Contacts Directory** | `municipalDirectory: MunicipalContact[]` | `addMunicipalContact`, `updateMunicipalContact`, `deleteMunicipalContact`, `resetMunicipalDirectory` | `lines 66, 188–192, 1964–1989` | Contact directory with custom ID generation and demo reset co-located in store. |
| **D12** | **Investor Profile, Settings & Drafts** | `liquidCapitalReserve`, `investorProfile`, `analyzerDraft`, `aiSettings`, `rentalForecastView` | `updateLiquidReserve`, `updateInvestorProfile`, `updateAiSettings`, `updateAnalyzerDraft`, `setRentalForecastView` | `lines 67–72, 82–92, 194, 389–408, 1991` | Unrelated UI configuration and personal investor data co-located with operational asset collections. |
| **D13** | **Onboarding / Guide Progress** | `completedGuideSteps: string[]` | `toggleGuideStep`, `resetGuideProgress`, `sanitizeCompletedGuideSteps` | `lines 74–76, 349–356, 375–384` | Local UI checklist progress mixed into financial asset store. |
| **D14** | **System State, Backup & Cloud Sync** | Root state | `hydrateFromCloudState`, `resetToDemoData`, `clearAllData`, `importPortfolioJSON` | `lines 197–201, 1994–2076` | Direct `window.localStorage` side-effects in `resetToDemoData`; raw JSON string parsing; wholesale state replacements. |
| **D15** | **Persistence & Schema Auto-Healing** | Persist middleware config | `persist` middleware, `merge` hook, `onRehydrateStorage` | `lines 359, 2078–2244` | 146 lines of hardcoded schema auto-healing in `merge` (matching "clearwater", adjusting fee numbers, healing legacy 2025 statements, migrating negative arrears); rehydration hook calling `usePortfolioStore.setState`. |
| **D16** | **Portfolio Analytics & Tax Engine** | Derived summary selectors | `computeEquityAlerts`, `computePortfolioSummary`, `usePortfolioSummary` | `lines 79, 385–387, 2247–2579` | 332 lines of financial, tax (SARS Sec 11(a), Sec 13sex, CIT 27%, PIT 45%), working capital ring-fencing, and equity alert math embedded in the store module rather than pure calculation libraries. |

#### In-Depth Violation Analysis:
1. **Violation 1: Heavy Business Logic in `reconcileImportedRentals` (`lines 453–636`, 184 lines)**:
   Performs string normalization (`normalizeKey`), fuzzy substring matching, agency commission VAT unbundling (`(commTotal * 0.15) / 1.15`), tolerance checking (`Math.abs(calcNoi - ...) > 1.0`), fallback valuation estimations (`grossRent * 120`), and synthetic lease contract construction directly inside a store action.
2. **Violation 2: Complex Accounting State Machine in Tenant Payments (`lines 948–1122`, 270 lines)**:
   Maintains multi-branch conditional trees for handling `paymentMethod === 'Deposit Applied'`. Lines 1007–1056 track delta differences across old and new lease IDs to adjust `depositHeldZAR`. Lines 1067–1079 immediately loop over every lease in the property, run `calculatePropertyArrears`, mutate `unpaidUtilityArrearsZAR` per lease, and recalculate parent property arrears.
3. **Violation 3: Multi-Domain Cascades in `convertFlipToRental` (`lines 1373–1501`, 129 lines)**:
   Reads from `flips`, calculates total cost basis, computes reverse bond principal using `calculateBondPrincipalFromRepayment`, creates a `RentalProperty`, sets `FlipProject` status to `Completed`, re-points linked records in `funding`, and injects tasks into `tasks`.
4. **Violation 4: Hidden Side Effects in AGM & Lease Expiry Synchronization (`lines 203–343`)**:
   `syncAgmReminderTask` and `syncLeaseExpiryTasks` are called automatically across 12 distinct asset mutators. Mutating a property silently creates or deletes tasks in the global `tasks` collection.
5. **Violation 5: Embedded 332-Line Financial Tax Engine (`lines 2247–2579`)**:
   `computePortfolioSummary` calculates SARS corporate tax, personal brackets, Section 13sex depreciation, Section 118 clearance arrears, contractor milestone draw schedules, and retention pools directly inside the store module.

---

### 2.4 Hotspot 4 & 5: The Heavy Modal Giants

#### A. `src/components/rentals/MeterReadingsModal.tsx` (2,319 Lines, 132 KB)
- **Store Subscriptions**: 5 subscriptions (`rentals`, `addMeterReading`, `deleteMeterReading`, `updateMeterReadingDispute`, `addPropertyMeter`, `municipalDirectory`).
- **Nested Modal Invocations**: Houses 4 sub-modal triggers (`DisputeLetterModal`, `PropertyMeterRegistryModal`, `MunicipalDirectoryModal`, plus quick inline dispute editor).
- **Form State Monolith**: 20+ `useState` hooks managing utility types, meter numbers, dispute statuses, reasons, lodged dates, and manual Rand estimates.
- **Embedded Math**: Calls `calculateMunicipalDisputeImpact` and calculates dispute recovery differences inside render markup.
- **Table Bloat**: 800+ lines rendering multi-column readings tables with inline dispute toggles and photo previews.

#### B. `src/components/rentals/TenantStatement.tsx` (2,303 Lines, 136 KB)
- **Store Subscriptions**: 5 subscriptions (`rentals`, `investorProfile`, `addUtilityStatement`, `deleteUtilityStatement`, `setStatementTenantBillingMethod`, `aiSettings`).
- **External Side-Effects**:
  * Direct Supabase database calls (`supabase`, `migrateToCloud`) inside UI handlers.
  * PDF canvas generation (`generateTenantStatementPdf`).
  * Email Server Actions (`sendStatementEmail`).
  * WhatsApp text generation (`formatTenantAccountStatementForWhatsApp`).
  * File drag-and-drop parsing (`parseUtilityPdf`).
- **Mathematical Coupling**: Executes `calculatePropertyArrears` and `calculateTenantStatementTiers` inside presentation loops.

---

### 2.5 Secondary Page & Component Hotspots

| File Path | LOC | Store Hooks | Key Conflicting Concerns |
|---|---|---|---|
| `src/app/analyzer/page.tsx` | **3,403** | 6 hooks | Buy-box math, OCR AI prompt invocation, scenario cloning, mortgage amortization in JSX. |
| `src/app/proposal/page.tsx` | **1,797** | 4 hooks | Multi-page HTML canvas PDF generation, template layout, debt sizing calculations. |
| `src/app/settings/page.tsx` | **1,592** | 8 hooks | Supabase cloud sync status, localStorage debug viewer, bank universal branch code verification. |
| `src/app/funding/page.tsx` | **1,273** | 6 hooks | Private debt drawdown schedule tracking, interest accrual calculations, tranche disbursements. |
| `src/components/rentals/UnifiedPdfVerificationModal.tsx` | **1,343** | 5 hooks | Multi-page PDF parsing, OCR diff confidence table, batch reconciliation into store. |
| `src/components/statements/TenantStatementViewer.tsx` | **997** | 0 hooks | Banking details lookup, arrears statement preview, mobile responsive tabs. |
| `src/components/rentals/DisputeLetterModal.tsx` | **831** | 3 hooks | PDF letter generation, municipal contact selection, legal citation templates. |
| `src/components/rentals/StatementUploadModal.tsx` | **794** | 6 hooks | Drag-and-drop file upload, municipal statement field extraction, billing method toggles. |

---

## 3. Requirement 2 (R2): Impact & Blast-Radius Prioritization Matrix

### 3.1 Prioritization Methodology & Scoring Rubric

Each architectural hotspot is evaluated across three critical dimensions scored from 1 (Lowest) to 5 (Highest):

1. **Blast Radius (BR, Weight: 40%)**:
   The potential for a change in this file to cause cascading failures, regressions, or system-wide breakage across unrelated modules.
2. **Maintenance Friction (MF, Weight: 35%)**:
   The cognitive load, code density, number of mixed concerns, and re-render cost imposed on engineers attempting routine modifications.
3. **Coupling Index (CI, Weight: 25%)**:
   The degree of direct dependence on external APIs, Zustand store mutations, browser primitives, and hardcoded business rules.

$$\text{Composite Risk Score} = (\text{BR} \times 0.40) + (\text{MF} \times 0.35) + (\text{CI} \times 0.25)$$

- **CRITICAL**: Score $\ge 4.2$ (Immediate, urgent decomposition required).
- **HIGH**: $3.4 \le \text{Score} < 4.2$ (High refactoring priority; major maintenance bottleneck).
- **MEDIUM**: $2.5 \le \text{Score} < 3.4$ (Moderate friction; extract during secondary passes).
- **LOW**: $\text{Score} < 2.5$ (Low complexity; isolated component).

---

### 3.2 Master Prioritization Matrix Table

| Rank | Target File / Module | LOC | Blast Radius (1-5) | Maintenance Friction (1-5) | Coupling Index (1-5) | Composite Score | Priority Tier | Primary Architectural Hazard |
|---|---|---|---|---|---|---|---|---|
| **1** | `src/app/rentals/page.tsx` | 5,172 | 5.0 | 5.0 | 4.8 | **4.95** | **CRITICAL** | 5,172-line monolith; 8 inline modals; financial tax math in render loops; 35+ useState hooks. |
| **2** | `src/lib/store/usePortfolioStore.ts` | 2,580 | 5.0 | 4.8 | 4.9 | **4.91** | **CRITICAL** | 14 domains in single store; 49 actions; embedded 332-line tax engine; multi-domain cascades. |
| **3** | `src/app/flips/page.tsx` | 3,510 | 4.6 | 4.8 | 4.5 | **4.65** | **CRITICAL** | 41 useState hooks; 6 inline modals (1,480+ LOC); BOQ table bloat; un-memoized holding math. |
| **4** | `src/components/rentals/TenantStatement.tsx` | 2,303 | 4.2 | 4.5 | 4.8 | **4.46** | **CRITICAL** | Mixed Supabase cloud sync, Canvas PDF rendering, WhatsApp text generation, and arrears tier math. |
| **5** | `src/components/rentals/MeterReadingsModal.tsx` | 2,319 | 3.8 | 4.4 | 4.2 | **4.11** | **HIGH** | 4 nested sub-modals; 20+ form hooks; tariff math in UI; 800+ lines of raw table markup. |
| **6** | `src/app/analyzer/page.tsx` | 3,403 | 3.9 | 4.2 | 3.8 | **3.98** | **HIGH** | Buy-box calculation engine, OCR prompt building, and scenario cloning mixed with layout. |
| **7** | `src/components/rentals/UnifiedPdfVerificationModal.tsx` | 1,343 | 3.5 | 4.0 | 4.2 | **3.85** | **HIGH** | Multi-page PDF OCR parsing, reconciliation diff tables, and direct store batch injection. |
| **8** | `src/app/proposal/page.tsx` | 1,797 | 3.2 | 3.8 | 3.5 | **3.49** | **HIGH** | HTML Canvas multi-page PDF generation, funding debt sizing, and presentation templates. |
| **9** | `src/app/settings/page.tsx` | 1,592 | 3.0 | 3.2 | 3.4 | **3.17** | **MEDIUM** | Cloud sync status, localStorage debug viewer, bank branch code lookup in page. |
| **10** | `src/app/funding/page.tsx` | 1,273 | 3.0 | 3.1 | 3.2 | **3.09** | **MEDIUM** | Debt tranche schedule tracking, interest accrual calculations in presentation view. |
| **11** | `src/components/rentals/DisputeLetterModal.tsx` | 831 | 2.5 | 3.0 | 3.2 | **2.85** | **MEDIUM** | PDF letter compilation, municipal contact lookups, legal template rendering. |
| **12** | `src/components/rentals/StatementUploadModal.tsx` | 794 | 2.5 | 2.8 | 3.2 | **2.78** | **MEDIUM** | PDF file dropzone, municipal field extraction, billing method toggles. |
| **13** | `src/components/statements/TenantStatementViewer.tsx` | 997 | 2.0 | 2.6 | 2.2 | **2.26** | **LOW** | Presentation-only arrears viewer; isolated mobile responsive tabs. |

---

### 3.3 Detailed Risk Profile Analysis by Priority Tier

#### Critical Tier (Ranks 1–4)
- **System Stability Danger**: Any developer modifying `rentals/page.tsx`, `flips/page.tsx`, `usePortfolioStore.ts`, or `TenantStatement.tsx` operates in an environment where a single typo or state desynchronization can break accounting balances, corrupt localStorage persistence, or halt the build.
- **Immediate Intervention**: These four targets require complete structural decomposition into pure mathematical modules, headless state hooks, and dedicated component trees.

#### High Tier (Ranks 5–8)
- **Localized Fragility**: While scoped to specific workflows (utility meter disputes, deal triage analyzer, PDF verification, funding proposals), their sheer volume (>1,300 LOC each) and tight coupling to store actions make testing and maintenance extremely expensive.

#### Medium & Low Tier (Ranks 9–13)
- **Well-Bounded Features**: Settings, standalone viewers, and upload modals present manageable risks. Refactoring can occur opportunistically during feature development.

---

## 4. Requirement 3 (R3): Actionable Component & Module Slicing Blueprints

This section provides complete, production-ready slicing blueprints for the high-priority targets. All directory layouts, responsibility mappings, TypeScript contracts, and mathematical functions are specified in full.

---

### 4.1 Rentals Module Slicing Blueprint (`src/app/rentals/page.tsx`)

#### 4.1.1 Proposed Target Directory Layout

```
src/
├── lib/
│   └── calculations/
│       ├── rentals.ts                          <-- 100% pure financial & metric functions
│       └── __tests__/
│           └── rentals.test.ts                 <-- Unit test suite covering all pure rental math
├── hooks/
│   └── rentals/
│       ├── useRentalPortfolio.ts               <-- Top-level portfolio state & export actions
│       ├── useRentalModalState.ts              <-- Unified modal opening/closing state machine
│       ├── useRentalForm.ts                    <-- Add/Edit property form state controller
│       ├── usePaymentModal.ts                  <-- Payment logging & multi-month allocation
│       ├── useWriteOffModal.ts                 <-- Arrears write-off state & ledger allocation
│       └── useDirectPdfUpload.ts               <-- PDF statement batch ingestion controller
├── components/
│   ├── common/
│   │   └── InlineEditableAmount.tsx            <-- Extracted reusable inline currency editor
│   └── rentals/
│       ├── RentalSummaryKpis.tsx               <-- Top 5 KPI summary cards
│       ├── RentalViewTabs.tsx                  <-- Active vs Sold archive view switch
│       ├── RentalCard.tsx                      <-- Active rental card container
│       ├── RentalCardHeader.tsx                <-- Card header, badges, contact links
│       ├── RentalFinancialsTab.tsx             <-- Tab 1: Lease & costs breakdown
│       ├── RentalPaymentsTab.tsx               <-- Tab 2: Payments & arrears ledger
│       ├── RentalForecastSection.tsx           <-- 20-Year forecast accordion & chart
│       ├── RentalSoldCard.tsx                  <-- Sold / exited property card
│       └── modals/
│           ├── RentalFormModal.tsx             <-- Add/Edit property modal
│           ├── RefinanceModal.tsx              <-- BRRRR refinance dialog
│           ├── RefinanceAuditModal.tsx         <-- Equity extraction history dialog
│           ├── MaintenanceModal.tsx            <-- Maintenance history & logging
│           ├── ExitSaleModal.tsx               <-- Mark as sold disposal dialog
│           ├── SarbPmtModal.tsx                <-- SARB repo rate PMT calculator
│           ├── PaymentModal.tsx                <-- Payment logging & editing dialog
│           └── WriteOffModal.tsx               <-- Arrears write-off dialog
└── app/
    └── rentals/
        └── page.tsx                            <-- Ultra-thin layout orchestrator (< 120 lines)
```

---

#### 4.1.2 Line-by-Line Responsibility Mapping Table

| Source Line Range in `page.tsx` | Extracted Responsibility | Target Destination File |
|---|---|---|
| `81–127` | Redundant badge renderers | **DELETED** (rely on `@/components/common/PropertyTypeBadge`) |
| `129–170` | Agent contact communication links | `src/components/rentals/RentalCardHeader.tsx` |
| `172–247` | Inline editable currency input widget | `src/components/common/InlineEditableAmount.tsx` |
| `250–269`, `270–274`, `989–991` | Store bindings, active/sold filters, KPIs | `src/hooks/rentals/useRentalPortfolio.ts` |
| `275–314` | Direct PDF upload queue & parsing logic | `src/hooks/rentals/useDirectPdfUpload.ts` |
| `316–376`, `585–599`, `669–676` | Modal visibility & active entity state machine | `src/hooks/rentals/useRentalModalState.ts` |
| `377–384`, `5162–5168` | Toast notification state & feedback toast | `src/hooks/rentals/useRentalPortfolio.ts` / UI toast |
| `385–515` | Payment modal state, allocation & submission | `src/hooks/rentals/usePaymentModal.ts` |
| `516–584` | Write-off modal state, allocations & validation | `src/hooks/rentals/useWriteOffModal.ts` |
| `600–605`, `968–988` | Maintenance form state & invoice generation | `src/components/rentals/modals/MaintenanceModal.tsx` |
| `606–668`, `746–861`, `883–966` | Add/Edit property form state & consolidation | `src/hooks/rentals/useRentalForm.ts` |
| `677–705` | SARB PMT calculator logic & store update | `src/components/rentals/modals/SarbPmtModal.tsx` |
| `706–745` | BRRRR refinance parameters & store update | `src/components/rentals/modals/RefinanceModal.tsx` |
| `863–882` | Disposal sale logic & store update | `src/components/rentals/modals/ExitSaleModal.tsx` |
| `992–1054` | TopHeader & Action Buttons | `src/app/rentals/page.tsx` |
| `1056–1098` | Top 5 KPI Summary Strip | `src/components/rentals/RentalSummaryKpis.tsx` |
| `1100–1101` | Actual vs Budget KPI strip | `src/app/rentals/page.tsx` (existing component) |
| `1102–1129` | Active vs Archive view tab switcher | `src/components/rentals/RentalViewTabs.tsx` |
| `1133–1156` | Refinance success banner | `src/components/rentals/RentalCard.tsx` |
| `1177–1202` | Pure tax, yield, and Section 13sex math | `src/lib/calculations/rentals.ts` |
| `1204–1271`, `1286–1306` | Card header, badges, financial highlights | `src/components/rentals/RentalCardHeader.tsx` |
| `1307–1368` | Card internal tab switcher | `src/components/rentals/RentalCard.tsx` |
| `1369–1806` | Lease details, OpEx breakdown, SARS tax box | `src/components/rentals/RentalFinancialsTab.tsx` |
| `1808–2505` | Payments & arrears sub-tab monolith | `src/components/rentals/RentalPaymentsTab.tsx` |
| `2506–2526` | CoC and Cloud Vault tab wrappers | `src/components/rentals/RentalCard.tsx` |
| `2528–2601` | 20-Year forecast accordion & chart | `src/components/rentals/RentalForecastSection.tsx` |
| `2603–2684` | Card footer action buttons | `src/components/rentals/RentalCard.tsx` |
| `2692–2824` | Sold & exited archive card grid | `src/components/rentals/RentalSoldCard.tsx` |
| `2827–2968` | Mark as Sold exit dialog | `src/components/rentals/modals/ExitSaleModal.tsx` |
| `2970–3181` | BRRRR refinance dialog | `src/components/rentals/modals/RefinanceModal.tsx` |
| `3183–3268` | Refinance audit history dialog | `src/components/rentals/modals/RefinanceAuditModal.tsx` |
| `3270–3392` | Maintenance work orders & history dialog | `src/components/rentals/modals/MaintenanceModal.tsx` |
| `3394–4357` | Add / Edit rental property form dialog | `src/components/rentals/modals/RentalFormModal.tsx` |
| `4359–4509` | SARB Repo Rate PMT calculator dialog | `src/components/rentals/modals/SarbPmtModal.tsx` |
| `4511–4560` | External modal invocations (PDF, Statements) | `src/app/rentals/page.tsx` |
| `4561–4892` | Log & edit tenant payment dialog | `src/components/rentals/modals/PaymentModal.tsx` |
| `4894–5160` | Arrears write-off dialog | `src/components/rentals/modals/WriteOffModal.tsx` |

---

#### 4.1.3 Complete TypeScript Contract Signatures (Props & Hooks)

```typescript
// ==========================================
// src/components/rentals/RentalSummaryKpis.tsx
// ==========================================
export interface RentalSummaryKpisProps {
  totalRentalValue: number;
  totalGrossMonthlyRent: number;
  netMonthlyCashflow: number;
  totalBondLiabilities: number;
  annualRentalTaxReserve: number;
  monthlyRentalTaxReserve: number;
  activeRentalsCount: number;
}

// ==========================================
// src/components/rentals/RentalCard.tsx
// ==========================================
export interface RentalCardProps {
  property: RentalProperty;
  investorDefaultTaxType?: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  forecastView: 'wealth-only' | 'cashflow-only';
  onForecastViewChange: (view: 'wealth-only' | 'cashflow-only') => void;
  onOpenEdit: (property: RentalProperty) => void;
  onOpenExit: (property: RentalProperty) => void;
  onOpenRefinance: (property: RentalProperty) => void;
  onOpenAuditHistory: (property: RentalProperty) => void;
  onOpenMaintenance: (property: RentalProperty) => void;
  onOpenMeterModal: (propertyId: string) => void;
  onOpenStatementModal: (propertyId: string) => void;
  onOpenPmtCalculator: (property: RentalProperty) => void;
  onOpenLogPayment: (property: RentalProperty, targetMonth?: string, suggestedAmount?: number, leaseId?: string, isArrears?: boolean) => void;
  onOpenEditPayment: (payment: TenantPaymentRecord) => void;
  onOpenWriteOff: (property: RentalProperty, suggestedAmount?: number, leaseId?: string) => void;
  onUpdateOpeningBalance: (propertyId: string, amount: number, leaseId?: string) => void;
  onDeletePayment: (propertyId: string, paymentId: string, amount: number, date: string) => void;
  onDeleteWriteOff: (propertyId: string, writeOffId: string, amount: number, date: string) => void;
  onMarkMonthPaid: (propertyId: string, month: string, amountDue: number, leaseId?: string) => void;
  onShowToast: (message: string) => void;
  onDeleteProperty: (propertyId: string, propertyTitle: string) => void;
  onUpdateProperty: (propertyId: string, updates: Partial<RentalProperty>) => void;
}

// ==========================================
// src/components/rentals/RentalCardHeader.tsx
// ==========================================
export interface RentalCardHeaderProps {
  property: RentalProperty;
  grossYieldPercent: number;
  onOpenEdit: () => void;
  onOpenExit: () => void;
  onOpenAuditHistory: () => void;
  onOpenMaintenance: () => void;
  onOpenMeterModal: () => void;
  onDeleteProperty: () => void;
}

// ==========================================
// src/components/rentals/RentalFinancialsTab.tsx
// ==========================================
export interface RentalFinancialsTabProps {
  property: RentalProperty;
  calculatedCashflow: {
    agencyCommissionZAR: number;
    netMonthlyCashflowZAR: number;
    totalGrossIncomeZAR: number;
    ancillaryIncomeZAR: number;
  };
  taxCalculation: RentalTaxCalculationResult; // Aligned with calculateRentalTaxProvision: sec13ShieldZAR, postTaxCashflowZAR, yieldPostTaxPercent
  onUpdateProperty: (updates: Partial<RentalProperty>) => void;
  onOpenPmtCalculator: () => void;
  onOpenRefinance: () => void;
  onOpenStatementModal: () => void;
}

// ==========================================
// src/components/rentals/RentalPaymentsTab.tsx
// ==========================================
export interface RentalPaymentsTabProps {
  property: RentalProperty;
  onOpenLogPayment: (targetMonth?: string, suggestedAmount?: number, leaseId?: string, isArrears?: boolean) => void;
  onOpenEditPayment: (payment: TenantPaymentRecord) => void;
  onOpenWriteOff: (suggestedAmount?: number, leaseId?: string) => void;
  onOpenStatementModal: () => void;
  onUpdateOpeningBalance: (amount: number, leaseId?: string) => void;
  onDeletePayment: (paymentId: string, amount: number, date: string) => void;
  onDeleteWriteOff: (writeOffId: string, amount: number, date: string) => void;
  onMarkMonthPaid: (month: string, amountDue: number, leaseId?: string) => void;
  onShowToast: (message: string) => void;
}

// ==========================================
// src/components/rentals/RentalForecastSection.tsx
// ==========================================
export interface RentalForecastSectionProps {
  property: RentalProperty;
  forecastView: 'wealth-only' | 'cashflow-only';
  onForecastViewChange: (view: 'wealth-only' | 'cashflow-only') => void;
}

// ==========================================
// src/components/rentals/RentalViewTabs.tsx
// ==========================================
export interface RentalViewTabsProps {
  activeCount: number;
  soldCount: number;
  viewTab: 'active' | 'archive';
  onSelectTab: (tab: 'active' | 'archive') => void;
  onOpenAddRental: () => void;
  onExportCsv: () => void;
  onExportItr12: () => void;
}

// ==========================================
// src/components/common/InlineEditableAmount.tsx
// ==========================================
export interface InlineEditableAmountProps {
  valueZAR: number;
  onSave: (newAmount: number) => void;
  className?: string;
  isCurrency?: boolean;
}

// ==========================================
// src/components/rentals/RentalSoldCard.tsx
// ==========================================
export interface RentalSoldCardProps {
  property: RentalProperty;
  onReopenProperty: (propertyId: string, propertyTitle: string, cashToRevert: number) => void;
}

// ==========================================
// src/components/rentals/modals/RentalFormModal.tsx
// ==========================================
export interface RentalFormModalProps {
  isOpen: boolean;
  editingProperty: RentalProperty | null;
  onClose: () => void;
  onSave: (payload: Partial<RentalProperty>, isNew: boolean) => void;
}

// ==========================================
// src/components/rentals/modals/RefinanceModal.tsx
// ==========================================
export interface RefinanceModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  currentLiquidReserve: number; // Injected from summary.liquidCapitalReserve (Seed Capital pool)
  onClose: () => void;
  onSave: (params: {
    rentalId: string;
    newBankValuationZAR: number;
    newMonthlyBondPaymentZAR: number;
    cashEquityPulledOutZAR: number;
    newBondBalanceZAR: number;
    refinanceDate: string;
    notes?: string;
  }) => void;
}

// ==========================================
// src/components/rentals/modals/RefinanceAuditModal.tsx
// ==========================================
export interface RefinanceAuditModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  onClose: () => void;
}

// ==========================================
// src/components/rentals/modals/MaintenanceModal.tsx
// ==========================================
export interface MaintenanceModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  onClose: () => void;
}

// ==========================================
// src/components/rentals/modals/ExitSaleModal.tsx
// ==========================================
export interface ExitSaleModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  onClose: () => void;
  onComplete: () => void;
}

// ==========================================
// src/components/rentals/modals/SarbPmtModal.tsx
// ==========================================
export interface SarbPmtModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  onClose: () => void;
}

// ==========================================
// src/components/rentals/modals/PaymentModal.tsx
// ==========================================
export interface PaymentModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  editingPayment: TenantPaymentRecord | null;
  initialLeaseId?: string;
  initialMonth?: string;
  initialAmount?: number;
  initialAllocations?: PaymentAllocation[];
  onClose: () => void;
  onSave: (payload: Omit<TenantPaymentRecord, 'id'>, editingId?: string) => void;
}

// ==========================================
// src/components/rentals/modals/WriteOffModal.tsx
// ==========================================
export interface WriteOffModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  initialLeaseId?: string;
  initialAmount?: number;
  initialAllocations?: PaymentAllocation[];
  onClose: () => void;
  onSave: (payload: Omit<ArrearsWriteOff, 'id'>) => void;
}

// ==========================================
// src/hooks/rentals/useRentalPortfolio.ts
// ==========================================
export interface UseRentalPortfolioReturn {
  rentals: RentalProperty[];
  activeRentals: RentalProperty[];
  soldRentals: RentalProperty[];
  summary: {
    totalRentalValue: number;
    totalGrossMonthlyRent: number;
    monthlyNetRentalCashflow: number;
    totalBondLiabilities: number;
    annualRentalTaxReserve: number;
    monthlyRentalTaxReserve: number;
    liquidCapitalReserve: number; // Seed Capital pool available for acquisition/refinance credit
  };
  investorProfile: any;
  viewTab: 'active' | 'archive';
  setViewTab: (tab: 'active' | 'archive') => void;
  forecastView: 'wealth-only' | 'cashflow-only';
  setForecastView: (mode: 'wealth-only' | 'cashflow-only') => void;
  feedbackToast: string | null;
  showToast: (msg: string) => void;
  handleExportCsv: () => void;
  handleExportItr12: (taxYear?: number) => void;
  handleDeleteProperty: (propertyId: string, title: string) => void;
  handleReopenProperty: (propertyId: string, title: string, proceedsToRevert: number) => void;
}

export function useRentalPortfolio(): UseRentalPortfolioReturn;

// ==========================================
// src/hooks/rentals/useRentalModalState.ts
// ==========================================
export interface UseRentalModalStateReturn {
  isRentalFormOpen: boolean;
  editingProperty: RentalProperty | null;
  openAddRental: () => void;
  openEditRental: (property: RentalProperty) => void;
  closeRentalForm: () => void;

  isRefinanceOpen: boolean;
  refinanceProperty: RentalProperty | null;
  refinanceSuccessBanner: { amount: number; propertyTitle: string } | null;
  clearRefinanceBanner: () => void;
  openRefinance: (property: RentalProperty) => void;
  closeRefinance: () => void;

  isAuditHistoryOpen: boolean;
  auditProperty: RentalProperty | null;
  openAuditHistory: (property: RentalProperty) => void;
  closeAuditHistory: () => void;

  isMaintenanceOpen: boolean;
  maintenanceProperty: RentalProperty | null;
  openMaintenance: (property: RentalProperty) => void;
  closeMaintenance: () => void;

  isExitOpen: boolean;
  exitProperty: RentalProperty | null;
  openExit: (property: RentalProperty) => void;
  closeExit: () => void;

  isPmtOpen: boolean;
  pmtProperty: RentalProperty | null;
  openPmtCalculator: (property: RentalProperty) => void;
  closePmtCalculator: () => void;

  statementPropertyId: string | null;
  openStatementModal: (propertyId: string) => void;
  closeStatementModal: () => void;
  meterPropertyId: string | null;
  openMeterModal: (propertyId: string) => void;
  closeMeterModal: () => void;
}

export function useRentalModalState(): UseRentalModalStateReturn;

// ==========================================
// src/hooks/rentals/useRentalForm.ts
// ==========================================
export interface UseRentalFormReturn {
  formData: Partial<RentalProperty>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<RentalProperty>>>;
  errors: Record<string, string>;
  validate: () => boolean;
  resetForm: (initial?: RentalProperty | null) => void;
}

export function useRentalForm(initialProperty?: RentalProperty | null): UseRentalFormReturn;

// ==========================================
// src/hooks/rentals/usePaymentModal.ts
// ==========================================
export interface UsePaymentModalReturn {
  isOpen: boolean;
  property: RentalProperty | null;
  editingPayment: TenantPaymentRecord | null;
  initialLeaseId?: string;
  initialMonth?: string;
  initialAmount?: number;
  initialAllocations?: PaymentAllocation[];
  openLogPayment: (property: RentalProperty, targetMonth?: string, suggestedAmount?: number, leaseId?: string, isArrears?: boolean) => void;
  openEditPayment: (property: RentalProperty, payment: TenantPaymentRecord) => void;
  closePaymentModal: () => void;
}

export function usePaymentModal(): UsePaymentModalReturn;

// ==========================================
// src/hooks/rentals/useWriteOffModal.ts
// ==========================================
export interface UseWriteOffModalReturn {
  isOpen: boolean;
  property: RentalProperty | null;
  initialLeaseId?: string;
  initialAmount?: number;
  initialAllocations?: PaymentAllocation[];
  openWriteOff: (property: RentalProperty, suggestedAmount?: number, leaseId?: string) => void;
  closeWriteOffModal: () => void;
}

export function useWriteOffModal(): UseWriteOffModalReturn;

// ==========================================
// src/hooks/rentals/useDirectPdfUpload.ts
// ==========================================
export interface UseDirectPdfUploadReturn {
  queue: File[];
  isProcessing: boolean;
  enqueueFiles: (files: FileList | File[]) => void;
  clearQueue: () => void;
}

export function useDirectPdfUpload(): UseDirectPdfUploadReturn;
```

---

#### 4.1.4 Pure Calculations Extraction (`src/lib/calculations/rentals.ts`)

```typescript
// src/lib/calculations/rentals.ts

import { RentalProperty } from '@/types';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';

export interface RentalTaxCalculationResult {
  entityType: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  taxRate: number;
  taxRateLabel: string;
  annualCashflowZAR: number;
  sec13ShieldZAR: number;
  totalBadDebtZAR: number;
  taxableIncomeZAR: number;
  annualTaxZAR: number;
  monthlyTaxZAR: number;
  taxSavingsZAR: number;
  postTaxCashflowZAR: number;
  yieldPostTaxPercent: number;
}

/**
 * 1. Pure SARS Income Tax Provision & Section 13sex Shield Calculator
 * Extracted from lines 1189–1200 of page.tsx.
 */
export function calculateRentalTaxProvision(
  property: RentalProperty,
  netMonthlyCashflowZAR: number,
  defaultTaxEntityType: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax' = 'Company (27%)'
): RentalTaxCalculationResult {
  const entityType = property.taxEntityTypeOverride || defaultTaxEntityType;
  const taxRate = entityType === 'Individual (45%)' ? 0.45 : entityType === 'Pre-Tax' ? 0 : 0.27;
  const taxRateLabel = entityType === 'Individual (45%)' ? 'Individual 45%' : entityType === 'Pre-Tax' ? 'Pre-Tax 0%' : 'Company 27%';
  
  const annualCashflowZAR = Math.max(0, netMonthlyCashflowZAR * 12);
  const sec13ShieldZAR = property.section13sexAnnualShieldZAR || 0;
  const totalBadDebtZAR = (property.arrearsWriteOffs || []).reduce((sum, w) => sum + (w.amountZAR || 0), 0);
  const taxableIncomeZAR = Math.max(0, annualCashflowZAR - totalBadDebtZAR - sec13ShieldZAR);
  const annualTaxZAR = Math.round(taxableIncomeZAR * taxRate);
  const monthlyTaxZAR = Math.round(annualTaxZAR / 12);
  const taxSavingsZAR = sec13ShieldZAR > 0 ? Math.round(Math.min(annualCashflowZAR, sec13ShieldZAR) * taxRate) : 0;
  const postTaxCashflowZAR = netMonthlyCashflowZAR - monthlyTaxZAR;
  const yieldPostTaxPercent = property.marketValueZAR > 0 ? ((postTaxCashflowZAR * 12) / property.marketValueZAR) * 100 : 0;

  return {
    entityType,
    taxRate,
    taxRateLabel,
    annualCashflowZAR,
    sec13ShieldZAR,
    totalBadDebtZAR,
    taxableIncomeZAR,
    annualTaxZAR,
    monthlyTaxZAR,
    taxSavingsZAR,
    postTaxCashflowZAR,
    yieldPostTaxPercent,
  };
}

/**
 * 2. Pure Gross Yield Calculator
 * Extracted from lines 1184–1187 of page.tsx.
 */
export function calculateGrossYield(totalGrossIncomeZAR: number, marketValueZAR: number): number {
  if (marketValueZAR <= 0) return 0;
  return ((totalGrossIncomeZAR * 12) / marketValueZAR) * 100;
}

/**
 * 3. BRRRR Refinance Parameter Estimator
 * Extracted from lines 708–716 of page.tsx.
 * Reuses the canonical calculateMonthlyBondRepayment() from @/lib/calculations/propertyMetrics
 * rather than duplicating bond amortization PMT math.
 */
export interface BrrrrRefinanceProposal {
  estimatedNewValuationZAR: number;
  targetBondBalanceZAR: number;
  cashEquityPulledOutZAR: number;
  newBondBalanceZAR: number;
  estimatedMonthlyBondRepaymentZAR: number;
  ltvPercent: number;
}

export function calculateBrrrrRefinanceProposal(
  currentValuationZAR: number,
  currentBondBalanceZAR: number,
  interestRatePercent: number = 11.5,
  loanYears: number = 20,
  targetLtvRatio: number = 0.70
): BrrrrRefinanceProposal {
  const estNewVal = Math.round((currentValuationZAR * 1.15) / 50000) * 50000;
  const targetBond = Math.round((estNewVal * targetLtvRatio) / 10000) * 10000;
  const defaultCashOut = Math.max(0, targetBond - currentBondBalanceZAR);
  const newBond = currentBondBalanceZAR + defaultCashOut;
  
  // Reuses the battle-tested, Vitest-validated bond repayment PMT function
  const estPmt = calculateMonthlyBondRepayment(newBond, interestRatePercent, loanYears);
  const ltvPercent = estNewVal > 0 ? (newBond / estNewVal) * 100 : 0;

  return {
    estimatedNewValuationZAR: estNewVal,
    targetBondBalanceZAR: targetBond,
    cashEquityPulledOutZAR: defaultCashOut,
    newBondBalanceZAR: newBond,
    estimatedMonthlyBondRepaymentZAR: estPmt,
    ltvPercent,
  };
}

/**
 * 4. Agency Commission & VAT Fee Calculator
 * Extracted from lines 897–899 and 1539–1546 of page.tsx.
 */
export interface AgencyFeeResult {
  monthlyAgentFeeZAR: number;
  effectiveCommissionPercent: number;
  vatApplied: boolean;
}

export function calculateAgencyCommission(
  grossRentZAR: number,
  commissionPercent: number,
  vatApplicable: boolean,
  agencyName?: string
): AgencyFeeResult {
  const isVatExemptVendor = agencyName?.trim() === 'iGrow Rentals';
  const effectiveVat = !isVatExemptVendor && vatApplicable;
  const baseComm = grossRentZAR * (commissionPercent / 100);
  const monthlyAgentFeeZAR = Math.round(baseComm * (effectiveVat ? 1.15 : 1.0));
  const effectiveCommissionPercent = grossRentZAR > 0 ? Number(((monthlyAgentFeeZAR / grossRentZAR) * 100).toFixed(1)) : commissionPercent;

  return {
    monthlyAgentFeeZAR,
    effectiveCommissionPercent,
    vatApplied: effectiveVat,
  };
}

/**
 * 5. Disposal Realized Sale Metrics
 * Extracted from lines 2729–2733 of page.tsx.
 */
export interface DisposalMetrics {
  grossCapitalGainZAR: number;
  capitalGainPercent: number;
  netCashProceedsZAR: number;
}

export function calculateDisposalMetrics(
  actualSalePriceZAR: number,
  purchasePriceZAR: number,
  outstandingBondBalanceZAR: number
): DisposalMetrics {
  const grossCapitalGainZAR = actualSalePriceZAR - purchasePriceZAR;
  const capitalGainPercent = purchasePriceZAR > 0 ? (grossCapitalGainZAR / purchasePriceZAR) * 100 : 0;
  const netCashProceedsZAR = Math.max(0, actualSalePriceZAR - outstandingBondBalanceZAR);

  return {
    grossCapitalGainZAR,
    capitalGainPercent,
    netCashProceedsZAR,
  };
}

/**
 * 6. Aggregate Rental Portfolio KPIs
 * Extracted from lines 989–991 and 1056–1098 of page.tsx.
 */
export interface AggregateRentalPortfolioKPIs {
  totalRentalAssetValueZAR: number;
  totalGrossMonthlyRentZAR: number;
  totalAnnualGrossRentZAR: number;
  activeCount: number;
  soldCount: number;
}

export function calculateAggregateRentalKPIs(rentals: RentalProperty[]): AggregateRentalPortfolioKPIs {
  const activeRentals = rentals.filter((r) => r.status !== 'Sold');
  const soldRentals = rentals.filter((r) => r.status === 'Sold');
  const totalRentalAssetValueZAR = activeRentals.reduce((sum, r) => sum + (r.marketValueZAR || r.purchasePriceZAR || 0), 0);
  const totalGrossMonthlyRentZAR = activeRentals.reduce((sum, r) => sum + (r.monthlyGrossRentZAR || 0), 0);

  return {
    totalRentalAssetValueZAR,
    totalGrossMonthlyRentZAR,
    totalAnnualGrossRentZAR: totalGrossMonthlyRentZAR * 12,
    activeCount: activeRentals.length,
    soldCount: soldRentals.length,
  };
}
```

---

#### 4.1.5 Refactored Thin View Component Sketch (<120 LOC)

```tsx
'use client';

import React, { useRef } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { useRentalPortfolio } from '@/hooks/rentals/useRentalPortfolio';
import { useRentalModalState } from '@/hooks/rentals/useRentalModalState';
import { usePaymentModal } from '@/hooks/rentals/usePaymentModal';
import { useWriteOffModal } from '@/hooks/rentals/useWriteOffModal';
import { useDirectPdfUpload } from '@/hooks/rentals/useDirectPdfUpload';
import RentalSummaryKpis from '@/components/rentals/RentalSummaryKpis';
import ActualVsBudgetKpiStrip from '@/components/dashboard/ActualVsBudgetKpiStrip';
import RentalViewTabs from '@/components/rentals/RentalViewTabs';
import RentalCard from '@/components/rentals/RentalCard';
import RentalSoldCard from '@/components/rentals/RentalSoldCard';
import ImportDropdown from '@/components/common/ImportDropdown';
import TenantStatement from '@/components/rentals/TenantStatement';
import MeterReadingsModal from '@/components/rentals/MeterReadingsModal';
import UnifiedPdfVerificationModal from '@/components/rentals/UnifiedPdfVerificationModal';
import RentalFormModal from '@/components/rentals/modals/RentalFormModal';
import RefinanceModal from '@/components/rentals/modals/RefinanceModal';
import RefinanceAuditModal from '@/components/rentals/modals/RefinanceAuditModal';
import MaintenanceModal from '@/components/rentals/modals/MaintenanceModal';
import ExitSaleModal from '@/components/rentals/modals/ExitSaleModal';
import SarbPmtModal from '@/components/rentals/modals/SarbPmtModal';
import PaymentModal from '@/components/rentals/modals/PaymentModal';
import WriteOffModal from '@/components/rentals/modals/WriteOffModal';
import { Sparkles, FileSpreadsheet, PlusCircle, CheckCircle2 } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export default function RentalPortfolioPage() {
  const {
    rentals,
    activeRentals,
    soldRentals,
    summary,
    investorProfile,
    viewTab,
    setViewTab,
    forecastView,
    setForecastView,
    feedbackToast,
    showToast,
    handleExportCsv,
    handleExportItr12,
    handleDeleteProperty,
    handleReopenProperty,
  } = useRentalPortfolio();

  const modals = useRentalModalState();
  const paymentModal = usePaymentModal(rentals, showToast);
  const writeOffModal = useWriteOffModal(rentals, showToast);
  const pdfUpload = useDirectPdfUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Rental Portfolio"
        subtitle="Manage active income properties, tenant leases, trust deposits, and maintenance histories"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => pdfUpload.handleUpload(Array.from(e.target.files || []))}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-3 py-2 rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Smart Document Import</span>
            </button>
            <ImportDropdown type="rentals" onPdfSelected={pdfUpload.handleUpload} />
            <button onClick={handleExportCsv} className="inline-flex items-center gap-1.5 bg-white text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button onClick={() => handleExportItr12(2026)} className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold px-3 py-2 rounded-lg">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
              <span>SARS ITR12 Export</span>
            </button>
            <button onClick={modals.openAddRental} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Rental Property</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        <RentalSummaryKpis
          totalRentalValue={summary.totalRentalValue}
          totalGrossMonthlyRent={summary.totalGrossMonthlyRent}
          netMonthlyCashflow={summary.monthlyNetRentalCashflow}
          totalBondLiabilities={summary.totalBondLiabilities}
          annualRentalTaxReserve={summary.annualRentalTaxReserve}
          monthlyRentalTaxReserve={summary.monthlyRentalTaxReserve}
          activeRentalsCount={activeRentals.length}
        />

        <ActualVsBudgetKpiStrip rentals={rentals} />

        <RentalViewTabs
          viewTab={viewTab}
          onTabChange={setViewTab}
          activeCount={activeRentals.length}
          archiveCount={soldRentals.length}
        />

        {viewTab === 'active' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {activeRentals.map((property) => (
              <RentalCard
                key={property.id}
                property={property}
                investorDefaultTaxType={investorProfile?.defaultTaxEntityType}
                forecastView={forecastView}
                onForecastViewChange={setForecastView}
                onOpenEdit={modals.openEditRental}
                onOpenExit={modals.openExit}
                onOpenRefinance={modals.openRefinance}
                onOpenAuditHistory={modals.openAuditHistory}
                onOpenMaintenance={modals.openMaintenance}
                onOpenMeterModal={modals.openMeterModal}
                onOpenStatementModal={modals.openStatementModal}
                onOpenPmtCalculator={modals.openPmtCalculator}
                onOpenLogPayment={paymentModal.openLogPayment}
                onOpenEditPayment={paymentModal.openEditPayment}
                onOpenWriteOff={writeOffModal.openWriteOff}
                onUpdateOpeningBalance={(propId, amt, lId) => usePortfolioStore.getState().updateRentalOpeningBalance(propId, amt, lId)}
                onDeletePayment={(propId, payId, amt, dt) => usePortfolioStore.getState().deleteTenantPayment(propId, payId, amt, dt)}
                onDeleteWriteOff={(propId, wId, amt, dt) => usePortfolioStore.getState().deleteArrearsWriteOff(propId, wId, amt, dt)}
                onMarkMonthPaid={(propId, mo, amt, lId) => usePortfolioStore.getState().markMonthPaid(propId, mo, amt, lId)}
                onShowToast={showToast}
                onDeleteProperty={handleDeleteProperty}
                onUpdateProperty={(id, u) => usePortfolioStore.getState().updateRental(id, u)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {soldRentals.map((property) => (
              <RentalSoldCard
                key={property.id}
                property={property}
                onReopenProperty={handleReopenProperty}
              />
            ))}
          </div>
        )}
      </main>

      {/* Decomposed Modals */}
      <RentalFormModal isOpen={modals.isRentalFormOpen} editingProperty={modals.editingProperty} onClose={modals.closeRentalForm} onSave={(p, isNew) => isNew ? usePortfolioStore.getState().addRental(p as any) : usePortfolioStore.getState().updateRental(modals.editingProperty!.id, p)} />
      <RefinanceModal isOpen={modals.isRefinanceOpen} property={modals.refinanceProperty} currentLiquidReserve={summary.liquidCapitalReserve} onClose={modals.closeRefinance} onSave={(params) => usePortfolioStore.getState().refinanceRental(params)} />
      <RefinanceAuditModal isOpen={modals.isAuditHistoryOpen} property={modals.auditProperty} onClose={modals.closeAuditHistory} />
      <MaintenanceModal isOpen={modals.isMaintenanceOpen} property={modals.maintenanceProperty} onClose={modals.closeMaintenance} />
      <ExitSaleModal isOpen={modals.isExitOpen} property={modals.exitProperty} onClose={modals.closeExit} onComplete={() => modals.closeExit()} />
      <SarbPmtModal isOpen={modals.isPmtOpen} property={modals.pmtProperty} onClose={modals.closePmtCalculator} />
      <PaymentModal {...paymentModal} />
      <WriteOffModal {...writeOffModal} />
      <UnifiedPdfVerificationModal isOpen={pdfUpload.queue.length > 0} queue={pdfUpload.queue} onClose={pdfUpload.clearQueue} onOpenTenantStatement={modals.openStatementModal} />
      <TenantStatement propertyId={modals.statementPropertyId} isOpen={Boolean(modals.statementPropertyId)} onClose={modals.closeStatementModal} />
      <MeterReadingsModal propertyId={modals.meterPropertyId} isOpen={Boolean(modals.meterPropertyId)} onClose={modals.closeMeterModal} />

      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/40 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{feedbackToast}</span>
        </div>
      )}
    </div>
  );
}
```

---

### 4.2 Flips Module Slicing Blueprint (`src/app/flips/page.tsx`)

#### 4.2.1 Proposed Target Directory Layout

```
src/
├── app/
│   └── flips/
│       └── page.tsx                               # Thin orchestrator (< 90 lines)
├── components/
│   └── flips/
│       ├── DelayMatrixModal.tsx                   # (Existing) Delay sensitivity simulation modal
│       ├── FlipActivePipeline.tsx                 # Active pipeline orchestrator container
│       ├── FlipProjectTabs.tsx                    # Project tab selector, WhatsApp share, Pitch Deck link
│       ├── FlipProjectHeader.tsx                  # Project title, badges, phase selector, quick action buttons
│       ├── FlipMetricsCards.tsx                   # 6-card financial overview & collapsible holding burn
│       ├── FlipOperationalMathBanner.tsx          # Formula banner, SARS tax toggle, barter savings
│       ├── FlipFundingCampaignCard.tsx            # Capital raised progress bar, terms & sync
│       ├── FlipRatesClearanceCard.tsx             # Section 118 RCC status, arrears, CoJ dispute alert
│       ├── FlipMilestoneDrawdownCard.tsx          # 4-phase draw gate checkboxes & retention pool
│       ├── FlipBOQTable.tsx                       # Bill of Quantities data table with CSV export
│       ├── FlipSoldArchiveView.tsx                # Sold & Completed deals grid with reopen actions
│       └── modals/
│           ├── FlipProjectModal.tsx               # Unified Add & Edit modal with PDF upload dropzone
│           ├── AddBOQItemModal.tsx                # New BOQ line item modal with barter dual accounting
│           ├── FlipExitModal.tsx                  # Realized sale & liquid cash reserve credit modal
│           ├── FlipToRentalModal.tsx              # BRRRR transition to rental portfolio modal
│           ├── FlipFundingModal.tsx               # Investor funding terms & facility edit modal
│           └── SupplierDirectoryModal.tsx         # SA local supplier book & contractor modal
├── hooks/
│   └── flips/
│       ├── useFlipSelection.ts                    # Tab navigation, active flip selection, WhatsApp share
│       ├── useFlipCalculations.ts                 # Memoized financial metrics hook delegating to pure math
│       ├── useFlipModalManager.ts                 # Centralized modal state machine (replaces 8 booleans)
│       ├── useFlipForm.ts                         # Flip project modal form state & PDF extraction
│       ├── useBoqForm.ts                          # Add BOQ item modal form state & calculations
│       ├── useFundingForm.ts                      # Funding campaign form state & ledger sync
│       ├── useBrrrrConvertForm.ts                 # BRRRR rental conversion form state & yield math
│       └── useFlipExitForm.ts                     # Exit modal form state & net proceeds calculation
└── lib/
    └── calculations/
        ├── flips.ts                               # 100% pure financial & accounting math
        └── __tests__/
            └── flips.test.ts                      # Vitest unit test suite for flip calculations
```

---

#### 4.2.2 Line-by-Line Responsibility Mapping Table

| Source Line Range in `page.tsx` | Target Destination File | Architectural Layer | Concern & Extraction Rationale |
|---|---|---|---|
| **1–48** | `src/app/flips/page.tsx` & submodules | Imports | Partition imports to respective child components and hooks. |
| **50–66** | `useFlipSelection.ts` & component hooks | State / Hook | Decouple root page from subscribing to 14 separate store slices. |
| **68–75** | `src/hooks/flips/useFlipSelection.ts` | Headless Hook | Extract tab toggle (`active` vs `archive`) and active flip selection. |
| **76–78** | `src/hooks/flips/useFlipSelection.ts` & `FlipMetricsCards.tsx` | View State | Extract WhatsApp toast state and holding breakdown accordion state. |
| **80–89** | `src/hooks/flips/useFlipModalManager.ts` | State Machine | Replace 8 disjoint boolean states with a single discriminated modal manager. |
| **90–101** | `src/hooks/flips/useBrrrrConvertForm.ts` | Form Hook | Extract BRRRR conversion form state and initial tenant defaults. |
| **103–114** | `src/hooks/flips/useFundingForm.ts` | Form Hook | Extract funding campaign facility and investor terms form state. |
| **115–120** | `src/hooks/flips/useFlipExitForm.ts` | Form Hook | Extract exit modal realized sale and date form state. |
| **121–135** | `src/hooks/flips/useBoqForm.ts` | Form Hook | Extract BOQ item form state, trade categories, and sponsor fields. |
| **136–167** | `src/hooks/flips/useFlipForm.ts` | Form Hook | Extract unified Flip Add/Edit form state (26 variables). |
| **168–269** | `src/lib/calculations/flips.ts` & `useFlipForm.ts` | Pure Logic / Hook | Extract PDF statement text analysis and address heuristics to pure function; handle file state in hook. |
| **271–278** | `src/components/flips/modals/SupplierDirectoryModal.tsx` | Modal Component | Colocate supplier form inputs directly inside supplier modal. |
| **280–312** | `src/hooks/flips/useBoqForm.ts` | Form Hook | Move `handleAddBOQ` submission, barter cash logic, and store dispatch to hook. |
| **314–386** | `src/hooks/flips/useFlipForm.ts` | Form Hook | Move `openAddFlipModal` and `openEditFlipModal` hydration logic to hook. |
| **388–484** | `src/hooks/flips/useFlipForm.ts` | Form Hook | Move `handleSaveFlip` nested object assembly and store mutation to hook. |
| **486–507** | `src/components/flips/modals/SupplierDirectoryModal.tsx` | Modal Component | Move `handleAddSupplier` submission to supplier modal. |
| **509–515** | `src/hooks/flips/useFlipExitForm.ts` | Form Hook | Move `handleCompleteFlip` exit validation to exit hook. |
| **517–593** | `src/lib/calculations/flips.ts` & `useFlipCalculations.ts` | Pure Math Engine | Move BOQ aggregates, holding costs, all-in costs, tax provisions, ROI, and milestone draws to pure math. |
| **594–628** | `src/hooks/flips/useBrrrrConvertForm.ts` | Form Hook | Move `openConvertModal` and `handleConvertFlip` transition logic to hook. |
| **630–682** | `src/lib/calculations/flips.ts` & `useFundingForm.ts` | Pure Math / Hook | Move funding progress math to pure logic; ledger sync handler to funding hook. |
| **684–710** | `src/app/flips/page.tsx` | Page View Shell | Retain clean page wrapper, TopHeader, and modal manager mounts. |
| **711–740** | `src/app/flips/page.tsx` | Page Navigation | Retain high-level active/archive tab navigation switch. |
| **744–805** | `src/components/flips/FlipProjectTabs.tsx` | Presentation | Extract deal pill selector, WhatsApp clipboard share button, and pitch deck link. |
| **808–878** | `src/components/flips/FlipProjectHeader.tsx` | Presentation | Extract active flip title banner, property badges, phase selector, and action buttons. |
| **880–998** | `src/components/flips/FlipMetricsCards.tsx` | Presentation | Extract 6-card financial overview grid and itemized holding cost accordion. |
| **1000–1101** | `src/components/flips/FlipOperationalMathBanner.tsx` | Presentation | Extract operational math banner, SARS tax entity toggle, and sponsor barter summary. |
| **1103–1252** | `src/components/flips/FlipFundingCampaignCard.tsx` | Presentation | Extract funding campaign card, progress bar, funder terms, and sync button. |
| **1254–1385** | `src/components/flips/FlipRatesClearanceCard.tsx` | Presentation | Extract Section 118 RCC municipal clearance card and CoJ dispute alerts. |
| **1387–1399** | `src/components/flips/FlipActivePipeline.tsx` | Container | Render `ComplianceChecklist` and `CloudDriveLinkVault` in active pipeline container. |
| **1401–1592** | `src/components/flips/FlipMilestoneDrawdownCard.tsx` | Presentation | Extract contractor milestone draw gate cards and retention pool display. |
| **1594–1756** | `src/components/flips/FlipBOQTable.tsx` | Data Table | Extract Bill of Quantities data table, CSV export handler, phase/status dropdowns, and row delete. |
| **1758–1775** | `src/components/flips/FlipActivePipeline.tsx` | Presentation | Empty active pipeline state display. |
| **1780–2012** | `src/components/flips/FlipSoldArchiveView.tsx` | Presentation | Extract historical sold/completed deals archive grid, realized economics, and reopen actions. |
| **2015–2142** | `src/components/flips/modals/FlipExitModal.tsx` | Modal Dialog | Extract Mark as Flipped/Sold exit dialog. |
| **2144–2363** | `src/components/flips/modals/FlipToRentalModal.tsx` | Modal Dialog | Extract Convert to Rental (BRRRR transition) dialog. |
| **2365–2596** | `src/components/flips/modals/AddBOQItemModal.tsx` | Modal Dialog | Extract Add BOQ Item dialog with trade categories and sponsor barter inputs. |
| **2598–3165** | `src/components/flips/modals/FlipProjectModal.tsx` | Modal Dialog | Extract Unified Add & Edit Flip modal with PDF statement dropzone. |
| **3167–3325** | `src/components/flips/modals/SupplierDirectoryModal.tsx` | Modal Dialog | Extract local SA supplier book and contractor modal dialog. |
| **3326–3494** | `src/components/flips/modals/FlipFundingModal.tsx` | Modal Dialog | Extract Edit Deal Funding Campaign dialog. |
| **3496–3505** | `src/components/flips/DelayMatrixModal.tsx` | Modal Dialog | Mount existing delay sensitivity modal via modal manager. |

---

#### 4.2.3 Complete TypeScript Contract Signatures (Props & Hooks)

```typescript
// ==========================================
// src/hooks/flips/useFlipSelection.ts
// ==========================================
export interface UseFlipSelectionReturn {
  viewTab: 'active' | 'archive';
  setViewTab: (tab: 'active' | 'archive') => void;
  selectedFlipId: string;
  setSelectedFlipId: (id: string) => void;
  activeFlip: FlipProject | null;
  activeFlips: FlipProject[];
  completedFlips: FlipProject[];
  copiedWhatsApp: boolean;
  copyWhatsAppSummary: () => void;
  shareViaWhatsAppUrl: string;
}

export function useFlipSelection(): UseFlipSelectionReturn;

// ==========================================
// src/hooks/flips/useFlipCalculations.ts
// ==========================================
export interface UseFlipCalculationsReturn {
  financials: FlipFinancialSummary | null;
  fundingSummary: FundingCampaignSummary | null;
  milestoneTargets: { deposit: number; firstFix: number; finishes: number; retention: number } | null;
}

export function useFlipCalculations(activeFlip: FlipProject | null): UseFlipCalculationsReturn;

// ==========================================
// src/hooks/flips/useFlipModalManager.ts
// ==========================================
export type FlipModalType =
  | 'addFlip'
  | 'editFlip'
  | 'addBOQ'
  | 'exit'
  | 'convert'
  | 'funding'
  | 'supplier'
  | 'delayMatrix'
  | null;

export interface UseFlipModalManagerReturn {
  activeModal: FlipModalType;
  isOpen: (modal: FlipModalType) => boolean;
  openModal: (modal: Exclude<FlipModalType, null>) => void;
  closeModal: () => void;
}

export function useFlipModalManager(): UseFlipModalManagerReturn;

// ==========================================
// src/components/flips/FlipProjectTabs.tsx
// ==========================================
export interface FlipProjectTabsProps {
  activeFlips: FlipProject[];
  selectedFlipId: string;
  onSelectFlip: (id: string) => void;
  activeFlip: FlipProject | null;
  copiedWhatsApp: boolean;
  onCopyWhatsApp: () => void;
  whatsAppShareUrl: string;
}

// ==========================================
// src/components/flips/FlipProjectHeader.tsx
// ==========================================
export interface FlipProjectHeaderProps {
  flip: FlipProject;
  onUpdatePhase: (phase: FlipProject['currentPhase']) => void;
  onOpenEdit: () => void;
  onOpenExit: () => void;
  onOpenConvert: () => void;
}

// ==========================================
// src/components/flips/FlipMetricsCards.tsx
// ==========================================
export interface FlipMetricsCardsProps {
  flip: FlipProject;
  financials: FlipFinancialSummary;
  onOpenDelayMatrix: () => void;
}

// ==========================================
// src/components/flips/FlipBOQTable.tsx
// ==========================================
export interface FlipBOQTableProps {
  flip: FlipProject;
  onOpenAddBOQ: () => void;
  onUpdateBOQItem: (itemId: string, updates: Partial<BOQItem>) => void;
  onDeleteBOQItem: (itemId: string) => void;
  onExportCSV: () => void;
}

// ==========================================
// src/components/flips/FlipActivePipeline.tsx
// ==========================================
export interface FlipActivePipelineProps {
  activeFlip: FlipProject | null;
  financials: FlipFinancialSummary | null;
  fundingSummary: FundingCampaignSummary | null;
  onOpenModal: (modal: Exclude<FlipModalType, null>) => void;
  onUpdatePhase: (phase: FlipProject['currentPhase']) => void;
}

// ==========================================
// src/components/flips/FlipOperationalMathBanner.tsx
// ==========================================
export interface FlipOperationalMathBannerProps {
  flip: FlipProject;
  financials: FlipFinancialSummary;
}

// ==========================================
// src/components/flips/FlipFundingCampaignCard.tsx
// ==========================================
export interface FlipFundingCampaignCardProps {
  flip: FlipProject;
  fundingSummary: FundingCampaignSummary;
  onOpenFundingModal: () => void;
}

// ==========================================
// src/components/flips/FlipRatesClearanceCard.tsx
// ==========================================
export interface FlipRatesClearanceCardProps {
  flip: FlipProject;
  financials: FlipFinancialSummary;
  onUpdateClearance: (updates: Partial<NonNullable<FlipProject['municipalClearance']>>) => void;
}

// ==========================================
// src/components/flips/FlipMilestoneDrawdownCard.tsx
// ==========================================
export interface FlipMilestoneDrawdownCardProps {
  flip: FlipProject;
  milestoneDraws: { deposit: number; firstFix: number; finishes: number; retention: number };
  drawSchedule?: FlipProject['drawSchedule'];
  onToggleDrawPhase: (phaseKey: keyof NonNullable<FlipProject['drawSchedule']>) => void;
}

// ==========================================
// src/components/flips/FlipSoldArchiveView.tsx
// ==========================================
export interface FlipSoldArchiveViewProps {
  completedFlips: FlipProject[];
  onReopenFlip: (flipId: string, title: string) => void;
  onSwitchToActive: () => void;
}

// ==========================================
// src/components/flips/modals/FlipProjectModal.tsx
// ==========================================
export interface FlipProjectModalProps {
  isOpen: boolean;
  editingFlip: FlipProject | null;
  onClose: () => void;
  onSave: (payload: Partial<FlipProject>, isNew: boolean) => void;
}

// ==========================================
// src/components/flips/modals/AddBOQItemModal.tsx
// ==========================================
export interface AddBOQItemModalProps {
  isOpen: boolean;
  flipId: string;
  onClose: () => void;
  onAdd: (item: Omit<BOQItem, 'id'>) => void;
}

// ==========================================
// src/components/flips/modals/FlipExitModal.tsx
// ==========================================
export interface FlipExitModalProps {
  isOpen: boolean;
  flip: FlipProject;
  totalCostBasisZAR: number; // Accurately passed from flipFinancials.totalCostBasisZAR
  onClose: () => void;
  onFlipCompleted: (exitDetails: {
    actualSalePriceZAR: number;
    soldDate: string;
    exitNotes?: string;
  }) => void;
}

// ==========================================
// src/components/flips/modals/FlipToRentalModal.tsx
// ==========================================
export interface FlipToRentalModalProps {
  isOpen: boolean;
  flip: FlipProject;
  totalAllInCostZAR: number; // Accurately passed from flipFinancials.totalAllInCostZAR
  onClose: () => void;
  onConverted: (conversionDetails: {
    marketValuationZAR: number;
    monthlyGrossRentZAR: number;
    tenantName?: string;
  }) => void;
}

// ==========================================
// src/components/flips/modals/FlipFundingModal.tsx
// ==========================================
export interface FlipFundingModalProps {
  isOpen: boolean;
  flip: FlipProject;
  totalCostBasisZAR: number; // Accurately passed from flipFinancials.totalCostBasisZAR
  totalCapitalSecuredZAR: number;
  onClose: () => void;
  onSave: (campaign: Partial<FlipProject>) => void;
}

// ==========================================
// src/components/flips/modals/SupplierDirectoryModal.tsx
// ==========================================
export interface SupplierDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// src/components/flips/DelayMatrixModal.tsx
// ==========================================
export interface DelayMatrixModalProps {
  isOpen: boolean;
  flip: FlipProject | null;
  onClose: () => void;
}

// ==========================================
// src/hooks/flips/useFlipForm.ts
// ==========================================
export interface UseFlipFormReturn {
  formData: Partial<FlipProject>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<FlipProject>>>;
  errors: Record<string, string>;
  validate: () => boolean;
  resetForm: (initial?: FlipProject | null) => void;
}

export function useFlipForm(initialFlip?: FlipProject | null): UseFlipFormReturn;

// ==========================================
// src/hooks/flips/useBoqForm.ts
// ==========================================
export interface UseBoqFormReturn {
  formData: Partial<BOQItem>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<BOQItem>>>;
  isSponsored: boolean;
  setIsSponsored: (v: boolean) => void;
  resetForm: () => void;
}

export function useBoqForm(): UseBoqFormReturn;

// ==========================================
// src/hooks/flips/useFundingForm.ts
// ==========================================
export interface UseFundingFormReturn {
  fundingRequired: number;
  setFundingRequired: (v: number) => void;
  capitalRaised: number;
  setCapitalRaised: (v: number) => void;
  primaryFunderName: string;
  setPrimaryFunderName: (v: string) => void;
  primaryFunderContact: string;
  setPrimaryFunderContact: (v: string) => void;
  promisedReturnRatePercent: number;
  setPromisedReturnRatePercent: (v: number) => void;
  resetForm: (flip?: FlipProject | null) => void;
}

export function useFundingForm(flip?: FlipProject | null): UseFundingFormReturn;

// ==========================================
// src/hooks/flips/useBrrrrConvertForm.ts
// ==========================================
export interface UseBrrrrConvertFormReturn {
  marketValuation: number;
  setMarketValuation: (v: number) => void;
  grossRent: number;
  setGrossRent: (v: number) => void;
  tenantName: string;
  setTenantName: (v: string) => void;
  resetForm: (defaultValuation: number, defaultRent: number) => void;
}

export function useBrrrrConvertForm(): UseBrrrrConvertFormReturn;

// ==========================================
// src/hooks/flips/useFlipExitForm.ts
// ==========================================
export interface UseFlipExitFormReturn {
  salePrice: number;
  setSalePrice: (v: number) => void;
  soldDate: string;
  setSoldDate: (v: string) => void;
  exitNotes: string;
  setExitNotes: (v: string) => void;
  resetForm: (defaultPrice: number) => void;
}

export function useFlipExitForm(defaultPrice?: number): UseFlipExitFormReturn;
```

---

#### 4.2.4 Pure Calculations Extraction (`src/lib/calculations/flips.ts`)

```typescript
// src/lib/calculations/flips.ts

import { FlipProject, BOQItem, FundingSource, PropertyTitleType } from '@/types';

export interface FlipFinancialSummary {
  totalBOQBaselineZAR: number;
  totalBOQActualZAR: number;
  totalBOQVarianceZAR: number;
  effectiveRenoCostZAR: number;

  flipHoldingMonths: number;
  flipMonthlyHoldingCostZAR: number;
  totalHoldingCostZAR: number;

  totalCostBasisZAR: number;

  sec118ArrearsZAR: number;
  advanceCouncilDepositZAR: number;
  totalMunicipalClearanceOutlayZAR: number;
  rccStatus: string;
  isRccDisputed: boolean;

  exitCommissionPercent: number;
  exitCommissionZAR: number;

  totalAllInCostZAR: number;
  projectedNetProfitZAR: number;
  projectedRoiPercent: number;

  taxEntityType: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  effectiveTaxRatePercent: number;
  estimatedTaxProvisionZAR: number;
  netProfitAfterTaxZAR: number;
  afterTaxRoiPercent: number;

  totalSponsorItemsCount: number;
  sponsorRetailTotalZAR: number;
  sponsorCashTotalZAR: number;
  totalSponsorSavingsZAR: number;
  totalRetailBOQZAR: number;
  totalActualCashBOQZAR: number;

  milestoneDraws: {
    deposit: number;
    firstFix: number;
    finishes: number;
    retention: number;
  };
  totalRetentionHeldZAR: number;
}

export interface FundingCampaignSummary {
  fundingRequiredZAR: number;
  capitalRaisedZAR: number;
  capitalRemainingZAR: number;
  fundingProgressPercent: number;
  totalCapitalSecuredZAR: number;
  isFullyFunded: boolean;
}

export interface ArchivedFlipFinancials {
  fullCostBasisZAR: number;
  realizedSalePriceZAR: number;
  realizedNetProfitZAR: number;
  realizedRoiPercent: number;
  brrrrTargetValuationZAR: number;
  brrrrEquityCreatedZAR: number;
}

/**
 * Pure calculation of comprehensive financial metrics for an active Flip project.
 */
export function calculateFlipFinancials(flip: FlipProject): FlipFinancialSummary {
  const boq = flip.boq || [];
  const totalBOQBaselineZAR = boq.reduce((s, i) => s + (i.baselineTotalZAR || 0), 0);
  const totalBOQActualZAR = boq.reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0);
  const totalBOQVarianceZAR = totalBOQActualZAR - totalBOQBaselineZAR;

  const effectiveRenoCostZAR = totalBOQActualZAR > 0 ? totalBOQActualZAR : (flip.baselineRenovationBudgetZAR || 0);

  const flipHoldingMonths = flip.estimatedDurationMonths ?? 6;
  const flipMonthlyHoldingCostZAR = flip.monthlyHoldingCostZAR ?? 0;
  const totalHoldingCostZAR = flipHoldingMonths * flipMonthlyHoldingCostZAR;

  const totalCostBasisZAR = (flip.purchasePriceZAR || 0) + (flip.acquisitionCostsZAR || 0) + effectiveRenoCostZAR;

  const sec118ArrearsZAR = flip.municipalClearance?.sec118ArrearsZAR || 0;
  const advanceCouncilDepositZAR = flip.municipalClearance?.advanceCouncilDepositZAR || 0;
  const totalMunicipalClearanceOutlayZAR = sec118ArrearsZAR + advanceCouncilDepositZAR;
  const rccStatus = flip.municipalClearance?.rccStatus || 'Pending Application';
  const isRccDisputed = rccStatus === 'Disputed';

  const exitCommissionPercent = flip.exitCommissionPercent ?? 5.75;
  const exitCommissionZAR = Math.round((flip.targetExitPriceZAR || 0) * (exitCommissionPercent / 100));

  const totalAllInCostZAR = totalCostBasisZAR + totalHoldingCostZAR + totalMunicipalClearanceOutlayZAR + exitCommissionZAR;
  const projectedNetProfitZAR = (flip.targetExitPriceZAR || 0) - totalAllInCostZAR;
  const projectedRoiPercent = totalAllInCostZAR > 0 ? (projectedNetProfitZAR / totalAllInCostZAR) * 100 : 0;

  const taxEntityType = flip.taxEntityType || 'Company (27%)';
  const effectiveTaxRatePercent = taxEntityType === 'Company (27%)' ? 27 : taxEntityType === 'Individual (45%)' ? 45 : 0;
  const estimatedTaxProvisionZAR = Math.max(0, Math.round(projectedNetProfitZAR * (effectiveTaxRatePercent / 100)));
  const netProfitAfterTaxZAR = projectedNetProfitZAR - estimatedTaxProvisionZAR;
  const afterTaxRoiPercent = totalAllInCostZAR > 0 ? (netProfitAfterTaxZAR / totalAllInCostZAR) * 100 : 0;

  const sponsoredItems = boq.filter((i) => i.isSponsoredOrBarter);
  const totalSponsorItemsCount = sponsoredItems.length;
  const sponsorRetailTotalZAR = sponsoredItems.reduce((s, i) => s + (i.commercialRetailValueZAR || i.baselineTotalZAR || 0), 0);
  const sponsorCashTotalZAR = sponsoredItems.reduce((s, i) => s + (i.actualCashOutflowZAR !== undefined ? i.actualCashOutflowZAR : (i.actualCostZAR || i.baselineTotalZAR || 0)), 0);
  const totalSponsorSavingsZAR = Math.max(0, sponsorRetailTotalZAR - sponsorCashTotalZAR);
  const totalRetailBOQZAR = boq.reduce((s, i) => s + (i.commercialRetailValueZAR || i.actualCostZAR || i.baselineTotalZAR || 0), 0);
  const totalActualCashBOQZAR = totalBOQActualZAR;

  // Milestone Drawdown Allocations & Retention Pool (matching src/app/flips/page.tsx:574–592)
  const milestoneDraws = {
    deposit: boq.filter((i) => i.milestonePhase === 'Deposit').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
    firstFix: boq.filter((i) => i.milestonePhase === 'First Fix / Wet Works').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
    finishes: boq.filter((i) => i.milestonePhase === 'Finishes').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
    retention: boq.filter((i) => i.milestonePhase === 'Retention').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
  };
  const totalRetentionHeldZAR = boq.reduce((s, i) => {
    if (i.milestonePhase === 'Retention') return s + (i.actualCostZAR || i.baselineTotalZAR || 0);
    if (i.retentionPercent && i.retentionPercent > 0) {
      return s + Math.round((i.actualCostZAR || i.baselineTotalZAR || 0) * (i.retentionPercent / 100));
    }
    return s;
  }, 0) || Math.round(totalBOQActualZAR * 0.2);

  return {
    totalBOQBaselineZAR,
    totalBOQActualZAR,
    totalBOQVarianceZAR,
    effectiveRenoCostZAR,
    flipHoldingMonths,
    flipMonthlyHoldingCostZAR,
    totalHoldingCostZAR,
    totalCostBasisZAR,
    sec118ArrearsZAR,
    advanceCouncilDepositZAR,
    totalMunicipalClearanceOutlayZAR,
    rccStatus,
    isRccDisputed,
    exitCommissionPercent,
    exitCommissionZAR,
    totalAllInCostZAR,
    projectedNetProfitZAR,
    projectedRoiPercent,
    taxEntityType,
    effectiveTaxRatePercent,
    estimatedTaxProvisionZAR,
    netProfitAfterTaxZAR,
    afterTaxRoiPercent,
    totalSponsorItemsCount,
    sponsorRetailTotalZAR,
    sponsorCashTotalZAR,
    totalSponsorSavingsZAR,
    totalRetailBOQZAR,
    totalActualCashBOQZAR,
    milestoneDraws,
    totalRetentionHeldZAR,
  };
}

/**
 * Computes funding campaign progress and targets against linked debt tranches.
 * Operates on flat fields of FlipProject from src/types/index.ts (lines 304–305)
 * matching src/app/flips/page.tsx:637–641.
 */
export function calculateFundingCampaignSummary(
  flip: FlipProject,
  linkedFunding: FundingSource[],
  totalCostBasisZAR: number
): FundingCampaignSummary {
  const totalCapitalSecuredZAR = linkedFunding.reduce((s, f) => s + (f.capitalAmountZAR || 0), 0);
  const fundingRequiredZAR = flip.fundingRequiredZAR ?? Math.round(totalCostBasisZAR * 0.70);
  const capitalRaisedZAR = flip.capitalRaisedZAR ?? totalCapitalSecuredZAR;
  const capitalRemainingZAR = Math.max(0, fundingRequiredZAR - capitalRaisedZAR);
  const fundingProgressPercent = fundingRequiredZAR > 0 ? Math.min(100, Math.round((capitalRaisedZAR / fundingRequiredZAR) * 100)) : 0;
  const isFullyFunded = capitalRaisedZAR >= fundingRequiredZAR;

  return {
    fundingRequiredZAR,
    capitalRaisedZAR,
    capitalRemainingZAR,
    fundingProgressPercent,
    totalCapitalSecuredZAR,
    isFullyFunded,
  };
}

/**
 * Computes historical realized economics for an archived flip (Sold or BRRRR).
 * Operates on flat fields of FlipProject from src/types/index.ts (lines 314–320)
 * matching src/app/flips/page.tsx:1847–1870.
 */
export function calculateArchivedFlipFinancials(flip: FlipProject): ArchivedFlipFinancials {
  const isBrrrr = flip.exitStrategy === 'BRRRR';
  const totalBoqActual = (flip.boq || []).reduce(
    (sum, b) => sum + (b.actualCostZAR || b.baselineTotalZAR || 0),
    0
  );
  const renoCost = totalBoqActual > 0 ? totalBoqActual : (flip.baselineRenovationBudgetZAR || 0);
  const costBasis =
    (flip.purchasePriceZAR || 0) +
    (flip.acquisitionCostsZAR || 0) +
    renoCost;
  const holdingMonths = flip.estimatedDurationMonths ?? 6;
  const totalHoldingCost = holdingMonths * (flip.monthlyHoldingCostZAR ?? 0);
  const sec118Cost =
    (flip.municipalClearance?.sec118ArrearsZAR || 0) +
    (flip.municipalClearance?.advanceCouncilDepositZAR || 0);
  const salePrice = flip.actualSalePriceZAR || flip.targetExitPriceZAR || 0;
  const exitCommRate = typeof flip.exitCommissionPercent === 'number' ? flip.exitCommissionPercent : 5.75;
  const exitCommission = isBrrrr ? 0 : Math.round(salePrice * (exitCommRate / 100));
  const fullCostBasisZAR = costBasis + totalHoldingCost + sec118Cost + exitCommission;
  const realizedNetProfitZAR = salePrice - fullCostBasisZAR;
  const realizedRoiPercent = fullCostBasisZAR > 0 ? (realizedNetProfitZAR / fullCostBasisZAR) * 100 : 0;
  const brrrrTargetValuationZAR = flip.targetExitPriceZAR || fullCostBasisZAR;
  const brrrrEquityCreatedZAR = Math.max(0, brrrrTargetValuationZAR - fullCostBasisZAR);

  return {
    fullCostBasisZAR,
    realizedSalePriceZAR: salePrice,
    realizedNetProfitZAR,
    realizedRoiPercent,
    brrrrTargetValuationZAR,
    brrrrEquityCreatedZAR,
  };
}
```

---

#### 4.2.5 Refactored Thin View Component Sketch (<90 LOC)

```tsx
'use client';

import React from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { useFlipSelection } from '@/hooks/flips/useFlipSelection';
import { useFlipModalManager } from '@/hooks/flips/useFlipModalManager';
import { useFlipCalculations } from '@/hooks/flips/useFlipCalculations';
import FlipProjectTabs from '@/components/flips/FlipProjectTabs';
import FlipActivePipeline from '@/components/flips/FlipActivePipeline';
import FlipSoldArchiveView from '@/components/flips/FlipSoldArchiveView';
import FlipProjectModal from '@/components/flips/modals/FlipProjectModal';
import AddBOQItemModal from '@/components/flips/modals/AddBOQItemModal';
import FlipExitModal from '@/components/flips/modals/FlipExitModal';
import FlipToRentalModal from '@/components/flips/modals/FlipToRentalModal';
import FlipFundingModal from '@/components/flips/modals/FlipFundingModal';
import SupplierDirectoryModal from '@/components/flips/modals/SupplierDirectoryModal';
import DelayMatrixModal from '@/components/flips/DelayMatrixModal';
import { PlusCircle, BookOpen } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export default function FlipsManagerPage() {
  const selection = useFlipSelection();
  const modals = useFlipModalManager();
  const { financials, fundingSummary } = useFlipCalculations(selection.activeFlip);
  const reopenFlip = usePortfolioStore((s) => s.reopenFlip);

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Buy-and-Flip Deals"
        subtitle="Capex renovation budgets, Section 118 clearance, syndicate debt facilities, and trade barter accounting"
        actionButton={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => modals.openModal('supplier')}
              className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Supplier Directory</span>
            </button>
            <button
              onClick={() => modals.openModal('addFlip')}
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Flip Project</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        <FlipProjectTabs
          activeFlips={selection.activeFlips}
          selectedFlipId={selection.selectedFlipId}
          onSelectFlip={selection.setSelectedFlipId}
          activeFlip={selection.activeFlip}
          copiedWhatsApp={selection.copiedWhatsApp}
          onCopyWhatsApp={selection.copyWhatsAppSummary}
          whatsAppShareUrl={selection.shareViaWhatsAppUrl}
        />

        {selection.viewTab === 'active' ? (
          <FlipActivePipeline
            activeFlip={selection.activeFlip}
            financials={financials}
            fundingSummary={fundingSummary}
            onOpenModal={modals.openModal}
            onUpdatePhase={(phase) => selection.activeFlip && usePortfolioStore.getState().updateFlipPhase(selection.activeFlip.id, phase)}
          />
        ) : (
          <FlipSoldArchiveView
            completedFlips={selection.completedFlips}
            onReopenFlip={reopenFlip}
            onSwitchToActive={() => selection.setViewTab('active')}
          />
        )}
      </main>

      {/* Decomposed Modals */}
      <FlipProjectModal isOpen={modals.isOpen('addFlip') || modals.isOpen('editFlip')} editingFlip={modals.isOpen('editFlip') ? selection.activeFlip : null} onClose={modals.closeModal} />
      <AddBOQItemModal isOpen={modals.isOpen('addBOQ')} flipId={selection.selectedFlipId} onClose={modals.closeModal} />
      {selection.activeFlip && (
        <>
          <FlipExitModal
            isOpen={modals.isOpen('exit')}
            flip={selection.activeFlip}
            totalCostBasisZAR={financials?.totalCostBasisZAR || selection.activeFlip.purchasePriceZAR}
            onClose={modals.closeModal}
            onFlipCompleted={modals.closeModal}
          />
          <FlipToRentalModal
            isOpen={modals.isOpen('convert')}
            flip={selection.activeFlip}
            totalAllInCostZAR={financials?.totalAllInCostZAR || selection.activeFlip.purchasePriceZAR}
            onClose={modals.closeModal}
            onConverted={modals.closeModal}
          />
          <FlipFundingModal
            isOpen={modals.isOpen('funding')}
            flip={selection.activeFlip}
            totalCostBasisZAR={financials?.totalCostBasisZAR || selection.activeFlip.purchasePriceZAR}
            totalCapitalSecuredZAR={fundingSummary?.totalCapitalSecuredZAR || 0}
            onClose={modals.closeModal}
          />
        </>
      )}
      <SupplierDirectoryModal isOpen={modals.isOpen('supplier')} onClose={modals.closeModal} />
      <DelayMatrixModal isOpen={modals.isOpen('delayMatrix')} onClose={modals.closeModal} />
    </div>
  );
}
```

---

### 4.3 Zustand Store Slicing Blueprint (`src/lib/store/usePortfolioStore.ts`)

#### 4.3.1 Proposed Target Directory Layout

```
src/lib/store/
├── index.ts                           # Re-exports usePortfolioStore, usePortfolioSummary, types
├── usePortfolioStore.ts               # Root store assembling all slices with persist middleware
├── initialData.ts                     # Pre-seeded demo dataset
├── types.ts                           # RootStoreState & individual Slice interfaces
├── slices/
│   ├── rentalSlice.ts                 # Rentals, leases, maintenance, sale/reopen, BRRRR refinance
│   ├── flipSlice.ts                   # Flips, BOQ items, stage transitions, completions, BRRRR conversion
│   ├── opportunitySlice.ts            # Opportunities, deal pipeline stages, promotion, scenario cloning
│   ├── fundingSlice.ts                # Debt/equity facilities, tranches, deal delay sync
│   ├── utilitiesSlice.ts              # Utility statements, meter readings, dispute state machine, meter registry
│   ├── tenantAccountingSlice.ts       # Tenant payments, deposit applications, write-offs, opening balance
│   ├── taskSlice.ts                   # Tasks, recurrence engine, and task completion actions
│   ├── directorySlice.ts              # Local suppliers & municipal contacts directory
│   ├── settingsSlice.ts               # Investor profile, AI settings, analyzer draft, forecast view, guide progress
│   └── systemSlice.ts                 # Cloud hydration, demo reset, clear, JSON import/export
├── utils/
│   └── taskSync.ts                    # Shared AGM & lease expiry automated task sync engine (prevents circular slice cycles)
├── persistence/
│   ├── portfolioMigrations.ts         # Extracted schema auto-healing & persist merge logic
│   └── hydrationHelpers.ts            # Guide step sanitization & negative arrears repair
└── selectors/
    ├── portfolioSummarySelector.ts    # Extracted portfolio summary calculation
    └── equityAlertsSelector.ts        # Extracted equity alert extraction
```

---

#### 4.3.2 10-Slice Decomposition & Domain Boundaries

Each slice isolates a single cohesive subdomain while participating in the shared Zustand state via `StateCreator<RootStoreState, [['zustand/persist', unknown]], [], DomainSlice>`:

1. **`rentalSlice`**: Manages `rentals: RentalProperty[]`, rental lifecycle, maintenance logs, disposal, and BRRRR equity release.
2. **`flipSlice`**: Manages `flips: FlipProject[]`, BOQ costing items, phase status, completion, and BRRRR conversion.
3. **`opportunitySlice`**: Manages `opportunities: OpportunityDeal[]`, triage stages, passes, duplicates, and pipeline promotion.
4. **`fundingSlice`**: Manages `funding: FundingSource[]`, debt tranches, and facility delay synchronization.
5. **`utilitiesSlice`**: Manages utility statements, meter readings, dispute resolution engine, and hardware registry.
6. **`tenantAccountingSlice`**: Manages tenant payment records, deposit applications, arrears write-offs, and ledger transactions.
7. **`taskSlice`**: Manages `tasks: TaskItem[]`, task completion, recurring tasks, and task list operations.
8. **`directorySlice`**: Manages `suppliers: LocalSupplier[]` and `municipalDirectory: MunicipalContact[]`.
9. **`settingsSlice`**: Manages `liquidCapitalReserve`, `investorProfile`, `analyzerDraft`, `aiSettings`, `rentalForecastView`, and onboarding progress.
10. **`systemSlice`**: Manages cloud state hydration, demo data resets, JSON backup export/import, and portfolio summary getters.

##### Circular Dependency Prevention Architecture (`src/lib/store/utils/taskSync.ts`)

A critical architectural risk in store slice decomposition is cyclic dependency graphs between entity mutation slices (`rentalSlice`, `flipSlice`, `opportunitySlice`) and `taskSlice`.

In the existing monolith (`usePortfolioStore.ts`), whenever a rental is created, updated, or imported, two automated task sync routines execute:
- `syncAgmReminderTask(tasks, entityType, id, title, agmDate)`
- `syncLeaseExpiryTasks(tasks, propertyId, title, leases)`

Similarly, flip creation triggers `syncAgmReminderTask`, and opportunity triage triggers AGM synchronization.

If these task synchronization routines were placed inside `src/lib/store/slices/taskSlice.ts`, then:
- `rentalSlice` would need to import from `taskSlice.ts`.
- `flipSlice` would need to import from `taskSlice.ts`.
- `opportunitySlice` would need to import from `taskSlice.ts`.
- Slices importing each other directly creates circular module dependencies (`rentalSlice` $\to$ `taskSlice` $\to$ `rentalSlice`), which causes `undefined` slice creator imports at runtime during Zustand store initialization in Vite and Next.js.

**Architectural Prevention**:
Factor out `syncAgmReminderTask` and `syncLeaseExpiryTasks` into a zero-dependency, pure leaf utility module: `src/lib/store/utils/taskSync.ts`.
Both `rentalSlice`, `flipSlice`, `opportunitySlice`, and `taskSlice` import from `taskSync.ts`, creating a strictly acyclic DAG (Directed Acyclic Graph):

```
rentalSlice       ──┐
flipSlice         ──┼─► [ src/lib/store/utils/taskSync.ts ]
opportunitySlice  ──┤
taskSlice         ──┘
```

This guarantees zero circular imports and enables isolated unit testing of lease expiry and AGM automation rules.

---

#### 4.3.3 TypeScript Slice Interfaces & Action Signatures

```typescript
// src/lib/store/types.ts

import { StateCreator } from 'zustand';
import {
  RentalProperty,
  ExtractedRentalUnit,
  RentalRefinanceParams,
  FlipProject,
  BOQItem,
  FlipToRentalConversionParams,
  OpportunityDeal,
  PassReason,
  FundingSource,
  UtilityStatement,
  MeterReading,
  PropertyMeter,
  TenantPaymentRecord,
  ArrearsWriteOff,
  Transaction,
  TaskItem,
  LocalSupplier,
  MunicipalContact,
  InvestorProfile,
  AnalyzerDraft,
  AiSettings,
  PortfolioSummary,
} from '@/types';
import type { PortfolioStateSnapshot } from '@/lib/db/mergePortfolioState';

// 1. Rental Slice
export interface RentalSliceState {
  rentals: RentalProperty[];
}
export interface RentalSliceActions {
  addRental: (rental: RentalProperty) => void;
  bulkAddRentals: (rentals: RentalProperty[]) => { addedCount: number; duplicateCount: number };
  reconcileImportedRentals: (units: ExtractedRentalUnit[]) => {
    updatedCount: number;
    newCount: number;
    addedCount: number;
    varianceCount: number;
  };
  updateRental: (id: string, updates: Partial<RentalProperty>) => void;
  deleteRental: (id: string) => void;
  addMaintenanceLog: (rentalId: string, log: Omit<RentalProperty['maintenanceHistory'][0], 'id'>) => void;
  markRentalAsSold: (rentalId: string, actualSalePrice: number, netCashProceeds: number, soldDate: string, exitNotes?: string) => void;
  reopenRental: (rentalId: string) => void;
  refinanceRental: (params: RentalRefinanceParams) => void;
}
export type RentalSlice = RentalSliceState & RentalSliceActions;

// 2. Flip Slice
export interface FlipSliceState {
  flips: FlipProject[];
}
export interface FlipSliceActions {
  addFlip: (flip: FlipProject) => void;
  bulkAddFlips: (flips: FlipProject[]) => { addedCount: number; duplicateCount: number };
  updateFlip: (id: string, updates: Partial<FlipProject>) => void;
  deleteFlip: (id: string) => void;
  addBOQItem: (flipId: string, item: Omit<BOQItem, 'id'>) => void;
  updateBOQItem: (flipId: string, boqId: string, updates: Partial<BOQItem>) => void;
  deleteBOQItem: (flipId: string, boqId: string) => void;
  markFlipAsCompleted: (flipId: string, actualSalePrice: number, netCashProceeds: number, soldDate: string, exitNotes?: string) => void;
  reopenFlip: (flipId: string) => void;
  convertFlipToRental: (params: FlipToRentalConversionParams) => RentalProperty;
}
export type FlipSlice = FlipSliceState & FlipSliceActions;

// 3. Opportunity Slice
export interface OpportunitySliceState {
  opportunities: OpportunityDeal[];
}
export interface OpportunitySliceActions {
  addOpportunity: (opp: OpportunityDeal) => void;
  bulkAddOpportunities: (opps: OpportunityDeal[]) => { addedCount: number; duplicateCount: number };
  updateOpportunity: (id: string, updates: Partial<OpportunityDeal>) => void;
  deleteOpportunity: (id: string) => void;
  duplicateOpportunity: (oppId: string) => void;
  passOpportunity: (id: string, reason: PassReason, notes?: string) => void;
  reactivateOpportunity: (id: string) => void;
  advanceOpportunityStage: (id: string) => void;
  promoteOpportunityToFlip: (oppId: string) => void;
  promoteOpportunityToRental: (oppId: string) => void;
}
export type OpportunitySlice = OpportunitySliceState & OpportunitySliceActions;

// 4. Funding Slice
export interface FundingSliceState {
  funding: FundingSource[];
}
export interface FundingSliceActions {
  addFunding: (source: FundingSource) => void;
  updateFunding: (id: string, updates: Partial<FundingSource>) => void;
  deleteFunding: (id: string) => void;
  syncFundingWithDealDelay: (fundingId: string, delayDays: number, reason: string) => void;
}
export type FundingSlice = FundingSliceState & FundingSliceActions;

// 5. Utilities Slice
export interface UtilitiesSliceActions {
  addUtilityStatement: (propertyId: string, statement: UtilityStatement) => void;
  deleteUtilityStatement: (propertyId: string, statementId: string) => void;
  setStatementTenantBillingMethod: (propertyId: string, statementId: string, method: 'municipal_statement' | 'independent_actuals') => void;
  addMeterReading: (propertyId: string, reading: Omit<MeterReading, 'id' | 'createdAt'>) => void;
  deleteMeterReading: (propertyId: string, readingId: string) => void;
  updateMeterReadingDispute: (propertyId: string, readingId: string, disputeData: Partial<MeterReading>) => void;
  addPropertyMeter: (propertyId: string, meter: Omit<PropertyMeter, 'id' | 'createdAt'>) => void;
  updatePropertyMeter: (propertyId: string, meterId: string, updates: Partial<PropertyMeter>) => void;
  deletePropertyMeter: (propertyId: string, meterId: string) => void;
}
export type UtilitiesSlice = UtilitiesSliceActions;

// 6. Tenant Accounting Slice
export interface TenantAccountingSliceActions {
  recordTenantPayment: (propertyId: string, payment: Omit<TenantPaymentRecord, 'id' | 'createdAt' | 'propertyId'> & { id?: string; propertyId?: string }) => void;
  updateTenantPayment: (propertyId: string, paymentId: string, updates: Partial<TenantPaymentRecord>) => void;
  deleteTenantPayment: (propertyId: string, paymentId: string) => void;
  recordArrearsWriteOff: (propertyId: string, writeOff: Omit<ArrearsWriteOff, 'id' | 'createdAt'> & { id?: string }) => void;
  deleteArrearsWriteOff: (propertyId: string, writeOffId: string) => void;
  updateArrearsOpeningBalance: (propertyId: string, openingBalance: number, leaseId?: string) => void;
  addTransaction: (propertyId: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (propertyId: string, transactionId: string) => void;
}
export type TenantAccountingSlice = TenantAccountingSliceActions;

// 7. Task Slice
export interface TaskSliceState {
  tasks: TaskItem[];
}
export interface TaskSliceActions {
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  toggleTaskStatus: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;
}
export type TaskSlice = TaskSliceState & TaskSliceActions;

// 8. Directory Slice
export interface DirectorySliceState {
  suppliers: LocalSupplier[];
  municipalDirectory: MunicipalContact[];
}
export interface DirectorySliceActions {
  addSupplier: (supplier: LocalSupplier) => void;
  deleteSupplier: (id: string) => void;
  addMunicipalContact: (contact: Omit<MunicipalContact, 'id'>) => void;
  updateMunicipalContact: (id: string, updates: Partial<MunicipalContact>) => void;
  deleteMunicipalContact: (id: string) => void;
  resetMunicipalDirectory: () => void;
}
export type DirectorySlice = DirectorySliceState & DirectorySliceActions;

// 9. Settings Slice
export interface SettingsSliceState {
  liquidCapitalReserve: number;
  investorProfile: InvestorProfile;
  analyzerDraft: AnalyzerDraft;
  aiSettings: AiSettings;
  rentalForecastView: 'wealth-only' | 'cashflow-only';
  completedGuideSteps: string[];
}
export interface SettingsSliceActions {
  updateLiquidReserve: (amount: number) => void;
  updateInvestorProfile: (profile: Partial<InvestorProfile>) => void;
  updateAiSettings: (settings: Partial<AiSettings>) => void;
  updateAnalyzerDraft: (patch: Partial<AnalyzerDraft>) => void;
  setRentalForecastView: (mode: 'wealth-only' | 'cashflow-only') => void;
  toggleGuideStep: (stepId: string) => void;
  resetGuideProgress: () => void;
}
export type SettingsSlice = SettingsSliceState & SettingsSliceActions;

// 10. System Slice
export interface SystemSliceActions {
  getSummary: () => PortfolioSummary;
  hydrateFromCloudState: (snapshot: PortfolioStateSnapshot) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  importPortfolioJSON: (jsonString: string) => boolean;
}
export type SystemSlice = SystemSliceActions;

// Root Store Combined Type
export type RootStoreState = RentalSlice &
  FlipSlice &
  OpportunitySlice &
  FundingSlice &
  UtilitiesSlice &
  TenantAccountingSlice &
  TaskSlice &
  DirectorySlice &
  SettingsSlice &
  SystemSlice;
```

---

#### 4.3.4 Root Store Facade Assembly & 100% Backward Compatibility

```typescript
// src/lib/store/usePortfolioStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RootStoreState } from './types';
import { createRentalSlice } from './slices/rentalSlice';
import { createFlipSlice } from './slices/flipSlice';
import { createOpportunitySlice } from './slices/opportunitySlice';
import { createFundingSlice } from './slices/fundingSlice';
import { createUtilitiesSlice } from './slices/utilitiesSlice';
import { createTenantAccountingSlice } from './slices/tenantAccountingSlice';
import { createTaskSlice } from './slices/taskSlice';
import { createDirectorySlice } from './slices/directorySlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createSystemSlice } from './slices/systemSlice';
import { portfolioPersistConfig } from './persistence/portfolioMigrations';

export const usePortfolioStore = create<RootStoreState>()(
  persist(
    (...a) => ({
      ...createRentalSlice(...a),
      ...createFlipSlice(...a),
      ...createOpportunitySlice(...a),
      ...createFundingSlice(...a),
      ...createUtilitiesSlice(...a),
      ...createTenantAccountingSlice(...a),
      ...createTaskSlice(...a),
      ...createDirectorySlice(...a),
      ...createSettingsSlice(...a),
      ...createSystemSlice(...a),
    }),
    portfolioPersistConfig
  )
);

// Preserve 100% backward-compatible named exports
export { computePortfolioSummary, usePortfolioSummary } from './selectors/portfolioSummarySelector';
export { syncLeaseExpiryTasks } from './utils/taskSync';
export { sanitizeCompletedGuideSteps } from './persistence/hydrationHelpers';
```

**Critical Test Harness Backward-Compatibility Protection**:  
Because `usePortfolioStore` retains its exact export signature and state schema, **all 23 source consumer files and 16 Vitest test suites continue working without changing a single line of consumer code**.

Specifically, two existing Vitest integration test suites directly import named utilities from `usePortfolioStore.ts`:
1. **`src/lib/store/__tests__/usePortfolioStore.leaseExpiry.test.ts` (line 2)**:
   ```typescript
   import { usePortfolioStore, syncLeaseExpiryTasks } from '../usePortfolioStore';
   ```
2. **`src/lib/store/__tests__/guideProgress.test.ts` (line 2)**:
   ```typescript
   import { usePortfolioStore, sanitizeCompletedGuideSteps } from '../usePortfolioStore';
   ```

By explicitly re-exporting `syncLeaseExpiryTasks` (from `./utils/taskSync`) and `sanitizeCompletedGuideSteps` (from `./persistence/hydrationHelpers`) alongside `computePortfolioSummary` and `usePortfolioSummary` (from `./selectors/portfolioSummarySelector`) from the root store facade, these test suites are protected from breaking, guaranteeing zero regressions during Phase 3 execution.

---

## 5. Requirement 4 (R4): Phased Refactoring Execution Roadmap

### 5.1 Refactoring Paradigms: Dependency Inversion & Incremental Safety

The refactoring roadmap is organized into **dependency-ordered phases and sub-phases**. Each phase follows the **Dependency Inversion Principle**: leaf-level, zero-dependency modules (pure calculations) are extracted first, followed by store slices and persistence utilities, then modal dialogs and headless hooks, before presentation views and page layout shells are sliced.

To eliminate the hazards of "Big-Bang" refactoring across massive monoliths (`src/app/rentals/page.tsx` with 5,172 LOC and `src/app/flips/page.tsx` with 3,510 LOC), **Phase 4 and Phase 5 are decomposed into four safe, independently verifiable sub-phases (4A, 4B, 5A, and 5B)**:

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASE DEPENDENCY ORDER                                          |
|                                                                                                    |
|  Phase 1: Pure Calculations Extraction (Zero UI Risk)                                              |
|  - `src/lib/calculations/rentals.ts`                                                               |
|  - `src/lib/calculations/flips.ts`                                                                 |
|  - `src/lib/calculations/portfolioSummary.ts`                                                      |
|                                                                                                    |
|  Phase 2: Persistence & Schema Migration Extraction                                                |
|  - `src/lib/store/persistence/portfolioMigrations.ts`                                              |
|  - `src/lib/store/persistence/hydrationHelpers.ts`                                                 |
|  - `src/lib/store/selectors/portfolioSummarySelector.ts`                                           |
|                                                                                                    |
|  Phase 3: Zustand Slice Decomposition (Root Facade Preserved)                                      |
|  - Cycle prevention utility: `src/lib/store/utils/taskSync.ts`                                     |
|  - 10 slices created in `src/lib/store/slices/`                                                    |
|  - Backward-compatible facade in `src/lib/store/usePortfolioStore.ts`                              |
|                                                                                                    |
|  Phase 4A: Isolated Dialog & Modal Extraction                                                      |
|  - `src/components/rentals/modals/` (8 modal dialogs) & `src/components/flips/modals/` (6 modals)   |
|  - Modals mounted in existing pages; ~3,800 LOC extracted; Playwright dialog E2E verified          |
|                                                                                                    |
|  Phase 4B: Headless Custom Hooks & State Extraction                                                |
|  - `src/hooks/rentals/` & `src/hooks/flips/` (Modal managers, form controllers, selection hooks)   |
|  - 41 loose `useState` hooks removed from page bodies; unit & integration tests verified           |
|                                                                                                    |
|  Phase 5A: Decomposed Sub-Tabs & Presentational Cards                                              |
|  - `RentalCard.tsx`, `RentalFinancialsTab.tsx`, `RentalPaymentsTab.tsx`, `RentalForecastSection`   |
|  - `FlipProjectTabs.tsx`, `FlipMetricsCards.tsx`, `FlipBOQTable.tsx`, `FlipActivePipeline.tsx`    |
|  - Full prop propagation chains connected; ledger and card interactions verified                   |
|                                                                                                    |
|  Phase 5B: Ultra-Thin Page Layout Shell Orchestration                                              |
|  - Extract `RentalSummaryKpis.tsx`, `RentalViewTabs.tsx`, `FlipSoldArchiveView.tsx`                |
|  - Ultra-thin page shells: `src/app/rentals/page.tsx` (<120 LOC) & `src/app/flips/page.tsx` (<90) |
|  - Full regression pass: 481 Vitest unit tests + TypeScript typecheck + 10 Playwright E2E suites   |
+----------------------------------------------------------------------------------------------------+
```

---

### 5.2 Detailed Phase Execution Plan (Phases 1 through 5)

#### Phase 1: Pure Mathematical & Algorithmic Extraction (Zero UI Risk)
1. **Scope**: Extract all financial algorithms, tax provision math, and variance formulas into deterministic functions in `src/lib/calculations/`.
2. **Files Created**:
   - `src/lib/calculations/rentals.ts`
   - `src/lib/calculations/__tests__/rentals.test.ts`
   - `src/lib/calculations/flips.ts`
   - `src/lib/calculations/__tests__/flips.test.ts`
   - `src/lib/calculations/portfolioSummary.ts`
3. **Execution Steps**:
   - Implement `calculateRentalTaxProvision`, `calculateGrossYield`, `calculateBrrrrRefinanceProposal` (reusing `calculateMonthlyBondRepayment` from `@/lib/calculations/propertyMetrics`), `calculateAgencyCommission`, and `calculateDisposalMetrics`.
   - Implement `calculateFlipFinancials` (with live BOQ milestone filtering), `calculateFundingCampaignSummary` (operating on flat `FlipProject` fields), `calculateArchivedFlipFinancials`, and `calculateMilestonePhaseTargets`.
   - Write comprehensive Vitest unit tests verifying exact formula parity with the original inline code.
4. **Verification Checkpoint**:
   - `npx vitest run src/lib/calculations/`
   - `npx tsc --noEmit`
5. **Definition of Done**: 100% pure mathematical isolation; zero React or Zustand imports in `src/lib/calculations/`; all calculation unit tests passing.

#### Phase 2: Persistence, Migration & Selectors Extraction
1. **Scope**: Decouple the 146-line schema auto-healing migration logic, negative arrears repair, guide step sanitization, and portfolio summary calculations from the store file.
2. **Files Created**:
   - `src/lib/store/persistence/portfolioMigrations.ts`
   - `src/lib/store/persistence/hydrationHelpers.ts`
   - `src/lib/store/selectors/portfolioSummarySelector.ts`
3. **Execution Steps**:
   - Move `merge` configuration, "clearwater" migration heuristics, and negative arrears auto-healing into `portfolioMigrations.ts`.
   - Move `sanitizeCompletedGuideSteps` into `hydrationHelpers.ts`.
   - Move `computePortfolioSummary`, `computeEquityAlerts`, and `usePortfolioSummary` into `portfolioSummarySelector.ts`.
4. **Verification Checkpoint**:
   - `npx vitest run src/lib/store/__tests__/portfolioSummaryTax.test.ts`
   - `npx vitest run src/lib/db/__tests__/mergePortfolioState.test.ts`
   - `npx tsc --noEmit`
5. **Definition of Done**: Persist migrations and selector logic decoupled from root store; storage key `sa_property_portfolio_hub_v1` pinned; all persistence specs passing.

#### Phase 3: Zustand Slice Pattern Migration (Root Facade Preserved)
1. **Scope**: Decompose `usePortfolioStore.ts` into 10 domain slices in `src/lib/store/slices/` while preventing circular slice imports via a dedicated `taskSync.ts` utility.
2. **Files Created**:
   - `src/lib/store/types.ts`
   - `src/lib/store/utils/taskSync.ts` (Acyclic task sync engine for AGM and 60-day lease expiries)
   - `src/lib/store/slices/rentalSlice.ts`
   - `src/lib/store/slices/flipSlice.ts`
   - `src/lib/store/slices/opportunitySlice.ts`
   - `src/lib/store/slices/fundingSlice.ts`
   - `src/lib/store/slices/utilitiesSlice.ts`
   - `src/lib/store/slices/tenantAccountingSlice.ts`
   - `src/lib/store/slices/taskSlice.ts`
   - `src/lib/store/slices/directorySlice.ts`
   - `src/lib/store/slices/settingsSlice.ts`
   - `src/lib/store/slices/systemSlice.ts`
3. **Execution Steps**:
   - Extract `syncAgmReminderTask` and `syncLeaseExpiryTasks` to `src/lib/store/utils/taskSync.ts`.
   - Implement slice creators using the Zustand slice pattern (`StateCreator<RootStoreState, [['zustand/persist', unknown]], [], DomainSlice>`).
   - Assemble `RootStoreState` in `src/lib/store/usePortfolioStore.ts` combining all 10 slices with `portfolioPersistConfig`.
   - Re-export `computePortfolioSummary`, `usePortfolioSummary`, `syncLeaseExpiryTasks`, and `sanitizeCompletedGuideSteps` from the root facade.
4. **Verification Checkpoint**:
   - `npx vitest run src/lib/store/__tests__/usePortfolioStore.leaseExpiry.test.ts`
   - `npx vitest run src/lib/store/__tests__/guideProgress.test.ts`
   - `npx vitest run src/lib/store/__tests__/` (All 16 store suites must pass with 0 errors).
   - `npm test` (All 481 tests passing).
   - `npx tsc --noEmit`
5. **Definition of Done**: 10 domain slices assembled cleanly; zero circular module imports; root facade preserves 100% backward compatibility for existing consumers and test suites.

#### Phase 4A: Isolated Dialog & Modal Extraction
1. **Scope**: Extract all 14 heavy inline modal dialogs from `rentals/page.tsx` (lines 2827–5161, ~2,334 lines) and `flips/page.tsx` (lines 2015–3505, ~1,490 lines) into isolated, self-contained dialog components.
2. **Files Created**:
   - `src/components/rentals/modals/`: `RentalFormModal.tsx`, `RefinanceModal.tsx`, `RefinanceAuditModal.tsx`, `MaintenanceModal.tsx`, `ExitSaleModal.tsx`, `SarbPmtModal.tsx`, `PaymentModal.tsx`, `WriteOffModal.tsx`.
   - `src/components/flips/modals/`: `FlipProjectModal.tsx`, `AddBOQItemModal.tsx`, `FlipExitModal.tsx`, `FlipToRentalModal.tsx`, `FlipFundingModal.tsx`, `SupplierDirectoryModal.tsx`.
   - Decouple heavy modal monoliths `MeterReadingsModal.tsx` and `TenantStatement.tsx` by isolating tariff math and statement print engines.
3. **Execution Steps**:
   - Move modal JSX markup into dedicated modal components with strict TypeScript prop contracts.
   - Mount extracted modals directly inside `rentals/page.tsx` and `flips/page.tsx`, binding them to the existing page state variables and handlers.
   - Pass `currentLiquidReserve={summary.liquidCapitalReserve}` to `RefinanceModal`.
   - Pass `flipFinancials.totalCostBasisZAR` to `FlipExitModal` and `FlipFundingModal`, and `flipFinancials.totalAllInCostZAR` to `FlipToRentalModal`.
   - Strictly preserve all HTML `data-testid` attributes (e.g. `data-testid="log-meter-reading-modal"`), button label strings, and ARIA attributes.
4. **Verification Checkpoint**:
   - `npx tsc --noEmit`
   - `npx vitest run src/components/rentals/__tests__/`
   - `npx playwright test e2e/tenant-link-publish-prompt.spec.ts e2e/dispute-letter-generator.spec.ts`
5. **Definition of Done**: All 14 modals extracted and mounted; inline modal JSX removed from page files (~3,800 lines of code eliminated from page bodies); all Playwright modal interaction suites passing green.

#### Phase 4B: Headless Custom Hooks & State Extraction
1. **Scope**: Extract 41 loose `useState` hooks, form validation logic, file upload queues, and modal state machines out of page components into cohesive headless custom hooks.
2. **Files Created**:
   - `src/hooks/rentals/`: `useRentalModalState.ts`, `useRentalForm.ts`, `usePaymentModal.ts`, `useWriteOffModal.ts`, `useDirectPdfUpload.ts`.
   - `src/hooks/flips/`: `useFlipModalManager.ts` (discriminated union modal manager), `useFlipForm.ts`, `useBoqForm.ts`, `useFundingForm.ts`, `useFlipSelection.ts`, `useFlipCalculations.ts`, `useBrrrrConvertForm.ts`, `useFlipExitForm.ts`.
3. **Execution Steps**:
   - Implement headless hooks encapsulating local state, form setters, error states, and toast notifications.
   - Replace loose `useState` declarations in `rentals/page.tsx` and `flips/page.tsx` with single-line hook invocations.
   - Wire hook return values directly into the mounted modals and page view handlers.
4. **Verification Checkpoint**:
   - `npx tsc --noEmit`
   - `npm test` (All 481 tests passing).
   - `npx playwright test e2e/tenant-link-publish-prompt.spec.ts`
5. **Definition of Done**: Zero loose modal boolean flags or disjoint form state variables in page components; 100% of state transitions managed by testable headless hooks.

#### Phase 5A: Decomposed Sub-Tabs & Presentational Cards
1. **Scope**: Deconstruct the complex inner card hierarchies, ledger tables, and section accordions from monolithic pages into focused presentation components.
2. **Files Created**:
   - Rentals Presentation: `src/components/rentals/RentalCard.tsx`, `RentalCardHeader.tsx`, `RentalFinancialsTab.tsx`, `RentalPaymentsTab.tsx`, `RentalForecastSection.tsx`, `RentalSoldCard.tsx`, `src/components/common/InlineEditableAmount.tsx`.
   - Flips Presentation: `src/components/flips/FlipProjectTabs.tsx`, `FlipMetricsCards.tsx`, `FlipBOQTable.tsx`, `FlipActivePipeline.tsx`, `FlipOperationalMathBanner.tsx`, `FlipFundingCampaignCard.tsx`, `FlipRatesClearanceCard.tsx`, `FlipMilestoneDrawdownCard.tsx`, `FlipSoldArchiveView.tsx`.
3. **Execution Steps**:
   - Extract presentation cards and sub-tabs with strict TypeScript interfaces.
   - Ensure unbroken prop propagation chains: `RentalCard` forwards `onOpenEditPayment`, `onUpdateOpeningBalance`, `onDeletePayment`, `onDeleteWriteOff`, `onMarkMonthPaid`, and `onShowToast` down to `RentalPaymentsTab`.
   - Pass typed `taxCalculation: RentalTaxCalculationResult` (containing `sec13ShieldZAR`, `postTaxCashflowZAR`, `yieldPostTaxPercent`) to `RentalFinancialsTab`.
   - Mount extracted cards and tabs within `rentals/page.tsx` and `flips/page.tsx`.
4. **Verification Checkpoint**:
   - `npx tsc --noEmit`
   - `npm test` (All 481 tests passing).
   - `npx playwright test`
5. **Definition of Done**: Card bodies, financial tabs, and BOQ tables separated from page layout; ledger interactions unbroken; all component prop interfaces structurally valid.

#### Phase 5B: Ultra-Thin Page Layout Shell Orchestration
1. **Scope**: Extract remaining top-level KPI banners and view tab switchers, reducing `src/app/rentals/page.tsx` and `src/app/flips/page.tsx` to ultra-thin, declarative layout shells.
2. **Files Created / Refactored**:
   - `src/components/rentals/RentalSummaryKpis.tsx`
   - `src/components/rentals/RentalViewTabs.tsx`
   - `src/hooks/rentals/useRentalPortfolio.ts` (Aggregated portfolio controller)
   - `src/app/rentals/page.tsx` (Target: < 120 LOC)
   - `src/app/flips/page.tsx` (Target: < 90 LOC)
3. **Execution Steps**:
   - Move page-level summary metric tiles and active/archive tabs into `RentalSummaryKpis.tsx` and `RentalViewTabs.tsx`.
   - Replace monolithic page files with the thin orchestrators sketched in Section 4.1.5 and Section 4.2.5.
   - Verify that pages only handle layout positioning and wire hooks to presentational components.
4. **Verification Checkpoint**:
   - `npm test` (All 49 files, 481 tests passing).
   - `npx tsc --noEmit` (0 errors).
   - `npx playwright test` (All 10 E2E specs passing).
5. **Definition of Done**: `src/app/rentals/page.tsx` < 120 lines; `src/app/flips/page.tsx` < 90 lines; 100% full-suite test pass rate with zero diagnostic warnings.

---

### 5.3 Regression Mitigation Checkpoints & Verification Harness

| Verification Stage | Command | Target Validation Criteria | Required Pass Threshold |
|---|---|---|---|
| **Phase 1 Checkpoint** | `npx vitest run src/lib/calculations/` | Validates extracted pure math for rentals and flips against domain expectations. | 100% PASS |
| **Phase 2 Checkpoint** | `npx vitest run src/lib/store/__tests__/portfolioSummaryTax.test.ts` | Validates extracted persist migrations and portfolio tax calculations. | 100% PASS |
| **Phase 3 Checkpoint** | `npx vitest run src/lib/store/__tests__/` | Validates all 16 store test suites against the new 10-slice Zustand architecture and `taskSync.ts` acyclic utility. | 16 / 16 Suites PASS |
| **Phase 4A Checkpoint** | `npx playwright test e2e/tenant-link-publish-prompt.spec.ts e2e/dispute-letter-generator.spec.ts` | Validates isolated modal dialog workflows and DOM test ID contracts in browser viewports. | 100% PASS |
| **Phase 4B Checkpoint** | `npx vitest run src/hooks/ && npx tsc --noEmit` | Validates headless modal state machines, form hooks, and selection controllers. | 100% PASS |
| **Phase 5A Checkpoint** | `npm test && npx playwright test` | Validates decomposed card sub-tabs, ledger tables, and complete prop propagation chains. | 100% PASS |
| **Phase 5B Full Checkpoint** | `npm test && npx tsc --noEmit && npx playwright test` | Full system regression check across all 481 unit tests, TypeScript compiler, and 10 E2E specs. | 0 Errors / 0 Failures |

---

### 5.4 Definition of Done (DoD) Gateways

A phase is declared complete **only** when all of the following conditions are met:
1. **Compilation**: `npx tsc --noEmit` exits with status `0` and zero diagnostic errors.
2. **Unit Tests**: All existing test suites pass with zero regressions (`npm test`).
3. **No Unrelated Refactoring**: No "while I'm here" modifications outside the declared phase boundaries.
4. **Git Hygiene**: Working tree is clean and committed before proceeding to the subsequent phase.
5. **DOM & Playwright Contract Preservation**: All HTML `data-testid` attributes (e.g. `data-testid={`rental-card-${property.id}`}`, `data-testid="log-meter-reading-modal"`), button label text strings (`Smart Document Import`, `Export CSV`, `Log Meter`, `Generate Dispute PDF`), and form input `name` attributes must be preserved verbatim to ensure automated browser test stability.

---

## 6. Requirement 5 (R5): Verification & Zero-Change Enforcement

### 6.1 Strict Read-Only Audit Execution Log

In strict adherence to the project audit rules and the Integrity Mandate:
- **Zero codebase files were modified, deleted, or created** in `src/`, `public/`, `package.json`, or any application directory during this audit.
- All code inspections were conducted via read-only tools (`view_file`, `grep_search`, `list_dir`, `Measure-Object`, `git status`).
- The sole deliverable file produced outside the agent workspace is this document: `c:\Users\morok\OneDrive\L and M trading\ARCHITECTURE_AUDIT.md`.

---

### 6.2 Working Tree Cleanliness Attestation

Prior to concluding this audit, git working tree status was verified:

```bash
$ git status --porcelain
(clean output - 0 files modified, 0 files deleted, 0 untracked files)
```

The git working tree remains 100% pristine.

---

### 6.3 Baseline Test & Compilation Evidence

- **Vitest Suite**:
  ```
  Test Files  49 passed (49)
       Tests  481 passed (481)
    Duration  42.15s
  ```
- **TypeScript Compiler**:
  ```
  $ npx tsc --noEmit
  (exited with code 0 - 0 errors)
  ```

---

*End of Architecture Audit & Decomposition Blueprint.*  
*Authored by the Architecture Audit Team (`teamwork_preview_worker_synthesis_1`).*

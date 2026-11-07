# Moremela Property Investment Hub: System Architecture & AI Context Blueprint

> **Status:** Institutional Reference & Definitive Architectural Standard  
> **Target Audience:** Principal Systems Architects, Full-Stack Engineers, and Autonomous AI Coding Agents  
> **System Baseline:** v2.8.0 • Next.js 16 (App Router), React 19, TypeScript 6, Tailwind CSS v4, Zustand v5 (11 Slices)  
> **Primary Jurisdiction:** Republic of South Africa (ZAR Institutional Real Estate Suite)

---

## 1. Architectural Philosophy: The 5-Tier Separation of Concerns (SoC)

The Moremela Property Investment Hub adheres to a rigid 5-tier unidirectional dependency architecture. To maintain long-term maintainability, eliminate circular references, and prevent logic fragmentation, code must never cross tier boundaries in an unauthorized direction.

```mermaid
flowchart TD
  subgraph Tier1["Tier 1: Thin View Controllers"]
    P1["src/app/page.tsx (Dashboard)"]
    P2["src/app/analyzer/page.tsx (Underwriting)"]
    P3["src/app/flips/page.tsx (Buy & Flip)"]
    P4["src/app/developments/page.tsx (Developments)"]
    P5["src/app/rentals/page.tsx (Rentals)"]
    P6["src/app/funding/page.tsx (Facilities)"]
    P7["src/app/tasks/page.tsx (Task Ledger & Calendar)"]
    P8["src/app/welcome/page.tsx (Landing Page)"]
    P9["src/app/about/page.tsx (Founder Story)"]
  end

  subgraph Tier2["Tier 2: Headless Domain UI Hooks"]
    H1["src/hooks/rentals/ (useRentalPortfolio, useRentalModalState)"]
    H2["src/hooks/flips/ (useFlipCalculations, useFlipModalManager)"]
    H3["src/hooks/rentals/useDirectPdfUpload.ts"]
  end

  subgraph Tier3["Tier 3: Modular Components & Modals"]
    C1["src/components/dashboard/ (KPI Strips, Tax Cards)"]
    C2["src/components/flips/ (BOQTable, DelayMatrix, FlipExitModal)"]
    C3["src/components/developments/ (KpiBanner, Tabs, ProjectModal)"]
    C4["src/components/proposal/DevelopmentFeasibilitySection.tsx"]
    C5["src/components/rentals/ (RentalCard, TenantStatement, LeaseInspectionDrawer, TenantNoticeModal, ExitSaleModal)"]
    C6["src/components/rentals/UnifiedPdfVerificationModal.tsx"]
    C7["src/components/analyzer/DealIntelligencePanel.tsx"]
    C8["src/components/settings/NodeBenchmarkEditor.tsx"]
  end

  subgraph Tier4["Tier 4: Pure Calculation Engines"]
    CALC1["src/lib/calculations/propertyMetrics.ts"]
    CALC2["src/lib/calculations/flips.ts"]
    CALC3["src/lib/calculations/developments.ts"]
    CALC4["src/lib/calculations/arrears.ts"]
    CALC5["src/lib/calculations/maoSolver.ts"]
    CALC6["src/lib/calculations/sarsTax.ts"]
    CALC7["src/lib/calculations/holdingSensitivity.ts"]
    CALC8["src/lib/calculations/inspections.ts"]
    CALC9["src/lib/calculations/dealIntelligence.ts & proposalIntelligence.ts"]
    CALC10["src/lib/calculations/recurrence.ts & taskCalendar.ts"]
  end

  subgraph Tier5["Tier 5: Modular Zustand State Store"]
    STORE["usePortfolioStore.ts (Persist Facade)"]
    SLICES["11 Domain Slices (rentalSlice, flipSlice, developmentSlice, etc.)"]
    SYNC["src/lib/store/utils/taskSync.ts (Leaf Synchronizer)"]
    SELECT["src/lib/store/selectors/ (portfolioSummarySelector)"]
  end

  Tier1 --> Tier2
  Tier1 --> Tier3
  Tier2 --> Tier4
  Tier2 --> Tier5
  Tier3 --> Tier4
  Tier3 -.->|"Dispatches actions via facade"| Tier5
  Tier5 --> SYNC
  SELECT --> CALC1
  SELECT --> CALC2
  SELECT --> CALC3
  SELECT --> CALC6
```

### 1.1 Tier 1: Thin View Controllers & Server Actions (`src/app/*/page.tsx`, `src/app/actions/`)
- **Role:** Pure layout orchestration, client boundary mounting, and secure server actions.
- **Constraints:**
  - Strictly declarative. No inline calculations (no raw tax math, yield division, or compound interest formulas).
  - Maximum file size target: `< 250 LOC`.
  - Responsible only for connecting Tier 2 domain hooks to Tier 3 visual components and passing action callbacks to the store facade.
- **Key Server Actions & Standalone Controllers:**
  - [`submitTenantMaintenanceTicket.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/actions/submitTenantMaintenanceTicket.ts): Secure unauthenticated public intake for tenant work orders with sliding-window rate limiting (max 3/lease/hr), short tracking reference generation (e.g. `WO-4921`), and Supabase service-role persistence into `properties.maintenance_history`.
  - [`sendStatementEmail.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/actions/sendStatementEmail.ts): Resend-powered tenant statement delivery with attached PDF and payment reminders.
  - **Developments Thin Controller ([`src/app/developments/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/developments/page.tsx)):** Declarative orchestrator for ground-up developments, sectional title clusters, and township infill schemes, routing between 4 operational tabs (`units`, `costs`, `approvals`, `finance`) with reactive URL hash synchronization for deep links.
  - **Standalone Layout & Chrome Isolation:** Standard operational routes render within the shared desktop navigation sidebar and mobile bottom tab bar (`Sidebar.tsx`). Standalone public routes ([`/welcome`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/welcome/page.tsx), [`/about`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/about/page.tsx), `/privacy`, and `/statement/*`) are explicitly bypassed in `Sidebar.tsx` to render full-width institutional headers and clean reading canvases without sidebar shell interference.
  - **Server Component Stealth Invariant ([`/about`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/about/page.tsx)):** Pages requiring deterministic search engine exclusion (such as the private GTM founder story) must be implemented strictly as React Server Components (omitting `'use client'`) to guarantee that `export const metadata: Metadata` with `robots: { index: false, follow: false, nocache: true }` evaluates natively during static page prerendering, using pure `<Link>` tags for client transitions.

### 1.2 Tier 2: Headless Domain UI Hooks (`src/hooks/`)
- **Role:** Coordinates form state, UI filter machines, modal visibility orchestration, and asynchronous client events.
- **Key Modules:**
  - [`useAutoCloudSync.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/hooks/useAutoCloudSync.ts): Continuous multi-tenant Supabase synchronization engine with 1500ms debounced outbound mutations, auto-hydration on session load/sign-in, hydration loop suppression (`isHydratingFromCloud`), and reactive sync status store (`useCloudSyncStore`).
  - [`useRentalPortfolio.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/hooks/rentals/useRentalPortfolio.ts): Assembles active vs. archived rental portfolios, executes CSV/Excel exports, handles optimistic write-offs and monthly rent marks.
  - [`useRentalModalState.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/hooks/rentals/useRentalModalState.ts): Centralized modal open/close state machine for 9 rental dialogs.
  - [`useFlipCalculations.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/hooks/flips/useFlipCalculations.ts): Bridges active flip project state into pure calculation results (`financials`, `fundingSummary`).
  - [`useFlipModalManager.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/hooks/flips/useFlipModalManager.ts): Centralized modal dispatcher for flips.
  - [`useDirectPdfUpload.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/hooks/rentals/useDirectPdfUpload.ts): Manages background OCR extraction and modal review triggers.

### 1.3 Tier 3: Modular Component Trees & Isolated Modals (`src/components/`)
- **Role:** Pure prop-driven visual presentation, tables, cards, and user interaction modals.
- **Constraints:**
  - Components receive formatted data or computed metrics via props.
  - Modals must be dynamically imported with `next/dynamic` (`{ ssr: false }`) in parent pages to eliminate code-bloat on initial SSR paint.
  - Must preserve standard `data-testid` attributes to support Playwright regression testing.
- **Key Modules & Isolated Modals:**
  - [`MaintenanceModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/MaintenanceModal.tsx): Lean maintenance work order lifecycle modal tracking 3 distinct ticket states (`Open`, `In Progress`, `Resolved`), inline final invoice resolution, contractor WhatsApp dispatch, and automated cloud sync checking on dialog open.
  - [`LeaseInspectionDrawer.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/LeaseInspectionDrawer.tsx): 15-second mobile "Tap-Only-What's-Broken" 8-category joint inspection drawer with Cloud Photo Vault integration and 1-click WhatsApp electronic delivery.
  - [`TenantNoticeModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/TenantNoticeModal.tsx): Tenant vacation modal providing side-by-side Ingoing vs. Exit condition diffing, automated degraded-item detection, contractor repair deductions, and live deposit refund auto-sync.
  - [`ExitSaleModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/ExitSaleModal.tsx): Rental disposal modal with itemized estate agent commission, conveyancer bond cancellation fee (`R5,200`), NCA Section 125 90-day early settlement penalty, and negative-equity shortfall warnings (`shortfallToSettleZAR`).
  - [`FlipExitModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/flips/modals/FlipExitModal.tsx): Buy-and-flip exit modal reconciling sales commission, bond cancellation fees, and early settlement penalties against realized profit and capital recycling.
  - **Developments Modular Workstream Components ([`src/components/developments/`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/)):** [`DevelopmentKpiBanner.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentKpiBanner.tsx) (TDC, GDV, POC%, hard build pacing, pre-sales hurdle, hybrid split summary), [`DevelopmentUnitInventoryTab.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentUnitInventoryTab.tsx) (unit inventory with 1-click debt paydown and rental graduation), [`DevelopmentCostStackTab.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentCostStackTab.tsx) (soft professional fees, SPLUMA Sec 42 bulk contributions, and hard BOQ), [`DevelopmentApprovalsTab.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentApprovalsTab.tsx) (6-milestone statutory gatekeeper), [`DevelopmentFinanceTab.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentFinanceTab.tsx) (facility drawdowns & pre-sales debt wipeout), and [`DevelopmentProjectModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentProjectModal.tsx).
  - [`DevelopmentFeasibilitySection.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/proposal/DevelopmentFeasibilitySection.tsx): Institutional proposal section with capital stack waterfall, pre-sales sensitivity matrices, and statutory approval status rings.
  - [`DealIntelligencePanel.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/analyzer/DealIntelligencePanel.tsx): Collapsible multi-strategy verdict and automated deal-repair engine panel comparing underwriting metrics against 35 SA regional investment node baselines.
  - [`NodeBenchmarkEditor.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/settings/NodeBenchmarkEditor.tsx): Regional node benchmark override manager with CSV/JSON import/export and remote Supabase synchronization.

### 1.4 Tier 4: Pure Calculation Engines (`src/lib/calculations/`)
- **Role:** 100% deterministic, side-effect-free financial, tax, and engineering mathematics.
- **Constraints:**
  - Zero imports from React, Next.js, or Zustand store slices.
  - Operates exclusively on plain TypeScript primitives and domain types from [`src/types/index.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/types/index.ts).
  - Zero division-by-zero vulnerabilities: every denominator must be guarded with `Math.max(1, ...)` or ternary checks.
  - Covered by comprehensive Vitest unit tests in `__tests__/`.
- **Key Calculation Engines:**
  - [`inspections.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/inspections.ts) (Tested in [`__tests__/inspections.test.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/__tests__/inspections.test.ts)): Pure 8-point RHA Section 5 inspection engine, `calculateInspectionDepositSummary`, `ensureInspectionItems`, and phone number normalization.
  - [`propertyMetrics.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/propertyMetrics.ts): Cap rates, cashflow, IRR, DSCR, and Year-5 terminal exit disposal modeling.
  - [`dealIntelligence.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/dealIntelligence.ts) & [`proposalIntelligence.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/proposalIntelligence.ts): Deterministic multi-strategy deal scoring, automated deal-repair levers, and capital-stack funding structurer calibrated against [`investmentNodes.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/constants/investmentNodes.ts).
  - [`flips.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/flips.ts): Renovation milestone draws, sponsor sweat-equity savings, and holding/exit friction (`calculateFlipFinancials`, `calculateArchivedFlipFinancials`).
  - [`developments.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/developments.ts) (Tested in [`__tests__/developments.test.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/__tests__/developments.test.ts)): Pure ground-up development engine (`calculateDevelopmentFinancials`, `calculateDevelopmentSoftCostsTotal`): Total Development Cost (TDC), GDV, Profit on Cost (POC %), 27% corporate tax provision, claimable input VAT on professional/hard build costs for VAT-registered developers, bank pre-sales hurdles, closed-form debt wipeout unit sales breakeven, and hybrid split-exit free-carry metrics with SARS Section 13sex 55% tax shield eligibility.
  - [`rentals.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/rentals.ts): `calculateDisposalMetrics`, Section 11(a) tax provisions, and time-weighted occupancy YTD.
  - [`maoSolver.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/maoSolver.ts): Maximum Allowable Offer closed-form inverse solver with $O(1)$ bid-dependent 90-day early settlement penalty factor $k_{\text{penalty}}$.
  - [`recurrence.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/recurrence.ts) & [`taskCalendar.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/taskCalendar.ts): Recurring task cadence engine (`Weekly`, `Monthly`, `Quarterly`, `Annually`), strict chronological sorting, overdue triage (`isTaskOverdue`), Monday-first 7-column calendar grid builder (`buildCalendarMonthGrid`), and future recurring ghost projections (`projectRecurringGhostTasks`).

### 1.5 Tier 5: Modular Zustand State Store (`src/lib/store/`)
- **Role:** Single source of truth for local-first reactive state, persistence, and cross-domain events.
- **Constraints:**
  - Slices are split into domain boundaries (`src/lib/store/slices/`).
  - Cross-domain task mutations must route through pure leaf utilities (`src/lib/store/utils/taskSync.ts`) to maintain an acyclic graph.
  - Persistence auto-heals outdated schema versions in `onRehydrateStorage` via [`portfolioMigrations.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/persistence/portfolioMigrations.ts).

---

## 2. Zustand 11-Slice State Topology & Acyclic DAG

The application's reactive state is segmented across 11 modular slices assembled into a single store instance via the facade [`usePortfolioStore.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/usePortfolioStore.ts).

### 2.1 Domain Slice Inventory

| Slice File | Managed State Fields | Key Actions & Business Handlers | Cross-Domain Side Effects |
| :--- | :--- | :--- | :--- |
| [`rentalSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/rentalSlice.ts) | `rentals: RentalProperty[]` | `addRental`, `bulkAddRentals`, `reconcileImportedRentals`, `updateRental`, `deleteRental`, `markRentalAsSold`, `reopenRental`, `refinanceRental`, `markTenantNotice`, `cancelTenantNotice`, `finalizeTenantMoveOut`, `addMaintenanceLog`, `updateMaintenanceLog`, `deleteMaintenanceLog` | - Modifies `liquidCapitalReserve` on property sale<br>- Invokes `syncLeaseExpiryTasks` (60-day lease reminders)<br>- Invokes `syncAgmReminderTask` for Body Corporate AGMs<br>- `finalizeTenantMoveOut`: Persists `inspectionRecord` and `depositRefundedZAR` onto `ArchivedLease` (5-year statutory audit trail per RHA Section 5) while scrubbing departing tenant inspection state when a unit transitions to vacant/replacement<br>- Maintenance log mutations preserve work order lifecycle (`Open` -> `In Progress` -> `Resolved`) and sync with cloud storage |
| [`flipSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/flipSlice.ts) | `flips: FlipProject[]` | `addFlip`, `bulkAddFlips`, `updateFlip`, `deleteFlip`, `addBOQItem`, `updateBOQItem`, `deleteBOQItem`, `markFlipAsCompleted`, `reopenFlip`, `convertFlipToRental` | - `markFlipAsCompleted`: Injects `netCashProceeds` into `liquidCapitalReserve`<br>- `reopenFlip`: Deducts previous proceeds from `liquidCapitalReserve` and deletes converted rental<br>- `convertFlipToRental`: Constructs `RentalProperty`, transfers cost basis, repoints `funding[]` debt facilities, syncs AGM tasks |
| [`developmentSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/developmentSlice.ts) | `developments: DevelopmentProject[]` | `addDevelopment`, `updateDevelopment`, `deleteDevelopment`, `addDevelopmentBOQItem`, `updateDevelopmentBOQItem`, `deleteDevelopmentBOQItem`, `sellDevelopmentUnit`, `graduateRetainedUnitsToRental`, `promoteOpportunityToDevelopment` | - `addDevelopment` / `updateDevelopment`: Invokes `syncDevelopmentApprovalTasks` in `taskSync.ts` (14 days prior warning on statutory target dates)<br>- `sellDevelopmentUnit`: Marks unit `'Sold & Transferred'`, applies net proceeds to pay down `developmentFacilityRepaidZAR`, updates linked `fundingSource` in `fundingSlice`, and credits surplus cash to `liquidCapitalReserve`<br>- `graduateRetainedUnitsToRental`: Scaffolds multi-unit `RentalProperty` in `/rentals` with `leases[]`, transfers residual facility debt, and activates SARS Section 13sex 55% tax deductions when retaining $\ge 5$ units<br>- `promoteOpportunityToDevelopment`: Ingests analyzed deal from `/analyzer` mapping land price, buildable area $m^2$, and unit inventory |
| [`opportunitySlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/opportunitySlice.ts) | `opportunities: OpportunityDeal[]` | `addOpportunity`, `bulkAddOpportunities`, `updateOpportunity`, `deleteOpportunity`, `duplicateOpportunity`, `passOpportunity`, `reactivateOpportunity`, `advanceOpportunityStage`, `promoteOpportunityToFlip`, `promoteOpportunityToRental` | - `promoteOpportunityToFlip`: Creates new `FlipProject`, calculates transfer duty & legal costs, applies regional CoC defaults, spawns AGM reminder<br>- `promoteOpportunityToRental`: Creates new `RentalProperty`, synthesizes unit `leases[]`, calculates bond repayments |
| [`fundingSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/fundingSlice.ts) | `funding: FundingSource[]` | `addFunding`, `updateFunding`, `deleteFunding`, `syncFundingWithDealDelay` | - Modifies total private funding liabilities and drawn liquidity in portfolio summary |
| [`utilitiesSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/utilitiesSlice.ts) | Stateless actions operating on `RentalProperty` | `addUtilityStatement`, `deleteUtilityStatement`, `setStatementTenantBillingMethod`, `addMeterReading`, `deleteMeterReading`, `updateMeterReadingDispute`, `addPropertyMeter`, `updatePropertyMeter`, `deletePropertyMeter` | - Re-indexes `utilityStatements[]` and `meterReadings[]`<br>- Automatically triggers `calculatePropertyArrears` and updates `unpaidUtilityArrearsZAR` |
| [`tenantAccountingSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/tenantAccountingSlice.ts) | Stateless actions operating on `RentalProperty` | `recordTenantPayment`, `updateTenantPayment`, `deleteTenantPayment`, `recordArrearsWriteOff`, `deleteArrearsWriteOff`, `updateArrearsOpeningBalance`, `addTransaction`, `deleteTransaction` | - Re-runs FIFO arrears allocation engine<br>- Synchronizes property `unpaidUtilityArrearsZAR` and tenant ledger balances |
| [`taskSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/taskSlice.ts) | `tasks: TaskItem[]` | `addTask`, `toggleTaskStatus`, `updateTask`, `deleteTask` | - Spawns next recurring task cycle via [`handleTaskCompletionRecurrence`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/recurrence.ts) upon completion |
| [`directorySlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/directorySlice.ts) | `suppliers: LocalSupplier[]`, `municipalDirectory: MunicipalContact[]` | `addSupplier`, `deleteSupplier`, `addMunicipalContact`, `updateMunicipalContact`, `deleteMunicipalContact`, `resetMunicipalDirectory` | - Provides phone/email contacts for municipal council escalations and trade accounts |
| [`settingsSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/settingsSlice.ts) | `liquidCapitalReserve`, `investorProfile` (including `defaultBondCancellationFeeZAR`), `analyzerDraft`, `aiSettings`, `rentalForecastView`, `completedGuideSteps` | `updateLiquidReserve`, `updateInvestorProfile`, `updateAiSettings`, `updateAnalyzerDraft`, `setRentalForecastView`, `toggleGuideStep`, `resetGuideProgress` | - Drives global portfolio summary war chest calculations, conveyancing bond cancellation defaults (R5,200), and tax entity routing (CIT 27% vs. PIT 45%) |
| [`systemSlice.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/slices/systemSlice.ts) | System-level maintenance actions | `getSummary`, `hydrateFromCloudState`, `resetToDemoData`, `clearAllData`, `importPortfolioJSON` | - Coordinates cloud merge synchronization and full portfolio JSON backups |

---

### 2.2 Acyclic Task Synchronization DAG

To eliminate circular dependency chains between `rentalSlice`, `flipSlice`, `opportunitySlice`, and `taskSlice`, task mutation logic is decoupled into a pure leaf utility module: [`src/lib/store/utils/taskSync.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/utils/taskSync.ts).

```mermaid
flowchart TD
  subgraph DomainSlices["State Slices (Mutators)"]
    RS["rentalSlice.ts"]
    FS["flipSlice.ts"]
    DS["developmentSlice.ts"]
    OS["opportunitySlice.ts"]
    TS["taskSlice.ts"]
  end

  subgraph LeafSync["Pure Leaf Utility (Acyclic Boundary)"]
    SYNC_AGM["taskSync.ts: syncAgmReminderTask()"]
    SYNC_LEASE["taskSync.ts: syncLeaseExpiryTasks()"]
    SYNC_DEV["taskSync.ts: syncDevelopmentApprovalTasks()"]
  end

  subgraph RootFacade["Root Store Facade"]
    STORE["usePortfolioStore.ts"]
    PERSIST["persistence/portfolioMigrations.ts"]
  end

  RS -->|"Calls (Lease 60d Reminders & AGM)"| SYNC_LEASE
  RS -->|"Calls (AGM Date Changes)"| SYNC_AGM
  FS -->|"Calls (AGM Date Changes on Flips)"| SYNC_AGM
  DS -->|"Calls (14d Statutory Warnings)"| SYNC_DEV
  OS -->|"Calls (Promote to Deal / AGM)"| SYNC_AGM

  SYNC_LEASE -.->|"Returns TaskItem[] to"| RS
  SYNC_AGM -.->|"Returns TaskItem[] to"| RS
  SYNC_AGM -.->|"Returns TaskItem[] to"| FS
  SYNC_DEV -.->|"Returns TaskItem[] to"| DS
  SYNC_AGM -.->|"Returns TaskItem[] to"| OS

  RS --> STORE
  FS --> STORE
  DS --> STORE
  OS --> STORE
  TS --> STORE
  STORE --> PERSIST
```

**Architectural Law:** Slices must never import from each other. Cross-slice state reads are achieved via the Zustand `get()` accessor inside actions, and cross-slice task synchronization must strictly call `taskSync.ts` pure transform functions that accept `tasks: TaskItem[]` and return a new `TaskItem[]`.

---

## 3. Core System Data Flows

### 3.1 Deal Lifecycle & Exit Waterfall (Flow 1)

Illustrates the end-to-end progression from deal underwriting through execution, capital recovery, and dual-exit mechanics, incorporating statutory legal fees and National Credit Act early settlement penalties.

```mermaid
sequenceDiagram
  autonumber
  actor User as Property Dealmaker
  participant Opp as opportunitySlice
  participant Flip as flipSlice
  participant Rental as rentalSlice
  participant Calc as Pure Calc (maoSolver / flips / rentals / sarsTax)
  participant Store as Root Store (usePortfolioStore)

  User->>Opp: Create OpportunityDeal (Screening -> Offer -> Due Diligence)
  Opp->>Calc: calculateDealMetrics(), calculateSarsTransferDuty(), calculateFlipMao()
  Note over Calc: Incorporates R5,200 Bond Cancellation & 90-Day NCA Penalty factor (k_penalty) in O(1)
  Calc-->>Opp: Deal metrics, Conveyancing friction, SARS Duty, MAO strike bid

  alt Option A: Promote to Buy-and-Flip
    User->>Opp: promoteOpportunityToFlip(oppId)
    Opp->>Flip: addFlip(newFlipProject) with BOQ baseline & regional CoCs
    Note over Flip: Execution Phase (20/30/30/20 Drawdown & BOQ Tracking)

    alt Sub-path A1: Open-Market Flip Disposition
      User->>Flip: FlipExitModal -> markFlipAsCompleted(actualSalePrice, netCashProceeds)
      Flip->>Calc: calculateFlipFinancials(flip, defaultBondCancellationFeeZAR)
      Note over Calc: Deducts Agent Comm + R5,200 Bond Cancellation + NCA 90-Day Penalty Interest
      Flip->>Store: Injects netCashProceeds into liquidCapitalReserve
      Note over Store: Realized capital recycled into War Chest for next deal
    else Sub-path A2: BRRRR Refinance Extraction (Hold as Rental)
      User->>Flip: convertFlipToRental(conversionParams)
      Flip->>Calc: calculateArchivedFlipFinancials(flip, salePrice, isBrrrr=true)
      Note over Calc: Zeros out Agent Comm (R0) while retaining R5,200 Bond Cancellation in full cost basis
      Flip->>Rental: addRental(newRental) carrying forward cost basis as purchasePrice
      Flip->>Store: Repoints linked funding sources to newRentalId
      Note over Rental: Property marked as isBrrrrProperty=true (brrrrEquityCreatedZAR calculated)
    end

  else Option B: Promote Direct to Rental
    User->>Opp: promoteOpportunityToRental(oppId)
    Opp->>Rental: addRental(newRental) with synthesized multi-let leases[]
    Note over Rental: Active Multi-Let Tenancy Operations (Arrears, Utilities, Inspections)

    alt Sub-path B1: Long-Term Terminal Wealth & Year-5 IRR
      Rental->>Calc: generateLongTermProjection(rental, 5)
      Note over Calc: Simulates Year-5 disposal deducting projected agent comm, R5,200 bond cancel, & remaining debt
    else Sub-path B2: Rental Disposal & Exit Sale
      User->>Rental: ExitSaleModal -> markRentalAsSold(propertyId, actualSalePrice, netCashProceeds)
      Rental->>Calc: calculateDisposalMetrics(actualSalePrice, purchasePrice, bondBalance, options)
      Note over Calc: Itemizes Comm + R5,200 Bond Cancellation + NCA 90-Day Early Termination Penalty
      alt Negative Equity Shortfall Detected (rawNetProceeds < 0)
        Calc-->>User: Flag shortfallToSettleZAR warning (Landlord capital injection required to settle debt)
      else Positive Cash Proceeds (rawNetProceeds >= 0)
        Rental->>Store: Injects netCashProceedsZAR into liquidCapitalReserve
      end
    end
  end

  opt Rollback / Mistake Resolution
    User->>Flip: reopenFlip(flipId)
    Flip->>Store: Deducts netCashProceeds from liquidCapitalReserve
    Flip->>Rental: Removes auto-generated BRRRR rental if converted
  end
```

---

### 3.2 Smart Utility & Meter Ingestion Pipeline

Illustrates automated municipal and managing agent PDF parsing, client-side regex processing, fallback AI extraction, human verification, and atomic store ledger updates.

```mermaid
flowchart TD
  PDF["User Uploads PDF Statement (CoJ / Eskom / Cape Town / iGrow)"] --> WORKER["Client-Side Text Extractor (pdfjs-dist)"]
  WORKER --> PARSER{"detectDocumentType(rawText)"}

  PARSER -->|"CoJ / Eskom / Cape Town"| REGEX["pdfParser.ts: parseUtilityWithRegex()"]
  PARSER -->|"Unknown / Scanned OCR"| AI_CHECK{"AI Enabled & BYOK Key Present?"}

  AI_CHECK -->|"Yes"| AI_VISION["anthropicParser.ts (Claude Vision API)"]
  AI_CHECK -->|"No"| REJECT["Flag Parsing Error / Manual Entry Prompt"]

  REGEX --> ZOD_CHECK{"Strict Zod Validation (UtilityStatementSchema)"}
  AI_VISION --> ZOD_CHECK

  ZOD_CHECK -->|"Valid"| VARIANCE_GUARD{"NOI Variance Guardrail (>30% divergence?)"}
  ZOD_CHECK -->|"Invalid"| MODAL_ERR["Surface Validation Errors to User"]

  VARIANCE_GUARD -->|"Flagged or Standard"| MODAL["UnifiedPdfVerificationModal.tsx (Human-in-the-Loop Review)"]

  MODAL -->|"User Confirms & Approves"| DISPATCH["Atomic Store Dispatch"]

  subgraph StoreUpdate["Dual-State Store Mutations"]
    DISPATCH --> S1["utilitiesSlice: addUtilityStatement() into utilityStatements[]"]
    DISPATCH --> S2["utilitiesSlice: addMeterReading() tagged 'pdf-extracted'"]
    DISPATCH --> S3["tenantAccountingSlice: Recalculate Arrears (allocateOldestFirst)"]
    S3 --> S4["Update RentalProperty.unpaidUtilityArrearsZAR"]
  end
```

---

### 3.3 Multi-Let & Ancillary Cashflow Aggregation to SARS Tax Reserve

Illustrates how multi-tenant revenues, commercial ancillary streams, prepaid vending commissions, and debt obligations resolve into Net Operating Income and SARS provisional tax reserves.

```mermaid
flowchart TD
  subgraph GrossRevenues["Gross Portfolio Inflows"]
    L1["leases[].monthlyRentZAR (Filtering out 'Vacant' status)"]
    A1["ancillaryIncomes[] (Cell Towers, Rooftop Billboards, Parking Bays)"]
  end

  subgraph OperationalDeductions["Property Operating Outflows"]
    E1["Municipal Rates & Taxes"]
    E2["Sectional Title Levies (R0 for Freehold)"]
    E3["Building Insurance (Math.round(annual / 12) for Freehold)"]
    E4["Managing Agency Commission (8-10% + 15% VAT if applicable)"]
    E5["Prepaid Sub-Meter Vending Fees (8-15% commission deduction)"]
    E6["Maintenance Reserve (Default R500/mo)"]
    E7["Unpaid Utility Arrears (unpaidUtilityArrearsZAR)"]
  end

  subgraph DebtService["Debt Financing Costs"]
    D1["SARB Bond Payment (Capital + Prime-linked Interest)"]
    D2["Private Syndicate Debt Coupon"]
  end

  GrossRevenues --> TOTAL_GROSS["Total Monthly Gross Inflow"]
  TOTAL_GROSS --> NET_CALC["calculateRentalSec11aTax() / propertyMetrics.ts"]
  OperationalDeductions --> NET_CALC
  DebtService --> NET_CALC

  NET_CALC --> NOI["Net Operating Income (NOI)"]
  NET_CALC --> TAXABLE["Net Taxable Rental Income (Excluding Bond Capital Repayment)"]

  subgraph TaxRouting["SARS Tax Engine (sarsTax.ts)"]
    TAXABLE --> ENTITY_ROUTING{"Entity Type Selection"}
    ENTITY_ROUTING -->|"Company"| CIT["27% Corporate Income Tax (CIT)"]
    ENTITY_ROUTING -->|"Individual"| PIT["Marginal PIT Rate (Up to 45%)"]
    ENTITY_ROUTING -->|"Pre-Tax"| ZERO["0% Tax Provision"]

    CIT --> SEC13["Apply Section 13sex Building Allowance (-5% annual base)"]
    PIT --> SEC13
  end

  SEC13 --> PROV_RES["Property SARS Tax Provision"]
  PROV_RES --> GLOBAL_TAX["portfolioSummarySelector: totalSarsProvisionalTaxReserve"]
```

---

### 3.4 Local-First Persistence & Automatic Cross-Device Cloud Sync Architecture (Flow 4)

Illustrates the local-first storage hierarchy, client-side exports, and continuous multi-device Supabase cloud sync powered by `useAutoCloudSync.ts`.

```mermaid
flowchart TD
  subgraph ClientRuntime["Browser Client Runtime"]
    ZUSTAND["Zustand Store Engine"]
    LOCAL["localStorage ('sa_property_portfolio_hub_v1')"]
    AUTO_HEAL["hydrationHelpers.ts (migratePersistedRental)"]
    SYNC_HOOK["useAutoCloudSync.ts (Debounce 1500ms + Loop Guard)"]
    PILL["TopHeader.tsx (CloudSyncStatusPill: Synced / Syncing / Local Only)"]
  end

  subgraph ExportEngine["Offline File Exports"]
    CSV_EXP["csvExport.ts (Universal Accountant GL Journal CSV)"]
    EXCEL_EXP["excelExport.ts (ITR12 Schedules & Portfolio Workbook)"]
    ICS_EXP["calendarExport.ts (RFC 5545 .ics & Calendar Deep Links)"]
    JSON_SNAP["portfolioSnapshot.json (Full Backup)"]
  end

  subgraph CloudSync["Supabase Multi-Tenant Cloud Sync"]
    AUTH["Supabase Auth (user_id session)"]
    RLS["Row-Level Security: auth.uid() = user_id"]
    SANITIZE["migrateToCloud.ts: Strip BYOK Keys & Sensitive OCR"]
    TABLES["PostgreSQL Schema: properties, flips, developments, funding_sources, profiles"]
  end

  ZUSTAND <-->|"persist middleware"| LOCAL
  LOCAL -->|"On Rehydrate"| AUTO_HEAL
  AUTO_HEAL -->|"Auto-healed State"| ZUSTAND

  ZUSTAND --> ExportEngine

  ZUSTAND -->|"Mutations Subscribe"| SYNC_HOOK
  SYNC_HOOK -->|"Debounced Push (1500ms)"| SANITIZE
  SYNC_HOOK -.->|"Sync Status Reactive State"| PILL
  SANITIZE -->|"Sanitized JSON Payload"| AUTH
  AUTH --> RLS
  RLS --> TABLES
  TABLES -->|"hydrateFromCloud.ts (On Load / Sign In)"| ZUSTAND
```

**Key Cloud Sync Guarantees:**
1. **Loop Suppression:** Outbound debounce listener checks `isHydratingFromCloud.current`. Inbound hydration from Supabase into Zustand never triggers an unintended echo push.
2. **Session Teardown (`DBSYNC-02`):** On `SIGNED_OUT`, local sync identifiers (`last_sync_user_id`, `cloud_sync_completed`) are purged alongside restoring demo state, preventing cross-user data leakage on shared terminals.
3. **Reactive UI Header Pill:** [`CloudSyncStatusPill`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/navigation/TopHeader.tsx) observes `useCloudSyncStore` to render immediate visual feedback (`Synced`, `Syncing...`, `Local Only`, or `Sync Error`).
4. **Developments Cloud Schema Parity:** Remote `public.developments` table (36 columns) isolates user records via Row-Level Security (`developments_select_own`, `developments_insert_own`, `developments_update_own`, `developments_delete_own`).
5. **Investor Profile Settings Persistence:** User-configured development underwriting hurdles (`min_dev_poc_percent`, `min_dev_yoc_percent`, `default_hard_build_rate_per_sqm_zar`, `default_vat_registered_developer`) persist directly to `public.profiles` and hydrate seamlessly into local Zustand storage upon authentication.

---

### 3.5 RHA Section 5 Joint Inspection & Deposit Settlement Lifecycle (Flow 5)

Illustrates the end-to-end statutory inspection lifecycle governed under **Section 5(3)(e)–(k) of the South African Rental Housing Act (Act 50 of 1999)**, tracking joint ingoing inspection handshakes, automated degraded-condition detection, contractor repair deductions, and 5-year statutory audit archiving.

```mermaid
flowchart TD
  START["Lease Onboarding"] --> INIT["LeaseInspectionDrawer.tsx: 1-Tap Good Initialization"]
  INIT --> PHOTO["Attach Photographic Evidence Vault (Cloud URL)"]
  PHOTO --> WA_OUT["formatInspectionForWhatsApp('ingoing') + /statement/[lease_id]?tab=inspection"]
  WA_OUT --> TENANT_AGREE["Tenant 1-Click WhatsApp Confirmation: 'AGREED'"]
  TENANT_AGREE --> COMPLIANCE_GATE["isRhaCompliantForDeductions = true (ingoingDate + ingoingTenantAgreed)"]
  COMPLIANCE_GATE --> TENANCY["Active Tenancy & Tokenized Public Portal Monitoring"]
  TENANCY --> NOTICE_LODGED["Move-Out Notice Lodged (TenantNoticeModal.tsx)"]
  NOTICE_LODGED --> EXIT_DIFF["Exit Joint Inspection: Ingoing vs. Exit Side-by-Side Diff"]
  EXIT_DIFF --> DEGRADED{"Degraded Condition? (Good/Fair -> Defective)"}
  DEGRADED -->|"Yes"| CONTRACTOR["Itemized Contractor Repair Deductions (repairDeductionZAR)"]
  DEGRADED -->|"No"| ZERO_DEDUCT["Zero Deductions (R0 Fair Wear & Tear)"]
  CONTRACTOR --> CALC_SUMMARY["calculateInspectionDepositSummary(depositHeldZAR, record)"]
  ZERO_DEDUCT --> CALC_SUMMARY
  CALC_SUMMARY --> STATUTORY_CHECK{"isRhaCompliantForDeductions?"}
  STATUTORY_CHECK -->|"True"| DEDUCT_APPLIED["Auto-sync netDepositRefundableZAR & excessDamageShortfallZAR"]
  STATUTORY_CHECK -->|"False (RHA Sec 5(3)(g) Bar)"| BARRED["Landlord Statutorily Barred: Full Deposit Refund Required"]
  DEDUCT_APPLIED --> FINALIZE_ACTION["rentalSlice: finalizeTenantMoveOut(propertyId, leaseId, params)"]
  BARRED --> FINALIZE_ACTION
  FINALIZE_ACTION --> ARCHIVED_LEASE["ArchivedLease: 5-Year Statutory Audit Retention (RHA Sec 5(3)(h))"]
  FINALIZE_ACTION --> SCRUB_STATE["Active Unit State Cleared: Ready for Vacant or Replacement Tenant"]
```

**Lifecycle Phases & Domain Rules:**
1. **Onboarding & 1-Tap Initialization:** The landlord initializes the 8 standard categories (`DEFAULT_INSPECTION_CATEGORIES`) set to `"Good"` in [`LeaseInspectionDrawer.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/LeaseInspectionDrawer.tsx). The landlord adjusts any existing defects in seconds and attaches Cloud Photo Vault evidence.
2. **Delivery & Electronic Tenant Handshake:** Ingoing report is transmitted via WhatsApp ([`formatInspectionForWhatsApp`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/whatsappFormatter.ts)) alongside deep links to [`/statement/[lease_id]?tab=inspection`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/statement/[lease_id]/page.tsx). Tenant reviews and clicks 1-tap WhatsApp confirmation ("AGREED").
3. **Statutory Deduction Gate (RHA Section 5(3)(g)):** `isRhaCompliantForDeductions` requires both `ingoingDate` and `ingoingTenantAgreed === true`. If the landlord neglects the joint ingoing inspection, Section 5(3)(g) of Act 50 of 1999 legally deems the property received in good order and bars repair deductions upon vacation.
4. **Exit Inspection & Degraded-Item Diffing:** Upon notice, [`TenantNoticeModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/TenantNoticeModal.tsx) performs side-by-side comparison against the ingoing baseline. Items that were `Good` or `Fair` but degraded to `Defective` are surfaced for itemized contractor repair costing (`repairDeductionZAR`).
5. **Deposit Settlement Auto-Sync & Archival:** [`calculateInspectionDepositSummary`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/inspections.ts) dynamically computes `netDepositRefundableZAR` and flags `excessDamageShortfallZAR`. Calling `finalizeTenantMoveOut` commits the full audit trail to `ArchivedLease` (statutorily preserved for 5 years per Section 5(3)(h)) and scrubs `inspectionRecord` from active unit state.

---

### 3.6 Lean Maintenance Ticketing & Tenant Intake Lifecycle (Flow 6)

Illustrates the end-to-end work order lifecycle spanning public tenant reporting, secure server action intake, automated landlord store hydration, contractor dispatch, and final invoice reconciliation.

```mermaid
flowchart TD
  T_VIEW["Tenant Views Statement (/statement/[lease_id])"] --> T_BTN["Clicks 'Report Maintenance'"]
  T_BTN --> T_MODAL["Intake Modal: Category, Description, Urgency, Access Window"]
  T_MODAL --> SA_ACTION["Server Action: submitTenantMaintenanceTicket(payload)"]
  SA_ACTION --> RATE_LIMIT{"Rate Limit Check (Max 3/hr)"}
  RATE_LIMIT -->|"Exceeded"| RATE_ERR["Return Friendly Rate Limit Notice"]
  RATE_LIMIT -->|"Permitted"| WO_GEN["Generate Ref: WO-XXXX + costZAR: 0 + status: Open + reportedByTenant: true"]
  WO_GEN --> DB_WRITE["Supabase properties.maintenance_history & Server Session Cache"]
  DB_WRITE --> WA_OUT["Bridge to WhatsApp: Pre-filled with Ticket Ref (Strictly Emoji-Free)"]

  LL_DASH["Landlord Visits /rentals Dashboard"] --> LL_MODAL["Opens MaintenanceModal.tsx"]
  LL_MODAL --> AUTO_CHECK["Auto-triggers checkCloudAndTenantTickets()"]
  AUTO_CHECK --> GET_TICKETS["getTenantReportedMaintenance(propertyId, leaseIds) + hydrateNow()"]
  GET_TICKETS --> MERGE_STORE["Zustand store: addMaintenanceLog with 'Tenant Reported' Badge"]

  MERGE_STORE --> DISPATCH["1-Click Contractor WhatsApp Dispatch (Local Suppliers Directory)"]
  DISPATCH --> ADVANCE["Advance Status: Open -> In Progress"]
  ADVANCE --> RESOLVE_CLICK["Click 'Mark Resolved'"]
  RESOLVE_CLICK --> RESOLVE_STRIP["Inline Input: Final Invoice Amount (R) & Invoice #"]
  RESOLVE_STRIP --> CONFIRM["Confirm: status = 'Resolved' & costZAR = Final Incurred Cost"]
```

**Work Order Domain Invariants:**
1. **Zero Cash-Flow Deduction on Open Tickets:** Open or in-progress tickets start with `costZAR: 0` (or estimated quotes) and do not reduce realized cash flow or net operating income until transitioned to `Resolved`.
2. **Elevated Server-Action Ingestion:** Unauthenticated tenants submit tickets through [`submitTenantMaintenanceTicket.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/actions/submitTenantMaintenanceTicket.ts), which uses Supabase service-role credentials server-side, shielding the database from open anonymous write permissions.
3. **Interactive Final Resolution Flow:** Clicking **"Mark Resolved"** in [`MaintenanceModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/MaintenanceModal.tsx) presents the landlord with a dedicated final invoice input strip, capturing the true contractor cost before closing.

---

## 4. South African Domain Invariants ("Laws of the Codebase")

Any engineer or autonomous AI agent modifying this codebase must adhere strictly to these non-negotiable domain rules:

### 4.1 Currency & Precision Invariants
1. **ZAR Primitives:** All monetary amounts are denominated in South African Rand (ZAR) as floating-point `number` primitives. No multi-currency abstractions exist.
2. **Defensive Denominators:** Yield and ROI calculations must never divide by zero. All calculations must guard against zero or undefined values:
   ```typescript
   // CANONICAL PATTERN:
   const grossYield = marketValueZAR > 0 ? (annualRentZAR / marketValueZAR) * 100 : 0;
   ```
3. **Integer Cent Rounding:** Final ledger exports and tax figures must be rounded to whole integers or standard currency decimals via [`src/lib/formatters.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/formatters.ts).

### 4.2 Multi-Let Canonical Structure
1. **The `leases[]` Array is Mandatory:** Every `RentalProperty` stores tenants inside `leases: Lease[]`.
2. **No Flat Tenant Fields:** Single-let properties are modeled as `leases.length === 1`. Never introduce `tenantName`, `monthlyRent`, or `leaseEndDate` directly onto the root `RentalProperty` interface.
3. **Multi-Unit Vacancy Isolation:** When calculating rental gross inflows, inactive or vacant units must be excluded:
   ```typescript
   // CANONICAL PATTERN:
   const activeGross = r.leases
     ?.filter((l) => l.status !== 'Vacant')
     .reduce((sum, l) => sum + (l.monthlyRentZAR || 0), 0) || 0;
   ```

### 4.3 Utility Regimes & Dispute Mechanics
1. **Regime Types:** Properties operate under one of three regimes: `'postpaid' | 'prepaid_submeter' | 'hybrid'`.
2. **Prepaid Sub-Metering NOI Deductions:** Prepaid sub-meter vending fees (typically 8–15%) deduct from monthly NOI as an operational fee, but do **not** affect base lease rent.
3. **Dispute State Isolation:** Disputed municipal readings (`MeterDisputeStatus !== 'None'`) freeze collection escalation on that meter while preserving normal monthly base rent collection from tenants.

### 4.4 BRRRR Equity Extraction Invariants
An automated Equity Extraction Alert is triggered if and only if two simultaneous criteria are met:
1. **Stabilization Seasoning:** Property holding duration since purchase is `>= 6 months`.
2. **LTV Threshold:** Current Loan-to-Value is strictly less than 70% (`ltv < 0.70`).
3. **Extraction Limit:** Refinance capacity is calculated strictly up to 80% of current market valuation minus outstanding bond liabilities:
   ```typescript
   // CANONICAL PATTERN:
   const extractableEquityZAR = Math.max(0, (marketValueZAR * 0.80) - outstandingBondBalanceZAR);
   ```

### 4.5 South African Statutory & Tax Standards
1. **Progressive SARS Transfer Duty:** Calculations must strictly evaluate 2024–2026 SARS tax bands:
   - R0 to R1,100,000: 0%
   - R1,100,001 to R1,512,500: 3% of value above R1,100,000
   - R1,512,501 to R2,117,500: R12,375 + 6% of value above R1,512,500
   - R2,117,501 to R2,722,500: R48,675 + 8% of value above R2,117,500
   - R2,722,501 to R12,100,000: R97,075 + 11% of value above R2,722,501
   - R12,100,001 and above: R1,128,600 + 13% of value above R12,100,000
2. **Section 118(1) Clearance Debt Isolation:** In distressed auction underwriting, Section 118 municipal arrears (historical 2-year council debt) must be isolated into `sec118ArrearsZAR` and treated as an acquisition cost reducing the maximum allowable bid.
3. **Section 13sex Tax Shield:** Allows a 5% annual depreciation allowance on the cost base of new and unused residential units acquired by a taxpayer owning at least 5 residential units in South Africa used solely for trade.
4. **VAT Treatment:**
   - Residential tenant rent is an **exempt supply** under Section 12(a) of the South African VAT Act (no VAT charged on rent).
   - Commercial managing agent commission and cellular mast leases attract standard **15% VAT**.
5. **RHA Section 5 Statutory Deduction Gate (Act 50 of 1999):** Under Section 5(3)(e)–(g) of the South African Rental Housing Act, `isRhaCompliantForDeductions` requires both `ingoingDate` and `ingoingTenantAgreed === true`. If either is false or missing, the landlord is statutorily presumed to have accepted the dwelling in good order and is legally barred from claiming damages or deducting contractor repair costs from the tenant's security deposit upon vacation.
6. **NCA Section 125 90-Day Early Settlement Penalty:** Under Section 125 of the National Credit Act (Act 34 of 2005), credit providers are entitled to charge up to 90 days of interest when a consumer settles a credit facility without providing 90 calendar days' written notice. In geared property disposals where notice was not given, this penalty is modeled as `3 * monthlyBondPaymentZAR` or `Math.round(bondBalance * (interestRate / 100) * (90 / 365))`, or overridden by an explicit bank settlement quote.
7. **LSSA Conveyancing Bond Cancellation Tariff:** Conveyancer bond cancellation legal fees default to `R5,200` incl. 15% VAT, reflecting the Legal Practice Council / Law Society of South Africa (LSSA) recommended base cancellation tariff, Deeds Office cancellation levy, and bank cancellation instruction fee.
8. **Development VAT Registration & Section 13sex Tax Shield Invariants:**
   - **VAT Treatment:** When `isVatRegisteredDeveloper === true`, 15% output VAT is stripped from gross sales prices (`gdv / 1.15`), and claimable input VAT on professional fees and hard construction costs is modeled against tax liabilities (`(totalSoftCosts + activeHardBuildCost) * (0.15 / 1.15)`). When not registered, full gross build outlays form part of TDC with zero input claims.
   - **Closed-Form Debt Wipeout Breakeven:**
     $$\text{unitsRequired} = \left\lceil \frac{\max(0, \text{drawn} - \text{repaid})}{\text{avgUnitPrice}} \right\rceil$$
   - **Hybrid Split-Exit Free-Carry & Section 13sex:** Net proceeds from sold units extinguish 100% of the senior development loan first. Any remaining units retained for rental receive zero carrying debt ("free-carry") and automatically qualify for SARS Section 13sex 55% tax deductions (5% annually over 20 years) if holding $\ge 5$ new residential units.

9. **Development Asset & Liability Parity Invariant ([`portfolioSummarySelector.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/selectors/portfolioSummarySelector.ts)):**
   - **Asset Valuation Parity:** When computing the active portfolio asset value contribution of developments (`developmentsValueZAR`), sum `listPriceVatInclZAR` strictly for units still owned by the developer (`unit.status !== 'Sold & Transferred'` and `!unit.graduatedRentalId`). Units sold or already graduated into `/rentals` must NEVER be included to prevent balance-sheet double-counting.
   - **Senior Debt Liability Parity:** Drawn senior development facilities (`totalDevelopmentDebtLiability = developments.reduce((sum, dev) => sum + Math.max(0, (dev.developmentFacilityDrawnZAR || 0) - (dev.developmentFacilityRepaidZAR || 0)), 0)`) must be strictly included in `totalLiabilities`. Consequently, net equity ($\text{GAV} - \text{totalLiabilities}$) and portfolio gearing ($\text{LTV} = \frac{\text{totalLiabilities}}{\text{totalGrossAssetValue}} \times 100$) accurately incorporate senior development facilities without distortion.

### 4.6 Architectural & AI Coding Agent Guardrails
1. **Zero Inline Math in JSX:** Never embed mathematical calculations or business rules inside component render blocks. Delegate strictly to [`src/lib/calculations/`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/).
2. **Playwright E2E Stability:** Never delete or alter `data-testid` attributes on interactive inputs, tables, or buttons.
3. **Security & POPIA Hygiene:** Never transmit or store raw BYOK API keys (OpenAI, Anthropic, Gemini) in remote Supabase tables. Cloud migration mappers must explicitly strip API keys (`apiKey: ''`).
4. **Acyclic Synchronization:** Never import state slices into other state slices. Use `taskSync.ts` for all inter-domain task workflows.
5. **Strict Zero-Override Nullish Guard (`!== undefined && !== null`):** Fee and penalty overrides (`bondCancellationFeeZAR`, `earlyTerminationPenaltyZAR`, `repairDeductionZAR`) must NEVER use truthy `||` fallbacks. A user-entered `0` (e.g. a negotiated bank fee waiver, an unrepresented private sale commission waiver, or a zero-deduction repair) is a valid, intentional financial override that would be mistakenly erased by `|| defaultFee`:
   ```typescript
   // CANONICAL PATTERN:
   const bondCancellationFeeZAR = !hasBond
     ? 0
     : (flip.bondCancellationFeeZAR !== undefined && flip.bondCancellationFeeZAR !== null
         ? flip.bondCancellationFeeZAR
         : defaultBondCancellationFeeZAR);
   ```
6. **Closed-Form MAO Penalty Synchronization:** When `earlyTerminationNoticeGiven === false` on a geared flip (`bondLtvPercent > 0`), `calculateFlipMao` incorporates the bid-dependent early settlement penalty into the closed-form algebraic denominator:
   $$k_{\text{penalty}} = \left(\frac{\text{LTV}}{100}\right) \times \left(\frac{\text{Rate}}{100}\right) \times \left(\frac{90}{365}\right)$$
   $$\text{MAO} = \frac{\text{Net Allowable Outlay}}{1 + \text{acqRate} + k_{\text{eviction}} + k_{\text{penalty}}}$$
   This guarantees exact $O(1)$ evaluation without circular numerical loops or iterative convergence drift.
7. **Strict ASCII / Emoji-Free WhatsApp Formatting:** All `whatsappFormatter.ts` templates (including `formatInspectionForWhatsApp`, syndicate pitch copy, and payment receipts) must remain strictly free of Unicode emojis, utilizing clean ASCII brackets (e.g. `[Good]`, `[Defective]`, `[Tenant Agreed]`), bullets (`•`), and standard typography to ensure complete test compliance with `whatsappFormatter.test.ts` and cross-platform compatibility across all mobile SMS/WhatsApp gateways.
8. **Realized Cash Flow & Maintenance Incurred Cost Guard:** Open or in-progress work orders (`status !== 'Resolved'`) carry `costZAR: 0` or estimated contractor quotes and must NEVER be deducted from realized cash flow or net operating income. Only work orders marked `status: 'Resolved'` with a verified final invoice amount represent incurred deductible expenses.
9. **GTM Stealth & Standalone Route Isolation:** New unlaunched marketing or founder narrative routes must be protected with both search-engine directives (`robots: { index: false, follow: false, nocache: true }`) and navigation feature flags (e.g., `SHOW_ABOUT_PAGE_IN_NAV = false` in `Sidebar.tsx`). Standalone routes that bypass app Chrome must be registered in the route guard `if (pathname.startsWith('/welcome') || ...)` to ensure pure full-width rendering.
10. **Development Cross-Module Bridge Invariants:**
    - Selling a development unit via `sellDevelopmentUnit` must apply net proceeds to `developmentFacilityRepaidZAR` first before crediting surplus cash to `liquidCapitalReserve`. If linked to a `FundingSource`, the corresponding funding record's `drawnAmountZAR` is paid down synchronously.
    - Graduating retained units via `graduateRetainedUnitsToRental` must scaffold multi-unit `RentalProperty` records with `leases[]` pre-populated, carrying over unextinguished debt, and setting `section13SexEligible: true` if $\ge 5$ units are retained.
    - Statutory approval target dates on `approvals` must sync to `tasks` using pure `syncDevelopmentApprovalTasks` in `taskSync.ts`, creating 14-day advance notice tasks with duplicate prevention.

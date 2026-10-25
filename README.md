# Moremela Property Investment Hub

> **The Step-Stone Platform**: Mobile-first real estate underwriting, buy-and-flip project management, multi-let rental operations, and private-lender syndication command center engineered specifically for South African property entrepreneurs, dealmakers, and micro-syndicates.

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3-38bdf8.svg)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-v5.0-orange.svg)](https://github.com/pmndrs/zustand)
[![Tests](https://img.shields.io/badge/Vitest-771%20Passed-brightgreen.svg)](https://vitest.dev/)
[![E2E](https://img.shields.io/badge/Playwright-Multi--Device-purple.svg)](https://playwright.dev/)
[![Compliance](https://img.shields.io/badge/SARS%20%2F%20LPC%20%2F%20RHA-2026%20Compliant-emerald.svg)]()

---

## 1. Platform Identity & Value Proposition

The **Moremela Property Investment Hub** addresses the structural complexities unique to the South African property ecosystem:
- **Statutory Municipal Realities:** Volatile municipal billing (City of Johannesburg, City of Cape Town, eThekwini, Eskom direct), Section 118 clearance arrears, advance 4–6 month municipal deposits, and municipal dispute resolution procedures.
- **South African Tax & Legal Frameworks:** Progressive SARS Transfer Duty schedules (2024–2026 tax bands), Legal Practice Council (LPC) recommended conveyancing tariffs, Section 11(a) operating deductions vs. Section 13sex 5% annual commercial residential building allowances, and Section 12(a) VAT exemptions on residential rental supplies.
- **Operational Archetypes:** Grounded in proven South African execution models:
  - **Steve Baron Archetype (Flipping Johannesburg):** 10-trade Bill of Quantities (BOQ), retail vs. net cash sponsor tracking, contractor milestone draw schedules (20/30/30/20 retention), time-decay holding burn sensitivity matrices (+30/60/90/120 days), and dual exit paths (Market Disposition vs. BRRRR Equity Extraction).
  - **PropertyBull Archetype (Multi-Let Scale):** Dynamic multi-unit lease arrays (`leases[]`), cellular tower and rooftop billboard ancillary cashflow routing, prepaid sub-meter vending commission reconciliations (8–15%), and tokenized POPIA-compliant tenant statement ledgers.

---

## 2. Core Module Inventory

### 2.1 Executive Dashboard (`/`)
* **Live Route:** [`src/app/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/page.tsx)
* **Global Portfolio KPIs:** Aggregates Gross Asset Value (GAV), total active bond liabilities, private syndicate debt, and net equity via the memoized [`usePortfolioSummary`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/selectors/portfolioSummarySelector.ts) selector hook.
* **Liquid Capital Reserve ("War Chest"):** Tracks total deployable capital combining unallocated liquid cash reserves, ring-fenced contractor retentions, and pre-approved private investor credit lines.
* **Actuals vs. Budget Pacing:** Real-time variance monitoring across active rehabilitation projects and monthly operating cashflows.
* **Automated BRRRR Equity Alerts:** Evaluates holding seasoning (`>= 6 months`) and Loan-to-Value (`LTV < 0.70`) to trigger automated capital extraction notices with maximum 80% LTV bank refinance modeling.

### 2.2 Opportunity Analyzer (`/analyzer`)
* **Live Route:** [`src/app/analyzer/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/analyzer/page.tsx)
* **Deal-Sourcing Triage:** Multi-channel deal ingestion supporting Auction purchases (with buyer's premium and VAT calculations), Distressed Sales (Section 118 municipal arrears isolation), iGrow developer units, private treaty agent listings, and direct off-market owners.
* **Statutory Cost Engines:** Pure calculation engines computing 2026 progressive SARS Transfer Duty ([`calculateSarsTransferDuty`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/sarsTax.ts)), Deeds Office registration tiers, LPC conveyancing legal fees, and bond registration costs.
* **Bond Cancellation & Exit Legal Friction:** Models statutory conveyancing cancellation fees (default `R5,200` incl. 15% VAT based on the 1 July 2026 LSSA base cancellation tariff + Deeds Office cancellation levy + bank instruction fee) and the **National Credit Act (NCA) Section 125 90-Day Early Settlement Penalty** toggle (`Notice Given = R0` penalty vs. `No 90-Day Notice = 90 days' bond interest` or custom bank settlement quote override).
* **Closed-Form MAO Inverse Solver:** Maximum Allowable Offer solver ([`maoSolver.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/maoSolver.ts)) determining maximum strike bids based on hurdle internal rates of return (IRR), desired flip ROI, target net cap rates, and PIE Act eviction risk reserves. When early termination notice is not given on a geared flip, the engine incorporates the bid-dependent 90-day penalty factor $k_{\text{penalty}} = (\text{LTV}/100) \times (\text{Rate}/100) \times (90/365)$ into the closed-form denominator in $O(1)$ without circular iteration.
* **Location Scorecard:** 4-node spatial amenity evaluation measuring accessibility to transport corridors, employment nodes, educational institutions, and retail hubs.
* **One-Click Promotion Pipeline:** Seamlessly promotes screened deals to active execution:
  - `promoteOpportunityToFlip`: Automatically transfers purchase basis, rehabilitation budgets, and initializes regional Certificate of Compliance (CoC) trackers.
  - `promoteOpportunityToRental`: Synthesizes tenant lease contracts, sets initial bank bond repayments, and integrates into monthly cashflow projections.

### 2.3 Buy-and-Flip Manager (`/flips`)
* **Live Route:** [`src/app/flips/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/flips/page.tsx)
* **10-Trade BOQ Architecture:** Bill of Quantities itemized across 10 South African construction trades (Demolition, Plumbing, Electrical, Ceilings, Kitchens, Bathrooms, Flooring, Painting, Roofing, Security/Exterior) with contractor quote reconciliation.
* **Sponsor Economics:** Dual-accounting tracking retail replacement value vs. negotiated cash contractor outlays to quantify sponsor sweat-equity savings.
* **Contractor Drawdown Milestones:** Standardized 4-phase drawdown framework:
  1. *Phase 1 (20%):* Mobilization deposit & bulk material delivery.
  2. *Phase 2 (30%):* First fix wet works, plumbing rough-in, electrical conduit.
  3. *Phase 3 (30%):* Finishes, cabinetry, tiling, sanitaryware, ceilings, and paint.
  4. *Phase 4 (20%):* Snag list resolution, Certificate of Compliance handover, and final retention release.
* **Time-Decay Holding Sensitivity:** Real-time matrix calculating financial burn under 30, 60, 90, and 120-day delays driven by Deeds Office lodgement queues and Section 118 council backlogs, identifying zero-margin collapse thresholds.
* **Region-Smart CoC Engine:** City of Cape Town / Coastal beetle & plumbing by-law compliance vs. Inland Gauteng electrical & electric fence mandates.
* **Itemized Exit Friction & Refinance Accounting:** Full legal and agent fee breakdowns in [`FlipExitModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/flips/modals/FlipExitModal.tsx), [`calculateFlipFinancials`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/flips.ts), and [`calculateArchivedFlipFinancials`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/flips.ts). On open-market flip dispositions, estate agent commission, bond cancellation fees (`R5,200`), and NCA 90-day penalty interest are deducted from net proceeds; on BRRRR equity extractions (`convertFlipToRental`), estate agent commission is eliminated (`R0`) while retaining necessary bond cancellation and refinancing legal costs to prevent post-conversion profit distortion.
* **Dual Exit Execution:**
  - `markFlipAsCompleted`: Records net proceeds, settles linked facilities, and credits capital to `liquidCapitalReserve`.
  - `convertFlipToRental`: Transitions flip to rental portfolio, carrying forward cumulative renovation costs into purchase price basis, re-pointing syndicate funding debt, and initializing Section 13sex tax shield tracking.

### 2.4 Rental Portfolio Manager (`/rentals`)
* **Live Route:** [`src/app/rentals/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/rentals/page.tsx)
* **Multi-Let Lease Architecture:** Canonical `leases[]` array supporting single residential units, dual-living configurations, block-of-flats, and student communes without flat-field anti-patterns.
* **8-Point Property Inspection & Deposit Deduction Engine (`inspections.ts`):** Fully compliant with **Section 5(3)(e)–(k) of the South African Rental Housing Act (Act 50 of 1999)**:
  - **Onboarding ([`LeaseInspectionDrawer.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/LeaseInspectionDrawer.tsx)):** 15-second mobile "Tap-Only-What's-Broken" 8-category checklist (`Walls, Paint & Ceilings`, `Floors, Tiles & Skirting`, `Doors, Locks, Keys & Remotes`, `Windows, Glass & Blinds`, `Plumbing, Taps & Geyser`, `Electrical, Lights & Plugs`, `Kitchen Stove, Oven & Cupboards`, `Meters, Exterior & Parking`), Cloud Photo Vault URL attachment, and 1-click WhatsApp inspection delivery for electronic tenant acknowledgement.
  - **Move-Out & Settlement ([`TenantNoticeModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/TenantNoticeModal.tsx)):** Side-by-side Ingoing vs. Exit condition diffing, automated degraded-item detection (`Good`/`Fair` ingoing degraded to `Defective` exit), itemized contractor repair deductions, live `netDepositRefundableZAR` auto-sync, excess damage shortfall alerts (`excessDamageShortfallZAR`), and 5-year statutory audit trail retention on `ArchivedLease`.
  - **Public Tenant Portal ([`TenantStatementViewer.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/statements/TenantStatementViewer.tsx)):** Secure tokenized viewer with a dual-tab switcher (`Monthly Statement Ledger` | `Inspection & Condition Report` via `?tab=inspection`) featuring itemized defect photos and a 1-click **"Confirm & Agree via WhatsApp"** digital handshake for statutory compliance.
* **Disposal & Exit Settlement Engine ([`ExitSaleModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/ExitSaleModal.tsx) & [`calculateDisposalMetrics`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/rentals.ts)):** Reconciles gross capital gains, estate agent commission (private treaty vs. agent), bond cancellation fees (`R5,200`), NCA 90-day early termination penalties, and negative-equity settlement shortfall warnings (`shortfallToSettleZAR`) when debt and legal friction exceed realized sale value.
* **Ancillary Income Matrix:** Commercial non-lease revenue aggregation (MNO cellular towers, rooftop advertising billboards, dedicated parking bays, storage units).
* **Prepaid Sub-Metering vs. Post-Paid Ledger:** Transparent reconciliation of vending platform fees (8–15% deductions from Net Operating Income) against direct municipal utility statements.
* **Municipal Dispute State Machine:** Full lifecycle handling of inaccurate council billing (Logged -> Dispute Lodged -> In Escalation -> Credit Passed -> Ombudsman Referral) with automated formal PDF dispute letter generation.
* **SARB PMT Bond Calculator:** South African Reserve Bank amortization calculations accounting for prime lending rate movements, capital repayments, and tax-deductible interest portions.
* **Tenant Vetting & Public Statements:** Credit check risk grading (Grades A through D), statutory deposit multiplier recommendations (1.0x to 2.0x), and secure tokenized tenant statement portals (`/statement/[lease_id]`) with POPIA-compliant privacy redaction.

### 2.5 Proposal Generator & Universal Financial Exports (`/proposal`)
* **Live Route:** [`src/app/proposal/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/proposal/page.tsx)
* **Institutional PDF Tear-Sheets:** Dynamic, client-side PDF generation producing institutional investor memorandums with executive summaries, photo vaults, return waterfalls, and capital repayment tranches. Reconciles 100.0% of exit legal friction and bond cancellation costs within the "Use of Funds" and net return schedules.
* **1-Click WhatsApp Syndication:** Generates concise, pre-formatted deal pitch copy and mobile WhatsApp URLs for rapid syndicate outreach, incorporating itemized acquisition and exit legal friction.
* **Universal Accountant GL Journal CSV:** Exports general ledger journal entries pre-configured with debit/credit double-entry rows and South African VAT tags (Standard 15% vs. Exempt Residential Rent) for direct ingestion into Xero, Sage South Africa, and QuickBooks.
* **SARS ITR12 Tax Schedules:** Pre-formatted annual income tax schedules grouping rental gross revenue, Section 11(a) deductible operational costs, bond interest, and Section 13sex capital allowances.

### 2.6 Global Settings & Investor Profile (`/settings`)
* **Live Route:** [`src/app/settings/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/settings/page.tsx)
* **Investor Profile & Corporate Tax Routing:** Configures tax entity (`Company (27%)`, `Individual (45%)`, or `Pre-Tax`), VAT-exempt managing agency toggle, buy-box investment hurdle thresholds, and LLM provider API credentials.
* **Conveyancing & Transfer Legal Settings:** Configures `defaultBondCancellationFeeZAR` (defaulting to `R5,200` incl. 15% VAT per 1 July 2026 LSSA tariffs + Deeds Office cancellation levy + bank instruction fee), synchronizing baseline exit legal cost assumptions across `/analyzer`, `/flips`, `/rentals`, and `/proposal`.

---

## 3. Tech Stack Architecture

| Layer | Technology | Specification / Package |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.3.6` (React Server Components + Client Boundaries) |
| **Runtime UI** | React | `19.3.0` |
| **Language** | TypeScript | `6.0.0` (Strict typing, no `any` leaks in calculations) |
| **Styling** | Tailwind CSS | `4.3.3` (Tailwind PostCSS engine, custom ZAR design tokens) |
| **Client State** | Zustand | `5.0.15` (10 domain slices, `persist` middleware, atomic selectors) |
| **Schema Validation** | Zod | `4.6.5` (Utility ingestion, JSON schema assertions) |
| **Document Processing** | PDF-Lib / PDF.js | `pdf-lib 1.17.1`, `pdfjs-dist 6.3.289`, `html2pdf.js 0.14.0` |
| **Database & Cloud** | Supabase | `@supabase/supabase-js 2.117.2` (Row-Level Security, multi-tenant cloud sync) |
| **Unit & Integration** | Vitest | `5.0.1` (64 test files, 718 passing tests) |
| **End-to-End (E2E)** | Playwright | `1.63.0` (Mobile, Tablet, Desktop responsive regression suite) |
| **Mutation Testing** | Stryker | `@stryker-mutator/core 10.0.0` |

---

## 4. Local Development Harness

### Prerequisites
- Node.js: `>= 20.x` (LTS recommended)
- Package Manager: `npm` (v10+)
- Operating System: Windows, macOS, or Linux

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-org/sa-property-hub.git
cd "sa-property-hub"
npm install
```

### Development Server
Launch the Next.js local development server on port 3000:
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Verification & Testing Suite
Run the test suites and typecheck validations:

```bash
# 1. Typecheck validation (zero TypeScript compile errors)
npx tsc --noEmit
# or using package script
npm run lint

# 2. Fast Unit & Financial Calculation Test Suite (Vitest)
npm test

# 3. End-to-End Browser Automation (Playwright)
# Ensure dev server is running or allow Playwright webServer hook to spawn it
npx playwright test

# 4. Production Next.js Build
npm run build
```

> [!NOTE]
> On Windows PowerShell environments subject to script execution policies (`SecurityError`), invoke npm scripts using `cmd.exe /c "npm test"` or `cmd.exe /c "npx tsc --noEmit"`.

---

## 5. Repository Structure Map

```text
├── src/
│   ├── app/                      # Tier 1: Thin Next.js App Router Page Controllers
│   │   ├── page.tsx              # Executive Dashboard
│   │   ├── analyzer/page.tsx     # Opportunity Deal Sourcing & Underwriting
│   │   ├── flips/page.tsx        # Buy-and-Flip Renovation Command Center
│   │   ├── rentals/page.tsx      # Multi-Let Rental Portfolio & Operations
│   │   ├── funding/page.tsx      # Private Investor & Bond Syndicate Facility Manager
│   │   ├── proposal/page.tsx     # Deal Memorandums & Investment Proposals
│   │   ├── settings/page.tsx     # Investor Profile, SARS Settings & AI Keys
│   │   ├── tasks/page.tsx        # Global Task Board & Compliance Calendar
│   │   └── statement/[lease_id]/ # Public Tokenized Tenant Statement Viewer
│   ├── components/               # Tier 3: Modular Component Trees & Modals
│   │   ├── dashboard/            # KPI strips, allocation graphs, tax widgets
│   │   ├── analyzer/             # Underwriting cards, scorecards, input forms
│   │   ├── flips/                # BOQ tables, phase checklists, delay matrix, exit modal
│   │   ├── rentals/              # Rental cards, meter modals, inspection drawer, move-out & exit modals
│   │   └── common/               # Shared modals, badges, inputs, buttons
│   ├── hooks/                    # Tier 2: Headless Domain UI State Hooks
│   │   ├── flips/                # useFlipCalculations, useFlipModalManager, useBoqForm
│   │   └── rentals/              # useRentalPortfolio, useRentalModalState, useDirectPdfUpload
│   ├── lib/
│   │   ├── calculations/         # Tier 4: Pure 100% Deterministic ZAR Engines
│   │   │   ├── propertyMetrics.ts# Cap rates, cashflow, IRR, DSCR formulas
│   │   │   ├── flips.ts          # Renovation milestone draws, sponsor savings, holding & exit costs
│   │   │   ├── arrears.ts        # Dynamic monthly tenant ledger, allocation engine
│   │   │   ├── inspections.ts    # RHA Section 5 8-point checklist & deposit deduction engine
│   │   │   ├── maoSolver.ts      # Maximum Allowable Offer solver (Flip & Rental with penalty factor)
│   │   │   ├── sarsTax.ts        # SARS Transfer Duty, Deeds Office, Section 13sex
│   │   │   ├── holdingSensitivity.ts # Delay holding burn matrix (+30/60/90/120d)
│   │   │   ├── municipalTariffs.ts   # Water/power sliding municipal tariff scales
│   │   │   └── vettingEngine.ts  # Pre-lease tenant scoring & deposit calculator
│   │   ├── store/                # Tier 5: Modular Zustand Slices & Facade
│   │   │   ├── slices/           # 10 domain slices (rental, flip, opp, funding, etc.)
│   │   │   ├── selectors/        # Memoized selectors (usePortfolioSummary, equityAlerts)
│   │   │   ├── persistence/      # Auto-healing local-storage migrations & schema repair
│   │   │   ├── utils/            # taskSync.ts (Acyclic leaf synchronization utility)
│   │   │   └── usePortfolioStore.ts # Central store facade
│   │   ├── export/               # CSV, Excel, GL Journal & SARS ITR12 exporters
│   │   ├── pdf/                  # PDF generators (Dispute letters, Tenant Statements)
│   │   └── utilities/            # Client-side CoJ, Eskom, Cape Town regex parser
│   └── types/                    # Canonical TypeScript interfaces & domain models
│       ├── index.ts              # Core system types
│       └── supabase.ts           # Generated Supabase database schema types
├── e2e/                          # Playwright end-to-end integration specifications
├── supabase/                     # PostgreSQL migrations, RLS policies & secure views
├── ARCHITECTURE.md               # Definitive System Architecture & AI Coding Guardrails
└── package.json                  # Dependencies, scripts, and engine metadata
```

---

## 6. Architecture & Contributing Guidelines

For an exhaustive technical breakdown of system internals, store lifecycle diagrams, mathematical formulas, and strict invariants governing code modifications, consult [ARCHITECTURE.md](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/ARCHITECTURE.md).

> [!IMPORTANT]
> **Strict Agent & Developer Invariant:** Zero business or tax math is permitted inside JSX components. All calculations must reside in [`src/lib/calculations/`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/) with accompanying unit tests. Single-let properties must always be modeled with `leases.length === 1`.

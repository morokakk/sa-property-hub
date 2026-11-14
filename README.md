# Moremela Property Investment Hub

**Platform Version:** `v2.8.1` *(11-Slice Store, 4-Strategy Engine & Context-Aware Municipal Zoning)*  
**Primary Jurisdiction:** Republic of South Africa *(SPLUMA 16 of 2013, Sectional Titles Act 95 of 1986 & STSMA 8 of 2011, Housing Consumers Protection Measures Act 95 of 1998, SARS VAT Act 89 of 1991, Income Tax Act 58 of 1962 Sec 13sex)*  
**System Baseline:** Next.js 16 (App Router), React 19, TypeScript 6, Tailwind CSS v4, Zustand v5

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3-38bdf8.svg)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-v5.1-orange.svg)](https://github.com/pmndrs/zustand)
[![Tests](https://img.shields.io/badge/Vitest-1353%20Passed%20(115%20Files)-brightgreen.svg)](https://vitest.dev/)
[![E2E](https://img.shields.io/badge/Playwright-Multi--Device-purple.svg)](https://playwright.dev/)
[![Compliance](https://img.shields.io/badge/SARS%20%2F%20LPC%20%2F%20RHA-2026%20Compliant-emerald.svg)](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/sarsTax.ts)

---

## 1. Platform Identity & Value Proposition

The **Moremela Property Investment Hub** addresses the structural complexities unique to the South African property ecosystem:
- **Statutory Municipal Realities:** Volatile municipal billing (City of Johannesburg, City of Cape Town, eThekwini, Eskom direct), Section 118 clearance arrears, advance 4–6 month municipal deposits, and municipal dispute resolution procedures.
- **South African Tax & Legal Frameworks:** Progressive SARS Transfer Duty schedules (2024–2026 tax bands), Legal Practice Council (LPC) recommended conveyancing tariffs, Section 11(a) operating deductions vs. Section 13sex 5% annual commercial residential building allowances, and Section 12(a) VAT exemptions on residential rental supplies.
- **Operational Archetypes:** Grounded in proven South African execution models:
  - **The Suburban Flipper (*Steve Baron Archetype*):** 10-trade Bill of Quantities (BOQ), retail replacement value vs. negotiated cash contractor outlays to quantify sponsor sweat-equity savings, contractor milestone draw schedules (20/30/30/20 retention), time-decay holding burn sensitivity matrices (+30/60/90/120 days), and dual exit paths (Market Disposition vs. BRRRR Equity Extraction).
  - **The High-Yield Multi-Let Scaler (*PropertyBull Archetype*):** Canonical multi-unit lease arrays (`leases[]`), cellular tower and rooftop billboard ancillary cashflow routing, prepaid sub-meter vending commission reconciliations (8–15%), and tokenized POPIA-compliant tenant statement ledgers.
  - **The Township / Infill Micro-Developer (*Witness Mdaka Archetype*):** Build-to-Rent active construction management, phased cash ("brick-by-brick") facilities, TUHF/uMaStandi DFI 15-year financing, and per-unit acquisition/rehab benchmarking.
  - **The Ground-Up & Subdivision Developer:** Pre-construction statutory paper rights tracking (SPLUMA rezoning, Surveyor-General diagram approval, municipal building plans, NHBRC enrolment, sectional title register, occupancy certificates), soft cost stacks (professional team, SPLUMA Sec 42 bulk contributions), bank pre-sales hurdles, debt wipeout breakeven math, and the **Hybrid Split-Exit Strategy** (selling units to extinguish development loans and retaining units for rental cashflow with automated SARS Section 13sex 55% tax deductions).

---

## 2. Core Module Inventory

### 2.1 Executive Dashboard (`/dashboard`)
* **Live Route:** [`src/app/dashboard/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/dashboard/page.tsx)
* **Global Portfolio KPIs:** Aggregates Gross Asset Value (GAV), total active bond liabilities, private syndicate debt, drawn senior development facilities, and net equity via the memoized [`usePortfolioSummary`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/selectors/portfolioSummarySelector.ts) selector hook.
* **Liquid Capital Reserve ("War Chest"):** Tracks total deployable capital combining unallocated liquid cash reserves, ring-fenced contractor retentions, and pre-approved private investor credit lines.
* **4-Slice Asset Allocation Donut:** Reconciles Active Rentals, Ongoing Flips, Active Developments (`developmentsValueZAR` strictly for unsold/un-graduated units), and Liquid Cash Reserve to 100.0% precision without balance-sheet double counting.
* **Automated BRRRR Equity Alerts:** Evaluates holding seasoning (`>= 6 months`) and Loan-to-Value (`LTV < 0.70`) to trigger automated capital extraction notices with maximum 80% LTV bank refinance modeling.

### 2.2 Opportunity Analyzer (`/analyzer`)
* **Live Route:** [`src/app/analyzer/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/analyzer/page.tsx)
* **Deal-Sourcing Triage:** Multi-channel deal ingestion supporting Auction purchases (with buyer's premium and VAT calculations), Distressed Sales (Section 118 municipal arrears isolation), iGrow developer units, private treaty agent listings, direct off-market owners, and raw land / infill parcels.
* **4-Strategy Investment Matrix:** Institutional underwriting across four distinct strategies:
  1. *Buy & Hold Rental:* Cap rate, monthly net cashflow, Cash-on-Cash ROI, DSCR, and Section 11(a) vs Section 13sex deductions.
  2. *Buy & Flip:* 10-trade BOQ, sponsor sweat-equity savings, holding burn matrices (+30/60/90/120 days), and 27% corporate tax reserves.
  3. *Hybrid BRRRR:* Post-rehab ARV refinancing, equity extraction, and capital recycling speed.
  4. *Ground-Up / Subdivision Development:* Hard build rate per $m^2$, 7.5% contingency, 8-line SPLUMA Sec 42 bulk schedule, 2-stage timeline burn (Pre-Approval vs Construction S-Curve), and debt wipeout breakeven.
* **Statutory Cost Engines ([`sarsTax.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/sarsTax.ts)):** Pure calculation engines computing 2026 progressive SARS Transfer Duty ([`calculateSarsTransferDuty`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/sarsTax.ts)), Deeds Office registration tiers, LPC conveyancing legal fees, and bond registration costs.
* **Bond Cancellation & Exit Legal Friction:** Models statutory conveyancing cancellation fees (default `R5,200` incl. 15% VAT based on the 1 July 2026 LSSA base cancellation tariff + Deeds Office cancellation levy + bank instruction fee) and the **National Credit Act (NCA) Section 125 90-Day Early Settlement Penalty** toggle (`Notice Given = R0` penalty vs. `No 90-Day Notice = 90 days' bond interest` or custom bank settlement quote override).
* **Closed-Form MAO Inverse Solver ([`maoSolver.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/maoSolver.ts)):** Maximum Allowable Offer solver determining maximum strike bids based on hurdle internal rates of return (IRR), desired flip ROI, target net cap rates, and PIE Act eviction risk reserves. When early termination notice is not given on a geared flip, the engine incorporates the bid-dependent 90-day penalty factor $k_{\text{penalty}} = (\text{LTV}/100) \times (\text{Rate}/100) \times (90/365)$ into the closed-form denominator in $O(1)$ without circular iteration.
* **Deterministic Deal Intelligence & 4-Strategy Verdict Engine ([`dealIntelligence.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/dealIntelligence.ts) & [`DealIntelligencePanel.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/analyzer/DealIntelligencePanel.tsx)):** Evaluates Rental, Flip, BRRRR, and Development viability against empirical benchmarks across **35 South African investment corridors** ([`investmentNodes.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/constants/investmentNodes.ts)) calibrated with 2026/27 statutory municipal tariffs. When `Development` strategy is active, evaluates against 4 development hurdles (POC $\ge 20\%$, YoC $\ge 12\%$, debt wipeout $\le 65\%$, developer equity $\le$ War Chest reserve) and surfaces 1-click deal-repair levers (Max Allowable Land Bid, 75% LTC TUHF/DFI facility, or required scheme GDV).
* **Context-Aware Municipal Zoning Rights & Bulk Envelope Engine ([`ZoningEnvelopeSubPanel.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/analyzer/ZoningEnvelopeSubPanel.tsx) & [`zoning.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/zoning.ts)):** Evaluates statutory town planning bulk (Floor Area Ratio / FAR), ground footprint coverage %, height storeys, density caps ($du/ha$), and SPLUMA Section 42 rezoning triggers. Features context-aware progressive disclosure: completely hides land-use bulk fields when analyzing Sectional Title non-developments (since individual sectional units do not control underlying erf FAR/coverage), and defaults to collapsed on standard single-unit flips with authoritative prop synchronization and 1-click parameter expansion.
* **Location Scorecard:** 4-node spatial amenity evaluation measuring accessibility to transport corridors, employment nodes, educational institutions, and retail hubs.
* **One-Click Promotion Pipeline:** Seamlessly promotes screened deals to active execution:
  - `promoteOpportunityToFlip`: Automatically transfers purchase basis, rehabilitation budgets, and initializes regional Certificate of Compliance (CoC) trackers.
  - `promoteOpportunityToRental`: Synthesizes tenant lease contracts, sets initial bank bond repayments, and integrates into monthly cashflow projections.
  - `promoteOpportunityToDevelopment`: Transfers land price, buildable bulk area ($m^2$), unit configuration, and 8-item soft cost allowance into `/developments`.

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
* **Progressive Disclosure for Municipal Zoning & Multi-Let Consent Rights ([`FlipProjectHeader.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/flips/FlipProjectHeader.tsx) & [`FlipProjectModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/flips/modals/FlipProjectModal.tsx)):** In the active flip project header ([`FlipProjectHeader.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/flips/FlipProjectHeader.tsx)), renders a compact zoning pill (e.g. `🏛️ Residential 1 (As-of-Right)`) with contextual bulk and consent use hover tooltips for qualifying freehold, multi-unit, and build-to-rent projects. Inside the Add/Edit Flip modal ([`FlipProjectModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/flips/modals/FlipProjectModal.tsx)), dynamically reveals a collapsible configuration drawer with 4 South African statutory presets (`Res 1`, `Res 3`, `Res 4`, `Township Infill`) and municipal consent use checkboxes (`2nd Dwelling / Cottage`, `Backyard Micro-Units`, `Student Commune`) for `Build-to-Rent` and multi-unit setups, while strictly hiding it and scrubbing zoning payloads for Sectional Title properties.
* **Itemized Exit Friction & Refinance Accounting:** Full legal and agent fee breakdowns in [`FlipExitModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/flips/modals/FlipExitModal.tsx), [`calculateFlipFinancials`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/flips.ts), and [`calculateArchivedFlipFinancials`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/flips.ts). On open-market flip dispositions, estate agent commission, bond cancellation fees (`R5,200`), and NCA 90-day penalty interest are deducted from net proceeds; on Build-to-Rent / BRRRR equity extractions (`convertFlipToRental`), estate agent commission is eliminated (`R0`) while retaining statutory bond cancellation (`R5,200`) and NCA 90-day penalty interest on geared acquisitions to prevent post-conversion profit distortion.
* **Dual Exit Execution:**
  - `markFlipAsCompleted`: Records net proceeds, settles linked facilities, and credits capital to `liquidCapitalReserve`.
  - `convertFlipToRental`: Transitions flip to rental portfolio, carrying forward cumulative renovation costs into purchase price basis, re-pointing syndicate funding debt, and initializing Section 13sex tax shield tracking.

### 2.4 Developments Manager (`/developments`)
* **Live Route:** [`src/app/developments/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/developments/page.tsx)
* **Ground-Up & Subdivision Underwriting:** Purpose-built for South African sectional title clusters, residential subdivisions, township infill micro-units, and commercial-to-residential conversions.
* **Top 6-Card KPI Scoreboard ([`DevelopmentKpiBanner.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentKpiBanner.tsx)):**
  1. *Total Development Cost (TDC):* Aggregates land acquisition, Section 118 municipal arrears, 8-line soft costs, active hard build BOQ, contingency reserves, and holding carrying burns (with R/m² and R/unit metrics).
  2. *Gross Development Value (GDV):* Total list prices across all units, accounting for VAT-registered developer output/input VAT claims (`gdv / 1.15`) or R0 transfer duty for private purchasers.
  3. *Profit on Cost (POC %):* Return on TDC before tax and after 27% corporate tax provision.
  4. *Hard Build Rate:* Budgeted build rate per m² vs. actual active BOQ spend pacing (defaulting to user settings baseline).
  5. *Pre-Sales Hurdle & S-Curve Debt Wipeout:* Commercial bank pre-sales threshold tracking (`preSalesHurdlePercent`) and closed-form unit sales required to extinguish senior development debt.
  6. *Hybrid Split-Exit Summary:* Split between units sold to extinguish senior debt and units retained for long-term rental cashflow.
* **6-Card Paper Rights Compliance Gatekeeper ([`DevelopmentApprovalsTab.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentApprovalsTab.tsx)):** Visual status gatekeeper for 6 statutory milestones (SPLUMA Rezoning/Subdivision, SG Diagram Approval, Municipal Building Plans, NHBRC Enrolment, Sectional Title Register, Occupancy Certificate) with target dates and automated 14-day advance calendar warning tasks (`taskSync.ts`).
* **S-Curve Senior Debt Wipeout Waterfall ([`DevelopmentFinanceTab.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentFinanceTab.tsx)):** Models senior construction debt facilities, S-Curve monthly interest burn, drawdowns, repayments, and closed-form debt wipeout math ($\lceil \text{Facility Limit} / \text{Avg Unit Price} \rceil$).
* **Unit Inventory & Hybrid Split-Exit Table ([`DevelopmentUnitInventoryTab.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentUnitInventoryTab.tsx)):** Unit-by-unit inventory (`Available`, `Reserved`, `Bond Approved`, `Sold & Transferred`, `Retained for Rental`), 1-click **"Mark Sold & Pay Down Debt"** action applying net sales proceeds directly to senior bank facilities, and 1-click **"Graduate Retained Units to Rentals"** CTA.
* **SPLUMA Sec 42 Municipal Bulk Services & Professional Team Schedule ([`DevelopmentCostStackTab.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/developments/DevelopmentCostStackTab.tsx)):** Models professional team fees (Town Planner, Architect, Engineer, QS, NHBRC), SPLUMA Section 42 municipal bulk services contributions (water, sewer, electricity), and 10-trade construction BOQ.
* **Cross-Module Bridges:**
  - `promoteOpportunityToDevelopment`: Promotes screened deals from `/analyzer` directly into developments with land price, zoning rights, and build costs carried over.
  - `graduateRetainedUnitsToRental`: Auto-scaffolds a multi-unit property in `/rentals` with prepaid sub-meter leases, transfers residual debt balance, and activates SARS Section 13sex 55% tax deductions when retaining $\ge 5$ new residential units.
  - **Institutional Feasibility in `/proposal` ([`DevelopmentFeasibilitySection.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/proposal/DevelopmentFeasibilitySection.tsx)):** Dynamic development feasibility tear-sheets with capital stack visualizations, pre-sales sensitivity matrices, and statutory approval gatekeeper badges.

### 2.5 Rental Portfolio Manager (`/rentals`)
* **Live Route:** [`src/app/rentals/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/rentals/page.tsx)
* **Multi-Let Lease Architecture:** Canonical `leases[]` array supporting single residential units, dual-living configurations, block-of-flats, and student communes without flat-field anti-patterns.
* **8-Point Property Inspection & Deposit Deduction Engine ([`inspections.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/inspections.ts)):** Fully compliant with **Section 5(3)(e)–(k) of the South African Rental Housing Act (Act 50 of 1999)**:
  - **Onboarding ([`LeaseInspectionDrawer.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/LeaseInspectionDrawer.tsx)):** 15-second mobile "Tap-Only-What's-Broken" 8-category checklist (`Walls, Paint & Ceilings`, `Floors, Tiles & Skirting`, `Doors, Locks, Keys & Remotes`, `Windows, Glass & Blinds`, `Plumbing, Taps & Geyser`, `Electrical, Lights & Plugs`, `Kitchen Stove, Oven & Cupboards`, `Meters, Exterior & Parking`), Cloud Photo Vault URL attachment, and 1-click WhatsApp inspection delivery for electronic tenant acknowledgement.
  - **Move-Out & Settlement ([`TenantNoticeModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/TenantNoticeModal.tsx)):** Side-by-side Ingoing vs. Exit condition diffing, automated degraded-item detection (`Good`/`Fair` ingoing degraded to `Defective` exit), itemized contractor repair deductions, live `netDepositRefundableZAR` auto-sync, excess damage shortfall alerts (`excessDamageShortfallZAR`), and 5-year statutory audit trail retention on `ArchivedLease`.
  - **Public Tenant Portal ([`TenantStatementViewer.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/statements/TenantStatementViewer.tsx)):** Secure tokenized viewer with a dual-tab switcher (`Monthly Statement Ledger` | `Inspection & Condition Report` via `?tab=inspection`) featuring itemized defect photos and a 1-click **"Confirm & Agree via WhatsApp"** digital handshake for statutory compliance.
* **Lean Maintenance Ticketing & Work Order Lifecycle ([`MaintenanceModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/MaintenanceModal.tsx)):**
  - **3-Stage Lifecycle:** Color-coded status badges (**Amber** `Open`, **Blue** `In Progress`, **Emerald** `Resolved`) with 1-click status cycling and inline cost updates via `InlineEditableAmount`.
  - **Supplier Directory Dispatch:** 1-click **"Dispatch to Contractor (WhatsApp)"** action linking to local service suppliers with clean, emoji-free work order dispatch templates.
  - **Interactive Final Resolution Flow:** Clicking **"Mark Resolved"** opens an inline input strip for **Final Invoice Amount (R)** and optional **Invoice #**, ensuring realized cash-flow only deducts actual incurred expenses.
  - **Automated Cloud & Server Check:** Opening the modal triggers `checkCloudAndTenantTickets()`, automatically syncing new tenant reports from Supabase or server memory into the landlord's Zustand store.
* **Tenant Maintenance Intake Portal & Direct Database Persistence ([`submitTenantMaintenanceTicket.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/actions/submitTenantMaintenanceTicket.ts)):**
  - **Interactive Public Intake:** Public tenant statements feature a responsive **"Report Maintenance"** action opening a structured intake dialog (Category, Urgency level, Issue Description, and Preferred Access Window).
  - **Secure Server Action:** Runs with elevated service-role privileges, enforces sliding-window rate limiting (max 3 tickets/lease/hour), generates tracking references (e.g. `WO-4921`), and appends the work order directly to the landlord's `properties.maintenance_history` in Supabase.
  - **Instant WhatsApp Bridge:** Automatically copies pre-formatted request copy to clipboard and opens WhatsApp pre-populated with the generated ticket reference.
* **Disposal & Exit Settlement Engine ([`ExitSaleModal.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/rentals/modals/ExitSaleModal.tsx) & [`calculateDisposalMetrics`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/rentals.ts)):** Reconciles gross capital gains, estate agent commission (private treaty vs. agent), bond cancellation fees (`R5,200`), NCA 90-day early termination penalties, and negative-equity settlement shortfall warnings (`shortfallToSettleZAR`) when debt and legal friction exceed realized sale value.
* **Ancillary Income Matrix:** Commercial non-lease revenue aggregation (MNO cellular towers, rooftop advertising billboards, dedicated parking bays, storage units).
* **Prepaid Sub-Metering vs. Post-Paid Ledger:** Transparent reconciliation of vending platform fees (8–15% deductions from Net Operating Income) against direct municipal utility statements.
* **Municipal Dispute State Machine:** Full lifecycle handling of inaccurate council billing (Logged -> Dispute Lodged -> In Escalation -> Credit Passed -> Ombudsman Referral) with automated formal PDF dispute letter generation.
* **SARB PMT Bond Calculator:** South African Reserve Bank amortization calculations accounting for prime lending rate movements, capital repayments, and tax-deductible interest portions.
* **Tenant Vetting & Public Statements ([`vettingEngine.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/vettingEngine.ts)):** Credit check risk grading (Grades A through D), statutory deposit multiplier recommendations (1.0x to 2.0x), and secure tokenized tenant statement portals (`/statement/[lease_id]`) with POPIA-compliant privacy redaction.

### 2.6 Proposal Generator & Universal Financial Exports (`/proposal`)
* **Live Route:** [`src/app/proposal/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/proposal/page.tsx)
* **Deterministic Funding Structurer ([`proposalIntelligence.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/proposalIntelligence.ts)):** Recommends optimal capital stack structures (Private Lender Fixed Coupon, Syndicate JV Profit Split, Bullet Maturity, or Hybrid Bank + Mezzanine) calibrated to the deal's cashflow coverage, holding duration, and sponsor equity margin.
* **Institutional PDF Tear-Sheets:** Dynamic, client-side PDF generation producing institutional investor memorandums with executive summaries, photo vaults, return waterfalls, and capital repayment tranches. Reconciles 100.0% of exit legal friction and bond cancellation costs within the "Use of Funds" and net return schedules.
* **1-Click WhatsApp Syndication ([`whatsappFormatter.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/whatsappFormatter.ts)):** Generates concise, pre-formatted deal pitch copy and mobile WhatsApp URLs for rapid syndicate outreach, incorporating itemized acquisition and exit legal friction.
* **Universal Accountant GL Journal CSV ([`csvExport.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/export/csvExport.ts)):** Exports general ledger journal entries pre-configured with debit/credit double-entry rows and South African VAT tags (Standard 15% vs. Exempt Residential Rent) for direct ingestion into Xero, Sage South Africa, and QuickBooks.
* **SARS ITR12 Tax Schedules ([`excelExport.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/export/excelExport.ts)):** Pre-formatted annual income tax schedules grouping rental gross revenue, Section 11(a) deductible operational costs, bond interest, and Section 13sex capital allowances.

### 2.7 Global Settings & Investor Profile (`/settings`)
* **Live Route:** [`src/app/settings/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/settings/page.tsx)
* **Investor Profile & Corporate Tax Routing:** Configures tax entity (`Company (27%)`, `Individual (45%)`, or `Pre-Tax`), VAT-exempt managing agency toggle, buy-box investment hurdle thresholds, Google OAuth cloud authentication, and LLM provider API credentials.
* **Automatic Cross-Device Supabase Sync ([`useAutoCloudSync.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/hooks/useAutoCloudSync.ts)):** Continuous multi-device synchronization engine with live navigation header status pill ([`CloudSyncStatusPill`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/navigation/TopHeader.tsx)), 1500ms debounced push on portfolio mutations, automatic cloud hydration on session load or sign-in, loop suppression guard (`isHydratingFromCloud`), and `DBSYNC-02` cross-user contamination prevention.
* **Regional Node Market Benchmark Editor ([`NodeBenchmarkEditor.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/components/settings/NodeBenchmarkEditor.tsx)):** Interactive editor for customizing gross yield, cap rate, price-per-$m^2$, and statutory municipal tariff baselines across all 35 South African investment nodes with CSV/JSON import/export and Supabase cloud sync.
* **Conveyancing & Transfer Legal Settings:** Configures `defaultBondCancellationFeeZAR` (defaulting to `R5,200` incl. 15% VAT per 1 July 2026 LSSA tariffs + Deeds Office cancellation levy + bank instruction fee), synchronizing baseline exit legal cost assumptions across `/analyzer`, `/flips`, `/rentals`, and `/proposal`.

### 2.8 Task & Compliance Calendar Engine (`/tasks`)
* **Live Route:** [`src/app/tasks/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/tasks/page.tsx)
* **Segmented Task Ledger vs. Calendar View:** High-ergonomics view switcher toggling between the chronological operational ledger (`📋 Task Ledger`) and a zero-dependency responsive monthly compliance calendar (`📅 Calendar View`) with shared multi-criteria filtering.
* **Strict Chronological Sorting & Overdue Triage ([`taskCalendar.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/taskCalendar.ts)):** Sorts active tasks by `dueDate` ascending (breaking same-day ties by `Urgent` → `High` → `Medium` → `Low` priority and pinning `Completed` items to the bottom), badging overdue items (`dueDate < todayISO`) with rose border accents and updating the `Pending Tasks` KPI overdue counter.
* **Interactive Calendar Grid & Recurring Ghost Previews ([`recurrence.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/recurrence.ts) & [`taskCalendar.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/calculations/taskCalendar.ts)):** Monday-first 7-column monthly grid projecting read-only dashed preview pills (`Scheduled {Recurrence} Preview`) for active `Weekly`, `Monthly`, `Quarterly`, and `Annually` recurring commitments (respecting `recurrenceEndDate`), paired with a Selected Date Inspector sidebar for 1-click completion and date-prefilled task creation.
* **RFC 5545 iCalendar (.ics) Export & External Calendar Deep Links ([`calendarExport.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/export/calendarExport.ts)):** Pure client-side export generating RFC 5545 `.ics` calendar payloads with CRLF line endings, exclusive all-day `DTEND` dates (`dueDate + 1 day`), native recurrence rules (`RRULE:FREQ=WEEKLY|MONTHLY|YEARLY` with `INTERVAL=3` quarterly and `UNTIL` bounds), and 9:00 AM `VALARM` display reminders. Includes bulk filtered active export (`[ 📅 Export .ics (N) ]`) and per-task quick actions for direct Google Calendar and Outlook 365 compose deep links.
* **Automated Cross-Domain Reminders ([`taskSync.ts`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/lib/store/utils/taskSync.ts)):** Automatically schedules and synchronizes 60-day lease expiry renewal notices, 14-day Body Corporate AGM budget reviews, and pre-construction statutory approval warning tasks across rentals, flips, developments, and pipeline opportunities.

### 2.9 Standalone Human-First Landing Page (`/`)
* **Live Route:** [`src/app/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/page.tsx) *(with [`src/app/welcome/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/welcome/page.tsx) redirecting to `/` via `redirect('/')` for backward compatibility)*
* **Human-Centric Deal Alignment:** A low-word-count institutional landing page linking an entrepreneur's core life goals directly to live underwriting and management modules:
  - **Monthly Cash Flow:** Feeds single-let/multi-let tracking, utility recovery, and 1-click statements ([`/rentals`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/rentals/page.tsx)).
  - **Build a Lump-Sum Cash War Chest:** Drives 10-trade BOQ management, stage draws, and Section 118 clearance timelines ([`/flips`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/flips/page.tsx)).
  - **Vet a Deal Before You Sign:** Instant SARS transfer duty, conveyancing tariffs, and MAO calculation ([`/analyzer`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/analyzer/page.tsx)).
  - **Ground-Up Subdivision & Clusters:** Plan statutory approvals, pre-sales debt wipeout, and hybrid exit models ([`/developments`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/developments/page.tsx)).
  - **Long-Term Wealth & Partners:** BRRRR refinance readiness, tax reserves, and 1-page PDF/WhatsApp pitch memos ([`/proposal`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/proposal/page.tsx)).
* **Architecture Grid ("Guard the Kraal. Grow the Baobab."):** 3-column value matrix emphasizing Day-1 cash protection against South African transaction traps, mobile building-site operations, and instant lender syndication.
* **Workspace Integration:** Directly accessible from any view via the **"Welcome & Overview"** link in the navigation sidebar under *Help & Reference*.

### 2.10 Hidden Founder Story & Cultural Vision (`/about`)
* **Live Route:** [`src/app/about/page.tsx`](file:///c:/Users/morok/OneDrive/L%20and%20M%20trading/src/app/about/page.tsx)
* **Cultural Roots & Tribute:** Documents the founding purpose and cultural heritage behind *Moremela* (from Setswana, Sesotho, and Sepedi *go remela* — *"the one who clears the way"* to build the homestead / *kraal*), paying tribute to **Sally Motlana**, recipient of the National **Order of the Baobab**.
* **Stealth GTM Protection:** Strict Next.js Server Component configured with `robots: { index: false, follow: false, nocache: true }` metadata, private draft notice badge, and gated navigation behind `SHOW_ABOUT_PAGE_IN_NAV === false` in `Sidebar.tsx`.

---

## 3. Tech Stack Architecture

| Layer | Technology | Specification / Package |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.4.5` (React Server Components + Client Boundaries) |
| **Runtime UI** | React | `19.3.1` |
| **Language** | TypeScript | `6.0.0` (Strict typing, no `any` leaks in calculations) |
| **Styling** | Tailwind CSS | `4.3.5` (Tailwind PostCSS engine, custom ZAR design tokens) |
| **Client State** | Zustand | `5.1.0` (11 domain slices, `persist` middleware, atomic selectors) |
| **Schema Validation** | Zod | `4.6.5` (Utility ingestion, JSON schema assertions) |
| **Document Processing** | PDF-Lib / PDF.js | `pdf-lib 1.17.1`, `pdfjs-dist 6.5.438`, `html2pdf.js 0.14.0` |
| **Database & Cloud** | Supabase | `@supabase/supabase-js 2.119.0` (Row-Level Security, Google OAuth, cloud sync) |
| **Product Telemetry** | PostHog | `posthog-js 1.447.3` (POPIA-compliant input masking & client analytics) |
| **Unit & Integration** | Vitest | `5.1.0` (115 test files, 1,353 passing tests) |
| **End-to-End (E2E)** | Playwright | `1.65.0` (Mobile, Tablet, Desktop responsive regression suite) |
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
│   │   ├── actions/              # Next.js Server Actions (submitTenantMaintenanceTicket, sendStatementEmail)
│   │   ├── layout.tsx            # Root Layout, OpenGraph & JSON-LD Entity Schema
│   │   ├── robots.ts             # Crawler Indexing & POPIA Privacy Rules (/robots.txt)
│   │   ├── sitemap.ts            # Public Entry Route XML Sitemap (/sitemap.xml)
│   │   ├── page.tsx              # Human-First Landing Page & Goal Switcher
│   │   ├── dashboard/page.tsx    # Executive Global Portfolio Dashboard
│   │   ├── welcome/page.tsx      # Legacy Route Redirect (-> /)
│   │   ├── about/page.tsx        # Stealth Founder Story & Cultural Vision (GTM Private Draft)
│   │   ├── analyzer/page.tsx     # Opportunity Deal Sourcing & Underwriting
│   │   ├── developments/page.tsx # Ground-Up Clusters, Infill & Subdivision Command Center
│   │   ├── flips/page.tsx        # Buy-and-Flip Renovation Command Center
│   │   ├── rentals/page.tsx      # Multi-Let Rental Portfolio & Operations
│   │   ├── funding/page.tsx      # Private Investor & Bond Syndicate Facility Manager
│   │   ├── proposal/page.tsx     # Deal Memorandums & Investment Proposals
│   │   ├── settings/page.tsx     # Investor Profile, SARS Settings & AI Keys
│   │   ├── tasks/page.tsx        # Global Task Board & Compliance Calendar
│   │   ├── deal-room/[token]/    # POPIA-Masked External Development Deal Room
│   │   └── statement/[lease_id]/ # Public Tokenized Tenant Statement Viewer
│   ├── components/               # Tier 3: Modular Component Trees & Modals
│   │   ├── dashboard/            # KPI strips, allocation graphs, tax widgets
│   │   ├── analyzer/             # Underwriting cards, scorecards, input forms
│   │   ├── developments/         # KpiBanner, Inventory tab, Cost stack tab, Approvals tab, Finance tab
│   │   ├── flips/                # BOQ tables, phase checklists, delay matrix, exit modal
│   │   ├── rentals/              # Rental cards, meter modals, inspection drawer, maintenance modal, exit modals
│   │   └── common/               # Shared modals, badges, inputs, buttons
│   ├── hooks/                    # Tier 2: Headless Domain UI State Hooks
│   │   ├── useAutoCloudSync.ts   # Continuous Cross-Device Cloud Sync Engine & Reactive Sync Store
│   │   ├── flips/                # useFlipCalculations, useFlipModalManager, useBoqForm
│   │   └── rentals/              # useRentalPortfolio, useRentalModalState, useDirectPdfUpload
│   ├── lib/
│   │   ├── calculations/             # Tier 4: Pure 100% Deterministic ZAR Engines
│   │   │   ├── propertyMetrics.ts    # Cap rates, cashflow, IRR, DSCR formulas
│   │   │   ├── developments.ts       # TDC, GDV, POC%, VAT claims, debt wipeout & hybrid split-exit math
│   │   │   ├── dealIntelligence.ts   # Multi-strategy verdict & automated deal-repair engine
│   │   │   ├── proposalIntelligence.ts # Deterministic capital stack & funding structurer
│   │   │   ├── flips.ts              # Renovation milestone draws, sponsor savings, holding & exit costs
│   │   │   ├── arrears.ts            # Dynamic monthly tenant ledger, allocation engine
│   │   │   ├── inspections.ts        # RHA Section 5 8-point checklist & deposit deduction engine
│   │   │   ├── maoSolver.ts          # Maximum Allowable Offer solver (Flip & Rental with penalty factor)
│   │   │   ├── sarsTax.ts            # SARS Transfer Duty, Deeds Office, Section 13sex
│   │   │   ├── holdingSensitivity.ts # Delay holding burn matrix (+30/60/90/120d)
│   │   │   ├── municipalTariffs.ts   # Water/power sliding municipal tariff scales
│   │   │   ├── recurrence.ts         # Recurring task cadence & deduplication engine
│   │   │   ├── taskCalendar.ts       # Chronological sorting, overdue triage & calendar ghost projections
│   │   │   ├── vettingEngine.ts      # Pre-lease tenant scoring & deposit calculator
│   │   │   └── zoning.ts             # Statutory town planning bulk envelope (FAR, coverage, storeys, density caps & rezoning)
│   │   ├── constants/            # Regional SA investment node baselines (35 corridors)
│   │   ├── store/                # Tier 5: Modular Zustand Slices & Facade
│   │   │   ├── slices/           # 11 domain slices (rental, flip, development, opp, funding, etc.)
│   │   │   ├── selectors/        # Memoized selectors (usePortfolioSummary, equityAlerts)
│   │   │   ├── persistence/      # Auto-healing local-storage migrations & schema repair
│   │   │   ├── utils/            # taskSync.ts (Acyclic leaf synchronization utility)
│   │   │   └── usePortfolioStore.ts # Central store facade
│   │   ├── export/               # CSV, Excel, GL Journal, SARS ITR12 & RFC 5545 .ics exporters
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

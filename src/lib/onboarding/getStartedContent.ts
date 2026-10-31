/**
 * Get Started — Reference & Quick-Start Hub content.
 *
 * Text-first, typed, and static. The /get-started page renders this file verbatim; progress is tracked
 * by the user ticking checkboxes (stored as `completedGuideSteps` in the persisted portfolio store).
 * Nothing here inspects portfolio state.
 *
 * Every `href` must point to a real route, and any `#anchor` must exist as an `id="..."` on that page.
 * `src/lib/onboarding/__tests__/getStartedContent.test.ts` enforces both.
 */

export type GuideRoute =
  | '/'
  | '/analyzer'
  | '/funding'
  | '/flips'
  | '/rentals'
  | '/proposal'
  | '/tasks'
  | '/settings';

/** Every route a guide is allowed to deep link into. */
export const GUIDE_ROUTES: readonly GuideRoute[] = [
  '/',
  '/analyzer',
  '/funding',
  '/flips',
  '/rentals',
  '/proposal',
  '/tasks',
  '/settings',
];

export interface GuideFeature {
  /** Stable checklist ID. Persisted in localStorage, so never rename an existing ID. */
  id: string;
  title: string;
  /** One-line summary of what the feature does. */
  summary: string;
  /** Exactly three short, numbered "How to" steps. */
  howTo: readonly [string, string, string];
  /** South Africa-specific practical tip. */
  proTip: string;
  /** Deep link, optionally with a `#anchor` on the target page. */
  href: string;
  ctaLabel: string;
  /** Optional: which modules this setting powers (used for Step 0 – Foundation). */
  powers?: string;
}

export interface ModuleGuide {
  id: string;
  moduleName: string;
  route: GuideRoute;
  /** One line: what this module is for. */
  purpose: string;
  /** 3–4 key features. */
  features: readonly GuideFeature[];
}

export interface JourneyStage {
  id: string;
  /** 0 = Foundation (Settings), 1–5 = the investor journey. */
  stepNumber: number;
  phase: 'Foundation' | 'Find' | 'Fund' | 'Execute' | 'Pitch' | 'Monitor';
  title: string;
  summary: string;
  modules: readonly ModuleGuide[];
}

export interface GoLiveStep {
  id: string;
  title: string;
  summary: string;
  howTo: readonly [string, string, string];
  proTip: string;
}

export const DEMO_DATA_TIP =
  'Try every step on the demo deals first. The app ships with realistic South African sample rentals, flips, funding and pipeline deals, so you can experiment safely. When you are ready, use Clear Demo to go live (final step below).';

export const GET_STARTED_STAGES: readonly JourneyStage[] = [
  // ---------------------------------------------------------------------------
  // STEP 0 — FOUNDATION (SETTINGS)
  // ---------------------------------------------------------------------------
  {
    id: 'stage-0',
    stepNumber: 0,
    phase: 'Foundation',
    title: 'Settings: set your foundation',
    summary:
      'Spend two minutes here first. Every other module reads these defaults, so getting them right means every number you see later is your number.',
    modules: [
      {
        id: 'settings',
        moduleName: 'Investor Profile & Settings',
        route: '/settings',
        purpose: 'Store your entity, finance defaults and Buy Box once, so every calculation, badge and pitch deck uses them.',
        features: [
          {
            id: 'settings-entity-branding',
            title: '0a · Entity & Branding',
            summary: 'Your legal entity, contact details, remittance bank details, logo and investor bio.',
            powers: 'Proposal pitch decks (cover page, bio) and tenant statement remittance (banking details on statements and PDFs).',
            howTo: [
              'Open Settings → Entity & Legal Representation and enter your trading entity, representative and contact details.',
              'In Banking / Remittance Details, add your bank name, account number and branch code for tenant payments.',
              'In Custom Brand Logo & Investor Bio, upload your logo and write a short track-record bio, then click Save.',
            ],
            proTip:
              'Use the entity name exactly as registered with CIPC. Adding your remittance bank details embeds payment instructions directly onto tenant statement portals and emailed PDFs.',
            href: '/settings#settings-entity',
            ctaLabel: 'Go to Entity & Branding',
          },
          {
            id: 'settings-finance-defaults',
            title: '0b · Finance Defaults',
            summary: 'Prime rate, exit agent commission, VAT status and tax entity, used as the starting point for every new deal.',
            powers: 'Opportunity Analyzer (bond, exit costs, net profit) and the SARS tax reserve on the Dashboard.',
            howTo: [
              'In Default Financial & Acquisition Metrics, set the SA Prime Lending Rate (10.75% is the default; update it after each SARB repo-rate decision).',
              'Set your default exit agent commission and tick "Agency is VAT-Exempt" only if your agent is not VAT-registered.',
              'Pick your default tax entity, then set the Marginal Tax Rate (31% is the default) in the Buy Box section, and click Save.',
            ],
            proTip:
              'Banks quote bonds as "prime plus or minus a spread". Keep the plain prime rate here, then model each deal\'s negotiated spread with the Analyzer\'s Prime Spread slider, so one setting change after an MPC meeting updates every deal.',
            href: '/settings#settings-finance',
            ctaLabel: 'Go to Finance Defaults',
          },
          {
            id: 'settings-buy-box',
            title: '0c · Buy Box Hurdles',
            summary: 'Your minimum yield, cash flow, ROI, DSCR and maximum Day-1 capital, i.e. your investment mandate.',
            powers: 'The pass/fail "Buy Box Match" badge on every Analyzer deal card and in Side-by-Side Compare.',
            howTo: [
              'Scroll to Strategy-Aware Buy Box Hurdles & SARS Criteria and set your minimum net yield, monthly cash flow and cash-on-cash ROI.',
              'Set your minimum flip ROI, maximum Day-1 capital and minimum DSCR.',
              'Click Save, then open the Analyzer: each deal card now shows "Buy Box Match (x/y)".',
            ],
            proTip:
              'A DSCR hurdle of about 1.2x (rent covers the bond 1.2 times after costs) leaves headroom for a vacancy month or a rate hike, and it is roughly where SA bank credit teams start to get comfortable with buy-to-let.',
            href: '/settings#settings-buybox',
            ctaLabel: 'Go to Buy Box Hurdles',
          },
          {
            id: 'settings-node-benchmarks',
            title: '0d · Regional Node Benchmarks',
            summary: 'Gross yield ranges, vacancy, capital growth, m² prices and municipal rates tariffs across 35 South African corridors.',
            powers: 'Opportunity Analyzer corridor audits, the 1-click "Use Node Defaults" button, and Proposal Section 1B fundamentals.',
            howTo: [
              'Scroll to Regional Node Market Benchmarks (35 SA Corridors) and search or filter by province.',
              'Click any corridor to customize gross yield range, typical vacancy, capital growth, m² prices or municipal rates (cents in the Rand).',
              'Use Export CSV to edit in bulk or Import CSV/JSON to restore verified market research across all 35 corridors.',
            ],
            proTip:
              'Municipal tariffs vary widely across South African metros: City of Johannesburg levies ~0.85c in the Rand while City of Cape Town is ~0.65c. Setting the tariff per corridor automatically derives exact monthly rates for any purchase price or valuation.',
            href: '/settings#settings-node-benchmarks',
            ctaLabel: 'Go to Regional Benchmarks',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // STEP 1 — FIND (ANALYZER)
  // ---------------------------------------------------------------------------
  {
    id: 'stage-1',
    stepNumber: 1,
    phase: 'Find',
    title: 'Find: screen deals in the Analyzer',
    summary: 'Run every candidate property through the numbers before you bid.',
    modules: [
      {
        id: 'analyzer',
        moduleName: 'Opportunity Analyzer',
        route: '/analyzer',
        purpose: 'Screen a deal in minutes: LSSA legal fees, SARS transfer duty, bond rate-shock, Day-1 cash, yield and maximum offer, measured against your Buy Box.',
        features: [
          {
            id: 'analyzer-deal-screening',
            title: 'Deal Screening & Node Defaults',
            summary: 'Model purchase price, deposit, regional node benchmarks, LSSA conveyancing and Day-1 capital with 1-click market defaults.',
            howTo: [
              'Click Edit on a demo deal (or start fresh) to load it into the South African Acquisition & Yield Calculator.',
              'Select a city or regional corridor, click "Use Node Defaults" to auto-populate market vacancy, capital growth and municipal rates, and choose your bond preset.',
              'When Units / Rooms > 1, inspect the Build / Unit and All-In / Unit benchmarks, or open the MAO Quick Solver to back-solve your Max Allowable Bid (MAO) before saving.',
            ],
            proTip:
              'The 1-click "Use Node Defaults" button populates empirical norms from the property\'s regional corridor (or your custom /settings overrides), calibrating municipal rates and vacancy buffers to local market reality alongside July 2026 LSSA legal fees and SARS Transfer Duty.',
            href: '/analyzer#analyzer-calculator',
            ctaLabel: 'Open the calculator',
          },
          {
            id: 'analyzer-buy-box-dscr',
            title: '3-Strategy Verdict & Deal Fixer',
            summary: 'Simultaneous 3-strategy evaluation (Rental vs Flip vs BRRRR) with 1-click Deal Fixer prescription levers.',
            howTo: [
              'Switch to the Deal Sourcing Pipeline tab to inspect the 3-Strategy Verdict Strip evaluating Rental, Flip, and BRRRR fit scored 0–100.',
              'When hurdles fail, review the 1-click Deal Fixer levers: "Apply Target Rent", "Apply Max Bid (MAO)", and "Rebalance LTV".',
              'Click any repair lever to immediately recalibrate the deal and turn the Buy-Box badge emerald green on the first click.',
            ],
            proTip:
              'The Deal Fixer runs an exact net-to-gross solver accounting for vacancy buffers, management fees, and 15% VAT on agency commission. A single click solves the required monthly rent or maximum bid price to satisfy all Buy-Box hurdles simultaneously.',
            href: '/analyzer#analyzer-pipeline',
            ctaLabel: 'Open the pipeline',
          },
          {
            id: 'analyzer-sensitivity',
            title: 'Rate-Shock & Sensitivity Sliders',
            summary: 'Stress-test rate hikes (+100 / +200 bps) via the Rate-Shock Strip, plus holding period, exit VAT and vacancy.',
            howTo: [
              'Inspect the 3-column Rate-Shock Strip beneath the results grid to see your bond payment, net cashflow and DSCR at Current, +100 bps (+1%), and +200 bps (+2%).',
              'In the calculator, drag the Holding Period (1–12 months) slider and toggle the exit VAT option on flips.',
              'Stress Vacancy (0–15%) and Prime Spread (±200 bps) to verify where your margin of safety holds.',
            ],
            proTip:
              'A deal that only passes at today\'s prime is fragile. The Rate-Shock Strip gives you instant PASS (≥1.30x), WATCH (1.00x–1.29x) or FAIL (<1.00x) status so you know whether the asset survives a SARB rate-hiking cycle before committing capital.',
            href: '/analyzer#analyzer-sensitivity',
            ctaLabel: 'Open the sliders',
          },
          {
            id: 'analyzer-compare',
            title: 'Duplicate Scenario & Side-by-Side Compare',
            summary: 'Clone a deal as a what-if, then compare candidates in one table.',
            howTo: [
              'Click the ⋯ menu on a pipeline card and select Duplicate Scenario to create a "(Scenario)" copy.',
              'Edit the copy (price, rent or strategy) without touching the original.',
              'Tick Compare on two or more cards, then click Compare Side-by-Side.',
            ],
            proTip:
              'Compare the same property as a Flip and as a BRRRR rental. SARS usually taxes flip profit as revenue income at your full marginal rate, while a long-term hold can qualify for CGT treatment on exit.',
            href: '/analyzer#analyzer-pipeline',
            ctaLabel: 'Compare deals',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // STEP 2 — FUND (FUNDING)
  // ---------------------------------------------------------------------------
  {
    id: 'stage-2',
    stepNumber: 2,
    phase: 'Fund',
    title: 'Fund: line up capital & partners',
    summary: 'Know your real buying power before you make an offer.',
    modules: [
      {
        id: 'funding',
        moduleName: 'Funding & Capital',
        route: '/funding',
        purpose: 'Track cash, partner and lender capital, and see your true purchasing power after committed spend.',
        features: [
          {
            id: 'funding-liquid-reserve',
            title: 'Liquid Reserve & Purchasing Power',
            summary: 'Gross war chest minus ring-fenced capital equals net purchasing power.',
            howTo: [
              'Set your cash reserve with the pencil icon on the Dashboard\'s "Free Unallocated Cash" card.',
              'Open Funding & Capital and read the banner: Gross War Chest − Ring-Fenced = Net Purchasing Power.',
              'Check this figure before every offer, because ring-fenced contractor draws and council deposits are already committed.',
            ],
            proTip:
              'Keep 3–6 months of bond, levies and rates per property as an untouchable buffer. Municipal billing errors and tenant arrears are common in SA, and a cash buffer stops them turning into a missed bond payment.',
            href: '/funding#funding-reserve',
            ctaLabel: 'View purchasing power',
          },
          {
            id: 'funding-partner-capital',
            title: 'Partner, Stokvel & Phased Cash Capital',
            summary: 'Record private loans, JV partners, stokvel syndicates, DFI facilities and phased "brick-by-brick" cash builds.',
            howTo: [
              'Click Add Capital Source in the Funding header.',
              'Enter the lender or partner, or click a 1-click 4-Phase BOQ Template (🧱 Brick-by-Brick Cash, 🤝 Stokvel / Syndicate, or 🏗️ DFI) to scaffold Foundation, Roof, 1st Fix and Practical Completion tranches.',
              'Use Log Payment to Lender as you repay external facilities, while self-funded Brick-by-Brick rows are badged as R 0 External Debt.',
            ],
            proTip:
              'Phased own-cash ("brick-by-brick") builds let you fund ground-up or backroom developments out of monthly personal cash flow with 0% interest and R 0 external debt liability. For private loans or stokvel syndicates, always put the interest rate, profit-share and security in a signed written agreement.',
            href: '/funding#funding-ledger',
            ctaLabel: 'Open the Capital Ledger',
          },
          {
            id: 'funding-link-to-deals',
            title: 'Link Capital to Deals',
            summary: 'Tie each facility to a flip or rental, with phased tranches and delay sync.',
            howTo: [
              'When adding a capital source, choose the linked deal (or leave it as General Portfolio Liquidity).',
              'Add tranches for phased draws so undrawn amounts are not counted as debt.',
              'If a transfer slips, use Sync Funding With Deal Delay to push out the maturity and interest.',
            ],
            proTip:
              'Linking each loan to the property it funds gives you a clean audit trail. Interest on money borrowed to produce rental income is generally deductible, but SARS will ask you to prove what the funds were used for.',
            href: '/funding#funding-ledger',
            ctaLabel: 'Link capital',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // STEP 3 — EXECUTE (FLIPS OR RENTALS)
  // ---------------------------------------------------------------------------
  {
    id: 'stage-3',
    stepNumber: 3,
    phase: 'Execute',
    title: 'Execute: run it as a Flip or a Rental',
    summary: 'Promote a winning deal, then manage it day to day in the matching module.',
    modules: [
      {
        id: 'flips',
        moduleName: 'Buy-and-Flip Manager',
        route: '/flips',
        purpose: 'Run renovation projects: budget, contractor draws, holding burn and exit profit.',
        features: [
          {
            id: 'flips-promote-deal',
            title: 'Promote a Deal & Build-to-Rent Mode',
            summary: 'Turn an Analyzer deal into a live flip or multi-let Build-to-Rent project with its numbers carried over.',
            howTo: [
              'In the Analyzer pipeline, advance the deal with Submit Offer → and Begin DD →, then click Promote to Flip.',
              'In the project modal, choose 🔄 Flip for Sale (Resale Exit) or 🏘️ Build-to-Rent (Hold for Multi-Let Cashflow) and set Units / Rooms.',
              'When a Build-to-Rent project finishes construction, click Graduate to Rental to auto-scaffold Unit 1..N leases and prepaid sub-meters in Rental Portfolio.',
            ],
            proTip:
              'Toggling Build-to-Rent lets micro-developers use the full 10-trade BOQ and contractor retention controls during construction while zeroing out phantom resale agent commission, bond cancellation fees and SARS flip tax — reporting Post-Build Equity Created instead.',
            href: '/analyzer#analyzer-pipeline',
            ctaLabel: 'Promote from the pipeline',
          },
          {
            id: 'flips-boq-draws',
            title: 'BOQ & Contractor Draws',
            summary: 'Bill of Quantities line items, milestone drawdowns, retention and PIE Act contractor gates.',
            howTo: [
              'Select a flip, open the BOQ & Execution Drawings tab, and add line items with contractor, cost and retention %.',
              'Track the Contractor Milestone Drawdown gates: deposit, first fix, finishes and practical completion.',
              'Ensure unlawful occupant eviction orders are executed before disbursing draws, and release retention only after snags are signed off.',
            ],
            proTip:
              'Hold back 5–10% retention until practical completion, and never disburse contractor drawdowns if unlawful occupants remain on site — wait until the Sheriff executes the eviction order and issues a return of service under the PIE Act.',
            href: '/flips#flips-boq',
            ctaLabel: 'Open the BOQ',
          },
          {
            id: 'flips-holding-burn',
            title: 'Holding Burn',
            summary: 'Monthly carrying cost (bond, rates, levies, insurance) multiplied by months held.',
            howTo: [
              'Open a flip and inspect the Total Holding Cost card (or click Simulate Delay Matrix in the operational math strip) to see the itemised monthly burn.',
              'Update the estimated duration whenever the schedule slips.',
              'Watch the projected profit fall with each extra month, and decide early whether to cut scope or sell sooner.',
            ],
            proTip:
              'Transfers in SA typically take 2–3 months after a sale is agreed, and the Section 118 rates clearance can add weeks. Budget your holding burn to the registration date, not the day the buyer signs.',
            href: '/flips#flips-holding-cost',
            ctaLabel: 'View holding cost',
          },
        ],
      },
      {
        id: 'rentals',
        moduleName: 'Rental Portfolio',
        route: '/rentals',
        purpose: 'Run income properties: tenants, rent ledger, arrears, utilities and SARS records.',
        features: [
          {
            id: 'rentals-tenants-ledger',
            title: 'Tenants, Ledger & Inspections',
            summary: 'Lease details, tenant vetting, RHA Section 5 joint inspections, bond paydown, and monthly arrears.',
            howTo: [
              'On a rental card, open Lease & Costs to score credit with Pre-Lease Vetting and record an 8-Point Ingoing Inspection (RHA Sec 5).',
              'When a tenant vacates, use Notice & Move-Out to run a joint Exit Inspection, log repair deductions, and settle the net deposit refund.',
              'Switch to Payments & Arrears to log monthly rent, track utility cost recoveries, and record bad-debt write-offs.',
            ],
            proTip:
              'Under Section 5 of the SA Rental Housing Act, landlords who fail to conduct a joint ingoing inspection forfeit the statutory right to deduct damage repairs from a tenant\'s deposit. Adding extra monthly bond payments accelerates debt-free cashflow without altering your SARS Section 11(a) tax reserve.',
            href: '/rentals#rentals-portfolio',
            ctaLabel: 'Open the portfolio',
          },
          {
            id: 'rentals-smart-import',
            title: 'Smart Document Import',
            summary: 'Extract figures from agent payout statements and municipal or Eskom bills (PDF).',
            howTo: [
              'Add your AI key under Settings → AI Integration (BYOK) once.',
              'Click Smart Document Import and select up to three PDFs.',
              'Check the extracted figures in the verification screen, then confirm to update the property.',
            ],
            proTip:
              'Municipal accounts are often billed on estimated readings. Importing every month makes sudden estimate "catch-ups" obvious before they become arrears.',
            href: '/rentals#rentals-import',
            ctaLabel: 'Import a document',
          },
          {
            id: 'rentals-meters-disputes',
            title: 'Meters & Disputes',
            summary: 'Log physical meter readings and generate municipal dispute letters.',
            howTo: [
              'On a rental card, click Log Meter and record the reading date and value.',
              'Compare your actual readings with the municipal bill.',
              'When they disagree, generate a dispute letter from the readings and send it before the due date.',
            ],
            proTip:
              'Lodge billing disputes in writing and keep proof of submission. Under Section 102 of the Municipal Systems Act, credit control should not be applied to the specific amount in dispute, but you must keep paying the undisputed portion.',
            href: '/rentals#rentals-portfolio',
            ctaLabel: 'Log a meter reading',
          },
          {
            id: 'rentals-tenant-statements',
            title: 'Tenant Statements & Inspections',
            summary: 'Verify monthly rental ledgers, share statutory RHA inspection reports, and distribute portal links via WhatsApp or email.',
            howTo: [
              'On a rental card, click Utilities & Statement to inspect the current period ledger, utility recoveries and arrears.',
              'Click Share Statement to email PDF statements via Resend or copy the public tenant portal link (/statement/[token]).',
              'Tenants can review their billing ledger or switch to the Inspection & Condition Report tab for 1-click WhatsApp statutory sign-off.',
            ],
            proTip:
              'Public tenant portal links allow tenants to inspect their itemized 8-point condition audit and agree to move-in/exit deductions via WhatsApp with zero paperwork. Generated PDFs automatically preserve a clean print layout.',
            href: '/rentals#rentals-portfolio',
            ctaLabel: 'View rental statements',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // STEP 4 — PITCH (PROPOSAL)
  // ---------------------------------------------------------------------------
  {
    id: 'stage-4',
    stepNumber: 4,
    phase: 'Pitch',
    title: 'Pitch: turn a deal into an investor deck',
    summary: 'Package a deal for private funders using your branding from Step 0.',
    modules: [
      {
        id: 'proposal',
        moduleName: 'Proposal Generator',
        route: '/proposal',
        purpose: 'Produce a branded, one-click investor pitch for any deal and export it as a PDF.',
        features: [
          {
            id: 'proposal-select-deal',
            title: 'Select a Deal',
            summary: 'Pick any pipeline opportunity, flip or rental to pitch.',
            howTo: [
              'Open Proposal Generator, or click Pitch Deck on an Analyzer card.',
              'Choose the deal in Select Deal & Tailor Pitch Terms.',
              'Check that the tear-sheet below picks up the deal\'s numbers.',
            ],
            proTip:
              'Pitch deals that already pass your Buy Box. Funders judge you on the first deal you bring them.',
            href: '/proposal#proposal-deal-selector',
            ctaLabel: 'Choose a deal',
          },
          {
            id: 'proposal-tailor-terms',
            title: 'Facility Structurer & Economics',
            summary: 'Auto-Structure optimal facility terms, return presets, live lender economics strip, and funder security.',
            howTo: [
              'In Select Deal & Tailor Pitch Terms, click "Auto-Structure Optimal Terms" to auto-populate terms aligned with the strategy, or pick a preset (Bullet Bridge, Monthly Coupon, JV Split).',
              'Inspect the live Lender vs. Sponsor Economics Strip showing Total Lender Payout, Sponsor Net Cashflow, and Principal Break-Even Exit.',
              'Review the investor-return figures and copy the formatted WhatsApp pitch summary to share directly with prospective lenders.',
            ],
            proTip:
              'The Auto-Structurer calculates the exact Lender Principal Break-Even Exit price, factoring in sales commissions and bond cancellation fees so prospective funders see their downside safety buffer before committing capital.',
            href: '/proposal#proposal-deal-selector',
            ctaLabel: 'Tailor terms',
          },
          {
            id: 'proposal-export-pdf',
            title: 'Tear-Sheet Matrix & PDF Export',
            summary: 'Print or export branded tear-sheet featuring Section 1B Strengths/Mitigants and Section 5 Sensitivity Matrix.',
            howTo: [
              'Confirm your logo and bio from Settings appear on the Executive Tear-Sheet.',
              'Review Section 1B (Underwriting Strengths vs. Risk Mitigants Matrix) and Section 5 (Break-Even Callout Strip & Sensitivity Table).',
              'Click Print / Export PDF, choose "Save as PDF", and distribute a print-safe pitch deck with zero orphan headers.',
            ],
            proTip:
              'Section 1B automatically synthesizes mitigants for PIE Act evictions, Section 118 municipal clearances, and Section 13sex building deductions, while Section 5 stress-tests valuations from -15% to +10% to give credit committees institutional-grade comfort.',
            href: '/proposal#proposal-document',
            ctaLabel: 'View the pitch',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // STEP 5 — MONITOR (DASHBOARD & TASKS)
  // ---------------------------------------------------------------------------
  {
    id: 'stage-5',
    stepNumber: 5,
    phase: 'Monitor',
    title: 'Monitor: Dashboard & Tasks',
    summary: 'Keep an eye on equity, tax and deadlines, and never miss a renewal or AGM.',
    modules: [
      {
        id: 'dashboard',
        moduleName: 'Global Portfolio Dashboard',
        route: '/',
        purpose: 'One view of net equity, cash flow, actuals vs budget and your SARS tax reserve.',
        features: [
          {
            id: 'dashboard-net-equity',
            title: 'Net Equity & KPIs',
            summary: 'Portfolio value, liabilities, net equity and monthly cash flow.',
            howTo: [
              'Open the Dashboard and read the top KPI cards.',
              'Update property market values periodically so net equity stays realistic.',
              'Use the Seed Capital banner to track purchasing power for the next deal.',
            ],
            proTip:
              'Use the latest municipal valuation roll or a recent bank valuation as your market value. Agent asking prices overstate equity.',
            href: '/#dashboard-kpis',
            ctaLabel: 'View KPIs',
          },
          {
            id: 'dashboard-actuals-budget',
            title: 'Actuals vs Budget (SA Tax Year)',
            summary: 'Year-to-date actuals against budget, from 1 March to the end of February.',
            howTo: [
              'Open the Actuals vs Budget strip on the Dashboard.',
              'Compare actual rent and expenses year to date against budget.',
              'Investigate any line that is more than 10% off budget.',
            ],
            proTip:
              'The SA tax year runs from 1 March to the end of February, so this strip lines up with your ITR12 return rather than the calendar year.',
            href: '/#dashboard-actuals',
            ctaLabel: 'View actuals',
          },
          {
            id: 'dashboard-tax-reserve',
            title: 'Section 11(a) Tax Reserve',
            summary: 'Estimated rental and flip tax to set aside, using your Settings tax rate.',
            howTo: [
              'Read the Rental Tax Reserve and Total SARS Provisional Tax Reserve cards.',
              'Move the monthly reserve amount into a separate savings account.',
              'Re-check after changing your marginal tax rate or entity in Settings.',
            ],
            proTip:
              'If you earn rental income outside a salary, you are probably a provisional taxpayer. IRP6 payments are due by the end of August and the end of February, and a reserve account stops them becoming a cash crunch.',
            href: '/#dashboard-tax-reserve',
            ctaLabel: 'View tax reserve',
          },
          {
            id: 'dashboard-itr12-export',
            title: 'ITR12 Export',
            summary: 'Download a rental tax schedule for your ITR12 or your tax practitioner.',
            howTo: [
              'Open Rental Portfolio.',
              'Click Data & Exports ▾ → SARS ITR12 Export in the rental header.',
              'Send the Excel schedule to your tax practitioner or use it to complete your ITR12.',
            ],
            proTip:
              'Keep the invoices behind every deduction for five years. SARS can request supporting documents for any amount claimed against rental income.',
            href: '/rentals#rentals-itr12',
            ctaLabel: 'Export ITR12 schedule',
          },
        ],
      },
      {
        id: 'tasks',
        moduleName: 'Tasks & Reminders',
        route: '/tasks',
        purpose: 'An operational to-do list linked to properties, funders and deals.',
        features: [
          {
            id: 'tasks-create',
            title: 'Create Linked Tasks',
            summary: 'Tasks with priority, due date and a linked property, funder or deal.',
            howTo: [
              'Click Create Task on the Tasks page.',
              'Set the priority and due date, and link the task to a property, funder or deal.',
              'Tick it off when done. Urgent items also appear on the Dashboard.',
            ],
            proTip:
              'The Task Engine automatically generates a High-Priority reminder 60 days before any lease expiry date. Use manual tasks for tenant inspections, maintenance callouts, and bespoke milestones.',
            href: '/tasks#tasks-list',
            ctaLabel: 'Open Tasks',
          },
          {
            id: 'tasks-recurring',
            title: 'Recurring Reminders',
            summary: 'Repeat tasks such as meter readings, rent checks and insurance renewals.',
            howTo: [
              'When creating a task, choose a recurrence (e.g. monthly).',
              'Complete it as usual and the next occurrence is created automatically.',
              'Filter by "Recurring Only" to review your routine.',
            ],
            proTip:
              'Set a monthly recurring task to take your own meter readings a day or two before the municipal reading date, so you have evidence if a bill looks wrong.',
            href: '/tasks#tasks-list',
            ctaLabel: 'Set up reminders',
          },
          {
            id: 'tasks-agm-reminders',
            title: 'Body Corporate AGM Reminders',
            summary: 'Automatic reminders 14 days before a sectional-title AGM.',
            howTo: [
              'Add the AGM date on a rental, flip or pipeline deal.',
              'An "Attend Body Corporate AGM" task appears automatically, dated 14 days before the meeting.',
              'Review the proposed budget and levy increase before you attend.',
            ],
            proTip:
              'Levy increases and special levies are voted at the AGM. Under the Sectional Titles Schemes Management Act you can attend or appoint a proxy, so don\'t let a levy hike pass without your vote.',
            href: '/tasks#tasks-list',
            ctaLabel: 'View AGM tasks',
          },
          {
            id: 'tasks-calendar-sync',
            title: 'Calendar View & .ics Sync',
            summary: 'Monthly grid with recurring ghost previews, bulk RFC 5545 .ics export, and per-task Google/Outlook calendar links.',
            howTo: [
              'Toggle [ 📅 Calendar View ] in the toolbar to inspect monthly to-dos and projected recurring ghost commitments.',
              'Click [ 📅 Export .ics ] to bulk-download active to-dos with RFC 5545 recurrence rules and 9:00 AM reminders.',
              'Click Sync on any task card to download a single .ics or open direct Google Calendar and Outlook 365 compose links.',
            ],
            proTip:
              'RFC 5545 .ics files seamlessly import into Apple Calendar, Microsoft Outlook, and Google Calendar on mobile or desktop. Recurring series preserve frequency and until-dates so operational reminders trigger on time without manual entry.',
            href: '/tasks#tasks-toolbar',
            ctaLabel: 'Open Calendar & Sync',
          },
        ],
      },
    ],
  },
];

export const GO_LIVE_STEP: GoLiveStep = {
  id: 'go-live-clear-demo',
  title: 'Go Live: Clear Demo',
  summary: 'Finished practising on the demo deals? Clear them and start entering your own portfolio.',
  howTo: [
    'If you changed any demo data you want to keep, download a JSON backup first (Export in the top bar, or More → Download JSON Backup on mobile).',
    'Click Clear Demo in the top bar (on mobile: More → Clear All Portfolio Data). Your Settings and supplier directory are kept.',
    'Back on the Dashboard, follow the Clean Slate card: analyze your first real deal, add rentals or flips, and set your liquid reserve.',
  ],
  proTip:
    'You can bring the sample data back at any time with Reset Demo, so clearing is safe. Your Get Started checklist progress is also kept.',
};

/** All checkbox IDs, in journey order (features first, then Go Live). */
export function getAllGuideStepIds(): string[] {
  const ids: string[] = [];
  for (const stage of GET_STARTED_STAGES) {
    for (const mod of stage.modules) {
      for (const feature of mod.features) ids.push(feature.id);
    }
  }
  ids.push(GO_LIVE_STEP.id);
  return ids;
}

/** Splits a guide href into its route path and optional anchor. */
export function parseGuideHref(href: string): { path: string; anchor: string | null } {
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) return { path: href, anchor: null };
  return { path: href.slice(0, hashIndex), anchor: href.slice(hashIndex + 1) || null };
}

/** Number of completed steps that belong to the current content (ignores stale/unknown IDs). */
export function countCompletedGuideSteps(completed: readonly string[]): number {
  const done = new Set(completed);
  return getAllGuideStepIds().filter((id) => done.has(id)).length;
}

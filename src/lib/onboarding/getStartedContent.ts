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
        purpose: 'Screen a deal in minutes: transfer duty, bond, Day-1 cash, yield and maximum offer, measured against your Buy Box.',
        features: [
          {
            id: 'analyzer-deal-screening',
            title: 'Deal Screening & MAO',
            summary: 'Model purchase price, source, bond, rent and PIE Act eviction drag; see transfer duty and Day-1 capital.',
            howTo: [
              'Click Edit on a demo deal (or start fresh) to load it into the South African Acquisition & Yield Calculator.',
              'Enter price, deal source, bond LTV and expected rent, and toggle Occupant & Eviction Risk on distressed deals to budget court litigation and security burn.',
              'Open the MAO Quick Solver to back-solve your Max Allowable Bid (MAO) net of legal reserves and holding drag, then save the deal to the pipeline.',
            ],
            proTip:
              'At auctions, the buyer pays auctioneer commission and Section 118 municipal arrears, but unlawful occupants carry statutory risk under the PIE Act. Budgeting Magistrate or High Court delays directly into your MAO protects your margin before bidding.',
            href: '/analyzer#analyzer-calculator',
            ctaLabel: 'Open the calculator',
          },
          {
            id: 'analyzer-buy-box-dscr',
            title: 'Buy Box Badge & DSCR',
            summary: 'Each pipeline card is scored against your Settings hurdles, with a DSCR badge.',
            howTo: [
              'Scroll to the Deal Sourcing Pipeline.',
              'Read each card\'s "Buy Box Match (x/y)" badge and its DSCR value.',
              'For a near-miss, renegotiate the price or change the strategy; otherwise use Pass Deal and pick a reason to keep a record.',
            ],
            proTip:
              'Bond interest on a rental is deductible under Section 11(a) against rental income, but capital repayments are not. Let DSCR and cash flow decide the deal, not the hoped-for tax saving.',
            href: '/analyzer#analyzer-pipeline',
            ctaLabel: 'Open the pipeline',
          },
          {
            id: 'analyzer-sensitivity',
            title: 'Sensitivity Sliders',
            summary: 'Stress-test holding period, exit VAT, vacancy and the prime spread.',
            howTo: [
              'In the calculator, drag the Holding Period (1–12 months) slider and toggle the exit VAT option.',
              'Stress Vacancy (0–15%) and Prime Spread (±200 bps).',
              'Note the point where the deal stops passing. That gap is your margin of safety.',
            ],
            proTip:
              'Always test at least +2% on rates: the SARB raised the repo rate by 475 basis points between November 2021 and May 2023. A deal that only works at today\'s prime is fragile.',
            href: '/analyzer#analyzer-sensitivity',
            ctaLabel: 'Open the sliders',
          },
          {
            id: 'analyzer-compare',
            title: 'Duplicate Scenario & Side-by-Side Compare',
            summary: 'Clone a deal as a what-if, then compare candidates in one table.',
            howTo: [
              'Click Duplicate Scenario on a pipeline card to create a "(Scenario)" copy.',
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
            title: 'Partner & Lender Capital',
            summary: 'Record private loans, JV partners and bank facilities with their terms.',
            howTo: [
              'Click Add Capital Source in the Funding header.',
              'Enter the lender or partner, amount, interest or profit-share terms, and maturity date.',
              'Use Log Payment to Lender as you repay, so the Capital Ledger always shows what is still owed.',
            ],
            proTip:
              'Put every private loan in a signed written agreement that states the interest rate, term and security. If you raise money from many members of the public, take legal advice first, because deposit-taking and investment rules can apply.',
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
            title: 'Promote a Deal',
            summary: 'Turn an Analyzer deal into a live flip (or rental) with its numbers carried over.',
            howTo: [
              'In the Analyzer pipeline, advance the deal with Submit Offer → and Begin DD →.',
              'Click Promote to Flip (or Promote to Rental) on the card and confirm.',
              'Open Buy-and-Flip Manager (or Rental Portfolio) to find the project pre-filled.',
            ],
            proTip:
              'Promote only after the offer to purchase is signed and suspensive conditions (bond approval, sale of another property) are met. Until then, keep the deal in Due Diligence.',
            href: '/analyzer#analyzer-pipeline',
            ctaLabel: 'Promote from the pipeline',
          },
          {
            id: 'flips-boq-draws',
            title: 'BOQ & Contractor Draws',
            summary: 'Bill of Quantities line items, milestone drawdowns, retention and PIE Act contractor gates.',
            howTo: [
              'Select a flip, scroll to Bill of Quantities (BOQ) and add line items with contractor, cost and retention %.',
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
              'Open a flip and expand the Total Holding Cost card to see the itemised monthly burn.',
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
            title: 'Tenants, Ledger & Arrears',
            summary: 'Lease details, pre-lease tenant vetting scorecard, monthly payments and arrears per property.',
            howTo: [
              'On a rental card, open the Lease & Costs tab and expand Pre-Lease Tenant Vetting to score credit, debt-to-income and calculate deposit multipliers.',
              'Switch to Payments & Arrears to log each payment as it lands and track utility cost recoveries.',
              'Record unrecoverable amounts as a write-off so arrears and the tax reserve stay accurate.',
            ],
            proTip:
              'Vet prospective tenants before signing: high debt ratios and judgment history are strong indicators of default under the PIE Act. Use the vetting scorecard to require a 1.5× to 2.0× deposit or guarantor when taking on moderate risks.',
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
            title: 'Tenant Statements & Sharing',
            summary: 'Verify monthly rental and utility ledgers, email PDF statements via Resend, and share secure portal links.',
            howTo: [
              'On a rental card, click Utilities & Statement to inspect the current period ledger, utility recoveries and arrears.',
              'Click Share Statement to open the distribution menu: choose "Email Statement & Copy Link" or "Copy Secure Link".',
              'Once verified, dispatch the statement to email the PDF directly to the tenant and copy the live link to your clipboard.',
            ],
            proTip:
              'Ensure your landlord banking details are saved in Settings and the tenant has an email on file. Generated PDFs hide variance badges for a clean, professional print layout.',
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
            title: 'Tailor Pitch Terms',
            summary: 'Set the facility size, return structure, rate, PIE Act statutory reserves and funder security.',
            howTo: [
              'In Select Deal & Tailor Pitch Terms, set the Capital Facility Requested.',
              'Choose the Return Structure and Offered Return Rate (%), and verify that PIE Act Legal Eviction Reserves appear in the capital stack for distressed deals.',
              'Review the investor-return figures and copy the formatted WhatsApp pitch summary to share directly with prospective lenders.',
            ],
            proTip:
              'Offer a clear return and realistic legal horizon: if buying at auction with unlawful occupants, disclose the PIE Act legal reserve and contractor disbursement gate up front to build credibility with institutional and private lenders.',
            href: '/proposal#proposal-deal-selector',
            ctaLabel: 'Tailor terms',
          },
          {
            id: 'proposal-export-pdf',
            title: 'Branded Pitch to PDF',
            summary: 'Print or export the tear-sheet with your logo and bio.',
            howTo: [
              'Confirm your logo and bio from Settings appear on the tear-sheet.',
              'Click Print / Export PDF.',
              'Choose "Save as PDF" in the print dialog and share the file.',
            ],
            proTip:
              'Attach supporting documents (title deed search, municipal valuation, contractor quotes). Serious SA private lenders will ask for them before committing.',
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
              'Click SARS ITR12 Export in the header.',
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

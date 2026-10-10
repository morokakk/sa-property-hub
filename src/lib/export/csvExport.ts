import { RentalProperty, FlipProject, OpportunityDeal, FundingSource, TransactionCategory, UtilityStatement } from '@/types';
import { calculateRentalCashflow } from '@/lib/calculations/propertyMetrics';

function escapeCSV(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(csvContent: string, filename: string) {
  // UTF-8 BOM so Microsoft Excel opens currency symbols and special characters correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports Rental Properties Register to CSV
 */
export function exportRentalsCSV(rentals: RentalProperty[]) {
  const headers = [
    'Property Title',
    'Address',
    'City',
    'Title Type',
    'Status',
    'Market Value (ZAR)',
    'Purchase Price (ZAR)',
    'Outstanding Bond (ZAR)',
    'Monthly Bond Repayment (ZAR)',
    'Tenant Name',
    'Tenant Phone',
    'Tenant Email',
    'Lease Start Date',
    'Lease Expiry Date',
    'Deposit Held (ZAR)',
    'Monthly Gross Rent (ZAR)',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Communal / Serviced OpEx (ZAR)',
    'Management Type',
    'Agency Commission (ZAR)',
    'Monthly Maintenance Reserve (ZAR)',
    'Unpaid Tenant Utility Arrears (ZAR)',
    'Net Monthly Cashflow (ZAR)',
  ];

  const rows = rentals.map((r) => {
    const cashflow = calculateRentalCashflow(r);

    return [
      escapeCSV(r.title),
      escapeCSV(r.address),
      escapeCSV(r.city),
      escapeCSV(r.propertyType),
      escapeCSV(r.status),
      r.marketValueZAR || 0,
      r.purchasePriceZAR || 0,
      r.outstandingBondBalanceZAR || 0,
      r.monthlyBondPaymentZAR || 0,
      escapeCSV(r.leases?.[0]?.tenantName || ''),
      escapeCSV(r.leases?.[0]?.tenantPhone || ''),
      escapeCSV(r.leases?.[0]?.tenantEmail || ''),
      escapeCSV(r.leases?.[0]?.leaseStartDate || ''),
      escapeCSV(r.leases?.[0]?.leaseEndDate || ''),
      r.leases?.[0]?.depositHeldZAR || 0,
      r.monthlyGrossRentZAR || 0,
      r.monthlyLeviesZAR || 0,
      r.monthlyRatesTaxesZAR || 0,
      r.monthlyCommunalServicesZAR || 0,
      escapeCSV(r.managementType || 'Self-Managed'),
      cashflow.agencyCommissionZAR || 0,
      r.monthlyMaintenanceReserveZAR || 0,
      r.unpaidUtilityArrearsZAR || 0,
      cashflow.netMonthlyCashflowZAR,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `sa-rentals-register-${dateStr}.csv`);
}

/**
 * Exports Buy-and-Flip Bill of Quantities (BOQ) to CSV
 */
export function exportFlipBOQCSV(flip: FlipProject) {
  const headers = [
    'Flip Project',
    'Category / Trade',
    'Milestone Draw Phase',
    'Item Description',
    'Supplier / Contractor',
    'Quantity',
    'Unit',
    'Baseline Unit Cost (ZAR)',
    'Baseline Total (ZAR)',
    'Actual Cost (ZAR)',
    'Variance (ZAR)',
    'Retention (%)',
    'Is Sponsored / Barter',
    'Commercial Retail Value (ZAR)',
    'Actual Cash Outflow (ZAR)',
    'Status',
    'Invoice Ref',
  ];

  const rows = (flip.boq || []).map((item) => {
    return [
      escapeCSV(flip.title),
      escapeCSV(item.category),
      escapeCSV(item.milestonePhase || 'First Fix / Wet Works'),
      escapeCSV(item.itemDescription),
      escapeCSV(item.supplierOrContractor || 'Unassigned'),
      item.quantity || 1,
      escapeCSV(item.unit || 'sum'),
      item.baselineUnitCostZAR || 0,
      item.baselineTotalZAR || 0,
      item.actualCostZAR || 0,
      item.varianceZAR || 0,
      item.retentionPercent || 0,
      item.isSponsoredOrBarter ? 'Yes' : 'No',
      item.isSponsoredOrBarter ? (item.commercialRetailValueZAR || item.baselineTotalZAR || 0) : '',
      item.isSponsoredOrBarter ? (item.actualCashOutflowZAR !== undefined ? item.actualCashOutflowZAR : item.actualCostZAR || 0) : '',
      escapeCSV(item.status),
      escapeCSV(item.invoiceRef || ''),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const slug = flip.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `boq-${slug}-${dateStr}.csv`);
}

/**
 * Exports Shortlisted Deal Pipeline to CSV
 */
export function exportOpportunitiesCSV(deals: OpportunityDeal[]) {
  const headers = [
    'Deal Title',
    'Address',
    'City',
    'Province',
    'Source Channel',
    'Property Type',
    'Pipeline Status',
    'Open Market Value (ZAR)',
    'Purchase Price / Max Bid (ZAR)',
    'Built-In Equity (ZAR)',
    'Built-In Equity (%)',
    'Estimated Rehab Capex (ZAR)',
    'Transfer Duty (ZAR)',
    'Conveyancing Legal Fee (ZAR)',
    'Auctioneer Commission (ZAR)',
    'Section 118 Municipal Arrears (ZAR)',
    'Day-1 Capital Required (ZAR)',
    'Gross Rental Yield (%)',
    'Net Monthly Cashflow (ZAR)',
    'Projected Flip Net Profit (ZAR)',
    'Projected Flip ROI (%)',
  ];

  const rows = deals.map((d) => {
    const openMarket = d.openMarketValueZAR || Math.round(d.purchasePrice * 1.2);
    const builtInZAR = d.builtInEquityZAR ?? (openMarket - d.purchasePrice);
    const builtInPct = d.builtInEquityPercent ?? (openMarket > 0 ? Number(((builtInZAR / openMarket) * 100).toFixed(1)) : 0);

    return [
      escapeCSV(d.title),
      escapeCSV(d.address),
      escapeCSV(d.city),
      escapeCSV(d.province),
      escapeCSV(d.source),
      escapeCSV(d.propertyType),
      escapeCSV(d.status),
      openMarket,
      d.purchasePrice,
      builtInZAR,
      builtInPct,
      d.estimatedRehabCost || 0,
      d.costs?.transferDuty || 0,
      d.costs?.conveyancingFee || 0,
      d.auctioneerCommissionZAR || 0,
      d.municipalArrearsZAR || 0,
      d.initialCapitalRequired || 0,
      d.grossYield,
      d.monthlyCashFlow,
      d.projectedFlipNetProfit,
      d.projectedFlipRoi,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `sa-opportunity-pipeline-${dateStr}.csv`);
}

/**
 * Exports Private Funding Ledger to CSV
 */
export function exportFundingCSV(funding: FundingSource[]) {
  const headers = [
    'Funder / Investor Name',
    'Funding Category',
    'Entity / Contact Person',
    'Phone / Email',
    'Linked Project / Deal',
    'Principal Facility (ZAR)',
    'Total Repaid (ZAR)',
    'Outstanding Balance (ZAR)',
    'Return Terms Type',
    'Promised Return Rate (%)',
    'Payment Schedule',
    'Facility Status',
    'Tranche Notes',
  ];

  const rows = funding.map((f) => {
    let drawn = 0;
    if (f.status === 'Settled' || f.status === 'Standby') {
      drawn = 0;
    } else if (f.tranches && f.tranches.length > 0) {
      drawn = f.tranches.filter((t) => t.isDisbursed).reduce((s, t) => s + t.amountZAR, 0);
    } else if (f.status === 'Active' || f.status === 'Accruing' || f.status === 'Matured') {
      drawn = f.capitalAmountZAR || 0;
    }
    const outstanding = Math.max(0, drawn - (f.totalRepaidZAR || 0));

    return [
      escapeCSV(f.lenderName),
      escapeCSV(f.fundingType),
      escapeCSV(f.entityOrContact || ''),
      escapeCSV(f.emailPhone || ''),
      escapeCSV(f.linkedDealName || f.linkedDealId || 'General Liquidity Pool'),
      f.capitalAmountZAR || 0,
      f.totalRepaidZAR || 0,
      outstanding,
      escapeCSV(f.returnTermsType),
      f.returnRatePercent || 0,
      escapeCSV(f.paymentSchedule || 'Monthly Interest'),
      escapeCSV(f.status || 'Active'),
      escapeCSV(f.notes || ''),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `sa-private-funding-${dateStr}.csv`);
}

// ---------------------------------------------------------------------------
// Universal Accountant GL Journal (Xero / QuickBooks Online / Sage)
// ---------------------------------------------------------------------------

export const ACCOUNTANT_JOURNAL_HEADERS = [
  'Date',
  'Tracking Category (Property)',
  'Account Name',
  'Description',
  'Reference',
  'Amount (ZAR)',
  'Tax Type',
] as const;

/**
 * South African GL account + VAT pre-mappings. Tax Type labels are intentionally
 * universal (not software-specific) so accountants map them once in the import wizard.
 * Gross rent: residential rent is VAT-exempt under s12(a) of the SA VAT Act.
 */
export const SA_GL_ACCOUNT_MAP = {
  gross_rent: { account: 'Rental Income', taxType: 'Exempt' },
  ancillary_vat: { account: 'Ancillary Rental Income', taxType: 'Standard (15%)' },
  ancillary_exempt: { account: 'Ancillary Rental Income', taxType: 'Exempt' },
  agent_commission: { account: 'Agent Commission Expense', taxType: 'Standard (15%)' },
  levies: { account: 'Levies Expense', taxType: 'Exempt' },
  rates_taxes: { account: 'Rates & Taxes', taxType: 'Zero-Rated / Exempt' },
  utilities: { account: 'Utility Recoveries / Municipal Charges', taxType: 'Standard (15%)' },
  bond_interest: { account: 'Bond Interest Expense', taxType: 'No VAT' },
  bond_capital: { account: 'Bond Principal Reduction', taxType: 'No VAT' },
  bond_combined: { account: 'Mortgage Bond Repayment', taxType: 'No VAT' },
  insurance: { account: 'Insurance Expense', taxType: 'Exempt' },
  repairs: { account: 'Repairs & Maintenance', taxType: 'Standard (15%)' },
  communal: { account: 'Communal Services Expense', taxType: 'Standard (15%)' },
  prepaid_vending: { account: 'Prepaid Vending Fees', taxType: 'Standard (15%)' },
  bad_debts: { account: 'Bad Debts Written Off', taxType: 'Exempt' },
  other: { account: 'Sundry Expenses', taxType: 'Standard (15%)' },
  contra: { account: 'Bank / Agent Trust Clearing', taxType: 'No VAT' },
} as const;

type GlKey = keyof typeof SA_GL_ACCOUNT_MAP;

export interface AccountantJournalRow {
  date: string; // YYYY-MM-DD
  property: string; // Tracking category
  account: string;
  description: string;
  reference: string; // ACT-/BUD- prefixed journal group reference
  amount: number; // Signed ZAR, 2dp. Debit (expense) = +, Credit (income) = -
  taxType: string;
}

interface JournalLine {
  date: string;
  basis: 'ACT' | 'BUD';
  key: GlKey;
  description: string;
  cents: number;
}

const JOURNAL_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

function journalMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${JOURNAL_MONTH_NAMES[m - 1]} ${y}`;
}

function lastDayOfMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const day = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function slugifyRef(title: string): string {
  const slug = title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return slug || 'PROPERTY';
}

/** Months (YYYY-MM) from 1 March of the current SA tax year up to and including the asOf month. */
function getTaxYearToDateMonths(asOf: Date): string[] {
  const year = asOf.getFullYear();
  const month = asOf.getMonth(); // 0 = Jan
  const startYear = month >= 2 ? year : year - 1;
  const months: string[] = [];
  let y = startYear;
  let m = 2; // March
  while (y < year || (y === year && m <= month)) {
    months.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return months;
}

function buildPropertyJournalLines(p: RentalProperty, months: string[]): JournalLine[] {
  const lines: JournalLine[] = [];
  const asOfIdx = months.length - 1;
  const cashflow = calculateRentalCashflow(p);
  const isFreehold = p.propertyType === 'Freehold House';

  const add = (
    basis: 'ACT' | 'BUD',
    date: string,
    key: GlKey,
    description: string,
    amountZAR: number,
    side: 'dr' | 'cr'
  ) => {
    const cents = toCents(amountZAR || 0) * (side === 'cr' ? -1 : 1);
    if (cents === 0) return;
    lines.push({ date, basis, key, description, cents });
  };

  // --- Scope: budget lines only within ownership window; actuals are real events and always kept ---
  const purchaseKey = p.purchaseDate ? p.purchaseDate.slice(0, 7) : '';
  const soldKey = p.status === 'Sold' && p.soldDate ? p.soldDate.slice(0, 7) : '';
  const budgetActive = (m: string): boolean => {
    if (purchaseKey && m < purchaseKey) return false;
    if (p.status === 'Sold') return !!soldKey && m <= soldKey;
    return true;
  };

  const txs = (category: TransactionCategory, m: string) =>
    (p.transactions || []).filter((t) => t.category === category && (t.date || '').slice(0, 7) === m);
  const statementsFor = (m: string): UtilityStatement[] =>
    (p.utilityStatements || []).filter((s) => (s.statementDate || '').slice(0, 7) === m);
  const txDesc = (t: { description?: string; invoiceRef?: string }, fallback: string) =>
    `${t.description || fallback}${t.invoiceRef ? ` [Inv ${t.invoiceRef}]` : ''}`;

  // --- Cash-basis rent receipts bucketed by billing month ---
  const payByMonth = new Map<string, { date: string; amount: number; ref?: string }[]>();
  (p.paymentRecords || []).forEach((pr) => {
    if (!pr.paymentDate) return;
    const allocs =
      pr.allocations && pr.allocations.length > 0
        ? pr.allocations.map((a) => ({ month: a.periodMonth, amount: a.amountZAR }))
        : [{ month: pr.paymentDate.slice(0, 7), amount: pr.amountReceivedZAR }];
    allocs.forEach((a) => {
      const list = payByMonth.get(a.month) || [];
      list.push({ date: pr.paymentDate, amount: a.amount, ref: pr.reference });
      payByMonth.set(a.month, list);
    });
  });

  // --- Bond amortisation (rolled back from current balance, which is the opening balance of the asOf month) ---
  const P = p.monthlyBondPaymentZAR || 0;
  const B0 = p.outstandingBondBalanceZAR || 0;
  const ratePct = p.bondInterestRatePercent || 0;
  const canSplitBond = P > 0 && B0 > 0 && ratePct > 0;
  const monthlyRate = ratePct / 1200;
  const openingBalances: number[] = new Array(months.length).fill(0);
  if (canSplitBond) {
    let bal = B0;
    for (let idx = asOfIdx; idx >= 0; idx--) {
      openingBalances[idx] = bal;
      bal = (bal + P) / (1 + monthlyRate);
    }
  }

  months.forEach((m, idx) => {
    const label = journalMonthLabel(m);
    const budDate = lastDayOfMonth(m);
    const bud = budgetActive(m);

    // Generic actual -> statement -> budget resolver for expense categories
    const resolveExpense = (
      key: GlKey,
      txCat: TransactionCategory | null,
      stmtAmount: ((s: UtilityStatement) => number) | null,
      budgetAmount: number,
      name: string
    ) => {
      const actualTx = txCat ? txs(txCat, m) : [];
      if (actualTx.length > 0) {
        actualTx.forEach((t) => add('ACT', t.date, key, txDesc(t, `${name} – ${label}`), t.amountZAR, 'dr'));
        return;
      }
      if (stmtAmount) {
        const stmts = statementsFor(m).filter((s) => stmtAmount(s) > 0);
        if (stmts.length > 0) {
          stmts.forEach((s) => add('ACT', s.statementDate, key, `${name} – ${label} (statement)`, stmtAmount(s), 'dr'));
          return;
        }
      }
      if (bud) add('BUD', budDate, key, `${name} – ${label}`, budgetAmount, 'dr');
    };

    // 1. Gross rent (credit): transactions -> payment records -> budget
    let rentFromBudget = false;
    const rentTx = txs('gross_rent', m);
    const rentPays = payByMonth.get(m) || [];
    if (rentTx.length > 0) {
      rentTx.forEach((t) => add('ACT', t.date, 'gross_rent', txDesc(t, `Rental income – ${label}`), t.amountZAR, 'cr'));
    } else if (rentPays.length > 0) {
      rentPays.forEach((pay) =>
        add('ACT', pay.date, 'gross_rent', `Rent received – ${label}${pay.ref ? ` [${pay.ref}]` : ''}`, pay.amount, 'cr')
      );
    } else if (bud) {
      rentFromBudget = true;
      add('BUD', budDate, 'gross_rent', `Rental income – ${label}`, p.status === 'Vacant' ? 0 : cashflow.grossRentZAR, 'cr');
    }

    // 2. Bad debts: only against budgeted (billed) rent months to avoid reducing cash-received months twice
    if (rentFromBudget) {
      (p.arrearsWriteOffs || []).forEach((w) => {
        const allocs = w.allocations && w.allocations.length > 0 ? w.allocations : [{ periodMonth: (w.date || '').slice(0, 7), amountZAR: w.amountZAR }];
        allocs
          .filter((a) => a.periodMonth === m)
          .forEach((a) => add('ACT', w.date, 'bad_debts', `Bad debt write-off – ${label} (${w.reason})`, a.amountZAR, 'dr'));
      });
    }

    // 3. Ancillary income (budget only), within contract window
    if (bud) {
      (p.ancillaryIncomes || []).forEach((a) => {
        const startKey = (a.contractStartDate || '').slice(0, 7);
        const endKey = (a.contractEndDate || '').slice(0, 7);
        if ((startKey && m < startKey) || (endKey && m > endKey)) return;
        add(
          'BUD',
          budDate,
          a.vatApplicable ? 'ancillary_vat' : 'ancillary_exempt',
          `${a.tenantName || 'Ancillary'} (${a.type.replace('_', ' ')}) – ${label}`,
          a.monthlyRentZAR,
          'cr'
        );
      });
    }

    // 4. Operating expenses
    resolveExpense(
      'agent_commission',
      'agent_commission',
      (s) => (s.agencyCommissionZAR || 0) + (s.agencyCommissionVatZAR || 0),
      cashflow.agencyCommissionZAR,
      'Agent commission'
    );
    resolveExpense('levies', 'levies', (s) => s.bodyCorporateLeviesZAR || 0, isFreehold ? 0 : p.monthlyLeviesZAR || 0, 'Body corporate / HOA levy');
    resolveExpense('rates_taxes', 'rates_taxes', (s) => s.propertyRatesZAR || 0, p.monthlyRatesTaxesZAR || 0, 'Municipal property rates');
    resolveExpense('insurance', 'insurance', null, cashflow.monthlyInsuranceZAR, 'Building insurance');
    resolveExpense('repairs', 'repairs_maintenance', null, 0, 'Repairs & maintenance');
    resolveExpense('other', 'other', null, 0, 'Sundry expense');

    if (bud) {
      add('BUD', budDate, 'communal', `Communal services – ${label}`, p.monthlyCommunalServicesZAR || 0, 'dr');
      add('BUD', budDate, 'prepaid_vending', `Prepaid vending fees – ${label}`, p.monthlyPrepaidVendingFeeZAR || 0, 'dr');
    }

    // 5. Utilities: from municipal / utility statements only (no budget fallback)
    statementsFor(m).forEach((s) => {
      const bundled = s.bundledUtilitiesZAR || 0;
      const itemised = (s.electricityZAR || 0) + (s.waterZAR || 0) + (s.refuseZAR || 0) + (s.sewerageZAR || 0);
      const total = s.billingType === 'bundled' && bundled > 0 ? bundled : itemised > 0 ? itemised : bundled;
      add('ACT', s.statementDate, 'utilities', `${s.provider || 'Utility'} charges – ${label}`, total, 'dr');
    });

    // 6. Mortgage bond: actual interest/capital if any logged this month, else amortised split / combined
    const bondInterestTx = txs('bond_interest', m);
    const bondCapitalTx = txs('bond_capital', m);
    if (bondInterestTx.length > 0 || bondCapitalTx.length > 0) {
      bondInterestTx.forEach((t) => add('ACT', t.date, 'bond_interest', txDesc(t, `Bond interest – ${label}`), t.amountZAR, 'dr'));
      bondCapitalTx.forEach((t) => add('ACT', t.date, 'bond_capital', txDesc(t, `Bond principal – ${label}`), t.amountZAR, 'dr'));
    } else if (bud && P > 0) {
      if (canSplitBond) {
        const interestC = Math.min(toCents(P), toCents(openingBalances[idx] * monthlyRate));
        const principalC = toCents(P) - interestC;
        add('BUD', budDate, 'bond_interest', `Bond interest – ${label}`, interestC / 100, 'dr');
        add('BUD', budDate, 'bond_capital', `Bond principal reduction – ${label}`, principalC / 100, 'dr');
      } else {
        add('BUD', budDate, 'bond_combined', `Mortgage bond repayment – ${label}`, P, 'dr');
      }
    }
  });

  return lines;
}

/**
 * Pure builder: balanced journal rows (every Reference nets to 0.00 via a contra line).
 * Covers the current SA tax year to date (1 March -> end of asOf month).
 */
export function buildAccountantJournalRows(rentals: RentalProperty[], asOf: Date = new Date()): AccountantJournalRow[] {
  const months = getTaxYearToDateMonths(asOf);
  const rows: AccountantJournalRow[] = [];
  const contra = SA_GL_ACCOUNT_MAP.contra;

  (rentals || []).forEach((p) => {
    const title = p.title || p.address || p.id;
    const slug = slugifyRef(title);
    const groups = new Map<string, JournalLine[]>();
    buildPropertyJournalLines(p, months).forEach((line) => {
      const gk = `${line.basis}|${line.date}`;
      const list = groups.get(gk) || [];
      list.push(line);
      groups.set(gk, list);
    });

    groups.forEach((groupLines) => {
      const { basis, date } = groupLines[0];
      const reference = `${basis}-${slug}-${basis === 'BUD' ? date.slice(0, 7) : date}`;
      let sumCents = 0;
      groupLines.forEach((l) => {
        sumCents += l.cents;
        const map = SA_GL_ACCOUNT_MAP[l.key];
        rows.push({
          date: l.date,
          property: title,
          account: map.account,
          description: l.description,
          reference,
          amount: l.cents / 100,
          taxType: map.taxType,
        });
      });
      if (sumCents !== 0) {
        rows.push({
          date,
          property: title,
          account: contra.account,
          description: `Balancing entry – ${reference}`,
          reference,
          amount: -sumCents / 100,
          taxType: contra.taxType,
        });
      }
    });
  });

  const lt = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const isContra = (r: AccountantJournalRow) => (r.account === contra.account ? 1 : 0);
  // Array.prototype.sort is stable: within a group the line order above is preserved
  return rows.sort(
    (a, b) =>
      lt(a.property, b.property) || lt(a.date, b.date) || lt(a.reference, b.reference) || isContra(a) - isContra(b)
  );
}

/** Pure builder: RFC 4180 CSV text (CRLF, no BOM). Amounts are raw 2dp decimals. */
export function buildAccountantJournalCSV(rentals: RentalProperty[], asOf: Date = new Date()): string {
  const body = buildAccountantJournalRows(rentals, asOf).map((r) =>
    [
      escapeCSV(r.date),
      escapeCSV(r.property),
      escapeCSV(r.account),
      escapeCSV(r.description),
      escapeCSV(r.reference),
      r.amount.toFixed(2),
      escapeCSV(r.taxType),
    ].join(',')
  );
  return [ACCOUNTANT_JOURNAL_HEADERS.map((h) => escapeCSV(h)).join(','), ...body].join('\r\n');
}

/**
 * Exports a universal Accountant GL Journal (Xero / QuickBooks / Sage manual-journal import).
 * Downloads with a UTF-8 BOM. Returns the number of journal lines exported.
 */
export function exportAccountantJournalCSV(rentals: RentalProperty[], asOf: Date = new Date()): number {
  const csv = buildAccountantJournalCSV(rentals, asOf);
  downloadCSV(csv, `sa-property-accountant-journal-${localDateStr(asOf)}.csv`);
  return csv.split('\r\n').length - 1;
}
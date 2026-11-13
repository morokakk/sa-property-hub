import {
  RentalProperty,
  FlipProject,
  OpportunityDeal,
  FundingSource,
  PortfolioSummary,
  InvestorProfile,
  DevelopmentProject,
  CustomNodeBenchmarksMap,
} from '@/types';
import { calculateRentalCashflow } from '@/lib/calculations/propertyMetrics';
import { calculateFlipFinancials, calculateArchivedFlipFinancials } from '@/lib/calculations/flips';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentDebtWipeoutMatrix,
  calculateApprovalsProgress,
  DEVELOPMENT_APPROVAL_DEFINITIONS,
  DevelopmentFinancialSummary,
} from '@/lib/calculations/developments';
import { calculateZoningEnvelope, formatZoningTransitionLabel } from '@/lib/calculations/zoning';
import { filterProjectComments } from '@/lib/calculations/commentsLedger';

interface ExportPortfolioData {
  rentals: RentalProperty[];
  flips: FlipProject[];
  opportunities: OpportunityDeal[];
  funding: FundingSource[];
  summary: PortfolioSummary;
  investorProfile: InvestorProfile;
}

/**
 * Builds and downloads a multi-tab Microsoft Excel (.xlsx) workbook
 * containing high-fidelity financial tables across the entire portfolio.
 */
export async function exportPortfolioToExcel(data: ExportPortfolioData) {
  const XLSX = await import('xlsx');
  const { rentals, flips, opportunities, funding, summary, investorProfile } = data;
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: Executive Summary
  // -------------------------------------------------------------
  const summaryRows = [
    ['MOREMELA PROPERTY INVESTMENT HUB - EXECUTIVE PORTFOLIO SUMMARY'],
    ['Generated On', new Date().toLocaleString('en-ZA')],
    ['Investor / Entity', investorProfile.tradingAs || investorProfile.entityName || 'Sole Proprietor'],
    ['Registration / ID', investorProfile.registrationOrId || 'N/A'],
    [''],
    ['PORTFOLIO KPI', 'VALUE (ZAR / COUNT)'],
    ['Net Equity', summary.netEquity],
    ['Total Gross Asset Value', summary.totalGrossAssetValue],
    ['Rental Portfolio Value', summary.totalRentalValue],
    ['Buy-and-Flip Portfolio Value', summary.totalFlipValue],
    ['Liquid Capital Reserve', summary.liquidCapitalReserve],
    ['Unallocated Funding Reserve', summary.unallocatedFundingReserve],
    ['Total Purchasing Power', summary.totalAvailablePurchasingPower],
    ['Total Debt Liabilities', summary.totalFundingLiabilities],
    ['Private Funding Liabilities', summary.totalPrivateFundingLiability],
    ['Bank Mortgage Bond Liabilities', summary.totalBondLiabilities],
    ['Monthly Net Rental Cashflow', summary.monthlyNetRentalCashflow],
    ['Projected Flip Profits (Active)', summary.totalProjectedFlipProfits],
    ['Realized Flip Profits (Completed)', summary.totalRealizedFlipProfits],
    ['Active Rental Units', summary.activeRentalsCount],
    ['Sold / Exited Rental Units', summary.soldRentalsCount],
    ['Active Flip Projects', summary.activeFlipsCount],
    ['Completed Flip Projects', summary.completedFlipsCount],
    ['Pipeline Sourcing Deals', summary.pendingOpportunitiesCount],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // -------------------------------------------------------------
  // Sheet 2: Rental Portfolio
  // -------------------------------------------------------------
  const rentalsHeaders = [
    'Property Title',
    'Address',
    'City',
    'Title Type',
    'Units',
    'Floor Area (m²)',
    'Status',
    'Market Value (ZAR)',
    'Purchase Price (ZAR)',
    'Outstanding Bond (ZAR)',
    'Monthly Bond Repayment (ZAR)',
    'Bond Effective Month',
    'Tenant Name',
    'Tenant Phone',
    'Lease Expiry',
    'Monthly Gross Rent (ZAR)',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Communal / Serviced OpEx (ZAR)',
    'Management Type',
    'Agency Commission (ZAR)',
    'Monthly Maintenance Reserve (ZAR)',
    'Unpaid Utility Arrears (ZAR)',
    'Net Monthly Cashflow (ZAR)',
  ];

  const rentalsData = rentals.map((r) => {
    const cashflow = calculateRentalCashflow(r);

    return [
      r.title,
      r.address,
      r.city,
      r.propertyType,
      r.numberOfUnits ?? 1,
      r.floorAreaSqm || 'N/A',
      r.status,
      r.marketValueZAR || 0,
      r.purchasePriceZAR || 0,
      r.outstandingBondBalanceZAR || 0,
      r.monthlyBondPaymentZAR || 0,
      r.bondPaymentEffectiveDate || 'Ongoing',
      r.leases?.[0]?.tenantName || 'Vacant',
      r.leases?.[0]?.tenantPhone || 'N/A',
      r.leases?.[0]?.leaseEndDate || 'N/A',
      r.monthlyGrossRentZAR || 0,
      r.monthlyLeviesZAR || 0,
      r.monthlyRatesTaxesZAR || 0,
      r.monthlyCommunalServicesZAR || 0,
      r.managementType || 'Self-Managed',
      cashflow.agencyCommissionZAR || 0,
      r.monthlyMaintenanceReserveZAR || 0,
      r.unpaidUtilityArrearsZAR || 0,
      cashflow.netMonthlyCashflowZAR,
    ];
  });

  const wsRentals = XLSX.utils.aoa_to_sheet([rentalsHeaders, ...rentalsData]);
  wsRentals['!cols'] = [
    { wch: 28 },
    { wch: 30 },
    { wch: 16 },
    { wch: 24 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 26 },
    { wch: 26 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRentals, 'Rentals');

  // -------------------------------------------------------------
  // Sheet 3: Buy & Flip Projects
  // -------------------------------------------------------------
  const flipsHeaders = [
    'Project Title',
    'Address',
    'City',
    'Title Type',
    'Units',
    'Floor Area (m²)',
    'Status',
    'Purchase Price (ZAR)',
    'Acquisition Costs (ZAR)',
    'Renovation Budget (ZAR)',
    'Duration (Months)',
    'Monthly Bond Payment (ZAR)',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Other Holding Costs (ZAR)',
    'Monthly Holding Cost (ZAR)',
    'Total Holding Cost (ZAR)',
    'Target Exit Price (ZAR)',
    'Projected Net Profit (ZAR)',
    'Actual Exit Price (ZAR)',
    'Realized Net Profit (ZAR)',
  ];

  const flipsData = flips.map((f) => {
    const defaultBondFee = investorProfile.defaultBondCancellationFeeZAR ?? 5200;
    const fin = calculateFlipFinancials(f, defaultBondFee);
    const arch = calculateArchivedFlipFinancials(f, defaultBondFee);
    const renoCost = fin.effectiveRenoCostZAR;
    const durationMonths = fin.flipHoldingMonths;
    const monthlyHolding = fin.flipMonthlyHoldingCostZAR;
    const totalHoldingCost = fin.totalHoldingCostZAR;
    const projectedProfit = fin.projectedNetProfitZAR;
    const actualSale = f.actualSalePriceZAR ?? (f.status === 'Completed' ? f.targetExitPriceZAR : undefined);
    const realizedProfit = f.status === 'Completed' ? arch.realizedNetProfitZAR : undefined;

    return [
      f.title,
      f.address,
      f.city,
      f.propertyType,
      f.numberOfUnits ?? 1,
      f.floorAreaSqm || 'N/A',
      f.status,
      f.purchasePriceZAR || 0,
      f.acquisitionCostsZAR || 0,
      renoCost,
      durationMonths,
      f.monthlyBondPaymentZAR || 0,
      f.monthlyLeviesZAR || 0,
      f.monthlyRatesTaxesZAR || 0,
      f.monthlyOtherHoldingCostZAR || 0,
      monthlyHolding,
      totalHoldingCost,
      f.targetExitPriceZAR || 0,
      projectedProfit,
      actualSale ?? 'In Progress',
      realizedProfit ?? 'In Progress',
    ];
  });

  const wsFlips = XLSX.utils.aoa_to_sheet([flipsHeaders, ...flipsData]);
  wsFlips['!cols'] = [
    { wch: 28 },
    { wch: 30 },
    { wch: 16 },
    { wch: 24 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFlips, 'Buy & Flips');

  // -------------------------------------------------------------
  // Sheet 4: Flip Renovation BOQ
  // -------------------------------------------------------------
  const boqHeaders = [
    'Flip Project',
    'Category / Trade',
    'Item Description',
    'Supplier / Contractor',
    'Quantity',
    'Unit',
    'Baseline Unit Cost (ZAR)',
    'Baseline Total (ZAR)',
    'Actual Cost (ZAR)',
    'Variance (ZAR)',
    'Status',
    'Invoice Ref',
  ];

  const boqData: (string | number)[][] = [];
  flips.forEach((f) => {
    (f.boq || []).forEach((b) => {
      boqData.push([
        f.title,
        b.category,
        b.itemDescription,
        b.supplierOrContractor || 'Unassigned',
        b.quantity || 1,
        b.unit || 'sum',
        b.baselineUnitCostZAR || 0,
        b.baselineTotalZAR || 0,
        b.actualCostZAR || 0,
        b.varianceZAR || 0,
        b.status,
        b.invoiceRef || '',
      ]);
    });
  });

  const wsBOQ = XLSX.utils.aoa_to_sheet([boqHeaders, ...boqData]);
  wsBOQ['!cols'] = [
    { wch: 28 },
    { wch: 20 },
    { wch: 32 },
    { wch: 24 },
    { wch: 10 },
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBOQ, 'Renovation BOQ');

  // -------------------------------------------------------------
  // Sheet 5: Opportunity Pipeline
  // -------------------------------------------------------------
  const oppHeaders = [
    'Deal Title',
    'Address',
    'City',
    'Province',
    'Source Channel',
    'Property Type',
    'Status',
    'Open Market Value (ZAR)',
    'Purchase Price / Max Bid (ZAR)',
    'Built-In Equity (ZAR)',
    'Built-In Equity (%)',
    'Rehab Capex (ZAR)',
    'Transfer Duty (ZAR)',
    'Conveyancing Fee (ZAR)',
    'Auctioneer Fee (ZAR)',
    'Municipal Arrears (ZAR)',
    'Day-1 Capital Required (ZAR)',
    'Gross Yield (%)',
    'Net Monthly Cashflow (ZAR)',
    'Projected Flip Profit (ZAR)',
    'Projected Flip ROI (%)',
  ];

  const oppData = opportunities.map((d) => {
    const openMarket = d.openMarketValueZAR || Math.round(d.purchasePrice * 1.2);
    const builtInZAR = d.builtInEquityZAR ?? (openMarket - d.purchasePrice);
    const builtInPct = d.builtInEquityPercent ?? (openMarket > 0 ? Number(((builtInZAR / openMarket) * 100).toFixed(1)) : 0);

    return [
      d.title,
      d.address,
      d.city,
      d.province,
      d.source,
      d.propertyType,
      d.status,
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
    ];
  });

  const wsOpp = XLSX.utils.aoa_to_sheet([oppHeaders, ...oppData]);
  wsOpp['!cols'] = [
    { wch: 28 },
    { wch: 30 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOpp, 'Pipeline Deals');

  // -------------------------------------------------------------
  // Sheet 6: Private Funding
  // -------------------------------------------------------------
  const fundingHeaders = [
    'Funder / Lender Name',
    'Funding Category',
    'Entity / Contact Person',
    'Phone / Email',
    'Linked Deal / Project',
    'Principal Facility (ZAR)',
    'Total Repaid (ZAR)',
    'Total Interest Serviced (ZAR)',
    'Outstanding Balance (ZAR)',
    'Last Payment Reference',
    'Return Terms Type',
    'Promised Return Rate (%)',
    'Payment Schedule',
    'Status',
    'Notes',
  ];

  const fundingData = funding.map((f) => {
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
      f.lenderName,
      f.fundingType,
      f.entityOrContact || 'N/A',
      f.emailPhone || 'N/A',
      f.linkedDealName || f.linkedDealId || 'General Liquidity Pool',
      f.capitalAmountZAR || 0,
      f.totalRepaidZAR || 0,
      f.totalInterestPaidZAR || 0,
      outstanding,
      f.lastPaymentReference || 'N/A',
      f.returnTermsType,
      f.returnRatePercent || 0,
      f.paymentSchedule || 'Monthly Interest',
      f.status || 'Active',
      f.notes || '',
    ];
  });

  const wsFunding = XLSX.utils.aoa_to_sheet([fundingHeaders, ...fundingData]);
  wsFunding['!cols'] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 26 },
    { wch: 24 },
    { wch: 26 },
    { wch: 22 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFunding, 'Private Funding');

  // -------------------------------------------------------------
  // Trigger Browser Download
  // -------------------------------------------------------------
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `sa-property-portfolio-${dateStr}.xlsx`);
}

/**
 * Builds and downloads a SARS ITR12 Rental Income and Expenses Tax Report (.xlsx)
 * strictly formatted with official SARS ITR12 rental codes:
 * - Gross Rental Income (Code 4210)
 * - Rates & Taxes (Code 4212)
 * - Body Corporate / HOA Levies (Code 4214)
 * - Bond Interest Section 11(a) (Code 4216 - excludes non-deductible capital repayments)
 * - Agent Commission / Management Fees (Code 4218)
 * - Insurance Premiums (Code 4220)
 * - Repairs & Maintenance (Code 4222)
 * - Bad Debts Written Off (Code 4226)
 * - SARS Section 13sex Allowance (Code 4224)
 */
export async function exportITR12TaxReport(rentals: RentalProperty[], taxYear: number | string = 2026) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['SARS ITR12 - RENTAL INCOME & EXPENSES TAX SCHEDULE'],
    ['Tax Assessment Year', String(taxYear)],
    ['Generated On', new Date().toLocaleString('en-ZA')],
    ['Accounting Standard', 'SARS Section 11(a) Interest Deductions & Section 13sex Building Allowances'],
    ['Notice', 'Bond deductions strictly reflect bond interest. Capital repayments are non-deductible per SARS guidelines.'],
    [''],
  ];

  const headers = [
    'Property Title',
    'Address',
    'City',
    'Gross Rent (Code 4210)',
    'Rates & Taxes (Code 4212)',
    'Levies (Code 4214)',
    'Bond Interest Sec 11(a) (Code 4216)',
    'Agent Commission (Code 4218)',
    'Insurance (Code 4220)',
    'Repairs & Maint (Code 4222)',
    'Bad Debts Written Off (Code 4226)',
    'Section 13sex Allowance (Code 4224)',
    'Total Allowable Deductions',
    'Net Taxable Rental Income / Loss',
  ];

  let totalGross = 0;
  let totalRates = 0;
  let totalLevies = 0;
  let totalInterest = 0;
  let totalAgent = 0;
  let totalInsurance = 0;
  let totalRepairs = 0;
  let totalBadDebts = 0;
  let totalSec13 = 0;
  let totalDeductionsAll = 0;
  let totalNetTaxable = 0;

  const dataRows = rentals.map((r) => {
    const isFreehold = r.propertyType === 'Freehold House';

    // Transactions actuals vs annual baseline fallback
    const tx = r.transactions || [];
    const getTxAmount = (cat: string) => tx.filter((t) => t.category === cat).reduce((s, t) => s + (t.amountZAR || 0), 0);

    const grossRent = getTxAmount('gross_rent') || ((r.monthlyGrossRentZAR || 0) * 12);
    const rates = getTxAmount('rates_taxes') || ((r.monthlyRatesTaxesZAR || 0) * 12);
    const levies = isFreehold ? 0 : (getTxAmount('levies') || ((r.monthlyLeviesZAR || 0) * 12));

    // Section 11(a): interest only
    const bondInterest = getTxAmount('bond_interest') || (
      (r.outstandingBondBalanceZAR && r.bondInterestRatePercent)
        ? Math.round(r.outstandingBondBalanceZAR * (r.bondInterestRatePercent / 100))
        : 0
    );

    let agentFee = getTxAmount('agent_commission');
    if (!agentFee && r.managementType === 'Agency') {
      if (typeof r.monthlyAgentFeeZAR === 'number' && r.monthlyAgentFeeZAR > 0) {
        agentFee = r.monthlyAgentFeeZAR * 12;
      } else if (typeof r.agencyCommissionPercent === 'number' && r.agencyCommissionPercent > 0) {
        const baseComm = (r.monthlyGrossRentZAR || 0) * (r.agencyCommissionPercent / 100);
        const vatMultiplier = r.agencyVatApplicable !== false ? 1.15 : 1.0;
        agentFee = Math.round(baseComm * vatMultiplier) * 12;
      }
    }

    const insurance = isFreehold ? (getTxAmount('insurance') || (r.annualBuildingInsuranceZAR || 0)) : 0;
    const repairs = getTxAmount('repairs_maintenance') || ((r.monthlyMaintenanceReserveZAR || 0) * 12);
    const badDebts = (r.arrearsWriteOffs || []).reduce((sum, w) => sum + (w.amountZAR || 0), 0);
    const sec13 = r.section13sexAnnualShieldZAR || 0;

    const deductions = rates + levies + bondInterest + (agentFee || 0) + insurance + repairs + badDebts + sec13;
    const netTaxable = grossRent - deductions;

    totalGross += grossRent;
    totalRates += rates;
    totalLevies += levies;
    totalInterest += bondInterest;
    totalAgent += (agentFee || 0);
    totalInsurance += insurance;
    totalRepairs += repairs;
    totalBadDebts += badDebts;
    totalSec13 += sec13;
    totalDeductionsAll += deductions;
    totalNetTaxable += netTaxable;

    return [
      r.title,
      r.address,
      r.city,
      grossRent,
      rates,
      levies,
      bondInterest,
      agentFee || 0,
      insurance,
      repairs,
      badDebts,
      sec13,
      deductions,
      netTaxable,
    ];
  });

  const totalsRow = [
    'TOTAL PORTFOLIO',
    '',
    '',
    totalGross,
    totalRates,
    totalLevies,
    totalInterest,
    totalAgent,
    totalInsurance,
    totalRepairs,
    totalBadDebts,
    totalSec13,
    totalDeductionsAll,
    totalNetTaxable,
  ];

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows, totalsRow]);
  ws['!cols'] = [
    { wch: 28 },
    { wch: 26 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 30 },
    { wch: 24 },
    { wch: 18 },
    { wch: 22 },
    { wch: 26 },
    { wch: 28 },
    { wch: 24 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `ITR12 Tax ${taxYear}`);
  XLSX.writeFile(wb, `sars-itr12-rental-tax-report-${taxYear}.xlsx`);
}

// ==========================================
// SINGLE-PROJECT EXTERNAL TEAM PACK EXPORT
// ==========================================

export function slugifyDevelopmentTitle(title: string): string {
  const cleaned = (title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'project';
}

export function formatLocalExportDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDevelopmentProjectWorkbook(
  XLSX: typeof import('xlsx'),
  dev: DevelopmentProject,
  summary?: DevelopmentFinancialSummary,
  customNodeBenchmarks?: CustomNodeBenchmarksMap,
  sponsorEntityName?: string
) {
  const summarySponsorName =
    sponsorEntityName ||
    (!dev.seniorJvPartnerName &&
    summary?.bankReadiness?.deliveryTrackRecord?.partnerOrEntity &&
    summary.bankReadiness.deliveryTrackRecord.partnerOrEntity !== 'Self-Delivered (Owner Entity)'
      ? summary.bankReadiness.deliveryTrackRecord.partnerOrEntity
      : undefined);
  const hasCustomBenchmarks = Boolean(
    customNodeBenchmarks && Object.keys(customNodeBenchmarks).length > 0
  );
  const resolvedSummary = hasCustomBenchmarks
    ? calculateDevelopmentFinancials(dev, customNodeBenchmarks, summarySponsorName)
    : summary ?? calculateDevelopmentFinancials(dev, customNodeBenchmarks, summarySponsorName);
  const matrix = calculateDevelopmentDebtWipeoutMatrix(dev, resolvedSummary);
  const approvalsProgress = calculateApprovalsProgress(dev.approvals);
  const zoningEnv = dev.zoningProfile
    ? calculateZoningEnvelope(
        dev.zoningProfile,
        dev.totalBuildableAreaSqm,
        Array.isArray(dev.units) ? dev.units.length : 0
      )
    : null;

  const wb = XLSX.utils.book_new();

  // ------------------------------------------------------------------
  // SHEET 1: Executive & Capital Stack
  // ------------------------------------------------------------------
  const execRows: (string | number)[][] = [
    ['MOREMELA EXTERNAL TEAM COLLABORATION & DEAL PACK'],
    ['Project Title', dev.title],
    ['Street Address', dev.address],
    ['City / Municipality', dev.city],
    ['Province', dev.province || 'N/A'],
    ['Development Typology', dev.developmentType],
    ['Current Lifecycle Phase', dev.currentPhase],
    ['VAT Registered Developer', dev.isVatRegisteredDeveloper ? 'Yes' : 'No'],
    ['Tax Entity Type', resolvedSummary.taxEntityType],
    ['Senior Co-Developer / JV Partner', dev.seniorJvPartnerName || 'Independent Sponsor'],
    [
      'Land Availability Agreement (LAA)',
      resolvedSummary.isDeferredLandPaymentLAA
        ? 'Yes - Land Deferred to Unit Transfer'
        : 'No - Day-1 Cash Acquisition',
    ],
    [],
    ['ZONING & BULK UTILIZATION', 'Metric / Status', 'Notes'],
    [
      'Zoning Transition',
      dev.zoningProfile ? formatZoningTransitionLabel(dev.zoningProfile) : 'Not Profiled',
      '',
    ],
    ['Erf Size (m2)', dev.zoningProfile ? Number(dev.zoningProfile.erfSizeSqm) || 0 : 0, ''],
    ['Planned Buildable Area (m2)', Number(dev.totalBuildableAreaSqm) || 0, ''],
    ['Max Permitted Bulk (m2)', zoningEnv ? Number(zoningEnv.maxPermittedBulkSqm) || 0 : 0, ''],
    [
      'Bulk Utilization (%)',
      zoningEnv ? Number(zoningEnv.bulkUtilizationPercent.toFixed(1)) : 0,
      zoningEnv?.isBulkExceeded ? 'EXCEEDS PERMITTED BULK' : 'Within Envelope',
    ],
    ['Max Ground Footprint (m2)', zoningEnv ? Number(zoningEnv.maxGroundFootprintSqm) || 0 : 0, ''],
    [
      'SPLUMA Rezoning Triggered',
      zoningEnv ? (zoningEnv.isSplumaRezoningTriggered ? 'Yes' : 'No') : 'N/A',
      '',
    ],
    [],
    ['4-PILLAR SA COMMERCIAL BANK READINESS', 'Pillar Status', 'Details'],
    [
      'Overall Bank Readiness',
      resolvedSummary.bankReadiness.overallBankable ? 'Bankable' : 'Action Required',
      '',
    ],
    [
      'Pillar 1: Paper Rights & Approvals',
      resolvedSummary.bankReadiness.paperRights.statusLabel,
      resolvedSummary.bankReadiness.paperRights.details,
    ],
    [
      'Pillar 2: QS Costing & Geotech',
      resolvedSummary.bankReadiness.qsAndGeotech.statusLabel,
      resolvedSummary.bankReadiness.qsAndGeotech.details,
    ],
    [
      'Pillar 3: Pre-Sales Hurdle Gate',
      resolvedSummary.bankReadiness.preSalesGate.statusLabel,
      resolvedSummary.bankReadiness.preSalesGate.details,
    ],
    [
      'Pillar 4: Delivery Track Record',
      resolvedSummary.bankReadiness.deliveryTrackRecord.statusLabel,
      `${resolvedSummary.bankReadiness.deliveryTrackRecord.partnerOrEntity} — ${resolvedSummary.bankReadiness.deliveryTrackRecord.details}`,
    ],
    [],
    ['CAPITAL STACK, TDC vs. GDV & RETURN METRICS (RAW NUMERIC ZAR)', 'Value', 'Unit / Notes'],
    ['Land Purchase Price (ZAR)', Number(dev.landPurchasePriceZAR) || 0, 'ZAR'],
    ['Total Land & Acquisition (ZAR)', Number(resolvedSummary.totalLandAndAcquisitionZAR) || 0, 'ZAR'],
    ['Day-1 Sponsor Equity Outlay (ZAR)', Number(resolvedSummary.day1EquityOutlayZAR) || 0, 'ZAR'],
    ['Deferred Land Payable at Exit (ZAR)', Number(resolvedSummary.deferredLandPayableAtExitZAR) || 0, 'ZAR'],
    ['Land Cost per Planned Unit (ZAR)', Number(resolvedSummary.landCostPerUnitZAR) || 0, 'ZAR / Unit'],
    ['Land Cost to GDV Ratio (%)', Number(resolvedSummary.landToGdvPercent.toFixed(2)), '%'],
    ['Professional Soft Costs & Municipal Bulk (ZAR)', Number(resolvedSummary.totalSoftCostsZAR) || 0, 'ZAR'],
    ['Budgeted Hard Construction Cost (ZAR)', Number(resolvedSummary.budgetedHardBuildCostZAR) || 0, 'ZAR'],
    ['Active Hard Construction Cost (ZAR)', Number(resolvedSummary.activeHardBuildCostZAR) || 0, 'ZAR'],
    ['Carrying & Holding Burn (ZAR)', Number(resolvedSummary.totalCarryingCostZAR) || 0, 'ZAR'],
    ['Contingency Reserve Buffer (ZAR)', Number(resolvedSummary.contingencyReserveZAR) || 0, 'ZAR'],
    ['Total Development Cost / TDC (ZAR)', Number(resolvedSummary.tdcZAR) || 0, 'ZAR'],
    ['TDC per m2 (ZAR)', Number(resolvedSummary.tdcPerSqmZAR) || 0, 'ZAR / m2'],
    ['TDC per Unit (ZAR)', Number(resolvedSummary.tdcPerUnitZAR) || 0, 'ZAR / Unit'],
    ['Total Units Planned', Number(resolvedSummary.totalUnitsCount) || 0, 'Units'],
    ['Gross Development Value incl. VAT / GDV (ZAR)', Number(resolvedSummary.gdvInclVatZAR) || 0, 'ZAR'],
    ['Net Realizable GDV excl. Output VAT (ZAR)', Number(resolvedSummary.netRealizableGdvZAR) || 0, 'ZAR'],
    ['Average Unit List Price (ZAR)', Number(resolvedSummary.avgUnitListPriceZAR) || 0, 'ZAR / Unit'],
    [
      'Suburb End-User Bond Ceiling (ZAR)',
      Number(resolvedSummary.suburbEndUserBondCeilingZAR) || 0,
      resolvedSummary.isWithinEndUserBondCeiling ? 'Within Retail Bond Ceiling' : 'Above Suburb Bond Ceiling',
    ],
    ['GDV to TDC Multiple (x)', Number(resolvedSummary.gdvToTdcMultiple.toFixed(2)), 'x'],
    ['Net Profit Before Tax (ZAR)', Number(resolvedSummary.netProfitBeforeTaxZAR) || 0, 'ZAR'],
    ['Pre-Tax Profit on Cost / POC (%)', Number(resolvedSummary.pocPercent.toFixed(2)), '%'],
    ['Estimated Tax Provision (ZAR)', Number(resolvedSummary.estimatedTaxProvisionZAR) || 0, 'ZAR'],
    ['Net Profit After Tax (ZAR)', Number(resolvedSummary.netProfitAfterTaxZAR) || 0, 'ZAR'],
    ['After-Tax POC (%)', Number(resolvedSummary.afterTaxPocPercent.toFixed(2)), '%'],
    ['Senior Facility Limit (ZAR)', Number(dev.developmentFacilityLimitZAR) || 0, 'ZAR'],
    ['Senior Facility Drawn (ZAR)', Number(dev.developmentFacilityDrawnZAR) || 0, 'ZAR'],
    ['Outstanding Senior Debt (ZAR)', Number(resolvedSummary.outstandingDevFacilityZAR) || 0, 'ZAR'],
    ['Pre-Sales Hurdle Target (%)', Number(resolvedSummary.preSalesHurdlePercent) || 0, '%'],
    ['Pre-Sold GDV Achieved (%)', Number(resolvedSummary.preSoldGdvPercent.toFixed(2)), '%'],
    ['Units Required for Debt Wipeout', Number(resolvedSummary.unitsRequiredForDebtWipeout) || 0, 'Units'],
    ['Unencumbered / Free-Carry Units', Number(resolvedSummary.unencumberedUnitsCount) || 0, 'Units'],
    ['Section 13sex Eligible (>= 5 Retained Units)', resolvedSummary.isSection13SexEligible ? 'Yes' : 'No', 'SARS Act'],
    [
      'Section 13sex 20-Year Tax Shield (ZAR)',
      Number(resolvedSummary.section13sexTwentyYearSavingsZAR) || 0,
      'ZAR',
    ],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(execRows);
  ws1['!cols'] = [{ wch: 44 }, { wch: 24 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Executive & Capital Stack');

  // ------------------------------------------------------------------
  // SHEET 2: Unit Inventory & Split-Exit
  // ------------------------------------------------------------------
  const waterfallMap = new Map(matrix.unitsWaterfall.map((w) => [w.unitId, w]));
  const units = Array.isArray(dev.units) ? dev.units : [];
  const unitHeaders = [
    'Unit #',
    'Configuration',
    'Floor Area (m2)',
    'Allocated Cost Basis (ZAR)',
    'List Price incl. VAT (ZAR)',
    'Est. Monthly Rent (ZAR)',
    'Sale Status',
    'Split-Exit Allocation',
    'Debt Wipeout Sequence #',
    'Buyer / Ref',
    'Deposit Held (ZAR)',
  ];

  let totalUnitSqm = 0;
  let totalUnitCostBasis = 0;
  let totalUnitListPrice = 0;
  let totalUnitRent = 0;
  let totalUnitDeposits = 0;

  const unitRows = units.map((unit) => {
    const wf = waterfallMap.get(unit.id);
    const sqm = Number(unit.floorAreaSqm) || 0;
    const costBasis = Number(unit.allocatedCostBasisZAR) || 0;
    const listPrice = Number(unit.listPriceVatInclZAR) || 0;
    const estRent = Number(unit.estimatedMonthlyRentZAR) || 0;
    const depositHeld = Number(unit.depositHeldZAR) || 0;

    totalUnitSqm += sqm;
    totalUnitCostBasis += costBasis;
    totalUnitListPrice += listPrice;
    totalUnitRent += estRent;
    totalUnitDeposits += depositHeld;

    const buyerAndRef = [unit.buyerName, unit.conveyancerRef]
      .filter((v) => Boolean(v && String(v).trim()))
      .join(' / ');

    return [
      unit.unitNumber,
      unit.configuration,
      sqm,
      costBasis,
      listPrice,
      estRent,
      unit.status,
      wf ? wf.waterfallRole : unit.status === 'Retained for Rental' ? 'Free-Carry Retained Equity' : 'Pending Allocation',
      wf?.debtSequenceIndex ?? '',
      buyerAndRef,
      depositHeld,
    ];
  });

  const ws2Rows: (string | number)[][] = [
    unitHeaders,
    ...unitRows,
    [
      'TOTAL',
      `${units.length} Units`,
      totalUnitSqm,
      totalUnitCostBasis,
      totalUnitListPrice,
      totalUnitRent,
      `${matrix.unitsForSaleCount} For Sale / ${matrix.unitsRetainedCount} Retained`,
      matrix.isFreeCarryAchieved ? 'Free-Carry Achieved' : 'Debt Coverage Active',
      '',
      '',
      totalUnitDeposits,
    ],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(ws2Rows);
  ws2['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 15 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 28 },
    { wch: 22 },
    { wch: 26 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Unit Inventory & Split-Exit');

  // ------------------------------------------------------------------
  // SHEET 3: Cost Stack & Hard Build BOQ
  // ------------------------------------------------------------------
  const soft = dev.softCosts || {
    townPlannerZAR: 0,
    architectZAR: 0,
    structuralCivilEngineerZAR: 0,
    quantitySurveyorZAR: 0,
    nhbrcEnrolmentFeeZAR: 0,
    councilBulkContributionsZAR: 0,
    planScrutinyAndSubdivisionFeesZAR: 0,
    marketingAndShowUnitZAR: 0,
  };

  const softCostRows: (string | number)[][] = [
    ['PROFESSIONAL TEAM & MUNICIPAL SOFT COSTS'],
    ['Role / Statutory Line Item', 'Category', 'Statutory / Scope Basis', 'Budgeted Amount (ZAR)'],
    ['Town Planner', 'Professional Fee', 'SPLUMA Sec 42 Rezoning & Subdivision', Number(soft.townPlannerZAR) || 0],
    ['Architect', 'Professional Fee', 'Municipal Building Plans & Working Drawings', Number(soft.architectZAR) || 0],
    ['Structural & Civil Engineer', 'Professional Fee', 'Geotech, Foundation & Civil Services Design', Number(soft.structuralCivilEngineerZAR) || 0],
    ['Quantity Surveyor (QS)', 'Professional Fee', 'BOQ Preparation, JBCC Draws & Cost Control', Number(soft.quantitySurveyorZAR) || 0],
    ['NHBRC Enrolment Fee', 'Statutory Fee', 'Housing Consumers Protection Measures Act', Number(soft.nhbrcEnrolmentFeeZAR) || 0],
    ['Council Bulk Contributions', 'Municipal Charge', 'Engineering Services & Bulk Augmentation', Number(soft.councilBulkContributionsZAR) || 0],
    ['Plan Scrutiny & Subdivision Fees', 'Municipal Charge', 'NBR Sec 7(1) & SG Diagram Scrutiny', Number(soft.planScrutinyAndSubdivisionFeesZAR) || 0],
    ['Marketing & Show Unit', 'Sales & Launch', 'Pre-Sales Collateral & Launch Show Unit', Number(soft.marketingAndShowUnitZAR) || 0],
    ['TOTAL SOFT COSTS & MUNICIPAL CHARGES', '', '', Number(resolvedSummary.totalSoftCostsZAR) || 0],
    [],
    ['HARD CONSTRUCTION BILL OF QUANTITIES (BOQ)'],
    [
      'Trade Category',
      'Draw Phase',
      'Scope / Description',
      'Unit / Qty',
      'Baseline Unit Cost (ZAR)',
      'Baseline ZAR',
      'Actual ZAR',
      'Variance ZAR',
      'Supplier / Contractor',
      'Status',
      'Invoice Ref',
    ],
  ];

  const boqItems = Array.isArray(dev.boqItems) ? dev.boqItems : [];
  let boqBaselineSum = 0;
  let boqActualSum = 0;
  let boqVarianceSum = 0;

  const boqRows = boqItems.map((item) => {
    const qty = Number(item.quantity) || 0;
    const unitCost = Number(item.baselineUnitCostZAR) || 0;
    const baseline =
      item.baselineTotalZAR !== undefined &&
      item.baselineTotalZAR !== null &&
      Number.isFinite(Number(item.baselineTotalZAR))
        ? Number(item.baselineTotalZAR)
        : Math.round(qty * unitCost);
    const actual = Number(item.actualCostZAR) || 0;
    const variance =
      item.varianceZAR !== undefined &&
      item.varianceZAR !== null &&
      Number.isFinite(Number(item.varianceZAR))
        ? Number(item.varianceZAR)
        : actual - baseline;

    boqBaselineSum += baseline;
    boqActualSum += actual;
    boqVarianceSum += variance;

    return [
      item.category,
      item.milestonePhase || 'Unassigned',
      item.itemDescription,
      `${qty} ${item.unit || ''}`.trim(),
      unitCost,
      baseline,
      actual,
      variance,
      item.supplierOrContractor || '',
      item.status,
      item.invoiceRef || '',
    ];
  });

  const ws3Rows: (string | number)[][] = [
    ...softCostRows,
    ...boqRows,
    [
      'TOTAL HARD BUILD BOQ',
      '',
      `${boqItems.length} BOQ Line Items`,
      '',
      '',
      boqBaselineSum,
      boqActualSum,
      boqVarianceSum,
      '',
      '',
      '',
    ],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(ws3Rows);
  ws3['!cols'] = [
    { wch: 30 },
    { wch: 22 },
    { wch: 38 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'Cost Stack & Hard Build BOQ');

  // ------------------------------------------------------------------
  // SHEET 4: Paper Rights & Approvals
  // ------------------------------------------------------------------
  const approvalRows: (string | number)[][] = [
    ['PAPER RIGHTS & STATUTORY APPROVALS SCHEDULE'],
    [
      'Milestones Cleared',
      `${approvalsProgress.approvedCount} / ${approvalsProgress.totalItems}`,
      'Completion (%)',
      approvalsProgress.progressPercent,
      'Stage 1 Bank Gate',
      approvalsProgress.isStage1Approved ? 'Stage 1 Cleared' : 'Pending Stage 1 Approvals',
    ],
    [],
    [
      'Stage',
      'Statutory Milestone',
      'Authority',
      'Statutory Act',
      'Authority Reference #',
      'Status',
      'Submitted Date',
      'Target Approval Date',
      'Approved Date',
      'Notes',
    ],
    ...DEVELOPMENT_APPROVAL_DEFINITIONS.map((def) => {
      const item = dev.approvals?.[def.key];
      return [
        def.stage,
        def.title,
        def.authority,
        def.statutoryAct,
        item?.referenceNo || '',
        item?.status || 'Not Started',
        item?.submittedDate || '',
        item?.targetApprovalDate || '',
        item?.approvedDate || '',
        item?.notes || '',
      ];
    }),
  ];

  const ws4 = XLSX.utils.aoa_to_sheet(approvalRows);
  ws4['!cols'] = [
    { wch: 34 },
    { wch: 38 },
    { wch: 34 },
    { wch: 36 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(wb, ws4, 'Paper Rights & Approvals');

  // ------------------------------------------------------------------
  // SHEET 5: Team Comments & Action Ledger
  // ------------------------------------------------------------------
  const sortedComments = filterProjectComments(dev.commentsLedger, 'All');
  const commentRows: (string | number)[][] = [
    [
      'Comment ID',
      'Date',
      'Author Name',
      'Role',
      'Section Tag',
      'Comment / Action Note',
      'Status',
      'Resolved Date',
    ],
    ...sortedComments.map((comment) => [
      comment.id || '',
      comment.createdAt ? comment.createdAt.slice(0, 10) : '',
      comment.authorName || '',
      comment.authorRole || '',
      comment.sectionTag || 'General',
      comment.message || '',
      comment.status || 'Pending',
      comment.resolvedAt ? comment.resolvedAt.slice(0, 10) : '',
    ]),
  ];

  const ws5 = XLSX.utils.aoa_to_sheet(commentRows);
  ws5['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 24 },
    { wch: 26 },
    { wch: 24 },
    { wch: 64 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws5, 'Team Comments & Action Ledger');

  return wb;
}

export async function exportDevelopmentProjectToExcel(
  dev: DevelopmentProject,
  summary: DevelopmentFinancialSummary,
  customNodeBenchmarks?: CustomNodeBenchmarksMap,
  sponsorEntityName?: string
): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = buildDevelopmentProjectWorkbook(
    XLSX,
    dev,
    summary,
    customNodeBenchmarks,
    sponsorEntityName
  );
  const fileName = `moremela-dev-${slugifyDevelopmentTitle(dev.title)}-team-pack-${formatLocalExportDate()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

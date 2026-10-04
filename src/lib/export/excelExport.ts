import * as XLSX from 'xlsx';
import {
  RentalProperty,
  FlipProject,
  OpportunityDeal,
  FundingSource,
  PortfolioSummary,
  InvestorProfile,
} from '@/types';
import { calculateRentalCashflow } from '@/lib/calculations/propertyMetrics';

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
export function exportPortfolioToExcel(data: ExportPortfolioData) {
  const { rentals, flips, opportunities, funding, summary, investorProfile } = data;
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: Executive Summary
  // -------------------------------------------------------------
  const summaryRows = [
    ['SA PROPERTY INVESTMENT HUB - EXECUTIVE PORTFOLIO SUMMARY'],
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
    const totalBoq = (f.boq || []).reduce(
      (sum, b) => sum + (b.actualCostZAR || b.baselineTotalZAR || 0),
      0
    );
    const renoCost = totalBoq > 0 ? totalBoq : f.baselineRenovationBudgetZAR || 0;
    const durationMonths = f.estimatedDurationMonths ?? 6;
    const monthlyHolding = f.monthlyHoldingCostZAR ?? 0;
    const totalHoldingCost = durationMonths * monthlyHolding;
    const sec118Cost =
      (f.municipalClearance?.sec118ArrearsZAR || 0) +
      (f.municipalClearance?.advanceCouncilDepositZAR || 0);
    const exitCommissionPercent = typeof f.exitCommissionPercent === 'number' ? f.exitCommissionPercent : 5.75;
    const exitCommission = f.targetExitPriceZAR > 0 ? (f.targetExitPriceZAR * exitCommissionPercent) / 100 : 0;
    const totalOutlay = (f.purchasePriceZAR || 0) + (f.acquisitionCostsZAR || 0) + renoCost + totalHoldingCost + sec118Cost + exitCommission;
    const projectedProfit = (f.targetExitPriceZAR || 0) - totalOutlay;
    const actualSale = f.actualSalePriceZAR ?? (f.status === 'Completed' ? f.targetExitPriceZAR : undefined);
    const realizedExitCommission = actualSale ? (actualSale * exitCommissionPercent) / 100 : 0;
    const realizedTotalOutlay = (f.purchasePriceZAR || 0) + (f.acquisitionCostsZAR || 0) + renoCost + totalHoldingCost + sec118Cost + realizedExitCommission;
    const realizedProfit = actualSale ? actualSale - realizedTotalOutlay : undefined;

    return [
      f.title,
      f.address,
      f.city,
      f.propertyType,
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
    'Outstanding Balance (ZAR)',
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
      outstanding,
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
    { wch: 22 },
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
export function exportITR12TaxReport(rentals: RentalProperty[], taxYear: number | string = 2026) {
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

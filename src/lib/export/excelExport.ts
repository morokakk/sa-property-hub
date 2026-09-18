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
    const cashflow = calculateRentalCashflow({
      monthlyGrossRentZAR: r.monthlyGrossRentZAR,
      monthlyLeviesZAR: r.monthlyLeviesZAR,
      monthlyRatesTaxesZAR: r.monthlyRatesTaxesZAR,
      monthlyMaintenanceReserveZAR: r.monthlyMaintenanceReserveZAR,
      monthlyBondPaymentZAR: r.monthlyBondPaymentZAR,
      managementType: r.managementType,
      agencyCommissionPercent: r.agencyCommissionPercent,
      agencyVatApplicable: r.agencyVatApplicable,
      monthlyAgentFeeZAR: r.monthlyAgentFeeZAR,
      unpaidUtilityArrearsZAR: r.unpaidUtilityArrearsZAR,
    });

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
      r.tenantName || 'Vacant',
      r.tenantPhone || 'N/A',
      r.leaseEndDate || 'N/A',
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
    const totalOutlay = (f.purchasePriceZAR || 0) + (f.acquisitionCostsZAR || 0) + renoCost + totalHoldingCost;
    const projectedProfit = (f.targetExitPriceZAR || 0) - totalOutlay;
    const actualSale = f.actualSalePriceZAR ?? (f.status === 'Completed' ? f.targetExitPriceZAR : undefined);
    const realizedProfit = actualSale ? actualSale - totalOutlay : undefined;

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
    const outstanding = Math.max(0, f.capitalAmountZAR - (f.totalRepaidZAR || 0));
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

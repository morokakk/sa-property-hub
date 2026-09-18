import { RentalProperty, FlipProject, OpportunityDeal, FundingSource } from '@/types';
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
    'Management Type',
    'Agency Commission (ZAR)',
    'Monthly Maintenance Reserve (ZAR)',
    'Unpaid Tenant Utility Arrears (ZAR)',
    'Net Monthly Cashflow (ZAR)',
  ];

  const rows = rentals.map((r) => {
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
      escapeCSV(r.title),
      escapeCSV(r.address),
      escapeCSV(r.city),
      escapeCSV(r.propertyType),
      escapeCSV(r.status),
      r.marketValueZAR || 0,
      r.purchasePriceZAR || 0,
      r.outstandingBondBalanceZAR || 0,
      r.monthlyBondPaymentZAR || 0,
      escapeCSV(r.tenantName),
      escapeCSV(r.tenantPhone),
      escapeCSV(r.tenantEmail),
      escapeCSV(r.leaseStartDate),
      escapeCSV(r.leaseEndDate),
      r.depositHeldZAR || 0,
      r.monthlyGrossRentZAR || 0,
      r.monthlyLeviesZAR || 0,
      r.monthlyRatesTaxesZAR || 0,
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

  const rows = (flip.boq || []).map((item) => {
    return [
      escapeCSV(flip.title),
      escapeCSV(item.category),
      escapeCSV(item.itemDescription),
      escapeCSV(item.supplierOrContractor || 'Unassigned'),
      item.quantity || 1,
      escapeCSV(item.unit || 'sum'),
      item.baselineUnitCostZAR || 0,
      item.baselineTotalZAR || 0,
      item.actualCostZAR || 0,
      item.varianceZAR || 0,
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
    const outstanding = Math.max(0, f.capitalAmountZAR - (f.totalRepaidZAR || 0));

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

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
import {
  formatZoningSummary,
  formatOccupiedUnitsSummary,
  getTotalDepositsHeldZAR,
  computeFundingDrawnAndUndrawn,
} from '@/lib/export/csvExport';

export interface ExportPortfolioData {
  rentals: RentalProperty[];
  flips: FlipProject[];
  developments?: DevelopmentProject[];
  opportunities: OpportunityDeal[];
  funding: FundingSource[];
  summary: PortfolioSummary;
  investorProfile: InvestorProfile;
}

/**
 * Pure builder for the multi-tab Microsoft Excel (.xlsx) portfolio workbook.
 */
export function buildPortfolioWorkbook(
  XLSX: typeof import('xlsx'),
  data: ExportPortfolioData
) {
  const {
    rentals,
    flips,
    developments = [],
    opportunities,
    funding,
    summary,
    investorProfile,
  } = data;
  const wb = XLSX.utils.book_new();

  const unlinkedDevDebt = Math.max(
    0,
    (summary.totalFundingLiabilities || 0) -
      (summary.totalPrivateFundingLiability || 0) -
      (summary.totalBondLiabilities || 0)
  );

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
    ['Development Portfolio Value', summary.totalDevelopmentValue ?? summary.developmentsValueZAR ?? 0],
    ['Liquid Capital Reserve', summary.liquidCapitalReserve],
    ['Unallocated Funding Reserve', summary.unallocatedFundingReserve],
    ['Total Purchasing Power', summary.totalAvailablePurchasingPower],
    ['Total Debt Liabilities', summary.totalFundingLiabilities],
    ['Private Funding Liabilities', summary.totalPrivateFundingLiability],
    ['Bank Mortgage Bond Liabilities', summary.totalBondLiabilities],
    ['Development Debt Liabilities (Unlinked)', unlinkedDevDebt],
    [
      'Total Senior Development Debt (incl. Linked Facilities)',
      summary.totalDevelopmentLiabilities ?? summary.totalDevelopmentDebtLiability ?? 0,
    ],
    ['Monthly Net Rental Cashflow', summary.monthlyNetRentalCashflow],
    ['Projected Flip Profits (Active)', summary.totalProjectedFlipProfits],
    ['Realized Flip Profits (Completed)', summary.totalRealizedFlipProfits],
    ['Active Rental Units', summary.activeRentalsCount],
    ['Sold / Exited Rental Units', summary.soldRentalsCount],
    ['Active Flip Projects', summary.activeFlipsCount],
    ['Completed Flip Projects', summary.completedFlipsCount],
    ['Active Developments Count', summary.activeDevelopmentsCount ?? 0],
    ['Pipeline Sourcing Deals', summary.pendingOpportunitiesCount],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 52 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // -------------------------------------------------------------
  // Sheet 2: Rental Portfolio
  // -------------------------------------------------------------
  const rentalsHeaders = [
    'Property Title',
    'Address',
    'City',
    'Province',
    'Title Type',
    'Units',
    'Occupied Units',
    'Floor Area (m²)',
    'Status',
    'Market Value (ZAR)',
    'Purchase Price (ZAR)',
    'Outstanding Bond (ZAR)',
    'Loan Term (Years)',
    'Monthly Bond Repayment (ZAR)',
    'Extra Monthly Bond Payment (ZAR)',
    'Bond Effective Month',
    'Tenant Name',
    'Tenant Phone',
    'Lease Expiry',
    'Deposit Held (ZAR)',
    'Monthly Gross Rent (ZAR)',
    'Ancillary Income (ZAR)',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Annual Building Insurance (ZAR)',
    'Utility Type',
    'Communal / Serviced OpEx (ZAR)',
    'Prepaid Vending Fee (ZAR)',
    'Management Type',
    'Agency Commission (ZAR)',
    'Monthly Maintenance Reserve (ZAR)',
    'Section 13sex Annual Shield (ZAR)',
    'Unpaid Utility Arrears (ZAR)',
    'Net Monthly Cashflow (ZAR)',
    'Zoning Summary',
    'Applicants Count',
  ];

  const rentalsData = rentals.map((r) => {
    const cashflow = calculateRentalCashflow(r);

    return [
      r.title,
      r.address,
      r.city,
      r.province || '',
      r.propertyType,
      r.numberOfUnits ?? 1,
      formatOccupiedUnitsSummary(r),
      r.floorAreaSqm || 'N/A',
      r.status,
      r.marketValueZAR || 0,
      r.purchasePriceZAR || 0,
      r.outstandingBondBalanceZAR || 0,
      r.loanTermYears ?? 20,
      r.monthlyBondPaymentZAR || 0,
      r.extraMonthlyPaymentZAR || 0,
      r.bondPaymentEffectiveDate || 'Ongoing',
      r.leases?.[0]?.tenantName || 'Vacant',
      r.leases?.[0]?.tenantPhone || 'N/A',
      r.leases?.[0]?.leaseEndDate || 'N/A',
      getTotalDepositsHeldZAR(r),
      r.monthlyGrossRentZAR || cashflow.grossRentZAR || 0,
      cashflow.ancillaryIncomeZAR || 0,
      r.monthlyLeviesZAR || 0,
      r.monthlyRatesTaxesZAR || 0,
      r.annualBuildingInsuranceZAR || 0,
      r.utilityType || '',
      r.monthlyCommunalServicesZAR || 0,
      r.monthlyPrepaidVendingFeeZAR || 0,
      r.managementType || 'Self-Managed',
      cashflow.agencyCommissionZAR || 0,
      r.monthlyMaintenanceReserveZAR || 0,
      r.section13sexAnnualShieldZAR || 0,
      r.unpaidUtilityArrearsZAR || 0,
      cashflow.netMonthlyCashflowZAR,
      formatZoningSummary(r.zoningProfile),
      (r.applicants || []).length,
    ];
  });

  const wsRentals = XLSX.utils.aoa_to_sheet([rentalsHeaders, ...rentalsData]);
  wsRentals['!cols'] = [
    { wch: 28 }, // Property Title
    { wch: 30 }, // Address
    { wch: 16 }, // City
    { wch: 16 }, // Province
    { wch: 24 }, // Title Type
    { wch: 10 }, // Units
    { wch: 16 }, // Occupied Units
    { wch: 16 }, // Floor Area
    { wch: 18 }, // Status
    { wch: 18 }, // Market Value
    { wch: 18 }, // Purchase Price
    { wch: 20 }, // Outstanding Bond
    { wch: 16 }, // Loan Term
    { wch: 24 }, // Monthly Bond Repayment
    { wch: 26 }, // Extra Monthly Bond Payment
    { wch: 20 }, // Bond Effective Month
    { wch: 20 }, // Tenant Name
    { wch: 18 }, // Tenant Phone
    { wch: 14 }, // Lease Expiry
    { wch: 18 }, // Deposit Held
    { wch: 22 }, // Monthly Gross Rent
    { wch: 20 }, // Ancillary Income
    { wch: 18 }, // Monthly Levies
    { wch: 22 }, // Monthly Rates & Taxes
    { wch: 24 }, // Annual Building Insurance
    { wch: 18 }, // Utility Type
    { wch: 24 }, // Communal / Serviced OpEx
    { wch: 22 }, // Prepaid Vending Fee
    { wch: 16 }, // Management Type
    { wch: 20 }, // Agency Commission
    { wch: 26 }, // Monthly Maintenance Reserve
    { wch: 26 }, // Section 13sex Annual Shield
    { wch: 24 }, // Unpaid Utility Arrears
    { wch: 22 }, // Net Monthly Cashflow
    { wch: 34 }, // Zoning Summary
    { wch: 16 }, // Applicants Count
  ];
  XLSX.utils.book_append_sheet(wb, wsRentals, 'Rentals');

  // -------------------------------------------------------------
  // Sheet 3: Buy & Flip Projects
  // -------------------------------------------------------------
  const flipsHeaders = [
    'Project Title',
    'Address',
    'City',
    'Province',
    'Title Type',
    'Units',
    'Floor Area (m²)',
    'Project Strategy',
    'Graduated Units Count',
    'Tax Entity Type',
    'Status',
    'Purchase Price (ZAR)',
    'Acquisition Costs (ZAR)',
    'Section 118 Municipal Arrears (ZAR)',
    'RCC Status',
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
    'Zoning Summary',
    'PIE Act Occupancy Status',
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
      f.province || '',
      f.propertyType || 'Sectional Title Apartment',
      f.numberOfUnits ?? 1,
      f.floorAreaSqm || 'N/A',
      f.projectStrategy || 'flip_for_sale',
      f.graduatedUnitsCount || 0,
      fin.taxEntityType,
      f.status,
      f.purchasePriceZAR || 0,
      f.acquisitionCostsZAR || 0,
      fin.sec118ArrearsZAR,
      fin.rccStatus,
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
      formatZoningSummary(f.zoningProfile),
      f.occupantRisk?.occupancyStatus || '',
    ];
  });

  const wsFlips = XLSX.utils.aoa_to_sheet([flipsHeaders, ...flipsData]);
  wsFlips['!cols'] = [
    { wch: 28 }, // Project Title
    { wch: 30 }, // Address
    { wch: 16 }, // City
    { wch: 16 }, // Province
    { wch: 24 }, // Title Type
    { wch: 10 }, // Units
    { wch: 16 }, // Floor Area
    { wch: 16 }, // Project Strategy
    { wch: 20 }, // Graduated Units Count
    { wch: 18 }, // Tax Entity Type
    { wch: 14 }, // Status
    { wch: 18 }, // Purchase Price
    { wch: 20 }, // Acquisition Costs
    { wch: 28 }, // Section 118 Municipal Arrears
    { wch: 22 }, // RCC Status
    { wch: 22 }, // Renovation Budget
    { wch: 18 }, // Duration
    { wch: 22 }, // Monthly Bond Payment
    { wch: 22 }, // Monthly Levies
    { wch: 20 }, // Monthly Rates & Taxes
    { wch: 22 }, // Other Holding Costs
    { wch: 20 }, // Monthly Holding Cost
    { wch: 22 }, // Total Holding Cost
    { wch: 20 }, // Target Exit Price
    { wch: 22 }, // Projected Net Profit
    { wch: 20 }, // Actual Exit Price
    { wch: 22 }, // Realized Net Profit
    { wch: 34 }, // Zoning Summary
    { wch: 22 }, // PIE Act Occupancy Status
  ];
  XLSX.utils.book_append_sheet(wb, wsFlips, 'Buy & Flips');

  // -------------------------------------------------------------
  // Sheet 4: Flip Renovation BOQ (synced with exportFlipBOQCSV)
  // -------------------------------------------------------------
  const boqHeaders = [
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

  const boqData: (string | number)[][] = [];
  flips.forEach((f) => {
    (f.boq || []).forEach((b) => {
      boqData.push([
        f.title,
        b.category,
        b.milestonePhase || 'First Fix / Wet Works',
        b.itemDescription,
        b.supplierOrContractor || 'Unassigned',
        b.quantity || 1,
        b.unit || 'sum',
        b.baselineUnitCostZAR || 0,
        b.baselineTotalZAR || 0,
        b.actualCostZAR || 0,
        b.varianceZAR || 0,
        b.retentionPercent || 0,
        b.isSponsoredOrBarter ? 'Yes' : 'No',
        b.isSponsoredOrBarter ? (b.commercialRetailValueZAR || b.baselineTotalZAR || 0) : '',
        b.isSponsoredOrBarter
          ? (b.actualCashOutflowZAR !== undefined ? b.actualCashOutflowZAR : b.actualCostZAR || 0)
          : '',
        b.status,
        b.invoiceRef || '',
      ]);
    });
  });

  const wsBOQ = XLSX.utils.aoa_to_sheet([boqHeaders, ...boqData]);
  wsBOQ['!cols'] = [
    { wch: 28 }, // Flip Project
    { wch: 22 }, // Category / Trade
    { wch: 22 }, // Milestone Draw Phase
    { wch: 32 }, // Item Description
    { wch: 24 }, // Supplier / Contractor
    { wch: 10 }, // Quantity
    { wch: 10 }, // Unit
    { wch: 22 }, // Baseline Unit Cost
    { wch: 18 }, // Baseline Total
    { wch: 18 }, // Actual Cost
    { wch: 16 }, // Variance
    { wch: 14 }, // Retention (%)
    { wch: 18 }, // Is Sponsored / Barter
    { wch: 24 }, // Commercial Retail Value
    { wch: 22 }, // Actual Cash Outflow
    { wch: 14 }, // Status
    { wch: 16 }, // Invoice Ref
  ];
  XLSX.utils.book_append_sheet(wb, wsBOQ, 'Renovation BOQ');

  // -------------------------------------------------------------
  // Sheet 5: Developments
  // -------------------------------------------------------------
  const devHeaders = [
    'Project Title',
    'Address',
    'City',
    'Province',
    'Development Typology',
    'Current Phase',
    'VAT Registered',
    'Tax Entity',
    'LAA Deferred Land',
    'Zoning Summary',
    'Planned Units',
    'Sold & Transferred Units',
    'Retained Units',
    'Graduated Rental Units',
    'Total Buildable Area (m²)',
    'Land Purchase Price (ZAR)',
    'Total Soft Costs (ZAR)',
    'Active Hard Build Cost (ZAR)',
    'Total Development Cost / TDC (ZAR)',
    'GDV incl. VAT (ZAR)',
    'Unsold / Retained Asset Value (ZAR)',
    'Net Profit Before Tax (ZAR)',
    'Pre-Tax POC (%)',
    'Senior Facility Limit (ZAR)',
    'Senior Facility Drawn (ZAR)',
    'Outstanding Senior Debt (ZAR)',
    'Pre-Sold GDV (%)',
    'Bank Readiness',
    'Linked Funding Source',
  ];

  const devData = developments.map((dev) => {
    const devSummary = calculateDevelopmentFinancials(dev);
    const units = Array.isArray(dev.units) ? dev.units : [];
    const soldCount = units.filter((u) => u && u.status === 'Sold & Transferred').length;
    const retainedCount = units.filter((u) => u && u.status === 'Retained for Rental').length;
    const graduatedCount = units.filter((u) => u && Boolean(u.graduatedRentalId)).length;
    const unsoldPortfolioValueZAR =
      dev.currentPhase === 'Completed'
        ? 0
        : units
            .filter((u) => u && u.status !== 'Sold & Transferred' && !u.graduatedRentalId)
            .reduce((s, u) => s + (u.listPriceVatInclZAR || u.allocatedCostBasisZAR || 0), 0);

    return [
      dev.title,
      dev.address,
      dev.city,
      dev.province || '',
      dev.developmentType,
      dev.currentPhase,
      dev.isVatRegisteredDeveloper ? 'Yes' : 'No',
      devSummary.taxEntityType,
      devSummary.isDeferredLandPaymentLAA ? 'Yes' : 'No',
      formatZoningSummary(dev.zoningProfile),
      devSummary.totalUnitsCount,
      soldCount,
      retainedCount,
      graduatedCount,
      Number(dev.totalBuildableAreaSqm) || 0,
      Number(dev.landPurchasePriceZAR) || 0,
      Number(devSummary.totalSoftCostsZAR) || 0,
      Number(devSummary.activeHardBuildCostZAR) || 0,
      Number(devSummary.tdcZAR) || 0,
      Number(devSummary.gdvInclVatZAR) || 0,
      unsoldPortfolioValueZAR,
      Number(devSummary.netProfitBeforeTaxZAR) || 0,
      Number(devSummary.pocPercent.toFixed(2)),
      Number(dev.developmentFacilityLimitZAR) || 0,
      Number(dev.developmentFacilityDrawnZAR) || 0,
      Number(devSummary.outstandingDevFacilityZAR) || 0,
      Number(devSummary.preSoldGdvPercent.toFixed(2)),
      devSummary.bankReadiness.overallBankable ? 'Bankable' : 'Action Required',
      dev.linkedFundingSourceId || '',
    ];
  });

  const wsDevs = XLSX.utils.aoa_to_sheet([devHeaders, ...devData]);
  wsDevs['!cols'] = [
    { wch: 30 }, // Project Title
    { wch: 30 }, // Address
    { wch: 16 }, // City
    { wch: 16 }, // Province
    { wch: 28 }, // Development Typology
    { wch: 24 }, // Current Phase
    { wch: 14 }, // VAT Registered
    { wch: 16 }, // Tax Entity
    { wch: 16 }, // LAA Deferred Land
    { wch: 34 }, // Zoning Summary
    { wch: 14 }, // Planned Units
    { wch: 22 }, // Sold & Transferred Units
    { wch: 14 }, // Retained Units
    { wch: 20 }, // Graduated Rental Units
    { wch: 22 }, // Total Buildable Area
    { wch: 22 }, // Land Purchase Price
    { wch: 20 }, // Total Soft Costs
    { wch: 24 }, // Active Hard Build Cost
    { wch: 28 }, // Total Development Cost / TDC
    { wch: 20 }, // GDV incl. VAT
    { wch: 28 }, // Unsold / Retained Asset Value
    { wch: 24 }, // Net Profit Before Tax
    { wch: 16 }, // Pre-Tax POC
    { wch: 22 }, // Senior Facility Limit
    { wch: 22 }, // Senior Facility Drawn
    { wch: 24 }, // Outstanding Senior Debt
    { wch: 16 }, // Pre-Sold GDV
    { wch: 18 }, // Bank Readiness
    { wch: 22 }, // Linked Funding Source
  ];
  XLSX.utils.book_append_sheet(wb, wsDevs, 'Developments');

  // -------------------------------------------------------------
  // Sheet 6: Opportunity Pipeline
  // -------------------------------------------------------------
  const oppHeaders = [
    'Deal Title',
    'Address',
    'City',
    'Province',
    'Source Channel',
    'Property Type',
    'Strategy',
    'Units',
    'Floor Area (m²)',
    'Status',
    'Pass Reason',
    'Open Market Value (ZAR)',
    'Purchase Price / Max Bid (ZAR)',
    'Built-In Equity (ZAR)',
    'Built-In Equity (%)',
    'Rehab Capex (ZAR)',
    'Communal Services (ZAR)',
    'VAT-Inclusive Developer Sale',
    'Loan Term (Years)',
    'Extra Monthly Payment (ZAR)',
    'Refinance LTV (%)',
    'Tenant Placement Fee (%)',
    'Annual SPV Admin Fee (ZAR)',
    'Transfer Duty (ZAR)',
    'Conveyancing Fee (ZAR)',
    'Auctioneer Fee (ZAR)',
    'Municipal Arrears (ZAR)',
    'Day-1 Capital Required (ZAR)',
    'Gross Yield (%)',
    'Net Monthly Cashflow (ZAR)',
    'Projected Flip Profit (ZAR)',
    'Projected Flip ROI (%)',
    'Projected Dev TDC (ZAR)',
    'Projected Dev GDV (ZAR)',
    'Projected Dev POC (%)',
    'Zoning Summary',
    'PIE Act Occupancy Status',
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
      d.propertyType || 'Sectional Title Apartment',
      d.strategy || '',
      d.numberOfUnits ?? 1,
      d.floorAreaSqm || '',
      d.status,
      d.passReason || '',
      openMarket,
      d.purchasePrice,
      builtInZAR,
      builtInPct,
      d.estimatedRehabCost || 0,
      d.monthlyCommunalServicesZAR || 0,
      d.isVatInclusiveDeveloperSale ? 'Yes' : 'No',
      d.loanTermYears ?? 20,
      d.extraMonthlyPaymentZAR || 0,
      d.refinanceLtvPercent ?? '',
      d.tenantPlacementFeePercent ?? '',
      d.annualSpvAdminAuditFeeZAR ?? '',
      d.costs?.transferDuty || 0,
      d.costs?.conveyancingFee || 0,
      d.auctioneerCommissionZAR || 0,
      d.municipalArrearsZAR || 0,
      d.initialCapitalRequired || 0,
      d.grossYield,
      d.monthlyCashFlow,
      d.projectedFlipNetProfit,
      d.projectedFlipRoi,
      d.projectedDevTdcZAR ?? '',
      d.projectedDevGdvZAR ?? '',
      d.projectedDevPocPercent ?? '',
      formatZoningSummary(d.zoningProfile),
      d.occupantRisk?.occupancyStatus || '',
    ];
  });

  const wsOpp = XLSX.utils.aoa_to_sheet([oppHeaders, ...oppData]);
  wsOpp['!cols'] = [
    { wch: 28 }, // Deal Title
    { wch: 30 }, // Address
    { wch: 16 }, // City
    { wch: 16 }, // Province
    { wch: 20 }, // Source Channel
    { wch: 24 }, // Property Type
    { wch: 14 }, // Strategy
    { wch: 10 }, // Units
    { wch: 16 }, // Floor Area
    { wch: 18 }, // Status
    { wch: 26 }, // Pass Reason
    { wch: 22 }, // Open Market Value
    { wch: 24 }, // Purchase Price
    { wch: 20 }, // Built-In Equity
    { wch: 18 }, // Built-In Equity %
    { wch: 18 }, // Rehab Capex
    { wch: 22 }, // Communal Services
    { wch: 24 }, // VAT-Inclusive Developer Sale
    { wch: 16 }, // Loan Term
    { wch: 24 }, // Extra Monthly Payment
    { wch: 16 }, // Refinance LTV
    { wch: 22 }, // Tenant Placement Fee
    { wch: 24 }, // Annual SPV Admin Fee
    { wch: 18 }, // Transfer Duty
    { wch: 20 }, // Conveyancing Fee
    { wch: 18 }, // Auctioneer Fee
    { wch: 22 }, // Municipal Arrears
    { wch: 24 }, // Day-1 Capital Required
    { wch: 16 }, // Gross Yield
    { wch: 22 }, // Net Monthly Cashflow
    { wch: 22 }, // Projected Flip Profit
    { wch: 18 }, // Projected Flip ROI
    { wch: 22 }, // Projected Dev TDC
    { wch: 22 }, // Projected Dev GDV
    { wch: 20 }, // Projected Dev POC
    { wch: 34 }, // Zoning Summary
    { wch: 22 }, // PIE Act Occupancy Status
  ];
  XLSX.utils.book_append_sheet(wb, wsOpp, 'Pipeline Deals');

  // -------------------------------------------------------------
  // Sheet 7: Private Funding
  // -------------------------------------------------------------
  const fundingHeaders = [
    'Funder / Lender Name',
    'Funding Category',
    'Entity / Contact Person',
    'Phone / Email',
    'Linked Deal / Project',
    'Disbursement Date',
    'Maturity Date',
    'Delay Extension Days',
    'Principal Facility (ZAR)',
    'Drawn Amount (ZAR)',
    'Total Repaid (ZAR)',
    'Total Interest Serviced (ZAR)',
    'Outstanding Balance (ZAR)',
    'Undrawn Standby Capacity (ZAR)',
    'Tranches Progress',
    'Last Payment Reference',
    'Return Terms Type',
    'Promised Return Rate (%)',
    'Payment Schedule',
    'Status',
    'Notes',
  ];

  const fundingData = funding.map((f) => {
    const metrics = computeFundingDrawnAndUndrawn(f);
    return [
      f.lenderName,
      f.fundingType,
      f.entityOrContact || 'N/A',
      f.emailPhone || 'N/A',
      f.linkedDealName || f.linkedDealId || 'General Liquidity Pool',
      f.disbursementDate || '',
      f.maturityDate || '',
      f.delayExtensionDays || 0,
      f.capitalAmountZAR || 0,
      metrics.drawnAmountZAR,
      f.totalRepaidZAR || 0,
      f.totalInterestPaidZAR || 0,
      metrics.outstandingBalanceZAR,
      metrics.undrawnCapacityZAR,
      metrics.tranchesProgress,
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
    { wch: 24 }, // Funder / Lender Name
    { wch: 22 }, // Funding Category
    { wch: 26 }, // Entity / Contact Person
    { wch: 24 }, // Phone / Email
    { wch: 26 }, // Linked Deal / Project
    { wch: 16 }, // Disbursement Date
    { wch: 16 }, // Maturity Date
    { wch: 18 }, // Delay Extension Days
    { wch: 22 }, // Principal Facility
    { wch: 20 }, // Drawn Amount
    { wch: 18 }, // Total Repaid
    { wch: 24 }, // Total Interest Serviced
    { wch: 22 }, // Outstanding Balance
    { wch: 26 }, // Undrawn Standby Capacity
    { wch: 26 }, // Tranches Progress
    { wch: 24 }, // Last Payment Reference
    { wch: 20 }, // Return Terms Type
    { wch: 22 }, // Promised Return Rate
    { wch: 18 }, // Payment Schedule
    { wch: 14 }, // Status
    { wch: 30 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsFunding, 'Private Funding');

  return wb;
}

/**
 * Builds and downloads a multi-tab Microsoft Excel (.xlsx) workbook
 * containing high-fidelity financial tables across the entire portfolio.
 */
export async function exportPortfolioToExcel(data: ExportPortfolioData) {
  const XLSX = await import('xlsx');
  const wb = buildPortfolioWorkbook(XLSX, data);

  // -------------------------------------------------------------
  // Trigger Browser Download
  // -------------------------------------------------------------
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `sa-property-portfolio-${dateStr}.xlsx`);
}

/**
 * Builds and downloads an entity-neutral SARS Rental Income & Expenses Tax Report (.xlsx)
 * covering both Individual (ITR12) and Corporate (ITR14) schedules:
 * - Gross Rental Income & Ancillary Income
 * - Rates & Taxes
 * - Body Corporate / HOA Levies
 * - Section 11(a) Bond Interest (Deductible Expense - excludes non-deductible capital repayments)
 * - Agent Commission / Management Fees
 * - Insurance Premiums
 * - Repairs & Maintenance
 * - Communal Services OpEx & Prepaid Vending Fees
 * - Bad Debts Written Off
 * - Section 13sex Allowance
 * - Net Taxable Rental Income / Loss (official rental source codes 4210 Profit / 4211 Loss)
 */
export async function exportITR12TaxReport(rentals: RentalProperty[], taxYear: number | string = 2026) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const titleRows = [
    ['SARS RENTAL INCOME & EXPENSES TAX SCHEDULE (ITR12 / ITR14)'],
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
    'Gross Rental Income',
    'Ancillary Income',
    'Rates & Taxes',
    'Body Corporate / HOA Levies',
    'Section 11(a) Bond Interest (Deductible Expense)',
    'Agent Commission / Management Fees',
    'Insurance Premiums',
    'Repairs & Maintenance',
    'Communal Services OpEx',
    'Prepaid Vending Fees',
    'Bad Debts Written Off',
    'Section 13sex Allowance',
    'Total Allowable Deductions',
    'Net Taxable Rental Income / Loss (Code 4210 Profit / 4211 Loss)',
  ];

  let totalGross = 0;
  let totalAncillary = 0;
  let totalRates = 0;
  let totalLevies = 0;
  let totalInterest = 0;
  let totalAgent = 0;
  let totalInsurance = 0;
  let totalRepairs = 0;
  let totalCommunal = 0;
  let totalVending = 0;
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
    const ancillaryIncome = (r.ancillaryIncomes || []).reduce((s, a) => s + (a.monthlyRentZAR || 0), 0) * 12;
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
    const communalServices = (r.monthlyCommunalServicesZAR || 0) * 12;
    const prepaidVending = (r.monthlyPrepaidVendingFeeZAR || 0) * 12;
    const badDebts = (r.arrearsWriteOffs || []).reduce((sum, w) => sum + (w.amountZAR || 0), 0);
    const sec13 = r.section13sexAnnualShieldZAR || 0;

    const deductions =
      rates +
      levies +
      bondInterest +
      (agentFee || 0) +
      insurance +
      repairs +
      communalServices +
      prepaidVending +
      badDebts +
      sec13;
    const netTaxable = grossRent + ancillaryIncome - deductions;

    totalGross += grossRent;
    totalAncillary += ancillaryIncome;
    totalRates += rates;
    totalLevies += levies;
    totalInterest += bondInterest;
    totalAgent += (agentFee || 0);
    totalInsurance += insurance;
    totalRepairs += repairs;
    totalCommunal += communalServices;
    totalVending += prepaidVending;
    totalBadDebts += badDebts;
    totalSec13 += sec13;
    totalDeductionsAll += deductions;
    totalNetTaxable += netTaxable;

    return [
      r.title,
      r.address,
      r.city,
      grossRent,
      ancillaryIncome,
      rates,
      levies,
      bondInterest,
      agentFee || 0,
      insurance,
      repairs,
      communalServices,
      prepaidVending,
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
    totalAncillary,
    totalRates,
    totalLevies,
    totalInterest,
    totalAgent,
    totalInsurance,
    totalRepairs,
    totalCommunal,
    totalVending,
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
    { wch: 20 },
    { wch: 20 },
    { wch: 26 },
    { wch: 44 },
    { wch: 32 },
    { wch: 20 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 },
    { wch: 26 },
    { wch: 26 },
    { wch: 52 },
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

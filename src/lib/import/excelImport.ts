import * as XLSX from 'xlsx';
import {
  OpportunityDeal,
  RentalProperty,
  FlipProject,
  PropertyTitleType,
  DealSource,
  AmenityScorecard,
} from '@/types';
import { computeAcquisitionCosts } from '@/lib/calculations/sarsTax';
import { calculateDealMetrics } from '@/lib/calculations/propertyMetrics';

export interface ValidationErrorItem {
  row: number;
  column: string;
  message: string;
  value?: string;
}

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: ValidationErrorItem[];
  warnings: string[];
}

/**
 * Normalizes header string by trimming, converting to lower case,
 * and stripping asterisks, parentheses, and common unit suffixes.
 */
export function normalizeHeader(header: string): string {
  if (!header) return '';
  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\(zar\)/g, '')
    .replace(/\(%\)/g, '')
    .replace(/\(months\)/g, '')
    .replace(/\(yyyy-mm-dd\)/g, '')
    .replace(/\(yyyy-mm\)/g, '')
    .trim();
}

/**
 * Parses numeric values safely from strings or numbers, stripping currency symbols,
 * spaces, and percentage signs.
 */
export function parseNumber(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = val
    .toString()
    .replace(/[R\s,ZAR%]/gi, '')
    .trim();
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parses property type safely to PropertyTitleType
 */
export function parsePropertyType(val: unknown): PropertyTitleType {
  if (!val) return 'Sectional Title Apartment';
  const str = val.toString().trim().toLowerCase();
  if (str.includes('townhouse') || str.includes('cluster') || str.includes('hoa')) {
    return 'Townhouse / Cluster';
  }
  if (str.includes('freehold') || str.includes('standalone') || str.includes('house')) {
    return 'Freehold House';
  }
  if (str.includes('commercial') || str.includes('retail') || str.includes('office') || str.includes('industrial')) {
    return 'Multi-unit Commercial';
  }
  return 'Sectional Title Apartment';
}

// -------------------------------------------------------------
// TEMPLATE DOWNLOAD GENERATORS
// -------------------------------------------------------------

export function downloadPipelineTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Deal Title *',
    'Address *',
    'City *',
    'Province',
    'Property Type',
    'Source',
    'Target Purchase Price (ZAR) *',
    'Open Market Value (ZAR) *',
    'Estimated Rehab Cost (ZAR)',
    'Monthly Rental Estimate (ZAR)',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Annual Insurance (ZAR)',
    'AGM Date (YYYY-MM-DD)',
    'Notes',
  ];

  const sampleRows = [
    [
      'Bryanston Executive Freehold',
      '14 Wilton Avenue, Bryanston',
      'Johannesburg',
      'Gauteng',
      'Freehold House',
      'Private Agent',
      2850000,
      3500000,
      150000,
      24000,
      0, // Freehold Levies strictly R0
      2100,
      12000,
      '',
      'Prime residential location, excellent candidate for cosmetic upgrade.',
    ],
    [
      'Sea Point Ocean View Suite',
      '82 Regent Road, Sea Point',
      'Cape Town',
      'Western Cape',
      'Sectional Title Apartment',
      'Direct Owner',
      1950000,
      2400000,
      45000,
      16500,
      2450,
      1300,
      8500,
      '2026-10-15',
      'High short-term and long-term rental demand in Atlantic Seaboard.',
    ],
    [
      'Umhlanga Ridge Cluster',
      '12 Palm Boulevard, Umhlanga',
      'Durban',
      'KwaZulu-Natal',
      'Townhouse / Cluster',
      'Distressed Sale / Repo',
      1650000,
      2100000,
      80000,
      15000,
      1800,
      1150,
      7200,
      '',
      'Bank repo opportunity, priced significantly below market value.',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 32 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
    { wch: 22 },
    { wch: 26 },
    { wch: 24 },
    { wch: 26 },
    { wch: 28 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 45 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Pipeline_Import');
  XLSX.writeFile(wb, 'sa-property-pipeline-template.xlsx');
}

export function downloadRentalsTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Property Title *',
    'Address *',
    'City *',
    'Property Type',
    'Market Value (ZAR) *',
    'Purchase Price (ZAR) *',
    'Purchase Date (YYYY-MM-DD)',
    'Outstanding Bond (ZAR)',
    'Bond Interest Rate (%)',
    'Monthly Bond Repayment (ZAR)',
    'Monthly Gross Rent (ZAR) *',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Management Type',
    'Agency Name',
    'Agency Commission (%)',
    'Agency VAT Applicable',
    'Monthly Agency Fee (ZAR)',
    'Agency Contact',
    'Monthly Maintenance Reserve (ZAR)',
    'Tenant Name',
    'Tenant Phone',
    'Tenant Email',
    'Lease Start Date (YYYY-MM-DD)',
    'Lease End Date (YYYY-MM-DD)',
    'Deposit Held (ZAR)',
    'Annual Escalation (%)',
    'Bond Effective Month (YYYY-MM)',
    'AGM Date (YYYY-MM-DD)',
    'Status',
  ];

  const sampleRows = [
    [
      'Rosebank Urban Loft',
      '157 Jan Smuts Ave, Rosebank',
      'Johannesburg',
      'Sectional Title Apartment',
      1650000,
      1450000,
      '2024-02-01',
      980000,
      11.75,
      10580,
      13500,
      1950,
      1100,
      'Agency',
      'Pam Golding Rosebank',
      8.0,
      'Yes',
      1242,
      'agent@pamgolding.co.za',
      600,
      'Sipho Ndlovu',
      '+27 83 123 4567',
      'sipho.n@fintech.co.za',
      '2024-03-01',
      '2027-02-28',
      27000,
      7.0,
      '2026-04',
      '2026-11-20',
      'Occupied',
    ],
    [
      'Claremont Garden Villa',
      '22 Herschel Road, Claremont',
      'Cape Town',
      'Freehold House',
      3200000,
      2850000,
      '2023-08-15',
      1800000,
      11.5,
      19170,
      25000,
      0, // Freehold levies strictly R0
      2400,
      'Self-Managed',
      '',
      0,
      'No',
      0,
      '',
      1000,
      'Claire van der Merwe',
      '+27 82 987 6543',
      'claire.vdm@designstudio.co.za',
      '2023-09-01',
      '2026-08-31',
      50000,
      6.5,
      '',
      '',
      'Occupied',
    ],
    [
      'Durban North Townhouse',
      '45 Adelaide Tambo Drive',
      'Durban',
      'Townhouse / Cluster',
      1850000,
      1600000,
      '2024-06-10',
      1100000,
      11.75,
      11880,
      15000,
      1650,
      1250,
      'Agency',
      'Wakefields Umhlanga',
      7.5,
      'Yes',
      1293.75,
      '+27 31 561 1234',
      700,
      'Brandon Pillay',
      '+27 71 234 5678',
      'brandon.p@logistics.co.za',
      '2024-07-01',
      '2027-06-30',
      30000,
      7.0,
      '',
      '',
      'Occupied',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 26 },
    { wch: 30 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 26 },
    { wch: 24 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 26 },
    { wch: 32 },
    { wch: 22 },
    { wch: 18 },
    { wch: 28 },
    { wch: 26 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rentals_Import');
  XLSX.writeFile(wb, 'sa-property-rentals-template.xlsx');
}

export function downloadFlipsTemplate() {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Project Title *',
    'Address *',
    'City *',
    'Property Type',
    'Purchase Price (ZAR) *',
    'Acquisition Costs (ZAR)',
    'Renovation Budget (ZAR) *',
    'Target Exit Price (ZAR) *',
    'Estimated Duration (Months)',
    'Monthly Bond Payment (ZAR)',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Other Holding Costs (ZAR)',
    'Monthly Holding Cost (ZAR)',
    'Purchase Date (YYYY-MM-DD)',
    'Target Completion Date (YYYY-MM-DD)',
    'Current Phase',
    'AGM Date (YYYY-MM-DD)',
    'Notes',
  ];

  const sampleRows = [
    [
      'Parkhurst Mid-Century Modernization',
      '42 11th Street, Parkhurst',
      'Johannesburg',
      'Freehold House',
      2100000,
      145000,
      380000,
      3250000,
      5,
      4500,
      0, // Freehold levies strictly R0
      1200,
      800,
      6500,
      '2026-08-01',
      '2027-01-15',
      'Finishes & Tiling',
      '',
      'Full interior modernization with open-plan kitchen and patio.',
    ],
    [
      'Green Point Studio Flip',
      '18 Ocean View Drive, Green Point',
      'Cape Town',
      'Sectional Title Apartment',
      1400000,
      98000,
      180000,
      2100000,
      4,
      2400,
      1100,
      450,
      250,
      4200,
      '2026-09-01',
      '2027-01-01',
      'First Fix (Plumbing/Elec)',
      '2026-12-05',
      'Convert 1-bed into luxury modern Airbnb-ready pad.',
    ],
    [
      'Morningside Cluster Overhaul',
      '8 Rivonia Road, Sandton',
      'Johannesburg',
      'Townhouse / Cluster',
      1750000,
      115000,
      260000,
      2650000,
      6,
      3200,
      1200,
      650,
      450,
      5500,
      '2026-07-15',
      '2027-01-30',
      'Strip & Demolition',
      '',
      'Complete bathroom and kitchen overhaul with exterior entertainment patio.',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 34 },
    { wch: 32 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 26 },
    { wch: 26 },
    { wch: 24 },
    { wch: 32 },
    { wch: 28 },
    { wch: 22 },
    { wch: 45 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Flips_Import');
  XLSX.writeFile(wb, 'sa-property-flips-template.xlsx');
}

// -------------------------------------------------------------
// WORKBOOK & CSV PARSER HELPERS
// -------------------------------------------------------------

/**
 * Reads binary file or text CSV into a 2D array of strings/values.
 */
export async function extractRawSheetRows(file: File): Promise<unknown[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The workbook contains no sheets.');
  }
  const ws = wb.Sheets[firstSheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  });
  return rawRows;
}

/**
 * Maps normalized header names to their column indexes.
 */
export function buildHeaderIndexMap(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, idx) => {
    if (cell !== undefined && cell !== null) {
      const normalized = normalizeHeader(cell.toString());
      if (normalized) {
        map.set(normalized, idx);
      }
    }
  });
  return map;
}

// -------------------------------------------------------------
// STRICT PARSERS WITH SOUTH AFRICAN GUARDRAILS
// -------------------------------------------------------------

export function parsePipelineRows(rawRows: unknown[][]): ParseResult<OpportunityDeal> {
  const errors: ValidationErrorItem[] = [];
  const warnings: string[] = [];
  const deals: OpportunityDeal[] = [];

  if (rawRows.length < 2) {
    return {
      success: false,
      data: [],
      errors: [{ row: 1, column: 'File', message: 'Spreadsheet has no data rows.' }],
      warnings: [],
    };
  }

  const headerMap = buildHeaderIndexMap(rawRows[0]);

  // Mandatory columns for pipeline deals
  const mandatoryCols = [
    { key: 'deal title', label: 'Deal Title' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'target purchase price', label: 'Target Purchase Price (ZAR)' },
    { key: 'open market value', label: 'Open Market Value (ZAR)' },
  ];

  for (const m of mandatoryCols) {
    if (!headerMap.has(m.key)) {
      errors.push({
        row: 1,
        column: m.label,
        message: `Missing required column: "${m.label}".`,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors, warnings };
  }

  const getColVal = (row: unknown[], key: string): unknown => {
    const idx = headerMap.get(key);
    return idx !== undefined ? row[idx] : undefined;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const rowNum = r + 1; // 1-indexed including header

    // Skip blank rows
    if (!row || row.every((c) => c === '' || c === undefined || c === null)) {
      continue;
    }

    const title = getColVal(row, 'deal title')?.toString().trim();
    const address = getColVal(row, 'address')?.toString().trim();
    const city = getColVal(row, 'city')?.toString().trim() || 'Johannesburg';
    const provinceRaw = getColVal(row, 'province')?.toString().trim() || 'Gauteng';
    const propertyTypeRaw = getColVal(row, 'property type');
    const sourceRaw = getColVal(row, 'source')?.toString().trim() || 'Private Agent';
    const rawPurchasePrice = getColVal(row, 'target purchase price');
    const rawOpenMarketValue = getColVal(row, 'open market value');
    const rawRehabCost = getColVal(row, 'estimated rehab cost');
    const rawRentalEstimate = getColVal(row, 'monthly rental estimate');
    const rawLevies = getColVal(row, 'monthly levies');
    const rawRates = getColVal(row, 'monthly rates & taxes') ?? getColVal(row, 'monthly rates');
    const rawInsurance = getColVal(row, 'annual insurance');
    const agmDateRaw = getColVal(row, 'agm date')?.toString().trim();
    const notes = getColVal(row, 'notes')?.toString().trim();

    if (!title) {
      errors.push({ row: rowNum, column: 'Deal Title', message: 'Deal Title is mandatory and cannot be empty.' });
    }
    if (!address) {
      errors.push({ row: rowNum, column: 'Address', message: 'Address is mandatory and cannot be empty.' });
    }

    const purchasePrice = parseNumber(rawPurchasePrice);
    if (purchasePrice === null || purchasePrice <= 0) {
      errors.push({
        row: rowNum,
        column: 'Target Purchase Price (ZAR)',
        message: 'Must be a valid positive number.',
        value: String(rawPurchasePrice ?? ''),
      });
    }

    const openMarketValue = parseNumber(rawOpenMarketValue);
    if (openMarketValue === null || openMarketValue <= 0) {
      errors.push({
        row: rowNum,
        column: 'Open Market Value (ZAR)',
        message: 'Must be a valid positive number.',
        value: String(rawOpenMarketValue ?? ''),
      });
    }

    const rehabCost = parseNumber(rawRehabCost) ?? 0;
    const rentalEstimate = parseNumber(rawRentalEstimate) ?? 0;
    let levies = parseNumber(rawLevies) ?? 0;
    const rates = parseNumber(rawRates) ?? 0;
    const insurance = parseNumber(rawInsurance) ?? 0;

    // SA Guardrail 1: Freehold property levies must strictly be R0
    const propertyType = parsePropertyType(propertyTypeRaw);
    if (propertyType === 'Freehold House' && levies > 0) {
      warnings.push(`Row ${rowNum} (${title}): Levies of R ${levies} were automatically zeroed out because Freehold properties do not incur Sectional Title levies.`);
      levies = 0;
    }

    if (purchasePrice !== null && purchasePrice > 0 && openMarketValue !== null && openMarketValue > 0 && title && address) {
      // Calculate South African acquisition costs and deal metrics
      const costs = computeAcquisitionCosts(purchasePrice, 80);
      const metrics = calculateDealMetrics({
        purchasePrice,
        estimatedRehabCost: rehabCost,
        monthlyRentalEstimate: rentalEstimate,
        monthlyLevies: levies,
        monthlyRatesTaxes: rates,
        annualInsurance: insurance,
        managementFeePercent: 8.0,
        vacancyRatePercent: 5.0,
        targetExitPrice: openMarketValue,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        bondLTV: 80,
        interestRatePercent: 11.75,
        loanTermYears: 20,
        costs,
      });

      const builtInEquityZAR = openMarketValue - purchasePrice;
      const builtInEquityPercent = openMarketValue > 0 ? Number(((builtInEquityZAR / openMarketValue) * 100).toFixed(1)) : 0;

      const defaultAmenity: AmenityScorecard = {
        schools: '0-5km',
        policeStation: '0-5km',
        medicalClinic: '0-5km',
        shoppingMall: '0-5km',
        compositeScore: 12,
        compositeGrade: 'A-Grade (Prime Hub)',
      };

      const validProvinces = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Other'] as const;
      const province = validProvinces.includes(provinceRaw as any) ? (provinceRaw as any) : 'Gauteng';

      const validSources: DealSource[] = ['Private Agent', 'Direct Owner', 'High-Street Auction', 'Distressed Sale / Repo', 'iGrow Rentals'];
      const source = validSources.includes(sourceRaw as any) ? (sourceRaw as DealSource) : 'Private Agent';

      deals.push({
        id: `opp-import-${Date.now()}-${r}`,
        title,
        address,
        city,
        province,
        propertyType,
        agmDate: agmDateRaw || undefined,
        source,
        openMarketValueZAR: openMarketValue,
        purchasePrice,
        builtInEquityZAR,
        builtInEquityPercent,
        amenityScorecard: defaultAmenity,
        estimatedRehabCost: rehabCost,
        monthlyRentalEstimate: rentalEstimate,
        monthlyLevies: levies,
        monthlyRatesTaxes: rates,
        annualInsurance: insurance,
        managementFeePercent: 8.0,
        vacancyRatePercent: 5.0,
        targetExitPrice: openMarketValue,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        bondLTV: 80,
        depositZAR: Math.round(purchasePrice * 0.2),
        interestRatePercent: 11.75,
        loanTermYears: 20,
        costs,
        grossYield: metrics.grossYield,
        capRate: metrics.capRate,
        netRoi: metrics.netRoi,
        monthlyCashFlow: metrics.monthlyCashFlow,
        initialCapitalRequired: metrics.initialCapitalRequired,
        projectedFlipNetProfit: metrics.projectedFlipNetProfit,
        projectedFlipRoi: metrics.projectedFlipRoi,
        status: 'Screening',
        notes: notes || 'Imported via Excel Batch Engine',
        createdAt: todayStr,
      });
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? deals : [],
    errors,
    warnings,
  };
}

export function parseRentalsRows(rawRows: unknown[][]): ParseResult<RentalProperty> {
  const errors: ValidationErrorItem[] = [];
  const warnings: string[] = [];
  const rentals: RentalProperty[] = [];

  if (rawRows.length < 2) {
    return {
      success: false,
      data: [],
      errors: [{ row: 1, column: 'File', message: 'Spreadsheet has no data rows.' }],
      warnings: [],
    };
  }

  const headerMap = buildHeaderIndexMap(rawRows[0]);

  // Mandatory columns for rentals
  const mandatoryCols = [
    { key: 'property title', label: 'Property Title' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'market value', label: 'Market Value (ZAR)' },
    { key: 'purchase price', label: 'Purchase Price (ZAR)' },
    { key: 'monthly gross rent', label: 'Monthly Gross Rent (ZAR)' },
  ];

  for (const m of mandatoryCols) {
    if (!headerMap.has(m.key)) {
      errors.push({
        row: 1,
        column: m.label,
        message: `Missing required column: "${m.label}".`,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors, warnings };
  }

  const getColVal = (row: unknown[], key: string): unknown => {
    const idx = headerMap.get(key);
    return idx !== undefined ? row[idx] : undefined;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const rowNum = r + 1;

    if (!row || row.every((c) => c === '' || c === undefined || c === null)) {
      continue;
    }

    const title = getColVal(row, 'property title')?.toString().trim();
    const address = getColVal(row, 'address')?.toString().trim();
    const city = getColVal(row, 'city')?.toString().trim() || 'Johannesburg';
    const propertyTypeRaw = getColVal(row, 'property type');
    const rawMarketValue = getColVal(row, 'market value');
    const rawPurchasePrice = getColVal(row, 'purchase price');
    const purchaseDate = getColVal(row, 'purchase date')?.toString().trim() || todayStr;
    const rawOutstandingBond = getColVal(row, 'outstanding bond');
    const rawBondInterestRate = getColVal(row, 'bond interest rate');
    const rawMonthlyBondPayment = getColVal(row, 'monthly bond repayment') ?? getColVal(row, 'monthly bond payment');
    const rawGrossRent = getColVal(row, 'monthly gross rent');
    const rawLevies = getColVal(row, 'monthly levies');
    const rawRates = getColVal(row, 'monthly rates & taxes') ?? getColVal(row, 'monthly rates');
    const managementTypeRaw = getColVal(row, 'management type')?.toString().trim();
    const agencyName = getColVal(row, 'agency name')?.toString().trim() || '';
    const rawAgencyComm = getColVal(row, 'agency commission');
    const agencyVatRaw = getColVal(row, 'agency vat applicable')?.toString().trim().toLowerCase();
    const agencyContact = getColVal(row, 'agency contact')?.toString().trim() || '';
    const rawMaintenanceReserve = getColVal(row, 'monthly maintenance reserve');
    const tenantName = getColVal(row, 'tenant name')?.toString().trim() || 'Tenant Unassigned';
    const tenantPhone = getColVal(row, 'tenant phone')?.toString().trim() || '+27 —';
    const tenantEmail = getColVal(row, 'tenant email')?.toString().trim() || 'pending@tenant.co.za';
    const leaseStartDate = getColVal(row, 'lease start date')?.toString().trim() || todayStr;
    const leaseEndDate = getColVal(row, 'lease end date')?.toString().trim() || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const rawDepositHeld = getColVal(row, 'deposit held');
    const rawEscalation = getColVal(row, 'annual escalation');
    const agmDate = getColVal(row, 'agm date')?.toString().trim() || undefined;
    const statusRaw = getColVal(row, 'status')?.toString().trim();

    if (!title) {
      errors.push({ row: rowNum, column: 'Property Title', message: 'Property Title is mandatory.' });
    }
    if (!address) {
      errors.push({ row: rowNum, column: 'Address', message: 'Address is mandatory.' });
    }

    const marketValue = parseNumber(rawMarketValue);
    if (marketValue === null || marketValue <= 0) {
      errors.push({
        row: rowNum,
        column: 'Market Value (ZAR)',
        message: 'Must be a valid positive number.',
        value: String(rawMarketValue ?? ''),
      });
    }

    const purchasePrice = parseNumber(rawPurchasePrice);
    if (purchasePrice === null || purchasePrice <= 0) {
      errors.push({
        row: rowNum,
        column: 'Purchase Price (ZAR)',
        message: 'Must be a valid positive number.',
        value: String(rawPurchasePrice ?? ''),
      });
    }

    const grossRent = parseNumber(rawGrossRent);
    if (grossRent === null || grossRent <= 0) {
      errors.push({
        row: rowNum,
        column: 'Monthly Gross Rent (ZAR)',
        message: 'Must be a valid positive number.',
        value: String(rawGrossRent ?? ''),
      });
    }

    const outstandingBond = parseNumber(rawOutstandingBond) ?? 0;
    const bondInterestRate = parseNumber(rawBondInterestRate) ?? 11.75;
    let monthlyBondPayment = parseNumber(rawMonthlyBondPayment);
    if (monthlyBondPayment === null) {
      // Estimate PMT bond repayment if bond exists
      monthlyBondPayment = outstandingBond > 0 ? Math.round(outstandingBond * 0.0108) : 0;
    }

    let levies = parseNumber(rawLevies) ?? 0;
    const rates = parseNumber(rawRates) ?? 0;
    const maintenanceReserve = parseNumber(rawMaintenanceReserve) ?? 500;
    const depositHeld = parseNumber(rawDepositHeld) ?? (grossRent ? grossRent * 2 : 0);
    const annualEscalation = parseNumber(rawEscalation) ?? 7.0;

    // SA Guardrail 1: Freehold levies strictly zeroed out
    const propertyType = parsePropertyType(propertyTypeRaw);
    if (propertyType === 'Freehold House' && levies > 0) {
      warnings.push(`Row ${rowNum} (${title}): Levies of R ${levies} were automatically set to R0 for Freehold House.`);
      levies = 0;
    }

    const isAgency = managementTypeRaw?.toLowerCase().includes('agency') || !!agencyName;
    const managementType: 'Self-Managed' | 'Agency' = isAgency ? 'Agency' : 'Self-Managed';
    const agencyCommissionPercent = isAgency ? parseNumber(rawAgencyComm) ?? 8.0 : 0;
    const agencyVatApplicable = isAgency ? (agencyVatRaw === 'no' || agencyVatRaw === 'false' ? false : true) : false;

    const rawExplicitAgencyFee = getColVal(row, 'monthly agency fee') ?? getColVal(row, 'agency fee');
    const explicitAgentFee = parseNumber(rawExplicitAgencyFee);

    let monthlyAgentFeeZAR = 0;
    if (explicitAgentFee !== null && explicitAgentFee >= 0) {
      monthlyAgentFeeZAR = Math.round(explicitAgentFee);
    } else if (isAgency && grossRent) {
      const baseFee = grossRent * (agencyCommissionPercent / 100);
      const vatMultiplier = agencyVatApplicable ? 1.15 : 1.0;
      monthlyAgentFeeZAR = Math.round(baseFee * vatMultiplier);
    }

    const rawBondEffectiveMonth =
      getColVal(row, 'bond effective month') ?? getColVal(row, 'bond payment effective date');
    const bondPaymentEffectiveDate = rawBondEffectiveMonth?.toString().trim();

    const validStatuses = ['Occupied', 'Vacant', 'Notice Given', 'Sold'] as const;
    const status = validStatuses.includes(statusRaw as any) ? (statusRaw as any) : 'Occupied';

    if (title && address && marketValue && purchasePrice && grossRent) {
      rentals.push({
        id: `rental-import-${Date.now()}-${r}`,
        title,
        address,
        city,
        propertyType,
        agmDate,
        marketValueZAR: marketValue,
        purchasePriceZAR: purchasePrice,
        purchaseDate,
        outstandingBondBalanceZAR: outstandingBond,
        bondInterestRatePercent: bondInterestRate,
        monthlyBondPaymentZAR: monthlyBondPayment,
        bondPaymentEffectiveDate: bondPaymentEffectiveDate || undefined,
        tenantName,
        tenantPhone,
        tenantEmail,
        leaseStartDate,
        leaseEndDate,
        depositHeldZAR: depositHeld,
        annualEscalationPercent: annualEscalation,
        managementType,
        agencyName: isAgency ? agencyName : undefined,
        agencyCommissionPercent: isAgency ? agencyCommissionPercent : undefined,
        agencyVatApplicable: isAgency ? agencyVatApplicable : undefined,
        agencyContact: isAgency ? agencyContact : undefined,
        monthlyGrossRentZAR: grossRent,
        monthlyLeviesZAR: levies,
        monthlyRatesTaxesZAR: rates,
        monthlyAgentFeeZAR,
        monthlyMaintenanceReserveZAR: maintenanceReserve,
        unpaidUtilityArrearsZAR: 0,
        maintenanceHistory: [],
        status,
      });
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? rentals : [],
    errors,
    warnings,
  };
}

export function parseFlipsRows(rawRows: unknown[][]): ParseResult<FlipProject> {
  const errors: ValidationErrorItem[] = [];
  const warnings: string[] = [];
  const flips: FlipProject[] = [];

  if (rawRows.length < 2) {
    return {
      success: false,
      data: [],
      errors: [{ row: 1, column: 'File', message: 'Spreadsheet has no data rows.' }],
      warnings: [],
    };
  }

  const headerMap = buildHeaderIndexMap(rawRows[0]);

  // Mandatory columns for flips
  const mandatoryCols = [
    { key: 'project title', label: 'Project Title' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'purchase price', label: 'Purchase Price (ZAR)' },
    { key: 'renovation budget', label: 'Renovation Budget (ZAR)' },
    { key: 'target exit price', label: 'Target Exit Price (ZAR)' },
  ];

  for (const m of mandatoryCols) {
    if (!headerMap.has(m.key)) {
      errors.push({
        row: 1,
        column: m.label,
        message: `Missing required column: "${m.label}".`,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors, warnings };
  }

  const getColVal = (row: unknown[], key: string): unknown => {
    const idx = headerMap.get(key);
    return idx !== undefined ? row[idx] : undefined;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const rowNum = r + 1;

    if (!row || row.every((c) => c === '' || c === undefined || c === null)) {
      continue;
    }

    const title = getColVal(row, 'project title')?.toString().trim();
    const address = getColVal(row, 'address')?.toString().trim();
    const city = getColVal(row, 'city')?.toString().trim() || 'Johannesburg';
    const propertyTypeRaw = getColVal(row, 'property type');
    const rawPurchasePrice = getColVal(row, 'purchase price');
    const rawAcqCosts = getColVal(row, 'acquisition costs');
    const rawRenoBudget = getColVal(row, 'renovation budget');
    const rawExitPrice = getColVal(row, 'target exit price');
    const rawDuration = getColVal(row, 'estimated duration');
    const rawHoldingCost = getColVal(row, 'monthly holding cost');
    const rawBondPayment = getColVal(row, 'monthly bond repayment') ?? getColVal(row, 'monthly bond payment');
    const rawLevies = getColVal(row, 'monthly levies');
    const rawRates = getColVal(row, 'monthly rates & taxes') ?? getColVal(row, 'monthly rates');
    const rawOtherHoldingCost =
      getColVal(row, 'other holding costs') ??
      getColVal(row, 'monthly other holding cost') ??
      getColVal(row, 'other holding cost');
    const purchaseDate = getColVal(row, 'purchase date')?.toString().trim() || todayStr;
    const rawCompletionDate = getColVal(row, 'target completion date')?.toString().trim();
    const currentPhaseRaw = getColVal(row, 'current phase')?.toString().trim();
    const agmDate = getColVal(row, 'agm date')?.toString().trim() || undefined;
    const notes = getColVal(row, 'notes')?.toString().trim();

    if (!title) {
      errors.push({ row: rowNum, column: 'Project Title', message: 'Project Title is mandatory.' });
    }
    if (!address) {
      errors.push({ row: rowNum, column: 'Address', message: 'Address is mandatory.' });
    }

    const purchasePrice = parseNumber(rawPurchasePrice);
    if (purchasePrice === null || purchasePrice <= 0) {
      errors.push({
        row: rowNum,
        column: 'Purchase Price (ZAR)',
        message: 'Must be a valid positive number.',
        value: String(rawPurchasePrice ?? ''),
      });
    }

    const renoBudget = parseNumber(rawRenoBudget);
    if (renoBudget === null || renoBudget < 0) {
      errors.push({
        row: rowNum,
        column: 'Renovation Budget (ZAR)',
        message: 'Must be a valid number.',
        value: String(rawRenoBudget ?? ''),
      });
    }

    const exitPrice = parseNumber(rawExitPrice);
    if (exitPrice === null || exitPrice <= 0) {
      errors.push({
        row: rowNum,
        column: 'Target Exit Price (ZAR)',
        message: 'Must be a valid positive number.',
        value: String(rawExitPrice ?? ''),
      });
    }

    const durationMonths = parseNumber(rawDuration) ?? 6;
    const propertyType = parsePropertyType(propertyTypeRaw);

    const bondPayment = parseNumber(rawBondPayment);
    let levies = parseNumber(rawLevies);
    const rates = parseNumber(rawRates);
    const otherHoldingCost = parseNumber(rawOtherHoldingCost);

    // Freehold House guardrail: strictly R0 levies
    if (propertyType === 'Freehold House' && levies && levies > 0) {
      warnings.push(`Row ${rowNum} (${title}): Levies of R ${levies} were automatically set to R0 for Freehold House.`);
      levies = 0;
    }

    let monthlyHoldingCost = parseNumber(rawHoldingCost);
    if (bondPayment !== null || levies !== null || rates !== null || otherHoldingCost !== null) {
      const itemizedTotal = (bondPayment ?? 0) + (levies ?? 0) + (rates ?? 0) + (otherHoldingCost ?? 0);
      if (monthlyHoldingCost === null || monthlyHoldingCost === 0) {
        monthlyHoldingCost = itemizedTotal;
      }
    } else if (monthlyHoldingCost === null) {
      monthlyHoldingCost = 0;
    }

    // Automatic calculation of acquisition costs if omitted or 0
    let acquisitionCosts = parseNumber(rawAcqCosts);
    if (acquisitionCosts === null || acquisitionCosts <= 0) {
      if (purchasePrice && purchasePrice > 0) {
        const fullAcq = computeAcquisitionCosts(purchasePrice, 0);
        acquisitionCosts = fullAcq.totalAcquisitionCost - purchasePrice;
      } else {
        acquisitionCosts = 0;
      }
    }

    // Target completion date defaults to today + duration months
    const targetCompletionDate =
      rawCompletionDate ||
      new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const validPhases = [
      'Acquisition & Conveyancing',
      'Strip & Demolition',
      'First Fix (Plumbing/Elec)',
      'Finishes & Tiling',
      'Snagging',
      'Staging & Marketing',
      'Sold / Awaiting Transfer',
    ] as const;
    const currentPhase = validPhases.includes(currentPhaseRaw as any)
      ? (currentPhaseRaw as any)
      : 'Acquisition & Conveyancing';

    if (title && address && purchasePrice && renoBudget !== null && exitPrice) {
      const flipId = `flip-import-${Date.now()}-${r}`;

      // Initialize starter BOQ line item with baseline reno budget
      const starterBOQ = renoBudget > 0 ? [
        {
          id: `boq-${Date.now()}-import-1`,
          category: 'Kitchen & Cabinetry' as const,
          itemDescription: 'Primary renovation scope & finishes',
          unit: 'lump sum',
          quantity: 1,
          baselineUnitCostZAR: renoBudget,
          baselineTotalZAR: renoBudget,
          actualCostZAR: 0,
          varianceZAR: -renoBudget,
          supplierOrContractor: 'Pending tender',
          status: 'Not Started' as const,
        },
      ] : [];

      flips.push({
        id: flipId,
        title,
        address,
        city,
        propertyType,
        agmDate,
        purchaseDate,
        purchasePriceZAR: purchasePrice,
        acquisitionCostsZAR: acquisitionCosts,
        baselineRenovationBudgetZAR: renoBudget,
        estimatedDurationMonths: durationMonths,
        monthlyHoldingCostZAR: monthlyHoldingCost,
        monthlyBondPaymentZAR: bondPayment !== null ? bondPayment : undefined,
        monthlyLeviesZAR: levies !== null ? levies : undefined,
        monthlyRatesTaxesZAR: rates !== null ? rates : undefined,
        monthlyOtherHoldingCostZAR: otherHoldingCost !== null ? otherHoldingCost : undefined,
        targetExitPriceZAR: exitPrice,
        targetCompletionDate,
        currentPhase,
        boq: starterBOQ,
        linkedFundingIds: [],
        status: 'Active',
        notes: notes || 'Imported via Excel Batch Engine',
      });
    }
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? flips : [],
    errors,
    warnings,
  };
}

/**
 * Universal file parser router for pipeline, rentals, and flips
 */
export async function parseImportFile<T>(
  file: File,
  templateType: 'pipeline' | 'rentals' | 'flips'
): Promise<ParseResult<T>> {
  const rawRows = await extractRawSheetRows(file);
  switch (templateType) {
    case 'pipeline':
      return parsePipelineRows(rawRows) as unknown as ParseResult<T>;
    case 'rentals':
      return parseRentalsRows(rawRows) as unknown as ParseResult<T>;
    case 'flips':
      return parseFlipsRows(rawRows) as unknown as ParseResult<T>;
    default:
      throw new Error(`Unsupported template type: ${templateType}`);
  }
}

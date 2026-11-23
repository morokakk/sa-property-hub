import {
  OpportunityDeal,
  RentalProperty,
  FlipProject,
  PropertyTitleType,
  DealSource,
  AmenityScorecard,
  UtilityStatement,
  Province,
  DealStrategy,
  Lease,
} from '@/types';
import { computeAcquisitionCosts } from '@/lib/calculations/sarsTax';
import { calculateDealMetrics, calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';
import { captureSanitizedError } from '@/lib/analytics/posthogClient';

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

export const ALL_SA_PROVINCES: readonly Province[] = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Other',
] as const;

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
    .replace(/\(years\)/g, '')
    .replace(/\(yyyy-mm-dd\)/g, '')
    .replace(/\(yyyy-mm\)/g, '')
    .replace(/\(m²\)/gi, '')
    .replace(/\(sqm\)/gi, '')
    .replace(/\(m2\)/gi, '')
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

export function parseProvince(val: unknown): Province | undefined {
  if (val === undefined || val === null) return undefined;
  const str = val.toString().trim().toLowerCase();
  if (!str || str === 'n/a') return undefined;
  if (str === 'kzn' || str === 'kwazulu natal') return 'KwaZulu-Natal';
  return ALL_SA_PROVINCES.find((p) => p.toLowerCase() === str);
}

export function parseBooleanFlag(val: unknown): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1 ? true : val === 0 ? false : undefined;
  const str = val.toString().trim().toLowerCase();
  if (!str) return undefined;
  if (str === 'yes' || str === 'true' || str === '1' || str === 'y') return true;
  if (str === 'no' || str === 'false' || str === '0' || str === 'n') return false;
  return undefined;
}

export function parseDealStrategy(val: unknown): DealStrategy | undefined {
  if (val === undefined || val === null) return undefined;
  const str = val.toString().trim().toLowerCase();
  if (!str) return undefined;
  if (str === 'flip') return 'Flip';
  if (str === 'rental') return 'Rental';
  if (str === 'brrrr') return 'BRRRR';
  if (str === 'development') return 'Development';
  return undefined;
}

export function parseFlipProjectStrategy(val: unknown): 'flip_for_sale' | 'build_to_rent' | undefined {
  if (val === undefined || val === null) return undefined;
  const str = val.toString().trim().toLowerCase();
  if (!str) return undefined;
  if (str === 'build_to_rent' || str === 'build to rent' || str === 'build-to-rent' || str === 'btr') {
    return 'build_to_rent';
  }
  if (str === 'flip_for_sale' || str === 'flip for sale' || str === 'flip-for-sale' || str === 'flip') {
    return 'flip_for_sale';
  }
  return undefined;
}

export function parseTaxEntityType(val: unknown): 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax' | undefined {
  if (val === undefined || val === null) return undefined;
  const str = val.toString().trim().toLowerCase();
  if (!str) return undefined;
  if (str.includes('company') || str.includes('27')) return 'Company (27%)';
  if (str.includes('individual') || str.includes('45')) return 'Individual (45%)';
  if (str.includes('pre-tax') || str.includes('pretax')) return 'Pre-Tax';
  return undefined;
}

export function parseUtilityType(val: unknown): 'postpaid' | 'prepaid_submeter' | 'hybrid' | undefined {
  if (val === undefined || val === null) return undefined;
  const str = val.toString().trim().toLowerCase();
  if (!str) return undefined;
  if (str.includes('prepaid')) return 'prepaid_submeter';
  if (str === 'hybrid') return 'hybrid';
  if (str === 'postpaid') return 'postpaid';
  return undefined;
}

function getFirstColVal(headerMap: Map<string, number>, row: unknown[], keys: string[]): unknown {
  for (const key of keys) {
    const idx = headerMap.get(key);
    if (idx !== undefined) {
      return row[idx];
    }
  }
  return undefined;
}

export function parseDateString(val: unknown): string {
  if (val === undefined || val === null) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  const fromExcelSerial = (serial: number): string =>
    new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000)
      .toISOString()
      .split('T')[0];

  if (typeof val === 'number' && Number.isFinite(val) && val > 20_000 && val < 100_000) {
    return fromExcelSerial(val);
  }
  const str = val.toString().trim();
  if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'ongoing') {
    return '';
  }
  if (/^\d{5}$/.test(str)) {
    const num = Number(str);
    if (num > 20_000 && num < 100_000) {
      return fromExcelSerial(num);
    }
  }
  return str;
}

function parseMonthString(val: unknown): string {
  const parsed = parseDateString(val);
  if (!parsed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
    return parsed.slice(0, 7);
  }
  return parsed;
}

// -------------------------------------------------------------
// TEMPLATE DOWNLOAD GENERATORS
// -------------------------------------------------------------

export async function downloadPipelineTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const headers = [
    'Deal Title *',
    'Address *',
    'City *',
    'Province',
    'Property Type',
    'Source',
    'Strategy',
    'Units',
    'Floor Area (m²)',
    'Target Purchase Price (ZAR) *',
    'Open Market Value (ZAR) *',
    'Estimated Rehab Cost (ZAR)',
    'Monthly Rental Estimate (ZAR)',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Annual Insurance (ZAR)',
    'Communal Services (ZAR)',
    'VAT-Inclusive Developer Sale',
    'Loan Term (Years)',
    'Extra Monthly Payment (ZAR)',
    'Refinance LTV (%)',
    'Tenant Placement Fee (%)',
    'Annual SPV Admin Fee (ZAR)',
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
      'Flip',
      1,
      280,
      2850000,
      3500000,
      150000,
      24000,
      0, // Freehold Levies strictly R0
      2100,
      12000,
      0,
      'No',
      20,
      0,
      75,
      0,
      0,
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
      'Rental',
      1,
      88,
      1950000,
      2400000,
      45000,
      16500,
      2450,
      1300,
      8500,
      0,
      'No',
      20,
      1500,
      75,
      0,
      0,
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
      'BRRRR',
      2,
      195,
      1650000,
      2100000,
      80000,
      15000,
      1800,
      1150,
      7200,
      0,
      'No',
      20,
      0,
      75,
      5,
      6000,
      '',
      'Bank repo opportunity, priced significantly below market value.',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 30 }, // Deal Title
    { wch: 32 }, // Address
    { wch: 18 }, // City
    { wch: 16 }, // Province
    { wch: 26 }, // Property Type
    { wch: 22 }, // Source
    { wch: 14 }, // Strategy
    { wch: 10 }, // Units
    { wch: 16 }, // Floor Area
    { wch: 26 }, // Target Purchase Price
    { wch: 24 }, // Open Market Value
    { wch: 26 }, // Estimated Rehab Cost
    { wch: 28 }, // Monthly Rental Estimate
    { wch: 22 }, // Monthly Levies
    { wch: 24 }, // Monthly Rates & Taxes
    { wch: 22 }, // Annual Insurance
    { wch: 22 }, // Communal Services
    { wch: 26 }, // VAT-Inclusive Developer Sale
    { wch: 18 }, // Loan Term
    { wch: 24 }, // Extra Monthly Payment
    { wch: 18 }, // Refinance LTV
    { wch: 22 }, // Tenant Placement Fee
    { wch: 24 }, // Annual SPV Admin Fee
    { wch: 22 }, // AGM Date
    { wch: 45 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Pipeline_Import');
  XLSX.writeFile(wb, 'sa-property-pipeline-template.xlsx');
}

export async function downloadRentalsTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const headers = [
    'Property Title *',
    'Address *',
    'City *',
    'Province',
    'Property Type',
    'Units',
    'Floor Area (m²)',
    'Source',
    'Market Value (ZAR) *',
    'Purchase Price (ZAR) *',
    'Purchase Date (YYYY-MM-DD)',
    'Outstanding Bond (ZAR)',
    'Bond Interest Rate (%)',
    'Loan Term (Years)',
    'Monthly Bond Repayment (ZAR)',
    'Extra Monthly Bond Payment (ZAR)',
    'Monthly Gross Rent (ZAR) *',
    'Monthly Levies (ZAR)',
    'Monthly Rates & Taxes (ZAR)',
    'Annual Building Insurance (ZAR)',
    'Utility Type',
    'Communal / Serviced OpEx (ZAR)',
    'Prepaid Vending Fee (ZAR)',
    'Municipal/Eskom Account No',
    'Management Type',
    'Agency Name',
    'Agency Commission (%)',
    'Agency VAT Applicable',
    'Monthly Agency Fee (ZAR)',
    'Agency Contact',
    'Monthly Maintenance Reserve (ZAR)',
    'Section 13sex Annual Shield (ZAR)',
    'Unpaid Utility Arrears (ZAR)',
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
      'Gauteng',
      'Sectional Title Apartment',
      1,
      78,
      'Private Agent',
      1650000,
      1450000,
      '2024-02-01',
      980000,
      11.75,
      20,
      10580,
      0,
      13500,
      1950,
      1100,
      0,
      'postpaid',
      0,
      0,
      '559235779',
      'Agency',
      'Pam Golding Rosebank',
      8.0,
      'Yes',
      1242,
      'agent@pamgolding.co.za',
      600,
      0,
      0,
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
      'Western Cape',
      'Freehold House',
      1,
      240,
      'Direct Owner',
      3200000,
      2850000,
      '2023-08-15',
      1800000,
      11.5,
      20,
      19170,
      2000,
      25000,
      0, // Freehold levies strictly R0
      2400,
      14400,
      'prepaid_submeter',
      0,
      150,
      '',
      'Self-Managed',
      '',
      0,
      'No',
      0,
      '',
      1000,
      0,
      0,
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
      'Clearwater Village 128',
      '128 Clearwater Village, Atlasville',
      'Boksburg',
      'Gauteng',
      'Sectional Title Apartment',
      1,
      68,
      'iGrow Rentals',
      1150000,
      980000,
      '2024-06-10',
      750000,
      11.75,
      20,
      8100,
      0,
      9500,
      1450,
      850,
      0,
      'postpaid',
      0,
      0,
      '559235779',
      'Agency',
      'iGrow Rentals',
      8.5,
      'Yes',
      928,
      'rentals@igrow.co.za',
      500,
      0,
      0,
      'Bongani June Mwale',
      '+27 71 234 5678',
      'bongani.m@gmail.com',
      '2024-07-01',
      '2027-06-30',
      19000,
      7.0,
      '',
      '',
      'Occupied',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 26 }, // Property Title
    { wch: 32 }, // Address
    { wch: 18 }, // City
    { wch: 16 }, // Province
    { wch: 24 }, // Property Type
    { wch: 10 }, // Units
    { wch: 16 }, // Floor Area
    { wch: 20 }, // Source
    { wch: 20 }, // Market Value
    { wch: 20 }, // Purchase Price
    { wch: 24 }, // Purchase Date
    { wch: 22 }, // Outstanding Bond
    { wch: 20 }, // Bond Interest Rate
    { wch: 18 }, // Loan Term
    { wch: 26 }, // Monthly Bond Repayment
    { wch: 28 }, // Extra Monthly Bond Payment
    { wch: 24 }, // Monthly Gross Rent
    { wch: 20 }, // Monthly Levies
    { wch: 24 }, // Monthly Rates & Taxes
    { wch: 26 }, // Annual Building Insurance
    { wch: 18 }, // Utility Type
    { wch: 26 }, // Communal / Serviced OpEx
    { wch: 22 }, // Prepaid Vending Fee
    { wch: 26 }, // Municipal/Eskom Account No
    { wch: 18 }, // Management Type
    { wch: 24 }, // Agency Name
    { wch: 22 }, // Agency Commission
    { wch: 22 }, // Agency VAT Applicable
    { wch: 26 }, // Monthly Agency Fee
    { wch: 28 }, // Agency Contact
    { wch: 24 }, // Monthly Maintenance Reserve
    { wch: 28 }, // Section 13sex Annual Shield
    { wch: 24 }, // Unpaid Utility Arrears
    { wch: 22 }, // Tenant Name
    { wch: 18 }, // Tenant Phone
    { wch: 28 }, // Tenant Email
    { wch: 26 }, // Lease Start Date
    { wch: 26 }, // Lease End Date
    { wch: 18 }, // Deposit Held
    { wch: 20 }, // Annual Escalation
    { wch: 22 }, // Bond Effective Month
    { wch: 22 }, // AGM Date
    { wch: 16 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rentals_Import');
  XLSX.writeFile(wb, 'sa-property-rentals-template.xlsx');
}

export async function downloadFlipsTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const headers = [
    'Project Title *',
    'Address *',
    'City *',
    'Province',
    'Property Type',
    'Units',
    'Floor Area (m²)',
    'Project Strategy',
    'Tax Entity Type',
    'Purchase Price (ZAR) *',
    'Acquisition Costs (ZAR)',
    'Section 118 Municipal Arrears (ZAR)',
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
      'Gauteng',
      'Freehold House',
      1,
      220,
      'flip_for_sale',
      'Company (27%)',
      2100000,
      145000,
      0,
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
      'Western Cape',
      'Sectional Title Apartment',
      1,
      65,
      'flip_for_sale',
      'Individual (45%)',
      1400000,
      98000,
      0,
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
      'Gauteng',
      'Townhouse / Cluster',
      4,
      240,
      'build_to_rent',
      'Company (27%)',
      1750000,
      115000,
      18500,
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
      'Multi-unit refurbishment with phased Build-to-Rent handover.',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 34 }, // Project Title
    { wch: 32 }, // Address
    { wch: 18 }, // City
    { wch: 16 }, // Province
    { wch: 24 }, // Property Type
    { wch: 10 }, // Units
    { wch: 16 }, // Floor Area
    { wch: 18 }, // Project Strategy
    { wch: 18 }, // Tax Entity Type
    { wch: 22 }, // Purchase Price
    { wch: 24 }, // Acquisition Costs
    { wch: 30 }, // Section 118 Municipal Arrears
    { wch: 24 }, // Renovation Budget
    { wch: 24 }, // Target Exit Price
    { wch: 26 }, // Estimated Duration
    { wch: 26 }, // Monthly Bond Payment
    { wch: 22 }, // Monthly Levies
    { wch: 26 }, // Monthly Rates & Taxes
    { wch: 24 }, // Other Holding Costs
    { wch: 26 }, // Monthly Holding Cost
    { wch: 24 }, // Purchase Date
    { wch: 32 }, // Target Completion Date
    { wch: 28 }, // Current Phase
    { wch: 22 }, // AGM Date
    { wch: 45 }, // Notes
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
  const XLSX = await import('xlsx');
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

  const hasAnyHeader = (keys: string[]) => keys.some((k) => headerMap.has(k));

  // Mandatory columns for pipeline deals
  const mandatoryCols = [
    { keys: ['deal title'], label: 'Deal Title' },
    { keys: ['address'], label: 'Address' },
    { keys: ['city'], label: 'City' },
    { keys: ['target purchase price', 'purchase price / max bid', 'purchase price'], label: 'Target Purchase Price (ZAR)' },
    { keys: ['open market value'], label: 'Open Market Value (ZAR)' },
  ];

  for (const m of mandatoryCols) {
    if (!hasAnyHeader(m.keys)) {
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
    const provinceRaw = getColVal(row, 'province');
    const propertyTypeRaw = getFirstColVal(headerMap, row, ['property type', 'title type']);
    const sourceRaw = getFirstColVal(headerMap, row, ['source', 'source channel'])?.toString().trim() || 'Private Agent';
    const strategy = parseDealStrategy(getFirstColVal(headerMap, row, ['strategy', 'deal strategy']));
    const rawUnits = getFirstColVal(headerMap, row, ['units', 'number of units']);
    const rawFloorArea = getFirstColVal(headerMap, row, ['floor area', 'floor area sqm']);
    const parsedUnits = parseNumber(rawUnits);
    const numberOfUnits = parsedUnits !== null && parsedUnits > 0 ? Math.round(parsedUnits) : 1;
    const parsedFloorArea = parseNumber(rawFloorArea);
    const floorAreaSqm = parsedFloorArea !== null && parsedFloorArea > 0 ? parsedFloorArea : undefined;

    const rawPurchasePrice = getFirstColVal(headerMap, row, [
      'target purchase price',
      'purchase price / max bid',
      'purchase price',
    ]);
    const rawOpenMarketValue = getColVal(row, 'open market value');
    const rawRehabCost = getFirstColVal(headerMap, row, [
      'estimated rehab cost',
      'estimated rehab capex',
      'rehab capex',
    ]);
    const rawRentalEstimate = getColVal(row, 'monthly rental estimate');
    const rawLevies = getColVal(row, 'monthly levies');
    const rawRates = getFirstColVal(headerMap, row, ['monthly rates & taxes', 'monthly rates']);
    const rawInsurance = getColVal(row, 'annual insurance');
    const rawCommunal = getFirstColVal(headerMap, row, [
      'communal services',
      'communal / serviced opex',
      'monthly communal services',
    ]);
    const isVatInclusiveDeveloperSale = parseBooleanFlag(
      getFirstColVal(headerMap, row, [
        'vat-inclusive developer sale',
        'vat inclusive developer sale',
        'vat inclusive',
      ])
    );
    const rawLoanTerm = getColVal(row, 'loan term');
    const parsedLoanTerm = parseNumber(rawLoanTerm);
    const loanTermYears = parsedLoanTerm !== null && parsedLoanTerm > 0 ? Math.round(parsedLoanTerm) : 20;
    const rawExtraPayment = getFirstColVal(headerMap, row, [
      'extra monthly payment',
      'extra monthly bond payment',
    ]);
    const parsedExtraPayment = parseNumber(rawExtraPayment);
    const extraMonthlyPaymentZAR =
      parsedExtraPayment !== null && parsedExtraPayment > 0 ? parsedExtraPayment : undefined;
    const rawRefinanceLtv = getColVal(row, 'refinance ltv');
    const parsedRefinanceLtv = parseNumber(rawRefinanceLtv);
    const refinanceLtvPercent =
      parsedRefinanceLtv !== null && parsedRefinanceLtv > 0 ? parsedRefinanceLtv : undefined;
    const rawPlacementFee = getColVal(row, 'tenant placement fee');
    const parsedPlacementFee = parseNumber(rawPlacementFee);
    const tenantPlacementFeePercent =
      parsedPlacementFee !== null && parsedPlacementFee >= 0 ? parsedPlacementFee : undefined;
    const rawSpvAdmin = getFirstColVal(headerMap, row, [
      'annual spv admin fee',
      'annual spv admin / audit fee',
      'annual spv admin audit fee',
    ]);
    const parsedSpvAdmin = parseNumber(rawSpvAdmin);
    const annualSpvAdminAuditFeeZAR =
      parsedSpvAdmin !== null && parsedSpvAdmin >= 0 ? parsedSpvAdmin : undefined;
    const rawAuctioneer = getFirstColVal(headerMap, row, ['auctioneer commission', 'auctioneer fee']);
    const parsedAuctioneer = parseNumber(rawAuctioneer);
    const auctioneerCommissionZAR =
      parsedAuctioneer !== null && parsedAuctioneer > 0 ? parsedAuctioneer : undefined;
    const rawMunicipalArrears = getFirstColVal(headerMap, row, [
      'section 118 municipal arrears',
      'municipal arrears',
    ]);
    const parsedMunicipalArrears = parseNumber(rawMunicipalArrears);
    const municipalArrearsZAR =
      parsedMunicipalArrears !== null && parsedMunicipalArrears > 0 ? parsedMunicipalArrears : undefined;

    const statusRaw = getFirstColVal(headerMap, row, ['status', 'pipeline status'])?.toString().trim();
    const agmDateRaw = parseDateString(getColVal(row, 'agm date'));
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
    const parsedCommunal = parseNumber(rawCommunal);
    const monthlyCommunalServicesZAR =
      parsedCommunal !== null && parsedCommunal > 0 ? parsedCommunal : undefined;

    // SA Guardrail 1: Freehold property levies must strictly be R0
    const propertyType = parsePropertyType(propertyTypeRaw);
    if (propertyType === 'Freehold House' && levies > 0) {
      warnings.push(`Row ${rowNum} (${title}): Levies of R ${levies} were automatically zeroed out because Freehold properties do not incur Sectional Title levies.`);
      levies = 0;
    }

    if (purchasePrice !== null && purchasePrice > 0 && openMarketValue !== null && openMarketValue > 0 && title && address) {
      // Calculate South African acquisition costs and deal metrics
      const costs = computeAcquisitionCosts(purchasePrice, 80, {
        isVatInclusiveDeveloperSale: Boolean(isVatInclusiveDeveloperSale),
      });
      const metrics = calculateDealMetrics({
        strategy,
        purchasePrice,
        openMarketValueZAR: openMarketValue,
        numberOfUnits,
        floorAreaSqm,
        isVatInclusiveDeveloperSale,
        tenantPlacementFeePercent,
        annualSpvAdminAuditFeeZAR,
        refinanceLtvPercent,
        estimatedRehabCost: rehabCost,
        monthlyRentalEstimate: rentalEstimate,
        monthlyLevies: levies,
        monthlyRatesTaxes: rates,
        annualInsurance: insurance,
        monthlyCommunalServicesZAR,
        managementFeePercent: 8.0,
        agencyVatApplicable: true,
        vacancyRatePercent: 6.0,
        targetExitPrice: openMarketValue,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        bondLTV: 80,
        interestRatePercent: 11.75,
        loanTermYears,
        extraMonthlyPaymentZAR,
        auctioneerCommissionZAR,
        municipalArrearsZAR,
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

      const province = parseProvince(provinceRaw) ?? 'Gauteng';

      const validSources: DealSource[] = ['Private Agent', 'Direct Owner', 'High-Street Auction', 'Distressed Sale / Repo', 'iGrow Rentals'];
      const source = validSources.find((s) => s.toLowerCase() === sourceRaw.toLowerCase()) ?? 'Private Agent';

      const validStatuses: OpportunityDeal['status'][] = [
        'Screening',
        'Offer Submitted',
        'Due Diligence',
        'Promoted to Flip',
        'Promoted to Rental',
        'Promoted to Development',
        'Passed',
      ];
      const status =
        validStatuses.find((s) => s.toLowerCase() === statusRaw?.toLowerCase()) ?? 'Screening';

      deals.push({
        id: `opp-import-${Date.now()}-${r}`,
        title,
        address,
        city,
        province,
        propertyType,
        ...(strategy ? { strategy } : {}),
        numberOfUnits,
        ...(floorAreaSqm !== undefined ? { floorAreaSqm } : {}),
        ...(isVatInclusiveDeveloperSale !== undefined ? { isVatInclusiveDeveloperSale } : {}),
        ...(refinanceLtvPercent !== undefined ? { refinanceLtvPercent } : {}),
        ...(tenantPlacementFeePercent !== undefined ? { tenantPlacementFeePercent } : {}),
        ...(annualSpvAdminAuditFeeZAR !== undefined ? { annualSpvAdminAuditFeeZAR } : {}),
        ...(extraMonthlyPaymentZAR !== undefined ? { extraMonthlyPaymentZAR } : {}),
        ...(monthlyCommunalServicesZAR !== undefined ? { monthlyCommunalServicesZAR } : {}),
        ...(auctioneerCommissionZAR !== undefined ? { auctioneerCommissionZAR } : {}),
        ...(municipalArrearsZAR !== undefined ? { municipalArrearsZAR } : {}),
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
        agencyVatApplicable: true,
        vacancyRatePercent: 6.0,
        targetExitPrice: openMarketValue,
        holdingPeriodMonths: 6,
        loanToValuePercent: 80,
        bondLTV: 80,
        depositZAR: Math.round(purchasePrice * 0.2),
        interestRatePercent: 11.75,
        loanTermYears,
        costs,
        grossYield: metrics.grossYield,
        capRate: metrics.capRate,
        netRoi: metrics.netRoi,
        monthlyCashFlow: metrics.monthlyCashFlow,
        initialCapitalRequired: metrics.initialCapitalRequired,
        projectedFlipNetProfit: metrics.projectedFlipNetProfit,
        projectedFlipRoi: metrics.projectedFlipRoi,
        status,
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

  // Distinguish 'Agency Commission (ZAR)' vs 'Agency Commission (%)' before normalization collisions
  let agencyCommPercentIdx: number | undefined;
  let agencyCommZarIdx: number | undefined;
  rawRows[0].forEach((cell, idx) => {
    if (cell !== undefined && cell !== null) {
      const rawStr = cell.toString().trim().toLowerCase();
      if (normalizeHeader(rawStr) === 'agency commission') {
        if (rawStr.includes('(zar)') && !rawStr.includes('%')) {
          agencyCommZarIdx = idx;
        } else {
          agencyCommPercentIdx = idx;
        }
      }
    }
  });

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

  const cleanPlaceholder = (val: unknown): string => {
    const str = val?.toString().trim() ?? '';
    if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'ongoing') {
      return '';
    }
    return str;
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
    const province = parseProvince(getColVal(row, 'province'));
    const propertyTypeRaw = getFirstColVal(headerMap, row, ['property type', 'title type']);
    const rawUnits = getFirstColVal(headerMap, row, ['units', 'number of units']);
    const rawFloorArea = getFirstColVal(headerMap, row, ['floor area', 'floor area sqm']);
    const parsedUnits = parseNumber(rawUnits);
    const numberOfUnits = parsedUnits !== null && parsedUnits > 0 ? Math.round(parsedUnits) : 1;
    const parsedFloorArea = parseNumber(rawFloorArea);
    const floorAreaSqm = parsedFloorArea !== null && parsedFloorArea > 0 ? parsedFloorArea : undefined;
    const sourceRaw = getColVal(row, 'source')?.toString().trim();
    const rawMarketValue = getColVal(row, 'market value');
    const rawPurchasePrice = getColVal(row, 'purchase price');
    const purchaseDate = parseDateString(getColVal(row, 'purchase date')) || todayStr;
    const rawOutstandingBond = getColVal(row, 'outstanding bond');
    const rawBondInterestRate = getColVal(row, 'bond interest rate');
    const rawLoanTerm = getColVal(row, 'loan term');
    const parsedLoanTerm = parseNumber(rawLoanTerm);
    const loanTermYears = parsedLoanTerm !== null && parsedLoanTerm > 0 ? Math.round(parsedLoanTerm) : undefined;
    const rawMonthlyBondPayment = getFirstColVal(headerMap, row, ['monthly bond repayment', 'monthly bond payment']);
    const rawExtraMonthlyPayment = getFirstColVal(headerMap, row, ['extra monthly bond payment', 'extra monthly payment']);
    const parsedExtraMonthlyPayment = parseNumber(rawExtraMonthlyPayment);
    const extraMonthlyPaymentZAR =
      parsedExtraMonthlyPayment !== null && parsedExtraMonthlyPayment > 0 ? parsedExtraMonthlyPayment : undefined;
    const rawGrossRent = getColVal(row, 'monthly gross rent');
    const rawLevies = getColVal(row, 'monthly levies');
    const rawRates = getFirstColVal(headerMap, row, ['monthly rates & taxes', 'monthly rates']);
    const rawBuildingInsurance = getFirstColVal(headerMap, row, [
      'annual building insurance',
      'annual insurance',
      'building insurance',
    ]);
    const parsedBuildingInsurance = parseNumber(rawBuildingInsurance);
    const annualBuildingInsuranceZAR =
      parsedBuildingInsurance !== null && parsedBuildingInsurance > 0 ? parsedBuildingInsurance : undefined;
    const utilityType = parseUtilityType(getColVal(row, 'utility type'));
    const rawCommunal = getFirstColVal(headerMap, row, [
      'communal / serviced opex',
      'communal services',
      'monthly communal services',
    ]);
    const parsedCommunal = parseNumber(rawCommunal);
    const monthlyCommunalServicesZAR =
      parsedCommunal !== null && parsedCommunal > 0 ? parsedCommunal : undefined;
    const rawVendingFee = getFirstColVal(headerMap, row, ['prepaid vending fee', 'monthly prepaid vending fee']);
    const parsedVendingFee = parseNumber(rawVendingFee);
    const monthlyPrepaidVendingFeeZAR =
      parsedVendingFee !== null && parsedVendingFee > 0 ? parsedVendingFee : undefined;
    const rawSec13Shield = getFirstColVal(headerMap, row, [
      'section 13sex annual shield',
      'section 13sex allowance',
    ]);
    const parsedSec13Shield = parseNumber(rawSec13Shield);
    const section13sexAnnualShieldZAR =
      parsedSec13Shield !== null && parsedSec13Shield > 0 ? parsedSec13Shield : undefined;
    const rawUnpaidArrears = getFirstColVal(headerMap, row, [
      'unpaid tenant utility arrears',
      'unpaid utility arrears',
    ]);
    const unpaidUtilityArrearsZAR = Math.max(0, parseNumber(rawUnpaidArrears) ?? 0);

    const municipalAccountNo = (
      getColVal(row, 'municipal/eskom account no') ??
      getColVal(row, 'municipal account no') ??
      getColVal(row, 'eskom account no') ??
      getColVal(row, 'account no') ??
      getColVal(row, 'account number')
    )?.toString().trim();
    const managementTypeRaw = getColVal(row, 'management type')?.toString().trim();
    const agencyName = getColVal(row, 'agency name')?.toString().trim() || '';
    const rawAgencyComm = agencyCommPercentIdx !== undefined ? row[agencyCommPercentIdx] : undefined;
    const agencyVatRaw = getColVal(row, 'agency vat applicable')?.toString().trim().toLowerCase();
    const agencyContact = getColVal(row, 'agency contact')?.toString().trim() || '';
    const rawMaintenanceReserve = getColVal(row, 'monthly maintenance reserve');
    const tenantName = cleanPlaceholder(getColVal(row, 'tenant name')) || 'Tenant Unassigned';
    const tenantPhone = cleanPlaceholder(getColVal(row, 'tenant phone')) || '+27 —';
    const tenantEmail = cleanPlaceholder(getColVal(row, 'tenant email')) || 'pending@tenant.co.za';
    const leaseStartDate = parseDateString(getColVal(row, 'lease start date')) || todayStr;
    const leaseEndDate =
      parseDateString(
        getFirstColVal(headerMap, row, ['lease end date', 'lease expiry date', 'lease expiry'])
      ) || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const rawDepositHeld = getColVal(row, 'deposit held');
    const rawEscalation = getColVal(row, 'annual escalation');
    const agmDate = parseDateString(getColVal(row, 'agm date')) || undefined;
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
      // Estimate PMT bond repayment if bond exists, honoring optional Loan Term (Years)
      monthlyBondPayment =
        outstandingBond > 0
          ? calculateMonthlyBondRepayment(outstandingBond, bondInterestRate, loanTermYears ?? 20)
          : 0;
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
    const rawExplicitAgencyFee =
      (agencyCommZarIdx !== undefined ? row[agencyCommZarIdx] : undefined) ??
      getFirstColVal(headerMap, row, ['monthly agency fee', 'agency fee']);
    const explicitAgentFee = parseNumber(rawExplicitAgencyFee);
    const parsedAgencyCommPct = parseNumber(rawAgencyComm);
    const agencyCommissionPercent = isAgency
      ? (parsedAgencyCommPct ?? (explicitAgentFee !== null && explicitAgentFee >= 0 ? undefined : 8.0))
      : 0;
    const agencyVatApplicable = isAgency ? (agencyVatRaw === 'no' || agencyVatRaw === 'false' ? false : true) : false;

    let monthlyAgentFeeZAR = 0;
    if (explicitAgentFee !== null && explicitAgentFee >= 0) {
      monthlyAgentFeeZAR = Math.round(explicitAgentFee);
    } else if (isAgency && grossRent) {
      const baseFee = grossRent * ((agencyCommissionPercent ?? 8.0) / 100);
      const vatMultiplier = agencyVatApplicable ? 1.15 : 1.0;
      monthlyAgentFeeZAR = Math.round(baseFee * vatMultiplier);
    }

    const rawBondEffectiveMonth =
      getColVal(row, 'bond effective month') ?? getColVal(row, 'bond payment effective date');
    const bondPaymentEffectiveDate = parseMonthString(rawBondEffectiveMonth) || undefined;

    const validStatuses = ['Occupied', 'Vacant', 'Notice Given', 'Partially Vacant', 'Sold'] as const;
    const status =
      validStatuses.find((s) => s.toLowerCase() === statusRaw?.toLowerCase()) ?? 'Occupied';

    const validSources: DealSource[] = [
      'iGrow Rentals',
      'Private Agent',
      'Direct Owner',
      'High-Street Auction',
      'Distressed Sale / Repo',
    ];

    let source: DealSource | undefined;
    if (sourceRaw) {
      const lower = sourceRaw.toLowerCase();
      if (lower.includes('igrow')) {
        source = 'iGrow Rentals';
      } else if (lower.includes('auction')) {
        source = 'High-Street Auction';
      } else if (lower.includes('distress') || lower.includes('repo')) {
        source = 'Distressed Sale / Repo';
      } else if (lower.includes('direct') || lower.includes('owner')) {
        source = 'Direct Owner';
      } else if (lower.includes('agent')) {
        source = 'Private Agent';
      } else {
        source = validSources.find((s) => s.toLowerCase() === lower) || 'Private Agent';
      }
    } else if (agencyName.toLowerCase().includes('igrow')) {
      source = 'iGrow Rentals';
    }

    let initialUtilityStatements: UtilityStatement[] | undefined;
    if (municipalAccountNo) {
      initialUtilityStatements = [
        {
          id: `util-initial-${Date.now()}-${r}`,
          statementDate: purchaseDate,
          accountNumber: municipalAccountNo,
          provider: 'Municipal / Eskom',
          electricityZAR: 0,
          waterZAR: 0,
          refuseZAR: 0,
          sewerageZAR: 0,
          propertyRatesZAR: rates,
          totalDueZAR: rates,
          parsedVia: 'manual',
          createdAt: todayStr,
        },
      ];
    }

    if (title && address && marketValue && purchasePrice && grossRent) {
      let leases: Lease[];
      if (numberOfUnits <= 1) {
        const singleLeaseStatus: Lease['status'] =
          status === 'Vacant' ? 'Vacant' : status === 'Notice Given' ? 'Notice Given' : 'Occupied';
        leases = [
          {
            id: crypto.randomUUID(),
            unitName: 'Main Unit',
            tenantName,
            tenantPhone,
            tenantEmail,
            leaseStartDate,
            leaseEndDate,
            depositHeldZAR: depositHeld,
            annualEscalationPercent: annualEscalation,
            monthlyRentZAR: grossRent,
            status: singleLeaseStatus,
            ...(utilityType ? { utilityType } : {}),
          },
        ];
      } else {
        const baseRent = Math.floor(grossRent / numberOfUnits);
        const rentRem = grossRent - baseRent * numberOfUnits;
        const baseDep = Math.floor(depositHeld / numberOfUnits);
        const depRem = depositHeld - baseDep * numberOfUnits;
        leases = Array.from({ length: numberOfUnits }, (_, idx) => {
          const isFirst = idx === 0;
          let unitStatus: Lease['status'] = 'Occupied';
          if (status === 'Vacant') {
            unitStatus = 'Vacant';
          } else if (status === 'Partially Vacant') {
            unitStatus = isFirst ? 'Occupied' : 'Vacant';
          } else if (status === 'Notice Given') {
            unitStatus = isFirst ? 'Notice Given' : 'Occupied';
          }
          return {
            id: crypto.randomUUID(),
            unitName: `Unit ${idx + 1}`,
            tenantName: isFirst ? tenantName : 'Tenant Unassigned',
            tenantPhone: isFirst ? tenantPhone : '+27 —',
            tenantEmail: isFirst ? tenantEmail : 'pending@tenant.co.za',
            leaseStartDate,
            leaseEndDate,
            depositHeldZAR: isFirst ? baseDep + depRem : baseDep,
            annualEscalationPercent: annualEscalation,
            monthlyRentZAR: isFirst ? baseRent + rentRem : baseRent,
            status: unitStatus,
            ...(utilityType ? { utilityType } : {}),
          };
        });
      }

      rentals.push({
        id: `rental-import-${Date.now()}-${r}`,
        title,
        address,
        city,
        ...(province ? { province } : {}),
        propertyType,
        numberOfUnits,
        floorAreaSqm,
        source,
        agmDate,
        marketValueZAR: marketValue,
        purchasePriceZAR: purchasePrice,
        purchaseDate,
        outstandingBondBalanceZAR: outstandingBond,
        bondInterestRatePercent: bondInterestRate,
        ...(loanTermYears !== undefined ? { loanTermYears } : {}),
        monthlyBondPaymentZAR: monthlyBondPayment,
        ...(extraMonthlyPaymentZAR !== undefined ? { extraMonthlyPaymentZAR } : {}),
        bondPaymentEffectiveDate,
        leases,
        managementType,
        agencyName: isAgency ? agencyName : undefined,
        agencyCommissionPercent: isAgency ? agencyCommissionPercent : undefined,
        agencyVatApplicable: isAgency ? agencyVatApplicable : undefined,
        agencyContact: isAgency ? agencyContact : undefined,
        monthlyGrossRentZAR: grossRent,
        monthlyLeviesZAR: levies,
        monthlyRatesTaxesZAR: rates,
        ...(annualBuildingInsuranceZAR !== undefined ? { annualBuildingInsuranceZAR } : {}),
        ...(utilityType ? { utilityType } : {}),
        ...(monthlyCommunalServicesZAR !== undefined ? { monthlyCommunalServicesZAR } : {}),
        ...(monthlyPrepaidVendingFeeZAR !== undefined ? { monthlyPrepaidVendingFeeZAR } : {}),
        ...(section13sexAnnualShieldZAR !== undefined
          ? { section13sexAnnualShieldZAR, section13SexEligible: true }
          : {}),
        monthlyAgentFeeZAR,
        monthlyMaintenanceReserveZAR: maintenanceReserve,
        unpaidUtilityArrearsZAR,
        maintenanceHistory: [],
        status,
        utilityStatements: initialUtilityStatements,
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
    const province = parseProvince(getColVal(row, 'province'));
    const propertyTypeRaw = getFirstColVal(headerMap, row, ['property type', 'title type']);
    const rawUnits = getFirstColVal(headerMap, row, ['units', 'number of units']);
    const rawFloorArea = getFirstColVal(headerMap, row, ['floor area', 'floor area sqm']);
    const parsedUnits = parseNumber(rawUnits);
    const numberOfUnits = parsedUnits !== null && parsedUnits > 0 ? Math.round(parsedUnits) : 1;
    const parsedFloorArea = parseNumber(rawFloorArea);
    const floorAreaSqm = parsedFloorArea !== null && parsedFloorArea > 0 ? parsedFloorArea : undefined;
    const projectStrategy = parseFlipProjectStrategy(
      getFirstColVal(headerMap, row, ['project strategy', 'flip strategy', 'strategy'])
    );
    const taxEntityType = parseTaxEntityType(getColVal(row, 'tax entity type'));
    const rawSec118Arrears = getFirstColVal(headerMap, row, [
      'section 118 municipal arrears',
      'sec 118 arrears',
      'section 118 arrears',
      'municipal arrears',
    ]);
    const parsedSec118Arrears = parseNumber(rawSec118Arrears);
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
    const purchaseDate = parseDateString(getColVal(row, 'purchase date')) || todayStr;
    const rawCompletionDate = parseDateString(getColVal(row, 'target completion date'));
    const currentPhaseRaw = getColVal(row, 'current phase')?.toString().trim();
    const agmDate = parseDateString(getColVal(row, 'agm date')) || undefined;
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
        ...(province ? { province } : {}),
        propertyType,
        numberOfUnits,
        floorAreaSqm,
        ...(projectStrategy ? { projectStrategy } : {}),
        ...(taxEntityType ? { taxEntityType } : {}),
        ...(parsedSec118Arrears !== null && parsedSec118Arrears > 0
          ? {
              municipalClearance: {
                sec118ArrearsZAR: parsedSec118Arrears,
                advanceCouncilDepositZAR: 0,
                rccStatus: 'Pending Application' as const,
              },
            }
          : {}),
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
  let result: ParseResult<T>;
  switch (templateType) {
    case 'pipeline':
      result = parsePipelineRows(rawRows) as unknown as ParseResult<T>;
      break;
    case 'rentals':
      result = parseRentalsRows(rawRows) as unknown as ParseResult<T>;
      break;
    case 'flips':
      result = parseFlipsRows(rawRows) as unknown as ParseResult<T>;
      break;
    default:
      throw new Error(`Unsupported template type: ${templateType}`);
  }
  if (result.errors.length > 0) {
    captureSanitizedError('EXCEL_IMPORT_VALIDATION_FAILED', {
      templateType,
      errorCount: result.errors.length,
    });
  }
  return result;
}

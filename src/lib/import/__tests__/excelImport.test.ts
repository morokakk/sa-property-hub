import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  normalizeHeader,
  parseNumber,
  parsePropertyType,
  parsePipelineRows,
  parseRentalsRows,
  parseFlipsRows,
  downloadPipelineTemplate,
  downloadRentalsTemplate,
  downloadFlipsTemplate,
} from '../excelImport';
import { buildOpportunitiesCSV, buildRentalsCSV } from '@/lib/export/csvExport';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';
import { INITIAL_OPPORTUNITIES, INITIAL_RENTALS } from '@/lib/store/initialData';

const writeFileMock = vi.fn();

vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof import('xlsx')>('xlsx');
  return {
    ...actual,
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  };
});

describe('Excel Import Engine Unit Tests', () => {
  beforeEach(() => {
    writeFileMock.mockClear();
  });

  describe('Header Normalization & Value Parsers', () => {
    it('normalizes headers by trimming, lowercasing, and removing suffixes/asterisks', () => {
      expect(normalizeHeader('Deal Title *')).toBe('deal title');
      expect(normalizeHeader('Target Purchase Price (ZAR) *')).toBe('target purchase price');
      expect(normalizeHeader('  Monthly Gross Rent (ZAR)  ')).toBe('monthly gross rent');
      expect(normalizeHeader('Bond Interest Rate (%)')).toBe('bond interest rate');
      expect(normalizeHeader('Estimated Duration (Months)')).toBe('estimated duration');
      expect(normalizeHeader('Loan Term (Years)')).toBe('loan term');
      expect(normalizeHeader('Floor Area (m²)')).toBe('floor area');
      expect(normalizeHeader('Floor Area (sqm)')).toBe('floor area');
      expect(normalizeHeader('Units')).toBe('units');
    });

    it('correctly parses numbers and strips currency symbols, spaces, and commas', () => {
      expect(parseNumber(2500000)).toBe(2500000);
      expect(parseNumber('R 2,450,000')).toBe(2450000);
      expect(parseNumber('15.5%')).toBe(15.5);
      expect(parseNumber('  12000  ')).toBe(12000);
      expect(parseNumber('')).toBeNull();
      expect(parseNumber(null)).toBeNull();
      expect(parseNumber('invalid')).toBeNull();
    });

    it('maps property titles to canonical South African types', () => {
      expect(parsePropertyType('Freehold House')).toBe('Freehold House');
      expect(parsePropertyType('standalone house')).toBe('Freehold House');
      expect(parsePropertyType('Townhouse / Cluster')).toBe('Townhouse / Cluster');
      expect(parsePropertyType('HOA Cluster')).toBe('Townhouse / Cluster');
      expect(parsePropertyType('Multi-unit Commercial')).toBe('Multi-unit Commercial');
      expect(parsePropertyType('Sectional Title Apartment')).toBe('Sectional Title Apartment');
      expect(parsePropertyType('unknown')).toBe('Sectional Title Apartment');
    });
  });

  describe('Pipeline Parser & SA Guardrails', () => {
    it('rejects spreadsheet if mandatory headers are missing', () => {
      const headers = ['Deal Title *', 'Address *']; // missing City, Purchase Price, Open Market Value
      const rows = [headers, ['Sample Deal', '10 Main Rd']];
      const result = parsePipelineRows(rows);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.column === 'City')).toBe(true);
      expect(result.errors.some((e) => e.column === 'Target Purchase Price (ZAR)')).toBe(true);
    });

    it('clamps Freehold House levies to R0 (SA Guardrail 1) and computes SARS metrics', () => {
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
      ];

      const dataRow = [
        'Bryanston Freehold Villa',
        '10 Wilton Avenue',
        'Johannesburg',
        'Gauteng',
        'Freehold House',
        'Private Agent',
        2500000,
        3200000,
        150000,
        22000,
        3500, // Invalid levy for Freehold House!
        1800,
        9600,
      ];

      const result = parsePipelineRows([headers, dataRow]);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);

      const deal = result.data[0];
      // Freehold levies must strictly be 0
      expect(deal.monthlyLevies).toBe(0);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain('automatically zeroed out');

      // Built-in equity calculation
      expect(deal.builtInEquityZAR).toBe(3200000 - 2500000);
      expect(deal.builtInEquityPercent).toBe(21.9);

      // SARS acquisition costs calculated
      expect(deal.costs.totalAcquisitionCost).toBeGreaterThan(deal.purchasePrice);
      expect(deal.costs.transferDuty).toBeGreaterThan(0); // Transfer duty on R2.5m > 0
      expect(deal.grossYield).toBeGreaterThan(0);
      expect(deal.capRate).toBeGreaterThan(0);
    });

    it('reports validation errors when numeric fields contain text', () => {
      const headers = [
        'Deal Title *',
        'Address *',
        'City *',
        'Target Purchase Price (ZAR) *',
        'Open Market Value (ZAR) *',
      ];
      const dataRow = ['Sandton Penthouse', '12 Rivonia Rd', 'Sandton', 'TWO MILLION', 2500000];
      const result = parsePipelineRows([headers, dataRow]);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].column).toBe('Target Purchase Price (ZAR)');
      expect(result.errors[0].row).toBe(2);
    });
  });

  describe('Rentals Parser & Agency SARS VAT Guardrail', () => {
    it('applies 15% SARS VAT to agency commission (SA Guardrail 2)', () => {
      const headers = [
        'Property Title *',
        'Address *',
        'City *',
        'Property Type',
        'Market Value (ZAR) *',
        'Purchase Price (ZAR) *',
        'Monthly Gross Rent (ZAR) *',
        'Monthly Levies (ZAR)',
        'Monthly Rates & Taxes (ZAR)',
        'Management Type',
        'Agency Name',
        'Agency Commission (%)',
        'Agency VAT Applicable',
      ];

      const grossRent = 20000;
      const commissionPercent = 8.0; // 8% of 20000 = 1600 base
      // With 15% SARS VAT: 1600 * 1.15 = 1840

      const dataRow = [
        'Rosebank Suite',
        '50 Oxford Rd',
        'Johannesburg',
        'Sectional Title Apartment',
        1800000,
        1600000,
        grossRent,
        2200,
        1200,
        'Agency',
        'Pam Golding Rosebank',
        commissionPercent,
        'Yes',
      ];

      const result = parseRentalsRows([headers, dataRow]);
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);

      const rental = result.data[0];
      expect(rental.managementType).toBe('Agency');
      expect(rental.agencyCommissionPercent).toBe(8.0);
      expect(rental.agencyVatApplicable).toBe(true);
      expect(rental.monthlyAgentFeeZAR).toBe(1840);
      expect(rental.monthlyLeviesZAR).toBe(2200);
    });

    it('zeros out levies for Freehold rental properties', () => {
      const headers = [
        'Property Title *',
        'Address *',
        'City *',
        'Property Type',
        'Market Value (ZAR) *',
        'Purchase Price (ZAR) *',
        'Monthly Gross Rent (ZAR) *',
        'Monthly Levies (ZAR)',
      ];

      const dataRow = [
        'Constantia Freehold Manor',
        '15 Spaanschemat River Rd',
        'Cape Town',
        'Freehold House',
        4500000,
        4000000,
        35000,
        4500, // Invalid levy for Freehold
      ];

      const result = parseRentalsRows([headers, dataRow]);
      expect(result.success).toBe(true);
      expect(result.data[0].monthlyLeviesZAR).toBe(0);
      expect(result.warnings.length).toBe(1);
    });

    it('supports explicit Monthly Agency Fee (ZAR) and Bond Effective Month without double VAT', () => {
      const headers = [
        'Property Title *',
        'Address *',
        'City *',
        'Market Value (ZAR) *',
        'Purchase Price (ZAR) *',
        'Monthly Gross Rent (ZAR) *',
        'Monthly Agency Fee (ZAR)',
        'Monthly Bond Payment (ZAR)',
        'Bond Effective Month (YYYY-MM)',
      ];

      const dataRow = [
        'Camps Bay Ocean View',
        '100 Victoria Rd',
        'Cape Town',
        6500000,
        5800000,
        45000,
        3850, // explicit fee
        28500,
        '2026-10',
      ];

      const result = parseRentalsRows([headers, dataRow]);
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);

      const rental = result.data[0];
      expect(rental.monthlyAgentFeeZAR).toBe(3850);
      expect(rental.monthlyBondPaymentZAR).toBe(28500);
      expect(rental.bondPaymentEffectiveDate).toBe('2026-10');
    });

    it('correctly parses Source and Municipal/Eskom Account No and seeds initial utility statement for auto-matching', () => {
      const headers = [
        'Property Title *',
        'Address *',
        'City *',
        'Property Type',
        'Source',
        'Market Value (ZAR) *',
        'Purchase Price (ZAR) *',
        'Monthly Gross Rent (ZAR) *',
        'Monthly Rates & Taxes (ZAR)',
        'Municipal/Eskom Account No',
        'Management Type',
        'Agency Name',
      ];

      const dataRow = [
        'Clearwater Village 128',
        '128 Clearwater Village, Atlasville',
        'Boksburg',
        'Sectional Title Apartment',
        'iGrow Rentals',
        1150000,
        980000,
        9500,
        850,
        '559235779',
        'Agency',
        'iGrow Rentals',
      ];

      const result = parseRentalsRows([headers, dataRow]);
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);

      const rental = result.data[0];
      expect(rental.source).toBe('iGrow Rentals');
      expect(rental.monthlyRatesTaxesZAR).toBe(850);
      expect(rental.utilityStatements).toBeDefined();
      expect(rental.utilityStatements?.length).toBe(1);

      const stmt = rental.utilityStatements![0];
      expect(stmt.accountNumber).toBe('559235779');
      expect(stmt.propertyRatesZAR).toBe(850);
      expect(stmt.totalDueZAR).toBe(850);
      expect(stmt.provider).toBe('Municipal / Eskom');
      expect(stmt.parsedVia).toBe('manual');
    });

    it('infers iGrow Rentals source from agency name if source column is absent', () => {
      const headers = [
        'Property Title *',
        'Address *',
        'City *',
        'Market Value (ZAR) *',
        'Purchase Price (ZAR) *',
        'Monthly Gross Rent (ZAR) *',
        'Agency Name',
      ];

      const dataRow = [
        'The Blyde Unit 302',
        'Bronkhorstspruit Rd',
        'Pretoria',
        1200000,
        1050000,
        8900,
        'iGrow Rentals Gauteng',
      ];

      const result = parseRentalsRows([headers, dataRow]);
      expect(result.success).toBe(true);
      expect(result.data[0].source).toBe('iGrow Rentals');
      expect(result.data[0].utilityStatements).toBeUndefined();
    });

    it('parses Units and Floor Area (m²) and defaults Units to 1 if omitted', () => {
      const headers = [
        'Property Title *',
        'Address *',
        'City *',
        'Market Value (ZAR) *',
        'Purchase Price (ZAR) *',
        'Monthly Gross Rent (ZAR) *',
        'Units',
        'Floor Area (m²)',
      ];
      const dataRowWithValues = [
        'Rosebank Duplex Block',
        '10 Oxford Rd',
        'Rosebank',
        '4000000',
        '3200000',
        '36000',
        '4',
        '320',
      ];
      const dataRowOmitted = [
        'Single Apartment',
        '12 Dover St',
        'Randburg',
        '1200000',
        '1000000',
        '10000',
        '',
        '',
      ];

      const result = parseRentalsRows([headers, dataRowWithValues, dataRowOmitted]);
      expect(result.success).toBe(true);
      expect(result.data[0].numberOfUnits).toBe(4);
      expect(result.data[0].floorAreaSqm).toBe(320);
      expect(result.data[1].numberOfUnits).toBe(1);
      expect(result.data[1].floorAreaSqm).toBeUndefined();
    });
  });

  describe('Flips Parser & Auto-Estimations', () => {
    it('parses flip project and auto-estimates acquisition costs and starter BOQ', () => {
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
        'Monthly Holding Cost (ZAR)',
      ];

      const dataRow = [
        'Parkhurst Flip',
        '25 4th Ave',
        'Johannesburg',
        'Freehold House',
        2000000,
        0, // 0 provided -> engine should auto-estimate
        400000,
        3200000,
        6,
        6000,
      ];

      const result = parseFlipsRows([headers, dataRow]);
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);

      const flip = result.data[0];
      expect(flip.purchasePriceZAR).toBe(2000000);
      expect(flip.baselineRenovationBudgetZAR).toBe(400000);
      expect(flip.acquisitionCostsZAR).toBeGreaterThan(50000); // Auto-estimated transfer + legal
      expect(flip.boq.length).toBe(1);
      expect(flip.boq[0].baselineTotalZAR).toBe(400000);
    });

    it('parses itemized holding costs and zeroes out levies for Freehold flips', () => {
      const headers = [
        'Project Title *',
        'Address *',
        'City *',
        'Property Type',
        'Purchase Price (ZAR) *',
        'Target Exit Price (ZAR) *',
        'Renovation Budget (ZAR) *',
        'Monthly Bond Payment (ZAR)',
        'Monthly Levies (ZAR)',
        'Monthly Rates & Taxes (ZAR)',
        'Other Holding Costs (ZAR)',
      ];

      const dataRow = [
        'Kensington Fixer-Upper',
        '45 Roberts Ave',
        'Johannesburg',
        'Freehold House',
        1200000,
        1950000,
        300000,
        12500,
        2500, // Freehold house cannot have levies! Should be zeroed out
        1800,
        700,
      ];

      const result = parseFlipsRows([headers, dataRow]);
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);

      const flip = result.data[0];
      expect(flip.monthlyBondPaymentZAR).toBe(12500);
      expect(flip.monthlyLeviesZAR).toBe(0); // Zeroed out by Freehold guardrail!
      expect(flip.monthlyRatesTaxesZAR).toBe(1800);
      expect(flip.monthlyOtherHoldingCostZAR).toBe(700);
      // Total monthly holding cost = 12500 + 0 + 1800 + 700 = 15000
      expect(flip.monthlyHoldingCostZAR).toBe(15000);
      expect(result.warnings.some((w) => w.includes('Freehold'))).toBe(true);
    });

    it('parses Units and Floor Area (m²) and defaults Units to 1 if omitted', () => {
      const headers = [
        'Project Title *',
        'Address *',
        'City *',
        'Property Type',
        'Units',
        'Floor Area (m²)',
        'Purchase Price (ZAR) *',
        'Renovation Budget (ZAR) *',
        'Target Exit Price (ZAR) *',
      ];
      const dataRowWithValues = [
        'Melville Multi-Unit Conversion',
        '14 7th Ave',
        'Johannesburg',
        'Freehold House',
        '3',
        '280',
        '1800000',
        '450000',
        '2900000',
      ];
      const dataRowOmitted = [
        'Linden Cottage Flip',
        '55 4th Ave',
        'Johannesburg',
        'Freehold House',
        '',
        '',
        '1500000',
        '300000',
        '2300000',
      ];

      const result = parseFlipsRows([headers, dataRowWithValues, dataRowOmitted]);
      expect(result.success).toBe(true);
      expect(result.data[0].numberOfUnits).toBe(3);
      expect(result.data[0].floorAreaSqm).toBe(280);
      expect(result.data[1].numberOfUnits).toBe(1);
      expect(result.data[1].floorAreaSqm).toBeUndefined();
    });
  });

  describe('9 SA Provinces, Optional Flat Fields & Multi-Unit Lease Scaffolding', () => {
    it('preserves all 9 SA provinces in parsePipelineRows without coercing to Gauteng', () => {
      const provinces = [
        'Gauteng',
        'Western Cape',
        'KwaZulu-Natal',
        'Eastern Cape',
        'Free State',
        'Limpopo',
        'Mpumalanga',
        'North West',
        'Northern Cape',
      ];
      const headers = [
        'Deal Title *',
        'Address *',
        'City *',
        'Province',
        'Target Purchase Price (ZAR) *',
        'Open Market Value (ZAR) *',
      ];
      const rows = provinces.map((prov, idx) => [
        `Deal ${prov}`,
        `${idx + 1} Main St`,
        'Town',
        prov,
        1_200_000,
        1_500_000,
      ]);
      const result = parsePipelineRows([headers, ...rows]);
      expect(result.success).toBe(true);
      expect(result.data.map((d) => d.province)).toEqual(provinces);
    });

    it('parses new optional Pipeline underwriting fields and zeroes Transfer Duty for VAT-inclusive developer sales', () => {
      const headers = [
        'Deal Title *',
        'Address *',
        'City *',
        'Province',
        'Property Type',
        'Strategy',
        'Units',
        'Floor Area (m²)',
        'Target Purchase Price (ZAR) *',
        'Open Market Value (ZAR) *',
        'VAT-Inclusive Developer Sale',
        'Refinance LTV (%)',
        'Tenant Placement Fee (%)',
        'Annual SPV Admin Fee (ZAR)',
        'Loan Term (Years)',
        'Extra Monthly Payment (ZAR)',
        'Communal Services (ZAR)',
      ];
      const row = [
        'Polokwane New-Build Block',
        '18 Grobler St',
        'Polokwane',
        'Limpopo',
        'Sectional Title Apartment',
        'BRRRR',
        6,
        360,
        3_000_000,
        3_600_000,
        'Yes',
        75,
        8,
        12000,
        15,
        2500,
        1800,
      ];
      const result = parsePipelineRows([headers, row]);
      expect(result.success).toBe(true);
      const deal = result.data[0];
      expect(deal.province).toBe('Limpopo');
      expect(deal.strategy).toBe('BRRRR');
      expect(deal.numberOfUnits).toBe(6);
      expect(deal.floorAreaSqm).toBe(360);
      expect(deal.isVatInclusiveDeveloperSale).toBe(true);
      expect(deal.costs.transferDuty).toBe(0);
      expect(deal.refinanceLtvPercent).toBe(75);
      expect(deal.tenantPlacementFeePercent).toBe(8);
      expect(deal.annualSpvAdminAuditFeeZAR).toBe(12000);
      expect(deal.loanTermYears).toBe(15);
      expect(deal.extraMonthlyPaymentZAR).toBe(2500);
      expect(deal.monthlyCommunalServicesZAR).toBe(1800);
    });

    it('supports Partially Vacant status, Loan Term PMT, new flat fields, and scaffolds multi-unit leases in parseRentalsRows', () => {
      const headers = [
        'Property Title *',
        'Address *',
        'City *',
        'Province',
        'Property Type',
        'Units',
        'Floor Area (m²)',
        'Market Value (ZAR) *',
        'Purchase Price (ZAR) *',
        'Outstanding Bond (ZAR)',
        'Bond Interest Rate (%)',
        'Loan Term (Years)',
        'Extra Monthly Bond Payment (ZAR)',
        'Monthly Gross Rent (ZAR) *',
        'Annual Building Insurance (ZAR)',
        'Utility Type',
        'Communal / Serviced OpEx (ZAR)',
        'Prepaid Vending Fee (ZAR)',
        'Section 13sex Annual Shield (ZAR)',
        'Tenant Name',
        'Deposit Held (ZAR)',
        'Status',
      ];
      const row = [
        'Rustenburg 3-Unit Courtyard',
        '42 Nelson Mandela Dr',
        'Rustenburg',
        'North West',
        'Freehold House',
        3,
        240,
        2_200_000,
        1_800_000,
        1_200_000,
        11.0,
        15,
        1_500,
        20_000, // 20000 / 3 -> 6668, 6666, 6666
        9_600,
        'prepaid_submeter',
        1_200,
        250,
        24_750,
        'Kagiso Molefe',
        25_000, // 25000 / 3 -> 8334, 8333, 8333
        'Partially Vacant',
      ];
      const result = parseRentalsRows([headers, row]);
      expect(result.success).toBe(true);
      const r = result.data[0];

      expect(r.province).toBe('North West');
      expect(r.status).toBe('Partially Vacant');
      expect(r.loanTermYears).toBe(15);
      expect(r.monthlyBondPaymentZAR).toBe(calculateMonthlyBondRepayment(1_200_000, 11.0, 15));
      expect(r.extraMonthlyPaymentZAR).toBe(1_500);
      expect(r.annualBuildingInsuranceZAR).toBe(9_600);
      expect(r.utilityType).toBe('prepaid_submeter');
      expect(r.monthlyCommunalServicesZAR).toBe(1_200);
      expect(r.monthlyPrepaidVendingFeeZAR).toBe(250);
      expect(r.section13sexAnnualShieldZAR).toBe(24_750);
      expect(r.section13SexEligible).toBe(true);

      // Multi-unit lease scaffolding checks
      expect(r.leases).toHaveLength(3);
      expect(r.leases[0].unitName).toBe('Unit 1');
      expect(r.leases[0].tenantName).toBe('Kagiso Molefe');
      expect(r.leases[0].status).toBe('Occupied');
      expect(r.leases[1].status).toBe('Vacant');
      expect(r.leases[2].status).toBe('Vacant');
      expect(r.leases.reduce((s, l) => s + l.monthlyRentZAR, 0)).toBe(20_000);
      expect(r.leases.reduce((s, l) => s + l.depositHeldZAR, 0)).toBe(25_000);
    });

    it('parses new optional Flips fields (Province, Project Strategy, Tax Entity Type, Sec 118 Arrears)', () => {
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
        'Section 118 Municipal Arrears (ZAR)',
        'Purchase Price (ZAR) *',
        'Renovation Budget (ZAR) *',
        'Target Exit Price (ZAR) *',
      ];
      const row = [
        'Nelspruit 4-Unit BTR Rehab',
        '7 Ferreira St',
        'Mbombela',
        'Mpumalanga',
        'Townhouse / Cluster',
        4,
        320,
        'build_to_rent',
        'Individual (45%)',
        32_500,
        1_600_000,
        400_000,
        2_600_000,
      ];
      const result = parseFlipsRows([headers, row]);
      expect(result.success).toBe(true);
      const flip = result.data[0];
      expect(flip.province).toBe('Mpumalanga');
      expect(flip.projectStrategy).toBe('build_to_rent');
      expect(flip.taxEntityType).toBe('Individual (45%)');
      expect(flip.municipalClearance?.sec118ArrearsZAR).toBe(32_500);
    });

    it('maintains 100% backward compatibility with legacy minimal headers', () => {
      const pipe = parsePipelineRows([
        ['Deal Title *', 'Address *', 'City *', 'Target Purchase Price (ZAR) *', 'Open Market Value (ZAR) *'],
        ['Legacy Deal', '1 Old St', 'Pretoria', 1_000_000, 1_300_000],
      ]);
      expect(pipe.success).toBe(true);
      expect(pipe.data[0].province).toBe('Gauteng');

      const rent = parseRentalsRows([
        ['Property Title *', 'Address *', 'City *', 'Market Value (ZAR) *', 'Purchase Price (ZAR) *', 'Monthly Gross Rent (ZAR) *'],
        ['Legacy Rental', '2 Old St', 'Pretoria', 1_100_000, 950_000, 9_500],
      ]);
      expect(rent.success).toBe(true);
      expect(rent.data[0].leases).toHaveLength(1);

      const flip = parseFlipsRows([
        ['Project Title *', 'Address *', 'City *', 'Purchase Price (ZAR) *', 'Renovation Budget (ZAR) *', 'Target Exit Price (ZAR) *'],
        ['Legacy Flip', '3 Old St', 'Pretoria', 1_200_000, 250_000, 1_850_000],
      ]);
      expect(flip.success).toBe(true);
    });
  });

  describe('Template Generation & CSV-to-Import Round-Trip Compatibility', () => {
    it('generates Pipeline, Rentals, and Flips templates with Units, Floor Area (m²), and matching !cols lengths', async () => {
      await downloadPipelineTemplate();
      await downloadRentalsTemplate();
      await downloadFlipsTemplate();

      expect(writeFileMock).toHaveBeenCalledTimes(3);

      for (const [wb] of writeFileMock.mock.calls as [XLSX.WorkBook, string][]) {
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
        const headers = rows[0] as string[];
        expect(headers).toContain('Units');
        expect(headers).toContain('Floor Area (m²)');
        expect(ws['!cols']?.length).toBe(headers.length);
        for (const row of rows.slice(1)) {
          expect(row.length).toBe(headers.length);
        }
      }
    });

    it('round-trips buildOpportunitiesCSV cleanly back into parsePipelineRows', () => {
      const csv = buildOpportunitiesCSV(INITIAL_OPPORTUNITIES);
      const wb = XLSX.read(csv, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      const parsed = parsePipelineRows(rawRows);
      expect(parsed.success).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.data).toHaveLength(INITIAL_OPPORTUNITIES.length);
      expect(parsed.data[0].title).toBe(INITIAL_OPPORTUNITIES[0].title);
      expect(parsed.data[0].province).toBe(INITIAL_OPPORTUNITIES[0].province);
      expect(parsed.data[0].propertyType).toBe(INITIAL_OPPORTUNITIES[0].propertyType);
      expect(parsed.data[0].purchasePrice).toBe(INITIAL_OPPORTUNITIES[0].purchasePrice);
    });

    it('round-trips buildRentalsCSV cleanly into parseRentalsRows without Agency Commission (%) corruption', () => {
      const multiUnitPartial = {
        ...INITIAL_RENTALS[0],
        id: 'rental-partial-rt',
        title: 'Midrand Partially Vacant Block',
        province: 'Limpopo' as const,
        propertyType: 'Townhouse / Cluster' as const,
        numberOfUnits: 4,
        status: 'Partially Vacant' as const,
        loanTermYears: 15,
        extraMonthlyPaymentZAR: 1_200,
        utilityType: 'prepaid_submeter' as const,
        monthlyPrepaidVendingFeeZAR: 180,
      };
      const sourceRentals = [INITIAL_RENTALS[0], multiUnitPartial];
      const csv = buildRentalsCSV(sourceRentals);
      const wb = XLSX.read(csv, { type: 'string' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      const parsed = parseRentalsRows(rawRows);
      expect(parsed.success).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.data).toHaveLength(2);

      // Verify Agency Commission (ZAR) did NOT overwrite agencyCommissionPercent (e.g. 1702%)
      expect(parsed.data[0].monthlyAgentFeeZAR).toBe(INITIAL_RENTALS[0].monthlyAgentFeeZAR);
      expect(parsed.data[0].agencyCommissionPercent).toBeUndefined();
      expect(parsed.data[0].propertyType).toBe(INITIAL_RENTALS[0].propertyType);
      expect(parsed.data[0].leases[0].leaseEndDate).toBe(INITIAL_RENTALS[0].leases[0].leaseEndDate);

      // Verify Partially Vacant, Limpopo, Loan Term, Extra Payment, Utility Type preserved
      expect(parsed.data[1].status).toBe('Partially Vacant');
      expect(parsed.data[1].province).toBe('Limpopo');
      expect(parsed.data[1].propertyType).toBe('Townhouse / Cluster');
      expect(parsed.data[1].loanTermYears).toBe(15);
      expect(parsed.data[1].extraMonthlyPaymentZAR).toBe(1_200);
      expect(parsed.data[1].utilityType).toBe('prepaid_submeter');
      expect(parsed.data[1].monthlyPrepaidVendingFeeZAR).toBe(180);
      expect(parsed.data[1].leases).toHaveLength(4);
    });
  });
});



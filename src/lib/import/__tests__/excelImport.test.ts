import { describe, it, expect } from 'vitest';
import {
  normalizeHeader,
  parseNumber,
  parsePropertyType,
  parsePipelineRows,
  parseRentalsRows,
  parseFlipsRows,
} from '../excelImport';

describe('Excel Import Engine Unit Tests', () => {
  describe('Header Normalization & Value Parsers', () => {
    it('normalizes headers by trimming, lowercasing, and removing suffixes/asterisks', () => {
      expect(normalizeHeader('Deal Title *')).toBe('deal title');
      expect(normalizeHeader('Target Purchase Price (ZAR) *')).toBe('target purchase price');
      expect(normalizeHeader('  Monthly Gross Rent (ZAR)  ')).toBe('monthly gross rent');
      expect(normalizeHeader('Bond Interest Rate (%)')).toBe('bond interest rate');
      expect(normalizeHeader('Estimated Duration (Months)')).toBe('estimated duration');
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
  });
});


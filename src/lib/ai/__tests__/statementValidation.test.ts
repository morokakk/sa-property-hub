import { describe, it, expect } from 'vitest';
import {
  ExtractedRentalUnitSchema,
  ExtractedStatementBatchSchema,
  checkAccountingVariance,
} from '../statementValidation';

describe('AI Statement Validation & Accounting Variance', () => {
  describe('ExtractedRentalUnitSchema', () => {
    it('successfully validates valid structured extraction data with numbers', () => {
      const validData = {
        propertyName: 'Clearwater Village 128',
        propertyAddress: '128 Clearwater Village, Boksburg',
        grossRentZAR: 8500,
        leviesZAR: 1850,
        municipalRatesZAR: 1125.04,
        agencyCommissionZAR: 973.57,
        netPayoutZAR: 4551.39,
        tenantName: 'Johnathan Doe',
        leaseEndDate: '2026-11-30',
        statementDate: '2026-08-31',
      };

      const parsed = ExtractedRentalUnitSchema.safeParse(validData);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.propertyName).toBe('Clearwater Village 128');
        expect(parsed.data.grossRentZAR).toBe(8500);
        expect(parsed.data.netPayoutZAR).toBe(4551.39);
      }
    });

    it('rejects formatted currency strings (enforcing strict numeric types from LLM)', () => {
      const invalidData = {
        propertyName: 'Clearwater Village 128',
        grossRentZAR: 'R 8,500.00', // Invalid: string instead of number
        leviesZAR: 1850,
        municipalRatesZAR: 1125.04,
        agencyCommissionZAR: 973.57,
        netPayoutZAR: 4551.39,
      };

      const parsed = ExtractedRentalUnitSchema.safeParse(invalidData);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issue = parsed.error.issues.find((i) => i.path.includes('grossRentZAR'));
        expect(issue).toBeDefined();
      }
    });

    it('applies default 0 for optional financial fields when undefined', () => {
      const minimalData = {
        propertyName: 'Sandton View 4B',
        grossRentZAR: 12000,
        netPayoutZAR: 12000,
      };

      const parsed = ExtractedRentalUnitSchema.safeParse(minimalData);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.leviesZAR).toBe(0);
        expect(parsed.data.municipalRatesZAR).toBe(0);
        expect(parsed.data.agencyCommissionZAR).toBe(0);
      }
    });

    it('validates ExtractedStatementBatchSchema array of units', () => {
      const batch = {
        units: [
          {
            propertyName: 'Unit 1',
            grossRentZAR: 5000,
            netPayoutZAR: 5000,
          },
          {
            propertyName: 'Unit 2',
            grossRentZAR: 6000,
            netPayoutZAR: 6000,
          },
        ],
      };

      const parsed = ExtractedStatementBatchSchema.safeParse(batch);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.units).toHaveLength(2);
      }
    });

    it('robustly normalizes stringified JSON units (resolves "expected array, received string")', () => {
      const stringifiedBatch = {
        units: JSON.stringify([
          {
            propertyName: 'Clearwater Village 128',
            grossRentZAR: 6900,
            leviesZAR: 477.07,
            municipalRatesZAR: 1021.0,
            agencyCommissionZAR: 850.54,
            netOperatingIncomeZAR: 5525.03,
            tenantName: 'Bongani June Mwale',
          },
        ]),
      };

      const parsed = ExtractedStatementBatchSchema.safeParse(stringifiedBatch);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.units).toHaveLength(1);
        expect(parsed.data.units[0].propertyName).toBe('Clearwater Village 128');
        expect(parsed.data.units[0].grossRentZAR).toBe(6900);
      }
    });

    it('normalizes top-level array without "units" wrapper', () => {
      const rawArray = [
        {
          propertyName: 'Direct Array Unit',
          grossRentZAR: 11000,
          netOperatingIncomeZAR: 9000,
        },
      ];

      const parsed = ExtractedStatementBatchSchema.safeParse(rawArray);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.units).toHaveLength(1);
        expect(parsed.data.units[0].propertyName).toBe('Direct Array Unit');
      }
    });

    it('coerces numeric strings from LLM output in batch normalization', () => {
      const batchWithStringNumbers = {
        units: [
          {
            propertyName: 'Numeric Coerce Unit',
            grossRentZAR: '15000.00',
            leviesZAR: '1850.50',
            netOperatingIncomeZAR: '11500',
          },
        ],
      };

      const parsed = ExtractedStatementBatchSchema.safeParse(batchWithStringNumbers);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.units[0].grossRentZAR).toBe(15000);
        expect(parsed.data.units[0].leviesZAR).toBe(1850.5);
      }
    });
  });

  describe('checkAccountingVariance', () => {
    it('flags variance when Net Rent from statement differs from Gross - (Levies + Rates + Agency) by > R1.00', () => {
      // Clearwater Village example from iGrow statement:
      // Gross: 8500, Levies: 1850, Rates: 1125.04, Agency: 973.57
      // Calculated NOI = 8500 - (1850 + 1125.04 + 973.57) = 4551.39
      // Statement Net Payout = 5525.03 (due to tenant utility recoveries or timing)
      // Difference = |4551.39 - 5525.03| = 973.64
      const unit = {
        propertyName: 'Clearwater Village 128',
        grossRentZAR: 8500,
        leviesZAR: 1850,
        municipalRatesZAR: 1125.04,
        agencyCommissionZAR: 973.57,
        netPayoutZAR: 5525.03,
      };

      const result = checkAccountingVariance(unit);
      expect(result.hasVariance).toBe(true);
      expect(result.calculatedNet).toBeCloseTo(4551.39, 2);
      expect(result.statementNet).toBe(5525.03);
      expect(result.difference).toBeCloseTo(973.64, 2);
    });

    it('reports no variance when Calculated NOI matches Statement Net within R1.00', () => {
      const unit = {
        propertyName: 'Rosebank Central 10',
        grossRentZAR: 10000,
        leviesZAR: 1500,
        municipalRatesZAR: 800,
        agencyCommissionZAR: 1000,
        netPayoutZAR: 6700, // 10000 - 3300 = 6700
      };

      const result = checkAccountingVariance(unit);
      expect(result.hasVariance).toBe(false);
      expect(result.calculatedNet).toBe(6700);
      expect(result.difference).toBe(0);
    });

    it('tolerates minor rounding differences under R1.00', () => {
      const unit = {
        propertyName: 'Pretoria East 2',
        grossRentZAR: 10000,
        leviesZAR: 1500,
        municipalRatesZAR: 800,
        agencyCommissionZAR: 1000,
        netPayoutZAR: 6700.50, // 50 cents rounding difference
      };

      const result = checkAccountingVariance(unit);
      expect(result.hasVariance).toBe(false);
      expect(result.difference).toBeCloseTo(0.5, 2);
    });
  });

  describe('VAT & Market Value Schema Validation', () => {
    it('correctly parses agencyCommissionVatZAR, isCommissionInclusiveOfVat, and estimatedMarketValueZAR', () => {
      const data = {
        propertyName: 'Clearwater Village 128',
        grossRentZAR: 6900,
        agencyCommissionZAR: 850.54,
        agencyCommissionVatZAR: 110.94,
        isCommissionInclusiveOfVat: true,
        estimatedMarketValueZAR: 828000,
        purchasePriceZAR: 759000,
        netPayoutZAR: 5525.03,
      };

      const parsed = ExtractedRentalUnitSchema.safeParse(data);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.agencyCommissionVatZAR).toBe(110.94);
        expect(parsed.data.isCommissionInclusiveOfVat).toBe(true);
        expect(parsed.data.estimatedMarketValueZAR).toBe(828000);
        expect(parsed.data.purchasePriceZAR).toBe(759000);
      }
    });

    it('defaults isCommissionInclusiveOfVat to true for managing agent trust ledgers when omitted', () => {
      const data = {
        propertyName: 'Midrand Complex 14',
        grossRentZAR: 9000,
        agencyCommissionZAR: 950,
      };

      const parsed = ExtractedRentalUnitSchema.safeParse(data);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.isCommissionInclusiveOfVat).toBe(true);
      }
    });
  });
});

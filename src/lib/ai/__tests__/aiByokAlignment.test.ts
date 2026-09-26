import { describe, it, expect } from 'vitest';
import { validateExtractedStatementPayload } from '../statementValidation';
import { UtilityStatementSchema } from '@/lib/utilities/pdfParser';
import { PropertyTitleType } from '@/types';

describe('AI & BYOK Alignment Tests', () => {
  describe('ExtractedRentalUnitSchema with new financing & property title fields', () => {
    it('successfully validates statement payload with purchase price, bond payment, and property type', () => {
      const payload = {
        units: [
          {
            propertyName: 'Clearwater Village 128',
            address: '128 Clearwater Village, Atlas Road, Boksburg',
            tenantName: 'Bongani June Mwale',
            leaseExpiryDate: '2027-02-28',
            grossRentZAR: 6900,
            leviesZAR: 477.07,
            municipalRatesZAR: 1021.0,
            agencyCommissionZAR: 850.54,
            agencyCommissionVatZAR: 110.94,
            isCommissionInclusiveOfVat: true,
            estimatedMarketValueZAR: 828000,
            purchasePriceZAR: 759000,
            monthlyBondPaymentZAR: 4850,
            bondPaymentEffectiveDate: '2026-05',
            propertyType: 'Sectional Title Apartment',
            depositHeldZAR: 6965.17,
            netOperatingIncomeZAR: 5525.03,
          },
        ],
      };

      const result = validateExtractedStatementPayload(payload);
      expect(result.success).toBe(true);
      expect(result.units).toHaveLength(1);
      const unit = result.units[0];
      expect(unit.purchasePriceZAR).toBe(759000);
      expect(unit.monthlyBondPaymentZAR).toBe(4850);
      expect(unit.bondPaymentEffectiveDate).toBe('2026-05');
      expect(unit.propertyType).toBe('Sectional Title Apartment');
    });

    it('gracefully handles missing purchase price and bond payment without failing validation', () => {
      const payload = {
        units: [
          {
            propertyName: 'Kloof Street Studio',
            address: '74 Kloof Street, Gardens, Cape Town',
            tenantName: 'Sarah Jenkins',
            grossRentZAR: 12500,
            netOperatingIncomeZAR: 10800,
          },
        ],
      };

      const result = validateExtractedStatementPayload(payload);
      expect(result.success).toBe(true);
      expect(result.units).toHaveLength(1);
      const unit = result.units[0];
      expect(unit.purchasePriceZAR).toBeUndefined();
      expect(unit.monthlyBondPaymentZAR).toBeUndefined();
    });
  });

  describe('UtilityStatementSchema with municipal valuation and property details', () => {
    it('validates utility statement with municipal valuation, property name, address, and body corporate levies', () => {
      const statement = {
        statementDate: '2026-04-15',
        billingPeriod: 'April 2026',
        accountNumber: '208394821',
        provider: 'City of Johannesburg',
        propertyName: 'The Blyde 402',
        propertyAddress: 'Bronkhorstspruit Road, Pretoria (Stand 1042)',
        billingType: 'itemized',
        electricityZAR: 1250.5,
        waterZAR: 620.3,
        refuseZAR: 285.2,
        sewerageZAR: 450.0,
        propertyRatesZAR: 980.0,
        totalDueZAR: 3586.0,
        municipalValuationZAR: 1850000,
        bodyCorporateLeviesZAR: 1450,
      };

      const parsed = UtilityStatementSchema.parse(statement);
      expect(parsed.municipalValuationZAR).toBe(1850000);
      expect(parsed.propertyName).toBe('The Blyde 402');
      expect(parsed.propertyAddress).toContain('Bronkhorstspruit Road');
      expect(parsed.bodyCorporateLeviesZAR).toBe(1450);
    });

    it('preserves bundled statement with municipal valuation and rates', () => {
      const bundledStatement = {
        statementDate: '2026-03-31',
        provider: 'iGrow Rentals',
        propertyName: 'Greencreek 15',
        propertyAddress: '15 Greencreek Estate, Rivergate',
        billingType: 'bundled',
        bundledUtilitiesZAR: 477.07,
        propertyRatesZAR: 350.0,
        totalDueZAR: 827.07,
        municipalValuationZAR: 750000,
      };

      const parsed = UtilityStatementSchema.parse(bundledStatement);
      expect(parsed.billingType).toBe('bundled');
      expect(parsed.bundledUtilitiesZAR).toBe(477.07);
      expect(parsed.totalDueZAR).toBe(827.07);
      expect(parsed.municipalValuationZAR).toBe(750000);
    });
  });

  describe('Freehold title guardrail logic', () => {
    const resolveLevies = (type: PropertyTitleType, rawLevies: number) =>
      type === 'Freehold House' ? 0 : rawLevies;

    it('correctly identifies that Freehold House levies must be R0', () => {
      expect(resolveLevies('Freehold House', 850)).toBe(0);
    });

    it('preserves levies for Sectional Title properties', () => {
      expect(resolveLevies('Sectional Title Apartment', 1450)).toBe(1450);
    });
  });
});

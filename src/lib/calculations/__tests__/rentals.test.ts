import { describe, it, expect } from 'vitest';
import {
  calculateRentalTaxProvision,
  calculateGrossYield,
  calculateBrrrrRefinanceProposal,
  calculateAgencyCommission,
  calculateDisposalMetrics,
  calculateAggregateRentalKPIs,
} from '../rentals';
import { RentalProperty } from '@/types';

describe('Rentals Pure Calculations Engine', () => {
  const baseRental: RentalProperty = {
    id: 'rental-test-1',
    title: 'Rosebank Executive Suite',
    address: '15 Tyrwhitt Ave, Rosebank',
    city: 'Johannesburg',
    propertyType: 'Sectional Title Apartment',
    marketValueZAR: 1_800_000,
    purchasePriceZAR: 1_500_000,
    purchaseDate: '2025-01-10',
    outstandingBondBalanceZAR: 1_100_000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 11_700,
    monthlyGrossRentZAR: 18_000,
    monthlyLeviesZAR: 2_400,
    monthlyRatesTaxesZAR: 1_200,
    monthlyAgentFeeZAR: 1_656,
    monthlyMaintenanceReserveZAR: 600,
    status: 'Occupied',
    leases: [],
    maintenanceHistory: [],
  };

  describe('calculateGrossYield', () => {
    it('calculates annualized gross yield accurately', () => {
      // 18,000 * 12 = 216,000 / 1,800,000 = 12%
      const yieldPct = calculateGrossYield(18_000, 1_800_000);
      expect(yieldPct).toBeCloseTo(12.0, 4);
    });

    it('returns 0 when market value is 0 or negative', () => {
      expect(calculateGrossYield(18_000, 0)).toBe(0);
      expect(calculateGrossYield(18_000, -500_000)).toBe(0);
    });

    it('returns 0 when gross rent is 0', () => {
      expect(calculateGrossYield(0, 1_800_000)).toBe(0);
    });
  });

  describe('calculateRentalTaxProvision', () => {
    it('calculates company tax provision at 27% by default', () => {
      const netCashflow = 5_000; // annual cashflow = 60,000
      const result = calculateRentalTaxProvision(baseRental, netCashflow);

      expect(result.entityType).toBe('Company (27%)');
      expect(result.taxRate).toBe(0.27);
      expect(result.taxRateLabel).toBe('Company 27%');
      expect(result.annualCashflowZAR).toBe(60_000);
      expect(result.taxableIncomeZAR).toBe(60_000);
      expect(result.annualTaxZAR).toBe(16_200); // 60,000 * 0.27
      expect(result.monthlyTaxZAR).toBe(1_350); // 16,200 / 12
      expect(result.postTaxCashflowZAR).toBe(3_650); // 5,000 - 1,350
      expect(result.yieldPostTaxPercent).toBeCloseTo(((3_650 * 12) / 1_800_000) * 100, 4);
    });

    it('applies individual 45% tax rate override', () => {
      const rentalWithIndividual = {
        ...baseRental,
        taxEntityTypeOverride: 'Individual (45%)' as const,
      };
      const result = calculateRentalTaxProvision(rentalWithIndividual, 10_000);

      expect(result.entityType).toBe('Individual (45%)');
      expect(result.taxRate).toBe(0.45);
      expect(result.taxRateLabel).toBe('Individual 45%');
      expect(result.annualCashflowZAR).toBe(120_000);
      expect(result.annualTaxZAR).toBe(54_000); // 120,000 * 0.45
      expect(result.monthlyTaxZAR).toBe(4_500);
      expect(result.postTaxCashflowZAR).toBe(5_500);
    });

    it('applies pre-tax 0% structure', () => {
      const rentalWithPreTax = {
        ...baseRental,
        taxEntityTypeOverride: 'Pre-Tax' as const,
      };
      const result = calculateRentalTaxProvision(rentalWithPreTax, 8_000);

      expect(result.entityType).toBe('Pre-Tax');
      expect(result.taxRate).toBe(0);
      expect(result.taxRateLabel).toBe('Pre-Tax 0%');
      expect(result.annualTaxZAR).toBe(0);
      expect(result.monthlyTaxZAR).toBe(0);
      expect(result.postTaxCashflowZAR).toBe(8_000);
    });

    it('deducts Section 13sex building tax shield and computes tax savings', () => {
      const rentalWithShield = {
        ...baseRental,
        section13sexAnnualShieldZAR: 25_000,
      };
      const netCashflow = 5_000; // Annual cashflow = 60,000
      const result = calculateRentalTaxProvision(rentalWithShield, netCashflow);

      // Taxable income = 60,000 - 25,000 = 35,000
      expect(result.sec13ShieldZAR).toBe(25_000);
      expect(result.taxableIncomeZAR).toBe(35_000);
      expect(result.annualTaxZAR).toBe(Math.round(35_000 * 0.27)); // 9,450
      expect(result.monthlyTaxZAR).toBe(Math.round(9_450 / 12)); // 788
      expect(result.taxSavingsZAR).toBe(Math.round(25_000 * 0.27)); // 6,750
    });

    it('caps Section 13sex tax savings at annual cashflow when shield exceeds cashflow', () => {
      const rentalWithLargeShield = {
        ...baseRental,
        section13sexAnnualShieldZAR: 100_000,
      };
      const netCashflow = 2_000; // Annual cashflow = 24,000
      const result = calculateRentalTaxProvision(rentalWithLargeShield, netCashflow);

      // Taxable income floored at 0
      expect(result.taxableIncomeZAR).toBe(0);
      expect(result.annualTaxZAR).toBe(0);
      expect(result.monthlyTaxZAR).toBe(0);
      // Tax savings capped at min(24_000, 100_000) * 0.27 = 6,480
      expect(result.taxSavingsZAR).toBe(Math.round(24_000 * 0.27));
    });

    it('deducts arrears write-offs as bad debt tax deductions', () => {
      const rentalWithWriteOffs = {
        ...baseRental,
        arrearsWriteOffs: [
          {
            id: 'wo-1',
            date: '2026-03-01',
            amountZAR: 5_000,
            reason: 'Uncollectable' as const,
            allocations: [],
            createdAt: '2026-03-01',
          },
          {
            id: 'wo-2',
            date: '2026-03-15',
            amountZAR: 3_000,
            reason: 'Tenant absconded' as const,
            allocations: [],
            createdAt: '2026-03-15',
          },
        ],
      };
      const result = calculateRentalTaxProvision(rentalWithWriteOffs, 5_000);

      // Annual cashflow = 60,000; Bad debt = 8,000; Taxable = 52,000
      expect(result.totalBadDebtZAR).toBe(8_000);
      expect(result.taxableIncomeZAR).toBe(52_000);
      expect(result.annualTaxZAR).toBe(Math.round(52_000 * 0.27));
    });

    it('handles negative or zero net cashflow gracefully', () => {
      const resultNegative = calculateRentalTaxProvision(baseRental, -2_500);
      expect(resultNegative.annualCashflowZAR).toBe(0);
      expect(resultNegative.taxableIncomeZAR).toBe(0);
      expect(resultNegative.annualTaxZAR).toBe(0);
      expect(resultNegative.monthlyTaxZAR).toBe(0);
      expect(resultNegative.postTaxCashflowZAR).toBe(-2_500);

      const resultZero = calculateRentalTaxProvision(baseRental, 0);
      expect(resultZero.annualCashflowZAR).toBe(0);
      expect(resultZero.taxableIncomeZAR).toBe(0);
      expect(resultZero.annualTaxZAR).toBe(0);
      expect(resultZero.postTaxCashflowZAR).toBe(0);
    });

    it('handles zero market value without dividing by zero in yield', () => {
      const rentalZeroVal = { ...baseRental, marketValueZAR: 0 };
      const result = calculateRentalTaxProvision(rentalZeroVal, 4_000);
      expect(result.yieldPostTaxPercent).toBe(0);
    });
  });

  describe('calculateBrrrrRefinanceProposal', () => {
    it('calculates standard BRRRR refinance proposal with 15% appreciation and 70% LTV', () => {
      const currentVal = 1_000_000;
      const currentBond = 600_000;
      const proposal = calculateBrrrrRefinanceProposal(currentVal, currentBond, 11.5, 20, 0.70);

      // 1,000,000 * 1.15 = 1,150,000 (already multiple of 50,000)
      expect(proposal.estimatedNewValuationZAR).toBe(1_150_000);
      // 1,150,000 * 0.70 = 805,000 -> rounded to nearest 10,000 = 810,000
      expect(proposal.targetBondBalanceZAR).toBe(810_000);
      // Cash out = 810,000 - 600,000 = 210,000
      expect(proposal.cashEquityPulledOutZAR).toBe(210_000);
      // New bond = 600,000 + 210,000 = 810,000
      expect(proposal.newBondBalanceZAR).toBe(810_000);
      expect(proposal.estimatedMonthlyBondRepaymentZAR).toBeGreaterThan(0);
      expect(proposal.ltvPercent).toBeCloseTo((810_000 / 1_150_000) * 100, 2);
    });

    it('floors cash out to 0 when existing bond exceeds target bond', () => {
      const currentVal = 1_000_000;
      const currentBond = 900_000;
      const proposal = calculateBrrrrRefinanceProposal(currentVal, currentBond, 11.5, 20, 0.70);

      // Target bond is 810,000, current bond is 900,000 -> cash equity pulled out is 0
      expect(proposal.cashEquityPulledOutZAR).toBe(0);
      expect(proposal.newBondBalanceZAR).toBe(900_000);
    });

    it('rounds valuations to nearest R50,000 and target bonds to nearest R10,000', () => {
      // 1,234,567 * 1.15 = 1,419,752.05 -> round(1,419,752.05 / 50,000) * 50,000 = 1,400,000
      const proposal = calculateBrrrrRefinanceProposal(1_234_567, 500_000);
      expect(proposal.estimatedNewValuationZAR % 50_000).toBe(0);
      expect(proposal.targetBondBalanceZAR % 10_000).toBe(0);
    });

    it('handles zero valuation gracefully', () => {
      const proposal = calculateBrrrrRefinanceProposal(0, 0);
      expect(proposal.estimatedNewValuationZAR).toBe(0);
      expect(proposal.targetBondBalanceZAR).toBe(0);
      expect(proposal.cashEquityPulledOutZAR).toBe(0);
      expect(proposal.newBondBalanceZAR).toBe(0);
      expect(proposal.ltvPercent).toBe(0);
    });
  });

  describe('calculateAgencyCommission', () => {
    it('calculates standard commission with 15% VAT', () => {
      // 10,000 * 8% = 800; 800 * 1.15 = 920
      const result = calculateAgencyCommission(10_000, 8.0, true, 'Pam Golding');
      expect(result.monthlyAgentFeeZAR).toBe(920);
      expect(result.vatApplied).toBe(true);
      expect(result.effectiveCommissionPercent).toBe(9.2);
    });

    it('exempts VAT when agencyName is iGrow Rentals', () => {
      // iGrow Rentals charges no VAT: 10,000 * 8% = 800
      const result = calculateAgencyCommission(10_000, 8.0, true, 'iGrow Rentals');
      expect(result.monthlyAgentFeeZAR).toBe(800);
      expect(result.vatApplied).toBe(false);
      expect(result.effectiveCommissionPercent).toBe(8.0);
    });

    it('does not apply VAT when vatApplicable is false', () => {
      const result = calculateAgencyCommission(20_000, 10.0, false, 'City Properties');
      expect(result.monthlyAgentFeeZAR).toBe(2_000);
      expect(result.vatApplied).toBe(false);
      expect(result.effectiveCommissionPercent).toBe(10.0);
    });

    it('handles zero gross rent gracefully', () => {
      const result = calculateAgencyCommission(0, 8.0, true);
      expect(result.monthlyAgentFeeZAR).toBe(0);
      expect(result.effectiveCommissionPercent).toBe(8.0);
    });
  });

  describe('calculateDisposalMetrics', () => {
    it('calculates gross capital gain, percentage gain, and net liquid cash proceeds', () => {
      const salePrice = 2_200_000;
      const purchasePrice = 1_500_000;
      const bondBalance = 900_000;

      const metrics = calculateDisposalMetrics(salePrice, purchasePrice, bondBalance);
      expect(metrics.grossCapitalGainZAR).toBe(700_000);
      expect(metrics.capitalGainPercent).toBeCloseTo((700_000 / 1_500_000) * 100, 2);
      expect(metrics.netCashProceedsZAR).toBe(1_300_000); // 2,200,000 - 900,000
    });

    it('floors net cash proceeds to 0 when outstanding bond exceeds sale price', () => {
      const metrics = calculateDisposalMetrics(1_000_000, 1_200_000, 1_300_000);
      expect(metrics.grossCapitalGainZAR).toBe(-200_000);
      expect(metrics.netCashProceedsZAR).toBe(0);
    });

    it('handles 0 purchase price without division by zero', () => {
      const metrics = calculateDisposalMetrics(1_500_000, 0, 500_000);
      expect(metrics.grossCapitalGainZAR).toBe(1_500_000);
      expect(metrics.capitalGainPercent).toBe(0);
      expect(metrics.netCashProceedsZAR).toBe(1_000_000);
    });
  });

  describe('calculateAggregateRentalKPIs', () => {
    it('filters active vs sold properties and aggregates asset value and gross rent', () => {
      const properties: RentalProperty[] = [
        {
          ...baseRental,
          id: 'p-1',
          status: 'Occupied',
          marketValueZAR: 2_000_000,
          monthlyGrossRentZAR: 15_000,
        },
        {
          ...baseRental,
          id: 'p-2',
          status: 'Vacant',
          marketValueZAR: 1_500_000,
          monthlyGrossRentZAR: 10_000,
        },
        {
          ...baseRental,
          id: 'p-3',
          status: 'Sold',
          marketValueZAR: 1_800_000,
          monthlyGrossRentZAR: 12_000,
        },
      ];

      const kpis = calculateAggregateRentalKPIs(properties);
      expect(kpis.activeCount).toBe(2);
      expect(kpis.soldCount).toBe(1);
      expect(kpis.totalRentalAssetValueZAR).toBe(3_500_000); // 2m + 1.5m
      expect(kpis.totalGrossMonthlyRentZAR).toBe(25_000); // 15k + 10k
      expect(kpis.totalAnnualGrossRentZAR).toBe(300_000); // 25k * 12
    });

    it('falls back to purchasePriceZAR when marketValueZAR is missing or 0', () => {
      const properties: RentalProperty[] = [
        {
          ...baseRental,
          id: 'p-1',
          status: 'Occupied',
          marketValueZAR: 0,
          purchasePriceZAR: 1_200_000,
          monthlyGrossRentZAR: 10_000,
        },
      ];

      const kpis = calculateAggregateRentalKPIs(properties);
      expect(kpis.totalRentalAssetValueZAR).toBe(1_200_000);
    });

    it('returns zeroes for an empty portfolio', () => {
      const kpis = calculateAggregateRentalKPIs([]);
      expect(kpis.activeCount).toBe(0);
      expect(kpis.soldCount).toBe(0);
      expect(kpis.totalRentalAssetValueZAR).toBe(0);
      expect(kpis.totalGrossMonthlyRentZAR).toBe(0);
      expect(kpis.totalAnnualGrossRentZAR).toBe(0);
    });

    it('handles undefined or null portfolio input safely without crashing', () => {
      const kpisUndefined = calculateAggregateRentalKPIs(undefined as any);
      expect(kpisUndefined.activeCount).toBe(0);
      expect(kpisUndefined.totalRentalAssetValueZAR).toBe(0);
    });
  });

  describe('Edge cases and boundary resilience', () => {
    it('handles negative cashflow combined with large bad debt write-offs and active Section 13sex shield safely', () => {
      const distressedProperty: RentalProperty = {
        ...baseRental,
        section13sexAnnualShieldZAR: 55_000,
        arrearsWriteOffs: [
          {
            id: 'wo-distressed-1',
            date: '2026-02-01',
            amountZAR: 30_000,
            reason: 'Uncollectable' as const,
            allocations: [],
            createdAt: '2026-02-01',
          },
        ],
      };

      // Negative cashflow: -R4,000/mo
      const result = calculateRentalTaxProvision(distressedProperty, -4_000);

      expect(result.annualCashflowZAR).toBe(0); // floored at 0
      expect(result.taxableIncomeZAR).toBe(0); // 0 - 30,000 - 55,000 floored at 0
      expect(result.annualTaxZAR).toBe(0);
      expect(result.monthlyTaxZAR).toBe(0);
      expect(result.taxSavingsZAR).toBe(0); // min(0, 55,000) * 0.27 = 0
      expect(result.postTaxCashflowZAR).toBe(-4_000);
      expect(result.yieldPostTaxPercent).toBeLessThan(0);
    });

    it('matches iGrow Rentals case-insensitively and with trailing whitespace for VAT exemption', () => {
      const resLower = calculateAgencyCommission(12_000, 8.0, true, 'igrow rentals');
      expect(resLower.vatApplied).toBe(false);
      expect(resLower.monthlyAgentFeeZAR).toBe(960); // 12,000 * 8% without 1.15x VAT

      const resMixedWithSpace = calculateAgencyCommission(12_000, 8.0, true, '  iGrow Rentals  ');
      expect(resMixedWithSpace.vatApplied).toBe(false);
      expect(resMixedWithSpace.monthlyAgentFeeZAR).toBe(960);
    });

    it('handles null property input returning zero tax defaults', () => {
      const result = calculateRentalTaxProvision(null as any, 5_000);
      expect(result.annualCashflowZAR).toBe(0);
      expect(result.taxableIncomeZAR).toBe(0);
      expect(result.annualTaxZAR).toBe(0);
      expect(result.postTaxCashflowZAR).toBe(0);
    });
  });
});

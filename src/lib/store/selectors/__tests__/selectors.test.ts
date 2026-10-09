import { describe, it, expect } from 'vitest';
import {
  computePortfolioSummary,
  computeEquityAlerts,
} from '../portfolioSummarySelector';
import { computeEquityAlerts as leafComputeEquityAlerts } from '../equityAlertsSelector';
import { RentalProperty } from '@/types';

describe('Portfolio Selectors: computeEquityAlerts & computePortfolioSummary', () => {
  const baseRental: RentalProperty = {
    id: 'base-prop-1',
    title: 'Base Property',
    address: '100 Main St',
    city: 'Johannesburg',
    propertyType: 'Sectional Title Apartment',
    marketValueZAR: 1_500_000,
    purchasePriceZAR: 1_200_000,
    purchaseDate: '2025-01-01',
    outstandingBondBalanceZAR: 900_000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 9500,
    monthlyGrossRentZAR: 14000,
    monthlyLeviesZAR: 1800,
    monthlyRatesTaxesZAR: 950,
    monthlyAgentFeeZAR: 1120,
    monthlyMaintenanceReserveZAR: 600,
    status: 'Occupied',
    leases: [],
    maintenanceHistory: [],
  };

  describe('computeEquityAlerts (BRRRR Equity Extraction)', () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 7);
    const sixMonthsAgoIso = sixMonthsAgo.toISOString().split('T')[0];

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
    const threeMonthsAgoIso = threeMonthsAgo.toISOString().split('T')[0];

    it('identifies stabilized BRRRR properties with LTV < 70% as ripe for equity extraction', () => {
      const ripeProperty: RentalProperty = {
        ...baseRental,
        id: 'brrrr-ripe-1',
        title: 'Craighall Park Flip-to-Rental',
        address: '10 Clarence Ave',
        propertyType: 'Freehold House',
        marketValueZAR: 2_000_000,
        purchasePriceZAR: 1_200_000,
        purchaseDate: sixMonthsAgoIso,
        outstandingBondBalanceZAR: 1_000_000, // LTV = 50% (< 70%)
        isBrrrrProperty: true,
        status: 'Occupied',
      };

      const alerts = computeEquityAlerts([ripeProperty]);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].propertyId).toBe('brrrr-ripe-1');
      expect(alerts[0].currentLTV).toBe(0.5);
      // 80% of 2M (1.6M) - 1.0M = 600,000 extractable
      expect(alerts[0].extractableEquityZAR).toBe(600_000);
      expect(alerts[0].isRipe).toBe(true);
      expect(alerts[0].monthsStabilized).toBeGreaterThanOrEqual(6);

      // Verify leaf selector matches re-exported selector exactly
      const leafAlerts = leafComputeEquityAlerts([ripeProperty]);
      expect(leafAlerts).toEqual(alerts);
    });

    it('filters out properties where isBrrrrProperty is false', () => {
      const nonBrrrr: RentalProperty = {
        ...baseRental,
        id: 'standard-rental',
        title: 'Standard Long-Term Buy & Hold',
        marketValueZAR: 2_000_000,
        purchasePriceZAR: 1_500_000,
        purchaseDate: sixMonthsAgoIso,
        outstandingBondBalanceZAR: 800_000, // LTV 40%
        isBrrrrProperty: false,
      };

      expect(computeEquityAlerts([nonBrrrr])).toHaveLength(0);
    });

    it('filters out properties with LTV >= 70%', () => {
      const highLtvBrrrr: RentalProperty = {
        ...baseRental,
        id: 'high-ltv',
        title: 'High LTV Asset',
        marketValueZAR: 1_000_000,
        purchasePriceZAR: 800_000,
        purchaseDate: sixMonthsAgoIso,
        outstandingBondBalanceZAR: 750_000, // LTV 75% >= 70%
        isBrrrrProperty: true,
      };

      expect(computeEquityAlerts([highLtvBrrrr])).toHaveLength(0);
    });

    it('filters out properties seasoned for less than 6 months', () => {
      const unseasonedBrrrr: RentalProperty = {
        ...baseRental,
        id: 'unseasoned',
        title: 'Recently Acquired BRRRR',
        marketValueZAR: 1_500_000,
        purchasePriceZAR: 1_000_000,
        purchaseDate: threeMonthsAgoIso,
        outstandingBondBalanceZAR: 600_000, // LTV 40% but < 6 months
        isBrrrrProperty: true,
      };

      expect(computeEquityAlerts([unseasonedBrrrr])).toHaveLength(0);
    });

    it('filters out Sold properties even if marked BRRRR', () => {
      const soldBrrrr: RentalProperty = {
        ...baseRental,
        id: 'sold-brrrr',
        title: 'Sold Exited Deal',
        marketValueZAR: 2_000_000,
        purchasePriceZAR: 1_000_000,
        purchaseDate: sixMonthsAgoIso,
        outstandingBondBalanceZAR: 500_000,
        isBrrrrProperty: true,
        status: 'Sold',
      };

      expect(computeEquityAlerts([soldBrrrr])).toHaveLength(0);
    });

    it('handles empty arrays, undefined inputs, and null array items safely', () => {
      expect(computeEquityAlerts([])).toEqual([]);
      expect(computeEquityAlerts(undefined as any)).toEqual([]);
      expect(computeEquityAlerts([null as any, undefined as any])).toEqual([]);
    });
  });

  describe('computePortfolioSummary resilience & aggregation', () => {
    it('returns zero-balanced summary for completely empty state without throwing', () => {
      const summary = computePortfolioSummary({
        rentals: [],
        flips: [],
        funding: [],
        liquidCapitalReserve: 0,
      });

      expect(summary.totalGrossAssetValue).toBe(0);
      expect(summary.totalRentalValue).toBe(0);
      expect(summary.totalFlipValue).toBe(0);
      expect(summary.liquidCapitalReserve).toBe(0);
      expect(summary.totalBondLiabilities).toBe(0);
      expect(summary.totalFundingLiabilities).toBe(0);
      expect(summary.netEquity).toBe(0);
      expect(summary.freeUnallocatedCash).toBe(0);
      expect(summary.activeRentalsCount).toBe(0);
      expect(summary.activeFlipsCount).toBe(0);
    });

    it('defensively handles null and undefined items within arrays without crashing', () => {
      const summary = computePortfolioSummary({
        rentals: [null as any],
        flips: [undefined as any],
        funding: [null as any],
        liquidCapitalReserve: 100_000,
      });

      expect(summary.totalGrossAssetValue).toBe(100_000);
      expect(summary.activeRentalsCount).toBe(0);
      expect(summary.activeFlipsCount).toBe(0);
      expect(summary.freeUnallocatedCash).toBe(100_000);
    });
  });
});

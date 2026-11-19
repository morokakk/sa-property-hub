import { describe, it, expect } from 'vitest';
import {
  calculateRentalHoldingCosts,
  calculate12MonthCollectionMetrics,
  calculate6MonthTrackRecordSummary,
  maskTenantName,
} from '../calculations/proposalMetrics';
import { calculateRentalCashflow } from '../calculations/propertyMetrics';
import { INITIAL_RENTALS } from '../store/initialData';
import { RentalProperty, Lease } from '@/types';
import { formatZAR } from '../formatters';

describe('Proposal Metrics & Rental Holding Costs Alignment', () => {
  const sandhurstRental = INITIAL_RENTALS.find((r) => r.id === 'rental-1')!;

  it('matches Sandhurst Executive Suite holding costs and net monthly cashflow with Rentals card (-R 2 152/m)', () => {
    expect(sandhurstRental).toBeDefined();

    const holdingCosts = calculateRentalHoldingCosts(sandhurstRental);
    const rentalCardCashflow = calculateRentalCashflow(sandhurstRental);

    // Verify itemized components
    expect(holdingCosts.monthlyBond).toBe(13_850);
    expect(holdingCosts.monthlyLevies).toBe(2_850);
    expect(holdingCosts.monthlyRates).toBe(1_450);
    expect(holdingCosts.monthlyOther).toBe(1_702 + 800); // agent fee (1702) + maintenance reserve (800)
    expect(holdingCosts.monthlyHoldingCost).toBe(20_652);

    // Net cashflow must match Rentals page display (-2 152)
    expect(holdingCosts.netMonthlyCashflow).toBe(-2_152);
    expect(holdingCosts.netMonthlyCashflow).toBe(rentalCardCashflow.netMonthlyCashflowZAR);

    // formatZAR output check
    expect(formatZAR(holdingCosts.netMonthlyCashflow)).toBe(formatZAR(-2_152));
    expect(formatZAR(holdingCosts.netMonthlyCashflow).replace(/\u00A0/g, ' ')).toBe('-R 2 152');
  });

  it('handles Freehold properties with insurance and zero levies in holding costs', () => {
    const freeholdProperty: RentalProperty = {
      ...sandhurstRental,
      id: 'rental-freehold-1',
      propertyType: 'Freehold House',
      monthlyLeviesZAR: 2_500, // Should be ignored (0) for Freehold
      annualBuildingInsuranceZAR: 12_000, // 1 000/mo
      monthlyBondPaymentZAR: 10_000,
      monthlyRatesTaxesZAR: 1_200,
      monthlyAgentFeeZAR: 1_500,
      monthlyMaintenanceReserveZAR: 500,
      monthlyPrepaidVendingFeeZAR: 150,
      monthlyGrossRentZAR: 15_000,
    };

    const holdingCosts = calculateRentalHoldingCosts(freeholdProperty);
    expect(holdingCosts.monthlyLevies).toBe(0);
    expect(holdingCosts.monthlyOther).toBe(1500 + 500 + 1000 + 150); // 3 150
    expect(holdingCosts.monthlyHoldingCost).toBe(10000 + 0 + 1200 + 3150); // 14 350
    expect(holdingCosts.netMonthlyCashflow).toBe(15000 - 14350); // 650
  });

  describe('POPIA Tenant Masking Defaults', () => {
    const mockLease: Lease = {
      id: 'lease-test-1',
      unitName: 'Main Suite',
      tenantName: 'Dr. Thabo Mokoena',
      tenantPhone: '+27 82 456 7890',
      tenantEmail: 'thabo@example.com',
      monthlyRentZAR: 18_500,
      depositHeldZAR: 37_000,
      annualEscalationPercent: 7.0,
      leaseStartDate: '2023-04-01',
      leaseEndDate: '2027-03-31',
      status: 'Occupied',
    };

    it('masks tenant name by default as "Unit [Name] — Tenant [Index]"', () => {
      const maskedName = maskTenantName(mockLease, 0, false);
      expect(maskedName).toBe('Main Suite — Tenant A');
      expect(maskedName).not.toContain('Thabo');
      expect(maskedName).not.toContain('Mokoena');
    });

    it('reveals real tenant name only when showRealName is true', () => {
      const revealedName = maskTenantName(mockLease, 0, true);
      expect(revealedName).toBe('Dr. Thabo Mokoena');
    });

    it('handles leases without custom unit names', () => {
      const genericLease: Lease = {
        ...mockLease,
        unitName: '',
      };
      const maskedName = maskTenantName(genericLease, 1, false);
      expect(maskedName).toBe('Unit 2 — Tenant B');
    });
  });

  describe('12-Month Collection Metrics and Vacancy Shortfall Override', () => {
    it('detects Sandhurst Executive Suite historical under-collection (<90%) and sets credit loss override', () => {
      // In October 2026, Sandhurst has payments in Feb-Sep and unpaid Oct (1 month overdue)
      const metrics = calculate12MonthCollectionMetrics(sandhurstRental, '2026-10-01');

      expect(metrics.collectionRate).toBeLessThan(90);
      expect(metrics.isCollectionRisk).toBe(true);
      expect(metrics.tenantArrears).toBe(18_500);
      expect(metrics.overdueMonths).toBe(1);

      // Vacancy rate should be overridden from default 5% to collection shortfall (100 - collectionRate)
      expect(metrics.adjustedVacancyRate).toBeGreaterThan(5);
      expect(metrics.adjustedVacancyRate).toBe(Math.max(5, Math.round(100 - metrics.collectionRate)));
    });

    it('defaults to 5% vacancy when collection rate is healthy (>=90%)', () => {
      const healthyRental: RentalProperty = {
        ...sandhurstRental,
        id: 'rental-healthy-1',
        paymentRecords: [
          {
            id: 'p1',
            propertyId: 'rental-healthy-1',
            leaseId: 'lease-1',
            periodMonth: '2026-08',
            paymentDate: '2026-08-01',
            amountReceivedZAR: 18_500,
            paymentMethod: 'EFT',
            createdAt: '2026-08-01T00:00:00Z',
          },
          {
            id: 'p2',
            propertyId: 'rental-healthy-1',
            leaseId: 'lease-1',
            periodMonth: '2026-09',
            paymentDate: '2026-09-01',
            amountReceivedZAR: 18_500,
            paymentMethod: 'EFT',
            createdAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'p3',
            propertyId: 'rental-healthy-1',
            leaseId: 'lease-1',
            periodMonth: '2026-10',
            paymentDate: '2026-10-01',
            amountReceivedZAR: 18_500,
            paymentMethod: 'EFT',
            createdAt: '2026-10-01T00:00:00Z',
          },
        ],
        utilityStatements: [],
        arrearsOpeningBalanceZAR: 0,
      };

      const metrics = calculate12MonthCollectionMetrics(healthyRental, '2026-10-01');
      expect(metrics.collectionRate).toBe(100);
      expect(metrics.isCollectionRisk).toBe(false);
      expect(metrics.adjustedVacancyRate).toBe(5);
    });
  });

  describe('6-Month Verified Track Record & Utility Recovery Summary', () => {
    it('computes 6-month collection rate, deduplicated verified bank refs, and net utility recovery', () => {
      const trackedRental: RentalProperty = {
        ...sandhurstRental,
        id: 'rental-6m-1',
        utilityType: 'hybrid',
        monthlyPrepaidVendingFeeZAR: 150,
        arrearsOpeningBalanceZAR: 0,
        leases: [
          {
            id: 'lease-6m-1',
            unitName: 'Unit 1',
            tenantName: 'Test Tenant',
            leaseStartDate: '2026-01-01',
            leaseEndDate: '2027-12-31',
            monthlyRentZAR: 10_000,
            depositHeldZAR: 10_000,
            annualEscalationPercent: 6,
            status: 'Occupied',
          },
        ],
        utilityStatements: [
          {
            id: 'u-1',
            statementDate: '2026-05-15',
            provider: 'City of Johannesburg',
            electricityZAR: 600,
            waterZAR: 300,
            refuseZAR: 0,
            sewerageZAR: 0,
            totalDueZAR: 900,
            parsedVia: 'manual',
            createdAt: '2026-05-15T00:00:00Z',
          },
          {
            id: 'u-2',
            statementDate: '2026-06-15',
            provider: 'City of Johannesburg',
            electricityZAR: 600,
            waterZAR: 300,
            refuseZAR: 0,
            sewerageZAR: 0,
            totalDueZAR: 900,
            parsedVia: 'manual',
            createdAt: '2026-06-15T00:00:00Z',
          },
          {
            id: 'u-3',
            statementDate: '2026-07-15',
            provider: 'City of Johannesburg',
            electricityZAR: 600,
            waterZAR: 300,
            refuseZAR: 0,
            sewerageZAR: 0,
            totalDueZAR: 900,
            parsedVia: 'manual',
            createdAt: '2026-07-15T00:00:00Z',
          },
          {
            id: 'u-4',
            statementDate: '2026-08-15',
            provider: 'City of Johannesburg',
            electricityZAR: 600,
            waterZAR: 300,
            refuseZAR: 0,
            sewerageZAR: 0,
            totalDueZAR: 900,
            parsedVia: 'manual',
            createdAt: '2026-08-15T00:00:00Z',
          },
          {
            id: 'u-5',
            statementDate: '2026-09-15',
            provider: 'City of Johannesburg',
            electricityZAR: 600,
            waterZAR: 300,
            refuseZAR: 0,
            sewerageZAR: 0,
            totalDueZAR: 900,
            parsedVia: 'manual',
            createdAt: '2026-09-15T00:00:00Z',
          },
          {
            id: 'u-6',
            statementDate: '2026-10-15',
            provider: 'City of Johannesburg',
            electricityZAR: 600,
            waterZAR: 300,
            refuseZAR: 0,
            sewerageZAR: 0,
            totalDueZAR: 900,
            parsedVia: 'manual',
            createdAt: '2026-10-15T00:00:00Z',
          },
        ],
        paymentRecords: [
          // Older than 6-month window (May-Oct 2026) -> should NOT be counted in verifiedRefCount
          {
            id: 'p-old',
            propertyId: 'rental-6m-1',
            leaseId: 'lease-6m-1',
            periodMonth: '2026-03',
            paymentDate: '2026-03-02',
            amountReceivedZAR: 10_000,
            paymentMethod: 'EFT',
            reference: 'FNB-OLD-001',
            createdAt: '2026-03-02T00:00:00Z',
          },
          // Multi-month split payment covering May & June -> single unique bank ref
          {
            id: 'p-split',
            propertyId: 'rental-6m-1',
            leaseId: 'lease-6m-1',
            periodMonth: '2026-05',
            paymentDate: '2026-05-02',
            amountReceivedZAR: 21_800,
            paymentMethod: 'EFT',
            reference: 'FNB-MAYJUN-2026',
            allocations: [
              { periodMonth: '2026-05', amountZAR: 10_900 },
              { periodMonth: '2026-06', amountZAR: 10_900 },
            ],
            createdAt: '2026-05-02T00:00:00Z',
          },
          {
            id: 'p-jul',
            propertyId: 'rental-6m-1',
            leaseId: 'lease-6m-1',
            periodMonth: '2026-07',
            paymentDate: '2026-07-02',
            amountReceivedZAR: 10_900,
            paymentMethod: 'Instant EFT / Card',
            reference: 'SBSA-JUL-2026',
            createdAt: '2026-07-02T00:00:00Z',
          },
          {
            id: 'p-aug',
            propertyId: 'rental-6m-1',
            leaseId: 'lease-6m-1',
            periodMonth: '2026-08',
            paymentDate: '2026-08-02',
            amountReceivedZAR: 10_900,
            paymentMethod: 'Cash Deposit',
            reference: '   ', // blank whitespace reference should NOT count
            createdAt: '2026-08-02T00:00:00Z',
          },
          {
            id: 'p-sep',
            propertyId: 'rental-6m-1',
            leaseId: 'lease-6m-1',
            periodMonth: '2026-09',
            paymentDate: '2026-09-02',
            amountReceivedZAR: 10_900,
            paymentMethod: 'EFT',
            reference: 'ABSA-SEP-2026',
            createdAt: '2026-09-02T00:00:00Z',
          },
          // October unpaid -> 5 of 6 months collected (54,500 / 65,400 = 83.3%)
        ],
      };

      const summary = calculate6MonthTrackRecordSummary(trackedRental, '2026-10-15');
      expect(summary.trackedMonths6m).toBe(6);
      expect(summary.totalBilled6m).toBe(65_400);
      expect(summary.totalCollected6m).toBe(54_500);
      expect(summary.sixMonthCollectionRatePercent).toBe(83.3);
      // p-split (deduplicated across 2 months), p-jul, p-sep -> 3 verified refs
      expect(summary.verifiedRefCount).toBe(3);
      // Avg monthly utilities billed (900) - prepaid vending fee (150) = 750
      expect(summary.netPrepaidUtilityRecoveryZAR).toBe(750);

      // Extended calculate12MonthCollectionMetrics returns identical 6-month fields
      const combined = calculate12MonthCollectionMetrics(trackedRental, '2026-10-15');
      expect(combined.sixMonthCollectionRatePercent).toBe(83.3);
      expect(combined.verifiedRefCount).toBe(3);
      expect(combined.netPrepaidUtilityRecoveryZAR).toBe(750);
    });

    it('returns negative monthly vending fee for prepaid sub-meter properties with no municipal recovery', () => {
      const prepaidRental: RentalProperty = {
        ...sandhurstRental,
        id: 'rental-prepaid-1',
        utilityType: 'prepaid_submeter',
        monthlyPrepaidVendingFeeZAR: 180,
        utilityStatements: [],
        paymentRecords: [],
      };

      const summary = calculate6MonthTrackRecordSummary(prepaidRental, '2026-10-15');
      expect(summary.netPrepaidUtilityRecoveryZAR).toBe(-180);
      expect(summary.sixMonthCollectionRatePercent).toBe(0);
      expect(summary.verifiedRefCount).toBe(0);
    });

    it('returns safe zero fallbacks with zero NaN when paymentRecords, leases, or rental are missing/empty', () => {
      const emptyRental: RentalProperty = {
        ...sandhurstRental,
        id: 'rental-empty-1',
        leases: [],
        monthlyGrossRentZAR: 0,
        paymentRecords: undefined,
        utilityStatements: undefined,
        monthlyPrepaidVendingFeeZAR: undefined,
      };

      const summaryEmpty = calculate6MonthTrackRecordSummary(emptyRental, '2026-10-15');
      expect(summaryEmpty.sixMonthCollectionRatePercent).toBe(0);
      expect(summaryEmpty.verifiedRefCount).toBe(0);
      expect(summaryEmpty.netPrepaidUtilityRecoveryZAR).toBe(0);
      expect(Number.isNaN(summaryEmpty.sixMonthCollectionRatePercent)).toBe(false);
      expect(Number.isNaN(summaryEmpty.verifiedRefCount)).toBe(false);
      expect(Number.isNaN(summaryEmpty.netPrepaidUtilityRecoveryZAR)).toBe(false);

      const summaryNull = calculate6MonthTrackRecordSummary(null, '2026-10-15');
      expect(summaryNull.sixMonthCollectionRatePercent).toBe(0);
      expect(summaryNull.verifiedRefCount).toBe(0);
      expect(summaryNull.netPrepaidUtilityRecoveryZAR).toBe(0);
    });
  });
});

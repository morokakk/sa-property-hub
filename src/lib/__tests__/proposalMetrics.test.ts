import { describe, it, expect } from 'vitest';
import {
  calculateRentalHoldingCosts,
  calculate12MonthCollectionMetrics,
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
      // In October 2026, Sandhurst has payments in Feb, Mar, Apr and unpaid May-Oct (6 months unpaid)
      const metrics = calculate12MonthCollectionMetrics(sandhurstRental, '2026-10-01');

      expect(metrics.collectionRate).toBeLessThan(90);
      expect(metrics.isCollectionRisk).toBe(true);
      expect(metrics.tenantArrears).toBe(111_000);
      expect(metrics.overdueMonths).toBe(6);

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
});

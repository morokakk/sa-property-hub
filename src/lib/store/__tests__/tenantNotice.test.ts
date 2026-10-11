import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { RentalProperty } from '@/types';

describe('Tenant Notice & Move-Out Archiving Engine', () => {
  beforeEach(() => {
    usePortfolioStore.getState().clearAllData();
  });

  const sampleSingleUnitProperty: RentalProperty = {
    id: 'prop-single-1',
    title: 'Rosebank Loft',
    address: '10 Oxford Rd, Rosebank',
    city: 'Johannesburg',
    propertyType: 'Sectional Title Apartment',
    marketValueZAR: 1_200_000,
    purchasePriceZAR: 1_000_000,
    purchaseDate: '2024-01-01',
    outstandingBondBalanceZAR: 800_000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 8_500,
    monthlyGrossRentZAR: 12_000,
    monthlyLeviesZAR: 1_800,
    monthlyRatesTaxesZAR: 900,
    monthlyAgentFeeZAR: 1_104,
    monthlyMaintenanceReserveZAR: 500,
    status: 'Occupied',
    leases: [
      {
        id: 'lease-s1',
        tenantName: 'John Doe',
        unitName: 'Unit 1',
        monthlyRentZAR: 12_000,
        depositHeldZAR: 12_000,
        annualEscalationPercent: 6,
        status: 'Occupied',
        leaseStartDate: '2025-01-01',
        leaseEndDate: '2026-12-31',
      },
    ],
    maintenanceHistory: [],
  };

  const sampleMultiUnitProperty: RentalProperty = {
    id: 'prop-multi-1',
    title: 'Bryanston Suites',
    address: '45 Ballyclare Dr, Bryanston',
    city: 'Johannesburg',
    propertyType: 'Multi-unit Commercial',
    marketValueZAR: 3_500_000,
    purchasePriceZAR: 3_000_000,
    purchaseDate: '2024-01-01',
    outstandingBondBalanceZAR: 2_200_000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 23_000,
    monthlyGrossRentZAR: 28_000,
    monthlyLeviesZAR: 3_500,
    monthlyRatesTaxesZAR: 2_000,
    monthlyAgentFeeZAR: 2_576,
    monthlyMaintenanceReserveZAR: 1_200,
    status: 'Occupied',
    leases: [
      {
        id: 'lease-m1',
        tenantName: 'Tenant One',
        unitName: 'Suite A',
        monthlyRentZAR: 14_000,
        depositHeldZAR: 14_000,
        annualEscalationPercent: 6,
        status: 'Occupied',
        leaseStartDate: '2025-01-01',
        leaseEndDate: '2026-12-31',
      },
      {
        id: 'lease-m2',
        tenantName: 'Tenant Two',
        unitName: 'Suite B',
        monthlyRentZAR: 14_000,
        depositHeldZAR: 14_000,
        annualEscalationPercent: 6,
        status: 'Occupied',
        leaseStartDate: '2025-01-01',
        leaseEndDate: '2026-12-31',
      },
    ],
    maintenanceHistory: [],
  };

  describe('markTenantNotice & cancelTenantNotice', () => {
    it('marks single unit property as Notice Given and records notice details', () => {
      usePortfolioStore.getState().addRental(sampleSingleUnitProperty);

      usePortfolioStore.getState().markTenantNotice('prop-single-1', 'lease-s1', {
        noticeGivenDate: '2026-10-01',
        vacationDate: '2026-10-31',
        noticeReason: 'tenant_notice_early_termination',
        noticeNotes: 'Tenant relocating to Cape Town',
      });

      const prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-single-1')!;
      expect(prop.status).toBe('Notice Given');
      expect(prop.leases[0].status).toBe('Notice Given');
      expect(prop.leases[0].noticeGivenDate).toBe('2026-10-01');
      expect(prop.leases[0].vacationDate).toBe('2026-10-31');
      expect(prop.leases[0].noticeReason).toBe('tenant_notice_early_termination');
      expect(prop.leases[0].noticeNotes).toBe('Tenant relocating to Cape Town');
    });

    it('reconciles multi-unit property status to Notice Given when one unit gives notice while other stays occupied', () => {
      usePortfolioStore.getState().addRental(sampleMultiUnitProperty);

      usePortfolioStore.getState().markTenantNotice('prop-multi-1', 'lease-m1', {
        noticeGivenDate: '2026-10-01',
        vacationDate: '2026-10-31',
        noticeReason: 'tenant_notice_expired',
      });

      const prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-multi-1')!;
      expect(prop.status).toBe('Notice Given');
      expect(prop.leases.find((l) => l.id === 'lease-m1')?.status).toBe('Notice Given');
      expect(prop.leases.find((l) => l.id === 'lease-m2')?.status).toBe('Occupied');
    });

    it('cancels tenant notice and restores status to Occupied', () => {
      usePortfolioStore.getState().addRental(sampleSingleUnitProperty);

      usePortfolioStore.getState().markTenantNotice('prop-single-1', 'lease-s1', {
        noticeGivenDate: '2026-10-01',
        vacationDate: '2026-10-31',
        noticeReason: 'tenant_notice_early_termination',
      });

      usePortfolioStore.getState().cancelTenantNotice('prop-single-1', 'lease-s1');

      const prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-single-1')!;
      expect(prop.status).toBe('Occupied');
      expect(prop.leases[0].status).toBe('Occupied');
      expect(prop.leases[0].noticeGivenDate).toBeUndefined();
      expect(prop.leases[0].vacationDate).toBeUndefined();
      expect(prop.leases[0].noticeReason).toBeUndefined();
    });
  });

  describe('finalizeTenantMoveOut', () => {
    it('archives lease and marks single-unit property as Vacant in vacant mode', () => {
      usePortfolioStore.getState().addRental(sampleSingleUnitProperty);

      usePortfolioStore.getState().finalizeTenantMoveOut('prop-single-1', 'lease-s1', {
        action: 'vacant',
        vacationDate: '2026-10-15',
        departureReason: 'lease_expired_vacated',
        forwardingNotes: 'Deposit retained for repainting bedroom',
      });

      const prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-single-1')!;
      expect(prop.status).toBe('Vacant');
      expect(prop.leases).toHaveLength(1);
      expect(prop.leases[0].status).toBe('Vacant');
      expect(prop.leases[0].tenantName).toBe('Vacant');

      // Verify archived leases
      expect(prop.archivedLeases).toHaveLength(1);
      const archived = prop.archivedLeases![0];
      expect(archived.id).toBe('lease-s1');
      expect(archived.tenantName).toBe('John Doe');
      expect(archived.vacationDate).toBe('2026-10-15');
      expect(archived.departureReason).toBe('lease_expired_vacated');
      expect(archived.forwardingNotes).toBe('Deposit retained for repainting bedroom');
      expect(archived.archivedAt).toBeDefined();
    });

    it('sets multi-unit property to Partially Vacant when one unit vacates in vacant mode', () => {
      usePortfolioStore.getState().addRental(sampleMultiUnitProperty);

      usePortfolioStore.getState().finalizeTenantMoveOut('prop-multi-1', 'lease-m1', {
        action: 'vacant',
        vacationDate: '2026-10-15',
        departureReason: 'tenant_notice_early_termination',
      });

      const prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-multi-1')!;
      expect(prop.status).toBe('Partially Vacant');
      expect(prop.leases.find((l) => l.unitName === 'Suite A')?.status).toBe('Vacant');
      expect(prop.leases.find((l) => l.unitName === 'Suite B')?.status).toBe('Occupied');
      expect(prop.archivedLeases).toHaveLength(1);
      expect(prop.archivedLeases![0].tenantName).toBe('Tenant One');
    });

    it('seamlessly transitions to incoming replacement tenant in replacement mode', () => {
      usePortfolioStore.getState().addRental(sampleSingleUnitProperty);

      usePortfolioStore.getState().finalizeTenantMoveOut('prop-single-1', 'lease-s1', {
        action: 'replacement',
        vacationDate: '2026-10-15',
        departureReason: 'lease_expired_vacated',
        replacementLease: {
          tenantName: 'Alice Springs',
          unitName: 'Unit 1',
          monthlyRentZAR: 13_000,
          depositHeldZAR: 13_000,
          annualEscalationPercent: 7,
          leaseStartDate: '2026-10-16',
          leaseEndDate: '2027-10-31',
          status: 'Occupied',
        },
      });

      const prop = usePortfolioStore.getState().rentals.find((r) => r.id === 'prop-single-1')!;
      expect(prop.status).toBe('Occupied');
      expect(prop.leases).toHaveLength(1);
      expect(prop.leases[0].tenantName).toBe('Alice Springs');
      expect(prop.leases[0].monthlyRentZAR).toBe(13_000);
      expect(prop.leases[0].status).toBe('Occupied');

      // Outgoing tenant archived
      expect(prop.archivedLeases).toHaveLength(1);
      expect(prop.archivedLeases![0].id).toBe('lease-s1');
      expect(prop.archivedLeases![0].tenantName).toBe('John Doe');
      expect(prop.archivedLeases![0].vacationDate).toBe('2026-10-15');
    });
  });
});

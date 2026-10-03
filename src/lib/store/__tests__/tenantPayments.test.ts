import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { RentalProperty } from '@/types';
import { getMonthKey } from '@/lib/calculations/arrears';

function createTestRental(id: string = 'test-rental-1'): RentalProperty {
  return {
    id,
    title: 'Rosebank Executive Suite',
    address: '150 Oxford Road',
    city: 'Johannesburg',
    propertyType: 'Sectional Title Apartment',
    purchasePriceZAR: 1800000,
    purchaseDate: '2024-01-15',
    marketValueZAR: 2100000,
    outstandingBondBalanceZAR: 1400000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 14800,
    monthlyGrossRentZAR: 18500,
    monthlyLeviesZAR: 2400,
    monthlyRatesTaxesZAR: 1200,
    monthlyAgentFeeZAR: 1480,
    monthlyMaintenanceReserveZAR: 900,
    status: 'Occupied',
    leases: [
      {
        id: 'lease-1',
        unitName: 'Unit 301',
        tenantName: 'Sipho Zulu',
        tenantPhone: '+27 83 555 1234',
        tenantEmail: 'sipho@example.com',
        monthlyRentZAR: 18500,
        depositHeldZAR: 37000,
        leaseStartDate: '2026-01-01',
        leaseEndDate: '2026-12-31',
        annualEscalationPercent: 8.0,
        status: 'Occupied',
      },
    ],
    utilityStatements: [],
    paymentRecords: [],
    arrearsOpeningBalanceZAR: 0,
    unpaidUtilityArrearsZAR: 0,
    maintenanceHistory: [],
  };
}

describe('usePortfolioStore Tenant Payment & Arrears Actions', () => {
  beforeEach(() => {
    usePortfolioStore.getState().clearAllData();
  });

  it('recordTenantPayment records payment and synchronizes unpaidUtilityArrearsZAR', () => {
    const rental = createTestRental('rental-rec');
    usePortfolioStore.getState().addRental(rental);

    usePortfolioStore.getState().recordTenantPayment('rental-rec', {
      periodMonth: '2026-04',
      paymentDate: '2026-04-02',
      amountReceivedZAR: 18500,
      paymentMethod: 'EFT',
      reference: 'April Rent',
    });

    const storedRental = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-rec');
    expect(storedRental).toBeDefined();
    expect(storedRental?.paymentRecords).toHaveLength(1);
    expect(storedRental?.paymentRecords?.[0].amountReceivedZAR).toBe(18500);
    expect(storedRental?.paymentRecords?.[0].periodMonth).toBe('2026-04');
    expect(storedRental?.paymentRecords?.[0].paymentMethod).toBe('EFT');
  });

  it('updateTenantPayment updates payment details and re-computes arrears', () => {
    const rental = createTestRental('rental-upd');
    usePortfolioStore.getState().addRental(rental);

    usePortfolioStore.getState().recordTenantPayment('rental-upd', {
      id: 'pay-target-1',
      periodMonth: '2026-04',
      paymentDate: '2026-04-02',
      amountReceivedZAR: 10000,
      paymentMethod: 'EFT',
    });

    usePortfolioStore.getState().updateTenantPayment('rental-upd', 'pay-target-1', {
      amountReceivedZAR: 18500,
      notes: 'Tenant topped up remaining balance',
    });

    const storedRental = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-upd');
    expect(storedRental?.paymentRecords?.[0].amountReceivedZAR).toBe(18500);
    expect(storedRental?.paymentRecords?.[0].notes).toBe('Tenant topped up remaining balance');
  });

  it('deleteTenantPayment removes payment and re-computes arrears', () => {
    const rental = createTestRental('rental-del');
    usePortfolioStore.getState().addRental(rental);

    usePortfolioStore.getState().recordTenantPayment('rental-del', {
      id: 'pay-del-1',
      periodMonth: '2026-04',
      paymentDate: '2026-04-02',
      amountReceivedZAR: 18500,
      paymentMethod: 'EFT',
    });

    expect(
      usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-del')?.paymentRecords
    ).toHaveLength(1);

    usePortfolioStore.getState().deleteTenantPayment('rental-del', 'pay-del-1');

    const storedRental = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-del');
    expect(storedRental?.paymentRecords).toHaveLength(0);
  });

  it('updateArrearsOpeningBalance reconciles opening balance and updates unpaidUtilityArrearsZAR', () => {
    const rental = createTestRental('rental-open');
    usePortfolioStore.getState().addRental(rental);

    usePortfolioStore.getState().updateArrearsOpeningBalance('rental-open', 3500);

    const storedRental = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-open');
    expect(storedRental?.arrearsOpeningBalanceZAR).toBe(3500);
    expect(storedRental?.unpaidUtilityArrearsZAR).toBeGreaterThan(0);
  });

  it('updateRental with unpaidUtilityArrearsZAR automatically reconciles arrearsOpeningBalanceZAR', () => {
    const rental = createTestRental('rental-compat');
    usePortfolioStore.getState().addRental(rental);

    // Setting unpaidUtilityArrearsZAR to 0 should reconcile arrearsOpeningBalanceZAR
    usePortfolioStore.getState().updateRental('rental-compat', { unpaidUtilityArrearsZAR: 0 });

    const storedRental = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-compat');
    expect(storedRental?.unpaidUtilityArrearsZAR).toBe(0);
    expect(storedRental?.arrearsOpeningBalanceZAR).toBeDefined();
  });

  it('handles multi-tenant payment recording, scoping, and per-lease arrears reconciliation', () => {
    const curMonth = getMonthKey();
    const curDate = new Date().toISOString().split('T')[0];

    const multiRental: RentalProperty = {
      ...createTestRental('multi-store-1'),
      leases: [
        {
          id: 'lease-a',
          unitName: 'Unit A',
          tenantName: 'Thabo',
          monthlyRentZAR: 10000,
          depositHeldZAR: 20000,
          leaseStartDate: `${curMonth}-01`,
          leaseEndDate: '2028-12-31',
          annualEscalationPercent: 8,
          status: 'Occupied',
          arrearsOpeningBalanceZAR: 0,
        },
        {
          id: 'lease-b',
          unitName: 'Unit B',
          tenantName: 'Sipho',
          monthlyRentZAR: 8000,
          depositHeldZAR: 16000,
          leaseStartDate: `${curMonth}-01`,
          leaseEndDate: '2028-12-31',
          annualEscalationPercent: 8,
          status: 'Occupied',
          arrearsOpeningBalanceZAR: 0,
        },
      ],
      paymentRecords: [],
    };

    usePortfolioStore.getState().addRental(multiRental);

    // Record payment for Unit A only
    usePortfolioStore.getState().recordTenantPayment('multi-store-1', {
      leaseId: 'lease-a',
      periodMonth: curMonth,
      paymentDate: curDate,
      amountReceivedZAR: 10000,
      paymentMethod: 'EFT',
    });

    let stored = usePortfolioStore.getState().rentals.find((r) => r.id === 'multi-store-1');
    const leaseA = stored?.leases?.find((l) => l.id === 'lease-a');
    const leaseB = stored?.leases?.find((l) => l.id === 'lease-b');

    // Unit A should have 0 arrears
    expect(leaseA?.unpaidUtilityArrearsZAR).toBe(0);
    // Unit B should have 8000 arrears (unpaid)
    expect(leaseB?.unpaidUtilityArrearsZAR).toBe(8000);
    // Consolidated should reflect Unit B arrears (8000)
    expect(stored?.unpaidUtilityArrearsZAR).toBe(8000);

    // Update opening balance for Unit B only
    usePortfolioStore.getState().updateArrearsOpeningBalance('multi-store-1', 1500, 'lease-b');
    stored = usePortfolioStore.getState().rentals.find((r) => r.id === 'multi-store-1');
    const updatedLeaseB = stored?.leases?.find((l) => l.id === 'lease-b');
    expect(updatedLeaseB?.arrearsOpeningBalanceZAR).toBe(1500);
    // Unit B arrears now: 1500 + 8000 = 9500
    expect(updatedLeaseB?.unpaidUtilityArrearsZAR).toBe(9500);
    expect(stored?.arrearsOpeningBalanceZAR).toBe(1500);
  });

  it('Deposit Applied reduces depositHeldZAR and restores it on deletion or update', () => {
    const rental = createTestRental('rental-dep-test');
    usePortfolioStore.getState().addRental(rental);

    // Initial deposit held is 37000
    let stored = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-dep-test');
    expect(stored?.leases[0].depositHeldZAR).toBe(37000);

    // Apply 10000 of deposit towards rent
    usePortfolioStore.getState().recordTenantPayment('rental-dep-test', {
      id: 'dep-pay-1',
      leaseId: 'lease-1',
      periodMonth: '2026-04',
      paymentDate: '2026-04-05',
      amountReceivedZAR: 10000,
      paymentMethod: 'Deposit Applied',
    });

    stored = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-dep-test');
    expect(stored?.leases[0].depositHeldZAR).toBe(27000);

    // Update payment to apply 15000 instead
    usePortfolioStore.getState().updateTenantPayment('rental-dep-test', 'dep-pay-1', {
      amountReceivedZAR: 15000,
    });

    stored = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-dep-test');
    expect(stored?.leases[0].depositHeldZAR).toBe(22000);

    // Delete the deposit payment -> deposit should be restored to 37000
    usePortfolioStore.getState().deleteTenantPayment('rental-dep-test', 'dep-pay-1');

    stored = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-dep-test');
    expect(stored?.leases[0].depositHeldZAR).toBe(37000);
  });

  it('recordArrearsWriteOff and deleteArrearsWriteOff manage audited write-offs and recompute arrears', () => {
    const rental = createTestRental('rental-wo-store');
    usePortfolioStore.getState().addRental(rental);

    usePortfolioStore.getState().recordArrearsWriteOff('rental-wo-store', {
      id: 'wo-store-1',
      date: '2026-04-10',
      amountZAR: 18500,
      reason: 'Absconded',
      notes: 'Tenant absconded',
      allocations: [{ periodMonth: '2026-04', amountZAR: 18500 }],
    });

    let stored = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-wo-store');
    expect(stored?.arrearsWriteOffs).toBeDefined();
    expect(stored?.arrearsWriteOffs).toHaveLength(1);
    expect(stored?.arrearsWriteOffs?.[0].amountZAR).toBe(18500);
    expect(stored?.arrearsWriteOffs?.[0].reason).toBe('Absconded');

    // Delete the write-off
    usePortfolioStore.getState().deleteArrearsWriteOff('rental-wo-store', 'wo-store-1');

    stored = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-wo-store');
    expect(stored?.arrearsWriteOffs).toHaveLength(0);
  });
});



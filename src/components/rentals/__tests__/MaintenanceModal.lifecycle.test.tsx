import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  MaintenanceModal,
  STATUS_BADGE_CLASSES,
  nextWorkOrderStatus,
  deriveStatusFromCost,
} from '../modals/MaintenanceModal';
import { RentalProperty } from '@/types';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

const mockRental: RentalProperty = {
  id: 'rental-test-1',
  title: 'Sandton Executive Suite 4',
  address: '10 Rivonia Road',
  city: 'Johannesburg',
  propertyType: 'Sectional Title Apartment',
  marketValueZAR: 1_200_000,
  purchasePriceZAR: 1_000_000,
  purchaseDate: '2025-01-01',
  outstandingBondBalanceZAR: 800_000,
  bondInterestRatePercent: 11.75,
  monthlyBondPaymentZAR: 8500,
  monthlyGrossRentZAR: 12000,
  monthlyLeviesZAR: 1500,
  monthlyRatesTaxesZAR: 900,
  monthlyAgentFeeZAR: 960,
  monthlyMaintenanceReserveZAR: 600,
  status: 'Occupied',
  leases: [
    {
      id: 'lease-test-1',
      unitName: 'Unit 4',
      tenantName: 'Sipho Zulu',
      tenantPhone: '+27 82 111 2222',
      leaseStartDate: '2025-01-01',
      leaseEndDate: '2025-12-31',
      monthlyRentZAR: 12000,
      depositHeldZAR: 24000,
      annualEscalationPercent: 7,
      status: 'Occupied',
    },
  ],
  maintenanceHistory: [
    {
      id: 'maint-1',
      dateLogged: '2026-11-01',
      issueDescription: 'Kitchen basin mixer tap dripping',
      category: 'Plumbing',
      contractorName: 'Rapid Response Plumbing',
      costZAR: 0,
      status: 'Open',
      reportedByTenant: true,
      invoiceRef: 'WO-1001',
    },
    {
      id: 'maint-2',
      dateLogged: '2026-10-15',
      issueDescription: 'Aircon capacitor replacement',
      category: 'Appliance',
      contractorName: 'Cooling Masters',
      costZAR: 1450,
      status: 'In Progress',
    },
    {
      id: 'maint-3',
      dateLogged: '2026-09-10',
      issueDescription: 'Main circuit breaker replaced',
      category: 'Electrical',
      contractorName: 'Sparky Electrical',
      costZAR: 950,
      status: 'Resolved',
      invoiceRef: 'INV-7721',
    },
  ],
};

describe('MaintenanceModal & Work Order Lifecycle', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      rentals: [mockRental],
      suppliers: [
        {
          id: 'sup-1',
          name: 'Rapid Response Plumbing',
          category: 'Specialist Contractor',
          branchLocation: 'Sandton',
          phone: '+27 82 333 4444',
          rating: 5,
        },
      ],
      investorProfile: {
        entityName: 'Apex Capital Properties',
        contactNumber: '+27 82 000 1111',
      } as any,
    });
  });

  it('cycles work order status through Open -> In Progress -> Resolved', () => {
    expect(nextWorkOrderStatus('Open')).toBe('In Progress');
    expect(nextWorkOrderStatus('In Progress')).toBe('Resolved');
    expect(nextWorkOrderStatus('Resolved')).toBe('Open');
  });

  it('derives default status from cost in form (Open if 0, Resolved if > 0)', () => {
    expect(deriveStatusFromCost(0)).toBe('Open');
    expect(deriveStatusFromCost(-5)).toBe('Open');
    expect(deriveStatusFromCost(1500)).toBe('Resolved');
  });

  it('provides color-coded status badge styles for Amber, Blue, and Emerald', () => {
    expect(STATUS_BADGE_CLASSES.Open).toContain('bg-amber-100');
    expect(STATUS_BADGE_CLASSES.Open).toContain('text-amber-800');

    expect(STATUS_BADGE_CLASSES['In Progress']).toContain('bg-blue-100');
    expect(STATUS_BADGE_CLASSES['In Progress']).toContain('text-blue-800');

    expect(STATUS_BADGE_CLASSES.Resolved).toContain('bg-emerald-100');
    expect(STATUS_BADGE_CLASSES.Resolved).toContain('text-emerald-800');
  });

  it('renders all work orders with status badges and tenant reported flag', () => {
    const html = renderToString(
      <MaintenanceModal
        isOpen={true}
        property={mockRental}
        onClose={vi.fn()}
      />
    );

    // Title and work orders
    expect(html).toContain('Maintenance History:');
    expect(html).toContain('Sandton Executive Suite 4');
    expect(html).toContain('Kitchen basin mixer tap dripping');
    expect(html).toContain('Aircon capacitor replacement');
    expect(html).toContain('Main circuit breaker replaced');

    // Color-coded badges & status labels
    expect(html).toContain('Open');
    expect(html).toContain('In Progress');
    expect(html).toContain('Resolved');

    // Tenant reported badge
    expect(html).toContain('Tenant Reported');

    // Contractor dispatch buttons
    expect(html).toContain('Dispatch to Contractor (WhatsApp)');

    // Form controls
    expect(html).toContain('Log New Work Order / Expense');
    expect(html).toContain('Reported by Tenant');
  });

  it('supports updating and deleting maintenance logs in rentalSlice', () => {
    const store = usePortfolioStore.getState();

    // 1. Update log
    store.updateMaintenanceLog('rental-test-1', 'maint-1', {
      costZAR: 650,
      status: 'Resolved',
    });

    let updatedRental = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-test-1')!;
    const updatedLog = updatedRental.maintenanceHistory.find((m) => m.id === 'maint-1')!;
    expect(updatedLog.costZAR).toBe(650);
    expect(updatedLog.status).toBe('Resolved');

    // 2. Delete log
    store.deleteMaintenanceLog('rental-test-1', 'maint-2');
    updatedRental = usePortfolioStore.getState().rentals.find((r) => r.id === 'rental-test-1')!;
    expect(updatedRental.maintenanceHistory.some((m) => m.id === 'maint-2')).toBe(false);
    expect(updatedRental.maintenanceHistory).toHaveLength(2);
  });
});

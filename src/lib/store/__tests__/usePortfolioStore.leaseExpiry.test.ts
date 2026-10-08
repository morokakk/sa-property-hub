import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore, syncLeaseExpiryTasks } from '../usePortfolioStore';
import { RentalProperty, TaskItem } from '@/types';

describe('Lease Expiry Automated Task Engine', () => {
  beforeEach(() => {
    usePortfolioStore.getState().clearAllData();
  });

  const getFutureDate = (daysAhead: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  const getPastDate = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  describe('syncLeaseExpiryTasks standalone utility', () => {
    it('creates a high-priority task 60 days before leaseEndDate for future leases', () => {
      const leaseEnd = getFutureDate(90);
      const expectedDue = getFutureDate(30);

      const tasks = syncLeaseExpiryTasks([], 'prop-1', 'Rivonia Heights', [
        {
          id: 'lease-101',
          tenantName: 'Sipho Zulu',
          unitName: 'Unit 2A',
          monthlyRentZAR: 8500,
          depositHeldZAR: 8500,
          annualEscalationPercent: 0,
          status: 'Occupied',
          leaseStartDate: '2025-01-01',
          leaseEndDate: leaseEnd,
        },
      ]);

      expect(tasks).toHaveLength(1);
      const task = tasks[0];
      expect(task.id).toBe('task-lease-expiry-lease-101');
      expect(task.priority).toBe('High');
      expect(task.status).toBe('Pending');
      expect(task.dueDate).toBe(expectedDue);
      expect(task.title).toContain('Lease Expiry: Sipho Zulu at Rivonia Heights - Unit 2A');
      expect(task.description).toContain(`Lease expires on ${leaseEnd}`);
      expect(task.linkedEntity?.id).toBe('prop-1');
    });

    it('sets dueDate to today if 60-day reminder date is already in the past but lease has not expired yet', () => {
      // Lease expires in 20 days: 60-day reminder would have been 40 days ago
      const leaseEnd = getFutureDate(20);
      const today = new Date().toISOString().split('T')[0];

      const tasks = syncLeaseExpiryTasks([], 'prop-1', 'Rivonia Heights', [
        {
          id: 'lease-urgent',
          tenantName: 'Lerato Khumalo',
          unitName: 'Unit 5',
          monthlyRentZAR: 11000,
          depositHeldZAR: 11000,
          annualEscalationPercent: 0,
          status: 'Occupied',
          leaseStartDate: '2025-01-01',
          leaseEndDate: leaseEnd,
        },
      ]);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].dueDate).toBe(today);
      expect(tasks[0].priority).toBe('High');
    });

    it('removes pending lease expiry task if lease has expired in the past (< today)', () => {
      const pastEnd = getPastDate(10);
      const initialTask: TaskItem = {
        id: 'task-lease-expiry-lease-expired',
        title: 'Lease Expiry: Old Tenant',
        description: 'Lease expires on 2026-01-01',
        dueDate: '2025-11-01',
        priority: 'High',
        status: 'Pending',
        createdAt: '2025-01-01T00:00:00.000Z',
        linkedEntity: { type: 'rental', id: 'prop-1', name: 'Rivonia Heights' },
      };

      const tasks = syncLeaseExpiryTasks([initialTask], 'prop-1', 'Rivonia Heights', [
        {
          id: 'lease-expired',
          tenantName: 'Old Tenant',
          unitName: 'Unit 1',
          monthlyRentZAR: 7000,
          depositHeldZAR: 7000,
          annualEscalationPercent: 0,
          status: 'Occupied',
          leaseStartDate: '2025-01-01',
          leaseEndDate: pastEnd,
        },
      ]);

      expect(tasks).toHaveLength(0);
    });

    it('prevents duplicates and preserves task completion when leaseEndDate has not changed', () => {
      const leaseEnd = getFutureDate(120);
      const tasksFirstSync = syncLeaseExpiryTasks([], 'prop-1', 'Rivonia Heights', [
        {
          id: 'lease-completed-test',
          tenantName: 'Nandi Ndlovu',
          unitName: 'Unit 3',
          monthlyRentZAR: 9000,
          depositHeldZAR: 9000,
          annualEscalationPercent: 0,
          status: 'Occupied',
          leaseStartDate: '2025-01-01',
          leaseEndDate: leaseEnd,
        },
      ]);

      expect(tasksFirstSync).toHaveLength(1);
      // Mark as completed
      const completedTask: TaskItem = { ...tasksFirstSync[0], status: 'Completed' };

      // Re-sync with same leaseEndDate
      const tasksSecondSync = syncLeaseExpiryTasks([completedTask], 'prop-1', 'Rivonia Heights', [
        {
          id: 'lease-completed-test',
          tenantName: 'Nandi Ndlovu',
          unitName: 'Unit 3',
          monthlyRentZAR: 9500, // rent changed, but leaseEndDate is identical
          depositHeldZAR: 9500,
          annualEscalationPercent: 0,
          status: 'Occupied',
          leaseStartDate: '2025-01-01',
          leaseEndDate: leaseEnd,
        },
      ]);

      expect(tasksSecondSync).toHaveLength(1);
      expect(tasksSecondSync[0].status).toBe('Completed');
    });

    it('resets status to Pending if leaseEndDate changes on an existing task', () => {
      const initialLeaseEnd = getFutureDate(40);
      const updatedLeaseEnd = getFutureDate(180);

      const initialTask: TaskItem = {
        id: 'task-lease-expiry-lease-extend',
        title: 'Lease Expiry: Tenant at Prop',
        description: `Lease expires on ${initialLeaseEnd}. Initiate renewal discussions...`,
        dueDate: getPastDate(20),
        priority: 'High',
        status: 'Completed',
        createdAt: '2025-01-01T00:00:00.000Z',
        linkedEntity: { type: 'rental', id: 'prop-1', name: 'Rivonia Heights' },
      };

      const updatedTasks = syncLeaseExpiryTasks([initialTask], 'prop-1', 'Rivonia Heights', [
        {
          id: 'lease-extend',
          tenantName: 'Tenant',
          unitName: 'Unit 1',
          monthlyRentZAR: 8000,
          depositHeldZAR: 8000,
          annualEscalationPercent: 0,
          status: 'Occupied',
          leaseStartDate: '2025-01-01',
          leaseEndDate: updatedLeaseEnd,
        },
      ]);

      expect(updatedTasks).toHaveLength(1);
      expect(updatedTasks[0].status).toBe('Pending');
      expect(updatedTasks[0].description).toContain(`Lease expires on ${updatedLeaseEnd}`);
    });
  });

  describe('Integration with usePortfolioStore store actions', () => {
    const baseRental: RentalProperty = {
      id: 'rental-store-test-1',
      title: 'Fourways Family Villa',
      address: '12 Willow Ave',
      city: 'Johannesburg',
      propertyType: 'Freehold House',
      marketValueZAR: 1650000,
      purchasePriceZAR: 1500000,
      purchaseDate: '2024-01-15',
      outstandingBondBalanceZAR: 1200000,
      bondInterestRatePercent: 11.5,
      monthlyBondPaymentZAR: 12500,
      monthlyGrossRentZAR: 15000,
      monthlyLeviesZAR: 1200,
      monthlyRatesTaxesZAR: 800,
      monthlyAgentFeeZAR: 0,
      monthlyMaintenanceReserveZAR: 500,
      maintenanceHistory: [],
      status: 'Occupied',
      leases: [],
    };

    it('automatically generates lease expiry tasks upon addRental', () => {
      const leaseEnd = getFutureDate(100);
      const rentalWithLease: RentalProperty = {
        ...baseRental,
        leases: [
          {
            id: 'lease-villa-1',
            tenantName: 'Bongani Sithole',
            unitName: 'Main House',
            monthlyRentZAR: 15000,
            depositHeldZAR: 15000,
            annualEscalationPercent: 0,
            status: 'Occupied',
            leaseStartDate: '2025-01-01',
            leaseEndDate: leaseEnd,
          },
        ],
      };

      usePortfolioStore.getState().addRental(rentalWithLease);

      const tasks = usePortfolioStore.getState().tasks;
      const expiryTask = tasks.find((t) => t.id === 'task-lease-expiry-lease-villa-1');
      expect(expiryTask).toBeDefined();
      expect(expiryTask?.priority).toBe('High');
      expect(expiryTask?.title).toContain('Lease Expiry: Bongani Sithole at Fourways Family Villa');
    });

    it('updates expiry tasks and prevents duplicate explosion on updateRental', () => {
      const leaseEnd = getFutureDate(75);
      const rental: RentalProperty = {
        ...baseRental,
        id: 'rental-update-test',
        leases: [
          {
            id: 'lease-update-1',
            tenantName: 'Kagiso Rabada',
            unitName: 'Unit A',
            monthlyRentZAR: 12000,
            depositHeldZAR: 12000,
            annualEscalationPercent: 0,
            status: 'Occupied',
            leaseStartDate: '2025-01-01',
            leaseEndDate: leaseEnd,
          },
        ],
      };

      usePortfolioStore.getState().addRental(rental);
      expect(usePortfolioStore.getState().tasks.filter((t) => t.id.startsWith('task-lease-expiry-'))).toHaveLength(1);

      // Perform multiple updates to rental details (e.g. changing monthly levies, title)
      usePortfolioStore.getState().updateRental('rental-update-test', {
        monthlyLeviesZAR: 1500,
      });
      usePortfolioStore.getState().updateRental('rental-update-test', {
        title: 'Fourways Family Villa Renovated',
      });

      // Task count must still be exactly 1, no duplicate tasks
      const expiryTasks = usePortfolioStore.getState().tasks.filter((t) => t.id.startsWith('task-lease-expiry-'));
      expect(expiryTasks).toHaveLength(1);
      expect(expiryTasks[0].id).toBe('task-lease-expiry-lease-update-1');
      expect(expiryTasks[0].title).toContain('Fourways Family Villa Renovated');
    });

    it('generates expiry tasks for all leases in bulkAddRentals', () => {
      const leaseEnd1 = getFutureDate(80);
      const leaseEnd2 = getFutureDate(110);

      const rentals: RentalProperty[] = [
        {
          ...baseRental,
          id: 'bulk-prop-1',
          title: 'Bulk Property 1',
          leases: [
            {
              id: 'bulk-lease-1',
              tenantName: 'Tenant One',
              unitName: 'Unit 1',
              monthlyRentZAR: 8000,
              depositHeldZAR: 8000,
              annualEscalationPercent: 0,
              status: 'Occupied',
              leaseStartDate: '2025-01-01',
              leaseEndDate: leaseEnd1,
            },
          ],
        },
        {
          ...baseRental,
          id: 'bulk-prop-2',
          title: 'Bulk Property 2',
          leases: [
            {
              id: 'bulk-lease-2',
              tenantName: 'Tenant Two',
              unitName: 'Unit 2',
              monthlyRentZAR: 9000,
              depositHeldZAR: 9000,
              annualEscalationPercent: 0,
              status: 'Occupied',
              leaseStartDate: '2025-01-01',
              leaseEndDate: leaseEnd2,
            },
          ],
        },
      ];

      usePortfolioStore.getState().bulkAddRentals(rentals);

      const tasks = usePortfolioStore.getState().tasks;
      expect(tasks.find((t) => t.id === 'task-lease-expiry-bulk-lease-1')).toBeDefined();
      expect(tasks.find((t) => t.id === 'task-lease-expiry-bulk-lease-2')).toBeDefined();
    });

    it('verifies exact 90-day lease end date spawns a high-priority task dated 30 days from today', () => {
      // Prompt verification requirement 5:
      // "Test the task generation by setting a lease end date exactly 90 days from today and verifying a high-priority task is spawned dated 30 days from today."
      const leaseEnd90 = getFutureDate(90);
      const expectedDue30 = getFutureDate(30);

      usePortfolioStore.getState().addRental({
        ...baseRental,
        id: 'prop-90-days-test',
        title: 'Century City Loft',
        leases: [
          {
            id: 'lease-90-days',
            tenantName: 'Sarah Jenkins',
            unitName: 'Penthouse 1',
            monthlyRentZAR: 22000,
            depositHeldZAR: 22000,
            annualEscalationPercent: 8,
            status: 'Occupied',
            leaseStartDate: '2025-01-01',
            leaseEndDate: leaseEnd90,
          },
        ],
      });

      const tasks = usePortfolioStore.getState().tasks;
      const task = tasks.find((t) => t.id === 'task-lease-expiry-lease-90-days');
      expect(task).toBeDefined();
      expect(task?.priority).toBe('High');
      expect(task?.status).toBe('Pending');
      expect(task?.dueDate).toBe(expectedDue30);
      expect(task?.title).toBe('Lease Expiry: Sarah Jenkins at Century City Loft - Penthouse 1');
      expect(task?.description).toContain(`Lease expires on ${leaseEnd90}`);
    });

    it('removes orphaned pending lease expiry tasks when a lease is removed from a property', () => {
      const leaseEnd = getFutureDate(90);
      usePortfolioStore.getState().addRental({
        ...baseRental,
        id: 'prop-multi-lease',
        leases: [
          {
            id: 'lease-keep',
            tenantName: 'Tenant Keep',
            unitName: 'Unit 1',
            monthlyRentZAR: 10000,
            depositHeldZAR: 10000,
            annualEscalationPercent: 0,
            status: 'Occupied',
            leaseStartDate: '2025-01-01',
            leaseEndDate: leaseEnd,
          },
          {
            id: 'lease-remove',
            tenantName: 'Tenant Remove',
            unitName: 'Unit 2',
            monthlyRentZAR: 12000,
            depositHeldZAR: 12000,
            annualEscalationPercent: 0,
            status: 'Occupied',
            leaseStartDate: '2025-01-01',
            leaseEndDate: leaseEnd,
          },
        ],
      });

      expect(usePortfolioStore.getState().tasks.find((t) => t.id === 'task-lease-expiry-lease-remove')).toBeDefined();

      // Now update the rental to only have lease-keep
      usePortfolioStore.getState().updateRental('prop-multi-lease', {
        leases: [
          {
            id: 'lease-keep',
            tenantName: 'Tenant Keep',
            unitName: 'Unit 1',
            monthlyRentZAR: 10000,
            depositHeldZAR: 10000,
            annualEscalationPercent: 0,
            status: 'Occupied',
            leaseStartDate: '2025-01-01',
            leaseEndDate: leaseEnd,
          },
        ],
      });

      const tasksAfterUpdate = usePortfolioStore.getState().tasks;
      expect(tasksAfterUpdate.find((t) => t.id === 'task-lease-expiry-lease-keep')).toBeDefined();
      expect(tasksAfterUpdate.find((t) => t.id === 'task-lease-expiry-lease-remove')).toBeUndefined();
    });

    it('cleans up linked lease expiry tasks and AGM tasks when deleteRental is called', () => {
      const leaseEnd = getFutureDate(60);
      usePortfolioStore.getState().addRental({
        ...baseRental,
        id: 'prop-to-delete',
        title: 'Property to Delete',
        agmDate: getFutureDate(30),
        leases: [
          {
            id: 'lease-to-delete',
            tenantName: 'Temporary Tenant',
            unitName: 'Unit Temp',
            monthlyRentZAR: 7500,
            depositHeldZAR: 7500,
            annualEscalationPercent: 0,
            status: 'Occupied',
            leaseStartDate: '2025-01-01',
            leaseEndDate: leaseEnd,
          },
        ],
      });

      expect(usePortfolioStore.getState().tasks.find((t) => t.id === 'task-lease-expiry-lease-to-delete')).toBeDefined();
      expect(usePortfolioStore.getState().tasks.find((t) => t.id === 'task-agm-prop-to-delete')).toBeDefined();

      // Delete the rental
      usePortfolioStore.getState().deleteRental('prop-to-delete');

      const tasks = usePortfolioStore.getState().tasks;
      expect(tasks.find((t) => t.id === 'task-lease-expiry-lease-to-delete')).toBeUndefined();
      expect(tasks.find((t) => t.id === 'task-agm-prop-to-delete')).toBeUndefined();
    });

    it('handles South African DD/MM/YYYY date format without treating future year as expired', () => {
      // Lease ending in 2027 in DD/MM/YYYY format
      const futureLeaseEnd = '31/12/2027';

      usePortfolioStore.getState().addRental({
        ...baseRental,
        id: 'prop-sa-date',
        title: 'Umhlanga Penthouse',
        leases: [
          {
            id: 'lease-sa-date',
            tenantName: 'Devan Pillay',
            unitName: 'Suite 9',
            monthlyRentZAR: 30000,
            depositHeldZAR: 30000,
            annualEscalationPercent: 8,
            status: 'Occupied',
            leaseStartDate: '2025-01-01',
            leaseEndDate: futureLeaseEnd,
          },
        ],
      });

      const task = usePortfolioStore.getState().tasks.find((t) => t.id === 'task-lease-expiry-lease-sa-date');
      expect(task).toBeDefined();
      expect(task?.priority).toBe('High');
      expect(task?.status).toBe('Pending');
      expect(task?.dueDate).toBe('2027-11-01'); // 60 days before 2027-12-31
    });
  });
});

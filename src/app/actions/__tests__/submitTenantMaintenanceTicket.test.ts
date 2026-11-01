import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitTenantMaintenanceTicket,
  SubmitMaintenanceTicketPayload,
} from '../submitTenantMaintenanceTicket';

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

const mockSelect = vi.fn().mockResolvedValue({
  data: [
    {
      id: 'prop-cloud-1',
      user_id: 'user-123',
      title: 'Sandhurst Executive Suite',
      leases: [{ id: 'lease-cloud-101', unitName: 'Suite 4B' }],
      maintenance_history: [],
    },
  ],
  error: null,
});

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockSelect,
              then: (fn: any) => mockSelect().then(fn),
            }),
            update: mockUpdate,
          };
        }
        return {};
      }),
    })),
  };
});

describe('submitTenantMaintenanceTicket Server Action', () => {
  const basePayload: SubmitMaintenanceTicketPayload = {
    leaseId: 'lease-test-1',
    category: 'Plumbing',
    description: 'Hot water cylinder valve leaking heavily into drip tray',
    urgency: 'Urgent',
    preferredAccess: 'Weekday evenings after 17:00',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects submission when leaseId is missing or blank', async () => {
    const result = await submitTenantMaintenanceTicket({
      ...basePayload,
      leaseId: '',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required lease identifier');
  });

  it('rejects submission when description is empty or whitespace', async () => {
    const result = await submitTenantMaintenanceTicket({
      ...basePayload,
      description: '   ',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required lease identifier or issue description');
  });

  it('successfully creates an Open work order ticket and returns short ticket reference', async () => {
    const result = await submitTenantMaintenanceTicket({
      ...basePayload,
      leaseId: `lease-unit-${Math.random().toString(36).substring(7)}`,
    });

    expect(result.success).toBe(true);
    expect(result.ticketRef).toMatch(/^WO-\d{4}$/);
    expect(result.ticketId).toMatch(/^maint-/);
  });

  it('appends ticket to cloud properties maintenance_history when leaseId matches cloud property', async () => {
    const result = await submitTenantMaintenanceTicket({
      ...basePayload,
      leaseId: 'lease-cloud-101',
    });

    expect(result.success).toBe(true);
    expect(result.ticketRef).toMatch(/^WO-\d{4}$/);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('enforces rate limiting after 3 submissions for the same lease in the rate window', async () => {
    const uniqueLeaseId = `lease-rate-limit-${Date.now()}`;
    const payload = { ...basePayload, leaseId: uniqueLeaseId };

    // 1st request
    const res1 = await submitTenantMaintenanceTicket(payload);
    expect(res1.success).toBe(true);

    // 2nd request
    const res2 = await submitTenantMaintenanceTicket(payload);
    expect(res2.success).toBe(true);

    // 3rd request
    const res3 = await submitTenantMaintenanceTicket(payload);
    expect(res3.success).toBe(true);

    // 4th request should trip rate limiting
    const res4 = await submitTenantMaintenanceTicket(payload);
    expect(res4.success).toBe(false);
    expect(res4.error).toContain('Too many maintenance reports submitted recently');
  });
});

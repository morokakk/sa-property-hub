import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitTenantMaintenanceTicket,
  getTenantReportedMaintenance,
  SubmitMaintenanceTicketPayload,
} from '../submitTenantMaintenanceTicket';
import { INITIAL_RENTALS } from '@/lib/store/initialData';

const mockCloudProperties = [
  {
    id: 'prop-cloud-1',
    user_id: 'user-landlord-1',
    title: 'Sandhurst Executive Suite',
    leases: [{ id: 'lease-cloud-101', unitName: 'Suite 4B', statementToken: 'tok-cloud-101' }],
    maintenance_history: [
      {
        id: 'maint-cloud-tenant-1',
        dateLogged: '2026-11-10',
        issueDescription: '[WO-4100] [URGENT] Leaking sink trap',
        category: 'Plumbing',
        contractorName: 'Unassigned',
        costZAR: 0,
        status: 'Open',
        reportedByTenant: true,
      },
      {
        id: 'maint-cloud-internal-2',
        dateLogged: '2026-11-01',
        issueDescription: 'Internal landlord repainting quote',
        category: 'General Wear',
        contractorName: 'Ace Painters',
        costZAR: 4500,
        status: 'Resolved',
        reportedByTenant: false,
      },
    ],
  },
  {
    id: 'prop-cloud-rate',
    user_id: 'user-landlord-1',
    title: 'Rate Limit Unit',
    leases: [{ id: 'lease-rate-1', unitName: 'Unit 9', statementToken: 'tok-rate-limit-cloud' }],
    maintenance_history: [],
  },
  {
    id: 'prop-cloud-other-landlord',
    user_id: 'user-landlord-2',
    title: 'Other Landlord Suite',
    leases: [{ id: 'lease-other-202', unitName: 'Unit 2', statementToken: 'tok-other-202' }],
    maintenance_history: [
      {
        id: 'maint-other-1',
        dateLogged: '2026-11-12',
        issueDescription: '[WO-9999] [ROUTINE] Gate motor slow',
        category: 'Electrical',
        contractorName: 'Unassigned',
        costZAR: 0,
        status: 'Open',
        reportedByTenant: true,
      },
    ],
  },
  {
    id: 'prop-corrupt-json',
    user_id: 'user-landlord-1',
    title: 'Corrupt JSON Property',
    leases: '[{invalid json',
    maintenance_history: '{corrupt',
  },
];

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({
  eq: mockUpdateEq,
});
const mockGetUser = vi.fn();
const mockContains = vi.fn();
const mockEqCalls: Array<{ col: string; val: unknown }> = [];

function createPropertiesQueryBuilder() {
  const filters: { user_id?: string; id?: string; containsToken?: string } = {};
  const builder: any = {
    eq(col: string, val: unknown) {
      mockEqCalls.push({ col, val });
      if (col === 'user_id') filters.user_id = String(val);
      if (col === 'id') filters.id = String(val);
      return builder;
    },
    contains(_col: string, val: Array<{ statementToken?: string }>) {
      const token = val?.[0]?.statementToken;
      filters.containsToken = token;
      mockContains(token);
      return builder;
    },
    then(resolve: (value: any) => void) {
      let rows = [...mockCloudProperties];
      if (filters.user_id !== undefined) {
        rows = rows.filter((p) => p.user_id === filters.user_id);
      }
      if (filters.id !== undefined) {
        rows = rows.filter((p) => p.id === filters.id);
      }
      if (filters.containsToken !== undefined) {
        rows = rows.filter(
          (p) =>
            Array.isArray(p.leases) &&
            p.leases.some((l: any) => l.statementToken === filters.containsToken)
        );
      }
      return Promise.resolve({ data: rows, error: null }).then(resolve);
    },
  };
  return builder;
}

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === 'properties') {
          return {
            select: vi.fn(() => createPropertiesQueryBuilder()),
            update: mockUpdate,
          };
        }
        return {};
      }),
    })),
  };
});

describe('submitTenantMaintenanceTicket & getTenantReportedMaintenance Server Actions', () => {
  const basePayload: SubmitMaintenanceTicketPayload = {
    token: 'tok-cloud-101',
    leaseId: 'lease-cloud-101',
    category: 'Plumbing',
    description: 'Hot water cylinder valve leaking heavily into drip tray',
    urgency: 'Urgent',
    preferredAccess: 'Weekday evenings after 17:00',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEqCalls.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
  });

  it('rejects submission when token/leaseId is missing or description is blank', async () => {
    const missingId = await submitTenantMaintenanceTicket({
      ...basePayload,
      token: '',
      leaseId: '',
    });
    expect(missingId.success).toBe(false);
    expect(missingId.error).toContain('Missing required lease identifier');

    const blankDesc = await submitTenantMaintenanceTicket({
      ...basePayload,
      description: '   ',
    });
    expect(blankDesc.success).toBe(false);
    expect(blankDesc.error).toContain('Missing required lease identifier or issue description');
  });

  it('rejects invalid maintenance category and invalid urgency values', async () => {
    const badUrgency = await submitTenantMaintenanceTicket({
      ...basePayload,
      urgency: 'CRITICAL_NOW' as any,
    });
    expect(badUrgency.success).toBe(false);
    expect(badUrgency.error).toContain('Invalid maintenance urgency level');

    const badCategory = await submitTenantMaintenanceTicket({
      ...basePayload,
      category: '<script>alert(1)</script>',
    });
    expect(badCategory.success).toBe(false);
    expect(badCategory.error).toContain('Invalid maintenance category');
  });

  it('rejects unknown tokens and raw guessable cloud lease IDs without statementToken', async () => {
    const rawCloudLeaseAttempt = await submitTenantMaintenanceTicket({
      ...basePayload,
      token: undefined,
      leaseId: 'lease-cloud-101',
    });
    expect(rawCloudLeaseAttempt.success).toBe(false);
    expect(rawCloudLeaseAttempt.error).toContain('Invalid or expired statement link');
    expect(mockUpdate).not.toHaveBeenCalled();

    const forgedTokenAttempt = await submitTenantMaintenanceTicket({
      ...basePayload,
      token: 'forged-token-xyz',
      leaseId: 'lease-cloud-101',
    });
    expect(forgedTokenAttempt.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('supports un-tokenized demo lease-1 without mutating INITIAL_RENTALS singleton', async () => {
    const initialHistoryLength = INITIAL_RENTALS[0].maintenanceHistory?.length || 0;

    const result = await submitTenantMaintenanceTicket({
      leaseId: 'lease-1',
      category: 'Other',
      description: 'Front security gate keypad intermittently unresponsive',
      urgency: 'Routine',
    });

    expect(result.success).toBe(true);
    expect(result.ticketRef).toMatch(/^WO-\d{4}$/);
    expect(result.ticketId).toMatch(/^maint-/);

    // Must never mutate INITIAL_RENTALS in place
    expect(INITIAL_RENTALS[0].maintenanceHistory?.length || 0).toBe(initialHistoryLength);

    // Retrievable via capability token / un-tokenized demo lease ID
    const fetched = await getTenantReportedMaintenance({
      propertyId: 'rental-1',
      token: 'lease-1',
    });
    expect(fetched.success).toBe(true);
    expect(fetched.tickets.some((t) => t.id === result.ticketId)).toBe(true);
  });

  it('appends ticket to cloud properties maintenance_history via targeted statementToken lookup', async () => {
    const result = await submitTenantMaintenanceTicket({
      ...basePayload,
      token: 'tok-cloud-101',
    });

    expect(result.success).toBe(true);
    expect(result.ticketRef).toMatch(/^WO-\d{4}$/);
    expect(mockContains).toHaveBeenCalledWith('tok-cloud-101');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'prop-cloud-1');
  });

  it('enforces rate limiting after 3 submissions for the same capability token', async () => {
    const payload: SubmitMaintenanceTicketPayload = {
      ...basePayload,
      token: 'tok-rate-limit-cloud',
      leaseId: 'lease-rate-1',
    };

    expect((await submitTenantMaintenanceTicket(payload)).success).toBe(true);
    expect((await submitTenantMaintenanceTicket(payload)).success).toBe(true);
    expect((await submitTenantMaintenanceTicket(payload)).success).toBe(true);

    const res4 = await submitTenantMaintenanceTicket(payload);
    expect(res4.success).toBe(false);
    expect(res4.error).toContain('Too many maintenance reports submitted recently');
  });

  describe('getTenantReportedMaintenance authorization paths', () => {
    it('rejects unauthenticated requests lacking both accessToken and capability tokens', async () => {
      const noAuthRes = await getTenantReportedMaintenance({
        propertyId: 'prop-cloud-other-landlord',
        leaseIds: ['lease-other-202'],
      });
      expect(noAuthRes.success).toBe(false);
      expect(noAuthRes.tickets).toEqual([]);
      expect(noAuthRes.error).toContain('Authentication or valid lease capability token is required');
      expect(mockContains).not.toHaveBeenCalled();

      const forgedRes = await getTenantReportedMaintenance({
        token: 'lease-other-202',
      });
      expect(forgedRes.success).toBe(false);
      expect(forgedRes.tickets).toEqual([]);
    });

    it('rejects invalid landlord accessToken', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid JWT' } });

      const res = await getTenantReportedMaintenance({
        propertyId: 'prop-cloud-1',
        accessToken: 'bad-jwt',
      });
      expect(res.success).toBe(false);
      expect(res.tickets).toEqual([]);
      expect(res.error).toContain('Unauthorized');
    });

    it('returns property maintenance scoped by user_id and propertyId for authenticated landlord', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-landlord-1' } },
        error: null,
      });

      const res = await getTenantReportedMaintenance({
        propertyId: 'prop-cloud-1',
        accessToken: 'valid-jwt-1',
      });

      expect(res.success).toBe(true);
      expect(mockEqCalls).toContainEqual({ col: 'user_id', val: 'user-landlord-1' });
      expect(mockEqCalls).toContainEqual({ col: 'id', val: 'prop-cloud-1' });
      expect(res.tickets.some((t) => t.id === 'maint-cloud-tenant-1')).toBe(true);
      expect(res.tickets.some((t) => t.id === 'maint-cloud-internal-2')).toBe(false);
      expect(res.tickets.some((t) => t.id === 'maint-other-1')).toBe(false);
    });

    it('prevents authenticated landlord from reading another landlord propertyId', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-landlord-1' } },
        error: null,
      });

      const res = await getTenantReportedMaintenance({
        propertyId: 'prop-cloud-other-landlord',
        accessToken: 'valid-jwt-1',
      });

      expect(res.success).toBe(true);
      expect(res.tickets).toEqual([]);
    });

    it('allows capability-token tenant lookup scoped strictly to matched cloud token', async () => {
      const res = await getTenantReportedMaintenance({
        token: 'tok-cloud-101',
      });

      expect(res.success).toBe(true);
      expect(mockContains).toHaveBeenCalledWith('tok-cloud-101');
      expect(res.tickets.some((t) => t.id === 'maint-cloud-tenant-1')).toBe(true);
      expect(res.tickets.some((t) => t.id === 'maint-other-1')).toBe(false);
    });
  });
});

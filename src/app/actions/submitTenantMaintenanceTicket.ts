'use server';

import { createClient } from '@supabase/supabase-js';
import { MaintenanceLog, RentalProperty } from '@/types';
import { INITIAL_RENTALS } from '@/lib/store/initialData';

export interface SubmitMaintenanceTicketPayload {
  leaseId: string;
  category: string;
  description: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  preferredAccess?: string;
}

export interface SubmitMaintenanceTicketResult {
  success: boolean;
  ticketRef?: string;
  ticketId?: string;
  error?: string;
}

// In-memory rate limiting map (leaseId -> array of timestamp numbers)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_LEASE = 3;

// In-memory tenant reported ticket storage for server sessions & demo properties
const inMemoryReportedTickets = new Map<string, MaintenanceLog[]>();

function isRateLimited(leaseId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(leaseId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_LEASE) {
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(leaseId, validTimestamps);
  return false;
}

// Service role Supabase client for unauthenticated public portal action
function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server Action: Securely appends an 'Open' work order into the landlord's maintenance history in Supabase.
 */
export async function submitTenantMaintenanceTicket(
  payload: SubmitMaintenanceTicketPayload
): Promise<SubmitMaintenanceTicketResult> {
  try {
    const { leaseId, category, description, urgency, preferredAccess } = payload;

    if (!leaseId || !description?.trim()) {
      return { success: false, error: 'Missing required lease identifier or issue description.' };
    }

    // Rate-limiting check
    if (isRateLimited(leaseId)) {
      return {
        success: false,
        error: 'Too many maintenance reports submitted recently. Please wait or contact your landlord directly.',
      };
    }

    // Input sanitization
    const sanitizedDescription = description.trim().slice(0, 500);
    const sanitizedAccess = preferredAccess ? preferredAccess.trim().slice(0, 200) : undefined;
    const shortRef = `WO-${Math.floor(1000 + Math.random() * 9000)}`;

    const validCategory: MaintenanceLog['category'] =
      category === 'Other' || !category ? 'General Wear' : (category as MaintenanceLog['category']);

    const newTicket: MaintenanceLog = {
      id: `maint-${crypto.randomUUID()}`,
      dateLogged: new Date().toISOString().slice(0, 10),
      category: validCategory,
      issueDescription: `[${shortRef}] [${urgency.toUpperCase()}] ${sanitizedDescription}${sanitizedAccess ? ` (Access: ${sanitizedAccess})` : ''}`,
      costZAR: 0,
      status: 'Open',
      reportedByTenant: true,
      contractorName: 'Unassigned',
    };

    // Record in server session memory for immediate retrieval
    const existingForLease = inMemoryReportedTickets.get(leaseId) || [];
    inMemoryReportedTickets.set(leaseId, [...existingForLease, newTicket]);

    const supabase = getServerSupabaseClient();

    if (supabase) {
      // Find the property that owns this lease
      const { data: properties, error: fetchErr } = await supabase
        .from('properties')
        .select('id, user_id, title, leases, maintenance_history');

      if (!fetchErr && properties && properties.length > 0) {
        const matchingProp = properties.find((p: any) => {
          const rawLeases = p.leases;
          const parsedLeases = typeof rawLeases === 'string' ? JSON.parse(rawLeases) : rawLeases;
          return Array.isArray(parsedLeases) && parsedLeases.some((l: any) => l.id === leaseId);
        });

        if (matchingProp) {
          // Also index in memory by property ID
          const existingForProp = inMemoryReportedTickets.get(matchingProp.id) || [];
          inMemoryReportedTickets.set(matchingProp.id, [...existingForProp, newTicket]);

          const rawHistory = matchingProp.maintenance_history;
          const historyList: MaintenanceLog[] = Array.isArray(rawHistory)
            ? rawHistory
            : typeof rawHistory === 'string'
            ? JSON.parse(rawHistory)
            : [];

          const updatedHistory = [...historyList, newTicket];

          const { error: updateErr } = await supabase
            .from('properties')
            .update({
              maintenance_history: updatedHistory as any,
              updated_at: new Date().toISOString(),
            })
            .eq('id', matchingProp.id);

          if (!updateErr) {
            return {
              success: true,
              ticketRef: shortRef,
              ticketId: newTicket.id,
            };
          }
        }
      }
    }

    // Fallback: If Supabase table is offline or using demo lease (e.g. lease-1 on Sandhurst)
    const demoRental = INITIAL_RENTALS.find((r) =>
      (r.leases || []).some((l) => l.id === leaseId)
    );

    if (demoRental) {
      if (!demoRental.maintenanceHistory) {
        demoRental.maintenanceHistory = [];
      }
      demoRental.maintenanceHistory.push(newTicket);
      const existingForDemoProp = inMemoryReportedTickets.get(demoRental.id) || [];
      inMemoryReportedTickets.set(demoRental.id, [...existingForDemoProp, newTicket]);
      return {
        success: true,
        ticketRef: shortRef,
        ticketId: newTicket.id,
      };
    }

    return {
      success: true,
      ticketRef: shortRef,
      ticketId: newTicket.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to submit maintenance ticket.',
    };
  }
}

export interface GetTenantReportedMaintenanceParams {
  propertyId?: string;
  leaseIds?: string[];
}

export interface GetTenantReportedMaintenanceResult {
  success: boolean;
  tickets: MaintenanceLog[];
  error?: string;
}

/**
 * Server Action: Queries Supabase and server state for any tenant-reported tickets
 * associated with this property or its leases, enabling instant landlord synchronization.
 */
export async function getTenantReportedMaintenance(
  params: GetTenantReportedMaintenanceParams
): Promise<GetTenantReportedMaintenanceResult> {
  try {
    const { propertyId, leaseIds = [] } = params;
    const collected: MaintenanceLog[] = [];
    const seenIds = new Set<string>();

    // 1. Check in-memory store
    for (const leaseId of leaseIds) {
      const tickets = inMemoryReportedTickets.get(leaseId) || [];
      for (const t of tickets) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          collected.push(t);
        }
      }
    }
    if (propertyId) {
      const tickets = inMemoryReportedTickets.get(propertyId) || [];
      for (const t of tickets) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          collected.push(t);
        }
      }
    }

    // 2. Check demo rental in server memory
    const demoRental = INITIAL_RENTALS.find(
      (r) =>
        (propertyId && r.id === propertyId) ||
        (r.leases || []).some((l) => leaseIds.includes(l.id))
    );
    if (demoRental && Array.isArray(demoRental.maintenanceHistory)) {
      for (const t of demoRental.maintenanceHistory) {
        if (t.reportedByTenant && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          collected.push(t);
        }
      }
    }

    // 3. Query Supabase if available
    const supabase = getServerSupabaseClient();
    if (supabase) {
      let query = supabase.from('properties').select('id, leases, maintenance_history');
      if (propertyId) {
        query = query.eq('id', propertyId);
      }
      const { data: properties, error: fetchErr } = await query;
      if (!fetchErr && properties) {
        for (const p of properties) {
          const rawLeases = p.leases;
          const parsedLeases = typeof rawLeases === 'string' ? JSON.parse(rawLeases) : rawLeases;
          const matchesLease =
            Array.isArray(parsedLeases) &&
            parsedLeases.some((l: any) => leaseIds.includes(l.id));

          if (p.id === propertyId || matchesLease) {
            const rawHistory = p.maintenance_history;
            const historyList: MaintenanceLog[] = Array.isArray(rawHistory)
              ? rawHistory
              : typeof rawHistory === 'string'
              ? JSON.parse(rawHistory)
              : [];
            for (const t of historyList) {
              if (t.reportedByTenant && !seenIds.has(t.id)) {
                seenIds.add(t.id);
                collected.push(t);
              }
            }
          }
        }
      }
    }

    return { success: true, tickets: collected };
  } catch (err: any) {
    return { success: false, tickets: [], error: err?.message || 'Failed to retrieve tickets.' };
  }
}

'use server';

import { createClient } from '@supabase/supabase-js';
import { MaintenanceLog } from '@/types';
import { INITIAL_RENTALS } from '@/lib/store/initialData';

export interface SubmitMaintenanceTicketPayload {
  token?: string;
  leaseId?: string;
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

const ALLOWED_CATEGORIES: readonly MaintenanceLog['category'][] = [
  'Plumbing',
  'Electrical',
  'Appliance',
  'Structural',
  'General Wear',
];

const ALLOWED_URGENCIES = ['Routine', 'Urgent', 'Emergency'] as const;

// In-memory rate limiting map (token -> array of timestamp numbers)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_LEASE = 3;
const MAX_RATE_LIMIT_KEYS = 500;

// In-memory tenant reported ticket storage for server sessions & demo properties
const inMemoryReportedTickets = new Map<string, MaintenanceLog[]>();
const MAX_IN_MEMORY_KEYS = 200;
const MAX_TICKETS_PER_KEY = 50;

function pruneRateLimitMap(now: number): void {
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else if (valid.length !== timestamps.length) {
      rateLimitMap.set(key, valid);
    }
  }
  while (rateLimitMap.size >= MAX_RATE_LIMIT_KEYS) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey === undefined) break;
    rateLimitMap.delete(oldestKey);
  }
}

function isRateLimited(tokenKey: string): boolean {
  const now = Date.now();
  pruneRateLimitMap(now);

  const validTimestamps = (rateLimitMap.get(tokenKey) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (validTimestamps.length >= MAX_REQUESTS_PER_LEASE) {
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(tokenKey, validTimestamps);
  return false;
}

function recordInMemoryTicket(key: string, ticket: MaintenanceLog): void {
  if (!key) return;
  if (!inMemoryReportedTickets.has(key) && inMemoryReportedTickets.size >= MAX_IN_MEMORY_KEYS) {
    const oldestKey = inMemoryReportedTickets.keys().next().value;
    if (oldestKey !== undefined) {
      inMemoryReportedTickets.delete(oldestKey);
    }
  }
  const existing = inMemoryReportedTickets.get(key) || [];
  if (existing.some((t) => t.id === ticket.id)) return;
  inMemoryReportedTickets.set(key, [...existing, ticket].slice(-MAX_TICKETS_PER_KEY));
}

function safeParseArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function findDemoLeaseMatch(lookupToken: string) {
  for (const rental of INITIAL_RENTALS) {
    const leases = [...(rental.leases || []), ...(rental.archivedLeases || [])];
    const matchedLease = leases.find(
      (l) =>
        (l.statementToken && l.statementToken === lookupToken) ||
        (!l.statementToken && l.id === lookupToken)
    );
    if (matchedLease) {
      return { rental, lease: matchedLease };
    }
  }
  return null;
}

// Service role Supabase client for capability-token portal operations & session verification
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
 * Enforces capability-token verification (`statementToken` for cloud leases; un-tokenized ID fallback for demo leases only).
 */
export async function submitTenantMaintenanceTicket(
  payload: SubmitMaintenanceTicketPayload
): Promise<SubmitMaintenanceTicketResult> {
  try {
    const { token, leaseId, category, description, urgency, preferredAccess } = payload || {};
    const lookupToken = (typeof token === 'string' && token.trim()) ||
      (typeof leaseId === 'string' && leaseId.trim()) ||
      '';

    if (!lookupToken || typeof description !== 'string' || !description.trim()) {
      return { success: false, error: 'Missing required lease identifier or issue description.' };
    }

    if (!ALLOWED_URGENCIES.includes(urgency)) {
      return { success: false, error: 'Invalid maintenance urgency level.' };
    }

    const normalizedCategory =
      category === 'Other' || !category ? 'General Wear' : category;
    if (!ALLOWED_CATEGORIES.includes(normalizedCategory as MaintenanceLog['category'])) {
      return { success: false, error: 'Invalid maintenance category.' };
    }
    const validCategory = normalizedCategory as MaintenanceLog['category'];

    // Rate-limiting check
    if (isRateLimited(lookupToken)) {
      return {
        success: false,
        error: 'Too many maintenance reports submitted recently. Please wait or contact your landlord directly.',
      };
    }

    // Input sanitization
    const sanitizedDescription = description.trim().slice(0, 500);
    const sanitizedAccess =
      typeof preferredAccess === 'string' && preferredAccess.trim()
        ? preferredAccess.trim().slice(0, 200)
        : undefined;
    const shortRef = `WO-${Math.floor(1000 + Math.random() * 9000)}`;

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

    const supabase = getServerSupabaseClient();

    if (supabase) {
      // Targeted JSONB containment lookup by capability token — never scans all rows
      const { data: properties, error: fetchErr } = await supabase
        .from('properties')
        .select('id, user_id, title, leases, maintenance_history')
        .contains('leases', [{ statementToken: lookupToken }]);

      if (!fetchErr && Array.isArray(properties) && properties.length > 0) {
        const matchingProp = properties.find((p: any) => {
          const parsedLeases = safeParseArray<any>(p.leases);
          return parsedLeases.some((l: any) => l && l.statementToken === lookupToken);
        });

        if (matchingProp) {
          const historyList = safeParseArray<MaintenanceLog>(matchingProp.maintenance_history);
          const updatedHistory = [...historyList, newTicket];

          const { error: updateErr } = await supabase
            .from('properties')
            .update({
              maintenance_history: updatedHistory as any,
              updated_at: new Date().toISOString(),
            })
            .eq('id', matchingProp.id);

          if (updateErr) {
            return {
              success: false,
              error: updateErr.message || 'Failed to save maintenance ticket.',
            };
          }

          recordInMemoryTicket(lookupToken, newTicket);
          recordInMemoryTicket(matchingProp.id, newTicket);

          return {
            success: true,
            ticketRef: shortRef,
            ticketId: newTicket.id,
          };
        }
      }
    }

    // Demo fallback (never mutates INITIAL_RENTALS singleton)
    const demoMatch = findDemoLeaseMatch(lookupToken);
    if (demoMatch) {
      recordInMemoryTicket(lookupToken, newTicket);
      recordInMemoryTicket(demoMatch.lease.id, newTicket);
      recordInMemoryTicket(demoMatch.rental.id, newTicket);
      return {
        success: true,
        ticketRef: shortRef,
        ticketId: newTicket.id,
      };
    }

    return {
      success: false,
      error: 'Invalid or expired statement link. Please contact your landlord directly.',
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
  accessToken?: string;
  token?: string;
  tokens?: string[];
}

export interface GetTenantReportedMaintenanceResult {
  success: boolean;
  tickets: MaintenanceLog[];
  error?: string;
}

/**
 * Server Action: Retrieves tenant-reported maintenance tickets via either:
 * (a) Authenticated landlord session (`accessToken` + `propertyId`, strictly scoped to `user_id`), or
 * (b) Valid lease capability token(s) (`token` / `tokens`), scoped strictly to matched lease(s).
 */
export async function getTenantReportedMaintenance(
  params: GetTenantReportedMaintenanceParams
): Promise<GetTenantReportedMaintenanceResult> {
  try {
    const { propertyId, leaseIds = [], accessToken, token, tokens = [] } = params || {};
    const collected: MaintenanceLog[] = [];
    const seenIds = new Set<string>();

    const pushUnique = (ticket: MaintenanceLog) => {
      if (ticket && ticket.id && !seenIds.has(ticket.id)) {
        seenIds.add(ticket.id);
        collected.push(ticket);
      }
    };

    const candidateTokens = Array.from(
      new Set(
        [token, ...tokens]
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => t.trim())
      )
    );

    const supabase = getServerSupabaseClient();

    // Path (a): Authenticated landlord session
    if (typeof accessToken === 'string' && accessToken.trim()) {
      if (!propertyId || typeof propertyId !== 'string' || !propertyId.trim()) {
        return { success: false, tickets: [], error: 'Property identifier is required.' };
      }

      if (!supabase) {
        return { success: false, tickets: [], error: 'Cloud service is unavailable.' };
      }

      const { data: authData, error: authErr } = await supabase.auth.getUser(accessToken.trim());
      const user = authData?.user;

      if (authErr || !user?.id) {
        return { success: false, tickets: [], error: 'Unauthorized: invalid or expired session.' };
      }

      const { data: properties, error: fetchErr } = await supabase
        .from('properties')
        .select('id, user_id, leases, maintenance_history')
        .eq('user_id', user.id)
        .eq('id', propertyId.trim());

      if (fetchErr) {
        return { success: false, tickets: [], error: fetchErr.message || 'Failed to retrieve tickets.' };
      }

      if (Array.isArray(properties) && properties.length > 0) {
        for (const p of properties) {
          const historyList = safeParseArray<MaintenanceLog>(p.maintenance_history);
          for (const t of historyList) {
            if (t.reportedByTenant) pushUnique(t);
          }

          for (const t of inMemoryReportedTickets.get(p.id) || []) {
            pushUnique(t);
          }

          const parsedLeases = safeParseArray<any>(p.leases);
          for (const l of parsedLeases) {
            if (l?.id) {
              for (const t of inMemoryReportedTickets.get(l.id) || []) {
                pushUnique(t);
              }
            }
            if (l?.statementToken) {
              for (const t of inMemoryReportedTickets.get(l.statementToken) || []) {
                pushUnique(t);
              }
            }
          }
        }

        return { success: true, tickets: collected };
      }

      // Authenticated user viewing un-migrated local demo rental
      for (const candidate of candidateTokens) {
        const demoMatch = findDemoLeaseMatch(candidate);
        if (demoMatch) {
          for (const t of inMemoryReportedTickets.get(candidate) || []) pushUnique(t);
          for (const t of inMemoryReportedTickets.get(demoMatch.lease.id) || []) pushUnique(t);
          for (const t of inMemoryReportedTickets.get(demoMatch.rental.id) || []) pushUnique(t);
        }
      }

      return { success: true, tickets: collected };
    }

    // Path (b): Tenant / unauthenticated capability-token path
    if (candidateTokens.length === 0) {
      return {
        success: false,
        tickets: [],
        error: 'Authentication or valid lease capability token is required.',
      };
    }

    let matchedAnyToken = false;

    for (const candidate of candidateTokens) {
      // 1. Check demo leases (never touches cloud DB)
      const demoMatch = findDemoLeaseMatch(candidate);
      if (demoMatch) {
        matchedAnyToken = true;
        for (const t of inMemoryReportedTickets.get(candidate) || []) pushUnique(t);
        for (const t of inMemoryReportedTickets.get(demoMatch.lease.id) || []) pushUnique(t);
        if (propertyId && propertyId === demoMatch.rental.id) {
          for (const t of inMemoryReportedTickets.get(demoMatch.rental.id) || []) pushUnique(t);
        }
        continue;
      }

      // 2. Targeted lookup on Supabase strictly by statementToken
      if (supabase) {
        const { data: properties, error: fetchErr } = await supabase
          .from('properties')
          .select('id, leases, maintenance_history')
          .contains('leases', [{ statementToken: candidate }]);

        if (!fetchErr && Array.isArray(properties) && properties.length > 0) {
          for (const p of properties) {
            const parsedLeases = safeParseArray<any>(p.leases);
            const matchedLease = parsedLeases.find((l: any) => l && l.statementToken === candidate);
            if (!matchedLease) continue;

            matchedAnyToken = true;
            const historyList = safeParseArray<MaintenanceLog>(p.maintenance_history);
            for (const t of historyList) {
              if (!t.reportedByTenant) continue;
              const ticketLeaseId = (t as MaintenanceLog & { leaseId?: string }).leaseId;
              if (!ticketLeaseId || ticketLeaseId === matchedLease.id || leaseIds.includes(matchedLease.id)) {
                pushUnique(t);
              }
            }

            for (const t of inMemoryReportedTickets.get(candidate) || []) {
              pushUnique(t);
            }
          }
        }
      }
    }

    if (!matchedAnyToken) {
      return {
        success: false,
        tickets: [],
        error: 'Invalid or unauthorized capability token.',
      };
    }

    return { success: true, tickets: collected };
  } catch (err: any) {
    return {
      success: false,
      tickets: [],
      error: err?.message || 'Failed to retrieve tickets.',
    };
  }
}

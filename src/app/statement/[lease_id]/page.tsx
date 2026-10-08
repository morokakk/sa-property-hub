import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import TenantStatementViewer from '@/components/statements/TenantStatementViewer';
import { PublicTenantStatementPayload } from '@/types/tenantStatement';
import { INITIAL_RENTALS, INITIAL_INVESTOR_PROFILE } from '@/lib/store/initialData';

interface PageProps {
  params: Promise<{
    lease_id: string;
  }>;
  searchParams?: Promise<{
    month?: string;
  }>;
}

// Server-side Supabase client prioritizing SERVICE_ROLE_KEY for RLS bypass
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

// Helper to fetch statement data from Supabase RPC or fallback to initial portfolio data
async function fetchStatementData(leaseId: string): Promise<PublicTenantStatementPayload | null> {
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_public_tenant_statement', {
        p_lease_id: leaseId,
      });

      if (!error && data && typeof data === 'object') {
        return data as unknown as PublicTenantStatementPayload;
      }
    } catch {
      // Fall through to demo fallback
    }
  }

  // Demo fallback for initial mock portfolio data (e.g. lease-1)
  const demoRental = INITIAL_RENTALS.find((r) =>
    (r.leases || []).some((l) => l.id === leaseId)
  );

  if (demoRental) {
    const demoLease = (demoRental.leases || []).find((l) => l.id === leaseId)!;
    return {
      lease: {
        id: demoLease.id,
        unitName: demoLease.unitName,
        tenantName: demoLease.tenantName,
        tenantPhone: demoLease.tenantPhone,
        tenantEmail: demoLease.tenantEmail,
        leaseStartDate: demoLease.leaseStartDate,
        leaseEndDate: demoLease.leaseEndDate,
        monthlyRentZAR: demoLease.monthlyRentZAR,
        depositHeldZAR: demoLease.depositHeldZAR,
        annualEscalationPercent: demoLease.annualEscalationPercent,
        status: demoLease.status,
        arrears_opening_balance_zar: demoLease.arrearsOpeningBalanceZAR ?? null,
        roomType: demoLease.roomType,
        guarantorName: demoLease.guarantorName,
        guarantorContact: demoLease.guarantorContact,
      },
      property: {
        id: demoRental.id,
        title: demoRental.title,
        address: demoRental.address,
        city: demoRental.city,
        utility_type: demoRental.utilityType || null,
        prepaid_vendor_name: demoRental.prepaidVendorName || null,
        arrears_opening_balance_zar: demoRental.arrearsOpeningBalanceZAR ?? null,
        payment_records: demoRental.paymentRecords,
      },
      landlord: {
        entity_name: INITIAL_INVESTOR_PROFILE.entityName,
        trading_as: INITIAL_INVESTOR_PROFILE.tradingAs,
        contact_number: INITIAL_INVESTOR_PROFILE.contactNumber,
        email: INITIAL_INVESTOR_PROFILE.email,
        website: INITIAL_INVESTOR_PROFILE.website,
        physical_address: INITIAL_INVESTOR_PROFILE.physicalAddress,
        logo_base64: INITIAL_INVESTOR_PROFILE.logoBase64 || null,
        bank_name: INITIAL_INVESTOR_PROFILE.bankName || null,
        account_holder: INITIAL_INVESTOR_PROFILE.accountHolder || null,
        account_number: INITIAL_INVESTOR_PROFILE.accountNumber || null,
        account_type: INITIAL_INVESTOR_PROFILE.accountType || null,
        branch_code: INITIAL_INVESTOR_PROFILE.branchCode || null,
        swift_code: INITIAL_INVESTOR_PROFILE.swiftCode || null,
        remittance_instructions: INITIAL_INVESTOR_PROFILE.remittanceInstructions || null,
      },
      utility_statements: demoRental.utilityStatements || [],
      meter_readings: demoRental.meterReadings || [],
      payment_records: demoRental.paymentRecords || [],
      arrears_opening_balance_zar: demoRental.arrearsOpeningBalanceZAR ?? 0,
      arrears_write_offs: demoRental.arrearsWriteOffs || [],
    };
  }

  return null;
}

// Dynamic SEO & Browser Tab Title
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lease_id } = await params;
  if (!lease_id) return { title: 'Tenant Statement | SA Property Hub' };

  try {
    const payload = await fetchStatementData(lease_id);
    if (payload) {
      return {
        title: `Tenant Statement: ${payload.lease?.unitName || 'Unit'} - ${payload.property?.title || 'Property'}`,
        description: `Official rental & utility recovery statement for ${payload.lease?.tenantName || 'Tenant'}.`,
      };
    }
  } catch {
    // Fall back to default title if fetch fails
  }

  return {
    title: 'Tenant Statement | SA Property Hub',
  };
}

export default async function TenantStatementPage({ params, searchParams }: PageProps) {
  const { lease_id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialMonth = resolvedSearchParams?.month;

  if (!lease_id || typeof lease_id !== 'string') {
    notFound();
  }

  const statementData = await fetchStatementData(lease_id);

  if (!statementData || !statementData.lease || !statementData.property) {
    notFound();
  }

  return <TenantStatementViewer statementData={statementData} initialMonth={initialMonth} />;
}

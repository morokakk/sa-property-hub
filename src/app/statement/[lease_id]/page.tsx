import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import TenantStatementViewer from '@/components/statements/TenantStatementViewer';
import { PublicTenantStatementPayload } from '@/types/tenantStatement';

interface PageProps {
  params: Promise<{
    lease_id: string;
  }>;
}

// Server-side Supabase client prioritizing SERVICE_ROLE_KEY for RLS bypass
function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase configuration in environment variables.');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Dynamic SEO & Browser Tab Title
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lease_id } = await params;
  if (!lease_id) return { title: 'Tenant Statement | SA Property Hub' };

  try {
    const supabase = getServerSupabaseClient();
    const { data } = await supabase.rpc('get_public_tenant_statement', {
      p_lease_id: lease_id,
    });

    if (data && typeof data === 'object') {
      const payload = data as unknown as PublicTenantStatementPayload;
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

export default async function TenantStatementPage({ params }: PageProps) {
  const { lease_id } = await params;

  if (!lease_id || typeof lease_id !== 'string') {
    notFound();
  }

  const supabase = getServerSupabaseClient();

  // Execute SECURITY DEFINER RPC to securely fetch redacted statement payload
  const { data, error } = await supabase.rpc('get_public_tenant_statement', {
    p_lease_id: lease_id,
  });

  if (error || !data) {
    notFound();
  }

  const statementData = data as unknown as PublicTenantStatementPayload;

  // Extra guardrail: Ensure lease and property exist
  if (!statementData.lease || !statementData.property) {
    notFound();
  }

  return <TenantStatementViewer statementData={statementData} />;
}

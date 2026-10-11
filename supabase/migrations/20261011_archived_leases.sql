-- Migration: 20261011_archived_leases.sql
-- Description: Adds archived_leases column to public.properties table and updates get_public_tenant_statement RPC to search both active leases and archived_leases

-- 1. Ensure archived_leases column exists on properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS archived_leases jsonb DEFAULT '[]'::jsonb;

-- 2. Update get_public_tenant_statement RPC to query both active leases and archived_leases
CREATE OR REPLACE FUNCTION public.get_public_tenant_statement(p_lease_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property RECORD;
  v_lease JSONB;
  v_landlord JSONB;
  v_payments JSONB;
  v_sanitized_write_offs JSONB;
  v_statements JSONB;
  v_readings JSONB;
  v_result JSONB;
BEGIN
  -- Find property containing this lease (either in active leases or archived_leases)
  SELECT * INTO v_property
  FROM public.properties
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(leases, '[]'::jsonb) || COALESCE(archived_leases, '[]'::jsonb)) AS l
    WHERE l->>'id' = p_lease_id
  );

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Extract the specific lease from either active or archived list
  SELECT l INTO v_lease
  FROM jsonb_array_elements(COALESCE(v_property.leases, '[]'::jsonb) || COALESCE(v_property.archived_leases, '[]'::jsonb)) AS l
  WHERE l->>'id' = p_lease_id;

  -- Fetch landlord / investor profile from public.profiles
  SELECT jsonb_build_object(
    'entity_name', COALESCE(p.entity_name, 'Property Landlord'),
    'trading_as', p.trading_as,
    'registration_or_id', p.registration_or_id,
    'contact_number', p.contact_number,
    'email', p.email,
    'website', p.website,
    'physical_address', p.physical_address,
    'logo_base64', p.logo_base64,
    'bank_name', p.bank_name,
    'account_holder', p.account_holder,
    'account_number', p.account_number,
    'account_type', p.account_type,
    'branch_code', p.branch_code,
    'swift_code', p.swift_code,
    'remittance_instructions', p.remittance_instructions
  ) INTO v_landlord
  FROM public.profiles p
  WHERE p.user_id = v_property.user_id
  LIMIT 1;

  IF v_landlord IS NULL THEN
    v_landlord := jsonb_build_object(
      'entity_name', 'Property Landlord'
    );
  END IF;

  -- Filter payment records for this lease
  SELECT COALESCE(jsonb_agg(p), '[]'::jsonb) INTO v_payments
  FROM jsonb_array_elements(COALESCE(v_property.payment_records, '[]'::jsonb)) AS p
  WHERE (p->>'leaseId' IS NULL OR p->>'leaseId' = p_lease_id);

  -- Sanitize write-offs (omit private internal reasons and notes from tenant view)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', w->>'id',
      'leaseId', w->>'leaseId',
      'date', w->>'date',
      'amountZAR', (w->>'amountZAR')::numeric,
      'allocations', COALESCE(w->'allocations', '[]'::jsonb),
      'createdAt', w->>'createdAt'
    )
  ), '[]'::jsonb) INTO v_sanitized_write_offs
  FROM jsonb_array_elements(COALESCE(v_property.arrears_write_offs, '[]'::jsonb)) AS w
  WHERE (w->>'leaseId' IS NULL OR w->>'leaseId' = p_lease_id);

  v_statements := COALESCE(v_property.utility_statements, '[]'::jsonb);
  v_readings := COALESCE(v_property.meter_readings, '[]'::jsonb);

  v_result := jsonb_build_object(
    'lease', v_lease,
    'property', jsonb_build_object(
      'id', v_property.id,
      'title', v_property.title,
      'address', v_property.address,
      'city', v_property.city,
      'utility_type', v_property.utility_type,
      'prepaid_vendor_name', v_property.prepaid_vendor_name,
      'arrears_opening_balance_zar', v_property.arrears_opening_balance_zar
    ),
    'landlord', v_landlord,
    'utility_statements', v_statements,
    'meter_readings', v_readings,
    'payment_records', v_payments,
    'arrears_write_offs', v_sanitized_write_offs,
    'arrears_opening_balance_zar', COALESCE(v_property.arrears_opening_balance_zar, 0)
  );

  RETURN v_result;
END;
$$;

-- 3. Grant execution permissions on RPC to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.get_public_tenant_statement(text) TO anon, authenticated, service_role;

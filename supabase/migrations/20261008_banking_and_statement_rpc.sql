-- Migration: 20261008_banking_and_statement_rpc.sql
-- Description:
-- 1. Adds remittance banking columns to public.profiles.
-- 2. Adds missing payment_records, transactions, and arrears_opening_balance_zar to public.properties.
-- 3. Creates backward-compatible public.investor_profiles view pointing to public.profiles.
-- 4. Updates get_public_tenant_statement RPC to query public.profiles and return complete landlord banking remittance details.

-- 1. Add banking remittance details to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_holder text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'Cheque / Current',
ADD COLUMN IF NOT EXISTS branch_code text,
ADD COLUMN IF NOT EXISTS swift_code text,
ADD COLUMN IF NOT EXISTS remittance_instructions text;

-- 2. Add payment and arrears columns to public.properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS payment_records JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS transactions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS arrears_opening_balance_zar NUMERIC DEFAULT 0;

-- 3. Create backward-compatible view for public.investor_profiles pointing to public.profiles
CREATE OR REPLACE VIEW public.investor_profiles AS
SELECT * FROM public.profiles;

-- 4. Fix get_public_tenant_statement RPC to query public.profiles and include banking details
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
  -- Find property containing this lease
  SELECT * INTO v_property
  FROM public.properties
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(leases, '[]'::jsonb)) AS l
    WHERE l->>'id' = p_lease_id
  );

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Extract the specific lease
  SELECT l INTO v_lease
  FROM jsonb_array_elements(COALESCE(v_property.leases, '[]'::jsonb)) AS l
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

-- 5. Grant execution permissions on RPC to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.get_public_tenant_statement(text) TO anon, authenticated, service_role;

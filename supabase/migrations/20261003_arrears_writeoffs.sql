-- Migration: 20261003_arrears_writeoffs.sql
-- Description: Adds arrears_write_offs column to properties table and updates get_public_tenant_statement RPC
-- to return sanitized arrears write-offs (omitting internal notes and reasons for public tenant privacy).
--
-- MANUAL INSTRUCTIONS:
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor):
-- https://supabase.com/dashboard/project/_/sql

-- 1. Add arrears_write_offs column to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS arrears_write_offs JSONB DEFAULT '[]'::jsonb;

-- 2. Update get_public_tenant_statement RPC to return sanitized write-offs
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

  -- Fetch landlord / investor profile
  SELECT to_jsonb(ip.*) INTO v_landlord
  FROM public.investor_profiles ip
  WHERE ip.user_id = v_property.user_id
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

GRANT EXECUTE ON FUNCTION public.get_public_tenant_statement(text) TO anon, authenticated, service_role;

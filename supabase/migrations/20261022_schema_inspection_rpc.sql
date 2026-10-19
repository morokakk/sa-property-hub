-- Migration: 20261022_schema_inspection_rpc.sql
-- Description: Expose information_schema.columns inspection view and RPC for automated schema parity testing, and complete opportunities schema parity

-- 1. Opportunities schema parity (DBSYNC-06)
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS vat_exempt_agent boolean DEFAULT false;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS interest_rate_margin numeric DEFAULT 0;

-- 2. Create schema columns inspection view
CREATE OR REPLACE VIEW public.schema_columns_inspection AS
SELECT c.table_name::text, c.column_name::text, c.data_type::text, c.is_nullable::text
FROM information_schema.columns c
WHERE c.table_schema = 'public';

GRANT SELECT ON public.schema_columns_inspection TO anon, authenticated;

-- 3. Create schema columns inspection RPC
CREATE OR REPLACE FUNCTION public.get_schema_columns(target_table text DEFAULT NULL)
RETURNS TABLE(table_name text, column_name text, data_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, information_schema
AS $$
  SELECT c.table_name::text, c.column_name::text, c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND (target_table IS NULL OR c.table_name = target_table);
$$;

GRANT EXECUTE ON FUNCTION public.get_schema_columns(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

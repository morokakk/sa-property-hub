-- Migration: 20261021_schema_parity.sql
-- Description: DBSYNC-06, DBSYNC-07, DBSYNC-09, DBSYNC-10 schema parity for multi-unit properties/flips, meter registry, and covering indexes

-- 1. Add missing multi-unit and meter columns to public.properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS number_of_units integer DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS floor_area_sqm numeric DEFAULT NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS meter_registry jsonb DEFAULT '[]'::jsonb;

-- 2. Add missing multi-unit columns to public.flips
ALTER TABLE public.flips ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.flips ADD COLUMN IF NOT EXISTS number_of_units integer DEFAULT 1;
ALTER TABLE public.flips ADD COLUMN IF NOT EXISTS floor_area_sqm numeric DEFAULT NULL;

-- 3. Add GIN indexes on JSONB lease columns for high-performance tenant lookup
CREATE INDEX IF NOT EXISTS idx_properties_leases_gin ON public.properties USING gin (leases);
CREATE INDEX IF NOT EXISTS idx_properties_archived_leases_gin ON public.properties USING gin (archived_leases);

-- 4. Ensure covering indexes exist on all foreign keys and user_id columns
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_flips_user_id ON public.flips(user_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_user_id ON public.boq_items(user_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_flip_id ON public.boq_items(flip_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_user_id ON public.funding_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON public.opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);

-- 5. Standardize RLS policies to use cached (select auth.uid()) = user_id evaluation
DO $$
BEGIN
  -- Profiles
  DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
  CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
  CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
  CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
  CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Properties
  DROP POLICY IF EXISTS properties_select_own ON public.properties;
  CREATE POLICY properties_select_own ON public.properties FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS properties_insert_own ON public.properties;
  CREATE POLICY properties_insert_own ON public.properties FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS properties_update_own ON public.properties;
  CREATE POLICY properties_update_own ON public.properties FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS properties_delete_own ON public.properties;
  CREATE POLICY properties_delete_own ON public.properties FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Flips
  DROP POLICY IF EXISTS flips_select_own ON public.flips;
  CREATE POLICY flips_select_own ON public.flips FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS flips_insert_own ON public.flips;
  CREATE POLICY flips_insert_own ON public.flips FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS flips_update_own ON public.flips;
  CREATE POLICY flips_update_own ON public.flips FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS flips_delete_own ON public.flips;
  CREATE POLICY flips_delete_own ON public.flips FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- BOQ Items
  DROP POLICY IF EXISTS boq_items_select_own ON public.boq_items;
  CREATE POLICY boq_items_select_own ON public.boq_items FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS boq_items_insert_own ON public.boq_items;
  CREATE POLICY boq_items_insert_own ON public.boq_items FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS boq_items_update_own ON public.boq_items;
  CREATE POLICY boq_items_update_own ON public.boq_items FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS boq_items_delete_own ON public.boq_items;
  CREATE POLICY boq_items_delete_own ON public.boq_items FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Funding Sources
  DROP POLICY IF EXISTS funding_sources_select_own ON public.funding_sources;
  CREATE POLICY funding_sources_select_own ON public.funding_sources FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS funding_sources_insert_own ON public.funding_sources;
  CREATE POLICY funding_sources_insert_own ON public.funding_sources FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS funding_sources_update_own ON public.funding_sources;
  CREATE POLICY funding_sources_update_own ON public.funding_sources FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS funding_sources_delete_own ON public.funding_sources;
  CREATE POLICY funding_sources_delete_own ON public.funding_sources FOR DELETE USING ((SELECT auth.uid()) = user_id);
END $$;

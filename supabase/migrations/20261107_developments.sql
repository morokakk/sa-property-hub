-- Migration: 20261107_developments.sql
-- Description: Cloud sync storage for the /developments module (ground-up & subdivision projects).
-- Nested aggregates (units, approvals, soft costs, BOQ items, compliance, drive vault) are stored as
-- jsonb because they are always read/written together with their parent project.
-- Composite primary key (user_id, id) prevents cross-user id collisions on seeded demo ids (dev-1, dev-2).

CREATE TABLE IF NOT EXISTS public.developments (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity & node
  title text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  province text,
  investment_node_id text,
  development_type text NOT NULL DEFAULT 'Subdivision & Cluster',
  is_vat_registered_developer boolean NOT NULL DEFAULT false,
  tax_entity_type text,

  -- Timeline
  current_phase text NOT NULL DEFAULT 'Feasibility',
  pre_approval_months integer NOT NULL DEFAULT 0,
  construction_months integer NOT NULL DEFAULT 0,
  sell_down_months integer NOT NULL DEFAULT 0,

  -- Cost stack
  land_purchase_price_zar numeric NOT NULL DEFAULT 0,
  acquisition_costs_zar numeric NOT NULL DEFAULT 0,
  sec118_arrears_zar numeric NOT NULL DEFAULT 0,
  soft_costs jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_buildable_area_sqm numeric NOT NULL DEFAULT 0,
  budgeted_hard_cost_per_sqm_zar numeric NOT NULL DEFAULT 0,
  contingency_percent numeric NOT NULL DEFAULT 0,
  boq_items jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Carrying & finance
  monthly_pre_approval_holding_burn_zar numeric NOT NULL DEFAULT 0,
  monthly_construction_holding_burn_zar numeric NOT NULL DEFAULT 0,
  development_facility_limit_zar numeric NOT NULL DEFAULT 0,
  development_facility_drawn_zar numeric NOT NULL DEFAULT 0,
  development_facility_repaid_zar numeric NOT NULL DEFAULT 0,
  pre_sales_hurdle_percent numeric NOT NULL DEFAULT 0,
  linked_funding_source_id text,

  -- Inventory & compliance
  approvals jsonb NOT NULL DEFAULT '{}'::jsonb,
  units jsonb NOT NULL DEFAULT '[]'::jsonb,
  compliance jsonb,
  drive_vault jsonb,

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT developments_pkey PRIMARY KEY (user_id, id),
  CONSTRAINT developments_units_is_array CHECK (jsonb_typeof(units) = 'array'),
  CONSTRAINT developments_boq_items_is_array CHECK (jsonb_typeof(boq_items) = 'array'),
  CONSTRAINT developments_soft_costs_is_object CHECK (jsonb_typeof(soft_costs) = 'object'),
  CONSTRAINT developments_approvals_is_object CHECK (jsonb_typeof(approvals) = 'object')
);

-- The composite primary key (user_id, id) already serves all per-user lookups; no extra index needed.

ALTER TABLE public.developments ENABLE ROW LEVEL SECURITY;

-- Explicit Data API exposure: authenticated owners only, nothing for anon.
REVOKE ALL ON public.developments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developments TO authenticated;

DROP POLICY IF EXISTS developments_select_own ON public.developments;
CREATE POLICY developments_select_own ON public.developments
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS developments_insert_own ON public.developments;
CREATE POLICY developments_insert_own ON public.developments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS developments_update_own ON public.developments;
CREATE POLICY developments_update_own ON public.developments
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS developments_delete_own ON public.developments;
CREATE POLICY developments_delete_own ON public.developments
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';

-- Migration: 20261110_development_comments_ledger.sql
-- Additive columns & public Deal Room RPC for Project Comment & Action Ledger on public.developments

ALTER TABLE public.developments
  ADD COLUMN IF NOT EXISTS comments_ledger jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.developments
  ADD COLUMN IF NOT EXISTS share_token text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'developments_comments_ledger_is_array'
  ) THEN
    ALTER TABLE public.developments
      ADD CONSTRAINT developments_comments_ledger_is_array
      CHECK (comments_ledger IS NULL OR jsonb_typeof(comments_ledger) = 'array');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_developments_share_token
  ON public.developments (share_token)
  WHERE share_token IS NOT NULL;

-- =====================================================================
-- Public Capability-Token Deal Room RPC (POPIA-Masked, SECURITY DEFINER)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_public_development_deal_room(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_token text;
  v_dev public.developments%ROWTYPE;
  v_entity_name text;
  v_reg_number text;
  v_masked_units jsonb;
  v_clean_approvals jsonb;
  v_zoning jsonb;
  v_fallback_approvals jsonb := '{
    "splumaRezoningSubdivision": {"status": "Not Started"},
    "sgDiagramApproval": {"status": "Not Started"},
    "municipalBuildingPlans": {"status": "Not Started"},
    "nhbrcEnrolment": {"status": "Not Started"},
    "sectionalTitleRegister": {"status": "Not Started"},
    "occupancyCertificate": {"status": "Not Started"}
  }'::jsonb;
  v_dev_part1 jsonb;
  v_dev_part2 jsonb;
BEGIN
  v_clean_token := NULLIF(trim(COALESCE(p_token, '')), '');
  IF v_clean_token IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_dev
  FROM public.developments
  WHERE share_token = v_clean_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Non-PII entity attribution only (never return email/phone/user_id)
  SELECT p.entity_name, p.registration_or_id
  INTO v_entity_name, v_reg_number
  FROM public.profiles p
  WHERE p.user_id = v_dev.user_id
  LIMIT 1;

  -- POPIA Masking: strip conveyancerRef and mask buyerName on unit inventory
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN NULLIF(trim(COALESCE(u.elem->>'buyerName', '')), '') IS NOT NULL
          OR (u.elem->>'status') IN ('Sold & Transferred', 'Bond Approved / Guarantees Issued', 'Reserved (OTP Signed)')
        THEN (u.elem - 'conveyancerRef' - 'buyerName') || jsonb_build_object('buyerName', 'Private Buyer (Masked)')
        ELSE (u.elem - 'conveyancerRef' - 'buyerName')
      END
      ORDER BY u.idx
    ),
    '[]'::jsonb
  )
  INTO v_masked_units
  FROM jsonb_array_elements(
    CASE
      WHEN v_dev.units IS NOT NULL AND jsonb_typeof(v_dev.units) = 'array' THEN v_dev.units
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS u(elem, idx);

  -- Extract embedded _zoningProfile out of approvals JSONB
  IF v_dev.approvals IS NOT NULL AND jsonb_typeof(v_dev.approvals) = 'object' THEN
    v_zoning := v_dev.approvals->'_zoningProfile';
    v_clean_approvals := v_dev.approvals - '_zoningProfile';
  ELSE
    v_zoning := NULL;
    v_clean_approvals := '{}'::jsonb;
  END IF;

  IF v_clean_approvals = '{}'::jsonb THEN
    v_clean_approvals := v_fallback_approvals;
  END IF;

  -- Split jsonb_build_object to stay safely below PostgreSQL 100-argument function limit
  v_dev_part1 := jsonb_build_object(
    'id', v_dev.id,
    'title', v_dev.title,
    'address', v_dev.address,
    'city', v_dev.city,
    'province', v_dev.province,
    'investmentNodeId', v_dev.investment_node_id,
    'developmentType', COALESCE(v_dev.development_type, 'Subdivision & Cluster'),
    'isVatRegisteredDeveloper', COALESCE(v_dev.is_vat_registered_developer, false),
    'taxEntityType', v_dev.tax_entity_type,
    'currentPhase', COALESCE(v_dev.current_phase, 'Feasibility'),
    'preApprovalMonths', COALESCE(v_dev.pre_approval_months, 0),
    'constructionMonths', COALESCE(v_dev.construction_months, 0),
    'sellDownMonths', COALESCE(v_dev.sell_down_months, 0),
    'landPurchasePriceZAR', COALESCE(v_dev.land_purchase_price_zar, 0),
    'isDeferredLandPaymentLAA', COALESCE(v_dev.is_deferred_land_payment_laa, false),
    'acquisitionCostsZAR', COALESCE(v_dev.acquisition_costs_zar, 0),
    'sec118ArrearsZAR', COALESCE(v_dev.sec118_arrears_zar, 0),
    'softCosts', COALESCE(v_dev.soft_costs, '{}'::jsonb),
    'totalBuildableAreaSqm', COALESCE(v_dev.total_buildable_area_sqm, 0),
    'budgetedHardCostPerSqmZAR', COALESCE(v_dev.budgeted_hard_cost_per_sqm_zar, 0)
  );

  v_dev_part2 := jsonb_build_object(
    'contingencyPercent', COALESCE(v_dev.contingency_percent, 0),
    'boqItems', CASE WHEN v_dev.boq_items IS NOT NULL AND jsonb_typeof(v_dev.boq_items) = 'array' THEN v_dev.boq_items ELSE '[]'::jsonb END,
    'monthlyPreApprovalHoldingBurnZAR', COALESCE(v_dev.monthly_pre_approval_holding_burn_zar, 0),
    'monthlyConstructionHoldingBurnZAR', COALESCE(v_dev.monthly_construction_holding_burn_zar, 0),
    'developmentFacilityLimitZAR', COALESCE(v_dev.development_facility_limit_zar, 0),
    'developmentFacilityDrawnZAR', COALESCE(v_dev.development_facility_drawn_zar, 0),
    'developmentFacilityRepaidZAR', COALESCE(v_dev.development_facility_repaid_zar, 0),
    'preSalesHurdlePercent', COALESCE(v_dev.pre_sales_hurdle_percent, 0),
    'seniorJvPartnerName', v_dev.senior_jv_partner_name,
    'linkedFundingSourceId', v_dev.linked_funding_source_id,
    'approvals', v_clean_approvals,
    'units', v_masked_units,
    'commentsLedger', CASE WHEN v_dev.comments_ledger IS NOT NULL AND jsonb_typeof(v_dev.comments_ledger) = 'array' THEN v_dev.comments_ledger ELSE '[]'::jsonb END,
    'compliance', v_dev.compliance,
    'zoningProfile', v_zoning,
    'createdAt', v_dev.created_at
  );

  RETURN jsonb_build_object(
    'development', v_dev_part1 || v_dev_part2,
    'sponsor', jsonb_build_object(
      'entityName', COALESCE(NULLIF(trim(v_entity_name), ''), NULLIF(trim(v_dev.senior_jv_partner_name), ''), 'Private Development Sponsor'),
      'registrationNumber', v_reg_number
    ),
    'isDemo', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_development_deal_room(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_development_deal_room(text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

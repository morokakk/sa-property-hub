-- Migration: 20261017_rental_funding_campaign_columns.sql
-- Description: Adds funding campaign columns to properties (rentals) table to match flips/opportunities schema symmetry,
-- and adds contact_person and security_offered columns to funding_sources table.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS funding_required_zar NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS capital_raised_zar NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS primary_funder_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS primary_funder_contact TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS primary_funder_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS co_funders_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promised_return_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promised_return_rate_percent NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promised_payout_schedule TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS security_offered TEXT DEFAULT NULL;

ALTER TABLE public.funding_sources
  ADD COLUMN IF NOT EXISTS contact_person TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS security_offered TEXT DEFAULT NULL;

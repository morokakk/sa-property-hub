-- Migration: 20261010_occupant_risk.sql
-- Description: Adds occupant_risk JSONB column to opportunities and flips tables
-- to support PIE Act eviction underwriting, court jurisdiction litigation reserves, and carrying cost burns.
--
-- Applied to Supabase project wawpfdbymgseodftemsz (version 20261010192905).

-- 1. Add occupant_risk to public.opportunities
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS occupant_risk JSONB DEFAULT NULL;

-- 2. Add occupant_risk to public.flips
ALTER TABLE public.flips
ADD COLUMN IF NOT EXISTS occupant_risk JSONB DEFAULT NULL;

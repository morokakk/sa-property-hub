-- Migration: 20261016_funding_payment_reference.sql
-- Description: Adds optional last_payment_reference column to funding_sources table
-- to track bank EFT reference numbers and payment statement audit notes.

ALTER TABLE public.funding_sources
ADD COLUMN IF NOT EXISTS last_payment_reference TEXT DEFAULT NULL;

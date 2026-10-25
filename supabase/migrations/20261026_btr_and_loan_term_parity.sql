-- Migration: 20261026_btr_and_loan_term_parity.sql
-- Description: Add project_strategy to public.flips and loan_term_years to public.properties for Build-to-Rent & DFI loan term cloud sync parity

alter table public.flips
  add column if not exists project_strategy text default 'flip_for_sale';

alter table public.properties
  add column if not exists loan_term_years integer default 20;

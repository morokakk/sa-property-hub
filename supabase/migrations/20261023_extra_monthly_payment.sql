-- Migration: 20261023_extra_monthly_payment.sql
-- Description: Add optional extra_monthly_payment_zar to opportunities and properties tables for accelerated debt paydown modeling

alter table public.opportunities
  add column if not exists extra_monthly_payment_zar numeric;

alter table public.properties
  add column if not exists extra_monthly_payment_zar numeric;

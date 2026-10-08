-- Migration: 20261008_communal_services.sql
-- Description: Adds monthly_communal_services_zar column to properties and opportunities tables
-- to support multi-let communes, student housing, and serviced communal OpEx (Wi-Fi, cleaner, armed response, garden).
--
-- MANUAL INSTRUCTIONS:
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor):
-- https://supabase.com/dashboard/project/_/sql

-- 1. Add monthly_communal_services_zar to public.properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS monthly_communal_services_zar NUMERIC DEFAULT 0;

-- 2. Add monthly_communal_services_zar to public.opportunities
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS monthly_communal_services_zar NUMERIC DEFAULT 0;

-- Migration: 20261031_user_feedback.sql
-- Description: In-App User Feedback Engine storage table with write-only client RLS

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  category text NOT NULL,
  module_route text NOT NULL,
  message text NOT NULL,
  contact_optional text NULL,
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Revoke default privileges from client roles
REVOKE ALL ON public.user_feedback FROM anon, authenticated;

-- Grant INSERT only to anon and authenticated roles (write-only for client roles)
GRANT INSERT ON public.user_feedback TO anon, authenticated;

-- Create RLS policy allowing anon and authenticated users to insert feedback records
CREATE POLICY user_feedback_insert_policy ON public.user_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

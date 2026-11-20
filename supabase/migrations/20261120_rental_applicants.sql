-- Additive JSONB column for Open-Day Rental Applicants & Waitlist on public.properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS applicants jsonb DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_applicants_is_array'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_applicants_is_array
      CHECK (applicants IS NULL OR jsonb_typeof(applicants) = 'array');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

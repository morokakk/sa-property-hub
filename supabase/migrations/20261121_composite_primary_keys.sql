-- Migration: 20261121_composite_primary_keys.sql
-- Description: Migrate 7 legacy portfolio tables from global PRIMARY KEY (id)
--              to composite PRIMARY KEY (user_id, id) matching public.developments (DB-03).

-- 1. Drop legacy single-column FK on boq_items -> flips
ALTER TABLE public.boq_items
  DROP CONSTRAINT IF EXISTS boq_items_flip_id_fkey;

-- 2. Migrate primary keys to composite (user_id, id)
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_pkey;
ALTER TABLE public.properties ADD PRIMARY KEY (user_id, id);

ALTER TABLE public.flips DROP CONSTRAINT IF EXISTS flips_pkey;
ALTER TABLE public.flips ADD PRIMARY KEY (user_id, id);

ALTER TABLE public.boq_items DROP CONSTRAINT IF EXISTS boq_items_pkey;
ALTER TABLE public.boq_items ADD PRIMARY KEY (user_id, id);

ALTER TABLE public.funding_sources DROP CONSTRAINT IF EXISTS funding_sources_pkey;
ALTER TABLE public.funding_sources ADD PRIMARY KEY (user_id, id);

ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_pkey;
ALTER TABLE public.opportunities ADD PRIMARY KEY (user_id, id);

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE public.tasks ADD PRIMARY KEY (user_id, id);

ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_pkey;
ALTER TABLE public.suppliers ADD PRIMARY KEY (user_id, id);

-- 3. Recreate composite foreign key on boq_items referencing flips(user_id, id)
ALTER TABLE public.boq_items
  ADD CONSTRAINT boq_items_flip_id_fkey
  FOREIGN KEY (user_id, flip_id)
  REFERENCES public.flips (user_id, id)
  ON DELETE CASCADE;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

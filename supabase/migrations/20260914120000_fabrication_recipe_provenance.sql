-- Explicit recipe provenance. Does not modify definitions or discounts.
ALTER TABLE public.fabrication_recipes
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_revision text;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fabrication_recipes_source_type_check'
      AND conrelid = 'public.fabrication_recipes'::regclass
      AND pg_get_constraintdef(oid) NOT LIKE '%workshop%'
  ) THEN
    ALTER TABLE public.fabrication_recipes
      DROP CONSTRAINT fabrication_recipes_source_type_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fabrication_recipes_source_type_check'
      AND conrelid = 'public.fabrication_recipes'::regclass
  ) THEN
    ALTER TABLE public.fabrication_recipes
      ADD CONSTRAINT fabrication_recipes_source_type_check
      CHECK (
        source_type IN (
          'manual',
          'copied',
          'imported_ai',
          'legacy',
          'workshop',
          'manufacturer',
          'supplier',
          'ventora_reference',
          'unknown'
        )
      );
  END IF;
END
$migration$;

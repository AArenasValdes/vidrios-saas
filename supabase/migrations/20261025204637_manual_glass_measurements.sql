-- Dedicated, optional storage for explicitly entered final glass pane dimensions.
-- NULL preserves legacy [gpm] reads; no historical quotation rows are rewritten.
ALTER TABLE public.cotizacion_items
  ADD COLUMN IF NOT EXISTS manual_glass_measurements jsonb NULL;

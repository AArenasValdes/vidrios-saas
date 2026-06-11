ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS pdf_descargado_en timestamptz;

COMMENT ON COLUMN public.cotizaciones.pdf_descargado_en IS
  'Marca silenciosa cuando el maestro descarga el PDF desde la app. No cambia el estado comercial.';

-- Migration: Add UTM tracking and missing fields to solicitudes_contacto

-- Already have: id, nombre, empresa, correo, telefono, ayuda, estado, origen, ip, user_agent, creado_en, actualizado_en

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- organization_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN organization_id uuid;
  END IF;

  -- contacto
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'contacto'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN contacto text;
  END IF;

  -- tipo_trabajo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'tipo_trabajo'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN tipo_trabajo text;
  END IF;

  -- mensaje
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'mensaje'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN mensaje text;
  END IF;

  -- contexto
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'contexto'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN contexto text;
  END IF;

  -- utm_source
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'utm_source'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN utm_source text;
  END IF;

  -- utm_medium
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'utm_medium'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN utm_medium text;
  END IF;

  -- utm_campaign
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'utm_campaign'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN utm_campaign text;
  END IF;

  -- source_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'solicitudes_contacto' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE public.solicitudes_contacto ADD COLUMN source_url text;
  END IF;
END
$$;

-- Add index on utm_source for filtering
CREATE INDEX IF NOT EXISTS solicitudes_contacto_utm_source_idx
  ON public.solicitudes_contacto (utm_source);

-- Extender organization_profile con campos de landing configurable.
-- Cada organización puede personalizar su mini landing pública sin tocar datos de empresa.

ALTER TABLE public.organization_profile
  ADD COLUMN IF NOT EXISTS public_name text,
  ADD COLUMN IF NOT EXISTS public_subtitle text,
  ADD COLUMN IF NOT EXISTS public_zone text,
  ADD COLUMN IF NOT EXISTS public_business_type text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS hero_mode text NOT NULL DEFAULT 'gradient'
    CHECK (hero_mode IN ('image', 'gradient')),
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS hero_title text,
  ADD COLUMN IF NOT EXISTS hero_subtitle text,
  ADD COLUMN IF NOT EXISTS show_gallery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_schedule boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_rating boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating_label text,
  ADD COLUMN IF NOT EXISTS jobs_count_label text,
  ADD COLUMN IF NOT EXISTS form_title text,
  ADD COLUMN IF NOT EXISTS form_subtitle text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organization_profile.public_name IS 'Nombre comercial visible en la landing publica. Si es NULL, se usa empresa_nombre.';
COMMENT ON COLUMN public.organization_profile.public_subtitle IS 'Rubro o especialidad visible en la landing (ej: Vidrios y aluminio).';
COMMENT ON COLUMN public.organization_profile.public_zone IS 'Zona o cobertura geografica visible en la landing.';
COMMENT ON COLUMN public.organization_profile.public_business_type IS 'Tipo de negocio: vidrios, aluminio, ambos, etc.';
COMMENT ON COLUMN public.organization_profile.secondary_color IS 'Color secundario en formato hex para la landing. Si es NULL, se usa verde WhatsApp (#25d366).';
COMMENT ON COLUMN public.organization_profile.hero_mode IS 'Modo del hero: image o gradient. Default: gradient.';
COMMENT ON COLUMN public.organization_profile.hero_image_url IS 'URL de la imagen hero de la landing. Si hero_mode=image y esto es NULL, se muestra degradado.';
COMMENT ON COLUMN public.organization_profile.hero_title IS 'Titulo principal del hero. Si es NULL, se usa un default.';
COMMENT ON COLUMN public.organization_profile.hero_subtitle IS 'Subtitulo del hero de la landing.';
COMMENT ON COLUMN public.organization_profile.show_gallery IS 'Si true, se muestra la galeria de fotos en la landing.';
COMMENT ON COLUMN public.organization_profile.show_schedule IS 'Si true, se muestra el horario en la landing.';
COMMENT ON COLUMN public.organization_profile.show_rating IS 'Si true, se muestra el rating en la landing.';
COMMENT ON COLUMN public.organization_profile.rating_label IS 'Texto de rating visible (ej: 4.9/5 en Google).';
COMMENT ON COLUMN public.organization_profile.jobs_count_label IS 'Texto de cantidad de trabajos (ej: +200 trabajos realizados).';
COMMENT ON COLUMN public.organization_profile.form_title IS 'Titulo del formulario de solicitud en la landing.';
COMMENT ON COLUMN public.organization_profile.form_subtitle IS 'Subtitulo del formulario de solicitud.';
COMMENT ON COLUMN public.organization_profile.is_published IS 'Si true, la landing esta publicada y visible con configuracion custom. Si false, se muestra version basica.';

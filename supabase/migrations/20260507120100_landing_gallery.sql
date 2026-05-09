-- Tabla de galeria de fotos para la landing publica de cada organizacion.
-- Relacion 1:N con organization_profile.

CREATE TABLE IF NOT EXISTS public.public_landing_gallery (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id bigint NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  landing_id bigint REFERENCES public.organization_profile(organization_id) ON DELETE CASCADE,
  image_url text NOT NULL,
  label text,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX public_landing_gallery_org_sort_idx
  ON public.public_landing_gallery (organization_id, sort_order);

ALTER TABLE public.public_landing_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY landing_gallery_select_own ON public.public_landing_gallery
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT u.organization_id FROM public.users u
    WHERE lower(u.correo) = lower(auth.email()) AND u.eliminado_en IS NULL
  ));

CREATE POLICY landing_gallery_insert_own ON public.public_landing_gallery
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT u.organization_id FROM public.users u
    WHERE lower(u.correo) = lower(auth.email()) AND u.eliminado_en IS NULL
  ));

CREATE POLICY landing_gallery_update_own ON public.public_landing_gallery
  FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT u.organization_id FROM public.users u
    WHERE lower(u.correo) = lower(auth.email()) AND u.eliminado_en IS NULL
  ));

CREATE POLICY landing_gallery_delete_own ON public.public_landing_gallery
  FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT u.organization_id FROM public.users u
    WHERE lower(u.correo) = lower(auth.email()) AND u.eliminado_en IS NULL
  ));

COMMENT ON TABLE public.public_landing_gallery IS 'Fotos de galeria para la landing publica de cada organizacion.';
COMMENT ON COLUMN public.public_landing_gallery.image_url IS 'URL publica de la imagen almacenada en Supabase Storage.';
COMMENT ON COLUMN public.public_landing_gallery.label IS 'Etiqueta visible de la foto (ej: Ventana, Shower, Terraza).';
COMMENT ON COLUMN public.public_landing_gallery.sort_order IS 'Orden visual de la foto dentro de la galeria. Menor = primero.';
COMMENT ON COLUMN public.public_landing_gallery.is_visible IS 'Si false, la foto no se muestra en la landing publica pero se conserva en la base.';

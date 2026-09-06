-- Fase A/B: grupos de Facebook como canal editorial explícito.
-- Los resultados de alcance e interacción son manuales hasta contar con una
-- fuente externa verificable; se guardan en metadata_json existente.

alter table public.growth_content_items
  drop constraint if exists growth_content_items_canal_check;

alter table public.growth_content_items
  add constraint growth_content_items_canal_check check (
    canal in ('instagram', 'facebook', 'grupos', 'tiktok', 'youtube', 'whatsapp', 'interno')
  );

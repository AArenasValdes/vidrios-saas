alter table public.organization_profile
  add column if not exists responsable_comercial text;

comment on column public.organization_profile.responsable_comercial is
  'Nombre del responsable comercial que aparece en PDF como Cotiza.';

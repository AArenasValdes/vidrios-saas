alter table public.organization_profile
  add column if not exists is_test_account boolean not null default false;

comment on column public.organization_profile.is_test_account is
  'Si true, la organizacion es una cuenta de prueba interna y debe excluirse de metricas comerciales reales.';

create index if not exists organization_profile_is_test_account_idx
  on public.organization_profile (is_test_account)
  where is_test_account = true;

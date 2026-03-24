create table if not exists public.solicitudes_contacto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  empresa text not null,
  correo text not null,
  telefono text not null,
  ayuda text not null,
  estado text not null default 'nueva',
  origen text not null default 'landing',
  ip text,
  user_agent text,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now()),
  constraint solicitudes_contacto_ayuda_check
    check (ayuda in ('demo', 'cotizacion', 'ventas')),
  constraint solicitudes_contacto_estado_check
    check (estado in ('nueva', 'contactada', 'cerrada', 'descartada'))
);

comment on table public.solicitudes_contacto is
  'Leads entrantes desde la landing comercial de Ventora.';

comment on column public.solicitudes_contacto.ayuda is
  'Motivo principal del contacto: demo, cotizacion o ventas.';

create index if not exists solicitudes_contacto_creado_en_idx
  on public.solicitudes_contacto (creado_en desc);

alter table public.solicitudes_contacto enable row level security;

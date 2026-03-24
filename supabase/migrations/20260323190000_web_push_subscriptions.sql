create table if not exists public.web_push_subscriptions (
  id bigint generated always as identity primary key,
  organization_id bigint not null,
  auth_user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  subscription jsonb not null,
  user_email text,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

create index if not exists web_push_subscriptions_org_active_idx
  on public.web_push_subscriptions (organization_id, is_active);

create index if not exists web_push_subscriptions_auth_user_idx
  on public.web_push_subscriptions (auth_user_id, is_active);

comment on table public.web_push_subscriptions is
  'Subscriptions Web Push para dispositivos Android PWA de las organizaciones.';

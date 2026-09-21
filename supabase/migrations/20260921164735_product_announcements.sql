create table if not exists public.product_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  body text not null,
  category text not null default 'mejora',
  status text not null default 'draft',
  published_at timestamptz,
  action_label text,
  action_href text,
  related_feedback_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_announcements_title_check
    check (char_length(btrim(title)) between 1 and 120),
  constraint product_announcements_summary_check
    check (char_length(btrim(summary)) between 1 and 240),
  constraint product_announcements_body_check
    check (char_length(btrim(body)) between 1 and 6000),
  constraint product_announcements_category_check
    check (category in ('nueva_funcion', 'mejora', 'correccion', 'general')),
  constraint product_announcements_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint product_announcements_published_at_check
    check (status <> 'published' or published_at is not null),
  constraint product_announcements_action_check
    check (
      (action_label is null and action_href is null)
      or (
        action_label is not null
        and char_length(btrim(action_label)) between 1 and 48
        and action_href is not null
        and char_length(action_href) <= 180
        and left(action_href, 1) = '/'
        and left(action_href, 2) <> '//'
      )
    ),
  constraint product_announcements_feedback_fkey
    foreign key (related_feedback_id) references public.product_feedback(id) on delete set null,
  constraint product_announcements_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null
);

create table if not exists public.product_announcement_reads (
  announcement_id uuid not null,
  organization_id bigint not null,
  auth_user_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (announcement_id, organization_id, auth_user_id),
  constraint product_announcement_reads_announcement_fkey
    foreign key (announcement_id) references public.product_announcements(id) on delete cascade,
  constraint product_announcement_reads_organization_fkey
    foreign key (organization_id) references public.organizations(id) on delete cascade,
  constraint product_announcement_reads_user_fkey
    foreign key (auth_user_id) references auth.users(id) on delete cascade
);

create index if not exists product_announcements_published_idx
  on public.product_announcements (published_at desc)
  where status = 'published';

create index if not exists product_announcements_status_created_idx
  on public.product_announcements (status, created_at desc);

create index if not exists product_announcement_reads_user_idx
  on public.product_announcement_reads (auth_user_id, organization_id, read_at desc);

alter table public.product_announcements enable row level security;
alter table public.product_announcement_reads enable row level security;

revoke all on table public.product_announcements from anon, authenticated;
revoke all on table public.product_announcement_reads from anon, authenticated;
grant select, insert, update, delete on table public.product_announcements to service_role;
grant select, insert, update, delete on table public.product_announcement_reads to service_role;

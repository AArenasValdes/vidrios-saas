alter table public.onboarding_checklists
  drop constraint if exists onboarding_checklists_step_key_check;

alter table public.onboarding_checklists
  add constraint onboarding_checklists_step_key_check check (
    step_key = any (
      array[
        'company_ready'::text,
        'public_page_live'::text,
        'channel_ready'::text,
        'first_lead'::text,
        'first_quote'::text,
        'first_share'::text,
        'activation_complete'::text
      ]
    )
  );

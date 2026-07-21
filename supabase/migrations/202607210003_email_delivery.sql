create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  recipient text not null,
  kind text not null check (kind in ('group_invitation', 'plan_reminder', 'paper_reminder', 'review_completed')),
  idempotency_key text not null unique,
  status text not null check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index email_deliveries_group_created_idx on public.email_deliveries(group_id, created_at desc);
alter table public.email_deliveries enable row level security;
create policy email_deliveries_select_teacher on public.email_deliveries for select to authenticated
using (public.is_group_teacher(group_id));

-- PaperView v1 core schema
-- Apply this migration from the Supabase dashboard or CLI after creating a project.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references public.profiles(id),
  timezone text not null default 'Asia/Shanghai',
  plan_deadline_day smallint not null default 5 check (plan_deadline_day between 1 and 28),
  plan_deadline_time time not null default '23:59',
  paper_deadline_rule text not null default 'last_day' check (paper_deadline_rule in ('last_day', 'fixed_day')),
  paper_deadline_day smallint check (paper_deadline_day between 1 and 28),
  paper_deadline_time time not null default '23:59',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  status text not null default 'active' check (status in ('active', 'archived')),
  joined_at timestamptz not null default now(),
  archived_at timestamptz,
  primary key (group_id, user_id)
);

create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  role text not null default 'student' check (role in ('teacher', 'student')),
  email text,
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.monthly_records (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id),
  research_month date not null check (research_month = date_trunc('month', research_month)::date),
  plan_text text,
  plan_submitted_at timestamptz,
  status text not null default 'missing' check (status in ('missing', 'submitted', 'awaiting_teacher', 'completed')),
  is_backfill boolean not null default false,
  submitted_after_deadline boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, student_id, research_month)
);

create table public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  monthly_record_id uuid not null references public.monthly_records(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes > 0),
  page_count integer not null check (page_count > 0),
  sha256 text not null,
  created_by uuid not null references public.profiles(id),
  submitted_at timestamptz not null default now(),
  unique (monthly_record_id, version_number)
);

alter table public.monthly_records
  add column official_version_id uuid references public.submission_versions(id);

create table public.paper_references (
  monthly_record_id uuid not null references public.monthly_records(id) on delete cascade,
  referenced_record_id uuid not null references public.monthly_records(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  primary key (monthly_record_id, referenced_record_id),
  check (monthly_record_id <> referenced_record_id)
);

create table public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_version_id uuid not null references public.submission_versions(id) on delete cascade,
  attempt_number smallint not null check (attempt_number between 1 and 3),
  provider text not null,
  model text not null,
  prompt_version text not null,
  rubric_version text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  dimension_scores jsonb,
  total_score numeric(4,2) check (total_score between 0 and 10),
  strengths jsonb,
  weaknesses jsonb,
  suggestions jsonb,
  evidence jsonb,
  uncertainty_notes jsonb,
  raw_output jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (submission_version_id, attempt_number)
);

create table public.review_syntheses (
  id uuid primary key default gen_random_uuid(),
  submission_version_id uuid not null unique references public.submission_versions(id) on delete cascade,
  method_version text not null,
  dimension_medians jsonb not null,
  total_score numeric(4,2) not null check (total_score between 0 and 10),
  disagreement_metrics jsonb not null,
  consensus_summary text not null,
  conflicts jsonb,
  created_at timestamptz not null default now()
);

create table public.teacher_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_version_id uuid not null references public.submission_versions(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  score numeric(4,2) not null check (score between 0 and 10),
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_version_id, teacher_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  group_id uuid references public.groups(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index monthly_records_group_month_idx on public.monthly_records(group_id, research_month desc);
create index monthly_records_student_month_idx on public.monthly_records(student_id, research_month desc);
create index submission_versions_record_idx on public.submission_versions(monthly_record_id, version_number desc);
create index ai_reviews_version_idx on public.ai_reviews(submission_version_id, created_at desc);
create index audit_logs_group_created_idx on public.audit_logs(group_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger groups_touch_updated_at before update on public.groups for each row execute function public.touch_updated_at();
create trigger monthly_records_touch_updated_at before update on public.monthly_records for each row execute function public.touch_updated_at();
create trigger teacher_reviews_touch_updated_at before update on public.teacher_reviews for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_group_teacher(target_group_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = auth.uid() and role = 'teacher' and status = 'active'
  );
$$;

create or replace function public.shares_active_group(other_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id and theirs.status = 'active'
    where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = other_user_id
  );
$$;

create or replace function public.enforce_successful_ai_review_limit()
returns trigger
language plpgsql set search_path = public
as $$
declare
  target_record_id uuid;
  completed_count integer;
begin
  if new.status <> 'completed' or (tg_op = 'UPDATE' and old.status = 'completed') then
    return new;
  end if;

  select monthly_record_id into target_record_id
  from public.submission_versions where id = new.submission_version_id;

  select count(*) into completed_count
  from public.ai_reviews reviews
  join public.submission_versions versions on versions.id = reviews.submission_version_id
  where versions.monthly_record_id = target_record_id
    and reviews.status = 'completed'
    and reviews.id <> new.id;

  if completed_count >= 3 then
    raise exception 'A monthly record may have at most three successful AI reviews';
  end if;
  return new;
end;
$$;

create trigger ai_review_success_limit before insert or update of status on public.ai_reviews
for each row execute function public.enforce_successful_ai_review_limit();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;
alter table public.monthly_records enable row level security;
alter table public.submission_versions enable row level security;
alter table public.paper_references enable row level security;
alter table public.ai_reviews enable row level security;
alter table public.review_syntheses enable row level security;
alter table public.teacher_reviews enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_groupmates on public.profiles for select to authenticated
using (id = auth.uid() or public.shares_active_group(id));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy groups_select_members on public.groups for select to authenticated
using (public.is_group_member(id) or created_by = auth.uid());
create policy groups_insert_creator on public.groups for insert to authenticated
with check (created_by = auth.uid());
create policy groups_update_teacher on public.groups for update to authenticated
using (public.is_group_teacher(id)) with check (public.is_group_teacher(id));

create policy members_select_group on public.group_members for select to authenticated
using (public.is_group_member(group_id) or exists (select 1 from public.groups where id = group_id and created_by = auth.uid()));
create policy members_insert_teacher_or_creator on public.group_members for insert to authenticated
with check (
  public.is_group_teacher(group_id)
  or (user_id = auth.uid() and exists (select 1 from public.groups where id = group_id and created_by = auth.uid()))
);
create policy members_update_teacher on public.group_members for update to authenticated
using (public.is_group_teacher(group_id)) with check (public.is_group_teacher(group_id));

create policy invitations_select_teacher on public.group_invitations for select to authenticated using (public.is_group_teacher(group_id));
create policy invitations_insert_teacher on public.group_invitations for insert to authenticated with check (public.is_group_teacher(group_id) and invited_by = auth.uid());
create policy invitations_update_teacher on public.group_invitations for update to authenticated using (public.is_group_teacher(group_id));

create policy records_select_group on public.monthly_records for select to authenticated using (public.is_group_member(group_id));
create policy records_insert_student_or_teacher on public.monthly_records for insert to authenticated
with check (public.is_group_member(group_id) and (student_id = auth.uid() or public.is_group_teacher(group_id)));
create policy records_update_owner_or_teacher on public.monthly_records for update to authenticated
using (student_id = auth.uid() or public.is_group_teacher(group_id))
with check (student_id = auth.uid() or public.is_group_teacher(group_id));

create policy versions_select_group on public.submission_versions for select to authenticated
using (exists (select 1 from public.monthly_records r where r.id = monthly_record_id and public.is_group_member(r.group_id)));
create policy versions_insert_owner_or_teacher on public.submission_versions for insert to authenticated
with check (created_by = auth.uid() and exists (
  select 1 from public.monthly_records r where r.id = monthly_record_id
  and (r.student_id = auth.uid() or public.is_group_teacher(r.group_id))
));

create policy references_select_group on public.paper_references for select to authenticated
using (exists (select 1 from public.monthly_records r where r.id = monthly_record_id and public.is_group_member(r.group_id)));
create policy references_write_owner_or_teacher on public.paper_references for all to authenticated
using (exists (select 1 from public.monthly_records r where r.id = monthly_record_id and (r.student_id = auth.uid() or public.is_group_teacher(r.group_id))))
with check (exists (select 1 from public.monthly_records r where r.id = monthly_record_id and (r.student_id = auth.uid() or public.is_group_teacher(r.group_id))));

create policy ai_reviews_select_group on public.ai_reviews for select to authenticated
using (exists (
  select 1 from public.submission_versions v join public.monthly_records r on r.id = v.monthly_record_id
  where v.id = submission_version_id and public.is_group_member(r.group_id)
));
create policy syntheses_select_group on public.review_syntheses for select to authenticated
using (exists (
  select 1 from public.submission_versions v join public.monthly_records r on r.id = v.monthly_record_id
  where v.id = submission_version_id and public.is_group_member(r.group_id)
));

create policy teacher_reviews_select_group on public.teacher_reviews for select to authenticated
using (exists (
  select 1 from public.submission_versions v join public.monthly_records r on r.id = v.monthly_record_id
  where v.id = submission_version_id and public.is_group_member(r.group_id)
));
create policy teacher_reviews_insert_teacher on public.teacher_reviews for insert to authenticated
with check (teacher_id = auth.uid() and exists (
  select 1 from public.submission_versions v join public.monthly_records r on r.id = v.monthly_record_id
  where v.id = submission_version_id and public.is_group_teacher(r.group_id)
));
create policy teacher_reviews_update_teacher on public.teacher_reviews for update to authenticated
using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy audit_logs_select_teacher on public.audit_logs for select to authenticated using (public.is_group_teacher(group_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('monthly-papers', 'monthly-papers', false, 31457280, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Object paths must start with group_id/student_id, for example:
-- <group_uuid>/<student_uuid>/<monthly_record_uuid>/v2.pdf
create policy paper_objects_select_group on storage.objects for select to authenticated
using (
  bucket_id = 'monthly-papers'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
);
create policy paper_objects_insert_owner on storage.objects for insert to authenticated
with check (
  bucket_id = 'monthly-papers'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
  and auth.uid()::text = (storage.foldername(name))[2]
);

-- Registration, onboarding and secure group invitation functions.

alter table public.profiles
  add column if not exists discipline text,
  add column if not exists research_stage text not null default 'exploring'
    check (research_stage in ('exploring', 'proposal', 'research', 'writing')),
  add column if not exists onboarding_completed boolean not null default false;

create or replace function public.create_group_invitation(
  target_group_id uuid,
  invited_email text default null,
  member_role text default 'student',
  expires_in_hours integer default 168
)
returns text
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  raw_token text;
begin
  if not public.is_group_teacher(target_group_id) then
    raise exception 'Only an active teacher can create invitations';
  end if;
  if member_role not in ('teacher', 'student') then
    raise exception 'Invalid member role';
  end if;
  if expires_in_hours < 1 or expires_in_hours > 720 then
    raise exception 'Invitation lifetime must be between 1 and 720 hours';
  end if;

  raw_token := encode(gen_random_bytes(24), 'hex');
  insert into public.group_invitations (group_id, role, email, token_hash, invited_by, expires_at)
  values (
    target_group_id,
    member_role,
    nullif(lower(trim(invited_email)), ''),
    encode(digest(raw_token, 'sha256'), 'hex'),
    auth.uid(),
    now() + make_interval(hours => expires_in_hours)
  );
  return raw_token;
end;
$$;

create or replace function public.accept_group_invitation(invitation_token text)
returns uuid
language plpgsql
security definer set search_path = public, auth, extensions
as $$
declare
  invitation public.group_invitations%rowtype;
  caller_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into invitation
  from public.group_invitations
  where token_hash = encode(digest(invitation_token, 'sha256'), 'hex')
  for update;

  if invitation.id is null then raise exception 'Invitation not found'; end if;
  if invitation.accepted_at is not null then raise exception 'Invitation already used'; end if;
  if invitation.expires_at <= now() then raise exception 'Invitation expired'; end if;

  select lower(email) into caller_email from auth.users where id = auth.uid();
  if invitation.email is not null and invitation.email <> caller_email then
    raise exception 'Invitation email does not match the signed-in account';
  end if;

  insert into public.group_members (group_id, user_id, role, status)
  values (invitation.group_id, auth.uid(), invitation.role, 'active')
  on conflict (group_id, user_id) do update set role = excluded.role, status = 'active', archived_at = null;

  update public.group_invitations
  set accepted_by = auth.uid(), accepted_at = now()
  where id = invitation.id;

  return invitation.group_id;
end;
$$;

revoke all on function public.create_group_invitation(uuid, text, text, integer) from public;
revoke all on function public.accept_group_invitation(text) from public;
grant execute on function public.create_group_invitation(uuid, text, text, integer) to authenticated;
grant execute on function public.accept_group_invitation(text) to authenticated;

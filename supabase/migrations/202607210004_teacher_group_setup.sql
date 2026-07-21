-- Allow the first signed-in teacher to create a group and join it atomically.

create or replace function public.create_teacher_group(group_name text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  normalized_name text;
  created_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  normalized_name := trim(group_name);
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 80 then
    raise exception 'Group name must contain between 2 and 80 characters';
  end if;

  if exists (
    select 1 from public.group_members
    where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'This account already belongs to an active group';
  end if;

  insert into public.groups (name, slug, created_by)
  values (normalized_name, 'group-' || replace(gen_random_uuid()::text, '-', ''), auth.uid())
  returning id into created_group_id;

  insert into public.group_members (group_id, user_id, role, status)
  values (created_group_id, auth.uid(), 'teacher', 'active');

  return created_group_id;
end;
$$;

revoke all on function public.create_teacher_group(text) from public;
grant execute on function public.create_teacher_group(text) to authenticated;

-- A) Table Editor runs without auth.uid() → old trigger reverted role to user.
-- B) ENUM type → Supabase Table Editor shows user | admin as a dropdown.

create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (new.role is distinct from old.role) then
    if auth.uid() is not null then
      if not exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role::text = 'admin'
      ) then
        new.role := old.role;
      end if;
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  udt text;
begin
  select c.udt_name into udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'profiles'
    and c.column_name = 'role';

  if udt = 'app_role' then
    return;
  end if;

  begin
    create type public.app_role as enum ('user', 'admin');
  exception
    when duplicate_object then null;
  end;

  alter table public.profiles drop constraint if exists profiles_role_check;

  alter table public.profiles alter column role drop default;

  alter table public.profiles
    alter column role type public.app_role
    using (
      case
        when trim(coalesce(role::text, '')) = 'admin' then 'admin'::public.app_role
        else 'user'::public.app_role
      end
    );

  alter table public.profiles
    alter column role set default 'user'::public.app_role;
end;
$$;

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'::public.app_role
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'::public.app_role
    )
  );

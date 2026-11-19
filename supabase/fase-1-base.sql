begin;

grant usage on schema public to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;

drop policy if exists "Utilizador gere o próprio perfil" on public.profiles;
create policy "Utilizador gere o próprio perfil"
  on public.profiles for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.create_healthyseason_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.create_healthyseason_profile() from public, anon, authenticated;

drop trigger if exists healthyseason_profile_created on auth.users;
create trigger healthyseason_profile_created
  after insert on auth.users
  for each row execute function public.create_healthyseason_profile();

insert into public.profiles (id, full_name)
select id, left(btrim(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')), 120)
from auth.users
on conflict (id) do nothing;

commit;

begin;

grant usage on schema public to anon, authenticated;

drop function if exists public.consume_quota(text);

create table if not exists public.account_trials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  trial_ends_at timestamptz not null
);

alter table public.account_trials enable row level security;

revoke all on table public.account_trials from public, anon, authenticated;
grant select on table public.account_trials to authenticated;

drop policy if exists "Utilizador consulta o próprio teste" on public.account_trials;
create policy "Utilizador consulta o próprio teste"
  on public.account_trials for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.start_account_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_trials (user_id, trial_ends_at)
  values (new.id, coalesce(new.created_at, statement_timestamp()) + interval '168 hours')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.start_account_trial() from public, anon, authenticated;

drop trigger if exists healthyseason_trial_started on auth.users;
create trigger healthyseason_trial_started
  after insert on auth.users
  for each row execute function public.start_account_trial();

insert into public.account_trials (user_id, trial_ends_at)
select id,
  case
    when (created_at at time zone 'Europe/Lisbon')::date = (now() at time zone 'Europe/Lisbon')::date
      then now() + interval '168 hours'
    else coalesce(created_at, now()) + interval '168 hours'
  end
from auth.users
on conflict (user_id) do nothing;

create or replace function public.has_active_trial()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_trials
    where user_id = (select auth.uid())
      and trial_ends_at > statement_timestamp()
  );
$$;

revoke all on function public.has_active_trial() from public, anon, authenticated;
grant execute on function public.has_active_trial() to authenticated;

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  barcode text not null check (barcode ~ '^([0-9]{8}|[0-9]{12,14})$'),
  outcome text not null check (outcome in ('found', 'not_found', 'unavailable')),
  product jsonb,
  created_at timestamptz not null default now(),
  check (
    (outcome = 'found' and product is not null and jsonb_typeof(product) = 'object')
    or (outcome <> 'found' and product is null)
  )
);

create index if not exists scans_user_created_idx on public.scans (user_id, created_at);

alter table public.scans enable row level security;

revoke all on table public.scans from public, anon, authenticated;
grant select, insert on table public.scans to authenticated;

drop policy if exists "Utilizador consulta os próprios scans" on public.scans;
create policy "Utilizador consulta os próprios scans"
  on public.scans for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Utilizador regista scans com teste ativo" on public.scans;
create policy "Utilizador regista scans com teste ativo"
  on public.scans for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.has_active_trial()));

alter table public.food_logs
  add column if not exists quantity_ml numeric(6,1) check (quantity_ml > 0 and quantity_ml <= 10000),
  add column if not exists servings numeric(6,1) check (servings > 0 and servings <= 10000);

drop policy if exists "Teste ativo para adicionar análises" on public.food_logs;
create policy "Teste ativo para adicionar análises"
  on public.food_logs as restrictive for insert to authenticated
  with check (source = 'manual' or (select public.has_active_trial()));

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique default auth.uid() references auth.users (id) on delete set null,
  email text not null check (
    char_length(email) between 3 and 254
    and email = lower(btrim(email))
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from public, anon, authenticated;
grant insert (email) on table public.waitlist to anon, authenticated;

drop policy if exists "Visitante inscreve-se na lista de espera" on public.waitlist;
create policy "Visitante inscreve-se na lista de espera"
  on public.waitlist for insert to anon
  with check (user_id is null);

drop policy if exists "Utilizador inscreve-se na lista de espera" on public.waitlist;
create policy "Utilizador inscreve-se na lista de espera"
  on public.waitlist for insert to authenticated
  with check ((select auth.uid()) = user_id and not (select public.has_active_trial()));

commit;

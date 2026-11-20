begin;

grant usage on schema public to authenticated;

alter table public.scans
  add column if not exists type text not null default 'product_scan',
  add column if not exists photo_result jsonb,
  alter column barcode drop not null,
  drop constraint if exists scans_check,
  drop constraint if exists scans_outcome_check,
  drop constraint if exists scans_payload_check;

alter table public.scans add constraint scans_payload_check check (
  (
    type = 'product_scan' and barcode is not null and photo_result is null
    and ((outcome = 'found' and product is not null and jsonb_typeof(product) = 'object')
      or (outcome in ('not_found', 'unavailable') and product is null))
  ) or (
    type = 'food_photo' and barcode is null and product is null
    and ((outcome = 'found' and photo_result is not null and jsonb_typeof(photo_result) = 'array'
          and octet_length(photo_result::text) <= 12000)
      or (outcome in ('pending', 'not_found', 'invalid_result', 'unavailable') and photo_result is null))
  )
);

create index if not exists scans_photo_rate_idx
  on public.scans (user_id, created_at) where type = 'food_photo';

drop policy if exists "Utilizador regista scans com teste ativo" on public.scans;
create policy "Utilizador regista scans com teste ativo"
  on public.scans for insert to authenticated
  with check (type = 'product_scan' and (select auth.uid()) = user_id and (select public.has_active_trial()));

create table if not exists public.meal_plan_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists meal_plan_requests_rate_idx
  on public.meal_plan_requests (user_id, created_at);

alter table public.meal_plan_requests enable row level security;
revoke all on table public.meal_plan_requests from public, anon, authenticated;

create or replace function public.reserve_ai_request(feature text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  request_id uuid;
  cutoff timestamptz;
begin
  if account_id is null or not public.has_active_trial() then
    raise exception 'Teste grátis inativo.' using errcode = '42501';
  end if;

  if feature is null or feature not in ('food_photo', 'meal_plan') then
    raise exception 'Funcionalidade inválida.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(account_id::text || ':' || feature, 0));
  cutoff := clock_timestamp() - interval '1 hour';

  if feature = 'food_photo' then
    if (select count(*) from public.scans
        where user_id = account_id and type = 'food_photo' and created_at > cutoff) >= 20 then
      return null;
    end if;
    insert into public.scans (user_id, type, outcome, created_at)
      values (account_id, 'food_photo', 'pending', clock_timestamp()) returning id into request_id;
  else
    if (select count(*) from public.meal_plan_requests
        where user_id = account_id and created_at > cutoff) >= 12 then
      return null;
    end if;
    insert into public.meal_plan_requests (user_id, created_at)
      values (account_id, clock_timestamp()) returning id into request_id;
  end if;

  return request_id;
end;
$$;

revoke all on function public.reserve_ai_request(text) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(text) to authenticated;

create or replace function public.complete_food_photo(scan_id uuid, result_status text, foods jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or result_status is null
     or result_status not in ('found', 'not_found', 'invalid_result', 'unavailable') then
    raise exception 'Resultado inválido.' using errcode = '22023';
  end if;

  update public.scans set outcome = result_status, photo_result = foods
  where id = scan_id and user_id = auth.uid() and type = 'food_photo' and outcome = 'pending';
  return found;
end;
$$;

revoke all on function public.complete_food_photo(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_food_photo(uuid, text, jsonb) to authenticated;

alter table public.food_logs
  add column if not exists quantity_units numeric(6,1) check (quantity_units > 0 and quantity_units <= 10000),
  drop constraint if exists food_logs_source_check;

alter table public.food_logs add constraint food_logs_source_check
  check (source in ('manual', 'product_scan', 'food_photo', 'meal_plan'));

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  planned_for date not null,
  suggestion_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, planned_for),
  unique (id, user_id)
);

create table if not exists public.meals (
  id uuid primary key,
  user_id uuid not null,
  plan_id uuid not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  ingredients jsonb not null check (jsonb_typeof(ingredients) = 'array' and octet_length(ingredients::text) <= 6000),
  calories numeric(6,1) not null check (calories between 0 and 10000),
  protein_g numeric(6,1) not null check (protein_g between 0 and 2000),
  carbs_g numeric(6,1) not null check (carbs_g between 0 and 2000),
  fat_g numeric(6,1) not null check (fat_g between 0 and 2000),
  unique (plan_id, meal),
  foreign key (plan_id, user_id) references public.meal_plans (id, user_id) on delete cascade
);

alter table public.meal_plans enable row level security;
alter table public.meals enable row level security;

revoke all on table public.meal_plans, public.meals from public, anon, authenticated;
grant select, insert, update, delete on table public.meal_plans, public.meals to authenticated;

drop policy if exists "Utilizador gere os seus planos de refeições" on public.meal_plans;
create policy "Utilizador gere os seus planos de refeições"
  on public.meal_plans for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (select public.has_active_trial()));

drop policy if exists "Utilizador gere as suas refeições sugeridas" on public.meals;
create policy "Utilizador gere as suas refeições sugeridas"
  on public.meals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (select public.has_active_trial()));

create or replace function public.save_meal_plan(suggestion uuid, day date, entries jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  saved_plan uuid;
begin
  if account_id is null or not public.has_active_trial() then
    raise exception 'Teste grátis inativo.' using errcode = '42501';
  end if;

  if jsonb_typeof(entries) is distinct from 'array' or jsonb_array_length(entries) <> 4 then
    raise exception 'Plano incompleto.' using errcode = '22023';
  end if;

  insert into public.meal_plans as saved (user_id, planned_for, suggestion_id)
  values (account_id, day, suggestion)
  on conflict (user_id, planned_for) do update set suggestion_id = excluded.suggestion_id
    where saved.suggestion_id is distinct from excluded.suggestion_id
  returning id into saved_plan;

  if saved_plan is null then return; end if;

  delete from public.meals where plan_id = saved_plan and user_id = account_id;
  insert into public.meals (id, user_id, plan_id, meal, name, ingredients, calories, protein_g, carbs_g, fat_g)
  select m.id, account_id, saved_plan, m.meal, m.name, m.ingredients, m.calories, m.protein_g, m.carbs_g, m.fat_g
  from jsonb_populate_recordset(null::public.meals, entries) as m;
end;
$$;

revoke all on function public.save_meal_plan(uuid, date, jsonb) from public, anon, authenticated;
grant execute on function public.save_meal_plan(uuid, date, jsonb) to authenticated;

commit;

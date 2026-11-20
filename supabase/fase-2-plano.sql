begin;

grant usage on schema public to authenticated;

create table if not exists public.nutrition_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sex text not null check (sex in ('female', 'male')),
  age integer not null check (age between 18 and 120),
  height_cm integer not null check (height_cm between 100 and 250),
  current_weight_kg numeric(5,1) not null check (current_weight_kg between 30 and 400),
  target_weight_kg numeric(5,1) not null check (target_weight_kg between 30 and 400),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'high', 'very_high')),
  goal text not null check (goal in ('lose', 'maintain', 'gain')),
  dietary_restrictions text not null default '' check (char_length(dietary_restrictions) <= 500),
  check (
    goal = 'maintain' or
    (goal = 'lose' and target_weight_kg < current_weight_kg) or
    (goal = 'gain' and target_weight_kg > current_weight_kg)
  )
);

create table if not exists public.daily_goals (
  user_id uuid primary key references public.nutrition_profiles (user_id) on delete cascade,
  calories integer not null check (calories between 1200 and 15000),
  protein_g integer not null check (protein_g between 0 and 2000),
  carbs_g integer not null check (carbs_g between 0 and 2000),
  fat_g integer not null check (fat_g between 0 and 2000)
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  quantity_g numeric(6,1) check (quantity_g > 0 and quantity_g <= 10000),
  calories numeric(6,1) not null check (calories between 0 and 10000),
  protein_g numeric(6,1) not null check (protein_g between 0 and 2000),
  carbs_g numeric(6,1) not null check (carbs_g between 0 and 2000),
  fat_g numeric(6,1) not null check (fat_g between 0 and 2000),
  source text not null default 'manual' check (source in ('manual', 'product_scan', 'food_photo')),
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_day_idx
  on public.food_logs (user_id, logged_on, created_at, id);

alter table public.nutrition_profiles enable row level security;
alter table public.daily_goals enable row level security;
alter table public.food_logs enable row level security;

revoke all on table public.nutrition_profiles, public.daily_goals, public.food_logs from public, anon, authenticated;
grant select, insert, update, delete on table public.nutrition_profiles, public.daily_goals, public.food_logs to authenticated;

drop policy if exists "Utilizador gere os dados nutricionais" on public.nutrition_profiles;
create policy "Utilizador gere os dados nutricionais"
  on public.nutrition_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Utilizador gere as metas diárias" on public.daily_goals;
create policy "Utilizador gere as metas diárias"
  on public.daily_goals for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Utilizador gere o diário alimentar" on public.food_logs;
create policy "Utilizador gere o diário alimentar"
  on public.food_logs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.save_nutrition_plan(profile jsonb, targets jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null then
    raise exception 'Sessão necessária.' using errcode = '42501';
  end if;

  insert into public.nutrition_profiles (
    user_id, sex, age, height_cm, current_weight_kg, target_weight_kg, activity_level, goal, dietary_restrictions
  )
  select account_id, p.sex, p.age, p.height_cm, p.current_weight_kg, p.target_weight_kg, p.activity_level, p.goal,
    coalesce(p.dietary_restrictions, '')
  from jsonb_populate_record(null::public.nutrition_profiles, profile) as p
  on conflict (user_id) do update set
    sex = excluded.sex,
    age = excluded.age,
    height_cm = excluded.height_cm,
    current_weight_kg = excluded.current_weight_kg,
    target_weight_kg = excluded.target_weight_kg,
    activity_level = excluded.activity_level,
    goal = excluded.goal,
    dietary_restrictions = excluded.dietary_restrictions;

  insert into public.daily_goals (user_id, calories, protein_g, carbs_g, fat_g)
  select account_id, t.calories, t.protein_g, t.carbs_g, t.fat_g
  from jsonb_populate_record(null::public.daily_goals, targets) as t
  on conflict (user_id) do update set
    calories = excluded.calories,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g;
end;
$$;

revoke all on function public.save_nutrition_plan(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_nutrition_plan(jsonb, jsonb) to authenticated;

commit;

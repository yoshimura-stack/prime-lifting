-- Daily bonus storage foundation. Apply separately before enabling DAILY_REWARDS_ENABLED.
-- 100 PTS per unique challenge, 300 PTS per JST day, monthly sum resets by month filtering.
create table if not exists public.lifting_daily_awards (
  player_id uuid not null references public.lifting_players(id) on delete cascade,
  day date not null,
  challenge_id text not null,
  run_id uuid not null references public.lifting_runs(run_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id,day,challenge_id),
  constraint lifting_daily_awards_challenge_id_valid check (challenge_id ~ '^[a-z0-9]{2,30}$')
);
create index if not exists lifting_daily_awards_month_lookup on public.lifting_daily_awards(player_id,day);
alter table public.lifting_daily_awards enable row level security;
revoke all on public.lifting_daily_awards from public,anon,authenticated;

create or replace function public.lifting_api_daily_award(payload jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
 v_player uuid := (payload->>'playerId')::uuid;
 v_run uuid := (payload->>'runId')::uuid;
 v_day date := (now() at time zone 'Asia/Tokyo')::date;
 v_ids text[];
 v_id text;
 v_earned integer := 0;
 v_month_total integer := 0;
 v_today_total integer := 0;
begin
 if not exists (select 1 from public.lifting_runs where run_id=v_run and player_id=v_player) then
  raise exception 'Verified run not found';
 end if;
 select coalesce(array_agg(distinct value),array[]::text[]) into v_ids
 from jsonb_array_elements_text(coalesce(payload->'completedIds','[]'::jsonb)) as ids(value);
 if cardinality(v_ids)>3 then raise exception 'Too many challenges'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_player::text),pg_catalog.hashtext(v_day::text));
 foreach v_id in array v_ids loop
  if v_id not in ('keep10','keep15','foot10','spin3','jump5','knee8','chest6','shoulder2','keep30','quad1') then
   raise exception 'Unknown challenge';
  end if;
  insert into public.lifting_daily_awards(player_id,day,challenge_id,run_id)
  values(v_player,v_day,v_id,v_run) on conflict do nothing;
  if found then v_earned:=v_earned+100; end if;
 end loop;
 select count(*)*100 into v_today_total from public.lifting_daily_awards where player_id=v_player and day=v_day;
 if v_today_total>300 then raise exception 'Daily cap exceeded'; end if;
 select count(*)*100 into v_month_total from public.lifting_daily_awards
 where player_id=v_player and day>=date_trunc('month',v_day::timestamp)::date
 and day<(date_trunc('month',v_day::timestamp)+interval '1 month')::date;
 return jsonb_build_object('earned',v_earned,'todayBonus',v_today_total,'monthlyBonus',v_month_total,'day',v_day::text);
end $$;
revoke all on function public.lifting_api_daily_award(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_daily_award(jsonb) to service_role;

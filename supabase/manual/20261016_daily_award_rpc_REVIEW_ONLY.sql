-- Every accepted run needs a receipt, including 0-coin runs.
create table if not exists public.lifting_daily_awarded_runs (
 run_id uuid primary key references public.lifting_runs(run_id),
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 day_jst date not null,
 created_at timestamptz not null default now()
);
alter table public.lifting_daily_awarded_runs enable row level security;
revoke all on public.lifting_daily_awarded_runs from anon,authenticated;

-- Apply only after the additive schema migration is reviewed and applied.
-- Called only from Cloudflare Worker with service-role credentials.
-- All crediting is atomic; retry of the same run returns without duplicate awards.
create or replace function public.lifting_api_daily_award(payload jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 v_player uuid := (payload->>'playerId')::uuid;
 v_run uuid := (payload->>'runId')::uuid;
 v_day date;
 v_score int;
 v_today int;
 v_award int;
 v_id text;
 v_count int := 0;
 v_wallet bigint;
 v_ids jsonb := payload->'completedIds';
begin
 if v_player is null or v_run is null or jsonb_typeof(v_ids) <> 'array'
    or jsonb_array_length(v_ids)>3 then raise exception 'Invalid award request'; end if;
 -- Lock per player to serialize multiple accepted runs and enforce coin cap.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_player::text, 71933));
 select score, (created_at at time zone 'Asia/Tokyo')::date into v_score, v_day from public.lifting_runs
 where run_id=v_run and player_id=v_player;
 if not found then raise exception 'Run not accepted'; end if;
 insert into public.lifting_coin_wallets(player_id,balance)
 values(v_player,0) on conflict(player_id) do nothing;
 select balance into v_wallet from public.lifting_coin_wallets where player_id=v_player for update;
 -- Run already credited: no extra missions or coins on retries.
 if exists(select 1 from public.lifting_coin_ledger where run_id=v_run and reason='play')
    or exists(select 1 from public.lifting_daily_awarded_runs where run_id=v_run) then
   return jsonb_build_object('coinsEarned',0,'newMissions',0,'balance',v_wallet,'duplicate',true);
 end if;
 -- Insert receipt first; prevents repeat even if score <1000 and coins=0.
 insert into public.lifting_daily_awarded_runs(run_id,player_id,day_jst)
 values(v_run,v_player,v_day);
 select coalesce(sum(amount),0)::int into v_today from public.lifting_coin_ledger
 where player_id=v_player and day_jst=v_day and reason='play';
 v_award:=least((v_score/1000)*10,greatest(0,2000-v_today));
 if v_award>0 then
   insert into public.lifting_coin_ledger(player_id,run_id,day_jst,amount,reason)
   values(v_player,v_run,v_day,v_award,'play');
   update public.lifting_coin_wallets set balance=balance+v_award,updated_at=now()
   where player_id=v_player returning balance into v_wallet;
 end if;
 for v_id in select value #>> '{}' from jsonb_array_elements(v_ids) loop
   if v_id !~ '^[a-z0-9]{3,40}
   insert into public.lifting_daily_completions(player_id,day_jst,mission_id)
   values(v_player,v_day,v_id) on conflict do nothing;
   if found then v_count:=v_count+1; end if;
 end loop;
 return jsonb_build_object('coinsEarned',v_award,'newMissions',v_count,'balance',v_wallet,'duplicate',false);
end $$;


revoke all on function public.lifting_api_daily_award(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_daily_award(jsonb) to service_role;
 then raise exception 'Invalid mission id'; end if;
   insert into public.lifting_daily_completions(player_id,day_jst,mission_id)
   values(v_player,v_day,v_id) on conflict do nothing;
   if found then v_count:=v_count+1; end if;
 end loop;
 return jsonb_build_object('coinsEarned',v_award,'newMissions',v_count,'balance',v_wallet,'duplicate',false);
end $$;


revoke all on function public.lifting_api_daily_award(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_daily_award(jsonb) to service_role;

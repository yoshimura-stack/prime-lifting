-- Draft: requires season-02-additive-storage-draft.sql applied first.
-- NEVER run until the full replay/auth/BOOST regression suite passes.
-- Preserve the original score submission verification and idempotency.
create or replace function public.lifting_api_submit(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_id uuid; v_run uuid; v_score int; v_base int; v_mobile int;
 v_old int; v_top int; v_best boolean; v_champion boolean;
 v_existing public.lifting_runs%rowtype;
 v_force boolean := false;
 v_season text := to_char(now() at time zone 'Asia/Tokyo','YYYY-MM');
begin
 v_id:=(payload->>'playerId')::uuid;
 v_run:=(payload->>'runId')::uuid;
 v_score:=(payload->>'score')::integer;
 v_base:=(payload->>'baseScore')::integer;
 v_mobile:=(payload->>'mobileBonus')::integer;
 if v_score is null or v_score<0 or v_score>100000000 then raise exception 'Invalid score';end if;
 if v_base is null or v_base<0 or v_mobile is null or v_mobile<0
    or v_base::bigint+v_mobile::bigint<>v_score::bigint then
  raise exception 'Invalid verified score breakdown';
 end if;
 if (payload->>'device') not in ('pc','mobile') then raise exception 'Invalid device'; end if;
 -- IMPORTANT: validate the boost against the atomic reservation, never the client alone.
 -- No BOOST means neutral x1.0 on BOTH PC and mobile.
 if nullif(payload->>'boost','') is null then
  if exists(select 1 from public.lifting_boost_reservations where run_id=v_run) then
   raise exception 'BOOST reservation required';
  end if;
  if v_score<>v_base or v_mobile<>0 then raise exception 'Invalid normal score';end if;
 else
  if (payload->>'boost') not in ('time','score','sc') then raise exception 'Invalid BOOST';end if;
  if not exists(
    select 1 from public.lifting_boost_reservations
    where run_id=v_run and player_id=v_id and boost_type=payload->>'boost'
  ) then raise exception 'BOOST reservation mismatch';end if;
  if (payload->>'boost')='score' then
   if v_score<>pg_catalog.round(v_base::numeric*1.1)::integer
     or v_mobile<>v_score-v_base then raise exception 'Invalid SCORE BOOST';end if;
  elsif v_score<>v_base or v_mobile<>0 then
   raise exception 'Invalid non-score BOOST';
  end if;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(5112026);
 select * into v_existing from public.lifting_runs where run_id=v_run;
 if found then
  if v_existing.player_id<>v_id then raise exception 'Run belongs to another player';end if;
  return jsonb_build_object('player',public.lifting_api_player(v_id),'personalBest',v_existing.personal_best,'newChampion',v_existing.new_champion);
 end if;
 perform 1 from public.lifting_players where id=v_id for update;
 if not found then raise exception 'Player not found';end if;
 select coalesce(best_score,0) into v_old from public.lifting_season_scores where season_key=v_season and player_id=v_id;
 v_old:=coalesce(v_old,0);
 select max(best_score) into v_top from public.lifting_season_scores where season_key=v_season;
 -- Legacy test-force flag must never alter real season scores.
 v_force:=false;
 v_best:=v_score>v_old;
 v_champion:=v_best and v_score>coalesce(v_top,0);
 insert into public.lifting_season_scores(season_key,player_id,best_score,best_device,best_kit,base_score,boost_bonus,best_boost,last_played_at)
 values(v_season,v_id,v_score,payload->>'device',payload->>'kit',v_base,v_mobile,nullif(payload->>'boost',''),now())
 on conflict(season_key,player_id) do update set
 best_score=case when v_best then excluded.best_score else public.lifting_season_scores.best_score end,
 best_device=case when v_best then excluded.best_device else public.lifting_season_scores.best_device end,
 best_kit=case when v_best then excluded.best_kit else public.lifting_season_scores.best_kit end,
 base_score=case when v_best then excluded.base_score else public.lifting_season_scores.base_score end,
 boost_bonus=case when v_best then excluded.boost_bonus else public.lifting_season_scores.boost_bonus end,
 best_boost=case when v_best then excluded.best_boost else public.lifting_season_scores.best_boost end,
 last_played_at=now(),updated_at=now();
 update public.lifting_players set updated_at=now(),game_version=payload->>'gameVersion' where id=v_id;
 -- October's legacy breakdown rows remain immutable.
 insert into public.lifting_runs(run_id,player_id,score,personal_best,new_champion)
 values(v_run,v_id,v_score,v_best,v_champion);
 return jsonb_build_object('player',public.lifting_api_player(v_id),'personalBest',v_best,'newChampion',v_champion);
end $function$;


-- Ranking detail is now read from the active-season row, not the October legacy row.
create or replace function public.lifting_api_score_breakdown_list(payload jsonb)
returns jsonb language sql stable security definer set search_path to ''
as $fn$
 select coalesce(jsonb_object_agg(s.player_id::text,
 jsonb_build_object('baseScore',s.base_score,'mobileBonus',s.boost_bonus)),'{}'::jsonb)
 from public.lifting_season_scores s
 where s.season_key=to_char(now() at time zone 'Asia/Tokyo','YYYY-MM')
 and s.player_id::text in (select jsonb_array_elements_text(coalesce(payload->'playerIds','[]'::jsonb)))
$fn$;

create or replace function public.lifting_api_best_boost_list(payload jsonb)
returns jsonb language sql stable security definer set search_path to ''
as $fn$
 select coalesce(jsonb_object_agg(s.player_id::text,s.best_boost),'{}'::jsonb)
 from public.lifting_season_scores s
 where s.season_key=to_char(now() at time zone 'Asia/Tokyo','YYYY-MM')
 and s.best_boost is not null
 and s.player_id::text in (select jsonb_array_elements_text(coalesce(payload->'playerIds','[]'::jsonb)))
$fn$;

revoke all on function public.lifting_api_submit(jsonb) from public, anon, authenticated;
revoke all on function public.lifting_api_score_breakdown_list(jsonb) from public, anon, authenticated;
revoke all on function public.lifting_api_best_boost_list(jsonb) from public, anon, authenticated;
grant execute on function public.lifting_api_submit(jsonb) to service_role;
grant execute on function public.lifting_api_score_breakdown_list(jsonb) to service_role;
grant execute on function public.lifting_api_best_boost_list(jsonb) to service_role;

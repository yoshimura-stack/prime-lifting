-- ONE-SHOT TEST ONLY; existing verification and run idempotency retained.
create table if not exists public.lifting_test_force_best_once (player_id uuid primary key references public.lifting_players(id),pending boolean not null default false,consumed_at timestamptz);
revoke all on public.lifting_test_force_best_once from public,anon,authenticated;
insert into public.lifting_test_force_best_once(player_id,pending,consumed_at) values('15021678-6d37-40dd-97ab-9b6c61d15281'::uuid,true,null) on conflict(player_id) do update set pending=true,consumed_at=null;
CREATE OR REPLACE FUNCTION public.lifting_api_submit(payload jsonb)
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
 select best_score into v_old from public.lifting_players where id=v_id for update;
 if not found then raise exception 'Player not found';end if;
 select max(best_score) into v_top from public.lifting_players;
 update public.lifting_test_force_best_once set pending=false,consumed_at=now()
 where player_id=v_id and pending=true returning true into v_force;
 v_force:=coalesce(v_force,false);
 v_best:=v_force or v_score>v_old;
 v_champion:=v_score>coalesce(v_top,0);
 update public.lifting_players set best_score=case when v_force then v_score else greatest(best_score,v_score) end,
  best_device=case when v_best then payload->>'device' else best_device end,
  best_kit=case when v_best then payload->>'kit' else best_kit end,
  last_played_at=now(),updated_at=now(),game_version=payload->>'gameVersion'
 where id=v_id;
 if v_best then
  insert into public.lifting_score_breakdowns(player_id,recorded_best,base_score,mobile_bonus,source)
  values(v_id,v_score,v_base,v_mobile,'verified_replay')
  on conflict(player_id) do update
  set recorded_best=excluded.recorded_best,base_score=excluded.base_score,
      mobile_bonus=excluded.mobile_bonus,source=excluded.source,created_at=now();
 end if;
 insert into public.lifting_runs(run_id,player_id,score,personal_best,new_champion)
 values(v_run,v_id,v_score,v_best,v_champion);
 return jsonb_build_object('player',public.lifting_api_player(v_id),'personalBest',v_best,'newChampion',v_champion);
end $function$
;

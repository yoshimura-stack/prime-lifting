-- STAGING ONLY: isolated verified-result receipt. Never run against production.
create table if not exists public.lifting_boost_verified_receipts (
 run_id uuid primary key,
 player_id uuid not null references public.lifting_players(id),
 boost_type text null check (boost_type in ('time','score','sc')),
 base_score integer not null check (base_score>=0),
 boost_bonus integer not null check (boost_bonus>=0),
 play_score integer not null check (play_score=base_score+boost_bonus),
 created_at timestamptz not null default now()
);
alter table public.lifting_boost_verified_receipts enable row level security;
revoke all on public.lifting_boost_verified_receipts from public,anon,authenticated;
grant select,insert on public.lifting_boost_verified_receipts to service_role;
create or replace function public.lifting_api_boost_verified_receipt(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_player uuid; v_run uuid; v_boost text; v_base integer; v_bonus integer; v_total integer;
 v_existing public.lifting_boost_verified_receipts%rowtype;
 v_reserved public.lifting_boost_run_uses%rowtype;
begin
 if payload is null or jsonb_typeof(payload)<>'object'
 or jsonb_typeof(payload->'playerId')<>'string'
 or jsonb_typeof(payload->'runId')<>'string'
 or jsonb_typeof(payload->'baseScore')<>'number'
 or jsonb_typeof(payload->'boostBonus')<>'number'
 or jsonb_typeof(payload->'playScore')<>'number'
 or (payload ? 'boost' and jsonb_typeof(payload->'boost') not in ('string','null'))
 then raise exception 'Invalid receipt'; end if;
 v_player:=(payload->>'playerId')::uuid;
 v_run:=(payload->>'runId')::uuid;
 v_boost:=payload->>'boost';
 if v_boost is not null and v_boost not in ('time','score','sc') then raise exception 'Invalid BOOST'; end if;
 v_base:=(payload->>'baseScore')::integer;
 v_bonus:=(payload->>'boostBonus')::integer;
 v_total:=(payload->>'playScore')::integer;
 if v_base<0 or v_bonus<0 or v_total<0 or v_total::bigint<>v_base::bigint+v_bonus::bigint
 or (v_boost is distinct from 'score' and v_bonus<>0)
 or (v_boost='score' and v_total<>round(v_base::numeric*1.1)::integer)
 then raise exception 'Invalid score breakdown'; end if;
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Unknown player'; end if;
 select * into v_existing from public.lifting_boost_verified_receipts where run_id=v_run;
 if found then
  if v_existing.player_id<>v_player or v_existing.boost_type is distinct from v_boost
   or v_existing.base_score<>v_base or v_existing.boost_bonus<>v_bonus or v_existing.play_score<>v_total
  then raise exception 'Receipt conflict'; end if;
  return jsonb_build_object('runId',v_run,'replayed',true,'playScore',v_total);
 end if;
 if v_boost is not null then
  select * into v_reserved from public.lifting_boost_run_uses where run_id=v_run;
  if not found or v_reserved.player_id<>v_player or v_reserved.boost_type<>v_boost
  then raise exception 'BOOST reservation missing'; end if;
 else
  if exists(select 1 from public.lifting_boost_run_uses where run_id=v_run)
  then raise exception 'Run reserved for BOOST'; end if;
  if not exists(select 1 from public.lifting_boost_none_run_starts where run_id=v_run and player_id=v_player)
  then raise exception 'Official NONE run start missing'; end if;
 end if;
 insert into public.lifting_boost_verified_receipts(run_id,player_id,boost_type,base_score,boost_bonus,play_score)
 values(v_run,v_player,v_boost,v_base,v_bonus,v_total);
 return jsonb_build_object('runId',v_run,'replayed',false,'playScore',v_total);
end $$;
revoke all on function public.lifting_api_boost_verified_receipt(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_boost_verified_receipt(jsonb) to service_role;

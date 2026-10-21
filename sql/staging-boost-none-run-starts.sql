-- STAGING ONLY: register official unboosted run starts.
create table if not exists public.lifting_boost_none_run_starts (
 run_id uuid primary key,
 player_id uuid not null references public.lifting_players(id),
 created_at timestamptz not null default now()
);
alter table public.lifting_boost_none_run_starts enable row level security;
revoke all on public.lifting_boost_none_run_starts from public,anon,authenticated;
grant select,insert on public.lifting_boost_none_run_starts to service_role;
create or replace function public.lifting_api_boost_start_none(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_player uuid; v_run uuid; v_owner uuid;
begin
 if payload is null or jsonb_typeof(payload)<>'object'
 or jsonb_typeof(payload->'playerId')<>'string'
 or jsonb_typeof(payload->'runId')<>'string'
 then raise exception 'Invalid run start'; end if;
 v_player:=(payload->>'playerId')::uuid;
 v_run:=(payload->>'runId')::uuid;
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Unknown player'; end if;
 if exists(select 1 from public.lifting_boost_run_uses where run_id=v_run)
 then raise exception 'Run already reserved'; end if;
 select player_id into v_owner from public.lifting_boost_none_run_starts where run_id=v_run;
 if found then
  if v_owner<>v_player then raise exception 'Run owner mismatch'; end if;
  return jsonb_build_object('runId',v_run,'replayed',true);
 end if;
 insert into public.lifting_boost_none_run_starts(run_id,player_id) values(v_run,v_player);
 return jsonb_build_object('runId',v_run,'replayed',false);
end $$;
revoke all on function public.lifting_api_boost_start_none(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_boost_start_none(jsonb) to service_role;

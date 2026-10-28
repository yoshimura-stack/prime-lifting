-- Proposal only. DO NOT apply without production approval.
-- Reserve exactly one owned BOOST per signed run ID, atomically and idempotently.
create table if not exists public.lifting_boost_reservations (
 run_id uuid primary key,
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 boost_type text not null check (boost_type in ('time','score','sc')),
 created_at timestamptz not null default now(),
 unique(player_id,run_id)
);
alter table public.lifting_boost_reservations enable row level security;
revoke all on public.lifting_boost_reservations from public,anon,authenticated;
grant select,insert on public.lifting_boost_reservations to service_role;

create or replace function public.lifting_api_boost_reserve(payload jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
 v_player uuid := (payload->>'playerId')::uuid;
 v_run uuid := (payload->>'runId')::uuid;
 v_type text := payload->>'boost';
 v_existing public.lifting_boost_reservations%rowtype;
 v_count int;
begin
 if v_type not in ('time','score','sc') or v_type is null then raise exception 'Invalid BOOST'; end if;
 -- Serialize all grants/reservations per player using the same inventory row.
 perform 1 from public.lifting_players where id=v_player for update;
 if not found then raise exception 'Player not found'; end if;
 select * into v_existing from public.lifting_boost_reservations where run_id=v_run;
 if found then
  if v_existing.player_id<>v_player or v_existing.boost_type<>v_type then raise exception 'Run already reserved'; end if;
  return jsonb_build_object('reserved',true,'boost',v_type,'runId',v_run::text,'reused',true);
 end if;
 if v_type='time' then
  update public.lifting_boost_inventory set time_count=time_count-1,updated_at=now()
   where player_id=v_player and time_count>0 returning time_count into v_count;
 elsif v_type='score' then
  update public.lifting_boost_inventory set score_count=score_count-1,updated_at=now()
   where player_id=v_player and score_count>0 returning score_count into v_count;
 else
  update public.lifting_boost_inventory set sc_count=sc_count-1,updated_at=now()
   where player_id=v_player and sc_count>0 returning sc_count into v_count;
 end if;
 if not found then raise exception 'BOOST inventory empty'; end if;
 insert into public.lifting_boost_reservations(run_id,player_id,boost_type) values(v_run,v_player,v_type);
 return jsonb_build_object('reserved',true,'boost',v_type,'runId',v_run::text,'reused',false);
end $$;
revoke all on function public.lifting_api_boost_reserve(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_boost_reserve(jsonb) to service_role;

-- PRIME LIFTING ranking schema. Run once in the NEW dedicated Supabase project.
-- Preserves existing lifting_players rows. Never exposes PIN hashes to browser.
create extension if not exists pgcrypto with schema extensions;

alter table public.lifting_players add column if not exists name_key text;
alter table public.lifting_players add column if not exists last_played_at timestamptz;
alter table public.lifting_players add column if not exists best_kit text;
update public.lifting_players set name_key=lower(btrim(display_name)) where name_key is null;
-- Inspect duplicates before running if your database already contains multiple accounts with the same normalized name.
create unique index if not exists lifting_players_name_key_unique on public.lifting_players(name_key);
create table if not exists public.lifting_runs (
 run_id uuid primary key,
 player_id uuid not null references public.lifting_players(id) on delete cascade,
 score integer not null check (score>=0),
 personal_best boolean not null,
 new_champion boolean not null,
 created_at timestamptz not null default now()
);
alter table public.lifting_players enable row level security;
alter table public.lifting_runs enable row level security;
revoke all on public.lifting_players from anon, authenticated;
revoke all on public.lifting_runs from anon, authenticated;
grant select,insert,update on public.lifting_players to service_role;
grant select,insert on public.lifting_runs to service_role;

create or replace function public.lifting_api_player(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'id',p.id::text,'name',p.display_name,'best',p.best_score,
  'rank',(select count(*)+1 from public.lifting_players q where q.best_score>p.best_score or (q.best_score=p.best_score and (q.created_at,q.id) < (p.created_at,p.id))),
  'kit',p.best_kit,'lastPlayed',p.last_played_at
 ) from public.lifting_players p where p.id=p_id;
$$;

create or replace function public.lifting_api_register(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_name text; v_key text; v_pin text;
begin
 v_name:=payload->>'name';v_key:=payload->>'nameKey';v_pin:=payload->>'pin';
 if v_name is null or length(v_name)>80 or v_key is null or length(v_key)>80 or v_pin !~ '^[0-9]{6,12}$' then raise exception 'Invalid registration';end if;
 insert into public.lifting_players(id,display_name,name_key,pin_hash,best_score,game_version,created_at,updated_at)
 values(extensions.gen_random_uuid(),v_name,v_key,extensions.crypt(v_pin,extensions.gen_salt('bf',10)),0,'v0.5.11',now(),now())
 on conflict (name_key) do nothing returning id into v_id;
 return jsonb_build_object('player',case when v_id is null then null else public.lifting_api_player(v_id) end);
end;$$;

create or replace function public.lifting_api_login(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 select id into v_id from public.lifting_players
 where name_key=payload->>'nameKey' and pin_hash=extensions.crypt(payload->>'pin',pin_hash);
 return jsonb_build_object('player',case when v_id is null then null else public.lifting_api_player(v_id) end);
end;$$;

create or replace function public.lifting_api_me(payload jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('player',public.lifting_api_player((payload->>'playerId')::uuid));
$$;

create or replace function public.lifting_api_leaderboard(payload jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('entries',coalesce(jsonb_agg(public.lifting_api_player(p.id) order by p.best_score desc,p.created_at,p.id),'[]'::jsonb))
 from (select id,best_score,created_at from public.lifting_players order by best_score desc,created_at,id limit 10) p;
$$;

create or replace function public.lifting_api_submit(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;v_run uuid;v_score int;v_old int;v_top int;v_best boolean;v_champion boolean;v_existing public.lifting_runs%rowtype;
begin
 v_id:=(payload->>'playerId')::uuid;v_run:=(payload->>'runId')::uuid;v_score:=(payload->>'score')::integer;
 if v_score<0 or v_score>100000000 then raise exception 'Invalid score';end if;
 -- Serialize submissions across all players to make champion decisions consistent.
 perform pg_catalog.pg_advisory_xact_lock(5112026);
 select * into v_existing from public.lifting_runs where run_id=v_run;
 if found then
  if v_existing.player_id<>v_id then raise exception 'Run belongs to another player';end if;
  return jsonb_build_object('player',public.lifting_api_player(v_id),'personalBest',v_existing.personal_best,'newChampion',v_existing.new_champion);
 end if;
 select best_score into v_old from public.lifting_players where id=v_id for update;
 if not found then raise exception 'Player not found';end if;
 select max(best_score) into v_top from public.lifting_players;
 v_best:=v_score>v_old;v_champion:=v_score>coalesce(v_top,0);
 update public.lifting_players set best_score=greatest(best_score,v_score),
 best_device=case when v_best then payload->>'device' else best_device end,
 best_kit=case when v_best then payload->>'kit' else best_kit end,
 last_played_at=now(),updated_at=now(),game_version=payload->>'gameVersion'
 where id=v_id;
 insert into public.lifting_runs(run_id,player_id,score,personal_best,new_champion)
 values(v_run,v_id,v_score,v_best,v_champion);
 return jsonb_build_object('player',public.lifting_api_player(v_id),'personalBest',v_best,'newChampion',v_champion);
end;$$;

revoke all on function public.lifting_api_player(uuid) from public,anon,authenticated;
revoke all on function public.lifting_api_register(jsonb) from public,anon,authenticated;
revoke all on function public.lifting_api_login(jsonb) from public,anon,authenticated;
revoke all on function public.lifting_api_me(jsonb) from public,anon,authenticated;
revoke all on function public.lifting_api_leaderboard(jsonb) from public,anon,authenticated;
revoke all on function public.lifting_api_submit(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_player(uuid) to service_role;
grant execute on function public.lifting_api_register(jsonb) to service_role;
grant execute on function public.lifting_api_login(jsonb) to service_role;
grant execute on function public.lifting_api_me(jsonb) to service_role;
grant execute on function public.lifting_api_leaderboard(jsonb) to service_role;
grant execute on function public.lifting_api_submit(jsonb) to service_role;

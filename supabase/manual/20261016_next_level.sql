-- NEXT LEVEL additive schema. Run manually in PRIME LIFTING LAB Supabase only after review.
-- Does not alter base achievements, scores or rankings.
begin;
create table if not exists public.lifting_next_achievements (
 player_id uuid primary key references public.lifting_players(id) on delete cascade,
 title_mask integer not null default 0 check (title_mask between 0 and 255),
 updated_at timestamptz not null default now()
);
alter table public.lifting_next_achievements enable row level security;
revoke all on public.lifting_next_achievements from public, anon, authenticated;
grant select, insert, update on public.lifting_next_achievements to service_role;
create or replace function public.lifting_api_next_achievement_merge(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_player uuid; v_mask integer; v_result integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'permission denied' using errcode='42501'; end if;
 v_player:=(payload->>'playerId')::uuid; v_mask:=(payload->>'mask')::integer;
 if v_mask is null or v_mask<0 or v_mask>255 then raise exception 'invalid next mask'; end if;
 if not exists(select 1 from public.lifting_players where id=v_player) then raise exception 'unknown player'; end if;
 -- Only players with all eight original titles can accumulate NEXT LEVEL progress.
 if not exists(select 1 from public.lifting_achievements where player_id=v_player and title_mask=255) then
  return jsonb_build_object('mask',0,'god',false);
 end if;
 insert into public.lifting_next_achievements(player_id,title_mask) values(v_player,v_mask)
 on conflict(player_id) do update set title_mask=public.lifting_next_achievements.title_mask | excluded.title_mask,updated_at=now()
 returning title_mask into v_result;
 return jsonb_build_object('mask',v_result,'god',v_result=255);
end; $$;
revoke all on function public.lifting_api_next_achievement_merge(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_next_achievement_merge(jsonb) to service_role;
create or replace function public.lifting_api_next_achievement_get(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_player uuid;v_mask integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'permission denied' using errcode='42501';end if;
 v_player:=(payload->>'playerId')::uuid;
 select title_mask into v_mask from public.lifting_next_achievements where player_id=v_player;
 v_mask:=coalesce(v_mask,0);
 return jsonb_build_object('mask',v_mask,'god',v_mask=255);
end; $$;
revoke all on function public.lifting_api_next_achievement_get(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_next_achievement_get(jsonb) to service_role;
create or replace function public.lifting_api_next_achievement_list(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ids uuid[];
begin
 if auth.role() is distinct from 'service_role' then raise exception 'permission denied' using errcode='42501';end if;
 if jsonb_typeof(payload->'playerIds') is distinct from 'array' or jsonb_array_length(payload->'playerIds')>200 then raise exception 'invalid player IDs';end if;
 select coalesce(array_agg(value::uuid),array[]::uuid[]) into v_ids from jsonb_array_elements_text(payload->'playerIds');
 return coalesce((select jsonb_object_agg(a.player_id::text,a.title_mask) from public.lifting_next_achievements a where a.player_id=any(v_ids)),'{}'::jsonb);
end; $$;
revoke all on function public.lifting_api_next_achievement_list(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_next_achievement_list(jsonb) to service_role;
commit;

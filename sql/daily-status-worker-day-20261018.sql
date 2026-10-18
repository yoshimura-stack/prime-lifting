-- Align the status lookup day with the Worker response day at JST midnight.
-- The RPC is service-role only and the Worker supplies jstDay(time).
-- Read-only account-wide daily completion status. Apply before deploying /api/daily/status.
create or replace function public.lifting_api_daily_status(payload jsonb)
returns jsonb language sql stable security definer set search_path to '' as $$
with input as (
 select (payload->>'playerId')::uuid as player_id,
        (payload->>'day')::date as today
), today_awards as (
 select distinct a.challenge_id from public.lifting_daily_awards a cross join input i
 where a.player_id=i.player_id and a.day=i.today
), monthly as (
 select count(*)::integer*100 as bonus from public.lifting_daily_awards a cross join input i
 where a.player_id=i.player_id and a.day>=date_trunc('month',i.today::timestamp)::date
 and a.day<(date_trunc('month',i.today::timestamp)+interval '1 month')::date
)
select jsonb_build_object('day',i.today::text,
 'completedIds',(select coalesce(jsonb_agg(challenge_id),'[]'::jsonb) from today_awards),
 'monthlyBonus',(select bonus from monthly))
from input i
$$;
revoke all on function public.lifting_api_daily_status(jsonb) from public,anon,authenticated;
grant execute on function public.lifting_api_daily_status(jsonb) to service_role;

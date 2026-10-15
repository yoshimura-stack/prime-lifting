-- READ ONLY. Run only in the PRIME / LIFTING LAB Supabase project.
-- Confirms the V0.5.28 achievement migration can reference player IDs.
begin read only;
select table_name,column_name,data_type,udt_name,is_nullable
from information_schema.columns
where table_schema='public' and table_name in ('lifting_players','lifting_runs')
and column_name in ('id','player_id')
order by table_name,column_name;

select c.conname,pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid=c.conrelid
join pg_namespace n on n.oid=t.relnamespace
where n.nspname='public' and t.relname='lifting_players'
and c.contype in ('p','u');

select p.proname,p.oid::regprocedure as signature,p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
('lifting_api_submit','lifting_api_leaderboard','lifting_api_achievement_get','lifting_api_achievement_merge','lifting_api_achievement_list')
order by p.proname;
rollback;

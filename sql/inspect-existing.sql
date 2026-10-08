-- READ ONLY: run in Supabase SQL Editor. No player/PIN row data is read.
begin read only;
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='lifting_players'
order by ordinal_position;
select c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c join pg_class t on t.oid=c.conrelid
join pg_namespace n on n.oid=t.relnamespace
where n.nspname='public' and t.relname='lifting_players';
select indexname,indexdef from pg_indexes
where schemaname='public' and tablename='lifting_players';
select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='lifting_players';
select * from pg_policies where schemaname='public' and tablename='lifting_players';
select grantee,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='lifting_players';
select p.oid::regprocedure as signature,p.prosecdef as security_definer,
 p.proconfig,p.proacl,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'lifting_%' and p.prokind='f';
rollback;

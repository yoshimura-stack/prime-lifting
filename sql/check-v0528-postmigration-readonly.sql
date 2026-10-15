-- V0.5.28 post-migration verification (READ ONLY).
-- Execute in the PRIME LIFTING LAB Supabase SQL Editor.
-- No INSERT/UPDATE/DELETE or function invocation.
select
  to_regclass('public.lifting_achievements') is not null as table_exists,
  (select count(*) from public.lifting_achievements) as achievement_rows,
  (select count(*) from public.lifting_players) as player_rows,
  (select count(*) from public.lifting_runs) as run_rows,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('lifting_api_achievement_get','lifting_api_achievement_merge','lifting_api_achievement_list')
      and p.prosecdef=true) as secure_functions,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('lifting_api_achievement_get','lifting_api_achievement_merge','lifting_api_achievement_list')
      and has_function_privilege('anon',p.oid,'EXECUTE')) as anon_executable_functions,
  (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('lifting_api_achievement_get','lifting_api_achievement_merge','lifting_api_achievement_list')
      and has_function_privilege('authenticated',p.oid,'EXECUTE')) as authenticated_executable_functions;

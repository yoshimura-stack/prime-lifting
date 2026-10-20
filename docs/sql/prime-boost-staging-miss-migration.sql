-- ISOLATED STAGING ONLY. Do not execute against production.
-- Apply BEFORE replacing lifting_api_boost_slot_spin.
begin;
alter table public.lifting_boost_slot_spins
 drop constraint if exists lifting_boost_slot_spins_boost_type_check;
alter table public.lifting_boost_slot_spins
 add constraint lifting_boost_slot_spins_boost_type_check
 check (boost_type in ('miss','time','score','sc'));
commit;

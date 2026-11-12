import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const storage=readFileSync(new URL('../sql/season-02-additive-storage-draft.sql',import.meta.url),'utf8');
const submit=readFileSync(new URL('../sql/season-02-submit-and-ranking-draft.sql',import.meta.url),'utf8');
const worker=readFileSync(new URL('../server/worker.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('season schema is additive, restricted, and keyed by player plus month',()=>{
 assert.match(storage,/primary key \(season_key, player_id\)/i);
 assert.match(storage,/references public\.lifting_players\(id\)/i);
 assert.match(storage,/enable row level security/i);
 assert.match(storage,/revoke all on public\.lifting_season_scores from public, anon, authenticated/i);
 assert.doesNotMatch(storage,/\b(?:drop|truncate)\s+table\b/i);
 assert.doesNotMatch(storage,/delete\s+from\s+public\.lifting_players/i);
});

test('verified run submission uses month-scoped bests and keeps October player best immutable',()=>{
 assert.match(submit,/v_season text := to_char\(now\(\) at time zone 'Asia\/Tokyo','YYYY-MM'\)/);
 assert.match(submit,/select \* into v_existing from public\.lifting_runs where run_id=v_run/);
 assert.match(submit,/lifting_boost_reservations/);
 assert.match(submit,/insert into public\.lifting_season_scores/);
 assert.match(submit,/on conflict\(season_key,player_id\) do update/);
 assert.match(submit,/insert into public\.lifting_runs\(run_id,player_id,score,personal_best,new_champion\)/);
 assert.doesNotMatch(submit,/update public\.lifting_players set best_score/i);
 assert.doesNotMatch(submit,/update public\.lifting_score_breakdowns/i);
});

test('ranking uses season rows, and new UI stays disabled until season opens',()=>{
 assert.match(storage,/left join public\.lifting_season_scores s/);
 assert.match(submit,/from public\.lifting_season_scores s/);
 assert.match(worker,/SEASON_02_READY/);
 assert.match(html,/id="prime-mode-entry" hidden/);
 assert.match(html,/TEAM LEAGUE/);
 assert.match(html,/COMING SOON/);
});

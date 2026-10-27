import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../docs/sql/prime-boost-daily-login-grant-staging.sql',import.meta.url),'utf8');

test('staging daily BOOST SQL is isolated and uses JST day keys',()=>{
 assert.match(sql,/STAGING DESIGN ONLY/);
 assert.doesNotMatch(sql,/ctxhopadmvasxvjspwoi/);
 assert.match(sql,/time zone 'Asia\/Tokyo'/);
 assert.match(sql,/primary key\(player_id,jst_day\)/);
 assert.match(sql,/boost_type in \('time','score','sc','full'\)/);
});

test('grant is serialized, idempotent and skips the welcome date',()=>{
 assert.match(sql,/from public\.lifting_players where id=v_player for update/);
 assert.match(sql,/v_welcome_day >= v_day/);
 assert.match(sql,/from public\.lifting_boost_daily_login_grants[\s\S]*?jst_day=v_day/);
 assert.match(sql,/if found then[\s\S]*?'replayed',true/);
 assert.match(sql,/v_stock\.time_count<2/);
 assert.match(sql,/v_stock\.score_count<2/);
 assert.match(sql,/v_stock\.sc_count<2/);
 assert.match(sql,/random\(\)\*cardinality\(v_eligible\)/);
});

test('privileged grant endpoint is not available to public callers',()=>{
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.lifting_boost_daily_login_grants from public,anon,authenticated/);
 assert.match(sql,/revoke all on function public\.lifting_api_boost_daily_login_grant\(jsonb\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.lifting_api_boost_daily_login_grant\(jsonb\) to service_role/);
});

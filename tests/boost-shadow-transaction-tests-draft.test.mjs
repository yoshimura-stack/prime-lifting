import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../docs/sql/prime-boost-shadow-transaction-tests-draft.sql',import.meta.url),'utf8');
test('transaction scenarios are rollback-only and isolated from production tables',()=>{
 assert.match(sql,/^begin;/m);
 assert.match(sql,/^rollback;/m);
 assert.doesNotMatch(sql,/\b(?:insert into|update|delete from|alter table|drop table)\s+public\./i);
 assert.match(sql,/NOT EXECUTED/);
});
test('tests best, retry, tie, normal overtake, and invalid replay or multiplier',()=>{
 for(const term of ['BOOST best failed','retry failed','duplicate run','tie changed provenance','normal best did not clear BOOST','conflicting replay','forged multiplier'])
  assert.ok(sql.includes(term),term);
 assert.match(sql,/Separate two-session concurrency test remains mandatory/);
});

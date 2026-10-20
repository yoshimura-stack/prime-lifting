# PRIME BOOST — server-side inventory and atomic-use contract (staging draft)

Status: DESIGN ONLY. Not deployed, not enabled, and no production SQL executed.

## Non-negotiable rules
- Each account owns 0–2 units of each of `time`, `score`, `sc`.
- There is NO daily BOOST-use limit. A player holding 2 of each type can use all 6 across 6 separate runs in one day; if newly awarded more items later that day, further runs are allowed. The once-per-day limit applies ONLY to DAILY SLOT spins.
- Exactly one BOOST type or none may be used per run. Arrays, duplicate entries, invalid values and extra boost fields must fail closed.
- One item is consumed **once** for an accepted game-start reservation; repeated requests with the same idempotency key must never consume twice.
- The DAILY SLOT is once per account per JST calendar day. The outcome is three matching symbols and awards exactly one eligible BOOST; exclude stock already at 2. When all types are full, do not spin or award.
- Existing ranked games, daily challenges, login, rewards, scores and leaderboards must remain unchanged while feature is OFF.
- Never trust client-reported inventory, prize, bonus, device, duration, SC state, or final score.

## Proposed schema (migration required; not yet approved)
1. `lifting_boost_inventory(player_id PK FK, time_count int, score_count int, sc_count int, updated_at timestamptz)` with CHECK 0 <= count <= 2 for each type.
2. `lifting_boost_slot_spins(player_id FK, jst_day date, boost_type text, run_key uuid, created_at timestamptz, PRIMARY KEY(player_id,jst_day))`. An all-full skip is not a spin and should not insert a spin row.
3. `lifting_boost_run_uses(run_id uuid PK, player_id FK, boost_type text, created_at timestamptz, state text)`; unique run_id makes consumption idempotent. State lifecycle and refund policy must be decided before rollout.
4. Optional `lifting_boost_award_events(source, source_id, player_id, boost_type, created_at)` with UNIQUE(source,source_id,player_id), to prevent repeated EXTREME grants.

## Atomic RPC boundaries (security definer, authenticated Worker only)
- `lifting_api_boost_status(payload)`: return sanitized counts, today's slot status, server-calculated JST day, and eligibility. Never expose privileged raw tables.
- `lifting_api_boost_slot_spin(payload)`: lock inventory row (SELECT ... FOR UPDATE); check JST date + unique spin record; derive eligible types from counts; select server-side uniformly from eligible types; increment one count and insert spin record **in one transaction**. A duplicate call returns the stored result without incrementing.
- `lifting_api_boost_reserve(payload)`: lock inventory; validate a single enum value and sufficient stock; decrement one; insert unique run usage with signed run id **atomically**. Repeated run id returns the same reservation without decrementing.
- `lifting_api_boost_extreme_award(payload)`: only after server-replay verified completion, use unique source/run identity, apply cap and grant exactly once.

## Signed run + replay verification
- `/api/game/start` may accept one `boost` string only after BOTH the server flag and database migration are ready. Validate stock and reserve atomically, then sign run token with the selected boost and fixed ruleset. A null boost keeps current behavior.
- `/api/scores` derives selected boost **only from the verified signed run token and DB reservation**, not from the POST body.
- Time: signed 65s simulation for `time`, 60s otherwise; account for existing countdown/clock checks without weakening replay.
- Score: additive tenths, PC 10/11 and mobile 11/12, then Math.round once, with server-replayed base score. Do not compound mobile 1.1 by 1.1.
- SC: server replay must protect first combo loss and keep existing NEXT BALL mechanism; second drop normal. Ball returns visually to normal after first protection; result icon stays green.
- Best score and breakdown DB contracts need migration before ranked BOOST scores are accepted. Preserve legacy records and daily bonus accounting.

## Fail-closed rollout order
1. Unit and concurrency tests with a disposable preview database.
2. Preview-only client UI, disabled selection and disabled slot awards.
3. Deploy schema to isolated preview DB after explicit approval.
4. Implement Worker endpoints behind `BOOST_ENABLED !== 'true'` hard OFF and reject unknown BOOST fields.
5. Test two-tab simultaneous spin, repeated HTTP POST, same run token retries, full inventory, no inventory, UTC/JST rollover, restart, mobile, and network failure.
6. User checks real PC/iPhone preview.
7. Separate explicit approval for production migration and for enabling BOOST. No automatic merge or deployment.

## Pending product decisions
- On a failed/abandoned run, should a reserved BOOST be returned? Needs a precise TTL/refund policy resistant to abuse.
- Which EXTREME challenge awards which BOOST, and how to handle cap/full stock.
- Ranked icon persistence, best-score replacement and historical record representation.

Current staging guard: all `/api/boost/*` paths return 403 and both game start and score submission reject client-supplied boost fields. Do not relax until verified end-to-end.

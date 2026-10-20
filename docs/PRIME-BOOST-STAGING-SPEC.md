# PRIME BOOST — staging implementation contract (2026-10-20)

Status: development only. DO NOT merge into main or deploy to production without explicit user approval.

## Core invariant
Current production main baseline: bd355cabde240c4b0fe29d050d5db1023abe2031. Preserve physics, 60-second baseline, automatic NEXT BALL on drop, input, PC/mobile joystick/menu hitboxes, scoring events, login, daily points, existing ranking data and uniform choice. Pinball is postponed.

## Product
Three boosts, inventory max TWO per type:
- +5 SEC: extend a run's timer by 5 seconds; blue ball while active.
- SCORE +0.1 multiplier: PC base x1.0 -> x1.1, mobile existing x1.1 -> x1.2; yellow ball. Apply to final base score, integer floor. Never compound mobile x1.1 * x1.1.
- SECOND CHANCE (SC): protect combo from the FIRST ball drop only, while normal NEXT BALL spawns; subsequent hits continue preserved combo; second drop behaves normally. Ball green until first drop, then white. Run-history icon remains green.

A run may equip at most one boost; NONE is allowed. Selection occurs before run, not a persistent overlay over gameplay. Use color-coded soccer ball icons consistently in pre-run, active-run indicator, results and ranking. Ranking uses final boosted score and stores the boost used on the record; no icon for non-boosted runs. Final ranking/DB contract must be reviewed before modifying existing tables or RPC.

## Daily slot
After login / session check, if not yet claimed today, show three animated reels with GUARANTEED triple matching icon and award ONE randomly selected eligible boost. Full (2/2) types excluded; if all three full, skip slot and go to play. Exactly one grant per account per Japan calendar day, atomically server-authorized, retry/idempotency safe. Do not grant on client-only animation. No PRIME COIN and no uniform reward at initial release; future extension architecture is acceptable but do not expose them.

Daily Extreme BOOST reward integration is ON HOLD and outside phase one. Preserve existing 100 pts per normal challenge and 300/day/monthly reset behavior unchanged.

## Release guard
Production feature OFF by default at BOTH UI and server. Disabled means no accessible equip, slot grant, consume, boost score, or ranking changes, even by direct API call. Avoid shipping unlocked endpoints or a client-only flag. Prefer separate development branch and isolated preview with non-production credentials/DB. Never test consumables against production player inventory. Changes to Supabase schema and any official ranking calculation require explicit approval before production.

## Development order
1. Audit actual game UI states, current login/session flow, server replay/ranking verification and mobile multiplier, Cloudflare preview feasibility, and database contract.
2. Implement guarded UI/ball color and isolated pure boost rules with tests.
3. Implement guarded transactional inventory, once-daily slot including persisted WHITE BALL miss, start-of-run consumption, anti-double-spend/idempotency, server replay/ranking and tests.
4. PC and real-device review, CI, and staged release with explicit authorization.

No auto-merge for this feature. Existing production users continue playing unchanged.

## Open implementation details
- Where exactly to place boost selection in existing pre-run ready UI, respecting mobile controls.
- Exact score rounding stage in current code and server replay.
- SC protection against real combo reset event, preserving current ball spawn logic.
- Preview environment and isolated DB configuration.
- Miss probability and whether it varies by inventory; decide before implementing the slot RNG and SQL migration.
- DAILY EXTREME BOOST rewards are explicitly deferred; do not build them in phase one.

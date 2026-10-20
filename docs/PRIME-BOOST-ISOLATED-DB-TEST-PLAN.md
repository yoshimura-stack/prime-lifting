# BOOST isolated DB verification checklist

Status: NOT EXECUTED. No production migration or inventory mutation is authorized.

## Current finding
The connected Supabase project with `lifting_players` has no development branches (read-only branch listing). It is not safe to assume this is a preview DB. Supabase branch creation may incur charges, so do not create one without explicit approval.

## Prerequisites
1. Confirm an isolated, non-production project or approved development branch, including its billing implications.
2. Verify `lifting_players.id` is UUID PRIMARY KEY on that isolated database; seed only test players, never real player PINs or scores.
3. Apply preview schema and RPC drafts **only to isolated DB**, after a manual security review.
4. Confirm anonymous and authenticated roles cannot SELECT, INSERT, UPDATE or DELETE BOOST tables and cannot execute BOOST RPCs.
5. Confirm the service role can execute the RPCs; never embed service credentials in browser code.
6. Verify all-full slot returns no spin record, and permits a spin after inventory is spent the same JST day.
7. Verify a second spin in one JST day returns the original result, without additional inventory credit.
8. Verify two concurrent spin requests yield one award and one record.
9. Verify repeated reservation with the same run ID is idempotent; conflicting player or BOOST type is rejected.
10. Verify six same-day reservations are possible from full stock (two of each), and further reservations are allowed after later replenishment.
11. Verify two concurrent reservations for the last BOOST never drive stock negative.
12. Verify time boundary at 23:59:59 / 00:00:00 JST, failed transactions, reconnect and retries.
13. Verify game start and score submission reject BOOST requests while server kill switch is active.
14. Keep main branch and production deploy unchanged until explicit release approval.

## Known integration gaps
- Preview SQL is draft, not applied; SQL concurrency and permissions are untested.
- Client visuals are opt-in and disabled; no real slot spin or inventory consumption is connected.
- Replay engine and signed game-start token do not yet support BOOST; official ranking must not accept BOOST until replay verification is implemented.
- GitHub Actions test execution has not been confirmed.

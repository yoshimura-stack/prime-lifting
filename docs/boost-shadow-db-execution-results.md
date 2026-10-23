# Shadow DB execution results — 2026-10-23

## Target and scope
- **Only** staging Supabase project `tarnzjkxexlozqqmyqof` (`prime-boost-staging`).
- Created isolated `boost_shadow_test` schema, `players`, `runs`, and `submit_verified` function.
- Production Supabase `ctxhopadmvasxvjspwoi`, production Cloudflare, and GitHub `main` were **not changed**.
- No existing `public.lifting_players` or live score RPCs were modified.

## Executed transaction tests (all passed)
1. SCORE BOOST base 50,000 + bonus 5,000 = verified 55,000; best pointer points to the run.
2. Exact retry returns `replayed=true`; run count remains 1.
3. Different run with same score cannot replace best-run pointer.
4. Higher non-BOOST play sets 60,000 and clears BOOST best-run pointer.
5. Conflicting reuse of run ID raises `conflicting replay`.
6. Forged SCORE multiplier raises `invalid verified run`.

Test transaction used `BEGIN` / `ROLLBACK`; the post-test query confirmed **0** players and **0** runs remain.

## Access checks
- `anon` and `authenticated`: no schema usage and no function execute privilege (all four checks false).
- The isolated schema/function remain installed for further testing. They are not connected to the Worker or live ranking.

## Not yet verified
- **True two-session concurrent submission** (requires separate simultaneous DB sessions).
- Full application integration with existing score submit, daily points, achievements, SC replay, and ranking projection.
- Shadow function is a test double and **not** a trusted score-verification endpoint: its numeric parameters must never be exposed to clients.

## Gate
Do not merge staging to `main`, enable BOOST in production, or deploy without completing the remaining integration/security tests.

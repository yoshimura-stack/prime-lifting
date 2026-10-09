# V0.5.33 production compatibility patch

- Base: V0.5.32 production (no costume test score).
- Root cause: V0.5.18 kit IDs such as `japan-01` were no longer valid after the collection changed to `unlock-XX`. Server-side `validKit()` rejected these IDs and returned HTTP 400 for otherwise valid score submissions.
- Change: `server/replay.mjs` accepts historical V0.5.18 kit IDs alongside current collection IDs. The legacy list is strictly limited to the original kit groups and numeric ranges.
- No modifications to engine, score computation, authentication, database adapter, or ranking.
- This is static/test verification, not a real Supabase/Cloudflare integration test. Deploy only after ensuring rollback to V0.5.18 is available.

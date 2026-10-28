# PRIME BOOST staging deployment — no production merge

Status (2026-10-27): PR #141 is DRAFT. This file documents a **separate staging Worker**. It does not deploy anything.

## GitHub Actions limitation

The workflow `.github/workflows/deploy-boost-staging.yml` is currently only on the feature branch. GitHub's workflow_dispatch UI/API generally requires the workflow file to exist on the default branch. **Do not merge PR #141 to solve this**: it includes BOOST runtime changes and is not approved for production.

## Recommended staging launch (home PC with Node 22)

1. Check out `feature/prime-boost-mainline-20261027`. Verify `wrangler.staging.jsonc` points to `https://tarnzjkxexlozqqmyqof.supabase.co` and Worker name `prime-lifting-boost-staging`.
2. `npm ci && npm test && npm run build`
3. Log in to the Cloudflare account using `npx wrangler login` (or a scoped API token). Use the same account that owns the staging Worker. Confirm account selection; **do not target the production Worker**.
4. `npx wrangler deploy --config wrangler.staging.jsonc`. This deploys only the separate staging Worker and its static assets.
5. Register the **staging Supabase** key on the staging Worker only: `npx wrangler secret put SUPABASE_SECRET_KEY --config wrangler.staging.jsonc`. Paste the key securely when prompted; never commit it.
6. Generate a new, random session secret dedicated to staging and register it: `npx wrangler secret put SESSION_SECRET --config wrangler.staging.jsonc`. Never reuse production SESSION_SECRET.
7. Visit the URL printed by Wrangler, verify `/api/leaderboard`, then register/login with a disposable staging-only account. Verify grant, inventory, BOOST selection, 65-second blue, yellow x1.1, green SC, and replay-verified score persistence.
8. Do not run the admin reset against production or share staging credentials in chat. Stop if any API request reaches the production Supabase project.

## Known risks / validation required

- Staging DB RPCs were created for integration testing and have **not** passed complete Worker↔Supabase↔browser verification. Do not assume matching production behavior.
- Cloudflare ratelimit bindings require the selected account to support the configured Worker ratelimits.
- Deployment and secret registration are two separate steps. The Worker may temporarily respond 503 until secrets are installed.
- The staging Worker configuration intentionally uses a separate Worker name and staging DB URL. The existing `wrangler.jsonc` is **not** the staging deployment configuration.
- Do not merge PR #141, run migrations against production, or change production secrets until explicitly approved.

## GitHub Actions alternative

If an authorized maintainer later adds a **minimal, reviewed staging-only dispatch workflow** to the default branch, the feature branch's staging workflow can be dispatched with isolated GitHub environment secrets. This must be a separate reviewed change, not a merge of PR #141.

# V0.5.26 3D fitting room layout fix

- Replaces broken in-game collection cards with the V0.5.24 two-column 3D fitting-room UI in an isolated iframe.
- Read-only account best score is sent from parent to iframe. Selecting a costume sends the selection back; confirm invokes existing game confirmation.
- CSS scoped to iframe and full-screen overlay to prevent game style conflicts.
- Both root and public assets mirrored.
- Existing engine, Worker, database and scoring unchanged from V0.5.25.
- Test offline layout; account unlocks and online persistence require a separate Cloudflare test deployment. Do not overwrite production during competition until verified.

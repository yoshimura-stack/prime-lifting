# Cloudflare deploy fix (V0.5.2)

Cloudflare のデプロイコマンドが `npx wrangler deploy` のため、ビルド処理が実行されず `dist/` が存在しない問題を修正。

`wrangler.jsonc` の assets.directory を `./public` に変更し、公開用ファイルを `public/` に同梱。GitHubにZIPの**中身をすべて**アップロードしてください。`public/` を省かないでください。

`public/` には index.html, style.css, mobile-ranking.css, game.js, js/, vendor/ のみを収録。server/, SQL, secrets は公開しません。

Cloudflare の Deploy command は現状の `npx wrangler deploy` のままでOK。GitHubでアップロードがコミットされた後、Cloudflare Deploymentsで成功を確認してください。

Supabaseはまだ未接続。iPhoneでの実機操作は未検証です。

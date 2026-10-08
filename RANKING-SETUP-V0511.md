# PRIME LIFTING V0.5.11 — ランキング接続手順

## 必ずこの順番で実施

1. **Supabaseのリフティング専用プロジェクト**（`ctxhopadmvasxvjspwoi`）を開く。SQL Editorで `sql/lifting-ranking-v0511.sql` の全文を実行する。既存 `lifting_players` を削除しないSQL。既存の名前が重複している場合はユニークインデックスで停止するため、エラー内容を確認すること。既存 `TEST_PLAYER` のPINハッシュが異なる方式の場合、テストアカウントはログインできない可能性がある（上書きしない）。
2. Cloudflare Workers → `prime-lifting` → Settings → Variables and secrets → Production で次を確認する。
   - `SUPABASE_URL` (Variable): `https://ctxhopadmvasxvjspwoi.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` (Secret): Supabase `sb_secret_...` キー。**チャットやGitHubには貼らない**。
   - **新規追加** `SESSION_SECRET` (Secret): 十分長いランダム文字列（32バイト以上）。Windows PowerShellで `[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))` を実行して生成可能。Cloudflareに直接貼る。公開しない。変更すると既存ユーザーは再ログインが必要。
3. ZIPの中身をGitHub `prime-lifting` にアップロード。GitHub連携でWorkerへデプロイされる。`wrangler.jsonc` には公開可能なURLのみ記載。秘密鍵は一切含まない。
4. サイトでゲストプレイ → ランキング表示、次に新規名+PINで登録 → 再ログイン → 60秒プレイしてスコア保存 → TOP10確認。PCとスマホで同じ名前+PINを使って確認。

## セキュリティと注意
- PINはサーバー側の `crypt` (bcrypt) で照合・保存。既存の `pin_hash` は上書きしない。
- RLSを有効にし、匿名クライアントからのDB読み書きと専用RPC実行を禁止。Cloudflare WorkerのみSecret keyを使用する。
- プレイの点数はブラウザの申告を信頼せず、Workerで入力記録を再計算。
- 同一runは重複計上せず、更新はDBトランザクション内で実施。
- CloudflareとSupabase間の実通信テストはこの環境では未実施。デプロイ後に必ず実機テストする。
- 既存の `TEST_PLAYER` などの行は削除しない。過去のPIN保存方式がbcryptでない場合は移行作業が別途必要。

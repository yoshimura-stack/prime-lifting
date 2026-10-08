# V0.5.14 管理者専用リセット機能

1. ZIPを展開し中身をすべてGitHubのprime-liftingリポジトリへアップロード。
2. Cloudflare Dashboard → Workers & Pages → prime-lifting → Settings → Variables and secrets → Add variable。
3. Key: `ADMIN_PASSWORD`、Value: 管理者用パスワード（12文字以上）、**Secretにチェック**、Productionを選択して保存・デプロイ。
4. ゲーム画面左下「GAME MENU」の「管理者」をクリック。ID `host` と上記パスワードで認証。
5. 「ランキングを全削除」→ 確認ダイアログ → `RESET` 入力で全削除。

注意: パスワードはZIP、GitHub、チャットに記載しないこと。会話内で例示された短いパスワードは使用せず、別の長いパスワードを設定してください。既存の `SESSION_SECRET`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` はそのまま維持。

削除は `public.lifting_players` の全行を削除します。既存のプレイヤーは再登録が必要です。テスト環境で動作を確認してから本番データを消してください。

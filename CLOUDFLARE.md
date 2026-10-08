# GitHub → Cloudflare Workers

この納品では公開サイト・GitHub・Supabaseを変更していません。現在の自動デプロイ設定自体は閲覧できていません。以下は指定されたリポジトリ `yoshimura-stack/prime-lifting` とWorker `prime-lifting` に今回の構成を適用する手順です。

## アップロード
ZIPのルートにある `index.html`、`package.json`、`wrangler.jsonc`、`server/`、`js/` 等をリポジトリのルートへ配置します。フォルダを余分に1階層挟まないでください。既存のwrangler.toml/json設定が別にある場合、今回のwrangler.jsoncへ必要な既存設定を統合し、設定ファイルを重複させないでください。独自ドメイン・既存バインディングがあれば保持します。

Workers & Pages → `prime-lifting` → Settings → Builds で、接続先GitHub、デプロイブランチ、ルートディレクトリを確認します。

- ルート：このZIPを配置したディレクトリ（通常リポジトリ直下）
- Build command：`npm ci && npm run build`
- Deploy command：`npx wrangler deploy`
- Node：22以上（検証は24）
- Worker名：`prime-lifting`（wrangler.jsoncのnameと一致）

`dist/` はビルド時に生成。ブラウザへ公開するファイルだけをコピーします。server・SQL・Secrets・テスト・説明書は静的公開対象に含めません。`/api/*` はWorkerへ、それ以外はASSETSへ渡します。

## 実行時Secretsを保存する
Build用環境変数と**実行時Variables and Secrets**は別です。デプロイ済みWorkerの Settings → Variables and Secrets → Add で、以下をSecretとして登録し、保存・デプロイまで実施します。

| 名前（完全一致） | 値 |
|---|---|
| SUPABASE_URL | 対象プロジェクトのHTTPS Project URL。末尾に/rest/v1を付けない |
| SUPABASE_SECRET_KEY | Supabaseのサーバー専用secretキー（または既存service_role） |
| SESSION_SECRET | 新しく生成した十分長いランダム値（32文字以上） |

名前の前後の空白、値を囲む引用符、別Worker/Preview環境への登録を避けてください。画面上で値が再表示されないのはSecretの通常動作です。GitHubのSecrets欄やBuild variablesに置くだけではWorker実行時に利用できません。

ダッシュボードで保存できない場合は、対象Cloudflareアカウントで `npx wrangler login` 後、プロジェクトルートから対話入力します（値をコマンド引数へ書かない）。

```
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put SESSION_SECRET
npx wrangler secret list
```

`secret list`で名前の登録を確認します。値は表示されません。Workers BuildsのGitHub連携認証とSupabase用Secretsは別のものです。SESSION_SECRETは毎回のビルドで生成し直さず、固定して保持します。

**重要：Supabaseの既存定義確認とdb-contractの実装が完了するまでは、Secretsを入れてもランキングは503です。** `SUPABASE.md` を先に確認してください。APIが503でも静的ゲームは遊べます。

## 開発・確認
```
npm ci
npm test
npm run check:deploy
npm run dev
```
ローカルは http://localhost:8770 。本番の認証CookieはSecureです。本番は必ずHTTPS。ローカル実DB検証時の値は `.dev.vars.example` を `.dev.vars` にコピーして入力し、コミットしないでください。開発用プロジェクトの利用を推奨します。PIN認証の確認ではlocalhostを使用し、ブラウザのSecure Cookie対応を確認してください。

デプロイ後は https://prime-lifting.yoshimura-yuki.workers.dev/ を開き、再読み込みでアカウントが復元されること、APIのJSON応答、スマホの横画面操作を確認します。`/api/leaderboard`がHTMLを返す場合は静的配信だけの旧設定になっていないか確認します。403はOrigin、401はログイン、429は試行制限、503は未接続またはDB通信エラーです。PIN・Secret・リクエスト本文をログへ出さないでください。

公式参考：
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/static-assets/routing/advanced/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

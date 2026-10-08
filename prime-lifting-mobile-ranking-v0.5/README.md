# PRIME / LIFTING LAB — Mobile + Ranking V0.5

V4.2 ZIPを基準にスマホ横画面のタッチ操作とオンラインランキング用画面・Worker APIを追加しました。物理・3D描画・ユニフォーム・PCの3カラム用CSSは元ファイルと同一です。

**オンラインランキングは未接続です。** 既存Supabaseのテーブル・関数定義が未提供のため、DBへの対応部分は推測で実装していません。ゲストでゲームはプレイ可能です。接続するには `SUPABASE.md` にある定義確認とアダプター実装、実DB検証、Cloudflare Secretsの設定が必要です。

## 起動
Node.js 22以上で、`npm ci` → `npm run dev`。http://localhost:8770 を開きます。ユニフォーム選択後、ログインせず「プレイする」で遊べます。`npm test` はゲーム18項目と入力・Workerテスト。`npm run check:deploy` は公開しないビルド確認です。

## 操作
PC：A/D移動、Spaceジャンプ、左クリック打球、右クリックスピン、Escape一時停止。スマホ横画面：◀/▶長押し移動、JUMP、SPIN、KICK（足・膝・胸・ヘディングは既存判定）。複数指で同時操作。KICK以外のフィールドタップは打球しません。上部のⅡで一時停止できます。縦持ちは仮想ボタン対象外です。表示はタッチが主入力の横画面で有効になります。

## ランキング
名前＋6〜12桁PINで登録・ログインする画面を追加。ログインした状態で開始した標準設定のプレイだけ保存対象です。結果に自己BEST・全体順位・TOP10を表示し、自己新記録／全体新記録を通知。通信失敗時は再試行できます。再プレイを始めると前の未保存プレイは破棄されるので、保存したい場合は先に再試行してください。未接続時は保存不可を表示し、ゲームは継続します。

## 構成
- `game.js`：既存ゲームへの入力・ランキング連携
- `js/touch.js`：pointerIdごとのマルチタッチ
- `js/ranking.js`：アカウント・最高記録・RESULT
- `mobile-ranking.css`：追加UI（PC既存CSSは変更なし）
- `server/worker.mjs`：Worker API、署名Cookie、レート制限
- `server/replay.mjs`：既存エンジンでスコア再計算
- `server/supabase.mjs`：サーバー専用RPC通信
- `server/db-contract.mjs`：実DB定義確認待ちの接続箇所
- `sql/inspect-existing.sql`：データを変更しない定義確認
- `wrangler.jsonc`、`scripts/build.mjs`：静的公開範囲を限定したビルド
- `CLOUDFLARE.md`：GitHub連携・Secrets設定
- `SUPABASE.md`：未完了箇所と接続手順
- `TEST-RESULTS.md`、`test-results/`：確認結果・画面例

元の説明書は `README-V42.md`、`ONLINE-V42.md` に保存。旧SQLiteランキング `server/ranking.mjs` と `tests/ranking.test.mjs`、元の `tests/engine.test.cjs` は履歴として残しています。現行の起動・公開手順はこのREADMEとCLOUDFLARE.mdを使用してください。旧SQLiteサーバーは起動しません。

本番のSupabase・Cloudflare・GitHubには今回変更を加えていません。実iPhone Safariでの最終確認は未実施です。

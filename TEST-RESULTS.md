# V0.5 検証結果 — 2026-10-08

## 実施済み

| 対象 | 結果・範囲 |
|---|---|
| V4.2保全 | config / engine / renderer3d / kits / Three.js本体・ライセンス / style.css を元ZIPとバイト比較。7ファイル一致。SHA-256は test-results/protected-files.json |
| ゲーム回帰 | `npm test` の engine-v42.test.cjs 18項目成功：各打球、ジャンプ、空振り、60秒、カウントダウン、左右足・膝、2回転、当たり位置で左右へ飛ぶ処理など |
| 入力単体 | pointerId独立管理、6種類の同時操作、同じボタンの複数指、pointercancel/lostcapture、blur・orientationchange・visibilitychangeで解除を確認 |
| Worker単体 | 未接続時503、認証なし401、Origin違い403、PIN形式、過大本文413、レート制限429、署名改変拒否、セッション期限、実エンジンのリプレイ一致を確認 |
| Workerアダプター代替テスト | 登録・ログイン・同じID・誤PIN・me・開始・スコア投稿・申告得点と他人IDの無視・TOP10・最高記録・再送の同じrunIdを確認。DB部分は明示的なテスト用代替であり、実DB成功を意味しない |
| PCブラウザ | Edge/Chromium、1440×900。A/D、Space、左クリック、右クリック、仮想ボタン非表示、3カラム維持、通信失敗時RESULTと再プレイを確認 |
| スマホ相当ブラウザ | Chromiumのタッチ・横画面エミュレーション、956×440 / 844×390 / 667×375。移動長押し、3本指（移動＋JUMP＋KICK）、指の一部解除・全解除、停止、フィールドタップ無効、JUMPがSPINの上、全ボタンが画面内に収まることを確認 |
| ランキングUI | 明示的なHTTP代替応答で登録、PIN入力消去、ログイン後フォーム非表示、最高記録、TOP10、全体順位、NEW CHAMPION、保存エラー→再試行、再プレイを確認 |
| ローカルWorker | Wrangler 4.148.0で起動。ページ200、未接続APIはJSONの503。server/db-contract.mjs、.dev.vars、sql/inspect-existing.sqlのURLは404 |
| 公開用ビルド | `npm run check:deploy` 成功。dry-runのみ。本番デプロイは未実施 |
| 依存関係 | npm auditで0件（検証時点）。Wrangler 4.148.0、開発用sharpは修正版0.35.5へoverride。ゲームのThree.jsは依頼に従いV4.2を保持 |

## 元ZIPのテストについて
元の `tests/engine.test.cjs` は変更前から失敗しました。AIR +150を含まず、SPINボーナスの旧値を期待し、慣性を想定した自動操作を使用しています。元ファイルはそのまま保存し、現行 `tests/engine-v42.test.cjs` ではAIR/連続SPINの期待値とテスト用自動操作の移動・ジャンプタイミングをV4.2に合わせました。ゲームエンジンは変更していません。旧SQLite用テストも歴史資料で、現行Workerの合否には使用していません。

## 未実施・未完了（成功扱いにしていません）

- 実Supabaseへの接続・登録・PINハッシュ保存/照合・BEST更新・並行投稿の原子性・runId重複防止・順位・データ永続性・RLS/関数権限検証。既存定義確認後にアダプター／必要SQLを実装する必要があります。
- PCと実スマホ間での実アカウント共有。テストは代替アダプターで同じIDが返ることまでです。
- 実iPhone 17 Pro Max / Safari、ノッチ・実セーフエリア・ホームジェスチャー、実機音声、実回線での操作感。Chromiumエミュレーションは実機検証の代替ではありません。
- 本番CloudflareのSecrets保存、GitHub自動デプロイ、本番URLへの反映。今回変更していません。
- 本物のネットワーク切断からの復旧。通信失敗・再試行のUIはHTTP代替応答で確認しています。

## 再現方法
`npm ci` → `npm test` → `npm run check:deploy`。
ブラウザテストは別途PlaywrightとMicrosoft Edgeがある環境で `node tests/browser.cjs`。今回は同梱ランタイムのPlaywrightをNODE_PATHで参照しました。ローカル8771番をテスト中だけ使用し、自動終了します。テスト用のゲーム状態参照はメモリー上のHTTP応答だけに差し込んでおり、配布game.jsには含めていません。

`test-results/pc-playing.png` / `mobile-playing.png` はプレイ画面、`pc-result.png` / `mobile-result.png` はオフライン結果、`mobile-ranking-fixture.png` は架空のHTTP応答を使ったランキングUI確認画像です。実際のチーム記録ではありません。

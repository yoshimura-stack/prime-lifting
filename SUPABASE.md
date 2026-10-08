# 接続手順と未完了箇所

## 現在の状態
V4.2 ZIPには `lifting_players` の列定義・制約・RLSポリシー・SQL関数本体がありません。実プロジェクトへの読み取り権限も提供されていません。**実DB接続は未完了です。Secretsを設定するだけでは有効になりません。** `server/db-contract.mjs` は `verified:false` で停止し、APIは503を返します。ゲームはゲストで動作します。

Workerの認証付きAPI、署名セッション、入力リプレイによる得点再計算、UIは実装済みです。DB内のPINハッシュ照合・原子的BEST更新・同一runの重複防止は、既存定義確認後に実装または既存関数へ接続する必要があります。TEST_PLAYER 15000や既存テーブルを変更するSQLは含めていません。

## 1. 既存定義を確認する
1. 対象SupabaseプロジェクトのSQL Editorで `sql/inspect-existing.sql` を実行します。読み取り専用で、プレイヤー行・PIN値を取得しません。
2. 結果の列・制約・インデックス・RLS・関数定義と実行権限を保存します。関数本文に秘密値がある場合は共有前に伏せます。
3. 開発担当にこの結果を渡してください。URLやSecretキーを会話・GitHubに貼る必要はありません。
4. とくに `lifting_register_player` の正確な引数、戻り値、名前の一意性、PINの保存方式を確認します。ログイン、BEST更新、順位取得用の関数があるかも確認します。

## 2. 実際の構造に合わせる（開発担当の残作業）
`server/db-contract.mjs` の各operationに `{rpc, encode, decode}` を設定します。`rpc` は確認済みの実在する関数名、`encode(input)` はその正確な引数名へ変換、`decode(result)` は以下のアプリ内形式へ変換します。これは既存DBの列名や関数名の指定ではありません。まだ存在しない機能があれば、既存データを維持する移行SQLを別途作成・レビューします。

| operation | Workerから渡す情報 | decodeの戻り値 |
|---|---|---|
| register | name, nameKey, pin | `{player}`。重複名は `{player:null}` |
| login | name, nameKey, pin | 正しいPINのみ `{player}`、不正なら `{player:null}` |
| me | playerId | `{player}` |
| leaderboard | limit:10 | `{entries:[player,…]}`、全体順位順 |
| submit | playerId, runId, score, hits, combo, drops, kit, device, gameVersion | `{player,personalBest,newChampion}` |

`player` のアプリ内形式：`{id:string,name:string,best:非負整数,rank:正整数またはnull,kit:string|null,lastPlayed:ISO文字列|null}`。PIN・ハッシュは返さないこと。`nameKey` はNFKC、空白整理、小文字化済みです。

必要な保証：
- register/loginはサーバー側でPINをソルト付きの適切なパスワードハッシュ（例：Argon2idまたはbcrypt）として保存・照合。平文PINをDB列・ログ・ブラウザ保存領域に残さない。入力PINはHTTPSのリクエストでのみ送ります。既存PINが違う方式なら移行方針を決め、推測で上書きしない。
- 名前に一意制約を設け、同じプレイヤーがPC/スマホで同じIDを得る。ログインで既存名のPINを変更しない。
- submitは1トランザクションでrunIdの一意性を確認し、BESTを `max(既存値,検証済みスコア)` として更新。並行投稿で低い記録へ戻らない。再送には初回と同じ保存結果を返し、重複登録しない。期限切れrunの保持・削除方針も定義する。
- 低い得点でも最終プレイ日時・現在選択kitを更新できるようにする。best_device・BEST時kitは新記録のときだけ更新する。既存列が不足する場合は追加SQLを作成する。
- NEW RECORDは初回または自己BESTを厳密に超えた場合。NEW CHAMPIONはそれまでの全体最高を厳密に超えた場合。両方の判定も同時投稿に対して整合するようDBトランザクション内で行う。同点順位はスコア降順・到達日時昇順・ID昇順など、確定した順序を全APIで統一する。
- ブラウザのanon/authenticated/PUBLICからPIN照合・更新関数を直接実行できないようREVOKEし、Workerのサーバー用ロールだけに必要な権限を付与する。RLSを有効にするだけでは関数の直接実行を防げない。SECURITY DEFINERを使う場合は固定search_path、スキーマ修飾、最小権限を確認する。

以上を実DBで検証してから `verified:true` にしてください。フラグだけを変えたり、仮の列名で置き換えたりしないでください。

## 3. 秘密値を設定する
`CLOUDFLARE.md` に従い、Workerの実行時Secretsに `SUPABASE_URL`、`SUPABASE_SECRET_KEY`、`SESSION_SECRET` を設定します。Supabaseにはブラウザから直接アクセスしません。既存のservice_role JWTもサーバー側で利用できますが、利用可能なら現行のsecretキーを使用します。

## 4. 実接続後の必須確認（未実施）
新規登録／重複名／誤PIN／PCとスマホの同一ID／自己BEST更新／低得点で保持／並行高低投稿／同一run再送／別ユーザーのrun拒否／TOP10・自分の順位・最高記録／通信断→再試行／再デプロイ後の永続保存／anonから更新できないこと。既存TEST_PLAYERをテスト目的で削除・上書きしないでください。

## 不正対策の範囲
ブラウザ申告scoreは無視し、V4.2エンジンで最大7800tickの入力を再計算します。署名済みrunはアカウントに紐付け、60秒未満と24時間超を拒否。本文512KB・入力1万件を上限にし、IPとアカウント名にレート制限を掛けます。ただし自動操作・生成した合法リプレイを識別する仕組みではありません。Cloudflareのレート制限は分散ロケーションごとで厳密な全世界共通ロックではないため、公開規模に応じてDBでの試行制限等を追加してください。セッションは7日有効。ログアウトは当該ブラウザCookieを消去する方式で、コピー済みセッションの失効にはSESSION_SECRETのローテーション（全員再ログイン）等が必要です。

参考：
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/changelog.md


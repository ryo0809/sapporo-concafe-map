# 検証環境の配置・公開前確認（2026-10-18）

ユーザー承認の手順2（D1準備）、3（検証環境へ配置）、4（公開前確認）を実施しました。本番Workerの配置・独自ドメインへの本番公開・本番への店舗データ投入は行っていません。

## 検証先

- 公開画面：<https://sapporo-concafe-map-staging.f-app.workers.dev>
- 管理画面：同じURLの `/admin`。店舗設定・お問い合わせはSPAタブで切り替え。
- Workerバージョン：`89a6e666-392d-410b-9445-5330911458a7`
- 検索エンジンにはnoindex、robots.txtは全体クロール禁止。
- Cloudflare上の `sapporo-concafe-map.com` ゾーンはactive。独自ドメインへのサイト紐付けと本番HTTPS確認は本番公開時に実施。

## D1

| 用途 | 名前 | database_id | 現在の内容 |
| --- | --- | --- | --- |
| 検証 | sapporo-concafe-map-staging | 81b039b5-96ba-4b16-a873-ceb3c03ea42c | 最新ローカル店舗データと検証用管理者 |
| 本番 | sapporo-concafe-map-production | c9e66a61-82bc-4592-b0c9-13fcc5944753 | スキーマと本番用管理者のみ。店舗・問い合わせは0件 |

両方にマイグレーション0001〜0008を適用。配置先のDBを混同しないよう `wrangler.jsonc` のenvironmentごとに実IDを設定しました。ローカル開発用bindingは変更していません。

同期元は `reports/snapshots/staging-source-20261018.json`。8テーブルの同期とダイジェスト照合が成功しました。

| テーブル | 件数 |
| --- | ---: |
| buildings | 30 |
| floors | 41 |
| cafes | 64 |
| cafe_history | 156 |
| collection_runs | 3 |
| collected_candidates | 197 |
| search_candidates | 17 |
| import_records | 73 |

店舗64件のうち有効な店舗は63件、現在公開対象は14件、非公開49件。削除状態や公開設定は保持しています。ローカルの問い合わせ・認証情報・送信制限はコピーしていません。

## 管理者情報・バックアップ

環境別に異なる強いパスワードを生成し、DBのハッシュと照合しました。初期パスワードではありません。

- 検証用ログイン：`reports/credentials/staging-admin.env`
- 本番用ログイン：`reports/credentials/production-admin.env`
- 暗号化バックアップ：`reports/backups/staging-before-validation.encrypted.json`
- バックアップ公開鍵：`reports/keys/staging-backup-public.pem`
- バックアップ秘密鍵：`reports/keys/staging-backup-private.pem`

これらはGit対象外です。秘密鍵・平文パスワードをGitHub/Cloudflareへ登録していません。所有者は認証情報をパスワードマネージャー等へ移し、秘密鍵を端末外の安全な場所にも保管してください。秘密鍵を失うと、このバックアップを復号できません。

stagingをエクスポートして公開鍵暗号化・復号一致を確認し、専用の一時D1へ復元。認証情報を含む全16テーブルの内容一致を確認しました。復元専用DBはID・名前を確認して削除済みで、平文の復元SQLも削除しました。stagingとproductionは削除していません。

## 実環境の確認結果

HTTPS上で以下を含む23項目が成功しました。

- noindex、公開画面に管理リンクを表示しないこと、非公開店舗が公開データに含まれないこと。
- 未認証で管理APIを拒否し、生成した検証用管理者情報でログインできること。
- セッションCookieのSecure・HttpOnly・SameSite=Strict、ログアウトによるセッション無効化。
- 店舗の登録・公開・非公開・予約公開前の非表示・時刻経過後の表示・削除と、その即時反映。
- SPAタブ切り替えでURLが変わらず、保存前の入力を維持すること。
- 問い合わせフォームのHTTPS送信、IP保存、公開応答にIPを含めないこと、受信一覧の表表示・対応済み・削除。
- 別途、実際の地図タイル・店舗ピン、PC/スマホ幅、ブラウザ実行エラーがないことを確認。
- 公開ページ・画像・API・health・404のスモークテストが全件成功。

テスト用店舗・履歴・問い合わせは削除し、店舗等の8同期テーブルが同期元と一致することを再照合しました。ローカルの店舗と既存テスト問い合わせ5件は変更していません。

詳細レポートはGit対象外の `reports/staging-live-verification.json`、`reports/backups/staging-restore-verification.json`、`reports/staging-map-verification.json` に保存しています。

## 配置時に修正した運用スクリプト

リモートのSQLファイル取込では、Wranglerが `--json` 指定時も進捗表示をJSONの前に出す場合がありました。進捗後のJSONを読み取る処理へ修正し、管理者設定とバックアップ復元で確認しています。また、エクスポートの署名付き一時URLをログで非表示にしました。追加テストを含む単体28件・型チェック・lintが成功しています。

## 本番公開へ進む前に

1. 所有者が検証URLと管理画面をレビューする。
2. このブランチの接続設定・運用修正をレビューしてmainへ反映する。
3. 公開対象店舗を最終確認し、必要なら最新ローカルD1から新しいスナップショットを作成する。今回の本番DBは空の店舗状態を保持している。
4. 明示的な本番公開の承認後、本番D1へ初回同期・照合し、production Workerを独自ドメインへ配置する。`SITE_INDEXABLE=true` にするのはその時点。
5. 本番のHTTPS・www転送・認証・問い合わせ・監視通知・定期バックアップ運用を確認する。GitHubからの自動化には専用API TokenとEnvironment保護の設定も必要。ローカルOAuthトークンや秘密鍵をGitHubへコピーしない。

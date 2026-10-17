# 公開準備・レビュー手順（Issue #5）

採用ドメインは `sapporo-concafe-map.com`、正規URLは `https://sapporo-concafe-map.com/`。この変更ではドメイン購入、リモートD1操作、デプロイを実行しません。サイト公開は所有者のレビュー後に進めます。

## ローカルで確認できる変更

- タイトル、description、canonical、OGP／Twitterカード、クラゲのfavicon・Appleアイコン、コピーライト。
- 問い合わせ・修正依頼ページ、プライバシー案内、404、読み込み失敗時の再試行。
- 管理画面・APIのnoindex/no-store、セキュリティヘッダー、wwwから正規URLへの転送。
- 管理者ごとの外部候補検索は1分間に5回。保存済み候補の検索は制限対象外。
- staging／productionでは初期パスワード `admin` を拒否。パスワード変更／紛失時は管理用CLIで再設定し、既存セッションを失効。
- ローカルD1からのスナップショット、初回同期SQL生成、空のリモートD1への適用・全内容照合。
- Linux CIのテスト／Workersビルド／E2Eと、レビュー後に手動起動する配置ワークフロー。

`npm run dev` で確認します。問い合わせ先が未設定の場合、ページは「公開準備中」と表示します。仮のメールアドレスへ誘導しません。公開前に環境変数 `NEXT_PUBLIC_CONTACT_EMAIL` を実際の窓口に設定し、受信・返信を確認してください。ビルド時にページへ反映されるため、変更後は再ビルドが必要です。

`SITE_INDEXABLE` は既定でfalseです。プレビューのrobots.txtは全体をクロール禁止とし、ページにはnoindexを付けます。本番向けビルド時のみtrueにします。sitemapには公開の固定ページだけを載せ、管理画面や店舗の内部データを出しません。

## ローカルD1の移行準備（本番操作なし）

```powershell
npm.cmd run db:migrate:local
npm.cmd run db:snapshot -- --output reports/snapshots/local-review.json
npm.cmd run db:sync -- --snapshot reports/snapshots/local-review.json
```

スナップショットは最新のローカルD1を一度エクスポートしてから認証関連を除きます。`D1_PERSIST_PATH` にも対応します。旧SQLite／JSONへの逆戻りはありません。店舗、ビル、階、公開予約、論理削除、履歴、収集候補、検索候補、インポート記録を保持します。管理者パスワード・セッション・ログイン試行・検索制限カウンターは同期しません。

チェックサム付きJSONと生成SQLは `reports/` 内に保管し、Gitや公開成果物へ入れません。公開前データを含むため取り扱いに注意してください。`db:sync` は指定だけならSQLを生成して終了し、リモートへアクセスしません。

## レビュー後に所有者が設定する項目

1. ドメインの取得可否・取得費・更新費を確認し、指定ドメインを取得する。採用ドメインを勝手に変更しない。
2. CloudflareアカウントとDNSを準備し、ルートとwwwのカスタムドメイン・HTTPSを設定する。wwwはアプリの308転送で正規URLへ移動する。
3. stagingとproductionを別のD1で作成し、`wrangler.jsonc` の各environmentの `database_id` をそれぞれ設定する。既定のゼロUUIDでは配置・同期を拒否する。
4. 実際の問い合わせ先を決め、窓口、プライバシー案内、サービス名を権利者名として記したコピーライトをレビューする。地図・画像の帰属表示と利用権も確認する。
5. GitHubにstaging／productionのEnvironmentを用意し、productionは必須レビュアー・mainへのブランチ制限を設定する。Secretsに `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID`、Environment variablesに `CONTACT_EMAIL` と `BACKUP_PUBLIC_KEY` を登録する。
6. バックアップの公開鍵はRSA 2048bit以上のPEM形式。秘密鍵はGitHub／Cloudflareへ登録せず、所有者が安全な別の場所で保管する。紛失するとバックアップを復元できない。
7. 手動デプロイを許可する段階でのみ、Repository variable `DEPLOY_ENABLED=true` を設定する。設定前はworkflow_dispatchを実行しても配置ジョブが起動しない。

本番設定だけを確認するコマンドは `npm run release:check`。D1のID・問い合わせ先・本番インデックス設定が未入力なら失敗するのが正常です。このチェックはドメインの所有確認や法的レビュー、復旧テストの代わりではありません。

## 初回D1同期（レビュー・バックアップ確認後）

以下は**本番を書き換えるコマンド**です。今の実装作業では実行しません。

```bash
npx wrangler d1 migrations apply DB --remote --env staging
npm run db:sync -- --snapshot reports/snapshots/local-review.json --apply --remote --env staging --confirm-domain sapporo-concafe-map.com
```

まずstagingで検証し、承認後にproductionへ同じ手順を実施します。`db:setup:remote` は旧SQLite／JSONの取込用なので、この最新ローカルD1同期には使いません。

同期は空の移行先への初回一方向反映専用です。同期テーブルが1件でもある場合やスキーマが異なる場合は停止し、自動上書きしません。実行直前にリモートDBを `reports/snapshots/` へバックアップし、適用後に全テーブルの内容ダイジェストを照合します。実行中は対象への書き込みを止めてください。途中失敗時は再適用せず、バックアップまたは新しい空DBから復旧します。複数SQLが全体で原子的に実行されることは前提にしません。

公開後の正本は本番D1に切り替えます。再同期や双方向同期は本番の編集と競合するため、このコマンドでは扱いません。

管理者情報は別途設定します。`ADMIN_NEW_PASSWORD` は16〜256文字の固有の値を一時的な環境変数で与えます。コマンド引数・シェル履歴・ビルド用.envに平文を残さないでください。

```bash
npm run admin:password -- --remote --env staging --confirm-domain sapporo-concafe-map.com
```

`ADMIN_USERNAME` は既定でadminです。既存なら変更、新規なら作成し、その管理者のセッションと失敗回数を消去します。リモート操作には環境とドメインの明示が必要です。

## CI・配置・復旧

PR／mainのCIはNode 24とLinux上でlint、型チェック、単体・専用D1統合テスト、Workersビルド、E2Eを実行します。本番用のSecretsは検証ジョブでは不要です。

手動のDeploy reviewed releaseはmainのみ対象。環境・ドメイン確認に加え、GitHub Environmentの承認を使います。検証とビルド後、DBをバックアップして公開鍵で暗号化し、暗号化ファイルだけを30日間のArtifactとして保存します。その後マイグレーション・配置・本番スモークテストを実行します。生SQLやパスワードをArtifactへ入れません。

本番操作を伴う配置コマンドは `npm run deploy -- --env production --confirm-domain sapporo-concafe-map.com`。`SITE_INDEXABLE=true`、問い合わせ先、本番DB設定が必要です。コードの配置はDBの初回同期とは別工程です。

バックアップを復号する場合は、安全なローカル環境だけで `BACKUP_PRIVATE_KEY` を設定します。

```bash
node scripts/backup-crypto.mjs --decrypt --input reports/pre-deploy-backup.encrypted.json --output reports/restored.sql
```

最初に隔離した新規D1へ復元して照合し、管理者が復旧先を切り替えます。Workersのバージョン巻き戻しだけではDBスキーマ・データは戻りません。DBの状態とコードの互換性を確認してから戻してください。

## 公開前に残る外部設定・運用確認

- 実ドメイン・証明書、Cloudflare請求設定、D1の作成と同期、問い合わせ窓口、GitHub Environment保護は所有者の設定が必要。
- `/api/health` はDBの主要スキーマを確認し、成功200／失敗503のみ返す。管理データは返さない。外部監視を適度な頻度（例：5分間隔）で登録し、通知先と担当者を決める。
- Workers Observabilityは有効。Cloudflare上でエラー・使用量・費用の通知と確認担当を設定する。DBの定期バックアップ／復旧機能と保持期間もアカウント上で設定し、実DBで復元演習を行う。配置時のバックアップだけでは日々の編集の保護は不十分。
- 公開店舗を所有者が確認し、必要なものだけ公開する。コード・移行作業から勝手に全店舗を公開しない。
- スモークテスト：`npm run smoke -- --url https://sapporo-concafe-map.com`。HTTPS、www転送、メール受信、DB復旧は所有者と別途実確認する。
- Google Search Consoleへの所有確認・sitemap送信は、公開とnoindex解除の確認後に行う。

### レビュー観点

- 公開ページとスマホ表示、コピーライト、アイコン、OGP、問い合わせ・プライバシー案内。
- ログイン・保存・削除・予約公開・検索制限・モーダルのフォーカス。
- スナップショットに認証情報が含まれず、公開状態・削除状態を保持していること。
- CIが成功し、未設定のまま本番へ配置できないこと。
- 本番デプロイを実行していないこと。

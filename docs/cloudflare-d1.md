# Cloudflare Workers・D1の構築手順

Next.js 16をOpenNextでWorkersに配置し、店舗・管理者・セッション・取得候補をD1に保存します。DDDのdomainとapplicationはCloudflare APIへ依存せず、infrastructureのD1リポジトリをcompositionで接続します。アプリ実行時にファイルDBは使用しません。

Next.jsは16.3.8、OpenNextは1.20.11を使用します。Next.js 16.4の `preview-props.json` にOpenNextがまだ対応していないため、互換性のある16.3系へ固定しました。[上流のIssue](https://github.com/opennextjs/opennextjs-cloudflare/issues/1355) の解決後にWorkersでの検証を伴って更新してください。

WorkersではCache Componentsの段階的レンダリングが停止するため、`cacheComponents` とそれに依存するPartial Prefetchingを無効化しています。公開情報と管理ページは通常の動的SSRを使用し、リクエストごとにD1を参照します。[OpenNextの対応PR](https://github.com/opennextjs/opennextjs-cloudflare/pull/1318) を参考に、対応版の公開後に再検証してください。

## ローカル環境

Node.js 24以上で実行します。ローカル開発はCloudflareアカウントやAPIトークンなしで行えます。

```bash
npm ci
npm run cf:typegen
npm run db:setup
npm run dev
```

公開マップは `http://localhost:3000`、管理画面は `/admin/login` です。現在の初期管理者は `admin / admin`。`db:setup` はWranglerでSQLマイグレーションを適用し、初回データを取り込みます。未作成時のみ `.dev.vars.example` から `.dev.vars` を用意します。`next dev` もOpenNextの `initOpenNextCloudflareForDev` を通して同じローカルD1を使用します。

ローカルデータは `.wrangler/state` に保存します。変更する場合は `.env.local` の `D1_PERSIST_PATH` を設定してください。DBファイル、`.dev.vars`、`.env.local`、生成した移行SQLはGit管理外です。Windowsでは必要に応じて `npm.cmd` を使います。外部取得時の証明書エラーには起動前の `$env:NODE_OPTIONS="--use-system-ca"` が利用できます。

## 既存データの取り込み

初回は `data/database/sapporo.sqlite` があれば、店舗の編集内容、ビル・階、管理者のパスワードハッシュ、更新履歴、収集履歴、旧台帳を取り込みます。別パスのSQLiteは `.env.local` に `D1_SQLITE_SOURCE` を指定します。移行元は読み取り専用で開き、変更しません。既存セッションとログイン失敗回数は移さないため、D1への切り替え後はログインし直します。

SQLiteがない場合はリポジトリのJSONから初期データを生成します。この場合の初期アカウントは `.env.local` の `ADMIN_USERNAME`・`ADMIN_PASSWORD`、未設定時は `admin / admin` です。SQLiteから移行する場合は既存アカウントを保持し、この設定でパスワードを上書きしません。

取り込みSQLは `reports/d1-import.sql`、元データの件数は `reports/d1-import-summary.json` に出力します。初回完了をD1の `import_records` に記録し、再実行してもD1で編集した店舗や履歴は上書きしません。新しいバッチの取得実行と候補は追加します。候補は管理画面で確認・登録して公開します。

```bash
npm run db:prepare-import  # SQLと件数レポートの生成のみ
npm run db:setup           # ローカルD1の準備・取り込み
```

取り込みSQLには管理者のパスワードハッシュも含まれます。リポジトリや公開ファイル領域へ配置しないでください。

## 本番D1の作成とデプロイ

Cloudflareへログインし、DBを作成します。

```bash
npx wrangler login
npm run db:create
```

表示された `database_id` を `wrangler.jsonc` の `d1_databases[0].database_id` に設定します。初期値のゼロUUIDはローカル開発用です。`DB` というbinding名は変更しません。必要に応じて `account_id` を設定します。Workers名を変える場合は `name` と `services[0].service` を同じ名前にします。

```bash
npm run cf:typegen
npm run db:setup:remote
npm run deploy
```

`db:setup:remote` は本番D1のマイグレーションと初回データの取り込みを実行します。`deploy` はOpenNextのビルド後にWorkersを配置します。DBが未設定の場合は、これらのスクリプトは設定手順を表示して停止します。コードのデプロイだけでDBのスキーマや掲載情報を変更する処理はありません。

本番の `SESSION_COOKIE_SECURE` は `wrangler.jsonc` で `true` に設定済みです。ローカルの `.dev.vars` では `false` を使用します。`.env.local` の初期アカウント設定をWorkerへ配布する必要はありません。管理者はD1に保存されています。

CIで実行する場合は、Cloudflare APIトークンとアカウントIDをCIのシークレットとして設定します。Wranglerが参照する変数は `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID` です。トークンには対象アカウントのWorkersデプロイとD1操作に必要な権限を設定します。

## スキーマ更新・検証・バックアップ

スキーマの変更は `db/migrations/` に新しいSQLファイルを追加します。既に適用したSQLファイルを変更しません。

```bash
npm run db:migrate:local
npm run db:migrate:remote
npm run db:export:remote
```

バックアップは `reports/d1-backup.sql` に出力します。新しい空のD1への復元はWranglerの `d1 execute` にバックアップファイルを渡して行います。復元先のDB・bindingを確認して実行してください。ローカルD1での編集を本番へ移す場合もD1のexport/importを使用します。`db:setup:remote` の移行元は旧SQLite・JSONであり、ローカルD1の編集内容はそのコマンドだけでは転送されません。

```bash
npm run lint
npm run typecheck
npm run build:cloudflare
npx playwright install chromium
npm run test:e2e
npm start
```

`npm start` はビルド済みWorkersをローカルで起動し、`npm run preview` はビルドから実行します。E2Eは `.wrangler/tests/<実行ID>` に専用D1を準備し、WranglerのWorkers実行環境でテストします。通常の開発用D1や本番D1は変更しません。

実装時のローカル移行では、店舗63件（狸小路10件・すすきの53件）、取得履歴197候補、旧台帳8件を保持しました。Workers向けビルドとD1でのCRUD・認証を検証します。本番の作成・配置には利用者のCloudflareアカウント設定が必要です。

参考：[OpenNextのセットアップ](https://opennext.js.org/cloudflare/get-started)、[Cloudflare bindings](https://opennext.js.org/cloudflare/bindings)、[D1マイグレーション](https://developers.cloudflare.com/d1/reference/migrations/)、[D1のbatch API](https://developers.cloudflare.com/d1/worker-api/d1-database/)。

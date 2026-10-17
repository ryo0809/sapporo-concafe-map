# sapporo-concafe-map

札幌のコンセプトカフェを探すためのWebアプリケーション。Next.js App Router / React / TypeScriptを使用し、Cloudflare WorkersとD1に配置します。

## 開発

Node.js 24以上とnpmが必要です。ローカルでもD1を使用します。Cloudflareのアカウントはローカル開発には不要です。

```bash
npm ci
npm run cf:typegen
npm run db:setup
npm run dev
```

http://localhost:3000 を開きます。Windows PowerShellで実行ポリシーによりnpmが起動できない場合は `npm.cmd` を使用してください。

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run build:cloudflare
npm run test:e2e
npm start
```

`npm run build:cloudflare` はOpenNextでWorkers用の成果物を作成し、`npm start` はその成果物をローカルWorkers上でプレビューします。ビルドとプレビューをまとめて行う場合は `npm run preview` を使います。

E2Eテストは `npx playwright install chromium` でブラウザを準備し、`npm run build:cloudflare` の後に実行してください。WorkersとD1の実行環境で、地図の選択・モバイル表示・取得失敗時の再試行に加え、ログイン・候補登録・公開と閉店除外・更新競合・移行の再実行を検証します。テスト専用のD1保存領域を作成し、開発用DBは変更しません。

## Cloudflareへの配置

[Cloudflare Workers・D1の構築手順](./docs/cloudflare-d1.md) に、DBの作成、マイグレーション、既存データの移行、デプロイ、バックアップのコマンドを記載しています。`wrangler.jsonc` の `DB` bindingを使用します。本番用 `database_id` はDB作成後に設定してください。

## 管理画面

http://localhost:3000/admin/login から、初期アカウント **admin / admin** でログインできます。店舗名、エリア、種別、住所、ビル・階、座標、情報元・SNS URL、確認日、営業状態、掲載状態を登録・編集できます。

新規店舗は手入力、または候補を検索し、確認・編集して登録します。保存済みの収集候補とポケパラ・かふぇこんの一覧を検索し、情報元と重複の可能性を表示します。候補からの登録は下書きで開始します。閉店・一時休業・移転の店舗は公開設定でも表示しません。

店舗・管理者・セッションはD1で管理します。ローカルD1の保存先は `.wrangler/state`、本番はCloudflare D1です。`db:setup` はローカル用の `.dev.vars` を未作成時に用意します。必要に応じて `.env.example` を `.env.local` にコピーし、移行元SQLiteや初期アカウントを設定してください。既存管理者のパスワードは保持します。HTTPSの本番では `wrangler.jsonc` に `SESSION_COOKIE_SECURE=true` を設定済みです。

初回 `db:setup` は既存SQLiteがあれば編集内容・管理者・更新履歴も移行し、なければ既存JSONから初期データを作成します。現在は63件（狸小路10件・すすきの53件）を移行済みです。再実行時はD1の管理者による変更を保持します。詳細は [管理画面・DB・移行](./docs/admin-management.md) を参照してください。

Windowsの証明書環境で外部検索が失敗する場合は、信頼済みのシステム証明書を使用して起動します。

```powershell
$env:NODE_OPTIONS = "--use-system-ca"
npm.cmd run dev
```

## アーキテクチャ

DDDをベースに、店舗（cafes）と管理（admin）の責務を分割します。

```text
src/
  app/             Next.jsのルーティング、レイアウト、ページ
  domain/          エンティティ、業務ルール、リポジトリインターフェース
  application/     ユースケース、入出力DTO
  infrastructure/  リポジトリ実装、外部サービスへの接続
  presentation/    UIコンポーネント
  composition/     具体的な実装の組み立て、依存注入
```

依存方向は `application → domain`、`infrastructure → domain`、`presentation → application（DTO）` です。`domain` はReact・Next.js・DBに依存しません。`app` はユースケースとUIを接続し、`composition` で依存を組み立てます。業務ルールはdomainに配置します。

店舗一覧は `ListCafes` が `CafeRepository` 経由でD1から取得し、UIへDTOを渡します。狸小路・すすきののタブごとに地図と一覧を表示します。ビルのタブと階別表示は管理画面の登録内容を反映します。管理機能と認証もリポジトリインターフェースを通してD1実装を使用します。

## 地図と店舗データ

Leaflet（BSD-2-Clause）とOpenStreetMapの標準タイルを使用します。APIキーや追加の環境変数は不要です。地図の右下にOpenStreetMapの帰属を表示します。タイルは外部サービスから取得するためインターネット接続が必要です。[タイル利用ポリシー](https://operations.osmfoundation.org/policies/tiles/) に従い、プリフェッチ・一括ダウンロード・オフライン保存は行いません。標準タイルはSLAがない共有サービスです。公開規模に応じて商用タイルプロバイダへの切り替えを検討してください。

公開データはD1で管理します。エリア、ビル・階、座標の根拠、情報元URL・確認日を記録します。営業時間をリアルタイムに判定する機能はありません。メイドカフェは `maid`（M）、その他のコンカフェは `concept`（C）、種別未確認は `unknown`（?）です。座標がない店舗は一覧に表示し、ピンを推測して配置しません。従来のJSONファイルは移行元として保持します。

## 情報取得バッチ

```bash
npm run cafes:collect
```

ポケパラ・かふぇこんのエリア一覧から店舗ページを収集し、既存の公式URLも取得します。手動で1回実行するバッチで、定期実行は設定していません。Windowsの証明書環境では `$env:NODE_OPTIONS = "--use-system-ca"` を設定し `npm.cmd run cafes:collect` を実行してください。

取得結果は `data/collections/<実行ID>/tanukikoji/001.json` と `susukino/001.json` に保存し、101件目から `002.json` へ分割します。各実行の `manifest.json` に件数・取得失敗・対象外レコード、`summary.md` に結果一覧を記録します。最新実行の場所は `data/collections/latest.json` で確認できます。取得日時と媒体の更新日時を分けて記録します。SNSは店舗ページのリンクを収集し、SNS投稿・雑誌本文は現時点では取得しません。

取得後に `npm run db:setup` を実行すると新しい収集結果を候補としてローカルD1に保存します。本番への取り込みは `npm run db:setup:remote` です。初回移行後は公開店舗を自動追加・上書きせず、管理画面の候補検索から確認・登録します。取得結果の `publishable=false` は営業確認済みではないことを示します。初回移行は従来の表示を維持し、営業未確認の状態もそのまま移行します。

失敗したページは記録し、取得成功分を残した部分結果を出力します（終了コード1）。部分取得を全量取得として扱わず、管理者が候補を確認します。今回の取得方式では全店舗の網羅・閉店判定の完全性は保証されず、別名・住所差で未統合の重複候補が残る場合があります。

アプリはリクエスト時にDBを読み込みます。管理画面で保存・公開した内容は公開マップの再読み込みで反映され、データ変更のための再ビルドや再起動は不要です。

情報確認日は2026年10月15日です。地域の全店舗を網羅していません。取得方法の比較と更新調査コマンドは [店舗情報の取得・更新方法](./docs/cafe-data-acquisition.md) を参照してください。`npm run cafes:audit` は公式JSON-LDの調査レポートを生成し、台帳を自動更新しません。

## GitHub MCP

VS Code用の設定を [`.vscode/mcp.json`](./.vscode/mcp.json) に配置しています。[GitHub公式MCPサーバー](https://github.com/github/github-mcp-server) をHTTPで利用するため、Dockerや追加のnpmパッケージは不要です。

1. 環境変数 `GITHUB_PERSONAL_ACCESS_TOKEN` にGitHub Personal Access Tokenを設定します。既に設定されている場合は、その値を利用できます。トークンを設定ファイルやリポジトリに直接記載しないでください。
2. 環境変数を設定した後、VS Codeを完全に終了して起動し直し、このリポジトリを開きます。`.env` の値は、このHTTP設定では自動で読み込まれません。
3. コマンドパレットから `MCP: List Servers` を実行し、`github` を選択して起動します。信頼確認が表示された場合は内容を確認します。
4. Copilot ChatでGitHub MCPのツールが表示されることを確認します。

トークンの対象リポジトリには `ryo0809/sapporo-concafe-map` を指定し、利用する機能に合わせてContents、Issues、Pull requestsなどの権限を設定します。Gitのpush用認証とMCPの認証は別です。

セットアップ時には既存の環境変数を使用し、公式サーバーの `initialize` がHTTP 200で成功することを確認しました。VS Code内でのサーバー起動は上記手順で行ってください。

設定形式と操作は [VS Code公式MCP設定リファレンス](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) を参照してください。他のクライアントでは設定形式・配置先が異なります。

## 開発指針

AIによる作業の規約は [CLAUDE.md](./CLAUDE.md) を参照してください。
Next.jsのセットアップは [公式インストールガイド](https://nextjs.org/docs/app/getting-started/installation) に準拠しています。依存バージョンは `package.json` と `package-lock.json` で管理します。

## 依存関係の監査

初期セットアップ時の `npm audit` は、開発用ESLintの間接依存 `braces` に由来するhighの報告を5件検出しました（[アドバイザリ](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)）。監査時点で自動修正は提供されていません。依存更新時に再確認してください。

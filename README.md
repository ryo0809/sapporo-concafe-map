# sapporo-concafe-map

札幌のコンセプトカフェを探すためのWebアプリケーション。Next.js App Router / React / TypeScript / ESLintを使用します。

## 開発

Node.js 20.9以上とnpmが必要です。Node.js 24 LTSを推奨します。

```bash
npm ci
npm run dev
```

http://localhost:3000 を開きます。Windows PowerShellで実行ポリシーによりnpmが起動できない場合は `npm.cmd` を使用してください。

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm start
```

`npm start` はビルド済みアプリを起動します。

E2Eテストは `npx playwright install chromium` でブラウザを準備し、`npm run build` の後に実行してください。外部タイルをモックし、ピン・一覧の選択、モバイル表示、タイル取得失敗と再試行を検証します。

## アーキテクチャ

DDDをベースに、店舗（cafes）を最初の境界づけられたコンテキストとして責務を分割します。

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

店舗一覧は `ListCafes` が `CafeRepository` 経由で取得し、UIへDTOを渡します。最新バッチのエリア別ファイルを読み込み、狸小路・すすきののタブごとに地図と一覧を表示します。座標が重なる候補は数付きピンにまとめます。DBと認証は未実装です。

## 地図と店舗データ

Leaflet（BSD-2-Clause）とOpenStreetMapの標準タイルを使用します。APIキーや追加の環境変数は不要です。地図の右下にOpenStreetMapの帰属を表示します。タイルは外部サービスから取得するためインターネット接続が必要です。[タイル利用ポリシー](https://operations.osmfoundation.org/policies/tiles/) に従い、プリフェッチ・一括ダウンロード・オフライン保存は行いません。標準タイルはSLAがない共有サービスです。公開規模に応じて商用タイルプロバイダへの切り替えを検討してください。

`src/infrastructure/cafes/data/tanukikoji/001.json` と `susukino/001.json` 以降に100件以下ずつ店舗データを保存します。DBは使いません。エリア、建物グループ、座標の確認元、公式の確認元URL・確認日を記録します。営業時間をリアルタイムに判定する機能はありません。メイドカフェは `maid`（M）、その他のコンカフェは `concept`（C）で分類し、両方に該当する場合は `maid` を優先します。

## 情報取得バッチ

```bash
npm run cafes:collect
```

ポケパラ・かふぇこんのエリア一覧から店舗ページを収集し、既存の公式URLも取得します。手動で1回実行するバッチで、定期実行は設定していません。Windowsの証明書環境では `$env:NODE_OPTIONS = "--use-system-ca"` を設定し `npm.cmd run cafes:collect` を実行してください。

取得結果は `data/collections/<実行ID>/tanukikoji/001.json` と `susukino/001.json` に保存し、101件目から `002.json` へ分割します。各実行の `manifest.json` に件数・取得失敗・対象外レコード、`summary.md` に結果一覧を記録します。最新実行の場所は `data/collections/latest.json` で確認できます。取得日時と媒体の更新日時を分けて記録します。SNSは店舗ページのリンクを収集し、SNS投稿・雑誌本文は現時点では取得しません。

アプリは `data/collections/latest.json` が指す実行結果を読み込みます。閉店・一時休業・移転の状態を持つ候補は除外し、営業未確認の候補は明示したうえで一覧に表示します。座標がない候補にはピンを置かず、一覧から情報元を確認できます。種別未確認は「?」で区別します。取得結果の `publishable=false` は営業確認済み台帳への昇格不可を示し、今回の候補表示とは別です。既存の確認済み台帳への書き戻しは行いません。

失敗したページは記録し、取得成功分を残した部分結果を出力します（終了コード1）。部分取得のスナップショットはアプリで全量結果として表示しません。今回の取得方式では全店舗の網羅・閉店判定の完全性は保証されず、別名・住所差で未統合の重複候補が残る場合があります。

アプリはリクエスト時に最新実行のファイルを読み込みます。バッチ完了後はブラウザの再読み込みで反映され、データ変更のための再ビルドや再起動は不要です。本番運用ではバッチとアプリが同じ永続ファイル領域を参照する必要があります。

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

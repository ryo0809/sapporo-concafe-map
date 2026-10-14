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
npm start
```

`npm start` はビルド済みアプリを起動します。

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

店舗一覧は `ListCafes` が `CafeRepository` 経由で取得し、UIへDTOを渡します。初期実装は空のインメモリリポジトリです。実店舗データ、地図、DB、認証は未実装です。永続化導入時はリポジトリ実装とcompositionを差し替えます。集約・値オブジェクト・ドメインサービスは具体的な業務ルールが定まった際に追加します。

## 開発指針

AIによる作業の規約は [CLAUDE.md](./CLAUDE.md) を参照してください。
Next.jsのセットアップは [公式インストールガイド](https://nextjs.org/docs/app/getting-started/installation) に準拠しています。依存バージョンは `package.json` と `package-lock.json` で管理します。

## 依存関係の監査

初期セットアップ時の `npm audit` は、開発用ESLintの間接依存 `braces` に由来するhighの報告を5件検出しました（[アドバイザリ](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)）。監査時点で自動修正は提供されていません。依存更新時に再確認してください。

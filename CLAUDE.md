# 開発ガイド

## プロジェクト

札幌コンカフェマップ。Next.js App Router、React、TypeScriptを使用。説明とドキュメントは日本語を基本とする。

Next.js固有の変更前に `AGENTS.md` と `node_modules/next/dist/docs/` の該当ガイドを読む。インストール済みバージョンの仕様を優先する。

## DDDと依存関係

- `src/domain/<context>`: エンティティ、値オブジェクト、業務ルール、リポジトリインターフェース。React、Next.js、DBに依存させない。
- `src/application/<context>`: ユースケースとDTO。domainのインターフェースへ依存し、infrastructureを直接importしない。
- `src/infrastructure/<context>`: リポジトリ実装と外部I/O。業務ルールを置かない。
- `src/presentation/<context>`: UI。applicationのDTOを受け取り、永続化処理を直接呼ばない。
- `src/composition`: 具体的な実装の生成と依存注入。DBや秘密情報を扱う実装の導入時は `server-only` でサーバー境界を保護する。
- `src/app`: ルーティングとユースケース・UIの接続。業務ロジックを置かない。

現在のコンテキストは `cafes` と `admin`。新しいコンテキストは業務上の境界に沿って追加する。集約・値オブジェクトは実際の不変条件が生じた際に導入し、不要な抽象化を避ける。

## 実装方針

- TypeScriptのstrictを維持し、安易な `any` を避ける。
- Server Componentsを基本とし、ブラウザの状態やイベントが必要な箇所のみClient Componentsにする。
- 外部入力を境界で検証し、業務上の不変条件はdomainで保証する。
- 実店舗の情報を推測して追加しない。公開情報はCloudflare D1で管理し、確認元URL・確認日・座標の根拠・エリア・ビル・階を記録する。取得方法は `docs/cafe-data-acquisition.md`、DBは `docs/admin-management.md` と `docs/cloudflare-d1.md` を参照する。メイドカフェは `maid` を優先し、その他のコンカフェは `concept` とする。
- 情報取得は `batch/` に独立させる。`npm run cafes:collect` は手動で1回実行する。取得結果は `data/collections/<実行ID>/{tanukikoji,susukino}/001.json` 以降へ100件ずつ保存し、`db:setup` で候補をDBに取り込む。初回移行後は管理者の編集を上書きせず、候補は確認してから登録・公開する。取得成功を営業中の根拠としない。閉店・休業・移転、下書き・非公開は公開マップから除外し、座標欠損は一覧だけに表示する。
- 管理APIはセッション認証と入力検証を必須とし、更新時はversionで競合を検知する。パスワードとセッショントークンの平文をDB・ログに保存しない。初期アカウントは `db:setup` で作成する。DBの変更は既存編集を保持して移行する。
- デプロイ先はCloudflare Workers、DBはD1の `DB` binding。アプリからローカルファイルDBや `node:sqlite` を使用しない。スキーマ変更は `db/migrations/` の追加SQLで管理し、D1の `batch()` とversionトリガーで店舗更新と履歴を原子的に保存する。bindingやリクエスト間のPromiseをモジュール全体で保持しない。
- 秘密情報や `.env` はコミットしない。環境変数導入時は値を含めない `.env.example` とREADMEの説明を追加する。
- 依存更新時は `package-lock.json` を更新する。

## 検証

```bash
npm run lint
npm run typecheck
npm run build
npm run build:cloudflare
npm run test:e2e
```

Node.js 24以上を使用する。Windows PowerShellでnpmのスクリプト実行が拒否される場合は `npm.cmd` を使う。業務ルールや振る舞い追加時は対応するテストを追加する。Playwrightで単体・E2EテストをWorkers向けビルド後に実行する。テスト専用D1保存領域を使い、開発用データを変更しない。binding型を変更したら `npm run cf:typegen` を実行する。

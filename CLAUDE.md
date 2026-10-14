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

現在のコンテキストは `cafes`。新しいコンテキストは業務上の境界に沿って追加する。集約・値オブジェクトは実際の不変条件が生じた際に導入し、不要な抽象化を避ける。

## 実装方針

- TypeScriptのstrictを維持し、安易な `any` を避ける。
- Server Componentsを基本とし、ブラウザの状態やイベントが必要な箇所のみClient Componentsにする。
- 外部入力を境界で検証し、業務上の不変条件はdomainで保証する。
- 実店舗の情報を推測して追加しない。`src/infrastructure/cafes/data/{tanukikoji,susukino}/001.json` 以降のファイルに100件以下ずつ保存する。確認元URL・確認日・座標の根拠・エリアを記録する。取得方法は `docs/cafe-data-acquisition.md` を参照する。メイドカフェに該当する店舗は `maid` を優先し、その他のコンカフェは `concept` とする。
- 情報取得は `batch/` に独立させる。`npm run cafes:collect` は手動で1回実行する。取得結果は `data/collections/` に保存する。アプリは最新スナップショットの候補をラベル付きで表示する。取得成功を営業中の根拠とせず、未確認候補を確認済み台帳に自動追加しない。閉店・休業・移転の状態は表示から除外し、座標欠損は一覧だけに表示する。
- 秘密情報や `.env` はコミットしない。環境変数導入時は値を含めない `.env.example` とREADMEの説明を追加する。
- 依存更新時は `package-lock.json` を更新する。

## 検証

```bash
npm run lint
npm run typecheck
npm run build
```

Windows PowerShellでnpmのスクリプト実行が拒否される場合は `npm.cmd` を使う。業務ルールや振る舞い追加時は対応するテストを追加する。現時点でテストランナーは未導入。

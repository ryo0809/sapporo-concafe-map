# アクセス解析の運用

Issue #17 は段階導入する。現在の実装は行動イベントの受信と主要操作の計測であり、送信・保存は初期状態で無効。本番へのデプロイ、Analytics Engine の作成、契約変更は実施していない。

## 現在の設定と権限

2026年10月18日、本番 Worker の設定 API は200。Observability と永続ログ・呼び出しログは有効、head sampling は1、トレースは無効だった。D1 のメタデータ参照も200。Web Analytics サイト一覧は403であり、有効状態を確定していない。HTTP Analytics と D1 の時系列メトリクスの参照権限は未確認。既存のソースマップ用 Sentry トークンによる Issue 一覧取得は403で、Issue の解決権限としては使用できない。

本番ログの `redact_query_string` は false だった。独自行動イベントはクエリーを含めないが、プラットフォームの呼び出しログは別管理である。有効化前にログのクエリー秘匿設定と閲覧権限を確認する。

## 指標と制約

| 指標 | 取得方法と粒度 | 保持とサンプリング | 現在の実装 |
| --- | --- | --- | --- |
| PV・訪問・流入・端末・国・Core Web Vitals | Web Analytics の集計。訪問数は厳密な人数ではない | 契約・データセットの利用可能期間を管理画面で確認 | 設定権限が必要。任意イベント基盤としては使わない |
| ページ表示・エリア・店舗詳細・SNS送客 | Analytics Engine、操作単位 | 3か月保持。集計時は `_sample_interval` で補正 | 受信口と画面の操作を接続済み、初期状態は無効 |
| ビル選択 | 同上。今回は代表店舗IDを送信 | 同上 | 正式なビルIDの集計は次段階。店舗所属変更時に過去分のビルを復元できない |
| 検索・0件率 | 同上。入力停止1秒後、結果件数のみ | 同上 | 生の検索語は保存しない。入力中の1文字ごとの送信はしない |
| 地図初回読込時間・エラー | 同上。マウント／再試行ごとに初回成功・初回タイルエラー | 同上 | 全タイルの成功率ではなく、初回読込試行の観測 |
| 問い合わせ | 同上。成功・失敗・入力エラー | 同上 | 内容・連絡先・エラーメッセージは送信しない |
| API失敗率・Worker outcome・CPU・実行時間 | Workers Metrics と Logs | プラン依存、Logsの収集率は本番設定で確認済み | 既存基盤を使用。独自の通知・表示は未追加 |
| JS例外・リリース対応 | 既存Sentry | 契約の保持期間・枠に依存 | 導入済み。Issue整理は認証待ち |
| D1読み書き・容量・費用 | D1 Metrics、アカウントの利用状況 | 契約・APIデータセットに依存 | メタデータ権限のみ確認済み |
| 滞在・スクロール・UTM・ファネル・再訪 | 独自設計が必要 | 利用者識別を導入する前に同意・保存期限を決める | 未実装。永続識別子は追加していない |

計測は広告ブロック・通信失敗・レート制限で過少になる。送客はクリック数であり、リンク先閲覧・来店・購入ではない。詳細表示は選択操作の回数で、ユニーク人数ではない。同じ店舗の再選択も操作として数える。SPAではパス変更ごとにページ表示を送り、クエリー変更と再レンダリングでは送らない。別タブへのリンクは `fetch` の `keepalive` で送るが、配送は保証しない。

## イベント仕様

`POST /api/analytics`、JSON、最大2048バイト。未知の属性・不正な型は拒否する。

- 必須: `version: 1`、`event`、公開ページの `page`。
- 任意: `area`、`cafeId`、`source`、`medium`、非負整数 `value`。
- イベント: `page_view`、`area_select`、`detail_open`、`detail_close`、`outbound_click`、`building_select`、`map_reset`、`map_ready`、`map_error`、`search`、`contact_success`、`contact_error`、`contact_invalid`。
- `value`: `search` は結果件数、`map_ready` は初回タイル読込完了までのミリ秒、それ以外は未使用。
- Analytics Engine の indexes はイベント名。blobs 1〜9 は version、event、環境、リリース、page、area、cafeId、source、medium。double1 は value。日時は基盤の受信時刻。

本番の正規ホストと同一 Origin のみ受け付ける。管理画面はページ許可リストから除外し、Cookie付きの送信も保存しない。ブラウザー側は開発・ステージング・WebDriver・DNT・GPCで送信しない。E2Eの除外は通常の自動ブラウザー向けであり、偽装イベントの認証にはならない。

Cookie・認証情報・メール・問い合わせ本文・生IP・検索語・URLクエリーはイベントに保存しない。Cloudflare Rate Limiting のキーにはプラットフォームが付与したIPを一時利用する。入力IDが実在する店舗かどうかの照合と、イベントの完全な真正性の保証は未実装。クライアント側は1分60件まで、入力エラーは1秒に1件まで。受信側は必須のプラットフォームレート制限で抑制し、bindingがない場合は保存しない。

## 有効化と停止

1. Web Analytics と Analytics Engine の権限・契約・利用枠を確認する。追加費用が必要なら金額を提示して承認を得る。課金回避の代替は、既存 Workers Metrics・Sentry のみを継続し行動計測を無効のままにすること。
2. 本番環境だけに `ANALYTICS` の Analytics Engine binding、`ANALYTICS_RATE_LIMITER` の Rate Limiting binding を設定する。推奨の初期制限はIPあたり60件／60秒。プラットフォーム制限はロケーション単位であり全世界の厳密な上限ではない。
3. 本番varsに `ANALYTICS_ENABLED=true` と機密情報を含まない `ANALYTICS_RELEASE` を設定する。ビルド時のみ `NEXT_PUBLIC_ANALYTICS_ENABLED=true` を指定する。binding型を生成し、Workers向けビルドとE2Eを再実行する。
4. Web Analytics は自動挿入で管理画面まで収集しないように除外条件を確認してから導入する。行動計測とは別機能。
5. ログインしていないブラウザーで各操作とデータを照合する。管理者・E2E・ステージングが混入しないこと、検索語・問い合わせ内容がないことを確認する。
6. 停止は受信側の `ANALYTICS_ENABLED` をfalseにする。必要ならクライアントもfalseで再ビルドする。

Cloudflare公式の公開料金表では Analytics Engine の Free は書込10万件／日・読取1万件／日、Paid は書込1000万件／月・読取100万件／月を含み、超過はそれぞれ100万件あたり0.25米ドル・1米ドル。確認日の料金ページは「現時点では請求しない」とも記載しているため、将来も無料とは扱わない。イベント受信の Worker リクエストは別途利用枠を消費する。1操作1リクエストで再送は行わず、D1書込は増やさない。有効化前に実測でCPUと通信量を確認する。

## 集計と残りの工程

次段階で認証付きダッシュボードとCSV/APIを追加する。JSTの日付境界をUTCへ変換して問い合わせ、日次・週次・月次の期間比較、店舗・エリア・端末・流入の絞り込みを設ける。SQLは入力を直接連結せず、許可したフィルターと範囲から組み立てる。集計は `SUM(_sample_interval)` を件数とし、`COUNT(*)` を正確な全件数と扱わない。SNS送客率は同一期間・店舗のクリック数／詳細選択数と定義し、人数や来店率と表示しない。

未完了: Web Analytics設定、正式なビル／階ID、地図移動の間引き、LCP/INP/CLS/TTFB、許可UTM・参照元、スクロールとアクティブ時間、匿名ファネル設計、認証付きダッシュボード・CSV/API、通知先への接続、実データ照合と性能測定。本Issue全体の完了扱いにはしない。

通知の初期案は、5分間でAPI 5xxが5件以上かつ5%以上、1102は1件以上、地図エラーが20試行以上で10%以上、利用枠80%と95%到達。運営者が通知先と閾値を確認してから設定する。通知時はWorker outcome・CPU・API状態・リリースを調べ、地図障害では一覧の利用可否も確認する。Ray IDを利用者への調査依頼に使う場合も行動イベントには混ぜない。メール等の通知先への送信は設定していない。

## 検証記録

2026年10月18日: lint・型チェック・単体テスト57件・Next.js本番ビルドを通過。Workers向けビルドとE2E27件は `reports/issue17-validation` の隔離コピーで通過した。変更した実行時ファイル9件のハッシュが作業ツリーと一致することも確認した。Workers向けビルドではWindowsのディレクトリsymlink作成制限を検証用junctionフォールバックで回避した。通常のWindows環境で補助なしのビルドを保証するものではない。本番リリースは行っていない。

同日、利用者の依頼に基づき [ステージング](https://sapporo-concafe-map-staging.f-app.workers.dev) に配置した。Workerバージョンは `73dcfcf1-4995-4680-bc02-a3a51c00f3a6`。計測は無効のまま。配置時に既存マイグレーション `0009_building_management.sql` の未適用でヘルスチェックが503となったため、ステージングD1を暗号化バックアップして復号照合後、0009を適用した。既存8テーブルについて、ビルの追加列を除く値が適用前と一致することを確認した。本番D1の変更は行っていない。

配置後の実ブラウザー検証19項目が成功。ヘルスチェック200、実タイル・ピン、エリア切替、店舗詳細の開閉、検索0件からの復帰、外部リンク属性、PCと375pxの表示、プライバシー説明、フォームの必須入力、実際の問い合わせ送信と管理画面での確認・削除、管理タブ切替、ログイン・ログアウト、未認証API拒否、Secure/HttpOnly Cookie、noindex、ステージングで行動イベントを送信しないこと、受信口が204で保存を抑止することを確認した。ブラウザー実行時エラーは0件。検証用問い合わせは削除して一覧からの消失を照合済み。結果はローカルの `reports/issue17-staging-verification.json`、画面は `reports/issue17-staging-1280.png` と `reports/issue17-staging-375.png` に保存した。

本番で有効にした状態のAnalytics Engineへの配送・集計照合は、このステージング検証の対象外。受信時のデータ内容、プライバシー除外、サイズ・レート制限は単体テストで確認している。

## 公式資料

- [Web Analytics](https://developers.cloudflare.com/web-analytics/about/)
- [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Analytics Engineの料金](https://developers.cloudflare.com/analytics/analytics-engine/pricing/)
- [Analytics Engineの制限](https://developers.cloudflare.com/analytics/analytics-engine/limits/)
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [D1 Metrics](https://developers.cloudflare.com/d1/observability/metrics-analytics/)

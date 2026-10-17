# 管理画面のCloudflare 1102調査（2026-10-18）

店舗保存でHTMLのCloudflare 1102画面が返り、クライアントがJSONとして解析してUnexpected token '<'を表示した。

Cloudflare APIへの検証環境CPU上限設定要求は、エラー100328「CPU limits are not supported for the Free plan」で拒否された。課金契約は変更していない。無料プランのCPU上限は10msであり、Next.js/OpenNextの動的処理を安定して運用できるCPU予算を確保するにはWorkers Paidへの切り替えが必要。Standardというusage_modelの値だけでは有料契約とは判定できない。

検証環境の非公開テスト店舗の登録・更新・削除は今回は成功したが、成功した単発テストは無料枠での安定動作を保証しない。過去ログの参照APIは現在のOAuth権限では403。CPUとメモリのどちらが当該Rayで超過したかを履歴から確定したとは扱わない。

管理画面ではHTMLを無条件にJSONとして解析しない。1102は日本語で原因と環境設定変更の必要性を表示し、他の非JSON応答・不正JSONも適切なエラーにする。保存入力は保持し、保存がDBに反映された後で応答処理が失敗した可能性があるため、自動再送しない。

有料化は所有者の承認・管理画面での操作が必要。切り替え後に本番で登録・更新・削除とWorkerエラー率を再確認する。監視・費用通知も設定する。

参考：
- https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/

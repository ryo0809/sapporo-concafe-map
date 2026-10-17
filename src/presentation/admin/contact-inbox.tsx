"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { contactCategories, contactFields, contactDetailFields, contactUrlFields, isStoreContact, type ContactMessage } from "@/domain/contact";
function MessageDetails({ message }: { message: ContactMessage }) {
  const details: Record<string, string> = JSON.parse(message.details_json || "{}");
  const fields = [...contactDetailFields[message.category], ...(isStoreContact(message.category) ? contactUrlFields : [])];
  const row = (label: string, value: ReactNode) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>;
  return <table className="admin-inbox-table" aria-label="お問い合わせの詳細"><tbody>
    {row("種別", contactCategories[message.category])}
    {row("受付日時", <><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</time>（日本時間）</>)}
    {row(message.category === "deletion" ? "事業責任者の氏名" : "お名前", message.name || "未入力")}
    {row("メールアドレス", message.email ? <a href={`mailto:${encodeURIComponent(message.email)}`}>{message.email}</a> : "メールアドレス未入力（返信不可）")}
    {message.store_name && row("店舗名", message.store_name)}
    {fields.filter(field => details[field.key]).map(field => row(field.label, field.type === "url" ? <a href={details[field.key]} target="_blank" rel="noopener noreferrer">{details[field.key]}</a> : details[field.key]))}
    {message.reference_url && row("確認用URL", <a href={message.reference_url} target="_blank" rel="noopener noreferrer">{message.reference_url}</a>)}
    {message.message && row(contactFields[message.category].label, message.message)}
    {row("送信元IPアドレス", message.ip_address || "未取得")}
  </tbody></table>;
}
export function ContactInbox() {
  const [status, setStatus] = useState<"new" | "done">("new");
  const [messages, setMessages] = useState<ContactMessage[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [revision, setRevision] = useState(0), [target, setTarget] = useState<ContactMessage | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let disposed = false;
    fetch(`/api/admin/contacts?status=${status}`).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!disposed) setMessages(data.messages); }).catch(error => { if (!disposed) setError(error.message); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [status, revision]);
  async function update(message: ContactMessage, remove = false) {
    if (busy) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/contacts", { method: remove ? "DELETE" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: message.id, status: status === "new" ? "done" : "new" }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      dialog.current?.close(); setTarget(null); setLoading(true); setRevision(v => v + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "更新に失敗しました。"); }
    finally { setBusy(false); }
  }
  return <div className="contact-inbox">
    <section className="admin-panel" aria-labelledby="admin-inbox-title">
    <div className="admin-panel-heading"><h2 id="admin-inbox-title">受信一覧</h2></div>
    <div className="admin-area-tabs admin-inbox-status" role="group" aria-label="対応状況">{(["new", "done"] as const).map(value => <button key={value} type="button" aria-pressed={status === value} disabled={busy} onClick={() => { if (status === value) return; setStatus(value); setMessages([]); setLoading(true); setError(""); }}>{value === "new" ? "未対応" : "対応済み"}</button>)}</div>
    <p className="admin-field-help">新しい順に最大100件を表示します。返信はメールアドレスのリンクから行ってください。不要になった内容は削除してください。</p>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <div className="admin-results-heading"><h3>{status === "new" ? "未対応" : "対応済み"}のお問い合わせ</h3>{!loading && <span>{messages.length}件</span>}</div>
    <div className="admin-inbox-list">
    {loading ? <p role="status" className="admin-empty">読み込んでいます…</p> : messages.length === 0 ? <p className="admin-empty">お問い合わせはありません。</p> : messages.map(message => <article className="contact-message" key={message.id}>
      <div className="admin-inbox-message-heading"><h3>{contactCategories[message.category]}{message.store_name && `：${message.store_name}`}</h3><span className={`admin-inbox-badge ${message.status}`}>{message.status === "new" ? "未対応" : "対応済み"}</span></div>
      <MessageDetails message={message}/>
      <div className="admin-form-actions admin-inbox-actions"><button disabled={busy} onClick={() => update(message)}>{status === "new" ? "対応済みにする" : "未対応に戻す"}</button><button className="danger admin-delete-button" disabled={busy} onClick={() => { setTarget(message); dialog.current?.showModal(); }}>削除</button></div>
    </article>)}
    </div></section>
    <dialog ref={dialog} className="admin-save-dialog admin-delete-dialog" aria-labelledby="contact-delete-title" onCancel={event => { if (busy) event.preventDefault(); }}><h2 id="contact-delete-title">お問い合わせを削除しますか？</h2><p>削除すると元に戻せません。</p>{error && <p role="alert" className="admin-error">{error}</p>}<div className="admin-delete-actions"><button className="secondary" autoFocus disabled={busy} onClick={() => dialog.current?.close()}>キャンセル</button><button disabled={busy} className="danger" onClick={() => target && update(target, true)}>{busy ? "削除しています…" : "削除する"}</button></div></dialog>
  </div>;
}

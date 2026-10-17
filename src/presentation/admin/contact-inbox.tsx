"use client";
import { AdminNavigation } from "@/presentation/admin/navigation";
import { useEffect, useRef, useState } from "react";
import { contactCategories, contactDetailFields, contactUrlFields, isStoreContact, type ContactMessage } from "@/domain/contact";
function MessageDetails({ message }: { message: ContactMessage }) {
  const details: Record<string, string> = JSON.parse(message.details_json || "{}");
  const fields = [...contactDetailFields[message.category], ...(isStoreContact(message.category) ? contactUrlFields : [])];
  return <dl className="contact-details">{fields.filter(field => details[field.key]).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{field.type === "url" ? <a href={details[field.key]} target="_blank" rel="noopener noreferrer">{details[field.key]}</a> : details[field.key]}</dd></div>)}</dl>;
}
export function ContactInbox({ username }: { username: string }) {
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
  return <main className="admin-shell contact-inbox"><AdminNavigation username={username} current="contacts"/>
    <div className="contact-tabs" aria-label="対応状況">{(["new", "done"] as const).map(value => <button key={value} type="button" aria-pressed={status === value} disabled={busy} onClick={() => { if (status === value) return; setStatus(value); setMessages([]); setLoading(true); setError(""); }}>{value === "new" ? "未対応" : "対応済み"}</button>)}</div>
    <p>新しい順に最大100件を表示します。返信はメールアドレスのリンクから行ってください。不要になった内容は削除してください。</p>
    {error && <p role="alert" className="contact-error">{error}</p>}
    {loading ? <p role="status">読み込んでいます…</p> : messages.length === 0 ? <p>お問い合わせはありません。</p> : messages.map(message => <article className="contact-message" key={message.id}>
      <h2>{contactCategories[message.category]}{message.store_name && `：${message.store_name}`}</h2><p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</time>（日本時間）</p>
      <p>{message.name && <>{message.category === "deletion" && "事業責任者："}{message.name} / </>}{message.email ? <a href={`mailto:${encodeURIComponent(message.email)}`}>{message.email}</a> : <span>メールアドレス未入力（返信不可）</span>}</p>
      {message.reference_url && <p><a href={message.reference_url} target="_blank" rel="noopener noreferrer">確認用URLを開く</a></p>}
      <MessageDetails message={message}/>
      <p className="contact-message-body">{message.message}</p><div className="contact-tabs"><button disabled={busy} onClick={() => update(message)}>{status === "new" ? "対応済みにする" : "未対応に戻す"}</button><button className="contact-danger" disabled={busy} onClick={() => { setTarget(message); dialog.current?.showModal(); }}>削除</button></div>
    </article>)}
    <dialog ref={dialog} className="contact-dialog" aria-labelledby="contact-delete-title" onCancel={event => { if (busy) event.preventDefault(); }}><h2 id="contact-delete-title">お問い合わせを削除しますか？</h2><p>削除すると元に戻せません。</p>{error && <p role="alert">{error}</p>}<div className="contact-tabs"><button disabled={busy} onClick={() => dialog.current?.close()}>キャンセル</button><button disabled={busy} className="contact-danger" onClick={() => target && update(target, true)}>{busy ? "削除しています…" : "削除する"}</button></div></dialog>
  </main>;
}

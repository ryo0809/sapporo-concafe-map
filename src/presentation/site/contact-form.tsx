"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { contactCategories, contactFields, contactDetailFields, contactUrlFields, isStoreContact, type ContactCategory } from "@/domain/contact";

export function ContactForm() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [category, setCategory] = useState<ContactCategory>("correction");
  const [replyAvailable, setReplyAvailable] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), submissionId = useRef("");
  const pending = useRef(false);
  function detailField(field: (typeof contactDetailFields)[ContactCategory][number]) {
    return <label key={field.key}>{field.label}（{field.required ? "必須" : "任意"}）{field.multiline ? <textarea name={field.key} required={field.required} maxLength={field.max} rows={3} placeholder={field.placeholder}/> : <input name={field.key} type={field.type ?? "text"} required={field.required} maxLength={field.max} placeholder={field.placeholder}/>}</label>;
  }
  const messageRequired = category === "other" || category === "correction";
  const supplementary = <div><label>{contactFields[category].label}（{messageRequired ? "必須" : "任意"}・5,000文字以内）<textarea name="message" required={messageRequired} maxLength={5000} rows={category === "correction" ? 6 : 4} aria-describedby="contact-message-hint" placeholder={contactFields[category].hint}/></label><p id="contact-message-hint">{contactFields[category].hint}</p></div>;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const form = event.currentTarget, fields = new FormData(form);
    pending.current = true; setBusy(true); setError("");
    submissionId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(fields), id: submissionId.current, consent: fields.get("consent") === "on" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "送信できませんでした。");
      setReplyAvailable(Boolean(String(fields.get("email") ?? "").trim()));
      form.reset(); setCategory("correction"); submissionId.current = "";
      dialog.current?.showModal();
    } catch (error) { setError(error instanceof Error ? error.message : "通信に失敗しました。時間をおいて再度お試しください。"); }
    finally { pending.current = false; setBusy(false); }
  }
  return <><form className="contact-form" onSubmit={submit} aria-busy={busy} onInvalidCapture={event => { const details = (event.target as HTMLElement).closest("details"); if (details) details.open = true; }} onChange={() => { if (!pending.current) submissionId.current = ""; }}>
    <fieldset disabled={busy}>
      <label>お問い合わせの種類<select name="category" value={category} onChange={e => { setCategory(e.target.value as ContactCategory); setError(""); }}>{Object.entries(contactCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {category !== "deletion" && <label>お名前（必須）<input name="name" autoComplete="name" required maxLength={100}/></label>}
      <div><label>メールアドレス（任意）<input name="email" type="email" autoComplete="email" maxLength={254} aria-describedby="contact-email-hint"/></label><p id="contact-email-hint">返信をご希望の場合に入力してください。未入力の場合は個別に返信できません。</p></div>
      {isStoreContact(category) && <>
        <label>{category === "addition" ? "掲載を希望する店舗名" : "対象の店舗名"}（必須）<input name="storeName" required maxLength={200}/></label>
      </>}
      {category !== "deletion" && category !== "correction" && <section className="contact-field-section" key={category} aria-label="お問い合わせの詳細">
        {contactDetailFields[category].filter(field => field.required).map(detailField)}
      </section>}
      {category === "addition" && <section className="contact-field-section" aria-label="公式サイト・SNS">
        {contactUrlFields.slice(0, 2).map(detailField)}
        <details className="contact-optional"><summary>ほかのSNSを追加</summary><div className="contact-field-section">{contactUrlFields.slice(2).map(detailField)}</div></details>
      </section>}
      {category !== "deletion" && (messageRequired ? supplementary : <details className="contact-optional" key={`optional-${category}`}><summary>詳しい情報を追加（任意）</summary><div className="contact-field-section">{contactDetailFields[category].filter(field => !field.required).map(detailField)}{supplementary}</div></details>)}
      <div className="contact-honeypot" aria-hidden="true"><label>ウェブサイト<input name="website" tabIndex={-1} autoComplete="off" maxLength={200}/></label></div>
      <label className="contact-consent"><input name="consent" type="checkbox" required/><span><Link href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</Link>を確認し、個人情報の取り扱いに同意します（必須）</span></label>
      {error && <p role="alert" className="contact-error">{error}</p>}
      <button type="submit">{busy && <span className="contact-spinner" aria-hidden="true"/>}{busy ? "送信しています…" : "送信する"}</button>
      <span role="status" className="contact-status">{busy ? "お問い合わせを送信しています。" : ""}</span>
    </fieldset>
  </form><dialog ref={dialog} className="contact-dialog" aria-labelledby="contact-complete-title"><h2 id="contact-complete-title">お問い合わせを受け付けました</h2><p>{replyAvailable ? "内容を確認のうえ、必要に応じてご入力のメールアドレスへご連絡します。" : "内容を確認し、今後の運営に活用します。メールアドレスが未入力のため、個別の返信は行いません。"}</p><button type="button" autoFocus onClick={() => dialog.current?.close()}>閉じる</button></dialog></>;
}

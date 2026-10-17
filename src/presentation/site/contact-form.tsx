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
  const nameField = <label>{category === "deletion" ? "事業責任者の氏名" : "お名前"}（必須）<input name="name" autoComplete="name" required maxLength={100}/></label>;
  const emailField = <div><label>メールアドレス（{category === "deletion" ? "必須" : "任意"}）<input name="email" type="email" autoComplete="email" required={category === "deletion"} maxLength={254} aria-describedby="contact-email-hint"/></label><p id="contact-email-hint">{category === "deletion" ? "削除依頼の確認・ご連絡のために使用します。" : "返信をご希望の場合に入力してください。未入力の場合は個別に返信できません。"}</p></div>;
  const storeField = <label>{category === "addition" ? "掲載を希望する店舗名" : "対象の店舗名"}（必須）<input name="storeName" required maxLength={200}/></label>;
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
      {category === "addition" ? <>
        <section className="contact-field-section contact-required" aria-labelledby="contact-required-title">
          <h2 id="contact-required-title">必須項目</h2>
          {nameField}{storeField}
          {contactDetailFields.addition.filter(field => field.required).map(detailField)}
        </section>
        <details className="contact-optional" key="addition-optional"><summary>任意項目（必要な場合のみ）</summary><div className="contact-field-section">
          {emailField}
          {contactDetailFields.addition.filter(field => !field.required).map(detailField)}
          <h2>公式サイト・SNS</h2>
          {contactUrlFields.map(detailField)}
          {supplementary}
        </div></details>
      </> : <>
      {nameField}
      {emailField}
      {isStoreContact(category) && storeField}
      {category === "deletion" && contactDetailFields.deletion.filter(field => field.key === "phone").map(detailField)}
      {category !== "deletion" && category !== "correction" && <section className="contact-field-section" key={category} aria-label="お問い合わせの詳細">
        {contactDetailFields[category].filter(field => field.required).map(detailField)}
      </section>}
      {category !== "deletion" && (messageRequired ? supplementary : <details className="contact-optional" key={`optional-${category}`}><summary>詳しい情報を追加（任意）</summary><div className="contact-field-section">{contactDetailFields[category].filter(field => !field.required).map(detailField)}{supplementary}</div></details>)}
      </>}
      <div className="contact-honeypot" aria-hidden="true"><label>ウェブサイト<input name="website" tabIndex={-1} autoComplete="off" maxLength={200}/></label></div>
      <label className="contact-consent"><input name="consent" type="checkbox" required/><span><Link href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</Link>を確認し、個人情報の取り扱いに同意します（必須）</span></label>
      {error && <p role="alert" className="contact-error">{error}</p>}
      <button type="submit">{busy && <span className="contact-spinner" aria-hidden="true"/>}{busy ? "送信しています…" : "送信する"}</button>
      <span role="status" className="contact-status">{busy ? "お問い合わせを送信しています。" : ""}</span>
    </fieldset>
  </form><dialog ref={dialog} className="contact-dialog" aria-labelledby="contact-complete-title"><h2 id="contact-complete-title">お問い合わせを受け付けました</h2><p>{replyAvailable ? "内容を確認のうえ、必要に応じてご入力のメールアドレスへご連絡します。" : "内容を確認し、今後の運営に活用します。メールアドレスが未入力のため、個別の返信は行いません。"}</p><button type="button" autoFocus onClick={() => dialog.current?.close()}>閉じる</button></dialog></>;
}

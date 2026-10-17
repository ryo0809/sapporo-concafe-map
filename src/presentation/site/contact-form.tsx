"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { contactCategories } from "@/domain/contact";

export function ContactForm() {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [category, setCategory] = useState("correction");
  const dialog = useRef<HTMLDialogElement>(null), submissionId = useRef("");
  const pending = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const form = event.currentTarget, fields = new FormData(form);
    pending.current = true; setBusy(true); setError("");
    submissionId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(fields), id: submissionId.current, consent: fields.get("consent") === "on" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "送信できませんでした。");
      form.reset(); setCategory("correction"); submissionId.current = "";
      dialog.current?.showModal();
    } catch (error) { setError(error instanceof Error ? error.message : "通信に失敗しました。時間をおいて再度お試しください。"); }
    finally { pending.current = false; setBusy(false); }
  }
  return <><form className="contact-form" onSubmit={submit} aria-busy={busy} onChange={() => { if (!pending.current) submissionId.current = ""; }}>
    <fieldset disabled={busy}>
      <label>お問い合わせの種類<select name="category" value={category} onChange={e => setCategory(e.target.value)}>{Object.entries(contactCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>お名前（必須）<input name="name" autoComplete="name" required maxLength={100}/></label>
      <label>メールアドレス（必須）<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label>店舗名{category !== "other" ? "（必須）" : "（任意）"}<input name="storeName" required={category !== "other"} maxLength={200}/></label>
      <label>公式サイト・SNSなどの確認用URL（任意）<input name="referenceUrl" type="url" maxLength={2048} placeholder="https://"/></label>
      <label>お問い合わせ内容（必須・5,000文字以内）<textarea name="message" required maxLength={5000} rows={8}/></label>
      <div className="contact-honeypot" aria-hidden="true"><label>ウェブサイト<input name="website" tabIndex={-1} autoComplete="off" maxLength={200}/></label></div>
      <label className="contact-consent"><input name="consent" type="checkbox" required/><span><Link href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</Link>を確認し、個人情報の取り扱いに同意します（必須）</span></label>
      {error && <p role="alert" className="contact-error">{error}</p>}
      <button type="submit">{busy && <span className="contact-spinner" aria-hidden="true"/>}{busy ? "送信しています…" : "送信する"}</button>
      <span role="status" className="contact-status">{busy ? "お問い合わせを送信しています。" : ""}</span>
    </fieldset>
  </form><dialog ref={dialog} className="contact-dialog" aria-labelledby="contact-complete-title"><h2 id="contact-complete-title">お問い合わせを受け付けました</h2><p>内容を確認のうえ、必要に応じてご入力のメールアドレスへご連絡します。</p><button type="button" autoFocus onClick={() => dialog.current?.close()}>閉じる</button></dialog></>;
}

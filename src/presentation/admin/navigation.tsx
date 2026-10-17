"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminTab = "stores" | "contacts";
export function AdminNavigation({ current, onChange }: { current: AdminTab; onChange: (tab: AdminTab) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function signOut() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("ログアウトに失敗しました。もう一度お試しください。");
      router.replace("/admin/login"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "ログアウトに失敗しました。"); setBusy(false); }
  }
  return <>
    <header className="admin-header"><div><p className="admin-eyebrow">さっぽろ コンカフェマップ</p><h1>{current === "stores" ? "掲載情報の管理" : "お問い合わせ"}</h1></div><nav aria-label="管理者メニュー"><Link href="/" target="_blank" rel="noopener">公開マップ ↗</Link><button disabled={busy} onClick={signOut}>{busy ? "ログアウト中…" : "ログアウト"}</button></nav></header>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <div className="admin-settings-tabs" role="tablist" aria-label="設定画面">
      {(["stores", "contacts"] as const).map(tab => <button key={tab} id={`admin-tab-${tab}`} type="button" role="tab" aria-selected={current === tab} aria-controls={`admin-panel-${tab}`} tabIndex={current === tab ? 0 : -1} onClick={() => onChange(tab)} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? "stores" : event.key === "End" ? "contacts" : tab === "stores" ? "contacts" : "stores";
        onChange(next); document.getElementById(`admin-tab-${next}`)?.focus();
      }}>{tab === "stores" ? "店舗設定" : "お問い合わせ"}</button>)}
    </div>
  </>;
}

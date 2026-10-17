"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {readAdminResponse} from "./api-response";

export type AdminTab = "stores" | "buildings" | "contacts";
const tabs:AdminTab[]=["stores","buildings","contacts"];
const labels={stores:"店舗設定",buildings:"ビル管理",contacts:"お問い合わせ"};
export function AdminNavigation({ current, onChange }: { current: AdminTab; onChange: (tab: AdminTab) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function signOut() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      await readAdminResponse(response);
      router.replace("/admin/login"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "ログアウトに失敗しました。"); setBusy(false); }
  }
  return <>
    <header className="admin-header"><div><p className="admin-eyebrow">さっぽろ コンカフェマップ</p><h1>{current === "stores" ? "掲載情報の管理" : labels[current]}</h1></div><nav aria-label="管理者メニュー"><Link href="/" target="_blank" rel="noopener">公開マップ ↗</Link><button disabled={busy} onClick={signOut}>{busy ? "ログアウト中…" : "ログアウト"}</button></nav></header>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <div className="admin-settings-tabs" role="tablist" aria-label="設定画面">
      {tabs.map((tab,index) => <button key={tab} id={`admin-tab-${tab}`} type="button" role="tab" aria-selected={current === tab} aria-controls={`admin-panel-${tab}`} tabIndex={current === tab ? 0 : -1} onClick={() => onChange(tab)} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length-1] : tabs[(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length];
        onChange(next); document.getElementById(`admin-tab-${next}`)?.focus();
      }}>{labels[tab]}</button>)}
    </div>
  </>;
}

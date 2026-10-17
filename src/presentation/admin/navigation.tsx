"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminNavigation({ username, current }: { username: string; current: "stores" | "contacts" }) {
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
    <header className="admin-header"><div><p className="admin-eyebrow">さっぽろ コンカフェマップ</p><h1>{current === "stores" ? "掲載情報の管理" : "お問い合わせ"}</h1></div><nav aria-label="管理者メニュー"><Link href="/" target="_blank" rel="noopener">公開マップ ↗</Link><span>{username}</span><button disabled={busy} onClick={signOut}>{busy ? "ログアウト中…" : "ログアウト"}</button></nav></header>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <nav className="admin-settings-tabs" aria-label="設定画面">
      <Link href="/admin" aria-current={current === "stores" ? "page" : undefined}>店舗設定</Link>
      <Link href="/admin/contacts" aria-current={current === "contacts" ? "page" : undefined}>お問い合わせ</Link>
    </nav>
  </>;
}

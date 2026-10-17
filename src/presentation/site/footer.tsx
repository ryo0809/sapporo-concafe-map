import Link from "next/link";
import { site } from "@/config/site";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <div className="site-footer-main">
        <Link href="/" className="site-footer-brand">
          <span className="site-footer-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M9 25a15 15 0 0 1 30 0c-3 3-6 3-9 1-4 3-8 3-12 0-3 2-6 2-9-1Z" fill="#dce5df" stroke="currentColor" strokeWidth="1.8"/><path d="M16 30c-4 5 4 7 0 12m8-12c4 4-4 7 0 12m8-12c-4 5 4 7 0 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></span>
          <span><strong>{site.name}</strong><small>狸小路・すすきの</small></span>
        </Link>
        <nav className="site-footer-links" aria-label="フッター"><Link href="/listing-information">掲載情報について</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/contact">お問い合わせ</Link></nav>
      </div>
    </div>
  </footer>;
}

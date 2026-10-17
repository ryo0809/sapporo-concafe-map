import Link from "next/link";
import { site } from "@/config/site";

export function SiteFooter() {
  return <footer className="site-footer"><div><strong>{site.name}</strong><p><small>© {new Date().getFullYear()} Ryo Fujiwara</small></p></div><nav aria-label="フッター"><Link href="/contact">お問い合わせ・掲載情報の修正</Link><Link href="/privacy">プライバシーポリシー</Link></nav></footer>;
}

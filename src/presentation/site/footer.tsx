import Link from "next/link";
import { site } from "@/config/site";

export function SiteFooter() {
  return <footer className="site-footer"><div><strong>{site.name}</strong><p>掲載情報の修正・削除・追加依頼は、<Link href="/contact">お問い合わせ</Link>からお願いします。</p></div><nav aria-label="フッター"><Link href="/privacy">プライバシーポリシー</Link></nav></footer>;
}

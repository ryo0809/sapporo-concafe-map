import Link from "next/link";
import { site } from "@/config/site";

export function SiteFooter() {
  return <footer className="site-footer"><div><strong>{site.name}</strong><p>お出かけ前に、店舗の最新情報をご確認ください。</p><small>© {new Date().getFullYear()} Ryo Fujiwara（メンヘラくらげ）</small></div><nav aria-label="フッター"><Link href="/contact">お問い合わせ・掲載情報の修正</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/admin">管理画面</Link></nav></footer>;
}

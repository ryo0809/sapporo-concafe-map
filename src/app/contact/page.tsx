import Link from "next/link";
import { site } from "@/config/site";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"お問い合わせ・掲載情報の修正",alternates:{canonical:"/contact"}};
export default function Contact(){
  return <><main className="information-page"><Link href="/">← マップに戻る</Link><h1>お問い合わせ・掲載情報の修正</h1><p>店舗情報の誤り、閉店・移転、掲載内容の修正・削除については、店舗名と確認できるURL、修正内容をお知らせください。</p>{site.contactEmail?<p><a href={`mailto:${site.contactEmail}?subject=${encodeURIComponent(`${site.name}へのお問い合わせ`)}`}>{site.contactEmail}</a></p>:<p role="status">お問い合わせ窓口は公開準備中です。</p>}<p>お送りいただく内容にパスワードなどの機密情報を含めないでください。店舗への予約やお問い合わせは各店舗へ直接ご連絡ください。</p></main><SiteFooter/></>;
}

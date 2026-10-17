import Link from "next/link";
import {SiteFooter} from "@/presentation/site/footer";

export const metadata={title:"掲載情報について",alternates:{canonical:"/listing-information"}};
export default function ListingInformation(){
  return <><main className="information-page"><Link href="/">← マップに戻る</Link><h1>掲載情報について</h1><p>掲載情報の修正・削除・追加依頼は、<Link href="/contact">お問い合わせ</Link>からお願いします。</p><p>店舗名と、公式サイトやSNSなどの確認できるURL、ご依頼の内容をお知らせください。</p></main><SiteFooter/></>;
}

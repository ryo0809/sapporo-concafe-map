import Link from "next/link";
import { ContactForm } from "@/presentation/site/contact-form";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"お問い合わせ",alternates:{canonical:"/contact"}};
export default function Contact(){
  return <><main className="information-page"><Link href="/">← マップに戻る</Link><h1>お問い合わせ</h1><p>掲載情報の修正・削除・追加依頼は、こちらの窓口からお願いします。店舗名と確認できるURL、ご依頼の内容をお知らせください。</p><p>お送りいただく内容にパスワードなどの機密情報を含めないでください。店舗への予約やお問い合わせは各店舗へ直接ご連絡ください。</p><ContactForm/></main><SiteFooter/></>;
}

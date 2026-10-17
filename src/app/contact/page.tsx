import Link from "next/link";
import { ContactForm } from "@/presentation/site/contact-form";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"お問い合わせ",alternates:{canonical:"/contact"}};
export default function Contact(){
  return <><main className="information-page"><Link href="/">← マップに戻る</Link><h1>お問い合わせ</h1><p>掲載情報の修正・削除・掲載店舗の追加、サイトへの要望は、こちらからお送りください。種類を選ぶと、内容に合わせた入力欄が表示されます。</p><p>お送りいただく内容にパスワードなどの機密情報を含めないでください。店舗への予約やお問い合わせは各店舗へ直接ご連絡ください。</p><p>誹謗中傷、脅迫、繰り返しの迷惑な送信などの迷惑行為が確認された場合は、法的措置を含め、厳正に対処します。</p><ContactForm/></main><SiteFooter/></>;
}

import Link from "next/link";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"プライバシーポリシー",alternates:{canonical:"/privacy"}};
export default function Privacy(){
  return <><main className="information-page"><Link href="/">← マップに戻る</Link><h1>プライバシーポリシー</h1><h2>取り扱う情報と利用目的</h2><p>当サイトは、店舗情報の提供、掲載内容の管理、障害対応、不正利用の防止のために必要な情報を取り扱います。お問い合わせで受け取ったメールアドレスと内容は、返信や掲載情報の確認に利用します。</p><h2>Cookie</h2><p>公開マップの閲覧では、広告・アクセス解析のためのCookieは使用していません。</p><h2>外部サービス</h2><p>サイトの配信とデータ保存にCloudflareを利用します。地図を表示すると、OpenStreetMapの地図タイル配信先へIPアドレス等の通信情報が送信されます。外部サイトへのリンク先では、各サービスの方針が適用されます。</p><h2>保管と削除</h2><p>お問い合わせ内容や運用上の記録は、対応や安全な運用に必要な範囲で保管し、不要になった情報は削除します。掲載情報の修正・削除や個人情報に関するご相談は<Link href="/contact">お問い合わせ窓口</Link>へご連絡ください。</p><h2>店舗情報について</h2><p>掲載情報は確認・更新に努めますが、最新の営業状況を保証するものではありません。来店前に店舗の公式サイト等をご確認ください。</p></main><SiteFooter/></>;
}

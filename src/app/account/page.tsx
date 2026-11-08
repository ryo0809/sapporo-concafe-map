import Link from "next/link";
import { currentMember } from "@/infrastructure/members/session";
import { MemberLoginForm } from "@/presentation/members/login-form";
import { MemberLogoutButton } from "@/presentation/members/logout-button";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"マイページ",robots:{index:false,follow:false}};
export default async function AccountPage(){
  const member=await currentMember();
  return <><main className="information-page"><Link href="/">← マップに戻る</Link><h1>マイページ</h1>{member?<><p>{member.email} でログイン中です。</p><p>店舗詳細から、自分だけの評価とメモを保存できます。</p><MemberLogoutButton/></>:<><p>メールでログインすると、店舗ごとの評価を非公開で記録できます。</p><MemberLoginForm/></>}</main><SiteFooter/></>;
}

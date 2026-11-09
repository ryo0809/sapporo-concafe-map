import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember } from "@/infrastructure/members/session";
import { MemberLogoutButton } from "@/presentation/members/logout-button";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"マイページ",robots:{index:false,follow:false}};
export default async function AccountPage(){
  const member=await currentMember();
  if(!member)redirect("/account/login");
  return <><main className="information-page member-page"><Link href="/">← マップに戻る</Link><h1>マイページ</h1><p>ニックネーム：{member.nickname||"未設定"}</p><p>メールアドレス：{member.email}</p><p>店舗詳細から、自分だけの評価とメモを保存できます。</p>{!member.nickname&&<p>以前のメールリンクで登録した方は、<Link href="/account/register">同じメールアドレスで会員登録</Link>すると、評価を引き継いでパスワードを設定できます。</p>}<MemberLogoutButton/></main><SiteFooter/></>;
}

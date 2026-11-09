import Link from "next/link";
import { currentMember } from "@/infrastructure/members/session";

export async function AccountHeaderLink(){
  const member=await currentMember();
  return member?<Link href="/account" className="header-login-button">マイページ</Link>:<Link href="/account/login" className="header-login-button">ログイン</Link>;
}

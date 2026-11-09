import Link from "next/link";
import { currentMember } from "@/infrastructure/members/session";
import { MemberLogoutButton } from "./logout-button";

export async function AccountHeaderLink(){
  const member=await currentMember();
  return member?<MemberLogoutButton/>:<Link href="/account/login" className="header-login-button">ログイン</Link>;
}

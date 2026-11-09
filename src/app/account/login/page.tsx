import Link from "next/link";
import { AuthTabs } from "@/presentation/members/auth-tabs";
import { AuthHelp } from "@/presentation/members/auth-help";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"ログイン・新規会員登録",robots:{index:false,follow:false}};
export default async function LoginPage({searchParams}:{searchParams:Promise<{tab?:string}>}){const {tab}=await searchParams;return <><main className="information-page member-page"><div className="member-auth-content"><Link href="/">← マップに戻る</Link><div className="member-auth-heading"><h1>会員登録・ログイン</h1><AuthHelp/></div><AuthTabs initialTab={tab==="register"?"register":"login"}/></div></main><SiteFooter/></>;}

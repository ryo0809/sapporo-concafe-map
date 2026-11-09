import Link from "next/link";
import { AuthTabs } from "@/presentation/members/auth-tabs";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"ログイン・新規会員登録",robots:{index:false,follow:false}};
export default async function LoginPage({searchParams}:{searchParams:Promise<{tab?:string}>}){const {tab}=await searchParams;return <><main className="information-page member-page"><Link href="/">← マップに戻る</Link><h1>会員登録・ログイン</h1><AuthTabs initialTab={tab==="register"?"register":"login"}/></main><SiteFooter/></>;}

import Link from "next/link";
import { MemberResetForm } from "@/presentation/members/reset-form";
import { SiteFooter } from "@/presentation/site/footer";
export const metadata={title:"パスワード再設定",robots:{index:false,follow:false}};
export default function ResetPage(){return <><main className="information-page member-page"><Link href="/">← マップに戻る</Link><h1>パスワード再設定</h1><MemberResetForm/></main><SiteFooter/></>;}

import Link from "next/link";
import { VerifyButton } from "@/presentation/members/verify-button";
export const metadata={title:"ログイン確認",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function VerifyPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  return <main className="information-page"><Link href="/">← マップに戻る</Link><h1>ログイン確認</h1><p>ボタンを押すとログインが完了します。</p><VerifyButton token={token}/></main>;
}

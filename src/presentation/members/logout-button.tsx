"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function MemberLogoutButton(){
  const router=useRouter(),[pending,setPending]=useState(false),[error,setError]=useState("");
  async function logout(){setPending(true);try{const response=await fetch("/api/account/logout",{method:"POST"});if(!response.ok)throw new Error("ログアウトに失敗しました。");router.refresh();}catch(error){setError(error instanceof Error?error.message:"ログアウトに失敗しました。");setPending(false);}}
  return <><button type="button" disabled={pending} onClick={logout}>{pending?"処理中…":"ログアウト"}</button>{error&&<p role="alert">{error}</p>}</>;
}

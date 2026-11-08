"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function VerifyButton({token}:{token:string}){
  const router=useRouter(),[pending,setPending]=useState(false),[error,setError]=useState("");
  async function verify(){setPending(true);setError("");try{const response=await fetch("/api/account/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});const data=await response.json();if(!response.ok)throw new Error(data.error||"ログインに失敗しました。");router.replace("/");router.refresh();}catch(error){setError(error instanceof Error?error.message:"ログインに失敗しました。");setPending(false);}}
  return <><button type="button" disabled={pending} onClick={verify}>{pending?"ログイン中…":"ログインする"}</button>{error&&<p role="alert" className="contact-error">{error}</p>}</>;
}

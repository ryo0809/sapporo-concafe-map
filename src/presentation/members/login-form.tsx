"use client";
import { useState } from "react";
export function MemberLoginForm(){
  const [email,setEmail]=useState(""),[pending,setPending]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  async function submit(event:React.FormEvent){
    event.preventDefault();setPending(true);setError("");
    try{const response=await fetch("/api/account/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});const data=await response.json();if(!response.ok)throw new Error(data.error||"送信に失敗しました。");setMessage("ログイン用リンクをメールで送信しました。15分以内に開いてください。");}
    catch(error){setError(error instanceof Error?error.message:"送信に失敗しました。");}
    finally{setPending(false);}
  }
  return <form className="member-form" onSubmit={submit}><label>メールアドレス<input type="email" required autoComplete="email" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label><button disabled={pending}>{pending?"送信中…":"ログインリンクを送る"}</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="contact-error">{error}</p>}</form>;
}

"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {postAccount} from "./post-account";

export function MemberLoginForm(){
  const router=useRouter();
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
  async function submit(event:React.FormEvent){
    event.preventDefault();setPending(true);setError("");
    try{await postAccount("/api/account/login",{email,password});router.replace("/");router.refresh();}
    catch(error){setError(error instanceof Error?error.message:"ログインに失敗しました。");setPending(false);}
  }
  return <><form className="member-form" onSubmit={submit}>
    <label>メールアドレス<input type="email" required autoComplete="email" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label>
    <label>パスワード<input type="password" required maxLength={128} autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>
    {error&&<p role="alert" className="contact-error">{error}</p>}
    <button disabled={pending}>{pending?"ログイン中…":"ログイン"}</button>
  </form><div className="member-links"><Link href="/account/reset">パスワードを忘れた方</Link></div></>;
}

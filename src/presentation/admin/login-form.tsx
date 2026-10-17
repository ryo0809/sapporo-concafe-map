"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function LoginForm(){
  const router=useRouter();
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);
    try{const response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:form.get("username"),password:form.get("password")})});const result=await response.json();if(!response.ok)throw new Error(result.error);router.replace("/admin");router.refresh();}
    catch(error){setError(error instanceof Error?error.message:"ログインに失敗しました");setBusy(false);}
  }
  return <main className="admin-login"><form onSubmit={submit} className="admin-login-card"><p className="admin-eyebrow">さっぽろ コンカフェマップ</p><h1>管理者ログイン</h1><p>掲載店舗の情報を管理します。</p>
    <label>ユーザー名<input name="username" autoComplete="username" required maxLength={100}/></label>
    <label>パスワード<input name="password" type="password" autoComplete="current-password" required maxLength={200}/></label>
    {error&&<p role="alert" className="admin-error">{error}</p>}<button type="submit" disabled={busy}>{busy?"ログイン中…":"ログイン"}</button><Link href="/">公開マップに戻る</Link>
  </form></main>;
}

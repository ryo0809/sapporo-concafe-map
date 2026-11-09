"use client";
import Link from "next/link";
import {useState} from "react";
import {postAccount} from "./post-account";

export function MemberResetForm(){
  const [stage,setStage]=useState<"email"|"code"|"done">("email"),[email,setEmail]=useState(""),[code,setCode]=useState(""),[password,setPassword]=useState(""),[passwordConfirmation,setPasswordConfirmation]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
  async function request(event:React.FormEvent){event.preventDefault();setPending(true);setError("");try{await postAccount("/api/account/reset/request",{email});setStage("code");}catch(error){setError(error instanceof Error?error.message:"送信に失敗しました。");}finally{setPending(false);}}
  async function confirm(event:React.FormEvent){event.preventDefault();setError("");if(password!==passwordConfirmation){setError("パスワードが一致しません。");return;}setPending(true);try{await postAccount("/api/account/reset/confirm",{email,code,password,passwordConfirmation});setPassword("");setPasswordConfirmation("");setStage("done");}catch(error){setError(error instanceof Error?error.message:"再設定に失敗しました。");}finally{setPending(false);}}
  return <>{stage==="email"?<form className="member-form" onSubmit={request}><p>登録したメールアドレスに確認コードを送ります。</p><label>メールアドレス<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>{error&&<p role="alert" className="contact-error">{error}</p>}<button disabled={pending}>{pending?"送信中…":"確認コードを送る"}</button></form>:stage==="code"?<form className="member-form" onSubmit={confirm}>
    <p role="status">アカウントが存在する場合、{email} に6桁のコードを送信しました。有効期限は10分です。</p>
    <label>確認コード<input required inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" value={code} onChange={event=>setCode(event.target.value)}/></label>
    <label>新しいパスワード<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>
    <p className="member-hint">12～128文字で設定してください。</p>
    <label>新しいパスワード（確認）<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={passwordConfirmation} onChange={event=>setPasswordConfirmation(event.target.value)}/></label>
    {error&&<p role="alert" className="contact-error">{error}</p>}<button disabled={pending}>{pending?"変更中…":"パスワードを変更"}</button>
    <button type="button" className="member-secondary" onClick={()=>{setStage("email");setError("");}}>メールアドレスを変更</button>
  </form>:<p role="status">パスワードを変更しました。<Link href="/account/login">ログイン画面へ</Link></p>}{stage!=="done"&&<div className="member-links"><Link href="/account/login">ログイン画面へ</Link></div>}</>;
}

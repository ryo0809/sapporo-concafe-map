"use client";
import {useState} from "react";
import {postAccount} from "./post-account";
import {announceSessionChange} from "@/presentation/session-change";

export function MemberRegisterForm(){
  const [stage,setStage]=useState<"details"|"code">("details"),[nickname,setNickname]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[passwordConfirmation,setPasswordConfirmation]=useState(""),[code,setCode]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
  async function request(event:React.FormEvent){
    event.preventDefault();setError("");
    if(password!==passwordConfirmation){setError("パスワードが一致しません。");return;}
    setPending(true);
    try{await postAccount("/api/account/register",{nickname,email,password,passwordConfirmation});setPassword("");setPasswordConfirmation("");setStage("code");}
    catch(error){setError(error instanceof Error?error.message:"登録を開始できませんでした。");}
    finally{setPending(false);}
  }
  async function confirm(event:React.FormEvent){
    event.preventDefault();setPending(true);setError("");
    try{await postAccount("/api/account/register/confirm",{email,code});announceSessionChange();window.location.replace("/");}
    catch(error){setError(error instanceof Error?error.message:"確認に失敗しました。");setPending(false);}
  }
  return <>{stage==="details"?<form className="member-form" onSubmit={request}>
    <label>ニックネーム<input required minLength={2} maxLength={30} autoComplete="off" value={nickname} onChange={event=>setNickname(event.target.value)}/></label>
    <label>メールアドレス<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>
    <label>パスワード<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" aria-describedby="member-password-hint" value={password} onChange={event=>setPassword(event.target.value)}/></label>
    <p id="member-password-hint" className="member-hint">12～128文字で設定してください。</p>
    <label>パスワード（確認）<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={passwordConfirmation} onChange={event=>setPasswordConfirmation(event.target.value)}/></label>
    {error&&<p role="alert" className="contact-error">{error}</p>}<button disabled={pending}>{pending?"送信中…":"確認コードを送る"}</button>
  </form>:<form className="member-form" onSubmit={confirm}>
    <p role="status">{email} に6桁の確認コードを送信しました。有効期限は10分です。登録済みの場合はログインまたはパスワード再設定をお試しください。</p>
    <label>確認コード<input required inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" value={code} onChange={event=>setCode(event.target.value)}/></label>
    {error&&<p role="alert" className="contact-error">{error}</p>}<button disabled={pending}>{pending?"確認中…":"登録を完了する"}</button>
    <button type="button" className="member-secondary" onClick={()=>{setStage("details");setError("");}}>入力に戻る</button>
  </form>}</>;
}

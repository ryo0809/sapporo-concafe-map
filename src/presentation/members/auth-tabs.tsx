"use client";
import {useState} from "react";
import {MemberLoginForm} from "./login-form";
import {MemberRegisterForm} from "./register-form";

type Tab="login"|"register";
export function AuthTabs({initialTab="login"}:{initialTab?:Tab}){
  const [tab,setTab]=useState<Tab>(initialTab);
  const tabs:Tab[]=["login","register"];
  const labels={login:"ログイン",register:"新規会員登録"};
  function select(next:Tab){setTab(next);document.getElementById(`member-tab-${next}`)?.focus();}
  return <div className="auth-tabs">
    <div role="tablist" aria-label="会員登録とログイン" className="auth-tab-list">
      {tabs.map((item,index)=><button key={item} id={`member-tab-${item}`} type="button" role="tab" aria-selected={tab===item} aria-controls={`member-panel-${item}`} tabIndex={tab===item?0:-1} onClick={()=>select(item)} onKeyDown={event=>{
        if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
        event.preventDefault();
        const next=event.key==="Home"?tabs[0]:event.key==="End"?tabs[tabs.length-1]:tabs[(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length];
        select(next);
      }}>{labels[item]}</button>)}
    </div>
    <div id="member-panel-login" role="tabpanel" aria-labelledby="member-tab-login" hidden={tab!=="login"}><MemberLoginForm/></div>
    <div id="member-panel-register" role="tabpanel" aria-labelledby="member-tab-register" hidden={tab!=="register"}><MemberRegisterForm/></div>
  </div>;
}

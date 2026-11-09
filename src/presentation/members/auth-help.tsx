"use client";

import {useEffect,useState} from "react";

export function AuthHelp(){
  const [pressed,setPressed]=useState(false);
  const [hovered,setHovered]=useState(false);
  useEffect(()=>{
    if(!pressed)return;
    const timeout=setTimeout(()=>setPressed(false),4000);
    return ()=>clearTimeout(timeout);
  },[pressed]);
  const visible=hovered||pressed;
  return <>
    <button type="button" className="member-auth-help-button" aria-label="ログインするとできること" aria-expanded={visible} aria-controls="member-auth-help-text" aria-describedby="member-auth-help-text" onPointerEnter={event=>{if(event.pointerType==="mouse")setHovered(true);}} onPointerLeave={event=>{if(event.pointerType==="mouse"){setHovered(false);setPressed(false);}}} onKeyDown={event=>{if(event.key==="Escape"){setPressed(false);setHovered(false);}}} onClick={()=>setPressed(true)} onBlur={()=>setPressed(false)}>?</button>
    <div id="member-auth-help-text" className="member-auth-help-text" data-visible={visible} role="tooltip"><strong>ログインでできること</strong><span>店舗の評価とメモを保存できます。</span><small>現在は自分だけに表示されます。星評価は今後公開される可能性があります。メモは公開しません。</small></div>
  </>;
}

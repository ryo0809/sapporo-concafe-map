"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";

type Rating={cafe_id:string;rating:number;note:string;updated_at:string};
const stars=[1,2,3,4,5];

export function PrivateRating({cafeId}:{cafeId:string}){
  const [state,setState]=useState<"loading"|"guest"|"ready"|"error">("loading");
  const [rating,setRating]=useState(0);
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const dialog=useRef<HTMLDialogElement>(null);

  useEffect(()=>{
    let active=true;
    async function load(){
      try{
        const response=await fetch("/api/account/ratings",{cache:"no-store"});
        if(response.status===401){if(active)setState("guest");return;}
        if(!response.ok)throw new Error("自己評価を読み込めませんでした。");
        const data=await response.json() as {ratings:Rating[]};
        if(!active)return;
        const own=data.ratings.find(item=>item.cafe_id===cafeId);
        setRating(own?.rating??0);
        setNote(own?.note??"");
        setState("ready");
      }catch{if(active)setState("error");}
    }
    void load();
    return()=>{active=false;};
  },[cafeId]);

  async function save(){
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/account/ratings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({cafeId,rating,note})});
      const data=await response.json() as {error?:string;rating?:Rating};
      if(!response.ok)throw new Error(data.error||"保存に失敗しました。");
      setNote(data.rating?.note??note.trim());
      dialog.current?.showModal();
    }catch(cause){setError(cause instanceof Error?cause.message:"保存に失敗しました。");}
    finally{setBusy(false);}
  }

  return <section className="private-rating" aria-label="自己評価">
    <h4>自己評価</h4>
    {state==="guest"?<p><Link href="/account/login">ログインして自己評価を記録</Link></p>:state==="error"?<p role="alert">自己評価を読み込めませんでした。店舗詳細を開き直してください。</p>:state==="loading"?<p>自己評価を確認中…</p>:<>
      <fieldset className="rating-fieldset"><legend>星評価</legend><div className="rating-stars">
        {stars.map(value=><label key={value} className={value<=rating?"selected":""} title={`${value}つ星`}>
          <input type="radio" name={`cafe-rating-${cafeId}`} value={value} checked={rating===value} disabled={busy} onChange={()=>setRating(value)} aria-label={`${value}つ星`}/>
          <span aria-hidden="true">★</span>
        </label>)}
        <span className="rating-value" aria-live="polite">{rating?`${rating} / 5`:"未選択"}</span>
      </div></fieldset>
      <label className="rating-note">メモ<textarea maxLength={1000} rows={3} value={note} disabled={busy} onChange={event=>setNote(event.target.value)}/></label>
      {error&&<p role="alert" className="contact-error">{error}</p>}
      <button type="button" className="rating-save" disabled={busy||rating===0} onClick={save}>{busy?"保存中…":"保存"}</button>
    </>}
    <dialog ref={dialog} className="rating-dialog" aria-labelledby="rating-saved-title" aria-describedby="rating-saved-description">
      <span className="rating-dialog-check" aria-hidden="true">✓</span>
      <h2 id="rating-saved-title">自己評価を保存しました</h2>
      <p id="rating-saved-description">※自分以外には公開されません</p>
      <button type="button" autoFocus onClick={()=>dialog.current?.close()}>閉じる</button>
    </dialog>
  </section>;
}

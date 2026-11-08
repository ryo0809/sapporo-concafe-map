"use client";
import { useEffect,useState } from "react";
import type { EventBanner } from "@/domain/events/banner";
import { readAdminResponse } from "./api-response";
type Form={title:string;imageUrl:string;startsAt:string;endsAt:string;destination:EventBanner["destination"];externalUrl:string;detailText:string;published:boolean};
const empty:Form={title:"",imageUrl:"",startsAt:"",endsAt:"",destination:"none",externalUrl:"",detailText:"",published:false};
const localDate=(iso:string)=>{const date=new Date(iso);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export function BannerManager(){
  const [items,setItems]=useState<EventBanner[]>([]),[editing,setEditing]=useState<string|null>(null),[form,setForm]=useState<Form>(empty),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function load(){const data=await readAdminResponse(await fetch("/api/admin/banners",{cache:"no-store"}));setItems(data.banners);}
  useEffect(()=>{let active=true;fetch("/api/admin/banners",{cache:"no-store"}).then(readAdminResponse).then(data=>{if(active)setItems(data.banners);}).catch(error=>{if(active)setMessage(error.message);});return()=>{active=false;};},[]);
  function edit(item:EventBanner){setEditing(item.id);setForm({title:item.title,imageUrl:item.image_url,startsAt:localDate(item.starts_at),endsAt:localDate(item.ends_at),destination:item.destination,externalUrl:item.external_url,detailText:item.detail_text,published:Boolean(item.published)});setMessage("");}
  function reset(){setEditing(null);setForm(empty);setMessage("");}
  async function save(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage("");try{const response=await fetch(editing?`/api/admin/banners/${editing}`:"/api/admin/banners",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,startsAt:new Date(form.startsAt).toISOString(),endsAt:new Date(form.endsAt).toISOString()})});await readAdminResponse(response);await load();reset();setMessage("イベントを保存しました。");}catch(error){setMessage(error instanceof Error?error.message:"保存に失敗しました。");}finally{setBusy(false);}}
  async function remove(item:EventBanner){if(!window.confirm(`「${item.title}」を削除しますか？`))return;setBusy(true);try{await readAdminResponse(await fetch(`/api/admin/banners/${item.id}`,{method:"DELETE"}));await load();if(editing===item.id)reset();setMessage("イベントを削除しました。");}catch(error){setMessage(error instanceof Error?error.message:"削除に失敗しました。");}finally{setBusy(false);}}
  return <section className="admin-panel banner-manager"><h2>イベントバナー</h2><p>掲載期間中の公開イベントをトップページに表示します。複数ある場合は開始日が新しいものを表示します。</p><form onSubmit={save} className="banner-form">
    <label>イベント名<input required maxLength={120} value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/></label>
    <label>バナー画像URL（HTTPS）<input type="url" required value={form.imageUrl} onChange={event=>setForm({...form,imageUrl:event.target.value})} placeholder="https://example.com/banner.jpg"/></label>
    <div className="banner-date-fields"><label>掲載開始<input type="datetime-local" required value={form.startsAt} onChange={event=>setForm({...form,startsAt:event.target.value})}/></label><label>掲載終了<input type="datetime-local" required value={form.endsAt} onChange={event=>setForm({...form,endsAt:event.target.value})}/></label></div>
    <label>バナー選択時の遷移先<select value={form.destination} onChange={event=>setForm({...form,destination:event.target.value as Form["destination"]})}><option value="none">遷移なし</option><option value="detail">サイト内の詳細ページ</option><option value="external">外部URL</option></select></label>
    {form.destination==="external"&&<label>外部URL（HTTPS）<input type="url" required value={form.externalUrl} onChange={event=>setForm({...form,externalUrl:event.target.value})}/></label>}
    {form.destination==="detail"&&<label>詳細ページの本文<textarea required maxLength={10000} rows={8} value={form.detailText} onChange={event=>setForm({...form,detailText:event.target.value})}/></label>}
    <label className="banner-publish"><input type="checkbox" checked={form.published} onChange={event=>setForm({...form,published:event.target.checked})}/>公開する</label>
    <div><button disabled={busy}>{busy?"保存中…":editing?"更新する":"イベントを追加"}</button>{editing&&<button type="button" className="secondary" onClick={reset}>編集をやめる</button>}</div>
  </form>{message&&<p role="status">{message}</p>}
  <ul className="banner-list">{items.map(item=><li key={item.id}><strong>{item.title}</strong><span>{new Date(item.starts_at).toLocaleString("ja-JP")} ～ {new Date(item.ends_at).toLocaleString("ja-JP")}・{item.published?"公開":"非公開"}</span><div><button type="button" onClick={()=>edit(item)}>編集</button><button type="button" disabled={busy} onClick={()=>remove(item)}>削除</button></div></li>)}</ul></section>;
}

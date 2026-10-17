"use client";
import {useRef,useState} from "react";
import {buildingAddress} from "@/domain/cafes/building-address";
import type {ManagedBuilding} from "@/domain/admin/building";
import {readAdminResponse} from "./api-response";

export function BuildingForm({initial,area="susukino",suggestion,onSaved,onCancel}:{initial?:ManagedBuilding;area?:ManagedBuilding["area"];suggestion?:{name:string;address:string};onSaved:(building:ManagedBuilding)=>void;onCancel:()=>void}){
  const [name,setName]=useState(initial?.name??suggestion?.name??""),[address,setAddress]=useState(buildingAddress(initial?.address??suggestion?.address??"",initial?.name??suggestion?.name??"")),[selectedArea,setArea]=useState(initial?.area??area);
  const [latitude,setLatitude]=useState(initial?.location?String(initial.location.latitude):""),[longitude,setLongitude]=useState(initial?.location?String(initial.location.longitude):"");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [searching,setSearching]=useState(false),[lookupMessage,setLookupMessage]=useState("");
  const addressRef=useRef(address);
  async function lookup(){
    if(searching||busy)return;
    const searched=address;setSearching(true);setError("");setLookupMessage("");
    try{
      const data=await readAdminResponse(await fetch("/api/admin/buildings/geocode",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({address:searched})}));
      if(addressRef.current!==searched)return;
      setLatitude(String(data.location.latitude));setLongitude(String(data.location.longitude));setLookupMessage(`取得した住所：${data.formattedAddress}。Googleマップで位置を確認してください。`);
    }catch(error){if(addressRef.current===searched)setError(error instanceof Error?error.message:"住所検索に失敗しました。");}finally{setSearching(false);}
  }
  async function save(event:React.FormEvent){
    event.preventDefault();if(busy||searching)return;setBusy(true);setError("");
    try{
      if(Boolean(latitude)!==Boolean(longitude))throw new Error("緯度・経度を両方入力してください。");
      const response=await fetch(initial?`/api/admin/buildings/${initial.id}`:"/api/admin/buildings",{method:initial?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,address,area:selectedArea,location:latitude&&longitude?{latitude:Number(latitude),longitude:Number(longitude)}:null,version:initial?.version})});
      const data=await readAdminResponse(response);onSaved(data.building);
    }catch(error){setError(error instanceof Error?error.message:"ビルを保存できませんでした。");}finally{setBusy(false);}
  }
  return <form onSubmit={save} className="admin-building-form" aria-busy={busy}>
    <label>ビル名<input value={name} onChange={event=>setName(event.target.value)} required maxLength={200}/></label>
    <label>エリア<select value={selectedArea} onChange={event=>setArea(event.target.value as ManagedBuilding["area"])} disabled={!!initial?.storeCount}><option value="susukino">すすきの</option><option value="tanukikoji">狸小路</option></select></label>
    <label>住所<input value={address} onChange={event=>{addressRef.current=event.target.value;setAddress(event.target.value);setLookupMessage("");}} required maxLength={500}/></label>
    <p className="admin-field-help">階数・ビル名を除いた共通住所を登録します。ビル名は上の欄に入力してください。店舗ごとの階数は店舗設定で入力してください。住所を変更すると所属店舗にも反映されます。</p>
    <div className="admin-coordinate-actions">
      <button type="button" className="secondary" disabled={busy||searching||!address.trim()} onClick={lookup}>{searching?"座標を取得中…":"住所から緯度・経度を自動入力"}</button>
      {latitude&&longitude&&<a href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(latitude+","+longitude)} target="_blank" rel="noopener noreferrer">Googleマップで座標を確認 ↗</a>}
    </div>
    {lookupMessage&&<p role="status">{lookupMessage}</p>}
    <details open={!!lookupMessage}><summary>地図の座標を設定する（任意）</summary><p className="admin-field-help">設定すると所属店舗に共通の座標を使用します。未設定の場合は店舗の座標を使用します。</p><div className="admin-form-row">
      <label>緯度<input type="number" step="any" min={-90} max={90} disabled={searching} value={latitude} onChange={event=>setLatitude(event.target.value)}/></label>
      <label>経度<input type="number" step="any" min={-180} max={180} disabled={searching} value={longitude} onChange={event=>setLongitude(event.target.value)}/></label>
    </div></details>
    {error&&<p role="alert" className="admin-error">{error}</p>}
    {busy&&<p role="status">ビル情報を保存しています…</p>}
    <div className="admin-form-actions"><button type="submit" disabled={busy||searching}>{busy?"保存中…":"ビル情報を保存"}</button><button type="button" className="secondary" disabled={busy||searching} onClick={onCancel}>キャンセル</button></div>
  </form>;
}

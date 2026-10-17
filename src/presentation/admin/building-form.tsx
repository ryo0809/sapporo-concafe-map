"use client";
import {useState} from "react";
import {buildingAddress} from "@/domain/cafes/building-address";
import type {ManagedBuilding} from "@/domain/admin/building";
import {readAdminResponse} from "./api-response";

export function BuildingForm({initial,area="susukino",suggestion,onSaved,onCancel}:{initial?:ManagedBuilding;area?:ManagedBuilding["area"];suggestion?:{name:string;address:string};onSaved:(building:ManagedBuilding)=>void;onCancel:()=>void}){
  const [name,setName]=useState(initial?.name??suggestion?.name??""),[address,setAddress]=useState(buildingAddress(initial?.address??suggestion?.address??"",initial?.name??suggestion?.name??"")),[selectedArea,setArea]=useState(initial?.area??area);
  const [latitude,setLatitude]=useState(initial?.location?String(initial.location.latitude):""),[longitude,setLongitude]=useState(initial?.location?String(initial.location.longitude):"");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function save(event:React.FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    try{
      if(Boolean(latitude)!==Boolean(longitude))throw new Error("緯度・経度を両方入力してください。");
      const response=await fetch(initial?`/api/admin/buildings/${initial.id}`:"/api/admin/buildings",{method:initial?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,address,area:selectedArea,location:latitude&&longitude?{latitude:Number(latitude),longitude:Number(longitude)}:null,version:initial?.version})});
      const data=await readAdminResponse(response);onSaved(data.building);
    }catch(error){setError(error instanceof Error?error.message:"ビルを保存できませんでした。");}finally{setBusy(false);}
  }
  return <form onSubmit={save} className="admin-building-form" aria-busy={busy}>
    <label>ビル名<input value={name} onChange={event=>setName(event.target.value)} required maxLength={200}/></label>
    <label>エリア<select value={selectedArea} onChange={event=>setArea(event.target.value as ManagedBuilding["area"])} disabled={!!initial?.storeCount}><option value="susukino">すすきの</option><option value="tanukikoji">狸小路</option></select></label>
    <label>住所<input value={address} onChange={event=>setAddress(event.target.value)} required maxLength={500}/></label>
    <p className="admin-field-help">階数・ビル名を除いた共通住所を登録します。ビル名は上の欄に入力してください。店舗ごとの階数は店舗設定で入力してください。住所を変更すると所属店舗にも反映されます。</p>
    <details><summary>地図の座標を設定する（任意）</summary><p className="admin-field-help">設定すると所属店舗に共通の座標を使用します。未設定の場合は店舗の座標を使用します。</p><div className="admin-form-row">
      <label>緯度<input type="number" step="any" min={-90} max={90} value={latitude} onChange={event=>setLatitude(event.target.value)}/></label>
      <label>経度<input type="number" step="any" min={-180} max={180} value={longitude} onChange={event=>setLongitude(event.target.value)}/></label>
    </div></details>
    {error&&<p role="alert" className="admin-error">{error}</p>}
    {busy&&<p role="status">ビル情報を保存しています…</p>}
    <div className="admin-form-actions"><button type="submit" disabled={busy}>{busy?"保存中…":"ビル情報を保存"}</button><button type="button" className="secondary" disabled={busy} onClick={onCancel}>キャンセル</button></div>
  </form>;
}

"use client";
import {useEffect,useRef,useState} from "react";
import type {ManagedBuilding} from "@/domain/admin/building";
import {BuildingForm} from "./building-form";

export function BuildingManager({buildings,onSaved}:{buildings:ManagedBuilding[];onSaved:(building:ManagedBuilding)=>void}){
  const [query,setQuery]=useState(""),[area,setArea]=useState("all"),[editor,setEditor]=useState<ManagedBuilding|"new"|null>(null),[message,setMessage]=useState("");
  const editorHeading=useRef<HTMLHeadingElement>(null),listHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(editor){editorHeading.current?.focus({preventScroll:true});editorHeading.current?.scrollIntoView({block:"start",behavior:"smooth"});}},[editor]);
  const filtered=buildings.filter(building=>(area==="all"||building.area===area)&&`${building.name} ${building.address}`.normalize("NFKC").toLowerCase().includes(query.normalize("NFKC").toLowerCase()));
  return <>
    <section className="admin-panel"><div className="admin-panel-heading"><h2 ref={listHeading} tabIndex={-1}>ビル管理</h2><button type="button" onClick={()=>{setEditor("new");setMessage("");}}>ビルを追加</button></div>
      <p className="admin-field-help">住所をビルごとに管理します。店舗設定で選択すると、住所を毎回入力する必要がありません。</p>
      {message&&<p role="status" className="admin-success">{message}</p>}
      <div className="admin-form-row"><label>ビルを検索<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="ビル名・住所"/></label><label>ビルのエリア<select value={area} onChange={event=>setArea(event.target.value)}><option value="all">すべて</option><option value="susukino">すすきの</option><option value="tanukikoji">狸小路</option></select></label></div>
      <p className="admin-field-help">{filtered.length}件のビル</p>
      <div className="admin-building-grid">{filtered.map(building=><article className="admin-building-card" key={building.id}><h3>{building.name}</h3><p>{building.area==="susukino"?"すすきの":"狸小路"} · 所属店舗 {building.storeCount}件</p><p>{building.address||"住所未登録"}</p><button type="button" className="secondary" onClick={()=>{setEditor(building);setMessage("");}}>ビルを編集<span className="sr-only">：{building.name}（{building.address}）</span></button></article>)}</div>
      {!filtered.length&&<p>条件に一致するビルがありません。</p>}
    </section>
    {editor&&<section className="admin-panel admin-building-editor"><h2 ref={editorHeading} tabIndex={-1}>{editor==="new"?"ビルを追加":"ビル情報を編集"}</h2><BuildingForm key={editor==="new"?"new":`${editor.id}-${editor.version}`} initial={editor==="new"?undefined:editor} onCancel={()=>setEditor(null)} onSaved={building=>{onSaved(building);setEditor(null);setMessage(`「${building.name}」を保存しました。`);requestAnimationFrame(()=>{listHeading.current?.focus({preventScroll:true});listHeading.current?.scrollIntoView({block:"start",behavior:"smooth"});});}}/></section>}
  </>;
}

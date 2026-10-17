"use client";
import {useEffect,useRef,useState} from "react";
import type {ManagedBuilding} from "@/domain/admin/building";
import {BuildingForm} from "./building-form";
const pageSize=10;

export function BuildingManager({buildings,onSaved}:{buildings:ManagedBuilding[];onSaved:(building:ManagedBuilding)=>void}){
  const [query,setQuery]=useState(""),[area,setArea]=useState("all"),[editor,setEditor]=useState<ManagedBuilding|"new"|null>(null),[message,setMessage]=useState("");
  const [page,setPage]=useState(1);
  const editorHeading=useRef<HTMLHeadingElement>(null),listHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(editor){editorHeading.current?.focus({preventScroll:true});editorHeading.current?.scrollIntoView({block:"start",behavior:"smooth"});}},[editor]);
  const filtered=buildings.filter(building=>(area==="all"||building.area===area)&&`${building.name} ${building.address}`.normalize("NFKC").toLowerCase().includes(query.normalize("NFKC").toLowerCase()));
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize)),currentPage=Math.min(page,pages);
  const start=(currentPage-1)*pageSize,listed=filtered.slice(start,start+pageSize);
  function changePage(value:number){setPage(value);listHeading.current?.focus({preventScroll:true});listHeading.current?.scrollIntoView({block:"start",behavior:"smooth"});}
  return <>
    <section className="admin-panel"><div className="admin-panel-heading"><h2 ref={listHeading} tabIndex={-1}>ビル管理</h2><button type="button" onClick={()=>{setEditor("new");setMessage("");}}>ビルを追加</button></div>
      <p className="admin-field-help">住所をビルごとに管理します。店舗設定で選択すると、住所を毎回入力する必要がありません。</p>
      {message&&<p role="status" className="admin-success">{message}</p>}
      <div className="admin-form-row"><label>ビルを検索<input type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}} placeholder="ビル名・住所"/></label><label>ビルのエリア<select value={area} onChange={event=>{setArea(event.target.value);setPage(1);}}><option value="all">すべて</option><option value="susukino">すすきの</option><option value="tanukikoji">狸小路</option></select></label></div>
      <p className="admin-field-help" aria-live="polite">{filtered.length}件のビル{filtered.length>0&&`（${start+1}〜${Math.min(start+pageSize,filtered.length)}件を表示）`}</p>
      <div className="admin-building-grid" id="admin-building-list">{listed.map(building=><article className="admin-building-card" key={building.id}><h3>{building.name}</h3><p>{building.area==="susukino"?"すすきの":"狸小路"} · 所属店舗 {building.storeCount}件</p><p>{building.address||"住所未登録"}</p><button type="button" className="secondary" onClick={()=>{setEditor(building);setMessage("");}}>ビルを編集<span className="sr-only">：{building.name}（{building.address}）</span></button></article>)}</div>
      {filtered.length>0&&<nav className="admin-pagination" aria-label="ビル一覧のページ切り替え"><button type="button" className="secondary" aria-controls="admin-building-list" disabled={currentPage===1} onClick={()=>changePage(currentPage-1)}>前へ</button><label>ページ<select aria-controls="admin-building-list" value={currentPage} onChange={event=>changePage(Number(event.target.value))}>{Array.from({length:pages},(_,index)=><option key={index+1} value={index+1}>{index+1} / {pages}</option>)}</select></label><button type="button" className="secondary" aria-controls="admin-building-list" disabled={currentPage===pages} onClick={()=>changePage(currentPage+1)}>次へ</button></nav>}
      {!filtered.length&&<p>条件に一致するビルがありません。</p>}
    </section>
    {editor&&<section className="admin-panel admin-building-editor"><h2 ref={editorHeading} tabIndex={-1}>{editor==="new"?"ビルを追加":"ビル情報を編集"}</h2><BuildingForm key={editor==="new"?"new":`${editor.id}-${editor.version}`} initial={editor==="new"?undefined:editor} onCancel={()=>setEditor(null)} onSaved={building=>{onSaved(building);setPage(1);setEditor(null);setMessage(`「${building.name}」を保存しました。`);requestAnimationFrame(()=>{listHeading.current?.focus({preventScroll:true});listHeading.current?.scrollIntoView({block:"start",behavior:"smooth"});});}}/></section>}
  </>;
}

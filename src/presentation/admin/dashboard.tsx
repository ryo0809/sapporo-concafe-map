"use client";
import { useEffect,useRef,useState } from "react";
import type { CafeInput,ManagedCafe } from "@/domain/admin/managed-cafe";
import type { StoreCandidate } from "@/domain/admin/candidates";
import {readAdminResponse} from "./api-response";
import type {ManagedBuilding} from "@/domain/admin/building";
import {socialFields as splitSocialFields,socialUrls,socialPlatforms,type SocialPlatform} from "@/domain/admin/social-links";
import {BuildingDialog} from "./building-dialog";
import {groupManagedCafes} from "./building-groups";

const businessLabels={unknown:"未確認",operating:"営業中",temporarily_closed:"一時休業",closed:"閉店",moved:"移転"};
const publicationLabels={draft:"下書き",published:"公開",hidden:"非公開",scheduled:"予約公開"};
const tokyoDateTime=(value?:string)=>value?new Date(new Date(value).getTime()+9*60*60*1000).toISOString().slice(0,16):"";
const publicationLabel=(cafe:CafeInput)=>cafe.publicationStatus==="scheduled"&&cafe.publishAt&&Date.parse(cafe.publishAt)<=Date.now()?"公開":publicationLabels[cafe.publicationStatus];
const publicationGroups={published:{label:"公開",help:"公開設定になっている店舗"},hidden:{label:"非公開",help:"下書きを含む、公開していない店舗"},scheduled:{label:"予約公開",help:"指定日時の公開を待っている店舗"},closed:{label:"閉店",help:"営業状態が閉店の店舗"}};
type PublicationGroup=keyof typeof publicationGroups;
const storeAreas={susukino:"すすきの",tanukikoji:"狸小路"};
const publicationGroup=(cafe:CafeInput):PublicationGroup=>cafe.businessStatus==="closed"?"closed":publicationLabel(cafe)==="予約公開"?"scheduled":publicationLabel(cafe)==="公開"?"published":"hidden";
const emptyCafe=(area:CafeInput["area"]="tanukikoji"):CafeInput=>({name:"",address:"",area,category:"unknown",buildingName:"",floor:"",location:null,businessStatus:"unknown",publicationStatus:"draft",sourceUrl:"",socialUrls:[],verifiedOn:"",coordinateSource:""});
type Editor=CafeInput&{id?:string;version?:number};

async function request(url:string,options?:RequestInit){
  const response=await fetch(url,options);
  return readAdminResponse(response);
}
export function AdminDashboard({buildings,revision,onBuildingSaved,onStoreChanged}:{buildings:ManagedBuilding[];revision:number;onBuildingSaved:(building:ManagedBuilding)=>void;onStoreChanged:()=>void}){
  const [cafes,setCafes]=useState<ManagedCafe[]>([]),[query,setQuery]=useState("");
  const [group,setGroup]=useState<PublicationGroup>("hidden");
  const [storeArea,setStoreArea]=useState<CafeInput["area"]>("susukino");
  const [editor,setEditor]=useState<Editor|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  const [social,setSocial]=useState(()=>splitSocialFields([])),[buildingQuery,setBuildingQuery]=useState(""),[addingBuilding,setAddingBuilding]=useState(false);
  const saveDialog=useRef<HTMLDialogElement>(null);
  const deleteDialog=useRef<HTMLDialogElement>(null);
  const [deleteTarget,setDeleteTarget]=useState<Editor|null>(null),[deleteError,setDeleteError]=useState("");
  const [operation,setOperation]=useState<"save"|"delete">("save");
  useEffect(()=>{
    const dialog=deleteDialog.current;
    if(!dialog)return;
    if(deleteTarget&&!busy){if(!dialog.open)dialog.showModal();}
    else if(dialog.open)dialog.close();
  },[deleteTarget,busy]);
  useEffect(()=>{
    const dialog=saveDialog.current;
    if(!dialog)return;
    if(busy||message){
      if(!dialog.open)dialog.showModal();
      if(!busy)dialog.querySelector("button")?.focus();
    }else if(dialog.open)dialog.close();
  },[busy,message]);
  const [search,setSearch]=useState(""),[area,setArea]=useState("all"),[live,setLive]=useState(true),[searching,setSearching]=useState(false);
  const [submittedSearch,setSubmittedSearch]=useState("");
  const searchDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=searchDialog.current;
    if(!dialog)return;
    if(searching){if(!dialog.open)dialog.showModal();}
    else if(dialog.open)dialog.close();
  },[searching]);
  const [candidates,setCandidates]=useState<StoreCandidate[]>([]),[warnings,setWarnings]=useState<string[]>([]),[searched,setSearched]=useState(false),[duplicates,setDuplicates]=useState<string[]>([]);
  useEffect(()=>{let disposed=false;request("/api/admin/cafes").then((result)=>{if(!disposed)setCafes(result.cafes);}).catch((error)=>{if(!disposed)setError(error.message);});return()=>{disposed=true;};},[revision]);
  const areaCafes=cafes.filter((cafe)=>cafe.area===storeArea);
  const matched=areaCafes.filter((cafe)=>`${cafe.name} ${cafe.address} ${cafe.buildingName}`.normalize("NFKC").toLowerCase().includes(query.normalize("NFKC").toLowerCase()));
  const listed=matched.filter((cafe)=>publicationGroup(cafe)===group);
  const grouped=groupManagedCafes(listed);
  const selectedBuilding=buildings.find(building=>building.id===editor?.buildingId);
  const matchingBuildings=buildings.filter(building=>building.area===editor?.area&&(building.id===editor?.buildingId||`${building.name} ${building.address}`.normalize("NFKC").toLowerCase().includes(buildingQuery.normalize("NFKC").toLowerCase())));
  function selectBuilding(building?:ManagedBuilding){if(!editor)return;setEditor({...editor,buildingId:building?.id??"",buildingName:building?.name??"",address:building?.address||editor.address,location:building?.location??null});}
  function edit(value:Editor){setEditor({...value,buildingId:value.buildingId??"",socialUrls:[...value.socialUrls]});setSocial(splitSocialFields(value.socialUrls));setBuildingQuery("");setError("");setMessage("");setDuplicates([]);requestAnimationFrame(()=>{const heading=document.getElementById("admin-editor-title");heading?.focus({preventScroll:true});heading?.scrollIntoView({behavior:"smooth",block:"start"});});}
  function field<K extends keyof CafeInput>(key:K,value:CafeInput[K]){setEditor((old)=>old?{...old,[key]:value}:old);}
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!editor||busy)return;setOperation("save");setBusy(true);setError("");setMessage("");
    try{const location=selectedBuilding?.location??editor.location;const result=await request(editor.id?`/api/admin/cafes/${editor.id}`:"/api/admin/cafes",{method:editor.id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...editor,buildingName:editor.buildingId?editor.buildingName:"",address:selectedBuilding?.address||editor.address,socialUrls:socialUrls(social),location})});setCafes((old)=>[result.cafe,...old.filter((cafe)=>cafe.id!==result.cafe.id)]);setEditor(result.cafe);setSocial(splitSocialFields(result.cafe.socialUrls));setMessage("店舗情報を保存しました。");setDuplicates([]);onStoreChanged();}
    catch(error){setError(error instanceof Error?error.message:"保存に失敗しました");}finally{setBusy(false);}
  }
  async function remove(){
    if(!deleteTarget?.id||busy)return;
    const target=deleteTarget;
    setOperation("delete");setBusy(true);setMessage("");setDeleteError("");
    try{
      await request(`/api/admin/cafes/${target.id}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:target.version})});
      setCafes(old=>old.filter(cafe=>cafe.id!==target.id));setEditor(null);setDeleteTarget(null);setDuplicates([]);setError("");
      setMessage(`「${target.name}」を削除しました。`);
      onStoreChanged();
    }catch(error){setDeleteError(error instanceof Error?error.message:"削除に失敗しました。");}
    finally{setBusy(false);}
  }
  async function find(event:React.FormEvent){event.preventDefault();if(searching)return;setSubmittedSearch(search.trim());setSearching(true);setError("");setSearched(false);setCandidates([]);setWarnings([]);try{const result=await request(`/api/admin/candidates?q=${encodeURIComponent(search)}&area=${area}&live=${live}`);setCandidates(result.candidates);setWarnings(result.warnings);setSearched(true);}catch(error){setError(error instanceof Error?error.message:"検索に失敗しました");setWarnings([error instanceof Error?error.message:"検索に失敗しました"]);setSearched(true);}finally{setSearching(false);}}
  return <>
    {addingBuilding&&editor&&<BuildingDialog area={editor.area} suggestion={{name:editor.buildingName,address:editor.address}} onClose={()=>setAddingBuilding(false)} onSaved={building=>{onBuildingSaved(building);selectBuilding(building);setAddingBuilding(false);setBuildingQuery("");}}/>}
    <div className="admin-stats"><span>登録店舗 <strong>{cafes.length}</strong></span><span>公開設定 <strong>{cafes.filter((cafe)=>publicationLabel(cafe)==="公開").length}</strong></span><span>予約公開 <strong>{cafes.filter((cafe)=>publicationLabel(cafe)==="予約公開").length}</strong></span><span>営業未確認 <strong>{cafes.filter((cafe)=>cafe.businessStatus==="unknown").length}</strong></span></div>
    <dialog ref={saveDialog} className="admin-save-dialog" aria-labelledby="admin-save-title" aria-describedby="admin-save-description" aria-busy={busy} onCancel={(event)=>{if(busy)event.preventDefault();else setMessage("");}}>
      {busy?<span className="admin-save-spinner" aria-hidden="true"/>:<span className="admin-save-check" aria-hidden="true">✓</span>}
      <h2 id="admin-save-title">{operation==="delete"?(busy?"店舗情報を削除中":"削除が完了しました"):(busy?"店舗情報を保存中":"保存が完了しました")}</h2>
      <p id="admin-save-description" role="status">{busy?"処理が完了するまでお待ちください。":message}</p>
      {!busy&&<button type="button" onClick={()=>setMessage("")}>閉じる</button>}
    </dialog>
    <dialog ref={deleteDialog} className="admin-save-dialog admin-delete-dialog" aria-labelledby="admin-delete-title" aria-describedby="admin-delete-description" onCancel={()=>setDeleteTarget(null)}>
      <h2 id="admin-delete-title">店舗を削除しますか？</h2>
      <p id="admin-delete-description"><strong>「{deleteTarget?.name}」</strong>を登録店舗一覧と公開マップから削除します。重複した店舗か確認してください。</p>
      {deleteError&&<p role="alert" className="admin-error">{deleteError}</p>}
      <div className="admin-delete-actions"><button type="button" className="secondary" autoFocus onClick={()=>setDeleteTarget(null)}>キャンセル</button><button type="button" className="danger" onClick={remove}>削除する</button></div>
    </dialog>
    {error&&<p role="alert" className="admin-error">{error}</p>}
    <div className="admin-grid"><section className="admin-panel admin-list"><div className="admin-panel-heading"><h2>登録店舗</h2><button onClick={()=>edit(emptyCafe(storeArea))}>手入力で追加</button></div>
      <div className="admin-area-tabs" role="tablist" aria-label="登録店舗のエリア">{(Object.keys(storeAreas) as CafeInput["area"][]).map((key)=><button key={key} id={`admin-area-${key}`} type="button" role="tab" aria-selected={storeArea===key} aria-controls="admin-area-panel" tabIndex={storeArea===key?0:-1} onClick={()=>setStoreArea(key)} onKeyDown={(event)=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const next=event.key==="Home"?"susukino":event.key==="End"?"tanukikoji":key==="susukino"?"tanukikoji":"susukino";setStoreArea(next);document.getElementById(`admin-area-${next}`)?.focus();}}>{storeAreas[key]}<span>{cafes.filter(cafe=>cafe.area===key).length}件</span></button>)}</div>
      <div id="admin-area-panel" role="tabpanel" aria-labelledby={`admin-area-${storeArea}`}>
      <div className="admin-publication-filters" role="group" aria-label="掲載状態で絞り込み">{(Object.keys(publicationGroups) as PublicationGroup[]).map((key)=><button key={key} type="button" className={`admin-publication-filter ${key}`} aria-pressed={group===key} aria-controls="admin-store-results" onClick={()=>setGroup(key)}><span>{publicationGroups[key].label}</span><strong>{areaCafes.filter(cafe=>publicationGroup(cafe)===key).length}<small>件</small></strong><span className="admin-filter-help">{publicationGroups[key].help}</span></button>)}</div>
      <label>登録店舗を検索<input type="search" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="店舗名・住所・ビル名"/></label>
      <div id="admin-store-results"><div className="admin-results-heading"><h3>{publicationGroups[group].label}の店舗</h3><span aria-live="polite">{listed.length}件{query&&"（検索結果）"}</span></div><div className="admin-store-list">
        {grouped.map(building=><section className="admin-building-group" key={building.key}><header><h4>{building.name}</h4><span>{building.cafes.length}店舗</span>{building.address&&<p>{building.address}</p>}</header><div className="admin-building-stores">
          {building.cafes.map(cafe=><button type="button" key={cafe.id} className={`admin-store-card ${editor?.id===cafe.id?"active":""}`} onClick={()=>edit(cafe)}><strong>{cafe.name}</strong><span>{cafe.floor||"階数未登録"}</span><span className="admin-badges"><b className={`publication-${publicationGroup(cafe)}`}>{publicationLabel(cafe)}</b><b>{businessLabels[cafe.businessStatus]}</b></span>{cafe.publishAt&&<span>公開日時：{tokyoDateTime(cafe.publishAt).replace("T"," ")}（日本時間）</span>}<span className="admin-edit-link">店舗情報を編集 ↓</span></button>)}
        </div></section>)}
        {!listed.length&&<p className="admin-empty">{query?"検索条件に一致する店舗がありません。":`${publicationGroups[group].label}の店舗はありません。`}</p>}</div></div>
      </div>
    </section>
    <section className="admin-panel admin-editor" aria-labelledby="admin-editor-title"><h2 id="admin-editor-title" tabIndex={-1}>{editor?.id?"店舗情報を編集":editor?"掲載店舗を追加":"店舗を選択してください"}</h2>
      {!editor&&<p className="muted">上の一覧から編集する店舗を選ぶか、手入力・候補検索から追加できます。</p>}
      {editor&&<form onSubmit={save}>
        {duplicates.length>0&&<div className="admin-warning">既存店舗と重複する可能性があります。{duplicates.map((id)=><button key={id} type="button" onClick={()=>{const cafe=cafes.find((item)=>item.id===id);if(cafe)edit(cafe);}}>既存の「{cafes.find((item)=>item.id===id)?.name}」を編集</button>)}</div>}
        <label>店舗名<input required maxLength={160} value={editor.name} onChange={(event)=>field("name",event.target.value)}/></label>
        <div className="admin-form-row"><label>エリア<select value={editor.area} onChange={(event)=>{setEditor({...editor,area:event.target.value as CafeInput["area"],buildingId:"",buildingName:""});setBuildingQuery("");}}><option value="tanukikoji">狸小路</option><option value="susukino">すすきの</option></select></label><label>店舗種別<select value={editor.category} onChange={(event)=>field("category",event.target.value as CafeInput["category"])}><option value="unknown">未確認</option><option value="concept">コンカフェ</option><option value="maid">メイドカフェ</option></select></label></div>
        <fieldset className="admin-building-select"><legend>入居ビル</legend><label>ビルを絞り込む<input type="search" value={buildingQuery} onChange={event=>setBuildingQuery(event.target.value)} placeholder="ビル名・住所"/></label><label>ビルを選択<select value={editor.buildingId??""} onChange={event=>selectBuilding(buildings.find(building=>building.id===event.target.value))}><option value="">ビル未登録（住所を直接入力）</option>{editor.buildingId&&!selectedBuilding&&<option value={editor.buildingId}>{editor.buildingName}（読み込み中）</option>}{matchingBuildings.map(building=><option value={building.id} key={building.id}>{building.name} — {building.address||"住所未登録"}</option>)}</select></label><button type="button" className="secondary" onClick={()=>setAddingBuilding(true)}>新しいビルを追加</button></fieldset>
        {selectedBuilding?.address?<div><span>ビルの住所</span><p>{selectedBuilding.address}</p></div>:<label>住所<input required maxLength={500} value={editor.address} onChange={(event)=>field("address",event.target.value)}/></label>}
        {selectedBuilding?.address&&<p className="admin-field-help">ビルの登録住所を使用しています。店舗ごとの階数を下の欄に入力してください。住所の修正は「ビル管理」から行えます。</p>}
        <label>階数<input maxLength={40} placeholder="例：B1F / 3F" value={editor.floor} onChange={(event)=>field("floor",event.target.value)}/></label>
        <div className="admin-form-row"><label>営業状態<select value={editor.businessStatus} onChange={(event)=>field("businessStatus",event.target.value as CafeInput["businessStatus"])}>{Object.entries(businessLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>掲載状態<select value={editor.publicationStatus} onChange={(event)=>{const status=event.target.value as CafeInput["publicationStatus"];setEditor({...editor,publicationStatus:status,publishAt:undefined});}}>{Object.entries(publicationLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
        {editor.publicationStatus==="scheduled"&&<label>予約公開日時（日本時間）<input required type="datetime-local" value={tokyoDateTime(editor.publishAt)} onChange={(event)=>field("publishAt",event.target.value?new Date(`${event.target.value}:00+09:00`).toISOString():undefined)}/></label>}
        <p className="admin-field-help">閉店・一時休業・移転の店舗は、公開設定でもマップに表示されません。</p>
        <p className="admin-field-help">緯度・経度は「ビル管理」で設定してください。選択したビルの座標を地図表示に使用します。</p>
        <label>公式サイト<input type="url" maxLength={2000} value={editor.officialUrl??""} onChange={(event)=>field("officialUrl",event.target.value)}/></label>
        <fieldset className="admin-social-fields"><legend>SNS</legend><p className="admin-field-help">利用している媒体だけ入力してください。複数のURLは改行で分けられます。</p><div className="admin-form-row">{(Object.keys(socialPlatforms) as SocialPlatform[]).map(key=><label key={key}>{socialPlatforms[key]} URL<textarea rows={2} value={social[key]} onChange={event=>setSocial(previous=>({...previous,[key]:event.target.value}))} placeholder={key==="other"?"その他の媒体のURL":"https://"}/></label>)}</div></fieldset>
        <label>情報確認日<input type="date" value={editor.verifiedOn} onClick={(event)=>{
          try{event.currentTarget.showPicker?.();}
          catch{/* Keep native date input usable when the browser disallows opening the picker. */}
        }} onChange={(event)=>field("verifiedOn",event.target.value)}/></label>
        <div className="admin-form-actions"><button type="submit" disabled={busy}>{busy?"処理中…":"店舗情報を保存"}</button><button type="button" className="secondary" onClick={()=>setEditor(null)}>閉じる</button>{editor.id&&<button type="button" className="danger admin-delete-button" disabled={busy} onClick={()=>{setDeleteError("");setDeleteTarget({...editor,name:cafes.find(cafe=>cafe.id===editor.id)?.name??editor.name});}}>店舗を削除</button>}</div>
      </form>}
    </section></div>
    <dialog ref={searchDialog} className="admin-save-dialog" aria-labelledby="admin-search-title" aria-describedby="admin-search-description" aria-busy="true" onCancel={event=>event.preventDefault()}><span className="admin-save-spinner" aria-hidden="true"/><h2 id="admin-search-title">店舗候補を検索中</h2><p id="admin-search-description" role="status">「{submittedSearch}」を検索しています。{live?"外部サイトも確認するため、最大30秒ほどかかります。":"保存済みの店舗情報を確認しています。"}</p></dialog>
    <section className="admin-panel admin-search"><h2>検索候補から店舗を追加</h2><p>候補を選び、情報を確認・編集してから登録します。保存するまで掲載情報は変更されません。</p>
      <form onSubmit={find} className="admin-search-form"><label>候補を検索<input required minLength={2} maxLength={100} value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="店舗名・住所"/></label><label>検索エリア<select value={area} onChange={(event)=>setArea(event.target.value)}><option value="all">すべて</option><option value="tanukikoji">狸小路</option><option value="susukino">すすきの</option></select></label><button disabled={searching}>{searching?"検索中…":"候補を検索"}</button></form>
      <label className="admin-checkbox"><input type="checkbox" checked={live} onChange={(event)=>setLive(event.target.checked)}/>外部サイトも検索</label>
      <p className="admin-field-help">登録店舗・過去の取得候補・検索履歴・補完候補を検索します。ひらがな・カタカナや記号の違い、複数キーワード、保存済みのXアカウント名・URLに対応します。外部検索はポケパラ・かふぇこんの一覧を各3ページ、詳細を各5件まで確認します。</p>
      {warnings.map((warning)=><p key={warning} className="admin-warning">{warning}</p>)}
      {searched&&!candidates.length&&<p>候補が見つかりませんでした。別の検索語をお試しください。</p>}
      {searched&&<p className="admin-search-summary" role="status">候補 {candidates.length}件（最大30件）<a href={`https://www.google.com/search?q=${encodeURIComponent(`${submittedSearch} 札幌 コンカフェ`)}`} target="_blank" rel="noreferrer">Googleでも店舗を探す ↗</a></p>}
      <div className="admin-candidate-grid">{candidates.map((candidate)=><article key={candidate.id}><h3>{candidate.name}</h3><p>{candidate.address}</p><p className="admin-field-help">{candidate.provider} · 営業未確認{candidate.duplicateIds.length>0?" · 既存店舗と重複の可能性あり":""}</p><button onClick={()=>{edit({...candidate,id:undefined,publicationStatus:"draft",officialUrl:candidate.officialUrl??""});setDuplicates(candidate.duplicateIds);document.querySelector(".admin-editor")?.scrollIntoView({behavior:"smooth",block:"start"});}}>確認・編集して登録</button></article>)}</div>
    </section>
  </>;
}

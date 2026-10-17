"use client";
import { useEffect,useState } from "react";
import { AdminNavigation, type AdminTab } from "@/presentation/admin/navigation";
import { AdminDashboard } from "@/presentation/admin/dashboard";
import { ContactInbox } from "@/presentation/admin/contact-inbox";
import {BuildingManager} from "./building-manager";
import {readAdminResponse} from "./api-response";
import type {ManagedBuilding} from "@/domain/admin/building";

export function AdminSettings({ initialTab = "stores" }: { initialTab?: AdminTab }) {
  const [current, setCurrent] = useState(initialTab);
  const [visited, setVisited] = useState({ stores: initialTab === "stores", contacts: initialTab === "contacts",buildings:initialTab==="buildings" });
  const [buildings,setBuildings]=useState<ManagedBuilding[]>([]),[buildingError,setBuildingError]=useState(""),[storeRevision,setStoreRevision]=useState(0);
  useEffect(()=>{let disposed=false;fetch("/api/admin/buildings").then(readAdminResponse).then(data=>{if(!disposed)setBuildings(data.buildings);}).catch(error=>{if(!disposed)setBuildingError(error.message);});return()=>{disposed=true;};},[]);
  function buildingSaved(building:ManagedBuilding){setBuildings(previous=>[building,...previous.filter(item=>item.id!==building.id)]);setStoreRevision(previous=>previous+1);}
  function refreshBuildings(){fetch("/api/admin/buildings").then(readAdminResponse).then(data=>{setBuildings(data.buildings);setBuildingError("");}).catch(error=>setBuildingError(error.message));}
  function select(tab: AdminTab) { setCurrent(tab); setVisited(previous => ({ ...previous, [tab]: true })); }
  return <main className="admin-shell">
    <AdminNavigation current={current} onChange={select}/>
    {buildingError&&<p role="alert" className="admin-error">ビル情報：{buildingError}<button type="button" onClick={refreshBuildings}>再読み込み</button></p>}
    <div id="admin-panel-stores" role="tabpanel" aria-labelledby="admin-tab-stores" hidden={current !== "stores"}>{visited.stores && <AdminDashboard buildings={buildings} revision={storeRevision} onBuildingSaved={buildingSaved} onStoreChanged={refreshBuildings}/>}</div>
    <div id="admin-panel-buildings" role="tabpanel" aria-labelledby="admin-tab-buildings" hidden={current!=="buildings"}>{visited.buildings&&<BuildingManager buildings={buildings} onSaved={buildingSaved}/>}</div>
    <div id="admin-panel-contacts" role="tabpanel" aria-labelledby="admin-tab-contacts" hidden={current !== "contacts"}>{visited.contacts && <ContactInbox/>}</div>
  </main>;
}

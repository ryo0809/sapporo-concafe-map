"use client";
import {useEffect,useRef} from "react";
import type {ManagedBuilding} from "@/domain/admin/building";
import {BuildingForm} from "./building-form";
export function BuildingDialog({area,suggestion,onSaved,onClose}:{area:ManagedBuilding["area"];suggestion:{name:string;address:string};onSaved:(building:ManagedBuilding)=>void;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog ref={dialog} className="admin-building-dialog" aria-labelledby="new-building-title" onCancel={event=>{if(dialog.current?.querySelector('form[aria-busy="true"]'))event.preventDefault();else onClose();}}><h2 id="new-building-title">新しいビルを追加</h2><BuildingForm area={area} suggestion={suggestion} onSaved={onSaved} onCancel={onClose}/></dialog>;
}

import {buildingAddress} from "../cafes/building-address";
import {InputError} from "./managed-cafe";
export interface BuildingInput {
  name:string;area:"susukino"|"tanukikoji";address:string;
  location:{latitude:number;longitude:number}|null;
}
export interface ManagedBuilding extends BuildingInput {id:string;version:number;storeCount:number;}
export function validateBuilding(value:unknown):BuildingInput{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new InputError("ビル情報が不正です。");
  const data=value as Record<string,unknown>;
  const name=typeof data.name==="string"?data.name.trim():"",address=typeof data.address==="string"?buildingAddress(data.address, name):"";
  if(!name||name.length>200)throw new InputError("ビル名を200文字以内で入力してください。");
  if(!address||address.length>500)throw new InputError("住所を500文字以内で入力してください。");
  if(data.area!=="susukino"&&data.area!=="tanukikoji")throw new InputError("エリアを選択してください。");
  let location=null;
  if(data.location!==null){
    const point=data.location as Record<string,unknown>|undefined;
    if(!point||typeof point.latitude!=="number"||!Number.isFinite(point.latitude)||Math.abs(point.latitude)>90||typeof point.longitude!=="number"||!Number.isFinite(point.longitude)||Math.abs(point.longitude)>180)throw new InputError("緯度・経度を正しく入力してください。");
    location={latitude:point.latitude,longitude:point.longitude};
  }
  return {name,address,area:data.area,location};
}

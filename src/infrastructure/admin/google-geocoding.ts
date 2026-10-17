import {InputError} from "@/domain/admin/managed-cafe";

export async function geocodeAddress(address:unknown,key:string|undefined,fetcher:typeof fetch=fetch){
  if(typeof address!=="string"||!address.trim()||address.length>500)throw new InputError("住所を500文字以内で入力してください。");
  if(!key)throw new InputError("住所検索には GOOGLE_MAPS_GEOCODING_API_KEY の設定が必要です。");
  const url=new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.search=new URLSearchParams({address:address.trim(),key,language:"ja",components:"country:JP"}).toString();
  let response:Response;
  try{response=await fetcher(url,{cache:"no-store",signal:AbortSignal.timeout(10000)});}catch{throw new InputError("住所検索に接続できません。時間をおいて再試行してください。");}
  if(!response.ok)throw new InputError("住所検索に失敗しました。時間をおいて再試行してください。");
  const data=await response.json();
  if(data.status==="ZERO_RESULTS")throw new InputError("住所が見つかりません。番地まで入力してください。");
  if(data.status!=="OK")throw new InputError("住所検索を利用できません。APIキー・利用上限の設定を確認してください。");
  const result=data.results?.[0],point=result?.geometry?.location;
  if(!point||!Number.isFinite(point.lat)||Math.abs(point.lat)>90||!Number.isFinite(point.lng)||Math.abs(point.lng)>180)throw new InputError("住所の座標を取得できませんでした。");
  if(result.partial_match||result.geometry.location_type==="APPROXIMATE")throw new InputError("住所を正確に特定できません。番地を確認するか、座標を手入力してください。");
  return {location:{latitude:point.lat as number,longitude:point.lng as number},formattedAddress:String(result.formatted_address??address)};
}

export type EventBanner={id:string;title:string;image_url:string;starts_at:string;ends_at:string;destination:"none"|"detail"|"external";external_url:string;detail_text:string;published:number;created_at:string;updated_at:string};
export class BannerValidationError extends Error {}
export function validateBanner(value:unknown){
  if(!value||typeof value!=="object")throw new BannerValidationError("入力内容を確認してください。");
  const data=value as Record<string,unknown>;
  const title=typeof data.title==="string"?data.title.trim():"",imageUrl=typeof data.imageUrl==="string"?data.imageUrl.trim():"";
  const detailText=typeof data.detailText==="string"?data.detailText.trim():"";
  const externalUrl=typeof data.externalUrl==="string"?data.externalUrl.trim():"";
  const destination=data.destination;
  const startsAt=typeof data.startsAt==="string"?data.startsAt:"",endsAt=typeof data.endsAt==="string"?data.endsAt:"";
  if(!title||title.length>120||!imageUrl||imageUrl.length>2048||detailText.length>10000||!(["none","detail","external"] as unknown[]).includes(destination))throw new BannerValidationError("タイトル・画像・遷移先を確認してください。");
  function safeUrl(raw:string){try{const url=new URL(raw);return url.protocol==="https:"&&!url.username&&!url.password;}catch{return false;}}
  if(!safeUrl(imageUrl)||destination==="external"&&!safeUrl(externalUrl)||destination==="detail"&&!detailText)throw new BannerValidationError("画像URL・リンク先・詳細文を確認してください。");
  const start=Date.parse(startsAt),end=Date.parse(endsAt);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end)throw new BannerValidationError("掲載期間を確認してください。");
  return {title,imageUrl,detailText,externalUrl:destination==="external"?externalUrl:"",destination:destination as EventBanner["destination"],startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),published:data.published===true};
}

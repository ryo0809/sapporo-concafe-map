import type { Cafe } from "@/domain/cafes/cafe";

export type BusinessStatus = "unknown" | "operating" | "temporarily_closed" | "closed" | "moved";
export interface CafeInput {
  name: string; address: string; area: "tanukikoji" | "susukino"; category: "concept" | "maid" | "unknown";
  buildingName: string; floor: string; location: { latitude: number; longitude: number } | null;
  businessStatus: BusinessStatus; publicationStatus: "draft" | "published" | "hidden" | "scheduled";
  publishAt?: string; officialUrl?: string;
  sourceUrl: string; socialUrls: string[]; fetchedAt?: string; verifiedOn: string; coordinateSource: string;
}
export type ManagedCafe = CafeInput & Pick<Cafe,"id"|"locationGroup"> & { version: number; createdAt: string; updatedAt: string; };
export class InputError extends Error {}
export function validateCafeInput(value: unknown): CafeInput {
  if (!value || typeof value!=="object" || Array.isArray(value)) throw new InputError("店舗情報が不正です");
  const data=value as Record<string,unknown>;
  const text=(key:string,required=false,max=500)=>{
    if (typeof data[key]!=="string") throw new InputError(`${key}の形式が不正です`);
    const result=(data[key] as string).trim();
    if ((required&&!result)||result.length>max) throw new InputError(`${key}の入力を確認してください`);
    return result;
  };
  const enumValue=<T extends string>(key:string,options:readonly T[]):T=>{
    if (!options.includes(data[key] as T)) throw new InputError(`${key}の選択が不正です`);
    return data[key] as T;
  };
  const safeUrl=(url:string)=>{ if(url){try{if(!["https:","http:"].includes(new URL(url).protocol))throw new Error();}catch{throw new InputError("URLはhttpまたはhttpsで入力してください");}} return url; };
  const name=text("name",true,160),address=text("address",true,500);
  const area=enumValue("area",["tanukikoji","susukino"] as const),category=enumValue("category",["concept","maid","unknown"] as const);
  let location=null;
  if(data.location!==null){
    if(!data.location||typeof data.location!=="object")throw new InputError("緯度・経度を両方入力してください");
    const point=data.location as Record<string,unknown>;
    if(typeof point.latitude!=="number"||!Number.isFinite(point.latitude)||point.latitude < -90||point.latitude >90||
       typeof point.longitude!=="number"||!Number.isFinite(point.longitude)||point.longitude < -180||point.longitude>180)throw new InputError("緯度・経度が不正です");
    location={latitude:point.latitude,longitude:point.longitude};
  }
  if(!Array.isArray(data.socialUrls)||data.socialUrls.length>20||data.socialUrls.some((url)=>typeof url!=="string"||url.length>2000))throw new InputError("SNS URLの入力を確認してください");
  const verifiedOn=text("verifiedOn",false,10);
  if(verifiedOn&&(!/^\d{4}-\d{2}-\d{2}$/.test(verifiedOn)||!Number.isFinite(Date.parse(verifiedOn))||new Date(verifiedOn).toISOString().slice(0,10)!==verifiedOn))throw new InputError("情報確認日が不正です");
  const fetchedAt=typeof data.fetchedAt==="string"&&data.fetchedAt ? data.fetchedAt : undefined;
  if(fetchedAt&&!Number.isFinite(Date.parse(fetchedAt)))throw new InputError("取得日時が不正です");
  const publicationStatus=enumValue("publicationStatus",["draft","published","hidden","scheduled"] as const);
  let publishAt: string | undefined;
  if(publicationStatus==="scheduled"){
    if(typeof data.publishAt!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(data.publishAt)||!Number.isFinite(Date.parse(data.publishAt)))throw new InputError("予約公開日時を入力してください");
    const day=data.publishAt.slice(0,10);
    if(new Date(`${day}T00:00:00Z`).toISOString().slice(0,10)!==day)throw new InputError("予約公開日時が不正です");
    publishAt=new Date(data.publishAt).toISOString();
  }
  const officialUrl=data.officialUrl===undefined?"":safeUrl(text("officialUrl",false,2000));
  return {name,address,area,category,location,buildingName:text("buildingName",false,200),floor:text("floor",false,40),
    businessStatus:enumValue("businessStatus",["unknown","operating","temporarily_closed","closed","moved"] as const),
    publicationStatus,publishAt,officialUrl,
    sourceUrl:safeUrl(text("sourceUrl",false,2000)),socialUrls:data.socialUrls.map((url)=>safeUrl((url as string).trim())).filter(Boolean),
    fetchedAt,verifiedOn,coordinateSource:text("coordinateSource",false,500)};
}

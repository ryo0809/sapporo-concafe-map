import "server-only";
import { cookies } from "next/headers";
import { createAuthentication } from "@/composition/admin";
import { InputError } from "@/domain/admin/managed-cafe";
import { unstable_rethrow } from "next/navigation";
export const sessionCookie="sapporo_admin_session";
export class AccessError extends Error { constructor(public readonly status:number,message:string){super(message);} }
export async function administrator(){
  return createAuthentication().session((await cookies()).get(sessionCookie)?.value ?? "");
}
export async function requireAdministrator(){
  const admin=await administrator(); if(!admin)throw new AccessError(401,"ログインしてください");return admin;
}
export function checkOrigin(request:Request){
  const origin=request.headers.get("origin");
  // Next.js may normalize the internal URL to localhost even when the browser uses 127.0.0.1.
  // The Host header retains the authority the browser actually requested.
  if(origin){
    const url=new URL(request.url);
    let sender:URL;
    try{sender=new URL(origin);}catch{throw new AccessError(403,"許可されていない送信元です");}
    if(sender.host!==(request.headers.get("host") ?? url.host)||sender.protocol!==url.protocol){
      throw new AccessError(403,"許可されていない送信元です");
    }
  }
  if(request.headers.get("sec-fetch-site")==="cross-site")throw new AccessError(403,"許可されていない送信元です");
}
export async function readJson(request:Request){
  checkOrigin(request);
  if(!request.headers.get("content-type")?.includes("application/json"))throw new AccessError(415,"JSONで送信してください");
  const text=await request.text(); if(text.length>65536)throw new AccessError(413,"送信データが大きすぎます");
  try{return JSON.parse(text);}catch{throw new InputError("JSONが不正です");}
}
export function apiError(error:unknown){
  unstable_rethrow(error);
  if(error instanceof AccessError)return Response.json({error:error.message},{status:error.status});
  if(error instanceof InputError)return Response.json({error:error.message},{status:400});
  if(error&&typeof error==="object"&&"code"in error){
    if(error.code==="NOT_FOUND")return Response.json({error:"店舗は削除済みか、存在しません。"},{status:404});
    if(error.code==="CONFLICT")return Response.json({error:"別の更新が行われました。読み込み直してください。"},{status:409});
    if(error.code==="RATE_LIMIT")return Response.json({error:"ログインの試行回数を超えました。15分後に再試行してください。"},{status:429});
  }
  console.error(error);return Response.json({error:"処理に失敗しました。もう一度お試しください。"},{status:500});
}

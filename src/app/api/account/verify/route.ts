import { cookies } from "next/headers";
import { AccessError, apiError, readJson } from "@/infrastructure/admin/http-session";
import { getD1 } from "@/infrastructure/database/d1";
import { makeToken, hashToken, memberCookie } from "@/infrastructure/members/session";

export async function POST(request:Request) {
  try {
    const input=await readJson(request), token=input.token;
    if(typeof token!=="string"||!/^[a-f0-9]{64}$/.test(token))throw new AccessError(400,"リンクを確認してください。");
    const db=await getD1(),now=Date.now();
    const record=await db.prepare("DELETE FROM member_login_tokens WHERE token_hash=? AND expires_at>? RETURNING email").bind(hashToken(token),now).first<{email:string}>();
    if(!record)throw new AccessError(400,"リンクの有効期限が切れたか、使用済みです。");
    const id=crypto.randomUUID();
    await db.prepare("INSERT INTO members(id,email,created_at) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING").bind(id,record.email,new Date(now).toISOString()).run();
    const member=await db.prepare("SELECT id FROM members WHERE email=?").bind(record.email).first<{id:string}>();
    if(!member)throw new Error("会員を作成できませんでした");
    const session=makeToken();
    await db.prepare("INSERT INTO member_sessions(token_hash,member_id,expires_at) VALUES(?,?,?)").bind(hashToken(session),member.id,now+30*86400000).run();
    (await cookies()).set(memberCookie,session,{httpOnly:true,sameSite:"lax",secure:process.env.SESSION_COOKIE_SECURE==="true"||new URL(request.url).protocol==="https:",path:"/",maxAge:30*86400});
    return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return apiError(error);}
}

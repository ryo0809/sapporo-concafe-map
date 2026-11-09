import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getD1 } from "@/infrastructure/database/d1";

export const memberCookie = "sapporo_member_session";
export const makeToken = () => randomBytes(32).toString("hex");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function currentMember() {
  const token = (await cookies()).get(memberCookie)?.value ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return (await getD1()).prepare("SELECT m.id,m.email,m.nickname FROM member_sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>?").bind(hashToken(token), Date.now()).first<{id:string;email:string;nickname:string}>();
}

export async function createMemberSession(request:Request,db:D1Database,memberId:string) {
  const token=makeToken();
  await db.prepare("INSERT INTO member_sessions(token_hash,member_id,expires_at) VALUES(?,?,?)").bind(hashToken(token),memberId,Date.now()+30*86400000).run();
  (await cookies()).set(memberCookie,token,{httpOnly:true,sameSite:"lax",secure:process.env.SESSION_COOKIE_SECURE==="true"||new URL(request.url).protocol==="https:",path:"/",maxAge:30*86400});
}

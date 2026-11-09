import { AccessError, readJson } from "@/infrastructure/admin/http-session";
import { normalizeMemberEmail, validateSixDigitCode } from "@/domain/members/credentials";
import { getD1 } from "@/infrastructure/database/d1";
import { consumeAccountIpLimit, consumeEmailCode } from "@/infrastructure/members/email-codes";
import { createMemberSession } from "@/infrastructure/members/session";
import { memberApiError } from "@/infrastructure/members/api-error";

export async function POST(request:Request) {
  try {
    const input=await readJson(request),email=normalizeMemberEmail(input?.email),code=validateSixDigitCode(input?.code);
    const db=await getD1();
    await consumeAccountIpLimit(request,db,Date.now());
    const challenge=await consumeEmailCode(db,email,"register",code);
    const now=new Date().toISOString();
    const member=await db.prepare("INSERT INTO members(id,email,created_at,nickname,password_hash,email_verified_at) VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET nickname=excluded.nickname,password_hash=excluded.password_hash,email_verified_at=excluded.email_verified_at WHERE members.password_hash='' RETURNING id,email,nickname")
      .bind(crypto.randomUUID(),email,now,challenge.nickname,challenge.password_hash,now).first<{id:string;email:string;nickname:string}>();
    if(!member)throw new AccessError(409,"登録済みです。ログインしてください。");
    await db.prepare("DELETE FROM member_password_attempts WHERE email=?").bind(email).run();
    await db.prepare("DELETE FROM member_sessions WHERE member_id=?").bind(member.id).run();
    await createMemberSession(request,db,member.id);
    return Response.json({member},{headers:{"Cache-Control":"no-store"}});
  } catch(error) { return memberApiError(error); }
}

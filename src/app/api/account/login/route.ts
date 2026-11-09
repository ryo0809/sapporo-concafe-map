import { AccessError, readJson } from "@/infrastructure/admin/http-session";
import { normalizeMemberEmail } from "@/domain/members/credentials";
import { getD1 } from "@/infrastructure/database/d1";
import { createMemberSession } from "@/infrastructure/members/session";
import { dummyMemberPasswordHash, verifyMemberPassword } from "@/infrastructure/members/password";
import { consumeAccountIpLimit } from "@/infrastructure/members/email-codes";
import { memberApiError } from "@/infrastructure/members/api-error";

export async function POST(request:Request) {
  try {
    const input=await readJson(request);
    const email=normalizeMemberEmail(input?.email),password=input?.password;
    if(typeof password!=="string"||!password||password.length>128||new TextEncoder().encode(password).length>256)throw new AccessError(400,"メールアドレスとパスワードを確認してください。");
    const db=await getD1(),now=Date.now();
    await consumeAccountIpLimit(request,db,now);
    await db.prepare("DELETE FROM member_password_attempts WHERE started_at<?").bind(now-86400000).run();
    const attempts=await db.prepare("SELECT failures,started_at FROM member_password_attempts WHERE email=?").bind(email).first<{failures:number;started_at:number}>();
    if(attempts&&attempts.failures>=5&&now-attempts.started_at<15*60000)throw new AccessError(429,"ログインの試行回数を超えました。15分後に再試行してください。");
    const member=await db.prepare("SELECT id,email,nickname,password_hash FROM members WHERE email=?").bind(email).first<{id:string;email:string;nickname:string;password_hash:string}>();
    const correct=verifyMemberPassword(password,member?.password_hash||dummyMemberPasswordHash);
    if(!member||!member.password_hash||!correct){
      await db.prepare("INSERT INTO member_password_attempts(email,failures,started_at) VALUES(?,1,?) ON CONFLICT(email) DO UPDATE SET failures=CASE WHEN ?-started_at>=900000 THEN 1 ELSE failures+1 END,started_at=CASE WHEN ?-started_at>=900000 THEN ? ELSE started_at END").bind(email,now,now,now,now).run();
      throw new AccessError(401,"メールアドレスまたはパスワードが違います。");
    }
    await db.prepare("DELETE FROM member_password_attempts WHERE email=?").bind(email).run();
    await createMemberSession(request,db,member.id);
    return Response.json({member:{email:member.email,nickname:member.nickname}},{headers:{"Cache-Control":"no-store"}});
  } catch(error) { return memberApiError(error); }
}

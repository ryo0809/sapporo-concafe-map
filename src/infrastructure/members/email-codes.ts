import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { AccessError } from "@/infrastructure/admin/http-session";
import { contactClientIp } from "@/infrastructure/contact/client-ip";
import { hashToken } from "./session";
import { hashMemberPassword, verifyMemberPassword } from "./password";
import { sendEmail } from "@/infrastructure/mail/send-email";

export type CodePurpose = "register" | "reset";
const headers={"Cache-Control":"no-store"};
export const accepted=()=>Response.json({ok:true},{status:202,headers});

export async function consumeAccountIpLimit(request:Request,db:D1Database,now:number) {
  const ip=contactClientIp(request.headers,process.env.NODE_ENV==="development");
  if(!ip)return;
  const key=hashToken(`${Math.floor(now/86400000)}:${ip}`);
  const row=await db.prepare("INSERT INTO member_login_ip_limits(client_key,requests,started_at) VALUES(?,1,?) ON CONFLICT(client_key) DO UPDATE SET requests=CASE WHEN ?-started_at>=3600000 THEN 1 ELSE requests+1 END,started_at=CASE WHEN ?-started_at>=3600000 THEN ? ELSE started_at END RETURNING requests").bind(key,now,now,now,now).first<{requests:number}>();
  if(!row||row.requests>30)throw new AccessError(429,"試行回数が多すぎます。しばらくしてからお試しください。");
}

export async function consumeEmailSendLimit(db:D1Database,email:string,now:number) {
  await db.batch([
    db.prepare("DELETE FROM member_login_limits WHERE sent_at<?").bind(now-86400000),
    db.prepare("DELETE FROM member_login_ip_limits WHERE started_at<?").bind(now-86400000),
    db.prepare("DELETE FROM member_email_codes WHERE expires_at<?").bind(now),
  ]);
  const row=await db.prepare("INSERT INTO member_login_limits(email,sent_at) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET sent_at=excluded.sent_at WHERE sent_at<=? RETURNING sent_at").bind(email,now,now-60000).first();
  return Boolean(row);
}

export async function issueEmailCode(db:D1Database,input:{email:string;purpose:CodePurpose;nickname?:string;passwordHash?:string;now:number}) {
  const id=randomUUID(),code=randomInt(0,1000000).toString().padStart(6,"0"),codeHash=hashMemberPassword(code);
  await db.prepare("INSERT INTO member_email_codes(id,email,purpose,code_hash,nickname,password_hash,expires_at,attempts,sent_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(email,purpose) DO UPDATE SET id=excluded.id,code_hash=excluded.code_hash,nickname=excluded.nickname,password_hash=excluded.password_hash,expires_at=excluded.expires_at,attempts=0,sent_at=excluded.sent_at")
    .bind(id,input.email,input.purpose,codeHash,input.nickname??"",input.passwordHash??"",input.now+10*60000,0,input.now).run();
  try {
    await sendEmail({to:input.email,key:`member-code/${input.purpose}/${id}`,subject:input.purpose==="register"?"コンカフェマップ 会員登録コード":"コンカフェマップ パスワード再設定コード",text:`確認コード: ${code}\n有効期限は10分です。心当たりがなければ、このメールを無視してください。`});
  } catch(error) {
    await db.batch([
      db.prepare("DELETE FROM member_email_codes WHERE id=?").bind(id),
      db.prepare("DELETE FROM member_login_limits WHERE email=? AND sent_at=?").bind(input.email,input.now),
    ]);
    throw error;
  }
}

export async function consumeEmailCode(db:D1Database,email:string,purpose:CodePurpose,code:string,now=Date.now()) {
  const row=await db.prepare("UPDATE member_email_codes SET attempts=attempts+1 WHERE email=? AND purpose=? AND expires_at>? AND attempts<5 RETURNING id,code_hash,nickname,password_hash")
    .bind(email,purpose,now).first<{id:string;code_hash:string;nickname:string;password_hash:string}>();
  if(!row||!verifyMemberPassword(code,row.code_hash))throw new AccessError(400,"確認コードが無効か期限切れです。");
  const consumed=await db.prepare("DELETE FROM member_email_codes WHERE id=? AND email=? AND purpose=? RETURNING id").bind(row.id,email,purpose).first();
  if(!consumed)throw new AccessError(400,"確認コードが無効か期限切れです。");
  return row;
}

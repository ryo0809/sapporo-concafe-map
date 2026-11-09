import { AccessError, readJson } from "@/infrastructure/admin/http-session";
import { validateRegistration } from "@/domain/members/credentials";
import { getD1 } from "@/infrastructure/database/d1";
import { hashMemberPassword } from "@/infrastructure/members/password";
import { accepted, consumeAccountIpLimit, consumeEmailSendLimit, issueEmailCode } from "@/infrastructure/members/email-codes";
import { memberApiError } from "@/infrastructure/members/api-error";

export async function POST(request:Request) {
  try {
    const input=validateRegistration(await readJson(request));
    const db=await getD1(),now=Date.now();
    await consumeAccountIpLimit(request,db,now);
    const existing=await db.prepare("SELECT password_hash FROM members WHERE email=?").bind(input.email).first<{password_hash:string}>();
    if(existing?.password_hash)throw new AccessError(409,"このメールアドレスは登録済みです。ログインまたはパスワード再設定をお試しください。");
    if(!await consumeEmailSendLimit(db,input.email,now))throw new AccessError(429,"確認コードの送信は1分後に再試行してください。");
    await issueEmailCode(db,{email:input.email,purpose:"register",nickname:input.nickname,passwordHash:hashMemberPassword(input.password),now});
    return accepted();
  } catch(error) { return memberApiError(error); }
}

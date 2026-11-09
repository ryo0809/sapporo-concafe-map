import { AccessError, readJson } from "@/infrastructure/admin/http-session";
import { normalizeMemberEmail, validateNewPassword, validateSixDigitCode } from "@/domain/members/credentials";
import { getD1 } from "@/infrastructure/database/d1";
import { hashMemberPassword } from "@/infrastructure/members/password";
import { consumeAccountIpLimit, consumeEmailCode } from "@/infrastructure/members/email-codes";
import { memberApiError } from "@/infrastructure/members/api-error";

export async function POST(request:Request) {
  try {
    const input=await readJson(request),email=normalizeMemberEmail(input?.email),code=validateSixDigitCode(input?.code),password=validateNewPassword(input);
    const db=await getD1();
    await consumeAccountIpLimit(request,db,Date.now());
    await consumeEmailCode(db,email,"reset",code);
    const member=await db.prepare("UPDATE members SET password_hash=? WHERE email=? RETURNING id").bind(hashMemberPassword(password),email).first<{id:string}>();
    if(!member)throw new AccessError(404,"このメールアドレスは未登録です。会員登録からお試しください。");
    await db.prepare("DELETE FROM member_password_attempts WHERE email=?").bind(email).run();
    await db.prepare("DELETE FROM member_sessions WHERE member_id=?").bind(member.id).run();
    return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  } catch(error) { return memberApiError(error); }
}

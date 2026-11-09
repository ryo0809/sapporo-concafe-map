import { readJson } from "@/infrastructure/admin/http-session";
import { normalizeMemberEmail } from "@/domain/members/credentials";
import { getD1 } from "@/infrastructure/database/d1";
import { accepted, consumeAccountIpLimit, consumeEmailSendLimit, issueEmailCode } from "@/infrastructure/members/email-codes";
import { memberApiError } from "@/infrastructure/members/api-error";

export async function POST(request:Request) {
  try {
    const input=await readJson(request),email=normalizeMemberEmail(input?.email);
    const db=await getD1(),now=Date.now();
    await consumeAccountIpLimit(request,db,now);
    if(!await consumeEmailSendLimit(db,email,now))return accepted();
    const member=await db.prepare("SELECT id FROM members WHERE email=?").bind(email).first();
    if(member)await issueEmailCode(db,{email,purpose:"reset",now});
    return accepted();
  } catch(error) { return memberApiError(error); }
}

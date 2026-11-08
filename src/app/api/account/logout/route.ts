import { cookies } from "next/headers";
import { checkOrigin, apiError } from "@/infrastructure/admin/http-session";
import { getD1 } from "@/infrastructure/database/d1";
import { hashToken, memberCookie } from "@/infrastructure/members/session";
export async function POST(request:Request){
  try{
    checkOrigin(request);
    const jar=await cookies(),token=jar.get(memberCookie)?.value;
    if(token&&/^[a-f0-9]{64}$/.test(token))await(await getD1()).prepare("DELETE FROM member_sessions WHERE token_hash=?").bind(hashToken(token)).run();
    jar.delete(memberCookie);
    return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return apiError(error);}
}

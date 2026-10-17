import { cookies } from "next/headers";
import { createAuthentication } from "@/composition/admin";
import { checkOrigin,apiError,sessionCookie } from "@/infrastructure/admin/http-session";
export async function POST(request:Request){
  try{checkOrigin(request);const store=await cookies();await createAuthentication().logout(store.get(sessionCookie)?.value??"");store.set(sessionCookie,"",{httpOnly:true,sameSite:"strict",secure:process.env.SESSION_COOKIE_SECURE==="true",path:"/",maxAge:0});return Response.json({ok:true});}
  catch(error){return apiError(error);}
}

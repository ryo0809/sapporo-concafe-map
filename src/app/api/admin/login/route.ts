import { cookies } from "next/headers";
import { createAuthentication } from "@/composition/admin";
import { readJson,apiError,sessionCookie } from "@/infrastructure/admin/http-session";
export async function POST(request:Request){
  try{
    const data=await readJson(request);
    const result=await createAuthentication().login(data?.username,data?.password);
    if(!result)return Response.json({error:"ユーザー名またはパスワードが違います"},{status:401});
    (await cookies()).set(sessionCookie,result.token,{httpOnly:true,sameSite:"strict",secure:process.env.SESSION_COOKIE_SECURE==="true"||new URL(request.url).protocol==="https:",path:"/",maxAge:86400});
    return Response.json({administrator:result.administrator},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return apiError(error);}
}

import {getD1} from "@/infrastructure/database/d1";
import {healthCheck} from "../../../../worker/fast-path.mjs";
export async function GET(){
  try{
    const db=await getD1();
    await healthCheck(db);
    return Response.json({status:"ok"},{headers:{"Cache-Control":"no-store"}});
  }catch{
    return Response.json({status:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}

import {getD1} from "@/infrastructure/database/d1";
export async function GET(){
  try{
    const db=await getD1();
    await db.prepare("SELECT id,publish_at,deleted_at FROM cafes LIMIT 1").all();
    await db.prepare("SELECT id,address,latitude,longitude,version FROM buildings LIMIT 1").all();
    await db.prepare("SELECT admin_id FROM admin_search_limits LIMIT 1").all();
    await db.prepare("SELECT id,details_json,ip_address FROM contact_messages LIMIT 1").all();
    await db.prepare("SELECT client_key FROM contact_rate_limits LIMIT 1").all();
    return Response.json({status:"ok"},{headers:{"Cache-Control":"no-store"}});
  }catch{
    return Response.json({status:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}

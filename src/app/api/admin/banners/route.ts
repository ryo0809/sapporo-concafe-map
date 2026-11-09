import { requireAdministrator, readJson, apiError, AccessError } from "@/infrastructure/admin/http-session";
import { getD1 } from "@/infrastructure/database/d1";
import { validateBanner, BannerValidationError } from "@/domain/events/banner";
export async function GET(){try{await requireAdministrator();const rows=await(await getD1()).prepare("SELECT * FROM event_banners ORDER BY starts_at DESC LIMIT 100").all();return Response.json({banners:rows.results},{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}}
export async function POST(request:Request){
  try{await requireAdministrator();const data=validateBanner(await readJson(request));const db=await getD1(),id=crypto.randomUUID(),now=new Date().toISOString();
    await db.prepare("INSERT INTO event_banners(id,title,image_url,starts_at,ends_at,destination,external_url,detail_text,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(id,data.title,data.imageUrl,data.startsAt,data.endsAt,data.destination,data.externalUrl,data.detailText,Number(data.published),now,now).run();
    return Response.json({id},{status:201});
  }catch(error){return apiError(error instanceof BannerValidationError?new AccessError(400,error.message):error);}
}

import { requireAdministrator, readJson, apiError, AccessError } from "@/infrastructure/admin/http-session";
import { getD1 } from "@/infrastructure/database/d1";
import { validateBanner, BannerValidationError } from "@/domain/events/banner";
type Context={params:Promise<{id:string}>};
export async function PUT(request:Request,{params}:Context){
  try{await requireAdministrator();const data=validateBanner(await readJson(request)),{id}=await params;
    const result=await(await getD1()).prepare("UPDATE event_banners SET title=?,image_url=?,starts_at=?,ends_at=?,destination=?,external_url=?,detail_text=?,published=?,updated_at=? WHERE id=?").bind(data.title,data.imageUrl,data.startsAt,data.endsAt,data.destination,data.externalUrl,data.detailText,Number(data.published),new Date().toISOString(),id).run();
    if(!result.meta.changes)throw new AccessError(404,"イベントが見つかりません。");return Response.json({ok:true});
  }catch(error){return apiError(error instanceof BannerValidationError?new AccessError(400,error.message):error);}
}
export async function DELETE(request:Request,{params}:Context){
  try{await requireAdministrator();const {checkOrigin}=await import("@/infrastructure/admin/http-session");checkOrigin(request);const {id}=await params;await(await getD1()).prepare("DELETE FROM event_banners WHERE id=?").bind(id).run();return Response.json({ok:true});}catch(error){return apiError(error);}
}

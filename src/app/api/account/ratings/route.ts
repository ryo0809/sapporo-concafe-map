import { AccessError, apiError, readJson } from "@/infrastructure/admin/http-session";
import { getD1 } from "@/infrastructure/database/d1";
import { currentMember } from "@/infrastructure/members/session";
const headers={"Cache-Control":"private, no-store"};
export async function GET(){
  try{
    const member=await currentMember();if(!member)throw new AccessError(401,"ログインしてください。");
    const rows=await(await getD1()).prepare("SELECT r.cafe_id,r.rating,r.note,r.updated_at FROM private_cafe_ratings r JOIN cafes c ON c.id=r.cafe_id WHERE r.member_id=? AND c.publication_status='published' AND c.business_status NOT IN ('closed','moved')").bind(member.id).all();
    return Response.json({ratings:rows.results},{headers});
  }catch(error){return apiError(error);}
}
export async function PUT(request:Request){
  try{
    const member=await currentMember();if(!member)throw new AccessError(401,"ログインしてください。");
    const data=await readJson(request);
    if(typeof data.cafeId!=="string"||data.cafeId.length>100||!Number.isInteger(data.rating)||data.rating<1||data.rating>5||typeof data.note!=="string"||data.note.length>1000)throw new AccessError(400,"評価を確認してください。");
    const db=await getD1();
    const cafe=await db.prepare("SELECT id FROM cafes WHERE id=? AND publication_status='published' AND business_status NOT IN ('closed','moved')").bind(data.cafeId).first();
    if(!cafe)throw new AccessError(404,"店舗が見つかりません。");
    const updatedAt=new Date().toISOString();
    await db.prepare("INSERT INTO private_cafe_ratings(member_id,cafe_id,rating,note,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(member_id,cafe_id) DO UPDATE SET rating=excluded.rating,note=excluded.note,updated_at=excluded.updated_at").bind(member.id,data.cafeId,data.rating,data.note.trim(),updatedAt).run();
    return Response.json({rating:{cafe_id:data.cafeId,rating:data.rating,note:data.note.trim(),updated_at:updatedAt}},{headers});
  }catch(error){return apiError(error);}
}

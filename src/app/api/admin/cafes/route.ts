import { createManagement } from "@/composition/admin";
import { requireAdministrator,readJson,apiError } from "@/infrastructure/admin/http-session";
export async function GET(){
  try{await requireAdministrator();return Response.json({cafes:await createManagement().list()},{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}
}
export async function POST(request:Request){
  try{const admin=await requireAdministrator();const data=await readJson(request);return Response.json({cafe:await createManagement().save(data,admin.id)},{status:201});}catch(error){return apiError(error);}
}

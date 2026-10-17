import { createManagement } from "@/composition/admin";
import { requireAdministrator,readJson,apiError } from "@/infrastructure/admin/http-session";
export async function PUT(request:Request,context:{params:Promise<{id:string}>}){
  try{const admin=await requireAdministrator();const {id}=await context.params;const data=await readJson(request);return Response.json({cafe:await createManagement().save(data,admin.id,id,data.version)});}catch(error){return apiError(error);}
}
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){
  try{
    const admin=await requireAdministrator();
    const {id}=await context.params;
    const data=await readJson(request);
    await createManagement().remove(id,admin.id,data?.version);
    return Response.json({deleted:true});
  }catch(error){return apiError(error);}
}

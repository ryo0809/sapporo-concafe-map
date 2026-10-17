import {requireAdministrator,readJson,apiError} from "@/infrastructure/admin/http-session";
import {D1BuildingStore} from "@/infrastructure/database/d1-building-store";
export async function PUT(request:Request,context:{params:Promise<{id:string}>}){try{await requireAdministrator();const {id}=await context.params;return Response.json({building:await new D1BuildingStore().save(await readJson(request),id)});}catch(error){return apiError(error);}}

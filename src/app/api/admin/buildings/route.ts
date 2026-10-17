import {requireAdministrator,readJson,apiError} from "@/infrastructure/admin/http-session";
import {D1BuildingStore} from "@/infrastructure/database/d1-building-store";
export async function GET(){try{await requireAdministrator();return Response.json({buildings:await new D1BuildingStore().list()},{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}}
export async function POST(request:Request){try{await requireAdministrator();return Response.json({building:await new D1BuildingStore().save(await readJson(request))},{status:201});}catch(error){return apiError(error);}}

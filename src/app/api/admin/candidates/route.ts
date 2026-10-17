import { createCandidateSearch } from "@/composition/admin";
import { requireAdministrator,apiError } from "@/infrastructure/admin/http-session";
export async function GET(request:Request){
  try{await requireAdministrator();const url=new URL(request.url);return Response.json(await createCandidateSearch().search(url.searchParams.get("q")??"",url.searchParams.get("area")??"all",url.searchParams.get("live")!=="false"),{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}
}

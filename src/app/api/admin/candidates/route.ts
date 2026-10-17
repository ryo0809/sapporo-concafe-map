import { createCandidateSearch } from "@/composition/admin";
import { requireAdministrator,apiError } from "@/infrastructure/admin/http-session";
import {D1SearchRateLimiter} from "@/infrastructure/admin/search-rate-limiter";
import {getD1} from "@/infrastructure/database/d1";
export async function GET(request:Request){
  try{const admin=await requireAdministrator();const url=new URL(request.url);const live=url.searchParams.get("live")!=="false";if(live)await new D1SearchRateLimiter(getD1).consume(admin.id);return Response.json(await createCandidateSearch().search(url.searchParams.get("q")??"",url.searchParams.get("area")??"all",live),{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}
}

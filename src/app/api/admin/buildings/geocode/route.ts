import {getCloudflareContext} from "@opennextjs/cloudflare";
import {requireAdministrator,readJson,apiError} from "@/infrastructure/admin/http-session";
import {geocodeAddress} from "@/infrastructure/admin/google-geocoding";

export async function POST(request:Request){
  try{
    await requireAdministrator();
    const input=await readJson(request);
    const {env}=await getCloudflareContext({async:true});
    const key=(env as unknown as {GOOGLE_MAPS_GEOCODING_API_KEY?:string}).GOOGLE_MAPS_GEOCODING_API_KEY??process.env.GOOGLE_MAPS_GEOCODING_API_KEY;
    return Response.json(await geocodeAddress(input?.address,key),{headers:{"Cache-Control":"no-store"}});
  }catch(error){return apiError(error);}
}

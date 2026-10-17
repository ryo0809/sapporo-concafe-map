export function httpsRedirect(request){
  const url=new URL(request.url);
  // Cloudflare overwrites this header with the visitor's actual protocol.
  const protocol=request.headers.get("x-forwarded-proto")??url.protocol.slice(0,-1);
  if((request.headers.get("host")??url.host)!=="sapporo-concafe-map.com"||protocol!=="http")return null;
  url.host="sapporo-concafe-map.com";
  url.protocol="https:";
  return Response.redirect(url.href,308);
}

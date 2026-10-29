const protectedRoutes=[
  [/^\/api\/admin\/cafes$/,['GET','POST']],
  [/^\/api\/admin\/cafes\/[^/]+$/,['PUT','DELETE']],
  [/^\/api\/admin\/buildings$/,['GET','POST']],
  [/^\/api\/admin\/buildings\/geocode$/,['POST']],
  [/^\/api\/admin\/buildings\/(?!geocode$)[^/]+$/,['PUT','DELETE']],
  [/^\/api\/admin\/contacts$/,['GET','PATCH','DELETE']],
  [/^\/api\/admin\/candidates$/,['GET']],
];
export function workerHeaders(env,{privateResponse=false}={}){
  const headers=new Headers({
    'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':"frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  });
  if(env.SITE_INDEXABLE==='true')headers.set('Strict-Transport-Security','max-age=31536000');
  else headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  if(privateResponse){headers.set('Cache-Control','private, no-store, max-age=0');headers.set('X-Robots-Tag','noindex, nofollow');}
  return headers;
}
export async function healthCheck(db){
  if(!db)throw Error('D1 binding unavailable');
  await db.batch([
    'SELECT id,publish_at,deleted_at FROM cafes LIMIT 1',
    'SELECT id,address,latitude,longitude,version FROM buildings LIMIT 1',
    'SELECT admin_id FROM admin_search_limits LIMIT 1',
    'SELECT id,details_json,ip_address FROM contact_messages LIMIT 1',
    'SELECT client_key FROM contact_rate_limits LIMIT 1',
  ].map(sql=>db.prepare(sql)));
}
export async function fastResponse(request,env){
  const url=new URL(request.url);
  // Match the canonical-host redirect before serving any native responses.
  if(url.hostname==='www.sapporo-concafe-map.com'){url.hostname='sapporo-concafe-map.com';url.protocol='https:';return Response.redirect(url.href,308);}
  if(url.pathname==='/api/health'&&['GET','HEAD'].includes(request.method)){
    let ok=true;try{await healthCheck(env.DB);}catch{ok=false;}
    const headers=workerHeaders(env,{privateResponse:true});headers.set('Content-Type','application/json');
    return new Response(request.method==='HEAD'?null:JSON.stringify({status:ok?'ok':'unavailable'}),{status:ok?200:503,headers});
  }
  const page=staticRoutes[url.pathname];
  // Flight/prefetch requests and server actions retain the Next.js protocol path.
  if(page&&env.ASSETS&&['GET','HEAD'].includes(request.method)&&!request.headers.has('rsc')&&!request.headers.has('next-router-state-tree')&&!request.headers.has('next-router-prefetch')&&!request.headers.has('next-router-segment-prefetch')&&!request.headers.get('accept')?.includes('text/x-component')&&!url.searchParams.has('_rsc')){
    const assetUrl=new URL(request.url);assetUrl.pathname=`/_worker-static/${env.SITE_INDEXABLE==='true'?'indexable':'noindex'}${url.pathname}`;assetUrl.search='';
    const asset=await env.ASSETS.fetch(new Request(assetUrl,{method:request.method}));
    if(asset.status===200){
      const headers=workerHeaders(env,{privateResponse:page.private});headers.set('Content-Type',page.type);
      if(!page.private)headers.set('Cache-Control','public, max-age=0, must-revalidate');
      return new Response(request.method==='HEAD'?null:asset.body,{status:200,headers});
    }
  }
  if(protectedRoutes.some(([pattern,methods])=>pattern.test(url.pathname)&&methods.includes(request.method))){
    const token=request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith('sapporo_admin_session='))?.slice('sapporo_admin_session='.length);
    // This is only an early rejection. Valid-looking tokens still go through DB auth on every request.
    if(!/^[a-f0-9]{64}$/.test(token??''))return Response.json({error:'ログインしてください'},{status:401,headers:workerHeaders(env,{privateResponse:true})});
  }
  if(env.ASSETS&&['GET','HEAD'].includes(request.method)&&(url.pathname.startsWith('/_next/static/')||url.pathname.startsWith('/icons/'))){
    const response=await env.ASSETS.fetch(request);
    if(response.status===404)return null;
    const headers=new Headers(response.headers);for(const [key,value]of workerHeaders(env))headers.set(key,value);
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
  }
  return null;
}
import {staticRoutes} from './static-routes.mjs';

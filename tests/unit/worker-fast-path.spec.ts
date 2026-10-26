import {expect,test} from "@playwright/test";
import {fastResponse,healthCheck} from "../../worker/fast-path.mjs";
import {DatabaseSync} from "node:sqlite";

test("native paths preserve canonical host and security headers",async()=>{
  const response=await fastResponse(new Request("https://www.sapporo-concafe-map.com/api/health?q=1"),{});
  expect(response?.status).toBe(308);
  expect(response?.headers.get("location")).toBe("https://sapporo-concafe-map.com/api/health?q=1");
  const missing=await fastResponse(new Request("https://example.com/api/health"),{SITE_INDEXABLE:"false"});
  expect(missing?.status).toBe(503);
  expect(missing?.headers.get("cache-control")).toContain("no-store");
  expect(missing?.headers.get("x-robots-tag")).toContain("noindex");
  expect(missing?.headers.get("x-frame-options")).toBe("DENY");
});

test("health checks all schema requirements in one batch and fails closed",async()=>{
  const statements:string[]=[];let batches=0;
  const db={prepare:(sql:string)=>{statements.push(sql);return sql;},batch:async()=>{batches++;}};
  await healthCheck(db);
  expect(batches).toBe(1);expect(statements).toHaveLength(5);
  expect(statements.join()).toContain("deleted_at");expect(statements.join()).toContain("ip_address");
  const r=await fastResponse(new Request("https://example.com/api/health",{method:"HEAD"}),{DB:db});
  expect(r?.status).toBe(200);expect(await r?.text()).toBe("");
  const failed=await fastResponse(new Request("https://example.com/api/health"),{DB:{...db,batch:async()=>{throw Error("schema missing");}}});
  expect(failed?.status).toBe(503);expect(await failed?.json()).toEqual({status:"unavailable"});
});

test("early rejection never authenticates a token or captures login and unknown routes",async()=>{
  for(const [method,path]of [["GET","cafes"],["POST","cafes"],["PUT","cafes/id"],["DELETE","buildings/id"],["PATCH","contacts"],["POST","buildings/geocode"],["GET","candidates"]]){
    const r=await fastResponse(new Request(`https://example.com/api/admin/${path}`,{method}),{});
    expect(r?.status).toBe(401);
    const allowed=await fastResponse(new Request(`https://example.com/api/admin/${path}`,{method,headers:{cookie:`other=value; sapporo_admin_session=${"a".repeat(64)}`}}),{});
    expect(allowed).toBeNull();
  }
  for(const path of ["login","logout","missing"]){
    expect(await fastResponse(new Request(`https://example.com/api/admin/${path}`,{method:"POST"}),{})).toBeNull();
  }
  expect(await fastResponse(new Request("https://example.com/api/admin/buildings/geocode",{method:"PUT"}),{})).toBeNull();
});

test("immutable assets retain content and cache headers while private pages never use ASSETS",async()=>{
  const paths:string[]=[];
  const env={SITE_INDEXABLE:"true",ASSETS:{fetch:async(request:Request)=>{paths.push(new URL(request.url).pathname);return new Response("asset",{headers:{"content-type":"text/javascript","cache-control":"public,max-age=31536000,immutable"}});}}};
  const asset=await fastResponse(new Request("https://example.com/_next/static/app.js"),env);
  expect(await asset?.text()).toBe("asset");expect(asset?.headers.get("cache-control")).toContain("immutable");
  expect(asset?.headers.get("strict-transport-security")).toBe("max-age=31536000");
  for(const path of ["/admin","/api/admin/login"]){expect(await fastResponse(new Request(`https://example.com${path}`),env)).toBeNull();}
  expect(paths).toEqual(["/_next/static/app.js"]);
});

test("native public cafe endpoint excludes private, scheduled and closed stores",async()=>{
  const sqlite=new DatabaseSync(":memory:");
  try{
    sqlite.exec(`CREATE TABLE cafes(id TEXT,name TEXT,area TEXT,category TEXT,address TEXT,building_id TEXT,floor_id TEXT,floor_label TEXT,latitude REAL,longitude REAL,business_status TEXT,official_url TEXT,social_urls TEXT,verified_on TEXT,coordinate_source TEXT,fetched_at TEXT,deleted_at TEXT,publication_status TEXT,publish_at TEXT);
      CREATE TABLE buildings(id TEXT,name TEXT,address TEXT,latitude REAL,longitude REAL);
      CREATE TABLE floors(id TEXT,name TEXT);`);
    sqlite.prepare("INSERT INTO buildings VALUES(?,?,?,?,?)").run("b","Test Building","Sapporo 1",43.05,141.35);
    const insert=sqlite.prepare("INSERT INTO cafes VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    for(const [id,status,business,publishAt,deleted] of [["visible","published","operating",null,null],["no-floor","published","operating",null,null],["hidden","hidden","operating",null,null],["future","published","operating","2999-01-01T00:00:00.000Z",null],["closed","published","closed",null,null],["deleted","published","operating",null,"2026-01-01"]]){
      insert.run(id,id,"susukino","concept","Sapporo 1",id==="visible"?"b":null,null,id==="no-floor"?"":"2F",null,null,business,"",'[]',"2026-10-01","",null,deleted,status,publishAt);
    }
    const db={prepare:(sql:string)=>({bind:(...args:string[])=>({all:async()=>({results:sqlite.prepare(sql).all(...args)})})})};
    const response=await fastResponse(new Request("https://example.com/api/public/cafes"),{DB:db,SITE_INDEXABLE:"true"});
    expect(response?.status).toBe(200);
    expect(response?.headers.get("cache-control")).toContain("no-store");
    expect(await response?.json()).toEqual({cafes:[
      expect.objectContaining({id:"no-floor",floor:""}),
      expect.objectContaining({id:"visible",address:"Sapporo 1",buildingName:"Test Building",floor:"2F",location:{latitude:43.05,longitude:141.35}}),
    ]});
    expect((await fastResponse(new Request("https://example.com/api/public/cafes"),{}))?.status).toBe(503);
  }finally{sqlite.close();}
});

test("prerendered responses use environment-specific files, with Flight and private cache rules preserved",async()=>{
  const paths:string[]=[];
  const env={SITE_INDEXABLE:"false",ASSETS:{fetch:async(request:Request)=>{paths.push(new URL(request.url).pathname);return new Response("<html>same build output</html>");}}};
  const r=await fastResponse(new Request("https://example.com/privacy?from=footer"),env);
  expect(await r?.text()).toContain("same build output");expect(r?.headers.get("content-type")).toContain("text/html");
  expect(paths).toEqual(["/_worker-static/noindex/privacy"]);
  for(const key of ["rsc","next-router-prefetch","next-router-state-tree","next-router-segment-prefetch"]){
    expect(await fastResponse(new Request("https://example.com/privacy",{headers:{[key]:"1"}}),env)).toBeNull();
  }
  expect(await fastResponse(new Request("https://example.com/privacy?_rsc=1"),env)).toBeNull();
  expect(await fastResponse(new Request("https://example.com/privacy",{headers:{accept:"text/x-component"}}),env)).toBeNull();
  const login=await fastResponse(new Request("https://example.com/admin/login"),env);
  expect(login?.headers.get("cache-control")).toContain("no-store");
  expect(login?.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  const home=await fastResponse(new Request("https://example.com/"),env);
  expect(home?.status).toBe(200);
  expect(paths).toContain("/_worker-static/noindex/index.html");
  expect(await fastResponse(new Request("https://example.com/",{headers:{rsc:"1"}}),env)).toBeNull();
  expect(await fastResponse(new Request("https://example.com/privacy"),{ASSETS:{fetch:async()=>new Response(null,{status:404})}})).toBeNull();
});

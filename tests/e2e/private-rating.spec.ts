import {expect,test} from "@playwright/test";
import {getPlatformProxy} from "wrangler";
import {createHash,randomBytes,randomUUID} from "node:crypto";
import path from "node:path";

test("店舗評価はログイン中の本人だけが取得できる",async({page,playwright})=>{
  const persist=process.env.PLAYWRIGHT_D1_PATH;
  expect(persist,"PLAYWRIGHT_D1_PATH を設定してください").toBeTruthy();
  const proxy=await getPlatformProxy<{DB:D1Database}>({persist:{path:path.join(persist!,"v3")}});
  const db=proxy.env.DB,memberB=randomUUID(),tokenA=randomBytes(32).toString("hex"),tokenB=randomBytes(32).toString("hex"),email=`${randomUUID()}@example.com`;
  const hash=(token:string)=>createHash("sha256").update(token).digest("hex");
  let cafeId="",previous:Record<string,unknown>|null=null,memberA="";
  try{
    expect((await page.request.post("/api/admin/login",{data:{username:"admin",password:"admin"}})).ok()).toBe(true);
    const cafes=(await(await page.request.get("/api/admin/cafes")).json()).cafes;
    previous=cafes[0];cafeId=String(previous!.id);
    expect((await page.request.put(`/api/admin/cafes/${cafeId}`,{data:{...previous,publicationStatus:"published"}})).ok()).toBe(true);
    const now=new Date().toISOString(),expires=Date.now()+3600000;
    await db.prepare("INSERT INTO member_login_tokens(token_hash,email,expires_at) VALUES(?,?,?)").bind(hash(tokenA),email,expires).run();
    await db.prepare("INSERT INTO members(id,email,created_at) VALUES(?,?,?)").bind(memberB,`${memberB}@example.com`,now).run();
    await db.prepare("INSERT INTO member_sessions(token_hash,member_id,expires_at) VALUES(?,?,?)").bind(hash(tokenB),memberB,expires).run();
    const anonymous=await playwright.request.newContext({baseURL:"http://127.0.0.1:3100"});
    try{expect((await anonymous.get("/api/account/ratings")).status()).toBe(401);}finally{await anonymous.dispose();}
    expect((await page.request.post("/api/account/verify",{data:{token:tokenA}})).ok()).toBe(true);
    expect((await page.request.post("/api/account/verify",{data:{token:tokenA}})).status()).toBe(400);
    memberA=(await db.prepare("SELECT id FROM members WHERE email=?").bind(email).first<{id:string}>())!.id;
    expect((await page.request.put("/api/account/ratings",{data:{cafeId,rating:5,note:"自分だけの記録"}})).ok()).toBe(true);
    const own=await(await page.request.get("/api/account/ratings")).json();
    expect(own.ratings).toContainEqual(expect.objectContaining({cafe_id:cafeId,rating:5,note:"自分だけの記録"}));
    await page.context().addCookies([{name:"sapporo_member_session",value:tokenB,url:"http://127.0.0.1:3100"}]);
    const other=await(await page.request.get("/api/account/ratings")).json();
    expect(other.ratings).not.toContainEqual(expect.objectContaining({cafe_id:cafeId}));
  }finally{
    if(previous){const latest=(await(await page.request.get("/api/admin/cafes")).json()).cafes.find((item:{id:string})=>item.id===cafeId);if(latest)await page.request.put(`/api/admin/cafes/${cafeId}`,{data:{...latest,publicationStatus:previous.publicationStatus}});}
    await db.prepare("DELETE FROM members WHERE id IN (?,?)").bind(memberA,memberB).run();
    await proxy.dispose();
  }
});

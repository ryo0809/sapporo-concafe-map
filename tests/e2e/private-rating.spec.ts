import {expect,test} from "@playwright/test";
import {getPlatformProxy} from "wrangler";
import {createHash,randomBytes,randomUUID,scryptSync} from "node:crypto";
import path from "node:path";

const baseURL="http://127.0.0.1:3100";
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
function passwordHash(password:string){const salt=randomBytes(16).toString("hex");return `scrypt$32768$8$3$${salt}$${scryptSync(password,Buffer.from(salt,"hex"),64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString("hex")}`;}
async function proxyForTest(){const persist=process.env.PLAYWRIGHT_D1_PATH;expect(persist,"PLAYWRIGHT_D1_PATH を設定してください").toBeTruthy();return getPlatformProxy<{DB:D1Database}>({persist:{path:path.join(persist!,"v3")}});}

test("パスワードでログインし、店舗評価は本人だけが取得できる",async({page,playwright})=>{
  const proxy=await proxyForTest(),db=proxy.env.DB;
  const memberA=randomUUID(),memberB=randomUUID(),email=`${memberA}@example.com`,unregisteredEmail=`${randomUUID()}@example.com`,password="my strong passphrase 2026",tokenB=randomBytes(32).toString("hex");
  let cafeId="",previous:Record<string,unknown>|null=null;
  try{
    expect((await page.request.post("/api/admin/login",{data:{username:"admin",password:"admin"}})).ok()).toBe(true);
    const cafes=(await(await page.request.get("/api/admin/cafes")).json()).cafes;
    previous=cafes[0];cafeId=String(previous!.id);
    expect((await page.request.put(`/api/admin/cafes/${cafeId}`,{data:{...previous,publicationStatus:"published"}})).ok()).toBe(true);
    const now=new Date().toISOString(),expires=Date.now()+3600000;
    await db.prepare("INSERT INTO members(id,email,created_at,nickname,password_hash,email_verified_at) VALUES(?,?,?,?,?,?)").bind(memberA,email,now,"本人",passwordHash(password),now).run();
    await db.prepare("INSERT INTO members(id,email,created_at,nickname,password_hash,email_verified_at) VALUES(?,?,?,?,?,?)").bind(memberB,`${memberB}@example.com`,now,"別の人",passwordHash(password),now).run();
    await db.prepare("INSERT INTO member_sessions(token_hash,member_id,expires_at) VALUES(?,?,?)").bind(tokenHash(tokenB),memberB,expires).run();
    expect((await page.request.post("/api/account/register",{data:{email,nickname:"第三者",password,passwordConfirmation:password}})).status()).toBe(202);
    await db.prepare("DELETE FROM member_email_codes WHERE email=?").bind(email).run();
    expect((await page.request.post("/api/account/reset/request",{data:{email:unregisteredEmail}})).status()).toBe(202);
    expect(await db.prepare("SELECT id FROM member_email_codes WHERE email=? AND purpose='reset'").bind(unregisteredEmail).first()).toBeTruthy();
    await db.prepare("UPDATE member_email_codes SET code_hash=? WHERE email=? AND purpose='reset'").bind(passwordHash("123456"),unregisteredEmail).run();
    expect((await page.request.post("/api/account/reset/confirm",{data:{email:unregisteredEmail,code:"123456",password,passwordConfirmation:password}})).status()).toBe(404);
    await db.prepare("DELETE FROM member_email_codes WHERE email=?").bind(unregisteredEmail).run();
    const anonymous=await playwright.request.newContext({baseURL});
    try{expect((await anonymous.get("/api/account/ratings")).status()).toBe(401);}finally{await anonymous.dispose();}
    expect((await page.request.post("/api/account/login",{data:{email,password:"incorrect password"}})).status()).toBe(401);
    expect((await page.request.post("/api/account/login",{data:{email,password}})).ok()).toBe(true);
    expect((await page.request.put("/api/account/ratings",{data:{cafeId,rating:5,note:"自分だけの記録"}})).ok()).toBe(true);
    const own=await(await page.request.get("/api/account/ratings")).json();
    expect(own.ratings).toContainEqual(expect.objectContaining({cafe_id:cafeId,rating:5,note:"自分だけの記録"}));
    await page.goto("/");
    if(previous!.area==="tanukikoji")await page.getByRole("tab",{name:/^狸小路/}).click();
    await page.getByRole("searchbox",{name:"店舗名・住所で検索"}).fill(String(previous!.name));
    await page.locator(".cafe-card").filter({has:page.getByText(String(previous!.name),{exact:true})}).first().click();
    const detail=page.locator(".map-panel .selected-cafe");
    await expect(detail).toContainText(String(previous!.name));
    await expect(detail.getByRole("link",{name:"Google マップで見る ↗"})).toBeVisible();
    await expect(detail.getByRole("radio",{name:"5つ星"})).toBeChecked();
    await expect(detail.getByLabel("メモ")).toHaveValue("自分だけの記録");
    await expect(detail).toContainText("星評価は今後公開される可能性があります。メモは公開しません。");
    await detail.locator(".rating-stars label").nth(3).click();
    await detail.getByLabel("メモ").fill("モーダルで保存した記録");
    await detail.getByRole("button",{name:"保存",exact:true}).click();
    const saved=page.getByRole("dialog",{name:"自己評価を保存しました"});
    await expect(saved).toContainText("星評価は今後公開される可能性があります。メモは公開しません。");
    await saved.getByRole("button",{name:"閉じる"}).click();
    const updated=await(await page.request.get("/api/account/ratings")).json();
    expect(updated.ratings).toContainEqual(expect.objectContaining({cafe_id:cafeId,rating:4,note:"モーダルで保存した記録"}));
    const otherTab=await page.context().newPage();
    await otherTab.goto("/");
    if(previous!.area==="tanukikoji")await otherTab.getByRole("tab",{name:/^狸小路/}).click();
    await otherTab.getByRole("searchbox",{name:"店舗名・住所で検索"}).fill(String(previous!.name));
    await otherTab.locator(".cafe-card").filter({has:otherTab.getByText(String(previous!.name),{exact:true})}).first().click();
    await expect(otherTab.locator(".map-panel .selected-cafe").getByLabel("メモ")).toHaveValue("モーダルで保存した記録");
    await page.getByRole("button",{name:"ログアウト"}).click();
    await expect(page.getByRole("link",{name:"ログイン",exact:true})).toBeVisible();
    await expect(otherTab.getByRole("link",{name:"ログイン",exact:true})).toBeVisible();
    await expect(otherTab.getByText("モーダルで保存した記録")).toHaveCount(0);
    await expect(page.getByText("モーダルで保存した記録")).toHaveCount(0);
    if(previous!.area==="tanukikoji")await page.getByRole("tab",{name:/^狸小路/}).click();
    await page.getByRole("searchbox",{name:"店舗名・住所で検索"}).fill(String(previous!.name));
    await page.locator(".cafe-card").filter({has:page.getByText(String(previous!.name),{exact:true})}).first().click();
    await expect(detail.getByRole("link",{name:"ログインして自己評価を記録"})).toBeVisible();
    await expect(detail.getByLabel("メモ")).toHaveCount(0);
    expect((await page.request.get("/api/account/ratings")).status()).toBe(401);
    await page.context().addCookies([{name:"sapporo_member_session",value:tokenB,url:baseURL}]);
    const other=await(await page.request.get("/api/account/ratings")).json();
    expect(other.ratings).not.toContainEqual(expect.objectContaining({cafe_id:cafeId}));
  }finally{
    if(previous){const latest=(await(await page.request.get("/api/admin/cafes")).json()).cafes.find((item:{id:string})=>item.id===cafeId);if(latest)await page.request.put(`/api/admin/cafes/${cafeId}`,{data:{...latest,publicationStatus:previous.publicationStatus}});}
    await db.prepare("DELETE FROM members WHERE id IN (?,?)").bind(memberA,memberB).run();
    await proxy.dispose();
  }
});

test("会員登録コードと再設定コードは使い捨てで、再設定後は旧セッションを失効する",async({page})=>{
  const proxy=await proxyForTest(),db=proxy.env.DB;
  const email=`${randomUUID()}@example.com`,oldPassword="Passw0rd",newPassword="Newpass8";
  try{
    await page.goto("/");
    await page.getByRole("link",{name:"ログイン",exact:true}).click();
    await expect(page).toHaveURL(/\/account\/login$/);
    await page.getByRole("tab",{name:"新規会員登録"}).click();
    await expect(page).toHaveURL(/\/account\/login$/);
    const register=page.getByRole("tabpanel",{name:"新規会員登録"});
    await register.getByLabel("ニックネーム").fill("テスト会員");
    await page.getByRole("tab",{name:"ログイン"}).click();
    await page.getByRole("tab",{name:"新規会員登録"}).click();
    await expect(register.getByLabel("ニックネーム")).toHaveValue("テスト会員");
    await register.getByLabel("メールアドレス").fill(email);
    await register.getByLabel("パスワード",{exact:true}).fill(oldPassword);
    await register.getByLabel("パスワード（確認）").fill(oldPassword);
    await page.getByRole("button",{name:"確認コードを送る"}).click();
    await expect(page.getByLabel("確認コード")).toBeVisible();
    await db.prepare("UPDATE member_email_codes SET code_hash=? WHERE email=? AND purpose='register'").bind(passwordHash("123456"),email).run();
    await page.getByLabel("確認コード").fill("123456");
    await page.getByRole("button",{name:"登録を完了する"}).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button",{name:"ログアウト"})).toBeVisible();
    await page.goto("/account");
    await expect(page).toHaveURL(/\/$/);
    expect((await page.request.post("/api/account/register/confirm",{data:{email,code:"123456"}})).status()).toBe(400);
    await db.prepare("DELETE FROM member_login_limits WHERE email=?").bind(email).run();
    await page.goto("/account/reset");
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByRole("button",{name:"確認コードを送る"}).click();
    await expect(page.getByLabel("確認コード")).toBeVisible();
    await db.prepare("UPDATE member_email_codes SET code_hash=? WHERE email=? AND purpose='reset'").bind(passwordHash("654321"),email).run();
    await page.getByLabel("確認コード").fill("654321");
    await page.getByLabel("新しいパスワード",{exact:true}).fill(newPassword);
    await page.getByLabel("新しいパスワード（確認）").fill(newPassword);
    await page.getByRole("button",{name:"パスワードを変更"}).click();
    await expect(page.getByText("パスワードを変更しました。")).toBeVisible();
    expect((await page.request.get("/api/account/ratings")).status()).toBe(401);
    expect((await page.request.post("/api/account/reset/confirm",{data:{email,code:"654321",password:newPassword,passwordConfirmation:newPassword}})).status()).toBe(400);
    expect((await page.request.post("/api/account/login",{data:{email,password:oldPassword}})).status()).toBe(401);
    await page.goto("/account/login");
    const login=page.getByRole("tabpanel",{name:"ログイン"});
    await login.getByLabel("メールアドレス").fill(email);
    await login.getByLabel("パスワード").fill(newPassword);
    await login.getByRole("button",{name:"ログイン"}).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button",{name:"ログアウト"})).toBeVisible();
  }finally{
    await db.prepare("DELETE FROM member_email_codes WHERE email=?").bind(email).run();
    await db.prepare("DELETE FROM member_login_limits WHERE email=?").bind(email).run();
    await db.prepare("DELETE FROM member_password_attempts WHERE email=?").bind(email).run();
    await db.prepare("DELETE FROM members WHERE email=?").bind(email).run();
    await proxy.dispose();
  }
});

test("旧メールリンク会員は評価を失わずにパスワードを設定できる",async({page})=>{
  const proxy=await proxyForTest(),db=proxy.env.DB;
  const id=randomUUID(),email=`${id}@example.com`,password="legacy member passphrase 2026";
  try{
    const cafe=await db.prepare("SELECT id FROM cafes LIMIT 1").first<{id:string}>();
    expect(cafe).toBeTruthy();
    const now=new Date().toISOString();
    await db.prepare("INSERT INTO members(id,email,created_at,nickname,password_hash,email_verified_at) VALUES(?,?,?,?,?,?)").bind(id,email,now,"","",now).run();
    await db.prepare("INSERT INTO private_cafe_ratings(member_id,cafe_id,rating,note,updated_at) VALUES(?,?,?,?,?)").bind(id,cafe!.id,4,"引き継ぐ記録",now).run();
    expect((await page.request.post("/api/account/register",{data:{nickname:"引き継ぎ会員",email,password,passwordConfirmation:password}})).status()).toBe(202);
    await db.prepare("UPDATE member_email_codes SET code_hash=? WHERE email=? AND purpose='register'").bind(passwordHash("123456"),email).run();
    expect((await page.request.post("/api/account/register/confirm",{data:{email,code:"123456"}})).ok()).toBe(true);
    const member=await db.prepare("SELECT id,nickname FROM members WHERE email=?").bind(email).first<{id:string;nickname:string}>();
    expect(member).toMatchObject({id,nickname:"引き継ぎ会員"});
    expect(await db.prepare("SELECT rating,note FROM private_cafe_ratings WHERE member_id=? AND cafe_id=?").bind(id,cafe!.id).first()).toMatchObject({rating:4,note:"引き継ぐ記録"});
  }finally{
    await db.prepare("DELETE FROM member_email_codes WHERE email=?").bind(email).run();
    await db.prepare("DELETE FROM member_login_limits WHERE email=?").bind(email).run();
    await db.prepare("DELETE FROM members WHERE id=?").bind(id).run();
    await proxy.dispose();
  }
});

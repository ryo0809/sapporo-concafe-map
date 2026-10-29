import { expect,test } from "@playwright/test";
import { spawnSync } from "node:child_process";

test("ログイン画面の読み込み前にパスワードをURLへ送らない",async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,baseURL:test.info().project.use.baseURL});
  try{
    const page=await context.newPage();
    await page.goto("/admin/login");
    const form=page.locator(".admin-login form");
    await expect(form).toHaveAttribute("method","post");
    await expect(form).toHaveAttribute("action","/api/admin/login");
    await expect(form.locator('button[type="submit"]')).toBeDisabled();
    await form.locator('input[name="username"]').fill("diagnostic-user");
    await form.locator('input[name="password"]').fill("diagnostic-password");
    await form.locator('input[name="password"]').press("Enter");
    expect(new URL(page.url()).searchParams.has("password")).toBe(false);
  }finally{await context.close();}
});

test("resource-limit save failures keep the form and do not retry the mutation",async({page})=>{
  await page.request.post("/api/admin/login",{data:{username:"admin",password:"admin"}});
  let attempts=0;
  await page.route("**/api/admin/cafes",async route=>{
    if(route.request().method()!=="POST")return route.continue();
    attempts++;
    await route.fulfill({status:500,contentType:"text/html",body:"<!DOCTYPE html><h1>Error 1102</h1><p>Worker exceeded resource limits</p>"});
  });
  await page.goto("/admin");
  await page.getByRole("button",{name:"手入力で追加",exact:true}).click();
  const form=page.locator(".admin-editor form");
  await form.getByLabel("店舗名",{exact:true}).fill("保存エラー時の入力保持");
  await form.getByLabel("住所",{exact:true}).fill("札幌市中央区南4条西3丁目");
  await form.getByRole("button",{name:"店舗情報を保存",exact:true}).click();
  await expect(page.locator(".admin-error[role=alert]")).toContainText("実行リソース上限");
  await expect(form.getByLabel("店舗名",{exact:true})).toHaveValue("保存エラー時の入力保持");
  await expect(form.getByRole("button",{name:"店舗情報を保存",exact:true})).toBeEnabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(attempts).toBe(1);
});

const cafeInput={name:"管理機能検証店舗",address:"札幌市中央区南3条西6丁目3-3",area:"tanukikoji",category:"maid",buildingName:"管理機能検証ビル",floor:"2F",location:{latitude:43.05656,longitude:141.34884},
  businessStatus:"unknown",publicationStatus:"draft",sourceUrl:"https://example.com/",socialUrls:[],verifiedOn:"",coordinateSource:"テスト座標"};

test("設定画面を店舗設定・お問い合わせのタブで切り替える",async({page})=>{
  expect((await page.request.post("/api/admin/login",{data:{username:"admin",password:"admin"}})).status()).toBe(200);
  await page.goto("/admin");
  await expect(page.locator(".admin-header")).not.toContainText("admin");
  const navigation=page.getByRole("tablist",{name:"設定画面",exact:true});
  await expect(navigation.getByRole("tab",{name:"店舗設定",exact:true})).toHaveAttribute("aria-selected","true");
  await page.getByRole("button",{name:"手入力で追加",exact:true}).click();
  const editor=page.locator("#admin-editor-title").locator("..");
  await editor.getByLabel("店舗名",{exact:true}).fill("編集中の店舗名");
  await navigation.getByRole("tab",{name:"お問い合わせ",exact:true}).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(navigation.getByRole("tab",{name:"お問い合わせ",exact:true})).toHaveAttribute("aria-selected","true");
  await page.getByRole("button",{name:"対応済み",exact:true}).click();
  await navigation.getByRole("tab",{name:"店舗設定",exact:true}).click();
  await expect(editor.getByLabel("店舗名",{exact:true})).toHaveValue("編集中の店舗名");
  await navigation.getByRole("tab",{name:"お問い合わせ",exact:true}).click();
  await expect(page.getByRole("button",{name:"対応済み",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"ログアウト",exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("削除APIは認証・送信元・バージョンを検証し、同名の別店舗を残す",async({request})=>{
  expect((await request.delete("/api/admin/cafes/missing",{data:{version:1}})).status()).toBe(401);
  await request.post("/api/admin/login",{data:{username:"admin",password:"admin"}});
  const first=(await(await request.post("/api/admin/cafes",{data:{...cafeInput,name:"重複削除検証"}})).json()).cafe;
  const second=(await(await request.post("/api/admin/cafes",{data:{...cafeInput,name:"重複削除検証"}})).json()).cafe;
  expect((await request.delete(`/api/admin/cafes/${first.id}`,{data:{version:first.version},headers:{Origin:"https://other.example"}})).status()).toBe(403);
  expect((await request.delete(`/api/admin/cafes/${first.id}`,{data:{version:0}})).status()).toBe(400);
  expect((await request.delete(`/api/admin/cafes/${first.id}`,{data:{version:first.version+1}})).status()).toBe(409);
  expect((await request.delete(`/api/admin/cafes/${first.id}`,{data:{version:first.version}})).status()).toBe(200);
  const stores=(await(await request.get("/api/admin/cafes")).json()).cafes;
  expect(stores.some((cafe:{id:string})=>cafe.id===first.id)).toBe(false);
  expect(stores.some((cafe:{id:string})=>cafe.id===second.id)).toBe(true);
  expect((await request.delete(`/api/admin/cafes/${first.id}`,{data:{version:first.version}})).status()).toBe(404);
});

test("未認証の管理画面・APIを拒否し、送信元と入力を検証する",async({page,request})=>{
  expect((await request.get("/api/admin/cafes")).status()).toBe(401);
  expect((await request.get("/api/admin/candidates?q=めいどりーみん&live=false")).status()).toBe(401);
  expect((await request.post("/api/admin/cafes",{data:cafeInput})).status()).toBe(401);
  await page.goto("/admin");await expect(page).toHaveURL(/\/admin\/login/);
  expect((await request.post("/api/admin/login",{data:{username:"admin",password:"wrong"}})).status()).toBe(401);
  expect((await request.post("/api/admin/login",{data:{username:"admin",password:"admin"}})).status()).toBe(200);
  expect((await request.post("/api/admin/cafes",{data:cafeInput,headers:{Origin:"https://other.example"}})).status()).toBe(403);
  expect((await request.post("/api/admin/cafes",{data:{...cafeInput,location:{latitude:100,longitude:141}}})).status()).toBe(400);
  await request.post("/api/admin/logout");expect((await request.get("/api/admin/cafes")).status()).toBe(401);
});

test("登録・公開・ビル階の更新・閉店除外・競合検知・移行の再実行",async({request})=>{
  await request.post("/api/admin/login",{data:{username:"admin",password:"admin"}});
  const created=await request.post("/api/admin/cafes",{data:cafeInput});expect(created.status()).toBe(201);
  const unnamedBuilding=await request.post("/api/admin/cafes",{data:{...cafeInput,name:"ビル名未確認の検証店舗",buildingName:"",floor:"B1F"}});
  expect(unnamedBuilding.status()).toBe(201);expect((await unnamedBuilding.json()).cafe).toMatchObject({buildingName:"",floor:"B1F"});
  let cafe=(await created.json()).cafe;
  expect(await (await request.get("/")).text()).not.toContain("管理機能検証店舗");
  let response=await request.put(`/api/admin/cafes/${cafe.id}`,{data:{...cafe,buildingId:undefined,publicationStatus:"published",buildingName:"管理機能検証更新ビル",floor:"7F"}});
  expect(response.status()).toBe(200);const oldVersion=cafe.version;cafe=(await response.json()).cafe;
  const html=await(await request.get("/")).text();expect(html).toContain("管理機能検証店舗");expect(html).toContain("管理機能検証更新ビル");expect(html).toContain("7F");
  expect((await request.put(`/api/admin/cafes/${cafe.id}`,{data:{...cafe,version:oldVersion}})).status()).toBe(409);
  response=await request.put(`/api/admin/cafes/${cafe.id}`,{data:{...cafe,businessStatus:"closed"}});cafe=(await response.json()).cafe;
  expect(await(await request.get("/")).text()).not.toContain("管理機能検証店舗");
  const before=(await(await request.get("/api/admin/cafes")).json()).cafes;
  const migration=spawnSync(process.execPath,["scripts/d1-setup.mjs","--local","--from-json"],{env:{...process.env,D1_PERSIST_PATH:process.env.PLAYWRIGHT_D1_PATH},encoding:"utf8"});
  expect(migration.status,migration.stderr).toBe(0);
  const after=(await(await request.get("/api/admin/cafes")).json()).cafes;
  expect(after.length).toBe(before.length);expect(after.find((item:{id:string})=>item.id===cafe.id)).toMatchObject({businessStatus:"closed",buildingName:"管理機能検証更新ビル",version:cafe.version});
  await request.post("/api/admin/logout");
});

test("admin/adminでログインし、検索候補を確認・編集して下書き登録する",async({page})=>{
  await page.goto("/admin/login");await page.getByLabel("ユーザー名").fill("admin");await page.getByLabel("パスワード").fill("admin");await page.getByRole("button",{name:"ログイン",exact:true}).click();
  await expect(page).toHaveURL(/\/admin$/);await expect(page.getByRole("heading",{name:"掲載情報の管理"})).toBeVisible();
  await page.getByLabel("外部サイトも検索").uncheck();await page.getByLabel("候補を検索",{exact:true}).fill("めいどりーみん");await page.getByRole("button",{name:"候補を検索",exact:true}).click();
  await expect(page.getByRole("button",{name:"確認・編集して登録"}).first()).toBeVisible();await page.getByRole("button",{name:"確認・編集して登録"}).first().click();
  const form=page.locator(".admin-editor");await expect(form.getByRole("heading",{name:"掲載店舗を追加"})).toBeVisible();await expect(form.getByText("既存店舗と重複する可能性があります。",{exact:false})).toBeVisible();
  await form.getByLabel("店舗名",{exact:true}).fill("候補から確認した検証店舗");
  await form.getByRole("button",{name:"新しいビルを追加",exact:true}).click();
  const buildingDialog=page.getByRole("dialog",{name:"新しいビルを追加"});
  await buildingDialog.getByLabel("ビル名",{exact:true}).fill("候補検証ビル");
  await buildingDialog.getByRole("button",{name:"ビル情報を保存",exact:true}).click();
  await expect(buildingDialog).not.toBeVisible();
  await form.getByLabel("階数",{exact:true}).fill("5F");
  await form.getByRole("button",{name:"店舗情報を保存"}).click();const saved=page.getByRole("dialog",{name:"保存が完了しました"});await expect(saved.getByRole("status")).toContainText("店舗情報を保存しました");await saved.getByRole("button",{name:"閉じる",exact:true}).click();await expect(form.getByLabel("掲載状態")).toHaveValue("draft");
  await page.getByRole("button",{name:"ログアウト",exact:true}).click();await expect(page).toHaveURL(/\/admin\/login/);
});

test("D1の同時更新で一方だけが成功し、失敗した変更と履歴を残さない",async({request})=>{
  await request.post("/api/admin/login",{data:{username:"admin",password:"admin"}});
  const cafe=(await(await request.post("/api/admin/cafes",{data:{...cafeInput,name:"D1同時更新検証"}})).json()).cafe;
  const variants=["A","B"].map(suffix=>({...cafe,buildingId:undefined,name:`D1同時更新${suffix}`,buildingName:`同時更新ビル${suffix}`,floor:"8F"}));
  const results=await Promise.all(variants.map(data=>request.put(`/api/admin/cafes/${cafe.id}`,{data})));
  expect(results.map(result=>result.status()).sort()).toEqual([200,409]);
  const winner=variants[results.findIndex(result=>result.status()===200)];
  const loser=variants[results.findIndex(result=>result.status()===409)];
  const saved=(await(await request.get("/api/admin/cafes")).json()).cafes.find((item:{id:string})=>item.id===cafe.id);
  expect(saved).toMatchObject({name:winner.name,buildingName:winner.buildingName,version:2});
  const inspect=spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js","d1","execute","DB","--local","--persist-to",process.env.PLAYWRIGHT_D1_PATH!,"--command",`SELECT COUNT(*) AS count FROM cafe_history WHERE cafe_id='${cafe.id}'; SELECT COUNT(*) AS count FROM buildings WHERE name='${loser.buildingName}';`,"--json"],{encoding:"utf8",env:{...process.env,WRANGLER_SEND_METRICS:"false"}});
  expect(inspect.status,inspect.stderr).toBe(0);
  const counts=JSON.parse(inspect.stdout);expect(counts[0].results[0].count).toBe(2);expect(counts[1].results[0].count).toBe(0);
  await request.post("/api/admin/logout");
});

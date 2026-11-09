import {expect,test} from "@playwright/test";
const image="https://example.com/test-banner.png";
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=","base64");
const local=(time:number)=>{const date=new Date(time);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
test("管理画面からイベントを公開し、期間中だけ詳細ページを表示する",async({page})=>{
  await page.route(image,route=>route.fulfill({contentType:"image/png",body:png}));
  expect((await page.request.post("/api/admin/login",{data:{username:"admin",password:"admin"}})).status()).toBe(200);
  await page.goto("/admin");
  await page.getByRole("tab",{name:"イベント"}).click();
  await page.getByLabel("イベント名").fill("公開テストイベント");
  await page.getByLabel("バナー画像URL（HTTPS）").fill(image);
  await page.getByLabel("掲載開始").fill(local(Date.now()-3600000));
  await page.getByLabel("掲載終了").fill(local(Date.now()+86400000));
  await page.getByLabel("バナー選択時の遷移先").selectOption("detail");
  await page.getByLabel("詳細ページの本文").fill("詳細を公開します。");
  await page.getByLabel("公開する").check();
  await page.getByRole("button",{name:"イベントを追加"}).click();
  await expect(page.getByText("イベントを保存しました。")).toBeVisible();
  const items=(await(await page.request.get("/api/admin/banners")).json()).banners;
  const item=items.find((entry:{title:string})=>entry.title==="公開テストイベント");
  expect(item).toBeTruthy();
  try{
    await page.goto("/");
    const banner=page.getByRole("region",{name:"開催中のイベント"});
    await expect(banner.getByRole("link",{name:/公開テストイベント/})).toBeVisible();
    await banner.getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/events/${item.id}$`));
    await expect(page.getByText("詳細を公開します。")).toBeVisible();
    expect((await page.request.get(`/events/${item.id}`)).status()).toBe(200);
    expect((await page.request.put(`/api/admin/banners/${item.id}`,{data:{title:item.title,imageUrl:image,startsAt:new Date(Date.now()-7200000).toISOString(),endsAt:new Date(Date.now()-3600000).toISOString(),destination:"detail",detailText:"詳細を公開します。",externalUrl:"",published:true}})).ok()).toBe(true);
    await page.goto("/");
    await expect(page.getByRole("region",{name:"開催中のイベント"})).toHaveCount(0);
    expect((await page.request.get(`/events/${item.id}`)).status()).toBe(404);
  }finally{await page.request.delete(`/api/admin/banners/${item.id}`);}
});

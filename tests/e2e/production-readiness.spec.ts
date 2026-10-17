import {expect,test} from "@playwright/test";

test("公開ページのメタデータ・アイコン・案内と機密APIヘッダー",async({page,request})=>{
  await page.route("https://tile.openstreetmap.org/**",route=>route.abort());
  await page.goto("/");
  await expect(page).toHaveTitle("札幌コンカフェマップ");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href",/^https:\/\/sapporo-concafe-map\.com\/?$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content","https://sapporo-concafe-map.com/social-card.png");
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveCount(1);
  const indexing=process.env.SITE_INDEXABLE==="true";
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content",indexing?/^index, follow$/:/noindex/);
  const robots=await request.get("/robots.txt");
  expect(robots.headers()["x-robots-tag"]).toBe(indexing?undefined:"noindex, nofollow, noarchive");
  const robotsText=await robots.text();
  expect(robotsText).toContain(indexing?"Allow: /$":"Disallow: /");
  expect(robotsText).not.toContain("/admin");
  const sitemap=await request.get("/sitemap.xml");
  const sitemapText=await sitemap.text();
  expect(sitemapText).not.toContain("/admin");
  if(!indexing)expect(sitemapText).not.toContain("<loc>");
  await expect(page.locator("footer").getByRole("link",{name:"掲載情報について",exact:true})).toBeVisible();
  await expect(page.locator("body")).not.toContainText("掲載情報の修正・削除・追加依頼は、");
  await expect(page.locator("footer").getByRole("link",{name:"プライバシーポリシー",exact:true})).toHaveText("プライバシーポリシー");
  await expect(page.locator("footer")).not.toContainText("©");
  await expect(page.locator('footer a[href^="/admin"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("お出かけ前に、店舗の最新情報をご確認ください。");
  await expect(page.locator("body")).not.toContainText("管理画面");
  await page.getByRole("link",{name:"掲載情報について",exact:true}).click();
  await expect(page.getByRole("heading",{name:"掲載情報について",exact:true})).toBeVisible();
  await page.getByRole("main").getByRole("link",{name:"お問い合わせ",exact:true}).click();
  await expect(page.getByRole("heading",{name:"お問い合わせ",exact:true})).toBeVisible();
  await page.goto("/privacy");
  await expect(page.locator("body")).not.toContainText("管理画面");
  await expect(page.locator("body")).not.toContainText("管理者ログイン");
  const response=await request.get("/api/admin/cafes");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  const login=await request.get("/admin/login");
  expect(login.headers()["cache-control"]).toContain("no-store");
  expect(login.headers()["x-frame-options"]).toBe("DENY");
  for(const path of ["/icon.svg","/apple-icon","/social-card.png"]){const image=await request.get(path);expect(image.ok()).toBe(true);expect(image.headers()["content-type"]).toMatch(/^image\//);}
  const missing=await request.get("/__missing_for_review__");expect(missing.status()).toBe(404);
  const health=await request.get("/api/health");expect(health.status()).toBe(200);expect(await health.json()).toEqual({status:"ok"});
});

test("wwwから正規ホストへの転送はパスと検索語を保持する",async({request})=>{
  const response=await request.get("/contact?from=review",{headers:{Host:"www.sapporo-concafe-map.com"},maxRedirects:0});
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("https://sapporo-concafe-map.com/contact?from=review");
});

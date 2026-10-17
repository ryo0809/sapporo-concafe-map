import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { projectCollection } from "../../src/infrastructure/cafes/collection-cafe-repository";

const base = "data/collections/";
const latest = JSON.parse(readFileSync(`${base}latest.json`, "utf8"));
const cafes = projectCollection(["tanukikoji", "susukino"].flatMap((area) => JSON.parse(readFileSync(`${base}${latest.runId}/${area}/001.json`, "utf8"))));
const count = (area: string) => cafes.filter((cafe) => cafe.area === area).length;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");

// Publish map fixtures explicitly: production imports now start private.
test.beforeAll(async ({ playwright }) => {
  const request=await playwright.request.newContext({baseURL:"http://127.0.0.1:3100"});
  try {
    expect((await request.post("/api/admin/login",{data:{username:"admin",password:"admin"}})).ok()).toBe(true);
    const stores=(await (await request.get("/api/admin/cafes")).json()).cafes;
    for(const cafe of stores.filter((item:{id:string})=>cafes.some(seed=>seed.id===item.id))) {
      expect((await request.put(`/api/admin/cafes/${cafe.id}`,{data:{...cafe,publicationStatus:"published"}})).ok()).toBe(true);
    }
  } finally { await request.dispose(); }
});

test("最新バッチの件数を表示し、座標なしの店舗も選択できる", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/");
  await expect(page.getByRole("tab", { name: /^狸小路/ })).toContainText(`${count("tanukikoji")}件`);
  await expect(page.getByRole("tablist", { name: "ビルを選択" })).toBeVisible();
  await expect(page.locator(".cafe-pin").first()).toBeVisible();
  await page.getByRole("searchbox", { name: "店舗名・住所で検索" }).fill("めいどりーみん");
  await page.getByRole("button", { name: /めいどりーみん/ }).click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText("清水ビル6F");
  await page.getByRole("tab", { name: /^すすきの/ }).click();
  await expect(page.getByRole("tab", { name: /^すすきの/ })).toContainText(`${count("susukino")}件`);
  await expect(page.locator(".cafe-pin").first()).toBeVisible();
  await page.getByRole("searchbox", { name: "店舗名・住所で検索" }).fill("すた");
  await page.getByRole("button", { name: /アニソンカフェ.*すた/ }).click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText("わたなべビル5F");
  await expect(page.getByRole("link", { name: "情報元で確認" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText("営業状態は未確認");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "店舗詳細を閉じる" }).click();
  await page.getByRole("tab", { name: /^狸小路/ }).click();
  await page.getByRole("searchbox", { name: "店舗名・住所で検索" }).fill("Make U Cute");
  await page.getByRole("button", { name: /Make U Cute/ }).click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText("座標未取得");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("店舗名で検索し、詳細を閉じて一覧に戻れる", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "店舗名・住所で検索" });
  await search.fill("めいどりーみん");
  await expect(page.locator(".cafe-cards > li")).toHaveCount(1);
  await page.getByRole("button", { name: /めいどりーみん/ }).click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toBeVisible();
  await page.getByRole("button", { name: "店舗詳細を閉じる" }).click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toHaveCount(0);
  await search.fill("存在しない店舗XYZ");
  await expect(page.getByText("一致するお店が見つかりませんでした。")).toBeVisible();
  await search.fill("");
  await expect(page.getByRole("tab", { name: /^狸小路/ })).toContainText(`${count("tanukikoji")}件`);
  await page.screenshot({ path: "test-results/ui-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/ui-mobile.png", fullPage: true });
});

test("ビルタブで情報を切り替え、階ごとに店舗をまとめる", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "ビルを選択" });
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await tabs.getByRole("tab", { name: /N・ヴィコロビル/ }).click();
  await expect.poll(async () => {
    const map = await page.locator(".map-canvas").boundingBox();
    const marker = await page.locator('.leaflet-marker-icon[title*="りぼんてーる"]').boundingBox();
    if (!map || !marker) return Infinity;
    return Math.hypot(marker.x + marker.width / 2 - map.x - map.width / 2, marker.y + marker.height / 2 - map.y - map.height / 2);
  }).toBeLessThan(70);
  await expect(page.getByRole("heading", { name: /^B1F/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^2F/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "4F", exact: true }).locator(".cafe-cards > li")).toHaveCount(2);
  await tabs.getByRole("tab", { name: /清水ビル/ }).click();
  await expect(page.getByRole("heading", { name: /^6F/ })).toBeVisible();
  await expect(page.locator(".cafe-cards > li")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /りぼんてーる/ })).toHaveCount(0);
  await tabs.getByRole("tab", { name: /清水ビル/ }).press("Home");
  await expect(tabs.getByRole("tab", { name: /N・ヴィコロビル/ })).toBeFocused();
  await expect(page.getByRole("heading", { name: /^B1F/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "店舗名・住所で検索" }).fill("めいどりーみん");
  await expect(tabs.getByRole("tab", { name: /清水ビル/ })).toHaveAttribute("aria-selected", "true");
});

test("タイル取得失敗後に再試行できる", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".map-status")).toContainText("地図を読み込めませんでした");
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: png }));
  await page.getByRole("button", { name: "再読み込み" }).click();
  await expect(page.locator(".map-status")).toBeEmpty();
  await expect(page.locator(".cafe-pin").first()).toBeVisible();
});

test("キーボードでエリアを切り替え、重なったピンから店舗を選べる", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/");
  const tab = page.getByRole("tab", { name: /^狸小路/ });
  await tab.focus();
  await tab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /^すすきの/ })).toBeFocused();
  await page.locator(".cafe-pin.shared").first().click();
  const popupButtons = page.locator(".leaflet-popup .popup-cafe-button");
  await expect(popupButtons.first()).toBeVisible();
  expect(await popupButtons.count()).toBeGreaterThan(1);
  const name = await popupButtons.first().textContent();
  await popupButtons.first().click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText(name!);
  await page.getByRole("tab", { name: /^すすきの/ }).press("ArrowLeft");
  await expect(tab).toBeFocused();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toHaveCount(0);
});

import { expect, test } from "@playwright/test";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");

test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/png", body: png }));
});

test("地図の初期化とエリアタブの往復・キーボード操作", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  const tanukikoji = page.locator("#tab-tanukikoji");
  const susukino = page.locator("#tab-susukino");
  for (const tab of [tanukikoji, susukino, tanukikoji]) {
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".leaflet-container")).toHaveCount(1);
    await expect(page.locator(".cafe-pin").first()).toBeVisible();
  }
  await tanukikoji.press("End");
  await expect(susukino).toBeFocused();
  await expect(susukino).toHaveAttribute("aria-selected", "true");
  expect(errors).toEqual([]);
});

test("ビルタブ・検索・店舗詳細を操作できる", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  const tabs = page.getByRole("tablist", { name: "ビルを選択" }).getByRole("tab");
  expect(await tabs.count()).toBeGreaterThan(1);
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  const card = page.locator(".cafe-card").first();
  const name = await card.locator("strong").innerText();
  await card.click();
  const detail = page.getByRole("region", { name: "選択した店舗" });
  await expect(detail).toContainText(name);
  await page.getByRole("button", { name: "店舗詳細を閉じる" }).click();
  await expect(detail).toHaveCount(0);
  const search = page.getByRole("searchbox");
  await search.fill("存在しない店舗XYZ123");
  await expect(page.locator(".cafe-card")).toHaveCount(0);
  await search.fill(name);
  await expect(page.locator(".cafe-card").first()).toContainText(name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("地図タイルの通信失敗から再読み込みで復旧できる", async ({ page }) => {
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await page.goto("/");
  await expect(page.locator(".map-status")).toContainText("地図を読み込めませんでした");
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/png", body: png }));
  await page.getByRole("button", { name: "再読み込み", exact: true }).click();
  await expect(page.locator(".map-status")).toBeEmpty();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
});

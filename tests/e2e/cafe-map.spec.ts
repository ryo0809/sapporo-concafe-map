import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { projectCollection } from "../../src/infrastructure/cafes/collection-cafe-repository";

const base = "data/collections/";
const latest = JSON.parse(readFileSync(`${base}latest.json`, "utf8"));
const cafes = projectCollection(["tanukikoji", "susukino"].flatMap((area) => JSON.parse(readFileSync(`${base}${latest.runId}/${area}/001.json`, "utf8"))));
const count = (area: string) => cafes.filter((cafe) => cafe.area === area).length;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");

test("最新バッチの件数を表示し、座標なしの店舗も選択できる", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.fulfill({ contentType: "image/png", body: png }));
  await page.goto("/");
  await expect(page.getByRole("tab", { name: /^狸小路/ })).toContainText(`${count("tanukikoji")}件`);
  await expect(page.locator(".cafe-cards > li")).toHaveCount(count("tanukikoji"));
  await expect(page.locator(".cafe-pin").first()).toBeVisible();
  await page.getByRole("button", { name: /めいどりーみん/ }).click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText("清水ビル6F");
  await page.getByRole("tab", { name: /^すすきの/ }).click();
  await expect(page.locator(".cafe-cards > li")).toHaveCount(count("susukino"));
  await expect(page.locator(".cafe-pin").first()).toBeVisible();
  await page.getByRole("button", { name: /アニソンカフェ.*すた/ }).click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText("わたなべビル5F");
  await expect(page.getByRole("link", { name: "情報元で確認" })).toHaveAttribute("href", "https://anison-stars.com/sapporo-susukino/");
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText("営業状態は未確認");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: /^狸小路/ }).click();
  await page.getByRole("button", { name: /Make U Cute/ }).click();
  await expect(page.getByRole("region", { name: "選択した店舗" })).toContainText("座標未取得");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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

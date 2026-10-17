import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("種類に応じて入力欄を切り替え、メールなしでサイトへの要望を受け付ける", async ({ page }) => {
  await page.goto("/contact");
  const category = page.getByLabel("お問い合わせの種類");
  for (const [value, label] of [["correction", "修正したい内容"], ["deletion", "対象の店舗名"], ["addition", "住所"]]) {
    await category.selectOption(value);
    await expect(page.locator('input[name="storeName"]')).toBeVisible();
    await expect(page.locator('input[name="storeName"]')).toHaveAttribute("required", "");
    await expect(page.getByLabel(label)).toBeVisible();
  }
  await expect(category.locator('option[value="addition"]')).toHaveText("掲載店舗の追加");
  for (const value of ["other", "site"]) {
    await category.selectOption(value);
    await expect(page.locator('input[name="storeName"]')).toHaveCount(0);
    await expect(page.locator('input[name="referenceUrl"]')).toHaveCount(0);
  }
  await page.getByLabel("お名前（必須）").fill("サイトへの要望検証");
  await page.getByLabel("要望の件名").fill("地図の機能追加");
  await page.getByLabel("改善・追加してほしいこと").fill("地図の表示方法を追加してほしいです。");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "送信する", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("メールアドレスが未入力");
  expect((await page.request.post("/api/admin/login", { data: { username: "admin", password: "admin" } })).status()).toBe(200);
  await page.goto("/admin/contacts");
  const message = page.getByRole("article").filter({ hasText: "サイトへの要望検証" });
  await expect(message).toContainText("サイトに対する要望・追加");
  await expect(message).toContainText("メールアドレス未入力（返信不可）");
  await expect(message.locator('a[href^="mailto:"]')).toHaveCount(0);
  await message.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(message).toHaveCount(0);
});

test("スマートフォンで送信に失敗しても入力を保持し、再送信できる", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let attempts = 0;
  await page.route("**/api/contact", route => route.fulfill({ status: ++attempts === 1 ? 503 : 201, contentType: "application/json", body: attempts === 1 ? JSON.stringify({ error: "送信できませんでした。時間をおいて再度お試しください。" }) : JSON.stringify({ ok: true }) }));
  await page.goto("/contact");
  await page.getByLabel("お問い合わせの種類").selectOption("other");
  await page.getByLabel("お名前（必須）").fill("再送信検証");
  await page.getByLabel("件名（必須）", { exact: true }).fill("再送信検証");
  await page.getByLabel("メールアドレス（任意）").fill("retry@example.com");
  await page.locator('textarea[name="message"]').fill("入力を保持する");
  await page.getByRole("checkbox").check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "送信する", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("送信できませんでした");
  await expect(page.locator('textarea[name="message"]')).toHaveValue("入力を保持する");
  await page.getByRole("button", { name: "送信する", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator('textarea[name="message"]')).toHaveValue("");
});

test("フォーム送信から管理画面の確認・対応済み・削除まで", async ({ page, request }) => {
  await page.goto("/contact");
  await page.getByLabel("お名前（必須）").fill("お問い合わせ検証");
  await page.getByLabel("メールアドレス（任意）").fill("contact-test@example.com");
  await page.getByLabel("対象の店舗名（必須）").fill("お問い合わせ検証店舗");
  await page.locator('textarea[name="message"]').fill("修正のお願い\n<script>alert('test')</script>");
  await page.getByRole("checkbox").check();
  const release: (() => void)[] = [];
  await page.route("**/api/contact", async route => {
    await new Promise<void>(resolve => release.push(resolve));
    await route.continue();
  });
  await page.getByRole("button", { name: "送信する", exact: true }).click();
  await expect(page.getByRole("button", { name: "送信しています…" })).toBeDisabled();
  await expect.poll(() => release.length).toBe(1); release[0]();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "お問い合わせを受け付けました" })).toBeVisible();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(page.getByLabel("お名前（必須）")).toHaveValue("");
  expect((await request.get("/api/admin/contacts")).status()).toBe(401);
  expect((await request.patch("/api/admin/contacts", { data: { id: "missing", status: "done" } })).status()).toBe(401);
  expect((await request.delete("/api/admin/contacts", { data: { id: "missing" } })).status()).toBe(401);
  expect((await page.request.post("/api/admin/login", { data: { username: "admin", password: "admin" } })).status()).toBe(200);
  await page.goto("/admin/contacts");
  const message = page.getByRole("article").filter({ hasText: "お問い合わせ検証店舗" });
  await expect(message).toContainText("<script>alert('test')</script>");
  await message.getByRole("button", { name: "対応済みにする" }).click();
  await expect(message).toHaveCount(0);
  await page.getByRole("button", { name: "対応済み", exact: true }).click();
  await expect(message).toBeVisible();
  await message.getByRole("button", { name: "削除", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(message).toHaveCount(0);
});

test("問い合わせAPIの入力・送信元・重複・連続送信を検証する", async ({ request }) => {
  const data = { id: randomUUID(), name: "検証", email: "test@example.com", category: "other", storeName: "", referenceUrl: "", subject: "API検証", message: "APIテスト", website: "", consent: true };
  const headers = { "cf-connecting-ip": "192.0.2.23" };
  expect((await request.post("/api/contact", { data, headers: { ...headers, Origin: "https://other.example" } })).status()).toBe(403);
  expect((await request.post("/api/contact", { data: { ...data, consent: false }, headers })).status()).toBe(400);
  expect((await request.post("/api/contact", { data: { ...data, message: "あ".repeat(33000) }, headers })).status()).toBe(413);
  expect((await request.post("/api/contact", { data: { ...data, website: "bot" }, headers })).status()).toBe(200);
  for (let i = 0; i < 5; i++) expect((await request.post("/api/contact", { data, headers })).status()).toBe(201);
  const limited = await request.post("/api/contact", { data, headers });
  expect(limited.status()).toBe(429); expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
  await request.post("/api/admin/login", { data: { username: "admin", password: "admin" } });
  const messages = (await (await request.get("/api/admin/contacts")).json()).messages;
  expect(messages.filter((message: { id: string }) => message.id === data.id)).toHaveLength(1);
  expect((await request.delete("/api/admin/contacts", { data: { id: data.id }, headers: { Origin: "https://other.example" } })).status()).toBe(403);
  expect((await request.delete("/api/admin/contacts", { data: { id: data.id } })).status()).toBe(200);
});

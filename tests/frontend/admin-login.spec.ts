import { expect, test } from "@playwright/test";

test("未認証からログイン・再読み込み・設定タブ・ログアウトまで", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("ユーザー名").fill("admin");
  await page.getByLabel("パスワード").fill("admin");
  await expect(page.getByLabel("パスワード")).toHaveAttribute("maxlength", "256");
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.reload();
  await expect(page).toHaveURL(/\/admin$/);
  const navigation = page.getByRole("tablist", { name: "設定画面", exact: true });
  for (const name of ["お問い合わせ", "店舗設定"]) {
    await navigation.getByRole("tab", { name, exact: true }).click();
    await expect(navigation.getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true");
  }
  const cookie = (await page.context().cookies()).find(item => item.name === "sapporo_admin_session");
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Strict", path: "/" });
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await page.request.get("/api/admin/cafes")).status()).toBe(401);
  const replay = await page.request.get("/api/admin/cafes", { headers: { Cookie: `sapporo_admin_session=${cookie!.value}` } });
  expect(replay.status()).toBe(401);
});

test("誤った認証情報を表示し、再入力できる", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("ユーザー名").fill(`nonexistent-${Date.now()}`);
  await page.getByLabel("パスワード").fill("wrong");
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page.locator(".admin-error[role=alert]")).toContainText("ユーザー名またはパスワードが違います");
  await expect(page.getByRole("button", { name: "ログイン", exact: true })).toBeEnabled();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("ユーザー名").fill("admin");
  await page.getByLabel("パスワード").fill("admin");
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

test("不正JSON・入力・送信元・偽Cookieを拒否する", async ({ request }) => {
  const url = "/api/admin/login";
  expect((await request.post(url, { data: {}, headers: { Origin: "https://other.example" } })).status()).toBe(403);
  expect((await request.post(url, { data: "{", headers: { "Content-Type": "application/json" } })).status()).toBe(400);
  expect((await request.post(url, { data: "not-json", headers: { "Content-Type": "text/plain" } })).status()).toBe(415);
  for (const data of [{}, { username: "admin", password: "x".repeat(257) }, { username: null, password: "x" }]) {
    expect((await request.post(url, { data })).status()).toBe(400);
  }
  for (const token of ["invalid", "a".repeat(64)]) {
    expect((await request.get("/api/admin/cafes", { headers: { Cookie: `sapporo_admin_session=${token}` } })).status()).toBe(401);
  }
});

test("連続失敗を制限し、管理者アカウントには影響させない", async ({ request }) => {
  const username = `rate-test-${Date.now()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    expect((await request.post("/api/admin/login", { data: { username, password: "wrong" } })).status()).toBe(401);
  }
  const blocked = await request.post("/api/admin/login", { data: { username, password: "wrong" } });
  expect(blocked.status()).toBe(429);
  expect((await blocked.json()).error).toContain("15分後");
  expect((await request.post("/api/admin/login", { data: { username: "admin", password: "admin" } })).status()).toBe(200);
  await request.post("/api/admin/logout");
});

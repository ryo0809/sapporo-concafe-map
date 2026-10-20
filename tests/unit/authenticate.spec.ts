import { expect, test } from "@playwright/test";
import { AuthenticateAdministrator } from "../../src/application/admin/authenticate";
import type { AuthenticationRepository } from "../../src/domain/admin/repositories";

function fixture() {
  const calls: unknown[][] = [];
  const repository: AuthenticationRepository = {
    async login(...args) { calls.push(args); return null; },
    async session() { return null; },
    async logout() {},
  };
  return { auth: new AuthenticateAdministrator(repository), calls };
}

test("設定可能な最大256文字のパスワードを切り詰めず照合する", async () => {
  const { auth, calls } = fixture();
  for (const length of [16, 200, 201, 256]) {
    const password = "x".repeat(length);
    await auth.login("admin", password);
    expect(calls.at(-1)).toEqual(["admin", password]);
  }
});

test("空・型不正・上限超過は照合前に拒否する", () => {
  const { auth, calls } = fixture();
  for (const [username, password] of [["", "x"], ["admin", ""], [null, "x"], ["admin", null], [123, "x"], ["admin", {}], ["x".repeat(101), "x"], ["admin", "x".repeat(257)]]) {
    expect(() => auth.login(username, password)).toThrow("ユーザー名とパスワードを入力してください");
  }
  expect(calls).toEqual([]);
});

test("認証失敗と試行制限を成功に変換しない", async () => {
  const { auth } = fixture();
  expect(await auth.login("admin", "wrong")).toBeNull();
  const error = Object.assign(new Error("rate limit"), { code: "RATE_LIMIT" });
  const repository: AuthenticationRepository = {
    async login() { throw error; }, async session() { return null; }, async logout() {},
  };
  await expect(new AuthenticateAdministrator(repository).login("admin", "password")).rejects.toBe(error);
});

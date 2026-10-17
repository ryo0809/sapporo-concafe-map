import { test, expect } from "@playwright/test";
import { validateContact } from "../../src/domain/contact";
const valid = { id: "f47ac10b-58cc-4372-a567-0e02b2c3d479", name: " テスト ", email: "owner@example.com", category: "correction", storeName: "店舗", referenceUrl: "https://example.com/", message: "営業時間の修正", consent: true, website: "" };
test("問い合わせの入力を検証し、前後の空白を除去する", () => {
  expect(validateContact(valid)).toMatchObject({ name: "テスト", category: "correction" });
  expect(validateContact({ ...valid, category: "other", storeName: "" })).toMatchObject({ storeName: "" });
  expect(validateContact({ ...valid, email: "" })).toMatchObject({ email: "" });
  expect(validateContact({ ...valid, email: undefined })).toMatchObject({ email: "" });
  for (const category of ["site", "other"]) {
    expect(validateContact({ ...valid, category, storeName: undefined, referenceUrl: undefined, email: "" })).toMatchObject({ category, email: "", storeName: "", referenceUrl: "" });
    expect(validateContact({ ...valid, category, storeName: "古い店舗", referenceUrl: "https://old.example" })).toMatchObject({ storeName: "", referenceUrl: "" });
  }
  for (const category of ["correction", "deletion", "addition"]) {
    expect(() => validateContact({ ...valid, category, storeName: "" })).toThrow();
  }
  for (const input of [null, {}, { ...valid, consent: false }, { ...valid, message: " " }, { ...valid, message: "あ".repeat(5001) }, { ...valid, email: "invalid" }, { ...valid, category: "__proto__" }, { ...valid, referenceUrl: "javascript:alert(1)" }, { ...valid, storeName: "" }, { ...valid, referenceUrl: "https://user:pass@example.com" }]) {
    expect(() => validateContact(input)).toThrow();
  }
});

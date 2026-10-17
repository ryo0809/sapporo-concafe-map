import { test, expect } from "@playwright/test";
import { validateContact } from "../../src/domain/contact";
const valid = { id: "f47ac10b-58cc-4372-a567-0e02b2c3d479", name: " テスト ", email: "owner@example.com", category: "correction", storeName: "店舗", referenceUrl: "https://example.com/", correctionItem: "営業時間", correctValue: "18:00〜", subject: "件名", requestedChange: "要望", message: "営業時間の修正", consent: true, website: "" };
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
  for (const input of [null, {}, { ...valid, consent: false }, { ...valid, correctValue: " " }, { ...valid, category: "other", message: " " }, { ...valid, message: "あ".repeat(5001) }, { ...valid, email: "invalid" }, { ...valid, category: "__proto__" }, { ...valid, referenceUrl: "javascript:alert(1)" }, { ...valid, storeName: "" }, { ...valid, referenceUrl: "https://user:pass@example.com" }]) {
    expect(() => validateContact(input)).toThrow();
  }
});
test("店舗の個別項目と媒体別URLを検証し、選択した種類の項目だけ保存する", () => {
  const addition = { ...valid, category: "addition", address: "札幌市中央区", building: "ビル", floor: "3F", businessType: "コンカフェ", openingHours: "18:00〜", closedDays: "月曜", officialUrl: "https://example.com", xUrl: "https://x.com/example", instagramUrl: "https://instagram.com/example", message: "" };
  expect(validateContact(addition).details).toEqual({ address: addition.address, building: addition.building, floor: addition.floor, businessType: addition.businessType, openingHours: addition.openingHours, closedDays: addition.closedDays, officialUrl: addition.officialUrl, xUrl: addition.xUrl, instagramUrl: addition.instagramUrl });
  expect(() => validateContact({ ...addition, address: "" })).toThrow();
  expect(() => validateContact({ ...addition, xUrl: "javascript:alert(1)" })).toThrow();
  expect(() => validateContact({ ...addition, instagramUrl: "https://user:pass@example.com" })).toThrow();
  expect(validateContact({ ...addition, category: "site" }).details).toEqual({ subject: valid.subject, requestedChange: valid.requestedChange });
  expect(() => validateContact({ ...valid, category: "deletion", deletionTarget: "全体", deletionReason: "" })).toThrow();
});

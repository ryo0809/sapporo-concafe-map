import { expect, test } from "@playwright/test";
import { validateCafeCatalog } from "../../src/domain/cafes/catalog-policy";
import tanukikoji from "../../src/infrastructure/cafes/data/tanukikoji/001.json";
import susukino from "../../src/infrastructure/cafes/data/susukino/001.json";
import { extractBusinesses } from "../../batch/lib/extract-businesses.mjs";
const catalog = [...tanukikoji, ...susukino];

test("台帳はIDで識別し、同じ建物でも別店舗を保持する", () => {
  const validated = validateCafeCatalog(catalog);
  expect(validated.filter((cafe) => cafe.locationGroup === "jalan")).toHaveLength(3);
  expect(validateCafeCatalog([])).toEqual([]);
  expect(() => validateCafeCatalog([catalog[0], catalog[0]])).toThrow(/重複/);
});

test("不正な分類・座標・確認日・確認元を公開台帳として受け入れない", () => {
  for (const invalid of [
    { area: "unknown" }, { category: "other" }, { location: { latitude: NaN, longitude: 141 } },
    { location: { latitude: 100, longitude: 141 } }, { verifiedOn: "2026-02-30" }, { sourceUrl: "javascript:alert(1)" },
  ]) expect(() => validateCafeCatalog([{ ...catalog[0], ...invalid }])).toThrow();
});

test("JSON-LDのgraphと複数業態を抽出し、壊れたJSONは警告にする", () => {
  const result = extractBusinesses(`<script type="application/ld+json">${JSON.stringify({
    "@graph": [{ "@type": ["CafeOrCoffeeShop", "BarOrPub"], name: "店舗A", address: { streetAddress: "住所" },
      geo: { latitude: 43, longitude: 141 } }, { "@type": "Organization", name: "運営会社" }],
  })}</script><script type="application/ld+json">invalid</script>`);
  expect(result.candidates).toHaveLength(1);
  expect(result.candidates[0].name).toBe("店舗A");
  expect(result.warnings).toHaveLength(1);
  expect(extractBusinesses("<html></html>").candidates).toEqual([]);
});

import { expect, test } from "@playwright/test";
import { projectCollection } from "../../src/infrastructure/cafes/collection-cafe-repository";

test("閉店・休業・移転を除外し、営業未確認と座標欠損をそのまま伝える", () => {
  const base = { id: "store", name: "店舗", address: "札幌市中央区南4条西3丁目", area: "susukino", category: "unknown", location: null,
    businessStatus: "unknown", sources: [{ provider: "pokepara", url: "https://example.com/", fetchedAt: "2026-10-15T01:00:00Z" }] };
  const projected = projectCollection([base, ...["closed", "temporarily_closed", "moved"].map((businessStatus) => ({ ...base, id: businessStatus, businessStatus }))]);
  expect(projected).toHaveLength(1);
  expect(projected[0].businessStatus).toBe("unknown");
  expect(projected[0].location).toBeNull();
  expect(projected[0].fetchedAt).toBe(base.sources[0].fetchedAt);
});

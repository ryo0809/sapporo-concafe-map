import { expect, test } from "@playwright/test";
import { chunkRecords, classifyArea, discoverPages, extractStore, mergeObservations } from "../../batch/lib/collection.mjs";

test("100件単位で分割し、境界で欠落・重複しない", () => {
  for (const count of [0, 1, 100, 101, 200, 201]) {
    const records = Array.from({ length: count }, (_, id) => ({ id }));
    const files = chunkRecords(records);
    expect(files.every((file) => file.length <= 100)).toBe(true);
    expect(files.flat()).toEqual(records);
  }
});

test("住所でエリアを判定し、札幌以外や住所不明は公開候補に混ぜない", () => {
  expect(classifyArea("店舗", "北海道札幌市中央区南三条西6丁目" )).toBe("tanukikoji");
  expect(classifyArea("店舗", "北海道札幌市中央区南5条西2丁目" )).toBe("susukino");
  expect(classifyArea("狸小路店", "" )).toBeNull();
  expect(classifyArea("店舗", "帯広市" )).toBeNull();
});

test("一覧の店舗リンクとページ送りを区別し、キャストページを取得しない", () => {
  const result = discoverPages(`<a href="/a01/a0101/a010101/a01010101/1/">店舗</a>
    <a href="/a01/a0101/a010101/a01010101/page/2/" rel="next">次へ</a>
    <a href="https://other.example/">外部</a>`, "https://cafecon.jp/a01/a0101/a010101/a01010101/", "cafecon");
  expect(result.shops).toHaveLength(1);
  expect(result.pagination).toHaveLength(1);
  const pokepara = discoverPages(`<a href="/ _hokkaido/m801/a1801/shop1/gal/1/">キャスト</a>`, "https://www.pokepara.jp/_hokkaido/m801/a1801/g220/", "pokepara");
  expect(pokepara.shops).toHaveLength(0);
});

test("取得時刻と営業状態を分け、一般記事の閉店文言で店舗を閉店にしない", () => {
  const html = `<h1>店舗A</h1><p>関連記事：別店舗が閉店</p><script type="application/ld+json">${JSON.stringify({
    "@type": "LocalBusiness", name: "店舗A", address: "札幌市中央区南4条西3丁目",
    geo: { latitude: 43.05, longitude: 141.35 }, url: "https://example.com/",
  })}</script>`;
  const record = extractStore(html, "https://example.com/", "official", "2026-10-15T01:00:00Z");
  expect(record.businessStatus).toBe("unknown");
  expect(record.source.fetchedAt).toBe("2026-10-15T01:00:00Z");
  expect(mergeObservations([record, record])[0].publishable).toBe(false);
  expect(mergeObservations([record, record])).toHaveLength(1);
  expect(extractStore(html.replace("<h1>店舗A", "<h1>【閉店】店舗A"), "https://example.com/", "official", "2026-10-15T01:00:00Z").businessStatus).toBe("closed");
});

test("丁目・階数・かな補足の差を統合し、別フロアの同名店は残す", () => {
  const first = extractStore(`<h1>りぼんてーる</h1><div class="top-content-item"><div class="top-content-head">住所</div><div class="top-content-body">札幌市中央区南3条西2-15-1 N・ヴィコロビル 4F</div></div>`, "https://example.com/1", "cafecon", "2026-10-15T01:00:00Z");
  const second = { ...first, name: "りぼんてーる(リボンテール)", address: "北海道札幌市中央区南三条西二丁目15−1 N.VICOROビル4階" };
  expect(mergeObservations([first, second])).toHaveLength(1);
  expect(mergeObservations([first, { ...second, address: second.address.replace("4階", "5階") }])).toHaveLength(2);
  expect(mergeObservations([first, { ...second, address: second.address.replace("4階", "地下4階") }])).toHaveLength(2);
});

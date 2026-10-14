import { expect, test } from "@playwright/test";
import { getBuildingDetails } from "../../src/presentation/cafes/building-groups";

test("丁目・番地・階数を分けて建物名を取り出す", () => {
  expect(getBuildingDetails("北海道札幌市中央区南3条西6丁目3-3 ジャラン狸小路2階")).toMatchObject({ name: "ジャラン狸小路", floor: "2F", street: "南3条西6" });
  expect(getBuildingDetails("札幌市中央区南3条西2-15-1 N・VICOLOビル B1F")).toMatchObject({ name: "N・ヴィコロビル", floor: "B1F" });
});

test("同じ建物の表記違いをまとめ、異なる街区は分ける", () => {
  const building = getBuildingDetails("札幌市中央区南4条西3丁目1-1 第3グリーンビル6F");
  expect(getBuildingDetails("札幌市中央区南4条西3 第3Gビル3F").key).toBe(building.key);
  expect(getBuildingDetails("札幌市中央区南5条西3 第3Gビル3F").key).not.toBe(building.key);
  expect(getBuildingDetails("札幌市中央区南3条西6丁目9").name).toBe("ビル名未確認");
});

import {expect,test} from "@playwright/test";
import {addressFloor,buildingAddress,cafeAddress} from "../../src/domain/cafes/building-address";
import {validateBuilding} from "../../src/domain/admin/building";

const street="札幌市中央区南4条西3丁目1-1";

test("共通住所からビル名と階数を除き、丁目・番地と数字を含むビル名を壊さない",()=>{
  for(const floor of ["2F","５Ｆ","地下1階","B1F","3階","2F・3F"]){
    expect(buildingAddress(`${street} 第3ビル ${floor}`,"第3ビル")).toBe(street);
  }
  expect(buildingAddress(`${street} 第3ビル`,"第3ビル")).toBe(street);
  expect(buildingAddress(street,"第3ビル")).toBe(street);
  expect(buildingAddress(`${street} N.VICOROビル 4F`,"N・ヴィコロビル")).toBe(street);
  expect(buildingAddress(`${street} 第五桂和ビル 4F`,"第5桂和ビル")).toBe(street);
  expect(buildingAddress(`${street} No1グリーンビル 2F`,"第1グリーンビル")).toBe(street);
  expect(validateBuilding({name:"第3ビル",address:`${street} 第3ビル 2F`,area:"susukino",location:null}).address).toBe(street);
});

test("公開住所は共有住所に店舗固有の階数を付け、古い共有階数やビル名を重複表示しない",()=>{
  expect(cafeAddress(`${street} 共通ビル 2F`,"共通ビル","5F")).toBe(`${street} 共通ビル5F`);
  expect(cafeAddress(street,"共通ビル","B1F")).toBe(`${street} 共通ビルB1F`);
  expect(cafeAddress(`${street} 共通ビル 2F`,"共通ビル","")).toBe(`${street} 共通ビル`);
  expect(cafeAddress(`${street} 2F`)).toBe(`${street} 2F`);
  expect(addressFloor(`${street} 共通ビル 地下1階`)).toBe("地下1階");
});

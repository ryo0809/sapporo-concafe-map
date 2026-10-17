import { expect,test } from "@playwright/test";
import { validateCafeInput } from "../../src/domain/admin/managed-cafe";
const valid={name:"店舗",address:"札幌市中央区南4条西3丁目",area:"susukino",category:"unknown",buildingName:"第3グリーンビル",floor:"3F",location:null,
  businessStatus:"unknown",publicationStatus:"draft",sourceUrl:"",socialUrls:[],verifiedOn:"",coordinateSource:""};
test("手入力と座標未取得を登録でき、公開と営業状態を別に管理する",()=>{
  expect(validateCafeInput(valid).location).toBeNull();
  expect(validateCafeInput({...valid,businessStatus:"closed",publicationStatus:"published"})).toMatchObject({businessStatus:"closed",publicationStatus:"published"});
});
test("不正な座標・URL・確認日・状態を保存しない",()=>{
  for(const invalid of [{name:""},{location:{latitude:43}},{location:{latitude:NaN,longitude:141}},{sourceUrl:"javascript:alert(1)"},{socialUrls:["file:///secret"]},{verifiedOn:"2026-02-30"},{businessStatus:"invalid"},{publicationStatus:"invalid"}])expect(()=>validateCafeInput({...valid,...invalid})).toThrow();
});

test("予約公開日時をUTCに統一し、即時公開・非公開では予約を解除する",()=>{
  expect(validateCafeInput({...valid,publicationStatus:"scheduled",publishAt:"2026-12-01T12:30:00+09:00"}).publishAt).toBe("2026-12-01T03:30:00.000Z");
  for(const publishAt of [undefined,"","invalid","2026-12-01T12:30","2026-02-30T12:30:00+09:00"])
    expect(()=>validateCafeInput({...valid,publicationStatus:"scheduled",publishAt})).toThrow();
  for(const publicationStatus of ["published","hidden"])
    expect(validateCafeInput({...valid,publicationStatus,publishAt:"2026-12-01T03:30:00Z"}).publishAt).toBeUndefined();
  expect(()=>validateCafeInput({...valid,officialUrl:"javascript:alert(1)"})).toThrow();
});

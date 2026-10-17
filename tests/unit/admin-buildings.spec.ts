import {expect,test} from "@playwright/test";
import {validateBuilding} from "../../src/domain/admin/building";
import {socialFields,socialUrls,socialPlatform} from "../../src/domain/admin/social-links";
import {groupManagedCafes} from "../../src/presentation/admin/building-groups";
import type {ManagedCafe} from "../../src/domain/admin/managed-cafe";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";

test("ビルには名前・住所・有効なエリアと任意の座標を登録できる",()=>{
  expect(validateBuilding({name:" 共通ビル ",address:" 札幌市中央区南4条西3丁目 ",area:"susukino",location:null})).toMatchObject({name:"共通ビル",address:"札幌市中央区南4条西3丁目",location:null});
  for(const changes of [{name:""},{address:""},{area:"other"},{location:{latitude:91,longitude:141}},{location:{latitude:43,longitude:NaN}}])expect(()=>validateBuilding({name:"ビル",address:"住所",area:"susukino",location:null,...changes})).toThrow();
});

test("既存SNSは媒体ごとの複数URL・未知媒体を欠落なく往復できる",()=>{
  const urls=["https://x.com/a","https://mobile.twitter.com/b","https://www.instagram.com/a","https://m.youtube.com/a","https://youtu.be/example","https://lin.ee/a","https://www.tiktok.com/@a","https://facebook.com/a","https://unknown.example/profile","https://x.com.evil.example/profile"];
  const fields=socialFields(urls);
  expect(fields.x.split("\n")).toHaveLength(2);
  expect(fields.youtube.split("\n")).toHaveLength(2);
  expect(fields.other.split("\n")).toHaveLength(2);
  expect(socialUrls(fields).sort()).toEqual([...urls].sort());
  expect(socialPlatform("not a url")).toBe("other");
});

test("同名ビルでもIDが異なれば分け、未登録店舗は一つにまとめる",()=>{
  const cafe=(id:string,buildingId:string,area:"susukino"|"tanukikoji"="susukino")=>({id,buildingId,area,buildingName:"共通ビル",address:"住所",floor:"2F",name:id}) as ManagedCafe;
  const groups=groupManagedCafes([cafe("a","one"),cafe("b","one"),cafe("c","two"),cafe("d",""),cafe("e",""),cafe("f","one","tanukikoji")]);
  expect(groups).toHaveLength(4);
  expect(groups.find(group=>group.key==="susukino:one")?.cafes).toHaveLength(2);
  expect(groups.find(group=>group.name==="ビル未登録")?.cafes).toHaveLength(2);
});

test("既存ビルの移行では所属店舗を変更せず住所を補完し、バージョンを保護する",()=>{
  const db=new DatabaseSync(":memory:");
  try{
    db.exec("CREATE TABLE buildings(id TEXT PRIMARY KEY,area TEXT,name TEXT,street TEXT); CREATE TABLE cafes(id TEXT PRIMARY KEY,building_id TEXT,address TEXT,deleted_at TEXT,created_at TEXT); INSERT INTO buildings VALUES('b','susukino','既存ビル','南4条西3'); INSERT INTO cafes VALUES('c','b','札幌市中央区南4条西3丁目1-1',NULL,'2026-01-01');");
    const cafes=db.prepare("SELECT * FROM cafes").all();
    db.exec(readFileSync("db/migrations/0009_building_management.sql","utf8"));
    expect(db.prepare("SELECT * FROM cafes").all()).toEqual(cafes);
    expect(db.prepare("SELECT * FROM buildings").get()).toMatchObject({id:"b",name:"既存ビル",street:"南4条西3",address:"札幌市中央区南4条西3丁目1-1",version:1,latitude:null,longitude:null});
    expect(()=>db.exec("UPDATE buildings SET address='invalid'")).toThrow("BUILDING_VERSION_CONFLICT");
    db.exec("UPDATE buildings SET address='更新住所',version=2");
    expect(db.prepare("SELECT address,version FROM buildings").get()).toMatchObject({address:"更新住所",version:2});
  }finally{db.close();}
});

import {expect,test} from "@playwright/test";
import {DatabaseSync} from "node:sqlite";
import {readFileSync,readdirSync} from "node:fs";
import {generateKeyPairSync} from "node:crypto";
import {checkRelease} from "../../scripts/lib/production-check.mjs";
import {createSnapshot,snapshotSql,validateSnapshot,snapshotSummary} from "../../scripts/lib/d1-snapshot.mjs";
import {encryptBackup,decryptBackup} from "../../scripts/lib/backup-crypto.mjs";
import {ensureAdministratorPassword} from "../../src/infrastructure/admin/password-policy";
import {hashPassword} from "../../db/passwords.mjs";

function database(){
  const db=new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for(const file of readdirSync("db/migrations").sort())db.exec(readFileSync(`db/migrations/${file}`,"utf8"));
  return db;
}
test("最新の公開予約・削除状態・履歴を同期し、認証情報を除外する",()=>{
  const source=database(),target=database();
  try{
    source.exec(`INSERT INTO administrators VALUES('admin','admin','private-password-hash');
      INSERT INTO sessions VALUES('session-secret','admin',9999999999999);
      INSERT INTO cafes(id,name,area,category,address,business_status,publication_status,source_url,version,created_at,updated_at,publish_at,official_url,deleted_at)
      VALUES('cafe','店舗''の名前','tanukikoji','maid','札幌市中央区南3条西2丁目','unknown','published','',6,'2026-01-01','2026-10-17','2026-12-01T00:00:00.000Z','https://example.com/',NULL),
      ('deleted','削除済み','susukino','unknown','札幌市中央区南4条西2丁目','unknown','hidden','',3,'2026-01-01','2026-10-17',NULL,'','2026-10-17T00:00:00.000Z');
      INSERT INTO cafe_history(cafe_id,actor,action,after_json,created_at) VALUES('cafe','admin','update','{}','2026-10-17');`);
    const snapshot=createSnapshot(source),sql=snapshotSql(snapshot);
    expect(JSON.stringify(snapshot)).not.toContain("private-password-hash");
    expect(JSON.stringify(snapshot)).not.toContain("session-secret");
    target.exec(sql);
    expect(snapshotSummary(createSnapshot(target))).toEqual(snapshotSummary(snapshot));
    expect(target.prepare("SELECT name,version,publish_at FROM cafes WHERE id='cafe'").get()).toMatchObject({name:"店舗'の名前",version:6,publish_at:"2026-12-01T00:00:00.000Z"});
    expect(target.prepare("SELECT COUNT(*) AS count FROM administrators").get()).toMatchObject({count:0});
    expect(()=>target.exec(sql)).toThrow(); // Initial migration only: never overwrite an existing target.
    snapshot.tables.cafes.rows[0].name="tampered";
    expect(()=>validateSnapshot(snapshot)).toThrow(/チェックサム/);
  }finally{source.close();target.close();}
});

test("未設定のドメイン・D1・問い合わせ先・公開設定ではリリースチェックを拒否する",()=>{
  const config=JSON.parse(readFileSync("wrangler.jsonc","utf8"));
  expect(checkRelease(config,{}).length).toBeGreaterThan(0);
  config.env.production.d1_databases[0].database_id="12345678-1234-1234-1234-123456789abc";
  expect(checkRelease(config,{NEXT_PUBLIC_CONTACT_EMAIL:"owner@example.com",SITE_INDEXABLE:"true"})).toEqual([]);
  config.env.staging.d1_databases[0].database_id=config.env.production.d1_databases[0].database_id;
  expect(checkRelease(config,{NEXT_PUBLIC_CONTACT_EMAIL:"owner@example.com",SITE_INDEXABLE:"true"}).join()).toContain("同じD1");
});

test("バックアップを公開鍵で暗号化し、正しい秘密鍵でのみ復元できる",()=>{
  const keys=generateKeyPairSync("rsa",{modulusLength:2048,publicKeyEncoding:{type:"spki",format:"pem"},privateKeyEncoding:{type:"pkcs8",format:"pem"}});
  const plaintext=Buffer.from("INSERT INTO administrators VALUES('sensitive');");
  const envelope=encryptBackup(plaintext,keys.publicKey);
  expect(JSON.stringify(envelope)).not.toContain("sensitive");
  expect(decryptBackup(envelope,keys.privateKey)).toEqual(plaintext);
  envelope.data=Buffer.from("corrupt").toString("base64");
  expect(()=>decryptBackup(envelope,keys.privateKey)).toThrow();
});

test("本番とステージングで初期パスワードを拒否する",()=>{
  const initial=hashPassword("admin");
  expect(()=>ensureAdministratorPassword("development",initial)).not.toThrow();
  for(const environment of ["production","staging"])expect(()=>ensureAdministratorPassword(environment,initial)).toThrow();
  expect(()=>ensureAdministratorPassword("production",hashPassword("a-long-unique-review-password"))).not.toThrow();
});

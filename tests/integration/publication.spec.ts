import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { D1CafeStore } from "../../src/infrastructure/database/d1-cafe-store";
import { validateCafeInput } from "../../src/domain/admin/managed-cafe";
import {D1SearchRateLimiter} from "../../src/infrastructure/admin/search-rate-limiter";
import {verifyPassword} from "../../db/passwords.mjs";

test("D1で既存店舗を非公開にし、予約時刻・解除・公式サイトを保持する", async () => {
  const persistPath=path.resolve(".wrangler/tests",`publication-${Date.now()}`);
  const setup=spawnSync(process.execPath,["scripts/d1-setup.mjs","--local","--from-json"],{
    env:{...process.env,D1_PERSIST_PATH:persistPath},encoding:"utf8",
  });
  expect(setup.status,setup.stderr).toBe(0);
  const password="integration-only-unique-password";
  const reset=spawnSync(process.execPath,["scripts/admin-password.mjs","--local"],{
    env:{...process.env,D1_PERSIST_PATH:persistPath,ADMIN_USERNAME:"admin",ADMIN_NEW_PASSWORD:password},encoding:"utf8",
  });
  expect(reset.status,reset.stderr).toBe(0);
  let proxy=await getPlatformProxy<{DB:D1Database}>({persist:{path:path.join(persistPath,"v3")}});
  try {
    const administrator=await proxy.env.DB.prepare("SELECT password_hash FROM administrators WHERE username='admin'").first<{password_hash:string}>();
    expect(verifyPassword(password,administrator!.password_hash)).toBe(true);
    const store=new D1CafeStore(async()=>proxy.env.DB);
    expect((await store.list()).length).toBeGreaterThan(0);
    expect((await store.list()).every(cafe=>cafe.publicationStatus==="hidden")).toBe(true);
    expect(await store.list(true)).toHaveLength(0);
    const input=validateCafeInput({name:"公開検証",address:"札幌市中央区南3条西3丁目",area:"susukino",category:"unknown",buildingName:"",floor:"",location:null,
      businessStatus:"unknown",publicationStatus:"scheduled",publishAt:new Date(Date.now()+3600000).toISOString(),
      sourceUrl:"https://source.example/",officialUrl:"https://official.example/",socialUrls:[],verifiedOn:"",coordinateSource:""});
    let cafe=await store.save(input,"test");
    expect(await store.list(true)).toHaveLength(0);
    cafe=await store.save({...cafe,publishAt:new Date(Date.now()-3600000).toISOString()},"test",cafe.id,cafe.version);
    expect(await store.list(true)).toMatchObject([{id:cafe.id,officialUrl:"https://official.example/"}]);
    cafe=await store.save(validateCafeInput({...cafe,publicationStatus:"hidden"}),"test",cafe.id,cafe.version);
    expect(cafe.publishAt).toBeUndefined();
    expect(await store.list(true)).toHaveLength(0);
    cafe=await store.save(validateCafeInput({...cafe,publicationStatus:"published"}),"test",cafe.id,cafe.version);
    expect(await store.list(true)).toHaveLength(1);
    // Re-running setup must not hide a store explicitly published by an administrator.
    await proxy.dispose();
    const repeat=spawnSync(process.execPath,["scripts/d1-setup.mjs","--local","--from-json"],{env:{...process.env,D1_PERSIST_PATH:persistPath},encoding:"utf8"});
    expect(repeat.status,repeat.stderr).toBe(0);
    proxy=await getPlatformProxy<{DB:D1Database}>({persist:{path:path.join(persistPath,"v3")}});
    expect(await store.list(true)).toHaveLength(1);
    const duplicate=await store.save(validateCafeInput({...cafe,publicationStatus:"hidden"}),"test");
    await expect(store.remove(cafe.id,"test",cafe.version-1)).rejects.toMatchObject({code:"CONFLICT"});
    expect(await store.find(cafe.id)).not.toBeNull();
    await store.remove(cafe.id,"test",cafe.version);
    expect(await store.find(cafe.id)).toBeNull();
    expect((await store.list()).some(item=>item.id===cafe.id)).toBe(false);
    expect(await store.list(true)).toHaveLength(0);
    expect(await store.find(duplicate.id)).not.toBeNull();
    await expect(store.remove(cafe.id,"test",cafe.version)).rejects.toMatchObject({code:"NOT_FOUND"});
    await expect(store.save(cafe,"test",cafe.id,cafe.version)).rejects.toMatchObject({code:"CONFLICT"});
    expect(await proxy.env.DB.prepare("SELECT COUNT(*) AS count FROM cafe_history WHERE cafe_id=? AND action='delete'").bind(cafe.id).first()).toMatchObject({count:1});
    const concurrent=await store.save(input,"test");
    const results=await Promise.allSettled([
      store.remove(concurrent.id,"test",concurrent.version),
      store.save({...concurrent,name:"同時編集"},"test",concurrent.id,concurrent.version),
    ]);
    expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(1);
    expect(results.filter(result=>result.status==="rejected")).toHaveLength(1);
    const limiter=new D1SearchRateLimiter(async()=>proxy.env.DB);
    const limitResults=await Promise.allSettled(Array.from({length:6},()=>limiter.consume("admin-a",100000)));
    expect(limitResults.filter(result=>result.status==="fulfilled")).toHaveLength(5);
    expect(limitResults.filter(result=>result.status==="rejected")).toHaveLength(1);
    await expect(limiter.consume("admin-b",100000)).resolves.toBeUndefined();
    await expect(limiter.consume("admin-a",160000)).resolves.toBeUndefined();
  } finally { await proxy.dispose(); }
});

import {expect,test} from "@playwright/test";
import {readAdminResponse} from "../../src/presentation/admin/api-response";

test("Cloudflare resource errors explain the cause instead of parsing HTML as JSON",async()=>{
  const response=new Response('<!DOCTYPE html><h1>Error 1102</h1><p>Worker exceeded resource limits</p>',{status:500,headers:{"content-type":"text/html"}});
  await expect(readAdminResponse(response)).rejects.toThrow(/実行リソース上限.*1102/);
});

test("Non-JSON and malformed JSON errors do not expose raw server responses",async()=>{
  await expect(readAdminResponse(new Response('<!DOCTYPE html>private diagnostic',{status:502}))).rejects.toThrow("HTTP 502");
  await expect(readAdminResponse(new Response('not-json',{headers:{"content-type":"application/json"}}))).rejects.toThrow("応答を読み取れませんでした");
});

test("Successful JSON and application errors retain their normal behavior",async()=>{
  await expect(readAdminResponse(Response.json({cafe:{id:"test"}}))).resolves.toEqual({cafe:{id:"test"}});
  await expect(readAdminResponse(Response.json({error:"別の更新が行われました"},{status:409}))).rejects.toThrow("別の更新が行われました");
  await expect(readAdminResponse(Response.json({error:"ユーザー名またはパスワードが違います"},{status:401}))).rejects.toThrow("ユーザー名またはパスワードが違います");
});

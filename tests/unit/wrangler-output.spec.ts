import {test,expect} from "@playwright/test";
import {parseWranglerJson,redactWranglerOutput} from "../../scripts/lib/wrangler-output.mjs";

test("リモートSQL取込の進捗表示の後からJSON応答を読み取る",()=>{
  expect(parseWranglerJson('├ Checking if file needs uploading\n├ Uploading complete.\n[\n {"success":true,"results":[]}\n]\n')).toEqual([{success:true,results:[]}]);
  expect(parseWranglerJson('{"success":true}')).toEqual({success:true});
  expect(()=>parseWranglerJson("No response")).toThrow();
  expect(()=>parseWranglerJson('[{"success":true}')).toThrow();
});

test("バックアップ取得用の署名付きURLをログへ出さない",()=>{
  const output='Download: https://example.com/export.sql?X-Amz-Expires=3600&X-Amz-Signature=test-secret\nSaved export.sql\n';
  expect(redactWranglerOutput(output)).toContain("Saved export.sql");
  expect(redactWranglerOutput(output)).not.toContain("test-secret");
  expect(redactWranglerOutput(output)).not.toContain("https://example.com/");
});

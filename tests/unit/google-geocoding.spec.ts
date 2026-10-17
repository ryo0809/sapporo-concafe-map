import {expect,test} from "@playwright/test";
import {geocodeAddress} from "../../src/infrastructure/admin/google-geocoding";

test("Googleの緯度経度を順序を変えず返し、日本の住所で検索する",async()=>{
  const fetcher:typeof fetch=async(input,options)=>{
    const url=new URL(String(input));
    expect(url.searchParams.get("address")).toBe("札幌市中央区南4条西3丁目");
    expect(url.searchParams.get("components")).toBe("country:JP");
    expect(options?.cache).toBe("no-store");
    return Response.json({status:"OK",results:[{formatted_address:"札幌市中央区南4条西3丁目",geometry:{location_type:"ROOFTOP",location:{lat:43.055,lng:141.353}}}]});
  };
  expect(await geocodeAddress(" 札幌市中央区南4条西3丁目 ","test",fetcher)).toMatchObject({location:{latitude:43.055,longitude:141.353}});
});

test("キー未設定・該当なし・曖昧な住所・APIエラーは座標を返さない",async()=>{
  await expect(geocodeAddress("住所",undefined)).rejects.toThrow("設定");
  await expect(geocodeAddress("", "test")).rejects.toThrow("住所");
  for(const data of [{status:"ZERO_RESULTS"},{status:"REQUEST_DENIED"},{status:"OK",results:[{partial_match:true,geometry:{location:{lat:43,lng:141}}}]},{status:"OK",results:[{geometry:{location:{lat:100,lng:141}}}]}]){
    await expect(geocodeAddress("住所","test",async()=>Response.json(data))).rejects.toThrow();
  }
  await expect(geocodeAddress("住所","test",async()=>{throw new Error("network");})).rejects.toThrow("接続");
});

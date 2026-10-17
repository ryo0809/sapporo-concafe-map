import {valueAfter} from "./lib/wrangler.mjs";
const input=valueAfter(process.argv,"--url");
if(!input)throw new Error("--url https://sapporo-concafe-map.com 等を指定してください。");
const base=new URL(input);
if(!["http:","https:"].includes(base.protocol))throw new Error("URLが不正です。");
const checks=[
  ["/",200,"札幌コンカフェマップ"],
  ["/contact",200,"お問い合わせ"],
  ["/privacy",200,"プライバシー"],
  ["/robots.txt",200,"User-Agent"],
  ["/sitemap.xml",200,"urlset"],
  ["/api/admin/cafes",401,"ログイン"],
  ["/api/health",200,'"status":"ok"'],
  ["/__smoke_missing__",404,"ページが見つかりません"],
];
for(const [path,status,content] of checks){
  const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(20000)});
  const body=await response.text();
  if(response.status!==status||!body.includes(content))throw new Error(`${path}: status/content mismatch (${response.status})`);
  if(path==="/"&&body.includes("情報を読み込めませんでした"))throw new Error("Public map failed to load");
  if(response.headers.get("x-content-type-options")!=="nosniff")throw new Error(`${path}: security header missing`);
  if(path.startsWith("/api/")&&!response.headers.get("cache-control")?.includes("no-store"))throw new Error("API no-store header missing");
  console.log(`OK ${path} (${status})`);
}
for(const path of ["/icon.svg","/apple-icon","/social-card.png"]){
  const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(20000)});
  if(!response.ok||!response.headers.get("content-type")?.startsWith("image/"))throw new Error(`${path}: image missing`);
  console.log(`OK ${path}`);
}

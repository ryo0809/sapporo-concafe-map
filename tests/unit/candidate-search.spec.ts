import { expect,test } from "@playwright/test";
import { candidateSearchScore,normalizeSearch } from "../../src/domain/admin/candidate-matching";
import { searchLiveCandidates } from "../../src/infrastructure/admin/live-candidate-search";
import { createPageFetcher } from "../../batch/lib/fetch-page.mjs";
import supplemental from "../../src/infrastructure/admin/data/supplemental-candidates.json";
import {sameSearchCandidate} from "../../src/infrastructure/admin/search-candidate-identity";

test("かな・英字・全角・記号と複数語を照合し、店舗名の一致を優先する",()=>{
  expect(normalizeSearch("Ｍａｋｅ Ｕ Ｃｕｔｅ♡")).toBe("makeucute");
  expect(candidateSearchScore("メイドリーミン","めいどりーみん 札幌店")).toBeGreaterThan(0);
  expect(candidateSearchScore("りぼん テール 札幌","りぼん・てーる","札幌市中央区南3条西6丁目")).toBeGreaterThan(0);
  expect(candidateSearchScore("Make U Cute","Make U Cute 狸小路店")).toBeGreaterThan(0);
  expect(candidateSearchScore("札幌 コンカフェ りぼん","りぼん・てーる","札幌市中央区")).toBeGreaterThan(0);
  expect(candidateSearchScore("りぼん 東京","りぼん・てーる","札幌市中央区")).toBe(0);
  expect(candidateSearchScore("りぼん","りぼん")).toBeGreaterThan(candidateSearchScore("りぼん","別店舗","りぼんビル"));
});

test("2ページ目の店舗を見つけ、他媒体の失敗でも結果を返す",async()=>{
  const root="https://www.pokepara.jp/_hokkaido/m801/a1801/g220/";
  const shop="https://www.pokepara.jp/_hokkaido/m801/a1801/shop123/";
  const fetched:string[]=[];
  const fetchPage=async(url:string)=>{
    fetched.push(url);
    if(url===root)return `<a href="${root}?page=2" rel="next">次へ</a><a href="/_hokkaido/m801/a1801/shop999/">別の店舗</a>`;
    if(url===`${root}?page=2`)return `<a href="${shop}">りぼん・てーる</a>`;
    if(url===shop)return '<h1>りぼん・てーる</h1><table><tr><th>住所</th><td>札幌市中央区南3条西6丁目1-1 2F</td></tr></table>';
    throw new Error("Unavailable");
  };
  const result=await searchLiveCandidates("リボン テール","all",fetchPage,new AbortController().signal);
  expect(result.records).toHaveLength(1);
  expect(result.records[0].name).toBe("りぼん・てーる");
  expect(fetched).toContain(`${root}?page=2`);
  expect(result.warnings.join()).toContain("cafecon");
  const filtered=await searchLiveCandidates("りぼん","susukino",fetchPage,new AbortController().signal);
  expect(filtered.records).toHaveLength(0);
});

test("検索の中断後に外部リクエストを開始しない",async()=>{
  const controller=new AbortController();controller.abort();
  await expect(createPageFetcher({signal:controller.signal})("https://example.com/")).rejects.toThrow();
  let calls=0;
  const result=await searchLiveCandidates("店舗","all",async()=>{calls++;return "";},controller.signal);
  expect(calls).toBe(0);
  expect(result.warnings.join()).toContain("時間上限");
});

test("XのURL・アカウント名から例示店舗の候補を照合する",()=>{
  const cafe=supplemental[0];
  for(const query of ["https://x.com/mondaiji_maid","https://twitter.com/mondaiji_maid","@mondaiji_maid","mondaiji_maid","だぁく またぁ"]){
    expect(candidateSearchScore(query,cafe.name,cafe.address,cafe.links.map(link=>link.url).join(" "))).toBeGreaterThan(0);
  }
});

test("媒体ごとの業態接頭辞・住所表記をまとめ、別フロアの店舗は分ける",()=>{
  const cafe={name:"アニランド",address:"北海道札幌市中央区南3条西6丁目9",area:"tanukikoji"};
  expect(sameSearchCandidate(cafe,{...cafe,name:"コスプレ酒場 アニランド",address:"北海道札幌市中央区南3条西6-9 うみ野 1F"})).toBe(true);
  expect(sameSearchCandidate({...cafe,address:cafe.address+" 1F"},{...cafe,address:cafe.address+" 2F"})).toBe(false);
  expect(sameSearchCandidate(cafe,{...cafe,address:"札幌市中央区南3条西7丁目9"})).toBe(false);
});

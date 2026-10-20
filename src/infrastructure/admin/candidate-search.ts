import "server-only";
import { createHash } from "node:crypto";
import { getD1 } from "../database/d1";
import { D1CafeStore } from "../database/d1-cafe-store";
import { getBuildingDetails } from "@/domain/cafes/building-details";
import { compileCandidateSearch,normalizeSearch } from "@/domain/admin/candidate-matching";
import supplementalCandidates from "./data/supplemental-candidates.json";
import { sameSearchCandidate,candidateFloor,candidatePlaceKey } from "./search-candidate-identity";
import type { CandidateSearchGateway,StoreCandidate } from "@/domain/admin/candidates";

interface RawCandidate {
  id:string;name:string;address:string;area:"tanukikoji"|"susukino";category:"concept"|"maid"|"unknown";
  location:{latitude:number;longitude:number}|null;businessStatus:string;
  sources:{provider:string;url:string;fetchedAt:string}[];links:{kind:string;url:string}[];
}
export class D1CandidateSearch implements CandidateSearchGateway {
  async search(query:string,area:string,live:boolean){
    const match=compileCandidateSearch(query);
    const score=(record:RawCandidate)=>match(record.name,record.address,[...record.links.map(link=>link.url),...record.sources.map(source=>source.url)].join(" "));
    const db=await getD1();const warnings:string[]=[];
    const [collected,cached,existing]=await Promise.all([
      db.prepare("SELECT payload FROM collected_candidates ORDER BY run_id DESC LIMIT 5000").all<{payload:string}>(),
      db.prepare("SELECT payload FROM search_candidates ORDER BY fetched_at DESC LIMIT 500").all<{payload:string}>(),
      new D1CafeStore(getD1).list(),
    ]);
    const records:RawCandidate[]=collected.results.map(row=>JSON.parse(row.payload));
    records.push(...supplementalCandidates as RawCandidate[]);
    const fromSaved=(cafe:StoreCandidate|typeof existing[number],provider:string):RawCandidate=>({
      ...cafe,sources:[{provider,url:cafe.sourceUrl,fetchedAt:cafe.fetchedAt??("updatedAt" in cafe?cafe.updatedAt:"")}],
      links:[...(cafe.officialUrl?[{kind:"website",url:cafe.officialUrl}]:[]),...cafe.socialUrls.map(url=>({kind:"social",url}))],
    });
    records.push(...cached.results.map(row=>{const cafe=JSON.parse(row.payload) as StoreCandidate;return fromSaved(cafe,cafe.provider);}));
    if(live){
      const [{createPageFetcher},{searchLiveCandidates}]=await Promise.all([
        import("../../../batch/lib/fetch-page.mjs"),
        import("./live-candidate-search"),
      ]);
      const signal=AbortSignal.timeout(30000);
      const result=await searchLiveCandidates(query,area,createPageFetcher({signal}),signal);
      records.unshift(...result.records as RawCandidate[]);warnings.push(...result.warnings);
    }
    // Prefer administrator-confirmed fields when an archived record describes the same store.
    records.unshift(...existing.map(cafe=>fromSaved(cafe,"登録済み")));
    const unique:RawCandidate[]=[];
    const places=new Map<string,RawCandidate[]>();
    for(const record of records){
      if((area!=="all"&&record.area!==area)||record.businessStatus==="closed"||!score(record))continue;
      const key=candidatePlaceKey(record);
      const bucket=key===null?[]:places.get(key)??[];
      const duplicate=bucket.find(previous=>sameSearchCandidate(previous,record));
      if(duplicate){
        duplicate.links=[...new Map([...duplicate.links,...record.links].map(link=>[link.url,link])).values()];
        duplicate.sources=[...new Map([...duplicate.sources,...record.sources].map(source=>[source.url,source])).values()];
        if(!candidateFloor(duplicate.address)&&candidateFloor(record.address))duplicate.address=record.address;
      }else{const copy={...record};unique.push(copy);bucket.push(copy);if(key!==null)places.set(key,bucket);}
    }
    const existingIdentity=existing.map(cafe=>({id:cafe.id,name:normalizeSearch(cafe.name),area:cafe.area,url:cafe.sourceUrl}));
    const candidates=unique.map(record=>({record,score:score(record)})).sort((a,b)=>b.score-a.score||a.record.name.localeCompare(b.record.name,"ja")).slice(0,30).map(({record}):StoreCandidate=>{
      const name=normalizeSearch(record.name),urls=new Set(record.sources.map(source=>source.url));
      const source=record.sources.find(entry=>entry.provider==="official")??record.sources[0];
      const building=getBuildingDetails(record.address);
      return {id:record.id,name:record.name,address:record.address,area:record.area,category:record.category,location:record.location,
        buildingName:building.key==="unknown"?"":building.name,floor:building.floor,businessStatus:"unknown",publicationStatus:"draft",
        sourceUrl:source?.url??"",officialUrl:record.links.find(link=>link.kind==="website")?.url??"",
        socialUrls:record.links.filter(link=>link.kind==="social").map(link=>link.url),fetchedAt:source?.fetchedAt||undefined,verifiedOn:"",
        coordinateSource:record.location?"取得元の構造化データ（位置未確認）":"座標未取得",provider:source?.provider??"保存済み",
        duplicateIds:existingIdentity.filter(cafe=>(cafe.name===name&&cafe.area===record.area)||(cafe.url&&urls.has(cafe.url))).map(cafe=>cafe.id)};
    });
    const toCache=candidates.filter(candidate=>candidate.provider!=="登録済み");
    if(toCache.length)await db.batch(toCache.map(candidate=>db.prepare("INSERT OR REPLACE INTO search_candidates VALUES(?,?,?)").bind(createHash("sha256").update(candidate.sourceUrl||candidate.id).digest("hex"),JSON.stringify(candidate),new Date().toISOString())));
    return {candidates,warnings:[...new Set(warnings)]};
  }
}

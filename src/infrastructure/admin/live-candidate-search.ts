import { discoverPages,extractStore,mergeObservations } from "../../../batch/lib/collection.mjs";
import { candidateSearchScore } from "../../domain/admin/candidate-matching";

const sources=[{provider:"pokepara",url:"https://www.pokepara.jp/_hokkaido/m801/a1801/g220/"},{provider:"cafecon",url:"https://cafecon.jp/a01/a0101/a010101/a01010101/"}];

export async function searchLiveCandidates(query:string,area:string,fetchPage:(url:string)=>Promise<string>,signal:AbortSignal){
  const results=await Promise.all(sources.map(async source=>{
    const warnings:string[]=[],observations=[];
    const queue=[source.url],visited=new Set<string>(),shops=new Map<string,{url:string;name:string}>();
    while(queue.length&&visited.size<3&&!signal.aborted){
      const url=queue.shift()!;
      if(visited.has(url))continue;
      visited.add(url);
      try{
        const pages=discoverPages(await fetchPage(url),url,source.provider);
        for(const shop of pages.shops)if(candidateSearchScore(query,shop.name,"札幌市中央区 すすきの 狸小路"))shops.set(shop.url,shop);
        for(const next of pages.pagination)if(!visited.has(next)&&!queue.includes(next))queue.push(next);
        if(!pages.shops.length)warnings.push(`${source.provider}の一覧から店舗リンクを取得できませんでした。`);
      }catch{warnings.push(`${source.provider}の一覧を取得できませんでした。`);break;}
    }
    const matched=[...shops.values()].sort((a,b)=>candidateSearchScore(query,b.name)-candidateSearchScore(query,a.name)).slice(0,5);
    for(const shop of matched){
      if(signal.aborted)break;
      try{
        const observation=extractStore(await fetchPage(shop.url),shop.url,source.provider,new Date().toISOString(),shop.name);
        if(observation.area&&(area==="all"||area===observation.area)&&candidateSearchScore(query,observation.name,observation.address))observations.push(observation);
      }catch{warnings.push(`${source.provider}の店舗詳細を一部取得できませんでした。`);}
    }
    if(queue.length)warnings.push(`${source.provider}は一覧3ページまで検索しました。見つからない場合はGoogle検索もお試しください。`);
    return {observations,warnings};
  }));
  return {records:mergeObservations(results.flatMap(result=>result.observations)),warnings:[...results.flatMap(result=>result.warnings),...(signal.aborted?["外部検索の時間上限に達しました。取得できた候補を表示しています。"]:[])]};
}

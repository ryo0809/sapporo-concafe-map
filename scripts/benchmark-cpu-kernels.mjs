// Synthetic local comparisons; these are not per-request Cloudflare CPU measurements.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64');
const previous=spawnSync('git',['show','bbb120b:src/domain/admin/candidate-matching.ts'],{encoding:'utf8'});
if(previous.status)throw Error('Baseline bbb120b unavailable');
const old=await import(asModule(previous.stdout));
const current=await import(asModule(readFileSync('src/domain/admin/candidate-matching.ts','utf8')));
const {clusterMapPoints}=await import(asModule(readFileSync('src/presentation/cafes/cluster-markers.ts','utf8')));
const records=Array.from({length:5000},(_,i)=>({name:`メイド店舗${(i*7919)%5000}`,address:'札幌市中央区南4条西3丁目',aliases:'https://example.com/'}));
function oldSearch(){const score=r=>old.candidateSearchScore('札幌 メイド',r.name,r.address,r.aliases);return records.filter(r=>score(r)>0).sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name,'ja')).slice(0,30).map(r=>r.name);}
function newSearch(){const score=current.compileCandidateSearch('札幌 メイド');return records.map(record=>({record,score:score(record.name,record.address,record.aliases)})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.record.name.localeCompare(b.record.name,'ja')).slice(0,30).map(r=>r.record.name);}
const points=Array.from({length:3000},(_,i)=>({item:i,group:String(i),x:(i%100)*80,y:Math.floor(i/100)*80}));
function oldCluster(){const groups=new Map();for(const point of points){const match=[...groups].find(([,members])=>Math.hypot(members[0].x-point.x,members[0].y-point.y)<60);const key=match?.[0]??point.group;groups.set(key,[...(groups.get(key)??[]),point]);}return [...groups.values()].map(group=>group.map(point=>point.item));}
function compare(before,after,iterations=1){
 const runs=[];let first,last;
 for(let i=0;i<5;i++){
  const pair={};for(const key of i%2?['after','before']:['before','after']){const start=process.cpuUsage();let result;for(let n=0;n<iterations;n++)result=(key==='before'?before:after)();const cpu=process.cpuUsage(start);pair[key]=(cpu.user+cpu.system)/1000/iterations;if(key==='before')first=result;else last=result;}runs.push(pair);
 }
 if(JSON.stringify(first)!==JSON.stringify(last))throw Error('Output changed');
 const median=key=>runs.map(r=>r[key]).sort((a,b)=>a-b)[2];
 return {iterationsPerRun:iterations,runs,beforeMedianCpuMs:median('before'),afterMedianCpuMs:median('after'),reductionPercent:median('after')?100*(1-median('after')/median('before')):null,sameOutput:true};
}
function importCpu(module){
 const url=pathToFileURL(process.cwd()+'/'+module).href;
 const r=spawnSync(process.execPath,['--input-type=module','-e',`const start=process.cpuUsage();await import(${JSON.stringify(url)});const cpu=process.cpuUsage(start);console.log(JSON.stringify({cpuMs:(cpu.user+cpu.system)/1000}));`],{encoding:'utf8'});
 if(r.status)throw Error('Module import benchmark failed');return JSON.parse(r.stdout).cpuMs;
}
const result={runtime:process.version,platform:process.platform,scope:'synthetic local CPU kernels, not HTTP/remote CPU; zero CPU readings are below OS timer resolution, not zero cost',search:{records:records.length,...compare(oldSearch,newSearch,3)},mapClusters:{points:points.length,...compare(oldCluster,()=>clusterMapPoints(points),20)},coldAddressDependency:{beforeCpuMs:importCpu('batch/lib/collection.mjs'),afterCpuMs:importCpu('batch/lib/canonical-address.mjs')}};
mkdirSync('reports/cpu',{recursive:true});writeFileSync('reports/cpu/kernels.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

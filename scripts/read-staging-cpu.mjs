// Attribute Cloudflare invocation metrics to controlled staging probe time windows.
// Other traffic in a window is included; compare observed counts with sent requests.
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const label=process.argv[2];if(!/^[a-z0-9-]+$/i.test(label??''))throw Error('Specify a report label');
const file=`reports/route-cpu-${label}.json`,report=JSON.parse(readFileSync(file,'utf8'));
if(report.base!=='https://sapporo-concafe-map-staging.f-app.workers.dev')throw Error('Staging report required');
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
const auth=spawnSync(process.execPath,['--use-system-ca','node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',env:{...process.env,WRANGLER_LOG_PATH:process.cwd()+'/reports/wrangler',WRANGLER_SEND_METRICS:'false'}});
if(auth.status)throw Error('Cloudflare auth unavailable');const c=JSON.parse(auth.stdout),token=c.token??c.api_token??c.oauth_token;
for(let start=0;start<report.phases.length;start+=5){
 const phases=report.phases.slice(start,start+5);
 const fields=phases.map((phase,i)=>`phase${i}:workersInvocationsAdaptive(limit:100,filter:{scriptName:${JSON.stringify(config.env.staging.name)},datetime_geq:${JSON.stringify(phase.from)},datetime_lt:${JSON.stringify(phase.to)}}){dimensions{status}sum{requests errors}quantiles{cpuTimeP50 cpuTimeP95 cpuTimeP99}}`).join('\n');
 const query=`query{viewer{accounts(filter:{accountTag:${JSON.stringify(config.account_id)}}){${fields}}}}`;
 const r=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(30000)}),j=await r.json();
 if(j.errors?.length)throw Error(JSON.stringify(j.errors.map(error=>({message:error.message}))));
 for(let i=0;i<phases.length;i++){
  const rows=j.data.viewer.accounts[0][`phase${i}`];
  const observed=rows.reduce((sum,row)=>sum+row.sum.requests,0);
  phases[i].cpu={queriedAt:new Date().toISOString(),attribution:'time-window estimate; includes ambient traffic and adaptive sampling',observedRequests:observed,sentRequests:phases[i].requests.length,countMatches:observed===phases[i].requests.length,units:'milliseconds (API microseconds converted)',rows:rows.map(row=>({status:row.dimensions.status,requests:row.sum.requests,errors:row.sum.errors,p50Ms:row.quantiles.cpuTimeP50/1000,p95Ms:row.quantiles.cpuTimeP95/1000,p99Ms:row.quantiles.cpuTimeP99/1000}))};
  console.log(JSON.stringify({label:phases[i].label,sent:phases[i].requests.length,...phases[i].cpu}));
 }
}
writeFileSync(file,JSON.stringify(report,null,2));

// Staging only. Run CPU probes without concurrent browser/test traffic.
// --mutations uses unique hidden fixtures and attempts API cleanup; inspect the report for failed cleanup.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
const base='https://sapporo-concafe-map-staging.f-app.workers.dev';
const tag=process.argv[2]??'before';
if(!/^[a-z0-9-]+$/i.test(tag))throw Error('Use an alphanumeric report label');
const c=parseEnv(readFileSync('reports/credentials/staging-admin.env','utf8'));
const reportFile=`reports/route-cpu-${tag}.json`;
const previous=process.argv.includes('--resume')&&existsSync(reportFile)?JSON.parse(readFileSync(reportFile,'utf8')):null;
if(process.argv.includes('--mutations')&&previous?.phases.some(phase=>phase.label==='cafe-create'))throw Error('Use a fresh report label for mutation checks; fixtures cannot be resumed safely.');
const phases=previous?.phases??[];let cookie='',assetPath=previous?.assetPath;
const fixtures=previous?.fixtures??[];
const isolate=process.argv.includes('--isolate');
const onlyIndex=process.argv.indexOf('--only');
const only=onlyIndex<0?null:new Set(process.argv[onlyIndex+1]?.split(',')??[]);
async function phase(label,path,{method='GET',data,count=5,expected,onResult}={}){
 if(only&&!only.has(label)&&label!=='login'&&label!=='logout')return;
 if(phases.some(p=>p.label===label)&&label!=='login')return;
 if(isolate&&count===5)count=20;
 await new Promise(r=>setTimeout(r,isolate?5000:1200));
 const from=new Date(Math.floor(Date.now()/1000)*1000).toISOString(),requests=[];
 for(let i=0;i<count;i++){
  const start=performance.now();
  try{
  const target=typeof path==='function'?path():path;
  const r=await fetch(base+target,{method,redirect:'manual',headers:{origin:base,'content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(typeof data==='function'?data(i):data)}:{}),signal:AbortSignal.timeout(12000)});
  const text=await r.text();
  if(label==='home')assetPath=text.match(/src="(\/_next\/static\/[^\"]+)"/)?.[1]?.replaceAll('&amp;','&');
  if(label==='login'&&r.ok)cookie=r.headers.get('set-cookie')?.split(';')[0]??'';
  requests.push({status:r.status,wallMs:Math.round(performance.now()-start),bytes:Buffer.byteLength(text),ray:r.headers.get('cf-ray'),error1102:/1102|Worker exceeded resource limits/i.test(text)});
  if(onResult&&r.ok){let json;try{json=JSON.parse(text);}catch{}if(json)onResult(json);}
  if(expected&&r.status!==expected)console.log(JSON.stringify({label,unexpected:r.status}));
  }catch(error){requests.push({status:null,wallMs:Math.round(performance.now()-start),error:error.name});}
  if(isolate)await new Promise(r=>setTimeout(r,100));
 }
 if(isolate)await new Promise(r=>setTimeout(r,5000));
 const to=new Date(Math.ceil(Date.now()/1000)*1000).toISOString();
 phases.push({label,method,path:typeof path==='string'?path.split('?')[0]:label,from,to,requests});
 writeFileSync(`reports/route-cpu-${tag}.json`,JSON.stringify({tag,base,startedAt:phases[0].from,assetPath,fixtures,phases},null,2));
 console.log(JSON.stringify({label,from,to,statuses:requests.map(r=>r.status),medianWallMs:requests.map(r=>r.wallMs).sort((a,b)=>a-b)[Math.floor(count/2)]}));
}
await phase('home','/');
if(assetPath)await phase('static-script',assetPath);
await phase('login-page','/admin/login');
await phase('contact-page','/contact');
await phase('privacy','/privacy');
await phase('listing','/listing-information');
await phase('robots','/robots.txt');
await phase('sitemap','/sitemap.xml');
await phase('social-card','/social-card.png');
await phase('icon','/icon.svg');
await phase('health','/api/health');
await phase('not-found','/__cpu_probe_missing');
await phase('unauthorized','/api/admin/cafes');
await phase('analytics-disabled','/api/analytics',{method:'POST',data:{version:1,event:'page_view',page:'/'}});
await phase('contact-invalid','/api/contact',{method:'POST',data:{},expected:400});
await phase('login','/api/admin/login',{method:'POST',data:{username:c.ADMIN_USERNAME,password:c.ADMIN_NEW_PASSWORD},count:3,expected:200});
if(cookie){
 await phase('admin-page','/admin');
 await phase('cafes-list','/api/admin/cafes');
 await phase('buildings-list','/api/admin/buildings');
 await phase('contacts-list','/api/admin/contacts');
 await phase('candidates-offline','/api/admin/candidates?q=めいど&live=false');
 await phase('cafe-validation','/api/admin/cafes',{method:'POST',data:{},expected:400});
 await phase('building-validation','/api/admin/buildings',{method:'POST',data:{},expected:400});
 await phase('geocode-validation','/api/admin/buildings/geocode',{method:'POST',data:{},count:3});
 if(process.argv.includes('--mutations')){
   const name=`CPU_PROBE_${tag}_${Date.now()}`;
   const input={name,address:'札幌市中央区南4条西3丁目',area:'susukino',category:'concept',buildingName:'',floor:'',location:null,businessStatus:'unknown',publicationStatus:'hidden',sourceUrl:'',socialUrls:[],verifiedOn:'',coordinateSource:''};
   let cafe,building;const contactId=randomUUID();fixtures.push({name,contactId});
   try{
     await phase('cafe-create','/api/admin/cafes',{method:'POST',data:input,count:1,expected:201,onResult:json=>{cafe=json.cafe;}});
     if(cafe)await phase('cafe-update',()=>`/api/admin/cafes/${cafe.id}`,{method:'PUT',data:()=>({...input,version:cafe.version}),count:3,expected:200,onResult:json=>{cafe=json.cafe;}});
     await phase('building-create','/api/admin/buildings',{method:'POST',data:{name,address:input.address,area:input.area,location:null},count:1,expected:201,onResult:json=>{building=json.building;}});
     if(building)await phase('building-update',()=>`/api/admin/buildings/${building.id}`,{method:'PUT',data:()=>({...building,name}),count:3,expected:200,onResult:json=>{building=json.building;}});
     await phase('contact-create','/api/contact',{method:'POST',data:{id:contactId,name,category:'other',subject:'CPU verification',message:'Temporary staging-only verification',consent:true,website:''},count:1,expected:201});
     await phase('contact-update','/api/admin/contacts',{method:'PATCH',data:{id:contactId,status:'done'},count:3,expected:200});
     if(process.argv.includes('--live'))await phase('candidates-live','/api/admin/candidates?q=めいど&live=true',{count:1});
   }finally{
     // If a response was lost after commit, recover only the uniquely named fixture before cleanup.
     if(!cafe){try{const r=await fetch(base+'/api/admin/cafes',{headers:{cookie},signal:AbortSignal.timeout(12000)});if(r.ok)cafe=(await r.json()).cafes.find(item=>item.name===name);}catch{}}
     if(!building){try{const r=await fetch(base+'/api/admin/buildings',{headers:{cookie},signal:AbortSignal.timeout(12000)});if(r.ok)building=(await r.json()).buildings.find(item=>item.name===name);}catch{}}
     if(cafe)await phase('cafe-delete',()=>`/api/admin/cafes/${cafe.id}`,{method:'DELETE',data:()=>({version:cafe.version}),count:1,expected:200});
     if(building)await phase('building-delete',()=>`/api/admin/buildings/${building.id}`,{method:'DELETE',data:()=>({version:building.version}),count:1,expected:200});
     await phase('contact-delete','/api/admin/contacts',{method:'DELETE',data:{id:contactId},count:1,expected:200});
   }
 }
 await phase('logout','/api/admin/logout',{method:'POST',data:{},count:1});
}

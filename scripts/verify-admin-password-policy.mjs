import {spawn,spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {hashPassword} from '../db/passwords.mjs';
const persist=process.cwd()+'/.wrangler/tests/admin-policy-'+Date.now();
const password=randomBytes(24).toString('hex');
const env={...process.env,D1_PERSIST_PATH:persist,ADMIN_USERNAME:'admin',ADMIN_PASSWORD:password,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:process.cwd()+'/reports/wrangler'};
const setup=spawnSync(process.execPath,['scripts/d1-setup.mjs','--local','--from-json'],{env,encoding:'utf8'});
if(setup.status)throw Error('Isolated local DB setup failed');
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--ip','127.0.0.1','--port','3101','--local','--persist-to',persist,'--var','SESSION_COOKIE_SECURE:false','--var','APP_ENV:staging'],{env,stdio:'pipe'});
child.stdout.on('data',()=>{});child.stderr.on('data',()=>{});
const base='http://127.0.0.1:3101',checks=[];
async function call(path,expected,{method='GET',data,cookie}={}){
 const r=await fetch(base+path,{method,headers:{origin:base,'content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{}),redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(r.status!==expected)throw Error(`${method} ${path}: expected ${expected}, got ${r.status}`);
 await r.arrayBuffer();checks.push({method,path,status:r.status});return r;
}
function setHash(hash){
 const sql=`UPDATE administrators SET password_hash='${hash}' WHERE username='admin'`;
 const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--persist-to',persist,'--command',sql],{env,encoding:'utf8'});
 if(r.status)throw Error('Local fixture hash change failed');
}
try{
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});await r.arrayBuffer();if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw Error('Local Worker did not start');
 await call('/api/admin/cafes',401);
 const login=await call('/api/admin/login',200,{method:'POST',data:{username:'admin',password}});
 const cookie=login.headers.get('set-cookie')?.split(';')[0];if(!cookie)throw Error('Session cookie missing');
 await call('/api/admin/cafes',200,{cookie});
 await call('/api/admin/cafes',200,{cookie});
 // Same session and warm policy module, but a different hash in the DB.
 setHash(hashPassword('admin'));
 await call('/api/admin/cafes',503,{cookie});
 await call('/api/admin/cafes',503,{cookie});
 setHash(hashPassword(password));
 await call('/api/admin/cafes',200,{cookie});
 await call('/api/admin/logout',200,{method:'POST',data:{},cookie});
 await call('/api/admin/cafes',401,{cookie});
 const result={completedAt:new Date().toISOString(),environment:'isolated local workerd; APP_ENV=staging',checks};
 writeFileSync('reports/admin-policy-runtime-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{child.kill();}

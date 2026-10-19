// Local CPU benchmark, not a measurement of Cloudflare's per-request CPU limit.
import {createAdministratorPasswordPolicy} from '../src/infrastructure/admin/password-policy.ts';
import {hashPassword,verifyPassword} from '../db/passwords.mjs';

const hash=hashPassword('benchmark-only-password');
const iterations=50;
function measure(check){
  const start=process.cpuUsage();
  for(let i=0;i<iterations;i++)check('production',hash);
  const cpu=process.cpuUsage(start);
  return {iterations,cpuMs:(cpu.user+cpu.system)/1000};
}
let beforeCalls=0,afterCalls=0;
const before=measure((environment,value)=>{beforeCalls++;verifyPassword('admin',value);});
const after=measure(createAdministratorPasswordPolicy((password,value)=>{afterCalls++;return verifyPassword(password,value);}));
console.log(JSON.stringify({runtime:process.version,platform:process.platform,scope:'password policy only; includes first cold verdict; excludes DB/SSR/login verification',before:{...before,scryptCalls:beforeCalls},after:{...after,scryptCalls:afterCalls},cpuReductionPercent:100*(1-after.cpuMs/before.cpuMs)},null,2));

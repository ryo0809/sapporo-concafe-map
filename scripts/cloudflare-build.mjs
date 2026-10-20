import {spawnSync} from 'node:child_process';
import {prepareWorkerStatic} from './prepare-worker-static.mjs';

const result=spawnSync(process.execPath,['node_modules/@opennextjs/cloudflare/dist/cli/index.js','build',...process.argv.slice(2)],{stdio:'inherit',env:process.env});
if(result.status!==0)process.exit(result.status??1);
prepareWorkerStatic();

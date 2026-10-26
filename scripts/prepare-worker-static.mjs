import {copyFileSync,mkdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {staticRoutes} from '../worker/static-routes.mjs';

export function prepareWorkerStatic(root=process.cwd()){
  const app=path.join(root,'.next/server/app');
  const indexable=readFileSync(path.join(app,'robots.txt.body'),'utf8').includes('Allow: /$');
  const directory=path.join(root,'.open-next/assets/_worker-static',indexable?'indexable':'noindex');
  for(const [route,config]of Object.entries(staticRoutes)){
    const target=path.join(directory,route==='/'?'index.html':route.slice(1));
    mkdirSync(path.dirname(target),{recursive:true});
    copyFileSync(path.join(app,config.source),target);
  }
  console.log(`Prepared ${Object.keys(staticRoutes).length} static Worker responses (${indexable?'indexable':'noindex'}).`);
}

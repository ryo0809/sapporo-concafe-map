import {domain} from "./wrangler.mjs";
/** @param {object} config @param {Record<string,string|undefined>} [env] */
export function checkRelease(config,env=process.env){
  const errors=[];
  const target=config.env?.production;
  const id=target?.d1_databases?.find(db=>db.binding==="DB")?.database_id;
  if(!id||! /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)||/^0+-0+-0+-0+-0+$/.test(id))errors.push("productionのD1 database_idが未設定です。");
  const stagingId=config.env?.staging?.d1_databases?.[0]?.database_id;
  if(id&&id!=="00000000-0000-0000-0000-000000000000"&&id===stagingId)errors.push("stagingとproductionに同じD1を指定できません。");
  if(target?.vars?.APP_ENV!=="production"||target?.vars?.SESSION_COOKIE_SECURE!=="true")errors.push("本番環境とSecure Cookieを設定してください。");
  if(!target?.routes?.some(route=>route.pattern===domain&&route.custom_domain))errors.push("採用ドメインのカスタムドメイン設定が必要です。");
  if(target?.workers_dev!==false||target?.preview_urls!==false)errors.push("本番のworkers.devとプレビューURLを無効にしてください。");
  if(env.SITE_INDEXABLE!=="true")errors.push("本番公開時のみSITE_INDEXABLE=trueを指定してください。");
  return errors;
}


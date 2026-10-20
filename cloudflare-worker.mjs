import handler from "./.open-next/worker.js";
import {httpsRedirect} from "./worker/https-redirect.mjs";
import {analyticsResponse} from "./worker/analytics.mjs";
import {fastResponse} from "./worker/fast-path.mjs";
export * from "./.open-next/worker.js";

const worker={
  async fetch(request,env,ctx){
    const redirect=httpsRedirect(request);
    if(redirect)return redirect;
    const fast=await fastResponse(request,env);
    if(fast)return fast;
    const analytics=await analyticsResponse(request,env);
    if(analytics)return analytics;
    return handler.fetch(request,env,ctx);
  },
};
export default worker;

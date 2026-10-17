import handler from "./.open-next/worker.js";
import {httpsRedirect} from "./worker/https-redirect.mjs";
export * from "./.open-next/worker.js";

const worker={
  async fetch(request,env,ctx){
    const redirect=httpsRedirect(request);
    if(redirect)return redirect;
    return handler.fetch(request,env,ctx);
  },
};
export default worker;

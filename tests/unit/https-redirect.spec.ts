import {expect,test} from "@playwright/test";
import {httpsRedirect} from "../../worker/https-redirect.mjs";

test("HTTP pages, APIs and assets redirect to HTTPS without losing path or query",()=>{
  for(const path of ["/","/contact?from=http","/api/admin/login","/icon.svg"]){
    const response=httpsRedirect(new Request(`http://sapporo-concafe-map.com${path}`));
    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe(`https://sapporo-concafe-map.com${path}`);
  }
});

test("HTTPS, staging and localhost requests are not redirected",()=>{
  for(const url of ["https://sapporo-concafe-map.com/contact","http://localhost:3000/","https://sapporo-concafe-map-staging.f-app.workers.dev/"]){
    expect(httpsRedirect(new Request(url))).toBeNull();
  }
  expect(httpsRedirect(new Request("http://localhost/contact",{headers:{host:"sapporo-concafe-map.com","x-forwarded-proto":"https"}}))).toBeNull();
});

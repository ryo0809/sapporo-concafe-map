import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return site.indexable
    ? {rules:{userAgent:"*",disallow:"/",allow:["/$","/contact$","/privacy$","/sitemap.xml$","/_next/static/","/icon.svg","/apple-icon","/social-card.png"]},sitemap:`${site.url}/sitemap.xml`}
    : {rules:{userAgent:"*",disallow:"/"}};
}

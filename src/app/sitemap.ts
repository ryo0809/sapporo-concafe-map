import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return site.indexable ? ["/","/contact","/listing-information","/privacy"].map(path=>({url:new URL(path,site.url).href})) : [];
}

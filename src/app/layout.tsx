import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { site } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.description,
  robots: { index: site.indexable, follow: site.indexable },
  openGraph: { type: "website", locale: "ja_JP", siteName: site.name, title: site.name, description: site.description, images: [{url:"/social-card.png",width:1200,height:630,alt:site.name}] },
  twitter: { card: "summary_large_image", title: site.name, description: site.description, images:["/social-card.png"] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}

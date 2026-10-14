import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "札幌コンカフェマップ",
  description: "札幌のコンセプトカフェを探すためのサービス",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}

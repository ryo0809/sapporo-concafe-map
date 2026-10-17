import type { ReactNode } from "react";
import "@/presentation/admin/admin.css";
export const metadata = { title: "管理画面", robots: {index:false,follow:false} };
export default function AdminLayout({children}:{children:ReactNode}){return children;}

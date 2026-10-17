import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { administrator } from "@/infrastructure/admin/http-session";
import { AdminSettings } from "@/presentation/admin/settings";
type Props = { searchParams: Promise<{ tab?: string }> };
export default function AdminPage({searchParams}:Props){return <Suspense fallback={<p>管理画面を読み込んでいます…</p>}><AuthenticatedDashboard searchParams={searchParams}/></Suspense>;}
async function AuthenticatedDashboard({searchParams}:Props){await connection();const admin=await administrator();if(!admin)redirect("/admin/login");const params=await searchParams;return <AdminSettings username={admin.username} initialTab={params.tab==="contacts"?"contacts":"stores"}/>;}

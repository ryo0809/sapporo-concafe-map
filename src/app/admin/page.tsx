import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { administrator } from "@/infrastructure/admin/http-session";
import { AdminDashboard } from "@/presentation/admin/dashboard";
export default function AdminPage(){return <Suspense fallback={<p>管理画面を読み込んでいます…</p>}><AuthenticatedDashboard/></Suspense>;}
async function AuthenticatedDashboard(){await connection();const admin=await administrator();if(!admin)redirect("/admin/login");return <AdminDashboard username={admin.username}/>;}

import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { administrator } from "@/infrastructure/admin/http-session";
import { ContactInbox } from "@/presentation/admin/contact-inbox";
export default function ContactsPage() { return <Suspense fallback={<p>読み込んでいます…</p>}><AuthenticatedInbox/></Suspense>; }
async function AuthenticatedInbox() {
  await connection();
  if (!await administrator()) redirect("/admin/login");
  return <ContactInbox/>;
}

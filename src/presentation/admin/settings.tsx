"use client";
import { useState } from "react";
import { AdminNavigation, type AdminTab } from "@/presentation/admin/navigation";
import { AdminDashboard } from "@/presentation/admin/dashboard";
import { ContactInbox } from "@/presentation/admin/contact-inbox";

export function AdminSettings({ initialTab = "stores" }: { initialTab?: AdminTab }) {
  const [current, setCurrent] = useState(initialTab);
  const [visited, setVisited] = useState({ stores: initialTab === "stores", contacts: initialTab === "contacts" });
  function select(tab: AdminTab) { setCurrent(tab); setVisited(previous => ({ ...previous, [tab]: true })); }
  return <main className="admin-shell">
    <AdminNavigation current={current} onChange={select}/>
    <div id="admin-panel-stores" role="tabpanel" aria-labelledby="admin-tab-stores" hidden={current !== "stores"}>{visited.stores && <AdminDashboard/>}</div>
    <div id="admin-panel-contacts" role="tabpanel" aria-labelledby="admin-tab-contacts" hidden={current !== "contacts"}>{visited.contacts && <ContactInbox/>}</div>
  </main>;
}

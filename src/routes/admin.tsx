import { AdminCompanyImport } from "@/features/admin/admin-company-import";
import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { AdminAccess, AdminPanel } from "@/features/admin/admin-panel";
export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administração | Onde Tem" }] }),
  component: AdminPage,
});
function AdminPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <AdminAccess>
          <AdminCompanyImport />
          <AdminPanel />
        </AdminAccess>
      </div>
    </SiteShell>
  );
}


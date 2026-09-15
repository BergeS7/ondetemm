import { createFileRoute } from "@tanstack/react-router";
import { AdminAccess, AdminPanel } from "@/features/admin/admin-panel";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração | Onde Tem" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});
function AdminPage() {
  return (
    <AdminAccess>
      <AdminPanel />
    </AdminAccess>
  );
}

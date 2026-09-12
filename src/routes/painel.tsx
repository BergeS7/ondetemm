import { createFileRoute } from "@tanstack/react-router";
import { OwnerPanel } from "@/features/companies/owner-panel";
export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "Minhas empresas | Onde Tem" }] }),
  component: OwnerPanel,
});

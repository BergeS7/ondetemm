import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/features/auth/auth-layout";
import { AuthForm } from "@/features/auth/auth-form";
export const Route = createFileRoute("/cadastrar")({
  head: () => ({ meta: [{ title: "Criar conta | Onde Tem" }] }),
  component: Page,
});
function Page() {
  const navigate = useNavigate();
  return (
    <AuthLayout>
      <AuthForm mode="register" onSuccess={() => void navigate({ to: "/painel" })} />
    </AuthLayout>
  );
}

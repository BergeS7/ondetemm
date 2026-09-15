import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/features/auth/auth-layout";
import { AuthForm } from "@/features/auth/auth-form";
export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha | Onde Tem" }] }),
  component: Page,
});
function Page() {
  return (
    <AuthLayout>
      <AuthForm mode="forgot" onSuccess={() => {}} />
    </AuthLayout>
  );
}

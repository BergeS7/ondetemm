import { afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAccess, AdminPanel } from "@/features/admin/admin-panel";
import { api } from "@/lib/api";
const auth = vi.hoisted(() => ({
  user: { id: "admin-id", role: "ADMIN", name: "Admin" },
  ready: true,
}));
vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => auth }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  auth.user.role = "ADMIN";
});
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <AdminAccess>
        <AdminPanel />
      </AdminAccess>
    </QueryClientProvider>,
  );
}
function mockApi() {
  return vi.spyOn(api, "request").mockImplementation(async <T,>(path: string): Promise<T> => {
    if (path === "/admin/dashboard")
      return { companies: 1, pending: 1, users: 1, active_subscriptions: 0 } as T;
    if (path.startsWith("/admin/companies?"))
      return {
        data: [
          {
            id: "company-id",
            name: "Empresa Teste",
            status: "PENDING_APPROVAL",
            description: "Descrição completa",
            street: "Rua Teste",
            whatsapp: "5598999999999",
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1, limit: 10 },
      } as T;
    return { success: true } as T;
  });
}
it("blocks non-admin users without fetching administrative data", () => {
  auth.user.role = "USER";
  const request = mockApi();
  mount();
  expect(screen.getByText("Acesso restrito")).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
});
it("approves only after confirmation with an authenticated request", async () => {
  const request = mockApi();
  mount();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Aprovar", exact: true }));
  expect(request.mock.calls.filter(([, o]) => o?.method === "POST")).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/admin/companies/company-id/approve", {
      method: "POST",
      authenticated: true,
    }),
  );
  expect(await screen.findByRole("status")).toHaveProperty(
    "textContent",
    expect.stringContaining("sucesso"),
  );
});
it("requires a reason before rejection and sends it to the API", async () => {
  const request = mockApi();
  mount();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Rejeitar", exact: true }));
  expect(screen.getByRole("button", { name: "Confirmar" })).toHaveProperty("disabled", true);
  await user.type(screen.getByLabelText("Motivo"), "Corrigir endereço");
  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/admin/companies/company-id/reject", {
      method: "POST",
      authenticated: true,
      body: { reason: "Corrigir endereço" },
    }),
  );
});

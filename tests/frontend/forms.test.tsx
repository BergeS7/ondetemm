import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth/auth-provider";
import { AuthForm } from "@/features/auth/auth-form";
import { CompanyForm, normalizePhone } from "@/features/companies/company-form";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import type { ReactNode } from "react";
const stateId = "11111111-1111-4111-8111-111111111111",
  cityId = "22222222-2222-4222-8222-222222222222",
  categoryId = "33333333-3333-4333-8333-333333333333";
function mount(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  sessionStorage.clear();
  api.setSession(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  api.setSession(null);
  sessionStorage.clear();
});
it("registration handles e-mail confirmation without pretending the user is logged in", async () => {
  const request = vi
    .spyOn(api, "request")
    .mockResolvedValue({ session: null, user: { id: "test" } });
  const success = vi.fn();
  mount(<AuthForm mode="register" onSuccess={success} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Seu nome"), "Comerciante Teste");
  await user.type(screen.getByLabelText("E-mail"), "test@example.com");
  await user.type(screen.getByLabelText(/Senha/), "example-password");
  await user.click(screen.getByRole("button", { name: "Criar minha conta" }));
  expect(await screen.findByRole("status")).toHaveProperty(
    "textContent",
    expect.stringContaining("Confira seu e-mail"),
  );
  expect(success).not.toHaveBeenCalled();
  expect(api.hasSession()).toBe(false);
  expect(request).toHaveBeenCalledWith(
    "/auth/register",
    expect.objectContaining({
      method: "POST",
      body: { name: "Comerciante Teste", email: "test@example.com", password: "example-password" },
    }),
  );
});
it("invalid credentials keep the form visible and show the API error", async () => {
  vi.spyOn(api, "request").mockRejectedValue(
    new ApiError(401, "UNAUTHORIZED", "E-mail ou senha inválidos"),
  );
  const success = vi.fn();
  mount(<AuthForm mode="login" onSuccess={success} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("E-mail"), "test@example.com");
  await user.type(screen.getByLabelText(/Senha/), "invalid-password");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect((await screen.findByRole("alert")).textContent).toContain("E-mail ou senha inválidos");
  expect(success).not.toHaveBeenCalled();
});
it("login saves the returned session and loads the real profile", async () => {
  const request = vi.spyOn(api, "request").mockImplementation(
    async <T,>(path: string): Promise<T> =>
      (path === "/auth/login"
        ? {
            session: {
              access_token: "test",
              refresh_token: "test-refresh",
              expires_at: Date.now() / 1000 + 3600,
            },
          }
        : { id: "test-user", name: "Teste", email: "test@example.com", role: "USER" }) as T,
  );
  const success = vi.fn();
  mount(<AuthForm mode="login" onSuccess={success} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("E-mail"), "test@example.com");
  await user.type(screen.getByLabelText(/Senha/), "example-password");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  await waitFor(() => expect(success).toHaveBeenCalledTimes(1));
  expect(request).toHaveBeenCalledWith("/auth/me", { authenticated: true });
  expect(api.hasSession()).toBe(true);
});
it("company form loads real catalog IDs and sends an authenticated, normalized payload", async () => {
  const page = (data: unknown[]) => ({
    data,
    pagination: { page: 1, limit: 100, total: data.length, totalPages: 1 },
  });
  const request = vi
    .spyOn(api, "request")
    .mockImplementation(async <T,>(path: string): Promise<T> => {
      if (path.startsWith("/states?"))
        return page([{ id: stateId, name: "Maranhão", code: "MA" }]) as T;
      if (path.includes("/cities?"))
        return page([
          { id: cityId, state_id: stateId, name: "Santa Inês", slug: "santa-ines" },
        ]) as T;
      if (path.startsWith("/categories?"))
        return page([{ id: categoryId, name: "Churrascarias", slug: "churrascarias" }]) as T;
      return { id: "saved-company", status: "DRAFT" } as T;
    });
  const saved = vi.fn();
  mount(<CompanyForm onSaved={saved} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nome da empresa *"), "Churrascaria Teste");
  await user.type(screen.getByLabelText("Resumo *"), "Almoço todos os dias");
  await user.type(screen.getByLabelText("Sobre a empresa *"), "Churrasco e almoço em família.");
  await screen.findByRole("option", { name: "Churrascarias" });
  await user.selectOptions(screen.getByLabelText("Categoria *"), categoryId);
  await user.selectOptions(screen.getByLabelText("Estado *"), stateId);
  await screen.findByRole("option", { name: "Santa Inês" });
  await user.selectOptions(screen.getByLabelText("Cidade *"), cityId);
  await user.type(screen.getByLabelText("WhatsApp com DDD *"), "(98) 99999-9999");
  await user.type(screen.getByLabelText("Rua / avenida *"), "Rua Central");
  await user.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(request).toHaveBeenCalledWith(
    "/companies",
    expect.objectContaining({
      method: "POST",
      authenticated: true,
      body: expect.objectContaining({
        state_id: stateId,
        city_id: cityId,
        category_ids: [categoryId],
        whatsapp: "5598999999999",
      }),
    }),
  );
});
it("normalizes Brazilian WhatsApp numbers without duplicating country code", () => {
  expect(normalizePhone("(98) 99999-9999")).toBe("5598999999999");
  expect(normalizePhone("+55 98 99999-9999")).toBe("5598999999999");
});

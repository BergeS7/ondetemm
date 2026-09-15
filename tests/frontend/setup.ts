import { vi } from "vitest";
import { createElement, type ReactNode } from "react";

// Components under test may render <Link> internally (e.g. CompanyForm's "Voltar para
// minhas empresas"). The real <Link> reads router context via useLinkProps and crashes
// without a RouterProvider ancestor, which these isolated component tests don't set up.
// Render it as a plain anchor instead — good enough for tests that don't assert on the
// exact resolved href of an internal navigation link.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...props
    }: { to?: string; children?: ReactNode } & Record<string, unknown>) =>
      createElement("a", { href: typeof to === "string" ? to : "#", ...props }, children),
  };
});

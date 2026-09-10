import { it, expect, vi, beforeEach } from "vitest";
import { ApiClient, ApiError, parseSession } from "../../src/lib/api-client";
beforeEach(() => sessionStorage.clear());
const session = {
  access_token: "access-test",
  refresh_token: "refresh-test",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
it("sends bearer only for authenticated requests, never in URLs", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ ok: true }));
  const client = new ApiClient("/api", fetcher, sessionStorage);
  client.setSession(session);
  await client.request("/companies", { authenticated: true });
  expect(fetcher.mock.calls[0]?.[0]).toBe("/api/companies");
  expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
    Authorization: "Bearer access-test",
  });
  fetcher.mockResolvedValue(json({ data: [] }));
  await client.request("/search");
  expect(fetcher.mock.calls[1]?.[1]?.headers).not.toHaveProperty("Authorization");
});
it("renews expired sessions once for concurrent requests", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async (url) =>
      String(url).includes("refresh")
        ? json({ session: { ...session, access_token: "renewed" } })
        : json({ ok: true }),
    );
  const client = new ApiClient("/api", fetcher, sessionStorage);
  client.setSession({ ...session, expires_at: 0 });
  await Promise.all([
    client.request("/auth/me", { authenticated: true }),
    client.request("/me/companies", { authenticated: true }),
  ]);
  expect(fetcher.mock.calls.filter((c) => String(c[0]).includes("/auth/refresh"))).toHaveLength(1);
  expect(
    fetcher.mock.calls
      .filter((c) => !String(c[0]).includes("refresh"))
      .every(
        (c) => (c[1]?.headers as Record<string, string>)["Authorization"] === "Bearer renewed",
      ),
  ).toBe(true);
});
it("clears rejected refresh tokens and asks the user to log in", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(json({ error: { code: "UNAUTHORIZED", message: "Sessão expirada" } }, 401));
  const client = new ApiClient("/api", fetcher, sessionStorage);
  client.setSession({ ...session, expires_at: 0 });
  await expect(client.request("/auth/me", { authenticated: true })).rejects.toBeInstanceOf(
    ApiError,
  );
  expect(client.hasSession()).toBe(false);
  expect(sessionStorage.getItem("onde-tem-session")).toBeNull();
});
it("does not restore a session if logout happens while refresh is in flight", async () => {
  let resolve!: (r: Response) => void;
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const client = new ApiClient("/api", fetcher, sessionStorage);
  client.setSession({ ...session, expires_at: 0 });
  const pending = client.request("/auth/me", { authenticated: true });
  client.setSession(null);
  resolve(json({ session }));
  await expect(pending).rejects.toBeInstanceOf(ApiError);
  expect(client.hasSession()).toBe(false);
});
it("handles unavailable API without leaking server details", async () => {
  const client = new ApiClient(
    "/api",
    vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")),
  );
  await expect(client.request("/states")).rejects.toMatchObject({
    code: "NETWORK_ERROR",
    status: 0,
  });
});
it("ignores malformed stored sessions", () => {
  sessionStorage.setItem("onde-tem-session", "invalid-json");
  const client = new ApiClient("/api", fetch, sessionStorage);
  expect(client.restore()).toBeNull();
  expect(parseSession({ access_token: "only-access" })).toBeNull();
});

import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, message, track } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { SiteShell, PageLoading, ErrorNotice } from "@/components/site-shell";
import { CompanyProfileView, type PublicProfile } from "@/features/companies/company-profile-view";

type Params = { state: string; city: string; slug: string };
function fetchProfile(params: Params, signal?: AbortSignal) {
  return api.request<PublicProfile>(
    `/public/${encodeURIComponent(params.state)}/${encodeURIComponent(params.city)}/companies/${encodeURIComponent(params.slug)}?limit=100`,
    signal ? { signal } : {},
  );
}

export const Route = createFileRoute("/$state/$city/$slug")({
  loader: async ({ params }) => {
    try {
      // Fetched during SSR so the initial HTML carries real content and metadata for
      // crawlers/social previews, not just a loading spinner.
      return await fetchProfile(params);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      // A misconfigured or unreachable API during server rendering (e.g. VITE_API_URL left
      // relative in production — see INTEGRACAO-FRONTEND.md) must not crash the whole page;
      // fall back to the normal client-side fetch instead.
      console.error("SSR prefetch failed for company profile, falling back to client fetch:", error);
      return null;
    }
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    if (!seo) return { meta: [] };
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.description },
        { property: "og:title", content: seo.openGraph.title },
        { property: "og:description", content: seo.openGraph.description },
        { property: "og:url", content: seo.openGraph.url },
        { property: "og:type", content: "business.business" },
        ...(seo.openGraph.image ? [{ property: "og:image", content: seo.openGraph.image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: seo.canonical }],
    };
  },
  component: Page,
});
function Page() {
  const cache = useQueryClient();
  const params = Route.useParams();
  const loaderData = Route.useLoaderData();
  const profile = useQuery({
    queryKey: ["public-company", params],
    queryFn: ({ signal }) => fetchProfile(params, signal),
    initialData: loaderData ?? undefined,
  });
  const id = profile.data?.company.id;
  useEffect(() => {
    if (id)
      void track(id, "PROFILE_VIEW").then(() =>
        cache.invalidateQueries({ queryKey: ["public-metrics", id] }),
      );
  }, [id, cache]);
  return (
    <SiteShell>
      {profile.error ? (
        <div className="profile-wrap">
          <ErrorNotice onRetry={() => void profile.refetch()}>{message(profile.error)}</ErrorNotice>
        </div>
      ) : profile.data ? (
        <CompanyProfileView data={profile.data} />
      ) : (
        <PageLoading text="Carregando empresa" />
      )}
    </SiteShell>
  );
}

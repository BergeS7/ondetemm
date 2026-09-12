import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, message, track } from "@/lib/api";
import { SiteShell, PageLoading, ErrorNotice } from "@/components/site-shell";
import { CompanyProfileView, type PublicProfile } from "@/features/companies/company-profile-view";
export const Route = createFileRoute("/$state/$city/$slug")({ component: Page });
function Page() {
  const cache = useQueryClient();
  const params = Route.useParams();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const profile = useQuery({
    queryKey: ["public-company", params],
    queryFn: ({ signal }) =>
      api.request<PublicProfile>(
        `/public/${encodeURIComponent(params.state)}/${encodeURIComponent(params.city)}/companies/${encodeURIComponent(params.slug)}?limit=100`,
        { signal },
      ),
    enabled: ready,
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
      {profile.isPending ? (
        <PageLoading text="Carregando empresa" />
      ) : profile.error ? (
        <div className="profile-wrap">
          <ErrorNotice onRetry={() => void profile.refetch()}>{message(profile.error)}</ErrorNotice>
        </div>
      ) : (
        <CompanyProfileView data={profile.data} />
      )}
    </SiteShell>
  );
}

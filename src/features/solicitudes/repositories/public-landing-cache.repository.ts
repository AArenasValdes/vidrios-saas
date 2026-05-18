import { createClient } from "@/lib/supabase/client";

type PublicLandingCacheRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
  fetchImpl?: typeof fetch;
};

export function createPublicLandingCacheRepository(
  deps: PublicLandingCacheRepositoryDeps = {}
) {
  const supabase = deps.clientFactory ?? createClient();
  const fetchImpl = deps.fetchImpl ?? fetch;

  return {
    async revalidate() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token?.trim();

      if (!accessToken) {
        return false;
      }

      const response = await fetchImpl("/api/public-landing/revalidate", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    },
  };
}

export type PublicLandingCacheRepository = ReturnType<
  typeof createPublicLandingCacheRepository
>;

let defaultPublicLandingCacheRepository: PublicLandingCacheRepository | null = null;

function getDefaultPublicLandingCacheRepository() {
  if (!defaultPublicLandingCacheRepository) {
    defaultPublicLandingCacheRepository = createPublicLandingCacheRepository();
  }

  return defaultPublicLandingCacheRepository;
}

export const publicLandingCacheRepository: PublicLandingCacheRepository = {
  revalidate() {
    return getDefaultPublicLandingCacheRepository().revalidate();
  },
};

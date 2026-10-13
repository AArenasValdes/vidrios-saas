import { createClient } from "@/lib/supabase/client";

type QuoteProviderVisibilityRepositoryDeps = {
  clientFactory?: ReturnType<typeof createClient>;
};

const TABLE = "organization_quote_provider_visibility";

export type QuoteProviderVisibilityRepository = ReturnType<typeof createQuoteProviderVisibilityRepository>;

export function createQuoteProviderVisibilityRepository(deps: QuoteProviderVisibilityRepositoryDeps = {}) {
  const supabase = deps.clientFactory ?? createClient();

  return {
    async listHiddenProviderKeys(organizationId: string | number): Promise<string[]> {
      const { data, error } = await supabase
        .from(TABLE)
        .select("provider_key")
        .eq("organization_id", organizationId);

      if (error) throw error;
      return (data ?? []).map((row: { provider_key: string }) => String(row.provider_key));
    },

    async setProviderHidden(organizationId: string | number, providerKey: string, hidden: boolean): Promise<void> {
      if (hidden) {
        const { error } = await supabase
          .from(TABLE)
          .insert({ organization_id: organizationId, provider_key: providerKey });
        if (error && error.code !== "23505") throw error;
        return;
      }

      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("organization_id", organizationId)
        .eq("provider_key", providerKey);
      if (error) throw error;
    },
  };
}

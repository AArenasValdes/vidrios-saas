import "server-only";

import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProductFeedbackSubmission } from "@/features/product-feedback/types/product-feedback";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type SubmitProductFeedbackInput = ProductFeedbackSubmission & {
  organizationId: string | number;
  authUserId: string;
};

export function createProductFeedbackRepository(
  clientFactory: () => Promise<ServerSupabaseClient> = createServerSupabaseClient
) {
  return {
    async insert(input: SubmitProductFeedbackInput) {
      const client = await clientFactory();
      const { error } = await client.from("product_feedback").insert({
        organization_id: input.organizationId,
        auth_user_id: input.authUserId,
        category: input.category,
        description: input.description,
        page_path: input.pagePath,
      });

      if (error) {
        throw new Error("No pudimos guardar tu propuesta.");
      }
    },
  };
}

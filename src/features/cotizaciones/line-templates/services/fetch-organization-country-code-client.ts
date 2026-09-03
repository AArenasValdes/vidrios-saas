import { createClient } from "@/lib/supabase/client";

import { normalizeOrganizationCountryCode } from "@/features/cotizaciones/line-templates/services/line-catalog-country";

export async function fetchOrganizationCountryCodeClient(
  organizationId: string | number
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organization_profile")
    .select("country_code")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return normalizeOrganizationCountryCode(data?.country_code);
}

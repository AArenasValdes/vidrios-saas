import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminClientUsageSnapshot = {
  cotizacionesCount: number;
  pdfsGeneradosCount: number;
  clientesRegistradosCount: number;
  firstQuoteAt: string | null;
  firstPdfAt: string | null;
  lastQuoteAt: string | null;
  publicPageActive: boolean;
};

const EMPTY_USAGE: AdminClientUsageSnapshot = {
  cotizacionesCount: 0,
  pdfsGeneradosCount: 0,
  clientesRegistradosCount: 0,
  firstQuoteAt: null,
  firstPdfAt: null,
  lastQuoteAt: null,
  publicPageActive: false,
};

type QuoteRow = {
  organization_id: number;
  creado_en: string;
  pdf_descargado_en: string | null;
};

type ClienteRow = {
  organization_id: number;
};

type ProfileSlugRow = {
  organization_id: number;
  solicitud_publica_slug: string | null;
};

export async function fetchAdminClientsUsageMap(
  organizationIds: number[]
): Promise<Map<number, AdminClientUsageSnapshot>> {
  const usageMap = new Map<number, AdminClientUsageSnapshot>();

  if (organizationIds.length === 0) {
    return usageMap;
  }

  const admin = createAdminClient();

  const [quotesResult, clientesResult, profilesResult] = await Promise.all([
    admin
      .from("cotizaciones")
      .select("organization_id, creado_en, pdf_descargado_en")
      .in("organization_id", organizationIds)
      .is("eliminado_en", null),
    admin
      .from("clientes")
      .select("organization_id")
      .in("organization_id", organizationIds)
      .is("eliminado_en", null),
    admin
      .from("organization_profile")
      .select("organization_id, solicitud_publica_slug")
      .in("organization_id", organizationIds),
  ]);

  for (const organizationId of organizationIds) {
    usageMap.set(organizationId, { ...EMPTY_USAGE });
  }

  for (const quote of (quotesResult.data ?? []) as QuoteRow[]) {
    const organizationId = Number(quote.organization_id);
    const current = usageMap.get(organizationId) ?? { ...EMPTY_USAGE };

    current.cotizacionesCount += 1;
    if (quote.pdf_descargado_en) {
      current.pdfsGeneradosCount += 1;
      if (!current.firstPdfAt || quote.pdf_descargado_en < current.firstPdfAt) {
        current.firstPdfAt = quote.pdf_descargado_en;
      }
    }

    if (!current.firstQuoteAt || quote.creado_en < current.firstQuoteAt) {
      current.firstQuoteAt = quote.creado_en;
    }

    if (!current.lastQuoteAt || quote.creado_en > current.lastQuoteAt) {
      current.lastQuoteAt = quote.creado_en;
    }

    usageMap.set(organizationId, current);
  }

  for (const cliente of (clientesResult.data ?? []) as ClienteRow[]) {
    const organizationId = Number(cliente.organization_id);
    const current = usageMap.get(organizationId) ?? { ...EMPTY_USAGE };
    current.clientesRegistradosCount += 1;
    usageMap.set(organizationId, current);
  }

  for (const profile of (profilesResult.data ?? []) as ProfileSlugRow[]) {
    const organizationId = Number(profile.organization_id);
    const current = usageMap.get(organizationId) ?? { ...EMPTY_USAGE };
    current.publicPageActive = Boolean(profile.solicitud_publica_slug);
    usageMap.set(organizationId, current);
  }

  return usageMap;
}

export async function fetchAdminClientUsage(
  organizationId: number
): Promise<AdminClientUsageSnapshot> {
  const map = await fetchAdminClientsUsageMap([organizationId]);
  return map.get(organizationId) ?? { ...EMPTY_USAGE };
}

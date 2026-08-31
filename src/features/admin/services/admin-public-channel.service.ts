import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminPublicChannelDetail,
  AdminPublicChannelSummary,
  PublicPageStatus,
} from "@/features/admin/types/admin-public-channel";
import {
  buildPublicChannelDetail,
  buildPublicChannelSummary,
  type AdminPublicChannelProfile,
  type PublicSolicitudRow,
} from "@/features/admin/services/admin-public-channel.logic";

export type { AdminPublicChannelDetail, AdminPublicChannelSummary, PublicPageStatus };
export type { AdminPublicChannelProfile, PublicSolicitudRow };
export {
  PUBLIC_CHANNEL_LOOKBACK_DAYS,
  PUBLIC_SOLICITUD_UNREVISED_HOURS,
  buildPublicChannelListLabel,
  hasIncompletePublicPageNeedingSetup,
  hasMultiplePublicRequestsWithoutFollowUp,
  hasTrialWithPublicRequestsNoQuotes,
  hasUnrevisedPublicSolicitudes,
  isTrialLikeClient,
  resolvePublicChannelRecommendedStatus,
  resolvePublicPageStatus,
  resolvePublicPageStatusLabel,
} from "@/features/admin/services/admin-public-channel.logic";

type ProfileRow = {
  organization_id: number;
  solicitud_publica_slug: string | null;
  is_published: boolean | null;
  empresa_telefono: string | null;
  empresa_email: string | null;
  empresa_nombre: string | null;
  solicitud_publica_horario_desde: string | null;
  solicitud_publica_horario_hasta: string | null;
  solicitud_publica_dias_atencion: string | null;
};

export async function fetchPublicChannelProfiles(
  organizationIds: number[]
): Promise<Map<number, AdminPublicChannelProfile>> {
  const map = new Map<number, AdminPublicChannelProfile>();
  if (organizationIds.length === 0) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_profile")
    .select(
      "organization_id, solicitud_publica_slug, is_published, empresa_telefono, empresa_email, empresa_nombre, solicitud_publica_horario_desde, solicitud_publica_horario_hasta, solicitud_publica_dias_atencion"
    )
    .in("organization_id", organizationIds);

  for (const row of (data ?? []) as ProfileRow[]) {
    const organizationId = Number(row.organization_id);
    map.set(organizationId, {
      slug: row.solicitud_publica_slug,
      isPublished: Boolean(row.is_published),
      empresaTelefono: row.empresa_telefono,
      empresaEmail: row.empresa_email,
      empresaNombre: row.empresa_nombre,
      horarioDesde: row.solicitud_publica_horario_desde,
      horarioHasta: row.solicitud_publica_horario_hasta,
      diasAtencion: row.solicitud_publica_dias_atencion,
    });
  }

  return map;
}

export async function fetchPublicSolicitudesForOrganizations(
  organizationIds: number[]
): Promise<Map<number, PublicSolicitudRow[]>> {
  const map = new Map<number, PublicSolicitudRow[]>();
  if (organizationIds.length === 0) return map;

  const admin = createAdminClient();
  const { data } = await admin
    .from("solicitudes_contacto")
    .select("id, nombre, organization_id, contexto, estado, creado_en, ayuda, contactada_at, utm_source, utm_medium")
    .eq("contexto", "empresa-publica")
    .in("organization_id", organizationIds)
    .order("creado_en", { ascending: false });

  for (const row of (data ?? []) as PublicSolicitudRow[]) {
    const organizationId = Number(row.organization_id);
    const current = map.get(organizationId) ?? [];
    current.push(row);
    map.set(organizationId, current);
  }

  return map;
}

export async function fetchPublicChannelSummaries(
  organizationIds: number[]
): Promise<Map<number, AdminPublicChannelSummary>> {
  const [profiles, solicitudesByOrg] = await Promise.all([
    fetchPublicChannelProfiles(organizationIds),
    fetchPublicSolicitudesForOrganizations(organizationIds),
  ]);

  const summaries = new Map<number, AdminPublicChannelSummary>();

  for (const organizationId of organizationIds) {
    const profile = profiles.get(organizationId) ?? {
      slug: null,
      isPublished: false,
      empresaTelefono: null,
      empresaEmail: null,
      empresaNombre: null,
      horarioDesde: null,
      horarioHasta: null,
      diasAtencion: null,
    };
    summaries.set(
      organizationId,
      buildPublicChannelSummary(profile, solicitudesByOrg.get(organizationId) ?? [])
    );
  }

  return summaries;
}

export async function fetchPublicChannelDetail(
  organizationId: number
): Promise<AdminPublicChannelDetail> {
  const [profiles, solicitudesByOrg] = await Promise.all([
    fetchPublicChannelProfiles([organizationId]),
    fetchPublicSolicitudesForOrganizations([organizationId]),
  ]);

  const profile = profiles.get(organizationId) ?? {
    slug: null,
    isPublished: false,
    empresaTelefono: null,
    empresaEmail: null,
    empresaNombre: null,
    horarioDesde: null,
    horarioHasta: null,
    diasAtencion: null,
  };

  return buildPublicChannelDetail(profile, solicitudesByOrg.get(organizationId) ?? []);
}

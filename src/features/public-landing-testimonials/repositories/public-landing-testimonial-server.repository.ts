import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { EntityId } from "@/types/common";
import type {
  CreatePublicLandingTestimonialInput,
  PublicLandingTestimonial,
  UpdatePublicLandingTestimonialInput,
} from "@/features/public-landing-testimonials/types/public-landing-testimonial";

type PublicLandingTestimonialServerRow = {
  id: EntityId;
  organization_id: EntityId;
  nombre_corto: string | null;
  comentario: string;
  estrellas: number;
  estado: "pendiente" | "aprobada" | "oculta";
  creado_en: string | null;
  actualizado_en: string | null;
  aprobado_en: string | null;
  ocultado_en: string | null;
};

const TABLE_NAME = "public_landing_testimonials";
const SELECT_FIELDS =
  "id, organization_id, nombre_corto, comentario, estrellas, estado, creado_en, actualizado_en, aprobado_en, ocultado_en";

function mapRow(
  row: PublicLandingTestimonialServerRow
): PublicLandingTestimonial {
  return {
    id: row.id,
    organizationId: row.organization_id,
    nombreCorto: row.nombre_corto ?? "",
    comentario: row.comentario,
    estrellas: row.estrellas,
    estado: row.estado,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    aprobadoEn: row.aprobado_en,
    ocultadoEn: row.ocultado_en,
  };
}

export async function getApprovedPublicLandingTestimonialsByOrganizationId(
  organizationId: EntityId
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE_NAME as never)
    .select(SELECT_FIELDS)
    .eq("organization_id", organizationId)
    .eq("estado", "aprobada")
    .order("aprobado_en", { ascending: false })
    .limit(6);

  if (error) {
    return [];
  }

  return ((data as PublicLandingTestimonialServerRow[] | null) ?? []).map(mapRow);
}

export async function createPublicLandingTestimonialSubmission(
  input: CreatePublicLandingTestimonialInput
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE_NAME as never)
    .insert({
      organization_id: input.organizationId,
      nombre_corto: input.nombreCorto || null,
      comentario: input.comentario,
      estrellas: input.estrellas,
      estado: "pendiente",
    } as never)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return mapRow(data as PublicLandingTestimonialServerRow);
}

export async function updatePublicLandingTestimonialStatusServer(
  id: EntityId,
  organizationId: EntityId,
  input: UpdatePublicLandingTestimonialInput
) {
  const supabase = createAdminClient();
  const isApproved = input.estado === "aprobada";
  const isHidden = input.estado === "oculta";

  const { data, error } = await supabase
    .from(TABLE_NAME as never)
    .update({
      estado: input.estado,
      actualizado_en: new Date().toISOString(),
      aprobado_en: isApproved ? new Date().toISOString() : null,
      ocultado_en: isHidden ? new Date().toISOString() : null,
    } as never)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return mapRow(data as PublicLandingTestimonialServerRow);
}

import "server-only";

import {
  getProspectById,
  insertProspect,
  listProspects,
  softDeleteProspect,
  updateProspect,
} from "@/features/growth/repositories/growth-prospects.repository";
import { insertActivity } from "@/features/growth/repositories/growth-activities.repository";
import {
  applyContactAutomation,
  applyPaymentAutomation,
  applyTrialLinkAutomation,
  recordStateChangeActivity,
} from "@/features/growth/services/growth-automation.service";
import {
  getOrganizationTrialSnapshot,
  hasApprovedPayment,
} from "@/features/growth/services/growth-kpi.service";
import {
  mapProspectRowToUi,
  mapUiProspectToInsert,
  mapUiStatusToDb,
} from "@/features/growth/services/growth-prospect-mapper";
import type { GrowthRouteContext } from "@/features/growth/services/growth-route-access.service";
import { loadGrowthWorkspace } from "@/features/growth/services/growth-workspace.service";
import type {
  CreateGrowthProspectInput,
  GrowthProspect,
  UpdateGrowthProspectInput,
} from "@/features/growth/types/growth-dashboard";
import type { GrowthProspectFilters } from "@/features/growth/types/growth-supabase";

function ymdToIso(ymd: string) {
  return `${ymd}T12:00:00.000Z`;
}

export async function listGrowthProspects(
  context: GrowthRouteContext,
  filters: GrowthProspectFilters = {}
): Promise<GrowthProspect[]> {
  const rows = await listProspects(context.supabase, context.workspaceId, filters);
  return rows.map(mapProspectRowToUi);
}

export async function createGrowthProspect(
  context: GrowthRouteContext,
  input: CreateGrowthProspectInput
): Promise<GrowthProspect> {
  const row = mapUiProspectToInsert(
    context.workspaceId,
    input,
    context.user.id
  );
  const inserted = await insertProspect(
    context.supabase,
    row as unknown as Record<string, unknown>
  );
  return mapProspectRowToUi(inserted);
}

export async function patchGrowthProspect(
  context: GrowthRouteContext,
  prospectId: string,
  patch: UpdateGrowthProspectInput
): Promise<GrowthProspect> {
  const current = await getProspectById(
    context.supabase,
    context.workspaceId,
    prospectId
  );

  if (!current) {
    throw new Error("Prospecto no encontrado.");
  }

  const dbPatch: Record<string, unknown> = {};

  if (patch.empresa !== undefined) dbPatch.empresa = patch.empresa;
  if (patch.nombre !== undefined) dbPatch.contacto_nombre = patch.nombre;
  if (patch.whatsapp !== undefined) dbPatch.telefono = patch.whatsapp;
  if (patch.ciudad !== undefined) dbPatch.ciudad = patch.ciudad;
  if (patch.origen !== undefined) dbPatch.fuente = patch.origen;
  if (patch.estado !== undefined) dbPatch.estado = mapUiStatusToDb(patch.estado);
  if (patch.proximoPaso !== undefined) dbPatch.proxima_accion_tipo = patch.proximoPaso;
  if (patch.fechaProximoSeguimiento !== undefined) {
    dbPatch.proxima_accion_en = ymdToIso(patch.fechaProximoSeguimiento);
  }
  if (patch.notas !== undefined) dbPatch.resumen_personalizacion = patch.notas;
  if (patch.dataStatus !== undefined) dbPatch.data_status = patch.dataStatus;
  if (patch.segmento !== undefined) dbPatch.segmento = patch.segmento;
  if (patch.rubro !== undefined) dbPatch.rubro = patch.rubro;
  if (patch.noContactar !== undefined) {
    dbPatch.no_contactar = patch.noContactar;
    if (patch.noContactar) dbPatch.estado = "no_contactar";
  }
  if (patch.convertedOrganizationId !== undefined) {
    dbPatch.converted_organization_id = patch.convertedOrganizationId;
  }

  const updated = await updateProspect(
    context.supabase,
    context.workspaceId,
    prospectId,
    dbPatch
  );

  if (patch.estado && mapUiStatusToDb(patch.estado) !== current.estado) {
    await recordStateChangeActivity(context.supabase, {
      workspaceId: context.workspaceId,
      prospectId,
      authUserId: context.user.id,
      previousStatus: current.estado,
      nextStatus: mapUiStatusToDb(patch.estado),
    });

    await applyContactAutomation(context.supabase, {
      workspaceId: context.workspaceId,
      prospectId,
      authUserId: context.user.id,
      previousStatus: current.estado,
      nextStatus: mapUiStatusToDb(patch.estado),
    });
  }

  if (patch.convertedOrganizationId) {
    const trial = await getOrganizationTrialSnapshot(patch.convertedOrganizationId);
    await applyTrialLinkAutomation(context.supabase, {
      workspaceId: context.workspaceId,
      prospectId,
      authUserId: context.user.id,
      organizationId: patch.convertedOrganizationId,
      trialEndsAt: trial?.trial_ends_at ?? null,
    });
  }

  return mapProspectRowToUi(updated);
}

export async function registerProspectContact(
  context: GrowthRouteContext,
  prospectId: string,
  input: { canal?: string; contenido?: string }
): Promise<GrowthProspect> {
  const current = await getProspectById(
    context.supabase,
    context.workspaceId,
    prospectId
  );

  if (!current) {
    throw new Error("Prospecto no encontrado.");
  }

  await insertActivity(context.supabase, {
    workspace_id: context.workspaceId,
    prospect_id: prospectId,
    tipo: "mensaje_enviado",
    canal: input.canal ?? null,
    contenido: input.contenido ?? "Contacto registrado",
    creado_por_auth_user_id: context.user.id,
    metadata_json: {},
  });

  return patchGrowthProspect(context, prospectId, {
    estado: "contactado",
    proximoPaso: "Esperar respuesta o enviar follow-up",
  });
}

export async function markProspectPaid(
  context: GrowthRouteContext,
  prospectId: string
): Promise<GrowthProspect> {
  const current = await getProspectById(
    context.supabase,
    context.workspaceId,
    prospectId
  );

  if (!current) {
    throw new Error("Prospecto no encontrado.");
  }

  if (current.converted_organization_id) {
    const paid = await hasApprovedPayment(current.converted_organization_id);
    if (!paid) {
      await applyPaymentAutomation(context.supabase, {
        workspaceId: context.workspaceId,
        prospectId,
        authUserId: context.user.id,
      });
    }
  }

  return patchGrowthProspect(context, prospectId, {
    estado: "pagado",
    proximoPaso: "Pedir referido o caso de éxito",
  });
}

export async function deleteGrowthProspect(
  context: GrowthRouteContext,
  prospectId: string
) {
  await softDeleteProspect(context.supabase, context.workspaceId, prospectId);
  return loadGrowthWorkspace(context);
}

export async function advanceGrowthProspect(
  context: GrowthRouteContext,
  prospectId: string
): Promise<GrowthProspect> {
  const prospect = await getProspectById(
    context.supabase,
    context.workspaceId,
    prospectId
  );

  if (!prospect) {
    throw new Error("Prospecto no encontrado.");
  }

  const flow: Record<string, { estado: string; paso: string }> = {
    nuevo: { estado: "contactado", paso: "Esperar respuesta o enviar follow-up" },
    investigado: { estado: "listo_para_contactar", paso: "Primer contacto" },
    listo_para_contactar: { estado: "contactado", paso: "Esperar respuesta" },
    contactado: { estado: "respondio", paso: "Calificar interés" },
    respondio: { estado: "demo_agendada", paso: "Hacer demo" },
    calificado: { estado: "demo_agendada", paso: "Agendar demo" },
    demo_agendada: { estado: "piloto_activo", paso: "Acompañar onboarding" },
    piloto_activo: { estado: "activado", paso: "Cerrar pago o plan" },
    activado: { estado: "pagado", paso: "Pedir referido" },
    sin_respuesta: { estado: "contactado", paso: "Reactivar conversación" },
    no_calza: { estado: "nuevo", paso: "Reevaluar encaje" },
  };

  const next = flow[prospect.estado] ?? flow.nuevo;

  return patchGrowthProspect(context, prospectId, {
    estado: next.estado as GrowthProspect["estado"],
    proximoPaso: next.paso,
  });
}

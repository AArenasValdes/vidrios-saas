import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { insertActivity } from "@/features/growth/repositories/growth-activities.repository";
import {
  findPendingTask,
  insertTask,
  completePendingTasksByType,
} from "@/features/growth/repositories/growth-tasks.repository";
import type { GrowthDbProspectStatus } from "@/features/growth/types/growth-supabase";

function addDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export async function recordStateChangeActivity(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    prospectId: string;
    authUserId: string;
    previousStatus: GrowthDbProspectStatus;
    nextStatus: GrowthDbProspectStatus;
  }
) {
  await insertActivity(supabase, {
    workspace_id: input.workspaceId,
    prospect_id: input.prospectId,
    tipo: "cambio_estado",
    contenido: `${input.previousStatus} → ${input.nextStatus}`,
    creado_por_auth_user_id: input.authUserId,
    metadata_json: {
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
    },
  });
}

export async function applyContactAutomation(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    prospectId: string;
    authUserId: string;
    nextStatus: GrowthDbProspectStatus;
    previousStatus: GrowthDbProspectStatus;
  }
) {
  if (input.nextStatus === "contactado") {
    const existing = await findPendingTask(
      supabase,
      input.workspaceId,
      input.prospectId,
      "followup"
    );

    if (!existing) {
      await insertTask(supabase, {
        workspace_id: input.workspaceId,
        prospect_id: input.prospectId,
        titulo: "Follow-up sugerido (+3 días)",
        tipo: "followup",
        prioridad: "media",
        vence_en: addDays(3),
        metadata_json: { auto: true, rule: "contactado_plus_3" },
        creado_por_auth_user_id: input.authUserId,
      });
    }
  }

  if (
    (input.nextStatus === "contactado" || input.nextStatus === "respondio") &&
    input.previousStatus === input.nextStatus
  ) {
    const existing = await findPendingTask(
      supabase,
      input.workspaceId,
      input.prospectId,
      "followup"
    );

    if (!existing) {
      await insertTask(supabase, {
        workspace_id: input.workspaceId,
        prospect_id: input.prospectId,
        titulo: "Último follow-up sugerido (+7 días)",
        tipo: "followup",
        prioridad: "alta",
        vence_en: addDays(7),
        metadata_json: { auto: true, rule: "sin_respuesta_plus_7" },
        creado_por_auth_user_id: input.authUserId,
      });
    }
  }
}

export async function applyTrialLinkAutomation(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    prospectId: string;
    authUserId: string;
    organizationId: number;
    trialEndsAt: string | null;
  }
) {
  const existing = await findPendingTask(
    supabase,
    input.workspaceId,
    input.prospectId,
    "activar_trial"
  );

  if (!existing) {
    await insertTask(supabase, {
      workspace_id: input.workspaceId,
      prospect_id: input.prospectId,
      titulo: "Activar trial vinculado",
      tipo: "activar_trial",
      prioridad: "alta",
      vence_en: addDays(1),
      metadata_json: {
        auto: true,
        organizationId: input.organizationId,
        trialEndsAt: input.trialEndsAt,
      },
      creado_por_auth_user_id: input.authUserId,
    });
  }

  if (input.trialEndsAt) {
    const endsAt = new Date(input.trialEndsAt).getTime();
    const in48h = Date.now() + 48 * 60 * 60 * 1000;

    if (endsAt <= in48h) {
      const paymentTask = await findPendingTask(
        supabase,
        input.workspaceId,
        input.prospectId,
        "recuperar_pago"
      );

      if (!paymentTask) {
        await insertTask(supabase, {
          workspace_id: input.workspaceId,
          prospect_id: input.prospectId,
          titulo: "Recuperar pago — trial termina pronto",
          tipo: "recuperar_pago",
          prioridad: "alta",
          vence_en: input.trialEndsAt,
          metadata_json: { auto: true, organizationId: input.organizationId },
          creado_por_auth_user_id: input.authUserId,
        });
      }
    }
  }
}

export async function applyPaymentAutomation(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    prospectId: string;
    authUserId: string;
  }
) {
  await completePendingTasksByType(
    supabase,
    input.workspaceId,
    input.prospectId,
    "recuperar_pago"
  );

  await insertActivity(supabase, {
    workspace_id: input.workspaceId,
    prospect_id: input.prospectId,
    tipo: "pago",
    contenido: "Pago registrado",
    creado_por_auth_user_id: input.authUserId,
    metadata_json: { auto: true },
  });
}

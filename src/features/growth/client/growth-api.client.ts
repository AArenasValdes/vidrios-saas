import type {
  CreateGrowthProspectInput,
  GrowthProspect,
  GrowthTodayItem,
  GrowthWorkspace,
  UpdateGrowthManualMetricsInput,
  UpdateGrowthProspectInput,
  UpdateGrowthSettingsInput,
} from "@/features/growth/types/growth-dashboard";
import type { GrowthImportResult } from "@/features/growth/types/growth-supabase";

async function growthFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "No pudimos completar la acción.");
  }

  return payload;
}

export const growthApiClient = {
  loadWorkspace() {
    return growthFetch<{ workspace: GrowthWorkspace }>(
      "/api/admin/growth/workspace"
    ).then((data) => data.workspace);
  },
  loadWorkToday() {
    return growthFetch<{ workToday: GrowthTodayItem[] }>(
      "/api/admin/growth/work-today"
    ).then((data) => data.workToday);
  },
  updateSettings(patch: UpdateGrowthSettingsInput) {
    return growthFetch<{ workspace: GrowthWorkspace }>(
      "/api/admin/growth/workspace",
      {
        method: "PATCH",
        body: JSON.stringify({ settings: patch }),
      }
    ).then((data) => data.workspace);
  },
  updateManualMetrics(patch: UpdateGrowthManualMetricsInput) {
    return growthFetch<{ workspace: GrowthWorkspace }>(
      "/api/admin/growth/workspace",
      {
        method: "PATCH",
        body: JSON.stringify({ manualMetrics: patch }),
      }
    ).then((data) => data.workspace);
  },
  addProspect(input: CreateGrowthProspectInput) {
    return growthFetch<{ prospect: GrowthProspect }>(
      "/api/admin/growth/prospects",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    ).then((data) => data.prospect);
  },
  updateProspect(prospectId: string, patch: UpdateGrowthProspectInput) {
    return growthFetch<{ prospect: GrowthProspect }>(
      `/api/admin/growth/prospects/${prospectId}`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      }
    ).then((data) => data.prospect);
  },
  advanceProspect(prospectId: string) {
    return growthFetch<{ prospect: GrowthProspect }>(
      `/api/admin/growth/prospects/${prospectId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ action: "advance" }),
      }
    ).then((data) => data.prospect);
  },
  deleteProspect(prospectId: string) {
    return growthFetch<{ workspace: GrowthWorkspace }>(
      `/api/admin/growth/prospects/${prospectId}`,
      { method: "DELETE" }
    ).then((data) => data.workspace);
  },
  registerContact(prospectId: string, input: { canal?: string; contenido?: string }) {
    return growthFetch<{ prospect: GrowthProspect }>(
      `/api/admin/growth/prospects/${prospectId}/contact`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    ).then((data) => data.prospect);
  },
  insertActivity(input: {
    prospect_id: string;
    tipo: string;
    contenido?: string;
    canal?: string;
    metadata_json?: Record<string, unknown>;
  }) {
    return growthFetch<{ activity: unknown }>("/api/admin/growth/activities", {
      method: "POST",
      body: JSON.stringify(input),
    }).then((data) => data.activity);
  },
  importLocalWorkspace(workspace: GrowthWorkspace) {
    return growthFetch<{ result: GrowthImportResult; workspace: GrowthWorkspace }>(
      "/api/admin/growth/import-local-workspace",
      {
        method: "POST",
        body: JSON.stringify({ workspace }),
      }
    );
  },
  importSpreadsheet(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return fetch("/api/admin/growth/import-excel", {
      method: "POST",
      body: formData,
    }).then(async (response) => {
      const payload = (await response.json()) as {
        result?: GrowthImportResult;
        workspace?: GrowthWorkspace;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos importar el archivo.");
      }

      return payload as { result: GrowthImportResult; workspace: GrowthWorkspace };
    });
  },
};

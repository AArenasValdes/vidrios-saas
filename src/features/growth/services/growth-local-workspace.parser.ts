import type { GrowthWorkspace } from "@/features/growth/types/growth-dashboard";
import {
  isGrowthWorkspaceV3,
  isLegacyWorkspaceV2,
  migrateWorkspaceV2ToV3,
} from "@/features/growth/services/growth-workspace-migration";

const STORAGE_KEY_V3 = "ventora:growth-workspace:v3";
const STORAGE_KEY_V2 = "ventora:growth-workspace:v2";

export type LocalWorkspaceParseResult = {
  workspace: GrowthWorkspace | null;
  source: "v3" | "v2" | "none";
  rawFound: boolean;
};

export function parseLocalWorkspaceFromStorage(): LocalWorkspaceParseResult {
  if (typeof window === "undefined") {
    return { workspace: null, source: "none", rawFound: false };
  }

  try {
    const rawV3 = window.localStorage.getItem(STORAGE_KEY_V3);

    if (rawV3) {
      const parsed = JSON.parse(rawV3) as unknown;

      if (isGrowthWorkspaceV3(parsed)) {
        return { workspace: parsed, source: "v3", rawFound: true };
      }
    }

    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);

    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown;

      if (isLegacyWorkspaceV2(parsed)) {
        return {
          workspace: migrateWorkspaceV2ToV3(parsed),
          source: "v2",
          rawFound: true,
        };
      }
    }
  } catch {
    return { workspace: null, source: "none", rawFound: false };
  }

  return { workspace: null, source: "none", rawFound: false };
}

export function downloadLocalWorkspaceBackup(workspace: GrowthWorkspace) {
  const blob = new Blob([JSON.stringify(workspace, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ventora-growth-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function clearLocalWorkspaceStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY_V3);
  window.localStorage.removeItem(STORAGE_KEY_V2);
}

export function summarizeLocalWorkspace(workspace: GrowthWorkspace) {
  return {
    prospects: workspace.prospects.length,
    tasks: workspace.marketingTasks.length,
    clientAccounts: workspace.clientAccounts.length,
    hasManualMetrics: Boolean(workspace.manualMetrics),
    experiments: workspace.experimentos?.length ?? 0,
  };
}

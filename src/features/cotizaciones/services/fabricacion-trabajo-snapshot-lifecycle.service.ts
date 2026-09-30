import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

type FabricationSnapshotCarrier = Parameters<
  typeof construirFabricacionTrabajoSnapshot
>[0]["items"];

export function shouldResolveFabricationRecipesForQuoteSave(existingId?: string | number | null) {
  return existingId == null;
}

export function resolveFabricacionTrabajoSnapshotForQuoteSave(input: {
  existingId?: string | number | null;
  existingSnapshot?: FabricacionTrabajoSnapshot | null;
  capturedAt: string;
  items: FabricationSnapshotCarrier;
}): FabricacionTrabajoSnapshot | null {
  if (!shouldResolveFabricationRecipesForQuoteSave(input.existingId)) {
    return input.existingSnapshot ?? null;
  }

  return construirFabricacionTrabajoSnapshot({
    capturedAt: input.capturedAt,
    items: input.items,
  });
}

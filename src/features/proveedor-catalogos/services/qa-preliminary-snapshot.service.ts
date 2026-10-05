import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

import {
  isSupplierCatalogQaEnabledForIdentity,
  type SupplierCatalogQaConfig,
} from "./proveedor-catalogo-qa.service";

export type SupplierCatalogQaPreliminaryRecipeMarker = {
  mode: "supplier_catalog_v1_qa_preliminary";
  readiness: "lista_para_validar";
  provenance: {
    sourceType: FabricationRecipeRecord["sourceType"];
    sourceReference: string | null;
  };
};

export function buildQaPreliminaryRecipeMarker(input: {
  organizationId: string | number | null | undefined;
  role: string | null | undefined;
  userEmail: string | null | undefined;
  config: SupplierCatalogQaConfig;
  recipe: Pick<FabricationRecipeRecord, "id" | "status" | "sourceType" | "sourceReference"> & {
    selectedVariant: string | null;
  };
  explicitlyResolvedRecipeId: string | null | undefined;
  compositionComplete: boolean;
  listaParaValidar: boolean;
}): SupplierCatalogQaPreliminaryRecipeMarker | null {
  if (
    !isSupplierCatalogQaEnabledForIdentity({
      organizationId: input.organizationId,
      role: input.role,
      userEmail: input.userEmail,
      config: input.config,
    }) ||
    input.recipe.status !== "draft" ||
    !input.explicitlyResolvedRecipeId ||
    input.explicitlyResolvedRecipeId !== input.recipe.id ||
    !input.recipe.selectedVariant?.trim() ||
    !input.compositionComplete ||
    !input.listaParaValidar
  ) {
    return null;
  }

  return {
    mode: "supplier_catalog_v1_qa_preliminary",
    readiness: "lista_para_validar",
    provenance: {
      sourceType: input.recipe.sourceType,
      sourceReference: input.recipe.sourceReference,
    },
  };
}

export function isQaPreliminarySnapshotAuthorizedForCost(input: {
  snapshot: FabricacionTrabajoSnapshot;
  organizationId: string | number | null | undefined;
  role: string | null | undefined;
  userEmail: string | null | undefined;
  config: SupplierCatalogQaConfig;
}): boolean {
  const marker = (input.snapshot as { qaPreliminary?: unknown }).qaPreliminary;
  if (
    !marker ||
    typeof marker !== "object" ||
    Array.isArray(marker) ||
    !isSupplierCatalogQaEnabledForIdentity({
      organizationId: input.organizationId,
      role: input.role,
      userEmail: input.userEmail,
      config: input.config,
    })
  ) {
    return false;
  }

  const record = marker as Record<string, unknown>;
  if (
    record.mode !== "supplier_catalog_v1_qa_preliminary" ||
    !Array.isArray(record.items) ||
    record.items.length === 0
  ) return false;

  return record.items.every((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const item = value as Record<string, unknown>;
    return Boolean(
      typeof item.itemId === "string" &&
      typeof item.recipeId === "string" &&
      typeof item.recipeVersion === "number" &&
      typeof item.variantKey === "string" &&
      typeof item.sourceType === "string" &&
      Object.prototype.hasOwnProperty.call(item, "sourceReference") &&
      item.readiness === "lista_para_validar" &&
      item.recipeStatus === "draft" &&
      item.itemId.trim() &&
      item.recipeId.trim() &&
      item.recipeVersion > 0 &&
      item.variantKey.trim()
    );
  });
}

export type QaPreliminaryQuoteSnapshotCheck = {
  itemId: string;
  snapshot: {
    recipeId?: string | null;
    recipeVersion?: number | null;
    recipeStatus?: string | null;
    selectedVariant?: string | null;
    qaPreliminary?: unknown;
  } | null;
};

/**
 * Prevents a cost snapshot from being saved against draft fabrication data unless
 * the item and joint-work snapshots carry the same QA provenance and the current
 * authenticated identity is still allowed to run the pilot.
 */
export function validateQaPreliminaryQuoteSnapshots(input: {
  workSnapshot: FabricacionTrabajoSnapshot | null;
  items: readonly QaPreliminaryQuoteSnapshotCheck[];
  organizationId: string | number | null | undefined;
  role: string | null | undefined;
  userEmail: string | null | undefined;
  config: SupplierCatalogQaConfig;
}): { allowed: true } | { allowed: false; reason: string } {
  const draftItems = input.items.filter((item) => item.snapshot?.recipeStatus === "draft");
  const unsupportedPreliminaryItems = input.items.filter((item) =>
    item.snapshot?.recipeStatus != null && item.snapshot.recipeStatus !== "validated" && item.snapshot.recipeStatus !== "draft"
  );
  const workMarker = input.workSnapshot?.qaPreliminary;
  const itemMarkers = input.items.filter((item) => item.snapshot?.qaPreliminary != null);

  if (unsupportedPreliminaryItems.length > 0) {
    return { allowed: false, reason: "Solo se admite en QA una receta draft lista para validar; las demás recetas deben estar validadas." };
  }
  if (draftItems.length === 0 && !workMarker && itemMarkers.length === 0) return { allowed: true };

  if (!input.workSnapshot || !workMarker) {
    return { allowed: false, reason: "La pauta guardada no tiene la marca QA preliminar requerida." };
  }
  if (draftItems.length === 0 || itemMarkers.length !== draftItems.length) {
    return { allowed: false, reason: "La marca QA no coincide con las recetas preliminares guardadas." };
  }
  if (!isQaPreliminarySnapshotAuthorizedForCost({ ...input, snapshot: input.workSnapshot })) {
    return { allowed: false, reason: "La marca QA preliminar no está autorizada para esta organización, usuario o entorno." };
  }

  const markerByItemId = new Map(workMarker.items.map((item) => [item.itemId, item]));
  if (markerByItemId.size !== draftItems.length || workMarker.items.length !== draftItems.length) {
    return { allowed: false, reason: "La pauta QA no contiene exactamente las recetas preliminares de la cotización." };
  }

  for (const item of draftItems) {
    const snapshot = item.snapshot;
    const marker = snapshot?.qaPreliminary as SupplierCatalogQaPreliminaryRecipeMarker | undefined;
    const workItem = markerByItemId.get(item.itemId);
    if (
      !snapshot ||
      !marker ||
      marker.mode !== "supplier_catalog_v1_qa_preliminary" ||
      marker.readiness !== "lista_para_validar" ||
      !workItem ||
      workItem.recipeId !== snapshot.recipeId ||
      workItem.recipeVersion !== snapshot.recipeVersion ||
      workItem.variantKey !== snapshot.selectedVariant ||
      workItem.recipeStatus !== "draft" ||
      workItem.readiness !== marker.readiness ||
      workItem.sourceType !== marker.provenance.sourceType ||
      workItem.sourceReference !== marker.provenance.sourceReference
    ) {
      return { allowed: false, reason: "La procedencia de la receta QA no coincide entre snapshots." };
    }
  }

  return { allowed: true };
}

import type { FabricacionTrabajoPresentationSelection } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

export type ConfirmedSupplierPresentation = {
  presentationId: string;
  providerKey: string;
  supplierSku: string;
  technicalCode: string;
  recipeComponentCodes: readonly string[];
  familyKeys: readonly string[];
  finishCode: string | null;
  finishName: string | null;
  finishResolution: "specific" | "finish_independent";
  commercialLengthMm: number | null;
  configurationKey?: string | null;
  preferred?: boolean;
};

export type SupplierPresentationResolutionRequest = {
  itemId: string;
  familyKey: string;
  finishName: string | null;
  technicalCodes: readonly string[];
  configurationKey?: string | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function normalizeCode(value: string) {
  return value.trim().toLocaleUpperCase("en-US");
}

export function resolveSupplierFinishName(value: string | null | undefined, colorHex?: string | null) {
  const normalized = normalize(value);
  const labels: Record<string, string> = {
    blanco: "Blanco",
    nogal: "Nogal",
    "roble dorado": "Roble Dorado",
    antracita: "Antracita",
    negro: "Negro",
    "negro mate": "Negro Mate",
  };
  if (labels[normalized]) return labels[normalized];
  const labelsByExactHex: Record<string, string> = {
    "#ffffff": "Blanco",
    "#f0eeeb": "Blanco",
    "#2a2a2a": "Negro",
    "#444444": "Negro Mate",
    "#6f4a34": "Nogal",
    "#b7834a": "Roble Dorado",
    "#4f555d": "Antracita",
  };
  return labelsByExactHex[(colorHex ?? "").trim().toLowerCase()] ?? null;
}

/**
 * Resolves only explicit recipe-code + family + finish links. Multiple supplier
 * presentations stay unresolved; SKU suffixes and names are never used as rules.
 */
export function resolveSupplierPresentationsForQuoteItem(input: {
  request: SupplierPresentationResolutionRequest;
  presentations: readonly ConfirmedSupplierPresentation[];
}): FabricacionTrabajoPresentationSelection[] {
  const { request } = input;
  return [...new Set(request.technicalCodes.map(normalizeCode).filter(Boolean))].map((technicalCode) => {
    const candidates = input.presentations.filter((entry) =>
      entry.familyKeys.includes(request.familyKey) &&
      (!entry.configurationKey || entry.configurationKey === request.configurationKey) &&
      (normalizeCode(entry.technicalCode) === technicalCode ||
        entry.recipeComponentCodes.some((code) => normalizeCode(code) === technicalCode)) &&
      (entry.finishResolution === "finish_independent" ||
        Boolean(request.finishName) && normalize(entry.finishName) === normalize(request.finishName))
    );

    const preferredCandidates = candidates.filter((entry) => entry.preferred === true);
    const effectiveCandidates = preferredCandidates.length === 1 ? preferredCandidates : candidates;

    if (effectiveCandidates.length === 0) {
      return {
        technicalCode,
        status: "missing" as const,
        presentationId: null,
        providerKey: null,
        supplierSku: null,
        finishCode: null,
        finishName: null,
        commercialLengthMm: null,
        reason: "No existe una asociación confirmada para este perfil, familia y acabado.",
      };
    }

    if (effectiveCandidates.length > 1) {
      return {
        technicalCode,
        status: "ambiguous" as const,
        presentationId: null,
        providerKey: null,
        supplierSku: null,
        finishCode: null,
        finishName: null,
        commercialLengthMm: null,
        reason: "Hay más de una presentación confirmada; falta seleccionar proveedor/presentación.",
      };
    }

    const [presentation] = effectiveCandidates;
    if (!presentation || presentation.commercialLengthMm == null || presentation.commercialLengthMm <= 0) {
      return {
        technicalCode,
        status: "missing" as const,
        presentationId: presentation?.presentationId ?? null,
        providerKey: presentation?.providerKey ?? null,
        supplierSku: presentation?.supplierSku ?? null,
        finishCode: presentation?.finishCode ?? null,
        finishName: presentation?.finishName ?? null,
        commercialLengthMm: null,
        reason: "La presentación confirmada no tiene largo comercial configurado.",
      };
    }

    return {
      technicalCode,
      status: "resolved" as const,
      presentationId: presentation.presentationId,
      providerKey: presentation.providerKey,
      supplierSku: presentation.supplierSku,
      finishCode: presentation.finishCode,
      finishName: presentation.finishName,
      commercialLengthMm: Math.round(presentation.commercialLengthMm),
    };
  });
}

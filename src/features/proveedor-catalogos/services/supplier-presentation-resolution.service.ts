import type { FabricacionTrabajoPresentationSelection } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import { normalizeUniversalAluminumFamilyKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

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
  /** Explicit purchase-price provider selected for this quote item. */
  providerKey?: string | null;
};

export type SupplierPriceCoveragePresentation = {
  presentationId?: string;
  providerKey?: string;
  technicalCode: string;
  recipeComponentCodes?: readonly string[];
  familyKeys?: readonly string[];
  finishName: string | null;
  finishResolution: "specific" | "finish_independent";
  commercialLengthMm?: number | null;
  configurationKey?: string | null;
  netPrice: number | null;
};

/** Explicit piece selection wins; otherwise use the organization's preference.
 * A null result deliberately leaves the legacy automatic resolver in control.
 */
export function resolveEffectiveSupplierProviderKey(input: {
  explicitProviderKey?: string | null;
  familyPreferenceProviderKey?: string | null;
}): string | null {
  return input.explicitProviderKey?.trim() || input.familyPreferenceProviderKey?.trim() || null;
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function normalizeCode(value: string) {
  return value.trim().toLocaleUpperCase("en-US");
}

export function resolveSupplierPriceProviderCoverage(input: {
  request: SupplierPresentationResolutionRequest;
  presentations: readonly SupplierPriceCoveragePresentation[];
}): Array<{ providerKey: string; pricedProfileCount: number; totalProfileCount: number; isReference: boolean }> {
  const { request } = input;
  const requestedCodes = [...new Set(request.technicalCodes.map(normalizeCode).filter(Boolean))];
  const candidatesByProviderAndCode = new Map<string, Map<string, Map<string, SupplierPriceCoveragePresentation>>>();
  for (const [index, entry] of input.presentations.entries()) {
    if (!entry.providerKey) continue;
    const familyMatches = (entry.familyKeys ?? []).some((key) =>
      (normalizeUniversalAluminumFamilyKey(key) ?? key).toLocaleLowerCase("es-CL") ===
      (normalizeUniversalAluminumFamilyKey(request.familyKey) ?? request.familyKey).toLocaleLowerCase("es-CL")
    );
    const configurationMatches = !entry.configurationKey || entry.configurationKey === request.configurationKey;
    const finishMatches = entry.finishResolution === "finish_independent" ||
      Boolean(request.finishName && entry.finishName && normalize(entry.finishName) === normalize(request.finishName));
    if (!familyMatches || !configurationMatches || !finishMatches) continue;
    const linkedCodes = new Set([entry.technicalCode, ...(entry.recipeComponentCodes ?? [])].map(normalizeCode));
    for (const requestedCode of requestedCodes) {
      if (!linkedCodes.has(requestedCode)) continue;
      const byCode = candidatesByProviderAndCode.get(entry.providerKey) ?? new Map();
      const byPresentation = byCode.get(requestedCode) ?? new Map();
      // Repeated family associations for one presentation are still one
      // candidate. Distinct presentations remain ambiguous, even if only one
      // currently has a price or their lengths happen to match.
      byPresentation.set(entry.presentationId ?? `row:${index}`, entry);
      byCode.set(requestedCode, byPresentation);
      candidatesByProviderAndCode.set(entry.providerKey, byCode);
    }
  }
  const coveredByProvider = [...candidatesByProviderAndCode.entries()].flatMap(([providerKey, byCode]) => {
    const covered = new Set([...byCode.entries()].flatMap(([code, presentations]) => {
      if (presentations.size !== 1) return [];
      const [presentation] = presentations.values();
      if (!presentation || presentation.netPrice == null || presentation.netPrice <= 0 ||
        presentation.commercialLengthMm == null || presentation.commercialLengthMm <= 0) return [];
      return [code];
    }));
    return covered.size > 0 ? [[providerKey, covered] as const] : [];
  });
  return coveredByProvider.map(([providerKey, covered]) => ({
    providerKey,
    pricedProfileCount: covered.size,
    totalProfileCount: requestedCodes.length,
    isReference: providerKey === "arquetipo",
  })).sort((left, right) => Number(right.isReference) - Number(left.isReference) || left.providerKey.localeCompare(right.providerKey, "es-CL"));
}

export function isSupplierProviderCompatibleWithFamily(input: {
  providerKey: string;
  familyKey: string;
  organizationId: number;
  presentations: readonly ConfirmedSupplierPresentation[];
}): boolean {
  const providerKey = input.providerKey.trim();
  if (!providerKey || providerKey.startsWith("taller:") && providerKey !== `taller:${input.organizationId}`) return false;
  const familyKey = (normalizeUniversalAluminumFamilyKey(input.familyKey) ?? input.familyKey).toLocaleLowerCase("es-CL");
  return input.presentations.some((presentation) =>
    presentation.providerKey === providerKey &&
    presentation.familyKeys.some((candidate) =>
      (normalizeUniversalAluminumFamilyKey(candidate) ?? candidate).toLocaleLowerCase("es-CL") === familyKey
    )
  );
}

export function resolveSupplierPresentationFamilyKeys(input: {
  familyKeys: readonly string[];
  technicalEvidence: unknown;
}): string[] {
  const evidence = input.technicalEvidence && typeof input.technicalEvidence === "object" && !Array.isArray(input.technicalEvidence)
    ? input.technicalEvidence as Record<string, unknown>
    : {};
  const excluded = new Set(Array.isArray(evidence.excludedRecipeFamilyKeys)
    ? evidence.excludedRecipeFamilyKeys
        .filter((key): key is string => typeof key === "string")
        .map((key) => normalizeUniversalAluminumFamilyKey(key) ?? key)
    : []);
  const normalized = input.familyKeys
    .map((familyKey) => normalizeUniversalAluminumFamilyKey(familyKey) ?? familyKey)
    .filter((familyKey) => !excluded.has(familyKey));
  return [...new Set(normalized)];
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
      (!request.providerKey || entry.providerKey === request.providerKey) &&
      entry.familyKeys.some((familyKey) =>
        (normalizeUniversalAluminumFamilyKey(familyKey) ?? familyKey) ===
        (normalizeUniversalAluminumFamilyKey(request.familyKey) ?? request.familyKey)
      ) &&
      (!entry.configurationKey || entry.configurationKey === request.configurationKey) &&
      (normalizeCode(entry.technicalCode) === technicalCode ||
        entry.recipeComponentCodes.some((code) => normalizeCode(code) === technicalCode)) &&
      (entry.finishResolution === "finish_independent" ||
        Boolean(request.finishName) && normalize(entry.finishName) === normalize(request.finishName))
    );

    const universalAluminumFamily = normalizeUniversalAluminumFamilyKey(request.familyKey);
    const preferredWorkshopCandidates = candidates.filter((entry) =>
      entry.providerKey.startsWith("taller:") && entry.preferred === true
    );
    const arquetipoCandidates = candidates.filter((entry) => entry.providerKey === "arquetipo");
    const preferredCandidates = candidates.filter((entry) => entry.preferred === true);
    const effectiveCandidates = universalAluminumFamily
      ? request.providerKey
        ? candidates
        : preferredWorkshopCandidates.length > 0
        ? preferredWorkshopCandidates
        : arquetipoCandidates
      : preferredCandidates.length === 1 ? preferredCandidates : candidates;

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

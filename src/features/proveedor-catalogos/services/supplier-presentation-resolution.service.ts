import type { FabricacionTrabajoPresentationSelection } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { CatalogPresentationPrice } from "./costo-tecnico-parcial.service";
import type { OrganizationPurchasePricing } from "./precio-compra.service";
import { resolvePurchasePrice } from "./precio-compra.service";
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

export type SupplierProfilePricePreview = {
  technicalCode: string;
  profileName: string;
  providerKey: string;
  providerLabel: string;
  presentationId: string;
  supplierSku: string;
  presentationDescription: string;
  purchaseUnit: string;
  commercialLengthMm: number | null;
  netPrice: number | null;
  currency: string | null;
  priceSource: "reference" | "provider_adjustment" | "organization_override" | "workshop" | null;
  priceListRevision?: string | null;
  priceListPublishedOn?: string | null;
  priceListValidUntil?: string | null;
  priceReferenceStatus?: CatalogPresentationPrice["priceReferenceStatus"];
  finishPriceBasis?: "specific_finish" | "finish_independent" | "base_reference_other_finish";
  priceSourceFinishName?: string | null;
  priceSourceSupplierSku?: string | null;
  status: "priced" | "missing_price" | "ambiguous";
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

type FinishCandidate = {
  providerKey?: string;
  finishName: string | null;
  finishResolution: "specific" | "finish_independent";
};

function selectFinishCandidates<T extends FinishCandidate>(candidates: readonly T[], finishName: string | null | undefined) {
  const exact = candidates.filter((candidate) => candidate.finishResolution === "specific" &&
    Boolean(finishName && candidate.finishName && normalize(candidate.finishName) === normalize(finishName)));
  if (exact.length > 0) return { candidates: exact, basis: "specific_finish" as const };

  const independent = candidates.filter((candidate) => candidate.finishResolution === "finish_independent");
  if (independent.length > 0) return { candidates: independent, basis: "finish_independent" as const };

  const alumcoTitanioBase = candidates.filter((candidate) =>
    candidate.providerKey?.trim().toLocaleLowerCase("es-CL") === "alumco" &&
    candidate.finishResolution === "specific" &&
    normalize(candidate.finishName) === "titanio" &&
    normalize(finishName) !== "titanio"
  );
  return { candidates: alumcoTitanioBase, basis: "base_reference_other_finish" as const };
}

/** Recipe codes win when a recipe is resolved; otherwise use only published line references. */
export function resolveSupplierTechnicalCodesForQuote(input: {
  recipeCodes: readonly string[];
  documentedCodes: readonly string[];
}): string[] {
  const selected = input.recipeCodes.length > 0 ? input.recipeCodes : input.documentedCodes;
  return [...new Set(selected.map((code) => code.trim()).filter(Boolean))];
}

/**
 * Shows exact catalog/price evidence for documented line references. This is
 * deliberately independent of a recipe: it never estimates cut quantities or
 * a complete component cost. Distinct confirmed presentations remain ambiguous.
 */
export function resolveSupplierProfilePricePreviews(input: {
  request: SupplierPresentationResolutionRequest;
  references: readonly { code: string; name: string }[];
  presentations: readonly CatalogPresentationPrice[];
  providerNames: ReadonlyMap<string, string>;
  organizationPricing?: OrganizationPurchasePricing;
}): SupplierProfilePricePreview[] {
  const familyKey = (normalizeUniversalAluminumFamilyKey(input.request.familyKey) ?? input.request.familyKey).toLocaleLowerCase("es-CL");
  const refsByCode = new Map<string, { code: string; name: string }>();
  for (const reference of input.references) {
    const code = normalizeCode(reference.code);
    if (code && !refsByCode.has(code)) refsByCode.set(code, reference);
  }
  const output: SupplierProfilePricePreview[] = [];
  for (const [code, reference] of refsByCode) {
    const codeCandidates = input.presentations.filter((entry) =>
      entry.providerKey && entry.presentationId &&
      (entry.familyKeys ?? []).some((key) =>
        (normalizeUniversalAluminumFamilyKey(key) ?? key).toLocaleLowerCase("es-CL") === familyKey
      ) &&
      (!entry.configurationKey || entry.configurationKey === input.request.configurationKey) &&
      (normalizeCode(entry.technicalCode) === code || (entry.recipeComponentCodes ?? []).some((linked) => normalizeCode(linked) === code))
    );
    const byProvider = new Map<string, CatalogPresentationPrice[]>();
    for (const candidate of codeCandidates) {
      const providerKey = candidate.providerKey!;
      byProvider.set(providerKey, [...(byProvider.get(providerKey) ?? []), candidate]);
    }
    if (byProvider.size === 0) {
      output.push({
        technicalCode: reference.code,
        profileName: reference.name,
        providerKey: "",
        providerLabel: "Sin presentación con precio para este acabado",
        presentationId: "",
        supplierSku: "",
        presentationDescription: reference.name,
        purchaseUnit: "",
        commercialLengthMm: null,
        netPrice: null,
        currency: null,
        priceSource: null,
        status: "missing_price",
      });
    }
    for (const [providerKey, providerCandidates] of byProvider) {
      const selectedByFinish = selectFinishCandidates(providerCandidates, input.request.finishName);
      const selectedCandidates = selectedByFinish.candidates;
      const [presentation] = selectedCandidates;
      if (selectedCandidates.length === 0) {
        output.push({
          technicalCode: reference.code,
          profileName: reference.name,
          providerKey,
          providerLabel: input.providerNames.get(providerKey) ?? providerKey,
          presentationId: "",
          supplierSku: "",
          presentationDescription: reference.name,
          purchaseUnit: "",
          commercialLengthMm: null,
          netPrice: null,
          currency: null,
          priceSource: null,
          status: "missing_price",
        });
        continue;
      }
      if (selectedCandidates.length > 1 || !presentation?.presentationId) {
        output.push({
          technicalCode: reference.code,
          profileName: reference.name,
          providerKey,
          providerLabel: input.providerNames.get(providerKey) ?? providerKey,
          presentationId: "",
          supplierSku: "",
          presentationDescription: reference.name,
          purchaseUnit: "",
          commercialLengthMm: null,
          netPrice: null,
          currency: null,
          priceSource: null,
          status: "ambiguous",
        });
        continue;
      }
      const isBaseForOtherFinish = selectedByFinish.basis === "base_reference_other_finish";
      const pricing = isBaseForOtherFinish
        ? {
            adjustments: input.organizationPricing?.adjustments ?? [],
            // A Titanio-specific override must never become the selected
            // workshop price for another physical finish.
            overrides: (input.organizationPricing?.overrides ?? []).filter((row) => row.presentationId !== presentation.presentationId),
          }
        : input.organizationPricing;
      const price = resolvePurchasePrice({
        providerKey,
        presentationId: isBaseForOtherFinish ? "" : presentation.presentationId,
        referenceNetPrice: presentation.netPrice,
        referenceBasis: presentation.priceBasis,
        referenceCurrency: presentation.currency,
        commercialLengthMm: presentation.commercialLengthMm,
        organizationPricing: pricing,
      });
      output.push({
        technicalCode: reference.code,
        profileName: reference.name,
        providerKey,
        providerLabel: input.providerNames.get(providerKey) ?? providerKey,
        presentationId: isBaseForOtherFinish ? "" : presentation.presentationId,
        supplierSku: isBaseForOtherFinish ? "" : presentation.supplierSku,
        presentationDescription: isBaseForOtherFinish
          ? `${presentation.technicalName} · precio base Alumco Titanio`
          : presentation.presentationDescription,
        purchaseUnit: presentation.purchaseUnit,
        commercialLengthMm: presentation.commercialLengthMm,
        netPrice: price?.unitNetPrice ?? null,
        currency: price?.currency ?? null,
        priceSource: presentation.origin === "workshop" ? "workshop" : price?.source ?? null,
        priceListRevision: presentation.priceListRevision ?? null,
        priceListPublishedOn: presentation.priceListPublishedOn ?? null,
        priceListValidUntil: presentation.priceListValidUntil ?? null,
        priceReferenceStatus: presentation.priceReferenceStatus,
        finishPriceBasis: selectedByFinish.basis,
        priceSourceFinishName: presentation.finishName,
        priceSourceSupplierSku: isBaseForOtherFinish ? presentation.supplierSku : null,
        status: price ? "priced" : "missing_price",
      });
    }
  }
  return output;
}

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
}): Array<{
  providerKey: string;
  pricedProfileCount: number;
  totalProfileCount: number;
  baseReferenceProfileCount: number;
  isReference: boolean;
}> {
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
    if (!familyMatches || !configurationMatches) continue;
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
    const covered = new Map([...byCode.entries()].flatMap(([code, presentations]) => {
      const selected = selectFinishCandidates([...presentations.values()], request.finishName);
      if (selected.candidates.length !== 1) return [];
      const [presentation] = selected.candidates;
      if (!presentation || presentation.netPrice == null || presentation.netPrice <= 0 ||
        presentation.commercialLengthMm == null || presentation.commercialLengthMm <= 0) return [];
      return [[code, selected.basis] as const];
    }));
    return covered.size > 0 ? [[providerKey, covered] as const] : [];
  });
  return coveredByProvider.map(([providerKey, covered]) => ({
    providerKey,
    pricedProfileCount: covered.size,
    totalProfileCount: requestedCodes.length,
    baseReferenceProfileCount: [...covered.values()].filter((basis) => basis === "base_reference_other_finish").length,
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
    titanio: "Titanio",
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
    "#7d8791": "Titanio",
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
        providerKey: request.providerKey ?? null,
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
        providerKey: request.providerKey ?? null,
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

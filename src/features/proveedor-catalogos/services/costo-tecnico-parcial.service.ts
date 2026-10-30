import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import { resolvePurchasePrice, summarizePriceSources, type OrganizationPurchasePricing, type PriceSource } from "./precio-compra.service";
import { resolveSupplierFinishName } from "./supplier-presentation-resolution.service";
import type { SupplierPriceListReferenceStatus } from "./price-list-selection.service";
import {
  normalizeUniversalAluminumFamilyKey,
  resolveUniversalAluminumLineKey,
} from "@/features/cotizaciones/line-templates/services/default-line-catalog";

export type CatalogPresentationPrice = {
  presentationId?: string;
  providerKey?: string;
  preferred?: boolean;
  familyKeys?: string[];
  configurationKey?: string | null;
  origin?: "workshop";
  technicalCode: string;
  /** Explicit source-recipe codes linked in technical-input evidence metadata. */
  recipeComponentCodes?: string[];
  /** Exact recipe accessory names linked in technical-input evidence metadata. */
  recipeAccessoryNames?: string[];
  technicalName: string;
  supplierSku: string;
  presentationDescription: string;
  finishCode: string;
  finishName: string | null;
  finishResolution: "specific" | "finish_independent";
  purchaseUnit: string;
  commercialLengthMm: number | null;
  netPrice: number | null;
  priceBasis: "commercial_presentation" | "per_meter" | "unknown";
  currency: string | null;
  priceListId: string;
  priceListRevision: string;
  priceListPublishedOn?: string | null;
  priceListValidUntil?: string | null;
  priceReferenceStatus?: SupplierPriceListReferenceStatus;
  priceApplicationStatus?: "specific_finish" | "finish_independent" | "base_reference_other_finish";
  priceSourcePresentationId?: string | null;
  priceSourceSupplierSku?: string | null;
  priceSourceFinishName?: string | null;
};

export type SupplierQuoteItemColor = {
  code: string;
  color: string | null;
  colorHex?: string | null;
  finishName?: string | null;
  catalogLineKey?: string | null;
  supplierFamilyKey?: string | null;
  supplierProviderKey?: string | null;
  configurationKey?: string | null;
  glassDescription?: string | null;
  recipeAccessories?: SupplierRecipeAccessoryConsumption[];
};

type CostLine = {
  /** Canonical family captured so a repeated technical code cannot cross systems. */
  familyKey?: string | null;
  presentationId?: string;
  providerKey?: string;
  /** Code preserved from the saved recipe/cutting snapshot. */
  technicalCode: string;
  /** Canonical code of the technical input, when different from the recipe code. */
  supplierTechnicalCode?: string;
  technicalName: string;
  supplierSku: string;
  finishCode: string;
  finishName: string;
  commercialLengthMm: number | null;
  purchaseUnit: string;
  bars: number;
  netPricePerPresentation: number;
  sourcePrice: number | null;
  referenceUnitNetPrice?: number | null;
  effectivePriceSource?: PriceSource;
  adjustmentPercent?: number | null;
  pricedAt?: string;
  priceBasis: "commercial_presentation" | "per_meter";
  lineNet: number;
  currency: string;
  priceListId: string;
  priceListRevision: string;
  priceListPublishedOn?: string | null;
  priceListValidUntil?: string | null;
  priceReferenceStatus?: SupplierPriceListReferenceStatus;
  priceApplicationStatus?: "specific_finish" | "finish_independent" | "base_reference_other_finish";
  priceSourcePresentationId?: string | null;
  priceSourceSupplierSku?: string | null;
  priceSourceFinishName?: string | null;
  cuts: Array<{ itemCode: string; cutLengthMm: number }>;
  quantity?: number;
};

export type TechnicalCostSnapshot = {
  schemaVersion: 1 | 2;
  status: "no_data" | "partial" | "complete";
  totalCostClassification?: "confirmed" | "commercial_estimate" | "incomplete";
  priceOrigin?: "reference" | "own" | "mixed" | "none";
  calculatedAt: string;
  currency: string | null;
  knownNetTotal: number | null;
  lines: CostLine[];
  missing: Array<{ technicalCode: string | null; description: string; reason: string; quantity?: number; unit?: string }>;
  assumptions: string[];
  sourcePautaCapturedAt: string;
};

export type TechnicalCostDatabaseStatus = "sin_datos" | "parcial" | "completo";

export function technicalCostStatusToDatabase(
  status: TechnicalCostSnapshot["status"]
): TechnicalCostDatabaseStatus {
  return status === "complete" ? "completo" : status === "no_data" ? "sin_datos" : "parcial";
}

export function technicalCostStatusFromDatabase(
  status: string
): TechnicalCostSnapshot["status"] | null {
  if (status === "completo") return "complete";
  if (status === "parcial") return "partial";
  if (status === "sin_datos") return "no_data";
  return null;
}

type PendingCut = {
  familyKey: string;
  technicalCode: string;
  finishKey: string;
  technicalName: string;
  presentation: CatalogPresentationPrice;
  itemCode: string;
  cutLengthMm: number;
  trimMm: number;
  kerfMm: number;
  selectedPresentationId: string | null;
  selectedProviderKey: string | null;
  selectedSupplierSku: string | null;
  selectedFinishCode: string | null;
  selectedFinishName: string | null;
  selectedCommercialLengthMm: number | null;
  catalogLineKey: string | null;
  configurationKey: string | null;
};

export type SupplierRecipeAccessoryConsumption = {
  itemCode: string;
  recipeAccessoryCode: string | null;
  description: string;
  quantity: number;
  unit: string;
};

export function getRecipeAccessoriesFromItemSnapshot(snapshot: unknown, itemCode: string): SupplierRecipeAccessoryConsumption[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];
  const result = (snapshot as Record<string, unknown>).result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  const accessories = (result as Record<string, unknown>).accesorios;
  if (!Array.isArray(accessories)) return [];
  return accessories.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const quantity = Number(row.cantidadUnidades);
    const description = typeof row.nombre === "string" ? row.nombre.trim() : "";
    if (!description || !Number.isFinite(quantity) || quantity <= 0) return [];
    const recipeAccessoryCode = typeof row.codigo === "string" && row.codigo.trim() ? row.codigo.trim() : null;
    const unit = typeof row.unidad === "string" && row.unidad.trim() ? row.unidad.trim() : "unidad";
    return [{ itemCode, recipeAccessoryCode, description, quantity, unit }];
  });
}

function matchesRecipeComponent(entry: CatalogPresentationPrice, recipeCode: string) {
  return entry.technicalCode === recipeCode || entry.recipeComponentCodes?.includes(recipeCode) === true;
}

/**
 * Prefer the persisted presentation UUID, then recover old quote snapshots by
 * the provider's stable SKU and its physical finish/length identity. Supplier
 * catalog re-imports can replace a UUID while leaving the purchased product
 * unchanged; in that case code alone is not enough to safely match a price.
 */
function matchesSelectedPresentation(
  candidate: {
    presentationId?: string | null;
    providerKey?: string | null;
    supplierSku?: string | null;
    finishCode?: string | null;
    finishName?: string | null;
    commercialLengthMm?: number | null;
  },
  selection: {
    presentationId?: string | null;
    providerKey?: string | null;
    supplierSku?: string | null;
    finishCode?: string | null;
    finishName?: string | null;
    commercialLengthMm?: number | null;
  }
) {
  // Legacy recipes without a supplier selection keep the previous family +
  // finish resolution behavior; their bar length is a calculation output,
  // not evidence of a selected supplier presentation.
  if (!selection.presentationId && !selection.supplierSku && !selection.providerKey) return true;
  if (
    candidate.commercialLengthMm != null && selection.commercialLengthMm != null &&
    candidate.commercialLengthMm !== selection.commercialLengthMm
  ) return false;
  if (selection.presentationId && candidate.presentationId === selection.presentationId) return true;
  if (selection.providerKey && candidate.providerKey !== selection.providerKey) return false;
  // A saved supplier choice can intentionally contain only the provider key
  // (for example when the quote was created before presentation IDs/SKUs were
  // hydrated). In that case, family + recipe code are already constrained by
  // the caller, so matching the selected provider is sufficient. Requiring a
  // SKU here made every priced profile appear pending for explicit suppliers.
  if (selection.supplierSku && candidate.supplierSku !== selection.supplierSku) return false;
  if (!selection.supplierSku && !selection.providerKey) return false;
  if (selection.finishCode && candidate.finishCode && candidate.finishCode !== selection.finishCode) return false;
  if (
    selection.finishName && candidate.finishName &&
    normalizeFinish(candidate.finishName) !== normalizeFinish(selection.finishName)
  ) return false;
  return true;
}

function selectedPresentationForBar(
  bar: FabricacionTrabajoSnapshot["bars"][number],
  quoteItem?: SupplierQuoteItemColor
) {
  const selectedProviderKey = quoteItem?.supplierProviderKey?.trim();
  if (selectedProviderKey && selectedProviderKey !== bar.supplierProviderKey) {
    return {
      presentationId: null,
      providerKey: selectedProviderKey,
      supplierSku: null,
      finishCode: null,
      finishName: quoteItem?.finishName ?? null,
      commercialLengthMm: bar.largoComercialMm,
    };
  }
  return {
    presentationId: bar.supplierPresentationId ?? null,
    providerKey: bar.supplierProviderKey ?? null,
    supplierSku: bar.supplierSku ?? null,
    finishCode: bar.supplierFinishCode ?? null,
    finishName: bar.supplierFinishName ?? null,
    commercialLengthMm: bar.largoComercialMm,
  };
}

function selectedPresentationForCut(cut: PendingCut) {
  return {
    presentationId: cut.selectedPresentationId,
    providerKey: cut.selectedProviderKey,
    supplierSku: cut.selectedSupplierSku,
    finishCode: cut.selectedFinishCode,
    finishName: cut.selectedFinishName,
    commercialLengthMm: cut.selectedCommercialLengthMm,
  };
}

function matchesSelectedWorkBar(bar: FabricacionTrabajoSnapshot["bars"][number], selection: PendingCut) {
  return matchesSelectedPresentation(selectedPresentationForBar(bar), selectedPresentationForCut(selection));
}

function matchesCatalogFamily(
  entry: CatalogPresentationPrice,
  catalogLineKey: string | null | undefined,
  supplierFamilyKey?: string | null
) {
  if (!entry.familyKeys?.length) return true;
  const families = entry.familyKeys.map((key) => normalizeUniversalAluminumFamilyKey(key) ?? key);
  const resolvedFamily = normalizeUniversalAluminumFamilyKey(supplierFamilyKey) ?? supplierFamilyKey?.trim();
  if (resolvedFamily) return families.includes(resolvedFamily);
  const universalLineFamily = resolveUniversalAluminumLineKey(catalogLineKey);
  if (universalLineFamily) return families.includes(universalLineFamily);
  return Boolean(catalogLineKey && families.includes(catalogLineKey));
}

function normalizeFinish(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function canonicalFinishLabel(value: string | null | undefined, colorHex?: string | null) {
  // `color` stores the component type; use only a configured finish label or exact configured hex.
  return resolveSupplierFinishName(value, colorHex);
}

function resolvedPrice(entry: CatalogPresentationPrice, organizationPricing?: OrganizationPurchasePricing) {
  if (entry.origin === "workshop") {
    if (entry.netPrice == null || entry.netPrice <= 0 || !entry.currency) return null;
    return {
      unitNetPrice: entry.netPrice,
      referenceUnitNetPrice: null,
      source: "workshop" as const,
      adjustmentPercent: null,
      currency: entry.currency,
    };
  }
  return resolvePurchasePrice({
    providerKey: entry.providerKey ?? "",
    presentationId: entry.priceApplicationStatus === "base_reference_other_finish"
      ? ""
      : entry.presentationId ?? entry.supplierSku,
    referenceNetPrice: entry.netPrice,
    referenceBasis: entry.priceBasis,
    referenceCurrency: entry.currency,
    commercialLengthMm: entry.commercialLengthMm,
    organizationPricing: entry.priceApplicationStatus === "base_reference_other_finish"
      ? {
          adjustments: organizationPricing?.adjustments ?? [],
          // Do not carry an override for the source finish onto another color.
          overrides: (organizationPricing?.overrides ?? []).filter((row) => row.presentationId !== entry.priceSourcePresentationId),
        }
      : organizationPricing,
  });
}

function alumcoBasePriceForFinish(
  entry: CatalogPresentationPrice,
  finishName: string | null | undefined
): CatalogPresentationPrice {
  return {
    ...entry,
    presentationId: undefined,
    supplierSku: "",
    finishCode: "",
    finishName: finishName ?? "Acabado pendiente",
    priceApplicationStatus: "base_reference_other_finish",
    priceSourcePresentationId: entry.presentationId ?? null,
    priceSourceSupplierSku: entry.supplierSku,
    priceSourceFinishName: entry.finishName,
  };
}

function accessoryPurchaseUnitMatches(recipeUnit: string, purchaseUnit: string) {
  const recipe = normalizeFinish(recipeUnit);
  const purchase = normalizeFinish(purchaseUnit);
  if (["unidad", "unidades", "pcs", "pc", "unit"].includes(recipe)) return ["pcs", "pc", "unidad", "unit"].includes(purchase);
  if (["par", "pares", "pair"].includes(recipe)) return ["pair", "par"].includes(purchase);
  if (["kg", "kilogramo"].includes(recipe)) return ["kg", "kilogramo"].includes(purchase);
  return recipe === purchase;
}

function barsNeeded(cuts: readonly PendingCut[], lengthMm: number) {
  const bars: number[] = [];
  for (const cut of [...cuts].sort((left, right) => right.cutLengthMm - left.cutLengthMm)) {
    const barIndex = bars.findIndex((used) => used + cut.cutLengthMm + cut.kerfMm <= lengthMm);
    if (barIndex < 0) bars.push(cut.trimMm + cut.cutLengthMm + cut.kerfMm);
    else bars[barIndex] += cut.cutLengthMm + cut.kerfMm;
  }
  return bars.length;
}

export function buildPartialTechnicalCostSnapshot(input: {
  workSnapshot: FabricacionTrabajoSnapshot | null;
  quoteItems: readonly SupplierQuoteItemColor[];
  availablePrices: readonly CatalogPresentationPrice[];
  organizationPricing?: OrganizationPurchasePricing;
  calculatedAt?: string;
}): TechnicalCostSnapshot | null {
  const snapshot = input.workSnapshot;
  if (!snapshot || (snapshot.bars.length === 0 && !snapshot.missingPresentations?.length)) return null;
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();

  const itemColors = new Map(input.quoteItems.map((item) => [item.code.trim(), item]));
  const cutsByGroup = new Map<string, PendingCut[]>();
  const missing = new Map<string, { technicalCode: string | null; description: string; reason: string; quantity?: number; unit?: string }>();
  for (const entry of snapshot.missingPresentations ?? []) {
    const relatedCut = snapshot.bars
      .flatMap((bar) => bar.cortes)
      .find((cut) => cut.itemId === entry.itemId && cut.codigoPerfil.trim() === entry.technicalCode.trim());
    const key = `${entry.technicalCode}|${entry.finishKey}`;
    missing.set(key, {
      technicalCode: entry.technicalCode,
      description: relatedCut?.funcion || entry.supplierSku || entry.technicalCode,
      reason: entry.reason,
    });
  }

  for (const bar of snapshot.bars) {
    for (const cut of bar.cortes) {
      const quoteItem = itemColors.get(cut.codigoItem);
      const color = quoteItem?.color;
      const finishName = quoteItem?.finishName?.trim() || canonicalFinishLabel(color, quoteItem?.colorHex);
      const independentCandidates = input.availablePrices.filter((entry) =>
        (!entry.configurationKey || entry.configurationKey === quoteItem?.configurationKey) &&
        matchesCatalogFamily(entry, quoteItem?.catalogLineKey, quoteItem?.supplierFamilyKey) &&
        matchesRecipeComponent(entry, cut.codigoPerfil) && entry.finishResolution === "finish_independent" && resolvedPrice(entry, input.organizationPricing) != null
      );
      if (!finishName && independentCandidates.length === 0) {
        const key = `${cut.codigoPerfil}|finish`;
        missing.set(key, {
          technicalCode: cut.codigoPerfil,
          description: cut.funcion || cut.codigoPerfil,
          reason: color ? `El acabado “${color}” no tiene equivalencia explícita en el catálogo QA.` : "La cotización no conserva el acabado comercial del ítem.",
        });
        continue;
      }

      const compatiblePresentations = input.availablePrices.filter((entry) =>
        (!entry.configurationKey || entry.configurationKey === quoteItem?.configurationKey) &&
        matchesCatalogFamily(entry, quoteItem?.catalogLineKey, quoteItem?.supplierFamilyKey) &&
        matchesRecipeComponent(entry, cut.codigoPerfil)
      );
      const selectedForBar = selectedPresentationForBar(bar, quoteItem);
      const exactFinish = compatiblePresentations.filter((entry) =>
        matchesSelectedPresentation(entry, selectedForBar) && entry.finishResolution === "specific" && normalizeFinish(entry.finishName) === normalizeFinish(finishName)
      );
      const finishIndependent = compatiblePresentations.filter((entry) =>
        matchesSelectedPresentation(entry, selectedForBar) && entry.finishResolution === "finish_independent"
      );
      let matchingPresentations = exactFinish.length > 0 ? exactFinish : finishIndependent;
      const selectedPresentationForItem = selectedForBar;
      if (matchingPresentations.length === 0 &&
          (!selectedPresentationForItem.providerKey || selectedPresentationForItem.providerKey === "alumco") &&
          !selectedPresentationForItem.presentationId && !selectedPresentationForItem.supplierSku &&
          normalizeFinish(finishName) !== "titanio") {
        matchingPresentations = compatiblePresentations
          .filter((entry) => entry.providerKey === "alumco" && entry.finishResolution === "specific" && normalizeFinish(entry.finishName) === "titanio")
          .map((entry) => alumcoBasePriceForFinish(entry, finishName));
        if (matchingPresentations.length > 0) {
          const key = `${cut.codigoPerfil}|${finishName}|physical-presentation`;
          missing.set(key, {
            technicalCode: cut.codigoPerfil,
            description: cut.funcion || cut.codigoPerfil,
            reason: `Se usa el precio de Titanio solo como base comercial para ${finishName}; faltan el precio específico y la presentación física de ese acabado. No se asigna SKU Titanio.`,
          });
        }
      }
      const candidates = matchingPresentations.filter((entry) =>
        entry.commercialLengthMm != null && resolvedPrice(entry, input.organizationPricing) != null
      );
      if (candidates.length === 0) {
        const key = `${cut.codigoPerfil}|${finishName}`;
        missing.set(key, {
          technicalCode: cut.codigoPerfil,
          description: cut.funcion || cut.codigoPerfil,
          reason: matchingPresentations.length === 0
            ? `No hay presentación con vínculo confirmado para ${finishName}.`
            : matchingPresentations.every((entry) => entry.commercialLengthMm == null)
              ? "La presentación asociada no tiene largo comercial configurado."
              : matchingPresentations.every((entry) => entry.priceBasis === "unknown")
                ? "La presentación asociada no tiene base de precio confirmada."
              : `Hay una presentación asociada para ${finishName}, pero falta un costo de compra utilizable.`,
        });
        continue;
      }
      const kerfMm = Math.round(bar.perdidaCorteMm);
      // Finish-independent prices may price every color, but bars of different
      // colors must remain separate physical stock in the cutting plan.
      const finishKey = finishName ?? "independent";
      const lineFamily = resolveUniversalAluminumLineKey(quoteItem?.supplierFamilyKey) ??
        resolveUniversalAluminumLineKey(quoteItem?.catalogLineKey) ??
        quoteItem?.supplierFamilyKey ?? quoteItem?.catalogLineKey ?? "";
      const selectedPresentation = selectedPresentationForBar(bar, quoteItem);
      const presentationIdentity = [selectedPresentation.presentationId ?? "", selectedPresentation.providerKey ?? "", selectedPresentation.supplierSku ?? ""].join(":");
      const groupKey = [cut.codigoPerfil, finishKey, lineFamily, quoteItem?.configurationKey ?? "", bar.despunteInicialMm, kerfMm, presentationIdentity].join("|");
      const group = cutsByGroup.get(groupKey) ?? [];
      group.push({
        familyKey: lineFamily,
        technicalCode: cut.codigoPerfil,
        finishKey,
        technicalName: candidates[0].technicalName,
        presentation: candidates[0],
        itemCode: cut.codigoItem,
        cutLengthMm: Math.round(cut.largoMm),
        trimMm: Math.round(bar.despunteInicialMm),
        kerfMm,
        selectedPresentationId: selectedPresentation.presentationId,
        selectedProviderKey: selectedPresentation.providerKey,
        selectedSupplierSku: selectedPresentation.supplierSku,
        selectedFinishCode: selectedPresentation.finishCode,
        selectedFinishName: selectedPresentation.finishName,
        selectedCommercialLengthMm: selectedPresentation.commercialLengthMm,
        catalogLineKey: quoteItem?.catalogLineKey ?? null,
        configurationKey: quoteItem?.configurationKey ?? null,
      });
      cutsByGroup.set(groupKey, group);
    }
  }

  const lines: CostLine[] = [];
  for (const group of cutsByGroup.values()) {
    let candidates = input.availablePrices.filter((entry) =>
      (!entry.configurationKey || entry.configurationKey === group[0].configurationKey) &&
        matchesCatalogFamily(entry, group[0].catalogLineKey, itemColors.get(group[0].itemCode)?.supplierFamilyKey) &&
      matchesRecipeComponent(entry, group[0].technicalCode) &&
      matchesSelectedPresentation(entry, selectedPresentationForCut(group[0])) &&
      (group[0].finishKey === "independent"
        ? entry.finishResolution === "finish_independent"
        : entry.finishResolution === "finish_independent" ||
          entry.finishResolution === "specific" && normalizeFinish(entry.finishName) === normalizeFinish(group[0].finishKey)) &&
      resolvedPrice(entry, input.organizationPricing) != null
    );
    if (candidates.length === 0 && group[0].presentation.priceApplicationStatus === "base_reference_other_finish") {
      candidates = [group[0].presentation];
    }
    const fittingCandidates = candidates.flatMap((candidate) => {
      const candidateLength = candidate.commercialLengthMm;
      const price = resolvedPrice(candidate, input.organizationPricing);
      if (!price || candidateLength == null || group.some((cut) => cut.cutLengthMm + cut.trimMm + cut.kerfMm > candidateLength)) return [];
      const exactPresentation = Boolean(group[0].selectedPresentationId || group[0].selectedSupplierSku);
      const selectedItemCodes = new Set(group.map((cut) => cut.itemCode));
      const selectedWorkBars = exactPresentation
        ? snapshot.bars.filter((bar) =>
            matchesSelectedWorkBar(bar, group[0]) &&
            bar.cortes.some((cut) => selectedItemCodes.has(cut.codigoItem) && cut.codigoPerfil === group[0].technicalCode)
          )
        : [];
      if (exactPresentation && (
        selectedWorkBars.length === 0 ||
        selectedWorkBars.some((bar) => bar.largoComercialMm !== candidateLength)
      )) return [];
      const count = exactPresentation ? selectedWorkBars.length : barsNeeded(group, candidateLength);
      return [{ candidate, price, count, total: price.unitNetPrice * count }];
    }).sort((left, right) => Number(Boolean(right.candidate.preferred)) - Number(Boolean(left.candidate.preferred)) ||
      left.total - right.total ||
      (left.candidate.commercialLengthMm ?? 0) - (right.candidate.commercialLengthMm ?? 0) ||
      left.candidate.supplierSku.localeCompare(right.candidate.supplierSku));
    if (fittingCandidates.length === 0) {
      const first = group[0];
      missing.set(`${first.technicalCode}|${first.presentation.finishName}|length`, {
        technicalCode: first.technicalCode,
        description: first.technicalName,
        reason: "Ninguna presentación asociada tiene largo suficiente y precio utilizable para los cortes guardados.",
      });
      continue;
    }
    const selected = fittingCandidates[0].candidate;
    for (const cut of group) cut.presentation = selected;
    const exactPresentation = Boolean(group[0].selectedPresentationId || group[0].selectedSupplierSku);
    if (exactPresentation) {
      const selectedItemCodes = new Set(group.map((cut) => cut.itemCode));
      const selectedBars = snapshot.bars.filter((bar) =>
        matchesSelectedWorkBar(bar, group[0]) &&
        bar.cortes.some((cut) => selectedItemCodes.has(cut.codigoItem) && cut.codigoPerfil === group[0].technicalCode)
      );
      const resolved = resolvedPrice(selected, input.organizationPricing);
      if (!resolved || selectedBars.length === 0) continue;
      const unitPrice = resolved.unitNetPrice;
      lines.push({
        familyKey: group[0].familyKey,
        presentationId: selected.presentationId,
        providerKey: selected.providerKey,
        technicalCode: group[0].technicalCode,
        ...(selected.technicalCode !== group[0].technicalCode ? { supplierTechnicalCode: selected.technicalCode } : {}),
        technicalName: group[0].technicalName,
        supplierSku: selected.supplierSku,
        finishCode: selected.finishCode,
        finishName: selected.finishName ?? "Sin acabado específico",
        commercialLengthMm: selected.commercialLengthMm,
        purchaseUnit: selected.purchaseUnit,
        bars: selectedBars.length,
        netPricePerPresentation: unitPrice,
        sourcePrice: selected.netPrice,
        referenceUnitNetPrice: resolved.referenceUnitNetPrice,
        effectivePriceSource: resolved.source,
        adjustmentPercent: resolved.adjustmentPercent,
        pricedAt: calculatedAt,
        priceBasis: selected.priceBasis === "unknown" ? "commercial_presentation" : selected.priceBasis,
        lineNet: selectedBars.length * unitPrice,
        currency: resolved.currency,
        priceListId: selected.priceListId,
        priceListRevision: selected.priceListRevision,
        priceListPublishedOn: selected.priceListPublishedOn,
        priceListValidUntil: selected.priceListValidUntil,
        priceReferenceStatus: selected.priceReferenceStatus,
        cuts: group.map((cut) => ({ itemCode: cut.itemCode, cutLengthMm: cut.cutLengthMm })),
      });
      continue;
    }
    const ordered = [...group].sort((left, right) => right.cutLengthMm - left.cutLengthMm || left.itemCode.localeCompare(right.itemCode));
    const bars: Array<{ usedMm: number; cuts: PendingCut[] }> = [];
    for (const cut of ordered) {
      const length = cut.presentation.commercialLengthMm;
      if (length == null) continue;
      const capacity = length - cut.trimMm;
      const existing = bars.find((bar) => bar.usedMm + cut.cutLengthMm + cut.kerfMm <= length);
      const target = existing ?? { usedMm: cut.trimMm, cuts: [] };
      if (!existing) bars.push(target);
      if (target.usedMm + cut.cutLengthMm + cut.kerfMm > length || cut.cutLengthMm + cut.kerfMm > capacity) {
        const key = `${cut.technicalCode}|${cut.presentation.finishName}|length`;
        missing.set(key, {
          technicalCode: cut.technicalCode,
          description: cut.technicalName,
          reason: `El corte de ${cut.cutLengthMm} mm no cabe en la presentación de ${length} mm con despunte y pérdida guardados.`,
        });
        continue;
      }
      target.cuts.push(cut);
      target.usedMm += cut.cutLengthMm + cut.kerfMm;
    }

    const acceptedCuts = bars.flatMap((bar) => bar.cuts);
    if (acceptedCuts.length === 0) continue;
    const presentation = acceptedCuts[0].presentation;
    const resolved = resolvedPrice(presentation, input.organizationPricing);
    if (!resolved) continue;
    const unitPrice = resolved.unitNetPrice;
    const barCount = bars.filter((bar) => bar.cuts.length > 0).length;
    lines.push({
      familyKey: group[0].familyKey,
      ...(presentation.priceApplicationStatus === "base_reference_other_finish"
        ? { priceSourcePresentationId: presentation.priceSourcePresentationId }
        : { presentationId: presentation.presentationId }),
      providerKey: presentation.providerKey,
      technicalCode: acceptedCuts[0].technicalCode,
      ...(presentation.technicalCode !== acceptedCuts[0].technicalCode ? { supplierTechnicalCode: presentation.technicalCode } : {}),
      technicalName: acceptedCuts[0].technicalName,
      supplierSku: presentation.priceApplicationStatus === "base_reference_other_finish" ? "" : presentation.supplierSku,
      finishCode: presentation.priceApplicationStatus === "base_reference_other_finish" ? "" : presentation.finishCode,
      finishName: presentation.finishName ?? "Sin acabado específico",
      commercialLengthMm: presentation.commercialLengthMm,
      purchaseUnit: presentation.purchaseUnit,
      bars: barCount,
      netPricePerPresentation: unitPrice,
      sourcePrice: presentation.netPrice,
      referenceUnitNetPrice: resolved.referenceUnitNetPrice,
      effectivePriceSource: resolved.source,
      adjustmentPercent: resolved.adjustmentPercent,
      pricedAt: calculatedAt,
      priceBasis: presentation.priceBasis === "unknown" ? "commercial_presentation" : presentation.priceBasis,
      lineNet: barCount * unitPrice,
      currency: resolved.currency,
      priceListId: presentation.priceListId,
      priceListRevision: presentation.priceListRevision,
      priceListPublishedOn: presentation.priceListPublishedOn,
      priceListValidUntil: presentation.priceListValidUntil,
      priceReferenceStatus: presentation.priceReferenceStatus,
      priceApplicationStatus: presentation.priceApplicationStatus ??
        (presentation.finishResolution === "finish_independent" ? "finish_independent" : "specific_finish"),
      priceSourceSupplierSku: presentation.priceSourceSupplierSku ?? null,
      priceSourceFinishName: presentation.priceSourceFinishName ?? null,
      cuts: acceptedCuts.map((cut) => ({ itemCode: cut.itemCode, cutLengthMm: cut.cutLengthMm })),
    });
  }

  // Glass remains pending until a separate, documented price source is available.
  for (const quoteItem of input.quoteItems) {
    const description = quoteItem.glassDescription?.trim() || "Vidrio";
    missing.set(`glass|${description}`, {
      technicalCode: null,
      description,
      reason: "El costo base ingresado en el catálogo de vidrios no se incluye en este resumen. Falta una presentación de compra del proveedor con precio.",
    });
  }
  for (const quoteItem of input.quoteItems) {
    for (const accessory of quoteItem.recipeAccessories ?? []) {
      const key = [accessory.recipeAccessoryCode ?? "", accessory.description, accessory.unit].join("|");
      const finishName = quoteItem.finishName?.trim() || canonicalFinishLabel(quoteItem.color, quoteItem.colorHex);
      const accessoryCandidates = input.availablePrices.filter((entry) =>
        entry.recipeAccessoryNames?.includes(accessory.description) === true &&
        accessoryPurchaseUnitMatches(accessory.unit, entry.purchaseUnit) &&
        (entry.finishResolution === "finish_independent" || normalizeFinish(entry.finishName) === normalizeFinish(finishName)) &&
        resolvedPrice(entry, input.organizationPricing) != null
      );
      if (accessoryCandidates.length === 1) {
        const presentation = accessoryCandidates[0];
        const resolved = resolvedPrice(presentation, input.organizationPricing);
        if (resolved) {
          const unitPrice = resolved.unitNetPrice;
          const existingLine = lines.find((line) => line.supplierSku === presentation.supplierSku && line.technicalCode === (accessory.recipeAccessoryCode ?? accessory.description));
          if (existingLine) {
            existingLine.quantity = (existingLine.quantity ?? 0) + accessory.quantity;
            existingLine.lineNet += accessory.quantity * unitPrice;
          } else {
            lines.push({
              presentationId: presentation.presentationId,
              providerKey: presentation.providerKey,
              technicalCode: accessory.recipeAccessoryCode ?? accessory.description,
              supplierTechnicalCode: presentation.technicalCode,
              technicalName: presentation.technicalName,
              supplierSku: presentation.supplierSku,
              finishCode: presentation.finishCode,
              finishName: presentation.finishName ?? "Sin acabado específico",
              commercialLengthMm: presentation.commercialLengthMm,
              purchaseUnit: presentation.purchaseUnit,
              bars: 0,
              quantity: accessory.quantity,
              netPricePerPresentation: unitPrice,
              sourcePrice: presentation.netPrice,
              referenceUnitNetPrice: resolved.referenceUnitNetPrice,
              effectivePriceSource: resolved.source,
              adjustmentPercent: resolved.adjustmentPercent,
              pricedAt: calculatedAt,
              priceBasis: presentation.priceBasis === "unknown" ? "commercial_presentation" : presentation.priceBasis,
              lineNet: accessory.quantity * unitPrice,
              currency: resolved.currency,
              priceListId: presentation.priceListId,
              priceListRevision: presentation.priceListRevision,
              priceListPublishedOn: presentation.priceListPublishedOn,
              priceListValidUntil: presentation.priceListValidUntil,
              priceReferenceStatus: presentation.priceReferenceStatus,
              cuts: [],
            });
          }
          continue;
        }
      }
      const existing = missing.get(key);
      missing.set(key, {
        technicalCode: accessory.recipeAccessoryCode,
        description: accessory.description,
        reason: "No hay asociación a presentación y precio de proveedor respaldada documentalmente.",
        quantity: (existing?.quantity ?? 0) + accessory.quantity,
        unit: accessory.unit,
      });
    }
  }

  const currencies = [...new Set(lines.map((line) => line.currency))];
  const total = Math.round(lines.reduce((sum, line) => sum + line.lineNet, 0) * 100) / 100;
  const hasUnconfirmedHistoricalReference = lines.some((line) =>
    line.priceReferenceStatus === "historical_reference" && line.effectivePriceSource === "reference"
  );
  const hasCommercialEstimate = lines.some((line) => line.priceApplicationStatus === "base_reference_other_finish");
  return {
    schemaVersion: 2,
    status: lines.length === 0 ? "no_data" : missing.size === 0 && !hasUnconfirmedHistoricalReference ? "complete" : "partial",
    totalCostClassification: hasCommercialEstimate
      ? "commercial_estimate"
      : missing.size > 0 || lines.length === 0 ? "incomplete" : "confirmed",
    priceOrigin: summarizePriceSources(lines.map((line) => line.effectivePriceSource ?? "reference")),
    calculatedAt,
    currency: currencies.length === 1 ? currencies[0] : null,
    knownNetTotal: lines.length > 0 && currencies.length === 1 ? total : null,
    lines,
    missing: [...missing.values()],
    // Currency and price basis have administrator-confirmed provenance in import evidence.
    assumptions: [...new Set(lines.flatMap((line) => {
      const assumptions: string[] = [];
      if (line.priceReferenceStatus === "historical_reference" && line.effectivePriceSource === "reference") {
        assumptions.push(`${line.providerKey} ${line.priceListRevision} es una referencia histórica (publicada ${line.priceListPublishedOn ?? "sin fecha"}, vigencia original hasta ${line.priceListValidUntil ?? "sin fecha"}); no es un precio vigente confirmado ni una cotización nueva del proveedor.`);
      }
      if (line.priceApplicationStatus === "base_reference_other_finish") {
        assumptions.push(`Estimación comercial: se aplicó como base a ${line.finishName} el importe Alumco de Titanio (${line.priceListRevision}); precio y presentación física del acabado elegido pendientes. El SKU ${line.priceSourceSupplierSku ?? "Titanio"} se conserva solo como origen del importe y no identifica el producto físico cotizado.`);
      }
      return assumptions;
    }))],
    sourcePautaCapturedAt: snapshot.capturedAt,
  };
}


import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import { resolvePurchasePrice, summarizePriceSources, type OrganizationPurchasePricing, type PriceSource } from "./precio-compra.service";
import { resolveSupplierFinishName } from "./supplier-presentation-resolution.service";

export type CatalogPresentationPrice = {
  presentationId?: string;
  providerKey?: string;
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
};

export type SupplierQuoteItemColor = {
  code: string;
  color: string | null;
  colorHex?: string | null;
  finishName?: string | null;
  catalogLineKey?: string | null;
  configurationKey?: string | null;
  glassDescription?: string | null;
  recipeAccessories?: SupplierRecipeAccessoryConsumption[];
};

type CostLine = {
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
  cuts: Array<{ itemCode: string; cutLengthMm: number }>;
  quantity?: number;
};

export type TechnicalCostSnapshot = {
  schemaVersion: 1 | 2;
  status: "no_data" | "partial" | "complete";
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
  technicalCode: string;
  finishKey: string;
  technicalName: string;
  presentation: CatalogPresentationPrice;
  itemCode: string;
  cutLengthMm: number;
  trimMm: number;
  kerfMm: number;
  selectedPresentationId: string | null;
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
    return [{ itemCode, recipeAccessoryCode, description, quantity, unit: "unidad" }];
  });
}

function matchesRecipeComponent(entry: CatalogPresentationPrice, recipeCode: string) {
  return entry.technicalCode === recipeCode || entry.recipeComponentCodes?.includes(recipeCode) === true;
}

function matchesCatalogFamily(entry: CatalogPresentationPrice, catalogLineKey: string | null | undefined) {
  if (!entry.familyKeys?.length) return true;
  return Boolean(catalogLineKey && entry.familyKeys.includes(catalogLineKey));
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
    presentationId: entry.presentationId ?? entry.supplierSku,
    referenceNetPrice: entry.netPrice,
    referenceBasis: entry.priceBasis,
    referenceCurrency: entry.currency,
    commercialLengthMm: entry.commercialLengthMm,
    organizationPricing,
  });
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
    missing.set(`${entry.itemId}|${entry.technicalCode}|${entry.finishKey}`, {
      technicalCode: entry.technicalCode,
      description: entry.supplierSku ?? entry.technicalCode,
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
        matchesCatalogFamily(entry, quoteItem?.catalogLineKey) &&
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

      const matchingPresentations = input.availablePrices.filter((entry) =>
        (!entry.configurationKey || entry.configurationKey === quoteItem?.configurationKey) &&
        matchesCatalogFamily(entry, quoteItem?.catalogLineKey) &&
        matchesRecipeComponent(entry, cut.codigoPerfil) &&
        (!bar.supplierPresentationId || entry.presentationId === bar.supplierPresentationId) &&
        (!bar.supplierPresentationId || entry.commercialLengthMm === bar.largoComercialMm) && (
          entry.finishResolution === "finish_independent" ||
          entry.finishResolution === "specific" && normalizeFinish(entry.finishName) === normalizeFinish(finishName)
        )
      );
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
      const finishKey = candidates.every((entry) => entry.finishResolution === "finish_independent")
        ? "independent"
        : finishName ?? "independent";
      const groupKey = [cut.codigoPerfil, finishKey, quoteItem?.catalogLineKey ?? "", quoteItem?.configurationKey ?? "", bar.despunteInicialMm, kerfMm, bar.supplierPresentationId ?? "legacy"].join("|");
      const group = cutsByGroup.get(groupKey) ?? [];
      group.push({
        technicalCode: cut.codigoPerfil,
        finishKey,
        technicalName: candidates[0].technicalName,
        presentation: candidates[0],
        itemCode: cut.codigoItem,
        cutLengthMm: Math.round(cut.largoMm),
        trimMm: Math.round(bar.despunteInicialMm),
        kerfMm,
        selectedPresentationId: bar.supplierPresentationId ?? null,
        catalogLineKey: quoteItem?.catalogLineKey ?? null,
        configurationKey: quoteItem?.configurationKey ?? null,
      });
      cutsByGroup.set(groupKey, group);
    }
  }

  const lines: CostLine[] = [];
  for (const group of cutsByGroup.values()) {
    const candidates = input.availablePrices.filter((entry) =>
      (!entry.configurationKey || entry.configurationKey === group[0].configurationKey) &&
      matchesCatalogFamily(entry, group[0].catalogLineKey) &&
      matchesRecipeComponent(entry, group[0].technicalCode) &&
      (!group[0].selectedPresentationId || entry.presentationId === group[0].selectedPresentationId) &&
      (group[0].finishKey === "independent"
        ? entry.finishResolution === "finish_independent"
        : entry.finishResolution === "finish_independent" ||
          entry.finishResolution === "specific" && normalizeFinish(entry.finishName) === normalizeFinish(group[0].finishKey)) &&
      resolvedPrice(entry, input.organizationPricing) != null
    );
    const fittingCandidates = candidates.flatMap((candidate) => {
      const candidateLength = candidate.commercialLengthMm;
      const price = resolvedPrice(candidate, input.organizationPricing);
      if (!price || candidateLength == null || group.some((cut) => cut.cutLengthMm + cut.trimMm + cut.kerfMm > candidateLength)) return [];
      const exactPresentation = Boolean(group[0].selectedPresentationId);
      const selectedWorkBars = exactPresentation
        ? snapshot.bars.filter((bar) => bar.supplierPresentationId === group[0].selectedPresentationId)
        : [];
      if (exactPresentation && (
        selectedWorkBars.length === 0 ||
        selectedWorkBars.some((bar) => bar.largoComercialMm !== candidateLength)
      )) return [];
      const count = exactPresentation ? selectedWorkBars.length : barsNeeded(group, candidateLength);
      return [{ candidate, price, count, total: price.unitNetPrice * count }];
    }).sort((left, right) => left.total - right.total || (left.candidate.commercialLengthMm ?? 0) - (right.candidate.commercialLengthMm ?? 0) || left.candidate.supplierSku.localeCompare(right.candidate.supplierSku));
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
    const exactPresentation = Boolean(group[0].selectedPresentationId);
    if (exactPresentation) {
      const selectedBars = snapshot.bars.filter((bar) => bar.supplierPresentationId === group[0].selectedPresentationId);
      const resolved = resolvedPrice(selected, input.organizationPricing);
      if (!resolved || selectedBars.length === 0) continue;
      const unitPrice = resolved.unitNetPrice;
      lines.push({
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
      presentationId: presentation.presentationId,
      providerKey: presentation.providerKey,
      technicalCode: acceptedCuts[0].technicalCode,
      ...(presentation.technicalCode !== acceptedCuts[0].technicalCode ? { supplierTechnicalCode: presentation.technicalCode } : {}),
      technicalName: acceptedCuts[0].technicalName,
      supplierSku: presentation.supplierSku,
      finishCode: presentation.finishCode,
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
      cuts: acceptedCuts.map((cut) => ({ itemCode: cut.itemCode, cutLengthMm: cut.cutLengthMm })),
    });
  }

  // Glass remains pending until a separate, documented price source is available.
  for (const quoteItem of input.quoteItems) {
    const description = quoteItem.glassDescription?.trim() || "Vidrio";
    missing.set(`glass|${description}`, {
      technicalCode: null,
      description,
      reason: "Sin precio ni presentación de vidrio en la lista importada.",
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
  return {
    schemaVersion: 2,
    status: lines.length === 0 ? "no_data" : missing.size === 0 ? "complete" : "partial",
    priceOrigin: summarizePriceSources(lines.map((line) => line.effectivePriceSource ?? "reference")),
    calculatedAt,
    currency: currencies.length === 1 ? currencies[0] : null,
    knownNetTotal: lines.length > 0 && currencies.length === 1 ? total : null,
    lines,
    missing: [...missing.values()],
    // Currency and price basis have administrator-confirmed provenance in import evidence.
    assumptions: [],
    sourcePautaCapturedAt: snapshot.capturedAt,
  };
}


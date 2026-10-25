import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import type { SupplierProfilePricePreview } from "@/features/proveedor-catalogos/services/supplier-presentation-resolution.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { resolveComponentColorName } from "@/constants/component-colors";
import { resolveUniversalAluminumLineKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { resolveFrozenGlassThickness } from "@/features/fabricacion/services/glass-thickness-resolution.service";
import { formatGlassDisplayName } from "@/features/fabricacion/services/glass-display-name.service";

export type WorkProfileMaterialRow = {
  key: string;
  code: string;
  familyKey?: string | null;
  /** SKU guardado en la pauta conjunta, incluso si todavía no tiene precio. */
  supplierSku?: string | null;
  supplierProviderKey?: string | null;
  supplierPresentationId?: string | null;
  description: string;
  line: string;
  finish: string;
  configuredFinish: string | null;
  commercialLengthMm: number;
  bars: number;
  itemCodes: string[];
  price?: WorkMaterialPrice | null;
};

export type WorkAccessoryMaterialRow = {
  key: string;
  code: string | null;
  description: string;
  quantity: number;
  unit: string;
  line: string;
  finish: string;
  configuredFinish: string | null;
  familyKey?: string | null;
  supplierProviderKey?: string | null;
  itemCodes: string[];
  price?: WorkMaterialPrice | null;
};

export type WorkMaterialPrice = {
  sku: string;
  providerKey?: string | null;
  isWorkshopCode: boolean;
  sourceKind?: "reference" | "own" | "adjusted";
  sourceLabel: string;
  sourceRevision: string;
  pricedAt: string | null;
  basis: "por metro" | "por tira" | "por unidad";
  unitPrice: number;
  subtotal: number;
  currency: string;
};

export type WorkGlassMaterialRow = {
  key: string;
  code: string | null;
  description: string;
  thickness: string;
  thicknessWarning?: string | null;
  finish: string;
  composition: string;
  line: string;
  totalM2: number;
  itemCodes: string[];
};

export type WorkGlassOrderRow = {
  key: string;
  groupKey: string;
  groupLabel: string;
  code: string | null;
  componentCode: string;
  componentName: string;
  paneReference: string;
  description: string;
  thickness: string;
  /** Valores conservados en la pieza; el PDF no toma el catálogo editable actual. */
  glassType?: string | null;
  snapshotThickness?: string | null;
  thicknessWarning?: string | null;
  finish: string;
  composition: string;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number | null;
  areaEachM2: number | null;
  totalM2: number | null;
  measuresPending: boolean;
};

/** Precio unitario consultado para una referencia de línea; no expresa consumo ni costo por pieza. */
export type WorkProfilePriceReferenceRow = SupplierProfilePricePreview & {
  key: string;
  itemCode: string;
  line: string;
  lineNames: string[];
  familyKey: string;
  finish: string;
};

export type WorkMaterialsDocument = {
  profiles: WorkProfileMaterialRow[];
  accessories: WorkAccessoryMaterialRow[];
  glass: WorkGlassMaterialRow[];
  glassOrder: WorkGlassOrderRow[];
  profilePriceReferences?: WorkProfilePriceReferenceRow[];
  profilePriceReferencesCheckedAt?: string | null;
  profilePriceReferencesStatus?: "loading" | "loaded" | "unavailable" | "not_applicable";
  hasJointCuttingPlan: boolean;
  pricing?: {
    status: TechnicalCostSnapshot["status"];
    knownNetTotal: number | null;
    currency: string | null;
    pricedMaterialCount: number;
    pendingMaterialCount: number;
    calculatedAt: string | null;
  } | null;
};

type WorkItem = CotizacionWorkflowItem & {
  fabricacionSnapshot?: FabricacionCotizacionSnapshot | null;
};

function roundM2(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function presentationFor(item: WorkItem) {
  return decodeCotizacionItemPresentationMeta(item.observaciones ?? "");
}

function commercialFinish(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized || normalized === "sin-acabado") return "Acabado sin definir";
  if (/^#[0-9a-f]{3,8}$/i.test(normalized)) {
    const configuredName = resolveComponentColorName(normalized);
    return configuredName === "Color a definir" ? "Acabado sin definir" : configuredName;
  }
  return normalized;
}

function configuredFinish(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return !normalized || normalized === "sin-acabado" || /^#[0-9a-f]{3,8}$/i.test(normalized)
    ? null
    : normalized;
}

function profileNameForFinish(value: string, selectedFinish: string) {
  const knownFinishes = ["blanco hueso", "negro mate", "blanco", "titanio", "antracita", "negro", "madera"];
  const normalizedName = normalizeMatch(value);
  const normalizedFinish = normalizeMatch(selectedFinish);
  const suffix = knownFinishes.find((finish) => normalizedName.endsWith(` ${normalizeMatch(finish)}`));
  if (!suffix || normalizedFinish === "acabado sin definir" || normalizedFinish === normalizeMatch(suffix)) return value;
  return value.slice(0, value.length - suffix.length).trim();
}

function fullGlassDescription(item: WorkItem, thickness: string, finish: string, composition: string) {
  const thicknessMatch = thickness.match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  const thicknessMm = thicknessMatch ? Number(thicknessMatch[1]?.replace(",", ".")) : null;
  return unique([
    formatGlassDisplayName(item.vidrio, thicknessMm),
    formatGlassDisplayName(composition, thicknessMm),
    thickness,
    finish,
  ]).filter((value) => value !== "Vidrio").join(" · ") || "Vidrio";
}

function snapshotGlassRows(item: WorkItem) {
  const snapshot = item.fabricacionSnapshot;
  if (snapshot?.vidrios.length) {
    return snapshot.vidrios.map((glass, index) => ({
      // The UUID remains an internal identity. Document references are stable and readable.
      reference: `${item.codigo || "Componente"} · Paño ${index + 1}`,
      name: glass.nombre,
      width: glass.anchoMm,
      height: glass.altoMm,
      quantity: glass.cantidadPiezas,
      totalM2: glass.totalM2,
    }));
  }

  const legacyGlass = presentationFor(item).cubicationSnapshot?.glass;
  return legacyGlass
    ? [{
        reference: "Paño según snapshot histórico",
        name: item.vidrio ?? "",
        width: legacyGlass.widthMm,
        height: legacyGlass.heightMm,
        quantity: legacyGlass.quantity,
        totalM2: legacyGlass.totalM2,
      }]
    : [];
}

function lineNamesForBar(
  bar: FabricacionTrabajoSnapshot["bars"][number],
  summary: FabricationQuoteSummary,
  source: FabricacionTrabajoSnapshot
) {
  const names = new Map<number, string>();
  for (const item of summary.items) {
    const lineId = item.fabricacionSnapshot?.lineTemplateId;
    if (lineId != null) names.set(lineId, item.lineName || `Línea ${lineId}`);
  }
  const presentationLines = source.sourcePresentations
    .filter((presentation) => presentation.presentationKey === bar.presentationKey)
    .map((presentation) => presentation.lineTemplateId);
  const ids = unique(
    [...bar.lineaIds, ...presentationLines]
      .filter((id): id is number => id != null)
      .map(String)
  ).map(Number);
  const resolved = ids.map((id) => names.get(id) ?? `Línea ${id}`);
  return resolved.join(" / ") || "Sin línea identificada";
}

function finishForBar(bar: FabricacionTrabajoSnapshot["bars"][number], itemsByCode: ReadonlyMap<string, WorkItem>) {
  const selectedFinishes = unique(bar.cortes.flatMap((cut) => {
    const item = itemsByCode.get(cut.codigoItem);
    if (!item) return [];
    const presentation = presentationFor(item);
    const finish = resolveComponentColorName(presentation.colorHex);
    return finish && finish !== "Color a definir" ? [finish] : [];
  }));

  // The saved quote item is the source for the selected finish. The joint
  // cutting snapshot may retain a legacy finish label from an earlier edit.
  return selectedFinishes.length === 1 ? selectedFinishes[0] : bar.acabadoKey;
}

function configuredFinishForBar(bar: FabricacionTrabajoSnapshot["bars"][number], itemsByCode: ReadonlyMap<string, WorkItem>) {
  const hasSelectedCatalogColor = bar.cortes.some((cut) => {
    const item = itemsByCode.get(cut.codigoItem);
    return item != null && resolveComponentColorName(presentationFor(item).colorHex) !== "Color a definir";
  });
  return hasSelectedCatalogColor ? null : configuredFinish(bar.acabadoKey);
}

function providerForBar(bar: FabricacionTrabajoSnapshot["bars"][number], itemsByCode: ReadonlyMap<string, WorkItem>) {
  const selectedProviders = unique(bar.cortes.flatMap((cut) => {
    const item = itemsByCode.get(cut.codigoItem);
    const providerKey = item ? presentationFor(item).supplierProviderKey.trim().toLocaleLowerCase("es-CL") : "";
    return providerKey ? [providerKey] : [];
  }));
  return selectedProviders.length === 1 ? selectedProviders[0] : bar.supplierProviderKey?.trim().toLocaleLowerCase("es-CL") || null;
}

function normalizeMatch(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function materialPrice(input: {
  lines: TechnicalCostSnapshot["lines"];
  code: string | null;
  description: string;
  finish: string;
  familyKey?: string | null;
  allowLegacyFamilyMatch?: boolean;
  commercialLengthMm?: number;
  quantity?: number;
  aggregateBars?: number;
  providerKey?: string | null;
  supplierSku?: string | null;
  presentationId?: string | null;
}): WorkMaterialPrice | null {
  const identityCandidates = input.code
    ? input.lines.filter((line) =>
      [line.technicalCode, line.supplierTechnicalCode].includes(input.code!) &&
      (!input.supplierSku || line.supplierSku === input.supplierSku) &&
      (!input.presentationId || line.presentationId === input.presentationId) &&
      (!input.familyKey || line.familyKey === input.familyKey || (input.allowLegacyFamilyMatch && !line.familyKey))
    )
    : [];
  // Prefer technical identity over a repeated human-readable label. Names such
  // as "Riel superior" occur across aluminum families and must never make an
  // exact, priced code look ambiguous or borrow another profile's price.
  const identityMatches = input.code && input.code !== "—"
    ? identityCandidates
    : input.lines.filter((line) =>
      (!input.familyKey || line.familyKey === input.familyKey || (input.allowLegacyFamilyMatch && !line.familyKey)) &&
      normalizeMatch(line.technicalName) === normalizeMatch(input.description)
    ).filter((line) => {
    const finishMatch = !input.finish || normalizeMatch(line.finishName) === "sin acabado especifico" || normalizeMatch(line.finishName) === normalizeMatch(input.finish);
    const lengthMatch = input.commercialLengthMm == null || line.commercialLengthMm === input.commercialLengthMm;
    const providerMatch = !input.providerKey || line.providerKey?.trim().toLocaleLowerCase("es-CL") === input.providerKey.trim().toLocaleLowerCase("es-CL");
    return finishMatch && lengthMatch && providerMatch;
  });
  const candidates = identityMatches.filter((line) => input.quantity == null || (line.quantity ?? line.bars) === input.quantity);
  let allocatedSubtotal: number | null = null;
  let line: TechnicalCostSnapshot["lines"][number] | undefined;
  const aggregateCandidates = candidates.length > 1 ? candidates : candidates.length === 0 ? identityMatches : [];
  if (candidates.length === 1) {
    line = candidates[0];
  } else if (
    aggregateCandidates.length > 1 && input.quantity != null &&
    aggregateCandidates.reduce((total, candidate) => total + (candidate.quantity ?? candidate.bars), 0) === input.quantity &&
    aggregateCandidates.every((candidate) => candidate.providerKey === aggregateCandidates[0]?.providerKey &&
      candidate.supplierSku === aggregateCandidates[0]?.supplierSku &&
      candidate.netPricePerPresentation === aggregateCandidates[0]?.netPricePerPresentation &&
      candidate.currency === aggregateCandidates[0]?.currency &&
      candidate.priceListId === aggregateCandidates[0]?.priceListId &&
      candidate.priceListRevision === aggregateCandidates[0]?.priceListRevision)
  ) {
    line = aggregateCandidates[0];
    allocatedSubtotal = aggregateCandidates.reduce((total, candidate) => total + candidate.lineNet, 0);
  } else if (
    candidates.length === 0 &&
    input.aggregateBars != null &&
    input.quantity != null &&
    input.aggregateBars > input.quantity &&
    identityMatches.length === 1
  ) {
    const aggregateLine = identityMatches[0]!;
    const aggregateQuantity = aggregateLine.quantity ?? aggregateLine.bars;
    if (aggregateQuantity === input.aggregateBars && aggregateLine.quantity == null && aggregateLine.bars > 0) {
      line = aggregateLine;
      allocatedSubtotal = aggregateLine.lineNet * input.quantity / aggregateLine.bars;
    }
  }
  if (candidates.length > 1 || !line) return null;
  const isWorkshopCode = line.effectivePriceSource === "workshop" || line.providerKey?.startsWith("taller:") === true;
  return {
    sku: line.supplierSku,
    providerKey: line.providerKey ?? null,
    isWorkshopCode,
    sourceKind: isWorkshopCode ? "own" : line.effectivePriceSource === "provider_adjustment" || line.effectivePriceSource === "organization_override" ? "adjusted" : "reference",
    sourceLabel: isWorkshopCode
      ? "Precio propio del taller"
      : line.providerKey?.trim().toLocaleLowerCase("es-CL") === "arquetipo"
        ? "Arquetipo · junio 2026"
        : line.providerKey?.trim().toLocaleLowerCase("es-CL") === "alumco"
          ? "Alumco · 2026"
          : `Lista referencial · ${line.providerKey ?? "Proveedor"}`,
    sourceRevision: line.priceListRevision,
    pricedAt: line.pricedAt ?? null,
    basis: line.priceBasis === "per_meter" ? "por metro" : line.quantity != null ? "por unidad" : "por tira",
    unitPrice: line.netPricePerPresentation,
    subtotal: allocatedSubtotal ?? line.lineNet,
    currency: line.currency,
  };
}

function buildProfileRows(
  summary: FabricationQuoteSummary,
  items: readonly WorkItem[],
  cost: TechnicalCostSnapshot | null
): WorkProfileMaterialRow[] {
  const source = summary.trabajoSnapshot;
  if (!source) return [];

  const groups = new Map<string, WorkProfileMaterialRow>();
  const itemsByCode = new Map(items.map((item) => [item.codigo, item]));
  for (const bar of source.bars) {
    const finishValue = finishForBar(bar, itemsByCode);
    const providerKey = providerForBar(bar, itemsByCode);
    const savedSku = providerKey === bar.supplierProviderKey?.trim().toLocaleLowerCase("es-CL")
      ? bar.supplierSku?.trim() || null
      : null;
    const finish = commercialFinish(finishValue);
    const familyKeys = unique(source.sourcePresentations
      .filter((presentation) => presentation.presentationKey === bar.presentationKey)
      .map((presentation) => resolveUniversalAluminumLineKey(presentation.catalogLineKey) ?? presentation.catalogLineKey ?? ""));
    const familyKey = familyKeys.length === 1 ? familyKeys[0] : null;
    const line = lineNamesForBar(bar, summary, source);
    const key = [
      bar.materialKey,
      familyKey,
      bar.codigoPerfil,
      profileNameForFinish(bar.nombrePerfil || bar.codigoPerfil || "Perfil sin descripción", finish),
      line,
      finishValue,
      bar.largoComercialMm,
      providerKey ?? "",
      bar.supplierPresentationId ?? "",
      savedSku ?? "",
    ].join("|");
    const existing = groups.get(key);
    const itemCodes = unique(bar.cortes.map((cut) => cut.codigoItem));
    if (existing) {
      existing.bars += 1;
      existing.itemCodes = unique([...existing.itemCodes, ...itemCodes]);
      continue;
    }
    groups.set(key, {
      key,
      code: bar.codigoPerfil || "—",
      familyKey,
      supplierSku: savedSku,
      supplierProviderKey: providerKey,
      supplierPresentationId: bar.supplierPresentationId ?? null,
      // Some reference names embed a finish; omit it if it conflicts with the
      // finish selected on the quote, which is shown separately in the row.
      description: profileNameForFinish(bar.nombrePerfil || bar.codigoPerfil || "Perfil sin descripción", finish),
      line,
      finish,
      configuredFinish: configuredFinishForBar(bar, itemsByCode),
      commercialLengthMm: bar.largoComercialMm,
      bars: 1,
      itemCodes,
      price: null,
    });
  }
  const familiesByCode = new Map<string, Set<string>>();
  for (const row of groups.values()) {
    if (!row.familyKey) continue;
    const familyKeys = familiesByCode.get(row.code) ?? new Set<string>();
    familyKeys.add(row.familyKey);
    familiesByCode.set(row.code, familyKeys);
  }
  const profileRows = [...groups.values()];
  return profileRows.map((row) => ({
    ...row,
    price: cost ? materialPrice({
      lines: cost.lines,
      code: row.code,
      description: row.description,
      finish: row.configuredFinish ?? row.finish,
      familyKey: row.familyKey,
      supplierSku: row.supplierSku,
      presentationId: row.supplierPresentationId,
      allowLegacyFamilyMatch: !row.familyKey || (familiesByCode.get(row.code)?.size ?? 0) <= 1,
      commercialLengthMm: row.commercialLengthMm,
      quantity: row.bars,
      aggregateBars: profileRows
        .filter((candidate) => candidate.code === row.code && candidate.familyKey === row.familyKey &&
          candidate.configuredFinish === row.configuredFinish && candidate.commercialLengthMm === row.commercialLengthMm &&
          candidate.supplierProviderKey === row.supplierProviderKey)
        .reduce((total, candidate) => total + candidate.bars, 0),
      providerKey: row.supplierProviderKey,
    }) : null,
  })).sort((a, b) =>
    a.line.localeCompare(b.line, "es") ||
    a.code.localeCompare(b.code, "es") ||
    a.finish.localeCompare(b.finish, "es") ||
    a.commercialLengthMm - b.commercialLengthMm
  );
}

function buildAccessoryRows(items: readonly WorkItem[], cost: TechnicalCostSnapshot | null): WorkAccessoryMaterialRow[] {
  const groups = new Map<string, WorkAccessoryMaterialRow>();
  for (const item of items) {
    const accessories = item.fabricacionSnapshot?.result.accesorios ?? [];
    for (const accessory of accessories) {
      const code = accessory.codigo.trim() || null;
      const description = accessory.nombre.trim() || "Accesorio";
      const unit = accessory.unidad?.trim() || "unidad";
      const presentation = presentationFor(item);
      const line = item.lineaComercial.trim() || `Línea ${item.fabricacionSnapshot?.lineTemplateId ?? "sin identificar"}`;
      const finish = commercialFinish(presentation.colorHex);
      const lineIdentity = item.fabricacionSnapshot?.lineTemplateId ?? line;
      const familyKey = item.fabricacionSnapshot?.supplierFamilyKey ?? null;
      const providerKey = presentation.supplierProviderKey.trim().toLocaleLowerCase("es-CL") || null;
      const key = `${code ?? "sin-codigo"}|${description}|${unit}|${lineIdentity}|${familyKey ?? ""}|${providerKey ?? ""}|${finish}`;
      const existing = groups.get(key);
      if (existing) {
        existing.quantity += accessory.cantidadUnidades;
        existing.itemCodes = unique([...existing.itemCodes, item.codigo]);
      } else {
        groups.set(key, {
          key,
          code,
          description,
          quantity: accessory.cantidadUnidades,
          unit,
          line,
          finish,
          configuredFinish: configuredFinish(presentation.colorHex),
          familyKey,
          supplierProviderKey: providerKey,
          itemCodes: [item.codigo],
          price: null,
        });
      }
    }
  }
  return [...groups.values()].map((row) => ({
    ...row,
    price: cost ? materialPrice({
      lines: cost.lines,
      code: row.code,
      description: row.description,
      finish: row.configuredFinish ?? row.finish,
      familyKey: row.familyKey,
      providerKey: row.supplierProviderKey,
      quantity: row.quantity,
    }) : null,
  })).sort((a, b) =>
    (a.code ?? "").localeCompare(b.code ?? "", "es") ||
    a.description.localeCompare(b.description, "es")
  );
}

function resolveGlassCatalogCode(item: WorkItem, templates: readonly CotizacionLineTemplate[]) {
  const presentation = presentationFor(item);
  const templateId = item.tipo.trim().toLowerCase() === "vidrio / cristal"
    ? presentation.lineTemplateId
    : presentation.vidrioLineTemplateId;
  const template = templates.find((candidate) =>
    candidate.categoria === "vidrio" && String(candidate.id) === templateId && !candidate.eliminadoEn
  );
  const metadata = template?.catalogMetadata as Record<string, unknown> | undefined;
  const value = [metadata?.codigo, metadata?.code, metadata?.sku, metadata?.technicalCode]
    .find((candidate): candidate is string => typeof candidate === "string" && Boolean(candidate.trim()));
  return value?.trim() ?? null;
}

function buildGlassRows(items: readonly WorkItem[], templates: readonly CotizacionLineTemplate[]): WorkGlassMaterialRow[] {
  const groups = new Map<string, WorkGlassMaterialRow>();
  for (const item of items) {
    const presentation = presentationFor(item);
    const resolvedThickness = resolveFrozenGlassThickness({
      observations: item.observaciones,
      snapshot: item.fabricacionSnapshot,
      selectedProductId: item.tipo.trim().toLocaleLowerCase("es-CL") === "vidrio / cristal"
        ? presentation.lineTemplateId
        : presentation.vidrioLineTemplateId,
    });
    const thickness = resolvedThickness.thicknessMm == null ? "Pendiente" : resolvedThickness.display;
    const finish = presentation.catalogTerminacion.trim();
    const composition = presentation.fabricacionGlazing.trim();
    const description = fullGlassDescription(item, thickness, finish, composition);
    const code = resolveGlassCatalogCode(item, templates);
    const line = item.lineaComercial.trim() || `Línea ${item.fabricacionSnapshot?.lineTemplateId ?? "sin identificar"}`;
    const lineIdentity = item.fabricacionSnapshot?.lineTemplateId ?? line;
    const key = [code, item.vidrio?.trim(), thickness, finish, composition, lineIdentity].join("|");
    const totalM2 = snapshotGlassRows(item).reduce((sum, glass) => sum + glass.totalM2, 0);
    if (totalM2 <= 0) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.totalM2 = roundM2(existing.totalM2 + totalM2);
      existing.itemCodes = unique([...existing.itemCodes, item.codigo]);
    }
    else groups.set(key, { key, code, description, thickness, thicknessWarning: resolvedThickness.warning, finish, composition, line, totalM2: roundM2(totalM2), itemCodes: [item.codigo] });
  }
  return [...groups.values()].sort((a, b) => a.description.localeCompare(b.description, "es"));
}

function buildGlassOrderRows(items: readonly WorkItem[], templates: readonly CotizacionLineTemplate[]): WorkGlassOrderRow[] {
  const rows: WorkGlassOrderRow[] = [];
  for (const item of items) {
    const presentation = presentationFor(item);
    const resolvedThickness = resolveFrozenGlassThickness({
      observations: item.observaciones,
      snapshot: item.fabricacionSnapshot,
      selectedProductId: item.tipo.trim().toLocaleLowerCase("es-CL") === "vidrio / cristal"
        ? presentation.lineTemplateId
        : presentation.vidrioLineTemplateId,
    });
    const hasGlassIdentity = Boolean(item.vidrio?.trim() || item.fabricacionSnapshot?.glassSelection?.productId);
    const thickness = resolvedThickness.thicknessMm == null
      ? hasGlassIdentity ? "Pendiente" : ""
      : resolvedThickness.display;
    const finish = presentation.catalogTerminacion.trim();
    const composition = presentation.fabricacionGlazing.trim();
    const code = resolveGlassCatalogCode(item, templates);
    const glassRows = snapshotGlassRows(item);
    if (glassRows.length === 0) {
      if (!item.vidrio?.trim() && !resolvedThickness.thicknessMm && !item.fabricacionSnapshot?.glassSelection?.productId && !composition) continue;
      rows.push({
        key: `${item.id}|pending`,
        groupKey: [item.vidrio?.trim(), thickness, finish, composition].join("|"),
        groupLabel: fullGlassDescription(item, thickness, finish, composition),
        code,
        componentCode: item.codigo,
        componentName: item.nombre,
        paneReference: `${item.codigo || "Componente"} · Paño 1`,
        description: fullGlassDescription(item, thickness, finish, composition),
        thickness,
        glassType: item.vidrio?.trim() || null,
        snapshotThickness: resolvedThickness.thicknessMm == null ? null : resolvedThickness.display,
        thicknessWarning: resolvedThickness.warning,
        finish,
        composition,
        widthMm: null,
        heightMm: null,
        quantity: null,
        areaEachM2: null,
        totalM2: null,
        measuresPending: true,
      });
      continue;
    }

    glassRows.forEach((glass, index) => {
      const hasMeasures = glass.width > 0 && glass.height > 0 && glass.quantity > 0;
      rows.push({
        key: `${item.id}|${glass.reference}|${index}`,
        groupKey: [item.vidrio?.trim(), thickness, finish, composition].join("|"),
        groupLabel: fullGlassDescription(item, thickness, finish, composition || formatGlassDisplayName(glass.name, resolvedThickness.thicknessMm)),
        code,
        componentCode: item.codigo,
        componentName: item.nombre,
        paneReference: glass.reference || `${item.codigo || "Componente"} · Paño ${index + 1}`,
        description: fullGlassDescription(item, thickness, finish, composition || formatGlassDisplayName(glass.name, resolvedThickness.thicknessMm)),
        thickness,
        glassType: item.vidrio?.trim() || null,
        snapshotThickness: resolvedThickness.thicknessMm == null ? null : resolvedThickness.display,
        thicknessWarning: resolvedThickness.warning,
        finish,
        composition,
        widthMm: hasMeasures ? glass.width : null,
        heightMm: hasMeasures ? glass.height : null,
        quantity: hasMeasures ? glass.quantity : null,
        areaEachM2: hasMeasures ? roundM2((glass.width * glass.height) / 1_000_000) : null,
        totalM2: hasMeasures ? roundM2(glass.totalM2) : null,
        measuresPending: !hasMeasures,
      });
    });
  }
  return rows.sort((a, b) =>
    a.groupKey.localeCompare(b.groupKey, "es") ||
    a.componentCode.localeCompare(b.componentCode, "es") ||
    a.paneReference.localeCompare(b.paneReference, "es")
  );
}

export function buildWorkMaterialsDocument(input: {
  summary: FabricationQuoteSummary;
  items: readonly CotizacionWorkflowItem[];
  lineTemplates?: readonly CotizacionLineTemplate[];
  technicalCostSnapshot?: TechnicalCostSnapshot | null;
  profilePriceReferences?: readonly WorkProfilePriceReferenceRow[];
  profilePriceReferencesCheckedAt?: string | null;
  profilePriceReferencesStatus?: WorkMaterialsDocument["profilePriceReferencesStatus"];
}): WorkMaterialsDocument {
  const items = input.items as readonly WorkItem[];
  const lineTemplates = input.lineTemplates ?? [];
  return {
    profiles: buildProfileRows(input.summary, items, input.technicalCostSnapshot ?? null),
    accessories: buildAccessoryRows(items, input.technicalCostSnapshot ?? null),
    glass: buildGlassRows(items, lineTemplates),
    glassOrder: buildGlassOrderRows(items, lineTemplates),
    profilePriceReferences: [...(input.profilePriceReferences ?? [])],
    profilePriceReferencesCheckedAt: input.profilePriceReferencesCheckedAt ?? null,
    profilePriceReferencesStatus: input.profilePriceReferencesStatus ?? "not_applicable",
    hasJointCuttingPlan: Boolean(input.summary.trabajoSnapshot),
    pricing: input.technicalCostSnapshot ? {
      status: input.technicalCostSnapshot.status,
      knownNetTotal: input.technicalCostSnapshot.knownNetTotal,
      currency: input.technicalCostSnapshot.currency,
      pricedMaterialCount: input.technicalCostSnapshot.lines.length,
      pendingMaterialCount: input.technicalCostSnapshot.missing.length,
      calculatedAt: input.technicalCostSnapshot.calculatedAt,
    } : null,
  };
}

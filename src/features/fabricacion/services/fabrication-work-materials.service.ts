import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { resolveComponentColorName } from "@/constants/component-colors";

export type WorkProfileMaterialRow = {
  key: string;
  code: string;
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
  itemCodes: string[];
  price?: WorkMaterialPrice | null;
};

export type WorkMaterialPrice = {
  sku: string;
  isWorkshopCode: boolean;
  sourceLabel: string;
  sourceRevision: string;
  pricedAt: string | null;
  basis: "por metro" | "por barra" | "por unidad";
  unitPrice: number;
  subtotal: number;
  currency: string;
};

export type WorkGlassMaterialRow = {
  key: string;
  code: string | null;
  description: string;
  thickness: string;
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
  finish: string;
  composition: string;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number | null;
  areaEachM2: number | null;
  totalM2: number | null;
  measuresPending: boolean;
};

export type WorkMaterialsDocument = {
  profiles: WorkProfileMaterialRow[];
  accessories: WorkAccessoryMaterialRow[];
  glass: WorkGlassMaterialRow[];
  glassOrder: WorkGlassOrderRow[];
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

function fullGlassDescription(item: WorkItem, thickness: string, finish: string, composition: string) {
  return unique([item.vidrio?.trim() ?? "", composition, thickness, finish]).join(" · ") || "Vidrio";
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

function normalizeMatch(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function materialPrice(input: {
  lines: TechnicalCostSnapshot["lines"];
  code: string | null;
  description: string;
  finish: string;
  commercialLengthMm?: number;
  quantity?: number;
}): WorkMaterialPrice | null {
  const candidates = input.lines.filter((line) => {
    const codeMatch = Boolean(input.code && [line.technicalCode, line.supplierTechnicalCode].includes(input.code));
    const descriptionMatch = normalizeMatch(line.technicalName) === normalizeMatch(input.description);
    const finishMatch = !input.finish || normalizeMatch(line.finishName) === normalizeMatch(input.finish);
    const lengthMatch = input.commercialLengthMm == null || line.commercialLengthMm === input.commercialLengthMm;
    const quantityMatch = input.quantity == null || line.bars === input.quantity;
    return (codeMatch || descriptionMatch) && finishMatch && lengthMatch && quantityMatch;
  });
  if (candidates.length !== 1) return null;
  const line = candidates[0]!;
  const isWorkshopCode = line.effectivePriceSource === "workshop" || line.providerKey?.startsWith("taller:") === true;
  return {
    sku: line.supplierSku,
    isWorkshopCode,
    sourceLabel: isWorkshopCode ? "Precio propio del taller" : `Lista referencial · ${line.providerKey ?? "Proveedor"}`,
    sourceRevision: line.priceListRevision,
    pricedAt: line.pricedAt ?? null,
    basis: line.priceBasis === "per_meter" ? "por metro" : line.quantity != null ? "por unidad" : "por barra",
    unitPrice: line.netPricePerPresentation,
    subtotal: line.lineNet,
    currency: line.currency,
  };
}

function buildProfileRows(summary: FabricationQuoteSummary, cost: TechnicalCostSnapshot | null): WorkProfileMaterialRow[] {
  const source = summary.trabajoSnapshot;
  if (!source) return [];

  const groups = new Map<string, WorkProfileMaterialRow>();
  for (const bar of source.bars) {
    const line = lineNamesForBar(bar, summary, source);
    const key = [
      bar.materialKey,
      bar.presentationKey,
      bar.codigoPerfil,
      bar.nombrePerfil,
      line,
      bar.acabadoKey,
      bar.largoComercialMm,
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
      description: bar.nombrePerfil || bar.codigoPerfil || "Perfil sin descripción",
      line,
      finish: commercialFinish(bar.acabadoKey),
      configuredFinish: configuredFinish(bar.acabadoKey),
      commercialLengthMm: bar.largoComercialMm,
      bars: 1,
      itemCodes,
      price: null,
    });
  }
  return [...groups.values()].map((row) => ({
    ...row,
    price: cost ? materialPrice({ lines: cost.lines, code: row.code, description: row.description, finish: row.configuredFinish ?? row.finish, commercialLengthMm: row.commercialLengthMm, quantity: row.bars }) : null,
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
      const unit = "unidad";
      const presentation = presentationFor(item);
      const line = item.lineaComercial.trim() || `Línea ${item.fabricacionSnapshot?.lineTemplateId ?? "sin identificar"}`;
      const finish = commercialFinish(presentation.colorHex);
      const lineIdentity = item.fabricacionSnapshot?.lineTemplateId ?? line;
      const key = `${code ?? "sin-codigo"}|${description}|${unit}|${lineIdentity}|${finish}`;
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
          itemCodes: [item.codigo],
          price: null,
        });
      }
    }
  }
  return [...groups.values()].map((row) => ({
    ...row,
    price: cost ? materialPrice({ lines: cost.lines, code: row.code, description: row.description, finish: row.configuredFinish ?? row.finish, quantity: row.quantity }) : null,
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

function resolveGlassThickness(item: WorkItem, templates: readonly CotizacionLineTemplate[]) {
  const presentation = presentationFor(item);
  if (presentation.catalogEspesor.trim()) return presentation.catalogEspesor.trim();

  const templateId = item.tipo.trim().toLowerCase() === "vidrio / cristal"
    ? presentation.lineTemplateId
    : presentation.vidrioLineTemplateId;
  const template = templates.find((candidate) =>
    candidate.categoria === "vidrio" && String(candidate.id) === templateId && !candidate.eliminadoEn
  );
  const thickness = template?.catalogMetadata.espesor;
  return typeof thickness === "string" && thickness.trim() ? thickness.trim() : "";
}

function buildGlassRows(items: readonly WorkItem[], templates: readonly CotizacionLineTemplate[]): WorkGlassMaterialRow[] {
  const groups = new Map<string, WorkGlassMaterialRow>();
  for (const item of items) {
    const presentation = presentationFor(item);
    const thickness = resolveGlassThickness(item, templates);
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
    else groups.set(key, { key, code, description, thickness, finish, composition, line, totalM2: roundM2(totalM2), itemCodes: [item.codigo] });
  }
  return [...groups.values()].sort((a, b) => a.description.localeCompare(b.description, "es"));
}

function buildGlassOrderRows(items: readonly WorkItem[], templates: readonly CotizacionLineTemplate[]): WorkGlassOrderRow[] {
  const rows: WorkGlassOrderRow[] = [];
  for (const item of items) {
    const presentation = presentationFor(item);
    const thickness = resolveGlassThickness(item, templates);
    const finish = presentation.catalogTerminacion.trim();
    const composition = presentation.fabricacionGlazing.trim();
    const code = resolveGlassCatalogCode(item, templates);
    const glassRows = snapshotGlassRows(item);
    if (glassRows.length === 0) {
      if (!item.vidrio?.trim() && !thickness && !composition) continue;
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
        groupLabel: fullGlassDescription(item, thickness, finish, composition || glass.name),
        code,
        componentCode: item.codigo,
        componentName: item.nombre,
        paneReference: glass.reference || `${item.codigo || "Componente"} · Paño ${index + 1}`,
        description: fullGlassDescription(item, thickness, finish, composition || glass.name),
        thickness,
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
}): WorkMaterialsDocument {
  const items = input.items as readonly WorkItem[];
  const lineTemplates = input.lineTemplates ?? [];
  return {
    profiles: buildProfileRows(input.summary, input.technicalCostSnapshot ?? null),
    accessories: buildAccessoryRows(items, input.technicalCostSnapshot ?? null),
    glass: buildGlassRows(items, lineTemplates),
    glassOrder: buildGlassOrderRows(items, lineTemplates),
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

import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import type { WorkMaterialsDocument, WorkMaterialPrice } from "./fabrication-work-materials.service";
import { resolveProfileSupplierPrice } from "./work-materials-price-reference.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { resolveComponentColorName } from "@/constants/component-colors";
import { resolveUniversalAluminumLineKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import { evaluarPautaFisicaTrabajo, PAUTA_TEORICA_AVISO } from "./fabricacion-pauta-fisica.service";

export type WorkOrderPending = { key: string; subject: string; action: string };
export type WorkOrderCut = {
  itemCode: string;
  component: string;
  functionName: string;
  quantity: number;
  lengthMm: number;
};
export type WorkOrderCutGroup = {
  key: string;
  /** Identidad estable de la partida cuando el grupo proviene de un snapshot por pieza. */
  itemId?: string;
  technicalCode: string;
  profileName: string;
  finish?: string | null;
  barIndex: number | null;
  commercialLengthMm: number | null;
  usedMm: number | null;
  theoreticalRemnantMm: number | null;
  trimMm: number | null;
  kerfMm: number | null;
  line?: string | null;
  supplierLabel?: string | null;
  supplierSku?: string | null;
  familyKey?: string | null;
  supplierProviderKey?: string | null;
  supplierPresentationId?: string | null;
  cuts: WorkOrderCut[];
};
export type WorkOrderGlass = {
  key: string;
  paneReference: string;
  itemCode: string;
  type: string | null;
  thickness: string | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number | null;
  totalM2: number | null;
  issue: string | null;
  dimensionProvenance?: WorkMaterialsDocument["glassOrder"][number]["dimensionProvenance"];
  validationLabel?: string;
  validationWarnings?: string[];
};
export type WorkOrderComponentSummary = {
  code: string;
  name: string | null;
  line: string | null;
  variant: string | null;
  dimensionsMm: { widthMm: number; heightMm: number } | null;
  quantity: number | null;
  finish: string | null;
};
export type FabricationWorkOrder = {
  materials: WorkMaterialsDocument;
  /** Identificación consolidada de componentes con sus variantes y datos disponibles. */
  components?: WorkOrderComponentSummary[];
  /** Cortes guardados o de snapshot técnico formal, elegibles para la pauta del trabajo. */
  cutGroups: WorkOrderCutGroup[];
  /** Geometría de revisión separada de toda pauta operativa. */
  preliminaryCutGroups: WorkOrderCutGroup[];
  /** Snapshots históricos draft/incompatibles conservados solo para revisión. */
  reviewCutGroups: WorkOrderCutGroup[];
  documentStatus: {
    state: "complete" | "partial";
    label: "DOCUMENTO INTERNO · REVISIÓN" | "DOCUMENTO PARCIAL · NO APTO PARA FABRICACIÓN";
    pendingComponents: Array<{ itemId: string; codigo: string; nombre: string; reason: string }>;
  };
  hasJointBars: boolean;
  cutPlanPhysicalState?: "sin_pauta" | "teorica" | "confirmada" | "incompatible";
  glass: WorkOrderGlass[];
  pending: WorkOrderPending[];
  pricing: {
    status: "pending" | "partial" | "complete";
    knownNetTotal: number | null;
    currency: string;
    pricedCount: number;
    pendingCount: number;
    assumptions?: string[];
  };
};

export function workOrderPriceSource(price: WorkMaterialPrice): string {
  if (price.providerKey?.trim().toLocaleLowerCase("es-CL") === "arquetipo") return "Arquetipo · junio 2026";
  if (price.providerKey?.trim().toLocaleLowerCase("es-CL") === "alumco") return "Alumco · 2026";
  if (price.sourceKind === "adjusted") return "Ajustado por el taller";
  if (price.sourceKind === "own" || price.isWorkshopCode) return "Propio del taller";
  return "Referencial";
}

function normalizeFinish(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function selectedFinishForBar(
  bar: NonNullable<FabricationQuoteSummary["trabajoSnapshot"]>["bars"][number],
  quoteItemsById: ReadonlyMap<string, CotizacionWorkflowItem>
) {
  const selected = [...new Set(bar.cortes.flatMap((cut) => {
    const item = quoteItemsById.get(cut.itemId);
    if (!item) return [];
    const metadata = decodeCotizacionItemPresentationMeta(item.observaciones ?? "");
    const finish = resolveComponentColorName(metadata.colorHex);
    return finish && finish !== "Color a definir" ? [finish] : [];
  }))];
  return selected.length === 1 ? selected[0]! : bar.acabadoKey;
}

function profileNameWithoutConflictingFinish(profileName: string, selectedFinish: string) {
  const name = profileName.trim();
  const finishes = ["blanco hueso", "negro mate", "blanco", "titanio", "antracita", "negro", "madera"];
  const suffix = finishes.find((finish) => normalizeFinish(name).endsWith(` ${normalizeFinish(finish)}`));
  if (!suffix || normalizeFinish(suffix) === normalizeFinish(selectedFinish)) return name;
  return name.slice(0, name.length - suffix.length).trim();
}

function buildJointCutGroups(
  summary: FabricationQuoteSummary,
  quoteItemsById: ReadonlyMap<string, CotizacionWorkflowItem>,
  addPending: (key: string, subject: string, action: string) => void,
  excludedItemIds: ReadonlySet<string> = new Set()
) {
  const bars = summary.trabajoSnapshot?.bars ?? [];
  return bars.map((bar, barNumber): WorkOrderCutGroup | null => {
    if (bar.cortes.some((cut) => excludedItemIds.has(String(cut.itemId)))) {
      addPending(
        `mixed-preliminary-bar:${barNumber}`,
        `Tira ${bar.indice}: pauta conjunta`,
        "Contiene un componente con geometría preliminar; revisar y recalcular la pauta completa antes de usar sus cortes."
      );
      return null;
    }
    const cuts = new Map<string, WorkOrderCut>();
    for (const cut of bar.cortes) {
      if (!Number.isFinite(cut.largoMm) || cut.largoMm <= 0) {
        addPending(`cut:${barNumber}:${cut.itemId}`, `Corte ${cut.codigoItem || "sin partida"}`, "Revisar largo del corte guardado.");
        continue;
      }
      const key = [cut.itemId, cut.componenteId, cut.funcion, cut.largoMm].join("|");
      const existing = cuts.get(key);
      if (existing) existing.quantity += 1;
      else cuts.set(key, {
        itemCode: cut.codigoItem || "Partida pendiente",
        component: cut.nombreItem || cut.componenteId || "Componente pendiente",
        functionName: cut.funcion || "Función pendiente",
        quantity: 1,
        lengthMm: cut.largoMm,
      });
    }
    const finish = selectedFinishForBar(bar, quoteItemsById);
    const sourcePresentations = summary.trabajoSnapshot?.sourcePresentations ?? [];
    const families = [...new Set(sourcePresentations
      .filter((presentation) => presentation.presentationKey === bar.presentationKey)
      .map((presentation) => presentation.catalogLineKey ? resolveUniversalAluminumLineKey(presentation.catalogLineKey) ?? presentation.catalogLineKey.trim() : null)
      .filter((familyKey): familyKey is string => Boolean(familyKey)))];
    return {
      key: `${bar.materialKey}|${bar.presentationKey}|${bar.acabadoKey}|${bar.largoComercialMm}|${bar.indice}|${barNumber}`,
      technicalCode: bar.codigoPerfil || "Pendiente",
      profileName: profileNameWithoutConflictingFinish(bar.nombrePerfil || "Perfil sin descripción", finish),
      finish,
      familyKey: families.length === 1 ? families[0] : null,
      supplierProviderKey: bar.supplierProviderKey ?? null,
      supplierPresentationId: bar.supplierPresentationId ?? null,
      supplierSku: bar.supplierSku ?? null,
      barIndex: bar.indice,
      commercialLengthMm: bar.largoComercialMm,
      usedMm: bar.usadoMm,
      theoreticalRemnantMm: bar.sobranteMm,
      trimMm: bar.parametrosFisicos?.despunteInicialMm ?? null,
      kerfMm: bar.parametrosFisicos?.perdidaCorteMm ?? null,
      cuts: [...cuts.values()],
    };
  }).filter((group): group is WorkOrderCutGroup => group !== null && group.cuts.length > 0);
}

function buildHistoricCutGroups(summary: FabricationQuoteSummary, kind: "ready" | "preliminary" | "review") {
  const groups: WorkOrderCutGroup[] = [];
  for (const item of summary.items) {
    const state = item.operationalStatus ?? (item.geometryOnly ? "preliminary" : "ready");
    const include = kind === "preliminary" ? state === "preliminary"
      : kind === "review" ? state === "incompatible" || state === "unvalidated"
        : state === "ready";
    if (!include) continue;
    const cuts = item.fabricacionSnapshot?.pauta?.length
      ? item.fabricacionSnapshot.pauta.map((cut) => ({
          technicalCode: cut.codigoPerfil,
          profileName: cut.nombrePerfil,
          functionName: cut.funcion,
          quantity: cut.cantidadPiezas,
          lengthMm: cut.medidaMm,
        }))
      : item.snapshot.cuts.map((cut) => ({
          technicalCode: cut.profileCode ?? "",
          profileName: cut.profileName ?? cut.label,
          functionName: cut.functionLabel,
          quantity: cut.quantity,
          lengthMm: cut.lengthMm,
        }));
    const byProfile = new Map<string, WorkOrderCutGroup>();
    for (const cut of cuts) {
      if (cut.quantity <= 0 || cut.lengthMm <= 0) continue;
      const code = cut.technicalCode || "Pendiente";
      const key = `${item.itemId}|${code}|${cut.profileName}`;
      let group = byProfile.get(key);
      if (!group) {
        group = {
          key, itemId: item.itemId, technicalCode: code, profileName: cut.profileName,
          barIndex: null, commercialLengthMm: null, usedMm: null,
          theoreticalRemnantMm: null, trimMm: null, kerfMm: null, cuts: [],
        };
        byProfile.set(key, group);
      }
      group.cuts.push({
        itemCode: item.codigo,
        component: item.nombre,
        functionName: cut.functionName,
        quantity: cut.quantity,
        lengthMm: cut.lengthMm,
      });
    }
    groups.push(...byProfile.values());
  }
  return groups;
}

function cleanOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isGenericComponentLabel(value: string | null | undefined): boolean {
  const normalized = normalizeFinish(value);
  return !normalized
    || normalized === "-"
    || normalized === "componente"
    || normalized === "pieza"
    || normalized === "componente pendiente"
    || normalized === "partida pendiente";
}

function resolveRealVariantLabel(parts: Array<string | null | undefined>, excludedTexts: Array<string | null | undefined>): string | null {
  const normalizedExcluded = excludedTexts.map((text) => normalizeFinish(text)).filter(Boolean);
  const chosen: string[] = [];
  for (const part of parts) {
    const cleaned = cleanOptionalText(part);
    if (!cleaned) continue;
    const norm = normalizeFinish(cleaned);
    if (norm === "-" || norm === "sin herraje" || norm === "sin herraje especifico") continue;
    if (normalizedExcluded.some((existing) => existing === norm || existing.includes(norm))) continue;
    if (chosen.some((existing) => normalizeFinish(existing) === norm || normalizeFinish(existing).includes(norm))) continue;
    chosen.push(cleaned);
  }
  return chosen.length ? chosen.join(" · ") : null;
}

function buildComponentSummaries(input: {
  summary: FabricationQuoteSummary;
  quoteItemsById: ReadonlyMap<string, CotizacionWorkflowItem>;
  cutGroups: readonly WorkOrderCutGroup[];
  preliminaryCutGroups: readonly WorkOrderCutGroup[];
  reviewCutGroups: readonly WorkOrderCutGroup[];
  pendingComponents: readonly { itemId: string; codigo: string; nombre: string; reason: string }[];
}): WorkOrderComponentSummary[] {
  const byCode = new Map<string, WorkOrderComponentSummary>();
  const register = (entry: WorkOrderComponentSummary) => {
    const existing = byCode.get(entry.code);
    if (!existing) {
      byCode.set(entry.code, entry);
      return;
    }
    byCode.set(entry.code, {
      code: existing.code,
      name: existing.name ?? entry.name,
      line: existing.line ?? entry.line,
      variant: existing.variant ?? entry.variant,
      dimensionsMm: existing.dimensionsMm ?? entry.dimensionsMm,
      quantity: existing.quantity ?? entry.quantity,
      finish: existing.finish ?? entry.finish,
    });
  };

  for (const row of input.summary.items) {
    if (row.operationalStatus === "not_required") continue;
    const code = cleanOptionalText(row.codigo);
    if (!code || code === "-") continue;
    const quoteItem = input.quoteItemsById.get(String(row.itemId));
    const meta = quoteItem ? decodeCotizacionItemPresentationMeta(quoteItem.observaciones ?? "") : null;
    const rawName = cleanOptionalText(row.nombre) ?? cleanOptionalText(quoteItem?.nombre);
    const name = isGenericComponentLabel(rawName) ? null : rawName;
    const line = cleanOptionalText(row.lineName)
      ?? cleanOptionalText(quoteItem?.lineaComercial);
    const finishRaw = meta ? resolveComponentColorName(meta.colorHex) : null;
    const finish = finishRaw && finishRaw !== "Color a definir" ? finishRaw : null;
    const variant = resolveRealVariantLabel([
      row.fabricacionSnapshot?.selectedVariant,
      row.fabricacionSnapshot?.recipeIdentity?.variante,
      meta?.fabricacionVariante,
      meta?.configuracion,
      meta?.sheetVariant,
      meta?.sheetScheme,
      meta?.fabricacionApertura,
      row.herrajeLabel,
    ], [name, line]);
    const widthMm = row.widthMm > 0 ? row.widthMm : (quoteItem?.ancho && quoteItem.ancho > 0 ? quoteItem.ancho : null);
    const heightMm = row.heightMm > 0 ? row.heightMm : (quoteItem?.alto && quoteItem.alto > 0 ? quoteItem.alto : null);
    const quantity = row.quantity > 0 ? row.quantity : (quoteItem?.cantidad && quoteItem.cantidad > 0 ? quoteItem.cantidad : null);
    register({
      code,
      name,
      line,
      variant,
      dimensionsMm: widthMm && heightMm ? { widthMm, heightMm } : null,
      quantity,
      finish,
    });
  }

  for (const pendingItem of input.pendingComponents) {
    const code = cleanOptionalText(pendingItem.codigo);
    if (!code || code === "-") continue;
    const quoteItem = input.quoteItemsById.get(String(pendingItem.itemId));
    const rawName = cleanOptionalText(pendingItem.nombre) ?? cleanOptionalText(quoteItem?.nombre);
    register({
      code,
      name: isGenericComponentLabel(rawName) ? null : rawName,
      line: cleanOptionalText(quoteItem?.lineaComercial),
      variant: null,
      dimensionsMm: quoteItem?.ancho && quoteItem?.alto && quoteItem.ancho > 0 && quoteItem.alto > 0
        ? { widthMm: quoteItem.ancho, heightMm: quoteItem.alto }
        : null,
      quantity: quoteItem?.cantidad && quoteItem.cantidad > 0 ? quoteItem.cantidad : null,
      finish: null,
    });
  }

  for (const group of [...input.cutGroups, ...input.preliminaryCutGroups, ...input.reviewCutGroups]) {
    for (const cut of group.cuts) {
      const code = cleanOptionalText(cut.itemCode);
      if (!code || code === "Partida pendiente") continue;
      register({
        code,
        name: isGenericComponentLabel(cut.component) ? null : cleanOptionalText(cut.component),
        line: null,
        variant: null,
        dimensionsMm: null,
        quantity: null,
        finish: null,
      });
    }
  }

  return [...byCode.values()];
}

export function buildFabricationWorkOrder(input: {
  summary: FabricationQuoteSummary;
  materials: WorkMaterialsDocument;
  technicalCostSnapshot?: TechnicalCostSnapshot | null;
  quoteItems?: readonly CotizacionWorkflowItem[];
}): FabricationWorkOrder {
  const { summary, materials } = input;
  const cost = input.technicalCostSnapshot ?? null;
  const pending = new Map<string, WorkOrderPending>();
  const addPending = (key: string, subject: string, action: string) => {
    if (!pending.has(key)) pending.set(key, { key, subject, action });
  };

  const geometryOnlyItemIds = new Set(summary.items.filter((item) => item.geometryOnly).map((item) => item.itemId));
  const contaminatedJointSnapshot = Boolean(summary.trabajoSnapshotHasGeometryOnly) || Boolean(summary.trabajoSnapshot?.bars.some((bar) =>
    bar.cortes.some((cut) => geometryOnlyItemIds.has(String(cut.itemId)))
  ));
  const coverage = summary.profileCoverage;
  const cutPlanPhysicalState = evaluarPautaFisicaTrabajo(summary.trabajoSnapshot);
  const pendingComponents = (coverage?.items ?? [])
    .filter((item) => item.state !== "ready" && item.state !== "not_required")
    .map((item) => ({
      itemId: item.itemId, codigo: item.codigo, nombre: item.nombre,
      reason: item.reason ?? "Componente pendiente de revisión técnica.",
    }));
  const coverageIsPartial = coverage?.status === "partial";
  const workMaterials = contaminatedJointSnapshot || (coverageIsPartial && coverage?.jointPlanStatus !== "theoretical")
    ? { ...materials, profiles: [], hasJointCuttingPlan: false }
    : materials;
  if (contaminatedJointSnapshot) {
    addPending("joint-plan-preliminary-geometry", "Pauta conjunta por revisar", "Incluye geometría estructural preliminar; recalcular la pauta completa antes de comprar o fabricar.");
  }
  for (const component of pendingComponents) {
    const subject = component.reason.includes("incompatible") || component.reason.includes("contradice")
      ? `${component.codigo}: identidad técnica`
      : component.reason.includes("validada") || component.reason.includes("borrador")
        ? `${component.codigo}: receta`
        : `${component.codigo}: despiece`;
    addPending(`coverage:${component.itemId}`, subject, component.reason);
  }
  if (coverage?.jointPlanStatus === "pending") {
    addPending("coverage-joint-plan", "Pauta conjunta", "Los cortes por componente no sustituyen la distribución de barras del trabajo.");
  } else if (coverage?.jointPlanStatus === "blocked") {
    addPending("coverage-joint-plan-blocked", "Pauta conjunta", "La cobertura de componentes está incompleta; revisar todos los pendientes antes de usar una pauta operativa.");
  }
  if (cutPlanPhysicalState === "teorica") {
    addPending("cut-physics", "Pauta teórica", PAUTA_TEORICA_AVISO);
  } else if (cutPlanPhysicalState === "incompatible") {
    addPending("cut-physics", "Pauta incompatible", "La capacidad o los parámetros guardados no coinciden; revisar antes de fabricar.");
  }

  for (const row of workMaterials.profiles) {
    const code = row.code === "—" ? "sin código" : row.code;
    if (row.finish === "Acabado sin definir") addPending(`finish:${row.key}`, `Perfil ${code}: acabado`, "Definir el acabado antes de comprar.");
    if (!row.supplierSku && (!row.price || !row.price.isWorkshopCode) && !row.price?.sku) addPending(`sku:${row.key}`, `Perfil ${code}: SKU proveedor`, "Seleccionar una presentación con SKU.");
    if (!row.price) addPending(`price:${row.key}`, `Perfil ${code}: precio`, "Configurar el precio de compra por presentación.");
    if (!(row.commercialLengthMm > 0)) addPending(`length:${row.key}`, `Perfil ${code}: largo`, "Definir el largo comercial de la tira.");
  }
  for (const row of workMaterials.accessories) {
    if (!row.code && !row.price?.sku) addPending(`accessory-code:${row.key}`, `${row.description}: código`, "Completar código del accesorio.");
    if (!row.price) addPending(`accessory-price:${row.key}`, `${row.description}: precio`, "Configurar el precio de compra.");
    if (row.finish === "Acabado sin definir") addPending(`accessory-finish:${row.key}`, `${row.description}: acabado`, "Definir el acabado.");
  }
  for (const missing of summary.trabajoSnapshot?.missingPresentations ?? []) {
    addPending(`presentation:${missing.itemId}:${missing.technicalCode}`, `Perfil ${missing.technicalCode}: presentación`, missing.reason || "Seleccionar presentación y largo comercial.");
  }
  for (const missing of cost?.missing ?? []) {
    const alreadyListed = [...workMaterials.profiles, ...workMaterials.accessories].some((row) =>
      !row.price && (
        (missing.technicalCode != null && row.code === missing.technicalCode) ||
        row.description.trim().toLocaleLowerCase("es-CL") === missing.description.trim().toLocaleLowerCase("es-CL")
      )
    );
    if (alreadyListed) continue;
    addPending(`cost:${missing.technicalCode ?? missing.description}:${missing.reason}`, `${missing.description}: precio`, missing.reason || "Completar precio de compra.");
  }

  const coverageAllowsJointPlan = !coverage || (
    (coverage.status === "complete" && (coverage.jointPlanStatus === "ready" || coverage.jointPlanStatus === "not_required")) ||
    (coverage.jointPlanStatus === "theoretical" && coverage.readyCount === coverage.requiredCount)
  );
  const hasJointBars = Boolean(summary.trabajoSnapshot?.bars.length) && !contaminatedJointSnapshot && coverageAllowsJointPlan && cutPlanPhysicalState !== "incompatible";
  const quoteItemsById = new Map((input.quoteItems ?? []).map((item) => [String(item.id), item]));
  const rawCutGroups = hasJointBars
    ? buildJointCutGroups(summary, quoteItemsById, addPending, geometryOnlyItemIds)
    : buildHistoricCutGroups(summary, "ready");
  const preliminaryCutGroups = buildHistoricCutGroups(summary, "preliminary");
  const reviewCutGroups = buildHistoricCutGroups(summary, "review");
  if (preliminaryCutGroups.length > 0) {
    addPending("structural-geometry", "Despiece estructural preliminar", "Acristalamiento pendiente. Revisar los cortes por separado; no apto para fabricación.");
  }
  const cutGroups = rawCutGroups.map((group) => {
    const groupItemCodes = [...new Set(group.cuts.map((cut) => cut.itemCode))];
    if (!group.finish || !group.commercialLengthMm || groupItemCodes.length === 0) return group;
    const candidates = workMaterials.profiles.filter((profile) =>
      profile.code === group.technicalCode &&
      (!group.familyKey || profile.familyKey === group.familyKey) &&
      (!group.supplierProviderKey || profile.supplierProviderKey === group.supplierProviderKey) &&
      (!group.supplierPresentationId || profile.supplierPresentationId === group.supplierPresentationId) &&
      (!group.supplierSku || profile.supplierSku === group.supplierSku) &&
      normalizeFinish(profile.configuredFinish ?? profile.finish) === normalizeFinish(group.finish) &&
      profile.commercialLengthMm === group.commercialLengthMm &&
      groupItemCodes.every((itemCode) => profile.itemCodes.includes(itemCode))
    );
    if (candidates.length !== 1) return group;
    const [profile] = candidates;
    if (!profile) return group;
    const reference = resolveProfileSupplierPrice(profile, workMaterials.profilePriceReferences);
    return {
      ...group,
      line: profile.line,
      supplierLabel: reference?.providerLabel ?? (profile.price ? workOrderPriceSource(profile.price) : profile.supplierProviderKey ?? null),
      supplierSku: reference?.supplierSku ?? group.supplierSku ?? profile.supplierSku ?? null,
    };
  });
  if (!hasJointBars && cutGroups.length > 0) addPending("bar-distribution", "Distribución por tira", "Revisar pauta conjunta pendiente; estos cortes pertenecen a snapshots por pieza.");
  if (cutGroups.length === 0 && (!coverage || coverage.requiredCount > 0)) {
    addPending("cut-plan", "Pauta de corte", "Guardar una pauta técnica para este trabajo.");
  }
  if (reviewCutGroups.length > 0) {
    addPending("historical-cuts-review", "Cortes históricos por revisar", "Los snapshots draft o incompatibles se conservan para consulta y se excluyen de la pauta operativa.");
  }

  const glass = materials.glassOrder.map((row): WorkOrderGlass => {
    const dimensionsValid = !row.measuresPending && row.widthMm != null && row.heightMm != null && row.quantity != null && row.widthMm > 0 && row.heightMm > 0 && row.quantity > 0;
    const expectedM2 = dimensionsValid ? (row.widthMm! * row.heightMm! * row.quantity!) / 1_000_000 : null;
    const areaValid = row.totalM2 != null && Number.isFinite(row.totalM2) && row.totalM2 > 0 && expectedM2 != null && Math.abs(row.totalM2 - expectedM2) <= 0.00015;
    const issues: string[] = [...row.validationWarnings];
    if (!dimensionsValid) issues.push("medidas o cantidad pendientes");
    if (dimensionsValid && !areaValid) issues.push("superficie contradictoria");
    if (row.dimensionProvenance === "manual" && dimensionsValid) {
      issues.push("medida final ingresada manualmente; no es aprobación física de corte");
    }
    const thickness = row.snapshotThickness === undefined ? row.thickness.trim() : row.snapshotThickness?.trim() ?? "";
    if (!thickness) issues.push("espesor pendiente");
    if (row.thicknessWarning) issues.push("conflicto de espesor");
    const type = row.glassType === undefined
      ? row.description.trim() && row.description.trim() !== "Vidrio" ? row.description.trim() : null
      : row.glassType?.trim() || null;
    if (!type) issues.push("tipo pendiente");
    if (issues.length) addPending(`glass:${row.key}`, `${row.paneReference}: vidrio`, `Revisar ${issues.join(", ")}.`);
    return {
      key: row.key,
      paneReference: row.paneReference,
      itemCode: row.componentCode,
      type,
      thickness: thickness || null,
      widthMm: dimensionsValid ? row.widthMm : null,
      heightMm: dimensionsValid ? row.heightMm : null,
      quantity: dimensionsValid ? row.quantity : null,
      totalM2: areaValid ? row.totalM2 : null,
      issue: issues.length ? issues.join(", ") : null,
      dimensionProvenance: row.dimensionProvenance,
      validationLabel: row.validationLabel,
      validationWarnings: row.validationWarnings,
    };
  });
  if (glass.length === 0) addPending("glass-order", "Orden de vidrios", "Revisar si el trabajo requiere paños de vidrio.");

  const pricedRows = [...workMaterials.profiles, ...workMaterials.accessories].filter((row) => row.price);
  const visibleSubtotal = pricedRows.reduce((sum, row) => sum + (row.price?.subtotal ?? 0), 0);
  const savedSubtotal = cost?.lines.reduce((sum, line) => sum + line.lineNet, 0) ?? null;
  const savedTotal = cost?.knownNetTotal ?? null;
  const totalsAgree = savedTotal != null && savedSubtotal != null && Math.abs(savedTotal - savedSubtotal) <= 1 && Math.abs(savedTotal - visibleSubtotal) <= 1;
  if (savedTotal != null && !totalsAgree) addPending("price-total", "Costo valorizado", "Revisar diferencia entre subtotales y total guardado.");
  if (!cost) addPending("price-snapshot", "Costo de materiales", "Calcular y guardar el costo técnico para mostrar precios.");
  const unpricedVisibleCount = [...workMaterials.profiles, ...workMaterials.accessories].filter((row) => !row.price).length;
  const pendingPriceCount = Math.max(cost?.missing.length ?? 0, unpricedVisibleCount);
  const components = buildComponentSummaries({
    summary,
    quoteItemsById,
    cutGroups,
    preliminaryCutGroups,
    reviewCutGroups,
    pendingComponents,
  });

  const status = !totalsAgree || cost?.status === "no_data" ? "pending"
    : pendingPriceCount > 0 || cost?.status !== "complete" ? "partial" : "complete";

  return {
    materials: workMaterials,
    components,
    cutGroups,
    preliminaryCutGroups,
    reviewCutGroups,
    documentStatus: {
      state: coverageIsPartial || contaminatedJointSnapshot || cutPlanPhysicalState === "teorica" || cutPlanPhysicalState === "incompatible" ? "partial" : "complete",
      label: coverageIsPartial || contaminatedJointSnapshot || cutPlanPhysicalState === "teorica" || cutPlanPhysicalState === "incompatible"
        ? "DOCUMENTO PARCIAL · NO APTO PARA FABRICACIÓN"
        : "DOCUMENTO INTERNO · REVISIÓN",
      pendingComponents,
    },
    hasJointBars,
    cutPlanPhysicalState,
    glass,
    pending: [...pending.values()],
    pricing: {
      status,
      knownNetTotal: status === "pending" ? null : savedTotal,
      currency: cost?.currency ?? "CLP",
      pricedCount: cost?.lines.length ?? 0,
      pendingCount: pendingPriceCount,
      assumptions: cost?.assumptions ?? [],
    },
  };
}

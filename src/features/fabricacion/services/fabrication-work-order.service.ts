import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import type { WorkMaterialsDocument, WorkMaterialPrice } from "./fabrication-work-materials.service";
import { resolveProfileSupplierPrice } from "./work-materials-price-reference.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { resolveComponentColorName } from "@/constants/component-colors";
import { resolveUniversalAluminumLineKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

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
};
export type FabricationWorkOrder = {
  materials: WorkMaterialsDocument;
  /** Cortes guardados o de snapshot técnico formal, elegibles para la pauta del trabajo. */
  cutGroups: WorkOrderCutGroup[];
  /** Geometría de revisión separada de toda pauta operativa. */
  preliminaryCutGroups: WorkOrderCutGroup[];
  hasJointBars: boolean;
  glass: WorkOrderGlass[];
  pending: WorkOrderPending[];
  pricing: {
    status: "pending" | "partial" | "complete";
    knownNetTotal: number | null;
    currency: string;
    pricedCount: number;
    pendingCount: number;
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
      trimMm: bar.despunteInicialMm,
      kerfMm: bar.perdidaCorteMm,
      cuts: [...cuts.values()],
    };
  }).filter((group): group is WorkOrderCutGroup => group !== null && group.cuts.length > 0);
}

function buildHistoricCutGroups(summary: FabricationQuoteSummary, geometryOnly: boolean) {
  const groups: WorkOrderCutGroup[] = [];
  for (const item of summary.items) {
    if (Boolean(item.geometryOnly) !== geometryOnly) continue;
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
          key, technicalCode: code, profileName: cut.profileName,
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
  const workMaterials = contaminatedJointSnapshot
    ? { ...materials, profiles: [], hasJointCuttingPlan: false }
    : materials;
  if (contaminatedJointSnapshot) {
    addPending("joint-plan-preliminary-geometry", "Pauta conjunta por revisar", "Incluye geometría estructural preliminar; recalcular la pauta completa antes de comprar o fabricar.");
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

  const hasJointBars = Boolean(summary.trabajoSnapshot?.bars.length) && !contaminatedJointSnapshot;
  const quoteItemsById = new Map((input.quoteItems ?? []).map((item) => [String(item.id), item]));
  const rawCutGroups = hasJointBars
    ? buildJointCutGroups(summary, quoteItemsById, addPending, geometryOnlyItemIds)
    : buildHistoricCutGroups(summary, false);
  const preliminaryCutGroups = buildHistoricCutGroups(summary, true);
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
  if (cutGroups.length === 0) addPending("cut-plan", "Pauta de corte", "Guardar una pauta técnica para este trabajo.");

  const glass = materials.glassOrder.map((row): WorkOrderGlass => {
    const dimensionsValid = !row.measuresPending && row.widthMm != null && row.heightMm != null && row.quantity != null && row.widthMm > 0 && row.heightMm > 0 && row.quantity > 0;
    const expectedM2 = dimensionsValid ? (row.widthMm! * row.heightMm! * row.quantity!) / 1_000_000 : null;
    const areaValid = row.totalM2 != null && Number.isFinite(row.totalM2) && row.totalM2 > 0 && expectedM2 != null && Math.abs(row.totalM2 - expectedM2) <= 0.00015;
    const issues: string[] = [];
    if (!dimensionsValid) issues.push("medidas o cantidad pendientes");
    if (dimensionsValid && !areaValid) issues.push("superficie contradictoria");
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
  const status = !totalsAgree || cost?.status === "no_data" ? "pending"
    : pendingPriceCount > 0 || cost?.status !== "complete" ? "partial" : "complete";

  return {
    materials: workMaterials,
    cutGroups,
    preliminaryCutGroups,
    hasJointBars,
    glass,
    pending: [...pending.values()],
    pricing: {
      status,
      knownNetTotal: status === "pending" ? null : savedTotal,
      currency: cost?.currency ?? "CLP",
      pricedCount: cost?.lines.length ?? 0,
      pendingCount: pendingPriceCount,
    },
  };
}

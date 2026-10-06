import type { FabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { TechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";
import type { WorkMaterialsDocument, WorkMaterialPrice } from "./fabrication-work-materials.service";

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
  barIndex: number | null;
  commercialLengthMm: number | null;
  usedMm: number | null;
  theoreticalRemnantMm: number | null;
  trimMm: number | null;
  kerfMm: number | null;
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
  cutGroups: WorkOrderCutGroup[];
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
  if (price.sourceKind === "adjusted") return "Ajustado por el taller";
  if (price.sourceKind === "own" || price.isWorkshopCode) return "Propio del taller";
  return "Referencial";
}

function buildJointCutGroups(summary: FabricationQuoteSummary, addPending: (key: string, subject: string, action: string) => void) {
  const bars = summary.trabajoSnapshot?.bars ?? [];
  return bars.map((bar, barNumber): WorkOrderCutGroup => {
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
    return {
      key: `${bar.materialKey}|${bar.presentationKey}|${bar.acabadoKey}|${bar.largoComercialMm}|${bar.indice}|${barNumber}`,
      technicalCode: bar.codigoPerfil || "Pendiente",
      profileName: bar.nombrePerfil || "Perfil sin descripción",
      barIndex: bar.indice,
      commercialLengthMm: bar.largoComercialMm,
      usedMm: bar.usadoMm,
      theoreticalRemnantMm: bar.sobranteMm,
      trimMm: bar.despunteInicialMm,
      kerfMm: bar.perdidaCorteMm,
      cuts: [...cuts.values()],
    };
  });
}

function buildHistoricCutGroups(summary: FabricationQuoteSummary) {
  const groups: WorkOrderCutGroup[] = [];
  for (const item of summary.items) {
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
}): FabricationWorkOrder {
  const { summary, materials } = input;
  const cost = input.technicalCostSnapshot ?? null;
  const pending = new Map<string, WorkOrderPending>();
  const addPending = (key: string, subject: string, action: string) => {
    if (!pending.has(key)) pending.set(key, { key, subject, action });
  };

  for (const row of materials.profiles) {
    const code = row.code === "—" ? "sin código" : row.code;
    if (row.finish === "Acabado sin definir") addPending(`finish:${row.key}`, `Perfil ${code}: acabado`, "Definir el acabado antes de comprar.");
    if (!row.supplierSku && (!row.price || !row.price.isWorkshopCode) && !row.price?.sku) addPending(`sku:${row.key}`, `Perfil ${code}: SKU proveedor`, "Seleccionar una presentación con SKU.");
    if (!row.price) addPending(`price:${row.key}`, `Perfil ${code}: precio`, "Configurar el precio de compra por presentación.");
    if (!(row.commercialLengthMm > 0)) addPending(`length:${row.key}`, `Perfil ${code}: largo`, "Definir el largo comercial de la barra.");
  }
  for (const row of materials.accessories) {
    if (!row.code && !row.price?.sku) addPending(`accessory-code:${row.key}`, `${row.description}: código`, "Completar código del accesorio.");
    if (!row.price) addPending(`accessory-price:${row.key}`, `${row.description}: precio`, "Configurar el precio de compra.");
    if (row.finish === "Acabado sin definir") addPending(`accessory-finish:${row.key}`, `${row.description}: acabado`, "Definir el acabado.");
  }
  for (const missing of summary.trabajoSnapshot?.missingPresentations ?? []) {
    addPending(`presentation:${missing.itemId}:${missing.technicalCode}`, `Perfil ${missing.technicalCode}: presentación`, missing.reason || "Seleccionar presentación y largo comercial.");
  }
  for (const missing of cost?.missing ?? []) {
    const alreadyListed = [...materials.profiles, ...materials.accessories].some((row) =>
      !row.price && (
        (missing.technicalCode != null && row.code === missing.technicalCode) ||
        row.description.trim().toLocaleLowerCase("es-CL") === missing.description.trim().toLocaleLowerCase("es-CL")
      )
    );
    if (alreadyListed) continue;
    addPending(`cost:${missing.technicalCode ?? missing.description}:${missing.reason}`, `${missing.description}: precio`, missing.reason || "Completar precio de compra.");
  }

  const hasJointBars = Boolean(summary.trabajoSnapshot?.bars.length);
  const cutGroups = hasJointBars ? buildJointCutGroups(summary, addPending) : buildHistoricCutGroups(summary);
  if (!hasJointBars && cutGroups.length > 0) addPending("bar-distribution", "Distribución por barra", "Revisar pauta conjunta pendiente; estos cortes pertenecen a snapshots por pieza.");
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

  const pricedRows = [...materials.profiles, ...materials.accessories].filter((row) => row.price);
  const visibleSubtotal = pricedRows.reduce((sum, row) => sum + (row.price?.subtotal ?? 0), 0);
  const savedSubtotal = cost?.lines.reduce((sum, line) => sum + line.lineNet, 0) ?? null;
  const savedTotal = cost?.knownNetTotal ?? null;
  const totalsAgree = savedTotal != null && savedSubtotal != null && Math.abs(savedTotal - savedSubtotal) <= 1 && Math.abs(savedTotal - visibleSubtotal) <= 1;
  if (savedTotal != null && !totalsAgree) addPending("price-total", "Costo valorizado", "Revisar diferencia entre subtotales y total guardado.");
  if (!cost) addPending("price-snapshot", "Costo de materiales", "Calcular y guardar el costo técnico para mostrar precios.");
  const unpricedVisibleCount = [...materials.profiles, ...materials.accessories].filter((row) => !row.price).length;
  const pendingPriceCount = Math.max(cost?.missing.length ?? 0, unpricedVisibleCount);
  const status = !totalsAgree || cost?.status === "no_data" ? "pending"
    : pendingPriceCount > 0 || cost?.status !== "complete" ? "partial" : "complete";

  return {
    materials,
    cutGroups,
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

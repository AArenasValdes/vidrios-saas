import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import {
  buildPartialTechnicalCostSnapshot,
  getRecipeAccessoriesFromItemSnapshot,
  type CatalogPresentationPrice,
  type TechnicalCostSnapshot,
} from "./costo-tecnico-parcial.service";
import {
  isEffectiveSupplierProfilePrice,
  type SupplierProfilePricePreview,
} from "./supplier-presentation-resolution.service";

export type GuidedTechnicalCostSuggestionStatus = "complete" | "partial" | "unavailable";

export type GuidedTechnicalCostSuggestion = {
  status: GuidedTechnicalCostSuggestionStatus;
  recipeStatus: FabricationRecipeRecord["status"] | null;
  isRecipeValidated: boolean;
  profilesCostNet: number | null;
  glassCostNet: number | null;
  accessoriesCostNet: number | null;
  knownNetTotal: number | null;
  usableBaseCostGroupNet: number | null;
  defaultMarkupPct: number;
  markupAmountNet: number | null;
  suggestedNetTotal: number | null;
  currency: string | null;
  missingItems: Array<{
    technicalCode: string | null;
    description: string;
    reason: string;
  }>;
  nonVerifiedReasons: string[];
  reason: string | null;
  costSnapshot: TechnicalCostSnapshot | null;
};

export const DEFAULT_TECHNICAL_MARKUP_PCT = 100;

export function mapPreviewPricesToCatalogPrices(input: {
  profilePrices: readonly SupplierProfilePricePreview[];
  familyKey: string | null;
  providerKey: string | null;
  finishName: string | null;
}): CatalogPresentationPrice[] {
  const familyKey = input.familyKey?.trim() || "";
  if (!familyKey) return [];

  return input.profilePrices.flatMap((row): CatalogPresentationPrice[] => {
    if (input.providerKey && row.providerKey !== input.providerKey) {
      return [];
    }
    if (!isEffectiveSupplierProfilePrice(row)) {
      return [];
    }
    const finishResolution =
      row.finishPriceBasis === "finish_independent" ? "finish_independent" : "specific";
    return [
      {
        presentationId: row.presentationId,
        providerKey: row.providerKey,
        familyKeys: [familyKey],
        technicalCode: row.technicalCode,
        technicalName: row.profileName || row.technicalCode,
        supplierSku: row.supplierSku,
        presentationDescription: row.presentationDescription,
        finishResolution,
        finishCode: "",
        finishName:
          finishResolution === "finish_independent"
            ? null
            : row.priceSourceFinishName ?? input.finishName ?? null,
        commercialLengthMm: row.commercialLengthMm,
        purchaseUnit: row.purchaseUnit || "TIRA",
        netPrice: row.netPrice,
        currency: row.currency ?? "CLP",
        priceBasis: "commercial_presentation",
        priceListId: "",
        priceListRevision: row.priceListRevision ?? "",
        priceListPublishedOn: row.priceListPublishedOn ?? null,
        priceListValidUntil: row.priceListValidUntil ?? null,
        priceReferenceStatus: row.priceReferenceStatus,
        origin: row.priceSource === "workshop" ? "workshop" : undefined,
        workshopSupplierName: row.workshopSupplierName ?? null,
      },
    ];
  });
}

export function buildGuidedTechnicalCostSuggestion(input: {
  recipe: FabricationRecipeRecord | null;
  organizationId?: number | null;
  lineTemplateId?: string | number | null;
  lineName?: string | null;
  tipo?: string | null;
  sistema?: string | null;
  anchoMm: number | null;
  altoMm: number | null;
  cantidad: number;
  vidrio: string;
  colorHex: string;
  material: string;
  finishName: string | null;
  catalogLineKey: string | null;
  supplierFamilyKey: string | null;
  providerKey: string | null;
  profilePrices: readonly SupplierProfilePricePreview[];
  backedGlassCostNet?: number | null;
  markupPct?: number;
}): GuidedTechnicalCostSuggestion {
  const defaultMarkupPct =
    input.markupPct != null && Number.isFinite(input.markupPct) && input.markupPct >= 0
      ? input.markupPct
      : DEFAULT_TECHNICAL_MARKUP_PCT;

  const emptyUnavailable = (reason: string): GuidedTechnicalCostSuggestion => ({
    status: "unavailable",
    recipeStatus: input.recipe?.status ?? null,
    isRecipeValidated: input.recipe?.status === "validated",
    profilesCostNet: null,
    glassCostNet: null,
    accessoriesCostNet: null,
    knownNetTotal: null,
    usableBaseCostGroupNet: null,
    defaultMarkupPct,
    markupAmountNet: null,
    suggestedNetTotal: null,
    currency: null,
    missingItems: [],
    nonVerifiedReasons: [],
    reason,
    costSnapshot: null,
  });

  if (!input.recipe || !input.catalogLineKey || !input.supplierFamilyKey) {
    return emptyUnavailable("Selecciona una línea con receta técnica para calcular costos.");
  }

  if (
    !input.anchoMm ||
    !Number.isFinite(input.anchoMm) ||
    input.anchoMm <= 0 ||
    !input.altoMm ||
    !Number.isFinite(input.altoMm) ||
    input.altoMm <= 0
  ) {
    return emptyUnavailable("Ingresa ancho y alto válidos para calcular cortes y tiras.");
  }

  const cantidad = Number.isFinite(input.cantidad) && input.cantidad > 0 ? Math.round(input.cantidad) : 1;
  const previewItem: CotizacionWorkflowItem = {
    id: "guided-cost-preview",
    tipoItem: "componente",
    codigo: "V1",
    tipo: input.tipo?.trim() || "Ventana",
    lineaComercial: input.lineName?.trim() || input.recipe.lineName,
    vidrio: input.vidrio.trim(),
    nombre: input.lineName?.trim() || input.recipe.lineName,
    descripcion: "",
    ancho: Math.round(input.anchoMm),
    alto: Math.round(input.altoMm),
    cantidad,
    unidad: "unidad",
    areaM2: Math.round(((input.anchoMm / 1000) * (input.altoMm / 1000)) * 100) / 100,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 0,
    precioTotal: 0,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: input.lineTemplateId ? String(input.lineTemplateId) : "",
      catalogLineKey: input.catalogLineKey,
      material: input.material === "PVC" ? "PVC" : "Aluminio",
      colorHex: input.colorHex,
      sistema: input.sistema?.trim() || "",
      fabricacionTipologia: input.recipe.typology,
      fabricacionHojas: input.recipe.leavesCount,
      fabricacionVariante: input.recipe.variant,
      fabricationRecipeId: input.recipe.id,
      supplierProviderKey: input.providerKey ?? "",
    }),
    fabricacionSnapshot: null,
  };

  const despiece = resolveFabricacionDespieceForQuoteItem({
    item: previewItem,
    recipes: [input.recipe],
    organizationId: input.organizationId ?? null,
    lineTemplateId: input.lineTemplateId ?? null,
    lineCatalogKey: input.catalogLineKey,
    supplierFamilyKey: input.supplierFamilyKey,
  });

  if (despiece.estado !== "calculado" || !despiece.formal?.pautaBarras?.calculable) {
    return emptyUnavailable("La receta seleccionada aún no tiene pauta de corte calculable.");
  }

  const workSnapshot = construirFabricacionTrabajoSnapshot({
    items: [
      {
        id: previewItem.id,
        codigo: previewItem.codigo,
        nombre: previewItem.nombre,
        lineaComercial: previewItem.lineaComercial,
        snapshot: despiece.formal,
      },
    ],
  });

  if (!workSnapshot || workSnapshot.bars.length === 0) {
    return emptyUnavailable("No se generaron barras calculables para las medidas actuales.");
  }

  const availablePrices = mapPreviewPricesToCatalogPrices({
    profilePrices: input.profilePrices,
    familyKey: input.supplierFamilyKey,
    providerKey: input.providerKey,
    finishName: input.finishName,
  });

  const recipeAccessories = getRecipeAccessoriesFromItemSnapshot(
    despiece.formal,
    previewItem.codigo
  );

  const costSnapshot = buildPartialTechnicalCostSnapshot({
    workSnapshot,
    quoteItems: [
      {
        code: previewItem.codigo,
        color: input.finishName ?? input.material,
        colorHex: input.colorHex,
        finishName: input.finishName,
        catalogLineKey: input.catalogLineKey,
        supplierFamilyKey: input.supplierFamilyKey,
        supplierProviderKey: input.providerKey,
        glassDescription: input.vidrio.trim(),
        recipeAccessories,
      },
    ],
    availablePrices,
  });

  if (!costSnapshot) {
    return emptyUnavailable("Sin datos suficientes para valorizar materiales.");
  }

  const profilesCostRaw = costSnapshot.lines
    .filter((line) => line.bars > 0)
    .reduce((sum, line) => sum + line.lineNet, 0);
  const profilesCostNet = profilesCostRaw > 0 ? Math.round(profilesCostRaw) : null;

  const accessoriesCostRaw = costSnapshot.lines
    .filter((line) => line.bars === 0)
    .reduce((sum, line) => sum + line.lineNet, 0);
  const accessoriesCostNet = accessoriesCostRaw > 0 ? Math.round(accessoriesCostRaw) : null;

  const hasBackedGlassCost =
    input.backedGlassCostNet != null &&
    Number.isFinite(input.backedGlassCostNet) &&
    input.backedGlassCostNet > 0;
  const glassCostNet = hasBackedGlassCost ? Math.round(input.backedGlassCostNet!) : null;

  const missingItems = costSnapshot.missing.filter((entry) => {
    if (entry.technicalCode === null && hasBackedGlassCost) {
      return false;
    }
    return true;
  });

  const knownComponents = [profilesCostNet, accessoriesCostNet, glassCostNet].filter(
    (value): value is number => value != null && value > 0
  );
  const knownNetTotal =
    knownComponents.length > 0
      ? knownComponents.reduce((sum, value) => sum + value, 0)
      : null;

  const usedPresentationIds = new Set(
    costSnapshot.lines
      .map((line) => line.presentationId)
      .filter((id): id is string => Boolean(id))
  );
  const usedPreviewRows = input.profilePrices.filter((row) =>
    usedPresentationIds.has(row.presentationId)
  );
  const hasHistoricalReferenceOnly =
    costSnapshot.lines.some(
      (line) =>
        line.priceReferenceStatus === "historical_reference" &&
        line.effectivePriceSource === "reference"
    ) ||
    usedPreviewRows.some(
      (row) =>
        row.priceReferenceStatus === "historical_reference" &&
        (row.priceSource === "reference" || row.priceSource == null)
    );
  const hasNotYetValidPrice =
    costSnapshot.lines.some((line) => line.priceReferenceStatus === "not_yet_valid") ||
    usedPreviewRows.some((row) => row.priceReferenceStatus === "not_yet_valid");
  const hasCommercialEstimateOnly =
    costSnapshot.totalCostClassification === "commercial_estimate" ||
    costSnapshot.lines.some(
      (line) => line.priceApplicationStatus === "base_reference_other_finish"
    );
  const distinctCurrencies = [
    ...new Set(costSnapshot.lines.map((line) => line.currency).filter(Boolean)),
  ];
  const hasMixedCurrencies = distinctCurrencies.length > 1;

  const isRecipeValidated = input.recipe.status === "validated";
  const nonVerifiedReasons: string[] = [];
  if (!isRecipeValidated) {
    nonVerifiedReasons.push(
      `Receta en estado ${input.recipe.status} sin validación física de taller.`
    );
  }
  if (hasHistoricalReferenceOnly) {
    nonVerifiedReasons.push(
      "Incluye referencia histórica de lista sin vigencia activa ni ajuste propio confirmado."
    );
  }
  if (hasNotYetValidPrice) {
    nonVerifiedReasons.push("Incluye lista de precios que aún no entra en vigencia.");
  }
  if (hasCommercialEstimateOnly) {
    nonVerifiedReasons.push(
      "Incluye estimación comercial desde otro acabado sin presentación física exacta."
    );
  }
  if (hasMixedCurrencies) {
    nonVerifiedReasons.push("Las presentaciones seleccionadas mezclan más de una moneda.");
  }

  const isRecipeConfirmedOrCalculable =
    isRecipeValidated &&
    costSnapshot.lines.length > 0 &&
    missingItems.length === 0 &&
    nonVerifiedReasons.length === 0 &&
    knownNetTotal != null &&
    knownNetTotal > 0;

  if (isRecipeConfirmedOrCalculable) {
    const usableBaseCostGroupNet = knownNetTotal;
    const markupAmountNet = Math.round((usableBaseCostGroupNet * defaultMarkupPct) / 100);
    const suggestedNetTotal = usableBaseCostGroupNet + markupAmountNet;
    return {
      status: "complete",
      recipeStatus: input.recipe.status,
      isRecipeValidated,
      profilesCostNet,
      glassCostNet,
      accessoriesCostNet,
      knownNetTotal,
      usableBaseCostGroupNet,
      defaultMarkupPct,
      markupAmountNet,
      suggestedNetTotal,
      currency: costSnapshot.currency,
      missingItems: [],
      nonVerifiedReasons: [],
      reason: null,
      costSnapshot,
    };
  }

  if (knownNetTotal != null && knownNetTotal > 0) {
    return {
      status: "partial",
      recipeStatus: input.recipe.status,
      isRecipeValidated,
      profilesCostNet,
      glassCostNet,
      accessoriesCostNet,
      knownNetTotal,
      usableBaseCostGroupNet: null,
      defaultMarkupPct,
      markupAmountNet: null,
      suggestedNetTotal: null,
      currency: costSnapshot.currency ?? "CLP",
      missingItems: missingItems.map(({ technicalCode, description, reason }) => ({
        technicalCode,
        description,
        reason,
      })),
      nonVerifiedReasons,
      reason: nonVerifiedReasons[0] ?? null,
      costSnapshot,
    };
  }

  return {
    status: "unavailable",
    recipeStatus: input.recipe.status,
    isRecipeValidated,
    profilesCostNet: null,
    glassCostNet,
    accessoriesCostNet: null,
    knownNetTotal: null,
    usableBaseCostGroupNet: null,
    defaultMarkupPct,
    markupAmountNet: null,
    suggestedNetTotal: null,
    currency: costSnapshot.currency ?? "CLP",
    missingItems: missingItems.map(({ technicalCode, description, reason }) => ({
      technicalCode,
      description,
      reason,
    })),
    nonVerifiedReasons,
    reason:
      nonVerifiedReasons[0] ??
      "Faltan precios de compra compatibles para valorizar esta configuración.",
    costSnapshot,
  };
}

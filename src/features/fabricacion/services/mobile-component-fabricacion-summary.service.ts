import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import {
  isSodalL25CatalogKey,
  resolveCotizacionItemSodalL25LineDisplayLabel,
  resolveEffectiveSodalL25CatalogKey,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import {
  resolveSodalL25QuoteConfig,
  inferSodalL25GlazingFromGlass,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import { resolveComponentFabricacionHojas } from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  formatSodalL25LegLabel,
  formatSodalL25ReinforcementLabel,
  formatSodalL25GlazingLabel,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function isWorkflowItemCommerciallyIncomplete(item: CotizacionWorkflowItem) {
  return !item.precioTotal || item.precioTotal === 0 || !item.ancho || !item.alto;
}

export type MobileComponentFabricacionStatus =
  | "incomplete"
  | "pending_l25"
  | "no_recipe"
  | "ready";

export type MobileComponentFabricacionSummary = {
  status: MobileComponentFabricacionStatus;
  statusLabel: string;
  contextualLineLabel: string | null;
  technicalBrief: string | null;
  canOpenPauta: boolean;
  canOpenDespiece: boolean;
  configRows: Array<{ label: string; value: string }>;
  materialRows: Array<{ label: string; value: string }>;
};

function buildTechnicalBrief(input: {
  leg?: string | null;
  reinforcement?: string | null;
  glazing?: string | null;
}): string | null {
  const parts = [
    input.glazing ? formatSodalL25GlazingLabel(input.glazing) : "",
    input.leg ? formatSodalL25LegLabel(input.leg) : "",
    input.reinforcement ? formatSodalL25ReinforcementLabel(input.reinforcement) : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function resolveMobileComponentFabricacionSummary(
  item: CotizacionWorkflowItem,
  options?: {
    recipes?: FabricationRecipeRecord[];
    organizationId?: number | null;
  }
): MobileComponentFabricacionSummary {
  const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
  const isFreeValue =
    item.tipoItem === "item_libre_con_valor" || meta.displayMode === "item_libre";

  if (isFreeValue) {
    return {
      status: "no_recipe",
      statusLabel: "Sin fabricación",
      contextualLineLabel: null,
      technicalBrief: null,
      canOpenPauta: false,
      canOpenDespiece: false,
      configRows: [],
      materialRows: [],
    };
  }

  if (isWorkflowItemCommerciallyIncomplete(item)) {
    return {
      status: "incomplete",
      statusLabel: "Completar datos",
      contextualLineLabel: null,
      technicalBrief: null,
      canOpenPauta: false,
      canOpenDespiece: false,
      configRows: [],
      materialRows: [],
    };
  }

  const catalogKey = resolveEffectiveSodalL25CatalogKey({
    catalogLineKey: meta.catalogLineKey,
    nombre: item.lineaComercial,
  });
  const isL25 = isSodalL25CatalogKey(catalogKey);
  const hojas = resolveComponentFabricacionHojas({
    sheetScheme: meta.sheetScheme,
    fabricacionHojas: meta.fabricacionHojas,
    hojasBase: meta.hojasBase,
    guidedVisualConfig: meta.guidedVisualConfig,
  });
  const contextualLineLabel = isL25
    ? resolveCotizacionItemSodalL25LineDisplayLabel({
        catalogLineKey: catalogKey,
        referencia: meta.referencia,
        lineaComercial: item.lineaComercial,
        fabricacionHojas: meta.fabricacionHojas,
        sheetScheme: meta.sheetScheme,
        hojasBase: meta.hojasBase,
        fabricacionGlazing: meta.fabricacionGlazing,
        fabricacionLeg: meta.fabricacionLeg,
        fabricacionReinforcement: meta.fabricacionReinforcement,
        fabricacionVariante: meta.fabricacionVariante,
      })
    : (item.lineaComercial?.trim() || meta.referencia?.trim() || null);

  const quoteRow = buildFabricationQuoteSummary([item], {
    recipes: options?.recipes,
    organizationId: options?.organizationId,
  }).items[0];

  const hasSnapshot = Boolean(item.fabricacionSnapshot || quoteRow);
  const glazing =
    meta.fabricacionGlazing ||
    inferSodalL25GlazingFromGlass({
      vidrio: item.vidrio,
      catalogEspesor: meta.catalogEspesor,
      catalogTerminacion: meta.catalogTerminacion,
    });

  const sodalConfig = isL25
    ? resolveSodalL25QuoteConfig({
        catalogKey,
        presentation: {
          fabricacionGlazing: meta.fabricacionGlazing || glazing,
          fabricacionLeg: meta.fabricacionLeg ?? "",
          fabricacionReinforcement: meta.fabricacionReinforcement ?? "",
          fabricacionVariante: meta.fabricacionVariante ?? "",
          fabricacionHojas: hojas,
          sheetScheme: meta.sheetScheme ?? "",
        },
        vidrio: item.vidrio,
        sheetScheme: meta.sheetScheme ?? "",
        fabricacionHojas: hojas,
      })
    : null;

  const technicalBrief = isL25
    ? buildTechnicalBrief({
        glazing,
        leg: meta.fabricacionLeg,
        reinforcement: meta.fabricacionReinforcement,
      })
    : null;

  const configRows: Array<{ label: string; value: string }> = [
    meta.sistema?.trim() ? { label: "Sistema", value: meta.sistema.trim() } : null,
    contextualLineLabel ? { label: "Línea", value: contextualLineLabel } : null,
    hojas ? { label: "Hojas", value: String(hojas) } : null,
    item.vidrio?.trim() ? { label: "Vidrio", value: item.vidrio.trim() } : null,
    meta.fabricacionLeg
      ? { label: "Pierna", value: formatSodalL25LegLabel(meta.fabricacionLeg) }
      : null,
    meta.fabricacionReinforcement
      ? {
          label: "Refuerzo",
          value: formatSodalL25ReinforcementLabel(meta.fabricacionReinforcement),
        }
      : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  const materialRows: Array<{ label: string; value: string }> = quoteRow
    ? [
        { label: "Vidrio", value: `${quoteRow.glassM2.toLocaleString("es-CL")} m²` },
        { label: "Perfiles", value: `${quoteRow.profilesMl.toLocaleString("es-CL")} ml` },
        {
          label: "Accesorios",
          value: `${quoteRow.accessoryUnits.toLocaleString("es-CL")} u`,
        },
        {
          label: "Barras",
          value: `${quoteRow.barCount} ${quoteRow.barCount === 1 ? "barra" : "barras"}`,
        },
      ]
    : [];

  if (isL25 && sodalConfig && !sodalConfig.complete) {
    return {
      status: "pending_l25",
      statusLabel: "Configuración pendiente",
      contextualLineLabel,
      technicalBrief,
      canOpenPauta: true,
      canOpenDespiece: false,
      configRows,
      materialRows: [],
    };
  }

  if (hasSnapshot && quoteRow) {
    return {
      status: "ready",
      statusLabel: "Fabricación lista",
      contextualLineLabel,
      technicalBrief,
      canOpenPauta: true,
      canOpenDespiece: true,
      configRows,
      materialRows,
    };
  }

  return {
    status: "no_recipe",
    statusLabel: isL25 ? "Sin pauta activa" : "Sin fabricación",
    contextualLineLabel,
    technicalBrief,
    canOpenPauta: isL25,
    canOpenDespiece: false,
    configRows,
    materialRows: [],
  };
}

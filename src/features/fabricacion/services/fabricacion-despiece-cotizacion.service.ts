/**
 * Fuente única de despiece para cotización:
 * receta de la línea → motor Paso 3 → snapshot formal → vista legacy opcional.
 * No usa el preview genérico Marco/Hoja/Junquillo.
 */

import { inferirTipologiaFabricacionPieza } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import { resolverRecetaFabricacionCompatible } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

export type FabricacionDespieceCotizacionEstado =
  | "sin_medidas"
  | "sin_linea"
  | "sin_receta"
  | "multiples_recetas"
  | "calculado";

export type FabricacionDespieceCotizacionResult = {
  estado: FabricacionDespieceCotizacionEstado;
  formal: FabricacionCotizacionSnapshot | null;
  cubication: CotizacionItemCubicationSnapshot | null;
  recipe: FabricationRecipeRecord | null;
  barsAvailable: boolean;
  preliminary: boolean;
  message: string | null;
};

function normalizeLineTemplateId(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function snapshotMatchesItem(
  snapshot: FabricacionCotizacionSnapshot,
  input: {
    lineTemplateId: number;
    ancho: number;
    alto: number;
    cantidad: number;
  }
) {
  return (
    snapshot.lineTemplateId === input.lineTemplateId &&
    snapshot.input.anchoTotalMm === input.ancho &&
    snapshot.input.altoTotalMm === input.alto &&
    snapshot.input.cantidad === input.cantidad
  );
}

function resolveLeavesCount(
  item: CotizacionWorkflowItem,
  presentationHojas: number | null,
  fallback: number | null
) {
  if (presentationHojas && presentationHojas > 0) return presentationHojas;
  if (fallback && fallback > 0) return fallback;
  const source = `${item.tipo} ${item.nombre} ${item.descripcion}`.toLowerCase();
  const match = source.match(/(\d+)\s*(?:hoja|hojas|h)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** El Constructor guarda sistema/config como "Personalizado"; no es apertura de receta. */
export function resolveAperturaForRecipeMatch(
  fabricacionApertura: string | null | undefined,
  sistema: string | null | undefined
) {
  const candidates = [fabricacionApertura, sistema];
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim();
    if (!value) continue;
    const normalized = value.toLowerCase();
    if (normalized === "personalizado" || normalized === "personalizada") {
      continue;
    }
    return value;
  }
  return null;
}

export function resolveFabricacionDespieceForQuoteItem(input: {
  item: CotizacionWorkflowItem;
  recipes: FabricationRecipeRecord[];
  organizationId: number | null;
}): FabricacionDespieceCotizacionResult {
  const presentation = decodeCotizacionItemPresentationMeta(input.item.observaciones);
  const lineTemplateId = normalizeLineTemplateId(presentation.lineTemplateId);
  const ancho = Math.round(input.item.ancho ?? 0);
  const alto = Math.round(input.item.alto ?? 0);
  const cantidad = Math.max(1, Math.round(input.item.cantidad || 1));

  if (ancho <= 0 || alto <= 0) {
    return {
      estado: "sin_medidas",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Indica ancho y alto para calcular el despiece.",
    };
  }

  if (!lineTemplateId) {
    return {
      estado: "sin_linea",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Fabricación no configurada para esta línea.",
    };
  }

  if (
    input.item.fabricacionSnapshot &&
    snapshotMatchesItem(input.item.fabricacionSnapshot, {
      lineTemplateId,
      ancho,
      alto,
      cantidad,
    })
  ) {
    const formal = input.item.fabricacionSnapshot;
    const barsAvailable = Boolean(
      formal.pautaBarras?.calculable && (formal.pautaBarras.barras?.length ?? 0) > 0
    );
    return {
      estado: "calculado",
      formal,
      cubication: fabricacionSnapshotToLegacyCubicationSnapshot(formal),
      recipe: null,
      barsAvailable,
      preliminary: formal.recipeStatus !== "validated",
      message: barsAvailable
        ? null
        : "Agrega largos comerciales para calcular barras.",
    };
  }

  const tipologia =
    presentation.fabricacionTipologia ||
    inferirTipologiaFabricacionPieza({
      tipo: input.item.tipo,
      nombre: input.item.nombre,
      descripcion: input.item.descripcion,
      sistema: presentation.sistema,
    });

  if (!tipologia) {
    return {
      estado: "sin_receta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Fabricación no configurada para esta línea.",
    };
  }

  const apertura = resolveAperturaForRecipeMatch(
    presentation.fabricacionApertura,
    presentation.sistema
  );
  const hojas = resolveLeavesCount(
    input.item,
    presentation.fabricacionHojas,
    presentation.hojasBase
  );
  const resolution = resolverRecetaFabricacionCompatible(input.recipes, {
    organizationId: input.organizationId,
    lineTemplateId,
    tipologia,
    hojas,
    modulos: presentation.fabricacionModulos,
    apertura,
    herraje: presentation.fabricacionHerraje || null,
    variante: presentation.fabricacionVariante || null,
    preferredRecipeId: presentation.fabricationRecipeId || null,
    allowNonValidatedRecipeId: presentation.fabricationRecipeId || null,
    allowPreliminaryNonValidated: true,
  });


  if (resolution.estado === "multiples_recetas") {
    return {
      estado: "multiples_recetas",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Hay varias recetas compatibles; elige variante o herraje.",
    };
  }

  if (
    resolution.estado !== "receta_unica" &&
    resolution.estado !== "receta_no_validada"
  ) {
    return {
      estado: "sin_receta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
      preliminary: false,
      message: "Fabricación no configurada para esta línea.",
    };
  }

  const recipe = resolution.receta;
  const formal = construirSnapshotFabricacionCotizacion({
    recipe,
    entrada: {
      anchoTotalMm: ancho,
      altoTotalMm: alto,
      cantidad,
      hojas: recipe.definition.identidad.hojas,
      modulos: recipe.definition.identidad.modulos,
      variante: recipe.definition.identidad.variante,
    },
  });
  const barsAvailable = Boolean(
    formal.pautaBarras?.calculable && (formal.pautaBarras.barras?.length ?? 0) > 0
  );
  const preliminary =
    resolution.estado === "receta_no_validada" || recipe.status !== "validated";

  return {
    estado: "calculado",
    formal,
    cubication: fabricacionSnapshotToLegacyCubicationSnapshot(formal),
    recipe,
    barsAvailable,
    preliminary,
    message: barsAvailable
      ? preliminary
        ? "Cálculo preliminar: la receta aún no está validada."
        : null
      : "Agrega largos comerciales para calcular barras.",
  };
}

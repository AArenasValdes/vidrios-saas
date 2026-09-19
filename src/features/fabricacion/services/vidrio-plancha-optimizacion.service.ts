/**
 * Optimización de consumo de plancha de vidrio (V1).
 * Calcula superficie requerida, merma y fracción comercial cobrable.
 * No implementa nesting 2D ni distribución de cortes en plancha.
 */

import {
  getLineTemplateGlassMetadata,
  hasLineTemplateGlassSheetConfig,
  type CotizacionLineTemplate,
  type CotizacionLineTemplateGlassPiece,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { FabricacionVidrioResultado } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { FabricacionDespieceCotizacionResult } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";

export type VidrioDespiecePieza = {
  key: string;
  vidrioLabel: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  totalM2: number;
  pieceCodes: string[];
};

export type VidrioPlanchaOptimizacion = {
  vidrioLabel: string;
  glassLineTemplateId: string | null;
  sheetFormatLabel: string;
  sheetAreaM2: number;
  requiredM2: number;
  mermaPct: number;
  requiredWithMermaM2: number;
  rawSheetsNeeded: number;
  billableSheets: number;
  billableFractionLabel: string;
  sheetUtilizationPct: number;
  wastePct: number;
  estimatedSheetCost: number | null;
  pieces: VidrioDespiecePieza[];
};

export type VidrioDespieceComponente = {
  itemId: string;
  codigo: string;
  vidrioLabel: string;
  pieces: CotizacionLineTemplateGlassPiece[];
  totalM2: number;
  optimization: VidrioPlanchaOptimizacion | null;
};

function normalizeComparableGlassLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function roundM2(value: number) {
  return Math.round(value * 10000) / 10000;
}

function roundPct(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatGlassSheetDimensions(widthMm: number, heightMm: number) {
  return `${Math.round(widthMm).toLocaleString("es-CL")} × ${Math.round(heightMm).toLocaleString("es-CL")} mm`;
}

export function formatBillableSheetFraction(sheets: number): string {
  const quarters = Math.round(sheets * 4);
  if (quarters <= 0) return "—";
  if (quarters % 4 === 0) {
    const whole = quarters / 4;
    return whole === 1 ? "1 plancha" : `${whole} planchas`;
  }

  const fractionLabels: Record<number, string> = {
    1: "¼",
    2: "½",
    3: "¾",
  };
  const whole = Math.floor(quarters / 4);
  const remainder = quarters % 4;
  const fraction = fractionLabels[remainder] ?? `${remainder}/4`;

  if (whole <= 0) {
    return `${fraction} plancha`;
  }
  return `${whole} ${fraction} plancha`;
}

function isGlassOnlyQuoteItem(item: Pick<CotizacionWorkflowItem, "tipo">) {
  return item.tipo.trim().toLowerCase() === "vidrio / cristal";
}

export function resolveGlassLineTemplateById(
  lineTemplateId: string | null | undefined,
  lineTemplates: readonly CotizacionLineTemplate[]
): CotizacionLineTemplate | null {
  const normalizedId = lineTemplateId?.trim();
  if (!normalizedId) return null;

  return (
    lineTemplates.find(
      (template) =>
        String(template.id) === normalizedId &&
        template.categoria === "vidrio" &&
        !template.eliminadoEn
    ) ?? null
  );
}

/** Resuelve catálogo cristal por ID persistido. En ventanas/puertas no infiere por nombre. */
export function resolveGlassLineTemplateForQuoteItem(
  item: CotizacionWorkflowItem,
  lineTemplates: readonly CotizacionLineTemplate[]
): CotizacionLineTemplate | null {
  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);

  if (isGlassOnlyQuoteItem(item)) {
    return resolveGlassLineTemplateById(presentation.lineTemplateId, lineTemplates);
  }

  return resolveGlassLineTemplateById(presentation.vidrioLineTemplateId, lineTemplates);
}

function resolveGlassCatalogGroupKey(
  item: CotizacionWorkflowItem,
  lineTemplates: readonly CotizacionLineTemplate[]
): string {
  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
  const glassTemplate = resolveGlassLineTemplateForQuoteItem(item, lineTemplates);
  if (glassTemplate) {
    return `id:${String(glassTemplate.id)}`;
  }

  if (isGlassOnlyQuoteItem(item) && presentation.lineTemplateId.trim()) {
    return `lti:${presentation.lineTemplateId.trim()}`;
  }

  if (presentation.vidrioLineTemplateId.trim()) {
    return `vlti:${presentation.vidrioLineTemplateId.trim()}`;
  }

  return `label:${normalizeComparableGlassLabel(item.vidrio?.trim() || "Vidrio")}`;
}

function vidrioResultadoToGlassPiece(vidrio: FabricacionVidrioResultado): CotizacionLineTemplateGlassPiece {
  return {
    widthMm: vidrio.anchoMm,
    heightMm: vidrio.altoMm,
    quantity: vidrio.cantidadPiezas,
    totalM2: vidrio.totalM2,
  };
}

export function extractGlassPiecesFromFabricacionSnapshot(
  snapshot: FabricacionCotizacionSnapshot | null | undefined
): CotizacionLineTemplateGlassPiece[] {
  if (!snapshot) return [];
  if (snapshot.vidrios.length > 0) {
    return snapshot.vidrios.map(vidrioResultadoToGlassPiece);
  }
  return [];
}

export function extractGlassPiecesForQuoteItem(input: {
  item: CotizacionWorkflowItem;
  resolution?: FabricacionDespieceCotizacionResult | null;
}): CotizacionLineTemplateGlassPiece[] {
  const formal = input.resolution?.formal ?? input.item.fabricacionSnapshot ?? null;
  const fromFormal = extractGlassPiecesFromFabricacionSnapshot(formal);
  if (fromFormal.length > 0) {
    return fromFormal;
  }

  const legacyGlass = input.resolution?.cubication?.glass ?? null;
  if (legacyGlass) {
    return [legacyGlass];
  }

  return [];
}

export function consolidateVidrioDespiecePiezas(
  entries: Array<{
    vidrioLabel: string;
    codigo: string;
    pieces: CotizacionLineTemplateGlassPiece[];
  }>
): VidrioDespiecePieza[] {
  const map = new Map<string, VidrioDespiecePieza>();

  entries.forEach(({ vidrioLabel, codigo, pieces }) => {
    pieces.forEach((piece) => {
      const key = [
        normalizeComparableGlassLabel(vidrioLabel),
        piece.widthMm,
        piece.heightMm,
      ].join("|");
      const existing = map.get(key);
      if (existing) {
        existing.quantity += piece.quantity;
        existing.totalM2 += piece.totalM2;
        if (!existing.pieceCodes.includes(codigo)) {
          existing.pieceCodes.push(codigo);
        }
        return;
      }

      map.set(key, {
        key,
        vidrioLabel,
        widthMm: piece.widthMm,
        heightMm: piece.heightMm,
        quantity: piece.quantity,
        totalM2: piece.totalM2,
        pieceCodes: [codigo],
      });
    });
  });

  return Array.from(map.values()).sort(
    (left, right) =>
      right.totalM2 - left.totalM2 ||
      right.quantity - left.quantity ||
      left.vidrioLabel.localeCompare(right.vidrioLabel, "es")
  );
}

export function calculateGlassSheetOptimization(input: {
  vidrioLabel: string;
  entries: Array<{ codigo: string; pieces: CotizacionLineTemplateGlassPiece[] }>;
  glassLineTemplate: CotizacionLineTemplate | null;
}): VidrioPlanchaOptimizacion | null {
  const { glassLineTemplate, entries, vidrioLabel } = input;
  const allPieces = entries.flatMap((entry) => entry.pieces);
  if (allPieces.length === 0) return null;
  if (!glassLineTemplate || !hasLineTemplateGlassSheetConfig(glassLineTemplate.catalogMetadata)) {
    return null;
  }

  const sheetMeta = getLineTemplateGlassMetadata(glassLineTemplate.catalogMetadata);
  const planchaAnchoMm = sheetMeta.planchaAnchoMm;
  const planchaAltoMm = sheetMeta.planchaAltoMm;
  if (planchaAnchoMm == null || planchaAltoMm == null) {
    return null;
  }

  const sheetAreaM2 = roundM2((planchaAnchoMm * planchaAltoMm) / 1_000_000);
  if (sheetAreaM2 <= 0) return null;

  const requiredM2 = roundM2(allPieces.reduce((sum, piece) => sum + piece.totalM2, 0));
  const mermaPct = Math.max(0, glassLineTemplate.mermaPct ?? 0);
  const requiredWithMermaM2 = roundM2(requiredM2 * (1 + mermaPct / 100));
  const rawSheetsNeeded = requiredWithMermaM2 / sheetAreaM2;
  const billableSheets = Math.ceil(rawSheetsNeeded * 4) / 4;
  const billedAreaM2 = roundM2(billableSheets * sheetAreaM2);
  const sheetUtilizationPct =
    billedAreaM2 > 0 ? roundPct((requiredM2 / billedAreaM2) * 100) : 0;
  const wastePct = roundPct(Math.max(0, 100 - sheetUtilizationPct));
  const estimatedSheetCost =
    glassLineTemplate.costoBase > 0
      ? Math.round(billableSheets * glassLineTemplate.costoBase)
      : null;

  const consolidatedPieces = consolidateVidrioDespiecePiezas(
    entries.map((entry) => ({
      vidrioLabel,
      codigo: entry.codigo,
      pieces: entry.pieces,
    }))
  );

  return {
    vidrioLabel,
    glassLineTemplateId: String(glassLineTemplate.id),
    sheetFormatLabel: formatGlassSheetDimensions(planchaAnchoMm, planchaAltoMm),
    sheetAreaM2,
    requiredM2,
    mermaPct,
    requiredWithMermaM2,
    rawSheetsNeeded: roundM2(rawSheetsNeeded),
    billableSheets,
    billableFractionLabel: formatBillableSheetFraction(billableSheets),
    sheetUtilizationPct,
    wastePct,
    estimatedSheetCost,
    pieces: consolidatedPieces,
  };
}

export function buildVidrioDespieceForQuoteItem(input: {
  item: CotizacionWorkflowItem;
  resolution?: FabricacionDespieceCotizacionResult | null;
  lineTemplates: readonly CotizacionLineTemplate[];
}): VidrioDespieceComponente | null {
  const pieces = extractGlassPiecesForQuoteItem({
    item: input.item,
    resolution: input.resolution,
  });
  if (pieces.length === 0) return null;

  const vidrioLabel = input.item.vidrio?.trim() || "Vidrio";
  const glassLineTemplate = resolveGlassLineTemplateForQuoteItem(
    input.item,
    input.lineTemplates
  );
  const optimization = calculateGlassSheetOptimization({
    vidrioLabel,
    entries: [{ codigo: input.item.codigo, pieces }],
    glassLineTemplate,
  });

  return {
    itemId: input.item.id,
    codigo: input.item.codigo,
    vidrioLabel,
    pieces,
    totalM2: roundM2(pieces.reduce((sum, piece) => sum + piece.totalM2, 0)),
    optimization,
  };
}

export function buildConsolidatedGlassSheetOptimizations(input: {
  items: readonly CotizacionWorkflowItem[];
  resolutions: Map<string, FabricacionDespieceCotizacionResult>;
  lineTemplates: readonly CotizacionLineTemplate[];
}): VidrioPlanchaOptimizacion[] {
  const demandByGlass = new Map<
    string,
    {
      vidrioLabel: string;
      entries: Array<{ codigo: string; pieces: CotizacionLineTemplateGlassPiece[] }>;
      glassLineTemplate: CotizacionLineTemplate | null;
    }
  >();

  input.items.forEach((item) => {
    const pieces = extractGlassPiecesForQuoteItem({
      item,
      resolution: input.resolutions.get(item.id) ?? null,
    });
    if (pieces.length === 0) return;

    const vidrioLabel = item.vidrio?.trim() || "Vidrio";
    const key = resolveGlassCatalogGroupKey(item, input.lineTemplates);
    const glassLineTemplate = resolveGlassLineTemplateForQuoteItem(item, input.lineTemplates);
    const existing = demandByGlass.get(key);
    if (existing) {
      existing.entries.push({ codigo: item.codigo, pieces });
      return;
    }

    demandByGlass.set(key, {
      vidrioLabel,
      entries: [{ codigo: item.codigo, pieces }],
      glassLineTemplate,
    });
  });

  return Array.from(demandByGlass.values())
    .map(({ vidrioLabel, entries, glassLineTemplate }) =>
      calculateGlassSheetOptimization({
        vidrioLabel,
        entries,
        glassLineTemplate,
      })
    )
    .filter((entry): entry is VidrioPlanchaOptimizacion => Boolean(entry));
}

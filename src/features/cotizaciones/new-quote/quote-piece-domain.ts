/**
 * Contrato de dominio compartido para una pieza de cotización.
 *
 * Cotización rápida y Cotización guiada leen/escriben el mismo
 * `CotizacionWorkflowItem` en `draft.items`. Este módulo no inventa
 * un segundo estado: deriva vistas (comercial / técnico / resumen)
 * desde el item + metadata ya persistida ([gvc:] / [cub:]).
 */

import {
  getLineTemplateCubicationConfig,
  getLineTemplateCuttingRules,
  type CotizacionLineTemplate,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  cubicationSnapshotMatchesDimensions,
  type CotizacionItemCubicationSnapshot,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

/** Modos de trabajo desktop (Paso 2). Misma pieza; distinta presentación. */
export type QuoteDesktopWorkspaceMode = "rapida" | "guiada";

export const QUOTE_DESKTOP_WORKSPACE_MODE_STORAGE_KEY =
  "ventora:quote-desktop-workspace-mode" as const;

export const QUOTE_DESKTOP_WORKSPACE_MODE_LABELS: Record<
  QuoteDesktopWorkspaceMode,
  string
> = {
  rapida: "Cotización rápida",
  guiada: "Cotización guiada",
};

export function isQuoteDesktopWorkspaceMode(
  value: unknown
): value is QuoteDesktopWorkspaceMode {
  return value === "rapida" || value === "guiada";
}

export function readQuoteDesktopWorkspaceModePreference(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null
): QuoteDesktopWorkspaceMode {
  if (!storage) return "rapida";
  try {
    const raw = storage.getItem(QUOTE_DESKTOP_WORKSPACE_MODE_STORAGE_KEY);
    return isQuoteDesktopWorkspaceMode(raw) ? raw : "rapida";
  } catch {
    return "rapida";
  }
}

export function writeQuoteDesktopWorkspaceModePreference(
  mode: QuoteDesktopWorkspaceMode,
  storage: Pick<Storage, "setItem"> | null | undefined = typeof window !== "undefined"
    ? window.localStorage
    : null
) {
  if (!storage) return;
  try {
    storage.setItem(QUOTE_DESKTOP_WORKSPACE_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore quota / private mode
  }
}

/** Completitud comercial (bloquea o no el resumen según reglas actuales). */
export type PieceCommercialStatus =
  | "falta_nombre"
  | "falta_medidas"
  | "falta_cantidad"
  | "falta_linea"
  | "falta_vidrio"
  | "falta_precio"
  | "completa";

export const PIECE_COMMERCIAL_STATUS_LABELS: Record<PieceCommercialStatus, string> = {
  falta_nombre: "Falta nombre",
  falta_medidas: "Faltan medidas",
  falta_cantidad: "Falta cantidad",
  falta_linea: "Falta línea",
  falta_vidrio: "Falta vidrio",
  falta_precio: "Falta precio",
  completa: "Completa",
};

/**
 * Estado técnico de cubicación/despiece de la pieza.
 * Independiente de la completitud comercial.
 */
export type PieceTechnicalStatus =
  | "sin_configurar"
  | "sin_reglas"
  | "referencial"
  | "configurado"
  | "requiere_revision";

export const PIECE_TECHNICAL_STATUS_LABELS: Record<PieceTechnicalStatus, string> = {
  sin_configurar: "Sin configurar",
  sin_reglas: "Sin reglas técnicas",
  referencial: "Referencial",
  configurado: "Configurado",
  requiere_revision: "Requiere revisión",
};

export type PieceTechnicalSummary = {
  areaVanoM2: number | null;
  areaVidrioM2: number | null;
  mlPerfiles: number;
  barras: number;
  cortes: number;
  accesorios: number;
  sobranteMm: number;
  source: CotizacionItemCubicationSnapshot["source"] | null;
  hasSnapshot: boolean;
};

export type PieceDomainView = {
  itemId: string;
  commercialStatus: PieceCommercialStatus;
  commercialLabel: string;
  isCommerciallyComplete: boolean;
  technicalStatus: PieceTechnicalStatus;
  technicalLabel: string;
  technicalSummary: PieceTechnicalSummary;
  cubicationSnapshot: CotizacionItemCubicationSnapshot | null;
  lineTemplateId: string;
  guidedVisualConfigPresent: boolean;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function getPiecePresentationMeta(item: CotizacionWorkflowItem) {
  return decodeCotizacionItemPresentationMeta(item.observaciones);
}

/**
 * Reglas duras actuales para avanzar al resumen.
 * No exigen línea ni vidrio (compatibles con presets del cuaderno).
 */
export function isPieceCommerciallyComplete(
  item: CotizacionWorkflowItem,
  pricingMode: QuotePricingMode
) {
  if (item.tipoItem === "item_libre_con_valor") {
    return Boolean(item.nombre.trim()) && (pricingMode !== "por_item" || item.precioUnitario > 0);
  }
  return (
    Boolean(item.nombre.trim()) &&
    Boolean(item.ancho) &&
    Boolean(item.alto) &&
    item.cantidad >= 1 &&
    (pricingMode !== "por_item" || item.precioUnitario > 0)
  );
}

/**
 * Badge comercial visible. Puede mostrar Falta línea / Falta vidrio
 * aunque el avance al resumen ya esté permitido (reglas actuales).
 */
export function derivePieceCommercialStatus(
  item: CotizacionWorkflowItem,
  pricingMode: QuotePricingMode
): PieceCommercialStatus {
  if (item.tipoItem === "item_libre_con_valor") {
    if (!item.nombre.trim()) return "falta_nombre";
    if (pricingMode === "por_item" && item.precioUnitario <= 0) return "falta_precio";
    return "completa";
  }

  if (!item.nombre.trim()) return "falta_nombre";
  if (!item.ancho || !item.alto) return "falta_medidas";
  if (item.cantidad < 1) return "falta_cantidad";
  if (pricingMode === "por_item" && item.precioUnitario <= 0) return "falta_precio";

  const meta = getPiecePresentationMeta(item);
  if (!meta.lineTemplateId && !item.lineaComercial.trim()) return "falta_linea";
  if (!item.vidrio.trim()) return "falta_vidrio";
  return "completa";
}

export function derivePieceTechnicalSummary(
  item: CotizacionWorkflowItem
): PieceTechnicalSummary {
  const meta = getPiecePresentationMeta(item);
  const snapshot = meta.cubicationSnapshot;
  const areaVanoM2 =
    item.areaM2 ??
    (item.ancho && item.alto
      ? round2((item.ancho * item.alto * Math.max(1, item.cantidad)) / 1_000_000)
      : null);

  if (!snapshot) {
    return {
      areaVanoM2,
      areaVidrioM2: null,
      mlPerfiles: 0,
      barras: 0,
      cortes: 0,
      accesorios: 0,
      sobranteMm: 0,
      source: null,
      hasSnapshot: false,
    };
  }

  return {
    areaVanoM2,
    areaVidrioM2: snapshot.glass?.totalM2 ?? null,
    mlPerfiles: round2((snapshot.totalProfilesLinealMm || 0) / 1000),
    barras: snapshot.bars.length,
    cortes: snapshot.cuts.reduce(
      (sum, cut) => sum + Math.max(1, Math.round(cut.quantity)),
      0
    ),
    accesorios: snapshot.accessoryUnits || 0,
    sobranteMm: Math.max(0, Math.round(snapshot.totalWasteMm || 0)),
    source: snapshot.source,
    hasSnapshot: true,
  };
}

export function derivePieceTechnicalStatus(
  item: CotizacionWorkflowItem,
  lineTemplate: CotizacionLineTemplate | null | undefined = null
): PieceTechnicalStatus {
  if (item.tipoItem === "item_libre_con_valor") return "sin_reglas";

  const meta = getPiecePresentationMeta(item);
  const snapshot = meta.cubicationSnapshot;
  const widthMm = item.ancho ?? 0;
  const heightMm = item.alto ?? 0;
  const quantity = Math.max(1, item.cantidad);
  const lineTemplateId = meta.lineTemplateId || (lineTemplate ? String(lineTemplate.id) : "");

  const template = lineTemplate ?? null;
  const rules = template ? getLineTemplateCuttingRules(template.catalogMetadata) : null;
  const config = template ? getLineTemplateCubicationConfig(template.catalogMetadata) : null;
  const cuttingEnabled = Boolean(rules?.enabled);
  const isPersonalizado =
    meta.isCustomScheme ||
    meta.sistema.trim().toLocaleLowerCase("es") === "personalizado" ||
    meta.configuracion.trim().toLocaleLowerCase("es") === "personalizado";

  if (snapshot) {
    const dimsMatch = cubicationSnapshotMatchesDimensions(snapshot, {
      lineTemplateId: lineTemplateId || snapshot.lineTemplateId,
      widthMm,
      heightMm,
      quantity,
    });
    if (!dimsMatch) return "requiere_revision";
    if (snapshot.status === "revisar_cambios") return "requiere_revision";
    if (snapshot.source === "manual") return "configurado";
    if (snapshot.status === "validada") return "configurado";
    return "referencial";
  }

  if (isPersonalizado) return "sin_configurar";
  if (!lineTemplateId && !template) return "sin_configurar";
  if (template && !cuttingEnabled) return "sin_reglas";
  if (template && config?.status === "sin_configurar") return "sin_configurar";
  if (template && cuttingEnabled) return "sin_configurar";
  return "sin_configurar";
}

export function buildPieceDomainView(
  item: CotizacionWorkflowItem,
  pricingMode: QuotePricingMode,
  lineTemplate: CotizacionLineTemplate | null | undefined = null
): PieceDomainView {
  const meta = getPiecePresentationMeta(item);
  const commercialStatus = derivePieceCommercialStatus(item, pricingMode);
  const technicalStatus = derivePieceTechnicalStatus(item, lineTemplate);

  return {
    itemId: item.id,
    commercialStatus,
    commercialLabel: PIECE_COMMERCIAL_STATUS_LABELS[commercialStatus],
    isCommerciallyComplete: isPieceCommerciallyComplete(item, pricingMode),
    technicalStatus,
    technicalLabel: PIECE_TECHNICAL_STATUS_LABELS[technicalStatus],
    technicalSummary: derivePieceTechnicalSummary(item),
    cubicationSnapshot: meta.cubicationSnapshot,
    lineTemplateId: meta.lineTemplateId,
    guidedVisualConfigPresent: Boolean(meta.guidedVisualConfig),
  };
}

export function formatPieceTechnicalSummaryLines(summary: PieceTechnicalSummary): string[] {
  const lines: string[] = [];
  if (summary.areaVanoM2 != null) {
    lines.push(`Área: ${summary.areaVanoM2.toLocaleString("es-CL", { maximumFractionDigits: 2 })} m²`);
  }
  if (summary.hasSnapshot) {
    lines.push(
      `Perfiles: ${summary.mlPerfiles.toLocaleString("es-CL", { maximumFractionDigits: 2 })} ml`
    );
    lines.push(`Barras: ${summary.barras}`);
    lines.push(`Cortes: ${summary.cortes}`);
    lines.push(`Accesorios: ${summary.accesorios}`);
    if (summary.sobranteMm > 0) {
      lines.push(`Sobra: ${summary.sobranteMm.toLocaleString("es-CL")} mm`);
    }
  }
  return lines;
}

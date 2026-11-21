import type {
  GlassTechnicalCategory,
  GlassTechnicalSpec,
} from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import type { FabricacionVidrioResultado } from "@/features/fabricacion/types/fabricacion-domain";
import type { SupplierPriceListReferenceStatus } from "./price-list-selection.service";

export type GlassSupplierCutPresentation = {
  presentationId: string;
  providerKey: string;
  providerLabel?: string | null;
  organizationId?: number | null;
  glassProductId?: string | null;
  category: GlassTechnicalCategory;
  thicknessMm: number | null;
  glassDescription?: string | null;
  purchaseMode: "supplier_cut";
  purchaseUnit: "M2";
  netPricePerM2: number;
  /** Minimum billable area per physical pane ONLY when documented by supplier. */
  minBillableM2PerPane?: number | null;
  currency: string;
  priceReferenceStatus?: SupplierPriceListReferenceStatus;
  validFrom?: string | null;
  validUntil?: string | null;
  origin?: "supplier" | "workshop";
};

export type GlassSupplierCutPaneValuation = {
  vidrioId: string;
  nombre: string;
  anchoMm: number;
  altoMm: number;
  cantidadPiezas: number;
  rawAreaM2PerPane: number;
  billableAreaM2PerPane: number;
  minApplied: boolean;
  totalBillableM2: number;
  lineNet: number;
};

export type GlassSupplierCutResolution =
  | {
      status: "priced";
      presentationId: string;
      providerKey: string;
      currency: string;
      netPricePerM2: number;
      minBillableM2PerPane: number | null;
      totalRawM2: number;
      totalBillableM2: number;
      totalNetCost: number;
      panes: GlassSupplierCutPaneValuation[];
    }
  | {
      status: "missing" | "ambiguous" | "incompatible";
      reason: string;
      totalNetCost: null;
      currency: null;
      panes: [];
    };

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}

function normalizeLabel(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-CL");
}

function parseCategoryFromText(text: string): GlassTechnicalCategory {
  const normalized = normalizeLabel(text);
  if (normalized.includes("dvh") || normalized.includes("termopanel")) return "dvh";
  if (normalized.includes("laminad")) return "laminado";
  if (normalized.includes("templad")) return "templado";
  if (normalized.includes("espejo")) return "espejo";
  if (normalized.includes("monolit") || normalized.includes("incoloro")) return "monolitico";
  return "pendiente";
}

function parseThicknessFromText(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  if (!match) return null;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeIsoDateOnly(value: string) {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : trimmed;
}

function isWithinValidityWindow(
  presentation: Pick<GlassSupplierCutPresentation, "validFrom" | "validUntil" | "priceReferenceStatus" | "origin">,
  asOfDate: string
): { valid: boolean; reason?: string } {
  const normalizedAsOf = normalizeIsoDateOnly(asOfDate);
  const normalizedValidFrom = presentation.validFrom ? normalizeIsoDateOnly(presentation.validFrom) : null;
  const normalizedValidUntil = presentation.validUntil ? normalizeIsoDateOnly(presentation.validUntil) : null;
  if (presentation.priceReferenceStatus === "not_yet_valid") {
    return { valid: false, reason: "La lista de precios del vidrio aún no entra en vigencia." };
  }
  if (presentation.priceReferenceStatus === "historical_reference" && presentation.origin !== "workshop") {
    return { valid: false, reason: "El precio del vidrio proviene de una referencia histórica sin vigencia activa." };
  }
  if (normalizedValidFrom && normalizedAsOf < normalizedValidFrom) {
    return { valid: false, reason: "La presentación de compra de vidrio aún no inicia vigencia." };
  }
  if (normalizedValidUntil && normalizedAsOf > normalizedValidUntil) {
    return { valid: false, reason: "La vigencia comercial del precio de compra de vidrio expiró." };
  }
  return { valid: true };
}

/**
 * Pure supplier-cut glass valuation using physical panes calculated by despiece.
 * Never consumes exterior window commercial area or selling price (`precio_m2_sugerido`).
 */
export function resolveGlassSupplierCutCost(input: {
  panes: readonly FabricacionVidrioResultado[];
  glassDescription: string;
  glassTechnicalSpec?: GlassTechnicalSpec | null;
  organizationId?: number | null;
  providerKey?: string | null;
  presentations: readonly GlassSupplierCutPresentation[];
  asOfDate?: string;
}): GlassSupplierCutResolution {
  if (input.panes.length === 0) {
    return {
      status: "missing",
      reason: "La receta no generó paños físicos calculables para valorar vidrio.",
      totalNetCost: null,
      currency: null,
      panes: [],
    };
  }

  for (const pane of input.panes) {
    if (
      !Number.isFinite(pane.anchoMm) ||
      pane.anchoMm <= 0 ||
      !Number.isFinite(pane.altoMm) ||
      pane.altoMm <= 0 ||
      !Number.isFinite(pane.cantidadPiezas) ||
      pane.cantidadPiezas <= 0
    ) {
      return {
        status: "incompatible",
        reason: "Las dimensiones o cantidades de los paños físicos de vidrio son inválidas.",
        totalNetCost: null,
        currency: null,
        panes: [],
      };
    }
  }

  const expectedProductId = input.glassTechnicalSpec?.productId?.trim() || null;
  const expectedCategory =
    input.glassTechnicalSpec?.category && input.glassTechnicalSpec.category !== "pendiente"
      ? input.glassTechnicalSpec.category
      : parseCategoryFromText(input.glassDescription);
  const expectedThickness =
    input.glassTechnicalSpec?.thicknessMm ?? parseThicknessFromText(input.glassDescription);
  const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10);

  if (!expectedProductId && (expectedCategory === "pendiente" || expectedThickness == null)) {
    return {
      status: "incompatible",
      reason: "Falta identificar categoría y espesor exactos del vidrio para asociar costo de compra.",
      totalNetCost: null,
      currency: null,
      panes: [],
    };
  }

  const scopedPresentations = input.presentations.filter((entry) => {
    if (entry.purchaseMode !== "supplier_cut" || entry.purchaseUnit !== "M2") return false;
    if (!entry.presentationId?.trim() || !entry.providerKey?.trim()) return false;
    if (!Number.isFinite(entry.netPricePerM2) || entry.netPricePerM2 <= 0) return false;
    if (!entry.currency?.trim()) return false;
    if (entry.category === "pendiente") return false;
    if (entry.organizationId != null && entry.organizationId !== input.organizationId) {
      return false;
    }
    if (input.providerKey && entry.providerKey !== input.providerKey) return false;
    if (expectedProductId && entry.glassProductId && entry.glassProductId !== expectedProductId) {
      return false;
    }
    if (expectedProductId && !entry.glassProductId && expectedCategory === "pendiente") {
      return false;
    }
    if (expectedCategory !== "pendiente" && entry.category !== expectedCategory) return false;
    if (expectedThickness != null && entry.thicknessMm !== expectedThickness) return false;
    return true;
  });

  if (scopedPresentations.length === 0) {
    return {
      status: "missing",
      reason: "Falta una presentación de compra de vidrio al corte (m²) compatible con el espesor, categoría y proveedor.",
      totalNetCost: null,
      currency: null,
      panes: [],
    };
  }

  const validPresentations: GlassSupplierCutPresentation[] = [];
  let lastInvalidReason = "Sin presentación vigente para vidrio al corte.";
  for (const candidate of scopedPresentations) {
    const validity = isWithinValidityWindow(candidate, asOfDate);
    if (validity.valid) {
      validPresentations.push(candidate);
    } else if (validity.reason) {
      lastInvalidReason = validity.reason;
    }
  }

  if (validPresentations.length === 0) {
    return {
      status: "incompatible",
      reason: lastInvalidReason,
      totalNetCost: null,
      currency: null,
      panes: [],
    };
  }

  if (validPresentations.length > 1) {
    return {
      status: "ambiguous",
      reason: `Existen ${validPresentations.length} presentaciones de compra compatibles para este vidrio; selecciona una referencia única.`,
      totalNetCost: null,
      currency: null,
      panes: [],
    };
  }

  const chosen = validPresentations[0]!;
  const minPerPane =
    chosen.minBillableM2PerPane != null &&
    Number.isFinite(chosen.minBillableM2PerPane) &&
    chosen.minBillableM2PerPane > 0
      ? chosen.minBillableM2PerPane
      : null;

  let totalRawM2 = 0;
  let totalBillableM2 = 0;
  const valuedPanes: GlassSupplierCutPaneValuation[] = input.panes.map((pane) => {
    const rawAreaM2PerPane = round4((pane.anchoMm * pane.altoMm) / 1_000_000);
    const minApplied = minPerPane != null && rawAreaM2PerPane < minPerPane;
    const billableAreaM2PerPane = minApplied ? round4(minPerPane!) : rawAreaM2PerPane;
    const paneTotalRaw = round4(rawAreaM2PerPane * pane.cantidadPiezas);
    const paneTotalBillable = round4(billableAreaM2PerPane * pane.cantidadPiezas);
    const lineNet = Math.round(paneTotalBillable * chosen.netPricePerM2);
    totalRawM2 = round4(totalRawM2 + paneTotalRaw);
    totalBillableM2 = round4(totalBillableM2 + paneTotalBillable);
    return {
      vidrioId: pane.vidrioId,
      nombre: pane.nombre,
      anchoMm: pane.anchoMm,
      altoMm: pane.altoMm,
      cantidadPiezas: pane.cantidadPiezas,
      rawAreaM2PerPane,
      billableAreaM2PerPane,
      minApplied,
      totalBillableM2: paneTotalBillable,
      lineNet,
    };
  });

  const totalNetCost = Math.round(totalBillableM2 * chosen.netPricePerM2);
  return {
    status: "priced",
    presentationId: chosen.presentationId,
    providerKey: chosen.providerKey,
    currency: chosen.currency.trim().toUpperCase(),
    netPricePerM2: chosen.netPricePerM2,
    minBillableM2PerPane: minPerPane,
    totalRawM2,
    totalBillableM2,
    totalNetCost,
    panes: valuedPanes,
  };
}

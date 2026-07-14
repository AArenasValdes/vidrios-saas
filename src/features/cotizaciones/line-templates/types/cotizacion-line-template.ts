import type { EntityId } from "@/types/common";

export const LINE_TEMPLATE_MATERIALS = ["Aluminio", "PVC", "Cristal"] as const;
export type CotizacionLineTemplateMaterial = (typeof LINE_TEMPLATE_MATERIALS)[number];

export const LINE_TEMPLATE_CATEGORIAS = [
  "aluminio",
  "pvc",
  "vidrio",
  "shower",
  "accesorios",
  "otros",
] as const;
export type CotizacionLineTemplateCategoria = (typeof LINE_TEMPLATE_CATEGORIAS)[number];

export const LINE_TEMPLATE_UNIDADES_COBRO = [
  "m2",
  "metro_lineal",
  "unidad",
  "valor_manual",
] as const;
export type CotizacionLineTemplateUnidadCobro = (typeof LINE_TEMPLATE_UNIDADES_COBRO)[number];

export type CotizacionLineTemplate = {
  id: EntityId;
  organizationId: EntityId;
  nombre: string;
  categoria: CotizacionLineTemplateCategoria;
  unidadCobro: CotizacionLineTemplateUnidadCobro;
  material: CotizacionLineTemplateMaterial;
  vidrioPrincipalRecomendado: string | null;
  costoBase: number;
  precioM2Sugerido: number;
  minimoCobrable: number;
  redondeoPrecio: number;
  mermaPct: number;
  margenObjetivoPct: number | null;
  proveedor: string | null;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  catalogMetadata: Record<string, string | number | boolean | null>;
  isActive: boolean;
  sortOrder: number;
  creadoEn: string | null;
  actualizadoEn: string | null;
  eliminadoEn: string | null;
};

export type CotizacionLineTemplateCatalogMetadata = Record<
  string,
  string | number | boolean | null
>;

export type CotizacionGlassProductMetadata = {
  espesor: string | null;
  terminacion: string | null;
};

function normalizeMetadataText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getLineTemplateGlassMetadata(
  metadata: CotizacionLineTemplate["catalogMetadata"] | null | undefined
): CotizacionGlassProductMetadata {
  return {
    espesor: normalizeMetadataText(metadata?.espesor),
    terminacion:
      normalizeMetadataText(metadata?.terminacion) ??
      normalizeMetadataText(metadata?.descripcion),
  };
}

export function mergeLineTemplateGlassMetadata(
  metadata: CotizacionLineTemplateCatalogMetadata | null | undefined,
  input: Partial<CotizacionGlassProductMetadata>
): CotizacionLineTemplateCatalogMetadata {
  const next: CotizacionLineTemplateCatalogMetadata = { ...(metadata ?? {}) };

  if (input.espesor !== undefined) {
    const value = input.espesor?.trim() ?? "";
    if (value) next.espesor = value.slice(0, 40);
    else delete next.espesor;
  }

  if (input.terminacion !== undefined) {
    const value = input.terminacion?.trim() ?? "";
    if (value) next.terminacion = value.slice(0, 160);
    else delete next.terminacion;
  }

  return next;
}

export type CreateCotizacionLineTemplateInput = {
  organizationId: EntityId;
  nombre: string;
  categoria?: CotizacionLineTemplateCategoria;
  unidadCobro?: CotizacionLineTemplateUnidadCobro;
  material: CotizacionLineTemplateMaterial;
  vidrioPrincipalRecomendado?: string | null;
  costoBase?: number;
  precioM2Sugerido: number;
  minimoCobrable?: number;
  redondeoPrecio?: number;
  mermaPct?: number;
  margenObjetivoPct?: number | null;
  proveedor?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  catalogMetadata?: Record<string, string | number | boolean | null>;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateCotizacionLineTemplateInput = {
  nombre?: string;
  categoria?: CotizacionLineTemplateCategoria;
  unidadCobro?: CotizacionLineTemplateUnidadCobro;
  material?: CotizacionLineTemplateMaterial;
  vidrioPrincipalRecomendado?: string | null;
  costoBase?: number;
  precioM2Sugerido?: number;
  minimoCobrable?: number;
  redondeoPrecio?: number;
  mermaPct?: number;
  margenObjetivoPct?: number | null;
  proveedor?: string | null;
  vigenciaDesde?: string | null;
  vigenciaHasta?: string | null;
  catalogMetadata?: Record<string, string | number | boolean | null>;
  isActive?: boolean;
  sortOrder?: number;
};

export type LineTemplateImportDuplicateMode = "skip" | "update" | "create";

export type LineTemplateImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
};

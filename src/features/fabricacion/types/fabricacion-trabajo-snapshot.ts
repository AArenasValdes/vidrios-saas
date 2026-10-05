import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";

export const FABRICACION_TRABAJO_SNAPSHOT_VERSION = 1 as const;

export type FabricacionTrabajoItemInput = {
  id: string;
  codigo: string;
  nombre: string;
  lineaComercial: string;
  colorHex?: string | null;
  catalogLineKey?: string | null;
  supplierFamilyKey?: string | null;
  /** Resuelta explícitamente desde presentaciones confirmadas del catálogo. */
  supplierPresentationSelections?: FabricacionTrabajoPresentationSelection[];
  /** Si el catálogo aplica a esta línea, una resolución ausente nunca usa el largo de receta. */
  requireSupplierPresentation?: boolean;
  snapshot: FabricacionCotizacionSnapshot | null;
};
export type FabricacionTrabajoPresentationSelection = {
  technicalCode: string;
  status: "resolved" | "missing" | "ambiguous";
  presentationId: string | null;
  providerKey: string | null;
  supplierSku: string | null;
  finishCode: string | null;
  finishName: string | null;
  commercialLengthMm: number | null;
  reason?: string;
};
export type FabricacionTrabajoCorte = {
  itemId: string;
  codigoItem: string;
  nombreItem: string;
  componenteId: string;
  codigoPerfil: string;
  funcion: string;
  corte: string | null;
  largoMm: number;
  supplierPresentationId?: string | null;
  supplierProviderKey?: string | null;
  supplierSku?: string | null;
};

export type FabricacionTrabajoBarra = {
  materialKey: string;
  presentationKey: string;
  codigoPerfil: string;
  nombrePerfil: string;
  acabadoKey: string;
  lineaIds: Array<number | null>;
  largoComercialMm: number;
  supplierPresentationId?: string | null;
  supplierProviderKey?: string | null;
  supplierSku?: string | null;
  supplierFinishCode?: string | null;
  supplierFinishName?: string | null;
  indice: number;
  despunteInicialMm: number;
  perdidaCorteMm: number;
  usadoMm: number;
  sobranteMm: number;
  cortes: FabricacionTrabajoCorte[];
};

/** Congela los cortes ya calculados y la distribución conjunta para una cotización. */
export type FabricacionTrabajoSnapshot = {
  schemaVersion: typeof FABRICACION_TRABAJO_SNAPSHOT_VERSION;
  tipo: "fabricacion_trabajo_snapshot";
  packing: "first_fit_decreasing_sugerido";
  capturedAt: string;
  itemCountWithPauta: number;
  totalBars: number;
  totalProfilesLinealMm: number;
  totalWasteMm: number;
  /** Punto futuro de resolución técnica → presentación por acabado/largo; aún no incluye SKUs. */
  sourcePresentations: Array<{
    technicalInputKey: string;
    presentationKey: string;
    lineTemplateId: number | null;
    catalogLineKey: string | null;
    finishKey: string;
    commercialLengthMm: number;
    supplierPresentationId?: string | null;
    providerKey?: string | null;
    supplierSku?: string | null;
    finishCode?: string | null;
    finishName?: string | null;
  }>;
  /** Insumos de catálogo requeridos pero sin presentación/largo inequívocos. */
  missingPresentations?: Array<{
    itemId: string;
    technicalCode: string;
    finishKey: string;
    reason: string;
    supplierSku?: string | null;
  }>;
  /** Identidad y procedencia de recetas no validadas habilitadas solo para QA. */
  qaPreliminary?: {
    mode: "supplier_catalog_v1_qa_preliminary";
    items: Array<{
      itemId: string;
      recipeId: string;
      recipeVersion: number;
      variantKey: string;
      recipeStatus: "draft";
      readiness: "lista_para_validar";
      sourceType: import("@/features/fabricacion/types/fabricacion-persistence").FabricationRecipeSourceType;
      sourceReference: string | null;
    }>;
  };
  bars: FabricacionTrabajoBarra[];
};

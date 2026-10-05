import type {
  FabricacionAdvertencia,
  FabricacionEntradaCalculo,
  FabricacionFilaPauta,
  FabricacionIdentidadReceta,
  FabricacionResultadoCubicacion,
  FabricacionVidrioResultado,
} from "@/features/fabricacion/types/fabricacion-domain";
import type {
  FabricationRecipeScope,
  FabricationRecipeStatus,
} from "@/features/fabricacion/types/fabricacion-persistence";

export const FABRICACION_COTIZACION_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export type FabricacionCorteBarra = {
  componenteId: string;
  codigoPerfil: string;
  funcion: string;
  corte?: string | null;
  largoMm: number;
};

export type FabricacionBarraPauta = {
  /** Clave interna para agrupar material real; nunca se muestra como código comercial. */
  materialKey?: string;
  codigoPerfil: string;
  nombrePerfil: string;
  indice: number;
  largoComercialMm: number;
  despunteInicialMm: number;
  usadoMm: number;
  perdidaCortesMm: number;
  sobranteMm: number;
  sobranteAprovechable: boolean;
  cortes: FabricacionCorteBarra[];
};

export type FabricacionPautaBarras = {
  calculable: boolean;
  barras: FabricacionBarraPauta[];
  advertencias: FabricacionAdvertencia[];
  totalUsadoMm: number;
  totalPerdidaCortesMm: number;
  totalSobranteMm: number;
};

export type FabricacionCotizacionSnapshot = {
  schemaVersion: typeof FABRICACION_COTIZACION_SNAPSHOT_SCHEMA_VERSION;
  tipo: "fabricacion_receta_snapshot";
  recipeId: string;
  recipeDefinitionId: string;
  recipeVersion: number;
  recipeStatus: FabricationRecipeStatus;
  recipeScope: FabricationRecipeScope;
  lineTemplateId: number | null;
  /** Familia técnica explícita del catálogo comercial; no se deduce por nombre. */
  supplierFamilyKey?: string | null;
  recipeIdentity: FabricacionIdentidadReceta;
  input: FabricacionEntradaCalculo;
  selectedVariant: string | null;
  result: FabricacionResultadoCubicacion;
  pauta: FabricacionFilaPauta[];
  vidrios: FabricacionVidrioResultado[];
  advertencias: FabricacionAdvertencia[];
  pautaBarras?: FabricacionPautaBarras;
  formulaVersion?: string;
  /** Marca de ejecución exclusiva del piloto QA; no cambia el estado de la receta. */
  qaPreliminary?: {
    mode: "supplier_catalog_v1_qa_preliminary";
    readiness: "lista_para_validar";
    provenance: {
      sourceType: import("@/features/fabricacion/types/fabricacion-persistence").FabricationRecipeSourceType;
      sourceReference: string | null;
    };
  };
  calculatedAt: string;
};

export type FabricacionSnapshotSourceInput = {
  recipeId: string;
  recipeVersion: number;
  recipeStatus: FabricationRecipeStatus;
  recipeScope: FabricationRecipeScope;
  lineTemplateId: number | null;
};

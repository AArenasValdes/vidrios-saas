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
  recipeIdentity: FabricacionIdentidadReceta;
  input: FabricacionEntradaCalculo;
  selectedVariant: string | null;
  result: FabricacionResultadoCubicacion;
  pauta: FabricacionFilaPauta[];
  vidrios: FabricacionVidrioResultado[];
  advertencias: FabricacionAdvertencia[];
  pautaBarras?: FabricacionPautaBarras;
  calculatedAt: string;
};

export type FabricacionSnapshotSourceInput = {
  recipeId: string;
  recipeVersion: number;
  recipeStatus: FabricationRecipeStatus;
  recipeScope: FabricationRecipeScope;
  lineTemplateId: number | null;
};

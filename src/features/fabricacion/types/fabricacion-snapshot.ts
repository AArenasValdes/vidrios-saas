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
  calculatedAt: string;
};

export type FabricacionSnapshotSourceInput = {
  recipeId: string;
  recipeVersion: number;
  recipeStatus: FabricationRecipeStatus;
  recipeScope: FabricationRecipeScope;
  lineTemplateId: number | null;
};

import type {
  FabricacionEntradaCalculo,
  FabricacionReceta,
  FabricacionResultadoCubicacion,
} from "@/features/fabricacion/types/fabricacion-domain";

export const FABRICATION_RECIPE_SCOPES = ["ventora", "organization"] as const;
export type FabricationRecipeScope = (typeof FABRICATION_RECIPE_SCOPES)[number];

export const FABRICATION_RECIPE_STATUSES = [
  "draft",
  "testing",
  "validated",
  "review_required",
  "archived",
] as const;
export type FabricationRecipeStatus =
  (typeof FABRICATION_RECIPE_STATUSES)[number];

export const FABRICATION_RECIPE_SOURCE_TYPES = [
  "manual",
  "copied",
  "imported_ai",
  "legacy",
] as const;
export type FabricationRecipeSourceType =
  (typeof FABRICATION_RECIPE_SOURCE_TYPES)[number];

export type FabricationRecipeRecord = {
  id: string;
  organizationId: number | null;
  lineTemplateId: number | null;
  scope: FabricationRecipeScope;
  providerName: string;
  lineName: string;
  typology: string;
  leavesCount: number | null;
  variant: string | null;
  version: number;
  status: FabricationRecipeStatus;
  definition: FabricacionReceta;
  sourceType: FabricationRecipeSourceType;
  sourceReference: string | null;
  parentRecipeId: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  eliminadoEn: string | null;
};

export type FabricationRecipeTestRecord = {
  id: string;
  recipeId: string;
  organizationId: number | null;
  name: string;
  input: FabricacionEntradaCalculo;
  expectedOutput: FabricacionResultadoCubicacion;
  actualOutput: FabricacionResultadoCubicacion | null;
  passed: boolean;
  isRequired: boolean;
  validatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  eliminadoEn: string | null;
};

export type CreateFabricationRecipeInput = {
  organizationId: number | null;
  lineTemplateId?: number | null;
  scope: FabricationRecipeScope;
  providerName: string;
  lineName: string;
  typology: string;
  leavesCount?: number | null;
  variant?: string | null;
  version?: number;
  status?: FabricationRecipeStatus;
  definition: FabricacionReceta;
  sourceType?: FabricationRecipeSourceType;
  sourceReference?: string | null;
  parentRecipeId?: string | null;
  validatedAt?: string | null;
  validatedBy?: string | null;
};

export type UpdateFabricationRecipeInput = Partial<
  Pick<
    CreateFabricationRecipeInput,
    | "lineTemplateId"
    | "providerName"
    | "lineName"
    | "typology"
    | "leavesCount"
    | "variant"
    | "status"
    | "definition"
    | "sourceReference"
    | "validatedAt"
    | "validatedBy"
  >
>;

export type ListFabricationRecipesFilters = {
  organizationId?: number | null;
  lineTemplateId?: number;
  status?: FabricationRecipeStatus;
  includeArchived?: boolean;
};

export type CreateFabricationRecipeTestInput = {
  recipeId: string;
  organizationId?: number | null;
  name: string;
  input: FabricacionEntradaCalculo;
  expectedOutput: FabricacionResultadoCubicacion;
  passed?: boolean;
  isRequired?: boolean;
  actualOutput?: FabricacionResultadoCubicacion | null;
  validatedBy?: string | null;
};

export type UpdateFabricationRecipeTestInput = Partial<
  Pick<
    CreateFabricationRecipeTestInput,
    | "name"
    | "input"
    | "expectedOutput"
    | "actualOutput"
    | "passed"
    | "isRequired"
    | "validatedBy"
  >
>;

export type FabricationRecipeErrorCode =
  | "RECETA_NO_ENCONTRADA"
  | "RECETA_VALIDADA_BLOQUEADA"
  | "RECETA_ARCHIVADA"
  | "RECETA_DEFINICION_INVALIDA"
  | "CASO_PRUEBA_INVALIDO"
  | "CASO_PRUEBA_NO_ENCONTRADO"
  | "VALIDACION_SIN_CASOS"
  | "VALIDACION_CON_FALLOS"
  | "VALIDACION_COMPONENTES_INCOMPLETOS"
  | "ACCESO_ORGANIZACION_INVALIDO";

export class FabricationRecipeServiceError extends Error {
  constructor(
    public readonly code: FabricationRecipeErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "FabricationRecipeServiceError";
  }
}

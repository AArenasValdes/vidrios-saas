import { z } from "zod";

import {
  fabricacionEntradaCalculoSchema,
  fabricacionIdentidadRecetaSchema,
  fabricacionResultadoCubicacionSchema,
} from "@/features/fabricacion/schemas/fabricacion-schemas";
import { FABRICATION_RECIPE_SCOPES, FABRICATION_RECIPE_STATUSES } from "@/features/fabricacion/types/fabricacion-persistence";
import { FABRICACION_COTIZACION_SNAPSHOT_SCHEMA_VERSION } from "@/features/fabricacion/types/fabricacion-snapshot";

export const fabricacionCotizacionSnapshotSchema = z.object({
  schemaVersion: z.literal(FABRICACION_COTIZACION_SNAPSHOT_SCHEMA_VERSION),
  tipo: z.literal("fabricacion_receta_snapshot"),
  recipeId: z.string().uuid(),
  recipeDefinitionId: z.string().min(1),
  recipeVersion: z.number().int().positive(),
  recipeStatus: z.enum(FABRICATION_RECIPE_STATUSES),
  recipeScope: z.enum(FABRICATION_RECIPE_SCOPES),
  lineTemplateId: z.number().int().positive().nullable(),
  recipeIdentity: fabricacionIdentidadRecetaSchema,
  input: fabricacionEntradaCalculoSchema,
  selectedVariant: z.string().nullable(),
  result: fabricacionResultadoCubicacionSchema,
  pauta: fabricacionResultadoCubicacionSchema.shape.perfiles,
  vidrios: fabricacionResultadoCubicacionSchema.shape.vidrios,
  advertencias: fabricacionResultadoCubicacionSchema.shape.advertencias,
  calculatedAt: z.string().datetime(),
});

import { z } from "zod";
import {
  FABRICACION_ADVERTENCIA_NIVELES,
  FABRICACION_BASES_MEDIDA,
  FABRICACION_ENGINE_VERSION,
  FABRICACION_ESTADOS_VALIDACION,
  FABRICACION_RECIPE_SCHEMA_VERSION,
  FABRICACION_REGLAS_CANTIDAD,
  FABRICACION_TIPOLOGIAS,
} from "@/features/fabricacion/types/fabricacion-domain";

const integerPositiveSchema = z.number().int().positive();
const integerNonNegativeSchema = z.number().int().nonnegative();
const componentNotesShape = {
  observaciones: z.string().optional(),
  datosPendientes: z.array(z.string().min(1)).optional(),
};

export const fabricacionCondicionSchema = z
  .object({
    hojas: z
      .union([
        integerPositiveSchema,
        z.object({
          min: integerPositiveSchema.optional(),
          max: integerPositiveSchema.optional(),
          igual: integerPositiveSchema.optional(),
        }),
      ])
      .optional(),
    modulos: z
      .union([
        integerPositiveSchema,
        z.object({
          min: integerPositiveSchema.optional(),
          max: integerPositiveSchema.optional(),
          igual: integerPositiveSchema.optional(),
        }),
      ])
      .optional(),
    variante: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  })
  .strict();

export const fabricacionReglaMedidaSchema = z
  .object({
    base: z.enum(FABRICACION_BASES_MEDIDA),
    valorFijoMm: integerPositiveSchema.optional(),
    ajusteMm: z.number().int().optional(),
    multiplicador: z.number().positive().optional(),
    condicion: fabricacionCondicionSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.base === "fijo_mm" && value.valorFijoMm == null) {
      ctx.addIssue({
        code: "custom",
        message: "La regla de medida fija requiere valorFijoMm.",
        path: ["valorFijoMm"],
      });
    }
  });

export const fabricacionReglaCantidadSchema = z
  .object({
    tipo: z.enum(FABRICACION_REGLAS_CANTIDAD),
    cantidad: integerPositiveSchema,
    multiplicador: z.number().positive().optional(),
    condicion: fabricacionCondicionSchema.optional(),
  })
  .strict();

export const fabricacionIdentidadRecetaSchema = z
  .object({
    recetaId: z.string().min(1),
    codigo: z.string().min(1),
    nombre: z.string().min(1),
    tipologia: z.enum(FABRICACION_TIPOLOGIAS),
    hojas: integerPositiveSchema,
    modulos: integerPositiveSchema,
    apertura: z.string().min(1).nullable().optional(),
    herraje: z.string().min(1).nullable(),
    variante: z.string().min(1),
  })
  .strict();

export const fabricacionComponentePerfilSchema = z
  .object({
    id: z.string().min(1),
    tallerPerfilId: z.string().min(1).nullable().optional(),
    codigoPerfil: z.string(),
    nombrePerfil: z.string(),
    funcion: z.string().min(1),
    largoComercialMm: integerPositiveSchema.nullable().optional(),
    reglaMedida: fabricacionReglaMedidaSchema,
    reglaCantidad: fabricacionReglaCantidadSchema,
    requerido: z.boolean(),
    ...componentNotesShape,
  })
  .strict();

export const fabricacionVidrioSchema = z
  .object({
    id: z.string().min(1),
    nombre: z.string().min(1),
    reglaAncho: fabricacionReglaMedidaSchema,
    reglaAlto: fabricacionReglaMedidaSchema,
    reglaCantidad: fabricacionReglaCantidadSchema,
    requerido: z.boolean(),
    condicion: fabricacionCondicionSchema.optional(),
    ...componentNotesShape,
  })
  .strict();

export const fabricacionAccesorioSchema = z
  .object({
    id: z.string().min(1),
    codigo: z.string(),
    nombre: z.string().min(1),
    reglaCantidad: fabricacionReglaCantidadSchema,
    requerido: z.boolean(),
    condicion: fabricacionCondicionSchema.optional(),
    ...componentNotesShape,
  })
  .strict();

export const fabricacionConfiguracionCorteSchema = z
  .object({
    perdidaCorteMm: integerNonNegativeSchema.nullable(),
    despunteInicialMm: integerNonNegativeSchema.nullable(),
    sobranteMinimoAprovechableMm: integerNonNegativeSchema.nullable(),
    largoComercialDefaultMm: integerPositiveSchema.nullable().optional(),
  })
  .strict();

export const fabricacionRecetaSchema = z
  .object({
    schemaVersion: z.literal(FABRICACION_RECIPE_SCHEMA_VERSION),
    version: integerPositiveSchema,
    estado: z.enum(FABRICACION_ESTADOS_VALIDACION),
    identidad: fabricacionIdentidadRecetaSchema,
    perfiles: z.array(fabricacionComponentePerfilSchema),
    vidrios: z.array(fabricacionVidrioSchema),
    accesorios: z.array(fabricacionAccesorioSchema),
    configuracionCorte: fabricacionConfiguracionCorteSchema.optional(),
    notasValidacion: z.array(z.string()),
  })
  .strict();

export const fabricacionEntradaCalculoSchema = z
  .object({
    anchoTotalMm: integerPositiveSchema,
    altoTotalMm: integerPositiveSchema,
    cantidad: integerPositiveSchema,
    hojas: integerPositiveSchema,
    modulos: integerPositiveSchema,
    variante: z.string().min(1).nullable().optional(),
  })
  .strict();

export const fabricacionAdvertenciaSchema = z
  .object({
    codigo: z.string().min(1),
    nivel: z.enum(FABRICACION_ADVERTENCIA_NIVELES),
    mensaje: z.string().min(1),
    componenteId: z.string().min(1).optional(),
  })
  .strict();

export const fabricacionTrazabilidadReglaSchema = z
  .object({
    reglaId: z.string().min(1),
    componenteId: z.string().min(1),
    base: z.union([z.enum(FABRICACION_BASES_MEDIDA), z.enum(FABRICACION_REGLAS_CANTIDAD)]),
    formula: z.string().min(1),
    entrada: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
    resultado: z.number(),
  })
  .strict();

export const fabricacionFilaPautaSchema = z
  .object({
    componenteId: z.string().min(1),
    codigoPerfil: z.string(),
    nombrePerfil: z.string(),
    funcion: z.string().min(1),
    medidaMm: integerPositiveSchema,
    cantidadPiezas: integerPositiveSchema,
    totalLinealMm: integerNonNegativeSchema,
    trazabilidad: z.array(fabricacionTrazabilidadReglaSchema),
  })
  .strict();

export const fabricacionResultadoCubicacionSchema = z
  .object({
    engineVersion: z.literal(FABRICACION_ENGINE_VERSION),
    recetaId: z.string().min(1),
    recetaVersion: integerPositiveSchema,
    estadoReceta: z.enum(FABRICACION_ESTADOS_VALIDACION),
    entradaNormalizada: fabricacionEntradaCalculoSchema.nullable(),
    perfiles: z.array(fabricacionFilaPautaSchema),
    vidrios: z.array(
      z
        .object({
          vidrioId: z.string().min(1),
          nombre: z.string().min(1),
          anchoMm: integerPositiveSchema,
          altoMm: integerPositiveSchema,
          cantidadPiezas: integerPositiveSchema,
          totalM2: z.number().nonnegative(),
          trazabilidad: z.array(fabricacionTrazabilidadReglaSchema),
        })
        .strict()
    ),
    accesorios: z.array(
      z
        .object({
          accesorioId: z.string().min(1),
          codigo: z.string(),
          nombre: z.string().min(1),
          cantidadUnidades: integerPositiveSchema,
          trazabilidad: z.array(fabricacionTrazabilidadReglaSchema),
        })
        .strict()
    ),
    advertencias: z.array(fabricacionAdvertenciaSchema),
    totalLinealMm: integerNonNegativeSchema,
    totalVidrioM2: z.number().nonnegative(),
    calculable: z.boolean(),
  })
  .strict();

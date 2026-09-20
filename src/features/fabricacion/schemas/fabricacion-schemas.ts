import { z } from "zod";
import {
  FABRICACION_ADVERTENCIA_NIVELES,
  FABRICACION_BASES_MEDIDA,
  FABRICACION_ENGINE_VERSION,
  FABRICACION_EVIDENCIA_ORIGENES,
  FABRICACION_FUENTES_EVIDENCIA,
  FABRICACION_NIVELES_CONFIANZA,
  FABRICACION_ESTADOS_VALIDACION,
  FABRICACION_RECIPE_SCHEMA_VERSION,
  FABRICACION_REGLAS_CANTIDAD,
  FABRICACION_ATRIBUTO_IMPACTOS,
  FABRICACION_ROLES_ACCESORIO,
  FABRICACION_TIPOLOGIAS,
} from "@/features/fabricacion/types/fabricacion-domain";

const integerPositiveSchema = z.number().int().positive();
const integerNonNegativeSchema = z.number().int().nonnegative();

/** Ajuste en mm: puede ser fraccionario en fórmulas (p. ej. (X+16)/3); el cálculo redondea al final. */
const reglaAjusteMmSchema = z.number().finite().optional();
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
    topology: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
    hardwareMode: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  })
  .strict();

export const fabricacionReglaMedidaSchema = z
  .object({
    base: z.enum(FABRICACION_BASES_MEDIDA),
    valorFijoMm: integerPositiveSchema.optional(),
    ajusteMm: reglaAjusteMmSchema,
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
    topology: z.string().min(1).nullable().optional(),
    hardwareMode: z.string().min(1).nullable().optional(),
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
    corte: z.string().min(1).optional(),
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
    formulaCantidad: z.string().min(1).optional(),
    unidad: z.string().min(1).optional(),
    clasificacion: z
      .object({
        rol: z.enum(FABRICACION_ROLES_ACCESORIO),
        impactos: z.array(z.enum(FABRICACION_ATRIBUTO_IMPACTOS)).min(1),
      })
      .strict()
      .optional(),
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

export const fabricacionFuenteFragmentoSchema = z
  .object({
    id: z.string().min(1),
    tipo: z.enum(["perfil", "vidrio", "accesorio", "identidad", "advertencia"]),
    locator: z.string().min(1),
    texto: z.string().min(1),
  })
  .strict();

const fabricacionMedidaObservadaExternaSchema = z
  .object({
    anchoMm: integerPositiveSchema,
    altoMm: integerPositiveSchema,
    hojas: integerPositiveSchema.optional(),
    modulos: integerPositiveSchema.optional(),
    variante: z.string().min(1).nullable().optional(),
  })
  .strict();

export const fabricacionEvidenciaSchema = z
  .object({
    fuente: z.literal("sistema_zeta"),
    runId: z.string().min(1),
    projectId: z.string().min(1),
    planId: z.string().min(1),
    rawPath: z.string().min(1),
    htmlPath: z.string().min(1),
    textPath: z.string().min(1),
    screenshotPaths: z.array(z.string().min(1)).min(1),
    fecha: z.string().min(1),
    extractorVersion: z.string().min(1),
    hashes: z
      .object({
        html: z.string().regex(/^[a-f0-9]{64}$/i),
        text: z.string().regex(/^[a-f0-9]{64}$/i),
        screenshots: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/i)).refine(
          (value) => Object.keys(value).length > 0,
          "La evidencia Zeta requiere hash de al menos un screenshot.",
        ),
      })
      .strict(),
    sourceFragments: z.array(fabricacionFuenteFragmentoSchema).min(1),
    medidasObservadas: z
      .array(
        z
          .object({
            anchoMm: integerPositiveSchema,
            altoMm: integerPositiveSchema,
          })
          .strict(),
      )
      .min(1),
    valores: z
      .array(
        z
          .object({
            fieldPath: z.string().min(1),
            origen: z.enum(FABRICACION_EVIDENCIA_ORIGENES),
            sourceFragmentId: z.string().min(1).nullable().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const fabricacionEvidenciaExternaSchema = z
  .object({
    fuente: z.enum(["alumetrica", "haciendoventanas"]),
    nombreFuente: z.string().min(1),
    url: z.string().url().nullable().optional(),
    archivo: z.string().min(1).nullable().optional(),
    htmlPath: z.string().min(1).nullable().optional(),
    screenshotPaths: z.array(z.string().min(1)).optional(),
    pdfPath: z.string().min(1).nullable().optional(),
    fecha: z.string().min(1),
    sourceFragments: z.array(fabricacionFuenteFragmentoSchema).min(1),
    medidasObservadas: z.array(fabricacionMedidaObservadaExternaSchema).min(1),
    valores: z
      .array(
        z
          .object({
            fieldPath: z.string().min(1),
            origen: z.enum(FABRICACION_EVIDENCIA_ORIGENES),
            sourceFragmentId: z.string().min(1).nullable().optional(),
          })
          .strict(),
      )
      .min(1),
    confianza: z.enum(FABRICACION_NIVELES_CONFIANZA),
    conflictos: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const fabricacionAlcanceCalculoSchema = z.discriminatedUnion("modo", [
  z
    .object({
      modo: z.literal("formula_general"),
    })
    .strict(),
  z
    .object({
      modo: z.literal("observed_fixture_only"),
      medidasObservadas: z.array(fabricacionMedidaObservadaExternaSchema).min(1),
      calculableFueraDeMedidas: z.boolean(),
    })
    .strict(),
]);

export const fabricacionRecetaSchema = z
  .object({
    schemaVersion: z.literal(FABRICACION_RECIPE_SCHEMA_VERSION),
    version: integerPositiveSchema,
    estado: z.enum(FABRICACION_ESTADOS_VALIDACION),
    identidad: fabricacionIdentidadRecetaSchema,
    perfiles: z.array(fabricacionComponentePerfilSchema),
    vidrios: z.array(fabricacionVidrioSchema),
    accesorios: z.array(fabricacionAccesorioSchema),
    contratoTecnico: z
      .object({
        familia: z.string().min(1),
        discriminadoresObligatorios: z.array(z.string().min(1)).min(1),
        impactosAtributos: z.record(
          z.string().min(1),
          z.array(z.enum(FABRICACION_ATRIBUTO_IMPACTOS)).min(1)
        ),
        topology: z.string().min(1).nullable().optional(),
        hardwareMode: z.string().min(1).nullable().optional(),
      })
      .strict()
      .optional(),
    configuracionCorte: fabricacionConfiguracionCorteSchema.optional(),
    evidencia: fabricacionEvidenciaSchema.optional(),
    evidenciasExternas: z.array(fabricacionEvidenciaExternaSchema).optional(),
    alcanceCalculo: fabricacionAlcanceCalculoSchema.optional(),
    datosPendientes: z.array(z.string().min(1)).optional(),
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
    topology: z.string().min(1).nullable().optional(),
    hardwareMode: z.string().min(1).nullable().optional(),
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

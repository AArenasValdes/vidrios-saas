import { z } from "zod";

import {
  FABRICACION_BASES_MEDIDA,
  FABRICACION_REGLAS_CANTIDAD,
} from "@/features/fabricacion/types/fabricacion-domain";

export const fabricacionAsistenteComponenteSchema = z
  .object({
    categoria: z.enum(["perfil", "vidrio", "accesorio"]),
    nombre: z.string().min(1),
    codigo: z.string().min(1).nullable(),
    funcion: z.string().min(1),
    medidaBase: z.enum(FABRICACION_BASES_MEDIDA).nullable(),
    medidaAltoBase: z.enum(FABRICACION_BASES_MEDIDA).nullable(),
    multiplicador: z.number().positive().nullable(),
    ajusteMm: z.number().int().nullable(),
    cantidadTipo: z.enum(FABRICACION_REGLAS_CANTIDAD).nullable(),
    cantidad: z.number().int().positive().nullable(),
    largoComercialMm: z.number().int().positive().nullable(),
    observaciones: z.string(),
    faltantes: z.array(z.string().min(1)),
    explicito: z
      .object({
        codigo: z.boolean(),
        medida: z.boolean(),
        ajuste: z.boolean(),
        cantidad: z.boolean(),
        largoComercial: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const fabricacionAsistenteRespuestaSchema = z
  .object({
    resumen: z.string().min(1),
    componentes: z.array(fabricacionAsistenteComponenteSchema),
    preguntas: z.array(z.string().min(1)),
    datosDesconocidos: z.array(z.string().min(1)),
  })
  .strict();

export type FabricacionAsistenteRespuesta = z.infer<
  typeof fabricacionAsistenteRespuestaSchema
>;

export const FABRICACION_ASISTENTE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumen", "componentes", "preguntas", "datosDesconocidos"],
  properties: {
    resumen: { type: "string" },
    componentes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "categoria",
          "nombre",
          "codigo",
          "funcion",
          "medidaBase",
          "medidaAltoBase",
          "multiplicador",
          "ajusteMm",
          "cantidadTipo",
          "cantidad",
          "largoComercialMm",
          "observaciones",
          "faltantes",
          "explicito",
        ],
        properties: {
          categoria: { type: "string", enum: ["perfil", "vidrio", "accesorio"] },
          nombre: { type: "string" },
          codigo: { type: ["string", "null"] },
          funcion: { type: "string" },
          medidaBase: {
            type: ["string", "null"],
            enum: [...FABRICACION_BASES_MEDIDA, null],
          },
          medidaAltoBase: {
            type: ["string", "null"],
            enum: [...FABRICACION_BASES_MEDIDA, null],
          },
          multiplicador: { type: ["number", "null"], exclusiveMinimum: 0 },
          ajusteMm: { type: ["integer", "null"] },
          cantidadTipo: {
            type: ["string", "null"],
            enum: [...FABRICACION_REGLAS_CANTIDAD, null],
          },
          cantidad: { type: ["integer", "null"], minimum: 1 },
          largoComercialMm: { type: ["integer", "null"], minimum: 1 },
          observaciones: { type: "string" },
          faltantes: { type: "array", items: { type: "string" } },
          explicito: {
            type: "object",
            additionalProperties: false,
            required: ["codigo", "medida", "ajuste", "cantidad", "largoComercial"],
            properties: {
              codigo: { type: "boolean" },
              medida: { type: "boolean" },
              ajuste: { type: "boolean" },
              cantidad: { type: "boolean" },
              largoComercial: { type: "boolean" },
            },
          },
        },
      },
    },
    preguntas: { type: "array", items: { type: "string" } },
    datosDesconocidos: { type: "array", items: { type: "string" } },
  },
} as const;

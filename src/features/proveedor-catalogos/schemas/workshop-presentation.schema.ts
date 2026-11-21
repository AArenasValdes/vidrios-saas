import { z } from "zod";

/** Commercial units persisted by the shared workshop-presentation API. */
export const workshopPurchaseUnitSchema = z.enum(["M", "UN", "KG", "PAR", "TIRA", "M2", "TUBO"]);

export const workshopGlassCategorySchema = z.enum([
  "monolitico",
  "laminado",
  "dvh",
  "templado",
  "espejo",
]);

const isoDateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalIsoDateSchema = z
  .string()
  .trim()
  .regex(isoDateOnlyRegex, "Fecha inválida; usa formato YYYY-MM-DD.")
  .nullable()
  .optional();

export const workshopGlassCutInputSchema = z
  .object({
    glassLineTemplateId: z.number().int().positive("Selecciona un cristal de tu catálogo."),
    glassProductId: z.string().trim().min(1).max(120).nullable().optional(),
    category: workshopGlassCategorySchema,
    thicknessMm: z.number().finite().positive().max(100),
    description: z.string().trim().min(1).max(240),
    providerKey: z.string().trim().min(1).max(100).nullable().optional(),
    supplierName: z.string().trim().min(1).max(120),
    netPricePerM2: z.number().finite().positive(),
    minBillableM2PerPane: z.number().finite().positive().max(20).nullable().optional(),
    currency: z.enum(["CLP"]),
    validFrom: optionalIsoDateSchema,
    validUntil: optionalIsoDateSchema,
  })
  .strict()
  .refine(
    (row) => row.glassProductId == null || row.glassProductId === String(row.glassLineTemplateId),
    { message: "El identificador del cristal no coincide con el cristal seleccionado del catálogo." }
  )
  .refine(
    (row) => !row.validFrom || !row.validUntil || row.validUntil >= row.validFrom,
    { message: "La vigencia hasta no puede ser anterior a vigencia desde." }
  );

export const workshopGlassCutUpdateSchema = z
  .object({
    presentationId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    supplierName: z.string().trim().min(1).max(120),
    netPricePerM2: z.number().finite().positive(),
    minBillableM2PerPane: z.number().finite().positive().max(20).nullable().optional(),
    currency: z.enum(["CLP"]),
    validFrom: optionalIsoDateSchema,
    validUntil: optionalIsoDateSchema,
  })
  .strict()
  .refine(
    (row) => !row.validFrom || !row.validUntil || row.validUntil >= row.validFrom,
    { message: "La vigencia hasta no puede ser anterior a vigencia desde." }
  );

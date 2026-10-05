import { z } from "zod";

const evidenceSchema = z.object({
  sourceReference: z.string().trim().min(1),
  page: z.number().int().positive().nullable(),
  observedAs: z.enum(["observed", "derived", "assumed"]),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string().trim().min(1),
});

const technicalInputSchema = z.object({
  technicalKey: z.string().trim().min(1),
  sourceCode: z.string().trim().min(1),
  name: z.string().trim().min(1),
  material: z.string().trim().min(1),
  sectionMm: z.tuple([z.number().positive(), z.number().positive()]).nullable(),
  familyKeys: z.array(z.string().trim().min(1)).min(1),
  /** Explicit recipe codes mapped to this official technical input; never inferred from SKU text. */
  recipeComponentCodes: z.array(z.string().trim().min(1)).optional(),
  /** Exact recipe accessory names mapped with documentary evidence. */
  recipeAccessoryNames: z.array(z.string().trim().min(1)).optional(),
  /** Family keys that must be omitted when resolving this source code into a Ventora recipe. */
  excludedRecipeFamilyKeys: z.array(z.string().trim().min(1)).optional(),
  evidence: evidenceSchema,
});

const presentationSchema = z.object({
  sku: z.string().trim().min(1),
  description: z.string().trim().min(1),
  technicalKey: z.string().trim().min(1),
  finishResolution: z.enum(["specific", "finish_independent"]),
  finishCode: z.string().trim().min(1).nullable(),
  finishName: z.string().trim().min(1).nullable(),
  purchaseUnit: z.string().trim().min(1),
  commercialLengthMm: z.number().int().positive().nullable(),
  /** A supplier may publish a technical presentation without a quoted price. */
  netPrice: z.number().positive().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  associationEvidence: evidenceSchema,
  priceEvidence: evidenceSchema.nullable(),
});

export const supplierCatalogImportSchema = z.object({
  supplierKey: z.string().trim().min(1),
  supplierName: z.string().trim().min(1),
  manufacturerName: z.string().trim().min(1),
  /** Compatibilidad con lotes históricos de una sola familia; los nuevos lotes declaran familias por insumo. */
  familyKey: z.string().trim().min(1).optional(),
  catalogRevision: z.string().trim().min(1),
  technicalSourcePublisher: z.string().trim().min(1),
  catalogSourceReference: z.string().trim().min(1),
  priceListName: z.string().trim().min(1),
  priceListRevision: z.string().trim().min(1),
  priceListPublishedOn: z.iso.date().nullable(),
  priceListValidUntil: z.iso.date().nullable(),
  priceListSourceReference: z.string().trim().min(1),
  priceListPriceBasis: z.enum(["commercial_presentation", "per_meter", "unknown"]),
  priceListCurrency: z.string().regex(/^[A-Z]{3}$/),
  technicalInputs: z.array(technicalInputSchema).min(1),
  presentations: z.array(presentationSchema).min(1),
}).superRefine((catalog, ctx) => {
  const technicalByKey = new Map(catalog.technicalInputs.map((input) => [input.technicalKey, input]));
  const technicalKeys = new Set(technicalByKey.keys());
  const keysSeen = new Set<string>();
  const sourceCodesSeen = new Set<string>();
  for (const [index, technicalInput] of catalog.technicalInputs.entries()) {
    if (keysSeen.has(technicalInput.technicalKey)) {
      ctx.addIssue({
        code: "custom",
        path: ["technicalInputs", index, "technicalKey"],
        message: "Cada insumo técnico debe aparecer una sola vez; las familias adicionales van en familyKeys.",
      });
    }
    keysSeen.add(technicalInput.technicalKey);
    const codeKey = technicalInput.sourceCode.trim().toLocaleUpperCase("en-US");
    if (sourceCodesSeen.has(codeKey)) {
      ctx.addIssue({
        code: "custom",
        path: ["technicalInputs", index, "sourceCode"],
        message: "Un código técnico del proveedor no se puede clonar en el mismo catálogo; declara todas sus familias en una sola fila.",
      });
    }
    sourceCodesSeen.add(codeKey);
    const familyKeysSeen = new Set<string>();
    for (const familyKey of technicalInput.familyKeys) {
      if (familyKeysSeen.has(familyKey)) {
        ctx.addIssue({
          code: "custom",
          path: ["technicalInputs", index, "familyKeys"],
          message: "La familia no puede repetirse para el mismo insumo técnico.",
        });
      }
      familyKeysSeen.add(familyKey);
    }
  }
  for (const [index, presentation] of catalog.presentations.entries()) {
    if (!technicalKeys.has(presentation.technicalKey)) {
      ctx.addIssue({
        code: "custom",
        path: ["presentations", index, "technicalKey"],
        message: "La presentación debe apuntar a un insumo técnico explícito del catálogo.",
      });
    }
    if ((presentation.finishResolution === "specific") !== Boolean(presentation.finishCode && presentation.finishName)) {
      ctx.addIssue({
        code: "custom",
        path: ["presentations", index, "finishResolution"],
        message: "El modo acabado específico requiere código y nombre; el modo independiente debe dejarlos vacíos.",
      });
    }
    if ((presentation.netPrice === null) !== (presentation.priceEvidence === null)) {
      ctx.addIssue({
        code: "custom",
        path: ["presentations", index, "priceEvidence"],
        message: "Una presentación sin precio no lleva evidencia de precio; todo precio debe conservar su fuente.",
      });
    }
  }

  const skus = new Set<string>();
  for (const [index, presentation] of catalog.presentations.entries()) {
    if (skus.has(presentation.sku)) {
      ctx.addIssue({
        code: "custom",
        path: ["presentations", index, "sku"],
        message: "Un SKU no se puede repetir dentro de la misma importación.",
      });
    }
    skus.add(presentation.sku);
  }
});

export type SupplierCatalogImport = z.infer<typeof supplierCatalogImportSchema>;


import type { SupplierCatalogImport } from "../schemas/catalogo-import.schema";

type FamilyKey =
  | "universal:aluminio:l12"
  | "universal:aluminio:l20"
  | "universal:aluminio:l25"
  | "universal:aluminio:l32"
  | "universal:aluminio:l35"
  | "universal:aluminio:l42"
  | "universal:aluminio:l45"
  | "universal:aluminio:l5000";

type PriceRow = readonly [
  supplierSku: string,
  technicalCode: string,
  familyKey: FamilyKey,
  profileName: string,
  netPrice: number,
  invoice: "000000984" | "000000986",
];

const sourceByInvoice = {
  "000000984": "docs/fabricacion/Alumco/WhatsApp Image 2026-10-17 at 16.51.36.jpeg",
  "000000986": "docs/fabricacion/Alumco/WhatsApp Image 2026-10-17 at 16.50.05.jpeg",
} as const;

const rows: readonly PriceRow[] = [
  ["TI5001A", "5001", "universal:aluminio:l5000", "Riel superior", 13351, "000000984"],
  ["TI5003A", "5003", "universal:aluminio:l5000", "Jamba", 12893, "000000984"],
  ["TI5002A", "5002", "universal:aluminio:l5000", "Riel inferior", 11449, "000000984"],
  ["TI5005A", "5005", "universal:aluminio:l5000", "Zócalo", 14439, "000000984"],
  ["TI5004A", "5004", "universal:aluminio:l5000", "Cabezal", 11942, "000000984"],
  ["TI5006A", "5006", "universal:aluminio:l5000", "Pierna", 14233, "000000984"],
  ["TI5007A", "5007", "universal:aluminio:l5000", "Traslapo", 12503, "000000984"],
  ["TI2001A", "2001", "universal:aluminio:l20", "Riel superior", 18351, "000000984"],
  ["TI2002A", "2002", "universal:aluminio:l20", "Riel inferior", 16169, "000000984"],
  ["TI2004A", "2004", "universal:aluminio:l20", "Cabezal", 11518, "000000984"],
  ["TI2005A", "2005", "universal:aluminio:l20", "Zócalo", 13420, "000000984"],
  ["TI2009A", "2009", "universal:aluminio:l20", "Jamba", 14726, "000000984"],
  ["TI2010A", "2010", "universal:aluminio:l20", "Pierna", 15396, "000000984"],
  ["TI2019A", "2019", "universal:aluminio:l20", "Traslapo", 15396, "000000984"],
  ["TI2501A", "2501", "universal:aluminio:l25", "Riel superior", 24551, "000000984"],
  ["TI2502A", "2502", "universal:aluminio:l25", "Riel inferior", 23359, "000000984"],
  ["TI2504A", "2504", "universal:aluminio:l25", "Cabezal", 15886, "000000984"],
  ["TI2505A", "2505", "universal:aluminio:l25", "Zócalo", 21299, "000000984"],
  ["TI2507A", "2507", "universal:aluminio:l25", "Traslapo", 18627, "000000984"],
  ["TI2509A", "2509", "universal:aluminio:l25", "Jamba cerrada", 18234, "000000984"],
  ["TI2510A", "2510", "universal:aluminio:l25", "Pierna cerrada", 18809, "000000984"],

  ["TI3201A", "3201", "universal:aluminio:l32", "Marco", 10210, "000000986"],
  ["TI3202A", "3202", "universal:aluminio:l32", "Hoja", 18668, "000000986"],
  ["TI3204A", "3204", "universal:aluminio:l32", "Palillo", 21187, "000000986"],
  ["TI3208A", "3208", "universal:aluminio:l32", "Junquillo", 5330, "000000986"],
  ["TI4209A", "4209", "universal:aluminio:l42", "Marco", 15983, "000000986"],
  ["TI4202A", "4202", "universal:aluminio:l42", "Hoja", 25988, "000000986"],
  ["TI4204A", "4204", "universal:aluminio:l42", "Pilar", 31318, "000000986"],
  ["TI4229A", "4229", "universal:aluminio:l42", "Junquillo", 6996, "000000986"],
  ["TI1203A", "1203", "universal:aluminio:l12", "Riel superior", 25254, "000000986"],
  ["TI1201A", "1201", "universal:aluminio:l12", "Riel inferior", 14396, "000000986"],
  ["TI1202A", "1202", "universal:aluminio:l12", "Jamba", 10653, "000000986"],
  ["TI1204A", "1204", "universal:aluminio:l12", "Bastidor", 8907, "000000986"],
  ["TI3502A", "3502", "universal:aluminio:l35", "Marco", 19521, "000000986"],
  ["TI3501A", "3501", "universal:aluminio:l35", "Bastidor", 35622, "000000986"],
  ["TI3503A", "3503", "universal:aluminio:l35", "Junquillo", 4675, "000000986"],
  ["TI3509A", "3509", "universal:aluminio:l35", "Traslapo", 12319, "000000986"],
  ["TI3508A", "3508", "universal:aluminio:l35", "Bastidor", 25664, "000000986"],
  ["RO3506P", "3506", "universal:aluminio:l35", "Tapa", 6101, "000000986"],
  ["RO3507P", "3507", "universal:aluminio:l35", "Portafelpa", 7255, "000000986"],
  ["TI4502A", "4502", "universal:aluminio:l45", "Marco puerta", 20274, "000000986"],
  ["TI4511A", "4511", "universal:aluminio:l45", "Marco puerta", 21471, "000000986"],
];

const profileByKey = new Map<string, { code: string; name: string; familyKey: FamilyKey }>();
for (const [, technicalCode, familyKey, profileName] of rows) {
  const technicalKey = `alumco:${familyKey}:${technicalCode}`;
  const current = profileByKey.get(technicalKey);
  if (current && (current.name !== profileName || current.familyKey !== familyKey)) {
    throw new Error(`El código ${technicalCode} tiene más de una identidad en el lote Alumco.`);
  }
  profileByKey.set(technicalKey, { code: technicalCode, name: profileName, familyKey });
}

function evidence(sourceReference: string, note: string) {
  return {
    sourceReference,
    page: null,
    observedAs: "derived" as const,
    confidence: "medium" as const,
    note,
  };
}

const technicalInputs: SupplierCatalogImport["technicalInputs"] = [...profileByKey.entries()].map(([technicalKey, profile]) => ({
  technicalKey,
  sourceCode: profile.code,
  name: profile.name,
  material: "Aluminio",
  sectionMm: null,
  familyKeys: [profile.familyKey],
  ...(profile.code === "4502" ? { recipeComponentCodes: ["4522"] } : {}),
  evidence: evidence(
    sourceByInvoice[rows.find((row) => `alumco:${row[2]}:${row[1]}` === technicalKey)![5]],
    `Código y precio se transcriben de la nota de venta Alumco. El titular precisa en el catálogo Alumco que 2509 es Jamba cerrada y 2510 Pierna cerrada; son las referencias exactas de las variantes L25 de pierna cerrada. El enlace a ${profile.familyKey} usa el código de línea explícito y no crea ni altera fórmula de fabricación.${profile.code === "4502" ? " El vínculo de código de receta 4502→4522 ya está documentado explícitamente para Línea 45." : ""}`,
  ),
}));

const presentations: SupplierCatalogImport["presentations"] = rows.map(([sku, code, familyKey, name, netPrice, invoice]) => {
  const source = sourceByInvoice[invoice];
  const finishIndependent = sku === "RO3506P" || sku === "RO3507P";
  return {
    sku,
    description: `${familyKey.replace("universal:aluminio:", "Serie ")} · ${name}`,
    technicalKey: `alumco:${familyKey}:${code}`,
    finishResolution: finishIndependent ? "finish_independent" : "specific",
    finishCode: finishIndependent ? null : "TI",
    finishName: finishIndependent ? null : "Titanio",
    purchaseUnit: "TR",
    commercialLengthMm: 6000,
    netPrice,
    currency: "CLP",
    associationEvidence: evidence(
      source,
      `SKU ${sku}, código ${code}, descripción y unidad TR observados en la nota de venta ${invoice} (14-10-2026). Se vinculó solo a ${familyKey}. ${code === "2509" || code === "2510" ? "El titular precisa en el catálogo Alumco que 2509 es Jamba cerrada y 2510 Pierna cerrada; solo corresponden a las variantes L25 cerradas que usan esos códigos. No se aplican a pierna abierta (2503/2506)." : ""} ${finishIndependent ? "El titular confirma que Tapa y Portafelpa (RO3506P/RO3507P) no dependen físicamente del color; se registran independientes del acabado y no como perfiles de color." : `El SKU ${sku} conserva su identidad física de acabado Titanio (TI).`} Largo de 6.000 mm confirmado por el titular. No se deduce ningún sistema de despiece.`,
    ),
    priceEvidence: {
      ...evidence(
        source,
        `Precio por tira transcrito de la columna PRECIO de la nota ${invoice} del 14-10-2026: CLP netos ${netPrice}. El titular confirma que los precios de perfiles Alumco aplican a todos sus colores y se mantienen hasta que una lista nueva los actualice. La vigencia impresa de 7 días corresponde a la cotización/oferta, no al precio de los perfiles. ${finishIndependent ? "La identidad física de Tapa y Portafelpa es independiente del color." : `El SKU ${sku} y su identidad física observada corresponden a Titanio (TI); esa identidad no se extiende a otros acabados.`} La suma de filas del documento coincide con su NETO. No se aplica otro descuento de pronto pago; la nota incluye una condición de pronto pago, pero no un segundo precio unitario.`,
      ),
      finishApplicability: "all_finishes" as const,
    },
  };
});

const netTotalsByInvoice = new Map<string, number>();
for (const row of rows) netTotalsByInvoice.set(row[5], (netTotalsByInvoice.get(row[5]) ?? 0) + row[4]);
if (rows.length !== 42 || netTotalsByInvoice.get("000000984") !== 336551 || netTotalsByInvoice.get("000000986") !== 347792) {
  throw new Error("El conteo o neto transcrito de las notas Alumco no coincide; detener importación.");
}

export const ALUMCO_ALUMINIO_NOTAS_VENTA_2026_10_14: SupplierCatalogImport = {
  supplierKey: "alumco",
  supplierName: "Alumco",
  manufacturerName: "Alumco NOR Limitada (continuidad comercial de ALAR)",
  catalogRevision: "alumco-notas-venta-perfiles-2026-10-14-v1",
  technicalSourcePublisher: "Alumco NOR Limitada",
  catalogSourceReference: `${sourceByInvoice["000000984"]}; ${sourceByInvoice["000000986"]}`,
  priceListName: "Alumco · Notas 000000984 y 000000986 · 14-10-2026",
  priceListRevision: "notas-000000984-000000986-2026-10-14",
  priceListPublishedOn: "2026-10-14",
  priceListValidUntil: null,
  priceListSourceReference: `${sourceByInvoice["000000984"]}; ${sourceByInvoice["000000986"]}. Los 7 días impresos corresponden a la cotización/oferta, no a la vigencia del precio de perfiles. Por confirmación del titular, estos precios Alumco aplican a todos los colores hasta que otra lista los actualice. Los SKU TI conservan identidad física Titanio. El descuento de pronto pago es condicional y no se vuelve a aplicar a los importes por fila.`,
  priceListPriceBasis: "commercial_presentation",
  priceListCurrency: "CLP",
  technicalInputs,
  presentations,
};

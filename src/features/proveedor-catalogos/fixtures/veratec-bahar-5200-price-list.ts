import type { SupplierCatalogImport } from "../schemas/catalogo-import.schema";

const priceSource = "docs/fabricacion/veratec/MATERIALES PRECIO VERATEC.xlsx#BAHAR!A1:I62";
const familyKey = "veratec:bahar-5200";

function profileInput(technicalKey: string, sourceCode: string, name: string) {
  return {
    technicalKey,
    sourceCode,
    name,
    material: "PVC",
    sectionMm: null,
    familyKeys: [familyKey],
    recipeComponentCodes: [sourceCode],
    evidence: {
      sourceReference: priceSource,
      page: null,
      observedAs: "observed" as const,
      confidence: "high" as const,
      note: "Código, descripción Bahar y largo de presentación transcritos de la hoja de precios; su uso en receta se restringe a los códigos que coinciden literalmente con la pauta.",
    },
  };
}

type ProfileKey = "frame" | "inner-window" | "outer-window" | "t-bar" | "outer-door" | "inner-door" | "reverser" | "bead-4" | "bead-18" | "bead-24";
type FinishRow = readonly [sku: string, finishCode: string, finishName: string, netPrice: number];

const profiles: ReadonlyArray<{
  key: ProfileKey;
  code: string;
  name: string;
  rows: readonly FinishRow[];
}> = [
  { key: "frame", code: "65201VER", name: "Marco fijo Bahar", rows: [["65201VER000", "000", "Blanco", 21790], ["65201VER153", "153", "Nogal", 36984], ["65201VER043", "043", "Roble dorado", 36984], ["65201VER199", "199", "Antracita", 36984], ["65201VER200", "200", "Negro", 45259]] },
  { key: "inner-window", code: "65212VER", name: "Hoja de ventana interior Bahar", rows: [["65212VER000", "000", "Blanco", 27493], ["65212VER153", "153", "Nogal", 45406], ["65212VER043", "043", "Roble dorado", 45406], ["65212VER199", "199", "Antracita", 45406], ["65212VER200", "200", "Negro", 55563]] },
  { key: "outer-window", code: "65209VER", name: "Hoja de ventana exterior Bahar", rows: [["65209VER000", "000", "Blanco", 27299], ["65209VER153", "153", "Nogal", 44648], ["65209VER043", "043", "Roble dorado", 44648], ["65209VER199", "199", "Antracita", 44648], ["65209VER200", "200", "Negro", 54571]] },
  { key: "t-bar", code: "65203VER", name: "Barra T Bahar", rows: [["65203VER000", "000", "Blanco", 27166], ["65203VER153", "153", "Nogal", 45851], ["65203VER043", "043", "Roble dorado", 45851], ["65203VER199", "199", "Antracita", 45851], ["65203VER200", "200", "Negro", 56097]] },
  { key: "outer-door", code: "65210VER", name: "Hoja de puerta exterior Bahar", rows: [["65210VER000", "000", "Blanco", 33151], ["65210VER153", "153", "Nogal", 57050], ["65210VER043", "043", "Roble dorado", 57050], ["65210VER199", "199", "Antracita", 57050], ["65210VER200", "200", "Negro", 69759]] },
  { key: "inner-door", code: "65204VER", name: "Hoja de puerta interior Bahar", rows: [["65204VER000", "000", "Blanco", 35469], ["65204VER153", "153", "Nogal", 63808], ["65204VER043", "043", "Roble dorado", 63808], ["65204VER199", "199", "Antracita", 63808], ["65204VER200", "200", "Negro", 78002]] },
  { key: "reverser", code: "65207VER", name: "Batiente Bahar", rows: [["65207VER000", "000", "Blanco", 25800], ["65207VER153", "153", "Nogal", 45019], ["65207VER043", "043", "Roble dorado", 45019], ["65207VER199", "199", "Antracita", 51328], ["65207VER200", "200", "Negro", 54952]] },
  { key: "bead-4", code: "67088VER", name: "Junquillo Bahar · vidrio 4 mm", rows: [["67088VER000", "000", "Blanco", 6668], ["67088VER153", "153", "Nogal", 12923], ["67088VER043", "043", "Roble dorado", 12923], ["67088VER199", "199", "Antracita", 12923], ["67088VER200", "200", "Negro", 15875]] },
  { key: "bead-18", code: "67063VER", name: "Junquillo Bahar · vidrio 18 mm", rows: [["67063VER000", "000", "Blanco", 5183], ["67063VER153", "153", "Nogal", 10441], ["67063VER043", "043", "Roble dorado", 10441], ["67063VER199", "199", "Antracita", 10441], ["67063VER200", "200", "Negro", 12746]] },
  { key: "bead-24", code: "67464VER", name: "Junquillo Bahar · vidrio 24 mm", rows: [["67464VER000", "000", "Blanco", 4635], ["67464VER153", "153", "Nogal", 8662], ["67464VER043", "043", "Roble dorado", 8662], ["67464VER199", "199", "Antracita", 8662], ["67464VER200", "200", "Negro", 11525]] },
];

const technicalInputs: SupplierCatalogImport["technicalInputs"] = profiles.map((row) =>
  profileInput(`veratec:bahar-5200:${row.key}`, row.code, row.name)
);

const presentations: SupplierCatalogImport["presentations"] = profiles.flatMap((row) =>
  row.rows.map(([sku, finishCode, finishName, netPrice]) => ({
    sku,
    description: `${row.name} ${finishName}`,
    technicalKey: `veratec:bahar-5200:${row.key}`,
    finishResolution: "specific" as const,
    finishCode,
    finishName,
    purchaseUnit: "M",
    commercialLengthMm: 5800,
    netPrice,
    currency: "CLP",
    associationEvidence: {
      sourceReference: priceSource,
      page: null,
      observedAs: "observed" as const,
      confidence: "high" as const,
      note: "SKU, nombre, acabado y largo leídos de la misma fila de la hoja BAHAR; el código solo se asocia a la descripción literal.",
    },
    priceEvidence: {
      sourceReference: priceSource,
      page: null,
      observedAs: "observed" as const,
      confidence: "high" as const,
      note: "Precio de lista NETO transcrito de la columna E. Se conserva la fuente y fecha del libro como procedencia; no es un precio de venta al cliente.",
    },
  }))
);

export const VERATEC_BAHAR_5200_PRICE_LIST_IMPORT: SupplierCatalogImport = {
  // Se agrega a la lista compartida que ya consume Mis precios. La evidencia
  // individual de cada valor sigue apuntando al Excel Bahar de origen.
  supplierKey: "xelena",
  supplierName: "Xelena",
  manufacturerName: "Veratec",
  familyKey,
  catalogRevision: "veratec-bahar-52mm-price-source",
  technicalSourcePublisher: "Veratec",
  catalogSourceReference: priceSource,
  priceListName: "Lista de precios Xelena / Veratec · junio 2026",
  priceListRevision: "2026-06",
  priceListPublishedOn: null,
  priceListValidUntil: null,
  priceListSourceReference: "xelena:lista-precios:2026-06",
  priceListPriceBasis: "commercial_presentation",
  priceListCurrency: "CLP",
  technicalInputs,
  presentations,
};

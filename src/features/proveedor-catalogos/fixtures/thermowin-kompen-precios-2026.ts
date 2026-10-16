import type { SupplierCatalogImport } from "../schemas/catalogo-import.schema";

type Finish = { code: string; name: string };
type Profile = {
  familyKey: "thermowin:kom-700" | "thermowin:kom-800" | "thermowin:americana-s70";
  code: string;
  name: string;
  material: "PVC" | "Acero" | "Aluminio";
  source: string;
  page: number | null;
  purchaseUnit: "TR" | "UN";
};

const PRICE_SOURCES = {
  p700Nogal: "price/LÍNEA 700 PARA VENTANA FIJA COLOR NOGAL.jpeg",
  p700Anthracite: "price/VENTANA PROYECTANTE LÍNEA 700 COLOR ANTRACITA.jpeg",
  p800AnthraciteMono: "price/LÍNEA 800 COLOR ANTRACITA  UNA CORREDERA.jpeg",
  p800AnthraciteDouble: "price/LÍNEA 800 DOBLE CORREDERA COLOR ANTRACITA.jpeg",
  p800Nogal: "price/LÍNEA 800 EUROPEA COLOR NOGAL DOBLE RIEL O DOBLE CORREDERA.jpeg",
  p800White: "price/Línea 800 y 700 corredera y fija Color Blanco.jpeg",
  p800NogalMono: "price/Misma línea 800 pero en Monorriel (una corredera).jpeg",
  p800Reinforcements: "price/Agregar la Aleta y los Refuerzos-linea800.jpeg",
  americanaS70: "price/linea-Americana.jpeg",
  americanaMullion: "price/AGREGAR ESTE PERFIL  MULLION ES EL PERFIL PARA HACER DIVICIONES. CÓMO EL PALILLO.jpeg",
} as const;

const profiles: Profile[] = [
  { familyKey: "thermowin:kom-700", code: "KOM 701", name: "Marco fijo Euro 701", material: "PVC", source: "NUEVA PRIME LINE 700 2025 (2).pdf", page: 2, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-700", code: "R701", name: "Refuerzo marco fijo / poste", material: "Acero", source: "NUEVA PRIME LINE 700 2025 (2).pdf", page: 2, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-700", code: "KOM 607", name: "Junquillo 607 TP 18–21 mm", material: "PVC", source: "NUEVA PRIME LINE 700 2025 (2).pdf", page: 15, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-700", code: "KOM 427/701", name: "Aleta perimetral 427/701", material: "PVC", source: PRICE_SOURCES.p700Nogal, page: null, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-700", code: "KOM 709", name: "Hoja ventana exterior 709", material: "PVC", source: "NUEVA PRIME LINE 700 2025 (2).pdf", page: 7, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-700", code: "R709", name: "Refuerzo hoja ventana 709", material: "Acero", source: "NUEVA PRIME LINE 700 2025 (2).pdf", page: 7, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-700", code: "KOM 617", name: "Junquillo monolítico 617 de 4–6 mm", material: "PVC", source: "NUEVA PRIME LINE 700 2025 (2).pdf", page: 15, purchaseUnit: "TR" },

  { familyKey: "thermowin:kom-800", code: "KOM 801", name: "Marco doble riel 801", material: "PVC", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 2, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "KOM 802", name: "Marco monorriel 802", material: "PVC", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 3, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "KOM 804", name: "Hoja ventana corredera 804", material: "PVC", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 4, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "R802T", name: "Refuerzo tubular marco monorriel 802", material: "Acero", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 3, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "KOM 822", name: "Traslapo fijo monorriel 822", material: "PVC", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 6, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "R822", name: "Refuerzo de traslapo fijo 822", material: "Acero", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 6, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "KOM 817", name: "Traslapo ventana corredera 817", material: "PVC", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 9, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "KOM 506", name: "Junquillo 506 TP 18–20 mm", material: "PVC", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 8, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "KOM 826", name: "Cubrecristal monorriel 826 para felpa", material: "PVC", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 7, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "KOM 505", name: "Junquillo 505 para vidrio 4–6 mm", material: "PVC", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 8, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "KOM 426/801", name: "Aleta perimetral 426/801", material: "PVC", source: PRICE_SOURCES.p800White, page: null, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "R801T", name: "Refuerzo tubular de marco doble/triple riel 801", material: "Acero", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 2, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "R804", name: "Refuerzo de hoja ventana corredera 804", material: "Acero", source: "NUEVO FORM LINE 800 2025 (1).pdf", page: 4, purchaseUnit: "TR" },
  { familyKey: "thermowin:kom-800", code: "Riel 800", name: "Riel de aluminio 800", material: "Aluminio", source: PRICE_SOURCES.p800White, page: null, purchaseUnit: "TR" },
  { familyKey: "thermowin:americana-s70", code: "70-001", name: "Marco fijo corredero S-70 blanco", material: "PVC", source: "NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf", page: 2, purchaseUnit: "UN" },
  { familyKey: "thermowin:americana-s70", code: "70-002", name: "Mullion S-70 blanco", material: "PVC", source: PRICE_SOURCES.americanaMullion, page: null, purchaseUnit: "UN" },
  { familyKey: "thermowin:americana-s70", code: "70-003", name: "Traslapo fijo S-70 blanco", material: "PVC", source: "NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf", page: 3, purchaseUnit: "UN" },
  { familyKey: "thermowin:americana-s70", code: "70-004", name: "Traslapo móvil S-70 blanco", material: "PVC", source: "NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf", page: 3, purchaseUnit: "UN" },
  { familyKey: "thermowin:americana-s70", code: "70-005", name: "Hoja corredera S-70 blanco", material: "PVC", source: "NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf", page: 3, purchaseUnit: "UN" },
  { familyKey: "thermowin:americana-s70", code: "70-006", name: "Riel guía S-70 blanco", material: "PVC", source: "NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf", page: 3, purchaseUnit: "UN" },
  { familyKey: "thermowin:americana-s70", code: "70-007", name: "Junquillo simple S-70 blanco", material: "PVC", source: PRICE_SOURCES.americanaS70, page: null, purchaseUnit: "UN" },
  { familyKey: "thermowin:americana-s70", code: "R70-003", name: "Refuerzo S-70 traslapo fijo", material: "Acero", source: "NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf", page: 3, purchaseUnit: "UN" },
  { familyKey: "thermowin:americana-s70", code: "R70-004", name: "Refuerzo S-70 traslapo móvil", material: "Acero", source: "NUEVO CATALOGO LINEA AMERICANA S-70 TW 2022.pdf", page: 3, purchaseUnit: "UN" },
];

const finish = {
  blanco: { code: "0003", name: "Blanco" },
  blancoS70: { code: "BLANCO", name: "Blanco" },
  nogal: { code: "3154", name: "Nogal" },
  antracita: { code: "ANTRACITA", name: "Antracita" },
  negro: { code: "NEGRO", name: "Negro" },
  mate: { code: "MATE", name: "Mate" },
} satisfies Record<string, Finish>;

type PricedRow = {
  technicalCode: string;
  finish?: Finish;
  sku?: string;
  price: number;
  source: string;
  purchaseUnit?: "TR" | "UN";
};

const rows: PricedRow[] = [
  { technicalCode: "KOM 701", finish: finish.nogal, sku: "701-3154", price: 31421, source: PRICE_SOURCES.p700Nogal },
  { technicalCode: "KOM 701", finish: finish.blanco, sku: "701-0003", price: 18831, source: PRICE_SOURCES.p800White },
  { technicalCode: "KOM 701", finish: finish.antracita, price: 32993, source: PRICE_SOURCES.p700Anthracite },
  { technicalCode: "R701", price: 8003, source: PRICE_SOURCES.p700Nogal },
  { technicalCode: "KOM 607", finish: finish.nogal, sku: "607-3154", price: 9940, source: PRICE_SOURCES.p700Nogal },
  { technicalCode: "KOM 607", finish: finish.antracita, price: 10436, source: PRICE_SOURCES.p700Anthracite },
  { technicalCode: "KOM 427/701", finish: finish.nogal, sku: "427-3154", price: 15796, source: PRICE_SOURCES.p700Nogal },
  { technicalCode: "KOM 427/701", finish: finish.blanco, sku: "427-0003", price: 12981, source: PRICE_SOURCES.p800White },
  { technicalCode: "KOM 427/701", finish: finish.antracita, price: 16587, source: PRICE_SOURCES.p700Anthracite },
  { technicalCode: "KOM 709", finish: finish.antracita, price: 43109, source: PRICE_SOURCES.p700Anthracite },
  { technicalCode: "R709", price: 7318, source: PRICE_SOURCES.p700Anthracite },
  { technicalCode: "KOM 617", finish: finish.blanco, sku: "617-0003", price: 7008, source: PRICE_SOURCES.p800White },

  { technicalCode: "KOM 801", finish: finish.nogal, sku: "801-3154", price: 39194, source: PRICE_SOURCES.p800Nogal },
  { technicalCode: "KOM 801", finish: finish.blanco, sku: "801-0003", price: 22838, source: PRICE_SOURCES.p800White },
  { technicalCode: "KOM 801", finish: finish.antracita, price: 41154, source: PRICE_SOURCES.p800AnthraciteDouble },
  { technicalCode: "KOM 802", finish: finish.antracita, price: 53934, source: PRICE_SOURCES.p800AnthraciteMono },
  { technicalCode: "KOM 804", finish: finish.nogal, sku: "804-3154", price: 43088, source: PRICE_SOURCES.p800Nogal },
  { technicalCode: "KOM 804", finish: finish.blanco, sku: "804-0003", price: 25740, source: PRICE_SOURCES.p800White },
  { technicalCode: "KOM 804", finish: finish.antracita, price: 45243, source: PRICE_SOURCES.p800AnthraciteDouble },
  { technicalCode: "R802T", finish: finish.antracita, price: 16725, source: PRICE_SOURCES.p800AnthraciteMono },
  { technicalCode: "KOM 822", finish: finish.nogal, sku: "822-3154", price: 44848, source: PRICE_SOURCES.p800NogalMono },
  { technicalCode: "KOM 822", finish: finish.antracita, price: 47090, source: PRICE_SOURCES.p800AnthraciteMono },
  { technicalCode: "R822", price: 16200, source: PRICE_SOURCES.p800AnthraciteMono },
  { technicalCode: "KOM 817", finish: finish.nogal, sku: "817-3154", price: 17689, source: PRICE_SOURCES.p800Nogal },
  { technicalCode: "KOM 817", finish: finish.blanco, sku: "817-0003", price: 7382, source: PRICE_SOURCES.p800White },
  { technicalCode: "KOM 817", finish: finish.antracita, price: 18574, source: PRICE_SOURCES.p800AnthraciteDouble },
  { technicalCode: "KOM 506", finish: finish.nogal, sku: "506-3154", price: 8388, source: PRICE_SOURCES.p800Nogal },
  { technicalCode: "KOM 506", finish: finish.antracita, price: 8807, source: PRICE_SOURCES.p800AnthraciteDouble },
  { technicalCode: "KOM 826", finish: finish.antracita, price: 14226, source: PRICE_SOURCES.p800AnthraciteMono },
  { technicalCode: "KOM 505", finish: finish.blanco, sku: "505-0003", price: 4516, source: PRICE_SOURCES.p800White },
  { technicalCode: "KOM 426/801", finish: finish.nogal, price: 14703, source: PRICE_SOURCES.p800Reinforcements },
  { technicalCode: "KOM 426/801", finish: finish.blanco, sku: "426-0003", price: 11886, source: PRICE_SOURCES.p800White },
  { technicalCode: "KOM 426/801", finish: finish.antracita, price: 15437, source: PRICE_SOURCES.p800AnthraciteDouble },
  { technicalCode: "R801T", price: 10158, source: PRICE_SOURCES.p800White },
  { technicalCode: "R804", price: 8214, source: PRICE_SOURCES.p800White },
  { technicalCode: "Riel 800", finish: finish.negro, sku: "R800-8518", price: 6948, source: PRICE_SOURCES.p800Nogal },
  { technicalCode: "Riel 800", finish: finish.mate, sku: "R800-0003", price: 6948, source: PRICE_SOURCES.p800White },
  { technicalCode: "70-001", finish: finish.blancoS70, sku: "70-001", price: 11025, source: PRICE_SOURCES.americanaS70, purchaseUnit: "UN" },
  { technicalCode: "70-002", finish: finish.blancoS70, sku: "70-002", price: 15191, source: PRICE_SOURCES.americanaMullion, purchaseUnit: "UN" },
  { technicalCode: "70-003", finish: finish.blancoS70, sku: "70-003", price: 7350, source: PRICE_SOURCES.americanaS70, purchaseUnit: "UN" },
  { technicalCode: "70-004", finish: finish.blancoS70, sku: "70-004", price: 5444, source: PRICE_SOURCES.americanaS70, purchaseUnit: "UN" },
  { technicalCode: "70-005", finish: finish.blancoS70, sku: "70-005", price: 4729, source: PRICE_SOURCES.americanaS70, purchaseUnit: "UN" },
  { technicalCode: "70-006", finish: finish.blancoS70, sku: "70-006", price: 2089, source: PRICE_SOURCES.americanaS70, purchaseUnit: "UN" },
  { technicalCode: "70-007", finish: finish.blancoS70, sku: "70-007", price: 1045, source: PRICE_SOURCES.americanaS70, purchaseUnit: "UN" },
  { technicalCode: "R70-003", sku: "R70-003", price: 9404, source: PRICE_SOURCES.americanaS70, purchaseUnit: "UN" },
  { technicalCode: "R70-004", sku: "R70-004", price: 8451, source: PRICE_SOURCES.americanaS70, purchaseUnit: "UN" },
];

const technicalKeys = new Map(profiles.map((profile) => [profile.code, `${profile.familyKey}:${profile.code}`]));
const profileByCode = new Map(profiles.map((profile) => [profile.code, profile]));

function evidence(sourceReference: string, note: string, confidence: "high" | "medium" = "high") {
  return { sourceReference, page: null, observedAs: "observed" as const, confidence, note };
}

const technicalInputs: SupplierCatalogImport["technicalInputs"] = profiles.map((profile) => ({
  technicalKey: technicalKeys.get(profile.code)!,
  sourceCode: profile.code,
  name: profile.name,
  material: profile.material,
  sectionMm: null,
  familyKeys: [profile.familyKey],
  evidence: evidence(
    profile.source,
    `Código y nombre documentados en ${profile.source}${profile.page ? `, pág. ${profile.page}` : ""}; familia delimitada por el catálogo Thermowin Kompen. Esta referencia no declara fórmula ni equivalencia de despiece.`,
  ),
}));

const presentations: SupplierCatalogImport["presentations"] = rows.map((row) => {
  const profile = profileByCode.get(row.technicalCode);
  if (!profile) throw new Error(`Falta perfil técnico para ${row.technicalCode}`);
  const isFinishIndependent = !row.finish;
  const generatedSku = row.sku ?? `${row.technicalCode.replace(/\s+/g, "")}${row.finish ? `-${row.finish.code}` : ""}`;
  const fallbackSku = !row.sku;
  const description = `${profile.name}${row.finish ? ` · ${row.finish.name}` : ""}`;
  return {
    sku: generatedSku,
    description,
    technicalKey: technicalKeys.get(row.technicalCode)!,
    finishResolution: isFinishIndependent ? "finish_independent" as const : "specific" as const,
    finishCode: row.finish?.code ?? null,
    finishName: row.finish?.name ?? null,
    purchaseUnit: row.purchaseUnit ?? profile.purchaseUnit,
    commercialLengthMm: 6000,
    netPrice: row.price,
    currency: "CLP",
    associationEvidence: evidence(
      `${row.source} + ${profile.source}`,
      fallbackSku
        ? `El código del perfil, acabado, precio y unidad ${row.purchaseUnit ?? profile.purchaseUnit} aparecen en la imagen. La columna SKU quedó recortada; se crea la referencia interna ${generatedSku} para identificar esta combinación, no se afirma que sea el SKU impreso por Thermowin. Largo de 6000 mm indicado por el usuario. ${profile.material} según el catálogo de perfiles.`
        : `SKU/código, perfil, acabado y unidad ${row.purchaseUnit ?? profile.purchaseUnit} identificados en la imagen; el código técnico se cruza con ${profile.source}${profile.page ? `, pág. ${profile.page}` : ""}. Largo de 6000 mm indicado por el usuario.`,
      fallbackSku ? "medium" : "high",
    ),
    priceEvidence: evidence(
      row.source,
      `Precio unitario neto CLP ${row.price} por ${row.purchaseUnit ?? profile.purchaseUnit}${(row.purchaseUnit ?? profile.purchaseUnit) === "TR" ? " de 6000 mm" : ""}. Vigente durante 2026 según confirmación del usuario. No es precio comercial por m².`,
      "high",
    ),
  };
});

if (technicalInputs.length !== profiles.length || presentations.length !== 46 || presentations.some((row) => row.currency !== "CLP" || row.netPrice === null || row.commercialLengthMm !== 6000)) {
  throw new Error("Cambió el conteo o contrato de precios Thermowin Kompen; revisar antes de publicar.");
}

export const THERMOWIN_KOMPEN_PRECIOS_2026: SupplierCatalogImport = {
  supplierKey: "thermowin-kompen",
  supplierName: "Thermowin Kompen",
  manufacturerName: "Kompen",
  catalogRevision: "thermowin-kompen-perfiles-2026-v1",
  technicalSourcePublisher: "Thermowin Kompen",
  catalogSourceReference: "Catálogos Prime Line 700, Form Line 800 y Americana S-70 incluidos en docs/fabricacion/Kompen Thermowin/; imágenes de precios de docs/fabricacion/Kompen Thermowin/price.",
  priceListName: "Thermowin Kompen · Perfiles · 2026",
  priceListRevision: "2026",
  priceListPublishedOn: null,
  priceListValidUntil: null,
  priceListSourceReference: "Imágenes de precios Thermowin Kompen en docs/fabricacion/Kompen Thermowin/price; precios vigentes desde 2026 y netos CLP según confirmación del usuario. Se conserva la unidad TR o UN visible en cada fila. Largo 6000 mm según indicación del usuario; no aparece en las imágenes.",
  priceListPriceBasis: "commercial_presentation",
  priceListCurrency: "CLP",
  technicalInputs,
  presentations,
};


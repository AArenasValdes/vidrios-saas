import type { SupplierCatalogImport } from "../schemas/catalogo-import.schema";

type Profile = readonly [code: string, name: string, page?: number];
type Family = { key: string; catalogFamilyKey: string; page: number; recipeExcludedCodes?: readonly string[]; recipeComponentCodesByCode?: Readonly<Record<string, readonly string[]>>; profiles: readonly Profile[] };

const families: readonly Family[] = [
  { key: "ventora:serie-15-corredera-2h", catalogFamilyKey: "universal:aluminio:l15", page: 6, recipeExcludedCodes: ["1507"], recipeComponentCodesByCode: { "1508": ["1507"] }, profiles: [["1501", "Riel superior"], ["1502", "Riel inferior"], ["1503", "Jamba"], ["1504", "Cabezal"], ["1505", "Zócalo"], ["1506", "Pierna con aleta"], ["1507", "Pierna"], ["1508", "Traslapo"]] },
  { key: "ventora:l20", catalogFamilyKey: "universal:aluminio:l20", page: 8, profiles: [["2001", "Riel superior"], ["2002", "Riel inferior"], ["2003", "Jamba"], ["2004", "Cabezal"], ["2005", "Zócalo"], ["2006", "Pierna abierta"], ["2009", "Jamba", 9], ["2010", "Pierna", 9], ["2013", "Riel cámara de agua", 8], ["2014", "Riel portafelpa", 9], ["2016", "Traslapo termopanel", 8], ["2017", "Pierna termopanel 20", 9], ["2018", "Zócalo y cabezal termopanel", 9], ["2019", "Traslapo", 8]] },
  { key: "ventora:l25", catalogFamilyKey: "universal:aluminio:l25", page: 10, profiles: [["2501", "Riel superior"], ["2502", "Riel inferior"], ["2503", "Jamba abierta"], ["2504", "Cabezal"], ["2505", "Zócalo"], ["2506", "Pierna abierta"], ["2507", "Traslapo", 11], ["2509", "Jamba abierta monolítico", 12], ["2510", "Pierna cerrada monolítico", 12], ["2513", "Riel portafelpa", 12], ["2514", "Riel portafelpa", 12], ["2517", "Pierna abierta termopanel", 12], ["2518", "Pierna cerrada termopanel", 12], ["2519", "Traslapo termopanel", 11], ["2529", "Pierna reforzada termopanel", 11], ["2530", "Traslapo reforzado termopanel", 11], ["2541", "Riel superior 3 líneas", 11], ["2542", "Riel inferior 3 líneas", 11], ["2544", "Acople", 12], ["2545", "Pierna reforzada termopanel"], ["2549", "Jamba 3 líneas", 12], ["2581", "Traslapo reforzado monolítico", 11], ["2582", "Adaptador para cristal monolítico"]] },
  { key: "ventora:serie-4000-corredera-2h", catalogFamilyKey: "universal:aluminio:l4000", page: 14, recipeComponentCodesByCode: { "4001": ["4002"], "4002": ["4003"], "4003": ["4005"], "4004": ["4008"], "4005": ["4004"], "4007": ["4009"], "4008": ["4007"] }, profiles: [["4001", "Riel superior"], ["4002", "Riel inferior"], ["4003", "Jamba"], ["4004", "Cabezal"], ["4005", "Zócalo"], ["4007", "Traslapo"], ["4008", "Pierna con aleta"]] },
  { key: "ventora:l5000", catalogFamilyKey: "universal:aluminio:l5000", page: 16, profiles: [["5001", "Riel superior"], ["5002", "Riel inferior"], ["5003", "Jamba"], ["5004", "Cabezal"], ["5005", "Zócalo"], ["5006", "Pierna"], ["5007", "Traslapo"]] },
  { key: "ventora:l35", catalogFamilyKey: "universal:aluminio:l35", page: 18, profiles: [["3501", "Bastidor"], ["3502", "Marco"], ["3503", "Junquillo 45°"], ["3506", "Tapa lisa"], ["3507", "Tapa portafelpa"], ["3508", "Bastidor liviano"], ["3509", "Traslapo"]] },
  { key: "ventora:serie-45-puerta", catalogFamilyKey: "universal:aluminio:l45", page: 20, recipeComponentCodesByCode: { "4502": ["4522"], "4504": ["4534"] }, profiles: [["4502", "Marco"], ["4504", "Junquillo"], ["4511", "Marco redondeado"]] },
  { key: "ventora:serie-12-shower-corredera", catalogFamilyKey: "universal:aluminio:l12", page: 21, profiles: [["1201", "Riel inferior"], ["1202", "Jamba"], ["1203", "Riel superior"], ["1204", "Bastidor hoja"]] },
  // Universal family identity links same-numbered aluminum systems across suppliers. Arquetipo
  // presentation resolves through the shared family key; role/code exclusions remain
  // explicit where source codes do not match recipe roles.
  { key: "ventora:l32", catalogFamilyKey: "universal:aluminio:l32", page: 22, profiles: [["3201", "Marco"], ["3202", "Hoja"], ["3204", "Palillo"], ["3205", "Marco cámara de agua"], ["3208", "Junquillo"]] },
  { key: "ventora:l42", catalogFamilyKey: "universal:aluminio:l42", page: 24, profiles: [["4202", "Hoja"], ["4204", "Palillo"], ["4206", "Junquillo termopanel"], ["4209", "Marco paño fijo"], ["4229", "Junquillo monolítico"], ["4231", "Marco cámara de agua"]] },
];

const quoteRows = [
  ["5001", "30895001", "Riel superior", 13477, 1], ["5002", "30895002", "Riel inferior", 12230, 1], ["5004", "30895004", "Cabezal", 13399, 1], ["5005", "30895005", "Zócalo", 15970, 1], ["5003", "30895003", "Jamba", 14256, 1], ["5006", "30895006", "Pierna", 14412, 1], ["5007", "30895007", "Traslapo", 13477, 1],
  ["2001", "30892001", "Riel superior", 21189, 1], ["2002", "30892002", "Riel inferior", 18852, 1], ["2004", "30892004", "Cabezal", 15580, 1], ["2005", "30892005", "Zócalo", 18151, 1], ["2009", "30892009", "Jamba", 16826, 1], ["2010", "30892010", "Batiente cerrado", 16982, 1], ["2019", "30892019", "Traslapo reforzado", 16203, 1],
  ["2501", "30892501", "Riel superior", 27888, 1], ["2502", "30892502", "Riel inferior", 26876, 1], ["2504", "30892504", "Cabezal", 18384, 1], ["2505", "30892505", "Zócalo", 26097, 1], ["2509", "30892509", "Jamba", 20877, 1], ["2510", "30892510", "Pierna", 20721, 1], ["2507", "30892507", "Traslapo", 20799, 1],
  ["3201", "30893201", "Marco", 11658, 2], ["3202", "30893202", "Hoja", 18319, 2], ["3208", "30893208", "Junquillo", 5299, 2], ["3204", "30893204", "Pilar / Palillo (revisar nombre)", 20590, 2],
  ["4209", "30894209", "Marco fijo", 15140, 2], ["4202", "30894202", "Hoja", 24375, 2], ["4204", "30894204", "Pilar / Palillo (revisar nombre)", 29447, 2], ["4229", "30894229", "Junquillo monolítico", 6510, 2],
] as const;

type PriceQuote = { sku: string; quoteName: string; price: number; page: number };
const quotedCodes = new Set(quoteRows.map(([code]) => code));
const pricedByCode = new Map<string, PriceQuote>(quoteRows.map(([code, sku, quoteName, price, page]) => [code, { sku, quoteName, price, page }]));

const technicalInputs: SupplierCatalogImport["technicalInputs"] = families.flatMap((family) => family.profiles.map(([code, name, pageOverride]) => {
  const page = pageOverride ?? family.page;
  return ({
  technicalKey: `arquetipo:${family.key}:${code}`,
  sourceCode: code,
  name,
  material: "Aluminio",
  sectionMm: null,
    familyKeys: [family.catalogFamilyKey],
    ...(family.recipeComponentCodesByCode?.[code] ? { recipeComponentCodes: [...family.recipeComponentCodesByCode[code]] } : {}),
    ...(family.recipeExcludedCodes?.includes(code) ? { excludedRecipeFamilyKeys: [family.catalogFamilyKey] } : {}),
  evidence: {
    sourceReference: "arquetipo:catalogo-perfiles-aluminio:v1",
    page,
    observedAs: family.recipeComponentCodesByCode?.[code] ? "derived" : "observed",
    confidence: family.recipeComponentCodesByCode?.[code] || family.recipeExcludedCodes?.includes(code) ? "medium" : "high",
    note: `Código ${code} y nombre de perfil transcritos del catálogo Arquetipo, pág. ${page}. La revisión del catálogo no aparece impresa; esta es la captura importada el 2026-10-05. La ficha no aporta fórmula de corte para este perfil.${family.recipeComponentCodesByCode?.[code] ? " Código de receta vinculado explícitamente por coincidencia de rol descrita en catálogo y equivalencia universal declarada por el taller." : ""}${family.recipeExcludedCodes?.includes(code) ? " Se conserva aislado porque el nombre del perfil no coincide con el rol de receta." : ""}`,
  },
  });
}));

const presentations: SupplierCatalogImport["presentations"] = families.flatMap((family) => family.profiles.map(([code, name, pageOverride]) => {
  const profilePage = pageOverride ?? family.page;
  const quoted = pricedByCode.get(code);
  const description = quoted?.quoteName ?? name;
  const ambiguous = code === "3204" || code === "4204" || code === "2010" || code === "2019";
  return {
    sku: quoted?.sku ?? code,
    description,
    technicalKey: `arquetipo:${family.key}:${code}`,
    // The user intentionally chose the highest Arquetipo finish as a conservative
    // reference price for every finish, so it must not block on the quote item's color.
    finishResolution: "finish_independent",
    finishCode: null,
    finishName: null,
    purchaseUnit: "TIRA",
    // The user requested a 6 m default. The quote itself does not state this length.
    commercialLengthMm: 6000,
    netPrice: quoted?.price ?? null,
    currency: "CLP",
    associationEvidence: {
      sourceReference: quoted ? "arquetipo:catalogo-perfiles-aluminio:v1+cot-27811-2026-10-01" : "arquetipo:catalogo-perfiles-aluminio:v1",
      page: profilePage,
      observedAs: quoted ? "derived" : "observed",
      confidence: ambiguous ? "medium" : "high",
      note: ambiguous
        ? `La cotización y el catálogo Arquetipo presentan descripciones distintas para el código ${code} (“${quoted?.quoteName ?? "sin precio"}” / “${name}”). Se conserva la asociación por código y se mantiene visible la discrepancia; no se mapea a otro rol de receta.`
        : quoted
          ? `Cruce explícito por código ${code} entre el catálogo de perfiles de la línea y SKU ${quoted.sku} de la cotización Arquetipo 27811; coincidencia por código, sin derivar por nombre. El precio LEGNO se usa como referencia conservadora para todos los acabados por instrucción del usuario.`
          : `Presentación técnica de referencia creada a partir del perfil ${code} del catálogo. Sin precio cotizado para este código; disponibilidad por acabado pendiente. El largo 6000 mm es el valor predeterminado solicitado por el usuario, no una medida confirmada por esta fuente.`,
    },
    priceEvidence: quoted ? {
      sourceReference: "arquetipo:cotizacion-27811:2026-10-01",
      page: quoted.page,
      observedAs: "observed",
      confidence: "high",
      note: `Precio neto CLP ${quoted.price} por presentación TIRA, cotizado para acabado LEGNO en Arquetipo 27811 del 2026-10-01 y adoptado como referencia conservadora para cualquier acabado por instrucción del usuario. Vigencia no indicada; es referencia de compra, no tarifa general del proveedor. El largo de 6000 mm es predeterminado solicitado por el usuario y no está indicado en la cotización.`,
    } : null,
  };
}));

const pricedPresentations = presentations.filter((presentation) => presentation.netPrice !== null);
const netPriceTotal = pricedPresentations.reduce((total, presentation) => total + (presentation.netPrice ?? 0), 0);
if (families.length !== 10 || technicalInputs.length !== 84 || presentations.length !== 84 || pricedPresentations.length !== 29 || netPriceTotal !== 513984 || quotedCodes.size !== 29) {
  throw new Error("La matriz Arquetipo cambió de conteo o total; detener y revisar antes de importar.");
}

export const ARQUETIPO_CATALOGO_2026_10_05: SupplierCatalogImport = {
  supplierKey: "arquetipo",
  supplierName: "Distribuidora Arquetipo",
  manufacturerName: "Fabricantes varios; no especificados uniformemente por fuente",
  catalogRevision: "arquetipo-catalogo-perfiles-importado-2026-10-05-v1",
  technicalSourcePublisher: "Distribuidora Arquetipo",
  catalogSourceReference: "Arquetipo_Catalogo_Aluminios.pdf, págs. 6, 8–12, 14, 16, 18, 20–22 y 24; sin revisión impresa.",
  priceListName: "Arquetipo · Cotización 27811 · LEGNO · referencia de compra",
  priceListRevision: "cot-27811-2026-10-01-legno",
  priceListPublishedOn: "2026-10-01",
  priceListValidUntil: null,
  priceListSourceReference: "cot 27811.pdf, págs. 1–2. Cotización de compra referencial; vigencia no indicada. Se publica globalmente por instrucción del usuario.",
  priceListPriceBasis: "commercial_presentation",
  priceListCurrency: "CLP",
  technicalInputs,
  presentations,
};

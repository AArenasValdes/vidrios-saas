import type { SupplierCatalogImport } from "../schemas/catalogo-import.schema";

const source = (sourceReference: string, page: number | null, note: string) => ({
  sourceReference,
  page,
  observedAs: "observed" as const,
  confidence: "high" as const,
  note,
});

const derivedLink = (sourceReference: string, page: number, note: string) => ({
  sourceReference,
  page,
  observedAs: "derived" as const,
  confidence: "medium" as const,
  note,
});

const technicalInputs: SupplierCatalogImport["technicalInputs"] = [
  {
    technicalKey: "veratec-7400:marco-2h",
    sourceCode: "7401",
    name: "Marco corredera 2 hojas",
    material: "PVC",
    sectionMm: null,
    familyKeys: ["veratec:sliding-7400"],
    evidence: source(
      "alumetrica:veratec-7400:2h:monolitico-4mm:v1",
      null,
      "El expediente de Alumétrica identifica 7401 como marco de 2 hojas; sus secciones publicadas discrepan con el díptico Xelena, por lo que no se asigna una sección al insumo. La asociación usa identidad descriptiva y familia, no sufijos de SKU."
    ),
    recipeComponentCodes: ["67401VER"],
  },
  {
    technicalKey: "veratec-7400:hoja-grande",
    sourceCode: "7414",
    name: "Hoja corredera grande",
    material: "PVC",
    sectionMm: [52, 93],
    familyKeys: ["veratec:sliding-7400"],
    evidence: source(
      "alumetrica:veratec-7400:2h:monolitico-4mm:v1",
      null,
      "El expediente registra el insumo 7414; el catálogo Xelena describe la hoja grande y muestra la sección 52×93."
    ),
  },
  {
    technicalKey: "veratec-7400:traslapo-grande",
    sourceCode: "7418",
    name: "Traslapo hoja corredera grande",
    material: "PVC",
    sectionMm: [55.4, 52],
    familyKeys: ["veratec:sliding-7400"],
    evidence: source(
      "alumetrica:veratec-7400:2h:monolitico-4mm:v1",
      null,
      "El expediente registra el insumo 7418; el catálogo Xelena muestra el traslapo grande de la familia 7400."
    ),
  },
  {
    technicalKey: "veratec:junquillo-4mm",
    sourceCode: "6306",
    name: "Junquillo para vidrio 4 mm",
    material: "PVC",
    sectionMm: [35, 20],
    familyKeys: ["veratec:sliding-7400", "veratec:elegans-60"],
    evidence: source(
      "xelena:diptico-pvc:pages-2-and-4",
      4,
      "El expediente de receta identifica 6306 como junquillo de 4 mm; el díptico Xelena identifica 66306VER como junquillo de 4 mm en Sliding 7400 (p. 4) y Elegans 60 (p. 2). Se registra 6306 como alias funcional explícito solo para 4 mm; no se genera su correspondencia por sufijo ni se extiende a 5 mm."
    ),
    recipeComponentCodes: ["6306"],
  },
  {
    technicalKey: "veratec-7400:refuerzo-marco-corredera",
    sourceCode: "69014STL001",
    name: "Refuerzo marco corredera 7400",
    material: "Acero",
    sectionMm: null,
    familyKeys: ["veratec:sliding-7400"],
    evidence: source(
      "xelena:pendon-veratec:v2604",
      1,
      "El pendón identifica con el mismo código el refuerzo del marco de corredera 7400."
    ),
  },
  {
    technicalKey: "veratec-7400:refuerzo-hoja-grande",
    sourceCode: "69069STL000",
    name: "Refuerzo hoja corredera grande",
    material: "Acero",
    sectionMm: null,
    familyKeys: ["veratec:sliding-7400"],
    evidence: source(
      "xelena:pendon-veratec:v2604",
      1,
      "El pendón identifica el refuerzo de hoja grande 69069STL000 y la lista repite exactamente ese código."
    ),
  },
  {
    technicalKey: "veratec-7400:riel-sliding",
    sourceCode: "61016VER001",
    name: "Riel Sliding 7400",
    material: "Aluminio",
    sectionMm: null,
    familyKeys: ["veratec:sliding-7400"],
    recipeComponentCodes: ["AB01016-E", "61016ver"],
    evidence: source(
      "xelena:pendon-veratec:v2604",
      1,
      "El pendón identifica Riel Sliding 61016VER001 en Sliding 7400. Se vincula funcionalmente con el consumo de receta AB01016-E denominado Riel y con el código de origen de la pauta Excel 61016ver; ambos códigos de origen se conservan como aliases funcionales explícitos y no se declaran equivalentes literales al SKU. 61016VER000 es Tope estanco Compact Sliding, no este riel."
    ),
  },
  {
    technicalKey: "veratec-7400:tope-estanco-sliding",
    sourceCode: "61012VER000",
    name: "Tope estanco Sliding 2 rieles",
    material: "PVC",
    sectionMm: null,
    familyKeys: ["veratec:sliding-7400"],
    recipeAccessoryNames: ["Tope Corredera"],
    evidence: derivedLink(
      "xelena:pendon-veratec:v2604",
      1,
      "El pendón ubica Tope Estanco Sliding 2 Rieles en la familia Sliding 7400; la lista de junio publica 61012VER000 como Tope estanco Sliding blanco. Se asocia funcionalmente al consumo Tope Corredera de la receta de la misma familia. No se asocia al consumo distinto Goma Tope Corredera."
    ),
  },
];

function presentation(input: {
  technicalKey: string;
  sku: string;
  description: string;
  finishCode: string | null;
  finishName: string | null;
  finishResolution: "specific" | "finish_independent";
  lengthMm: number;
  price: number;
  page: number;
  associationNote: string;
  associationSourceReference?: string;
  associationSourcePage?: number;
}): SupplierCatalogImport["presentations"][number] {
  return {
    sku: input.sku,
    description: input.description,
    technicalKey: input.technicalKey,
    finishCode: input.finishCode,
    finishName: input.finishName,
    finishResolution: input.finishResolution ?? "specific",
    purchaseUnit: "M",
    commercialLengthMm: input.lengthMm,
    netPrice: input.price,
    currency: "CLP",
    associationEvidence: derivedLink(
      input.associationSourceReference ?? "xelena:diptico-pvc:sliding-7400",
      input.associationSourcePage ?? 4,
      input.associationNote
    ),
    priceEvidence: source(
      "xelena:lista-precios:2026-06",
      input.page,
      "SKU, descripción, acabado, unidad, largo y precio neto transcritos de la fila de la lista. El administrador del catálogo confirma CLP y que el precio neto corresponde a la presentación comercial completa; confirmación conservada como metadata interna."
    ),
  };
}

function finishRows(input: {
  technicalKey: string;
  description: string;
  page: number;
  associationNote: string;
  finishResolution?: "specific" | "finish_independent";
  associationSourceReference?: string;
  associationSourcePage?: number;
  variants: Array<[string, string | null, string | null, number, number]>;
}) {
  return input.variants.map(([sku, finishCode, finishName, lengthM, price]) =>
    presentation({
      technicalKey: input.technicalKey,
      sku,
      description: finishName ? `${input.description} ${finishName}` : input.description,
      finishCode,
      finishName,
      finishResolution: input.finishResolution ?? "specific",
      lengthMm: lengthM * 1000,
      price,
      page: input.page,
      associationNote: input.associationNote,
      associationSourceReference: input.associationSourceReference,
      associationSourcePage: input.associationSourcePage,
    })
  );
}

const presentations: SupplierCatalogImport["presentations"] = [
  ...finishRows({
    technicalKey: "veratec-7400:marco-2h",
    description: "Marco corredera 2 hojas",
    page: 5,
    associationNote: "Asociación funcional derivada, no equivalencia literal de códigos: el expediente conserva 7401 como origen; el díptico Xelena p. 4 identifica 67401VER como Marco Corredera 2 Hojas y la lista junio 2026 p. 5 publica sus SKU por acabado. La discrepancia de sección del expediente sigue pendiente; esta asociación no valida la geometría ni la receta.",
    variants: [
      ["67401VER000", "000", "Blanco", 5.8, 31476],
      ["67401VER153", "153", "Nogal", 5.8, 58612],
      ["67401VER043", "043", "Roble Dorado", 5.8, 58612],
      ["67401VER199", "199", "Antracita", 5.8, 58069],
      ["67401VER200", "200", "Negro", 6.8, 85259],
      ["67401VER079", "079", "Negro Mate", 6.8, 85259],
    ],
  }),
  ...finishRows({
    technicalKey: "veratec-7400:hoja-grande",
    description: "Hoja corredera grande sliding",
    page: 5,
    associationNote: "La descripción ‘Hoja corredera grande’ y la sección 52×93 coinciden entre el catálogo de la línea 7400 y la lista bajo Sistema Sliding 7400.",
    variants: [
      ["67414VER000", "000", "Blanco", 5.8, 39033],
      ["67414VER153", "153", "Nogal", 5.8, 66830],
      ["67414VER043", "043", "Roble Dorado", 5.8, 66830],
      ["67414VER199", "199", "Antracita", 5.8, 66830],
      ["67414VER200", "200", "Negro", 5.8, 83381],
      ["67414VER079", "079", "Negro Mate", 5.8, 83381],
    ],
  }),
  ...finishRows({
    technicalKey: "veratec-7400:traslapo-grande",
    description: "Traslapo corredera grande sliding",
    page: 6,
    associationNote: "La descripción del traslapo grande y la sección 55,4×52 coinciden entre el catálogo y la lista de Sliding 7400.",
    variants: [
      ["67418VER000", "000", "Blanco", 5.8, 12601],
      ["67418VER153", "153", "Nogal", 5.8, 26366],
      ["67418VER043", "043", "Roble Dorado", 5.8, 26366],
      ["67418VER199", "199", "Antracita", 5.8, 26366],
      ["67418VER200", "200", "Negro", 5.8, 32176],
      ["67418VER079", "079", "Negro Mate", 5.8, 32176],
    ],
  }),
  ...finishRows({
    technicalKey: "veratec:junquillo-4mm",
    description: "Junquillo vidrio 4 mm sliding",
    page: 7,
    associationNote: "El SKU lleva el código de perfil publicado 66306VER y la descripción de junquillo 4 mm; el díptico muestra el mismo perfil técnico en Elegans 60 y Sliding 7400.",
    variants: [
      ["66306VER000", "000", "Blanco", 5.8, 7582],
      ["66306VER153", "153", "Nogal", 5.8, 16163],
      ["66306VER043", "043", "Roble Dorado", 5.8, 16163],
    ],
  }),
  ...finishRows({
    technicalKey: "veratec-7400:refuerzo-marco-corredera",
    description: "Refuerzo marco corredera",
    page: 12,
    finishResolution: "finish_independent",
    associationSourceReference: "xelena:pendon-veratec:v2604",
    associationSourcePage: 1,
    associationNote: "El pendón identifica 69014STL001 como refuerzo marco corredera 7400 y la lista publica el SKU con el mismo código.",
    variants: [["69014STL001", null, null, 5.8, 14635]],
  }),
  ...finishRows({
    technicalKey: "veratec-7400:refuerzo-hoja-grande",
    description: "Refuerzo hoja corredera grande",
    page: 12,
    finishResolution: "finish_independent",
    associationSourceReference: "xelena:pendon-veratec:v2604",
    associationSourcePage: 1,
    associationNote: "El pendón identifica 69069STL000 como refuerzo hoja corredera grande 7400 y la lista publica el mismo código.",
    variants: [["69069STL000", null, null, 5.8, 14176]],
  }),
  ...finishRows({
    technicalKey: "veratec-7400:riel-sliding",
    description: "Riel Sliding",
    page: 5,
    finishResolution: "finish_independent",
    associationSourceReference: "xelena:pendon-veratec:v2604",
    associationSourcePage: 1,
    associationNote: "El pendón identifica Riel Sliding 61016VER001 dentro de Sliding 7400 y la lista publica el mismo SKU. Es independiente del acabado. El vínculo funcional al código de consumo de receta se registra por separado y no como equivalencia literal.",
    variants: [["61016VER001", null, null, 5.8, 10940]],
  }),
  {
    sku: "61012VER000",
    description: "Tope estanco Sliding blanco",
    technicalKey: "veratec-7400:tope-estanco-sliding",
    finishResolution: "specific",
    finishCode: "000",
    finishName: "Blanco",
    purchaseUnit: "PCS",
    commercialLengthMm: null,
    netPrice: 1076,
    currency: "CLP",
    associationEvidence: derivedLink(
      "xelena:pendon-veratec:v2604",
      1,
      "El pendón identifica Tope Estanco Sliding 2 Rieles dentro de Sliding 7400; la correspondencia de consumo Tope Corredera se registra explícitamente en la metadata del insumo técnico."
    ),
    priceEvidence: source(
      "xelena:lista-precios:2026-06",
      9,
      "SKU 61012VER000, Tope estanco Sliding blanco, PCS x 1, $1.076 netos. El administrador confirma CLP y precio neto por presentación; confirmación guardada solo en metadata interna."
    ),
  },
];

export const VERATEC_7400_JUNIO_2026_IMPORT: SupplierCatalogImport = {
  supplierKey: "xelena",
  supplierName: "Xelena",
  manufacturerName: "Veratec",
  familyKey: "veratec:sliding-7400",
  catalogRevision: "alumetrica-veratec-7400-2026-09-21-v1",
  technicalSourcePublisher: "Alumétrica",
  catalogSourceReference: "alumetrica:veratec-7400:2h:monolitico-4mm:v1",
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


import type { SupplierCatalogImport } from "../schemas/catalogo-import.schema";

const technicalEvidence = (page: number, note: string) => ({
  sourceReference: "xelena:diptico-pvc:2026",
  page,
  observedAs: "observed" as const,
  confidence: "high" as const,
  note,
});

const associationEvidence = (page: number, name: string) => ({
  sourceReference: "xelena:diptico-pvc:2026",
  page,
  observedAs: "derived" as const,
  confidence: "high" as const,
  note: `La referencia técnica y la descripción de lista corresponden a ${name}; asociación transcrita explícitamente desde ambas fuentes, sin regla de sufijo.`,
});

const priceEvidence = (page: number) => ({
  sourceReference: "xelena:lista-precios:2026-06",
  page,
  observedAs: "observed" as const,
  confidence: "high" as const,
  note: "SKU, descripción, acabado, unidad, largo y precio NETO transcritos de la fila. CLP y base por presentación completa confirmados por el administrador del catálogo.",
});

type TechnicalRow = SupplierCatalogImport["technicalInputs"][number];
type PresentationRow = SupplierCatalogImport["presentations"][number];

function technical(input: {
  key: string;
  code: string;
  name: string;
  page: number;
  families: string[];
  note?: string;
  material?: string;
  recipeComponentCodes?: string[];
  technicalSourceReference?: string;
  evidenceConfidence?: "high" | "medium" | "low";
}): TechnicalRow {
  return {
    technicalKey: input.key,
    sourceCode: input.code,
    name: input.name,
    material: input.material ?? "PVC",
    sectionMm: null,
    familyKeys: input.families,
    ...(input.recipeComponentCodes?.length
      ? { recipeComponentCodes: input.recipeComponentCodes }
      : {}),
    evidence: {
      ...technicalEvidence(input.page, input.note ?? "Código y nombre leídos directamente del díptico; se registra como referencia técnica y no como receta o geometría validada."),
      ...(input.technicalSourceReference
        ? { sourceReference: input.technicalSourceReference }
        : {}),
      ...(input.evidenceConfidence ? { confidence: input.evidenceConfidence } : {}),
    },
  };
}

type Variant = readonly [sku: string, finishCode: string, finishName: string, lengthM: number, price: number];

function pricedProfile(input: {
  technicalKey: string;
  description: string;
  technicalPage: number;
  pricePage: number;
  variants: readonly Variant[];
}): PresentationRow[] {
  return input.variants.map(([sku, finishCode, finishName, lengthM, netPrice]) => ({
    sku,
    description: `${input.description} ${finishName}`,
    technicalKey: input.technicalKey,
    finishResolution: "specific",
    finishCode,
    finishName,
    purchaseUnit: "M",
    commercialLengthMm: lengthM * 1000,
    netPrice,
    currency: "CLP",
    associationEvidence: associationEvidence(input.technicalPage, input.description),
    priceEvidence: priceEvidence(input.pricePage),
  }));
}

function independentPresentation(input: {
  technicalKey: string;
  sku: string;
  description: string;
  technicalPage: number;
  pricePage: number;
  lengthM: number;
  netPrice: number;
  associationSourceReference?: string;
  associationSourcePage?: number;
  associationNote?: string;
}): PresentationRow {
  return {
    sku: input.sku,
    description: input.description,
    technicalKey: input.technicalKey,
    finishResolution: "finish_independent",
    finishCode: null,
    finishName: null,
    purchaseUnit: "M",
    commercialLengthMm: input.lengthM * 1000,
    netPrice: input.netPrice,
    currency: "CLP",
    associationEvidence: input.associationNote
      ? {
          sourceReference: input.associationSourceReference ?? "xelena:pendon-veratec:v2604",
          page: input.associationSourcePage ?? input.technicalPage,
          observedAs: "derived",
          confidence: "high",
          note: input.associationNote,
        }
      : associationEvidence(input.technicalPage, input.description),
    priceEvidence: priceEvidence(input.pricePage),
  };
}

const elegans = "veratec:elegans-60";
const compact = "veratec:compact-sliding";
const sliding = "veratec:sliding-7400";
const inova = "veratec:inova";
const eko130 = "veratec:eko-130";
const eko82 = "veratec:eko-82";

const technicalInputs: TechnicalRow[] = [
  technical({ key: "veratec:elegans-60:marco-fijo", code: "66311VER", name: "Elegans 60 · Marco fijo", page: 2, families: [elegans] }),
  technical({ key: "veratec:elegans-60:hoja-ventana-exterior", code: "66312VER", name: "Elegans 60 · Hoja de ventana exterior", page: 2, families: [elegans] }),
  technical({ key: "veratec:elegans-60:barra-t", code: "66313VER", name: "Elegans 60 · Barra T", page: 2, families: [elegans] }),
  technical({ key: "veratec:elegans-60:hoja-ventana-interior", code: "66403VER", name: "Elegans 60 · Hoja de ventana interior", page: 2, families: [elegans] }),
  technical({ key: "veratec:elegans-60:hoja-puerta-interior", code: "66404VER", name: "Elegans 60 · Hoja de puerta interior", page: 2, families: [elegans] }),
  technical({ key: "veratec:elegans-60:hoja-puerta-exterior", code: "66048VER", name: "Elegans 60 · Hoja de puerta exterior", page: 2, families: [elegans] }),
  technical({ key: "veratec:elegans-60:perfil-inversor", code: "66044VER", name: "Elegans 60 · Perfil inversor", page: 2, families: [elegans] }),
  technical({
    key: "veratec:elegans-60:refuerzo-hoja-puerta-interior",
    code: "69048STL000",
    name: "Elegans 60 · Refuerzo hoja puerta interior",
    page: 12,
    families: [elegans],
    technicalSourceReference: "xelena:lista-precios:2026-06",
    evidenceConfidence: "high",
    note: "La lista oficial nombra explícitamente el refuerzo de hoja de puerta interior Elegans. Se registra como insumo de catálogo; no se agrega a una receta ni se deduce su uso en otras configuraciones.",
  }),
  technical({
    key: "veratec:elegans-60:refuerzo-hoja-ventana-exterior",
    code: "69018STL000",
    name: "Elegans 60 · Refuerzo hoja ventana exterior",
    page: 12,
    families: [elegans],
    technicalSourceReference: "xelena:lista-precios:2026-06",
    evidenceConfidence: "high",
    note: "La lista oficial nombra explícitamente el refuerzo de hoja de ventana exterior Elegans. Se registra como insumo de catálogo; no se agrega a una receta ni se deduce su uso en otras configuraciones.",
  }),
  technical({
    key: "veratec:elegans-60:refuerzo-marco-fijo",
    code: "69019STL000",
    name: "Elegans 60 · Refuerzo marco fijo",
    page: 12,
    families: [elegans],
    technicalSourceReference: "xelena:lista-precios:2026-06",
    evidenceConfidence: "high",
    note: "La lista oficial nombra explícitamente el refuerzo de marco fijo Elegans. Se registra como insumo de catálogo; no se agrega a una receta ni se deduce su uso en otras configuraciones.",
  }),
  technical({
    key: "veratec:elegans-60:refuerzo-puerta-exterior",
    code: "69076STL000",
    name: "Elegans 60 · Refuerzo puerta exterior",
    page: 12,
    families: [elegans],
    technicalSourceReference: "xelena:lista-precios:2026-06",
    evidenceConfidence: "high",
    note: "La lista oficial nombra explícitamente el refuerzo de puerta exterior Elegans. Se registra como insumo de catálogo; no se agrega a una receta ni se deduce su uso en otras configuraciones.",
  }),
  technical({ key: "veratec:elegans-60:junquillo-10mm", code: "67088VER", name: "Elegans 60 · Junquillo vidrio 10 mm", page: 2, families: [elegans] }),
  technical({ key: "veratec:junquillo-20mm", code: "66307VER", name: "Junquillo vidrio 20 mm", page: 2, families: [elegans, sliding], note: "El mismo código/nombre aparece en Elegans 60 (pág. 2) y Sliding 7400 (pág. 4); un solo insumo técnico tiene ambas relaciones de familia." }),
  technical({ key: "veratec:junquillo-24mm", code: "67063VER", name: "Junquillo vidrio 24 mm", page: 2, families: [elegans, sliding], note: "El mismo código/nombre aparece en Elegans 60 (pág. 2) y Sliding 7400 (pág. 4); un solo insumo técnico tiene ambas relaciones de familia." }),
  technical({ key: "veratec:compact-sliding:marco-2h", code: "67460VER", name: "Compact Sliding · Marco corredera 2 hojas", page: 3, families: [compact] }),
  technical({
    key: "veratec:compact-sliding:riel",
    code: "61013VER001",
    name: "Compact Sliding · Riel",
    page: 3,
    families: [compact],
    recipeComponentCodes: ["61013ver"],
    note: "El díptico y la lista identifican el Riel Compact Sliding oficial como 61013VER001. El Excel escribe 61013ver como código de origen del riel; se guarda como alias funcional explícito y no como transformación de sufijo. 61013VER000 es Tope estanco monorriel, no este riel.",
  }),
  technical({ key: "veratec:compact-sliding:hoja", code: "67461VER", name: "Compact Sliding · Hoja corredera", page: 3, families: [compact] }),
  technical({ key: "veratec:compact-sliding:traslapo", code: "67463VER", name: "Compact Sliding · Traslapo hoja corredera", page: 3, families: [compact] }),
  technical({ key: "veratec:compact-sliding:junquillo-4mm", code: "67062VER", name: "Compact Sliding · Junquillo vidrio 4 mm", page: 3, families: [compact] }),
  technical({ key: "veratec:compact-sliding:junquillo-20mm", code: "67464VER", name: "Compact Sliding · Junquillo vidrio 20 mm", page: 3, families: [compact] }),
  technical({ key: "veratec:compact-sliding:cuarta-hoja", code: "61014VER001", name: "Compact Sliding · Cuarta hoja", page: 9, families: [compact], technicalSourceReference: "xelena:lista-precios:2026-06", evidenceConfidence: "high", note: "La lista oficial nombra explícitamente Cuarta hoja Compact Sliding. Se registra como perfil comercial de familia, sin fórmula ni asociación a receta." }),
  technical({
    key: "veratec:compact-sliding:refuerzo-marco",
    code: "69083STL001",
    name: "Compact Sliding · Refuerzo de marco",
    page: 3,
    families: [compact, sliding],
    material: "Acero",
    technicalSourceReference: "pauta-de-corte-veratec.xlsx+xelena:lista-precios:2026-06",
    evidenceConfidence: "high",
    note: "El libro de pauta asigna 69083STL001 al marco Compact Sliding y el pendón/lista de precios lo describen como refuerzo marco Compact/monorriel; se conserva un único insumo con ambas familias explícitas.",
  }),
  technical({
    key: "veratec:compact-sliding:refuerzo-hoja",
    code: "69041STL000",
    name: "Compact Sliding · Refuerzo de hoja corredera",
    page: 3,
    families: [compact],
    material: "Acero",
    technicalSourceReference: "pauta-de-corte-veratec.xlsx+xelena:lista-precios:2026-06",
    evidenceConfidence: "high",
    note: "El libro asigna 69041STL000 a la hoja Compact; el catálogo de refuerzos lo describe como refuerzo de hoja corredera.",
  }),
  technical({
    key: "veratec:7400:refuerzo-hoja-chica",
    code: "69071STL000",
    name: "Sliding 7400 · Refuerzo de hoja chica",
    page: 4,
    families: [sliding],
    material: "Acero",
    technicalSourceReference: "pauta-de-corte-veratec.xlsx+xelena:pendon-veratec:v2604",
    evidenceConfidence: "high",
    note: "El libro de pauta y el pendón identifican el refuerzo de hoja chica 69071STL000; la lista de junio repite el código exacto.",
  }),
  technical({
    key: "veratec:7400:refuerzo-marco-tres-rieles",
    code: "69026STL000",
    name: "Sliding 7400 · Refuerzo marco 3 rieles",
    page: 12,
    families: [sliding],
    material: "Acero",
    technicalSourceReference: "xelena:lista-precios:2026-06",
    evidenceConfidence: "high",
    note: "La lista oficial nombra explícitamente el refuerzo de marco 3 rieles 7400. Se registra como insumo de catálogo; no se agrega a una receta ni se deduce su uso en 2H o monorriel.",
  }),
  technical({
    key: "veratec:7400:refuerzo-monorriel",
    code: "69060STL001",
    name: "Sliding 7400 · Refuerzo de monorriel",
    page: 4,
    families: [sliding],
    material: "Acero",
    technicalSourceReference: "pauta-de-corte-veratec.xlsx+xelena:pendon-veratec:v2604",
    evidenceConfidence: "high",
    note: "El libro de pauta para monorriel y la lista de refuerzos nombran 69060STL001 como refuerzo de monorriel.",
  }),
  technical({ key: "veratec:7400:zapata-aluminio", code: "67412VER001", name: "Sliding 7400 · Zapata de aluminio", page: 9, families: [sliding], material: "Aluminio", technicalSourceReference: "xelena:lista-precios:2026-06", evidenceConfidence: "high", note: "La lista oficial identifica el producto como Zapata de aluminio Sliding 7400. Se registra como referencia de catálogo/precio, no como geometría o consumo de receta." }),
  technical({ key: "veratec:7400:cuarta-hoja", code: "61004VER003", name: "Sliding 7400 · Cuarta hoja", page: 1, families: [sliding], technicalSourceReference: "xelena:pendon-veratec:v2604", note: "El pendón p. 1 identifica Cuarta Hoja Sliding y la lista junio 2026 p. 9 repite SKU, descripción, largo y precio. Referencia comercial de familia; no se asocia a una receta 4H sin evidencia de corte." }),
  technical({ key: "veratec:7400:marco-monorriel", code: "67411VER", name: "Sliding 7400 · Marco monorriel", page: 4, families: [sliding] }),
  technical({ key: "veratec:7400:marco-triple-riel", code: "67413VER", name: "Sliding 7400 · Marco corredera 3 hojas", page: 4, families: [sliding] }),
  technical({ key: "veratec:7400:hoja-chica", code: "67415VER", name: "Sliding 7400 · Hoja corredera chica", page: 4, families: [sliding] }),
  technical({ key: "veratec:7400:barra-t", code: "67416VER", name: "Sliding 7400 · Barra T corredera", page: 4, families: [sliding] }),
  technical({ key: "veratec:7400:traslapo-chico", code: "67419VER", name: "Sliding 7400 · Traslapo hoja corredera chica", page: 4, families: [sliding] }),
  technical({ key: "veratec:7400:remate-monorriel", code: "67405VER", name: "Sliding 7400 · Remate monorriel", page: 4, families: [sliding] }),
  technical({ key: "veratec:inova:marco", code: "61471VER", name: "Inova · Marco", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:hoja", code: "61472VER", name: "Inova · Hoja", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:barra-t", code: "67636VER", name: "Inova · Barra T", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:remate-cubre-canal", code: "61473VER", name: "Inova · Remate cubre canal", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:tapa-traslapo", code: "61474VER", name: "Inova · Tapa traslapo", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:junquillo", code: "67651VER", name: "Inova · Junquillo", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:refuerzo-69091", code: "69091STL001", name: "Inova · Refuerzo", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:refuerzo-69089", code: "69089STL000", name: "Inova · Refuerzo", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:refuerzo-69092", code: "69092STL000", name: "Inova · Refuerzo", page: 5, families: [inova] }),
  technical({ key: "veratec:inova:refuerzo-69093", code: "69093STL000", name: "Inova · Refuerzo", page: 5, families: [inova] }),
  technical({ key: "veratec:eko-130:marco", code: "61109EKO000", name: "EKO 130 · Marco Americana PD130", page: 7, families: [eko130] }),
  technical({ key: "veratec:eko-130:traslapo-movil", code: "61110EKO000", name: "EKO 130 · Traslapo móvil PD130", page: 7, families: [eko130] }),
  technical({ key: "veratec:eko-130:hoja-lateral", code: "61112EKO000", name: "EKO 130 · Hoja móvil lateral PD130", page: 7, families: [eko130] }),
  technical({ key: "veratec:eko-130:marco-hoja", code: "61113EKO000", name: "EKO 130 · Marco hoja móvil", page: 7, families: [eko130] }),
  technical({ key: "veratec:eko-130:traslapo-fijo", code: "61114EKO000", name: "EKO 130 · Traslapo fijo", page: 7, families: [eko130] }),
  technical({ key: "veratec:eko-130:riel", code: "61115EKO000", name: "EKO 130 · Riel", page: 7, families: [eko130] }),
  technical({ key: "veratec:eko-130:junquillo-simple", code: "61116EKO000", name: "EKO 130 · Junquillo vidrio simple", page: 7, families: [eko130] }),
  technical({ key: "veratec:eko-130:junquillo-termo", code: "61117EKO000", name: "EKO 130 · Junquillo termopanel", page: 7, families: [eko130] }),
  technical({ key: "veratec:eko-82:marco", code: "61101EKO000", name: "EKO 82 · Marco Americana", page: 7, families: [eko82] }),
  technical({ key: "veratec:eko-82:hoja-movil", code: "61102EKO000", name: "EKO 82 · Hoja móvil", page: 7, families: [eko82] }),
  technical({ key: "veratec:eko-82:traslapo-movil", code: "61103EKO000", name: "EKO 82 · Traslapo móvil", page: 7, families: [eko82] }),
  technical({ key: "veratec:eko-82:traslapo-fijo", code: "61104EKO000", name: "EKO 82 · Traslapo fijo", page: 7, families: [eko82] }),
  technical({ key: "veratec:eko-82:riel", code: "61105EKO000", name: "EKO 82 · Riel Americana / antepecho", page: 7, families: [eko82] }),
  technical({ key: "veratec:eko-82:junquillo-termo", code: "61106EKO000", name: "EKO 82 · Junquillo termopanel", page: 7, families: [eko82] }),
  technical({ key: "veratec:eko-82:junquillo-simple", code: "61107EKO000", name: "EKO 82 · Junquillo vidrio simple", page: 7, families: [eko82] }),
  technical({ key: "veratec:eko-82:hoja-guillotina", code: "61108EKO000", name: "EKO 82 · Hoja guillotina", page: 7, families: [eko82] }),
];

const presentations: PresentationRow[] = [
  ...pricedProfile({ technicalKey: "veratec:elegans-60:marco-fijo", description: "Elegans Marco Fijo", technicalPage: 2, pricePage: 1, variants: [
    ["66311VER000", "000", "Blanco", 5.8, 26156], ["66311VER153", "153", "Nogal", 5.8, 46340], ["66311VER043", "043", "Roble Dorado", 5.8, 46340], ["66311VER199", "199", "Antracita", 5.8, 46340], ["66311VER200", "200", "Negro", 5.8, 50029], ["66311VER079", "079", "Negro Mate", 5.8, 50029],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:elegans-60:hoja-ventana-interior", description: "Elegans Hoja de ventana interior", technicalPage: 2, pricePage: 1, variants: [
    ["66403VER000", "000", "Blanco", 5.8, 32344], ["66403VER153", "153", "Nogal", 5.8, 58726], ["66403VER043", "043", "Roble Dorado", 5.8, 58726], ["66403VER199", "199", "Antracita", 5.8, 58726], ["66403VER200", "200", "Negro", 5.8, 64265], ["66403VER079", "079", "Negro Mate", 5.8, 64265],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:elegans-60:hoja-ventana-exterior", description: "Elegans Hoja ventana exterior", technicalPage: 2, pricePage: 1, variants: [
    ["66312VER000", "000", "Blanco", 5.8, 34067], ["66312VER153", "153", "Nogal", 5.8, 59018], ["66312VER043", "043", "Roble Dorado", 5.8, 59018], ["66312VER199", "199", "Antracita", 5.8, 59018], ["66312VER200", "200", "Negro", 5.8, 64584], ["66312VER079", "079", "Negro Mate", 5.8, 64584],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:elegans-60:barra-t", description: "Elegans Barra T", technicalPage: 2, pricePage: 1, variants: [
    ["66313VER000", "000", "Blanco", 5.8, 31452], ["66313VER153", "153", "Nogal", 5.8, 55738], ["66313VER043", "043", "Roble Dorado", 5.8, 55738], ["66313VER199", "199", "Antracita", 5.8, 55738], ["66313VER200", "200", "Negro", 5.8, 60995], ["66313VER079", "079", "Negro Mate", 6.8, 60995],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:elegans-60:hoja-puerta-exterior", description: "Elegans Hoja de puerta exterior", technicalPage: 2, pricePage: 2, variants: [
    ["66048VER000", "000", "Blanco", 5.8, 52377], ["66048VER153", "153", "Nogal", 5.8, 82552], ["66048VER043", "043", "Roble Dorado", 5.8, 82552], ["66048VER199", "199", "Antracita", 5.8, 82552], ["66048VER200", "200", "Negro", 5.8, 90338], ["66048VER079", "079", "Negro Mate", 6.8, 90338],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:elegans-60:hoja-puerta-interior", description: "Elegans Hoja de puerta interior", technicalPage: 2, pricePage: 2, variants: [
    ["66404VER000", "000", "Blanco", 5.8, 41085], ["66404VER153", "153", "Nogal", 5.8, 76796], ["66404VER043", "043", "Roble Dorado", 5.8, 76796], ["66404VER199", "199", "Antracita", 5.8, 76796], ["66404VER200", "200", "Negro", 5.8, 84039], ["66404VER079", "079", "Negro Mate", 6.8, 84039],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:elegans-60:perfil-inversor", description: "Elegans Perfil inversor", technicalPage: 2, pricePage: 2, variants: [
    ["66044VER000", "000", "Blanco", 5.8, 33748], ["66044VER153", "153", "Nogal", 5.8, 58945], ["66044VER043", "043", "Roble Dorado", 5.8, 58945], ["66044VER199", "199", "Antracita", 5.8, 58945], ["66044VER200", "200", "Negro", 5.8, 64504], ["66044VER079", "079", "Negro Mate", 5.8, 64504],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:junquillo-20mm", description: "Junquillo vidrio 20 mm sliding", technicalPage: 2, pricePage: 3, variants: [
    ["66307VER000", "000", "Blanco", 5.8, 5975], ["66307VER153", "153", "Nogal", 5.8, 12078], ["66307VER043", "043", "Roble Dorado", 5.8, 12078], ["66307VER199", "199", "Antracita", 5.8, 12078], ["66307VER200", "200", "Negro", 5.8, 14863], ["66307VER079", "079", "Negro Mate", 5.8, 14863],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:junquillo-24mm", description: "Junquillo vidrio 24 mm", technicalPage: 2, pricePage: 3, variants: [
    ["67063VER000", "000", "Blanco", 5.8, 5546], ["67063VER153", "153", "Nogal", 5.8, 11173], ["67063VER043", "043", "Roble Dorado", 5.8, 11173], ["67063VER199", "199", "Antracita", 5.8, 11173], ["67063VER200", "200", "Negro", 5.8, 13638], ["67063VER079", "079", "Negro Mate", 5.8, 14863],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:compact-sliding:marco-2h", description: "Marco corredera compact sliding", technicalPage: 3, pricePage: 4, variants: [
    ["67460VER000", "000", "Blanco", 5.8, 26445], ["67460VER153", "153", "Nogal", 5.8, 52958], ["67460VER043", "043", "Roble Dorado", 5.8, 52958],
  ] }),
  independentPresentation({ technicalKey: "veratec:compact-sliding:riel", sku: "61013VER001", description: "Riel Compact Sliding", technicalPage: 3, pricePage: 4, lengthM: 5.8, netPrice: 9493 }),
  ...pricedProfile({ technicalKey: "veratec:compact-sliding:hoja", description: "Hoja corredera compact sliding", technicalPage: 3, pricePage: 4, variants: [
    ["67461VER000", "000", "Blanco", 5.8, 29275], ["67461VER153", "153", "Nogal", 5.8, 49711], ["67461VER043", "043", "Roble Dorado", 5.8, 49711],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:compact-sliding:traslapo", description: "Traslapo compact sliding", technicalPage: 3, pricePage: 4, variants: [
    ["67463VER000", "000", "Blanco", 5.8, 7358], ["67463VER153", "153", "Nogal", 5.8, 17881], ["67463VER043", "043", "Roble Dorado", 5.8, 17881],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:compact-sliding:junquillo-4mm", description: "Junquillo vidrio 4 mm compact sliding", technicalPage: 3, pricePage: 4, variants: [
    ["67062VER000", "000", "Blanco", 5.8, 6549], ["67062VER153", "153", "Nogal", 5.8, 12920], ["67062VER043", "043", "Roble Dorado", 5.8, 12920],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:compact-sliding:junquillo-20mm", description: "Junquillo vidrio 20 mm compact sliding", technicalPage: 3, pricePage: 4, variants: [
    ["67464VER000", "000", "Blanco", 5.8, 4961], ["67464VER153", "153", "Nogal", 5.8, 9269], ["67464VER043", "043", "Roble Dorado", 5.8, 9269], ["67464VER199", "199", "Antracita", 5.8, 9269], ["67464VER200", "200", "Negro", 5.8, 12332], ["67464VER079", "079", "Negro Mate", 6.8, 12332],
  ] }),
  independentPresentation({ technicalKey: "veratec:compact-sliding:cuarta-hoja", sku: "61014VER001", description: "Cuarta hoja Compact Sliding", technicalPage: 9, pricePage: 9, lengthM: 5.8, netPrice: 55782, associationSourceReference: "xelena:lista-precios:2026-06", associationSourcePage: 9, associationNote: "La lista oficial p. 9 identifica el SKU y nombra explícitamente Compact Sliding; solo se vincula al catálogo de la familia, sin asociarlo a recetas." }),
  independentPresentation({ technicalKey: "veratec:compact-sliding:refuerzo-marco", sku: "69083STL001", description: "Refuerzo marco Compact / monorriel", technicalPage: 1, pricePage: 12, lengthM: 5.8, netPrice: 7885, associationNote: "La pauta asigna 69083STL001 al refuerzo de marco Compact; la lista de junio p. 12 describe refuerzo marco Compact/monorriel y confirma SKU, largo y precio." }),
  independentPresentation({ technicalKey: "veratec:compact-sliding:refuerzo-hoja", sku: "69041STL000", description: "Refuerzo hoja corredera", technicalPage: 1, pricePage: 12, lengthM: 5.8, netPrice: 7882, associationNote: "La pauta asigna 69041STL000 al refuerzo de hoja Compact; la lista de junio p. 12 confirma SKU, largo y precio." }),
  independentPresentation({ technicalKey: "veratec:7400:zapata-aluminio", sku: "67412VER001", description: "Sliding 7400 · Zapata de aluminio", technicalPage: 9, pricePage: 9, lengthM: 5.8, netPrice: 124441, associationSourceReference: "xelena:lista-precios:2026-06", associationSourcePage: 9, associationNote: "La lista oficial p. 9 identifica el SKU como Zapata de aluminio Sliding 7400; se mantiene como artículo de la familia y no como perfil consumido por una receta." }),
  independentPresentation({ technicalKey: "veratec:7400:cuarta-hoja", sku: "61004VER003", description: "Cuarta hoja Sliding", technicalPage: 1, pricePage: 9, lengthM: 5.8, netPrice: 44437, associationSourceReference: "xelena:pendon-veratec:v2604", associationSourcePage: 1, associationNote: "El pendón p. 1 identifica Cuarta Hoja Sliding y la lista de junio p. 9 confirma SKU 61004VER003, M, 5,8 m y $44.437 neto. No demuestra uso en una configuración/receta particular." }),
  independentPresentation({ technicalKey: "veratec:7400:refuerzo-hoja-chica", sku: "69071STL000", description: "Refuerzo hoja corredera chica", technicalPage: 1, pricePage: 12, lengthM: 5.8, netPrice: 9153, associationNote: "El pendón y la pauta identifican 69071STL000 como refuerzo de hoja chica; la lista de junio p. 12 confirma SKU, largo y precio." }),
  independentPresentation({ technicalKey: "veratec:7400:refuerzo-monorriel", sku: "69060STL001", description: "Refuerzo monorriel", technicalPage: 1, pricePage: 12, lengthM: 5.8, netPrice: 10344, associationNote: "El pendón/pauta identifican 69060STL001 como refuerzo monorriel; la lista de junio p. 12 confirma SKU, largo y precio." }),
  independentPresentation({ technicalKey: "veratec:elegans-60:refuerzo-hoja-puerta-interior", sku: "69048STL000", description: "Elegans · Refuerzo hoja puerta interior", technicalPage: 12, pricePage: 12, lengthM: 5.8, netPrice: 14971, associationSourceReference: "xelena:lista-precios:2026-06", associationSourcePage: 12, associationNote: "La lista oficial p. 12 identifica este SKU y su uso Elegans; solo se vincula al catálogo de esa familia, sin asociarlo a recetas." }),
  independentPresentation({ technicalKey: "veratec:elegans-60:refuerzo-hoja-ventana-exterior", sku: "69018STL000", description: "Elegans · Refuerzo hoja ventana exterior", technicalPage: 12, pricePage: 12, lengthM: 5.8, netPrice: 11384, associationSourceReference: "xelena:lista-precios:2026-06", associationSourcePage: 12, associationNote: "La lista oficial p. 12 identifica este SKU y su uso Elegans; solo se vincula al catálogo de esa familia, sin asociarlo a recetas." }),
  independentPresentation({ technicalKey: "veratec:elegans-60:refuerzo-marco-fijo", sku: "69019STL000", description: "Elegans · Refuerzo marco fijo", technicalPage: 12, pricePage: 12, lengthM: 5.8, netPrice: 12235, associationSourceReference: "xelena:lista-precios:2026-06", associationSourcePage: 12, associationNote: "La lista oficial p. 12 identifica este SKU y su uso Elegans; solo se vincula al catálogo de esa familia, sin asociarlo a recetas." }),
  independentPresentation({ technicalKey: "veratec:elegans-60:refuerzo-puerta-exterior", sku: "69076STL000", description: "Elegans · Refuerzo puerta exterior", technicalPage: 12, pricePage: 12, lengthM: 5.8, netPrice: 23614, associationSourceReference: "xelena:lista-precios:2026-06", associationSourcePage: 12, associationNote: "La lista oficial p. 12 identifica este SKU y su uso Elegans; solo se vincula al catálogo de esa familia, sin asociarlo a recetas." }),
  independentPresentation({ technicalKey: "veratec:7400:refuerzo-marco-tres-rieles", sku: "69026STL000", description: "Sliding 7400 · Refuerzo marco 3 rieles", technicalPage: 12, pricePage: 12, lengthM: 5.8, netPrice: 17268, associationSourceReference: "xelena:lista-precios:2026-06", associationSourcePage: 12, associationNote: "La lista oficial p. 12 identifica este SKU como refuerzo de marco 3 rieles 7400; no se lo extiende a otras configuraciones." }),
  ...pricedProfile({ technicalKey: "veratec:7400:marco-monorriel", description: "Marco monorriel", technicalPage: 4, pricePage: 5, variants: [
    ["67411VER000", "000", "Blanco", 5.8, 41384], ["67411VER153", "153", "Nogal", 5.8, 65065], ["67411VER043", "043", "Roble Dorado", 5.8, 65065], ["67411VER199", "199", "Antracita", 5.8, 65065], ["67411VER200", "200", "Negro", 5.8, 76500], ["67411VER079", "079", "Negro Mate", 5.8, 76500],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:7400:marco-triple-riel", description: "Marco triple riel Sliding 7400", technicalPage: 4, pricePage: 5, variants: [
    ["67413VER000", "000", "Blanco", 5.8, 48251], ["67413VER153", "153", "Nogal", 5.8, 99455], ["67413VER043", "043", "Roble Dorado", 5.8, 99455], ["67413VER199", "199", "Antracita", 5.8, 99455], ["67413VER200", "200", "Negro", 5.8, 124050], ["67413VER079", "079", "Negro Mate", 5.8, 124050],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:7400:hoja-chica", description: "Hoja corredera chica sliding", technicalPage: 4, pricePage: 6, variants: [
    ["67415VER000", "000", "Blanco", 5.8, 32119], ["67415VER153", "153", "Nogal", 5.8, 53160], ["67415VER043", "043", "Roble Dorado", 5.8, 53160], ["67415VER199", "199", "Antracita", 5.8, 53160], ["67415VER200", "200", "Negro", 5.8, 72192], ["67415VER079", "079", "Negro Mate", 5.8, 72192],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:7400:barra-t", description: "Barra T sliding", technicalPage: 4, pricePage: 6, variants: [
    ["67416VER000", "000", "Blanco", 5.8, 28345], ["67416VER153", "153", "Nogal", 5.8, 48823], ["67416VER043", "043", "Roble Dorado", 5.8, 48823], ["67416VER199", "199", "Antracita", 5.8, 48823], ["67416VER200", "200", "Negro", 5.8, 58588], ["67416VER079", "079", "Negro Mate", 5.8, 58588],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:7400:traslapo-chico", description: "Traslapo corredera chico sliding", technicalPage: 4, pricePage: 6, variants: [
    ["67419VER000", "000", "Blanco", 5.8, 11873], ["67419VER153", "153", "Nogal", 5.8, 24458], ["67419VER043", "043", "Roble Dorado", 5.8, 24458], ["67419VER199", "199", "Antracita", 5.8, 24458], ["67419VER200", "200", "Negro", 5.8, 29808], ["67419VER079", "079", "Negro Mate", 5.8, 29808],
  ] }),
  ...pricedProfile({ technicalKey: "veratec:7400:remate-monorriel", description: "Remate monorriel", technicalPage: 4, pricePage: 7, variants: [
    ["67405VER000", "000", "Blanco", 5.8, 10347], ["67405VER153", "153", "Nogal", 5.8, 21060], ["67405VER043", "043", "Roble Dorado", 5.8, 21060], ["67405VER199", "199", "Antracita", 5.8, 21060], ["67405VER200", "200", "Negro", 5.8, 24842], ["67405VER079", "079", "Negro Mate", 5.8, 24842],
  ] }),
];

export const VERATEC_FAMILIES_JUNIO_2026_IMPORT: SupplierCatalogImport = {
  supplierKey: "xelena",
  supplierName: "Xelena",
  manufacturerName: "Veratec",
  catalogRevision: "xelena-veratec-pvc-diptico-2026-v1",
  technicalSourcePublisher: "Xelena / Veratec",
  catalogSourceReference: "xelena:diptico-pvc:2026",
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

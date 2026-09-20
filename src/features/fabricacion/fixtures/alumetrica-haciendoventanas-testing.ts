import {
  FABRICACION_RECIPE_SCHEMA_VERSION,
  type FabricacionAccesorio,
  type FabricacionComponentePerfil,
  type FabricacionEntradaCalculo,
  type FabricacionEvidenciaExterna,
  type FabricacionFuenteFragmento,
  type FabricacionReceta,
  type FabricacionTipologia,
  type FabricacionVidrio,
} from "@/features/fabricacion/types/fabricacion-domain";
import { buildAllSodal4800Recipes } from "@/features/fabricacion/fixtures/sodal-4800-zeta-recipes";
import {
  crearRecetaL20AlumetricaVariant,
  L20_ALUMETRICA_VARIANT_LABELS,
  resolveL20CatalogKeyForVariant,
  type L20AlumetricaVariantSlug,
} from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";

const CAPTURE_DATE = "2026-09-19";
const HACIENDO_URL = "https://www.haceventanas.com/#appMain";
const ALUMETRICA_FILE =
  "docs/fabricacion/alumetrica/2026-09-19-matriz-lineas.md";
const HACIENDO_FILE =
  "docs/fabricacion/haciendoventanas/2026-09-19-despieces-observados.md";

type ProfileFixture = {
  code: string;
  name: string;
  quantity: number;
  lengthMm: number;
  cut?: string;
};

type GlassFixture = {
  name: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
};

export type ExternalTestingBundle = {
  catalogKey: string;
  lineName: string;
  providerName: string;
  sourceReference: string;
  sourceRevision: string;
  definition: FabricacionReceta;
  fixtureInput: FabricacionEntradaCalculo;
};

function fragment(
  id: string,
  tipo: FabricacionFuenteFragmento["tipo"],
  texto: string,
  locator = HACIENDO_FILE,
): FabricacionFuenteFragmento {
  return {
    id,
    tipo,
    locator: `${locator}#${id}`,
    texto,
  };
}

function externalEvidence(input: {
  source: "alumetrica" | "haciendoventanas";
  fragments: FabricacionFuenteFragmento[];
  measures: FabricacionEntradaCalculo[];
  confidence: "alta" | "media" | "baja";
  values: string[];
  conflicts?: string[];
}): FabricacionEvidenciaExterna {
  const sourceFragmentId = input.fragments[0]?.id ?? "identity";
  return {
    fuente: input.source,
    nombreFuente:
      input.source === "alumetrica" ? "Alumétrica" : "Haciendo Ventanas",
    url: input.source === "haciendoventanas" ? HACIENDO_URL : null,
    archivo: input.source === "alumetrica" ? ALUMETRICA_FILE : HACIENDO_FILE,
    fecha: CAPTURE_DATE,
    sourceFragments: input.fragments,
    medidasObservadas: input.measures.map((measure) => ({
      anchoMm: measure.anchoTotalMm,
      altoMm: measure.altoTotalMm,
      hojas: measure.hojas,
      modulos: measure.modulos,
      variante: measure.variante ?? null,
    })),
    valores: input.values.map((fieldPath) => ({
      fieldPath,
      origen: "observado",
      sourceFragmentId,
    })),
    confianza: input.confidence,
    ...(input.conflicts ? { conflictos: input.conflicts } : {}),
  };
}

function fixedProfile(
  id: string,
  fixture: ProfileFixture,
): FabricacionComponentePerfil {
  return {
    id,
    codigoPerfil: fixture.code,
    nombrePerfil: fixture.name,
    funcion: fixture.name,
    largoComercialMm: 6000,
    reglaMedida: { base: "fijo_mm", valorFijoMm: fixture.lengthMm },
    reglaCantidad: { tipo: "fija", cantidad: fixture.quantity },
    requerido: true,
    corte: fixture.cut ?? "No observado en la fuente.",
    observaciones:
      "Resultado observado para el fixture; no representa una fórmula general.",
  };
}

function fixedGlass(id: string, fixture: GlassFixture): FabricacionVidrio {
  return {
    id,
    nombre: fixture.name,
    reglaAncho: { base: "fijo_mm", valorFijoMm: fixture.widthMm },
    reglaAlto: { base: "fijo_mm", valorFijoMm: fixture.heightMm },
    reglaCantidad: { tipo: "fija", cantidad: fixture.quantity },
    requerido: false,
    observaciones:
      "Resultado observado para el fixture; composición y fórmula general no observadas.",
  };
}

function buildDefinition(input: {
  recipeId: string;
  code: string;
  name: string;
  typology: FabricacionTipologia;
  leaves: number;
  variant: string;
  apertura?: string | null;
  profiles: ProfileFixture[];
  glass?: GlassFixture;
  fixtureInput: FabricacionEntradaCalculo;
  alumetricaText: string;
  haciendoventanasText: string;
  confidence: "alta" | "media" | "baja";
  notes?: string[];
  conflicts?: string[];
}): FabricacionReceta {
  const fixtureMeasures = [
    {
      anchoMm: input.fixtureInput.anchoTotalMm,
      altoMm: input.fixtureInput.altoTotalMm,
      hojas: input.fixtureInput.hojas,
      modulos: input.fixtureInput.modulos,
      variante: input.fixtureInput.variante ?? null,
    },
  ];
  const alumFragment = fragment(
    `${input.recipeId}-alumetrica`,
    "identidad",
    input.alumetricaText,
    ALUMETRICA_FILE,
  );
  const haciendoFragment = fragment(
    `${input.recipeId}-haciendoventanas`,
    "perfil",
    input.haciendoventanasText,
  );
  const measure = input.fixtureInput;
  const fields = [
    "identidad",
    "perfiles",
    ...(input.glass ? ["vidrios"] : []),
  ];

  return {
    schemaVersion: FABRICACION_RECIPE_SCHEMA_VERSION,
    version: 1,
    estado: "lista_para_validar",
    identidad: {
      recetaId: input.recipeId,
      codigo: input.code,
      nombre: input.name,
      tipologia: input.typology,
      hojas: input.leaves,
      modulos: 1,
      apertura: input.apertura ?? input.typology,
      herraje: null,
      variante: input.variant,
    },
    perfiles: input.profiles.map((profile, index) =>
      fixedProfile(`${input.recipeId}-perfil-${index + 1}`, profile),
    ),
    vidrios: input.glass
      ? [fixedGlass(`${input.recipeId}-vidrio-1`, input.glass)]
      : [],
    accesorios: [] as FabricacionAccesorio[],
    configuracionCorte: {
      perdidaCorteMm: null,
      despunteInicialMm: null,
      sobranteMinimoAprovechableMm: null,
      largoComercialDefaultMm: 6000,
    },
    alcanceCalculo: {
      modo: "observed_fixture_only",
      medidasObservadas: fixtureMeasures,
      calculableFueraDeMedidas: false,
    },
    evidenciasExternas: [
      externalEvidence({
        source: "alumetrica",
        fragments: [alumFragment],
        measures: [measure],
        confidence: input.confidence,
        values: fields,
        conflicts: input.conflicts,
      }),
      externalEvidence({
        source: "haciendoventanas",
        fragments: [haciendoFragment],
        measures: [measure],
        confidence: input.confidence,
        values: fields,
        conflicts: input.conflicts,
      }),
    ],
    ...(input.notes ? { datosPendientes: input.notes } : {}),
    notasValidacion: [
      "Receta documental en estado testing; no es producción ni validación de taller.",
      "Los largos son fixtures observados y no se convierten en fórmula general.",
      "No se agregan accesorios no visibles en las fuentes consultadas.",
      ...(input.conflicts ?? []),
    ],
  };
}

function fixtureInput(
  leaves: number,
  variant: string,
): FabricacionEntradaCalculo {
  return {
    anchoTotalMm: 1200,
    altoTotalMm: 1000,
    cantidad: 1,
    hojas: leaves,
    modulos: 1,
    variante: variant,
  };
}

function buildL20FormulaTestingBundle(input: {
  variant: L20AlumetricaVariantSlug;
  alumetricaText: string;
  haciendoventanasText?: string;
  confidence?: "alta" | "media" | "baja";
}): ExternalTestingBundle {
  const variant = input.variant;
  const measure = fixtureInput(2, variant);
  const definitionBase = crearRecetaL20AlumetricaVariant({
    variant,
    lineName: "Serie 20",
  });
  const recipeId = `MERGE-SODAL-20-2H-${variant.toUpperCase()}-V1`;
  const alumFragment = fragment(
    `${recipeId}-alumetrica`,
    "identidad",
    input.alumetricaText,
    ALUMETRICA_FILE,
  );
  const definition: FabricacionReceta = {
    ...definitionBase,
    identidad: {
      ...definitionBase.identidad,
      recetaId: recipeId,
      codigo: recipeId,
      nombre: `Serie 20 · ${L20_ALUMETRICA_VARIANT_LABELS[variant]}`,
    },
    datosPendientes: [],
    evidenciasExternas: [
      externalEvidence({
        source: "alumetrica",
        fragments: [alumFragment],
        measures: [measure],
        confidence: input.confidence ?? "alta",
        values: ["identidad", "perfiles", "vidrios"],
      }),
      ...(input.haciendoventanasText
        ? [
            externalEvidence({
              source: "haciendoventanas",
              fragments: [
                fragment(
                  `${recipeId}-haciendoventanas`,
                  "perfil",
                  input.haciendoventanasText,
                ),
              ],
              measures: [measure],
              confidence: input.confidence ?? "alta",
              values: ["identidad", "perfiles", "vidrios"],
            }),
          ]
        : []),
    ],
    notasValidacion: [
      "Receta documental en estado testing; no es producción ni validación de taller.",
      "Fórmulas según Alumétrica 2026-09-20; validar con fabricación real del taller.",
    ],
  };

  return {
    catalogKey: resolveL20CatalogKeyForVariant(variant),
    lineName:
      resolveL20CatalogKeyForVariant(variant) === "ventora:l20-fijos"
        ? "Serie 20 — Fijos"
        : "Serie 20",
    providerName: "SODAL",
    sourceReference: `merge:alumetrica+haciendoventanas:serie-20:2h:${variant}:1200x1000`,
    sourceRevision: CAPTURE_DATE,
    fixtureInput: measure,
    definition,
  };
}

function buildL20AlumetricaTestingBundles(): ExternalTestingBundle[] {
  return [
    buildL20FormulaTestingBundle({
      variant: "pierna_abierta_jamba_2009",
      alumetricaText:
        "Corredera AL-20 pierna abierta · Jamba 2009: 2009 jamba, 2006 pierna, fórmulas X−12 / X/2−4 / Y−28.",
    }),
    buildL20FormulaTestingBundle({
      variant: "pierna_abierta",
      alumetricaText:
        "Corredera AL-20 pierna abierta: jamba 2003, pierna 2006, mismas fórmulas de riel y vidrio.",
    }),
    {
      catalogKey: "ventora:l20-fijos",
      lineName: "Serie 20 — Fijos",
      providerName: "SODAL",
      sourceReference:
        "merge:alumetrica+haciendoventanas:serie-20:2h:pierna_cerrada_jamba_2009:1200x1000",
      sourceRevision: CAPTURE_DATE,
      fixtureInput: fixtureInput(2, "pierna_cerrada_jamba_2009"),
      definition: buildDefinition({
        recipeId: "MERGE-SODAL-20-2H-PIERNA_CERRADA_JAMBA_2009-V1",
        code: "MERGE-SODAL-20-2H-PIERNA_CERRADA_JAMBA_2009-V1",
        name: "Serie 20 · Pierna cerrada · Jamba 2009",
        typology: "corredera",
        leaves: 2,
        variant: "pierna_cerrada_jamba_2009",
        apertura: "fija",
        fixtureInput: fixtureInput(2, "pierna_cerrada_jamba_2009"),
        profiles: [
          { code: "2001", name: "Riel Superior", quantity: 1, lengthMm: 1188 },
          { code: "2002", name: "Riel Inferior", quantity: 1, lengthMm: 1188 },
          { code: "2004", name: "Cabezal", quantity: 2, lengthMm: 596 },
          { code: "2005", name: "Zócalo", quantity: 2, lengthMm: 596 },
          { code: "2009", name: "Jamba", quantity: 2, lengthMm: 1000 },
          { code: "2010", name: "Pierna", quantity: 2, lengthMm: 972 },
          { code: "2019", name: "Traslapo", quantity: 2, lengthMm: 972 },
        ],
        glass: { name: "Vidrio", widthMm: 543, heightMm: 899, quantity: 2 },
        alumetricaText:
          "Corredera AL-20 pierna cerrada · Jamba 2009: 2009 jamba, 2010 pierna; vidrio X/2−57, Y−101.",
        haciendoventanasText:
          "2001 1×1188; 2002 1×1188; 2004/2005 2×596; 2009 2×1000; 2010/2019 2×972; vidrio 543×899×2.",
        confidence: "alta",
      }),
    },
    buildL20FormulaTestingBundle({
      variant: "pierna_cerrada",
      alumetricaText:
        "Corredera AL-20 pierna cerrada: plan idéntico a pierna cerrada · Jamba 2009 (2009 + 2010 + 2019).",
    }),
    buildL20FormulaTestingBundle({
      variant: "tp_15mm",
      alumetricaText:
        "Corredera AL-20 TP 15 mm: 2018×4, 2020 y 2016 TP con fórmulas X−4 / X−28 observadas en Alumétrica.",
    }),
  ];
}

export function buildAlumetricaHaciendoTestingBundles(): ExternalTestingBundle[] {
  const bundles: ExternalTestingBundle[] = [
    {
      catalogKey: "ventora:serie-4800-corredera-2h",
      lineName: "Serie 4800 — Corredera 2 hojas",
      providerName: "SODAL",
      sourceReference: "merge:alumetrica+haciendoventanas:serie-4800:2h:1200x1000",
      sourceRevision: CAPTURE_DATE,
      fixtureInput: fixtureInput(2, "Normal"),
      definition: buildDefinition({
        recipeId: "MERGE-SODAL-4800-2H-FIXTURE-V1",
        code: "MERGE-SODAL-4800-2H-FIXTURE-V1",
        name: "Serie 4800 — fixture 1200×1000",
        typology: "corredera",
        leaves: 2,
        variant: "Normal",
        fixtureInput: fixtureInput(2, "Normal"),
        profiles: [
          { code: "4801", name: "Riel Inferior", quantity: 1, lengthMm: 1184 },
          { code: "4802", name: "Riel Superior", quantity: 1, lengthMm: 1184 },
          { code: "4803", name: "Jamba", quantity: 2, lengthMm: 1000 },
          { code: "4804", name: "Zócalo", quantity: 2, lengthMm: 585 },
          { code: "4805", name: "Cabezal", quantity: 2, lengthMm: 585 },
          { code: "4806", name: "Traslapo", quantity: 2, lengthMm: 968 },
          { code: "4808", name: "Pierna con Aleta", quantity: 2, lengthMm: 968 },
        ],
        alumetricaText: "Serie 4800: variantes normal y reforzada; 7 perfiles visibles.",
        haciendoventanasText: "4801/4802 1×1184; 4803 2×1000; 4804/4805 2×585; 4806/4808 2×968.",
        confidence: "media",
        notes: ["Ancho del vidrio 4800 no se considera verificable en la evidencia disponible."],
      }),
    },
    {
      catalogKey: "ventora:serie-3200-puerta-abatible-1h",
      lineName: "Serie 3200 — Puerta abatible 1 hoja",
      providerName: "SODAL",
      sourceReference: "merge:alumetrica+haciendoventanas:serie-3200:1h:1200x1000",
      sourceRevision: CAPTURE_DATE,
      fixtureInput: fixtureInput(1, "Bastidor Grande 3225"),
      definition: buildDefinition({
        recipeId: "MERGE-SODAL-3200-1H-FIXTURE-V1",
        code: "MERGE-SODAL-3200-1H-FIXTURE-V1",
        name: "Serie 3200 — fixture 1200×1000",
        typology: "puerta_abatible",
        leaves: 1,
        variant: "Bastidor Grande 3225",
        fixtureInput: fixtureInput(1, "Bastidor Grande 3225"),
        profiles: [
          { code: "3222", name: "Marco", quantity: 1, lengthMm: 1200 },
          { code: "3222", name: "Marco", quantity: 2, lengthMm: 1000 },
          { code: "3225", name: "Bastidor Grande", quantity: 2, lengthMm: 1158 },
          { code: "3225", name: "Bastidor Grande", quantity: 2, lengthMm: 971 },
        ],
        alumetricaText: "Serie 3200: 3222, 3225 y variantes de bastidor observadas.",
        haciendoventanasText: "Marco 3222 1×1200 + 2×1000; Bastidor Grande 3225 2×1158 + 2×971.",
        confidence: "media",
        notes: ["Vidrio 3200 no se incorpora: la lectura visual de la fuente es ambigua."],
      }),
    },
    ...buildL20AlumetricaTestingBundles(),
    {
      catalogKey: "ventora:s33-corredera-2h",
      lineName: "S-33 — Corredera 2 hojas",
      providerName: "SODAL",
      sourceReference: "merge:alumetrica+haciendoventanas:s33:2h:1200x1000",
      sourceRevision: CAPTURE_DATE,
      fixtureInput: fixtureInput(2, "Normal"),
      definition: buildDefinition({
        recipeId: "MERGE-SODAL-S33-2H-FIXTURE-V1",
        code: "MERGE-SODAL-S33-2H-FIXTURE-V1",
        name: "S-33 — fixture 1200×1000",
        typology: "corredera",
        leaves: 2,
        variant: "Normal",
        fixtureInput: fixtureInput(2, "Normal"),
        profiles: [
          { code: "3303", name: "Traslapo", quantity: 2, lengthMm: 928 },
          { code: "3308", name: "Hoja TP", quantity: 4, lengthMm: 928 },
          { code: "3308", name: "Hoja TP", quantity: 4, lengthMm: 600 },
          { code: "3324", name: "Riel Cámara", quantity: 2, lengthMm: 1200 },
          { code: "3324", name: "Riel Cámara", quantity: 2, lengthMm: 1000 },
        ],
        glass: { name: "Vidrio", widthMm: 488, heightMm: 816, quantity: 2 },
        alumetricaText: "S-33: 3303, 3308 y 3324; variante normal/termopanel visible.",
        haciendoventanasText: "3303 2×928; 3308 4×928 + 4×600; 3324 2×1200 + 2×1000; vidrio 488×816×2.",
        confidence: "alta",
      }),
    },
    {
      catalogKey: "ventora:s33-rpt-corredera-2h",
      lineName: "S-33 RPT — Corredera 2 hojas",
      providerName: "SODAL",
      sourceReference: "merge:alumetrica+haciendoventanas:s33-rpt:2h:1200x1000",
      sourceRevision: CAPTURE_DATE,
      fixtureInput: fixtureInput(2, "RPT"),
      definition: buildDefinition({
        recipeId: "MERGE-SODAL-S33-RPT-2H-FIXTURE-V1",
        code: "MERGE-SODAL-S33-RPT-2H-FIXTURE-V1",
        name: "S-33 RPT — fixture 1200×1000",
        typology: "corredera",
        leaves: 2,
        variant: "RPT",
        fixtureInput: fixtureInput(2, "RPT"),
        profiles: [
          { code: "3303", name: "Traslapo", quantity: 2, lengthMm: 936 },
          { code: "3308R", name: "Hoja TP RPT", quantity: 4, lengthMm: 936 },
          { code: "3308R", name: "Hoja TP RPT", quantity: 4, lengthMm: 602 },
          { code: "3324R", name: "Riel RPT", quantity: 2, lengthMm: 1200 },
          { code: "3324R", name: "Riel RPT", quantity: 2, lengthMm: 1000 },
        ],
        glass: { name: "Termopanel", widthMm: 491, heightMm: 825, quantity: 2 },
        alumetricaText: "S-33 RPT: 3303, 3308R y 3324R observados.",
        haciendoventanasText: "3303 2×936; 3308R 4×936 + 4×602; 3324R 2×1200 + 2×1000; termopanel 491×825×2.",
        confidence: "alta",
      }),
    },
    {
      catalogKey: "ventora:optima-s28-corredera-2h",
      lineName: "Óptima S-28 — Corredera 2 hojas",
      providerName: "SODAL",
      sourceReference: "merge:alumetrica+haciendoventanas:optima-s28:2h:1200x1000",
      sourceRevision: CAPTURE_DATE,
      fixtureInput: fixtureInput(2, "Termopanel"),
      definition: buildDefinition({
        recipeId: "MERGE-SODAL-S28-2H-FIXTURE-V1",
        code: "MERGE-SODAL-S28-2H-FIXTURE-V1",
        name: "Óptima S-28 — fixture 1200×1000",
        typology: "corredera",
        leaves: 2,
        variant: "Termopanel",
        fixtureInput: fixtureInput(2, "Termopanel"),
        profiles: [
          { code: "S281", name: "Riel", quantity: 2, lengthMm: 1200 },
          { code: "S281", name: "Riel", quantity: 2, lengthMm: 1000 },
          { code: "S282", name: "Hoja TP", quantity: 4, lengthMm: 939 },
          { code: "S282", name: "Hoja TP", quantity: 4, lengthMm: 603 },
          { code: "S283", name: "Traslapo", quantity: 2, lengthMm: 939 },
          { code: "S286", name: "Cortagotera", quantity: 1, lengthMm: 1200 },
        ],
        glass: { name: "Termopanel", widthMm: 493, heightMm: 829, quantity: 2 },
        alumetricaText: "Óptima S-28: S281, S282, S283 y S286; termopanel 2H.",
        haciendoventanasText: "S281 2×1200 + 2×1000; S282 4×939 + 4×603; S283 2×939; S286 1×1200; termopanel 493×829×2.",
        confidence: "alta",
      }),
    },
  ];

  return bundles;
}

export function buildMergedL4800ZetaTestingBundles(): ExternalTestingBundle[] {
  return buildAllSodal4800Recipes().map((bundle) => {
    const fixtureInput: FabricacionEntradaCalculo = {
      anchoTotalMm: bundle.confirmed.testDimensions.widthMm,
      altoTotalMm: bundle.confirmed.testDimensions.heightMm,
      cantidad: 1,
      hojas: bundle.confirmed.leaves,
      modulos: 1,
      variante: "monolitico",
    };
    const isTwoLeaves = bundle.confirmed.leaves === 2;
    const external: FabricacionEvidenciaExterna = {
      fuente: "alumetrica",
      nombreFuente: "Alumétrica",
      url: null,
      archivo: ALUMETRICA_FILE,
      fecha: CAPTURE_DATE,
      sourceFragments: [
        fragment(
          `${bundle.recipeId}-alumetrica`,
          "identidad",
          "Sodal Serie 4800: corredera normal, monolítico, 2 hojas; la fuente visible no publica una fórmula general completa.",
          ALUMETRICA_FILE,
        ),
      ],
      medidasObservadas: [
        {
          anchoMm: fixtureInput.anchoTotalMm,
          altoMm: fixtureInput.altoTotalMm,
          hojas: fixtureInput.hojas,
          modulos: fixtureInput.modulos,
          variante: fixtureInput.variante,
        },
      ],
      valores: [
        {
          fieldPath: "identidad",
          origen: "observado",
          sourceFragmentId: `${bundle.recipeId}-alumetrica`,
        },
      ],
      confianza: "media",
    };
    const haciendoventanas: FabricacionEvidenciaExterna | null = isTwoLeaves
      ? {
          fuente: "haciendoventanas",
          nombreFuente: "Haciendo Ventanas",
          url: HACIENDO_URL,
          archivo: HACIENDO_FILE,
          fecha: CAPTURE_DATE,
          sourceFragments: [
            fragment(
              `${bundle.recipeId}-haciendoventanas`,
              "perfil",
              "Serie 4800: salida Zeta integrada con el fixture visible de 1200×1000; la fuente externa no publica fórmula algebraica.",
            ),
          ],
          medidasObservadas: [
            {
              anchoMm: fixtureInput.anchoTotalMm,
              altoMm: fixtureInput.altoTotalMm,
              hojas: fixtureInput.hojas,
              modulos: fixtureInput.modulos,
              variante: fixtureInput.variante,
            },
          ],
          valores: [
            {
              fieldPath: "perfiles",
              origen: "observado",
              sourceFragmentId: `${bundle.recipeId}-haciendoventanas`,
            },
          ],
          confianza: "media",
        }
      : null;

    return {
      catalogKey: "ventora:serie-4800-corredera-2h",
      lineName: "Serie 4800 — Corredera 2 hojas",
      providerName: "SODAL",
      sourceReference: `merge:alumetrica+haciendoventanas+zeta:${bundle.recipeId}`,
      sourceRevision: CAPTURE_DATE,
      fixtureInput,
      definition: {
        ...bundle.definition,
        evidenciasExternas: [external, ...(haciendoventanas ? [haciendoventanas] : [])],
        alcanceCalculo: {
          modo: "observed_fixture_only",
          medidasObservadas: [
            {
              anchoMm: fixtureInput.anchoTotalMm,
              altoMm: fixtureInput.altoTotalMm,
              hojas: fixtureInput.hojas,
              modulos: fixtureInput.modulos,
              variante: fixtureInput.variante,
            },
          ],
          calculableFueraDeMedidas: false,
        },
        notasValidacion: [
          ...bundle.definition.notasValidacion,
          "Merge documental Alumétrica + Haciendo Ventanas + Zeta; permanece en testing.",
        ],
      },
    };
  });
}

import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import {
  crearRecetaVeratecElegansBatiente,
  crearRecetaVeratec7400Monorriel,
  crearRecetaVeratecCompactSliding,
  crearRecetaVeratec7400Workbook3H,
  crearRecetaVeratecElegansFijo,
  VERATEC_7400_WORKBOOK_3H_VARIANTS,
  VERATEC_COMPACT_SLIDING_VARIANTS,
  VERATEC_ELEGANS_FIXED_VARIANTS,
  VERATEC_ELEGANS_BATIENTE_VARIANTS,
  VERATEC_7400_MONORAIL_VARIANTS,
  VERATEC_WORKBOOK_SOURCE_REVISION,
} from "@/features/fabricacion/fixtures/veratec-workbook-recipes";
import {
  getLineVariantSlots,
} from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { getSuggestedRecipesForLine } from "@/features/fabricacion/fixtures/biblioteca-recetas-sugeridas";
import {
  VERATEC_7400_SOURCE_VARIANTS,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";

describe("recetas preliminares Veratec transcritas desde la pauta facilitada", () => {
  it.each([
    {
      name: "Compact Sliding 2H · hoja `compact sliding 2 hojas`",
      source: "pauta-de-corte-veratec.xlsx#compact-sliding-2-hojas",
      width: 2360,
      height: 1145,
      leaves: 2,
      recipe: "compact_sliding_2h",
      expected: [2366, 1151, 2290, 1075, 1178, 1065, 1062, 949, 1059, 2254],
    },
    {
      name: "Compact Sliding 3H · hoja `compact sliding 3 hojas`",
      source: "pauta-de-corte-veratec.xlsx#compact-sliding-3-hojas",
      width: 3000,
      height: 1500,
      leaves: 3,
      recipe: "compact_sliding_3h",
      expected: [3006, 1506, 2930, 1430, 1024, 1420, 908, 1304, 1414, 2894],
    },
    {
      name: "Compact Sliding 4H · hoja `compact sliding 4 hojas`",
      source: "pauta-de-corte-veratec.xlsx#compact-sliding-4-hojas",
      width: 3485,
      height: 1335,
      leaves: 4,
      recipe: "compact_sliding_4h",
      expected: [3491, 1341, 3415, 1265, 889, 1255, 773, 1139, 1249, 3379],
    },
  ])("reproduce los cortes de muestra del Excel: $name", (sample) => {
    const recipe = crearRecetaVeratecCompactSliding({
      lineName: "Compact Sliding",
      variant: sample.recipe as (typeof VERATEC_COMPACT_SLIDING_VARIANTS)[number]["slug"],
      createId: (() => {
        let index = 0;
        return () => `sample-${sample.recipe}-${++index}`;
      })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: sample.width,
      altoTotalMm: sample.height,
      cantidad: 1,
      hojas: sample.leaves,
      modulos: sample.leaves,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual(sample.expected);
    expect(recipe.notasValidacion.some((note) => note.includes(sample.source))).toBe(true);
  });

  it.each([
    {
      slug: "compact_sliding_2h",
      leaves: 2,
      expectedSashWidth: 598,
      expectedSashReinforcementWidth: 482,
      expectedGlassWidth: 482,
      expectedOverlapCount: 2,
      expectedGlassCount: 2,
    },
    {
      slug: "compact_sliding_3h",
      leaves: 3,
      expectedSashWidth: 424,
      expectedSashReinforcementWidth: 308,
      expectedGlassWidth: 308,
      expectedOverlapCount: 4,
      expectedGlassCount: 3,
    },
    {
      slug: "compact_sliding_4h",
      leaves: 4,
      expectedSashWidth: 318,
      expectedSashReinforcementWidth: 202,
      expectedGlassWidth: 202,
      expectedOverlapCount: 4,
      expectedGlassCount: 4,
    },
  ])("calcula los cortes documentados de $slug sin completar mappings pendientes", (testCase) => {
    const recipe = crearRecetaVeratecCompactSliding({
      lineName: "Compact Sliding",
      variant: testCase.slug as (typeof VERATEC_COMPACT_SLIDING_VARIANTS)[number]["slug"],
      createId: (() => {
        let index = 0;
        return () => `compact-${testCase.slug}-${++index}`;
      })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: testCase.leaves,
      modulos: testCase.leaves,
    });
    const byRole = (role: string) =>
      result.perfiles.find((profile) => profile.funcion === role);

    expect(result.calculable).toBe(true);
    expect(byRole("Marco")?.medidaMm).toBe(1206);
    expect(byRole("Marco")?.cantidadPiezas).toBe(2);
    expect(byRole("Hoja")?.medidaMm).toBe(testCase.expectedSashWidth);
    expect(byRole("Hoja")?.cantidadPiezas).toBe(testCase.leaves * 2);
    expect(byRole("Refuerzo de hoja")?.medidaMm).toBe(testCase.expectedSashReinforcementWidth);
    expect(byRole("Traslapo")?.cantidadPiezas).toBe(testCase.expectedOverlapCount);
    expect(byRole("Riel")?.codigoPerfil).toBe("61013ver");
    expect(recipe.perfiles.find((profile) => profile.codigoPerfil === "61013ver")).toMatchObject({
      largoComercialMm: 5800,
      largoComercialPendiente: false,
    });
    expect(recipe.perfiles).toHaveLength(10);
    expect(recipe.perfiles.every((profile) => profile.largoComercialMm === 5800)).toBe(true);
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: testCase.expectedGlassWidth,
      altoMm: 1304,
      cantidadPiezas: testCase.expectedGlassCount,
    });
    expect(result.advertencias.some((warning) => warning.codigo === "COMPONENTE_CON_DATOS_PENDIENTES")).toBe(true);

    const pauta = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });
    expect(pauta.barras.length).toBeGreaterThan(0);
    expect(pauta.barras.every((bar) => bar.largoComercialMm === 5800)).toBe(true);
    expect(pauta.advertencias.some((warning) => warning.codigo === "PERFIL_SIN_DATOS_DE_BARRA")).toBe(false);
    expect(recipe.estado).toBe("lista_para_validar");
    expect(recipe.datosPendientes).toBeUndefined();
    expect(recipe.notasValidacion.some((note) => /junquillo/i.test(note))).toBe(true);
  });

  it("expone las bases calculables en cada configuración comercial sin marcarlas completas", () => {
    const workshopOnlyCatalogKeys = [
      "ventora:veratec-7400-corredera-3h",
      "ventora:veratec-compact-sliding-2h",
      "ventora:veratec-compact-sliding-3h",
      "ventora:veratec-compact-sliding-4h",
      "ventora:veratec-elegans-60-fijo",
      "ventora:veratec-elegans-60-ventana-hoja-interior",
      "ventora:veratec-elegans-60-ventana-hoja-exterior",
      "ventora:veratec-elegans-60-puerta-hoja-interior",
      "ventora:veratec-elegans-60-puerta-hoja-exterior",
      "ventora:veratec-7400-monorriel",
    ];

    for (const catalogKey of workshopOnlyCatalogKeys) {
      expect(getLineVariantSlots(catalogKey).length).toBeGreaterThan(0);
      expect(getLineVariantSlots(catalogKey).every((slot) => slot.complete === false)).toBe(true);
    }
    expect(VERATEC_WORKBOOK_SOURCE_REVISION).toContain("sha256:");
  });

  it("ofrece solo bases opt-in por configuración y conserva procedencia privada", () => {
    const compact = getSuggestedRecipesForLine({ catalogKey: "ventora:veratec-compact-sliding-2h", lineName: "Compact Sliding · 2 hojas", providerName: "VERATEC" });
    expect(compact).toHaveLength(1);
    expect(compact[0]).toMatchObject({ sourceType: "supplier", sourceName: "Veratec · pauta de corte facilitada", sourceReference: "pauta-de-corte-veratec.xlsx#compact-sliding-2-hojas" });
    expect(compact[0].sourceRevision).toContain("sha256:");
    expect(compact[0].crearDefinicion?.().estado).toBe("lista_para_validar");
    expect(getSuggestedRecipesForLine({ catalogKey: "ventora:veratec-elevadora-2h-2moviles", lineName: "Elevadora", providerName: "VERATEC" })).toEqual([]);
    expect(getSuggestedRecipesForLine({ catalogKey: "ventora:veratec-7400-monorriel", lineName: "Veratec 7400", providerName: "VERATEC" })).toHaveLength(2);
  });

  it("no publica la variante 4H chica contradictoria ni el resto de fórmulas de taller como slots comunes", () => {
    const slots = getLineVariantSlots("ventora:veratec-7400-corredera-3h");
    expect(VERATEC_7400_WORKBOOK_3H_VARIANTS.some((variant) => /4h.*chica/i.test(variant.slug))).toBe(false);
    expect(slots).toHaveLength(2);
  });

  it("no convierte celdas `todos` ni cortes cero del libro en componentes confirmados", () => {
    const recipe = crearRecetaVeratec7400Workbook3H({
      lineName: "Sliding 7400",
      variant: "7400_3h_grande_2rieles",
      createId: (() => { let i = 0; return () => `guard-${++i}`; })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 4000,
      altoTotalMm: 2000,
      cantidad: 1,
      hojas: 3,
      modulos: 3,
    });
    const blockedMonorailSlots = getLineVariantSlots("ventora:veratec-7400-monorriel");

    expect(recipe.perfiles.some((profile) => /junquillo/i.test(profile.funcion))).toBe(false);
    expect(result.perfiles.every((profile) => profile.medidaMm > 0 && profile.cantidadPiezas > 0)).toBe(true);
    expect(blockedMonorailSlots).toHaveLength(2);
  });

  it("mantiene 5 mm fuera de la matriz documentada del 7400 y conserva 4 mm explícito", () => {
    expect(VERATEC_7400_SOURCE_VARIANTS.map((variant) => variant.slug)).toEqual([
      VERATEC_7400_VARIANT_MONOLITICO_4MM,
      "termopanel_20mm",
      "termopanel_24mm",
    ]);
    expect(VERATEC_7400_SOURCE_VARIANTS.some((variant) => /5\s*mm/i.test(variant.label))).toBe(false);
    expect(getLineVariantSlots("ventora:veratec-inova-corredera-2h")).toEqual([]);
    expect(getLineVariantSlots("ventora:veratec-inova-76-ventana")).toEqual([]);
  });

  it.each([
    { slug: "elegans_fijo_marco_normal", expectedGlass: 1110, expectedGlassHeight: 1410 },
    { slug: "elegans_fijo_marco_rebajado", expectedGlass: 1118, expectedGlassHeight: 1418 },
  ])("calcula $slug conservando los códigos de la planilla sin mapearlos a precios", (testCase) => {
    const recipe = crearRecetaVeratecElegansFijo({
      lineName: "Elegans 60 · Paño fijo",
      variant: testCase.slug as (typeof VERATEC_ELEGANS_FIXED_VARIANTS)[number]["slug"],
      createId: (() => {
        let index = 0;
        return () => `elegans-${testCase.slug}-${++index}`;
      })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((row) => [row.codigoPerfil, row.medidaMm, row.cantidadPiezas])).toEqual([
      ["65201VER", 1206, 2],
      ["65201VER", 1506, 2],
      ["61011VER999", 1115, 2],
      ["61011VER999", 1415, 2],
    ]);
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: testCase.expectedGlass,
      altoMm: testCase.expectedGlassHeight,
      cantidadPiezas: 1,
    });
    expect(recipe.perfiles.every((profile) => profile.largoComercialPendiente)).toBe(true);
    expect(recipe.estado).toBe("lista_para_validar");
    expect(getLineVariantSlots("ventora:veratec-elegans-60-fijo")).toHaveLength(2);
  });

  it.each([
    {
      slug: "7400_3h_grande_2rieles",
      expectedLeaf: 403,
      expectedReinforcement: 237,
      expectedGlass: 241,
      expectedGlassHeight: 1250,
    },
    {
      slug: "7400_3h_chica_2rieles",
      expectedLeaf: 397,
      expectedReinforcement: 231,
      expectedGlass: 271,
      expectedGlassHeight: 1286,
    },
  ])("transcribe $slug sin tocar la receta 7400 2H", (testCase) => {
    const recipe = crearRecetaVeratec7400Workbook3H({
      lineName: "Sliding 7400 · Corredera 3 hojas",
      variant: testCase.slug as (typeof VERATEC_7400_WORKBOOK_3H_VARIANTS)[number]["slug"],
      createId: (() => {
        let index = 0;
        return () => `7400-${testCase.slug}-${++index}`;
      })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 3,
      modulos: 3,
    });
    const byRole = (role: string) =>
      result.perfiles.find((profile) => profile.funcion === role);

    expect(result.calculable).toBe(true);
    expect(byRole("Marco")?.medidaMm).toBe(1206);
    expect(byRole("Hoja")?.medidaMm).toBe(testCase.expectedLeaf);
    expect(byRole("Hoja")?.cantidadPiezas).toBe(6);
    expect(byRole("Refuerzo de hoja")?.medidaMm).toBe(testCase.expectedReinforcement);
    expect(byRole("Riel")?.codigoPerfil).toBe("61016ver");
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: testCase.expectedGlass,
      altoMm: testCase.expectedGlassHeight,
      cantidadPiezas: 3,
    });
    expect(recipe.estado).toBe("lista_para_validar");
    expect(recipe.perfiles.find((profile) => profile.codigoPerfil === "67401VER")).toMatchObject({
      largoComercialMm: null,
      largoComercialPendiente: true,
    });
    expect(recipe.perfiles.filter((profile) => profile.codigoPerfil !== "67401VER").every((profile) =>
      profile.largoComercialMm === 5800 && !profile.largoComercialPendiente
    )).toBe(true);
    const pauta = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });
    expect(pauta.barras.length).toBeGreaterThan(0);
    expect(pauta.advertencias).toContainEqual(
      expect.objectContaining({ codigo: "PERFIL_SIN_DATOS_DE_BARRA" })
    );
    expect(pauta.advertencias.some((warning) => warning.mensaje.includes("Marco"))).toBe(true);
  });

  it.each([
    {
      slug: "7400_3h_grande_2rieles",
      width: 3050,
      height: 2370,
      expected: [3056, 2376, 2980, 2300, 1020, 2282, 854, 2116, 2276, 2936],
      source: "corred2riel3hojas2mismoriel",
    },
    {
      slug: "7400_3h_chica_2rieles",
      width: 3000,
      height: 2000,
      expected: [3006, 2006, 2930, 1930, 997, 1912, 831, 1746, 1906, 2886],
      source: "corred2rieles3hojas2mismoriel",
    },
  ])("reproduce la muestra de la hoja $source para $slug", (sample) => {
    const recipe = crearRecetaVeratec7400Workbook3H({
      lineName: "Sliding 7400 · 3 hojas",
      variant: sample.slug as (typeof VERATEC_7400_WORKBOOK_3H_VARIANTS)[number]["slug"],
      createId: (() => {
        let index = 0;
        return () => `source-sample-${sample.slug}-${++index}`;
      })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: sample.width,
      altoTotalMm: sample.height,
      cantidad: 1,
      hojas: 3,
      modulos: 3,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual(sample.expected);
    expect(recipe.notasValidacion.some((note) => note.includes(sample.source))).toBe(true);
  });

  it.each([
    { slug: "elegans_ventana_hoja_interior", typology: "abatible", expectedGlass: [1017, 1317] },
    { slug: "elegans_ventana_hoja_exterior", typology: "abatible", expectedGlass: [956, 1256] },
    { slug: "elegans_puerta_hoja_interior", typology: "puerta_abatible", expectedGlass: null },
    { slug: "elegans_puerta_hoja_exterior", typology: "puerta_abatible", expectedGlass: null },
  ])("calcula perfiles documentados de $slug y deja el vidrio pendiente si hay conflicto", (sample) => {
    const variant = VERATEC_ELEGANS_BATIENTE_VARIANTS.find((entry) => entry.slug === sample.slug)!;
    const recipe = crearRecetaVeratecElegansBatiente({
      lineName: "Elegans 60",
      variant: variant.slug,
      createId: (() => { let i = 0; return () => `batiente-${sample.slug}-${++i}`; })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });
    expect(result.calculable).toBe(true);
    expect(result.perfiles.length).toBe(8);
    expect(recipe.identidad.tipologia).toBe(sample.typology);
    expect(recipe.perfiles.every((profile) => profile.largoComercialPendiente)).toBe(true);
    if (sample.expectedGlass) {
      expect(result.vidrios[0]).toMatchObject({ anchoMm: sample.expectedGlass[0], altoMm: sample.expectedGlass[1] });
    } else {
      expect(result.vidrios).toEqual([]);
      expect(recipe.datosPendientes?.some((pending) => pending.includes("dimensiones de vidrio"))).toBe(true);
    }
    expect(recipe.permitirCalculoPreliminarConPendientes).toBe(true);
  });

  it.each([
    { slug: "7400_monorriel_hoja_grande", width: 1000, height: 1000, glass: [[354, 750], [405, 880]] },
    { slug: "7400_monorriel_hoja_chica", width: 2030, height: 700, glass: [[886, 486], [929, 580]] },
  ])("calcula perfiles y paños de la configuración $slug", (sample) => {
    const variant = VERATEC_7400_MONORAIL_VARIANTS.find((entry) => entry.slug === sample.slug)!;
    const recipe = crearRecetaVeratec7400Monorriel({
      lineName: "Sliding 7400 · Monorriel",
      variant: variant.slug,
      createId: (() => { let i = 0; return () => `mono-${sample.slug}-${++i}`; })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: sample.width,
      altoTotalMm: sample.height,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
    });
    expect(result.calculable).toBe(true);
    expect(result.perfiles).toHaveLength(14);
    expect(result.vidrios.map((glass) => [glass.anchoMm, glass.altoMm])).toEqual(sample.glass);
    expect(recipe.perfiles.filter((profile) => profile.largoComercialPendiente)).toHaveLength(14);
    expect(recipe.perfiles.some((profile) => profile.funcion === "Junquillo")).toBe(false);
  });
});

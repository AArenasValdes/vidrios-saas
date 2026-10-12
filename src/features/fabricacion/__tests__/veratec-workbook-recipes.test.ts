import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import {
  crearRecetaVeratec7400Monorriel,
  crearRecetaVeratecCompactSliding,
  crearRecetaVeratec7400Workbook3H,
  VERATEC_7400_WORKBOOK_3H_VARIANTS,
  VERATEC_COMPACT_SLIDING_VARIANTS,
  VERATEC_7400_MONORAIL_VARIANTS,
  VERATEC_WORKBOOK_SOURCE_REVISION,
} from "@/features/fabricacion/fixtures/veratec-workbook-recipes";
import {
  crearRecetaVeratec7400CuatroHojasChicas,
  crearRecetaVeratecElevadora,
  crearRecetaVeratecInova,
  VERATEC_7400_4H_VARIANTS,
  VERATEC_ELEVADORA_VARIANTS,
} from "@/features/fabricacion/fixtures/veratec-preliminary-recipes";
import {
  getLineVariantSlots,
} from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { getSuggestedRecipesForLine } from "@/features/fabricacion/fixtures/biblioteca-recetas-sugeridas";
import { fabricacionResultadoCubicacionSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import {
  VERATEC_7400_SOURCE_VARIANTS,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import {
  crearRecetaVeratecBahar5200,
  VERATEC_BAHAR_5200_VARIANTS,
  VERATEC_BAHAR_5200_PROYECTANTE_VARIANT,
  VERATEC_BAHAR_5200_PLEGABLE_VARIANTS,
} from "@/features/fabricacion/fixtures/veratec-bahar-5200-recipes";

describe("Bahar 5200 proyectante", () => {
  it("usa la pauta exterior compartida y conserva tipología proyectante", () => {
    const recipe = crearRecetaVeratecBahar5200({
      lineName: "Bahar 5200",
      variant: VERATEC_BAHAR_5200_PROYECTANTE_VARIANT.slug,
      createId: (() => {
        let id = 0;
        return () => `bahar-projecting-${++id}`;
      })(),
    });

    expect(recipe.identidad.tipologia).toBe("proyectante");
    expect(recipe.identidad.hojas).toBe(1);
    expect(recipe.identidad.apertura).toBe("proyectante");
    expect(recipe.perfiles.map((profile) => profile.codigoPerfil)).toContain("65209VER");
    expect(recipe.perfiles.map((profile) => profile.codigoPerfil)).toContain("61011VER990");
  });
});

describe("recetas preliminares Veratec transcritas desde la pauta facilitada", () => {
  it.each([
    { slug: "bahar_5200_fijo", expected: [1206, 1506, 1115, 1415], glass: [1110, 1410], profileCount: 4 },
    { slug: "bahar_5200_ventana_interior", expected: [1206, 1506, 1115, 1415, 1142, 1442, 1022, 1322], glass: [1017, 1317], profileCount: 8 },
    { slug: "bahar_5200_ventana_exterior", expected: [1206, 1506, 1115, 1415, 1142, 1442, 1019, 1324], glass: [1014, 1314], profileCount: 8 },
  ])("calcula Bahar 5200 $slug desde fórmulas de su hoja", (sample) => {
    const variant = VERATEC_BAHAR_5200_VARIANTS.find((entry) => entry.slug === sample.slug)!;
    const recipe = crearRecetaVeratecBahar5200({
      lineName: "Bahar 5200",
      variant: variant.slug,
      createId: (() => { let index = 0; return () => `bahar-${sample.slug}-${++index}`; })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 1,
      modulos: 1,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => profile.medidaMm)).toEqual(sample.expected);
    expect(result.perfiles).toHaveLength(sample.profileCount);
    expect(result.perfiles.every((profile) => profile.medidaMm > 0 && profile.cantidadPiezas === 2)).toBe(true);
    expect(result.vidrios[0]).toMatchObject({ anchoMm: sample.glass[0], altoMm: sample.glass[1], cantidadPiezas: 1 });
    expect(recipe.perfiles.filter((profile) => profile.codigoPerfil === "65201VER").every((profile) => profile.largoComercialMm === 5800)).toBe(true);
    expect(recipe.estado).toBe("lista_para_validar");
    expect(recipe.datosPendientes?.join(" ")).toMatch(/junquillo|refuerzos|kerf/i);
  });

  it.each([
    {
      slug: "bahar_5200_plegable_3_3_0",
      expectedProfiles: [[2606, 2], [1946, 2], [819, 4], [909, 2], [1882, 6]],
      expectedGlass: [[605, 2], [695, 1]],
      glassHeight: 1668,
    },
    {
      slug: "bahar_5200_plegable_4_3_1",
      expectedProfiles: [[2891, 2], [2156, 2], [686, 6], [776, 2], [2092, 8]],
      expectedGlass: [[472, 3], [562, 1]],
      glassHeight: 1878,
    },
    {
      slug: "bahar_5200_plegable_6_5_1",
      expectedProfiles: [[4961, 2], [2141, 2], [795, 8], [885, 2], [845, 2], [2077, 12]],
      expectedGlass: [[581, 4], [671, 1], [631, 1]],
      glassHeight: 1863,
    },
    {
      slug: "bahar_5200_plegable_7_4_3",
      expectedProfiles: [[5416, 2], [2208, 2], [733, 8], [823, 4], [783, 2], [2144, 14]],
      expectedGlass: [[519, 4], [609, 2], [569, 1]],
      glassHeight: 1930,
    },
  ])("reproduce la pauta Bahar plegable $slug con el redondeo de corte a mm", (sample) => {
    const variant = VERATEC_BAHAR_5200_PLEGABLE_VARIANTS.find((entry) => entry.slug === sample.slug)!;
    const recipe = crearRecetaVeratecBahar5200({ lineName: "Bahar 5200", variant: variant.slug });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: variant.nominalSample.width,
      altoTotalMm: variant.nominalSample.height,
      cantidad: 1,
      hojas: variant.leaves,
      modulos: 1,
    });
    expect(result.calculable).toBe(true);
    expect(result.perfiles.map(({ medidaMm, cantidadPiezas }) => [medidaMm, cantidadPiezas])).toEqual(sample.expectedProfiles);
    expect(result.vidrios.map(({ anchoMm, cantidadPiezas }) => [anchoMm, cantidadPiezas])).toEqual(sample.expectedGlass);
    expect(result.vidrios.every(({ altoMm }) => altoMm === sample.glassHeight)).toBe(true);
    expect(recipe.perfiles.every(({ largoComercialMm }) => largoComercialMm === 5800)).toBe(true);
    expect(recipe.identidad).toMatchObject({ tipologia: "puerta_abatible", hojas: variant.leaves, apertura: "plegable" });
    expect(recipe.estado).toBe("lista_para_validar");
  });

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
    expect(result.accesorios).toMatchObject([
      { nombre: expect.stringContaining("Rodamiento"), cantidadUnidades: testCase.leaves * 2, unidad: "unidad" },
      { nombre: expect.stringContaining("cierre central"), cantidadUnidades: 1, unidad: "kit" },
      { nombre: expect.stringContaining("Felpa"), unidad: "m" },
      { nombre: expect.stringContaining("tapas"), cantidadUnidades: 1, unidad: "kit" },
    ]);
    expect(result.accesorios.find((row) => row.unidad === "m")?.cantidadUnidades).toBeGreaterThan(0);
    expect(fabricacionResultadoCubicacionSchema.parse(result).accesorios.find((row) => row.unidad === "m")?.cantidadUnidades).toBeGreaterThan(0);

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
      "ventora:veratec-7400-monorriel",
    ];

    for (const catalogKey of workshopOnlyCatalogKeys) {
      expect(getLineVariantSlots(catalogKey).length).toBeGreaterThan(0);
      expect(getLineVariantSlots(catalogKey).every((slot) => slot.complete === false)).toBe(true);
    }
    for (const variant of VERATEC_BAHAR_5200_VARIANTS) {
      const slots = getLineVariantSlots(variant.catalogKey);
      if (variant.slug === "bahar_5200_ventana_exterior") {
        expect(slots).toHaveLength(2);
        expect(slots.map((slot) => slot.typology)).toEqual(["abatible", "proyectante"]);
      } else {
        expect(slots).toHaveLength(1);
      }
      expect(slots.every((slot) => slot.complete)).toBe(true);
    }
    for (const variant of VERATEC_BAHAR_5200_PLEGABLE_VARIANTS) {
      expect(getLineVariantSlots(variant.catalogKey)).toMatchObject([
        { typology: "puerta_abatible", leavesCount: variant.leaves, complete: true },
      ]);
    }
    expect(getLineVariantSlots("ventora:veratec-elegans-60-fijo")).toEqual([]);
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
    expect(getLineVariantSlots("ventora:veratec-inova-corredera-2h")).toHaveLength(1);
    expect(getLineVariantSlots("ventora:veratec-inova-76-ventana")).toEqual([]);
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
      largoComercialMm: 6000,
      largoComercialPendiente: false,
    });
    expect(recipe.perfiles.filter((profile) => profile.codigoPerfil !== "67401VER").every((profile) =>
      [5800, 6000].includes(profile.largoComercialMm ?? 0) && !profile.largoComercialPendiente
    )).toBe(true);
    const pauta = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });
    expect(pauta.barras.length).toBeGreaterThan(0);
    expect(pauta.barras.every((bar) => [5800, 6000].includes(bar.largoComercialMm))).toBe(true);
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

  it.each(VERATEC_7400_4H_VARIANTS)("calcula la base operacional 4H chica $slug", (variant) => {
    const recipe = crearRecetaVeratec7400CuatroHojasChicas({
      lineName: "Sliding 7400",
      variant: variant.slug,
      createId: (() => { let i = 0; return () => `7400-4h-${variant.slug}-${++i}`; })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1600,
      altoTotalMm: 2000,
      cantidad: 1,
      hojas: 4,
      modulos: 4,
    });

    expect(result.calculable).toBe(true);
    expect(recipe.perfiles.find((profile) => profile.funcion === "Hoja")?.codigoPerfil).toBe(variant.leafCode);
    expect(variant.leafCode).toBe("67415VER");
    expect(result.perfiles.find((profile) => profile.funcion === "Hoja")?.medidaMm).toBe(418);
    expect(result.perfiles.find((profile) => profile.funcion === "Hoja")?.cantidadPiezas).toBe(8);
    expect(recipe.perfiles.find((profile) => profile.funcion === "Hoja")?.largoComercialMm).toBe(6000);
    expect(result.vidrios[0]).toMatchObject({ anchoMm: 332, altoMm: 1826, cantidadPiezas: 4 });
    expect(result.perfiles.every((profile) => Number.isFinite(profile.medidaMm) && Number.isFinite(profile.cantidadPiezas))).toBe(true);
    expect(recipe.perfiles.some((profile) => profile.codigoPerfil === "67414VER")).toBe(false);
    expect(result.accesorios.find((entry) => /Rodamiento/.test(entry.nombre))?.cantidadUnidades).toBe(8);
    expect(result.accesorios.find((entry) => /Cierre embutido/.test(entry.nombre))?.cantidadUnidades).toBe(2);
    expect(result.accesorios.find((entry) => /Juego de cierre central/.test(entry.nombre))?.cantidadUnidades).toBe(1);
    expect(result.accesorios.find((entry) => /Felpa/.test(entry.nombre))?.cantidadUnidades).toBe(18.64);
    expect(result.accesorios.find((entry) => /Goma cuña/.test(entry.nombre))?.cantidadUnidades).toBe(17.264);
    expect(recipe.datosPendientes?.join(" ")).not.toMatch(/67414.*67415/);
    expect(recipe.notasValidacion.join(" ")).toMatch(/67414 queda reservado/);
    expect(recipe.estado).toBe("lista_para_validar");
  });

  it("calcula solo el marco y ancho de hoja de Inova; deja altura y vidrio pendientes", () => {
    const recipe = crearRecetaVeratecInova({ lineName: "Inova", createId: (() => { let i = 0; return () => `inova-${++i}`; })() });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
    });
    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => [profile.funcion, profile.medidaMm, profile.cantidadPiezas])).toEqual([
      ["Marco", 1200, 2], ["Marco", 1500, 2], ["Hoja", 612, 4],
    ]);
    expect(result.vidrios).toEqual([]);
    expect(recipe.perfiles.every((profile) => profile.codigoPerfil === "")).toBe(true);
    expect(recipe.datosPendientes?.join(" ")).toMatch(/altura de hoja/);
    expect(getLineVariantSlots("ventora:veratec-inova-corredera-2h")).toHaveLength(1);
  });

  it("deja Elevadora lista para configurar solo en esquemas A y C, sin inventar despiece", () => {
    for (const variant of VERATEC_ELEVADORA_VARIANTS) {
      const recipe = crearRecetaVeratecElevadora({ lineName: "Elevadora", variant: variant.slug, createId: (() => { let i = 0; return () => `elevadora-${variant.slug}-${++i}`; })() });
      const result = calcularCubicacionYPauta(recipe, {
        anchoTotalMm: 1200, altoTotalMm: 1500, cantidad: 1, hojas: variant.leaves, modulos: variant.leaves,
      });
      expect(recipe.perfiles).toEqual([]);
      expect(result.calculable).toBe(false);
      expect(recipe.datosPendientes?.join(" ")).toMatch(/no entrega códigos de perfiles/);
    }
    expect(getLineVariantSlots(VERATEC_ELEVADORA_VARIANTS[0].catalogKey)).toHaveLength(1);
    expect(getLineVariantSlots(VERATEC_ELEVADORA_VARIANTS[1].catalogKey)).toHaveLength(1);
    expect(getLineVariantSlots("ventora:veratec-elevadora-2h-2moviles")).toEqual([]);
    expect(getLineVariantSlots("ventora:veratec-elevadora-3h-2fijos-1movil")).toEqual([]);
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
    expect(recipe.perfiles.every((profile) => profile.largoComercialMm === 6000 && !profile.largoComercialPendiente)).toBe(true);
    expect(recipe.perfiles.some((profile) => profile.funcion === "Junquillo")).toBe(false);
  });
});

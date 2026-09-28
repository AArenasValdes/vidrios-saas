import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import {
  crearRecetaWinHouseNewS75,
  WINHOUSE_NEW_S75_VARIANTS,
  WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
  WINHOUSE_NEW_S75_TRIPLE_CATALOG_KEY,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import {
  crearRecetaWinHouseS60Candidata,
  WINHOUSE_S60_VARIANTS,
} from "@/features/fabricacion/fixtures/winhouse-s60-recipes";
import { resolveWinHouseS60QuoteVariant } from "@/features/fabricacion/services/winhouse-s60-quote-config.service";
import { resolveWinHouseNewS75QuoteVariant } from "@/features/fabricacion/services/winhouse-new-s75-quote-config.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { getLineVariantSlots } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

describe("smoke de recetas WinHouse para cubicación, despiece y pauta", () => {
  it("siembra todas las geometrías de las 12 pestañas de corte S75 por línea y vidrio", () => {
    const doubleRailSlots = getLineVariantSlots(WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY);
    const tripleRailSlots = getLineVariantSlots(WINHOUSE_NEW_S75_TRIPLE_CATALOG_KEY);

    expect(doubleRailSlots).toHaveLength(30);
    expect(tripleRailSlots).toHaveLength(6);
    expect(
      new Set(
        [...doubleRailSlots, ...tripleRailSlots].map((slot) =>
          slot.variantSlug.replace(/(?:_mono_4_6|_dvh_17_20|_dvh_20_22)$/, "")
        )
      ).size
    ).toBe(12);
    expect([...doubleRailSlots, ...tripleRailSlots].every((slot) => slot.complete)).toBe(true);
  });

  it("calcula las 36 combinaciones S75 y produce cortes agrupables en barras", () => {
    expect(WINHOUSE_NEW_S75_VARIANTS).toHaveLength(36);

    for (const variant of WINHOUSE_NEW_S75_VARIANTS) {
      const recipe = crearRecetaWinHouseNewS75({
        lineName: "WinHouse New S75",
        variant: variant.slug,
        createId: (() => {
          let id = 0;
          return () => `s75-${variant.slug}-${++id}`;
        })(),
      });
      const asymmetricTwoLeaf = variant.geometrySlug.startsWith("doble_riel_2h_asimetrica_");
      const input = {
        anchoTotalMm: 1200,
        ...(asymmetricTwoLeaf ? { anchoHojaAMm: 700 } : {}),
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: variant.leaves,
        modulos: variant.leaves,
        variante: variant.slug,
      };

      const result = calcularCubicacionYPauta(recipe, input);
      const bars = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });

      expect(result.calculable).toBe(true);
      expect(result.perfiles).toHaveLength(recipe.perfiles.length);
      expect(result.perfiles.every((row) => row.medidaMm > 0 && row.cantidadPiezas > 0)).toBe(true);
      expect(result.vidrios.reduce((sum, glass) => sum + glass.cantidadPiezas, 0)).toBe(variant.leaves);
      expect(result.advertencias.filter((warning) => warning.nivel === "error")).toHaveLength(0);
      expect(bars.barras.length).toBeGreaterThan(0);
      expect(bars.advertencias.filter((warning) => warning.nivel === "error")).toHaveLength(0);
      expect(evaluarRecetaListaParaProbar(recipe).listaParaProbar).toBe(false);
    }
  });

  it("resuelve las 36 variantes S75 por la línea seleccionada en cotización", () => {
    const glassByBand = {
      mono_4_6: "Vidrio monolítico 4 mm",
      dvh_17_20: "DVH 4+10+5",
      dvh_20_22: "DVH 5+12+5",
    } as const;

    for (const variant of WINHOUSE_NEW_S75_VARIANTS) {
      const lineTemplateId = variant.railCount === 3 ? 227 : 226;
      const catalogKey =
        variant.railCount === 3
          ? WINHOUSE_NEW_S75_TRIPLE_CATALOG_KEY
          : WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY;
      const lineName = `WinHouse New S75 — ${variant.railCount === 3 ? "Triple" : "Doble"} riel`;
      const item: CotizacionWorkflowItem = {
        id: `smoke-${variant.slug}`,
        codigo: "V1",
        tipo: "Ventana",
        lineaComercial: lineName,
        vidrio: glassByBand[variant.glassBand],
        nombre: "Ventana corredera",
        descripcion: variant.geometryLabel,
        ancho: 1200,
        alto: 1000,
        cantidad: 1,
        unidad: "unidad",
        precioUnitario: 0,
        subtotal: 0,
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: String(lineTemplateId),
          catalogLineKey: catalogKey,
          sistema: "Corredera",
          configuracion: variant.geometryLabel,
          fabricacionTipologia: "corredera",
          fabricacionHojas: variant.leaves,
          fabricacionModulos: variant.leaves,
          fabricacionVariante: variant.slug,
          ...(variant.geometrySlug.startsWith("doble_riel_2h_asimetrica_")
            ? { fabricacionAnchoHojaAMm: 700 }
            : {}),
        }),
        tipoItem: "componente",
        fabricacionSnapshot: null,
      };

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [],
        organizationId: 1,
        lineTemplateId,
        lineCatalogKey: catalogKey,
      });

      expect(resolved.estado).toBe("calculado");
      expect(resolved.preliminary).toBe(true);
      expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
      expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
    }
  });

  it("exige ancho A en 2H asimétrica y deriva B sin perder la entrada", () => {
    const recipe = crearRecetaWinHouseNewS75({
      lineName: "WinHouse New S75",
      variant: "doble_riel_2h_asimetrica_80_mono_4_6",
      createId: (() => {
        let id = 0;
        return () => `s75-asym-${++id}`;
      })(),
    });
    const base = {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
      variante: recipe.identidad.variante,
    };

    const missing = calcularCubicacionYPauta(recipe, base);
    expect(missing.calculable).toBe(false);
    expect(missing.perfiles).toHaveLength(0);
    expect(missing.advertencias.some((warning) => warning.codigo === "ANCHO_HOJA_A_REQUERIDO")).toBe(true);

    const result = calcularCubicacionYPauta(recipe, { ...base, anchoHojaAMm: 700 });
    expect(result.calculable).toBe(true);
    expect(result.entradaNormalizada?.anchoHojaAMm).toBe(700);
    expect(result.perfiles.find((row) => row.funcion === "Hoja horizontal A")?.medidaMm).toBe(705);
    expect(result.perfiles.find((row) => row.funcion === "Hoja horizontal B")?.medidaMm).toBe(505);
    expect(result.vidrios.find((row) => row.nombre.includes("hoja A"))?.anchoMm).toBe(570);
    expect(result.vidrios.find((row) => row.nombre.includes("hoja B"))?.anchoMm).toBe(370);

    const tooWide = calcularCubicacionYPauta(recipe, { ...base, anchoHojaAMm: 1200 });
    expect(tooWide.calculable).toBe(false);
    expect(tooWide.advertencias.some((warning) => warning.codigo === "ANCHO_HOJA_A_REQUERIDO")).toBe(true);
  });

  it("selecciona la variante S75 por vidrio y conserva ancho A en el snapshot", () => {
    const variant = "doble_riel_2h_asimetrica_80_dvh_17_20";
    const selection = resolveWinHouseNewS75QuoteVariant({
      catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
      tipologia: "corredera",
      hojas: 2,
      vidrio: "DVH 4+10+5 (19 mm)",
      variantHint: variant,
      configuration: "2 hojas asimétricas, hoja 80 mm",
    });
    expect(selection.variant?.slug).toBe(variant);

    const definition = crearRecetaWinHouseNewS75({
      lineName: "WinHouse New S75",
      variant,
      createId: (() => {
        let id = 0;
        return () => `s75-snapshot-${++id}`;
      })(),
    });
    const recipe: FabricationRecipeRecord = {
      id: "recipe-s75-asymmetric",
      organizationId: 1,
      lineTemplateId: 226,
      scope: "organization",
      providerName: "WinHouse",
      lineName: "WinHouse New S75",
      typology: "corredera",
      leavesCount: 2,
      variant,
      version: 1,
      status: "draft",
      definition,
      sourceType: "manufacturer",
      sourceReference: "manufacturer:winhouse:new-s75:test",
      sourceName: "WinHouse New S75",
      sourceRevision: "official-pauta-test",
      parentRecipeId: null,
      validatedAt: null,
      validatedBy: null,
      createdAt: "2026-09-27T00:00:00.000Z",
      updatedAt: "2026-09-27T00:00:00.000Z",
      eliminadoEn: null,
    };
    const snapshot = construirSnapshotFabricacionCotizacion({
      recipe,
      entrada: {
        anchoTotalMm: 1200,
        anchoHojaAMm: 700,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: variant,
      },
    });
    expect(snapshot.input.anchoHojaAMm).toBe(700);
    expect(snapshot.result.calculable).toBe(true);
  });

  it("respeta geometría S75 elegida explícitamente aunque el componente diga ventana", () => {
    const selection = resolveWinHouseNewS75QuoteVariant({
      catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
      tipologia: "corredera",
      hojas: 2,
      vidrio: "DVH 4+10+5",
      variantHint: "doble_riel_2h_simetrica_98_dvh_17_20",
      componentName: "Ventana corredera",
    });

    expect(selection.variant?.slug).toBe("doble_riel_2h_simetrica_98_dvh_17_20");
  });

  it.each([
    ["doble_riel_3h_asimetrica_centro_ancho_80_mono_4_6", 345, 605],
    ["doble_riel_3h_asimetrica_centro_ancho_98_mono_4_6", 363, 605],
  ])("respeta la distribución S75 3H centro ancho de %s", (variant, expectedAC, expectedB) => {
    const recipe = crearRecetaWinHouseNewS75({
      lineName: "WinHouse New S75",
      variant,
      createId: (() => {
        let id = 0;
        return () => `s75-3h-${++id}`;
      })(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 3,
      modulos: 3,
      variante: variant,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.find((row) => row.funcion === "Hoja horizontal A/C")?.medidaMm).toBe(expectedAC);
    expect(result.perfiles.find((row) => row.funcion === "Hoja horizontal B")?.medidaMm).toBe(expectedB);
  });

  it("calcula las tres variantes fijas S60 y conserva bloqueos del resto", () => {
    const fixedVariants = [
      WINHOUSE_S60_VARIANTS.fijoMonolitico,
      WINHOUSE_S60_VARIANTS.fijoTermopanel1720,
      WINHOUSE_S60_VARIANTS.fijoTermopanel2224,
    ];

    for (const variant of fixedVariants) {
      const recipe = crearRecetaWinHouseS60Candidata({
        lineName: "WinHouse S60",
        variant,
        createId: (() => {
          let id = 0;
          return () => `s60-${variant}-${++id}`;
        })(),
      });
      const result = calcularCubicacionYPauta(recipe, {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 1,
        modulos: 1,
        variante: variant,
      });
      const bars = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });

      expect(recipe.datosPendientes).toHaveLength(0);
      expect(result.calculable).toBe(true);
      expect(result.perfiles).toHaveLength(6);
      expect(result.vidrios[0]).toMatchObject({ anchoMm: 1096, altoMm: 896, cantidadPiezas: 1 });
      expect(bars.barras.length).toBeGreaterThan(0);
      expect(bars.advertencias.filter((warning) => warning.nivel === "error")).toHaveLength(0);
    }

    const blockedVariants = [
      WINHOUSE_S60_VARIANTS.proyectanteMonolitico,
      WINHOUSE_S60_VARIANTS.proyectanteTermopanel1720,
      WINHOUSE_S60_VARIANTS.proyectanteTermopanel2224,
      WINHOUSE_S60_VARIANTS.abatibleDobleTermopanel1720,
      WINHOUSE_S60_VARIANTS.abatibleDobleTermopanel2224,
    ];
    for (const variant of blockedVariants) {
      const recipe = crearRecetaWinHouseS60Candidata({ lineName: "WinHouse S60", variant });
      expect(recipe.datosPendientes!.length).toBeGreaterThan(0);
      expect(evaluarRecetaListaParaProbar(recipe).listaParaProbar).toBe(false);
      const result = calcularCubicacionYPauta(recipe, {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: recipe.identidad.hojas,
        modulos: recipe.identidad.modulos,
        variante: variant,
      });
      expect(result.calculable).toBe(false);
    }
  });

  it("resuelve el vidrio final S60 a la variante fija correspondiente", () => {
    expect(
      resolveWinHouseS60QuoteVariant({
        catalogKey: "ventora:winhouse-s60",
        tipologia: "pano_fijo",
        hojas: 1,
        vidrio: "Termopanel 4+12+4 (20 mm)",
      })
    ).toEqual({ handled: true, variant: WINHOUSE_S60_VARIANTS.fijoTermopanel1720 });

    expect(
      resolveWinHouseS60QuoteVariant({
        catalogKey: "ventora:winhouse-s60",
        tipologia: "pano_fijo",
        hojas: 1,
        vidrio: "Laminado 3+3 mm",
      })
    ).toEqual({ handled: true, variant: null });
  });
});

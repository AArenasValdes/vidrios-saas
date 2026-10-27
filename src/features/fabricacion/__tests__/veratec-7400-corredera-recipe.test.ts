import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { construirPautaBarrasFabricacion } from "@/features/fabricacion/services/fabricacion-pauta-barras.service";
import {
  getLineVariantSlots,
} from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import {
  crearRecetaVeratec7400Corredera,
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
  VERATEC_7400_VARIANT_TERMOPANEL_20MM,
  VERATEC_7400_VARIANT_TERMOPANEL_24MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import { buildSeedPayloadForVariantSlot } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { VERATEC_7400_4MM_SOURCE_ORACLE } from "@/features/fabricacion/__tests__/veratec-7400-regression-cases";

function makeId() {
  let counter = 0;
  return () => `veratec-test-${++counter}`;
}

describe("VERATEC 7400 corredera 2 hojas", () => {
  it("conserva los 40 cortes y comprueba el packing conjunto en 1200 × 1500 mm", () => {
    const recipe = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: makeId(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
      variante: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    });
    const jointPlan = construirPautaBarrasFabricacion({ receta: recipe, resultado: result });

    expect(result.perfiles.reduce((total, profile) => total + profile.cantidadPiezas, 0)).toBe(40);
    expect(jointPlan.barras).toHaveLength(11);
    expect(recipe.estado).toBe("lista_para_validar");
  });

  it("calcula destajes, vidrio, herrajes y barra documentados para monolítico 4 mm", () => {
    const testCase = VERATEC_7400_4MM_SOURCE_ORACLE;
    const recipe = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: testCase.identity.variant,
      createId: makeId(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: testCase.dimensionsMm.width,
      altoTotalMm: testCase.dimensionsMm.height,
      cantidad: testCase.dimensionsMm.quantity,
      hojas: testCase.identity.leaves,
      modulos: testCase.identity.leaves,
      variante: testCase.identity.variant,
    });

    expect(result.calculable).toBe(true);
    expect(result.perfiles.map((profile) => [
      profile.codigoPerfil,
      profile.medidaMm,
      profile.cantidadPiezas,
    ])).toEqual(testCase.expectedProfileCuts);
    expect(result.vidrios[0]).toMatchObject({
      anchoMm: testCase.expectedGlass.widthMm,
      altoMm: testCase.expectedGlass.heightMm,
      cantidadPiezas: testCase.expectedGlass.quantity,
    });
    expect(result.accesorios.map((item) => item.cantidadUnidades)).toEqual([
      2, 1, 1, 16, 4, 2, 2, 2, 4, 1, 2, 2, 17,
    ]);
    expect(recipe.perfiles.every((profile) => profile.largoComercialMm === 5800)).toBe(
      true
    );
    expect(evaluarRecetaListaParaProbar(recipe).listaParaProbar).toBe(true);
  });

  it("mantiene visibles las contradicciones TP y permite una pauta preliminar editable", () => {
    const termopanel20 = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_TERMOPANEL_20MM,
      createId: makeId(),
    });
    const termopanel24 = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_TERMOPANEL_24MM,
      createId: makeId(),
    });

    expect(termopanel20.datosPendientes?.[0]).toMatch(/Monolítico 20 mm.*termopanel/i);
    expect(termopanel24.datosPendientes?.[0]).toMatch(/7063.*6307/);
    expect(termopanel24.perfiles.filter((profile) => profile.funcion === "Junquillo" && !profile.codigoPerfil)).toHaveLength(2);
    expect(evaluarRecetaListaParaProbar(termopanel20).listaParaProbar).toBe(false);
    expect(evaluarRecetaListaParaProbar(termopanel24).listaParaProbar).toBe(false);
    for (const [variant, recipe, expectedJunquillo] of [
      [VERATEC_7400_VARIANT_TERMOPANEL_20MM, termopanel20, "6307"],
      [VERATEC_7400_VARIANT_TERMOPANEL_24MM, termopanel24, ""],
    ] as const) {
      const result = calcularCubicacionYPauta(recipe, {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: variant,
      });

      expect(result.calculable).toBe(true);
      expect(result.advertencias.some((warning) => warning.codigo === "RECETA_DATOS_PENDIENTES")).toBe(true);
      expect(result.perfiles.map((profile) => [
        profile.codigoPerfil,
        profile.medidaMm,
        profile.cantidadPiezas,
      ])).toEqual([
        ["7401", 1206, 2],
        ["7401", 1006, 2],
        ["AB01016-E", 1088, 2],
        ["7414", 604, 4],
        ["7414", 912, 4],
        ["7418", 906, 2],
        [expectedJunquillo, 452, 4],
        [expectedJunquillo, 833, 4],
        ["69014STL001", 530, 4],
        ["69014STL001", 930, 4],
        ["69069STL000", 520, 4],
        ["69069STL000", 920, 4],
      ]);
      expect(result.vidrios[0]).toMatchObject({
        anchoMm: 442,
        altoMm: 823,
        cantidadPiezas: 2,
      });
    }
  });

  it("expone tres slots de la misma línea y los siembra como borradores VERATEC", () => {
    const slots = getLineVariantSlots(VERATEC_7400_CATALOG_KEY);

    expect(slots.map((slot) => slot.variantSlug)).toEqual([
      VERATEC_7400_VARIANT_MONOLITICO_4MM,
      VERATEC_7400_VARIANT_TERMOPANEL_20MM,
      VERATEC_7400_VARIANT_TERMOPANEL_24MM,
    ]);
    expect(slots.map((slot) => slot.complete)).toEqual([true, false, false]);

    const payload = buildSeedPayloadForVariantSlot({
      organizationId: 9,
      lineTemplateId: 41,
      lineName: "Veratec 7400",
      providerName: "VERATEC",
      catalogKey: VERATEC_7400_CATALOG_KEY,
      slot: slots[0]!,
    });

    expect(payload).toMatchObject({
      organization_id: 9,
      line_template_id: 41,
      provider_name: "VERATEC",
      status: "draft",
      source_type: "manufacturer",
      source_name: "VERATEC",
      source_reference: "alumetrica:veratec-7400:2h:monolitico-4mm:v1",
    });
  });
});

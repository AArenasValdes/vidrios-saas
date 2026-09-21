import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
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

function makeId() {
  let counter = 0;
  return () => `veratec-test-${++counter}`;
}

describe("VERATEC 7400 corredera 2 hojas", () => {
  it("calcula destajes, vidrio, herrajes y barra documentados para monolítico 4 mm", () => {
    const recipe = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: makeId(),
    });
    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 2,
      variante: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    });

    expect(result.calculable).toBe(true);
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
      ["6306", 452, 4],
      ["6306", 833, 4],
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
    expect(result.accesorios.map((item) => item.cantidadUnidades)).toEqual([
      2, 1, 1, 16, 4, 2, 2, 2, 4, 1, 2, 2, 17,
    ]);
    expect(recipe.perfiles.every((profile) => profile.largoComercialMm === 5800)).toBe(
      true
    );
    expect(evaluarRecetaListaParaProbar(recipe).listaParaProbar).toBe(true);
  });

  it("mantiene las contradicciones de ficha visibles y bloqueadas", () => {
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
    expect(termopanel24.perfiles.filter((profile) => profile.codigoPerfil === "6307")).toHaveLength(2);
    expect(evaluarRecetaListaParaProbar(termopanel20).listaParaProbar).toBe(false);
    expect(evaluarRecetaListaParaProbar(termopanel24).listaParaProbar).toBe(false);
    for (const [variant, recipe, expectedJunquillo] of [
      [VERATEC_7400_VARIANT_TERMOPANEL_20MM, termopanel20, "6307"],
      [VERATEC_7400_VARIANT_TERMOPANEL_24MM, termopanel24, "6307"],
    ] as const) {
      const result = calcularCubicacionYPauta(recipe, {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: variant,
      });

      expect(result.calculable).toBe(false);
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

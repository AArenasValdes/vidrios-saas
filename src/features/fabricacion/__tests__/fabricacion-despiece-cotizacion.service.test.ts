import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  crearRecetaPlantillaVentoraCorredera2H,
  crearRecetaReferenciaL5000Corredera2H,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { crearRecetaPlantillaVentoraProyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import {
  anyQuoteItemCanOpenDespiecePreview,
  buildQuoteDespiecePreviewEligibility,
  canOpenDespiecePreviewForQuoteItem,
  findFirstQuoteItemWithDespiecePreview,
  resolveFabricacionDespieceForQuoteItem,
} from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

function recipeRecord(
  overrides: Partial<FabricationRecipeRecord> = {},
  plantillaId?: PlantillaVentoraCorrederaId
): FabricationRecipeRecord {
  let nextId = 0;
  const definition =
    overrides.definition ??
    (plantillaId
      ? crearRecetaPlantillaVentoraCorredera2H(plantillaId, {
          createId: () => `${plantillaId.toLowerCase()}-quote-${nextId++}`,
        })
      : crearRecetaReferenciaL5000Corredera2H({
          createId: () => `l5000-quote-${nextId++}`,
        }));
  return {
    id: overrides.id ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationId: overrides.organizationId ?? 1,
    lineTemplateId: overrides.lineTemplateId ?? 135,
    scope: overrides.scope ?? "organization",
    providerName: overrides.providerName ?? "Ventora",
    lineName: overrides.lineName ?? plantillaId ?? "L5000",
    typology: overrides.typology ?? "corredera",
    leavesCount: overrides.leavesCount ?? 2,
    variant: overrides.variant ?? "estandar",
    version: overrides.version ?? 1,
    status: overrides.status ?? "testing",
    definition,
    sourceType: overrides.sourceType ?? "manual",
    sourceReference: overrides.sourceReference ?? null,
    parentRecipeId: overrides.parentRecipeId ?? null,
    validatedAt: overrides.validatedAt ?? null,
    validatedBy: overrides.validatedBy ?? null,
    createdAt: overrides.createdAt ?? "2026-08-10T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-10T00:00:00.000Z",
    eliminadoEn: overrides.eliminadoEn ?? null,
  };
}

function quoteItem(input: {
  lineTemplateId?: string;
  cantidad?: number;
  withLine?: boolean;
}): CotizacionWorkflowItem {
  return {
    id: "item-1",
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "L5000",
    vidrio: "4mm",
    nombre: "Ventana corredera",
    descripcion: "2 hojas",
    ancho: 1200,
    alto: 1000,
    cantidad: input.cantidad ?? 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: input.withLine === false ? "" : input.lineTemplateId ?? "135",
      sistema: "Corredera",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      fabricacionModulos: 2,
      fabricacionVariante: "estandar",
    }),
  };
}

describe("despiece cotización ← motor fabricación (fuente única)", () => {
  it("CASO 1: L5000 1200×1000 ×1 → 10.714 mm y 12 cortes", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(
      resolved.formal?.result.perfiles.reduce(
        (sum, row) => sum + row.cantidadPiezas,
        0
      )
    ).toBe(12);
    expect(
      resolved.formal?.result.perfiles.map((row) => [
        row.funcion,
        row.medidaMm,
        row.cantidadPiezas,
      ])
    ).toEqual([
      ["Riel superior", 1200, 1],
      ["Riel inferior", 1200, 1],
      ["Jamba", 997, 2],
      ["Zócalo", 598, 2],
      ["Cabezal", 598, 2],
      ["Pierna", 982, 2],
      ["Traslapo", 982, 2],
    ]);
    expect(
      resolved.cubication?.cuts.some((cut) =>
        /Hoja vertical|Hoja horizontal|Junquillo/i.test(cut.functionLabel)
      )
    ).toBe(false);
  });

  it("CASO 2: dos piezas → consolidado 21.428 mm", () => {
    const one = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ cantidad: 1 }),
      recipes: [recipeRecord()],
      organizationId: 1,
    });
    const two = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ cantidad: 2 }),
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(one.formal?.result.totalLinealMm).toBe(10714);
    expect(two.formal?.result.totalLinealMm).toBe(21428);
    expect(
      two.formal?.result.perfiles.find((row) => row.funcion === "Jamba")
    ).toMatchObject({ medidaMm: 997, cantidadPiezas: 4, totalLinealMm: 3988 });
  });

  it("CASO 3: línea sin receta → sin despiece inventado", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ lineTemplateId: "999" }),
      recipes: [recipeRecord({ lineTemplateId: 135 })],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("sin_receta");
    expect(resolved.formal).toBeNull();
    expect(resolved.cubication).toBeNull();
    expect(resolved.message).toMatch(/no configurada/i);
  });

  it("CASO 4b: con largos comerciales → despiece y tiras", () => {
    const recipe = recipeRecord();
    recipe.definition = {
      ...recipe.definition,
      perfiles: recipe.definition.perfiles.map((profile) => ({
        ...profile,
        largoComercialMm: 5950,
      })),
      configuracionCorte: {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: null,
      },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(resolved.barsAvailable).toBe(true);
    expect(resolved.formal?.pautaBarras?.barras.length ?? 0).toBeGreaterThan(0);
  });

  it("CASO 4: sin largos persistidos → despiece y barras con tira estándar resuelta", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(resolved.barsAvailable).toBe(true);
    expect(resolved.formal?.pautaBarras?.barras.length ?? 0).toBeGreaterThan(0);
    expect(resolved.message).toMatch(/preliminar/i);
  });

  it("CASO 5: código de perfil vacío no bloquea despiece", () => {
    const recipe = recipeRecord();
    recipe.definition.perfiles = recipe.definition.perfiles.map((profile) => ({
      ...profile,
      codigoPerfil: "",
    }));

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.calculable).toBe(true);
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
  });

  it("CASO 6: Constructor con sistema Personalizado no descarta L5000", () => {
    const item = quoteItem({});
    item.observaciones = encodeCotizacionItemPresentationMeta({
      lineTemplateId: "135",
      sistema: "Personalizado",
      configuracion: "Personalizado",
      sheetScheme: "Personalizado",
      isCustomScheme: true,
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipeRecord({ status: "validated" })],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(
      resolved.formal?.result.perfiles.some((row) => row.funcion === "Riel superior")
    ).toBe(true);
  });

  it("CASO 7: L20 en cotización usa el mismo motor → 10.660 mm", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ lineTemplateId: "220" }),
      recipes: [
        recipeRecord(
          { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", lineTemplateId: 220, status: "validated" },
          "L20"
        ),
      ],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10660);
    expect(
      resolved.formal?.result.perfiles.reduce(
        (sum, row) => sum + row.cantidadPiezas,
        0
      )
    ).toBe(12);
  });

  it("CASO 8: L25 en cotización usa el mismo motor → 10.628 mm", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ lineTemplateId: "225" }),
      recipes: [
        recipeRecord(
          { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", lineTemplateId: 225, status: "validated" },
          "L25"
        ),
      ],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10628);
    expect(
      resolved.formal?.result.perfiles.reduce(
        (sum, row) => sum + row.cantidadPiezas,
        0
      )
    ).toBe(12);
  });

  it("CASO 9: recalcula tiras aunque la pieza tenga un snapshot viejo sin barras", () => {
    const recipe = recipeRecord();
    recipe.definition = {
      ...recipe.definition,
      perfiles: recipe.definition.perfiles.map((profile) => ({
        ...profile,
        largoComercialMm: 5950,
      })),
    };
    const staleSnapshot = construirSnapshotFabricacionCotizacion({
      recipe: recipeRecord({
        definition: crearRecetaReferenciaL5000Corredera2H(),
      }),
      entrada: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: "estandar",
      },
    });

    const item = quoteItem({});
    item.fabricacionSnapshot = {
      ...staleSnapshot,
      pautaBarras: {
        calculable: false,
        barras: [],
        advertencias: [],
        totalUsadoMm: 0,
        totalPerdidaCortesMm: 0,
        totalSobranteMm: 0,
      },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.barsAvailable).toBe(true);
    expect(resolved.formal?.pautaBarras?.barras.length ?? 0).toBeGreaterThan(0);
  });

  it("canOpenDespiecePreviewForQuoteItem es true solo con línea, receta y despiece calculable", () => {
    const recipe = recipeRecord({}, "L5000");
    const item = quoteItem({});

    expect(
      canOpenDespiecePreviewForQuoteItem({
        item,
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(true);

    expect(
      canOpenDespiecePreviewForQuoteItem({
        item: quoteItem({ withLine: false }),
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(false);

    expect(
      canOpenDespiecePreviewForQuoteItem({
        item,
        recipes: [recipe],
        organizationId: null,
      })
    ).toBe(false);
  });

  it("buildQuoteDespiecePreviewEligibility indexa solo piezas elegibles", () => {
    const recipe = recipeRecord({}, "L5000");
    const eligible = quoteItem({});
    const map = buildQuoteDespiecePreviewEligibility({
      items: [quoteItem({ withLine: false }), eligible],
      recipes: [recipe],
      organizationId: 1,
    });

    expect(map.size).toBe(1);
    expect(map.get(eligible.id)).toBe(true);
  });

  it("findFirstQuoteItemWithDespiecePreview respeta el orden de la cotización", () => {
    const recipe = recipeRecord({}, "L5000");
    const first = quoteItem({ lineTemplateId: "135" });
    first.id = "item-first";
    const second = quoteItem({ lineTemplateId: "135" });
    second.id = "item-second";

    const found = findFirstQuoteItemWithDespiecePreview({
      items: [first, second],
      recipes: [recipe],
      organizationId: 1,
    });

    expect(found?.id).toBe("item-first");
  });

  it("canOpenDespiecePreviewForQuoteItem rechaza piezas sin medidas", () => {
    const recipe = recipeRecord({}, "L5000");
    const item = quoteItem({});

    expect(
      canOpenDespiecePreviewForQuoteItem({
        item: { ...item, ancho: 0 },
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(false);
  });

  it("anyQuoteItemCanOpenDespiecePreview detecta al menos una pieza elegible", () => {
    const recipe = recipeRecord({}, "L5000");
    const eligibility = buildQuoteDespiecePreviewEligibility({
      items: [quoteItem({ withLine: false }), quoteItem({})],
      recipes: [recipe],
      organizationId: 1,
    });

    expect(
      anyQuoteItemCanOpenDespiecePreview({
        items: [],
        recipes: [recipe],
        organizationId: 1,
        eligibilityByItemId: eligibility,
      })
    ).toBe(true);

    expect(
      anyQuoteItemCanOpenDespiecePreview({
        items: [quoteItem({ withLine: false })],
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(false);
  });

  it("CASO 10: L32 proyectante en constructor (hojasBase=2) no debe bloquear receta de 1 hoja", () => {
    const definition = crearRecetaPlantillaVentoraProyectante("L32");
    const recipe = recipeRecord({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      lineTemplateId: 332,
      status: "validated",
      definition,
      typology: "proyectante",
      leavesCount: 1,
    });
    const guidedVisualConfig = createQuoteConstructorPresetConfig("proyectante");
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "332", withLine: true }),
      nombre: "Ventana proyectante",
      descripcion: "",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "332",
        sistema: "Personalizado",
        configuracion: "Personalizado",
        sheetScheme: "Personalizado",
        isCustomScheme: true,
        hojasBase: 2,
        guidedVisualConfig,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
  });
});

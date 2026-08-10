import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  crearRecetaPlantillaVentoraCorredera2H,
  crearRecetaReferenciaL5000Corredera2H,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
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

  it("CASO 4: sin largos comerciales → despiece sí, barras no", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(resolved.barsAvailable).toBe(false);
    expect(resolved.formal?.pautaBarras?.barras ?? []).toHaveLength(0);
    expect(resolved.message).toMatch(/largos comerciales/i);
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
});

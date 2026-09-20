import {
  crearRecetaPlantillaVentoraCorredera2H,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  getLineVariantSlots,
  LINE_BASE_VARIANT_CATALOG,
} from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import {
  buildVariantTreeGroups,
  mergeL20OrganizationRecipes,
  parseCommercialSheetSchemeToHojas,
  recipeMatchesVariantSlot,
  resolveCommercialFabricacionHojas,
  resolveDefaultDetailRecipeForLine,
  resolveVariantTreeGroups,
} from "@/features/fabricacion/services/fabricacion-line-variant.service";
import {
  resolveFabricacionDespieceForQuoteItem,
} from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolverRecetaFabricacionCompatible } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

function l25RecipeRecord(
  overrides: Partial<FabricationRecipeRecord> & {
    leavesCount?: number;
    variant?: string;
    definition?: FabricationRecipeRecord["definition"];
  } = {}
): FabricationRecipeRecord {
  let nextId = 0;
  const definition =
    overrides.definition ??
    crearRecetaPlantillaVentoraCorredera2H("L25", {
      createId: () => `l25-${nextId++}`,
    });
  if (overrides.variant) {
    definition.identidad.variante = overrides.variant;
  }
  if (overrides.leavesCount) {
    definition.identidad.hojas = overrides.leavesCount;
    definition.identidad.modulos = overrides.leavesCount;
  }

  return {
    id: overrides.id ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationId: overrides.organizationId ?? 1,
    lineTemplateId: overrides.lineTemplateId ?? 314,
    scope: overrides.scope ?? "organization",
    providerName: overrides.providerName ?? "Ventora",
    lineName: overrides.lineName ?? "Serie 25",
    typology: overrides.typology ?? "corredera",
    leavesCount: overrides.leavesCount ?? 2,
    variant: overrides.variant ?? definition.identidad.variante,
    version: overrides.version ?? 1,
    status: overrides.status ?? "validated",
    definition,
    sourceType: overrides.sourceType ?? "workshop",
    sourceReference: overrides.sourceReference ?? "ventora-variant:l25:2h:caracol",
    parentRecipeId: overrides.parentRecipeId ?? null,
    validatedAt: overrides.validatedAt ?? null,
    validatedBy: overrides.validatedBy ?? null,
    createdAt: overrides.createdAt ?? "2026-08-10T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-10T00:00:00.000Z",
    eliminadoEn: overrides.eliminadoEn ?? null,
  };
}

function quoteItemWithHojas(hojas: number): CotizacionWorkflowItem {
  return {
    id: "item-l25",
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "L25",
    vidrio: "4mm",
    nombre: "Ventana corredera",
    descripcion: `${hojas} hojas`,
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
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
      lineTemplateId: "314",
      sistema: "Corredera",
      sheetScheme: `${hojas} hojas`,
      fabricacionTipologia: "corredera",
      fabricacionHojas: hojas,
      fabricacionModulos: hojas,
    }),
  };
}

describe("fabricacion-line-variant.service", () => {
  it("parsea sheetScheme comercial a hojas", () => {
    expect(parseCommercialSheetSchemeToHojas("3 hojas")).toBe(3);
    expect(parseCommercialSheetSchemeToHojas("Personalizado")).toBeNull();
  });

  it("prioriza sheetScheme sobre hojasBase al resolver hojas comerciales", () => {
    expect(
      resolveCommercialFabricacionHojas({
        sheetScheme: "3 hojas",
        fabricacionHojas: 2,
        hojasBase: 2,
      })
    ).toBe(3);
  });

  it("expone slots L25 2H/3H/4H en catálogo base", () => {
    const slots = getLineVariantSlots("ventora:l25");
    expect(slots.map((slot) => `${slot.leavesCount}:${slot.variantSlug}`)).toEqual([
      "2:caracol",
      "3:reforzada_pierna_abierta",
      "4:reforzada_pierna_abierta",
    ]);
  });

  it("matchea receta L25 2H caracol existente sin sobrescribir variante legacy", () => {
    const slot = LINE_BASE_VARIANT_CATALOG["ventora:l25"]?.[0];
    expect(slot).toBeDefined();
    const recipe = l25RecipeRecord({ variant: "L25 caracol" });
    expect(recipeMatchesVariantSlot(recipe, slot!)).toBe(true);
  });
});

describe("matching cotización L25 por hojas", () => {
  const recipes = [
    l25RecipeRecord({ id: "l25-2h", variant: "caracol", status: "testing" }),
  ];

  it("L25 2H resuelve la receta existente", () => {
    const resolution = resolverRecetaFabricacionCompatible(recipes, {
      organizationId: 1,
      lineTemplateId: 314,
      tipologia: "corredera",
      hojas: 2,
      allowPreliminaryNonValidated: true,
    });
    expect(resolution.estado).toBe("receta_no_validada");
    expect(resolution.receta?.definition.identidad.hojas).toBe(2);
  });

  it("L25 3H nunca usa receta 2H", () => {
    const resolution = resolverRecetaFabricacionCompatible(recipes, {
      organizationId: 1,
      lineTemplateId: 314,
      tipologia: "corredera",
      hojas: 3,
      allowPreliminaryNonValidated: true,
    });
    expect(resolution.estado).toBe("sin_receta");
  });

  it("L25 4H nunca usa receta 2H", () => {
    const resolution = resolverRecetaFabricacionCompatible(recipes, {
      organizationId: 1,
      lineTemplateId: 314,
      tipologia: "corredera",
      hojas: 4,
      allowPreliminaryNonValidated: true,
    });
    expect(resolution.estado).toBe("sin_receta");
  });

  it("multiples variantes compatibles solicitan elección", () => {
    const recipeA = l25RecipeRecord({ id: "a", variant: "caracol" });
    const recipeB = l25RecipeRecord({ id: "b", variant: "estandar" });
    recipeA.definition.identidad.recetaId = "receta-a";
    recipeB.definition.identidad.recetaId = "receta-b";
    const resolution = resolverRecetaFabricacionCompatible([recipeA, recipeB], {
      organizationId: 1,
      lineTemplateId: 314,
      tipologia: "corredera",
      hojas: 2,
      allowPreliminaryNonValidated: true,
    });
    expect(resolution.estado).toBe("multiples_recetas");
  });

  it("una variante compatible se autoselecciona", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItemWithHojas(2),
      recipes,
      organizationId: 1,
    });
    expect(resolved.estado).toBe("receta_incompleta");
    expect(resolved.formal).toBeNull();
  });

  it("receta incompleta no genera pauta falsa", () => {
    const slot = getLineVariantSlots("ventora:l25")[1];
    expect(slot).toBeDefined();
    const incomplete = l25RecipeRecord({
      id: "l25-3h",
      leavesCount: 3,
      variant: "reforzada_pierna_abierta",
      definition: slot!.buildDefinition({
        lineName: "Serie 25",
        plantillaId: "L25",
      }),
    });
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItemWithHojas(3),
      recipes: [incomplete],
      organizationId: 1,
    });
    expect(resolved.estado).toBe("receta_incompleta");
    expect(resolved.formal).toBeNull();
  });

  it("cotización comercial sigue sin pauta cuando fabricación está incompleta para 3H", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItemWithHojas(3),
      recipes: [l25RecipeRecord()],
      organizationId: 1,
    });
    expect(resolved.estado).toBe("receta_incompleta");
    expect(resolved.formal).toBeNull();
  });
});

describe("variant tree base lines", () => {
  it("agrupa variantes L25 por hojas", () => {
    const groups = buildVariantTreeGroups({
      catalogKey: "ventora:l25",
      recipes: [l25RecipeRecord()],
    });
    expect(groups).toHaveLength(3);
    expect(groups[0]?.leavesCount).toBe(2);
    expect(groups[1]?.items[0]?.recipe).toBeNull();
  });

  it("expone 1 variante corredera L20 en catálogo comercial", () => {
    const slots = getLineVariantSlots("ventora:l20");
    expect(slots).toHaveLength(1);
    expect(slots.map((slot) => slot.variantSlug)).toEqual(["pierna_abierta_jamba_2009"]);
  });

  it("expone árbol unificado de 5 construcciones L20 en mobile", () => {
    const groups = buildVariantTreeGroups({
      catalogKey: "ventora:l20",
      recipes: [],
    });
    expect(groups).toHaveLength(2);
    expect(groups[0]?.typologyLabel).toBe("Corredera · 2 hojas");
    expect(groups[0]?.items).toHaveLength(1);
    expect(groups[1]?.typologyLabel).toBe("Fijos · 2 hojas");
    expect(groups[1]?.items).toHaveLength(4);
  });

  it("expone 4 variantes fijas L20 en línea comercial separada", () => {
    const slots = getLineVariantSlots("ventora:l20-fijos");
    expect(slots).toHaveLength(4);
    expect(slots.map((slot) => slot.variantSlug)).toEqual([
      "pierna_abierta",
      "pierna_cerrada_jamba_2009",
      "pierna_cerrada",
      "tp_15mm",
    ]);
    const groups = buildVariantTreeGroups({
      catalogKey: "ventora:l20-fijos",
      recipes: [],
    });
    expect(groups).toHaveLength(2);
    expect(groups[1]?.typologyLabel).toBe("Fijos · 2 hojas");
    expect(groups[1]?.items).toHaveLength(4);
  });

  it("prioriza la variante corredera al abrir Serie 20", () => {
    const corredera = l25RecipeRecord({
      id: "corredera",
      lineTemplateId: 10,
      definition: {
        ...l25RecipeRecord().definition,
        identidad: {
          ...l25RecipeRecord().definition.identidad,
          variante: "pierna_abierta_jamba_2009",
          apertura: "corredera",
        },
      },
    });
    const fijo = l25RecipeRecord({
      id: "fijo",
      lineTemplateId: 10,
      definition: {
        ...l25RecipeRecord().definition,
        identidad: {
          ...l25RecipeRecord().definition.identidad,
          variante: "tp_15mm",
          apertura: "fija",
        },
      },
    });

    expect(
      resolveDefaultDetailRecipeForLine({
        catalogKey: "ventora:l20",
        lineTemplateId: 10,
        recipes: [fijo, corredera],
      })?.id
    ).toBe("corredera");
  });

  it("fusiona recetas L20 de líneas comerciales hermanas", () => {
    const own = l25RecipeRecord({ id: "own", lineTemplateId: 10 });
    const sibling = l25RecipeRecord({ id: "sibling", lineTemplateId: 11 });
    const other = l25RecipeRecord({ id: "other", lineTemplateId: 99 });

    const merged = mergeL20OrganizationRecipes({
      catalogKey: "ventora:l20",
      lineTemplateId: 10,
      siblingLineTemplateId: 11,
      recipes: [own, sibling, other],
    });

    expect(merged.map((entry) => entry.id)).toEqual(["own", "sibling"]);
  });
});

describe("aislamiento organization_id en resolución", () => {
  it("descarta receta de otra organización", () => {
    const foreign = l25RecipeRecord({ organizationId: 99 });
    const resolution = resolverRecetaFabricacionCompatible([foreign], {
      organizationId: 1,
      lineTemplateId: 314,
      tipologia: "corredera",
      hojas: 2,
      allowPreliminaryNonValidated: true,
    });
    expect(resolution.estado).toBe("sin_receta");
  });
});

describe("snapshots históricos", () => {
  it("conserva snapshot previo aunque cambie el catálogo de slots", () => {
    const snapshot = {
      recipeId: "historico",
      recipeVersion: 1,
      recipeIdentity: {
        recetaId: "historico",
        tipologia: "corredera",
        hojas: 2,
        modulos: 2,
        variante: "caracol",
      },
      input: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: "caracol",
      },
    };
    expect(snapshot.recipeId).toBe("historico");
    expect(getLineVariantSlots("ventora:l25")).toHaveLength(3);
  });
});

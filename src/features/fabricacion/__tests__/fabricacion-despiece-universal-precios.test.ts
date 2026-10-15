import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { parseSodalL25VariantSlug } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveUniversalPricedLineFallback, resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { decodeCotizacionItemPresentationMeta, encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const pricedLines = [
  { line: "L15", catalogKey: "ventora:serie-15-corredera-2h", typology: "corredera", leaves: 2, variant: null },
  { line: "L20", catalogKey: "ventora:l20", typology: "corredera", leaves: 2, variant: "pierna_abierta_jamba_2009" },
  { line: "L25", catalogKey: "ventora:l25", typology: "corredera", leaves: 2, variant: "l25-sodal-reference" },
  { line: "L32", catalogKey: "ventora:l32", typology: "proyectante", leaves: 1, variant: "normal" },
  { line: "L42", catalogKey: "ventora:l42", typology: "proyectante", leaves: 1, variant: "normal" },
  { line: "L5000", catalogKey: "ventora:l5000", typology: "corredera", leaves: 2, variant: "caracol" },
  { line: "L12", catalogKey: "ventora:serie-12-shower-corredera", typology: "shower", leaves: 2, variant: null },
  { line: "L4000", catalogKey: "ventora:serie-4000-corredera-2h", typology: "corredera", leaves: 2, variant: null },
  { line: "L45", catalogKey: "ventora:serie-45-puerta", typology: "puerta_abatible", leaves: 1, variant: null },
  { line: "S-33", catalogKey: "ventora:s33-corredera-2h", typology: "corredera", leaves: 2, variant: null },
  { line: "S-33 RPT", catalogKey: "ventora:s33-rpt-corredera-2h", typology: "corredera", leaves: 2, variant: null },
] as const;

function itemFor(input: (typeof pricedLines)[number]): CotizacionWorkflowItem {
  const l25Recipe = input.line === "L25"
    ? buildAllSodalL25Recipes().find((bundle) => bundle.recipeId === "monolitico_pierna_abierta_3h_3000x1500")!
    : null;
  const l25Configuration = l25Recipe
    ? parseSodalL25VariantSlug(l25Recipe.identity.variantSlug)
    : null;

  return {
    id: `item-${input.line}`,
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: input.line,
    vidrio: "Vidrio monolítico 4 mm",
    nombre: "Ventana",
    descripcion: "Ventana de prueba",
    ancho: l25Recipe?.confirmed.testDimensions.widthMm ?? 1200,
    alto: l25Recipe?.confirmed.testDimensions.heightMm ?? 1000,
    cantidad: 1,
    unidad: "unidad",
    precioUnitario: 0,
    subtotal: 0,
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: "101",
      catalogLineKey: input.catalogKey,
      sistema: input.typology === "corredera" ? "Corredera" : input.typology === "shower" ? "Shower" : "Proyectante",
      fabricacionTipologia: input.typology,
      fabricacionHojas: l25Recipe?.identity.leaves ?? input.leaves,
      fabricacionModulos: l25Recipe?.identity.leaves ?? (input.line === "L12" || input.line.startsWith("S-33") ? 1 : input.leaves),
      fabricacionVariante: l25Recipe?.identity.variantSlug ?? input.variant,
      ...(l25Configuration
        ? {
            fabricacionGlazing: l25Configuration.glazing,
            fabricacionLeg: l25Configuration.leg,
            fabricacionReinforcement: l25Configuration.reinforcement,
          }
        : {}),
    }),
    tipoItem: "componente",
    fabricacionSnapshot: null,
  };
}

function l25RecipeRecord(): FabricationRecipeRecord {
    const bundle = buildAllSodalL25Recipes().find((candidate) => candidate.recipeId === "monolitico_pierna_abierta_3h_3000x1500")!;
  return {
    id: bundle.recipeId,
    organizationId: null,
    lineTemplateId: 101,
    scope: "ventora",
    providerName: "SODAL",
    lineName: "L25",
    typology: bundle.definition.identidad.tipologia,
    leavesCount: bundle.identity.leaves,
    variant: bundle.identity.variantSlug,
    version: 1,
    status: "testing",
    definition: bundle.definition,
    sourceType: "manufacturer",
    sourceReference: bundle.sourceReference,
    sourceName: "SODAL",
    sourceRevision: SODAL_L25_FORMULA_VERSION,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-10-07T00:00:00.000Z",
    updatedAt: "2026-10-07T00:00:00.000Z",
    eliminadoEn: null,
  };
}

describe("despiece de líneas universales con precio Arquetipo", () => {
  it.each(["ventora:l42", "ventora:arquetipo-l42-proyectante"])(
    "normaliza variante estándar de AL-42 (%s)",
    (catalogKey) => {
      const recipe = resolveUniversalPricedLineFallback({
        catalogKey,
        lineTemplateId: 101,
        organizationId: 1,
        lineName: "AL-42",
        variant: "estándar",
        leavesCount: 1,
        recipes: [],
      });

      expect(recipe?.variant).toBe("normal");
      expect(recipe?.definition.identidad.tipologia).toBe("proyectante");
    }
  );

  it("resuelve el despiece AL-42 cuando cotización guardó el alias estándar", () => {
    const item = itemFor(pricedLines.find((line) => line.line === "L42")!);
    item.observaciones = encodeCotizacionItemPresentationMeta({
      lineTemplateId: "101",
      catalogLineKey: "ventora:arquetipo-l42-proyectante",
      sistema: "Proyectante",
      fabricacionTipologia: "proyectante",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricacionVariante: "estándar",
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.recipeIdentity.variante).toBe("normal");
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
  });

  it("reemplaza una precarga Arquetipo incompleta en la AL-42 confirmada", () => {
    const item = itemFor(pricedLines.find((line) => line.line === "L42")!);
    const canonical = resolveUniversalPricedLineFallback({
      catalogKey: "ventora:l42",
      lineTemplateId: 101,
      organizationId: 1,
      lineName: "Serie 42",
      variant: "normal",
      leavesCount: 1,
      typology: "proyectante",
      recipes: [],
    })!;
    const staleArquetipo = {
      ...canonical,
      id: "arquetipo-l42-stale",
      scope: "organization" as const,
      status: "validated" as const,
      sourceReference: "ventora-arquetipo:l42:normal",
      sourceName: "Arquetipo",
      definition: {
        ...canonical.definition,
        datosPendientes: ["Definir medida numérica del junquillo"],
      },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [staleArquetipo],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.recipe?.sourceName).toBe("Taller · confirmación del titular");
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
  });

  it("resuelve la AL-42 universal cuando el borrador seleccionado quedó con el alias ALAR 4201", () => {
    const item = itemFor(pricedLines.find((line) => line.line === "L42")!);
    item.observaciones = encodeCotizacionItemPresentationMeta({
      lineTemplateId: "101",
      catalogLineKey: "ventora:arquetipo-l42-proyectante",
      sistema: "Proyectante",
      fabricacionTipologia: "proyectante",
      fabricacionHojas: 1,
      fabricacionModulos: 1,
      fabricacionVariante: "alar_marco_4201",
    });
    const canonical = resolveUniversalPricedLineFallback({
      catalogKey: "ventora:l42",
      lineTemplateId: 101,
      organizationId: 1,
      lineName: "Serie 42",
      variant: "normal",
      leavesCount: 1,
      typology: "proyectante",
      recipes: [],
    })!;
    const alarProviderRecipe = {
      ...canonical,
      id: "alar-l42-provider-recipe",
      status: "validated" as const,
      variant: "alar_marco_4201",
      sourceType: "supplier" as const,
      sourceReference: "user-provided:alar-linea42:proyectante-4201:2026-09-21",
      sourceName: "ALAR",
      definition: {
        ...canonical.definition,
        identidad: { ...canonical.definition.identidad, variante: "alar_marco_4201" },
        datosPendientes: ["Definir medida del junquillo y vidrio"],
      },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [alarProviderRecipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.recipe?.sourceReference).toContain("ventora:taller-confirmado:universal:l42");
    expect(resolved.formal?.recipeIdentity.variante).toBe("normal");
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
  });

  it("mantiene una receta propia ALAR incompleta sin sustituirla y calcula L42 Normal si se elige esa variante", () => {
    const canonical = resolveUniversalPricedLineFallback({
      catalogKey: "ventora:l42", lineTemplateId: 210, organizationId: 1,
      lineName: "Serie 42", variant: "normal", leavesCount: 1,
      typology: "proyectante", recipes: [],
    })!;
    const customDraft: FabricationRecipeRecord = {
      ...canonical,
      id: "1cf1fa7c-1a66-490a-af68-45401f39a349",
      status: "draft",
      variant: "alar_marco_4201",
      sourceType: "manual",
      sourceReference: "taller:personalizada:user-provided%3Aalar-linea42%3Aproyectante-4201%3A2026-09-21",
      definition: {
        ...canonical.definition,
        identidad: { ...canonical.definition.identidad, variante: "alar_marco_4201" },
        perfiles: [],
      },
    };
    expect(resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l42", lineTemplateId: 210, organizationId: 1,
      lineName: "Serie 42", variant: null, leavesCount: 1,
      typology: "proyectante", recipes: [customDraft],
    }).map((recipe) => recipe.variant)).toEqual(["normal"]);
    expect(resolveUniversalPricedLineFallbacks({
      catalogKey: "ventora:l42", lineTemplateId: 210, organizationId: 1,
      lineName: "Serie 42", variant: null, leavesCount: 1,
      typology: "proyectante", recipes: [{ ...customDraft, variant: "normal" }],
    })).toEqual([]);
    const item = itemFor(pricedLines.find((line) => line.line === "L42")!);
    const selectedCustom = {
      ...item,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "210", catalogLineKey: "ventora:l42", sistema: "Proyectante",
        fabricacionTipologia: "proyectante", fabricacionHojas: 1, fabricacionModulos: 1,
        fabricacionVariante: "alar_marco_4201", fabricationRecipeId: customDraft.id,
      }),
    };
    expect(resolveFabricacionDespieceForQuoteItem({
      item: selectedCustom, recipes: [customDraft], organizationId: 1,
    }).formal).toBeNull();

    const normalItem = {
      ...selectedCustom,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "210", catalogLineKey: "ventora:l42", sistema: "Proyectante",
        fabricacionTipologia: "proyectante", fabricacionHojas: 1, fabricacionModulos: 1,
        fabricacionVariante: "normal", fabricationRecipeId: "",
      }),
    };
    const normal = resolveFabricacionDespieceForQuoteItem({
      item: normalItem, recipes: [customDraft], organizationId: 1,
    });
    expect(normal.estado).toBe("calculado");
    expect(normal.formal?.recipeId).toBe("ventora:universal:l42:normal");
    expect(normal.formal?.pauta.length).toBeGreaterThan(0);
  });

  it.each(pricedLines)("calcula $line con una referencia compatible", (line) => {
    const item = itemFor(line);
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: line.line === "L25" ? [l25RecipeRecord()] : [],
      organizationId: 1,
    });
    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.calculable).toBe(true);
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);

    const ownerConfirmed = ["L20", "L12", "L32", "L42", "L5000"].includes(line.line);
    if (ownerConfirmed) {
      expect(resolved.preliminary).toBe(false);
      expect(resolved.recipe?.status).toBe("validated");
      expect(resolved.recipe?.definition.estado).toBe("validada");
    } else if (line.line === "L25") {
      // This test deliberately supplies a synthetic testing record. The Zeta
      // source and its validated 18-variant path remain untouched.
      expect(resolved.preliminary).toBe(false);
      expect(resolved.recipe?.status).toBe("testing");
    } else {
      expect(resolved.preliminary).toBe(false);
      expect(resolved.recipe?.status).toBe("testing");
    }
  });

  it("resuelve el Shower L12 de 2 hojas aunque la cotización lo llame corredera frontal", () => {
    const item = itemFor(pricedLines.find((line) => line.line === "L12")!);
    item.observaciones = encodeCotizacionItemPresentationMeta({
      lineTemplateId: "101",
      catalogLineKey: "ventora:serie-12-shower-corredera",
      sistema: "Shower Door · Corredera frontal",
      fabricacionTipologia: "shower",
      fabricacionHojas: 2,
      fabricacionModulos: 1,
      fabricacionVariante: "Corredera frontal",
    });
    const decoded = decodeCotizacionItemPresentationMeta(item.observaciones);
    const fallback = resolveUniversalPricedLineFallbacks({
      catalogKey: decoded.catalogLineKey,
      lineTemplateId: 101,
      organizationId: 1,
      lineName: "Línea 12 — Shower Door",
      variant: decoded.fabricacionVariante,
      leavesCount: decoded.fabricacionHojas,
      typology: decoded.fabricacionTipologia,
      recipes: [],
    });
    expect(fallback).toHaveLength(1);

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [],
      organizationId: 1,
    });
    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(false);
    expect(resolved.recipe?.status).toBe("validated");
    expect(resolved.recipe?.definition.identidad.variante).toBe("Corredera frontal");
    expect(resolved.formal?.pauta.map(({ codigoPerfil, cantidadPiezas }) => ({ codigoPerfil, cantidadPiezas }))).toEqual([
      { codigoPerfil: "1203", cantidadPiezas: 1 },
      { codigoPerfil: "1201", cantidadPiezas: 1 },
      { codigoPerfil: "1202", cantidadPiezas: 2 },
      { codigoPerfil: "1204", cantidadPiezas: 4 },
      { codigoPerfil: "1204", cantidadPiezas: 1 },
    ]);
  });

  it("usa la pauta universal validada ante borradores guardados en cuentas existentes", () => {
    const line = pricedLines.find((candidate) => candidate.line === "L20")!;
    const canonical = resolveUniversalPricedLineFallback({
      catalogKey: line.catalogKey,
      lineTemplateId: 101,
      organizationId: 1,
      lineName: "Serie 20",
      variant: line.variant,
      leavesCount: line.leaves,
      recipes: [],
    })!;
    const organizationDraft: FabricationRecipeRecord = {
      ...canonical,
      id: "org-l20-draft",
      status: "testing",
      sourceType: "manual",
      sourceReference: "organization:l20:draft",
      definition: { ...canonical.definition, estado: "ejemplo_no_validado" },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: itemFor(line),
      recipes: [organizationDraft],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(false);
    expect(resolved.recipe?.status).toBe("validated");
    expect(resolved.recipe?.sourceReference).toContain("ventora:taller-confirmado:universal:l20");
  });

  it("prioriza la receta propia guardada por el taller en cotizaciones nuevas", () => {
    const line = pricedLines.find((candidate) => candidate.line === "L20")!;
    const canonical = resolveUniversalPricedLineFallback({
      catalogKey: line.catalogKey,
      lineTemplateId: 101,
      organizationId: 1,
      lineName: "Serie 20",
      variant: line.variant,
      leavesCount: line.leaves,
      recipes: [],
    })!;
    const baseline = resolveFabricacionDespieceForQuoteItem({
      item: itemFor(line),
      recipes: [],
      organizationId: 1,
    });
    const customRecipe: FabricationRecipeRecord = {
      ...canonical,
      id: "org-l20-custom",
      scope: "organization",
      status: "testing",
      sourceType: "manual",
      sourceReference: "taller:personalizada:base-ventora%3Acorredera%3A2",
      definition: {
        ...canonical.definition,
        perfiles: canonical.definition.perfiles.map((profile, index) =>
          index === 0
            ? {
                ...profile,
                reglaMedida: {
                  ...profile.reglaMedida,
                  ajusteMm: (profile.reglaMedida.ajusteMm ?? 0) - 10,
                },
              }
            : profile
        ),
      },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: itemFor(line),
      recipes: [customRecipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.recipe?.id).toBe("org-l20-custom");
    expect(resolved.formal?.result.perfiles[0]?.medidaMm).toBe(
      (baseline.formal?.result.perfiles[0]?.medidaMm ?? 0) - 10
    );
  });

  it("conserva recetas propias validadas sin bloquear otra variante universal", () => {
    const line = pricedLines.find((candidate) => candidate.line === "L20")!;
    const canonical = resolveUniversalPricedLineFallback({
      catalogKey: line.catalogKey,
      lineTemplateId: 101,
      organizationId: 1,
      lineName: "Serie 20",
      variant: "estandar",
      leavesCount: line.leaves,
      recipes: [],
    })!;
    const otherValidatedVariant: FabricationRecipeRecord = {
      ...canonical,
      id: "org-l20-standard-validated",
      status: "validated",
      variant: "estandar",
      definition: {
        ...canonical.definition,
        identidad: { ...canonical.definition.identidad, variante: "estandar" },
      },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: itemFor(line),
      recipes: [otherValidatedVariant],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(false);
    expect(resolved.recipe?.variant).toBe("pierna_abierta_jamba_2009");
    expect(resolved.recipe?.sourceReference).toContain("ventora:taller-confirmado:universal:l20");
  });
});

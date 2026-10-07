import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { parseSodalL25VariantSlug } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const pricedLines = [
  { line: "L20", catalogKey: "ventora:l20", typology: "corredera", leaves: 2, variant: "estandar" },
  { line: "L25", catalogKey: "ventora:l25", typology: "corredera", leaves: 2, variant: "l25-sodal-reference" },
  { line: "L32", catalogKey: "ventora:l32", typology: "proyectante", leaves: 1, variant: "normal" },
  { line: "L42", catalogKey: "ventora:l42", typology: "proyectante", leaves: 1, variant: "normal" },
  { line: "L5000", catalogKey: "ventora:l5000", typology: "corredera", leaves: 2, variant: "estandar" },
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
      sistema: input.typology === "corredera" ? "Corredera" : "Proyectante",
      fabricacionTipologia: input.typology,
      fabricacionHojas: l25Recipe?.identity.leaves ?? input.leaves,
      fabricacionModulos: l25Recipe?.identity.leaves ?? input.leaves,
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
  it.each(pricedLines)("calcula $line con una referencia compatible", (line) => {
    const item = itemFor(line);
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: line.line === "L25" ? [l25RecipeRecord()] : [],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(true);
    expect(resolved.formal?.result.calculable).toBe(true);
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
  });
});

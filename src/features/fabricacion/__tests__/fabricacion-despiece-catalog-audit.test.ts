import {
  PLANTILLAS_VENTORA_CORREDERA_2H,
  crearRecetaPlantillaVentoraCorredera2H,
  crearRecetaReferenciaL5000Corredera2H,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import {
  LINE_15_CATALOG_KEY,
  LINE_15_FIXTURE_1200X1000,
  LINE_15_VARIANT_2H,
  crearRecetaLine15Corredera,
  crearRecetasLine15Corredera,
} from "@/features/fabricacion/fixtures/line-15-corredera-recipe";
import {
  LINE_4000_CATALOG_KEY,
  LINE_4000_VARIANT_2H,
  crearRecetaLine4000Corredera,
  crearRecetasLine4000Corredera,
} from "@/features/fabricacion/fixtures/line-4000-corredera-recipe";
import {
  SERIE_45_FIXTURE_1500X2000,
  crearRecetaSerie45Practicable,
} from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import {
  SERIE_4800_CATALOG_KEY,
  SERIE_4800_FIXTURE_1200X1000,
  SERIE_4800_VARIANT_NORMAL,
  crearRecetaSerie4800Corredera,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
import {
  buildAllSodalL25Recipes,
  resetSodalL25RecipeCacheForTests,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { resetZetaConfirmedCacheForTests } from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import { resetEvidenceSidecarCacheForTests } from "@/features/fabricacion/zeta/zeta-evidence-sidecar-loader";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";

type AuditCase = {
  label: string;
  lineTemplateId: number;
  recipe: FabricacionReceta;
  sourceReference?: string | null;
  sourceType?: FabricationRecipeRecord["sourceType"];
  sourceName?: string | null;
  sourceRevision?: string | null;
  status?: FabricationRecipeRecord["status"];
  item: CotizacionWorkflowItem;
  extraRecipes?: FabricationRecipeRecord[];
};

function recipeRecord(input: {
  id: string;
  lineTemplateId: number;
  lineName: string;
  definition: FabricacionReceta;
  typology?: string;
  leavesCount?: number;
  variant?: string | null;
  status?: FabricationRecipeRecord["status"];
  sourceReference?: string | null;
  sourceType?: FabricationRecipeRecord["sourceType"];
  sourceName?: string | null;
  sourceRevision?: string | null;
}): FabricationRecipeRecord {
  return {
    id: input.id,
    organizationId: 1,
    lineTemplateId: input.lineTemplateId,
    scope: "organization",
    providerName: "Ventora",
    lineName: input.lineName,
    typology: input.typology ?? input.definition.identidad.tipologia,
    leavesCount: input.leavesCount ?? input.definition.identidad.hojas,
    variant: input.variant ?? input.definition.identidad.variante,
    version: 1,
    status: input.status ?? "validated",
    definition: input.definition,
    sourceType: input.sourceType ?? "manual",
    sourceReference: input.sourceReference ?? null,
    sourceName: input.sourceName ?? null,
    sourceRevision: input.sourceRevision ?? null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    eliminadoEn: null,
  };
}

function baseQuoteItem(input: {
  lineTemplateId: number;
  ancho: number;
  alto: number;
  meta: Parameters<typeof encodeCotizacionItemPresentationMeta>[0];
}): CotizacionWorkflowItem {
  return {
    id: `item-${input.lineTemplateId}`,
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "Línea audit",
    vidrio: "4mm",
    nombre: "Pieza audit",
    descripcion: "Audit despiece",
    ancho: input.ancho,
    alto: input.alto,
    cantidad: 1,
    unidad: "unidad",
    areaM2: (input.ancho * input.alto) / 1_000_000,
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
      lineTemplateId: String(input.lineTemplateId),
      sistema: "Corredera",
      ...input.meta,
    }),
  };
}

describe("auditoría despiece cotización por líneas con receta", () => {
  beforeEach(() => {
    resetZetaConfirmedCacheForTests();
    resetEvidenceSidecarCacheForTests();
    resetSodalL25RecipeCacheForTests();
  });

  const cases: AuditCase[] = [
    {
      label: "L5000 referencia 1200×1000",
      lineTemplateId: 135,
      recipe: crearRecetaReferenciaL5000Corredera2H(),
      item: baseQuoteItem({
        lineTemplateId: 135,
        ancho: 1200,
        alto: 1000,
        meta: {
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
          fabricacionVariante: "estandar",
        },
      }),
    },
    {
      label: "L25 Zeta 3H monolítico pierna abierta 2000×1800",
      lineTemplateId: 10,
      ...(() => {
        const bundle = buildAllSodalL25Recipes().find(
          (entry) => entry.recipeId === "monolitico_pierna_abierta_3h_3000x1500"
        )!;
        return {
          recipe: bundle.definition,
          sourceReference: bundle.sourceReference,
          sourceType: "manufacturer" as const,
          sourceName: "SODAL",
          sourceRevision: SODAL_L25_FORMULA_VERSION,
          status: "testing" as const,
        };
      })(),
      item: baseQuoteItem({
        lineTemplateId: 10,
        ancho: 2000,
        alto: 1800,
        meta: {
          catalogLineKey: "ventora:l25",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 3,
          fabricacionModulos: 3,
          fabricacionVariante: "monolithic_open_normal",
          fabricacionGlazing: "monolithic",
          fabricacionLeg: "open",
          fabricacionReinforcement: "normal",
        },
      }),
    },
    {
      label: "Línea 15 corredera 2H 1200×1000",
      lineTemplateId: 1515,
      recipe: crearRecetaLine15Corredera({
        lineName: "Línea 15",
        variant: LINE_15_VARIANT_2H,
      }),
      item: baseQuoteItem({
        lineTemplateId: 1515,
        ancho: LINE_15_FIXTURE_1200X1000.anchoTotalMm,
        alto: LINE_15_FIXTURE_1200X1000.altoTotalMm,
        meta: {
          catalogLineKey: LINE_15_CATALOG_KEY,
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
          fabricacionVariante: LINE_15_VARIANT_2H,
        },
      }),
    },
    {
      label: "Línea 4000 corredera 2H 1200×1000",
      lineTemplateId: 4000,
      recipe: crearRecetaLine4000Corredera({
        lineName: "Línea 4000",
        variant: LINE_4000_VARIANT_2H,
      }),
      item: baseQuoteItem({
        lineTemplateId: 4000,
        ancho: 1200,
        alto: 1000,
        meta: {
          catalogLineKey: LINE_4000_CATALOG_KEY,
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
          fabricacionVariante: LINE_4000_VARIANT_2H,
        },
      }),
    },
    {
      label: "Serie 4800 normal 1200×1000",
      lineTemplateId: 4800,
      recipe: crearRecetaSerie4800Corredera({
        lineName: "Serie 4800",
        variant: SERIE_4800_VARIANT_NORMAL,
      }),
      item: baseQuoteItem({
        lineTemplateId: 4800,
        ancho: SERIE_4800_FIXTURE_1200X1000.anchoTotalMm,
        alto: SERIE_4800_FIXTURE_1200X1000.altoTotalMm,
        meta: {
          catalogLineKey: SERIE_4800_CATALOG_KEY,
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
          fabricacionVariante: SERIE_4800_VARIANT_NORMAL,
        },
      }),
    },
    {
      label: "Serie 45 puerta 1500×2000",
      lineTemplateId: 540,
      recipe: crearRecetaSerie45Practicable({ lineName: "Línea 45 — Puerta" }),
      status: "draft",
      item: {
        ...baseQuoteItem({
          lineTemplateId: 540,
          ancho: SERIE_45_FIXTURE_1500X2000.anchoTotalMm,
          alto: SERIE_45_FIXTURE_1500X2000.altoTotalMm,
          meta: {
            catalogLineKey: "ventora:serie-45-puerta",
            sistema: "Abatible",
            fabricacionTipologia: "puerta_abatible",
            fabricacionHojas: 1,
            fabricacionModulos: 1,
            fabricacionApertura: "interior",
          },
        }),
        tipo: "Puerta",
      },
    },
  ];

  it.each(cases.map((entry) => [entry.label, entry] as const))(
    "%s calcula despiece en cotización",
    (_label, auditCase) => {
      const recipe = recipeRecord({
        id: `audit-${auditCase.lineTemplateId}`,
        lineTemplateId: auditCase.lineTemplateId,
        lineName: auditCase.label,
        definition: auditCase.recipe,
        sourceReference: auditCase.sourceReference ?? null,
        sourceType: auditCase.sourceType,
        sourceName: auditCase.sourceName ?? null,
        sourceRevision: auditCase.sourceRevision ?? null,
        status: auditCase.status,
      });

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item: auditCase.item,
        recipes: [recipe, ...(auditCase.extraRecipes ?? [])],
        organizationId: 1,
      });

      expect(resolved.estado).toBe("calculado");
      expect(resolved.formal?.result.calculable).toBe(true);
      expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
    }
  );

  it("L25 sigue calculando con recetas L15/L4000 3H-4H en el mismo listado", () => {
    const l25Bundle = buildAllSodalL25Recipes().find(
      (entry) => entry.recipeId === "monolitico_pierna_abierta_3h_3000x1500"
    )!;

    const l25Recipe = recipeRecord({
      id: "l25-audit",
      lineTemplateId: 10,
      lineName: "L25",
      definition: l25Bundle.definition,
      sourceReference: l25Bundle.sourceReference,
      sourceType: "manufacturer",
      sourceName: "SODAL",
      sourceRevision: SODAL_L25_FORMULA_VERSION,
      status: "testing",
    });

    const noisyRecipes = [
      ...crearRecetasLine15Corredera({ lineName: "Línea 15" }).map((definition, index) =>
        recipeRecord({
          id: `l15-${index}`,
          lineTemplateId: 1515 + index,
          lineName: "Línea 15",
          definition,
        })
      ),
      ...crearRecetasLine4000Corredera({ lineName: "Línea 4000" }).map((definition, index) =>
        recipeRecord({
          id: `l4000-${index}`,
          lineTemplateId: 4000 + index,
          lineName: "Línea 4000",
          definition,
        })
      ),
    ];

    const item = baseQuoteItem({
      lineTemplateId: 10,
      ancho: 2000,
      alto: 1800,
      meta: {
        catalogLineKey: "ventora:l25",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 3,
        fabricacionModulos: 3,
        fabricacionVariante: "monolithic_open_normal",
        fabricacionGlazing: "monolithic",
        fabricacionLeg: "open",
        fabricacionReinforcement: "normal",
      },
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [l25Recipe, ...noisyRecipes],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
  });

  it.each(
    Object.keys(PLANTILLAS_VENTORA_CORREDERA_2H) as Array<
      keyof typeof PLANTILLAS_VENTORA_CORREDERA_2H
    >
  )("plantilla Ventora %s calcula despiece 1200×1000", (plantillaId) => {
    let nextId = 0;
    const definition = crearRecetaPlantillaVentoraCorredera2H(plantillaId, {
      createId: () => `${plantillaId.toLowerCase()}-audit-${nextId++}`,
    });
    const recipe = recipeRecord({
      id: `plantilla-${plantillaId}`,
      lineTemplateId: 9000,
      lineName: plantillaId,
      definition,
    });
    const item = baseQuoteItem({
      lineTemplateId: 9000,
      ancho: 1200,
      alto: 1000,
      meta: {
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionVariante: definition.identidad.variante,
      },
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
  });
});

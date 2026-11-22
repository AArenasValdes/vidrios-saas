import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveUniversalPricedLineFallbacks } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { crearRecetasSodalP2A } from "@/features/fabricacion/fixtures/sodal-p2a-recipes";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { prepareFabricacionSnapshotsForQuoteSave } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

const cases = [
  { key: "ventora:l20", name: "Línea 20", typology: "corredera", leaves: 2, glass: "Vidrio monolítico 5 mm" },
  { key: "ventora:l5000", name: "Línea 5000", typology: "corredera", leaves: 2, glass: "Vidrio monolítico 5 mm" },
  { key: "ventora:serie-12-shower-corredera", name: "Línea 12 · Shower", typology: "shower", leaves: 2, glass: "Vidrio templado 8 mm" },
  { key: "ventora:l32", name: "Línea 32", typology: "proyectante", leaves: 1, glass: "Vidrio monolítico 4 mm" },
  { key: "ventora:l42", name: "Línea 42", typology: "proyectante", leaves: 1, glass: "Vidrio monolítico 5 mm" },
  { key: "ventora:optima-s28-corredera-2h", name: "Óptima S-28", typology: "corredera", leaves: 2, glass: "Termopanel 4+12+4 de 20 mm" },
  { key: "ventora:optima-s28-corredera-3h", name: "Óptima S-28", typology: "corredera", leaves: 3, glass: "Termopanel 4+12+4 de 20 mm" },
  { key: "ventora:s38-rpt-proyectante", name: "S-38 RPT", typology: "proyectante", leaves: 1, glass: "Termopanel 4+12+4 de 20 mm" },
  { key: "ventora:s38-rpt-proyectante", name: "S-38 RPT", typology: "pano_fijo", leaves: 1, glass: "Termopanel 4+12+4 de 20 mm" },
  { key: "ventora:multislide-s83-4h", name: "MultiSlide S-83", typology: "corredera", leaves: 4, glass: "Vidrio monolítico 6 mm" },
  { key: "ventora:multislide-s83-8h", name: "MultiSlide S-83", typology: "corredera", leaves: 8, glass: "Vidrio monolítico 6 mm" },
  { key: "ventora:serie-3200-puerta-abatible-1h", name: "Serie 3200", typology: "puerta_abatible", leaves: 1, glass: "Termopanel 4+12+4 de 20 mm" },
  { key: "ventora:serie-4600-puerta-vaiven", name: "Serie 4600", typology: "puerta_vaiven", leaves: 1, glass: "Termopanel 4+12+4 de 20 mm" },
] as const;

function quoteItem(recipe: FabricationRecipeRecord, testCase: (typeof cases)[number]): CotizacionWorkflowItem {
  const typology = recipe.definition.identidad.tipologia;
  const type = typology === "pano_fijo"
    ? "Paño fijo"
    : typology === "puerta_abatible" || typology === "puerta_vaiven"
      ? "Puerta"
      : typology === "shower"
        ? "Shower door"
      : "Ventana";
  return {
    id: recipe.id,
    codigo: "V1",
    tipo: type,
    lineaComercial: testCase.name,
    vidrio: testCase.glass,
    nombre: testCase.name,
    descripcion: recipe.definition.identidad.nombre,
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
    unidad: "unidad",
    precioUnitario: 0,
    subtotal: 0,
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: String(recipe.lineTemplateId),
      catalogLineKey: testCase.key,
      fabricacionTipologia: typology,
      fabricacionHojas: recipe.definition.identidad.hojas,
      fabricacionModulos: recipe.definition.identidad.modulos,
      fabricacionVariante: recipe.definition.identidad.variante,
    }),
    tipoItem: "componente",
    fabricacionSnapshot: null,
  };
}

describe("smoke de despiece Aluminio en cotización y resumen", () => {
  it.each(cases)("guarda y muestra $key ($typology, $leaves hojas) en el resumen", (testCase) => {
    const candidates = resolveUniversalPricedLineFallbacks({
      catalogKey: testCase.key,
      lineTemplateId: 101,
      organizationId: 1,
      lineName: testCase.name,
      variant: null,
      leavesCount: testCase.leaves,
      typology: testCase.typology,
      glassName: testCase.glass,
      includeDocumentedVariants: true,
      recipes: [],
    });

    expect(candidates.length).toBeGreaterThan(0);
    for (const recipe of candidates) {
      const item = quoteItem(recipe, testCase);
      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [recipe],
        organizationId: 1,
      });

      expect(resolved.estado).toBe("calculado");
      expect(resolved.formal?.result.calculable).toBe(true);
      expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
      expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
      expect(resolved.formal?.recipeIdentity.variante).toBe(recipe.definition.identidad.variante);

      const prepared = prepareFabricacionSnapshotsForQuoteSave({ items: [item] });
      expect(prepared.itemIdsToResolve.has(item.id)).toBe(true);
      const summary = buildFabricationQuoteSummary([
        { ...prepared.items[0]!, fabricacionSnapshot: resolved.formal! },
      ]);
      expect(summary.items).toHaveLength(1);
      expect(summary.items[0]?.snapshot.cuts.length).toBeGreaterThan(0);
    }
  });

  it.each([
    { width: 900, height: 2100, expected4604: 2082, expected4602: 782, expected4601: 2079, expected4603: 782 },
    { width: 1500, height: 1000, expected4604: 982, expected4602: 1382, expected4601: 979, expected4603: 1382 },
  ])("Serie 4600 calcula ejes distintos en cotizacion y resumen ($width x $height)", (sample) => {
    const testCase = cases.find((entry) => entry.key === "ventora:serie-4600-puerta-vaiven")!;
    const universalCandidates = resolveUniversalPricedLineFallbacks({
      catalogKey: testCase.key,
      lineTemplateId: 101,
      organizationId: 1,
      lineName: testCase.name,
      variant: null,
      leavesCount: testCase.leaves,
      typology: testCase.typology,
      glassName: testCase.glass,
      includeDocumentedVariants: true,
      recipes: [],
    });
    expect(universalCandidates).toHaveLength(1);
    const mechanicalDef = crearRecetasSodalP2A({
      catalogKey: "ventora:serie-4600-puerta-vaiven",
      lineName: testCase.name,
    })[0]!;
    const candidates: FabricationRecipeRecord[] = [
      ...universalCandidates,
      {
        ...universalCandidates[0]!,
        id: "taller:serie-4600:mecanico",
        scope: "organization",
        variant: mechanicalDef.identidad.variante,
        definition: mechanicalDef,
      },
    ];

    for (const recipe of candidates) {
      const item: CotizacionWorkflowItem = {
        ...quoteItem(recipe, testCase),
        ancho: sample.width,
        alto: sample.height,
      };
      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [recipe],
        organizationId: 1,
      });

      expect(resolved.estado).toBe("calculado");
      expect(resolved.formal?.result.calculable).toBe(true);
      const isHydraulic = recipe.definition.identidad.variante.toLowerCase().includes("hidr");
      if (isHydraulic) {
        expect(resolved.formal?.pauta.find((p) => p.codigoPerfil === "4604")?.medidaMm).toBe(sample.expected4604);
        expect(resolved.formal?.pauta.find((p) => p.codigoPerfil === "4602")?.medidaMm).toBe(sample.expected4602);
      } else {
        expect(resolved.formal?.pauta.find((p) => p.codigoPerfil === "4601")?.medidaMm).toBe(sample.expected4601);
        expect(resolved.formal?.pauta.find((p) => p.codigoPerfil === "4603")?.medidaMm).toBe(sample.expected4603);
      }
    }
  });

  it("Serie 4600 rechaza medidas invalidas o <= 0 en cotizacion sin emitir cortes", () => {
    const testCase = cases.find((entry) => entry.key === "ventora:serie-4600-puerta-vaiven")!;
    const candidates = resolveUniversalPricedLineFallbacks({
      catalogKey: testCase.key,
      lineTemplateId: 101,
      organizationId: 1,
      lineName: testCase.name,
      variant: null,
      leavesCount: testCase.leaves,
      typology: testCase.typology,
      glassName: testCase.glass,
      includeDocumentedVariants: true,
      recipes: [],
    });

    for (const recipe of candidates) {
      for (const dims of [
        { ancho: 0, alto: 2100 },
        { ancho: 900, alto: 0 },
        { ancho: -900, alto: 2100 },
      ]) {
        const resolved = resolveFabricacionDespieceForQuoteItem({
          item: { ...quoteItem(recipe, testCase), ...dims },
          recipes: [recipe],
          organizationId: 1,
        });
        expect(resolved.estado).toBe("sin_medidas");
        expect(resolved.formal).toBeNull();
        expect(resolved.cubication).toBeNull();
      }

      const tooSmall = resolveFabricacionDespieceForQuoteItem({
        item: { ...quoteItem(recipe, testCase), ancho: 10, alto: 10 },
        recipes: [recipe],
        organizationId: 1,
      });
      expect(tooSmall.formal?.result.calculable).toBe(false);
      expect(tooSmall.cubication?.cuts ?? []).toHaveLength(0);
    }
  });
});

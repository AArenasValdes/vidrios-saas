import { buildUniversalCoverageMotorCases } from "./universal-coverage-motor";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

type Case = ReturnType<typeof buildUniversalCoverageMotorCases>[number];
const cases = buildUniversalCoverageMotorCases();
// PA-50 a PA-53 registran 2400 mm junto a cortes de 3000 mm. Los
// originales no están disponibles para conciliar la discrepancia.
const conflictIds = new Set([
  "dvh_pierna_abierta_reforzada_3h_2400x1500",
  "dvh_pierna_cerrada_3h_2400x1500",
  "monolitico_pierna_abierta_3h_2400x1500",
  "monolitico_pierna_abierta_reforzada_3h_2400x1500",
]);
const conflictCases = cases.filter((row) => conflictIds.has(row.evidenceId));
const comparableCases = cases.filter((row) => !conflictIds.has(row.evidenceId));

function record(row: Case, organizationId = 1): FabricationRecipeRecord {
  return {
    id: row.recipeId, organizationId, lineTemplateId: 25, scope: "organization",
    providerName: "SODAL", lineName: "L25", typology: row.identity.typology,
    leavesCount: row.identity.leaves, variant: row.identity.variantSlug,
    version: 1, status: "validated", definition: row.bundle.definition,
    sourceType: "manufacturer", sourceReference: row.sourceReference,
    sourceName: "SODAL", sourceRevision: SODAL_L25_FORMULA_VERSION,
    parentRecipeId: null, validatedAt: null, validatedBy: null,
    createdAt: "2026-09-18T00:00:00.000Z", updatedAt: "2026-09-18T00:00:00.000Z",
    eliminadoEn: null,
  };
}

function item(row: Case, cantidad = 1): CotizacionWorkflowItem {
  return {
    id: `item-${row.evidenceId}`, codigo: "V1", tipo: "Ventana", lineaComercial: "L25",
    vidrio: row.identity.glazing === "dvh" ? "Termopanel" : "Vidrio monolítico 4 mm",
    nombre: "Ventana", descripcion: "Evidencia Zeta",
    ancho: row.dimensions.widthMm, alto: row.dimensions.heightMm, cantidad,
    unidad: "unidad", precioUnitario: 0, subtotal: 0, tipoItem: "componente",
    fabricacionSnapshot: null,
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: "25", catalogLineKey: row.catalogKey, sistema: "Corredera",
      fabricacionTipologia: row.identity.typology, fabricacionHojas: row.identity.leaves,
      fabricacionModulos: row.identity.leaves, fabricacionVariante: row.identity.variantSlug,
      fabricacionGlazing: row.identity.glazing, fabricacionLeg: row.identity.leg,
      fabricacionReinforcement: row.identity.reinforcement,
    }),
  };
}

describe("cobertura del motor por evidencia canónica L25", () => {
  it("mantiene una fila por observación y una fuente identificable", () => {
    expect(cases).toHaveLength(22);
    expect(conflictCases).toHaveLength(conflictIds.size);
    expect(new Set(cases.map((row) => row.evidenceId)).size).toBe(cases.length);
    expect(new Set(cases.map((row) => row.recipeId)).size).toBe(18);
    expect(cases.every((row) => row.sourceReference.startsWith("zeta:confirmed:sodal/l25/"))).toBe(true);
  });

  it.each(comparableCases.map((row) => [row.evidenceId, row] as const))(
    "%s: comparación del resolvedor con el archivo de evidencia",
    (_id, row) => {
      const single = resolveFabricacionDespieceForQuoteItem({ item: item(row), recipes: [record(row)], organizationId: 1 });
      expect(single.estado).toBe("calculado");
      expect(single.recipe?.id).toBe(row.recipeId);
      expect(single.formal?.result.perfiles.map((p) => [p.codigoPerfil, p.cantidadPiezas, p.medidaMm]))
        .toEqual(row.confirmed.profiles.map((p) => [p.code, p.quantity, p.lengthMm]));
      expect(single.formal?.result.vidrios.map((v) => [v.cantidadPiezas, v.anchoMm, v.altoMm]))
        .toEqual(row.confirmed.glass.map((v) => [v.quantity, v.widthMm, v.heightMm]));

    },
  );

  describe("CONFLICTO: evidencia 2400 mm pendiente de conciliación", () => {
    it.each(conflictCases.map((row) => [row.evidenceId, row] as const))(
      "%s: registra la discrepancia con el motor y la coincidencia con 3000 mm",
      (_id, row) => {
        const baseline = cases.find((candidate) => candidate.evidenceId === row.recipeId);
        expect(baseline).toBeDefined();
        const profileValues = (entry: Case) => entry.confirmed.profiles.map((p) => [p.code, p.quantity, p.lengthMm]);
        const glassValues = (entry: Case) => entry.confirmed.glass.map((v) => [v.quantity, v.widthMm, v.heightMm]);
        expect(row.dimensions.widthMm).toBe(2400);
        expect(baseline!.dimensions.widthMm).toBe(3000);
        expect(profileValues(row)).toEqual(profileValues(baseline!));
        expect(glassValues(row)).toEqual(glassValues(baseline!));

        const result = resolveFabricacionDespieceForQuoteItem({ item: item(row), recipes: [record(row)], organizationId: 1 });
        expect(result.estado).toBe("calculado");
        expect(result.formal?.result.perfiles.map((p) => [p.codigoPerfil, p.cantidadPiezas, p.medidaMm]))
          .not.toEqual(profileValues(row));
        expect(result.formal?.result.vidrios.map((v) => [v.cantidadPiezas, v.anchoMm, v.altoMm]))
          .not.toEqual(glassValues(row));
      },
    );

    // La discrepancia queda pendiente en docs/quality/ESTABILIZACION_2026-11-27.md.
  });

  it.each(cases.map((row) => [row.evidenceId, row] as const))(
    "%s: duplicar cantidad conserva las medidas y duplica piezas",
    (_id, row) => {
      const single = resolveFabricacionDespieceForQuoteItem({ item: item(row), recipes: [record(row)], organizationId: 1 });
      const double = resolveFabricacionDespieceForQuoteItem({ item: item(row, 2), recipes: [record(row)], organizationId: 1 });
      expect(single.estado).toBe("calculado");
      expect(double.estado).toBe("calculado");
      expect(double.formal?.result.perfiles.map((p) => [p.codigoPerfil, p.cantidadPiezas, p.medidaMm]))
        .toEqual(single.formal?.result.perfiles.map((p) => [p.codigoPerfil, 2 * p.cantidadPiezas, p.medidaMm]));
      expect(double.formal?.result.vidrios.map((v) => [v.cantidadPiezas, v.anchoMm, v.altoMm]))
        .toEqual(single.formal?.result.vidrios.map((v) => [2 * v.cantidadPiezas, v.anchoMm, v.altoMm]));
    },
  );

  it("rechaza medidas ausentes y recetas privadas de otra empresa", () => {
    const row = cases[0];
    const withoutWidth = { ...item(row), ancho: 0 };
    expect(resolveFabricacionDespieceForQuoteItem({ item: withoutWidth, recipes: [record(row)], organizationId: 1 }).estado).toBe("sin_medidas");
    const foreign = resolveFabricacionDespieceForQuoteItem({ item: item(row), recipes: [record(row, 2)], organizationId: 1 });
    expect(foreign.recipe).toBeNull();
    expect(foreign.formal).toBeNull();
    expect(foreign.estado).not.toBe("calculado");
  });
});

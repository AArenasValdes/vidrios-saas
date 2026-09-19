import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import {
  backfillSodalL25FormulaV2,
  isDefectiveSodalL25Snapshot,
} from "@/features/fabricacion/services/backfill-sodal-l25-formula-v2.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";

function recipeRecord(): FabricationRecipeRecord {
  const bundle = buildAllSodalL25Recipes().find(
    (entry) => entry.recipeId === "monolitico_pierna_abierta_reforzada_2h_1800x1500"
  )!;
  return {
    id: "11111111-1111-1111-1111-111111111111",
    organizationId: 1,
    lineTemplateId: 25,
    scope: "organization",
    providerName: "SODAL",
    lineName: "L25",
    typology: "corredera",
    leavesCount: 2,
    variant: bundle.identity.variantSlug,
    version: 1,
    status: "validated",
    definition: bundle.definition,
    sourceType: "manufacturer",
    sourceReference: bundle.sourceReference,
    sourceRevision: "Sistema Zeta / Plan de armado",
    parentRecipeId: null,
    validatedAt: "2026-09-18T00:00:00.000Z",
    validatedBy: null,
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z",
    eliminadoEn: null,
  };
}

function defectiveSnapshot(recipe: FabricationRecipeRecord): FabricacionCotizacionSnapshot {
  const snapshot = construirSnapshotFabricacionCotizacion({
    recipe,
    entrada: {
      anchoTotalMm: 2000,
      altoTotalMm: 1500,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
      variante: recipe.variant,
    },
  });
  return {
    ...snapshot,
    formulaVersion: undefined,
    pauta: snapshot.pauta.map((row) =>
      row.codigoPerfil === "2503" ? { ...row, medidaMm: 1700, totalLinealMm: 3400 } : row
    ),
    result: {
      ...snapshot.result,
      perfiles: snapshot.result.perfiles.map((row) =>
        row.codigoPerfil === "2503" ? { ...row, medidaMm: 1700, totalLinealMm: 3400 } : row
      ),
    },
  };
}

describe("backfill SODAL L25 formula v2", () => {
  it("marca defectuoso un snapshot L25 sin formulaVersion", () => {
    const recipe = recipeRecord();
    expect(isDefectiveSodalL25Snapshot(defectiveSnapshot(recipe))).toBe(true);
    const fresh = construirSnapshotFabricacionCotizacion({
      recipe,
      entrada: {
        anchoTotalMm: 2000,
        altoTotalMm: 1500,
        cantidad: 1,
        hojas: 2,
        modulos: 1,
        variante: recipe.variant,
      },
    });
    expect(fresh.formulaVersion).toBe(SODAL_L25_FORMULA_VERSION);
    expect(isDefectiveSodalL25Snapshot(fresh)).toBe(false);
  });

  it("actualiza receta y rec<lcula snapshot 818 una sola vez", async () => {
    const recipe = recipeRecord();
    const snapshot = defectiveSnapshot(recipe);
    const updated: string[] = [];
    const saved: FabricacionCotizacionSnapshot[] = [];

    const first = await backfillSodalL25FormulaV2({
      async listSodalL25Recipes() {
        return [recipe];
      },
      async updateSodalL25Recipe(recipeId, input) {
        updated.push(recipeId);
        recipe.definition = input.definition;
        recipe.sourceRevision = input.sourceRevision;
      },
      async listSodalL25SnapshotItems() {
        return [
          {
            id: 91,
            cotizacionId: 818,
            organizationId: 1,
            codigo: "V1",
            snapshot,
          },
        ];
      },
      async saveSnapshot(_itemId, next) {
        saved.push(next);
      },
    });

    expect(first.recipesUpdated).toBe(1);
    expect(first.snapshotsAffected).toBe(1);
    expect(first.snapshotsRecalculated).toBe(1);
    expect(updated).toEqual([recipe.id]);
    expect(saved[0]?.formulaVersion).toBe(SODAL_L25_FORMULA_VERSION);
    expect(saved[0]?.pauta.find((row) => row.codigoPerfil === "2503")?.medidaMm).toBe(1500);
    expect(first.quote818?.items[0]?.before.find((row) => row.code === "2503")?.lengthMm).toBe(1700);
    expect(first.quote818?.items[0]?.after.find((row) => row.code === "2503")?.lengthMm).toBe(1500);

    const second = await backfillSodalL25FormulaV2({
      async listSodalL25Recipes() {
        return [recipe];
      },
      async updateSodalL25Recipe() {
        throw new Error("no debe actualizar de nuevo");
      },
      async listSodalL25SnapshotItems() {
        return [
          {
            id: 91,
            cotizacionId: 818,
            organizationId: 1,
            codigo: "V1",
            snapshot: saved[0]!,
          },
        ];
      },
      async saveSnapshot() {
        throw new Error("no debe rec<lcular de nuevo");
      },
    });

    expect(second.recipesUpdated).toBe(0);
    expect(second.snapshotsRecalculated).toBe(0);
    expect(second.snapshotsSkipped).toBe(1);
  });
});

import { crearRecetasP2U } from "@/features/fabricacion/fixtures/traditional-p2u-recipes";
import { crearRecetasSodalP2A } from "@/features/fabricacion/fixtures/sodal-p2a-recipes";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import {
  buildFabricationRecipeSummary,
  getActiveRecipeProfileRules,
} from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { auditCanonicalFabricationLines } from "@/features/fabricacion/services/fabricacion-consistency-audit.service";

describe("P3 — semántica única de referencias, reglas y cortes", () => {
  it("Línea 15 no cuenta alternativas 1506/1507/1508 como cortes activos", () => {
    const recipe = crearRecetasP2U({
      catalogKey: "ventora:serie-15-corredera-2h",
      lineName: "Línea 15",
    })[0]!;
    const summary = buildFabricationRecipeSummary(recipe);

    expect(summary.activeRuleCount).toBe(5);
    expect(summary.activePieceCount).toBe(10);
    expect(summary.optionalProfileCount).toBe(3);
    expect(getActiveRecipeProfileRules(recipe).map((profile) => profile.codigoPerfil)).toEqual([
      "1501",
      "1502",
      "1503",
      "1504",
      "1505",
    ]);

    const result = calcularCubicacionYPauta(recipe, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: 2,
      modulos: 1,
      variante: recipe.identidad.variante,
    });
    expect(result.perfiles.map((profile) => profile.codigoPerfil)).toEqual([
      "1501",
      "1502",
      "1503",
      "1504",
      "1505",
    ]);
  });

  it("AM-35 separa las tres reglas activas de sus cinco alternativas documentadas", () => {
    const recipe = crearRecetasP2U({ catalogKey: "ventora:l35", lineName: "AM-35" })[1]!;
    const summary = buildFabricationRecipeSummary(recipe);

    expect(summary.activeRuleCount).toBe(3);
    expect(summary.activePieceCount).toBe(3);
    expect(summary.optionalProfileCount).toBe(5);
    expect(summary.compositionComplete).toBe(false);
  });

  it("Serie 4600 hidráulica conserva cuatro referencias de sistema, dos reglas y cuatro cortes", () => {
    const recipe = crearRecetasSodalP2A({
      catalogKey: "ventora:serie-4600-puerta-vaiven",
      lineName: "Serie 4600",
    })[1]!;
    const summary = buildFabricationRecipeSummary(recipe);

    expect(summary.activeRuleCount).toBe(2);
    expect(summary.activePieceCount).toBe(4);
    expect(recipe.perfiles.map((profile) => profile.codigoPerfil)).toEqual(["4604", "4602"]);
    expect(recipe.identidad.tipologia).toBe("puerta_vaiven");
  });

  it("un perfil opcional con condición explícita se activa solo para su variante", () => {
    const recipe = crearRecetasP2U({
      catalogKey: "ventora:serie-15-corredera-2h",
      lineName: "Línea 15",
    })[0]!;
    const conditional = {
      ...recipe.perfiles[5]!,
      requerido: false,
      reglaMedida: { ...recipe.perfiles[5]!.reglaMedida, condicion: { variante: "reforzada" } },
      reglaCantidad: { ...recipe.perfiles[5]!.reglaCantidad, condicion: { variante: "reforzada" } },
    };
    const selected = { ...recipe, identidad: { ...recipe.identidad, variante: "reforzada" }, perfiles: [conditional] };
    const notSelected = { ...selected, identidad: { ...selected.identidad, variante: "normal" } };

    expect(buildFabricationRecipeSummary(selected).activeRuleCount).toBe(1);
    expect(buildFabricationRecipeSummary(notSelected).activeRuleCount).toBe(0);
  });

  it("audita exactamente las 29 líneas canónicas sin inventar una discrepancia por variantes", () => {
    const rows = auditCanonicalFabricationLines();

    expect(rows).toHaveLength(29);
    expect(new Set(rows.map((row) => row.catalogKey)).size).toBe(29);
    expect(rows.find((row) => row.catalogKey === "ventora:serie-4600-puerta-vaiven")).toMatchObject({
      referenciasSistema: ["4601", "4603", "4604", "4602"],
      variantesReceta: expect.arrayContaining([
        expect.objectContaining({ reglasActivas: ["4601", "4603"], cantidadCortesActivos: 4 }),
        expect.objectContaining({ reglasActivas: ["4604", "4602"], cantidadCortesActivos: 4 }),
      ]),
    });
    expect(rows.some((row) => row.warnings.some((warning) => warning.code === "OPTIONAL_PROFILE_COUNTED_AS_ACTIVE"))).toBe(false);
  });
});

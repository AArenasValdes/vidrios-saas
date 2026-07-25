/** @jest-environment jsdom */

import {
  buildRecipeCuttingPreview,
  describeRecipeMeasure,
  migrateLegacyCubicationToRecipe,
  recipePreviewToLegacyCuttingPreview,
  resolveComponentLengthMm,
  resolveComponentQuantity,
} from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";
import {
  createRecipeComponent,
  deriveRecipeStatus,
  duplicateRecipeAsVariant,
  getFabricationRecipePackFromMetadata,
  isComponentConfigured,
  markRecipeDirtyAfterEdit,
  mergeFabricationRecipePackIntoMetadata,
  recipeDisplayProfile,
  selectRecipeForQuote,
  type FabricationRecipe,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import {
  createCommercialPendingBaseRecipe,
  createCommercialSuggestedRecipe,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe-commercial-templates";
import { createStructuralRecipeTemplate } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-templates";
import {
  buildCubicationSnapshotFromCatalogMetadata,
  isGeometricFallbackSnapshot,
  resolveCubicationSnapshotForSave,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";

describe("fabrication recipe domain", () => {
  it("crea plantilla de corredera 2 hojas con componentes reales", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    const keys = recipe.components.map((c) => c.functionKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        "riel_superior",
        "riel_inferior",
        "jamba",
        "cabezal",
        "zocalo",
        "pierna",
        "traslapo",
        "vidrio",
      ])
    );
    expect(keys).not.toContain("marco");
    expect(recipe.status).toBe("en_configuracion");
  });

  it("calcula cantidad y medida con reglas guiadas", () => {
    const riel = createRecipeComponent({
      functionKey: "riel_superior",
      profileCode: "5001",
      profileName: "Riel 5001",
      quantityRule: "fixed",
      quantityValue: 1,
      measureBase: "vano_width",
      adjustMode: "subtract",
      adjustMm: 6,
    });
    const jamba = createRecipeComponent({
      functionKey: "jamba",
      profileCode: "5003",
      quantityRule: "fixed",
      quantityValue: 2,
      measureBase: "vano_height",
      adjustMode: "subtract",
      adjustMm: 6,
    });
    const ctx = {
      widthMm: 1200,
      heightMm: 1000,
      sashCount: 2,
      moduleCount: 1,
      quantity: 1,
    };
    expect(resolveComponentQuantity(riel, ctx)).toBe(1);
    expect(resolveComponentLengthMm(riel, ctx).lengthMm).toBe(1194);
    expect(resolveComponentQuantity(jamba, ctx)).toBe(2);
    expect(resolveComponentLengthMm(jamba, ctx).lengthMm).toBe(994);
  });

  it("no marca lista_para_validar si faltan perfiles obligatorios", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    expect(deriveRecipeStatus(recipe)).toBe("en_configuracion");
    // Las medidas permiten estimar cortes, pero sin código de taller no está lista.
    expect(recipe.components.some((c) => c.required && isComponentConfigured(c))).toBe(true);
    expect(deriveRecipeStatus(recipe)).not.toBe("lista_para_validar");
  });

  it("estima cortes aunque el perfil diga Perfil sin código", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    const preview = buildRecipeCuttingPreview(recipe, {
      widthMm: 1200,
      heightMm: 1000,
      sashCount: 2,
      quantity: 1,
    });
    expect(preview.profileCuts.length).toBeGreaterThan(0);
    expect(preview.profileCuts.every((cut) => cut.label === "Perfil sin código")).toBe(true);
    expect(preview.profileCuts.some((cut) => cut.functionLabel === "Riel superior")).toBe(true);
    // Sin código de taller no hay barras confiables.
    expect(preview.barSuggestions.length).toBe(0);
  });

  it("pasa a lista_para_validar cuando los obligatorios están configurados", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    recipe.components = recipe.components.map((component) =>
      component.required
        ? {
            ...component,
            profileCode: `P-${component.functionKey}`,
            profileName: component.functionLabel,
          }
        : component
    );
    expect(deriveRecipeStatus(recipe)).toBe("lista_para_validar");
  });

  it("al editar una receta validada pasa a requiere_revision", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    recipe.status = "validada";
    recipe.validatedAt = new Date().toISOString();
    recipe.components = recipe.components.map((component) => ({
      ...component,
      profileCode: "X",
      profileName: "X",
    }));
    const dirty = markRecipeDirtyAfterEdit({
      ...recipe,
      components: recipe.components.map((c, index) =>
        index === 0 ? { ...c, adjustMm: 10, adjustMode: "subtract" as const } : c
      ),
    });
    expect(dirty.status).toBe("requiere_revision");
  });

  it("bump de versión solo en el primer cambio post-validada", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    recipe.status = "validada";
    recipe.validatedAt = new Date().toISOString();
    recipe.recipeVersion = 1;
    recipe.versionBumpedSinceValidation = false;
    const first = markRecipeDirtyAfterEdit({
      ...recipe,
      variant: "ajustada",
    });
    expect(first.recipeVersion).toBe(2);
    expect(first.versionBumpedSinceValidation).toBe(true);
    const second = markRecipeDirtyAfterEdit({
      ...first,
      variant: "ajustada-2",
    });
    expect(second.recipeVersion).toBe(2);
  });

  it("migra fabricationRecipe legacy a pack de 1 y espeja default", () => {
    const legacy = createStructuralRecipeTemplate("corredera_2_hojas");
    const metadata = { fabricationRecipe: legacy };
    const pack = getFabricationRecipePackFromMetadata(metadata);
    expect(pack?.recipes).toHaveLength(1);
    expect(pack?.defaultRecipeId).toBe(legacy.id);
    const mirrored = mergeFabricationRecipePackIntoMetadata({}, pack);
    expect(mirrored.fabricationRecipe).toMatchObject({ id: legacy.id });
    expect(mirrored.fabricationRecipePack).toBeTruthy();
  });

  it("en cotización pide variante solo si hay varias activas compatibles", () => {
    const a = createStructuralRecipeTemplate("corredera_2_hojas");
    const b = duplicateRecipeAsVariant(a, "open lock", { herrajeTipo: "open_lock" });
    b.herrajeTipo = "open_lock";
    const pack = {
      v: 1 as const,
      recipes: [
        { ...a, herrajeTipo: "caracol" as const, isActive: true },
        { ...b, isActive: true },
      ],
      defaultRecipeId: a.id,
      lastUsedRecipeId: null,
    };
    const multi = selectRecipeForQuote({
      pack,
      apertura: "corredera",
    });
    expect(multi.needsVariantChoice).toBe(true);
    expect(multi.recipe).toBeNull();
    const chosen = selectRecipeForQuote({
      pack,
      apertura: "corredera",
      preferredRecipeId: b.id,
    });
    expect(chosen.needsVariantChoice).toBe(true);
    expect(chosen.recipe?.id).toBe(b.id);
    const single = selectRecipeForQuote({
      pack: { ...pack, recipes: [pack.recipes[0]!] },
      apertura: "corredera",
    });
    expect(single.needsVariantChoice).toBe(false);
    expect(single.recipe?.id).toBe(a.id);
  });

  it("plantillas L5000/L20/L25 son iniciales sugeridas con herraje caracol", () => {
    const l5000 = createCommercialSuggestedRecipe("sugerida_l5000_corredera_caracol");
    expect(l5000?.sourceKind).toBe("plantilla_sugerida");
    expect(l5000?.herrajeTipo).toBe("caracol");
    const jamba = l5000?.components.find((c) => c.functionKey === "jamba");
    expect(jamba?.adjustMm).toBe(3);
    const pierna = l5000?.components.find((c) => c.functionKey === "pierna");
    expect(pierna?.adjustMm).toBe(18);
    const l20 = createCommercialSuggestedRecipe("sugerida_l20_corredera_caracol");
    expect(l20?.components.find((c) => c.functionKey === "riel_superior")?.adjustMm).toBe(12);
    const l25 = createCommercialSuggestedRecipe("sugerida_l25_corredera_caracol");
    expect(l25?.components.find((c) => c.functionKey === "pierna")?.adjustMm).toBe(35);
    const base = createCommercialPendingBaseRecipe("base_abatible_1_hoja");
    expect(base?.sourceKind).toBe("base_tipologica");
    expect(base?.components.every((c) => c.adjustMm === 0)).toBe(true);
  });

  it("duplica como variante sin heredar validación", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    recipe.status = "validada";
    recipe.validatedAt = "2026-01-01T00:00:00.000Z";
    const copy = duplicateRecipeAsVariant(recipe, "termopanel");
    expect(copy.variant).toBe("termopanel");
    expect(copy.status).toBe("en_configuracion");
    expect(copy.validatedAt).toBeNull();
    expect(copy.components[0]?.id).not.toBe(recipe.components[0]?.id);
  });

  it("genera preview agrupable por perfil real", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    recipe.components = recipe.components.map((component) => ({
      ...component,
      profileCode:
        component.functionKey === "riel_superior" || component.functionKey === "riel_inferior"
          ? "5001"
          : component.functionKey === "jamba"
            ? "5003"
            : component.kind === "glass"
              ? "VID"
              : component.kind === "accessory"
                ? "ACC"
                : `P-${component.functionKey}`,
      profileName: component.functionLabel,
      adjustMode: "subtract" as const,
      adjustMm: 6,
    }));

    const preview = buildRecipeCuttingPreview(recipe, {
      widthMm: 1200,
      heightMm: 1000,
      sashCount: 2,
      quantity: 1,
    });

    expect(preview.pendingRequiredCount).toBe(0);
    expect(preview.profileCuts.some((cut) => cut.label === "5001")).toBe(true);
    expect(preview.profileCuts.some((cut) => cut.functionLabel === "Riel superior")).toBe(true);
    expect(preview.glasses.length).toBeGreaterThan(0);
    expect(preview.barSuggestions.every((bar) => bar.profileCode)).toBe(true);
    const mixed = preview.barSuggestions.some((bar) =>
      bar.cuts.some((cut) => {
        const owner = preview.profileCuts.find(
          (row) => row.functionLabel === cut.functionLabel && row.lengthMm === cut.lengthMm
        );
        return owner && owner.label !== bar.profileCode;
      })
    );
    expect(mixed).toBe(false);
  });

  it("migra metadata legacy marco/hoja a receta", () => {
    const recipe = migrateLegacyCubicationToRecipe({
      cuttingEnabled: true,
      cuttingMode: "marco_hojas",
      cuttingSashCount: 2,
      cubicationSystem: "corredera_2_hojas",
      cubicationStatus: "en_calibracion",
      profileFrame: "5001",
      profileSash: "5004",
      profileMeeting: "5007",
      deductionFrameHorizontalMm: 6,
      deductionFrameVerticalMm: 6,
      deductionSashHorizontalMm: 4,
      deductionSashVerticalMm: 4,
    });
    expect(recipe.fabricationType).toBe("corredera_2_hojas");
    expect(recipe.components.some((c) => c.functionKey === "riel_superior" && c.profileCode === "5001")).toBe(
      true
    );
    expect(recipe.status).toBe("en_validacion");
  });

  it("no trata Marco/Hoja como códigos de perfil al migrar", () => {
    const recipe = migrateLegacyCubicationToRecipe({
      cuttingEnabled: true,
      cuttingMode: "marco_hojas",
      cuttingSashCount: 2,
      cubicationSystem: "corredera_2_hojas",
      cubicationStatus: "lista_para_probar",
      profileFrame: "Marco",
      profileSash: "Hoja",
      profileMeeting: "Encuentro",
    });
    const riel = recipe.components.find((c) => c.functionKey === "riel_superior");
    expect(riel?.profileCode).toBe("");
    expect(riel ? recipeDisplayProfile(riel) : "").toBe("Perfil sin código");
  });
});

function buildL5000AcceptanceRecipe(): FabricationRecipe {
  return {
    v: 1,
    fabricationType: "corredera_2_hojas",
    variant: "estandar",
    sashCount: 2,
    moduleCount: 1,
    defaultBarLengthMm: 6000,
    defaultKerfMm: 3,
    status: "validada",
    validatedAt: "2026-07-23T00:00:00.000Z",
    validationCase: null,
    components: [
      createRecipeComponent({
        functionKey: "riel_superior",
        profileCode: "L5000-RS",
        quantityRule: "fixed",
        quantityValue: 1,
        measureBase: "vano_width",
        barLengthMm: 6000,
      }),
      createRecipeComponent({
        functionKey: "riel_inferior",
        profileCode: "L5000-RI",
        quantityRule: "fixed",
        quantityValue: 1,
        measureBase: "vano_width",
        barLengthMm: 6000,
      }),
      createRecipeComponent({
        functionKey: "jamba",
        profileCode: "L5000-J",
        quantityRule: "fixed",
        quantityValue: 2,
        measureBase: "vano_height",
        adjustMode: "subtract",
        adjustMm: 3,
        barLengthMm: 6000,
      }),
      createRecipeComponent({
        functionKey: "cabezal",
        profileCode: "L5000-C",
        quantityRule: "per_sash",
        quantityValue: 1,
        measureBase: "half_vano_width",
        adjustMode: "subtract",
        adjustMm: 2,
        barLengthMm: 6000,
      }),
      createRecipeComponent({
        functionKey: "zocalo",
        profileCode: "L5000-Z",
        quantityRule: "per_sash",
        quantityValue: 1,
        measureBase: "half_vano_width",
        adjustMode: "subtract",
        adjustMm: 2,
        barLengthMm: 6000,
      }),
      createRecipeComponent({
        functionKey: "pierna",
        profileCode: "L5000-P",
        quantityRule: "per_sash",
        quantityValue: 1,
        measureBase: "sash_height",
        adjustMode: "subtract",
        adjustMm: 18,
        barLengthMm: 6000,
      }),
      createRecipeComponent({
        functionKey: "traslapo",
        profileCode: "L5000-T",
        quantityRule: "per_sash",
        quantityValue: 1,
        measureBase: "sash_height",
        adjustMode: "subtract",
        adjustMm: 18,
        required: false,
        barLengthMm: 6000,
      }),
      createRecipeComponent({
        functionKey: "vidrio",
        kind: "glass",
        profileCode: "VID",
        quantityRule: "per_sash",
        quantityValue: 1,
        measureBase: "glass_width",
      }),
      createRecipeComponent({
        functionKey: "accesorio",
        kind: "accessory",
        profileCode: "ACC",
        quantityRule: "two_per_sash",
        quantityValue: 1,
        measureBase: "fixed",
        required: false,
      }),
    ],
  };
}

describe("aceptación despiece receta L5000", () => {
  const recipe = buildL5000AcceptanceRecipe();
  const metadata = {
    cuttingEnabled: true,
    cuttingMode: "marco_hojas" as const,
    cuttingBarLengthMm: 6000,
    cuttingSawKerfMm: 3,
    cuttingSashCount: 2,
    cubicationSystem: "corredera_2_hojas",
    cubicationStatus: "validada",
    fabricationRecipe: recipe,
  };

  const findCut = (
    cuts: Array<{ functionLabel: string; lengthMm: number; quantity: number }>,
    functionLabel: string
  ) => cuts.find((cut) => cut.functionLabel === functionLabel);

  it("una pieza 1200×1000 aplica la receta con trazabilidad", () => {
    const preview = buildRecipeCuttingPreview(recipe, {
      widthMm: 1200,
      heightMm: 1000,
      sashCount: 2,
      quantity: 1,
    });

    expect(findCut(preview.profileCuts, "Riel superior")).toMatchObject({
      quantity: 1,
      lengthMm: 1200,
    });
    expect(findCut(preview.profileCuts, "Riel inferior")).toMatchObject({
      quantity: 1,
      lengthMm: 1200,
    });
    expect(findCut(preview.profileCuts, "Jamba")).toMatchObject({ quantity: 2, lengthMm: 997 });
    expect(findCut(preview.profileCuts, "Cabezal")).toMatchObject({ quantity: 2, lengthMm: 598 });
    expect(findCut(preview.profileCuts, "Zócalo")).toMatchObject({ quantity: 2, lengthMm: 598 });
    expect(findCut(preview.profileCuts, "Pierna")).toMatchObject({ quantity: 2, lengthMm: 982 });
    expect(findCut(preview.profileCuts, "Traslapo")).toMatchObject({ quantity: 2, lengthMm: 982 });
    expect(preview.glasses[0]).toMatchObject({
      widthMm: 600,
      heightMm: 1000,
      quantity: 2,
      totalM2: 1.2,
    });
    expect(preview.accessories.reduce((sum, entry) => sum + entry.quantity, 0)).toBe(4);
    expect(preview.totalProfilesLinealMm).toBe(10714);
    expect(preview.profileCuts.some((cut) => /Marco|División/i.test(cut.functionLabel))).toBe(
      false
    );

    const ctx = {
      widthMm: 1200,
      heightMm: 1000,
      sashCount: 2,
      moduleCount: 1,
      quantity: 1,
    };
    expect(describeRecipeMeasure(recipe.components[2]!, ctx, 997)).toBe(
      "Alto total 1.000 mm − 3 mm = 997 mm"
    );
    expect(describeRecipeMeasure(recipe.components[3]!, ctx, 598)).toBe(
      "Mitad del ancho total 600 mm − 2 mm = 598 mm"
    );
    expect(describeRecipeMeasure(recipe.components[5]!, ctx, 982)).toBe(
      "Alto de hoja 1.000 mm − 18 mm = 982 mm"
    );
  });

  it("seis piezas idénticas consolidan 64.284 mm, 7,20 m² y 24 accesorios", () => {
    const rowMap = new Map<
      string,
      { functionLabel: string; lengthMm: number; quantity: number; totalLinealMm: number }
    >();
    let totalProfilesLinealMm = 0;
    let totalGlassM2 = 0;
    let totalAccessories = 0;

    for (let i = 0; i < 6; i += 1) {
      const legacy = recipePreviewToLegacyCuttingPreview(
        buildRecipeCuttingPreview(recipe, {
          widthMm: 1200,
          heightMm: 1000,
          sashCount: 2,
          quantity: 1,
        })
      );
      totalAccessories += legacy.accessoryUnits;
      totalGlassM2 += legacy.glass?.totalM2 ?? 0;
      legacy.cuts.forEach((cut) => {
        const key = `${cut.label}|${cut.functionLabel}|${cut.lengthMm}`;
        const existing = rowMap.get(key);
        if (existing) {
          existing.quantity += cut.quantity;
          existing.totalLinealMm += cut.totalLinealMm;
        } else {
          rowMap.set(key, {
            functionLabel: cut.functionLabel,
            lengthMm: cut.lengthMm,
            quantity: cut.quantity,
            totalLinealMm: cut.totalLinealMm,
          });
        }
        totalProfilesLinealMm += cut.totalLinealMm;
      });
    }

    expect(totalProfilesLinealMm).toBe(64284);
    expect(totalGlassM2).toBeCloseTo(7.2, 5);
    expect(totalAccessories).toBe(24);

    const rows = Array.from(rowMap.values());
    expect(rows.find((row) => row.functionLabel === "Riel superior")).toMatchObject({
      quantity: 6,
      lengthMm: 1200,
    });
    expect(rows.find((row) => row.functionLabel === "Jamba")).toMatchObject({
      quantity: 12,
      lengthMm: 997,
    });
    expect(rows.find((row) => row.functionLabel === "Cabezal")).toMatchObject({
      quantity: 12,
      lengthMm: 598,
    });
    expect(rows.find((row) => row.functionLabel === "Pierna")).toMatchObject({
      quantity: 12,
      lengthMm: 982,
    });
  });

  it("piezas con medidas distintas no mezclan cortes de jamba", () => {
    const a = recipePreviewToLegacyCuttingPreview(
      buildRecipeCuttingPreview(recipe, {
        widthMm: 1200,
        heightMm: 1000,
        sashCount: 2,
        quantity: 1,
      })
    );
    const b = recipePreviewToLegacyCuttingPreview(
      buildRecipeCuttingPreview(recipe, {
        widthMm: 1500,
        heightMm: 1200,
        sashCount: 2,
        quantity: 1,
      })
    );

    const jambaLengths = new Set(
      [...a.cuts, ...b.cuts]
        .filter((cut) => cut.functionLabel === "Jamba")
        .map((cut) => cut.lengthMm)
    );
    expect(jambaLengths.has(997)).toBe(true);
    expect(jambaLengths.has(1197)).toBe(true);
    expect(jambaLengths.size).toBe(2);
  });

  it("snapshot desde metadata usa receta y no fallback geométrico", () => {
    const snapshot = buildCubicationSnapshotFromCatalogMetadata({
      lineTemplateId: "tpl-l5000",
      catalogMetadata: metadata,
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
    });
    expect(snapshot?.estimationKind).toBe("recipe");
    expect(isGeometricFallbackSnapshot(snapshot)).toBe(false);
    expect(findCut(snapshot!.cuts, "Jamba")).toMatchObject({ quantity: 2, lengthMm: 997 });
    expect(findCut(snapshot!.cuts, "Jamba")?.measureExplanation).toContain("997");

    const saved = resolveCubicationSnapshotForSave({
      lineTemplateId: "tpl-l5000",
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
      catalogMetadata: metadata,
      personalizadoAssistMode: true,
    });
    expect(saved?.estimationKind).toBe("recipe");
    expect(saved?.cuts.some((cut) => cut.label === "Marco")).toBe(false);
    expect(saved?.cuts.some((cut) => cut.label === "División / hoja")).toBe(false);
    expect(saved?.recipe?.defaultBarLengthMm).toBe(6000);
    expect(saved?.recipe?.defaultKerfMm).toBe(3);
  });
});

describe("distribución sugerida de barras (FFD)", () => {
  it("aplica First Fit Decreasing con pérdida por cada corte", () => {
    const recipe: FabricationRecipe = {
      ...createStructuralRecipeTemplate("corredera_2_hojas"),
      defaultBarLengthMm: 6000,
      defaultKerfMm: 3,
      components: [
        createRecipeComponent({
          functionKey: "jamba",
          profileCode: "5003",
          profileName: "Jamba 5003",
          quantityRule: "fixed",
          quantityValue: 6,
          measureBase: "fixed",
          fixedMeasureMm: 997,
        }),
      ],
    };

    const preview = buildRecipeCuttingPreview(recipe, {
      widthMm: 1200,
      heightMm: 1000,
      quantity: 1,
    });

    expect(preview.barsStatus).toBe("calculado");
    expect(preview.barSuggestions).toHaveLength(1);
    expect(preview.barSuggestions[0]).toMatchObject({
      usedMm: 5982,
      kerfTotalMm: 18,
      wasteMm: 0,
      barLengthMm: 6000,
    });
    expect(preview.barSuggestions[0]?.cuts).toHaveLength(6);
  });

  it("no mezcla códigos distintos y hereda largo salvo override", () => {
    const recipe: FabricationRecipe = {
      ...createStructuralRecipeTemplate("corredera_2_hojas"),
      defaultBarLengthMm: 6000,
      defaultKerfMm: 3,
      components: [
        createRecipeComponent({
          functionKey: "riel_superior",
          profileCode: "5001",
          quantityValue: 2,
          measureBase: "fixed",
          fixedMeasureMm: 1200,
        }),
        createRecipeComponent({
          functionKey: "riel_inferior",
          profileCode: "5002",
          quantityValue: 2,
          measureBase: "fixed",
          fixedMeasureMm: 1200,
        }),
        createRecipeComponent({
          functionKey: "jamba",
          profileCode: "5003",
          quantityValue: 2,
          measureBase: "fixed",
          fixedMeasureMm: 1500,
          barLengthMm: 5800,
        }),
        createRecipeComponent({
          functionKey: "vidrio",
          kind: "glass",
          measureBase: "glass_width",
          quantityRule: "per_sash",
        }),
      ],
    };

    const preview = buildRecipeCuttingPreview(recipe, {
      widthMm: 1200,
      heightMm: 1500,
      sashCount: 2,
      quantity: 1,
    });

    const codes = new Set(preview.barSuggestions.map((bar) => bar.profileCode));
    expect(codes.has("5001")).toBe(true);
    expect(codes.has("5002")).toBe(true);
    expect(codes.has("5003")).toBe(true);
    expect(
      preview.barSuggestions.some(
        (bar) => bar.profileCode === "5001" && bar.cuts.some((cut) => cut.functionLabel.includes("5002"))
      )
    ).toBe(false);
    expect(
      preview.profileBarPlans.find((plan) => plan.profileCode === "5003")?.barLengthMm
    ).toBe(5800);
    expect(
      preview.profileBarPlans.find((plan) => plan.profileCode === "5001")?.barLengthMm
    ).toBe(6000);
    expect(preview.glasses.length).toBeGreaterThan(0);
    expect(preview.profileBarPlans.every((plan) => plan.profileCode !== "VID")).toBe(true);
  });

  it("marca No calculable / Pauta pendiente sin código o largo", () => {
    const noBarRecipe: FabricationRecipe = {
      ...createStructuralRecipeTemplate("corredera_2_hojas"),
      defaultBarLengthMm: 6000,
      defaultKerfMm: 3,
      components: [
        createRecipeComponent({
          functionKey: "riel_superior",
          profileCode: "",
          quantityValue: 1,
          measureBase: "vano_width",
        }),
      ],
    };
    const previewEmpty = buildRecipeCuttingPreview(noBarRecipe, {
      widthMm: 1200,
      heightMm: 1000,
    });
    expect(previewEmpty.barsStatus).toBe("no_calculable");
    expect(previewEmpty.profileBarPlans[0]?.pendingLabel).toBe("Pauta pendiente");

    const partial: FabricationRecipe = {
      ...createStructuralRecipeTemplate("corredera_2_hojas"),
      defaultBarLengthMm: 6000,
      defaultKerfMm: 3,
      components: [
        createRecipeComponent({
          functionKey: "riel_superior",
          profileCode: "5001",
          required: true,
          quantityValue: 1,
          measureBase: "vano_width",
        }),
        createRecipeComponent({
          functionKey: "jamba",
          profileCode: "",
          required: true,
          quantityValue: 2,
          measureBase: "vano_height",
        }),
      ],
    };
    const previewPartial = buildRecipeCuttingPreview(partial, {
      widthMm: 1200,
      heightMm: 1000,
    });
    expect(previewPartial.barsStatus).toBe("pauta_parcial");
    expect(previewPartial.barSuggestions.length).toBeGreaterThan(0);
    expect(
      previewPartial.profileBarPlans.some((plan) => plan.pendingLabel === "Pauta pendiente")
    ).toBe(true);
  });
});

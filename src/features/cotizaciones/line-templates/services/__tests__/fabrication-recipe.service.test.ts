/** @jest-environment jsdom */

import {
  buildRecipeCuttingPreview,
  migrateLegacyCubicationToRecipe,
  resolveComponentLengthMm,
  resolveComponentQuantity,
} from "@/features/cotizaciones/line-templates/services/fabrication-recipe.service";
import {
  createRecipeComponent,
  deriveRecipeStatus,
  duplicateRecipeAsVariant,
  isComponentConfigured,
  markRecipeDirtyAfterEdit,
  recipeDisplayProfile,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { createStructuralRecipeTemplate } from "@/features/cotizaciones/line-templates/types/fabrication-recipe-templates";

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

  it("estima cortes aunque el perfil diga Por asignar", () => {
    const recipe = createStructuralRecipeTemplate("corredera_2_hojas");
    const preview = buildRecipeCuttingPreview(recipe, {
      widthMm: 1200,
      heightMm: 1000,
      sashCount: 2,
      quantity: 1,
    });
    expect(preview.profileCuts.length).toBeGreaterThan(0);
    expect(preview.profileCuts.every((cut) => cut.label === "Por asignar")).toBe(true);
    expect(preview.profileCuts.some((cut) => cut.functionLabel === "Riel superior")).toBe(true);
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
    expect(riel ? recipeDisplayProfile(riel) : "").toBe("Por asignar");
  });
});

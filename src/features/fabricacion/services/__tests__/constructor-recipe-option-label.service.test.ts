import {
  getConstructorRecipeProfileCodeLabel,
  getConstructorRecipeSourceLabel,
} from "@/features/fabricacion/services/constructor-recipe-option-label.service";
import { formatVariantDisplayLabel } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

function recipe(overrides: Partial<FabricationRecipeRecord> = {}): FabricationRecipeRecord {
  return {
    id: "recipe-1",
    organizationId: 1,
    lineTemplateId: 1,
    scope: "ventora",
    providerName: "Ventora",
    lineName: "Serie 32",
    typology: "proyectante",
    leavesCount: 1,
    variant: "normal",
    version: 1,
    status: "validated",
    definition: {
      identidad: {
        recetaId: "recipe-1",
        nombre: "Normal",
        codigo: "L32",
        tipologia: "proyectante",
        hojas: 1,
        variante: "normal",
      },
      perfiles: [
        { id: "frame-a", codigoPerfil: "3201" },
        { id: "frame-b", codigoPerfil: "3201" },
        { id: "leaf", codigoPerfil: "3202" },
        { id: "bead", codigoPerfil: "3208" },
      ],
      vidrio: [],
      accesorios: [],
      barras: [],
    },
    sourceType: "workshop",
    sourceReference: null,
    sourceName: null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
    eliminadoEn: null,
    ...overrides,
  };
}

describe("constructor recipe option labels", () => {
  it("does not present the selected price provider as the technical recipe source", () => {
    expect(
      getConstructorRecipeSourceLabel(
        recipe({ sourceName: "Taller · confirmación del titular" })
      )
    ).toBe("Ventora");
  });

  it("labels a Ventora reference separately from a supplier price list", () => {
    expect(getConstructorRecipeSourceLabel(recipe({ sourceName: "Referencia Ventora" }))).toBe(
      "Ventora"
    );
  });

  it("uses an explicitly documented supplier when present", () => {
    expect(
      getConstructorRecipeSourceLabel(
        recipe({ providerName: "Arquetipo", sourceName: "Arquetipo" })
      )
    ).toBe("Arquetipo");
  });

  it("identifies a user-authored option as a workshop variant", () => {
    expect(getConstructorRecipeSourceLabel(recipe({
      sourceReference: "taller:personalizada:l5000:variante-1",
      sourceName: null,
    }))).toBe("Variante del taller");
  });

  it("shows unique profile codes instead of repeating each cut rule", () => {
    expect(getConstructorRecipeProfileCodeLabel(recipe())).toBe("Perfiles 3201, 3202, 3208");
  });

  it("names the Arquetipo no-chamber recipe clearly in the constructor", () => {
    const arquetipoRecipe = recipe({
      variant: "arquetipo_sin_camara_monolitico",
      providerName: "Arquetipo",
      sourceName: "Arquetipo · precios LEGNO / cortes SODAL",
      sourceReference: "arquetipo:linea-42:legno:sodal-serie-4200-sin-camara-monolitico:v1",
    });

    expect(formatVariantDisplayLabel(arquetipoRecipe)).toBe(
      "Arquetipo · Sin cámara · Monolítico",
    );
    expect(getConstructorRecipeSourceLabel(arquetipoRecipe)).toBe(
      "Arquetipo · precios LEGNO / cortes SODAL",
    );
  });
});

import {
  dedupeConstructorRecipeCandidates,
  resolveConstructorRecipeCandidates,
  resolveConstructorRecipeSelection,
} from "@/features/fabricacion/services/constructor-recipe-selection.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const recipe = (id: string) =>
  ({
    id,
    scope: "organization",
    status: "validated",
    version: 1,
    definition: {
      identidad: {
        recetaId: id,
        nombre: id,
        codigo: id,
        tipologia: "corredera",
        hojas: 2,
        variante: id,
      },
      perfiles: [{ codigoPerfil: id }],
      vidrio: [],
      accesorios: [],
      barras: [],
    },
  }) as unknown as FabricationRecipeRecord;
const technicalRecipe = (input: {
  id: string;
  profileCode?: string;
  deduction?: number;
  variant?: string;
  recipeCode?: string;
}) =>
  ({
    id: input.id,
    scope: "organization",
    status: "validated",
    version: 1,
    definition: {
      identidad: {
        recetaId: input.id,
        nombre: `Normal ${input.id}`,
        codigo: input.recipeCode ?? "L32",
        tipologia: "proyectante",
        hojas: 1,
        variante: input.variant ?? "normal",
      },
      perfiles: [{ codigo: input.profileCode ?? "3201", descuento: input.deduction ?? -10 }],
      vidrio: [],
      accesorios: [],
      barras: [],
    },
  }) as unknown as FabricationRecipeRecord;

describe("resolveConstructorRecipeSelection", () => {
  it("conserva recetas guardadas y fallbacks universales como rutas seleccionables", () => {
    const storedRecipe = technicalRecipe({ id: "stored" });
    const universalRecipe = technicalRecipe({ id: "universal", profileCode: "3202" });

    expect(
      resolveConstructorRecipeCandidates({
        storedCandidates: [storedRecipe],
        universalFallbackCandidates: [universalRecipe],
      })
    ).toEqual([storedRecipe, universalRecipe]);
  });

  it("colapsa una copia universal idéntica y conserva la receta validada del taller", () => {
    const storedRecipe = technicalRecipe({ id: "stored" });
    const universalRecipe = {
      ...technicalRecipe({ id: "universal" }),
      scope: "ventora",
      status: "testing",
    } as FabricationRecipeRecord;

    expect(
      resolveConstructorRecipeCandidates({
        storedCandidates: [storedRecipe],
        universalFallbackCandidates: [universalRecipe],
      })
    ).toEqual([storedRecipe]);
  });

  it("usa recetas guardadas cuando la línea no tiene fallback universal", () => {
    const storedRecipe = technicalRecipe({ id: "stored" });

    expect(
      resolveConstructorRecipeCandidates({
        storedCandidates: [storedRecipe],
        universalFallbackCandidates: [],
      })
    ).toEqual([storedRecipe]);
  });

  it("conserva la única receta compatible aunque no haya elección explícita", () => {
    const onlyRecipe = recipe("l12-shower-2h");

    expect(
      resolveConstructorRecipeSelection({ selection: "", candidates: [onlyRecipe] })
    ).toBe(onlyRecipe);
  });

  it("no elige por su cuenta cuando hay varias recetas compatibles", () => {
    expect(
      resolveConstructorRecipeSelection({
        selection: "",
        candidates: [recipe("alar"), recipe("sodal")],
      })
    ).toBeNull();
  });

  it("respeta la receta que el usuario eligió", () => {
    const selected = recipe("recipe-b");

    expect(
      resolveConstructorRecipeSelection({
        selection: "recipe:recipe-b",
        candidates: [recipe("recipe-a"), selected],
      })
    ).toBe(selected);
  });

  it("quita copias de la misma receta aunque tengan IDs y nombres internos distintos", () => {
    const first = technicalRecipe({ id: "copy-a", variant: "normal", recipeCode: "AL32-N" });
    const second = technicalRecipe({ id: "copy-b", variant: "estandar", recipeCode: "SODAL-32" });

    expect(dedupeConstructorRecipeCandidates([first, second])).toEqual([first]);
    expect(
      resolveConstructorRecipeSelection({ selection: "", candidates: [first, second] })
    ).toBe(first);
  });

  it("colapsa copias con IDs internos distintos en perfiles y vidrios", () => {
    const first = {
      ...technicalRecipe({ id: "bahar-copy-a", variant: "bahar_5200_ventana_exterior" }),
      definition: {
        ...technicalRecipe({ id: "bahar-copy-a", variant: "bahar_5200_ventana_exterior" }).definition,
        perfiles: [
          { id: "profile-a", codigoPerfil: "65201VER", reglaMedida: { base: "ancho_total", ajusteMm: 6 } },
        ],
        vidrios: [
          { id: "glass-a", nombre: "Vidrio · espesor por elegir", reglaAncho: { base: "ancho_total", ajusteMm: -186 } },
        ],
      },
    } as FabricationRecipeRecord;
    const second = {
      ...first,
      id: "bahar-copy-b",
      definition: {
        ...first.definition,
        identidad: { ...first.definition.identidad, recetaId: "bahar-copy-b", nombre: "Otra copia", codigo: "BAHAR-COPY-B" },
        perfiles: [{ ...first.definition.perfiles[0], id: "profile-b" }],
        vidrios: [{ ...first.definition.vidrios[0], id: "glass-b" }],
      },
    } as FabricationRecipeRecord;

    expect(dedupeConstructorRecipeCandidates([first, second])).toEqual([first]);
  });

  it("mantiene la receta ya elegida cuando consolida una copia idéntica", () => {
    const first = technicalRecipe({ id: "copy-a" });
    const selected = technicalRecipe({ id: "copy-b" });

    expect(dedupeConstructorRecipeCandidates([first, selected], selected.id)).toEqual([selected]);
  });

  it("conserva opciones que cambian código de perfil o descuento", () => {
    const profileVariant = technicalRecipe({ id: "profile-variant", profileCode: "3202" });
    const deductionVariant = technicalRecipe({ id: "deduction-variant", deduction: -15 });

    expect(
      dedupeConstructorRecipeCandidates([
        technicalRecipe({ id: "base" }),
        profileVariant,
        deductionVariant,
      ])
    ).toHaveLength(3);
  });
});

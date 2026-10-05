import { fabricacionRecetaSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import {
  PLANTILLAS_VENTORA_CORREDERA_2H,
  crearRecetaPlantillaVentoraCorredera2H,
  crearRecetaReferenciaL5000Corredera2H,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { crearRecetasLine15Corredera } from "@/features/fabricacion/fixtures/line-15-corredera-recipe";
import { crearRecetasLine4000Corredera } from "@/features/fabricacion/fixtures/line-4000-corredera-recipe";
import { crearRecetaSerie45Practicable } from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import { crearRecetasSerie4800Corredera } from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
import {
  crearRecetaVeratec7400Workbook3H,
  crearRecetaVeratecCompactSliding,
  crearRecetaVeratecElegansFijo,
  VERATEC_7400_WORKBOOK_3H_VARIANTS,
  VERATEC_COMPACT_SLIDING_VARIANTS,
  VERATEC_ELEGANS_FIXED_VARIANTS,
} from "@/features/fabricacion/fixtures/veratec-workbook-recipes";
import {
  buildAllSodalL25Recipes,
  resetSodalL25RecipeCacheForTests,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { resetZetaConfirmedCacheForTests } from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import { resetEvidenceSidecarCacheForTests } from "@/features/fabricacion/zeta/zeta-evidence-sidecar-loader";

function assertRecipeParses(label: string, definition: unknown) {
  const parsed = fabricacionRecetaSchema.safeParse(definition);
  if (!parsed.success) {
    throw new Error(
      `${label}: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`
    );
  }
}

describe("auditoría schema fabricacionRecetaSchema", () => {
  beforeEach(() => {
    resetZetaConfirmedCacheForTests();
    resetEvidenceSidecarCacheForTests();
    resetSodalL25RecipeCacheForTests();
  });

  it("acepta recetas L25 Zeta canónicas", () => {
    for (const bundle of buildAllSodalL25Recipes()) {
      assertRecipeParses(`L25 ${bundle.recipeId}`, bundle.definition);
    }
  });

  it("acepta Línea 15 y 4000 con ajusteMm fraccionario en variantes 3H/4H", () => {
    for (const recipe of crearRecetasLine15Corredera({ lineName: "Línea 15" })) {
      assertRecipeParses(`L15 ${recipe.identidad.variante}`, recipe);
    }
    for (const recipe of crearRecetasLine4000Corredera({ lineName: "Línea 4000" })) {
      assertRecipeParses(`L4000 ${recipe.identidad.variante}`, recipe);
    }
  });

  it("acepta Serie 45, 4800 y plantillas Ventora", () => {
    assertRecipeParses("Serie 45", crearRecetaSerie45Practicable({ lineName: "Línea 45" }));
    for (const recipe of crearRecetasSerie4800Corredera({ lineName: "Serie 4800" })) {
      assertRecipeParses(recipe.identidad.variante, recipe);
    }
    assertRecipeParses("L5000", crearRecetaReferenciaL5000Corredera2H());
    for (const plantillaId of Object.keys(PLANTILLAS_VENTORA_CORREDERA_2H) as Array<
      keyof typeof PLANTILLAS_VENTORA_CORREDERA_2H
    >) {
      assertRecipeParses(
        plantillaId,
        crearRecetaPlantillaVentoraCorredera2H(plantillaId, {
          createId: () => `${plantillaId}-schema-audit`,
        })
      );
    }
  });

  it("acepta recetas Veratec de planilla con largo comercial pendiente explícito", () => {
    for (const variant of VERATEC_COMPACT_SLIDING_VARIANTS) {
      assertRecipeParses(
        variant.slug,
        crearRecetaVeratecCompactSliding({
          lineName: "Compact Sliding",
          variant: variant.slug,
          createId: () => `${variant.slug}-schema`,
        })
      );
    }
    for (const variant of VERATEC_7400_WORKBOOK_3H_VARIANTS) {
      assertRecipeParses(
        variant.slug,
        crearRecetaVeratec7400Workbook3H({
          lineName: "Sliding 7400",
          variant: variant.slug,
          createId: () => `${variant.slug}-schema`,
        })
      );
    }
    for (const variant of VERATEC_ELEGANS_FIXED_VARIANTS) {
      assertRecipeParses(
        variant.slug,
        crearRecetaVeratecElegansFijo({
          lineName: "Elegans 60",
          variant: variant.slug,
          createId: () => `${variant.slug}-schema`,
        })
      );
    }
  });
});

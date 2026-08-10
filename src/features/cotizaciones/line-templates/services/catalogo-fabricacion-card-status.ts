import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  deriveRecipeStatus,
  getFabricationRecipeFromMetadata,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";

export type TechnicalCardStatusTone =
  | "quote_only"
  | "draft"
  | "testing"
  | "validated";

export type TechnicalCardFilter =
  | "solo_cotizar"
  | "borradores"
  | "listas_para_probar"
  | "validadas";

export type TechnicalCardStatus = {
  tone: TechnicalCardStatusTone;
  label: string;
  detail: string;
  actionLabel: string;
  filter: TechnicalCardFilter;
};

function collectPendingTechnicalDetails(
  recipes: FabricationRecipeRecord[]
): string[] {
  const details = recipes.flatMap((entry) =>
    [
      ...entry.definition.perfiles,
      ...entry.definition.vidrios,
      ...entry.definition.accesorios,
    ].flatMap((component) => component.datosPendientes ?? [])
  );
  const unique = new Map<string, string>();

  details.forEach((detail) => {
    const normalized = detail.trim();
    if (normalized) unique.set(normalized.toLocaleLowerCase("es"), normalized);
  });

  return Array.from(unique.values());
}

function buildPendingTechnicalDetail(details: string[]): string {
  if (details.length === 0) {
    return "Continúa configurando esta línea.";
  }
  if (details.length > 1) {
    return `Faltan ${details.length} datos.`;
  }

  const detail = details[0].replace(/[.\s]+$/g, "");
  if (/largo comercial/i.test(detail)) return "Falta largo comercial.";
  if (/cantidades?/i.test(detail)) return "Pendiente de cantidades.";

  const conciseDetail = detail.replace(/^(confirmar|definir)\s+/i, "");
  return `Falta ${conciseDetail.charAt(0).toLocaleLowerCase("es")}${conciseDetail.slice(1)}.`;
}

/**
 * Estado de fabricación en cards del Catálogo privado.
 * No bloquea cotizar: la línea sigue disponible aunque la fabricación esté sin configurar.
 */
export function buildTechnicalCardStatus(
  template: CotizacionLineTemplate,
  persistedRecipes: FabricationRecipeRecord[] = []
): TechnicalCardStatus {
  const metadata = template.catalogMetadata as
    | Record<string, unknown>
    | null
    | undefined;
  const wantsCutting = metadata?.cuttingEnabled === true;
  const recipe = getFabricationRecipeFromMetadata(metadata);
  const recipeStatus = recipe ? deriveRecipeStatus(recipe) : null;
  const activePersisted = persistedRecipes.filter(
    (entry) => entry.status !== "archived" && entry.eliminadoEn === null
  );
  const validatedPersisted = activePersisted.filter(
    (entry) => entry.status === "validated"
  );
  const reviewPersisted = activePersisted.filter(
    (entry) => entry.status === "review_required"
  );
  const testingPersisted = activePersisted.filter(
    (entry) => entry.status === "testing"
  );
  const pendingDetails = collectPendingTechnicalDetails(activePersisted);

  if (validatedPersisted.length > 0) {
    return {
      tone: "validated",
      label: "Validada",
      detail: "Lista para generar despiece y pauta.",
      actionLabel: "Ver fabricación",
      filter: "validadas",
    };
  }

  if (reviewPersisted.length > 0) {
    return {
      tone: "draft",
      label: "Borrador",
      detail: buildPendingTechnicalDetail(pendingDetails),
      actionLabel: "Continuar configuración",
      filter: "borradores",
    };
  }

  if (testingPersisted.length > 0) {
    return {
      tone: "testing",
      label: "Lista para probar",
      detail: "Comprueba la receta con una medida real.",
      actionLabel: "Probar fabricación",
      filter: "listas_para_probar",
    };
  }

  if (activePersisted.length > 0) {
    return {
      tone: "draft",
      label: "Borrador",
      detail: buildPendingTechnicalDetail(pendingDetails),
      actionLabel: "Continuar configuración",
      filter: "borradores",
    };
  }

  if (recipeStatus === "validada") {
    return {
      tone: "validated",
      label: "Validada",
      detail: "Lista para generar despiece y pauta.",
      actionLabel: "Ver fabricación",
      filter: "validadas",
    };
  }

  if (recipeStatus === "requiere_revision") {
    return {
      tone: "draft",
      label: "Borrador",
      detail: "Continúa configurando esta línea.",
      actionLabel: "Continuar configuración",
      filter: "borradores",
    };
  }

  if (recipeStatus === "lista_para_validar" || recipeStatus === "en_validacion") {
    return {
      tone: "testing",
      label: "Lista para probar",
      detail: "Comprueba la receta con una medida real.",
      actionLabel: "Probar fabricación",
      filter: "listas_para_probar",
    };
  }

  if (recipeStatus || wantsCutting) {
    return {
      tone: "draft",
      label: "Borrador",
      detail: "Continúa configurando esta línea.",
      actionLabel: "Continuar configuración",
      filter: "borradores",
    };
  }

  return {
    tone: "quote_only",
    label: "Sin configurar",
    detail: "Puedes cotizar igualmente.",
    actionLabel: "Configurar fabricación",
    filter: "solo_cotizar",
  };
}

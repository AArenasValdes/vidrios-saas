import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { getFabricationRecipeFromMetadata } from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import { deriveLineOperationalStatus } from "@/features/fabricacion/services/line-operational-status.service";

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
  operationalStatus: ReturnType<typeof deriveLineOperationalStatus>;
};

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
  const recipe = getFabricationRecipeFromMetadata(metadata);
  const operationalStatus = deriveLineOperationalStatus({
    template,
    recipes: persistedRecipes,
    referenceSource: recipe
      ? { sourceType: "unknown", sourceReference: "catalog_metadata" }
      : null,
  });

  if (operationalStatus.validationStatus === "workshop_validated") {
    return { tone: "validated", label: operationalStatus.label, detail: operationalStatus.detail, actionLabel: "Ver fabricación", filter: "validadas", operationalStatus };
  }
  if (operationalStatus.technicalStatus === "calculable") {
    return { tone: "testing", label: operationalStatus.label, detail: operationalStatus.detail, actionLabel: "Probar fabricación", filter: "listas_para_probar", operationalStatus };
  }
  if (persistedRecipes.length > 0 || recipe) {
    return { tone: "draft", label: operationalStatus.label, detail: operationalStatus.detail, actionLabel: "Continuar configuración", filter: "borradores", operationalStatus };
  }
  return { tone: "quote_only", label: operationalStatus.label, detail: operationalStatus.detail, actionLabel: "Configurar fabricación", filter: "solo_cotizar", operationalStatus };
}

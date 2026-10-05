import {
  buildQaPreliminaryRecipeMarker,
  isQaPreliminarySnapshotAuthorizedForCost,
} from "../qa-preliminary-snapshot.service";
import {
  getSupplierCatalogQaConfig,
} from "../proveedor-catalogo-qa.service";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

const enabledConfig = getSupplierCatalogQaConfig({
  SUPPLIER_CATALOG_V1_ENABLED: "true",
  SUPPLIER_CATALOG_V1_QA_ORGANIZATION_IDS: "3",
} as NodeJS.ProcessEnv);

const recipe = {
  id: "veratec-7400-draft",
  version: 3,
  status: "draft" as const,
  selectedVariant: "monolitico_4mm",
  sourceType: "manufacturer" as const,
  sourceReference: "veratec:7400",
};

describe("snapshot preliminar Supplier Catalog V1 QA", () => {
  it("autoriza draft solo para organización 3, admin, gate QA y receta resuelta explícitamente", () => {
    expect(buildQaPreliminaryRecipeMarker({
      organizationId: 3,
      userEmail: "admin@test.com",
      role: "admin",
      config: enabledConfig,
      recipe,
      explicitlyResolvedRecipeId: recipe.id,
      compositionComplete: true,
      listaParaValidar: true,
    })).toEqual({
      mode: "supplier_catalog_v1_qa_preliminary",
      readiness: "lista_para_validar",
      provenance: { sourceType: "manufacturer", sourceReference: "veratec:7400" },
    });
  });

  it("rechaza draft en otra organización", () => {
    expect(buildQaPreliminaryRecipeMarker({
      organizationId: 4, userEmail: "admin@test.com", role: "admin", config: enabledConfig, recipe,
      explicitlyResolvedRecipeId: recipe.id, compositionComplete: true, listaParaValidar: true,
    })).toBeNull();
  });

  it("rechaza a otro usuario admin aunque pertenezca a la organización allowlist", () => {
    expect(buildQaPreliminaryRecipeMarker({
      organizationId: 3, userEmail: "otro-admin@test.com", role: "admin", config: enabledConfig, recipe,
      explicitlyResolvedRecipeId: recipe.id, compositionComplete: true, listaParaValidar: true,
    })).toBeNull();
  });

  it("rechaza draft cuando el gate está apagado", () => {
    const disabledConfig = getSupplierCatalogQaConfig({} as NodeJS.ProcessEnv);
    expect(buildQaPreliminaryRecipeMarker({
      organizationId: 3, userEmail: "admin@test.com", role: "admin", config: disabledConfig, recipe,
      explicitlyResolvedRecipeId: recipe.id, compositionComplete: true, listaParaValidar: true,
    })).toBeNull();
  });

  it("no intercepta recetas validadas: conservan el camino formal existente", () => {
    expect(buildQaPreliminaryRecipeMarker({
      organizationId: 3, userEmail: "admin@test.com", role: "admin", config: enabledConfig,
      recipe: { ...recipe, status: "validated" }, explicitlyResolvedRecipeId: recipe.id,
      compositionComplete: true, listaParaValidar: true,
    })).toBeNull();
  });

  it("rechaza una receta que no sea la seleccionada y una receta que no esté lista", () => {
    expect(buildQaPreliminaryRecipeMarker({
      organizationId: 3, userEmail: "admin@test.com", role: "admin", config: enabledConfig, recipe,
      explicitlyResolvedRecipeId: "another-recipe", compositionComplete: true, listaParaValidar: true,
    })).toBeNull();
    expect(buildQaPreliminaryRecipeMarker({
      organizationId: 3, userEmail: "admin@test.com", role: "admin", config: enabledConfig, recipe,
      explicitlyResolvedRecipeId: recipe.id, compositionComplete: true, listaParaValidar: false,
    })).toBeNull();
  });

  it("el endpoint de costo consume snapshot preliminar únicamente bajo el mismo gate QA", () => {
    const snapshot = {
      qaPreliminary: {
        mode: "supplier_catalog_v1_qa_preliminary",
        items: [{
          itemId: "item-1", recipeId: recipe.id, recipeVersion: 3,
          variantKey: "monolitico_4mm", recipeStatus: "draft",
          readiness: "lista_para_validar", sourceType: "manufacturer", sourceReference: "veratec:7400",
        }],
      },
    } as unknown as FabricacionTrabajoSnapshot;

    expect(isQaPreliminarySnapshotAuthorizedForCost({
      snapshot, organizationId: 3, userEmail: "admin@test.com", role: "admin", config: enabledConfig,
    })).toBe(true);
    expect(isQaPreliminarySnapshotAuthorizedForCost({
      snapshot, organizationId: 4, userEmail: "admin@test.com", role: "admin", config: enabledConfig,
    })).toBe(false);
    expect(isQaPreliminarySnapshotAuthorizedForCost({
      snapshot, organizationId: 3, userEmail: "admin@test.com", role: "member", config: enabledConfig,
    })).toBe(false);
    expect(isQaPreliminarySnapshotAuthorizedForCost({
      snapshot, organizationId: 3, userEmail: "admin@test.com", role: "admin", config: getSupplierCatalogQaConfig({} as NodeJS.ProcessEnv),
    })).toBe(false);
  });
});

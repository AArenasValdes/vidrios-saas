import {
  BASE_LINE_CATALOG_KEYS,
  getLineVariantSlots,
  getLineVariantSlotsForFabricationTree,
  isBaseLineCatalogKey,
  resolvePlantillaIdFromCatalogKey,
  type LineVariantSlot,
} from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import {
  formatL20VariantTreeGroupLabel,
  isL20CatalogKey,
  L20_CATALOG_KEY,
  L20_FIJOS_CATALOG_KEY,
  resolveL20AperturaFromVariant,
  resolveL20CatalogKeyForVariant,
} from "@/features/fabricacion/fixtures/l20-alumetrica-variant-recipes";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { evaluarRecetaListaParaProbar } from "@/features/fabricacion/services/fabricacion-receta-lista-para-probar.service";
import { calcularCubicacionYPauta } from "@/features/fabricacion/services/fabricacion-calculo.service";
import { isSodalL25ZetaValidatedRecipe } from "@/features/fabricacion/services/fabricacion-receta-resolver.service";
import { formatSodalL25FullRecipeNameFromRecipe } from "@/features/fabricacion/services/sodal-l25-presentation.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export type FabricacionVariantTreeItem = {
  slot: LineVariantSlot;
  recipe: FabricationRecipeRecord | null;
  label: string;
  statusLabel: string;
  compositionComplete: boolean;
  calculable: boolean;
  validated: boolean;
  pendingFields: string[];
};

export type FabricacionVariantTreeGroup = {
  typology: string;
  typologyLabel: string;
  leavesCount: number;
  apertura?: string | null;
  items: FabricacionVariantTreeItem[];
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function parseCommercialSheetSchemeToHojas(
  sheetScheme: string | null | undefined
): number | null {
  const trimmed = (sheetScheme ?? "").trim();
  if (!trimmed || trimmed === "Personalizado") return null;
  const match = trimmed.match(/^(\d+)\s*hojas?$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function resolveCommercialFabricacionHojas(input: {
  sheetScheme?: string | null;
  fabricacionHojas?: number | null;
  hojasBase?: number | null;
  guidedVisualLeafCount?: number | null;
}): number | null {
  const fromScheme = parseCommercialSheetSchemeToHojas(input.sheetScheme);
  if (fromScheme != null) return fromScheme;
  if (input.fabricacionHojas != null && input.fabricacionHojas > 0) {
    return input.fabricacionHojas;
  }
  if (input.guidedVisualLeafCount != null && input.guidedVisualLeafCount > 0) {
    return input.guidedVisualLeafCount;
  }
  if (input.hojasBase != null && input.hojasBase > 0) return input.hojasBase;
  return null;
}

export function variantSlugMatchesRecipe(
  recipeVariant: string | null | undefined,
  slotSlug: string
): boolean {
  const recipe = normalizeText(recipeVariant);
  const slot = normalizeText(slotSlug);
  if (!recipe || !slot) return false;
  if (recipe === slot) return true;
  if (slot === "caracol" && (recipe.includes("caracol") || recipe === "estandar")) {
    return true;
  }
  if (slot === "normal" && (recipe === "normal" || recipe === "estandar")) {
    return true;
  }
  if (slot === "reforzada_pierna_abierta") {
    return (
      recipe.includes("reforzada") &&
      (recipe.includes("pierna") || recipe.includes("pierna_abierta"))
    );
  }
  if (slot === "pierna_cerrada_jamba_2009") {
    return (
      recipe === slot ||
      (recipe.includes("pierna_cerrada") && recipe.includes("2009")) ||
      recipe === "caracol" ||
      recipe === "estandar" ||
      recipe === "normal"
    );
  }
  if (slot === "pierna_cerrada" && recipe.includes("pierna_cerrada")) {
    return !recipe.includes("2009");
  }
  if (slot === "pierna_abierta_jamba_2009") {
    return recipe === slot || (recipe.includes("pierna_abierta") && recipe.includes("2009"));
  }
  if (slot === "pierna_abierta" && recipe === "pierna_abierta") {
    return true;
  }
  if (slot === "tp_15mm") {
    return recipe === slot || recipe.includes("tp_15");
  }
  return false;
}

export function recipeMatchesVariantSlot(
  recipe: FabricationRecipeRecord,
  slot: LineVariantSlot
): boolean {
  const identidad = recipe.definition.identidad;
  if (normalizeText(identidad.tipologia) !== normalizeText(slot.typology)) {
    return false;
  }
  if (identidad.hojas !== slot.leavesCount) return false;
  if (
    slot.apertura &&
    identidad.apertura &&
    normalizeText(identidad.apertura) !== normalizeText(slot.apertura)
  ) {
    return false;
  }
  return variantSlugMatchesRecipe(identidad.variante, slot.variantSlug);
}

export function findRecipeForVariantSlot(
  recipes: FabricationRecipeRecord[],
  slot: LineVariantSlot
): FabricationRecipeRecord | null {
  const active = recipes.filter((recipe) => !recipe.eliminadoEn && recipe.status !== "archived");
  const matches = active.filter((recipe) => recipeMatchesVariantSlot(recipe, slot));
  if (matches.length === 0) return null;
  return matches.sort((left, right) => right.version - left.version)[0] ?? null;
}

export function formatVariantDisplayLabel(recipe: FabricationRecipeRecord): string {
  if (isSodalL25ZetaValidatedRecipe(recipe)) {
    return formatSodalL25FullRecipeNameFromRecipe(recipe) ?? recipe.definition.identidad.nombre;
  }

  const identidad = recipe.definition.identidad;
  const variantLabel = identidad.variante
    ? identidad.variante
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Estándar";
  if (identidad.herraje && !variantLabel.toLowerCase().includes(identidad.herraje.toLowerCase())) {
    return `${variantLabel} · ${identidad.herraje.replaceAll("_", " ")}`;
  }
  return variantLabel;
}

export function formatTypologyLeavesLabel(input: {
  typology: string;
  leavesCount: number;
}): string {
  const tipologia =
    input.typology === "corredera"
      ? "Corredera"
      : input.typology === "proyectante"
        ? "Proyectante"
        : input.typology.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${tipologia} · ${input.leavesCount} ${input.leavesCount === 1 ? "hoja" : "hojas"}`;
}

function formatVariantTreeGroupLabel(
  catalogKey: string | null | undefined,
  slot: LineVariantSlot
): string {
  if (isL20CatalogKey(catalogKey) && slot.apertura) {
    const apertura = resolveL20AperturaFromVariant(slot.apertura) ?? slot.apertura;
    if (apertura === "corredera" || apertura === "fija") {
      return formatL20VariantTreeGroupLabel({
        apertura,
        leavesCount: slot.leavesCount,
      });
    }
  }
  return formatTypologyLeavesLabel({
    typology: slot.typology,
    leavesCount: slot.leavesCount,
  });
}

function variantTreeGroupSortRank(group: FabricacionVariantTreeGroup): number {
  const aperturaRank =
    group.apertura === "fija"
      ? 1
      : group.apertura === "corredera"
        ? 0
        : 2;
  return group.leavesCount * 10 + aperturaRank;
}

function collectPendingFields(recipe: FabricacionReceta | null, slot: LineVariantSlot): string[] {
  const pending = new Set<string>(slot.pendingFields);
  if (recipe?.datosPendientes?.length) {
    recipe.datosPendientes.forEach((field) => pending.add(field));
  }
  recipe?.perfiles.forEach((profile) => {
    profile.datosPendientes?.forEach((field) => pending.add(`${profile.funcion}: ${field}`));
  });
  return Array.from(pending);
}

function isRecipeCalculable(recipe: FabricacionReceta | null): boolean {
  if (!recipe) return false;
  const summary = buildFabricationRecipeSummary(recipe);
  if (!summary.compositionComplete) return false;
  const probe = calcularCubicacionYPauta(recipe, {
    anchoTotalMm: 1200,
    altoTotalMm: 1000,
    cantidad: 1,
    hojas: recipe.identidad.hojas,
    modulos: recipe.identidad.modulos,
    variante: recipe.identidad.variante,
  });
  return probe.calculable;
}

export function buildVariantTreeItem(
  slot: LineVariantSlot,
  recipe: FabricationRecipeRecord | null
): FabricacionVariantTreeItem {
  const definition = recipe?.definition ?? null;
  const summary = definition ? buildFabricationRecipeSummary(definition) : null;
  const listaParaProbar = definition
    ? evaluarRecetaListaParaProbar(definition).listaParaProbar
    : false;
  const compositionComplete = summary?.compositionComplete ?? false;
  const calculable = isRecipeCalculable(definition);
  const validated = recipe?.status === "validated";

  let statusLabel = "Sin configurar";
  if (!recipe) {
    statusLabel = "Agregar a tu taller";
  } else if (validated) {
    statusLabel = "Validada en taller";
  } else if (recipe.status === "testing") {
    statusLabel = "En prueba";
  } else if (calculable && listaParaProbar) {
    statusLabel = "Fórmulas listas";
  } else if (compositionComplete) {
    statusLabel = "Perfiles cargados";
  } else if (recipe.definition.perfiles.length > 0) {
    statusLabel = "Revisar perfiles";
  } else {
    statusLabel = "Completar receta";
  }

  return {
    slot,
    recipe,
    label: slot.variantLabel,
    statusLabel,
    compositionComplete,
    calculable,
    validated,
    pendingFields: collectPendingFields(definition, slot),
  };
}

export function resolveL20SiblingCatalogKey(
  catalogKey: string | null | undefined
): typeof L20_CATALOG_KEY | typeof L20_FIJOS_CATALOG_KEY | null {
  if (catalogKey === L20_CATALOG_KEY) return L20_FIJOS_CATALOG_KEY;
  if (catalogKey === L20_FIJOS_CATALOG_KEY) return L20_CATALOG_KEY;
  return null;
}

export function resolveL20SiblingLineTemplateId(
  templates: Pick<CotizacionLineTemplate, "id" | "catalogKey">[],
  catalogKey: string | null | undefined
): number | null {
  const siblingCatalogKey = resolveL20SiblingCatalogKey(catalogKey);
  if (!siblingCatalogKey) return null;
  const siblingId = templates.find((entry) => entry.catalogKey === siblingCatalogKey)?.id;
  if (siblingId == null) return null;
  const normalized = Number(siblingId);
  return Number.isFinite(normalized) ? normalized : null;
}

export function mergeL20OrganizationRecipes(input: {
  catalogKey: string | null | undefined;
  lineTemplateId: number;
  siblingLineTemplateId: number | null;
  recipes: FabricationRecipeRecord[];
}): FabricationRecipeRecord[] {
  if (!isL20CatalogKey(input.catalogKey)) {
    return input.recipes.filter(
      (recipe) =>
        recipe.scope === "organization" &&
        recipe.lineTemplateId === input.lineTemplateId &&
        !recipe.eliminadoEn
    );
  }

  const templateIds = new Set<number>([input.lineTemplateId]);
  if (input.siblingLineTemplateId != null) {
    templateIds.add(input.siblingLineTemplateId);
  }

  return input.recipes
    .filter(
      (recipe) =>
        recipe.scope === "organization" &&
        recipe.lineTemplateId != null &&
        templateIds.has(recipe.lineTemplateId) &&
        !recipe.eliminadoEn
    )
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
}

export function resolveDefaultDetailRecipeForLine(input: {
  catalogKey: string | null | undefined;
  lineTemplateId: number;
  recipes: FabricationRecipeRecord[];
}): FabricationRecipeRecord | null {
  const ownRecipes = input.recipes.filter((recipe) => recipe.lineTemplateId === input.lineTemplateId);
  const primarySlots = getLineVariantSlots(input.catalogKey);

  for (const slot of primarySlots) {
    const match = findRecipeForVariantSlot(ownRecipes, slot);
    if (match) return match;
  }

  if (isL20CatalogKey(input.catalogKey)) {
    for (const slot of primarySlots) {
      const match = findRecipeForVariantSlot(input.recipes, slot);
      if (match) return match;
    }
  }

  return ownRecipes[0] ?? input.recipes[0] ?? null;
}

export function resolveTargetLineTemplateForVariantSlot(input: {
  catalogKey: string | null | undefined;
  lineTemplateId: number;
  siblingLineTemplateId: number | null;
  slot: LineVariantSlot;
}): number {
  if (!isL20CatalogKey(input.catalogKey)) {
    return input.lineTemplateId;
  }

  const slotCatalogKey = resolveL20CatalogKeyForVariant(input.slot.variantSlug);
  if (slotCatalogKey === input.catalogKey) {
    return input.lineTemplateId;
  }

  return input.siblingLineTemplateId ?? input.lineTemplateId;
}

export function buildVariantTreeGroups(input: {
  catalogKey: string | null | undefined;
  recipes: FabricationRecipeRecord[];
}): FabricacionVariantTreeGroup[] {
  const slots = getLineVariantSlotsForFabricationTree(input.catalogKey);
  if (slots.length === 0) return [];

  const groupMap = new Map<string, FabricacionVariantTreeGroup>();

  slots.forEach((slot) => {
    const key = `${slot.typology}:${slot.leavesCount}:${slot.apertura ?? "default"}`;
    const recipe = findRecipeForVariantSlot(input.recipes, slot);
    const item = buildVariantTreeItem(slot, recipe);
    const existing = groupMap.get(key);
    if (existing) {
      existing.items.push(item);
      return;
    }
    groupMap.set(key, {
      typology: slot.typology,
      typologyLabel: formatVariantTreeGroupLabel(input.catalogKey, slot),
      leavesCount: slot.leavesCount,
      apertura: slot.apertura ?? null,
      items: [item],
    });
  });

  return Array.from(groupMap.values()).sort(
    (left, right) => variantTreeGroupSortRank(left) - variantTreeGroupSortRank(right)
  );
}

export function buildVariantTreeForAdHocRecipes(
  recipes: FabricationRecipeRecord[]
): FabricacionVariantTreeGroup[] {
  const active = recipes.filter((recipe) => !recipe.eliminadoEn && recipe.status !== "archived");
  const groupMap = new Map<string, FabricacionVariantTreeGroup>();

  active.forEach((recipe) => {
    const identidad = recipe.definition.identidad;
    const key = `${identidad.tipologia}:${identidad.hojas}`;
    const pseudoSlot: LineVariantSlot = {
      typology: identidad.tipologia,
      leavesCount: identidad.hojas,
      modulesCount: identidad.modulos,
      variantSlug: identidad.variante,
      variantLabel: formatVariantDisplayLabel(recipe),
      herraje: identidad.herraje,
      evidenceLevel: "structural_only",
      complete: false,
      pendingFields: [],
      sourceReference: recipe.sourceReference ?? `recipe:${recipe.id}`,
      buildDefinition: () => recipe.definition,
    };
    const item = buildVariantTreeItem(pseudoSlot, recipe);
    const existing = groupMap.get(key);
    if (existing) {
      existing.items.push(item);
      return;
    }
    groupMap.set(key, {
      typology: identidad.tipologia,
      typologyLabel: formatTypologyLeavesLabel({
        typology: identidad.tipologia,
        leavesCount: identidad.hojas,
      }),
      leavesCount: identidad.hojas,
      items: [item],
    });
  });

  return Array.from(groupMap.values()).sort(
    (left, right) => left.leavesCount - right.leavesCount
  );
}

export function resolveVariantTreeGroups(input: {
  catalogKey: string | null | undefined;
  recipes: FabricationRecipeRecord[];
}): FabricacionVariantTreeGroup[] {
  if (isBaseLineCatalogKey(input.catalogKey)) {
    return buildVariantTreeGroups(input);
  }
  return buildVariantTreeForAdHocRecipes(input.recipes);
}

export function listMissingVariantSlots(input: {
  catalogKey: string | null | undefined;
  recipes: FabricationRecipeRecord[];
}): LineVariantSlot[] {
  return getLineVariantSlotsForFabricationTree(input.catalogKey).filter(
    (slot) => !findRecipeForVariantSlot(input.recipes, slot)
  );
}

export function buildSeedPayloadForVariantSlot(input: {
  organizationId: string | number;
  lineTemplateId: string | number;
  lineName: string;
  providerName: string | null | undefined;
  catalogKey: string | null | undefined;
  slot: LineVariantSlot;
}): Record<string, unknown> {
  const plantillaId = resolvePlantillaIdFromCatalogKey(input.catalogKey);
  const definition = input.slot.buildDefinition({
    lineName: input.lineName,
    plantillaId,
  });

  return {
    organization_id: input.organizationId,
    line_template_id: input.lineTemplateId,
    scope: "organization",
    provider_name: input.providerName?.trim() || "",
    line_name: input.lineName,
    typology: input.slot.typology,
    leaves_count: input.slot.leavesCount,
    variant: definition.identidad.variante,
    version: 1,
    status: "draft",
    definition,
    source_type: input.slot.complete ? "workshop" : "manual",
    source_reference: input.slot.sourceReference,
  };
}

export function describeIncompleteFabricacionMessage(
  pendingFields: string[]
): string {
  if (pendingFields.length === 0) {
    return "Configuración pendiente de completar.";
  }
  const preview = pendingFields.slice(0, 3).join("; ");
  const suffix = pendingFields.length > 3 ? "…" : "";
  return `Configuración pendiente de completar: ${preview}${suffix}`;
}

function findVariantSlotForRecipe(recipe: FabricationRecipeRecord): LineVariantSlot | null {
  for (const catalogKey of BASE_LINE_CATALOG_KEYS) {
    const slot = getLineVariantSlots(catalogKey).find((candidate) =>
      recipeMatchesVariantSlot(recipe, candidate)
    );
    if (slot) return slot;
  }
  return null;
}

export function isFabricacionRecipeReadyForSnapshot(
  recipe: FabricationRecipeRecord
): { ready: boolean; pendingFields: string[]; message: string | null } {
  if (isSodalL25ZetaValidatedRecipe(recipe)) {
    const probe = calcularCubicacionYPauta(recipe.definition, {
      anchoTotalMm: 1200,
      altoTotalMm: 1000,
      cantidad: 1,
      hojas: recipe.definition.identidad.hojas,
      modulos: recipe.definition.identidad.modulos,
      variante: recipe.definition.identidad.variante,
    });

    if (probe.calculable) {
      return { ready: true, pendingFields: [], message: null };
    }
  }

  const slot = findVariantSlotForRecipe(recipe);
  const pendingFields = collectPendingFields(
    recipe.definition,
    slot ?? {
      typology: recipe.definition.identidad.tipologia,
      leavesCount: recipe.definition.identidad.hojas,
      modulesCount: recipe.definition.identidad.modulos,
      variantSlug: recipe.definition.identidad.variante,
      variantLabel: formatVariantDisplayLabel(recipe),
      evidenceLevel: "none",
      complete: false,
      pendingFields: [],
      sourceReference: recipe.sourceReference ?? "",
      buildDefinition: () => recipe.definition,
    }
  );

  if ((recipe.definition.datosPendientes?.length ?? 0) > 0) {
    return {
      ready: false,
      pendingFields,
      message: describeIncompleteFabricacionMessage(pendingFields),
    };
  }

  const probe = calcularCubicacionYPauta(recipe.definition, {
    anchoTotalMm: 1200,
    altoTotalMm: 1000,
    cantidad: 1,
    hojas: recipe.definition.identidad.hojas,
    modulos: recipe.definition.identidad.modulos,
    variante: recipe.definition.identidad.variante,
  });

  if (!probe.calculable) {
    return {
      ready: false,
      pendingFields,
      message: describeIncompleteFabricacionMessage(pendingFields),
    };
  }

  return { ready: true, pendingFields: [], message: null };
}

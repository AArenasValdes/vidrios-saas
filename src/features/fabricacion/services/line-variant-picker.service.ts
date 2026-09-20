import {
  getLineVariantSlotsForFabricationTree,
  type LineVariantSlot,
} from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { isSodalL25CatalogKey } from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { findRecipeForVariantSlot } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import type { FabricacionReceta } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

export type LineVariantPickerOption = {
  value: string;
  label: string;
  available: boolean;
};

export type LineVariantPickerAxis = {
  id: "hojas" | "apertura" | "construccion";
  label: string;
  options: LineVariantPickerOption[];
};

export type LineVariantPickerSelection = {
  hojas: number;
  apertura: string | null;
  variantSlug: string;
};

export type LineVariantPickerModel = {
  axes: LineVariantPickerAxis[];
  selection: LineVariantPickerSelection;
  matchingSlot: LineVariantSlot | null;
  matchingRecipe: FabricationRecipeRecord | null;
};

export type LineVariantCoverage = {
  readyCount: number;
  totalCount: number;
  subtitle: string;
};

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function formatAperturaLabel(apertura: string): string {
  if (apertura === "fija") return "Fijos";
  if (apertura === "corredera") return "Corredera";
  return apertura.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatHojasLabel(count: number): string {
  return count === 1 ? "1 hoja" : `${count} hojas`;
}

export function lineUsesVariantProductPicker(
  catalogKey: string | null | undefined
): boolean {
  if (!catalogKey) return false;
  if (isSodalL25CatalogKey(catalogKey)) return true;
  return getLineVariantSlotsForFabricationTree(catalogKey).length > 1;
}

export function resolveLineVariantPickerSelection(
  recipe: Pick<FabricacionReceta, "identidad"> | null | undefined,
  slots: LineVariantSlot[]
): LineVariantPickerSelection {
  const matchedSlot =
    recipe == null
      ? null
      : slots.find(
          (slot) =>
            slot.variantSlug === recipe.identidad.variante &&
            slot.leavesCount === recipe.identidad.hojas
        ) ??
        slots.find((slot) => slot.variantSlug === recipe.identidad.variante);

  return {
    hojas: matchedSlot?.leavesCount ?? recipe?.identidad.hojas ?? slots[0]?.leavesCount ?? 2,
    apertura: matchedSlot?.apertura ?? recipe?.identidad.apertura ?? slots[0]?.apertura ?? null,
    variantSlug:
      matchedSlot?.variantSlug ??
      recipe?.identidad.variante ??
      slots[0]?.variantSlug ??
      "",
  };
}

function slotsMatchingPartial(
  slots: LineVariantSlot[],
  partial: Partial<LineVariantPickerSelection>
): LineVariantSlot[] {
  return slots.filter((slot) => {
    if (partial.hojas != null && slot.leavesCount !== partial.hojas) return false;
    if (
      partial.apertura != null &&
      (slot.apertura ?? null) !== partial.apertura
    ) {
      return false;
    }
    if (partial.variantSlug && slot.variantSlug !== partial.variantSlug) return false;
    return true;
  });
}

export function resolveLineVariantPick(input: {
  slots: LineVariantSlot[];
  recipes: FabricationRecipeRecord[];
  selection: LineVariantPickerSelection;
}): { slot: LineVariantSlot | null; recipe: FabricationRecipeRecord | null } {
  const exact = input.slots.find(
    (slot) =>
      slot.leavesCount === input.selection.hojas &&
      (slot.apertura ?? null) === (input.selection.apertura ?? null) &&
      slot.variantSlug === input.selection.variantSlug
  );
  if (exact) {
    return {
      slot: exact,
      recipe: findRecipeForVariantSlot(input.recipes, exact),
    };
  }

  const closest =
    slotsMatchingPartial(input.slots, {
      hojas: input.selection.hojas,
      apertura: input.selection.apertura,
    })[0] ??
    slotsMatchingPartial(input.slots, { hojas: input.selection.hojas })[0] ??
    input.slots[0] ??
    null;

  return {
    slot: closest,
    recipe: closest ? findRecipeForVariantSlot(input.recipes, closest) : null,
  };
}

export function buildLineVariantPickerModel(input: {
  catalogKey: string | null | undefined;
  recipes: FabricationRecipeRecord[];
  recipe: FabricacionReceta | null;
}): LineVariantPickerModel | null {
  if (isSodalL25CatalogKey(input.catalogKey)) return null;
  const slots = getLineVariantSlotsForFabricationTree(input.catalogKey);
  if (slots.length <= 1) return null;

  const selection = resolveLineVariantPickerSelection(input.recipe, slots);
  const hojasValues = uniqueSorted(slots.map((slot) => slot.leavesCount));
  const aperturaValues = uniqueStrings(slots.map((slot) => slot.apertura));
  const axes: LineVariantPickerAxis[] = [];

  if (hojasValues.length > 1) {
    axes.push({
      id: "hojas",
      label: "Hojas",
      options: hojasValues.map((count) => ({
        value: String(count),
        label: formatHojasLabel(count),
        available: slotsMatchingPartial(slots, { hojas: count }).some(
          (slot) => findRecipeForVariantSlot(input.recipes, slot) || slot.complete
        ),
      })),
    });
  }

  if (aperturaValues.length > 1) {
    axes.push({
      id: "apertura",
      label: "Apertura",
      options: aperturaValues.map((apertura) => ({
        value: apertura,
        label: formatAperturaLabel(apertura),
        available: slotsMatchingPartial(slots, {
          hojas: selection.hojas,
          apertura,
        }).length > 0,
      })),
    });
  }

  const constructionSlots = slotsMatchingPartial(slots, {
    hojas: selection.hojas,
    apertura: selection.apertura,
  });
  const constructionOptions = constructionSlots.map((slot) => ({
    value: slot.variantSlug,
    label: slot.variantLabel,
    available: Boolean(findRecipeForVariantSlot(input.recipes, slot) || slot.complete),
  }));
  if (constructionOptions.length > 1 || (constructionOptions.length === 1 && axes.length > 0)) {
    axes.push({
      id: "construccion",
      label: "Construcción",
      options: constructionOptions,
    });
  }

  const resolved = resolveLineVariantPick({
    slots,
    recipes: input.recipes,
    selection,
  });

  return {
    axes,
    selection: {
      hojas: resolved.slot?.leavesCount ?? selection.hojas,
      apertura: resolved.slot?.apertura ?? selection.apertura,
      variantSlug: resolved.slot?.variantSlug ?? selection.variantSlug,
    },
    matchingSlot: resolved.slot,
    matchingRecipe: resolved.recipe,
  };
}

export function describeLineVariantCoverage(input: {
  catalogKey: string | null | undefined;
  recipes: FabricationRecipeRecord[];
}): LineVariantCoverage | null {
  const slots = getLineVariantSlotsForFabricationTree(input.catalogKey);
  if (slots.length <= 1 && !isSodalL25CatalogKey(input.catalogKey)) return null;

  const readyCount = slots.filter((slot) =>
    Boolean(findRecipeForVariantSlot(input.recipes, slot))
  ).length;
  const aperturas = uniqueStrings(slots.map((slot) => slot.apertura));
  const hojas = uniqueSorted(slots.map((slot) => slot.leavesCount));

  let subtitle = `${slots.length} construcciones`;
  if (aperturas.includes("corredera") && aperturas.includes("fija")) {
    const correderaCount = slots.filter((slot) => slot.apertura === "corredera").length;
    const fijosCount = slots.filter((slot) => slot.apertura === "fija").length;
    subtitle = `${correderaCount} corredera${correderaCount === 1 ? "" : "s"} y ${fijosCount} fijo${fijosCount === 1 ? "" : "s"}`;
  } else if (hojas.length > 1) {
    subtitle = hojas.map((count) => formatHojasLabel(count)).join(", ").replace(/, ([^,]+)$/, " y $1");
  }

  return {
    readyCount,
    totalCount: slots.length,
    subtitle,
  };
}

"use client";

import { useMemo, useState } from "react";

import { FabricacionTipologiaPreview } from "@/features/fabricacion/components/fabricacion-tipologia-preview";
import {
  BASES_TIPOLOGICAS_VENTORA,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import type {
  SodalL25GlazingSlug,
  SodalL25LegSlug,
  SodalL25ReinforcementSlug,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { parseSodalL25VariantSlug } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import {
  findSodalL25LineRecipe,
  listSodalL25GlazingOptions,
  listSodalL25LegOptions,
  listSodalL25ReinforcementOptions,
  summarizeSodalL25LineCoverage,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import {
  formatSodalL25ConstructionLabel,
  formatSodalL25GlazingLabel,
  formatSodalL25LegLabel,
  formatSodalL25ReinforcementLabel,
  isSodalL25CatalogKey,
  resolveEffectiveSodalL25CatalogKey,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import type { LineVariantSlot } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { getLineVariantSlotsForFabricationTree } from "@/features/fabricacion/fixtures/line-base-variant-catalog";
import { getVentoraProfileReferencesForCatalogKey } from "@/features/cotizaciones/line-templates/fixtures/ventora-profile-references";
import {
  getCatalogProductConfigurations,
  type CatalogProductConfiguration,
} from "@/features/cotizaciones/line-templates/services/line-template-compatibility.service";
import {
  buildLineVariantPickerModel,
  resolveLineVariantPick,
} from "@/features/fabricacion/services/line-variant-picker.service";
import { findRecipeForVariantSlot } from "@/features/fabricacion/services/fabricacion-line-variant.service";
import {
  buildSodalEditorRecipeDefaults,
  buildSodalEditorRecipeChoices,
} from "@/features/fabricacion/services/sodal-editor-recipes.service";
import type { FabricacionReceta, FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-mobile.module.css";

type Props = {
  templateName: string;
  catalogKey?: string | null;
  selected: FabricationRecipeRecord;
  draft: FabricacionReceta;
  recipes?: FabricationRecipeRecord[];
  readOnly: boolean;
  onSelectRecipe?: (recipe: FabricationRecipeRecord) => void;
  onCreateMissingSlot?: (slot: LineVariantSlot) => void;
  onCreateCatalogConfiguration?: (
    configuration: CatalogProductConfiguration,
    leavesCount?: number | null,
    compositionId?: string | null
  ) => void;
  onWorkshopConfigurationSelectionChange?: (
    configuration: CatalogProductConfiguration | null,
    leavesCount?: number | null,
    compositionId?: string | null
  ) => void;
};

function formatVariantFact(variante: string | null | undefined): string {
  const construction = formatSodalL25ConstructionLabel(variante);
  if (construction) return construction;
  const raw = variante?.trim() ?? "";
  if (!raw || raw === "estandar") return "Estándar";
  const workshopComposition = raw.match(/^workshop:(.+)$/)?.[1];
  if (workshopComposition) {
    const labels: Record<string, string> = {
      "2-moviles": "2 hojas móviles",
      "fijo-1-movil": "1 fija + 1 móvil",
      "3-moviles": "3 hojas móviles",
      "4-moviles": "4 hojas móviles",
      "1-fijo": "1 paño fijo",
      "1-hoja": "1 hoja",
      "2-hojas": "2 hojas",
    };
    return labels[workshopComposition] ?? workshopComposition.replaceAll("-", " ");
  }
  return raw.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSodalProfileRule(profile: FabricacionReceta["perfiles"][number]): string {
  const bases: Record<string, string> = {
    ancho_total: "ancho",
    alto_total: "alto",
    ancho_por_hoja: "ancho por hoja",
    alto_por_hoja: "alto por hoja",
    ancho_modulo: "ancho de módulo",
    alto_modulo: "alto de módulo",
    fijo_mm: "medida fija",
  };
  const adjustment = profile.reglaMedida.ajusteMm;
  const adjustmentLabel = adjustment == null
    ? "ajuste pendiente"
    : adjustment === 0
      ? "sin descuento"
      : `${adjustment > 0 ? "+" : ""}${adjustment} mm`;
  return `${profile.codigoPerfil || profile.nombrePerfil} · ${profile.funcion}: ${bases[profile.reglaMedida.base] ?? profile.reglaMedida.base}, ${adjustmentLabel}`;
}

type SummaryFact = { label: string; value: string };

function ProductSummaryCard({
  templateName,
  draft,
  isL25,
  typologyLabel,
  hojasLabel,
  variantLabel,
  extraFacts = [],
  showLeaves = true,
  showPreview = true,
}: {
  templateName: string;
  draft: FabricacionReceta;
  isL25: boolean;
  typologyLabel: string;
  hojasLabel: string;
  variantLabel: string;
  extraFacts?: SummaryFact[];
  showLeaves?: boolean;
  showPreview?: boolean;
}) {
  const parsed = parseSodalL25VariantSlug(draft.identidad.variante);
  const facts: SummaryFact[] = [
    { label: "Línea", value: templateName },
    { label: "Tipología", value: isL25 ? "Corredera" : typologyLabel },
  ];

  if (showLeaves && draft.identidad.hojas > 0) {
    facts.push({ label: "Hojas", value: hojasLabel });
  }

  if (isL25 && parsed) {
    facts.push(
      { label: "Vidrio", value: formatSodalL25GlazingLabel(parsed.glazing) },
      { label: "Pierna", value: formatSodalL25LegLabel(parsed.leg) },
      { label: "Refuerzo", value: formatSodalL25ReinforcementLabel(parsed.reinforcement) }
    );
  } else if (extraFacts.length > 0) {
    facts.push(...extraFacts);
  } else if (!isL25) {
    facts.push({ label: "Construcción", value: variantLabel });
  }

  return (
    <article className={s.productSummaryCard} data-no-preview={!showPreview} aria-label="Resumen del producto">
      {showPreview ? <FabricacionTipologiaPreview
        tipologia={draft.identidad.tipologia}
        hojas={draft.identidad.hojas}
        apertura={draft.identidad.apertura}
        size="sm"
      /> : null}
      <div className={s.productSummaryBody}>
        <strong>{templateName}</strong>
        <dl className={s.productSummaryFacts}>
          {facts.slice(1).map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

function L25ProductPicker({
  draft,
  recipes,
  onSelectRecipe,
}: {
  draft: FabricacionReceta;
  recipes: FabricationRecipeRecord[];
  onSelectRecipe: (recipe: FabricationRecipeRecord) => void;
}) {
  const parsed = parseSodalL25VariantSlug(draft.identidad.variante);
  const hojas = (draft.identidad.hojas as 2 | 3 | 4) || 2;
  const glazing: SodalL25GlazingSlug = parsed?.glazing ?? "dvh";
  const leg: SodalL25LegSlug = parsed?.leg ?? "open";
  const reinforcement: SodalL25ReinforcementSlug = parsed?.reinforcement ?? "normal";
  const coverage = summarizeSodalL25LineCoverage(recipes);
  const glazingOptions = listSodalL25GlazingOptions({ recipes, hojas });
  const legOptions = listSodalL25LegOptions({
    recipes,
    glazing,
    hojas,
    reinforcement,
  });
  const reinforcementOptions = listSodalL25ReinforcementOptions({
    recipes,
    glazing,
    hojas,
    leg,
  });

  const selectIdentity = (next: {
    hojas: number;
    glazing: SodalL25GlazingSlug;
    leg: SodalL25LegSlug;
    reinforcement: SodalL25ReinforcementSlug;
  }) => {
    const exact = findSodalL25LineRecipe(recipes, next);
    if (exact) {
      onSelectRecipe(exact);
      return;
    }
    const fallback = findSodalL25LineRecipe(recipes, {
      ...next,
      reinforcement: next.reinforcement === "reinforced" ? "normal" : "reinforced",
    });
    if (fallback) onSelectRecipe(fallback);
  };

  return (
    <>
      <fieldset className={s.choiceSet}>
        <legend>Hojas</legend>
        <div className={s.choiceGrid}>
          {coverage.leaves.map((entry) => (
            <button
              key={entry.hojas}
              type="button"
              className={s.choiceChip}
              data-active={hojas === entry.hojas ? "true" : "false"}
              disabled={!entry.ready}
              aria-pressed={hojas === entry.hojas}
              onClick={() =>
                selectIdentity({ hojas: entry.hojas, glazing, leg, reinforcement })
              }
            >
              {entry.hojas} hojas
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={s.choiceSet}>
        <legend>Vidrio</legend>
        <div className={s.choiceGrid}>
          {glazingOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={s.choiceChip}
              data-active={glazing === option.value ? "true" : "false"}
              disabled={!option.available}
              aria-pressed={glazing === option.value}
              onClick={() =>
                selectIdentity({
                  hojas,
                  glazing: option.value,
                  leg,
                  reinforcement,
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={s.choiceSet}>
        <legend>Pierna</legend>
        <div className={s.choiceGrid}>
          {legOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={s.choiceChip}
              data-active={leg === option.value ? "true" : "false"}
              disabled={!option.available}
              aria-pressed={leg === option.value}
              onClick={() =>
                selectIdentity({
                  hojas,
                  glazing,
                  leg: option.value,
                  reinforcement,
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={s.choiceSet}>
        <legend>Refuerzo</legend>
        <div className={s.choiceGrid}>
          {reinforcementOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={s.choiceChip}
              data-active={reinforcement === option.value ? "true" : "false"}
              disabled={!option.available}
              aria-pressed={reinforcement === option.value}
              onClick={() =>
                selectIdentity({
                  hojas,
                  glazing,
                  leg,
                  reinforcement: option.value,
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function LineVariantProductPicker({
  catalogKey,
  draft,
  recipes,
  onSelectRecipe,
  onCreateMissingSlot,
}: {
  catalogKey: string | null;
  draft: FabricacionReceta;
  recipes: FabricationRecipeRecord[];
  onSelectRecipe?: (recipe: FabricationRecipeRecord) => void;
  onCreateMissingSlot?: (slot: LineVariantSlot) => void;
}) {
  const model = buildLineVariantPickerModel({
    catalogKey,
    recipes,
    recipe: draft,
  });
  if (!model || model.axes.length === 0) return null;
  const slots = getLineVariantSlotsForFabricationTree(catalogKey);

  const applySelection = (next: {
    hojas: number;
    apertura: string | null;
    variantSlug: string;
  }) => {
    const resolved = resolveLineVariantPick({
      slots,
      recipes,
      selection: next,
    });
    if (resolved.recipe) {
      onSelectRecipe?.(resolved.recipe);
      return;
    }
    if (resolved.slot) {
      onCreateMissingSlot?.(resolved.slot);
    }
  };

  return (
    <>
      {model.axes.map((axis) => (
        <fieldset key={axis.id} className={s.choiceSet}>
          <legend>{axis.label}</legend>
          <div className={s.choiceGrid}>
            {axis.options.map((option) => {
              const selectedValue =
                axis.id === "hojas"
                  ? String(model.selection.hojas)
                  : axis.id === "apertura"
                    ? model.selection.apertura
                    : model.selection.variantSlug;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={s.choiceChip}
                  data-active={selectedValue === option.value ? "true" : "false"}
                  disabled={!option.available}
                  aria-pressed={selectedValue === option.value}
                  onClick={() => {
                    if (axis.id === "hojas") {
                      applySelection({
                        ...model.selection,
                        hojas: Number(option.value),
                      });
                      return;
                    }
                    if (axis.id === "apertura") {
                      applySelection({
                        ...model.selection,
                        apertura: option.value,
                        variantSlug: "",
                      });
                      return;
                    }
                    applySelection({
                      ...model.selection,
                      variantSlug: option.value,
                    });
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </>
  );
}

function VeratecWorkshopEvidence({
  catalogKey,
  slot,
}: {
  catalogKey: string | null;
  slot?: LineVariantSlot | null;
}) {
  if (!catalogKey?.startsWith("ventora:veratec-")) return null;

  const profiles = getVentoraProfileReferencesForCatalogKey(catalogKey)?.profiles ?? [];
  const codedProfiles = profiles.filter((profile) => profile.code?.trim());
  const isElevadora = catalogKey.includes("elevadora");
  const hint = slot
    ? "Hay datos de la base por completar. Los definirás en los siguientes pasos."
    : isElevadora
      ? "No identifica perfiles suficientes para definir los cortes. Agrega los códigos y nombres que usa tu taller antes de completar la pauta."
    : codedProfiles.length > 0
      ? `${codedProfiles.length} referencias disponibles en Perfiles y descuentos.`
      : "No hay perfiles de referencia para esta línea. Puedes agregarlos en Perfiles y descuentos.";

  if (codedProfiles.length > 0 && !slot) {
    return (
      <section className={s.veratecEvidence} aria-label="Información técnica disponible">
        <strong>Referencias de perfil documentadas</strong>
        <p>Estas referencias ayudan a identificar perfiles. Por sí solas no sustituyen la receta ni confirman su uso en esta configuración.</p>
        <span>{codedProfiles.length} códigos referenciales</span>
        <ul>
          {codedProfiles.map((profile) => (
            <li key={`${profile.code}-${profile.role}`}>
              <strong>{profile.code}</strong>
              <span>{profile.name}</span>
              <small>{profile.role}</small>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return <p className={s.productTechnicalHint} role="status">{hint}</p>;
}

export function FabricacionMobileProductStep({
  templateName,
  catalogKey = null,
  selected,
  draft,
  recipes = [],
  readOnly,
  onSelectRecipe,
  onCreateMissingSlot,
  onCreateCatalogConfiguration,
  onWorkshopConfigurationSelectionChange,
}: Props) {
  const isSavedWorkshopConfiguration = draft.identidad.configurationId?.startsWith("workshop:") === true;
  const [workshopComponent, setWorkshopComponent] = useState(() => {
    if (!isSavedWorkshopConfiguration) return "Ventana";
    if (draft.identidad.tipologia.startsWith("puerta_")) return "Puerta";
    return draft.identidad.tipologia === "pano_fijo" ? "Paño fijo" : "Ventana";
  });
  const [workshopOpening, setWorkshopOpening] = useState(() => {
    if (!isSavedWorkshopConfiguration) return "Corredera";
    return draft.identidad.apertura ?? (
      draft.identidad.tipologia === "pano_fijo" ? "Fijo" :
        draft.identidad.tipologia === "proyectante" ? "Proyectante" :
          draft.identidad.tipologia === "abatible" || draft.identidad.tipologia === "puerta_abatible" ? "Abatible" :
            draft.identidad.tipologia === "puerta_vaiven" ? "Vaivén" : "Corredera"
    );
  });
  const [workshopComposition, setWorkshopComposition] = useState<string | null>(() => {
    if (!draft.identidad.configurationId?.startsWith("workshop:")) return null;
    return draft.identidad.compositionId?.replace(/^workshop:/, "") ??
      draft.identidad.variante.replace(/^workshop:/, "") ?? null;
  });
  const [configurationAwaitingComposition, setConfigurationAwaitingComposition] = useState<CatalogProductConfiguration | null>(null);
  const [configurationCompositionId, setConfigurationCompositionId] = useState<string | null>(() =>
    draft.identidad.compositionId?.replace(/^workshop:/, "") ?? null
  );
  const isL25 = Boolean(
    formatSodalL25ConstructionLabel(draft.identidad.variante) ||
      isSodalL25CatalogKey(
        resolveEffectiveSodalL25CatalogKey({
          catalogKey,
          nombre: templateName,
        })
      )
  );
  const variantPicker = buildLineVariantPickerModel({
    catalogKey,
    recipes,
    recipe: draft,
  });
  const catalogConfigurations = getCatalogProductConfigurations(catalogKey);
  const hasExistingRecipeData =
    selected.definition.perfiles.length > 0 ||
    selected.definition.vidrios.length > 0 ||
    selected.definition.accesorios.length > 0;
  const hasKnownFabricationPath =
    hasExistingRecipeData || getLineVariantSlotsForFabricationTree(catalogKey).length > 0;
  const selectedCatalogConfiguration = catalogConfigurations.find((configuration) =>
    configuration.id === draft.identidad.configurationId ||
    (!draft.identidad.configurationId &&
      configuration.typology === draft.identidad.tipologia &&
      configuration.variant === draft.identidad.variante)
  ) ?? (
    catalogConfigurations.length === 1 &&
    hasKnownFabricationPath
      ? catalogConfigurations[0]
      : null
  );
  const isWorkshopConfiguration = draft.identidad.configurationId?.startsWith("workshop:") === true;
  const veratecSlots = getLineVariantSlotsForFabricationTree(catalogKey);
  const sodalRecipeChoices = useMemo(() => {
    const defaults = buildSodalEditorRecipeDefaults({
      catalogKey,
      lineTemplateId: recipes.find((recipe) => recipe.lineTemplateId != null)?.lineTemplateId ??
        selected.lineTemplateId ?? 0,
      lineName: templateName,
      providerName: selected.providerName,
    });
    return buildSodalEditorRecipeChoices({ organization: recipes, defaults });
  }, [catalogKey, recipes, selected.lineTemplateId, selected.providerName, templateName]);
  const sodalVariants = sodalRecipeChoices.system;
  const workshopSodalRecipes = sodalRecipeChoices.workshop;
  const activeSodalVariant = sodalVariants.find((recipe) =>
    recipe.id === selected.id ||
    (recipe.definition.identidad.tipologia === draft.identidad.tipologia &&
      recipe.definition.identidad.hojas === draft.identidad.hojas &&
      recipe.definition.identidad.variante === draft.identidad.variante)
  ) ?? null;
  const soleVeratecSlot = veratecSlots.length === 1 ? veratecSlots[0] : null;
  const singleDocumentedSlot =
    catalogKey?.startsWith("ventora:veratec-") &&
    !variantPicker &&
    soleVeratecSlot?.sourceName &&
    !findRecipeForVariantSlot(recipes, soleVeratecSlot)
      ? soleVeratecSlot
      : null;
  const hasSupplierChoices = Boolean(
    variantPicker?.axes.some((axis) => axis.id === "construccion" && axis.label === "Proveedor y variante")
  );
  const hasDocumentedVeratecBases = catalogKey?.startsWith("ventora:veratec-") === true &&
    veratecSlots.some((slot) => Boolean(slot.sourceName));
  // Una base documentada específica (por ejemplo, Compact 2H o 7400 4H)
  // debe mostrarse antes que el selector genérico de componente del catálogo.
  const usesCatalogConfigurationPicker = catalogConfigurations.length > 0 && !hasDocumentedVeratecBases;
  const usesVariantPicker = isL25 || sodalVariants.length > 1 || Boolean(variantPicker && variantPicker.axes.length > 0) || usesCatalogConfigurationPicker;
  const needsWorkshopConfiguration = !isL25 && !usesCatalogConfigurationPicker && !isWorkshopConfiguration && !variantPicker;
  const workshopTypology: FabricacionTipologia =
    workshopComponent === "Puerta"
      ? workshopOpening === "Corredera" ? "puerta_corredera" : workshopOpening === "Vaivén" ? "puerta_vaiven" : "puerta_abatible"
      : workshopOpening === "Fijo" ? "pano_fijo" : workshopOpening === "Proyectante" ? "proyectante" : workshopOpening === "Abatible" ? "abatible" : "corredera";
  const workshopCompositionOptions = workshopOpening === "Corredera"
    ? [
        { id: "2-moviles", label: "2 hojas móviles", leaves: 2, modules: 2 },
        { id: "fijo-1-movil", label: "1 fija + 1 móvil", leaves: 2, modules: 2 },
        { id: "3-moviles", label: "3 hojas móviles", leaves: 3, modules: 3 },
        { id: "4-moviles", label: "4 hojas móviles", leaves: 4, modules: 4 },
      ]
    : workshopOpening === "Fijo"
      ? [{ id: "1-fijo", label: "1 paño fijo", leaves: 1, modules: 1 }]
      : [{ id: "1-hoja", label: "1 hoja", leaves: 1, modules: 1 }];
  const summaryUsesWorkshopSelection = needsWorkshopConfiguration || isWorkshopConfiguration;
  const selectedWorkshopComposition = workshopCompositionOptions.find((option) => option.id === workshopComposition) ?? null;
  const typologyLabel =
    BASES_TIPOLOGICAS_VENTORA.find((entry) => entry.tipologia === draft.identidad.tipologia)
      ?.label ??
    draft.identidad.tipologia.replaceAll("_", " ");
  const variantLabel = formatVariantFact(draft.identidad.variante);
  // Antes de usar una base documentada, el borrador puede conservar la hoja
  // inicial por defecto. El resumen debe describir la variante elegida en el
  // catálogo sin cambiar todavía la receta del taller.
  const displayedLeavesCount = summaryUsesWorkshopSelection
    ? selectedWorkshopComposition?.leaves ?? 0
    : singleDocumentedSlot?.leavesCount ?? draft.identidad.hojas;
  const previewLeavesCount = summaryUsesWorkshopSelection
    ? selectedWorkshopComposition?.leaves ?? (draft.identidad.hojas > 0 ? draft.identidad.hojas : 2)
    : displayedLeavesCount;
  const hojasLabel = displayedLeavesCount === 1 ? "1 hoja" : `${displayedLeavesCount} hojas`;
  const summaryDraft = summaryUsesWorkshopSelection
    ? {
        ...draft,
        identidad: {
          ...draft.identidad,
          tipologia: workshopTypology,
          hojas: previewLeavesCount,
          modulos: selectedWorkshopComposition?.modules ?? previewLeavesCount,
          apertura: workshopOpening,
          variante: selectedWorkshopComposition ? `workshop:${selectedWorkshopComposition.id}` : "estandar",
          compositionId: selectedWorkshopComposition ? `workshop:${selectedWorkshopComposition.id}` : null,
        },
      }
    : displayedLeavesCount === draft.identidad.hojas
      ? draft
      : {
          ...draft,
          identidad: { ...draft.identidad, hojas: displayedLeavesCount },
        };
  const summaryTypologyLabel = summaryUsesWorkshopSelection
    ? workshopTypology === "puerta_corredera"
      ? "Puerta corredera"
      : workshopTypology === "puerta_vaiven"
        ? "Puerta vaivén"
        : BASES_TIPOLOGICAS_VENTORA.find((entry) => entry.tipologia === workshopTypology)?.label ?? workshopTypology.replaceAll("_", " ")
    : typologyLabel;
  const summaryVariantLabel = summaryUsesWorkshopSelection
    ? selectedWorkshopComposition?.label ?? "Por elegir"
    : variantLabel;

  const selectCatalogConfiguration = (configuration: CatalogProductConfiguration) => {
    if (readOnly) return;
    setConfigurationAwaitingComposition(configuration);
    setConfigurationCompositionId(
      draft.identidad.configurationId === configuration.id
        ? draft.identidad.compositionId?.replace(/^workshop:/, "") ?? null
        : null
    );
    onWorkshopConfigurationSelectionChange?.(null);
  };

  const configurationCompositionOptions = (configuration: CatalogProductConfiguration) => {
    const opening = configuration.openingType.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const allowedCounts = configuration.leavesCounts;
    const allowed = (options: Array<{ id: string; label: string; leaves: number }>) => {
      const filtered = allowedCounts?.length
        ? options.filter((option) => allowedCounts.includes(option.leaves))
        : options;
      return filtered.length || !allowedCounts?.length
        ? filtered
        : allowedCounts.map((count) => ({
            id: `distribucion-pendiente-${count}`,
            label: `${count} ${count === 1 ? "hoja" : "hojas"} · distribución de mi taller`,
            leaves: count,
          }));
    };
    if (opening.includes("fijo") || configuration.componentType.toLowerCase().includes("paño fijo")) {
      return allowed([{ id: "1-fijo", label: "1 paño fijo", leaves: 1 }]);
    }
    if (opening.includes("corredera")) {
      return allowed([
        { id: "2-moviles", label: "2 hojas móviles", leaves: 2 },
        { id: "fijo-1-movil", label: "1 paño fijo + 1 móvil", leaves: 2 },
        { id: "3-moviles", label: "3 hojas móviles", leaves: 3 },
        { id: "4-moviles", label: "4 hojas móviles", leaves: 4 },
      ]);
    }
    return allowed([
      { id: "1-hoja", label: "1 hoja", leaves: 1 },
      { id: "2-hojas", label: "2 hojas", leaves: 2 },
    ]);
  };
  const activeConfigurationForComposition = configurationAwaitingComposition ??
    (selectedCatalogConfiguration &&
    !draft.identidad.compositionId &&
    !hasKnownFabricationPath
      ? selectedCatalogConfiguration
      : null);
  const activeConfigurationComposition = activeConfigurationForComposition
    ? configurationCompositionOptions(activeConfigurationForComposition).find(
        (composition) => composition.id === configurationCompositionId
      ) ?? null
    : null;
  const selectWorkshopDeclaredComposition = (configuration: CatalogProductConfiguration, composition: { id: string; label: string; leaves: number }) => {
    if (readOnly || !onWorkshopConfigurationSelectionChange) return;
    setConfigurationCompositionId(composition.id);
    onWorkshopConfigurationSelectionChange(configuration, composition.leaves, `workshop:${composition.id}`);
  };
  const selectWorkshopConfiguration = (composition: { id: string; label: string; leaves: number }) => {
    if (readOnly || !onCreateCatalogConfiguration) return;
    const safeSlug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = `workshop:${catalogKey ?? "linea"}:${safeSlug(workshopComponent)}:${safeSlug(workshopOpening)}`;
    const configuration: CatalogProductConfiguration = {
      id,
      componentType: workshopComponent,
      openingType: workshopOpening,
      label: `${workshopComponent} ${workshopOpening.toLocaleLowerCase("es-CL")}`,
      typology: workshopTypology,
      variant: `workshop:${composition.id}`,
      leavesCounts: [composition.leaves],
      source: "workshop",
    };
    setWorkshopComposition(composition.id);
    if (
      draft.identidad.configurationId === id &&
      (draft.identidad.compositionId === composition.id ||
        draft.identidad.compositionId === `workshop:${composition.id}` ||
        draft.identidad.variante === `workshop:${composition.id}`)
    ) {
      return;
    }
    onWorkshopConfigurationSelectionChange?.(configuration, composition.leaves, composition.id);
  };

  return (
    <div className={s.stack}>
      <ProductSummaryCard
        templateName={templateName}
        draft={summaryDraft}
        isL25={isL25}
        typologyLabel={summaryUsesWorkshopSelection ? summaryTypologyLabel : activeConfigurationForComposition?.label ?? selectedCatalogConfiguration?.label ?? (usesCatalogConfigurationPicker ? "Por configurar" : typologyLabel)}
        hojasLabel={hojasLabel}
        variantLabel={summaryVariantLabel}
        showLeaves={summaryUsesWorkshopSelection ? Boolean(selectedWorkshopComposition) : !usesCatalogConfigurationPicker}
        showPreview={summaryUsesWorkshopSelection || !usesCatalogConfigurationPicker || Boolean(selectedCatalogConfiguration || activeConfigurationForComposition)}
        extraFacts={
          summaryUsesWorkshopSelection
            ? [
                { label: "Componente", value: workshopComponent },
                { label: "Sistema", value: workshopOpening },
                ...(selectedWorkshopComposition
                  ? [{ label: "Composición", value: selectedWorkshopComposition.label }]
                  : []),
                ...(isWorkshopConfiguration
                  ? [{ label: "Origen", value: "Configuración de mi taller" }]
                  : []),
              ]
            : activeConfigurationForComposition ?? selectedCatalogConfiguration
            ? [
                { label: "Componente", value: (activeConfigurationForComposition ?? selectedCatalogConfiguration)!.componentType },
                { label: "Sistema", value: (activeConfigurationForComposition ?? selectedCatalogConfiguration)!.openingType },
                ...(activeConfigurationComposition
                  ? [{ label: "Composición", value: activeConfigurationComposition.label }]
                  : []),
              ]
            : usesCatalogConfigurationPicker
              ? [{ label: "Componente", value: "Por elegir" }]
              : needsWorkshopConfiguration
                ? [{ label: "Componente", value: "Por elegir" }]
            : isWorkshopConfiguration
              ? [
                  { label: "Sistema", value: draft.identidad.apertura ?? "Por definir" },
                  { label: "Composición", value: formatVariantFact(draft.identidad.compositionId ?? draft.identidad.variante) },
                  { label: "Origen", value: "Configuración de mi taller" },
                ]
              : variantPicker
                ? variantPicker.axes
                    .filter((axis) => axis.id !== "hojas")
                    .map((axis) => ({
                      label: axis.label,
                      value:
                        axis.options.find(
                          (option) =>
                            option.value ===
                            (axis.id === "apertura"
                              ? variantPicker.selection.apertura
                              : variantPicker.selection.variantSlug)
                        )?.label ?? variantLabel,
                    }))
                : []
        }
      />

      {isL25 && onSelectRecipe ? (
        <section className={s.configSection} aria-labelledby="product-config-title">
          <h2 id="product-config-title">Configuración</h2>
          <p className={s.configHint}>
            Elige hojas y construcción. Los descuentos se ajustan en Perfiles.
          </p>
          <L25ProductPicker
            draft={draft}
            recipes={recipes}
            onSelectRecipe={onSelectRecipe}
          />
        </section>
      ) : usesCatalogConfigurationPicker ? (
        <section className={s.configSection} aria-labelledby="product-config-title">
          <h2 id="product-config-title">Qué fabricarás</h2>
          <p className={s.configHint}>
            El sistema ya viene definido por la línea. Elige el componente del catálogo.
          </p>
          <div className={s.catalogConfigurationChoices}>
            {catalogConfigurations.map((configuration) => (
              <button
                key={configuration.id}
                type="button"
                className={s.catalogConfigurationChoice}
                data-active={(configurationAwaitingComposition?.id ?? selectedCatalogConfiguration?.id) === configuration.id ? "true" : "false"}
                aria-pressed={(configurationAwaitingComposition?.id ?? selectedCatalogConfiguration?.id) === configuration.id}
                disabled={readOnly}
                onClick={() => {
                  selectCatalogConfiguration(configuration);
                }}
              >
                <span>{configuration.label}</span>
                <small>{configuration.componentType} · {configuration.openingType}</small>
              </button>
            ))}
          </div>
          {activeConfigurationForComposition ? (
            <fieldset className={s.choiceSet}>
              <legend>Composición que usa tu taller</legend>
              <p className={s.configHint}>El catálogo indica el sistema; confirma qué disposición fabricarás. Esta elección queda pendiente de revisar con tu pauta.</p>
              <div className={s.choiceGrid}>
                {configurationCompositionOptions(activeConfigurationForComposition).map((composition) => (
                  <button
                    key={composition.id}
                    type="button"
                    className={s.choiceChip}
                    disabled={readOnly || !onWorkshopConfigurationSelectionChange}
                    data-active={configurationCompositionId === composition.id ? "true" : "false"}
                    aria-pressed={configurationCompositionId === composition.id}
                    onClick={() => selectWorkshopDeclaredComposition(activeConfigurationForComposition, composition)}
                  >
                    {composition.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          <p className={s.configHint}>
            En Perfiles completas cantidades y descuentos con la pauta. La selección de composición del taller no confirma que el fabricante la incluya.
          </p>
        </section>
      ) : sodalVariants.length > 0 && !(variantPicker && variantPicker.axes.length > 0) ? (
        <>
          {sodalVariants.length > 1 && onSelectRecipe ? (
            <section className={s.configSection} aria-labelledby="product-config-title">
              <h2 id="product-config-title">Configuración del sistema</h2>
              <p className={s.configHint}>
                Elige entre las variantes disponibles para esta línea.
              </p>
              <fieldset className={s.choiceSet}>
                <legend>Variante de fabricación</legend>
                <div className={s.choiceGrid}>
                  {sodalVariants.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      className={s.choiceChip}
                      data-active={activeSodalVariant?.id === recipe.id ? "true" : "false"}
                      aria-pressed={activeSodalVariant?.id === recipe.id}
                      onClick={() => onSelectRecipe(recipe)}
                    >
                      {recipe.variant ?? recipe.definition.identidad.variante}
                    </button>
                  ))}
                </div>
              </fieldset>
              {activeSodalVariant ? (
                <ul className={s.sodalVariantRules} aria-label="Perfiles y descuentos de la variante">
                  {activeSodalVariant.definition.perfiles.map((profile) => (
                    <li key={profile.id}>{formatSodalProfileRule(profile)}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
          {workshopSodalRecipes.length > 0 ? (
            <details className={s.workshopRecipeDisclosure}>
              <summary>Recetas propias del taller</summary>
              <p>Configuraciones guardadas por este taller, separadas de la pauta del sistema.</p>
              {onSelectRecipe ? (
                <div className={s.choiceGrid}>
                  {workshopSodalRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      className={s.choiceChip}
                      data-active={selected.id === recipe.id ? "true" : "false"}
                      aria-pressed={selected.id === recipe.id}
                      onClick={() => onSelectRecipe(recipe)}
                    >
                      {formatVariantFact(recipe.variant ?? recipe.definition.identidad.variante) || "Receta propia"}
                    </button>
                  ))}
                </div>
              ) : null}
            </details>
          ) : null}
        </>
      ) : variantPicker && (onSelectRecipe || onCreateMissingSlot) ? (
        <section className={s.configSection} aria-labelledby="product-config-title">
          <h2 id="product-config-title">Configuración</h2>
          <p className={s.configHint}>
            {hasSupplierChoices
              ? "Elige el proveedor y la variante que corresponden a tus perfiles."
              : "Elige la construcción. Los descuentos se ajustan en Perfiles."}
          </p>
          <LineVariantProductPicker
            catalogKey={catalogKey}
            draft={draft}
            recipes={recipes}
            onSelectRecipe={onSelectRecipe}
            onCreateMissingSlot={onCreateMissingSlot}
          />
        </section>
      ) : singleDocumentedSlot ? (
        <section className={s.configSection} aria-labelledby="product-config-title">
          <h2 id="product-config-title">Base de fabricación</h2>
          <p className={s.configHint}>
            Fórmula de Veratec disponible. Puedes probarla y ajustar los datos de tu taller.
          </p>
          {singleDocumentedSlot.pendingFields[0] ? (
            <p className={s.configHint}>{singleDocumentedSlot.pendingFields[0]}</p>
          ) : null}
          <button
            type="button"
            className={s.veratecCandidateButton}
            disabled={readOnly || !onCreateMissingSlot}
            onClick={() => onCreateMissingSlot?.(singleDocumentedSlot)}
          >
            Usar base · {singleDocumentedSlot.variantLabel}
          </button>
        </section>
      ) : (
        <section className={s.workshopRecipeDisclosure} aria-labelledby="workshop-configuration-title">
          <h2 id="workshop-configuration-title">Configurar para mi taller</h2>
          <p>
            Esta línea todavía no tiene un sistema declarado en el catálogo. Define una base de tu taller; quedará pendiente hasta completar perfiles y reglas.
          </p>
          <fieldset className={s.choiceSet}>
            <legend>Componente</legend>
            <div className={s.choiceGrid}>
              {["Ventana", "Puerta", "Paño fijo"].map((component) => (
                <button key={component} type="button" className={s.choiceChip}
                  data-active={workshopComponent === component ? "true" : "false"}
                  aria-pressed={workshopComponent === component}
                  onClick={() => {
                    if (workshopComponent === component) return;
                    setWorkshopComponent(component);
                    const opening = component === "Paño fijo" ? "Fijo" : "Corredera";
                    setWorkshopOpening(opening);
                    setWorkshopComposition(null);
                    onWorkshopConfigurationSelectionChange?.(null);
                  }}>
                  {component}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={s.choiceSet}>
            <legend>Sistema de apertura</legend>
            <div className={s.choiceGrid}>
              {(workshopComponent === "Paño fijo"
                ? ["Fijo"]
                : workshopComponent === "Puerta"
                  ? ["Corredera", "Abatible", "Vaivén"]
                  : ["Corredera", "Abatible", "Proyectante", "Fijo"]
              ).map((opening) => (
                <button key={opening} type="button" className={s.choiceChip}
                  data-active={workshopOpening === opening ? "true" : "false"}
                  aria-pressed={workshopOpening === opening}
                  onClick={() => {
                    if (workshopOpening === opening) return;
                    setWorkshopOpening(opening);
                    setWorkshopComposition(null);
                    onWorkshopConfigurationSelectionChange?.(null);
                  }}>
                  {opening}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={s.choiceSet}>
            <legend>Composición</legend>
            <p>Marca la composición que corresponde. Continúa a Perfiles y descuentos cuando estés listo.</p>
            <div className={s.choiceGrid}>
              {workshopCompositionOptions.map((composition) => (
                <button key={composition.id} type="button" className={s.choiceChip}
                  data-active={workshopComposition === composition.id ? "true" : "false"}
                  aria-pressed={workshopComposition === composition.id}
                  disabled={readOnly || !onCreateCatalogConfiguration}
                  onClick={() => selectWorkshopConfiguration(composition)}>
                  {composition.label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {catalogKey?.startsWith("ventora:veratec-") &&
      (!selected || selected.definition.perfiles.length === 0 || singleDocumentedSlot)
        ? (
          <VeratecWorkshopEvidence
            catalogKey={catalogKey}
            slot={
              singleDocumentedSlot ??
              (variantPicker?.matchingSlot?.pendingFields.some(
                (field) => !field.toLowerCase().startsWith("probar una fabricación real")
              )
                ? variantPicker.matchingSlot
                : null)
            }
          />
        )
        : null}

      {!usesVariantPicker && !readOnly ? (
        <p className={s.hint}>Versión {selected.version}</p>
      ) : null}
    </div>
  );
}

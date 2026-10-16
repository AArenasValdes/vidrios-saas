"use client";

import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import {
  getConstructorRecipeProfileCodeLabel,
  getConstructorRecipeSourceLabel,
} from "@/features/fabricacion/services/constructor-recipe-option-label.service";
import { getRecipeTechnicalHint } from "@/features/fabricacion/services/constructor-recipe-selection.service";
import {
  formatTypologyLeavesLabel,
  formatVariantDisplayLabel,
} from "@/features/fabricacion/services/fabricacion-line-variant.service";

import styles from "./quote-fabrication-variant-picker.module.css";

export type QuoteFabricationVariantOption = {
  value: string;
  label: string;
  detail?: string;
};

type Props = {
  candidates: readonly FabricationRecipeRecord[];
  selectedRecipeId?: string | null;
  onSelectRecipe: (recipe: FabricationRecipeRecord) => void;
  legacyOptions?: readonly QuoteFabricationVariantOption[];
  selectedLegacyValue?: string | null;
  onSelectLegacy?: (value: string) => void;
  title?: string;
};

function openLabel(value: string | null | undefined) {
  if (!value) return "";
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function recipeLabels(candidates: readonly FabricationRecipeRecord[]) {
  const variantLabels = new Set(candidates.map(formatVariantDisplayLabel));
  const sourceLabels = new Set(candidates.map(getConstructorRecipeSourceLabel));
  const codeLabels = new Set(candidates.map((recipe) => getConstructorRecipeProfileCodeLabel(recipe) ?? ""));
  const technicalHints = new Set(candidates.map(getRecipeTechnicalHint));
  const openings = new Set(candidates.map((recipe) => openLabel(recipe.definition.identidad.apertura)).filter(Boolean));
  const recipesPerLabel = new Map<string, number>();

  return candidates.map((recipe) => {
    const identity = recipe.definition.identidad;
    const variant = formatVariantDisplayLabel(recipe);
    const typology = formatTypologyLeavesLabel({ typology: identity.tipologia, leavesCount: identity.hojas });
    const baseLabel = variantLabels.size > 1 ? `${variant} · ${typology}` : typology;
    const details: string[] = [];

    if (openings.size > 1 && identity.apertura) details.push(`Apertura ${openLabel(identity.apertura)}`);
    if (sourceLabels.size > 1) {
      details.push(getConstructorRecipeSourceLabel(recipe));
    }
    if (codeLabels.size > 1) {
      const codeLabel = getConstructorRecipeProfileCodeLabel(recipe);
      if (codeLabel) details.push(codeLabel);
    } else if (technicalHints.size > 1) {
      details.push("Cortes de perfiles distintos");
    }

    const priorCount = recipesPerLabel.get(baseLabel) ?? 0;
    recipesPerLabel.set(baseLabel, priorCount + 1);
    if (priorCount > 0 && details.length === 0) {
      const revision = recipe.sourceRevision?.trim();
      details.push(revision ? `Revisión ${revision}` : `Registro ${priorCount + 1} · v${recipe.version}`);
    }

    return {
      recipe,
      title: baseLabel,
      detail: details.join(" · "),
    };
  }).sort((left, right) =>
    left.title.localeCompare(right.title, "es-CL", { numeric: true }) ||
    left.detail.localeCompare(right.detail, "es-CL", { numeric: true }),
  );
}

export function QuoteFabricationVariantPicker({
  candidates,
  selectedRecipeId = null,
  onSelectRecipe,
  legacyOptions = [],
  selectedLegacyValue = null,
  onSelectLegacy,
  title = "Fabricación",
}: Props) {
  const labels = recipeLabels(candidates);
  const compactOptions = labels.length > 3;
  const onlyValidatedCandidate = candidates.length === 1 && candidates[0]?.status === "validated";

  if (onlyValidatedCandidate) {
    const option = labels[0];
    if (!option) return null;
    return (
      <section className={styles.root} aria-label={title} data-testid="fabrication-choice-auto">
        <h3 className={styles.heading}>{title}</h3>
        <p className={styles.autoChoice}>
          <span>{option.title}</span>
          <small>{getConstructorRecipeSourceLabel(option.recipe)} · se aplica automáticamente</small>
        </p>
      </section>
    );
  }

  if (candidates.length > 0) {
    return (
      <fieldset className={styles.root} aria-label={title}>
        <legend className={styles.heading}>{candidates.length > 1 ? "Configuración de fabricación" : title}</legend>
        {candidates.length > 1 ? (
          <p className={styles.help}>Elige según la apertura o armado de esta pieza.</p>
        ) : (
          <p className={styles.help}>Esta configuración se aplicará al despiece de la pieza.</p>
        )}
        {compactOptions ? (
          <details className={styles.expandable}>
            <summary className={styles.expandableSummary}>
              <span>{labels.find(({ recipe }) => recipe.id === selectedRecipeId)?.title ?? `${labels.length} configuraciones`}</span>
              <span>Cambiar</span>
            </summary>
            <div className={styles.options} role="group" aria-label="Opciones de fabricación">
              {labels.map(({ recipe, title: optionTitle, detail }) => (
                <button
                  key={recipe.id}
                  type="button"
                  className={`${styles.option} ${selectedRecipeId === recipe.id ? styles.optionSelected : ""}`}
                  aria-pressed={selectedRecipeId === recipe.id}
                  onClick={() => onSelectRecipe(recipe)}
                >
                  <span className={styles.optionBody}>
                    <span className={styles.optionTitle}>{optionTitle}</span>
                    {detail ? <span className={styles.optionDetail}>{detail}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          </details>
        ) : (
          <div className={styles.options} role="group" aria-label="Opciones de fabricación">
            {labels.map(({ recipe, title: optionTitle, detail }) => (
            <button
              key={recipe.id}
              type="button"
              className={`${styles.option} ${selectedRecipeId === recipe.id ? styles.optionSelected : ""}`}
              aria-pressed={selectedRecipeId === recipe.id}
              onClick={() => onSelectRecipe(recipe)}
            >
              <span className={styles.optionBody}>
                <span className={styles.optionTitle}>{optionTitle}</span>
                {detail ? <span className={styles.optionDetail}>{detail}</span> : null}
              </span>
            </button>
            ))}
          </div>
        )}
      </fieldset>
    );
  }

  if (legacyOptions.length === 0 || !onSelectLegacy) return null;
  return (
    <fieldset className={styles.root} aria-label={title}>
      <legend className={styles.heading}>{title}</legend>
      <p className={styles.help}>Elige una configuración compatible con esta línea.</p>
      <div className={styles.options} role="group" aria-label="Configuraciones de fabricación">
        {legacyOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.option} ${selectedLegacyValue === option.value ? styles.optionSelected : ""}`}
            aria-pressed={selectedLegacyValue === option.value}
            onClick={() => onSelectLegacy(option.value)}
          >
            <span className={styles.optionBody}>
              <span className={styles.optionTitle}>{option.label}</span>
              {option.detail ? <span className={styles.optionDetail}>{option.detail}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

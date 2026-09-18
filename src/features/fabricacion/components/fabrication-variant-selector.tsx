"use client";

import {
  type SodalL25GlazingSlug,
  type SodalL25LegSlug,
  type SodalL25ReinforcementSlug,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import {
  formatSodalL25ContextualLineName,
  formatSodalL25GlazingLabel,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import {
  listSodalL25LegOptions,
  listSodalL25ReinforcementOptions,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

import styles from "./fabrication-variant-selector.module.css";

type FabricationVariantSelectorProps = {
  recipes: FabricationRecipeRecord[];
  glazing: SodalL25GlazingSlug;
  hojas: number;
  leg: SodalL25LegSlug | "";
  reinforcement: SodalL25ReinforcementSlug | "";
  onLegChange: (value: SodalL25LegSlug) => void;
  onReinforcementChange: (value: SodalL25ReinforcementSlug) => void;
  chrome?: "card" | "plain";
};

export function FabricationVariantSelector({
  recipes,
  glazing,
  hojas,
  leg,
  reinforcement,
  onLegChange,
  onReinforcementChange,
  chrome = "card",
}: FabricationVariantSelectorProps) {
  const legOptions = listSodalL25LegOptions({
    recipes,
    glazing,
    hojas,
    reinforcement: reinforcement || null,
  });
  const reinforcementOptions = listSodalL25ReinforcementOptions({
    recipes,
    glazing,
    hojas,
    leg: leg || null,
  });

  return (
    <div
      className={chrome === "plain" ? `${styles.root} ${styles.rootPlain}` : styles.root}
      data-testid="fabrication-variant-selector"
    >
      {chrome === "card" ? (
        <div className={styles.header}>
          <strong>{formatSodalL25ContextualLineName(hojas)}</strong>
          <span>{formatSodalL25GlazingLabel(glazing)}</span>
        </div>
      ) : null}

      <div className={styles.group}>
        <span className={styles.label}>Pierna</span>
        <div className={styles.options}>
          {legOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                leg === option.value
                  ? `${styles.option} ${styles.optionActive}`
                  : styles.option
              }
              disabled={!option.available}
              onClick={() => onLegChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Refuerzo</span>
        <div className={styles.options}>
          {reinforcementOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                reinforcement === option.value
                  ? `${styles.option} ${styles.optionActive}`
                  : styles.option
              }
              disabled={!option.available || !leg}
              onClick={() => onReinforcementChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

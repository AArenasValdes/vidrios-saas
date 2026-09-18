"use client";

import { useMemo } from "react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { resolveComponentFabricacionHojas } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { FabricationVariantSelector } from "@/features/fabricacion/components/fabrication-variant-selector";
import { SODAL_L25_CATALOG_KEY } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";
import {
  inferSodalL25GlazingFromGlass,
  isSodalL25CatalogKey,
  resolveSodalL25QuoteConfig,
} from "@/features/fabricacion/services/sodal-l25-context.service";
import { resolveEffectiveSodalL25CatalogKey } from "@/features/fabricacion/services/sodal-l25-presentation.service";

import styles from "./sodal-l25-quote-config-panel.module.css";

export type SodalL25QuoteConfigFormSlice = {
  lineTemplateId?: string;
  catalogLineKey?: string;
  fabricacionGlazing?: string;
  fabricacionLeg?: string;
  fabricacionReinforcement?: string;
  fabricacionVariante?: string;
  fabricacionHojas?: number | null;
  sheetScheme?: string;
  hojasBase?: number | null;
  guidedVisualConfig?: GuidedVisualConfig | null;
  vidrio?: string;
};

type Props = {
  componentForm: SodalL25QuoteConfigFormSlice;
  selectedTemplate?: CotizacionLineTemplate | null;
  onFabricacionL25ConfigChange?: (value: {
    catalogLineKey: string;
    fabricacionGlazing: string;
    fabricacionLeg: string;
    fabricacionReinforcement: string;
    fabricacionVariante: string;
  }) => void;
  showSectionLabel?: boolean;
  compact?: boolean;
};

export function SodalL25QuoteConfigPanel({
  componentForm,
  selectedTemplate = null,
  onFabricacionL25ConfigChange,
  showSectionLabel = true,
  compact = false,
}: Props) {
  const catalogKey = resolveEffectiveSodalL25CatalogKey({
    catalogLineKey: componentForm.catalogLineKey,
    catalogKey: selectedTemplate?.catalogKey,
    nombre: selectedTemplate?.nombre,
  });
  const isSodalL25Line = isSodalL25CatalogKey(catalogKey);

  const effectiveFabricacionHojas = resolveComponentFabricacionHojas({
    sheetScheme: componentForm.sheetScheme,
    fabricacionHojas: componentForm.fabricacionHojas,
    hojasBase: componentForm.hojasBase,
    guidedVisualConfig: componentForm.guidedVisualConfig,
  });

  const numericLineTemplateId = Number(componentForm.lineTemplateId);
  const {
    recipes: persistedRecipes,
    isLoading: isLoadingPersistedRecipes,
  } = useFabricationRecipes({
    enabled: isSodalL25Line && Number.isInteger(numericLineTemplateId) && numericLineTemplateId > 0,
    lineTemplateId:
      Number.isInteger(numericLineTemplateId) && numericLineTemplateId > 0
        ? numericLineTemplateId
        : undefined,
  });

  const inferredGlazing = inferSodalL25GlazingFromGlass({
    vidrio: componentForm.vidrio,
    catalogEspesor: selectedTemplate?.catalogMetadata
      ? String((selectedTemplate.catalogMetadata as Record<string, unknown>).espesor ?? "")
      : "",
    catalogTerminacion: selectedTemplate?.nombre ?? "",
  });

  const sodalConfig = useMemo(() => {
    if (!isSodalL25Line || !catalogKey) {
      return null;
    }

    return resolveSodalL25QuoteConfig({
      catalogKey,
      presentation: {
            fabricacionGlazing: inferredGlazing || componentForm.fabricacionGlazing,
        fabricacionLeg: componentForm.fabricacionLeg ?? "",
        fabricacionReinforcement: componentForm.fabricacionReinforcement ?? "",
        fabricacionVariante: componentForm.fabricacionVariante ?? "",
        fabricacionHojas: effectiveFabricacionHojas,
        sheetScheme: componentForm.sheetScheme ?? "",
      },
      vidrio: componentForm.vidrio,
      sheetScheme: componentForm.sheetScheme ?? "",
      fabricacionHojas: effectiveFabricacionHojas,
    });
  }, [
    catalogKey,
    componentForm.fabricacionGlazing,
    componentForm.fabricacionLeg,
    componentForm.fabricacionReinforcement,
    componentForm.fabricacionVariante,
    componentForm.sheetScheme,
    componentForm.vidrio,
    effectiveFabricacionHojas,
    inferredGlazing,
    isSodalL25Line,
  ]);

  if (!isSodalL25Line) {
    return null;
  }

  if (!effectiveFabricacionHojas) {
    return compact ? null : (
      <div className={styles.root} data-testid="sodal-l25-quote-config-panel">
        {showSectionLabel ? (
          <div className={styles.sectionLabel}>Configuración técnica L25</div>
        ) : null}
        <p className={styles.hint}>
          Elige sistema y composición con cantidad de hojas para configurar la receta L25.
        </p>
      </div>
    );
  }

  if (isLoadingPersistedRecipes) {
    return compact ? (
      <div className={styles.root} data-testid="sodal-l25-quote-config-panel">
        <div className={styles.sectionLabel}>Pierna y refuerzo</div>
        <p className={styles.loading}>Cargando…</p>
      </div>
    ) : (
      <div className={styles.root} data-testid="sodal-l25-quote-config-panel">
        {showSectionLabel ? (
          <div className={styles.sectionLabel}>Configuración técnica L25</div>
        ) : null}
        <p className={styles.loading}>Cargando recetas L25…</p>
      </div>
    );
  }

  if (!sodalConfig) {
    return null;
  }

  return (
    <div className={styles.root} data-testid="sodal-l25-quote-config-panel">
      {showSectionLabel && !compact ? (
        <div className={styles.sectionLabel}>Configuración técnica L25</div>
      ) : compact ? (
        <div className={styles.sectionLabel}>Pierna y refuerzo</div>
      ) : null}
      {!sodalConfig.complete && !compact ? (
        <p className={styles.help}>
          Selecciona pierna y refuerzo para generar la pauta de corte.
        </p>
      ) : null}
      <FabricationVariantSelector
        recipes={persistedRecipes}
        glazing={sodalConfig.glazing}
        hojas={effectiveFabricacionHojas}
        chrome={compact ? "plain" : "card"}
        leg={(componentForm.fabricacionLeg as "" | "open" | "closed") ?? ""}
        reinforcement={
          (componentForm.fabricacionReinforcement as "" | "normal" | "reinforced") ?? ""
        }
        onLegChange={(value) => {
          onFabricacionL25ConfigChange?.({
            catalogLineKey: SODAL_L25_CATALOG_KEY,
            fabricacionGlazing: sodalConfig.glazing,
            fabricacionLeg: value,
            fabricacionReinforcement: componentForm.fabricacionReinforcement ?? "",
            fabricacionVariante: componentForm.fabricacionVariante ?? "",
          });
        }}
        onReinforcementChange={(value) => {
          const variantSlug =
            componentForm.fabricacionLeg && value
              ? `${sodalConfig.glazing}_${componentForm.fabricacionLeg}_${value}`
              : componentForm.fabricacionVariante ?? "";
          onFabricacionL25ConfigChange?.({
            catalogLineKey: SODAL_L25_CATALOG_KEY,
            fabricacionGlazing: sodalConfig.glazing,
            fabricacionLeg: componentForm.fabricacionLeg ?? "",
            fabricacionReinforcement: value,
            fabricacionVariante: variantSlug,
          });
        }}
      />
    </div>
  );
}

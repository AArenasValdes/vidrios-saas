"use client";

import { FabricacionTipologiaPreview } from "@/features/fabricacion/components/fabricacion-tipologia-preview";
import {
  BASES_TIPOLOGICAS_VENTORA,
  tipologiaPideSelectorHojas,
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
import type { FabricacionReceta, FabricacionTipologia } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

import s from "./fabricacion-mobile.module.css";

const TYPOLOGY_OPTIONS: Array<{ label: string; tipologia: FabricacionTipologia }> = [
  { label: "Corredera", tipologia: "corredera" },
  { label: "Abatible", tipologia: "abatible" },
  { label: "Proyectante", tipologia: "proyectante" },
  { label: "Fijo", tipologia: "pano_fijo" },
  { label: "Puerta", tipologia: "puerta_abatible" },
];

const HOJAS_OPTIONS = [1, 2, 3, 4];

type Props = {
  templateName: string;
  catalogKey?: string | null;
  selected: FabricationRecipeRecord;
  draft: FabricacionReceta;
  recipes?: FabricationRecipeRecord[];
  readOnly: boolean;
  onDraftChange: (recipe: FabricacionReceta) => void;
  onSelectRecipe?: (recipe: FabricationRecipeRecord) => void;
};

function formatVariantFact(variante: string | null | undefined): string {
  const construction = formatSodalL25ConstructionLabel(variante);
  if (construction) return construction;
  const raw = variante?.trim() ?? "";
  if (!raw || raw === "estandar") return "Estándar";
  return raw.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

type SummaryFact = { label: string; value: string };

function ProductSummaryCard({
  templateName,
  draft,
  isL25,
  typologyLabel,
  hojasLabel,
  variantLabel,
}: {
  templateName: string;
  draft: FabricacionReceta;
  isL25: boolean;
  typologyLabel: string;
  hojasLabel: string;
  variantLabel: string;
}) {
  const parsed = parseSodalL25VariantSlug(draft.identidad.variante);
  const facts: SummaryFact[] = [
    { label: "Línea", value: templateName },
    { label: "Tipología", value: isL25 ? "Corredera" : typologyLabel },
  ];

  if (draft.identidad.hojas > 0) {
    facts.push({ label: "Hojas", value: hojasLabel });
  }

  if (isL25 && parsed) {
    facts.push(
      { label: "Vidrio", value: formatSodalL25GlazingLabel(parsed.glazing) },
      { label: "Pierna", value: formatSodalL25LegLabel(parsed.leg) },
      { label: "Refuerzo", value: formatSodalL25ReinforcementLabel(parsed.reinforcement) }
    );
  } else if (!isL25) {
    facts.push({ label: "Construcción", value: variantLabel });
  }

  return (
    <article className={s.productSummaryCard} aria-label="Resumen del producto">
      <FabricacionTipologiaPreview
        tipologia={draft.identidad.tipologia}
        hojas={draft.identidad.hojas}
        size="sm"
      />
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

export function FabricacionMobileProductStep({
  templateName,
  catalogKey = null,
  selected,
  draft,
  recipes = [],
  readOnly,
  onDraftChange,
  onSelectRecipe,
}: Props) {
  const isL25 = Boolean(
    formatSodalL25ConstructionLabel(draft.identidad.variante) ||
      isSodalL25CatalogKey(
        resolveEffectiveSodalL25CatalogKey({
          catalogKey,
          nombre: templateName,
        })
      )
  );
  const canEditIdentity = !readOnly && !isL25;
  const showHojasPicker =
    canEditIdentity &&
    (tipologiaPideSelectorHojas(draft.identidad.tipologia) ||
      draft.identidad.tipologia === "corredera");
  const typologyLabel =
    TYPOLOGY_OPTIONS.find((entry) => entry.tipologia === draft.identidad.tipologia)?.label ??
    BASES_TIPOLOGICAS_VENTORA.find((entry) => entry.tipologia === draft.identidad.tipologia)
      ?.label ??
    draft.identidad.tipologia.replaceAll("_", " ");
  const variantLabel = formatVariantFact(draft.identidad.variante);
  const hojasLabel =
    draft.identidad.hojas === 1 ? "1 hoja" : `${draft.identidad.hojas} hojas`;

  const updateIdentity = (patch: Partial<FabricacionReceta["identidad"]>) => {
    onDraftChange({
      ...draft,
      identidad: { ...draft.identidad, ...patch },
    });
  };

  const selectTypology = (tipologia: FabricacionTipologia) => {
    if (!canEditIdentity) return;
    const catalogEntry = BASES_TIPOLOGICAS_VENTORA.find(
      (entry) => entry.tipologia === tipologia
    );
    const option = TYPOLOGY_OPTIONS.find((entry) => entry.tipologia === tipologia);
    updateIdentity({
      tipologia,
      apertura: tipologia,
      hojas: catalogEntry?.hojasSugeridas ?? draft.identidad.hojas,
      modulos: catalogEntry?.modulosSugeridos ?? draft.identidad.modulos,
      nombre: `${templateName.trim() || "Línea"} · ${option?.label ?? tipologia}`,
    });
  };

  return (
    <div className={s.stack}>
      <ProductSummaryCard
        templateName={templateName}
        draft={draft}
        isL25={isL25}
        typologyLabel={typologyLabel}
        hojasLabel={hojasLabel}
        variantLabel={variantLabel}
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
      ) : (
        <>
          {readOnly ? (
            <p className={s.hint}>
              Receta activa: aquí revisas el producto, no cambias tipo ni construcción.
            </p>
          ) : null}

          {canEditIdentity ? (
            <section className={s.configSection} aria-labelledby="product-config-title">
              <h2 id="product-config-title">Configuración</h2>
              <fieldset className={s.choiceSet}>
                <legend>Tipo de componente</legend>
                <div className={s.choiceGrid}>
                  {TYPOLOGY_OPTIONS.map((option) => (
                    <button
                      key={option.tipologia}
                      type="button"
                      className={s.choiceChip}
                      data-active={
                        draft.identidad.tipologia === option.tipologia ? "true" : "false"
                      }
                      aria-pressed={draft.identidad.tipologia === option.tipologia}
                      onClick={() => selectTypology(option.tipologia)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {showHojasPicker ? (
                <fieldset className={s.choiceSet}>
                  <legend>Hojas</legend>
                  <div className={s.choiceGrid}>
                    {HOJAS_OPTIONS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={s.choiceChip}
                        data-active={draft.identidad.hojas === count ? "true" : "false"}
                        aria-pressed={draft.identidad.hojas === count}
                        onClick={() => updateIdentity({ hojas: count })}
                      >
                        {count} {count === 1 ? "hoja" : "hojas"}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      {!isL25 && !canEditIdentity && !readOnly ? (
        <p className={s.hint}>Versión {selected.version}</p>
      ) : null}
    </div>
  );
}

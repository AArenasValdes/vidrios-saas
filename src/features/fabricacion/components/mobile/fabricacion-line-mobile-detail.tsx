"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, Pencil } from "lucide-react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { formatLineTemplatePriceLabel } from "@/features/cotizaciones/line-templates/utils/catalog-labels";
import { getFabricacionVisualStatus, formatFabricacionDate } from "@/features/fabricacion/services/fabricacion-line-workflow.utils";
import { SODAL_L25_CANONICAL_RECIPE_IDS } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { summarizeSodalL25LineCoverage } from "@/features/fabricacion/services/sodal-l25-context.service";
import {
  isSodalL25CatalogKey,
  resolveEffectiveSodalL25CatalogKey,
} from "@/features/fabricacion/services/sodal-l25-presentation.service";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import {
  describeLineVariantCoverage,
  lineUsesVariantProductPicker,
} from "@/features/fabricacion/services/line-variant-picker.service";
import { resolveLineFabricationDisplayIdentity } from "@/features/fabricacion/services/resolve-line-fabrication-display-identity.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "./fabricacion-mobile.module.css";

type Props = {
  template: CotizacionLineTemplate;
  currentRecipe: FabricationRecipeRecord | null;
  lineRecipes?: FabricationRecipeRecord[];
  olderRecipes: FabricationRecipeRecord[];
  error: string | null;
  feedback: string | null;
  isSaving: boolean;
  onConfigure: () => void;
  onEdit: () => void;
  onTest: () => void;
};

function resolvePrimaryCta(input: {
  recipe: FabricationRecipeRecord | null;
  isSaving: boolean;
  onConfigure: () => void;
  onEdit: () => void;
}) {
  if (!input.recipe) {
    return {
      label: "Configurar fabricación",
      action: input.onConfigure,
      disabled: input.isSaving,
    };
  }
  return {
    label: "Revisar fabricación",
    action: input.onEdit,
    disabled: input.isSaving && input.recipe.status !== "validated",
  };
}

export function FabricacionLineMobileDetail({
  template,
  currentRecipe,
  lineRecipes = [],
  olderRecipes,
  error,
  feedback,
  isSaving,
  onConfigure,
  onEdit,
  onTest,
}: Props) {
  const identity = resolveLineFabricationDisplayIdentity({
    template,
    recipe: currentRecipe,
    status: currentRecipe?.status ?? "quote_only",
  });
  const isL25 = isSodalL25CatalogKey(
    resolveEffectiveSodalL25CatalogKey({
      catalogKey: template.catalogKey,
      nombre: template.nombre,
    })
  );
  const usesVariantTemplate =
    isL25 || lineUsesVariantProductPicker(template.catalogKey);
  const l25Coverage = isL25 ? summarizeSodalL25LineCoverage(lineRecipes) : null;
  const l25CanonicalCount = SODAL_L25_CANONICAL_RECIPE_IDS.length;
  const variantCoverage = usesVariantTemplate
    ? describeLineVariantCoverage({
        catalogKey: template.catalogKey,
        recipes: lineRecipes,
      })
    : null;
  const visual = getFabricacionVisualStatus(currentRecipe?.status ?? "quote_only");
  const summary = currentRecipe
    ? buildFabricationRecipeSummary(currentRecipe.definition)
    : null;
  const primaryCta = resolvePrimaryCta({
    recipe: currentRecipe,
    isSaving,
    onConfigure,
    onEdit,
  });
  const showTestCta = Boolean(currentRecipe);
  const variantTitle = isL25
    ? "Corredera L25 lista para cotizar"
    : `${identity.lineTitle} lista para cotizar`;
  const variantSubtitle = isL25
    ? l25Coverage?.allLeavesReady
      ? "2, 3 y 4 hojas · DVH y monolítico"
      : l25Coverage && l25Coverage.readyCount > 0
        ? `${l25Coverage.leaves
            .filter((entry) => entry.ready)
            .map((entry) => `${entry.hojas} hojas`)
            .join(" · ")} disponibles`
        : `${l25CanonicalCount} construcciones`
    : variantCoverage?.subtitle ?? "Elige construcción en el primer paso";

  return (
    <main className={`${s.shell} ${s.page}`}>
      <header className={s.header}>
        <Link
          href="/configuracion/empresa/lineas-precios"
          className={s.backButton}
          aria-label="Volver a líneas y precios"
        >
          <ChevronLeft aria-hidden />
        </Link>
        <div className={s.headerCopy}>
          <h1>{identity.lineTitle}</h1>
          <p>{template.isActive ? "Línea comercial activa" : "Línea comercial en pausa"}</p>
        </div>
      </header>

      {error ? <div className={s.errorBand} role="alert">{error}</div> : null}
      {feedback ? <div className={s.successBand} role="status">{feedback}</div> : null}

      <section className={s.card} aria-labelledby="commercial-title">
        <div className={s.cardHeading}>
          <div>
            <h2 id="commercial-title">Información comercial</h2>
            <p>Precio visible al cotizar</p>
          </div>
          <Link
            href={`/configuracion/empresa/lineas-precios?editar=${template.id}`}
            className={s.secondaryButton}
          >
            <Pencil size={16} aria-hidden />
            Editar precio
          </Link>
        </div>
        <strong className={s.priceValue}>
          {formatLineTemplatePriceLabel(
            template.unidadCobro,
            template.precioM2Sugerido,
            formatCurrency
          )}
        </strong>
        <small className={s.priceMeta}>
          Mínimo{" "}
          {template.minimoCobrable > 0
            ? formatCurrency(template.minimoCobrable)
            : "sin definir"}
        </small>
      </section>

      <section className={s.card} aria-labelledby="fabrication-title">
        <div className={s.cardHeading}>
          <div>
            <h2 id="fabrication-title">Fabricación</h2>
            <p>Habilita cubicación y pauta al cotizar</p>
          </div>
          <span className={s.statusPill} data-tone={visual.tone}>
            {visual.label}
          </span>
        </div>

        {currentRecipe ? (
          <>
            <div className={s.cardHeading}>
              <div>
                <strong>
                  {usesVariantTemplate ? variantTitle : identity.fabricationTitle}
                </strong>
                <p>
                  {usesVariantTemplate
                    ? variantSubtitle
                    : `Versión ${currentRecipe.version}`}
                </p>
              </div>
              {visual.id === "active" ? (
                <CheckCircle2 color="#0f6b3f" aria-hidden />
              ) : null}
            </div>

            <button
              type="button"
              className={s.primaryButton}
              disabled={primaryCta.disabled}
              onClick={primaryCta.action}
            >
              {primaryCta.label}
            </button>
            {showTestCta ? (
              <button
                type="button"
                className={s.secondaryButton}
                style={{ width: "100%", marginTop: 10, marginBottom: 14 }}
                onClick={onTest}
              >
                Probar con medidas
              </button>
            ) : null}

            {usesVariantTemplate ? (
              <p className={s.hint} style={{ marginBottom: 12 }}>
                No es solo una variante: eliges construcción en el primer paso.
                Los descuentos se ajustan por variante.
              </p>
            ) : null}

            <dl className={s.summaryList}>
              {usesVariantTemplate ? (
                <>
                  {isL25 ? (
                    <div>
                      <dt>Hojas</dt>
                      <dd>
                        {l25Coverage?.allLeavesReady
                          ? "2, 3 y 4 hojas listas"
                          : l25Coverage && l25Coverage.readyCount > 0
                            ? l25Coverage.leaves
                                .filter((entry) => entry.ready)
                                .map((entry) => `${entry.hojas}h`)
                                .join(" · ")
                            : "2 · 3 · 4 hojas"}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Construcciones</dt>
                    <dd>
                      {isL25
                        ? l25Coverage && l25Coverage.readyCount > 0
                          ? `${l25Coverage.readyCount} de ${l25CanonicalCount} listas`
                          : `${l25CanonicalCount} integradas`
                        : variantCoverage
                          ? `${variantCoverage.readyCount} de ${variantCoverage.totalCount} listas`
                          : "Varias construcciones"}
                    </dd>
                  </div>
                  <div>
                    <dt>Ajustes</dt>
                    <dd>Descuentos editables por variante</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Perfiles</dt>
                    <dd>
                      {summary && summary.activeRuleCount > 0
                        ? `${summary.activeRuleCount} reglas · ${summary.activePieceCount} cortes`
                        : "Pendientes"}
                    </dd>
                  </div>
                  <div>
                    <dt>Vidrio</dt>
                    <dd>
                      {summary && summary.activeGlassCount > 0
                        ? `${summary.activeGlassCount} definido`
                        : "Sin vidrio definido"}
                    </dd>
                  </div>
                  <div>
                    <dt>Accesorios</dt>
                    <dd>
                      {summary && summary.activeAccessoryCount > 0
                        ? `${summary.activeAccessoryCount} definido`
                        : "Sin accesorios"}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </>
        ) : (
          <>
            <p>
              Puedes cotizar esta línea. Configura la fabricación para generar
              cubicación y pauta sugerida.
            </p>
            <button
              type="button"
              className={s.primaryButton}
              disabled={primaryCta.disabled}
              onClick={primaryCta.action}
            >
              {primaryCta.label}
            </button>
          </>
        )}
      </section>

      {olderRecipes.length > 0 ? (
        <details className={s.history}>
          <summary>
            Historial archivado
            <span>{olderRecipes.length}</span>
          </summary>
          <div className={s.historyList}>
            {olderRecipes.map((recipe) => {
              const older = getFabricacionVisualStatus(recipe.status);
              return (
                <article key={recipe.id} className={s.historyRow}>
                  <div className={s.historyCopy}>
                    <strong>{recipe.definition.identidad.nombre}</strong>
                    <small>
                      Versión {recipe.version} · {formatFabricacionDate(recipe.updatedAt)}
                    </small>
                  </div>
                  <span className={s.historyStatus} data-tone={older.tone}>
                    {older.label}
                  </span>
                </article>
              );
            })}
          </div>
        </details>
      ) : null}
    </main>
  );
}

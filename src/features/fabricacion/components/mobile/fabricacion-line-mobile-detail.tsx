"use client";

import Link from "next/link";
import { CheckCircle2, ChevronLeft, Pencil } from "lucide-react";

import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { formatLineTemplatePriceLabel } from "@/features/cotizaciones/line-templates/utils/catalog-labels";
import { buildFabricationRecipeSummary } from "@/features/fabricacion/services/fabricacion-regla-humana.service";
import { resolveLineFabricationDisplayIdentity } from "@/features/fabricacion/services/resolve-line-fabrication-display-identity.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { formatCurrency } from "@/utils/formatCurrency";

import s from "./fabricacion-mobile.module.css";

type Props = {
  template: CotizacionLineTemplate;
  currentRecipe: FabricationRecipeRecord | null;
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
  if (input.recipe.status === "validated") {
    return {
      label: "Ver fabricación",
      action: input.onEdit,
      disabled: false,
    };
  }
  return {
    label: "Editar fabricación",
    action: input.onEdit,
    disabled: input.isSaving,
  };
}

export function FabricacionLineMobileDetail({
  template,
  currentRecipe,
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
  const summary = currentRecipe
    ? buildFabricationRecipeSummary(currentRecipe.definition)
    : null;
  const primaryCta = resolvePrimaryCta({
    recipe: currentRecipe,
    isSaving,
    onConfigure,
    onEdit,
  });
  const showTestCta =
    currentRecipe &&
    currentRecipe.status !== "validated" &&
    (summary?.compositionComplete || currentRecipe.status === "testing");

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
          <p>{template.isActive ? "Activa" : "En pausa"}</p>
        </div>
      </header>

      {error ? <div className={s.errorBand}>{error}</div> : null}
      {feedback ? <div className={s.successBand}>{feedback}</div> : null}

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
          <span
            className={s.statusPill}
            data-tone={currentRecipe?.status ?? "quote_only"}
          >
            {identity.statusLabel}
          </span>
        </div>

        {!currentRecipe ? (
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
        ) : (
          <>
            <div className={s.cardHeading}>
              <div>
                <strong>{identity.fabricationTitle}</strong>
                <p>Versión {currentRecipe.version}</p>
              </div>
              {currentRecipe.status === "validated" ? (
                <CheckCircle2 color="#0f6b3f" aria-hidden />
              ) : null}
            </div>

            <dl className={s.summaryList}>
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
                    : "Pendiente"}
                </dd>
              </div>
              <div>
                <dt>Accesorios</dt>
                <dd>
                  {summary && summary.activeAccessoryCount > 0
                    ? `${summary.activeAccessoryCount} definido`
                    : "Pendiente"}
                </dd>
              </div>
            </dl>

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
                style={{ width: "100%", marginTop: 10 }}
                onClick={onTest}
              >
                Probar
              </button>
            ) : null}
          </>
        )}
      </section>

      {olderRecipes.length > 0 ? (
        <details className={s.history}>
          <summary>
            Versiones anteriores
            <span>{olderRecipes.length}</span>
          </summary>
          <div className={s.historyList}>
            {olderRecipes.map((recipe) => (
              <article key={recipe.id}>
                <strong>Versión {recipe.version}</strong>
                <span>{recipe.status}</span>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </main>
  );
}

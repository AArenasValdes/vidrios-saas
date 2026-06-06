"use client";

import { useMemo } from "react";
import { LuChevronRight, LuNotebookPen, LuSparkles } from "react-icons/lu";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import {
  getVisibleSubtypeLabel,
  getSubtypeBadge,
  repairBrokenText,
} from "./paso-dos-wizard-movil.utils";
import s from "../../page.module.css";

type Props = {
  categoryOptions: Array<{
    title: PasoDosGrupoDraft["categoria"];
    subtitle: string;
    countLabel: string;
  }>;
  draft: PasoDosGrupoDraft;
  subtypeOptions: readonly string[];
  subtypePreviewMarkup: Record<string, string>;
  quotePricingMode: QuotePricingMode;
  onSelectCategoria: (categoria: PasoDosGrupoDraft["categoria"]) => void;
  onSelectSubtipo: (subtipo: string) => void;
};

export function PasoDosWizardTipoMovil({
  categoryOptions,
  draft,
  subtypeOptions,
  subtypePreviewMarkup,
  quotePricingMode,
  onSelectCategoria,
  onSelectSubtipo,
}: Props) {
  const singleSubtypeCategories = useMemo(
    () => new Set(categoryOptions.filter((c) => {
      const count = parseInt(c.countLabel, 10);
      return !isNaN(count) && count === 1;
    }).map((c) => c.title)),
    [categoryOptions]
  );

  if (quotePricingMode === "total_global") {
    return (
      <div className={s.stepTwoMobileCreatorStack}>
        <button
          className={s.stepTwoMobileNotebookCard}
          onClick={() => onSelectSubtipo("Trabajo libre / Mantencion")}
          type="button"
        >
          <span className={s.stepTwoMobileNotebookIcon}>
            <LuNotebookPen aria-hidden size={28} />
          </span>
          <span className={s.stepTwoMobileNotebookCopy}>
            <span className={s.stepTwoMobileNotebookKicker}>
              <LuSparkles aria-hidden size={14} />
              Presupuesto por total
            </span>
            <strong>Trabajo libre / Mantencion</strong>
            <small>
              Usalo para reparaciones, cambios de vidrio, mantenciones,
              sellados o trabajos personalizados.
            </small>
          </span>
          <span className={s.stepTwoMobileCreatorOptionArrow}>
            <LuChevronRight aria-hidden size={18} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={s.stepTwoMobileCreatorStack}>
      <div className={s.stepTwoMobileCategoryTabs}>
        {categoryOptions.map((option) => {
          const isLibre = option.title === "Proyecto libre y Mantencion";
          const isSingle = singleSubtypeCategories.has(option.title);
          const handleClick = () => {
            onSelectCategoria(option.title);
            if (isSingle && subtypeOptions.length > 0) {
              onSelectSubtipo(subtypeOptions[0]);
            }
          };

          return (
            <button
              key={option.title}
              className={`${s.stepTwoMobileCategoryTab} ${
                draft.categoria === option.title ? s.stepTwoMobileCategoryTabActive : ""
              } ${isLibre ? s.stepTwoMobileCategoryTabLibre : ""}`}
              onClick={handleClick}
              type="button"
            >
              <div className={s.stepTwoMobileCategoryTabMain}>
                <strong>{option.title}</strong>
                <span>{repairBrokenText(option.subtitle)}</span>
              </div>
              {isLibre ? (
                <span className={s.stepTwoMobileLibreBadge}>Libre</span>
              ) : (
                <small className={s.stepTwoMobileCategoryTabCount}>{option.countLabel}</small>
              )}
            </button>
          );
        })}
      </div>

      <div className={s.stepTwoMobileCreatorOptionList}>
        {subtypeOptions.map((subtipo) => (
          <button
            key={subtipo}
            className={s.stepTwoMobileCreatorOptionCard}
            onClick={() => onSelectSubtipo(subtipo)}
            type="button"
          >
            <div className={s.stepTwoMobileSubtypePreview}>
              {subtypePreviewMarkup[subtipo] ? (
                <span
                  className={s.stepTwoMobileSubtypePreviewSvg}
                  dangerouslySetInnerHTML={{
                    __html: subtypePreviewMarkup[subtipo],
                  }}
                />
              ) : (
                <span className={s.stepTwoMobileSubtypeBadge}>
                  {getSubtypeBadge(subtipo)}
                </span>
              )}
            </div>

            <div className={s.stepTwoMobileOptionCopy}>
              <strong>{getVisibleSubtypeLabel(subtipo)}</strong>
              <small>Libre</small>
            </div>

            <span className={s.stepTwoMobileCreatorOptionArrow}>
              <LuChevronRight aria-hidden size={18} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

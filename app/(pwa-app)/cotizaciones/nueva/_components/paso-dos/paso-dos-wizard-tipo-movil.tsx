"use client";

import { useMemo } from "react";
import { LuChevronRight } from "react-icons/lu";

import type { PasoDosGrupoDraft } from "../../_hooks/use-paso-dos-agregar-grupo";
import {
  FREE_TOTAL_NOTEBOOK_CATEGORIA,
  getSubtypeOptionsForCategory,
} from "../../_hooks/use-paso-dos-agregar-grupo";
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
  onSelectCategoria: (categoria: PasoDosGrupoDraft["categoria"]) => void;
  onSelectSubtipo: (subtipo: string) => void;
};

export function PasoDosWizardTipoMovil({
  categoryOptions,
  draft,
  subtypeOptions,
  subtypePreviewMarkup,
  onSelectCategoria,
  onSelectSubtipo,
}: Props) {
  const singleSubtypeCategories = useMemo(
    () =>
      new Set(
        categoryOptions
          .filter((category) => {
            if (category.title === FREE_TOTAL_NOTEBOOK_CATEGORIA) {
              return true;
            }

            const count = Number.parseInt(category.countLabel, 10);
            return !Number.isNaN(count) && count === 1;
          })
          .map((category) => category.title)
      ),
    [categoryOptions]
  );

  return (
    <div className={s.stepTwoMobileCreatorStack}>
      <div className={s.stepTwoMobileCategoryTabs}>
        {categoryOptions.map((option) => {
          const isSingle = singleSubtypeCategories.has(option.title);
          const isActive = !isSingle && draft.categoria === option.title;
          const handleClick = () => {
            onSelectCategoria(option.title);
            if (isSingle) {
              const targetFirst = getSubtypeOptionsForCategory(option.title)[0];
              if (targetFirst) {
                onSelectSubtipo(targetFirst);
              }
            }
          };

          return (
            <button
              key={option.title}
              className={`${s.stepTwoMobileCategoryTab} ${
                isActive ? s.stepTwoMobileCategoryTabActive : ""
              }`}
              onClick={handleClick}
              type="button"
            >
              <div className={s.stepTwoMobileCategoryTabMain}>
                <strong>{option.title}</strong>
                <span>{repairBrokenText(option.subtitle)}</span>
              </div>
              <small
                className={`${s.stepTwoMobileCategoryTabCount} ${
                  option.title === FREE_TOTAL_NOTEBOOK_CATEGORIA
                    ? s.stepTwoMobileCategoryTabCountLibre
                    : ""
                }`}
              >
                {option.title === FREE_TOTAL_NOTEBOOK_CATEGORIA ? "Libre" : option.countLabel}
              </small>
            </button>
          );
        })}
      </div>

      <div className={s.stepTwoMobileCreatorOptionList}>
        {draft.categoria === FREE_TOTAL_NOTEBOOK_CATEGORIA ? null : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

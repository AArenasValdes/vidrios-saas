"use client";

import { useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";

import { repairBrokenText } from "./paso-dos-wizard-movil.utils";
import s from "../../page.module.css";

type GlassCatalogGroup = {
  grupo: string;
  options: readonly string[];
};

type Props = {
  currentGlass: string;
  glassCatalogGroups: readonly GlassCatalogGroup[];
  isRecommendedGlass: (option: string) => boolean;
  onSetVidSearch: (value: string) => void;
  onVidrioChange: (value: string) => void;
  recommendedReason: string;
  recommendedVidrios: readonly string[];
  searchResults: readonly string[];
  vidSearch: string;
};

export function PasoDosWizardVidrioMovil({
  currentGlass,
  glassCatalogGroups,
  isRecommendedGlass,
  onSetVidSearch,
  onVidrioChange,
  recommendedReason,
  recommendedVidrios,
  searchResults,
  vidSearch,
}: Props) {
  const [isGlassModalOpen, setIsGlassModalOpen] = useState(false);

  return (
    <>
      <div className={s.stepTwoMobileBlockSecundario}>
        <div className={s.stepTwoMobileBlockHeaderInline}>
          <div>
            <div className={s.stepTwoMobileBlockLabel}>Cristal / Vidrio</div>
            <p className={s.stepTwoMobileGlassIntro}>Solo sugeridos aqui. Catalogo completo en cambiar.</p>
          </div>
          <button
            className={s.stepTwoMobileSecondaryLink}
            onClick={() => setIsGlassModalOpen(true)}
            type="button"
          >
            Cambiar
          </button>
        </div>

        {recommendedVidrios.length > 0 ? (
          <div className={s.stepTwoMobileChoiceChips}>
            {recommendedVidrios.map((option) => (
              <button
                key={option}
                className={`${s.stepTwoMobileChoiceChip} ${s.stepTwoMobileChoiceChipRec} ${
                  currentGlass === option ? s.stepTwoMobileChoiceChipActive : ""
                }`}
                onClick={() => onVidrioChange(option)}
                type="button"
              >
                <span>{repairBrokenText(option)}</span>
                <small className={s.stepTwoMobileChoiceChipBadge}>Sugerido</small>
              </button>
            ))}
          </div>
        ) : (
          <div className={s.stepTwoMobileGlassRecommendedBox}>
            <span>
              {currentGlass
                ? `Vidrio elegido: ${repairBrokenText(currentGlass)}`
                : "Sin sugerencias para este sistema."}
            </span>
          </div>
        )}

        {currentGlass ? (
          <span className={s.stepTwoMobileBlockHelp}>
            Vidrio elegido: {repairBrokenText(currentGlass)}
          </span>
        ) : null}
      </div>

      {isGlassModalOpen ? (
        <div className={s.stepTwoMobileNestedModalOverlay}>
          <div className={s.stepTwoMobileNestedModal}>
            <div className={s.stepTwoMobileNestedModalHeader}>
              <div>
                <span className={s.cardLabel}>Catalogo de vidrios</span>
                <strong>Cambiar vidrio</strong>
                <span className={s.stepTwoMobileNestedModalSubtle}>{recommendedReason}</span>
              </div>
              <button
                className={s.stepTwoMobileHeaderAction}
                onClick={() => setIsGlassModalOpen(false)}
                type="button"
                aria-label="Cerrar catalogo de vidrios"
              >
                <LuX aria-hidden />
              </button>
            </div>

            <div className={s.stepTwoMobileNestedModalBody}>
              <div className={s.stepTwoMobileVidrioSearchWrap}>
                <LuSearch
                  aria-hidden
                  className={s.stepTwoMobileVidrioSearchIcon}
                  size={14}
                />
                <input
                  className={s.stepTwoMobileVidrioSearchInput}
                  placeholder='Buscar... ej: "inc", "dvh", "temp"'
                  type="text"
                  value={vidSearch}
                  onChange={(event) => onSetVidSearch(event.target.value)}
                />
                {vidSearch ? (
                  <button
                    className={s.stepTwoMobileVidrioSearchClear}
                    onClick={() => onSetVidSearch("")}
                    type="button"
                    aria-label="Limpiar busqueda"
                  >
                    <LuX aria-hidden size={11} />
                  </button>
                ) : null}
              </div>

              {vidSearch.trim() ? (
                <div className={s.stepTwoMobileChoiceChips}>
                  {searchResults.length > 0 ? (
                    searchResults.map((option) => (
                      <button
                        key={option}
                        className={`${s.stepTwoMobileChoiceChip} ${
                          currentGlass === option ? s.stepTwoMobileChoiceChipActive : ""
                        }`}
                        onClick={() => {
                          onVidrioChange(option);
                          onSetVidSearch("");
                          setIsGlassModalOpen(false);
                        }}
                        type="button"
                      >
                        {repairBrokenText(option)}
                      </button>
                    ))
                  ) : (
                    <span className={s.stepTwoMobileVidrioNoResults}>
                      Sin resultados para {vidSearch}. Prueba con dvh o temp.
                    </span>
                  )}
                </div>
              ) : (
                <div className={s.stepTwoMobileGlassCatalog}>
                  {glassCatalogGroups.map((group) => (
                    <div className={s.stepTwoMobileGlassGroup} key={group.grupo}>
                      <div className={s.stepTwoMobileGlassGroupTitle}>
                        {repairBrokenText(group.grupo)}
                      </div>
                      <div className={s.stepTwoMobileChoiceChips}>
                        {group.options.map((option) => (
                          <button
                            key={option}
                            className={`${s.stepTwoMobileChoiceChip} ${
                              isRecommendedGlass(option) ? s.stepTwoMobileChoiceChipRecSoft : ""
                            } ${
                              currentGlass === option ? s.stepTwoMobileChoiceChipActive : ""
                            }`}
                            onClick={() => {
                              onVidrioChange(option);
                              setIsGlassModalOpen(false);
                            }}
                            type="button"
                          >
                            {repairBrokenText(option)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

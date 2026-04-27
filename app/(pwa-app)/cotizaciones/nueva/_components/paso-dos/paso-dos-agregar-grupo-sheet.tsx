"use client";

import { LuChevronLeft, LuPlus, LuX } from "react-icons/lu";

import { COMPONENT_TYPE_GROUPS, MATERIAL_OPTIONS } from "@/features/cotizaciones/new-quote/workflow-ui";
import type {
  PasoDosGrupoDraft,
  PasoDosGrupoPaso,
} from "../../_hooks/use-paso-dos-agregar-grupo";

import s from "../../page.module.css";

type Props = {
  isOpen: boolean;
  paso: PasoDosGrupoPaso;
  draft: PasoDosGrupoDraft;
  subtypeOptions: readonly string[];
  systemOptions: readonly string[];
  glassOptions: readonly string[];
  summary: string;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onConfirm: () => void;
  onSelectCategoria: (categoria: PasoDosGrupoDraft["categoria"]) => void;
  onSelectSubtipo: (subtipo: string) => void;
  onSelectCantidad: (cantidad: number) => void;
  onEnableCustomQuantity: () => void;
  onCustomQuantityChange: (value: string) => void;
  onMaterialChange: (material: PasoDosGrupoDraft["material"]) => void;
  onSistemaChange: (value: string) => void;
  onVidrioChange: (value: string) => void;
  canContinueFromQuantity: boolean;
  canContinueFromConfig: boolean;
};

const STEP_COPY: Record<PasoDosGrupoPaso, { eyebrow: string; title: string; description: string }> = {
  1: {
    eyebrow: "Paso 1 de 5",
    title: "Categoria",
    description: "Elige el grupo principal para partir rapido.",
  },
  2: {
    eyebrow: "Paso 2 de 5",
    title: "Subtipo",
    description: "Define que pieza vas a cargar.",
  },
  3: {
    eyebrow: "Paso 3 de 5",
    title: "Cantidad",
    description: "Crea un solo grupo con la cantidad total.",
  },
  4: {
    eyebrow: "Paso 4 de 5",
    title: "Configuracion global",
    description: "Esto se aplica a todo el grupo.",
  },
  5: {
    eyebrow: "Paso 5 de 5",
    title: "Confirmacion",
    description: "Revisa el resumen antes de agregar.",
  },
};

function getContinueLabel(paso: PasoDosGrupoPaso) {
  if (paso === 4) {
    return "Ver resumen";
  }

  return "Continuar";
}

export function PasoDosAgregarGrupoSheet({
  isOpen,
  paso,
  draft,
  subtypeOptions,
  systemOptions,
  glassOptions,
  summary,
  onClose,
  onBack,
  onNext,
  onConfirm,
  onSelectCategoria,
  onSelectSubtipo,
  onSelectCantidad,
  onEnableCustomQuantity,
  onCustomQuantityChange,
  onMaterialChange,
  onSistemaChange,
  onVidrioChange,
  canContinueFromQuantity,
  canContinueFromConfig,
}: Props) {
  if (!isOpen) {
    return null;
  }

  const stepCopy = STEP_COPY[paso];
  const disableContinue =
    (paso === 3 && !canContinueFromQuantity) || (paso === 4 && !canContinueFromConfig);

  return (
    <div className={s.groupSheetOverlay} role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        aria-labelledby="paso-dos-grupo-title"
        className={s.groupSheet}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={s.groupSheetHandle} />

        <header className={s.groupSheetHeader}>
          <div className={s.groupSheetHeaderCopy}>
            <span className={s.cardLabel}>{stepCopy.eyebrow}</span>
            <h2 className={s.groupSheetTitle} id="paso-dos-grupo-title">
              {stepCopy.title}
            </h2>
            <p className={s.groupSheetDescription}>{stepCopy.description}</p>
          </div>

          <button
            aria-label="Cerrar flujo de grupo"
            className={s.groupSheetCloseButton}
            onClick={onClose}
            type="button"
          >
            <LuX aria-hidden />
          </button>
        </header>

        <div className={s.groupSheetProgress} aria-hidden="true">
          {[1, 2, 3, 4, 5].map((stepNumber) => (
            <span
              key={stepNumber}
              className={`${s.groupSheetProgressStep} ${
                stepNumber <= paso ? s.groupSheetProgressStepActive : ""
              }`}
            />
          ))}
        </div>

        <div className={s.groupSheetBody}>
          {paso === 1 ? (
            <div className={s.groupSheetOptionGrid}>
              {COMPONENT_TYPE_GROUPS.map((group) => (
                <button
                  key={group.title}
                  className={`${s.groupSheetOptionButton} ${
                    draft.categoria === group.title ? s.groupSheetOptionButtonActive : ""
                  }`}
                  onClick={() => onSelectCategoria(group.title)}
                  type="button"
                >
                  <strong>{group.title}</strong>
                  <span>{group.items.slice(0, 2).join(", ")}</span>
                </button>
              ))}
            </div>
          ) : null}

          {paso === 2 ? (
            <div className={s.groupSheetOptionGrid}>
              {subtypeOptions.map((subtipo) => (
                <button
                  key={subtipo}
                  className={`${s.groupSheetOptionButton} ${
                    draft.subtipo === subtipo ? s.groupSheetOptionButtonActive : ""
                  }`}
                  onClick={() => onSelectSubtipo(subtipo)}
                  type="button"
                >
                  <strong>{subtipo}</strong>
                  <span>{draft.categoria}</span>
                </button>
              ))}
            </div>
          ) : null}

          {paso === 3 ? (
            <div className={s.groupSheetStepBlock}>
              <div className={s.groupSheetQuestion}>Cuantas unidades?</div>

              <div className={s.batchCountRow}>
                {[1, 2, 3, 4].map((cantidad) => (
                  <button
                    key={cantidad}
                    className={`${s.batchCountButton} ${
                      !draft.usaCantidadPersonalizada && draft.cantidad === cantidad
                        ? s.batchCountButtonActive
                        : ""
                    }`}
                    onClick={() => onSelectCantidad(cantidad)}
                    type="button"
                  >
                    {cantidad}
                  </button>
                ))}

                <button
                  className={`${s.batchCountButton} ${
                    draft.usaCantidadPersonalizada ? s.batchCountButtonActive : ""
                  }`}
                  onClick={onEnableCustomQuantity}
                  type="button"
                >
                  +
                </button>
              </div>

              {draft.usaCantidadPersonalizada ? (
                <div className={s.groupSheetInlineField}>
                  <label className={s.label} htmlFor="grupo-cantidad-personalizada">
                    Cantidad personalizada
                  </label>
                  <input
                    className={`${s.input} ${s.groupSheetQuantityInput}`}
                    id="grupo-cantidad-personalizada"
                    inputMode="numeric"
                    min="1"
                    pattern="[0-9]*"
                    type="text"
                    value={draft.cantidadPersonalizada}
                    onChange={(event) => onCustomQuantityChange(event.target.value)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {paso === 4 ? (
            <div className={s.groupSheetConfigStack}>
              <section className={s.formSection}>
                <div className={s.formSectionHead}>
                  <span className={s.formSectionEyebrow}>Material</span>
                  <strong>Se aplica a todo el grupo</strong>
                </div>

                <div className={s.segmentedChoiceGrid} role="radiogroup" aria-label="Material del grupo">
                  {MATERIAL_OPTIONS.map((materialOption) => (
                    <label
                      key={materialOption}
                      className={`${s.segmentedChoice} ${
                        draft.material === materialOption ? s.segmentedChoiceActive : ""
                      }`}
                    >
                      <input
                        checked={draft.material === materialOption}
                        className={s.segmentedChoiceInput}
                        name="group-material"
                        onChange={() => onMaterialChange(materialOption)}
                        type="radio"
                        value={materialOption}
                      />
                      <span className={s.segmentedChoiceTitle}>{materialOption}</span>
                    </label>
                  ))}
                </div>
              </section>

              <div className={s.groupSheetInlineField}>
                <label className={s.label} htmlFor="grupo-sistema">
                  Tipo de sistema
                </label>
                <div className={s.selectWrap}>
                  <select
                    className={s.input}
                    id="grupo-sistema"
                    value={draft.sistema}
                    onChange={(event) => onSistemaChange(event.target.value)}
                  >
                    {systemOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={s.groupSheetInlineField}>
                <label className={s.label} htmlFor="grupo-vidrio">
                  Tipo de vidrio
                </label>
                <div className={s.selectWrap}>
                  <select
                    className={s.input}
                    id="grupo-vidrio"
                    value={draft.vidrio}
                    onChange={(event) => onVidrioChange(event.target.value)}
                  >
                    {glassOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {paso === 5 ? (
            <div className={s.groupSheetConfirmStack}>
              <div className={s.groupSheetSummaryCard}>
                <span className={s.cardLabel}>Resumen</span>
                <strong className={s.groupSheetSummaryText}>{summary}</strong>
              </div>

              <dl className={s.groupSheetSummaryGrid}>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Categoria</dt>
                  <dd>{draft.categoria}</dd>
                </div>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Subtipo</dt>
                  <dd>{draft.subtipo}</dd>
                </div>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Unidades</dt>
                  <dd>{draft.cantidad}</dd>
                </div>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Material</dt>
                  <dd>{draft.material}</dd>
                </div>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Sistema</dt>
                  <dd>{draft.sistema}</dd>
                </div>
                <div className={s.groupSheetSummaryRow}>
                  <dt>Vidrio</dt>
                  <dd>{draft.vidrio}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <footer className={s.groupSheetFooter}>
          <button
            className={s.btnGhost}
            disabled={paso === 1}
            onClick={onBack}
            type="button"
          >
            <LuChevronLeft aria-hidden />
            Atras
          </button>

          {paso < 5 ? (
            <button
              className={s.btnPrimary}
              disabled={disableContinue}
              onClick={onNext}
              type="button"
            >
              {getContinueLabel(paso)}
            </button>
          ) : (
            <button className={s.btnPrimary} onClick={onConfirm} type="button">
              <LuPlus aria-hidden />
              Agregar
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

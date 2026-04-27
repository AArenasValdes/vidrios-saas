"use client";

import {
  memo,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { LuArrowLeft, LuCheck, LuChevronRight, LuCopy } from "react-icons/lu";

import {
  CLP,
  formatCurrencyInput,
  isQuickEditDraftComplete,
  normalizeCurrencyInput,
  type QuickEditBatchTarget,
  type QuickEditDraftState,
  type QuickEditFieldKey,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import s from "../page.module.css";

type EditorRapidoMovilProps = {
  item: CotizacionWorkflowItem;
  draft: QuickEditDraftState;
  initialFocusField: QuickEditFieldKey | null;
  isMobileViewport: boolean;
  itemIndex: number;
  totalItems: number;
  sameTypePendingCount: number;
  batchTargets: QuickEditBatchTarget[];
  selectedBatchTargetIds: string[];
  isBatchSelectionOpen: boolean;
  pricingLabel: string;
  onDraftChange: (itemId: string, key: QuickEditFieldKey, value: string) => void;
  onCommit: (itemId: string, draft: QuickEditDraftState) => void;
  onNavigate: (
    direction: -1 | 1,
    focusField?: QuickEditFieldKey,
    options?: { preferIncomplete?: boolean }
  ) => void;
  onScrollToSummary: () => void;
  onStartBatchSelection: () => void;
  onToggleBatchTarget: (itemId: string) => void;
  onApplyToSameType: () => void;
  onCancelBatchSelection: () => void;
};

export const EditorRapidoMovil = memo(function EditorRapidoMovil({
  item,
  draft,
  initialFocusField,
  isMobileViewport,
  itemIndex,
  totalItems,
  sameTypePendingCount,
  batchTargets,
  selectedBatchTargetIds,
  isBatchSelectionOpen,
  pricingLabel,
  onDraftChange,
  onCommit,
  onNavigate,
  onScrollToSummary,
  onStartBatchSelection,
  onToggleBatchTarget,
  onApplyToSameType,
  onCancelBatchSelection,
}: EditorRapidoMovilProps) {
  const editorRef = useRef<HTMLElement | null>(null);
  const { pricingMode } = decodeCotizacionItemPresentationMeta(item.observaciones);
  const inputRefs = useRef<Record<QuickEditFieldKey, HTMLInputElement | null>>({
    ancho: null,
    alto: null,
    costoProveedorUnitario: null,
  });

  const isAndroidDevice = useMemo(
    () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent),
    []
  );

  useEffect(() => {
    if (!initialFocusField) {
      return;
    }

    const node = inputRefs.current[initialFocusField];
    if (!node) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      node.focus({ preventScroll: true });
      if (!isMobileViewport && !isAndroidDevice) {
        node.select();
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [initialFocusField, item.id, isAndroidDevice, isMobileViewport]);

  const handleFieldChange = useCallback(
    (key: keyof QuickEditDraftState, value: string) => {
      const normalizedValue =
        key === "costoProveedorUnitario"
          ? normalizeCurrencyInput(value)
          : value.replace(/[^\d]/g, "");
      onDraftChange(item.id, key, normalizedValue);
    },
    [item.id, onDraftChange]
  );

  const handleBlur = useCallback(() => {
    onCommit(item.id, draft);
  }, [draft, item.id, onCommit]);

  const handleNavigate = useCallback(
    (
      direction: -1 | 1,
      focusField: QuickEditFieldKey = "ancho",
      options?: { preferIncomplete?: boolean }
    ) => {
      handleBlur();
      onNavigate(direction, focusField, options);
    },
    [handleBlur, onNavigate]
  );

  const focusNextField = useCallback(
    (field: QuickEditFieldKey) => {
      if (field === "ancho") {
        inputRefs.current.alto?.focus({ preventScroll: true });
        if (!isMobileViewport && !isAndroidDevice) {
          inputRefs.current.alto?.select();
        }
        return;
      }

      if (field === "alto") {
        inputRefs.current.costoProveedorUnitario?.focus({ preventScroll: true });
        if (!isMobileViewport && !isAndroidDevice) {
          inputRefs.current.costoProveedorUnitario?.select();
        }
      }
    },
    [isAndroidDevice, isMobileViewport]
  );

  const handleKeyDown = useCallback(
    (field: QuickEditFieldKey, event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();

      if (field === "ancho") {
        focusNextField("ancho");
        return;
      }

      if (field === "alto") {
        focusNextField("alto");
        return;
      }

      if (itemIndex < totalItems - 1) {
        handleNavigate(1, "ancho", { preferIncomplete: true });
        return;
      }

      handleBlur();
      onScrollToSummary();
    },
    [focusNextField, handleBlur, handleNavigate, itemIndex, onScrollToSummary, totalItems]
  );

  const currentItemReady = isQuickEditDraftComplete(draft);

  return (
    <section ref={editorRef} className={`${s.mobileQuickEditor} ${s.mobileQuickEditorEnhanced} ${isMobileViewport ? "" : s.quickEditorDesktop}`}>
      <div className={s.mobileQuickEditorHeader}>
        <div>
          <span className={s.mobileQuickEditorEyebrow}>Editar rapido</span>
          <strong>
            {item.codigo} / {item.tipo}
          </strong>
        </div>
        <span className={s.mobileQuickEditorPrice}>
          {pricingMode === "precio_directo" ? CLP(item.precioTotal) : CLP(item.costoProveedorTotal)}
        </span>
      </div>

      <div className={s.mobileQuickEditorNav}>
        <div className={s.mobileQuickEditorNavStatus}>
          <span className={s.mobileQuickEditorNavPill}>
            {itemIndex + 1} de {totalItems}
          </span>
          {!isMobileViewport ? <span className={s.mobileQuickEditorNavLabel}>Mover entre piezas</span> : null}
        </div>
        <div className={s.mobileQuickEditorNavButtons}>
          <button
            type="button"
            className={s.mobileQuickEditorNavButton}
            onClick={() => handleNavigate(-1)}
            disabled={itemIndex <= 0}
          >
            <LuArrowLeft aria-hidden />
            <span>Anterior</span>
          </button>
          <button
            type="button"
            className={`${s.mobileQuickEditorNavButton} ${s.mobileQuickEditorNavButtonPrimary}`}
            onClick={() => handleNavigate(1)}
            disabled={itemIndex >= totalItems - 1}
          >
            <span>Siguiente</span>
            <LuChevronRight aria-hidden />
          </button>
        </div>
      </div>

      <div className={s.mobileQuickEditorMeta}>
        {item.vidrio || "Sin vidrio"} / {item.cantidad} {item.cantidad === 1 ? "ud." : "uds."}
      </div>

      <div className={s.mobileQuickEditorProgress}>
        <span
          className={`${s.mobileQuickEditorProgressPill} ${
            currentItemReady ? s.mobileQuickEditorProgressPillComplete : s.mobileQuickEditorProgressPillPending
          }`}
        >
          {currentItemReady ? (
            <>
              <LuCheck aria-hidden />
              Completo
            </>
          ) : (
            "Pendiente"
          )}
        </span>
        {!currentItemReady ? (
          <span className={s.mobileQuickEditorProgressHint}>Completa medidas y valor.</span>
        ) : null}
      </div>

      {currentItemReady && sameTypePendingCount > 0 && !isBatchSelectionOpen ? (
        <div className={s.mobileQuickEditorRepeatActions}>
          <button type="button" className={s.mobileQuickEditorRepeatButton} onClick={onApplyToSameType}>
            <LuCopy aria-hidden />
            Aplicar a todas ({sameTypePendingCount})
          </button>
          <button
            type="button"
            className={s.mobileQuickEditorRepeatSecondary}
            onClick={onStartBatchSelection}
          >
            Elegir cuales
          </button>
        </div>
      ) : null}

      {currentItemReady && isBatchSelectionOpen ? (
        <div className={s.mobileQuickEditorBatchPanel}>
          <div className={s.mobileQuickEditorBatchHeader}>
            <strong>Elige cuales igualar</strong>
            <span>{selectedBatchTargetIds.length} seleccionados</span>
          </div>
          <div className={s.mobileQuickEditorBatchGrid}>
            {batchTargets.map((target) => {
              const isSelected = selectedBatchTargetIds.includes(target.id);

              return (
                <button
                  key={target.id}
                  type="button"
                  className={`${s.mobileQuickEditorBatchChip} ${isSelected ? s.mobileQuickEditorBatchChipActive : ""}`}
                  onClick={() => onToggleBatchTarget(target.id)}
                >
                  <strong>{target.code}</strong>
                  <span>{target.title}</span>
                </button>
              );
            })}
          </div>
          <div className={s.mobileQuickEditorBatchActions}>
            <button type="button" className={s.mobileQuickEditorBatchCancel} onClick={onCancelBatchSelection}>
              Cancelar
            </button>
            <button
              type="button"
              className={s.mobileQuickEditorRepeatButton}
              onClick={onApplyToSameType}
              disabled={selectedBatchTargetIds.length === 0}
            >
              <LuCopy aria-hidden />
              Aplicar a {selectedBatchTargetIds.length}
            </button>
          </div>
        </div>
      ) : null}

      <div className={s.quickEditRow}>
        <label className={s.quickEditField}>
          <span>Ancho</span>
          <input
            ref={(node) => {
              inputRefs.current.ancho = node;
            }}
            className={s.quickEditInput}
            inputMode="numeric"
            value={draft.ancho}
            onChange={(event) => handleFieldChange("ancho", event.target.value)}
            onBlur={handleBlur}
            onKeyDown={(event) => handleKeyDown("ancho", event)}
            placeholder="-"
          />
        </label>
        <label className={s.quickEditField}>
          <span>Alto</span>
          <input
            ref={(node) => {
              inputRefs.current.alto = node;
            }}
            className={s.quickEditInput}
            inputMode="numeric"
            value={draft.alto}
            onChange={(event) => handleFieldChange("alto", event.target.value)}
            onBlur={handleBlur}
            onKeyDown={(event) => handleKeyDown("alto", event)}
            placeholder="-"
          />
        </label>
        <label className={`${s.quickEditField} ${s.quickEditFieldWide}`}>
          <span>{pricingLabel}</span>
          <input
            ref={(node) => {
              inputRefs.current.costoProveedorUnitario = node;
            }}
            className={s.quickEditInput}
            inputMode="numeric"
            value={formatCurrencyInput(draft.costoProveedorUnitario)}
            onChange={(event) => handleFieldChange("costoProveedorUnitario", event.target.value)}
            onBlur={handleBlur}
            onKeyDown={(event) => handleKeyDown("costoProveedorUnitario", event)}
            placeholder="0"
          />
        </label>
      </div>
    </section>
  );
});

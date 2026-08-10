"use client";

import {
  memo,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LuArrowLeft,
  LuCalculator,
  LuCheck,
  LuChevronRight,
  LuCopy,
  LuRefreshCw,
  LuSave,
} from "react-icons/lu";

import {
  CLP,
  formatCurrencyInput,
  isQuickEditDraftComplete,
  normalizeCurrencyInput,
  type QuickEditBatchTarget,
  type QuickEditDraftState,
  type QuickEditFieldKey,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { calculateLineTemplatePricing } from "@/features/cotizaciones/services/cotizacion-line-pricing.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
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
  quotePricingMode: QuotePricingMode;
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
  onRecalculateTemplatePrice: () => void;
  onSaveQuickPriceTemplate: () => void;
  isSavingQuickPriceTemplate: boolean;
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
  quotePricingMode,
  pricingLabel,
  onDraftChange,
  onCommit,
  onNavigate,
  onScrollToSummary,
  onStartBatchSelection,
  onToggleBatchTarget,
  onApplyToSameType,
  onCancelBatchSelection,
  onRecalculateTemplatePrice,
  onSaveQuickPriceTemplate,
  isSavingQuickPriceTemplate,
}: EditorRapidoMovilProps) {
  const editorRef = useRef<HTMLElement | null>(null);
  const {
    pricingMode,
    referencia,
    precioPorM2,
    minimoCobrable,
    redondeoPrecio,
    precioAjustadoManual,
  } = decodeCotizacionItemPresentationMeta(item.observaciones);
  const inputRefs = useRef<Record<QuickEditFieldKey, HTMLInputElement | null>>({
    ancho: null,
    alto: null,
    costoProveedorUnitario: null,
  });
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorMode, setCalculatorMode] = useState<"libre" | "area" | "conversion">("libre");
  const [calculatorValueA, setCalculatorValueA] = useState("");
  const [calculatorValueB, setCalculatorValueB] = useState("");
  const [calculatorOperator, setCalculatorOperator] = useState<"+" | "-" | "*" | "/">("*");

  const isAndroidDevice = useMemo(
    () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent),
    []
  );
  const hasLinePricing = Boolean(referencia.trim() && precioPorM2 && precioPorM2 > 0);
  const linePricingSummary = useMemo(
    () =>
      calculateLineTemplatePricing({
        ancho: draft.ancho ? Number(draft.ancho) : item.ancho,
        alto: draft.alto ? Number(draft.alto) : item.alto,
        cantidad: item.cantidad,
        precioM2Sugerido: precioPorM2,
        minimoCobrable,
        redondeoPrecio,
      }),
    [draft.alto, draft.ancho, item.alto, item.ancho, item.cantidad, minimoCobrable, precioPorM2, redondeoPrecio]
  );

  const calculatorResult = useMemo(() => {
    if (calculatorMode === "libre") {
      const left = Number(calculatorValueA);
      const right = Number(calculatorValueB);

      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return "";
      }

      if (calculatorOperator === "/" && right === 0) {
        return "";
      }

      const result =
        calculatorOperator === "+"
          ? left + right
          : calculatorOperator === "-"
            ? left - right
            : calculatorOperator === "*"
              ? left * right
              : left / right;

      return Number.isFinite(result) ? String(Math.round(Number(result))) : "";
    }

    if (calculatorMode === "area") {
      const ancho = Number(calculatorValueA);
      const alto = Number(calculatorValueB);

      if (!Number.isFinite(ancho) || !Number.isFinite(alto) || ancho <= 0 || alto <= 0) {
        return "";
      }

      return String(Math.round(((ancho * alto) / 1_000_000) * 100) / 100);
    }

    const mmValue = Number(calculatorValueA);
    if (!Number.isFinite(mmValue) || mmValue <= 0) {
      return "";
    }

    return String(Math.round((mmValue / 1000) * 1000) / 1000);
  }, [calculatorMode, calculatorOperator, calculatorValueA, calculatorValueB]);

  useEffect(() => {
    if (!initialFocusField) {
      return;
    }

    const node = inputRefs.current[initialFocusField];
    if (!node) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      // En movil Safari debe poder desplazar el contenedor para dejar el campo
      // sobre el teclado; en desktop conservamos el foco sin saltar el scroll.
      node.focus({ preventScroll: !isMobileViewport });
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

  function handleApplyCalculatorResult(target: QuickEditFieldKey) {
    if (!calculatorResult) {
      return;
    }

    const normalizedValue =
      target === "costoProveedorUnitario"
        ? normalizeCurrencyInput(calculatorResult)
        : calculatorResult.replace(/[^\d]/g, "");

    onDraftChange(item.id, target, normalizedValue);
    setIsCalculatorOpen(false);
  }

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
        inputRefs.current.alto?.focus({ preventScroll: !isMobileViewport });
        if (!isMobileViewport && !isAndroidDevice) {
          inputRefs.current.alto?.select();
        }
        return;
      }

      if (field === "alto") {
        if (quotePricingMode === "total_global") {
          handleBlur();
          return;
        }
        inputRefs.current.costoProveedorUnitario?.focus({
          preventScroll: !isMobileViewport,
        });
        if (!isMobileViewport && !isAndroidDevice) {
          inputRefs.current.costoProveedorUnitario?.select();
        }
      }
    },
    [handleBlur, isAndroidDevice, isMobileViewport, quotePricingMode]
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
    [
      focusNextField,
      handleBlur,
      handleNavigate,
      itemIndex,
      onScrollToSummary,
      totalItems,
    ]
  );

  const currentItemReady = isQuickEditDraftComplete(draft, quotePricingMode);
  const editorModeClass = isMobileViewport
    ? s.mobileQuickEditorModeMobile
    : s.mobileQuickEditorModeDesktop;

  return (
    <section
      ref={editorRef}
      className={`${s.mobileQuickEditor} ${s.mobileQuickEditorEnhanced} ${editorModeClass} ${
        isMobileViewport ? "" : s.quickEditorDesktop
      }`}
    >
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

      {hasLinePricing ? (
        <div className={s.quickTemplatePanel}>
          <div className={s.quickTemplatePanelHeader}>
            <div>
              <span className={s.quickTemplateEyebrow}>Precio rapido</span>
              <strong>{referencia}</strong>
            </div>
            {precioAjustadoManual ? (
              <span className={`${s.quickTemplateStatus} ${s.quickTemplateStatusManual}`}>Precio ajustado manualmente</span>
            ) : (
              <span className={`${s.quickTemplateStatus} ${s.quickTemplateStatusAutomatic}`}>Precio automático por línea</span>
            )}
          </div>
          <div className={s.quickTemplateSummaryGrid}>
            <div>
              <span>Precio por m2</span>
              <strong>{CLP(precioPorM2 ?? 0)}</strong>
            </div>
            <div>
              <span>Minimo</span>
              <strong>{minimoCobrable && minimoCobrable > 0 ? CLP(minimoCobrable) : "Sin mínimo"}</strong>
            </div>
            <div>
              <span>Area</span>
              <strong>{linePricingSummary.areaM2 !== null ? `${linePricingSummary.areaM2} m2` : "-"}</strong>
            </div>
            <div>
              <span>Precio sugerido</span>
              <strong>
                {linePricingSummary.precioUnitarioSugerido !== null
                  ? CLP(linePricingSummary.precioUnitarioSugerido)
                  : linePricingSummary.motivoNoCalculado ?? "Completa medidas"}
              </strong>
            </div>
          </div>
          <details className={s.lineTemplateBreakdown}>
            <summary className={s.lineTemplateBreakdownSummary}>Ver cálculo</summary>
            <div className={s.lineTemplateBreakdownGrid}>
              <div>
                <span>Área calculada</span>
                <strong>
                  {linePricingSummary.areaM2 !== null ? `${linePricingSummary.areaM2} m²` : "-"}
                </strong>
              </div>
              <div>
                <span>Precio base aplicado</span>
                <strong>
                  {linePricingSummary.precioBaseUnitario !== null
                    ? CLP(linePricingSummary.precioBaseUnitario)
                    : "-"}
                </strong>
              </div>
              <div>
                <span>Mínimo</span>
                <strong>
                  {linePricingSummary.minimoCobrable !== null
                    ? linePricingSummary.minimoAplicado !== null
                      ? `Aplicado · ${CLP(linePricingSummary.minimoAplicado)}`
                      : `No aplicado · ${CLP(linePricingSummary.minimoCobrable)}`
                    : "Sin mínimo"}
                </strong>
              </div>
              <div>
                <span>Redondeo</span>
                <strong>
                  {linePricingSummary.redondeoPrecio && linePricingSummary.redondeoPrecio > 0
                    ? linePricingSummary.redondeoAplicado && linePricingSummary.redondeoAplicado > 0
                      ? `+${CLP(linePricingSummary.redondeoAplicado)}`
                      : "No aplicado"
                    : "Sin redondeo"}
                </strong>
              </div>
              <div>
                <span>Cantidad</span>
                <strong>{item.cantidad}</strong>
              </div>
              <div>
                <span>Total sugerido</span>
                <strong>
                  {linePricingSummary.totalSugerido !== null ? CLP(linePricingSummary.totalSugerido) : "-"}
                </strong>
              </div>
            </div>
          </details>
          <div className={s.quickTemplateActions}>
            <button type="button" className={s.mobileQuickEditorRepeatSecondary} onClick={onRecalculateTemplatePrice}>
              <LuRefreshCw aria-hidden />
              Recalcular con línea
            </button>
            <button
              type="button"
              className={s.mobileQuickEditorRepeatSecondary}
              onClick={onSaveQuickPriceTemplate}
              disabled={isSavingQuickPriceTemplate}
            >
              <LuSave aria-hidden />
              {isSavingQuickPriceTemplate ? "Guardando..." : "Guardar como precio rapido"}
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
        {quotePricingMode === "por_item" ? (
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
        ) : null}
      </div>

      <div className={s.quickTemplateActions}>
        <button
          type="button"
          className={s.mobileQuickEditorRepeatSecondary}
          onClick={() => setIsCalculatorOpen((current) => !current)}
        >
          <LuCalculator aria-hidden />
          {isCalculatorOpen ? "Cerrar calculadora" : "Calculadora"}
        </button>
      </div>

      {isCalculatorOpen ? (
        <div className={s.quickCalculatorPanel}>
          <div className={s.quickCalculatorModeRow}>
            {(
              [
                { key: "libre", label: "Libre" },
                { key: "area", label: "Area m2" },
                { key: "conversion", label: "mm a m" },
              ] as const
            ).map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={`${s.quickCalculatorModeButton} ${
                  calculatorMode === mode.key ? s.quickCalculatorModeButtonActive : ""
                }`}
                onClick={() => setCalculatorMode(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {calculatorMode === "libre" ? (
            <div className={s.quickEditRow}>
              <label className={s.quickEditField}>
                <span>Valor A</span>
                <input
                  className={s.quickEditInput}
                  inputMode="decimal"
                  value={calculatorValueA}
                  onChange={(event) =>
                    setCalculatorValueA(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="1200"
                />
              </label>
              <label className={s.quickEditField}>
                <span>Operacion</span>
                <select
                  className={s.quickEditInput}
                  value={calculatorOperator}
                  onChange={(event) =>
                    setCalculatorOperator(event.target.value as "+" | "-" | "*" | "/")
                  }
                >
                  <option value="+">+</option>
                  <option value="-">-</option>
                  <option value="*">x</option>
                  <option value="/">/</option>
                </select>
              </label>
              <label className={s.quickEditField}>
                <span>Valor B</span>
                <input
                  className={s.quickEditInput}
                  inputMode="decimal"
                  value={calculatorValueB}
                  onChange={(event) =>
                    setCalculatorValueB(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="1500"
                />
              </label>
            </div>
          ) : (
            <div className={s.quickEditRow}>
              <label className={s.quickEditField}>
                <span>{calculatorMode === "area" ? "Ancho (mm)" : "Milimetros"}</span>
                <input
                  className={s.quickEditInput}
                  inputMode="numeric"
                  value={calculatorValueA}
                  onChange={(event) =>
                    setCalculatorValueA(event.target.value.replace(/[^\d.]/g, ""))
                  }
                  placeholder="1200"
                />
              </label>
              {calculatorMode === "area" ? (
                <label className={s.quickEditField}>
                  <span>Alto (mm)</span>
                  <input
                    className={s.quickEditInput}
                    inputMode="numeric"
                    value={calculatorValueB}
                    onChange={(event) =>
                      setCalculatorValueB(event.target.value.replace(/[^\d.]/g, ""))
                    }
                    placeholder="1500"
                  />
                </label>
              ) : null}
            </div>
          )}

          <div className={s.quickCalculatorResult}>
            <span>Resultado</span>
            <strong>{calculatorResult || "-"}</strong>
          </div>

          <div className={s.quickTemplateActions}>
            <button
              type="button"
              className={s.mobileQuickEditorRepeatSecondary}
              onClick={() => handleApplyCalculatorResult("ancho")}
              disabled={!calculatorResult}
            >
              Usar en ancho
            </button>
            <button
              type="button"
              className={s.mobileQuickEditorRepeatSecondary}
              onClick={() => handleApplyCalculatorResult("alto")}
              disabled={!calculatorResult}
            >
              Usar en alto
            </button>
            {quotePricingMode === "por_item" ? (
              <button
                type="button"
                className={s.mobileQuickEditorRepeatButton}
                onClick={() => handleApplyCalculatorResult("costoProveedorUnitario")}
                disabled={!calculatorResult}
              >
                Usar en precio
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
});

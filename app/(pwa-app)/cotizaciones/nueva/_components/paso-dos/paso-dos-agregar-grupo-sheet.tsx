"use client";

import { useState } from "react";
import { LuChevronLeft, LuChevronRight, LuNotebookPen, LuPlus, LuSparkles, LuX } from "react-icons/lu";

import {
  COMPONENT_TYPE_GROUPS,
  FIELD_LIMITS,
  formatCurrencyInput,
  getCompositionSectionLabel,
  getSheetSchemeOptions,
  getSheetVariantOptions,
  MATERIAL_OPTIONS,
  requiresCustomSheetDescription,
  shouldShowSystemSelectionForComponent,
  shouldShowSheetSchemeForComponent,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  getComponentDescripcion,
  isFreeValueComponentType,
} from "@/features/cotizaciones/services/component-catalog.service";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import {
  ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS,
} from "../../_hooks/use-paso-dos-agregar-grupo";
import type {
  PasoDosGrupoDraft,
  PasoDosGrupoPaso,
} from "../../_hooks/use-paso-dos-agregar-grupo";
import { getVisibleSubtypeLabel } from "./paso-dos-wizard-movil.utils";

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
  onNombreChange: (value: string) => void;
  onDescripcionChange: (value: string) => void;
  onSistemaChange: (value: string) => void;
  onSheetSchemeChange: (value: string) => void;
  onSheetVariantChange: (value: string) => void;
  onCustomSchemeDescriptionChange: (value: string) => void;
  onVidrioChange: (value: string) => void;
  onPrecioChange: (value: string) => void;
  onIvaModeChange: (ivaMode: "total_incluye_iva" | "neto_mas_iva") => void;
  onCobraPrecioSeparadoChange: (value: boolean) => void;
  onAddAlcanceDetalle: (initialNombre?: string) => void;
  onUpdateAlcanceDetalle: (
    detalleId: string,
    field: "tipo" | "subtipo" | "nombre" | "cantidad" | "ancho" | "alto" | "descripcion",
    value: string
  ) => void;
  onRemoveAlcanceDetalle: (detalleId: string) => void;
  quotePricingMode: QuotePricingMode;
  totalClienteManual: number | null;
  mostrarIva: boolean;
  internalObservation: string;
  onGlobalTotalClienteChange: (value: string) => void;
  onMostrarIvaChange: () => void;
  onInternalObservationChange: (value: string) => void;
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
  onNombreChange,
  onDescripcionChange,
  onSistemaChange,
  onSheetSchemeChange,
  onSheetVariantChange,
  onCustomSchemeDescriptionChange,
  onVidrioChange,
  onPrecioChange,
  onIvaModeChange,
  onCobraPrecioSeparadoChange,
  onAddAlcanceDetalle,
  onUpdateAlcanceDetalle,
  onRemoveAlcanceDetalle,
  quotePricingMode,
  totalClienteManual,
  mostrarIva,
  internalObservation,
  onGlobalTotalClienteChange,
  onMostrarIvaChange,
  onInternalObservationChange,
  canContinueFromQuantity,
  canContinueFromConfig,
}: Props) {
  if (!isOpen) {
    return null;
  }

  const stepCopy = STEP_COPY[paso];
  const disableContinue =
    (paso === 3 && !canContinueFromQuantity) || (paso === 4 && !canContinueFromConfig);
  const showSheetScheme = shouldShowSheetSchemeForComponent({
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const showSystemSelection = shouldShowSystemSelectionForComponent(draft.subtipo);
  const isTrabajoPersonalizado = draft.subtipo === "Trabajo personalizado";
  const isFreeValue = isFreeValueComponentType(draft.subtipo);
  const freeValueGuidance = getComponentDescripcion(draft.subtipo);
  const shouldShowFreeValuePrice =
    quotePricingMode !== "total_global" || draft.cobraPrecioSeparado;
  const sheetSchemeOptions = getSheetSchemeOptions({
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const sheetVariantOptions = getSheetVariantOptions(draft.sheetScheme, {
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const compositionSectionLabel = getCompositionSectionLabel({
    tipo: draft.subtipo,
    sistema: draft.sistema,
  });
  const showCustomSchemeDescription = requiresCustomSheetDescription({
    sheetScheme: draft.sheetScheme,
    sheetVariant: draft.sheetVariant,
  });
  const [isInternalObservationOpen, setIsInternalObservationOpen] = useState(
    Boolean(internalObservation.trim())
  );
  const globalTotalInputValue =
    totalClienteManual !== null && totalClienteManual !== undefined
      ? formatCurrencyInput(String(totalClienteManual))
      : "";

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
            quotePricingMode === "total_global" ? (
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
            ) : (
              <div className={s.groupSheetOptionGrid}>
                {COMPONENT_TYPE_GROUPS.map((group) => {
                  const isLibre = group.title === "Proyecto libre y Mantencion";
                  const isSingle = group.items.length === 1;
                  const isActive = !isSingle && draft.categoria === group.title;
                  const handleClick = () => {
                    onSelectCategoria(group.title);
                    if (isSingle) {
                      onSelectSubtipo(group.items[0]);
                    }
                  };

                  return (
                  <button
                    key={group.title}
                    className={`${s.groupSheetOptionButton} ${
                      isActive ? s.groupSheetOptionButtonActive : ""
                    } ${isLibre ? s.groupSheetOptionButtonLibre : ""}`}
                    onClick={handleClick}
                    type="button"
                  >
                    <strong>{group.title}</strong>
                    <span>{group.items.slice(0, 2).map(getVisibleSubtypeLabel).join(", ")}</span>
                    {isLibre ? (
                      <span className={s.groupSheetLibreBadge}>Libre</span>
                    ) : null}
                  </button>
                  );
                })}
              </div>
            )
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
                  <strong>{getVisibleSubtypeLabel(subtipo)}</strong>
                  <span>{isFreeValueComponentType(subtipo) ? "Libre" : draft.categoria}</span>
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
              {isFreeValue ? (
                <>
                  <section className={s.formSection}>
                    <div className={s.formSectionHead}>
                      <span className={s.formSectionEyebrow}>Item libre con valor</span>
                      <strong>
                        {quotePricingMode === "total_global"
                          ? "Redacta trabajo principal, detalles incluidos y precio final"
                          : "Redacta el trabajo y define el valor"}
                      </strong>
                    </div>
                    <label className={s.field}>
                      <span className={s.label}>Nombre del item</span>
                      <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Ej: Mantencion de ventanas"
                        value={draft.nombre}
                        onChange={(event) => onNombreChange(event.target.value)}
                      />
                    </label>
                    <label className={s.field}>
                      <span className={s.label}>Descripcion para cliente</span>
                      {freeValueGuidance ? (
                        <div className={s.stepTwoMobileGuidanceBox}>
                          <strong>{draft.nombre || draft.subtipo}</strong>
                          <span>{freeValueGuidance}</span>
                        </div>
                      ) : null}
                      <textarea
                        className={s.textarea}
                        maxLength={360}
                        placeholder="Ej: Mantencion de 5 ventanas existentes, ajuste de corredera y limpieza de rieles."
                        rows={3}
                        value={draft.descripcion}
                        onChange={(event) => onDescripcionChange(event.target.value)}
                      />
                    </label>
                    <div className={s.suggestionChips}>
                      <span className={s.suggestionChipsLabel}>Sugerencias:</span>
                      {["Cambio de vidrio", "Mantencion", "Sellado", "Reparacion shower", "Otro"].map(
                        (chip) => (
                          <button
                            key={chip}
                            type="button"
                            className={`${s.suggestionChip} ${
                              draft.nombre === chip ? s.suggestionChipActive : ""
                            }`}
                            onClick={() => onNombreChange(chip)}
                          >
                            {chip}
                          </button>
                        )
                      )}
                    </div>
                    {quotePricingMode === "total_global" ? (
                      <div className={s.field}>
                        <span className={s.label}>Precio</span>
                        <button
                          type="button"
                          className={draft.cobraPrecioSeparado ? s.btnGhost : s.btnPrimary}
                          onClick={() => onCobraPrecioSeparadoChange(!draft.cobraPrecioSeparado)}
                        >
                          {draft.cobraPrecioSeparado
                            ? "Quitar cobro separado"
                            : "Cobrar este item por separado"}
                        </button>
                        <small className={s.helpText}>
                          {draft.cobraPrecioSeparado
                            ? "Este valor se sumara al total final."
                            : "Queda incluido dentro del precio final del presupuesto."}
                        </small>
                      </div>
                    ) : null}

                    {shouldShowFreeValuePrice ? (
                      <>
                        <label className={s.field}>
                          <span className={s.label}>Valor a cobrar</span>
                          <input
                            className={s.input}
                            inputMode="numeric"
                            placeholder="Ej: 120.000"
                            value={draft.precio}
                            onChange={(event) => onPrecioChange(event.target.value)}
                          />
                        </label>
                        <div className={s.field}>
                          <span className={s.label}>IVA</span>
                          <div className={s.ivaCompactRow}>
                            <button
                              type="button"
                              className={`${s.ivaCompactOption} ${
                                draft.ivaMode === "total_incluye_iva" ? s.ivaCompactOptionActive : ""
                              }`}
                              onClick={() => onIvaModeChange("total_incluye_iva")}
                            >
                              <span className={s.ivaCompactLabel}>Incluido</span>
                            </button>
                            <button
                              type="button"
                              className={`${s.ivaCompactOption} ${
                                draft.ivaMode === "neto_mas_iva" ? s.ivaCompactOptionActive : ""
                              }`}
                              onClick={() => onIvaModeChange("neto_mas_iva")}
                            >
                              <span className={s.ivaCompactLabel}>Agregar IVA</span>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {quotePricingMode === "total_global" ? (
                      <section className={s.formSection}>
                        <div className={s.formSectionHead}>
                          <span className={s.formSectionEyebrow}>Detalles incluidos</span>
                          <strong>Manual para texto libre. Estructurado para croquis en PDF.</strong>
                        </div>

                        {draft.alcanceDetalles.map((detalle) => (
                          <div key={detalle.id} className={s.alcanceDetalleCard}>
                            <div className={s.alcanceDetalleHeader}>
                              <span className={s.alcanceDetalleIndex}>
                                {detalle.nombre.trim() || "Detalle"}
                              </span>
                              <button
                                type="button"
                                className={s.iconButton}
                                onClick={() => onRemoveAlcanceDetalle(detalle.id)}
                                aria-label="Eliminar detalle"
                              >
                                <LuX aria-hidden size={14} />
                              </button>
                            </div>
                            <div className={s.stepTwoMobileChoiceChips}>
                              <button
                                type="button"
                                className={`${s.stepTwoMobileChoiceChip} ${
                                  detalle.tipo === "manual" ? s.stepTwoMobileChoiceChipActive : ""
                                }`}
                                onClick={() => onUpdateAlcanceDetalle(detalle.id, "tipo", "manual")}
                              >
                                Manual
                              </button>
                              <button
                                type="button"
                                className={`${s.stepTwoMobileChoiceChip} ${
                                  detalle.tipo === "estructurado" ? s.stepTwoMobileChoiceChipActive : ""
                                }`}
                                onClick={() =>
                                  onUpdateAlcanceDetalle(detalle.id, "tipo", "estructurado")
                                }
                              >
                                Estructurado
                              </button>
                            </div>
                            {detalle.tipo === "estructurado" ? (
                              <>
                                <label className={s.field}>
                                  <span className={s.label}>Componente</span>
                                  <div className={s.selectWrap}>
                                    <select
                                      className={s.input}
                                      value={detalle.subtipo || ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS[0]}
                                      onChange={(event) =>
                                        onUpdateAlcanceDetalle(
                                          detalle.id,
                                          "subtipo",
                                          event.target.value
                                        )
                                      }
                                    >
                                      {ALCANCE_ESTRUCTURADO_SUBTYPE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </label>
                                <div className={s.alcanceDetalleGrid}>
                                  <label className={s.field}>
                                    <span className={s.label}>Cantidad</span>
                                    <input
                                      className={s.input}
                                      inputMode="numeric"
                                      placeholder="1"
                                      value={detalle.cantidad}
                                      onChange={(e) =>
                                        onUpdateAlcanceDetalle(
                                          detalle.id,
                                          "cantidad",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                  <label className={s.field}>
                                    <span className={s.label}>Ancho (mm)</span>
                                    <input
                                      className={s.input}
                                      inputMode="numeric"
                                      placeholder="1500"
                                      value={detalle.ancho}
                                      onChange={(e) =>
                                        onUpdateAlcanceDetalle(
                                          detalle.id,
                                          "ancho",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                  <label className={s.field}>
                                    <span className={s.label}>Alto (mm)</span>
                                    <input
                                      className={s.input}
                                      inputMode="numeric"
                                      placeholder="2000"
                                      value={detalle.alto}
                                      onChange={(e) =>
                                        onUpdateAlcanceDetalle(
                                          detalle.id,
                                          "alto",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                </div>
                                <label className={s.field}>
                                  <span className={s.label}>Etiqueta visible</span>
                                  <input
                                    className={s.input}
                                    placeholder="Ej: 3 ventanas correderas 1500 x 2000"
                                    value={detalle.nombre}
                                    onChange={(e) =>
                                      onUpdateAlcanceDetalle(detalle.id, "nombre", e.target.value)
                                    }
                                  />
                                </label>
                                <label className={s.field}>
                                  <span className={s.label}>Nota opcional</span>
                                  <input
                                    className={s.input}
                                    placeholder="Ej: Con retiro de marco existente"
                                    value={detalle.descripcion}
                                    onChange={(e) =>
                                      onUpdateAlcanceDetalle(
                                        detalle.id,
                                        "descripcion",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              </>
                            ) : (
                              <>
                                <label className={s.field}>
                                  <span className={s.label}>Nombre</span>
                                  <input
                                    className={s.input}
                                    placeholder="Ej: Sellado perimetral"
                                    value={detalle.nombre}
                                    onChange={(e) =>
                                      onUpdateAlcanceDetalle(detalle.id, "nombre", e.target.value)
                                    }
                                  />
                                </label>
                                <label className={s.field}>
                                  <span className={s.label}>Descripcion</span>
                                  <input
                                    className={s.input}
                                    placeholder="Ej: Sellado interior y exterior"
                                    value={detalle.descripcion}
                                    onChange={(e) =>
                                      onUpdateAlcanceDetalle(
                                        detalle.id,
                                        "descripcion",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          className={s.btnGhost}
                          onClick={() => onAddAlcanceDetalle()}
                        >
                          + Agregar detalle
                        </button>
                      </section>
                    ) : null}

                    {quotePricingMode === "total_global" ? (
                      <section className={s.formSection}>
                        <div className={s.formSectionHead}>
                          <span className={s.formSectionEyebrow}>Precio final</span>
                          <strong>Define valor final en esta misma pantalla</strong>
                        </div>
                        <label className={s.field}>
                          <span className={s.label}>Precio final</span>
                          <input
                            className={`${s.input} ${s.stepTwoMobileFinalPriceInput}`}
                            inputMode="numeric"
                            placeholder="Ej: 600.000"
                            value={globalTotalInputValue}
                            onChange={(event) => onGlobalTotalClienteChange(event.target.value)}
                          />
                        </label>
                        <div className={s.field}>
                          <span className={s.label}>IVA</span>
                          <div className={s.ivaCompactRow}>
                            <button
                              type="button"
                              className={`${s.ivaCompactOption} ${
                                mostrarIva ? s.ivaCompactOptionActive : ""
                              }`}
                              onClick={mostrarIva ? undefined : onMostrarIvaChange}
                            >
                              <span className={s.ivaCompactLabel}>Incluye IVA</span>
                            </button>
                            <button
                              type="button"
                              className={`${s.ivaCompactOption} ${
                                !mostrarIva ? s.ivaCompactOptionActive : ""
                              }`}
                              onClick={mostrarIva ? onMostrarIvaChange : undefined}
                            >
                              <span className={s.ivaCompactLabel}>Sin IVA</span>
                            </button>
                          </div>
                        </div>
                      </section>
                    ) : null}

                    {quotePricingMode === "total_global" ? (
                      <section className={s.formSection}>
                        {!isInternalObservationOpen ? (
                          <button
                            type="button"
                            className={s.stepTwoMobileSecondaryLink}
                            onClick={() => setIsInternalObservationOpen(true)}
                          >
                            + Agregar observación interna
                          </button>
                        ) : (
                          <label className={s.field}>
                            <div className={s.stepTwoMobileBlockHeaderInline}>
                              <span className={s.label}>Observación interna</span>
                              <button
                                type="button"
                                className={s.stepTwoMobileSecondaryLink}
                                onClick={() => setIsInternalObservationOpen(false)}
                              >
                                Ocultar
                              </button>
                            </div>
                            <textarea
                              className={s.textarea}
                              maxLength={FIELD_LIMITS.observaciones}
                              placeholder="Uso interno. No sale en el PDF."
                              rows={3}
                              value={internalObservation}
                              onChange={(event) =>
                                onInternalObservationChange(event.target.value)
                              }
                            />
                          </label>
                        )}
                      </section>
                    ) : null}
                  </section>
                </>
              ) : (
                <>
              {isTrabajoPersonalizado ? (
                <section className={s.formSection}>
                  <div className={s.formSectionHead}>
                    <span className={s.formSectionEyebrow}>Descripcion del trabajo</span>
                    <strong>Redacta el alcance para el cliente</strong>
                  </div>
                  <div className={s.formGrid2}>
                    <label className={s.field}>
                      <span className={s.label}>Nombre del trabajo</span>
                      <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Ej: Cierre terraza a medida"
                        value={draft.nombre}
                        onChange={(event) => onNombreChange(event.target.value)}
                      />
                    </label>
                  </div>
                  <label className={s.field}>
                    <span className={s.label}>Descripcion para cliente</span>
                    <textarea
                      className={s.textarea}
                      maxLength={360}
                      placeholder="Ej: Cierre de terraza con 4 hojas, sistema especial, fabricacion a medida e instalacion incluida."
                      rows={4}
                      value={draft.descripcion}
                      onChange={(event) => onDescripcionChange(event.target.value)}
                    />
                  </label>
                </section>
              ) : null}

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

              {showSystemSelection ? (
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
              ) : null}

              {showSheetScheme ? (
                <section className={s.formSection}>
                  <div className={s.formSectionHead}>
                    <span className={s.formSectionEyebrow}>{compositionSectionLabel}</span>
                    <strong>Describe la composición</strong>
                  </div>

                  <div className={s.batchCountRow} role="group" aria-label={compositionSectionLabel}>
                    {sheetSchemeOptions.map((option) => (
                      <button
                        key={option}
                        className={`${s.batchCountButton} ${
                          draft.sheetScheme === option ? s.batchCountButtonActive : ""
                        }`}
                        onClick={() => onSheetSchemeChange(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  {sheetVariantOptions.length > 0 ? (
                    <div className={s.typeGroupGrid} role="group" aria-label="Variante del esquema">
                      {sheetVariantOptions.map((option) => (
                        <button
                          key={option}
                          className={`${s.typeChip} ${
                            draft.sheetVariant === option ? s.typeChipActive : ""
                          }`}
                          onClick={() => onSheetVariantChange(option)}
                          type="button"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {showCustomSchemeDescription ? (
                    <label className={s.field}>
                      <span className={s.label}>Describe la composición</span>
                      <input
                        className={s.input}
                        maxLength={120}
                        placeholder="Ej: fijo superior + lateral"
                        value={draft.customSchemeDescription}
                        onChange={(event) => onCustomSchemeDescriptionChange(event.target.value)}
                      />
                    </label>
                  ) : null}
                </section>
              ) : null}

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
              </>
              )}
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
                {showSystemSelection ? (
                <div className={s.groupSheetSummaryRow}>
                  <dt>Sistema</dt>
                  <dd>{draft.sistema}</dd>
                </div>
                ) : null}
                {draft.sheetScheme ? (
                  <div className={s.groupSheetSummaryRow}>
                    <dt>Composición</dt>
                    <dd>
                      {[draft.sheetScheme, draft.sheetVariant]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                ) : null}
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

"use client";

import { useState, useCallback } from "react";
import { LuChevronDown, LuCircleCheck, LuCopy, LuPencil, LuSave, LuTrash2 } from "react-icons/lu";

import { STATUS_COPY, VALIDEZ_OPTIONS } from "@/features/cotizaciones/new-quote/workflow-ui";
import { resolveWorkflowItemDisplayName } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { SaveIntent } from "../_hooks/use-paso-tres-guardado";
import { PasoTresDetalleFinal } from "./paso-tres-detalle-final";
import { PasoTresPanelAcciones } from "./paso-tres-panel-acciones";
import type { CotizacionWorkflowDraft, CotizacionWorkflowItem, CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import s from "../page.module.css";

type PasoTresResumenProps = {
  draft: CotizacionWorkflowDraft;
  subtotal: string;
  iva: string;
  flete: string;
  redondeoComercial: string;
  hasRedondeoComercial: boolean;
  ajusteComercial: string;
  hasAjusteComercial: boolean;
  total: string;
  quotePricingMode: QuotePricingMode;
  totalClienteManual: number | null;
  mostrarIva: boolean;
  globalError: string | null;
  savedRecord: CotizacionWorkflowRecord | null;
  lastSaveMode: keyof typeof STATUS_COPY | null;
  isMobileViewport: boolean;
  isSaving: boolean;
  saveIntent: SaveIntent | null;
  onDraftFleteChange: (value: string) => void;
  onGlobalTotalClienteChange: (value: string) => void;
  onMostrarIvaChange: () => void;
  onValidezChange: (value: string) => void;
  onObservacionesChange: (value: string) => void;
  onCondicionesPagoChange: (value: string) => void;
  onGoToStepTwo: () => void;
  onEditItem: (item: CotizacionWorkflowItem) => void;
  onDuplicateItem: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
  onSaveQuote: () => void;
  onSaveDraft: () => void;
  formatCurrencyInput: (value: string) => string;
};

function formatStepThreeMeasure(item: CotizacionWorkflowItem) {
  const width = item.ancho ? `${String(item.ancho).replace(/\.0+$/, "")}` : "-";
  const height = item.alto ? `${String(item.alto).replace(/\.0+$/, "")}` : "-";
  return `${width} x ${height} mm`;
}

function formatStepThreeCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStepThreeItemConfiguration(item: CotizacionWorkflowItem) {
  const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
  const parts = [
    meta.material,
    item.lineaComercial,
    meta.sistema,
    meta.configuracion,
    meta.sheetScheme,
    meta.sheetVariant,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : item.descripcion || "-";
}

function buildItemDetailLines(item: CotizacionWorkflowItem) {
  const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
  const lines: string[] = [];
  if (meta.material?.trim()) lines.push(`Material: ${meta.material.trim()}`);
  if (meta.sistema?.trim()) lines.push(`Sistema: ${meta.sistema.trim()}`);
  if (meta.configuracion?.trim()) lines.push(`Configuraci\u00f3n: ${meta.configuracion.trim()}`);
  if (item.vidrio?.trim()) lines.push(`Vidrio: ${item.vidrio.trim()}`);
  if (item.lineaComercial?.trim()) lines.push(`L\u00ednea: ${item.lineaComercial.trim()}`);
  if (meta.sheetScheme?.trim()) {
    const scheme = meta.sheetVariant?.trim()
      ? `${meta.sheetScheme.trim()} \u00b7 ${meta.sheetVariant.trim()}`
      : meta.sheetScheme.trim();
    lines.push(`Esquema: ${scheme}`);
  }
  if (item.descripcion?.trim() && item.descripcion.trim() !== getStepThreeItemConfiguration(item)) {
    lines.push(`Nota: ${item.descripcion.trim()}`);
  }
  return lines;
}

export function PasoTresResumen({
  draft,
  subtotal,
  iva,
  flete,
  redondeoComercial,
  hasRedondeoComercial,
  ajusteComercial,
  hasAjusteComercial,
  total,
  quotePricingMode,
  totalClienteManual,
  mostrarIva,
  globalError,
  savedRecord,
  lastSaveMode,
  isMobileViewport,
  isSaving,
  saveIntent,
  onDraftFleteChange,
  onGlobalTotalClienteChange,
  onMostrarIvaChange,
  onValidezChange,
  onObservacionesChange,
  onCondicionesPagoChange,
  onGoToStepTwo,
  onEditItem,
  onDuplicateItem,
  onRemoveItem,
  onSaveQuote,
  onSaveDraft,
  formatCurrencyInput,
}: PasoTresResumenProps) {
  const [isManualTotalOpen, setIsManualTotalOpen] = useState(
    totalClienteManual !== null && totalClienteManual !== undefined
  );
  const isSavingQuote = isSaving && saveIntent === "quote";
  const isSavingDraft = isSaving && saveIntent === "draft";
  const hasManualTotal =
    totalClienteManual !== null && totalClienteManual !== undefined && Number.isFinite(totalClienteManual);
  const manualTotalInputValue = hasManualTotal
    ? formatCurrencyInput(String(totalClienteManual))
    : "";

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = true;
      }
      return next;
    });
  }, []);

  if (!isMobileViewport) {
    const clienteNombre = draft.clienteNombre.trim() || "Cliente sin nombre";
    const obra = draft.obra.trim() || "Sin proyecto";
    const itemCount = `${draft.items.length} ${draft.items.length === 1 ? "componente" : "componentes"}`;

    return (
      <section className={s.rtShell}>
        <div className={s.rtLayout}>
          <div className={s.rtMain}>
            <header className={s.rtHeader}>
              <h2>Revisar y guardar</h2>
              <p>Confirma el detalle antes de generar el presupuesto.</p>
            </header>

            <section className={s.rtSection}>
              <div className={s.rtSectionTitle}>Detalle del presupuesto</div>
              <div className={s.rtTableWrap}>
                <table className={s.rtTable}>
                  <thead>
                    <tr>
                      <th className={s.rtThCode}>C&oacute;digo</th>
                      <th className={s.rtThNameConfig}>Pieza y configuraci&oacute;n</th>
                      <th className={s.rtThMeasure}>Medidas</th>
                      <th className={s.rtThQty}>Cantidad</th>
                      <th className={s.rtThValue}>Valor</th>
                      <th className={s.rtThActions}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.items.map((item) => {
                      const configText = getStepThreeItemConfiguration(item);
                      const isExpanded = Boolean(expandedItems[item.id]);

                      return (
                        <tr
                          key={item.id}
                          className={`${s.rtRow} ${isExpanded ? s.rtRowExpanded : ""} ${s.rtRowClickable}`}
                          onClick={() => toggleExpand(item.id)}
                        >
                          <td className={s.rtCode}>{item.codigo}</td>
                          <td className={s.rtNameConfig}>
                            <div className={s.rtNameConfigInner}>
                              <span className={s.rtItemName}>
                                {resolveWorkflowItemDisplayName({
                                  tipo: item.tipo,
                                  nombre: item.nombre,
                                  codigo: item.codigo,
                                })}
                              </span>
                              <span className={s.rtItemConfig} title={configText}>
                                {configText}
                              </span>
                            </div>
                            <span className={`${s.rtExpandChevron} ${isExpanded ? s.rtExpandChevronOpen : ""}`}>
                              <LuChevronDown size={16} aria-hidden />
                            </span>
                          </td>
                          <td className={s.rtMeasure}>{formatStepThreeMeasure(item)}</td>
                          <td className={s.rtQty}>{item.cantidad}</td>
                          <td className={s.rtValue}>
                            {formatStepThreeCurrency(item.precioTotal)}
                          </td>
                          <td>
                            <div className={s.rtRowActions}>
                              <button
                                type="button"
                                className={s.rtIconBtn}
                                onClick={(e) => { e.stopPropagation(); onEditItem(item); }}
                                aria-label={`Editar ${item.codigo}`}
                                title="Editar"
                              >
                                <LuPencil size={15} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className={s.rtIconBtn}
                                onClick={(e) => { e.stopPropagation(); onDuplicateItem(item); }}
                                aria-label={`Duplicar ${item.codigo}`}
                                title="Duplicar"
                              >
                                <LuCopy size={15} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className={`${s.rtIconBtn} ${s.rtIconBtnDanger}`}
                                onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                                aria-label={`Eliminar ${item.codigo}`}
                                title="Eliminar"
                              >
                                <LuTrash2 size={15} aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }).reduce<(React.ReactNode[])>((rows, mainRow, index) => {
                      const item = draft.items[index];
                      const isExpanded = Boolean(expandedItems[item.id]);
                      const detailLines = buildItemDetailLines(item);

                      rows.push(mainRow);

                      if (isExpanded && detailLines.length > 0) {
                        rows.push(
                          <tr key={`${item.id}-detail`} className={s.rtDetailRow}>
                            <td colSpan={6} className={s.rtDetailCell}>
                              <div className={s.rtDetailGrid}>
                                {detailLines.map((line, i) => (
                                  <span key={i} className={s.rtDetailLine}>{line}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return rows;
                    }, [])}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={s.rtSection}>
              <div className={s.rtSectionTitle}>Ajustes finales</div>

              <div className={s.rtAdjustSplit}>
                <div className={s.rtAdjustLeft}>
                  <div className={s.rtAdjustRow}>
                    <span className={s.rtFieldLabel}>Vigencia del presupuesto</span>
                    <div className={s.rtSegmented}>
                      {VALIDEZ_OPTIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`${s.rtSegmentedBtn} ${
                            draft.validez === value ? s.rtSegmentedBtnActive : ""
                          }`}
                          onClick={() => onValidezChange(value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className={s.rtAdjustRow}>
                    <span className={s.rtFieldLabel}>Flete opcional</span>
                    <div className={s.rtMoneyInputWrap}>
                      <span className={s.rtMoneyPrefix}>$</span>
                      <input
                        className={s.rtMoneyInput}
                        inputMode="numeric"
                        value={draft.flete > 0 ? formatCurrencyInput(String(draft.flete)) : ""}
                        onChange={(event) => onDraftFleteChange(event.target.value)}
                        placeholder="Sin flete"
                      />
                    </div>
                  </label>
                </div>

                <div className={s.rtAdjustRight}>
                  <div className={s.rtAdjustRow}>
                    <span className={s.rtFieldLabel}>¿Cómo se muestra el IVA?</span>
                    <div className={s.rtSegmented}>
                      <button
                        type="button"
                        className={`${s.rtSegmentedBtn} ${!mostrarIva ? s.rtSegmentedBtnActive : ""}`}
                        onClick={mostrarIva ? onMostrarIvaChange : undefined}
                      >
                        Precio incluye IVA
                      </button>
                      <button
                        type="button"
                        className={`${s.rtSegmentedBtn} ${mostrarIva ? s.rtSegmentedBtnActive : ""}`}
                        onClick={mostrarIva ? undefined : onMostrarIvaChange}
                      >
                        Agregar IVA al final
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <hr className={s.rtAdjustDivider} />

              <div className={s.rtAdjustSection}>
                <span className={s.rtAdjustSectionTitle}>Condiciones para el cliente</span>

                <label className={s.rtAdjustRow}>
                  <span className={s.rtFieldLabel}>Condiciones de pago</span>
                  <input
                    className={s.rtTextInput}
                    value={draft.condicionesDePago ?? ""}
                    onChange={(event) => onCondicionesPagoChange(event.target.value)}
                    placeholder="Ej: 50% anticipo, 50% contra entrega"
                  />
                  <span className={s.rtHint}>
                    Estas condiciones aparecerán en el PDF.
                  </span>
                </label>

                <label className={`${s.rtAdjustRow} ${s.rtAdjustWide}`}>
                  <span className={s.rtFieldLabel}>Observaciones para el cliente</span>
                  <textarea
                    className={s.rtTextarea}
                    value={draft.observaciones}
                    onChange={(event) => onObservacionesChange(event.target.value)}
                    placeholder="Ej.: instalación incluida, plazo estimado, condiciones especiales…"
                    rows={3}
                  />
                </label>
              </div>

              <hr className={s.rtAdjustDivider} />

              <div className={s.rtTotalAcordado}>
                <span className={s.rtAdjustSectionTitle}>Total acordado</span>

                {!isManualTotalOpen ? (
                  <div className={s.rtTotalCollapsed}>
                    <div className={s.rtTotalInfo}>
                      <span className={s.rtHint}>Suma de componentes</span>
                      <strong className={s.rtTotalAmount}>{total}</strong>
                      <span className={s.rtHintSecondary}>
                        El total se calcula con las piezas, IVA, flete y redondeo.
                      </span>
                    </div>
                    <button
                      type="button"
                      className={s.rtTotalAdjustBtn}
                      onClick={() => setIsManualTotalOpen(true)}
                    >
                      Ajustar total final
                    </button>
                  </div>
                ) : (
                  <div className={s.rtTotalExpanded}>
                    <div className={s.rtTotalExpandedSummary}>
                      <span className={s.rtHint}>Suma de componentes</span>
                      <span className={s.rtManualComponentSum}>{total}</span>
                    </div>

                    <label className={s.rtManualInputBlock}>
                      <span className={s.rtManualInputLabel}>
                        {!mostrarIva ? "Precio final acordado" : "Subtotal acordado · IVA no incluido"}
                      </span>
                      <div className={s.rtMoneyInputWrap}>
                        <span className={s.rtMoneyPrefix}>$</span>
                        <input
                          className={s.rtMoneyInput}
                          inputMode="numeric"
                          value={manualTotalInputValue}
                          onChange={(event) => onGlobalTotalClienteChange(event.target.value)}
                          placeholder="0"
                        />
                      </div>
                      {hasManualTotal && totalClienteManual !== null && (() => {
                        const computedNumber = Number(
                          String(total).replace(/[^0-9]/g, "")
                        );
                        const diff = totalClienteManual - computedNumber;
                        if (diff !== 0) {
                          const symbol = diff > 0 ? "+" : "";
                          const formattedDiff = formatStepThreeCurrency(diff);
                          return (
                            <span className={`${s.rtHint} ${diff > 0 ? s.rtHintPositive : s.rtHintNegative}`}>
                              Diferencia: {symbol}{formattedDiff} respecto a la suma original
                            </span>
                          );
                        }
                        return null;
                      })()}
                      <span className={s.rtHint}>
                        {!mostrarIva
                          ? "El monto ingresado sera el total que vera el cliente."
                          : "Ventora sumara el IVA y aplicara el redondeo comercial al final."}
                      </span>
                    </label>

                    <div className={s.rtManualBreakdown}>
                      <div className={s.rtManualBreakdownRow}>
                        <span>Subtotal neto</span>
                        <strong>{subtotal}</strong>
                      </div>
                      <div className={s.rtManualBreakdownRow}>
                        <span>IVA{!mostrarIva ? " (calculado inverso)" : ""}</span>
                        <strong>{iva}</strong>
                      </div>
                      <div className={s.rtManualBreakdownRow}>
                        <span>Flete</span>
                        <strong>{draft.flete > 0 ? flete : "—"}</strong>
                      </div>
                      {hasRedondeoComercial ? (
                        <div className={s.rtManualBreakdownRow}>
                          <span>Redondeo comercial</span>
                          <strong>{redondeoComercial}</strong>
                        </div>
                      ) : null}
                      <div className={`${s.rtManualBreakdownRow} ${s.rtManualBreakdownTotal}`}>
                        <span>Total final</span>
                        <strong>{total}</strong>
                      </div>
                      {hasAjusteComercial ? (
                        <div className={`${s.rtManualBreakdownRow} ${s.rtManualBreakdownDiff}`}>
                          <span>Ajuste comercial</span>
                          <strong>{ajusteComercial}</strong>
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className={s.rtTotalAdjustBtn}
                      onClick={() => {
                        setIsManualTotalOpen(false);
                        onGlobalTotalClienteChange("");
                      }}
                    >
                      Usar suma de componentes
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className={s.rtAside}>
            <section className={s.rtSummaryPanel} aria-label="Resumen del presupuesto">
              <h3 className={s.rtSummaryTitle}>Resumen del presupuesto</h3>

              <div className={s.rtSummaryClient}>
                <span className={s.rtSummaryClientEyebrow}>Cliente y obra</span>
                <strong className={s.rtSummaryClientName}>{clienteNombre}</strong>
                <span className={s.rtSummaryClientMeta}>{obra} · {itemCount}</span>
              </div>

              <div className={s.rtSummaryDivider} aria-hidden />
              <div className={s.rtSummaryRows}>
                <div className={s.rtSummaryRow}>
                  <span>Subtotal neto</span>
                  <strong>{subtotal}</strong>
                </div>
                <div className={s.rtSummaryRow}>
                  <span>IVA</span>
                  <strong>{mostrarIva ? iva : "$0"}</strong>
                </div>
                <div className={s.rtSummaryRow}>
                  <span>Flete</span>
                  <strong>{draft.flete > 0 ? flete : "—"}</strong>
                </div>
                {hasAjusteComercial ? (
                  <div className={s.rtSummaryRow}>
                    <span>Ajuste comercial</span>
                    <strong>{ajusteComercial}</strong>
                  </div>
                ) : null}
                {hasRedondeoComercial && !hasAjusteComercial ? (
                  <div className={s.rtSummaryRow}>
                    <span>Redondeo comercial</span>
                    <strong>{redondeoComercial}</strong>
                  </div>
                ) : null}
                {hasRedondeoComercial && hasAjusteComercial ? (
                  <div className={s.rtSummaryRow}>
                    <span>Redondeo comercial</span>
                    <strong>{redondeoComercial}</strong>
                  </div>
                ) : null}
              </div>
              <div className={s.rtSummaryDivider} aria-hidden />
              <div className={s.rtSummaryTotal}>
                <span>Total final</span>
                <strong>{total}</strong>
              </div>
              <div className={s.rtReadyBadge}>
                <LuCircleCheck size={15} aria-hidden />
                <span>Todo listo para guardar</span>
              </div>
              {globalError ? <div className={s.inlineError}>{globalError}</div> : null}
              <div className={s.rtActions}>
                <button className={s.btnPrimary} onClick={onSaveQuote} type="button" disabled={isSaving}>
                  <LuSave aria-hidden size={16} />
                  {isSavingQuote ? "Guardando..." : "Guardar presupuesto"}
                </button>
                <button className={s.rtBtnGhost} onClick={onSaveDraft} type="button" disabled={isSaving}>
                  {isSavingDraft ? "Guardando borrador..." : "Guardar borrador"}
                </button>
                <button className={s.rtBtnTertiary} type="button" onClick={onGoToStepTwo}>
                  Volver a editar
                </button>
              </div>
            </section>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className={`${s.card} ${s.summaryHero} ${isMobileViewport ? s.summaryHeroMobile : ""}`}>
      {!isMobileViewport ? (
        <div className={s.heroCardHeader}>
          <div>
            <div className={s.cardLabel}>Paso 3 / Resumen final</div>
            <h2 className={s.heroTitle}>Revisar y guardar</h2>
            <p className={s.heroSub}>Revisa el total, guarda el presupuesto y despues abre el PDF final.</p>
          </div>
          <div className={s.heroBadge}>Paso 3 de 3</div>
        </div>
      ) : null}

      <div className={s.finalStageGrid}>
        <PasoTresDetalleFinal
          draft={draft}
          subtotal={subtotal}
          iva={iva}
          flete={flete}
          redondeoComercial={redondeoComercial}
          hasRedondeoComercial={hasRedondeoComercial}
          total={total}
          quotePricingMode={quotePricingMode}
          totalClienteManual={totalClienteManual}
          mostrarIva={mostrarIva}
          savedRecord={savedRecord}
          isMobileViewport={isMobileViewport}
          onDraftFleteChange={onDraftFleteChange}
          onGlobalTotalClienteChange={onGlobalTotalClienteChange}
          onMostrarIvaChange={onMostrarIvaChange}
          onValidezChange={onValidezChange}
          validezOptions={VALIDEZ_OPTIONS}
          formatCurrencyInput={formatCurrencyInput}
        />
        <PasoTresPanelAcciones
          savedRecord={savedRecord}
          lastSaveMode={lastSaveMode}
          total={total}
          globalError={globalError}
          isMobileViewport={isMobileViewport}
          isSaving={isSaving}
          saveIntent={saveIntent}
          onGoToStepTwo={onGoToStepTwo}
          onSaveQuote={onSaveQuote}
          onSaveDraft={onSaveDraft}
        />
      </div>
    </section>
  );
}

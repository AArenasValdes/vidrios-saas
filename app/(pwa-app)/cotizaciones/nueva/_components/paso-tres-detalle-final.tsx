"use client";

import { useState } from "react";
import { LuChevronDown, LuTruck } from "react-icons/lu";

import type { CotizacionWorkflowDraft, CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

import s from "../page.module.css";

type PasoTresDetalleFinalProps = {
  draft: CotizacionWorkflowDraft;
  subtotal: string;
  iva: string;
  flete: string;
  total: string;
  quotePricingMode: QuotePricingMode;
  totalClienteManual: number | null;
  mostrarIva: boolean;
  savedRecord: CotizacionWorkflowRecord | null;
  isMobileViewport: boolean;
  onDraftFleteChange: (value: string) => void;
  onGlobalTotalClienteChange: (value: string) => void;
  onMostrarIvaChange: () => void;
  onValidezChange: (value: string) => void;
  validezOptions: string[];
  formatCurrencyInput: (value: string) => string;
};

export function PasoTresDetalleFinal({
  draft,
  subtotal,
  iva,
  flete,
  total,
  quotePricingMode,
  totalClienteManual,
  mostrarIva,
  savedRecord,
  isMobileViewport,
  onDraftFleteChange,
  onGlobalTotalClienteChange,
  onMostrarIvaChange,
  onValidezChange,
  validezOptions,
  formatCurrencyInput,
}: PasoTresDetalleFinalProps) {
  const [showFreightEditor, setShowFreightEditor] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);

  const buildItemBadge = (code: string, index: number) => {
    const normalized = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (normalized.length >= 2) return normalized.slice(0, 2);
    return `I${index + 1}`;
  };

  const buildItemMeta = (item: CotizacionWorkflowDraft["items"][number]) => {
    const width = item.ancho ? String(item.ancho).replace(/\.0+$/, "") : "-";
    const height = item.alto ? String(item.alto).replace(/\.0+$/, "") : "-";
    const unit = item.unidad?.trim() || "u";
    return `${width}x${height} - ${item.cantidad} ${unit}`;
  };

  const visibleItems = showAllItems ? draft.items : draft.items.slice(0, 3);
  const hasHiddenItems = draft.items.length > 3;
  const isGlobal = quotePricingMode === "total_global";
  const globalTotalInputValue =
    totalClienteManual !== null && totalClienteManual !== undefined
      ? formatCurrencyInput(String(totalClienteManual))
      : "";

  const globalPricingEditor = (
    <section className={s.summaryAdjustmentCard}>
      <div className={s.summaryAdjustmentHeader}>
        <div>
          <span className={s.summaryAdjustmentEyebrow}>Total del trabajo</span>
          <strong>Total a cobrar al cliente</strong>
        </div>
      </div>
      <div className={s.formGrid2}>
        <label className={s.field}>
          <span className={s.label}>Total a cobrar al cliente</span>
          <div className={s.moneyInputWrap}>
            <span className={s.moneyPrefix}>CLP</span>
            <input
              className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
              inputMode="numeric"
              value={globalTotalInputValue}
              onChange={(event) => onGlobalTotalClienteChange(event.target.value)}
              placeholder="0"
            />
          </div>
          <span className={s.helpText}>Este es el total final que vera el cliente.</span>
        </label>
        <div className={s.field}>
          <span className={s.label}>IVA</span>
          <div className={s.ivaTogglePillLight}>
            <button
              type="button"
              className={`${s.ivaPillOptionLight} ${mostrarIva ? s.ivaPillActiveLight : ""}`}
              onClick={mostrarIva ? undefined : onMostrarIvaChange}
            >
              Con IVA incluido
            </button>
            <button
              type="button"
              className={`${s.ivaPillOptionLight} ${!mostrarIva ? s.ivaPillActiveLight : ""}`}
              onClick={mostrarIva ? onMostrarIvaChange : undefined}
            >
              Sin IVA
            </button>
          </div>
          <span className={s.helpText}>
            {mostrarIva ? "El IVA se separa desde el total final." : "El total final se guarda sin IVA."}
          </span>
        </div>
      </div>
    </section>
  );

  const freightEditor = (
    <section className={s.stepThreeFreightCard}>
      <div className={s.stepThreeFreightRow}>
        <div className={s.stepThreeFreightMain}>
          <span className={s.stepThreeFreightIcon}>
            <LuTruck aria-hidden />
          </span>
          <div className={s.stepThreeFreightText}>
            <strong>Flete</strong>
            <span>{draft.flete > 0 ? flete : "No incluido"}</span>
          </div>
        </div>
        <button
          type="button"
          className={s.stepThreeFreightToggle}
          onClick={() => setShowFreightEditor((current) => !current)}
        >
          Editar <LuChevronDown className={showFreightEditor ? s.stepThreeFreightToggleOpen : ""} aria-hidden />
        </button>
      </div>

      {showFreightEditor ? (
        <label className={s.field}>
          <span className={s.label}>Valor del flete</span>
          <div className={s.moneyInputWrap}>
            <span className={s.moneyPrefix}>CLP</span>
            <input
              className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
              inputMode="numeric"
              value={draft.flete > 0 ? formatCurrencyInput(String(draft.flete)) : ""}
              onChange={(event) => onDraftFleteChange(event.target.value)}
              placeholder="0"
            />
          </div>
        </label>
      ) : null}
    </section>
  );

  const totalsPanel = (
    <div className={s.totalPanel}>
      {!isGlobal ? (
        <>
          <div className={s.totalRow}>
            <span>Subtotal</span>
            <strong>{subtotal}</strong>
          </div>
          <div className={s.totalRow}>
            <span>IVA 19%</span>
            <strong>{iva}</strong>
          </div>
          {draft.flete > 0 ? (
            <div className={s.totalRow}>
              <span>Flete</span>
              <strong>{flete}</strong>
            </div>
          ) : null}
        </>
      ) : (
        <div className={s.totalRow}>
          <span>{mostrarIva ? "IVA incluido" : "Sin IVA"}</span>
          <strong>{iva}</strong>
        </div>
      )}
      <div className={s.totalGrand}>
        <span>Total</span>
        <strong>{total}</strong>
      </div>
    </div>
  );

  const itemsCard = (
    <section className={s.stepThreeItemsCard}>
      <div className={s.stepThreeCardHeader}>
        <span className={s.stepThreeCardEyebrow}>
          {isGlobal ? "TRABAJOS" : "COMPONENTES"} ({draft.items.length})
        </span>
        <strong>{isGlobal ? total : subtotal}</strong>
      </div>
      <div className={s.stepThreeItemList}>
        {visibleItems.map((item, index) => (
          <article key={item.id} className={s.stepThreeItemRow}>
            <span className={s.stepThreeItemBadge}>{buildItemBadge(item.codigo, index)}</span>
            <div className={s.stepThreeItemBody}>
              <strong>{item.nombre || item.tipo || item.codigo}</strong>
              <span>{buildItemMeta(item)}</span>
            </div>
            {!isGlobal ? (
              <strong className={s.stepThreeItemPrice}>{formatMoney(item.precioTotal)}</strong>
            ) : null}
          </article>
        ))}
      </div>
      {hasHiddenItems ? (
        <button
          type="button"
          className={s.stepThreeItemsLink}
          onClick={() => setShowAllItems((current) => !current)}
        >
          {showAllItems ? "Ocultar componentes" : "Ver todos los componentes"}
        </button>
      ) : null}
    </section>
  );

  if (isMobileViewport) {
    return (
      <div className={s.finalStageMain}>
        <section className={s.stepThreeSummaryCard}>
          <div className={s.stepThreeSummaryRow}>
            <span>CLIENTE</span>
            <strong>{draft.clienteNombre || "-"}</strong>
          </div>
          <div className={s.stepThreeSummaryRow}>
            <span>PROYECTO</span>
            <strong>{draft.obra || "-"}</strong>
          </div>
          <div className={s.stepThreeSummaryRow}>
            <span>VALIDEZ</span>
            <div className={s.stepThreeValidityEditor}>
              <div className={s.selectWrap}>
                <select
                  className={`${s.input} ${s.stepThreeValiditySelect}`}
                  value={draft.validez}
                  onChange={(event) => onValidezChange(event.target.value)}
                >
                  {validezOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {itemsCard}
        {isGlobal ? globalPricingEditor : freightEditor}
        {totalsPanel}
      </div>
    );
  }

  return (
    <div className={s.finalStageMain}>
      <div className={s.summaryGrid}>
        <div className={s.summaryBlock}>
          <span>Cliente</span>
          <strong>{draft.clienteNombre || "-"}</strong>
        </div>
        <div className={s.summaryBlock}>
          <span>Proyecto</span>
          <strong>{draft.obra || "-"}</strong>
        </div>
        <div className={s.summaryBlock}>
          <span>{isGlobal ? "Trabajos" : "Componentes"}</span>
          <strong>{draft.items.length}</strong>
        </div>
        <div className={s.summaryBlock}>
          <span>Validez</span>
          <div className={s.selectWrap}>
            <select
              className={`${s.input} ${s.stepThreeValiditySelectDesktop}`}
              value={draft.validez}
              onChange={(event) => onValidezChange(event.target.value)}
            >
              {validezOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={s.summaryAdjustments}>
        {isGlobal ? globalPricingEditor : (
          <div className={s.summaryAdjustmentCard}>
            <div className={s.summaryAdjustmentHeader}>
              <div>
                <span className={s.summaryAdjustmentEyebrow}>Ajuste final</span>
                <strong>Flete</strong>
              </div>
              <span className={s.summaryAdjustmentValue}>{draft.flete > 0 ? flete : "No incluido"}</span>
            </div>
            <label className={s.field}>
              <span className={s.label}>Valor del flete</span>
              <div className={s.moneyInputWrap}>
                <span className={s.moneyPrefix}>CLP</span>
                <input
                  className={`${s.input} ${s.inputMono} ${s.moneyInput}`}
                  inputMode="numeric"
                  value={draft.flete > 0 ? formatCurrencyInput(String(draft.flete)) : ""}
                  onChange={(event) => onDraftFleteChange(event.target.value)}
                  placeholder="0"
                />
              </div>
              <span className={s.helpText}>Solo aparece en el PDF si es mayor a 0.</span>
            </label>
          </div>
        )}
      </div>

      {totalsPanel}

      {savedRecord ? (
        <section className={s.mobileFinalReadyCard}>
          <div className={s.mobileFinalReadyEyebrow}>Presupuesto guardado</div>
          <strong>Tu presupuesto ya esta listo para revisarlo.</strong>
          <p>
            No abrimos el PDF automatico para que esta pantalla siga simple y estable. Usa los
            botones de abajo para revisar, compartir o descargar.
          </p>
        </section>
      ) : (
        <section className={s.previewPlaceholder}>
          <div className={s.previewPlaceholderTitle}>Guarda primero para ver el resultado final</div>
          <p className={s.previewPlaceholderText}>
            Apenas guardes, se habilitan el PDF y la vista final.
          </p>
        </section>
      )}
    </div>
  );
}

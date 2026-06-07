"use client";

import { LuFileCheck2, LuSave } from "react-icons/lu";

import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

import s from "../page.module.css";

type ResumenDesktopLateralProps = {
  draft: CotizacionWorkflowDraft;
  totalItems: number;
  subtotal: string;
  iva: string;
  redondeoComercial: string;
  hasRedondeoComercial: boolean;
  total: string;
  mostrarIva: boolean;
  selectedClientMode: "Existente" | "Nuevo";
  isSaving: boolean;
  onSaveDraft: () => void;
  onSaveQuote: () => void;
};

export function ResumenDesktopLateral({
  draft,
  totalItems,
  subtotal,
  iva,
  redondeoComercial,
  hasRedondeoComercial,
  total,
  mostrarIva,
  selectedClientMode,
  isSaving,
  onSaveDraft,
  onSaveQuote,
}: ResumenDesktopLateralProps) {
  return (
    <aside className={s.sideCol}>
      <section className={s.sideCard}>
        <div className={s.sideTitle}>Resumen rapido</div>
        <div className={s.sideRow}>
          <span>Cliente</span>
          <strong>{draft.clienteNombre || "-"}</strong>
        </div>
        <div className={s.sideRow}>
          <span>Modo cliente</span>
          <strong>{selectedClientMode}</strong>
        </div>
        <div className={s.sideRow}>
          <span>Proyecto</span>
          <strong>{draft.obra || "-"}</strong>
        </div>
        <div className={s.sideDivider} />
        <div className={s.sideRow}>
          <span>Componentes</span>
          <strong>{totalItems}</strong>
        </div>
        <div className={s.sideRow}>
          <span>{mostrarIva ? "Subtotal neto" : "Precios finales"}</span>
          <strong>{subtotal}</strong>
        </div>
        {mostrarIva ? (
          <div className={s.sideRow}>
            <span>IVA 19%</span>
            <strong>{iva}</strong>
          </div>
        ) : null}
        {hasRedondeoComercial ? (
          <div className={s.sideRow}>
            <span>Redondeo comercial</span>
            <strong>{redondeoComercial}</strong>
          </div>
        ) : null}
        <div className={s.sideTotal}>
          <span>Total final</span>
          <strong>{total}</strong>
        </div>
      </section>

      <section className={s.sideCard}>
        <div className={s.sideTitle}>Acciones</div>
        <div className={s.actionCluster}>
          <button className={s.btnGhost} onClick={onSaveDraft} type="button" disabled={isSaving}>
            <LuSave aria-hidden /> Guardar borrador
          </button>
          <button className={s.btnPrimary} onClick={onSaveQuote} type="button" disabled={isSaving}>
            <LuFileCheck2 aria-hidden /> Guardar presupuesto
          </button>
        </div>
      </section>
    </aside>
  );
}

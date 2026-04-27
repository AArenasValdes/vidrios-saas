"use client";

import { LuFileCheck2, LuSave } from "react-icons/lu";

import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

import s from "../page.module.css";

type ResumenDesktopLateralProps = {
  draft: CotizacionWorkflowDraft;
  totalItems: number;
  subtotal: string;
  iva: string;
  total: string;
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
  total,
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
          <span>Subtotal</span>
          <strong>{subtotal}</strong>
        </div>
        <div className={s.sideRow}>
          <span>IVA</span>
          <strong>{iva}</strong>
        </div>
        <div className={s.sideTotal}>
          <span>Total</span>
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

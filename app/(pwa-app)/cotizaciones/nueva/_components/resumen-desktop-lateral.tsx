"use client";

import { LuArrowRight } from "react-icons/lu";

import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

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
  quotePricingMode: QuotePricingMode;
  selectedClientMode: "Existente" | "Nuevo";
  isSaving: boolean;
  onSaveDraft: () => void;
  onSaveQuote: () => void;
  onContinue: () => void;
};

export function ResumenDesktopLateral({
  draft,
  totalItems,
  total,
  isSaving,
  onSaveDraft,
  onContinue,
}: ResumenDesktopLateralProps) {
  const clienteNombre = draft.clienteNombre.trim();
  const obra = draft.obra.trim();
  const hasClient = clienteNombre.length > 0;
  const hasWork = obra.length > 0;
  const canContinue = !isSaving;
  const canSaveDraft = !isSaving;
  const totalLabel = totalItems > 0 ? total : "Por definir";

  return (
    <aside className={s.desktopSideSummary}>
      <section className={s.desktopSideSummaryCard} aria-label="Resumen de la cotización">
        <div className={s.desktopSideSummaryTitle}>Resumen</div>

        <div className={s.desktopSideSummaryRows}>
          <div className={s.desktopSideSummaryRow}>
            <span>Cliente</span>
            <strong className={!hasClient ? s.desktopSideSummaryMuted : undefined}>
              {hasClient ? clienteNombre : "Cotización rápida"}
            </strong>
          </div>
          <div className={s.desktopSideSummaryRow}>
            <span>Trabajo</span>
            <strong className={!hasWork ? s.desktopSideSummaryMuted : undefined}>
              {hasWork ? obra : "Se completa al continuar"}
            </strong>
          </div>
          <div className={s.desktopSideSummaryRow}>
            <span>Componentes</span>
            <strong>{totalItems}</strong>
          </div>
          <div className={`${s.desktopSideSummaryRow} ${s.desktopSideSummaryRowTotal}`}>
            <span>Total</span>
            <strong className={totalItems === 0 ? s.desktopSideSummaryMuted : undefined}>
              {totalLabel}
            </strong>
          </div>
          <div className={s.desktopSideSummaryRow}>
            <span>Estado</span>
            <strong className={s.desktopSideSummaryStatus}>Borrador</strong>
          </div>
        </div>

        <div className={s.desktopSideSummaryActions}>
          <button
            className={s.desktopSideSummaryButton}
            onClick={onContinue}
            type="button"
            disabled={!canContinue}
          >
            Continuar al presupuesto <LuArrowRight aria-hidden />
          </button>
          <button
            className={s.desktopSideSummaryButtonGhost}
            onClick={onSaveDraft}
            type="button"
            disabled={!canSaveDraft}
          >
            {isSaving ? "Guardando..." : "Guardar borrador"}
          </button>
        </div>

        {!hasClient || !hasWork ? (
          <p className={s.desktopSideSummaryHelp}>
            Puedes cotizar sin cliente. Si no defines nombre o trabajo, se completan al
            continuar.
          </p>
        ) : null}
      </section>
    </aside>
  );
}

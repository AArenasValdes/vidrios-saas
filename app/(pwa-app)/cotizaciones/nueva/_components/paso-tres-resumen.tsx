"use client";

import { STATUS_COPY, VALIDEZ_OPTIONS } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { SaveIntent } from "../_hooks/use-paso-tres-guardado";
import { PasoTresDetalleFinal } from "./paso-tres-detalle-final";
import { PasoTresPanelAcciones } from "./paso-tres-panel-acciones";
import type { CotizacionWorkflowDraft, CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

import s from "../page.module.css";

type PasoTresResumenProps = {
  draft: CotizacionWorkflowDraft;
  subtotal: string;
  iva: string;
  flete: string;
  total: string;
  globalError: string | null;
  savedRecord: CotizacionWorkflowRecord | null;
  lastSaveMode: keyof typeof STATUS_COPY | null;
  isMobileViewport: boolean;
  isSaving: boolean;
  saveIntent: SaveIntent | null;
  onDraftFleteChange: (value: string) => void;
  onValidezChange: (value: string) => void;
  onGoToStepTwo: () => void;
  onSaveQuote: () => void;
  onSaveDraft: () => void;
  formatCurrencyInput: (value: string) => string;
};

export function PasoTresResumen({
  draft,
  subtotal,
  iva,
  flete,
  total,
  globalError,
  savedRecord,
  lastSaveMode,
  isMobileViewport,
  isSaving,
  saveIntent,
  onDraftFleteChange,
  onValidezChange,
  onGoToStepTwo,
  onSaveQuote,
  onSaveDraft,
  formatCurrencyInput,
}: PasoTresResumenProps) {
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
          total={total}
          savedRecord={savedRecord}
          isMobileViewport={isMobileViewport}
          onDraftFleteChange={onDraftFleteChange}
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

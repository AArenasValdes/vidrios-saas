"use client";

import Link from "next/link";
import { LuBuilding2, LuDownload, LuFileCheck2, LuPencil, LuPlus, LuSave } from "react-icons/lu";

import { STATUS_COPY } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowRecord } from "@/features/cotizaciones/types/cotizacion-workflow";

import type { SaveIntent } from "../_hooks/use-paso-tres-guardado";
import s from "../page.module.css";

type PasoTresPanelAccionesProps = {
  savedRecord: CotizacionWorkflowRecord | null;
  lastSaveMode: keyof typeof STATUS_COPY | null;
  total: string;
  globalError: string | null;
  isMobileViewport: boolean;
  isSaving: boolean;
  saveIntent: SaveIntent | null;
  onGoToStepTwo: () => void;
  onSaveQuote: () => void;
  onSaveDraft: () => void;
};

export function PasoTresPanelAcciones({
  savedRecord,
  lastSaveMode,
  total,
  globalError,
  isMobileViewport,
  isSaving,
  saveIntent,
  onGoToStepTwo,
  onSaveQuote,
  onSaveDraft,
}: PasoTresPanelAccionesProps) {
  const isSavingQuote = isSaving && saveIntent === "quote";
  const isSavingDraft = isSaving && saveIntent === "draft";

  if (isMobileViewport && !savedRecord) {
    return (
      <aside className={`${s.finalActionCard} ${s.stepThreeActionCardMobile} ${s.stepThreeStickyActionBar}`}>
        {isSaving ? (
          <div className={s.finalLoadingNotice} aria-live="polite">
            <div className={s.inlineLoadingDots} aria-hidden>
              <span />
              <span />
              <span />
            </div>
            <div>
              <strong>{isSavingQuote ? "Guardando cotizacion..." : "Guardando borrador..."}</strong>
              <span>
                {isSavingQuote
                  ? "No cierres esta pantalla. Apenas termine, veras el resumen del PDF."
                  : "Estamos dejando el borrador listo para seguir despues."}
              </span>
            </div>
          </div>
        ) : null}
        {globalError ? <div className={s.inlineError}>{globalError}</div> : null}

        <button
          className={`${s.btnPrimary} ${s.stepThreePrimaryButton}`}
          onClick={onSaveQuote}
          type="button"
          disabled={isSaving}
        >
          <LuFileCheck2 aria-hidden />
          {isSavingQuote ? "Guardando..." : "Crear cotización y abrir PDF"}
        </button>

        <button
          className={s.stepThreeDraftTextButton}
          onClick={onSaveDraft}
          type="button"
          disabled={isSaving}
        >
          <LuSave aria-hidden /> {isSavingDraft ? "Guardando..." : "Guardar como borrador"}
        </button>
      </aside>
    );
  }

  return (
    <aside className={s.finalActionCard}>
      {savedRecord && lastSaveMode ? (
        <>
          <div className={s.savedBadge}>
            <LuFileCheck2 size={16} aria-hidden />
            <div>
              <strong>Cotizacion guardada.</strong>
              <span>
                Abre el PDF profesional para revisarlo, descargarlo o compartirlo por WhatsApp.
              </span>
            </div>
          </div>
          <div className={s.savedMeta}>
            <span>{savedRecord.codigo}</span>
            <strong>{total}</strong>
          </div>
          <div className={s.actionCluster}>
            <Link
              className={s.btnPrimary}
              href={`/print/cotizaciones/${savedRecord.id}`}
              target="_blank"
            >
              <LuDownload aria-hidden /> Ver PDF profesional
            </Link>
            <Link className={s.btnGhost} href="/configuracion/empresa?inicio=1">
              <LuBuilding2 aria-hidden /> Agregar mis datos de empresa
            </Link>
            <Link className={s.btnGhost} href="/cotizaciones/nueva">
              <LuPlus aria-hidden /> Crear otra cotizacion
            </Link>
            <button className={s.btnGhost} type="button" onClick={onGoToStepTwo}>
              <LuPencil aria-hidden /> Editar cotizacion
            </button>
          </div>
          <p className={s.actionHintCard}>
            Desde el PDF puedes revisar la hoja final y luego descargarla o compartirla por WhatsApp.
          </p>
        </>
      ) : (
        <>
          <div className={s.finalActionTitle}>Guardar presupuesto</div>
          <p className={s.finalActionText}>
            Guarda primero. Despues podras ver el PDF y enviarlo por WhatsApp.
          </p>
          {isSaving ? (
            <div className={s.finalLoadingNotice} aria-live="polite">
              <div className={s.inlineLoadingDots} aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>
                  {isSavingQuote ? "Guardando cotizacion..." : "Guardando borrador..."}
                </strong>
                <span>
                  {isSavingQuote
                    ? "No cierres esta pantalla. Apenas termine, veras el resumen del PDF."
                    : "Estamos dejando el borrador listo para seguir despues."}
                </span>
              </div>
            </div>
          ) : null}
          {globalError ? <div className={s.inlineError}>{globalError}</div> : null}
          <div className={s.actionCluster}>
            <button className={s.btnPrimary} onClick={onSaveQuote} type="button" disabled={isSaving}>
              <LuFileCheck2 aria-hidden />{" "}
              {isSavingQuote
                ? "Guardando..."
                : isMobileViewport
                  ? "Guardar y abrir PDF"
                  : "Guardar presupuesto"}
            </button>
            <button className={s.btnGhost} onClick={onSaveDraft} type="button" disabled={isSaving}>
              <LuSave aria-hidden /> {isSavingDraft ? "Guardando borrador..." : "Guardar borrador"}
            </button>
            <button className={s.btnGhost} type="button" onClick={onGoToStepTwo}>
              <LuPencil aria-hidden /> Volver a editar
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

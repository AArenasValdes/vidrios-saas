"use client";

import Link from "next/link";
import { LuArrowLeft, LuDownload, LuFileCheck2, LuFolderOpen, LuPencil, LuPhone, LuSave, LuUserRound } from "react-icons/lu";

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
      <aside className={`${s.finalActionCard} ${s.stepThreeActionCardMobile}`}>
        {isSaving ? (
          <div className={s.finalLoadingNotice} aria-live="polite">
            <div className={s.inlineLoadingDots} aria-hidden>
              <span />
              <span />
              <span />
            </div>
            <div>
              <strong>{isSavingQuote ? "Guardando y abriendo PDF..." : "Guardando borrador..."}</strong>
              <span>
                {isSavingQuote
                  ? "No cierres esta pantalla. Apenas termine, abrimos el visor."
                  : "Estamos dejando el borrador listo para seguir despues."}
              </span>
            </div>
          </div>
        ) : null}
        {globalError ? <div className={s.inlineError}>{globalError}</div> : null}

        <button className={`${s.btnPrimary} ${s.stepThreePrimaryButton}`} onClick={onSaveQuote} type="button" disabled={isSaving}>
          <LuFileCheck2 aria-hidden />
          {isSavingQuote ? "Guardando y abriendo PDF..." : "Guardar y abrir PDF"}
        </button>

        <p className={s.stepThreeActionHint}>
          Guarda primero para generar el PDF y habilitar el envio por WhatsApp.
        </p>

        <div className={s.stepThreeSecondaryActions}>
          <button className={`${s.btnGhost} ${s.stepThreeSecondaryButton}`} type="button" onClick={onGoToStepTwo} disabled={isSaving}>
            <LuArrowLeft aria-hidden /> Volver
          </button>
          <button className={`${s.btnGhost} ${s.stepThreeSecondaryButton}`} onClick={onSaveDraft} type="button" disabled={isSaving}>
            <LuSave aria-hidden /> {isSavingDraft ? "Guardando..." : "Guardar borrador"}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={s.finalActionCard}>
      {savedRecord && lastSaveMode ? (
        <>
          <div className={s.savedBadge}>
            <LuUserRound size={16} aria-hidden />
            <div>
              <strong>{STATUS_COPY[lastSaveMode].title}</strong>
              <span>{STATUS_COPY[lastSaveMode].description}</span>
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
              target={isMobileViewport ? undefined : "_blank"}
            >
              <LuPhone aria-hidden /> Abrir PDF
            </Link>
            <Link className={s.btnGhost} href={`/print/cotizaciones/${savedRecord.id}`} target="_blank">
              <LuDownload aria-hidden /> Descargar PDF
            </Link>
            <Link className={s.btnGhost} href={`/cotizaciones/${savedRecord.id}`}>
              <LuFolderOpen aria-hidden /> Ver detalle
            </Link>
            <button className={s.btnGhost} type="button" onClick={onGoToStepTwo}>
              <LuPencil aria-hidden /> Editar componentes
            </button>
          </div>
          <p className={s.actionHintCard}>
            Desde el PDF puedes revisar la hoja final y luego compartir por WhatsApp o descargar.
          </p>
        </>
      ) : (
        <>
          <div className={s.finalActionTitle}>Guardar presupuesto</div>
          <p className={s.finalActionText}>
            Guarda primero. Despues se habilitan el PDF y el envio por WhatsApp.
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
                  {isSavingQuote ? "Guardando y abriendo PDF..." : "Guardando borrador..."}
                </strong>
                <span>
                  {isSavingQuote
                    ? "No cierres esta pantalla. Apenas termine, abrimos el visor."
                    : "Estamos dejando el borrador listo para seguir despues."}
                </span>
              </div>
            </div>
          ) : null}
          {globalError ? <div className={s.inlineError}>{globalError}</div> : null}
          <div className={s.actionCluster}>
            <button className={s.btnPrimary} onClick={onSaveQuote} type="button" disabled={isSaving}>
              <LuFileCheck2 aria-hidden />{" "}
              {isSavingQuote ? "Guardando y abriendo PDF..." : "Guardar y abrir PDF"}
            </button>
            <button className={s.btnGhost} onClick={onSaveDraft} type="button" disabled={isSaving}>
              <LuSave aria-hidden /> {isSavingDraft ? "Guardando borrador..." : "Guardar borrador"}
            </button>
            <button className={s.btnGhost} type="button" onClick={onGoToStepTwo}>
              <LuPencil aria-hidden /> Volver a componentes
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

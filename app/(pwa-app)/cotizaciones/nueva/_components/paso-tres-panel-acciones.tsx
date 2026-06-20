"use client";

import Link from "next/link";
<<<<<<< HEAD
import {
  LuArrowLeft,
  LuBuilding2,
  LuDownload,
  LuFileCheck2,
  LuPencil,
  LuPlus,
  LuSave,
  LuUserRound,
} from "react-icons/lu";
=======
import { LuArrowLeft, LuDownload, LuFileCheck2, LuPencil, LuPlus, LuSave, LuUserRound } from "react-icons/lu";
>>>>>>> codex/TWA-Android

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
              <strong>{isSavingQuote ? "Guardando cotizacion..." : "Guardando borrador..."}</strong>
              <span>
                {isSavingQuote
<<<<<<< HEAD
                  ? "No cierres esta pantalla. Apenas termine, veras el resultado."
=======
                  ? "No cierres esta pantalla. Apenas termine, veras el resumen del PDF."
>>>>>>> codex/TWA-Android
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
          {isSavingQuote ? "Guardando..." : "Guardar y ver resultado"}
        </button>

        <p className={s.stepThreeActionHint}>
          Guarda primero para generar el PDF profesional.
        </p>

        <div className={s.stepThreeSecondaryActions}>
          <button
            className={`${s.btnGhost} ${s.stepThreeSecondaryButton}`}
            type="button"
            onClick={onGoToStepTwo}
            disabled={isSaving}
          >
            <LuArrowLeft aria-hidden /> Volver
          </button>
          <button
            className={`${s.btnGhost} ${s.stepThreeSecondaryButton}`}
            onClick={onSaveDraft}
            type="button"
            disabled={isSaving}
          >
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
              <strong>Asi se vera tu cotizacion profesional.</strong>
              <span>
<<<<<<< HEAD
                Puedes agregar tu logo, telefono y datos de empresa para que el PDF quede
                listo para enviar.
=======
                Puedes agregar tu logo, telefono y datos de empresa para que el PDF quede listo para enviar.
>>>>>>> codex/TWA-Android
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
              href="/configuracion/empresa?inicio=1"
            >
<<<<<<< HEAD
              <LuDownload aria-hidden /> Descargar PDF de prueba
            </Link>
            <Link className={s.btnGhost} href="/configuracion/empresa?inicio=1">
              <LuBuilding2 aria-hidden /> Agregar mis datos de empresa
            </Link>
            <Link className={s.btnGhost} href="/cotizaciones/nueva">
              <LuPlus aria-hidden /> Crear otra cotizacion
            </Link>
          </div>
          <p className={s.actionHintCard}>
            Desde el PDF puedes revisar la hoja final y luego compartir por WhatsApp.
=======
              <LuUserRound aria-hidden /> Agregar mis datos de empresa
            </Link>
            <Link className={s.btnGhost} href={`/print/cotizaciones/${savedRecord.id}`} target="_blank">
              <LuDownload aria-hidden /> Descargar PDF de prueba
            </Link>
            <Link className={s.btnGhost} href="/cotizaciones/nueva?step=2&onboarding_preview=1">
              <LuPlus aria-hidden /> Crear otra cotizacion
            </Link>
            <button className={s.btnGhost} type="button" onClick={onGoToStepTwo}>
              <LuPencil aria-hidden /> Editar cotizacion
            </button>
          </div>
          <p className={s.actionHintCard}>
            Desde el PDF puedes revisar la hoja final y luego descargarla o compartirla por WhatsApp.
>>>>>>> codex/TWA-Android
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
<<<<<<< HEAD
                    ? "No cierres esta pantalla. Apenas termine, veras el resultado."
=======
                    ? "No cierres esta pantalla. Apenas termine, veras el resumen del PDF."
>>>>>>> codex/TWA-Android
                    : "Estamos dejando el borrador listo para seguir despues."}
                </span>
              </div>
            </div>
          ) : null}
          {globalError ? <div className={s.inlineError}>{globalError}</div> : null}
          <div className={s.actionCluster}>
            <button className={s.btnPrimary} onClick={onSaveQuote} type="button" disabled={isSaving}>
              <LuFileCheck2 aria-hidden />{" "}
<<<<<<< HEAD
              {isSavingQuote ? "Guardando..." : "Guardar y ver resultado"}
=======
              {isSavingQuote ? "Guardando..." : "Ver PDF profesional"}
>>>>>>> codex/TWA-Android
            </button>
            <button className={s.btnGhost} onClick={onSaveDraft} type="button" disabled={isSaving}>
              <LuSave aria-hidden /> {isSavingDraft ? "Guardando borrador..." : "Guardar borrador"}
            </button>
            <button className={s.btnGhost} type="button" onClick={onGoToStepTwo}>
              <LuPencil aria-hidden /> Volver
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

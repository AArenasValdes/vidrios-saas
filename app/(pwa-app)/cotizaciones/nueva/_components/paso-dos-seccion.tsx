"use client";

import { useRef, useState } from "react";
import type { ComponentProps } from "react";

import type {
  PasoDosItemLibreFormProps,
  PasoDosFormularioComponenteProps,
  PasoDosPanelComponentesProps,
} from "../_types/paso-dos";

import { PasoDosFormularioComponente } from "./paso-dos-formulario-componente";
import { PasoDosAgregarGrupoSheet } from "./paso-dos/paso-dos-agregar-grupo-sheet";
import { PasoDosCambiarModoDialog } from "./paso-dos/paso-dos-cambiar-modo-dialog";
import { PasoDosItemLibreForm } from "./paso-dos/paso-dos-item-libre-form";
import { PasoDosPanelComponentes } from "./paso-dos-panel-componentes";
import { PasoDosModoCotizacion } from "./paso-dos/paso-dos-modo-cotizacion";
import s from "../page.module.css";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";

type PasoDosAgregarGrupoSheetProps = ComponentProps<typeof PasoDosAgregarGrupoSheet>;

type PasoDosSeccionProps = {
  formulario: PasoDosFormularioComponenteProps;
  panel: PasoDosPanelComponentesProps;
  itemLibreForm: PasoDosItemLibreFormProps;
  quoteModeChosen: boolean;
  quotePricingMode: QuotePricingMode;
  isMobileViewport: boolean;
  hasComponentDraftInProgress: boolean;
  budgetContext?: {
    clienteNombre: string;
    obra: string;
  };
  addGroupSheetProps: PasoDosAgregarGrupoSheetProps;
  onOpenCreator: () => void;
  onOpenFreeTotalNotebook: () => void;
  onSelectMode: (mode: QuotePricingMode) => void;
  onReturnToModeSelector: () => void;
  duplicateSourceCode?: string;
};

export function PasoDosSeccion({
  formulario,
  panel,
  itemLibreForm,
  quoteModeChosen,
  quotePricingMode,
  isMobileViewport,
  hasComponentDraftInProgress,
  budgetContext,
  addGroupSheetProps,
  onOpenCreator,
  onOpenFreeTotalNotebook,
  onSelectMode,
  onReturnToModeSelector,
  duplicateSourceCode,
}: PasoDosSeccionProps) {
  const [isCambiarModoDialogOpen, setIsCambiarModoDialogOpen] = useState(false);
  const primarySurfaceRef = useRef<HTMLDivElement>(null);

  const showModeChoice =
    !formulario.editingItemId &&
    !itemLibreForm.isOpen &&
    !addGroupSheetProps.isOpen &&
    !quoteModeChosen;

  const showDesktopWorkspace =
    !isMobileViewport &&
    quoteModeChosen &&
    !itemLibreForm.isOpen &&
    !showModeChoice;
  const activeDraftCode = addGroupSheetProps.draft
    ? (duplicateSourceCode ? `Borrador · Copia de ${duplicateSourceCode}` : "Borrador")
    : "";

  const activeDraftCard =
    !isMobileViewport &&
    addGroupSheetProps.isOpen &&
    addGroupSheetProps.entryMode !== "free_total_single" &&
    addGroupSheetProps.draft
      ? (() => {
          const isFreeVal = addGroupSheetProps.draft.subtipo === "Trabajo libre / Mantencion";
          const code = activeDraftCode;
          const title = addGroupSheetProps.draft.subtipo;
          const stepLabel = isFreeVal
            ? "Paso 2 de 2"
            : `Paso ${Math.min(addGroupSheetProps.paso, 4)} de 4`;
          const missingLabel = isFreeVal
            ? "Falta completar detalle y valor"
            : addGroupSheetProps.paso >= 5
              ? "Falta finalizar la pieza"
              : addGroupSheetProps.paso >= 4
                ? "Falta definir el precio"
                : addGroupSheetProps.paso >= 3
                  ? "Faltan medidas y precio"
                  : addGroupSheetProps.draft.subtipo.trim()
                    ? "Falta elegir sistema, medidas y precio"
                    : "Faltan sistema, medidas y precio";
          return { code, title, stepLabel, missingLabel };
        })()
      : null;

  const leftSurface = (() => {
    if (addGroupSheetProps.isOpen) {
      return (
        <PasoDosAgregarGrupoSheet
          {...addGroupSheetProps}
          variant="embedded"
          pieceCode={activeDraftCode}
          onDiscardDraft={onReturnToModeSelector}
          onRequestSwitchMode={
            quotePricingMode === "por_item" ? () => setIsCambiarModoDialogOpen(true) : undefined
          }
        />
      );
    }

    if (itemLibreForm.isOpen) {
      return <PasoDosItemLibreForm {...itemLibreForm} />;
    }

    if (showDesktopWorkspace && quotePricingMode === "total_global") {
      return (
        <section className={s.desktopPieceEditor}>
          <div className={s.desktopEmptyPieceSurface}>
            <button
              type="button"
              className={s.desktopPieceInlineModeSwitch}
              onClick={() => {
                if (hasComponentDraftInProgress || panel.items.length > 0) {
                  setIsCambiarModoDialogOpen(true);
                } else {
                  onReturnToModeSelector();
                }
              }}
            >
              Por total · Cambiar
            </button>
            <span className={s.desktopPieceEyebrow}>Presupuesto por total</span>
            <h2>Cuaderno comercial del trabajo</h2>
            <p>Define alcance, valor final, IVA, flete, condiciones de pago y notas.</p>
            <div>
              <button type="button" className={s.btnPrimary} onClick={onOpenFreeTotalNotebook}>
                Editar presupuesto total
              </button>
              {panel.items.length > 0 ? (
                <button type="button" className={s.btnGhost} onClick={panel.onGoToSummary}>
                  Continuar a revisar
                </button>
              ) : null}
            </div>
          </div>
        </section>
      );
    }

    if (showDesktopWorkspace && !addGroupSheetProps.isOpen && !formulario.editingItemId) {
      return (
        <section className={s.desktopPieceEditor}>
          <div className={s.desktopEmptyPieceSurface}>
            {quotePricingMode === "por_item" ? (
              <button
                type="button"
                className={s.desktopPieceInlineModeSwitch}
                onClick={() => {
                  if (hasComponentDraftInProgress || panel.items.length > 0) {
                    setIsCambiarModoDialogOpen(true);
                  } else {
                    onReturnToModeSelector();
                  }
                }}
              >
                Por componentes · Cambiar
              </button>
            ) : null}
            <span className={s.desktopPieceEyebrow}>Presupuesto</span>
            <h2>{panel.items.length > 0 ? "Agrega otra pieza o revisa el presupuesto" : "Crea la primera pieza"}</h2>
            <p>Cada pieza se completa en cuatro pasos: tipo, sistema, medidas y precio.</p>
            <div>
              <button type="button" className={s.btnPrimary} onClick={onOpenCreator}>
                + Agregar otra pieza
              </button>
              {panel.items.length > 0 ? (
                <button type="button" className={s.btnGhost} onClick={panel.onGoToSummary}>
                  Continuar a revisar
                </button>
              ) : null}
            </div>
          </div>
        </section>
      );
    }

    return <PasoDosFormularioComponente {...formulario} />;
  })();

  return (
    <div className={!isMobileViewport ? s.stepTwoDesktopShell : undefined}>
      {showModeChoice ? (
        <div className={s.stepTwoModeChoiceDesktopWrap}>
          <PasoDosModoCotizacion
            variant="desktop"
            contextCliente={budgetContext?.clienteNombre}
            contextObra={budgetContext?.obra}
            onSelectMode={onSelectMode}
            onSelectFreeTotalMode={() => {
              onSelectMode("total_global");
              onOpenFreeTotalNotebook();
            }}
          />
        </div>
      ) : (
        <div className={s.stepTwoLayout}>
          <div className={s.stepTwoPrimarySurface} ref={primarySurfaceRef}>
            {leftSurface}
          </div>
          <PasoDosPanelComponentes
            {...panel}
            activeDraftCard={activeDraftCard}
            onContinueActiveDraft={() => primarySurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
          />
        </div>
      )}

      <PasoDosCambiarModoDialog
        hasDraftInProgress={hasComponentDraftInProgress}
        hasLoadedItems={panel.items.length > 0}
        isOpen={isCambiarModoDialogOpen}
        onClose={() => setIsCambiarModoDialogOpen(false)}
        onConfirm={() => {
          setIsCambiarModoDialogOpen(false);
          onReturnToModeSelector();
        }}
      />
    </div>
  );
}

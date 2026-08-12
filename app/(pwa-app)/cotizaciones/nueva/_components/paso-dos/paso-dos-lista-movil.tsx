"use client";

import { useState } from "react";
import { LuArrowLeft, LuFileText, LuPencil, LuPencilRuler, LuPlus, LuTrash2 } from "react-icons/lu";

import {
  COLOR_OPTIONS,
  shouldRequireProfileMaterialForComponent,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { QuotePricingMode } from "@/features/cotizaciones/types/quote-pricing-mode";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import {
  formatMoney,
  getItemType,
  isItemIncomplete,
  repairBrokenText,
} from "./paso-dos-wizard-movil.utils";
import { PasoDosCambiarModoDialog } from "./paso-dos-cambiar-modo-dialog";
import s from "../../page.module.css";

type Props = {
  items: CotizacionWorkflowItem[];
  subtotal: string;
  total: string;
  quotePricingMode: QuotePricingMode;
  totalClienteManual: number | null;
  mostrarIva: boolean;
  isWizardOpen: boolean;
  adjustedItems: Record<string, string>;
  onOpenWizard: () => void;
  onOpenFreeValueItemForm: () => void;
  onGoToSummary: () => void;
  onSaveAndExit: () => void;
  onEditItem: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
  /** Vuelve al selector: por items vs modo rapido (cuadernillo / total). */
  onReturnToModeSelector: () => void;
  /** Disponible solo en por items: abre el cuaderno de piezas. */
  onOpenCuaderno?: () => void;
  /** Abre la revisión de despiece de la cotización. */
  onOpenDespieceReview?: () => void;
  /** Aviso contextual tras agregar una pieza con fabricación configurada. */
  despiecePrompt?: {
    itemLabel: string;
    onOpen: () => void;
    onDismiss: () => void;
  } | null;
};

export function PasoDosListaMovil({
  items,
  subtotal,
  total,
  quotePricingMode,
  totalClienteManual,
  mostrarIva,
  isWizardOpen,
  adjustedItems,
  onOpenWizard,
  onOpenFreeValueItemForm,
  onGoToSummary,
  onSaveAndExit,
  onEditItem,
  onRemoveItem,
  onReturnToModeSelector,
  onOpenCuaderno,
  onOpenDespieceReview,
  despiecePrompt = null,
}: Props) {
  const [isCambiarModoDialogOpen, setIsCambiarModoDialogOpen] = useState(false);
  const isGlobalPricing = quotePricingMode === "total_global";
  const pendingCount = isGlobalPricing
    ? 0
    : items.filter((item) => item.tipoItem !== "item_libre_con_valor" && isItemIncomplete(item)).length;
  const itemNoun = isGlobalPricing ? "trabajo" : "componente";
  const itemNounPlural = isGlobalPricing ? "trabajos" : "componentes";
  const itemPricingLabel = mostrarIva ? "Sumar IVA al final" : "Precios finales";
  const totalGlobalFooterLabel =
    totalClienteManual && totalClienteManual > 0
      ? `${items.length} trabajo${items.length !== 1 ? "s" : ""} - ${itemPricingLabel} ${subtotal}`
      : `${items.length} trabajo${items.length !== 1 ? "s" : ""} agregado${items.length !== 1 ? "s" : ""}`;
  const totalGlobalFooterValue =
    totalClienteManual && totalClienteManual > 0 ? `Total ${total}` : "Precio final pendiente";
  const requestReturnToModeSelector = () => {
    if (items.length > 0) {
      setIsCambiarModoDialogOpen(true);
      return;
    }
    onReturnToModeSelector();
  };

  return (
    <>
      <section className={s.stepTwoMobileLoadedSection} id="component-list">
        <button
          type="button"
          className={s.stepTwoMobileBackToMode}
          onClick={requestReturnToModeSelector}
        >
          <LuArrowLeft size={16} aria-hidden />
          Cambiar modalidad
        </button>
        <div className={s.stepTwoMobileLoadedHeader}>
          <div className={s.stepTwoMobileLoadedHeaderCopy}>
            <span className={s.cardLabel}>Paso 2 / Componentes</span>
            <strong>{isGlobalPricing ? "Trabajos cargados" : "Componentes cargados"}</strong>
            <div className={s.stepTwoMobileLoadedStats}>
              <span className={s.stepTwoMobileLoadedStat}>
                {items.length} {items.length === 1 ? itemNoun : itemNounPlural}
              </span>
              <span
                className={`${s.stepTwoMobileLoadedStat} ${
                  items.length > 0 && pendingCount === 0
                    ? s.stepTwoMobileLoadedStatReady
                    : s.stepTwoMobileLoadedStatPending
                }`}
              >
                {items.length > 0 && pendingCount === 0
                  ? "Listo"
                  : `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`}
              </span>
            </div>
            {items.length > 0 ? (
              <p className={s.stepTwoMobileLoadedSubtle}>
                {isGlobalPricing
                  ? totalClienteManual && totalClienteManual > 0
                    ? "Precio final cargado. Puedes revisar detalles o seguir al resumen."
                    : "Carga el precio final en esta pantalla antes de revisar el resumen."
                  : pendingCount > 0
                  ? "Completa los pendientes o sigue agregando piezas."
                  : "Todo listo para pasar al resumen."}
              </p>
            ) : null}
          </div>
          {items.length > 0 ? (
            <button
              className={s.stepTwoMobileInlineAction}
              onClick={onGoToSummary}
              type="button"
            >
              <LuFileText aria-hidden />
              Resumen
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className={s.stepTwoMobileEmptyState}>
            <strong>Agrega tu primer {itemNoun}</strong>
            <span>
              {isGlobalPricing
                ? "Empieza por el tipo y luego completa la descripcion del alcance."
                : "Empieza por el tipo y luego completa medidas, vidrio y valor."}
            </span>
            {onOpenCuaderno && !isGlobalPricing ? (
              <button
                type="button"
                className={s.stepTwoMobileEmptySecondary}
                onClick={onOpenCuaderno}
              >
                Usar constructor visual
              </button>
            ) : null}
          </div>
        ) : (
          <div className={s.stepTwoMobileItemStack}>
            {items.map((item) => {
              const itemMeta = decodeCotizacionItemPresentationMeta(item.observaciones);
              const isFreeValueItem =
                item.tipoItem === "item_libre_con_valor" || itemMeta.displayMode === "item_libre";
              const incomplete = isGlobalPricing || isFreeValueItem ? false : isItemIncomplete(item);
              const itemType = getItemType(item);
              const displayCode = item.codigo || "--";
              const adjustedFromBaseCode = adjustedItems[item.id] ?? null;
              const isAdjusted = Boolean(adjustedFromBaseCode);
              const showProfileDetails = shouldRequireProfileMaterialForComponent(item.tipo);
              const colorLabel =
                itemMeta.material === "PVC"
                  ? "PVC blanco"
                  : COLOR_OPTIONS.find(
                      (option) =>
                        option.hex.toLowerCase() === itemMeta.colorHex.toLowerCase()
                    )?.label ?? "Color personalizado";

              return (
                <article
                  key={item.id}
                  className={`${s.stepTwoMobileItemCard} ${
                    incomplete
                      ? s.stepTwoMobileItemCardIncomplete
                      : s.stepTwoMobileItemCardComplete
                  }`}
                >
                  <div className={s.stepTwoMobileItemHead}>
                    <div className={s.stepTwoMobileItemHeadLeft}>
                      <div className={s.stepTwoMobileItemHeadMeta}>
                        <span className={s.stepTwoMobileItemCode}>{displayCode}</span>
                        {isAdjusted ? (
                          <span className={s.stepTwoMobileItemAdjustedBadge}>Ajustada</span>
                        ) : null}
                        <span
                          className={`${s.stepTwoMobileItemState} ${
                            incomplete
                              ? s.stepTwoMobileItemStatePending
                              : s.stepTwoMobileItemStateReady
                          }`}
                        >
                          {incomplete ? "Pendiente" : "Completo"}
                        </span>
                      </div>
                      <span className={s.stepTwoMobileItemName}>{itemType}</span>
                      {(isGlobalPricing || isFreeValueItem) && item.descripcion ? (
                        <span className={s.stepTwoMobileItemAdjustedHint}>
                          {repairBrokenText(item.descripcion)}
                        </span>
                      ) : null}
                      {adjustedFromBaseCode ? (
                        <span className={s.stepTwoMobileItemAdjustedHint}>
                          Sale de {adjustedFromBaseCode}
                        </span>
                      ) : null}
                    </div>
                    <div className={s.stepTwoMobileItemActions}>
                      <button
                        className={s.stepTwoMobileMiniButton}
                        onClick={() => onEditItem(item)}
                        type="button"
                        aria-label={`Editar ${itemType}`}
                      >
                        <LuPencil aria-hidden size={13} />
                      </button>
                      <button
                        className={`${s.stepTwoMobileMiniButton} ${s.stepTwoMobileMiniButtonDanger}`}
                        onClick={() => onRemoveItem(item.id)}
                        type="button"
                        aria-label={`Eliminar ${itemType}`}
                      >
                        <LuTrash2 aria-hidden size={13} />
                      </button>
                    </div>
                  </div>

                  <div className={s.stepTwoMobileItemDims}>
                    <span>
                      {item.ancho && item.alto
                        ? `${item.ancho} x ${item.alto} mm`
                        : isGlobalPricing || isFreeValueItem
                          ? "Sin medidas"
                          : "Medidas pendientes"}
                    </span>
                    <span className={s.stepTwoMobileItemUnits}>
                      {item.cantidad} {item.cantidad === 1 ? "unidad" : "unidades"}
                    </span>
                  </div>

                  {incomplete ? (
                    <>
                      <div className={s.stepTwoMobileItemWarning}>
                        <span aria-hidden>!</span>
                        Falta configuracion
                        <span className={s.stepTwoMobileItemWarningPrice}>$0</span>
                      </div>
                      <button
                        className={s.stepTwoMobileItemCompleteBtn}
                        onClick={() => onEditItem(item)}
                        type="button"
                      >
                        Completar
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={s.stepTwoMobileItemMeta}>
                        {!isFreeValueItem && showProfileDetails && itemMeta.material ? (
                          <span>{repairBrokenText(itemMeta.material)}</span>
                        ) : null}
                        {!isFreeValueItem && showProfileDetails && itemMeta.colorHex ? (
                          <span className={s.stepTwoMobileItemColorChip}>
                            <i
                              className={s.stepTwoMobileItemColorSwatch}
                              style={{ backgroundColor: itemMeta.colorHex }}
                              aria-hidden
                            />
                            {repairBrokenText(colorLabel)}
                          </span>
                        ) : null}
                        {!isFreeValueItem && item.vidrio ? (
                          <span>{repairBrokenText(item.vidrio)}</span>
                        ) : null}
                        {!isFreeValueItem && itemMeta.referencia ? (
                          <span>{repairBrokenText(itemMeta.referencia)}</span>
                        ) : null}
                      </div>
                      <div className={s.stepTwoMobileItemFooter}>
                        <span className={s.stepTwoMobileItemFooterLabel}>
                          {isGlobalPricing ? "Total" : "Venta"}
                        </span>
                        <div className={s.stepTwoMobileItemPrice}>
                          {isGlobalPricing ? "Se define en resumen" : formatMoney(item.precioTotal)}
                        </div>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {!isWizardOpen ? (
        <footer className={s.stepTwoMobileFooterBar}>
          {despiecePrompt ? (
            <div className={s.stepTwoMobileDespiecePrompt} role="status">
              <div className={s.stepTwoMobileDespiecePromptCopy}>
                <strong>Cortes y tiras listos</strong>
                <p>
                  {despiecePrompt.itemLabel} tiene fabricación configurada. Revisa la pauta sin
                  salir del presupuesto.
                </p>
              </div>
              <div className={s.stepTwoMobileDespiecePromptActions}>
                <button
                  className={s.btnPrimary}
                  onClick={despiecePrompt.onOpen}
                  type="button"
                >
                  <LuPencilRuler aria-hidden />
                  Ver cortes y tiras
                </button>
                <button className={s.btnGhost} onClick={despiecePrompt.onDismiss} type="button">
                  Ahora no
                </button>
              </div>
            </div>
          ) : null}
          <div className={s.stepTwoMobileFooterTotals}>
            <span>
              {quotePricingMode === "total_global"
                ? totalGlobalFooterLabel
                : `${items.length} componente${items.length !== 1 ? "s" : ""} - ${itemPricingLabel} ${subtotal}`}
            </span>
            <strong>
              {quotePricingMode === "total_global" ? totalGlobalFooterValue : `Total ${total}`}
            </strong>
          </div>
          <div className={s.stepTwoMobileFooterActions}>
            <button className={s.btnPrimary} onClick={onOpenWizard} type="button">
              <LuPlus aria-hidden />
              {quotePricingMode === "por_item" ? "Componente" : "Agregar"}
            </button>
            {quotePricingMode === "por_item" ? (
              <button className={s.btnGhost} onClick={onOpenFreeValueItemForm} type="button">
                <LuPlus aria-hidden />
                Item libre
              </button>
            ) : null}
            {onOpenDespieceReview ? (
              <button className={s.btnGhost} onClick={onOpenDespieceReview} type="button">
                <LuPencilRuler aria-hidden />
                Ver cortes y tiras
              </button>
            ) : null}
            <button
              className={s.btnGhost}
              onClick={items.length > 0 ? onGoToSummary : onSaveAndExit}
              type="button"
            >
              {items.length > 0 ? "Continuar al resumen" : "Guardar borrador"}
            </button>
          </div>
        </footer>
      ) : null}

      <PasoDosCambiarModoDialog
        isOpen={isCambiarModoDialogOpen}
        hasLoadedItems={items.length > 0}
        hasDraftInProgress={false}
        onClose={() => setIsCambiarModoDialogOpen(false)}
        onConfirm={() => {
          setIsCambiarModoDialogOpen(false);
          onReturnToModeSelector();
        }}
      />
    </>
  );
}

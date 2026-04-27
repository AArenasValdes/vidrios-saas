"use client";

import { LuFileText, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";

import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import {
  formatMoney,
  getItemType,
  isItemIncomplete,
  repairBrokenText,
} from "./paso-dos-wizard-movil.utils";
import s from "../../page.module.css";

type Props = {
  items: CotizacionWorkflowItem[];
  subtotal: string;
  total: string;
  isWizardOpen: boolean;
  onOpenWizard: () => void;
  onGoToSummary: () => void;
  onSaveAndExit: () => void;
  onEditItem: (item: CotizacionWorkflowItem) => void;
  onRemoveItem: (itemId: string) => void;
};

export function PasoDosListaMovil({
  items,
  subtotal,
  total,
  isWizardOpen,
  onOpenWizard,
  onGoToSummary,
  onSaveAndExit,
  onEditItem,
  onRemoveItem,
}: Props) {
  const pendingCount = items.filter(isItemIncomplete).length;

  return (
    <>
      <section className={s.stepTwoMobileLoadedSection} id="component-list">
        <div className={s.stepTwoMobileLoadedHeader}>
          <div>
            <span className={s.cardLabel}>Lista actual</span>
            <strong>
              {items.length} componente{items.length !== 1 ? "s" : ""}
            </strong>
            {items.length > 0 ? (
              <p className={s.stepTwoMobileLoadedSubtle}>
                {pendingCount > 0
                  ? `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""} de completar`
                  : "Todo listo para pasar al resumen"}
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
              Ir al resumen
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className={s.stepTwoMobileEmptyState}>
            <strong>Aun no agregas componentes</strong>
            <span>Presiona el boton de abajo para empezar.</span>
          </div>
        ) : (
          <div className={s.stepTwoMobileItemStack}>
            {items.map((item) => {
              const incomplete = isItemIncomplete(item);
              const itemMeta = decodeCotizacionItemPresentationMeta(item.observaciones);
              const itemType = getItemType(item);
              const displayCode = item.codigo || "--";

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
                      <span className={s.stepTwoMobileItemCode}>{displayCode}</span>
                      <span className={s.stepTwoMobileItemName}>{itemType}</span>
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
                        : "Medidas pendientes"}
                    </span>
                    <span className={s.stepTwoMobileItemUnits}>
                      {item.cantidad} {item.cantidad === 1 ? "unidad" : "unidades"}
                    </span>
                  </div>

                  {incomplete ? (
                    <>
                      <div className={s.stepTwoMobileItemWarning}>
                        <span aria-hidden>⚠</span>
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
                        {itemMeta.material ? (
                          <span>{repairBrokenText(itemMeta.material)}</span>
                        ) : null}
                        {item.vidrio ? (
                          <span>{repairBrokenText(item.vidrio)}</span>
                        ) : null}
                        {itemMeta.referencia ? (
                          <span>{repairBrokenText(itemMeta.referencia)}</span>
                        ) : null}
                      </div>
                      <div className={s.stepTwoMobileItemPrice}>
                        {formatMoney(item.precioTotal)}
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
          <div className={s.stepTwoMobileFooterTotals}>
            <span>Subtotal {subtotal}</span>
            <strong>Total {total}</strong>
          </div>
          <div className={s.stepTwoMobileFooterActions}>
            <button
              className={s.btnGhost}
              onClick={items.length > 0 ? onGoToSummary : onSaveAndExit}
              type="button"
            >
              {items.length > 0 ? "Ir al resumen" : "Guardar borrador"}
            </button>
            <button className={s.btnPrimary} onClick={onOpenWizard} type="button">
              <LuPlus aria-hidden />
              Componente
            </button>
          </div>
        </footer>
      ) : null}
    </>
  );
}

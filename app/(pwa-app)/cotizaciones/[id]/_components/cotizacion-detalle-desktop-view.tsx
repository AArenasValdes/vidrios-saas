"use client";

import Link from "next/link";
import {
  LuArrowLeft,
  LuCalendarDays,
  LuCopy,
  LuEye,
  LuMapPin,
  LuMessageCircle,
  LuPencil,
  LuPhone,
  LuRuler,
  LuTrash2,
} from "react-icons/lu";

import type { CotizacionDetalleMobileViewModel } from "./cotizacion-detalle-mobile-view-model";

import s from "./cotizacion-detalle-desktop.module.css";

type Props = {
  model: CotizacionDetalleMobileViewModel;
  isHydratingItems: boolean;
  isPreparingPdf: boolean;
  isSaving: boolean;
  isUpdatingResponse: boolean;
  whatsappDisabled: boolean;
  updatedLabel: string;
  editHref: string;
  editComponentsHref: string;
  fabricacionHref: string;
  copyFeedback: string | null;
  onDelete: () => Promise<void> | void;
  onCopyApprovalLink: () => Promise<void> | void;
  onManualResponseChange: (
    nextStatus: "pendiente" | "aprobada" | "rechazada" | "terminada"
  ) => Promise<boolean> | boolean;
  onOpenPdf: () => Promise<void> | void;
  onOpenWhatsappShare: () => Promise<void> | void;
};

export function CotizacionDetalleDesktopView({
  model,
  isHydratingItems,
  isPreparingPdf,
  isSaving,
  isUpdatingResponse,
  whatsappDisabled,
  updatedLabel,
  editHref,
  editComponentsHref,
  fabricacionHref,
  copyFeedback,
  onDelete,
  onCopyApprovalLink,
  onManualResponseChange,
  onOpenPdf,
  onOpenWhatsappShare,
}: Props) {
  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.headerLeft}>
          <Link href="/cotizaciones" className={s.backLink}>
            <LuArrowLeft aria-hidden />
            Cotizaciones
          </Link>
          <div className={s.codeBlock}>
            <span className={s.quoteCode}>{model.code}</span>
            <span className={`${s.statusBadge} ${s[model.statusClass]}`}>
              {model.statusLabel}
            </span>
          </div>
        </div>

        <div className={s.headerActions}>
          <button
            type="button"
            className={s.secondaryBtn}
            onClick={() => void onCopyApprovalLink()}
            disabled={isSaving}
          >
            <LuCopy aria-hidden />
            Copiar link
          </button>
          <button
            type="button"
            className={s.secondaryBtn}
            onClick={() => void onOpenPdf()}
            disabled={isPreparingPdf}
          >
            <LuEye aria-hidden />
            {isPreparingPdf ? "Preparando PDF..." : "Ver PDF"}
          </button>
          <Link className={s.secondaryBtn} href={fabricacionHref}>
            <LuRuler aria-hidden />
            Despiece y pauta
          </Link>
          <Link className={s.secondaryBtn} href={editHref}>
            <LuPencil aria-hidden />
            Editar
          </Link>
          <button
            type="button"
            className={s.dangerBtn}
            onClick={() => void onDelete()}
            disabled={isSaving}
          >
            <LuTrash2 aria-hidden />
            Eliminar
          </button>
        </div>
      </header>

      <div className={s.workspace}>
        <div className={s.mainColumn}>
          <section className={`${s.card} ${s.heroCard}`}>
            <p className={s.heroLabel}>
              {model.isTotalGlobal ? "Total cliente" : "Total · IVA incluido"}
            </p>
            <h1 className={s.heroAmount}>{model.total}</h1>
            <p className={s.heroSubtext}>{model.heroSubtext}</p>
          </section>

          <section className={s.card}>
            <div className={s.sectionHeader}>
              <div className={s.sectionLabel}>
                {isHydratingItems
                  ? "Componentes"
                  : `Componentes · ${model.itemsCount}`}
              </div>
              <Link href={editComponentsHref} className={s.sectionAction}>
                <LuPencil aria-hidden />
                Editar
              </Link>
            </div>

            {isHydratingItems ? (
              <div className={s.loadingItems}>Cargando componentes...</div>
            ) : model.items.length === 0 ? (
              <div className={s.loadingItems}>Esta cotización aún no tiene componentes.</div>
            ) : (
              <div className={s.itemList}>
                {model.items.map((item) => (
                  <article key={item.id} className={s.componentRow}>
                    <div className={s.componentCode}>{item.code}</div>
                    <div className={s.componentBody}>
                      <strong className={s.componentName}>{item.name}</strong>
                      <span className={s.componentMeta}>{item.meta}</span>
                    </div>
                    {model.isTotalGlobal ? null : (
                      <strong className={s.componentPrice}>{item.price}</strong>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={s.card}>
            <div className={s.sectionLabel}>Observaciones y cierre</div>
            {model.notes.trim() ? (
              <p className={s.notesText}>{model.notes}</p>
            ) : (
              <div className={s.emptyNotes}>Sin observaciones registradas.</div>
            )}
          </section>
        </div>

        <aside className={s.sideColumn}>
          <section className={s.card}>
            <div className={s.sideActions}>
              <button
                type="button"
                className={s.primaryBtn}
                onClick={() => void onOpenWhatsappShare()}
                disabled={whatsappDisabled}
              >
                <LuMessageCircle aria-hidden />
                Enviar por WhatsApp
              </button>
              {copyFeedback ? <p className={s.copyFeedback}>{copyFeedback}</p> : null}
            </div>
          </section>

          <section className={s.card}>
            <div className={s.sectionLabel}>Seguimiento</div>
            <div className={s.trackingRow}>
              <span className={`${s.statusBadge} ${s[model.responseStatusClass]}`}>
                {model.responseStatusLabel}
              </span>
            </div>
            <div className={s.trackingRow}>
              <select
                className={s.statusSelect}
                aria-label="Cambiar estado de seguimiento"
                value={model.responseStatus}
                disabled={isSaving || isUpdatingResponse}
                onChange={(event) => {
                  void onManualResponseChange(
                    event.target.value as "pendiente" | "aprobada" | "rechazada" | "terminada"
                  );
                }}
              >
                <option value="pendiente">Sin cierre registrado</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="terminada">Proyecto terminado</option>
              </select>
            </div>
            <div className={s.trackingMeta}>
              <span>{model.responseChannelLabel}</span>
              <span>{model.responseUpdatedLabel}</span>
            </div>
          </section>

          <section className={s.card}>
            <div className={s.sectionLabel}>Cliente</div>
            <div className={s.clientName}>{model.clientName}</div>
            <div className={s.clientLines}>
              <div className={s.clientLine}>
                <LuPhone aria-hidden />
                <span>{model.clientPhone}</span>
              </div>
              <div className={s.clientLine}>
                <LuMapPin aria-hidden />
                <span>{model.clientAddress}</span>
              </div>
            </div>
            <div className={s.clientMeta}>
              <LuCalendarDays aria-hidden />
              <span>
                Actualizada {updatedLabel} · Vigencia {model.validity}
              </span>
            </div>
          </section>

          <section className={s.card}>
            <div className={s.sectionLabel}>Resumen</div>
            {model.isTotalGlobal ? null : (
              <>
                <div className={s.totalRow}>
                  <span>Subtotal</span>
                  <strong>{model.subtotal}</strong>
                </div>
                <div className={s.totalRow}>
                  <span>Descuento</span>
                  <strong>- {model.discount}</strong>
                </div>
                <div className={s.totalRow}>
                  <span>IVA (19%)</span>
                  <strong>{model.iva}</strong>
                </div>
              </>
            )}
            <div className={s.totalStrongRow}>
              <span>Total</span>
              <strong>{model.total}</strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

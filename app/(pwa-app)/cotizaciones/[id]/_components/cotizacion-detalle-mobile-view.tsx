"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  LuCalendarDays,
  LuChevronDown,
  LuCopy,
  LuEye,
  LuMapPin,
  LuMessageCircle,
  LuPencil,
  LuPhone,
  LuTrash2,
} from "react-icons/lu";

import { MobilePageHeader } from "../../../_components/mobile-page-header";
import type { CotizacionDetalleMobileViewModel } from "./cotizacion-detalle-mobile-view-model";

import s from "./cotizacion-detalle-mobile.module.css";

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
  copyFeedback: string | null;
  onDelete: () => Promise<void> | void;
  onCopyApprovalLink: () => Promise<void> | void;
  onManualResponseChange: (
    nextStatus: "pendiente" | "aprobada" | "rechazada" | "terminada"
  ) => Promise<boolean> | boolean;
  onOpenPdf: () => Promise<void> | void;
  onOpenWhatsappShare: () => Promise<void> | void;
};

export function CotizacionDetalleMobileView({
  model,
  isHydratingItems,
  isPreparingPdf,
  isSaving,
  isUpdatingResponse,
  whatsappDisabled,
  updatedLabel,
  editHref,
  editComponentsHref,
  copyFeedback,
  onDelete,
  onCopyApprovalLink,
  onManualResponseChange,
  onOpenPdf,
  onOpenWhatsappShare,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isStatusSheetOpen, setIsStatusSheetOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  return (
    <div className={s.root}>
      <div className={s.shell}>
        <header className={s.header}>
          <div ref={menuRef}>
            <MobilePageHeader
              backHref="/cotizaciones"
              backLabel="Cotizaciones"
              menuLabel="Más acciones"
              menuOpen={isMenuOpen}
              onToggleMenu={() => setIsMenuOpen((current) => !current)}
              menuPanel={
                <button
                  type="button"
                  className={s.menuDelete}
                  onClick={() => void onDelete()}
                  disabled={isSaving}
                >
                  <LuTrash2 aria-hidden />
                  Eliminar cotización
                </button>
              }
            />
          </div>

          <div className={s.codeRow}>
            <span className={s.quoteCode}>{model.code}</span>
            <span className={`${s.statusBadge} ${s[model.statusClass]}`}>{model.statusLabel}</span>
          </div>
        </header>

        <section className={s.hero}>
          <h1 className={s.heroAmount}>{model.total}</h1>
          <p className={s.heroLabel}>
            {model.isTotalGlobal ? "TOTAL CLIENTE" : "TOTAL Â· IVA INCLUIDO"}
          </p>
          <p className={s.heroSubtext}>{model.heroSubtext}</p>
        </section>

        <section className={s.ctaBlock}>
          <button
            type="button"
            className={`${s.primaryCta} ${whatsappDisabled ? s.btnDisabled : ""}`}
            onClick={() => void onOpenWhatsappShare()}
            disabled={whatsappDisabled}
          >
            <LuMessageCircle aria-hidden />
            Enviar link por WhatsApp
          </button>
        </section>

        <section className={s.secondaryActions}>
          <button
            type="button"
            className={s.ghostButton}
            onClick={() => void onCopyApprovalLink()}
            disabled={isSaving}
          >
            <LuCopy aria-hidden />
            Copiar link
          </button>

          <button
            type="button"
            className={s.ghostButton}
            onClick={() => void onOpenPdf()}
            disabled={isPreparingPdf}
          >
            <LuEye aria-hidden />
            {isPreparingPdf ? "Preparando PDF..." : "Ver PDF"}
          </button>

          <Link className={s.ghostButton} href={editHref}>
            <LuPencil aria-hidden />
            Editar
          </Link>
        </section>

        {copyFeedback ? <p className={s.copyFeedback}>{copyFeedback}</p> : null}

        <section className={s.trackingInline}>
          <div className={s.trackingInlineCopy}>
            <div className={s.sectionLabel}>SEGUIMIENTO</div>
            <span className={`${s.statusBadge} ${s[model.responseStatusClass]}`}>
              {model.responseStatusLabel}
            </span>
          </div>
          <button
            type="button"
            className={s.statusTrigger}
            onClick={() => setIsStatusSheetOpen(true)}
            disabled={isSaving || isUpdatingResponse}
          >
            Cambiar estado
          </button>
        </section>

        <section className={s.sectionPlain}>
          <div className={s.sectionLabel}>CLIENTE</div>
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
              Actualizada {updatedLabel} Â· Vigencia {model.validity}
            </span>
          </div>
        </section>

        <section className={s.sectionPlain}>
          <div className={s.sectionHeader}>
            <div className={s.sectionLabel}>
              {isHydratingItems ? "COMPONENTES" : `COMPONENTES Â· ${model.itemsCount}`}
            </div>
            <Link href={editComponentsHref} className={s.sectionAction}>
              <LuPencil aria-hidden />
              Editar
            </Link>
          </div>

          <div className={s.itemListScroll}>
            <div className={s.itemList}>
              {isHydratingItems ? (
                <div className={s.componentLoadingState}>Cargando componentes...</div>
              ) : (
                model.items.map((item) => (
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
                ))
              )}
            </div>
          </div>
        </section>

        <section className={s.totalsCard}>
          {model.isTotalGlobal ? (
            <>
              <div className={s.totalRow}>
                <span>Costo fabricación</span>
                <strong>{model.globalCost}</strong>
              </div>
              <div className={s.totalRow}>
                <span>Margen global</span>
                <strong>{model.globalMargin}</strong>
              </div>
              <div className={s.totalRow}>
                <span>Utilidad</span>
                <strong>{model.globalUtility}</strong>
              </div>
            </>
          ) : (
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
            <span>TOTAL</span>
            <strong>{model.total}</strong>
          </div>
        </section>

        <section className={s.notesBlock}>
          <button
            type="button"
            className={s.notesToggle}
            aria-expanded={isNotesOpen}
            onClick={() => setIsNotesOpen((current) => !current)}
          >
            <span>Observaciones y cierre</span>
            <LuChevronDown className={isNotesOpen ? s.notesChevronOpen : ""} aria-hidden />
          </button>

          {isNotesOpen ? <p className={s.notesText}>{model.notes}</p> : null}
        </section>
      </div>

      <div
        className={`${s.statusSheetOverlay}${isStatusSheetOpen ? ` ${s.statusSheetOverlayOpen}` : ""}`}
        aria-hidden={!isStatusSheetOpen}
        onClick={() => setIsStatusSheetOpen(false)}
      />
      <section
        className={`${s.statusSheet}${isStatusSheetOpen ? ` ${s.statusSheetOpen}` : ""}`}
        aria-hidden={!isStatusSheetOpen}
      >
        <div className={s.statusSheetHandle} />
        <div className={s.statusSheetHeader}>
          <div>
            <div className={s.sectionLabel}>SEGUIMIENTO</div>
            <h2 className={s.statusSheetTitle}>Cambiar estado</h2>
            <p className={s.statusSheetText}>
              El PDF se sigue enviando igual. Aqui solo marcas el avance comercial.
            </p>
          </div>
          <button
            type="button"
            className={s.statusSheetClose}
            onClick={() => setIsStatusSheetOpen(false)}
          >
            ×
          </button>
        </div>

        <div className={s.statusOptionList}>
          {[
            { value: "pendiente", label: "Pendiente" },
            { value: "aprobada", label: "Aprobada" },
            { value: "rechazada", label: "Rechazada" },
            { value: "terminada", label: "Proyecto terminado" },
          ].map((option) => {
            const selected = model.responseStatus === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={`${s.statusOption}${selected ? ` ${s.statusOptionSelected}` : ""}`}
                disabled={isSaving || isUpdatingResponse}
                onClick={async () => {
                  setIsStatusSheetOpen(false);
                  const updated = await onManualResponseChange(
                    option.value as "pendiente" | "aprobada" | "rechazada" | "terminada"
                  );
                  if (updated === false) {
                    setIsStatusSheetOpen(true);
                  }
                }}
              >
                <span>{option.label}</span>
                {selected ? <span className={s.statusOptionCheck}>Actual</span> : null}
              </button>
            );
          })}
        </div>

        <div className={s.statusSheetMeta}>
          <span>{model.responseChannelLabel}</span>
          <span>{model.responseUpdatedLabel}</span>
        </div>
      </section>
    </div>
  );
}


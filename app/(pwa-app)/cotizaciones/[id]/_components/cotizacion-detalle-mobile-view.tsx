"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  LuCalendarDays,
  LuChevronDown,
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
  whatsappDisabled: boolean;
  updatedLabel: string;
  editHref: string;
  editComponentsHref: string;
  onDelete: () => Promise<void> | void;
  onOpenPdf: () => Promise<void> | void;
  onOpenWhatsappShare: () => Promise<void> | void;
};

export function CotizacionDetalleMobileView({
  model,
  isHydratingItems,
  isPreparingPdf,
  isSaving,
  whatsappDisabled,
  updatedLabel,
  editHref,
  editComponentsHref,
  onDelete,
  onOpenPdf,
  onOpenWhatsappShare,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
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
          <p className={s.heroLabel}>TOTAL Â· IVA INCLUIDO</p>
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
                    <strong className={s.componentPrice}>{item.price}</strong>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className={s.totalsCard}>
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
    </div>
  );
}


"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useState } from "react";
import {
  LuCalendarClock,
  LuDownload,
  LuFileText,
  LuShieldCheck,
  LuX,
} from "react-icons/lu";

import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

import s from "./public-quote-mobile.module.css";

const PublicQuoteDocument = dynamic(
  () => import("./documento/public-quote-document").then((mod) => mod.PublicQuoteDocument),
  {
    ssr: false,
    loading: () => (
      <div className={s.overlayLoading}>
        <strong>Preparando documento...</strong>
        <span>Tu PDF se abre sin recargar pagina.</span>
      </div>
    ),
  }
);

const CLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

type PublicQuoteMobileItem = {
  id: string;
  tipoItem?: string | null;
  codigo: string;
  tipo: string;
  nombre: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  vidrio: string;
  ancho: number | null;
  alto: number | null;
  precioUnitario: number;
  precioTotal: number;
  observaciones: string;
};

type PublicQuoteMobileView = {
  id: string;
  approvalToken: string;
  codigo: string;
  estado: string;
  clienteNombre: string;
  obra: string;
  validez: string;
  total: number;
  pricingMode?: "por_item" | "total_global";
  subtotal: number;
  descuentoPct: number;
  iva: number;
  flete: number;
  observaciones: string;
  clienteRespondioEn: string | null;
  isExpired: boolean;
  canRespond: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  items: PublicQuoteMobileItem[];
  organizationProfile: {
    empresaNombre: string;
    brandColor: string;
    empresaLogoUrl: string | null;
    empresaDireccion: string;
    empresaTelefono: string;
    empresaEmail: string;
    formaPago: string;
  };
};

type PublicQuoteMobileProps = {
  quote: PublicQuoteMobileView;
  decisionMessage: string | null;
  acceptAction: NonNullable<ComponentPropsWithoutRef<"form">["action"]> | null;
  rejectAction: NonNullable<ComponentPropsWithoutRef<"form">["action"]> | null;
};

function formatShortDate(value: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return formatCotizacionDate(value);
}

function formatSurface(item: PublicQuoteMobileItem) {
  if (!item.ancho || !item.alto) {
    return "Medidas por definir";
  }

  const totalM2 = (item.ancho * item.alto * item.cantidad) / 1_000_000;

  return `${item.ancho} x ${item.alto} mm · ${totalM2.toFixed(2)} m2`;
}

function getStatusLabel(status: string) {
  if (status === "aprobada") {
    return "Aprobado";
  }

  if (status === "rechazada") {
    return "Rechazado";
  }

  return "Pendiente";
}

export function PublicQuoteMobile({
  quote,
  decisionMessage,
  acceptAction,
  rejectAction,
}: PublicQuoteMobileProps) {
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);

  useEffect(() => {
    if (!decisionMessage) {
      return;
    }

    if (quote.estado !== "aprobada" && quote.estado !== "rechazada") {
      return;
    }

    googleTagService.trackQuoteDecision({
      quoteCode: quote.codigo,
      decision: quote.estado,
      total: quote.total,
    });
  }, [decisionMessage, quote.codigo, quote.estado, quote.total]);

  useEffect(() => {
    if (!isDocumentOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDocumentOpen]);

  const surfaceM2 = quote.items.reduce((accumulator, item) => {
    if (!item.ancho || !item.alto) {
      return accumulator;
    }

    return accumulator + (item.ancho * item.alto * item.cantidad) / 1_000_000;
  }, 0);
  const showItemPrices = quote.pricingMode !== "total_global";
  const downloadUrl = `/presupuesto/${quote.approvalToken}/documento?download=1&embed=1`;
  const issueDate = formatShortDate(quote.createdAt ?? quote.updatedAt);
  const isFinalState = Boolean(decisionMessage);
  const summaryAlcance =
    surfaceM2 > 0
      ? `${quote.items.length} componentes · ${surfaceM2.toFixed(1)} m2`
      : `${quote.items.length} componentes`;
  const statusClass =
    quote.estado === "aprobada"
      ? s.statusAprobada
      : quote.estado === "rechazada"
        ? s.statusRechazada
        : s.statusPendiente;
  const handleOpenDocument = () => {
    googleTagService.trackPdfAction({
      action: "view",
      quoteCode: quote.codigo,
      source: "public-quote",
    });
    setIsDocumentOpen(true);
  };
  const handleDownload = () => {
    googleTagService.trackPdfAction({
      action: "download",
      quoteCode: quote.codigo,
      source: "public-quote",
    });
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <section className={s.mobileShell}>
        <article className={s.topCard}>
          <div className={s.topRow}>
            <div className={s.logoWrap}>
              <Image
                src="/brand/ventora-logo-compact-on-light.svg"
                alt="Ventora"
                width={146}
                height={36}
                className={s.logo}
                unoptimized
              />
            </div>
            <span className={`${s.statusBadge} ${statusClass}`}>{getStatusLabel(quote.estado)}</span>
          </div>

          <div className={s.titleBlock}>
            <span className={s.kicker}>Propuesta {quote.codigo}</span>
            <h1 className={s.title}>Tu presupuesto esta listo</h1>
            <p className={s.subtitle}>Revisalo y aprueba en menos de 1 minuto.</p>
          </div>

          <div className={s.totalBlock}>
            <span className={s.totalLabel}>MONTO TOTAL</span>
            <strong className={s.totalValue}>{CLP(quote.total)}</strong>
            <div className={s.metaLine}>
              <LuCalendarClock aria-hidden />
              <span>
                Valido {quote.validez} · Emitido {issueDate}
              </span>
            </div>
          </div>
        </article>

        <article className={s.summaryCard}>
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>CLIENTE</span>
            <strong className={s.summaryValue}>{quote.clienteNombre}</strong>
          </div>
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>EMPRESA</span>
            <strong className={s.summaryValue}>{quote.organizationProfile.empresaNombre}</strong>
          </div>
          <div className={`${s.summaryRow} ${s.summaryRowProject}`}>
            <span className={s.summaryLabel}>PROYECTO</span>
            <strong className={`${s.summaryValue} ${s.summaryValueProject}`}>{quote.obra}</strong>
          </div>
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>ALCANCE</span>
            <strong className={s.summaryValue}>{summaryAlcance}</strong>
          </div>
        </article>

        <details className={s.detailsCard}>
          <summary className={s.detailsSummary}>Ver que incluye este presupuesto</summary>
          <div className={s.detailsBody}>
            {quote.items.slice(0, 3).map((item) => {
                const itemMeta = decodeCotizacionItemPresentationMeta(item.observaciones);
                const isFreeValueItem =
                  item.tipoItem === "item_libre_con_valor" ||
                  itemMeta.displayMode === "item_libre";

                return (
                  <div key={item.id} className={s.itemRow}>
                    <div className={s.itemHead}>
                      <span className={s.itemCode}>{item.codigo}</span>
                      <strong className={s.itemName}>{item.nombre}</strong>
                    </div>
                    <p className={s.itemMeta}>
                      {isFreeValueItem
                        ? item.descripcion || "Item libre"
                        : `${item.cantidad} ${item.unidad} · ${formatSurface(item)}`}
                    </p>
                    <div className={s.itemFoot}>
                      <span className={s.itemChip}>
                        {isFreeValueItem ? "Item libre" : item.vidrio || "Vidrio por definir"}
                      </span>
                      {showItemPrices || (isFreeValueItem && item.precioTotal > 0) ? (
                        <strong className={s.itemTotal}>{CLP(item.precioTotal)}</strong>
                      ) : null}
                    </div>
                  </div>
                );
            })}
            {quote.items.length > 3 ? (
              <p className={s.moreItems}>+ {quote.items.length - 3} componentes mas</p>
            ) : null}
          </div>
        </details>

        <article className={s.pdfCard}>
          <div className={s.pdfHeader}>
            <div>
              <span className={s.sectionLabel}>PDF</span>
              <h2 className={s.pdfTitle}>Ver propuesta completa</h2>
              <p className={s.pdfText}>Documento detallado listo para descargar o imprimir.</p>
            </div>
            <div className={s.pdfIcon}>
              <LuFileText aria-hidden />
            </div>
          </div>

          <div className={s.pdfActions}>
            <button className={s.pdfActionSecondary} type="button" onClick={handleOpenDocument}>
              <LuFileText aria-hidden />
              Ver
            </button>
            <button
              className={s.pdfActionSecondary}
              type="button"
              onClick={handleDownload}
            >
              <LuDownload aria-hidden />
              Descargar
            </button>
          </div>
        </article>

        <p className={s.trustNote}>
          <LuShieldCheck aria-hidden />
          Al aprobar, notificamos al equipo comercial al instante. Tus datos estan protegidos.
        </p>

        {isFinalState ? (
          <article className={s.finalCard}>
            <span className={s.sectionLabel}>RESPUESTA REGISTRADA</span>
            <h2 className={s.finalTitle}>{decisionMessage}</h2>
            <p className={s.finalText}>
              {quote.estado === "aprobada"
                ? "La empresa ya recibio tu aprobacion y puede continuar con el siguiente paso."
                : "La empresa ya recibio tu respuesta y puede revisarla contigo si hace falta ajustar."}
            </p>
          </article>
        ) : quote.canRespond ? (
          <div className={s.actionsSticky}>
            <form action={acceptAction ?? undefined} className={s.actionForm}>
              <button className={s.actionPrimary} type="submit">
                Aprobar presupuesto
              </button>
            </form>
            <form action={rejectAction ?? undefined} className={s.actionForm}>
              <button className={s.actionSecondary} type="submit">
                Prefiero revisarlo
              </button>
            </form>
          </div>
        ) : (
          <article className={s.finalCard}>
            <span className={s.sectionLabel}>ESTADO FINAL</span>
            <h2 className={s.finalTitle}>
              {quote.isExpired ? "La vigencia termino" : "Esta respuesta ya fue registrada"}
            </h2>
            <p className={s.finalText}>
              {quote.isExpired
                ? "La propuesta ya vencio y no se puede responder desde este enlace."
                : quote.estado === "rechazada"
                  ? "Tu respuesta fue registrada como rechazada."
                  : "Tu respuesta fue registrada y la empresa ya la recibio."}
            </p>
          </article>
        )}

      </section>

      {isDocumentOpen ? (
        <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Vista completa del presupuesto">
          <button className={s.overlayBackdrop} type="button" onClick={() => setIsDocumentOpen(false)} />
          <div className={s.overlayPanel}>
            <div className={s.overlayHeader}>
              <div className={s.overlayTitleBlock}>
                <span className={s.sectionLabel}>PROPUESTA COMPLETA</span>
                <strong className={s.overlayTitle}>{quote.codigo}</strong>
              </div>
              <div className={s.overlayActions}>
                <button
                  className={s.overlayAction}
                  type="button"
                  onClick={handleDownload}
                >
                  <LuDownload aria-hidden />
                  Descargar
                </button>
                <button className={s.overlayClose} type="button" onClick={() => setIsDocumentOpen(false)}>
                  <LuX aria-hidden />
                </button>
              </div>
            </div>

            <div className={s.overlayBody}>
              <div className={s.overlayDocument}>
                <PublicQuoteDocument
                  quote={quote}
                  backHref={`/presupuesto/${quote.approvalToken}`}
                  downloadOnLoad={false}
                  embedded
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useState } from "react";
import {
  LuCalendarClock,
  LuShieldCheck,
} from "react-icons/lu";

import { formatCotizacionDate } from "@/features/cotizaciones/services/cotizaciones-workflow.service";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { formatQuoteCurrency } from "@/features/organization-region/services/quote-region-display.service";
import type { QuoteRegionSnapshot } from "@/features/organization-region/types/quote-region-snapshot";

import s from "./public-quote-mobile.module.css";
import { PublicQuoteActionButton } from "./public-quote-action-button";

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
  regionalSnapshot?: QuoteRegionSnapshot | null;
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
  const [showDetails, setShowDetails] = useState(true);
  const formatMoney = (value: number) => formatQuoteCurrency(value, quote.regionalSnapshot);

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

  const surfaceM2 = quote.items.reduce((accumulator, item) => {
    if (!item.ancho || !item.alto) {
      return accumulator;
    }

    return accumulator + (item.ancho * item.alto * item.cantidad) / 1_000_000;
  }, 0);
  const showItemPrices = quote.pricingMode !== "total_global";
  const documentUrl = `/presupuesto/${quote.approvalToken}/documento`;
  const downloadUrl = `/presupuesto/${quote.approvalToken}/documento?download=1`;
  const issueDate = formatShortDate(quote.createdAt ?? quote.updatedAt);
  const isFinalState = Boolean(decisionMessage);
  const canShowReviewTools = quote.canRespond && !isFinalState;
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
  };
  const handleDownload = () => {
    googleTagService.trackPdfAction({
      action: "download",
      quoteCode: quote.codigo,
      source: "public-quote",
    });
  };

  return (
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
            <strong className={s.totalValue}>{formatMoney(quote.total)}</strong>
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
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>TOTAL</span>
            <strong className={`${s.summaryValue} ${s.summaryValueTotal}`}>{formatMoney(quote.total)}</strong>
          </div>
        </article>

        {canShowReviewTools ? (
          <>
        <article className={s.detailsCard}>
          <button
            type="button"
            className={s.detailsSummary}
            onClick={() => setShowDetails((current) => !current)}
            aria-expanded={showDetails}
          >
            {showDetails ? "Ocultar detalle del presupuesto" : "Ver que incluye este presupuesto"}
          </button>
          {showDetails ? (
            <div className={s.detailsBody}>
            {quote.items.slice(0, 3).map((item) => {
                const itemMeta = decodeCotizacionItemPresentationMeta(item.observaciones);
                const isFreeValueItem =
                  item.tipoItem === "item_libre_con_valor" ||
                  itemMeta.displayMode === "item_libre";
                const isGlassProduct =
                  itemMeta.catalogCategoria === "vidrio" || itemMeta.material === "Cristal";
                const glassProductLabel = [
                  itemMeta.referencia || item.vidrio || "Producto de cristal",
                  itemMeta.catalogEspesor,
                ]
                  .filter(Boolean)
                  .join(" · ");

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
                        {isFreeValueItem
                          ? "Item libre"
                          : isGlassProduct
                            ? glassProductLabel
                            : item.vidrio || "Vidrio por definir"}
                      </span>
                      {showItemPrices || (isFreeValueItem && item.precioTotal > 0) ? (
                        <strong className={s.itemTotal}>{formatMoney(item.precioTotal)}</strong>
                      ) : null}
                    </div>
                  </div>
                );
            })}
            {quote.items.length > 3 ? (
              <p className={s.moreItems}>+ {quote.items.length - 3} componentes mas</p>
            ) : null}
            </div>
          ) : null}
        </article>

        <div className={s.pdfActionsCompact} aria-label="Acciones del PDF">
          <a className={s.pdfActionPrimary} href={documentUrl} onClick={handleOpenDocument}>
            Ver PDF
          </a>
          <a className={s.pdfActionSecondary} href={downloadUrl} onClick={handleDownload}>
            Descargar PDF
          </a>
        </div>

        <p className={s.trustNote}>
          <LuShieldCheck aria-hidden />
          Al aprobar, notificamos al equipo comercial al instante. Tus datos estan protegidos.
        </p>
          </>
        ) : null}

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
              <PublicQuoteActionButton
                className={s.actionPrimary}
                contentClassName={s.actionButtonContent}
                pendingClassName={s.actionPending}
                spinnerClassName={s.actionSpinner}
                pendingLabel="Registrando aprobacion..."
              >
                Aprobar presupuesto
              </PublicQuoteActionButton>
            </form>
            <form action={rejectAction ?? undefined} className={s.actionForm}>
              <PublicQuoteActionButton
                className={s.actionSecondary}
                contentClassName={s.actionButtonContent}
                pendingClassName={s.actionPending}
                spinnerClassName={s.actionSpinner}
                pendingLabel="Registrando respuesta..."
              >
                Prefiero revisarlo
              </PublicQuoteActionButton>
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
  );
}

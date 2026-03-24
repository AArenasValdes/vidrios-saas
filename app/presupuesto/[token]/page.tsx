import type { CSSProperties } from "react";

import { acceptPublicQuoteAction, rejectPublicQuoteAction } from "./actions";
import { PublicQuotePreview } from "./public-quote-preview";
import { publicCotizacionApprovalService } from "@/services/public-cotizacion-approval.service";

import s from "./page.module.css";

const CLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

function formatDate(value: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function PresupuestoPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ decision?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  let quote = null;
  let loadError: string | null = null;

  try {
    await publicCotizacionApprovalService.registerView(token);
    quote = await publicCotizacionApprovalService.resolveByToken(token);
  } catch (error) {
    if (error instanceof Error) {
      loadError = error.message;
    } else if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      loadError = typeof message === "string" ? message : "No se pudo abrir este presupuesto.";
    } else {
      loadError = "No se pudo abrir este presupuesto.";
    }
  }

  if (loadError) {
    return (
      <main className={s.page}>
        <section className={`${s.shell} ${s.emptyPage}`}>
          <article className={s.stateCard}>
            <p className={s.eyebrow}>Presupuesto no disponible</p>
            <h1 className={s.stateTitle}>No pudimos abrir este presupuesto</h1>
            <p className={s.stateText}>{loadError}</p>
          </article>
        </section>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className={s.page}>
        <section className={`${s.shell} ${s.emptyPage}`}>
          <article className={s.stateCard}>
            <p className={s.eyebrow}>Presupuesto no disponible</p>
            <h1 className={s.stateTitle}>No encontramos este presupuesto</h1>
            <p className={s.stateText}>
              El link no es valido, ya no existe o fue reemplazado por una version nueva.
            </p>
          </article>
        </section>
      </main>
    );
  }

  const brandStyle = {
    "--brand": quote.organizationProfile.brandColor,
  } as CSSProperties;
  const decisionMessage =
    query.decision === "aceptada"
      ? "Presupuesto aceptado correctamente."
      : query.decision === "rechazada"
        ? "Presupuesto rechazado correctamente."
        : null;
  const hasDecisionState = Boolean(decisionMessage);
  const statusClass =
    quote.estado === "aprobada"
      ? s.statusAprobada
      : quote.estado === "rechazada"
        ? s.statusRechazada
        : s.statusPendiente;
  const acceptAction = acceptPublicQuoteAction.bind(null, token);
  const rejectAction = rejectPublicQuoteAction.bind(null, token);

  return (
    <main className={s.page} style={brandStyle}>
      <section className={s.shell}>
        {hasDecisionState ? (
          <article className={s.finalStateCard}>
            <p className={s.eyebrow}>Respuesta registrada</p>
            <h1 className={s.finalStateTitle}>{decisionMessage}</h1>
            <p className={s.finalStateText}>
              {quote.estado === "aprobada"
                ? "La empresa ya recibio tu aprobacion y seguira el siguiente paso contigo."
                : "La empresa ya recibio tu respuesta y puede revisar contigo una nueva propuesta si hace falta."}
            </p>
            <div className={s.finalStateMeta}>
              <span>{quote.codigo}</span>
              <span>{quote.obra}</span>
              <strong>{CLP(quote.total)}</strong>
            </div>
          </article>
        ) : null}

        {!hasDecisionState ? (
        <article className={s.responseCard}>
          <div className={s.responseHeader}>
            <div className={s.responseCopy}>
              <p className={s.eyebrow}>Presupuesto cliente</p>
              <h1 className={s.stateTitle}>{quote.codigo}</h1>
              <p className={s.stateText}>
                Revisa la misma hoja comercial del presupuesto y responde desde aqui.
              </p>
            </div>

            <div className={s.responseMeta}>
              <span className={`${s.statusBadge} ${statusClass}`}>
                {quote.estado === "aprobada"
                  ? "Aprobada"
                  : quote.estado === "rechazada"
                    ? "Rechazada"
                    : "Pendiente"}
              </span>
              <div className={s.responseFacts}>
                <span>{quote.clienteNombre}</span>
                <span>{quote.obra}</span>
                <strong>{CLP(quote.total)}</strong>
              </div>
            </div>
          </div>
          {!quote.canRespond ? (
            <div className={s.responseNotice}>
              <p className={s.eyebrow}>Estado final</p>
              <p className={s.responseNoticeText}>
                {quote.isExpired
                  ? "La vigencia de esta oferta termino y ya no se puede responder desde este link."
                  : `La respuesta fue registrada el ${formatDate(quote.clienteRespondioEn)}.`}
              </p>
            </div>
          ) : (
            <div className={s.actions}>
              <form action={rejectAction}>
                <button className={s.actionSecondary} type="submit">
                  Rechazar cotizacion
                </button>
              </form>
              <form action={acceptAction}>
                <button
                  className={s.actionPrimary}
                  style={{ background: quote.organizationProfile.brandColor }}
                  type="submit"
                >
                  Aceptar cotizacion
                </button>
              </form>
            </div>
          )}
        </article>
        ) : null}

        {!hasDecisionState ? <PublicQuotePreview quote={quote} /> : null}
      </section>
    </main>
  );
}

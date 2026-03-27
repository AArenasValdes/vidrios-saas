import Image from "next/image";
import type { CSSProperties } from "react";
import {
  LuBadgeCheck,
  LuBuilding2,
  LuCalendarClock,
  LuShieldCheck,
  LuWallet,
} from "react-icons/lu";

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
        <article className={s.hero}>
          <div className={s.heroTop}>
            <div className={s.heroTrustBar}>
              <div className={s.logoWrap}>
                <Image
                  src="/brand/ventora-logo-navy.svg"
                  alt="Ventora"
                  width={164}
                  height={42}
                  className={s.ventoraLogo}
                  priority
                />
              </div>
              <span className={s.heroTrustPill}>
                <LuShieldCheck aria-hidden />
                Respuesta segura
              </span>
            </div>
            <span className={`${s.statusBadge} ${statusClass}`}>
              {quote.estado === "aprobada"
                ? "Aprobada"
                : quote.estado === "rechazada"
                  ? "Rechazada"
                  : "Pendiente"}
            </span>
          </div>

          <div className={s.heroLayout}>
            <div className={s.heroMain}>
              <div className={s.brandRow}>
                <div className={s.brandMeta}>
                  <span className={s.eyebrow}>Presupuesto comercial verificado</span>
                  <strong className={s.companyName}>
                    {quote.organizationProfile.empresaNombre}
                  </strong>
                  <span className={s.companyMeta}>
                    Documento presentado a traves de Ventora para{" "}
                    <strong>{quote.obra}</strong>. Revisa los datos principales, confirma el
                    alcance y responde con la misma claridad profesional con la que fue
                    preparado.
                  </span>
                </div>
              </div>

              <div className={s.heroCopy}>
                <h1 className={s.title}>{quote.codigo}</h1>
                <p className={s.subtitle}>
                  Revisa el monto final, valida esta propuesta y deja tu decision
                  registrada al instante. Ventora la envia directo al equipo comercial,
                  sin llamadas, sin mensajes cruzados y sin perder contexto.
                </p>
              </div>

              <div className={s.heroJourney}>
                <span className={s.heroJourneyStep}>1. Revisa el resumen</span>
                <span className={s.heroJourneyStep}>2. Mira la propuesta completa</span>
                <span className={s.heroJourneyStep}>3. Confirma tu decision</span>
              </div>

              <div className={s.heroGrid}>
                <div className={s.metaCard}>
                  <span>Cliente</span>
                  <strong>{quote.clienteNombre}</strong>
                </div>
                <div className={s.metaCard}>
                  <span>Empresa</span>
                  <strong>{quote.organizationProfile.empresaNombre}</strong>
                </div>
                <div className={s.metaCard}>
                  <span>Proyecto</span>
                  <strong>{quote.obra}</strong>
                </div>
                <div className={s.metaCard}>
                  <span>Vigencia</span>
                  <strong>{quote.validez}</strong>
                </div>
              </div>
            </div>

            <aside className={s.heroAside}>
              <div className={s.heroAsideTop}>
                <span className={s.heroAsideLabel}>Resumen ejecutivo</span>
                <strong className={s.heroAsideTotal}>{CLP(quote.total)}</strong>
              </div>

              <div className={s.heroAsideFacts}>
                <div className={s.heroAsideFact}>
                  <LuBuilding2 aria-hidden />
                  <div>
                    <span>Empresa</span>
                    <strong>{quote.organizationProfile.empresaNombre}</strong>
                  </div>
                </div>
                <div className={s.heroAsideFact}>
                  <LuWallet aria-hidden />
                  <div>
                    <span>Total oferta</span>
                    <strong>{CLP(quote.total)}</strong>
                  </div>
                </div>
                <div className={s.heroAsideFact}>
                  <LuCalendarClock aria-hidden />
                  <div>
                    <span>Vigencia</span>
                    <strong>{quote.validez}</strong>
                  </div>
                </div>
              </div>

              <div className={s.heroAsideNotice}>
                <LuBadgeCheck aria-hidden />
                <p>
                  Ventora registra esta decision como respaldo comercial del presupuesto y
                  la comparte de inmediato con la empresa.
                </p>
              </div>
            </aside>
          </div>
        </article>

        {hasDecisionState ? (
          <article className={s.finalStateCard}>
            <div className={s.finalStateBadgeRow}>
              <span className={s.eyebrow}>Respuesta registrada</span>
              <span className={s.finalStateBrand}>Impulsado por Ventora</span>
            </div>
            <h1 className={s.finalStateTitle}>{decisionMessage}</h1>
            <p className={s.finalStateText}>
              {quote.estado === "aprobada"
                ? "La empresa ya recibio tu aprobacion y puede continuar contigo el siguiente paso comercial o tecnico."
                : "La empresa ya recibio tu respuesta y puede revisar contigo una alternativa si necesitas ajustes."}
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
                <p className={s.eyebrow}>Respuesta del cliente</p>
                <h2 className={s.stateTitle}>Confirma tu decision sobre esta propuesta</h2>
                <p className={s.stateText}>
                  Revisa el resumen, confirma si quieres avanzar y responde en menos de un
                  minuto desde este mismo enlace.
                </p>
              </div>

              <div className={s.responseMeta}>
                <div className={s.responseFacts}>
                  <span>{quote.clienteNombre}</span>
                  <span>{quote.obra}</span>
                  <strong>{CLP(quote.total)}</strong>
                </div>
                <div className={s.responseSignal}>
                  <span className={s.responseSignalDot} aria-hidden />
                  Enlace seguro verificado por Ventora
                </div>
              </div>
            </div>

            {!quote.canRespond ? (
              <div className={s.responseNotice}>
                <p className={s.eyebrow}>Estado final</p>
                <p className={s.responseNoticeText}>
                  {quote.isExpired
                    ? "La vigencia de esta oferta termino y ya no se puede responder desde este enlace."
                    : `Tu respuesta quedo registrada el ${formatDate(quote.clienteRespondioEn)}.`}
                </p>
              </div>
            ) : (
              <>
                <div className={s.responseSummaryGrid}>
                  <div className={s.summaryCard}>
                    <span>Cliente</span>
                    <strong>{quote.clienteNombre}</strong>
                  </div>
                  <div className={s.summaryCard}>
                    <span>Proyecto</span>
                    <strong>{quote.obra}</strong>
                  </div>
                  <div className={s.summaryCard}>
                    <span>Total a confirmar</span>
                    <strong>{CLP(quote.total)}</strong>
                  </div>
                  <div className={s.summaryCard}>
                    <span>Valido hasta</span>
                    <strong>{quote.validez}</strong>
                  </div>
                </div>

                <div className={s.actionsHeader}>
                  <div>
                    <h3 className={s.actionsTitle}>Responder ahora</h3>
                    <p className={s.actionsHelper}>
                      Si esta propuesta encaja con tu proyecto, apruebala y acelera el
                      siguiente paso. Si prefieres revisarla primero, la empresa podra
                      ajustar contigo una nueva version sin perder este contexto.
                    </p>
                  </div>
                </div>

                <div className={s.actions}>
                  <form action={rejectAction} className={s.actionForm}>
                    <button className={s.actionSecondary} type="submit">
                      Prefiero revisarlo antes
                    </button>
                  </form>
                  <form action={acceptAction} className={s.actionForm}>
                    <button className={s.actionPrimary} type="submit">
                      Aprobar y continuar
                    </button>
                  </form>
                </div>
              </>
            )}
          </article>
        ) : null}

        {!hasDecisionState ? <PublicQuotePreview quote={quote} /> : null}
      </section>
    </main>
  );
}

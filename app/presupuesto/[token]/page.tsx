import type { CSSProperties } from "react";

import { acceptPublicQuoteAction, rejectPublicQuoteAction } from "./actions";
import { publicCotizacionApprovalService } from "@/services/public-cotizacion-approval.service";

import s from "./page.module.css";

const CLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);

function normalizeComparableComponentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isLegacyAutoComponentLabel(tipo: string, descripcion: string) {
  const normalizedDescription = normalizeComparableComponentText(descripcion);
  const normalizedTipo = normalizeComparableComponentText(tipo);

  if (!normalizedDescription || !normalizedTipo) {
    return false;
  }

  const parts = normalizedDescription.split(" ");
  const tipoParts = normalizedTipo.split(" ");

  if (parts.length !== tipoParts.length + 1) {
    return false;
  }

  const trailingCode = parts.at(-1) ?? "";

  if (!/^[a-z]{1,3}\d{1,4}$/.test(trailingCode)) {
    return false;
  }

  return parts.slice(0, -1).join(" ") === normalizedTipo;
}

function getVisibleComponentDescription(tipo: string, nombre: string, descripcion: string) {
  const trimmedDescription = descripcion.trim();

  if (!trimmedDescription) {
    return "";
  }

  return (
    normalizeComparableComponentText(trimmedDescription) ===
      normalizeComparableComponentText(nombre) ||
    isLegacyAutoComponentLabel(tipo, trimmedDescription)
  )
    ? ""
    : trimmedDescription;
}

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
          <div className={s.brandRow}>
            <div className={s.logoWrap}>
              {quote.organizationProfile.empresaLogoUrl ? (
                <img
                  alt={quote.organizationProfile.empresaNombre}
                  className={s.logo}
                  src={quote.organizationProfile.empresaLogoUrl}
                />
              ) : (
                <div
                  className={s.logoFallback}
                  style={{ background: quote.organizationProfile.brandColor }}
                >
                  {quote.organizationProfile.empresaNombre.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className={s.brandMeta}>
              <span className={s.eyebrow}>Oferta cliente</span>
              <strong className={s.companyName}>{quote.organizationProfile.empresaNombre}</strong>
              <span className={s.companyMeta}>
                {[quote.organizationProfile.empresaDireccion, quote.organizationProfile.empresaTelefono]
                  .filter(Boolean)
                  .join(" | ")}
              </span>
            </div>
          </div>

          <div className={s.heroTop}>
            <div>
              <h1 className={s.title}>{quote.codigo}</h1>
              <p className={s.subtitle}>
                Revisa el presupuesto, confirma si quieres seguir adelante y nosotros
                registraremos tu respuesta de inmediato.
              </p>
            </div>
            <span className={`${s.statusBadge} ${statusClass}`}>
              {quote.estado === "aprobada"
                ? "Aprobada"
                : quote.estado === "rechazada"
                  ? "Rechazada"
                  : "Pendiente"}
            </span>
          </div>

          <div className={s.heroGrid}>
            <div className={s.metaCard}>
              <span>Cliente</span>
              <strong>{quote.clienteNombre}</strong>
            </div>
            <div className={s.metaCard}>
              <span>Obra</span>
              <strong>{quote.obra}</strong>
            </div>
            <div className={s.metaCard}>
              <span>Vigencia</span>
              <strong>{quote.validez}</strong>
            </div>
            <div className={s.metaCard}>
              <span>Total</span>
              <strong>{CLP(quote.total)}</strong>
            </div>
          </div>
        </article>

        <section className={s.summary}>
          <div>
            <p className={s.eyebrow}>Resumen del presupuesto</p>
            <h2 className={s.sectionTitle}>Revisar y responder presupuesto</h2>
            <p className={s.helper}>
              Este presupuesto incluye {quote.items.length} componente
              {quote.items.length === 1 ? "" : "s"}. Si aceptas, la empresa vera la
              aprobacion al instante dentro del sistema.
            </p>
          </div>

          <div className={s.summaryGrid}>
            <div className={s.summaryCard}>
              <span>Creado</span>
              <strong>{formatDate(quote.createdAt)}</strong>
            </div>
            <div className={s.summaryCard}>
              <span>Ultima actualizacion</span>
              <strong>{formatDate(quote.updatedAt)}</strong>
            </div>
            <div className={s.summaryCard}>
              <span>Subtotal</span>
              <strong>{CLP(quote.subtotal)}</strong>
            </div>
            <div className={s.summaryCard}>
              <span>IVA + flete</span>
              <strong>{CLP(quote.iva + quote.flete)}</strong>
            </div>
          </div>
        </section>

        <section className={s.itemsCard}>
          <div>
            <p className={s.eyebrow}>Componentes</p>
            <h2 className={s.sectionTitle}>Lo que incluye este trabajo</h2>
          </div>

          <div className={s.itemList}>
            {quote.items.map((item) => (
              <article key={item.id} className={s.itemRow}>
                <div className={s.itemHead}>
                  <span
                    className={s.itemCode}
                    style={{ background: quote.organizationProfile.brandColor }}
                  >
                    {item.codigo}
                  </span>
                  <strong className={s.itemPrice}>{CLP(item.precioTotal)}</strong>
                </div>
                <h3 className={s.itemName}>{item.nombre}</h3>
                {getVisibleComponentDescription(item.tipo, item.nombre, item.descripcion) ? (
                  <p className={s.itemDesc}>
                    {getVisibleComponentDescription(item.tipo, item.nombre, item.descripcion)}
                  </p>
                ) : null}
                <div className={s.itemFoot}>
                  <p className={s.itemSpecs}>
                    {[item.tipo, item.vidrio, `${item.cantidad} ${item.unidad}`]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                  <p className={s.itemSpecs}>
                    {item.ancho && item.alto
                      ? `${item.ancho} x ${item.alto} mm`
                      : "Medidas por definir"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {quote.observaciones ? (
          <article className={s.stateCard}>
            <p className={s.eyebrow}>Condiciones</p>
            <h2 className={s.sectionTitle}>Notas del presupuesto</h2>
            <p className={s.stateText}>{quote.observaciones}</p>
          </article>
        ) : null}

        {decisionMessage ? (
          <article className={s.stateCard}>
            <p className={s.eyebrow}>Respuesta registrada</p>
            <h2 className={s.stateTitle}>{decisionMessage}</h2>
            <p className={s.stateText}>
              Estado actual: {quote.estado === "aprobada" ? "Aprobada" : "Rechazada"}.
            </p>
          </article>
        ) : null}

        {!quote.canRespond ? (
          <article className={s.stateCard}>
            <p className={s.eyebrow}>Estado final</p>
            <h2 className={s.stateTitle}>
              {quote.isExpired
                ? "Este presupuesto ya expiro"
                : quote.estado === "aprobada"
                  ? "Presupuesto aprobado"
                  : quote.estado === "rechazada"
                    ? "Presupuesto rechazado"
                    : "Presupuesto sin cambios"}
            </h2>
            <p className={s.stateText}>
              {quote.isExpired
                ? "La vigencia de esta oferta termino y ya no se puede responder desde este link."
                : `La respuesta fue registrada el ${formatDate(quote.clienteRespondioEn)}.`}
            </p>
          </article>
        ) : (
          <div className={s.actions}>
            <form action={rejectAction}>
              <button className={s.actionSecondary} type="submit">
                Rechazar presupuesto
              </button>
            </form>
            <form action={acceptAction}>
              <button
                className={s.actionPrimary}
                style={{ background: quote.organizationProfile.brandColor }}
                type="submit"
              >
                Aceptar presupuesto
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}

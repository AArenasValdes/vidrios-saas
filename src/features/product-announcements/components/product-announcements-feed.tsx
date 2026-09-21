"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LuArrowUpRight, LuChevronDown, LuChevronUp, LuMegaphone } from "react-icons/lu";
import {
  PRODUCT_ANNOUNCEMENT_CATEGORIES,
  type ProductAnnouncement,
} from "@/features/product-announcements/types/product-announcement";
import s from "./product-announcements-feed.module.css";

type ApiPayload = { announcements?: ProductAnnouncement[]; unreadCount?: number; error?: string };

function formatDate(value: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

type AnnouncementBodySection = {
  heading: string | null;
  paragraphs: string[];
  listItems: string[];
  location?: string;
  locationLabel?: string;
  note?: string;
  privacy?: string;
};

type AnnouncementFeedPresentation = {
  title: string;
  summary: string;
  bodySections: AnnouncementBodySection[];
};

const ANNOUNCEMENT_PRESENTATION_OVERRIDES: Record<string, AnnouncementFeedPresentation> = {
  "9026be5c-f53d-45c2-bf95-b13ef0f87073": {
    title: "Más formas de cotizar y controlar tus trabajos",
    summary: "Vidrios, rentabilidad y nuevas líneas.",
    bodySections: [
      {
        heading: "Vidrios y cristales",
        paragraphs: [
          "Guarda productos de cristal con espesor, terminación y precio por m²; reutilízalos en reposiciones, espejos, termopaneles y opciones personalizadas.",
        ],
        listItems: [],
        location: "Configuración de empresa → Catálogo privado → Líneas y precios → Nuevo vidrio",
        locationLabel: "Configúralos en:",
      },
      {
        heading: "Costos y rentabilidad",
        paragraphs: [
          "Define mano de obra, traslado, otros costos, merma y margen objetivo. Si agregas el costo de materiales, Ventora estima utilidad y margen antes de enviar.",
        ],
        listItems: [],
        location: "Configuración de empresa → Costos y rentabilidad. La estimación aparece en el Paso 3.",
        locationLabel: "Configúralos en:",
        privacy: "Los costos son internos y no aparecen en el PDF del cliente.",
      },
      {
        heading: "Más líneas y variantes",
        paragraphs: [
          "Veratec 7400 PVC (corredera de 2 hojas), Serie 45 practicable, Serie 4800 SODAL, líneas 15 y 4000 y variantes ALAR/SODAL para AL-42.",
        ],
        listItems: [],
        location: "Configuración de empresa → Catálogo privado → Líneas y precios. Ahí revisas precios y cuáles están activas para cotizar.",
        locationLabel: "Adminístralas en:",
        note: "La cubicación y el despiece varían por línea; algunas pautas siguen en validación.",
      },
      {
        heading: "¿Falta una línea que utilizas?",
        paragraphs: [
          "Envíanos proveedor, línea y tipo de apertura. Así priorizamos nuevas incorporaciones.",
        ],
        listItems: [],
      },
    ],
  },
};

function toSentenceCase(value: string) {
  const text = value.trim().toLocaleLowerCase("es-CL");
  return text.replace(/^([¿¡]?\s*)(\p{L})/u, (_, prefix: string, firstLetter: string) =>
    `${prefix}${firstLetter.toLocaleUpperCase("es-CL")}`
  );
}

function isSectionHeading(line: string) {
  const letterCount = (line.match(/\p{L}/gu) ?? []).length;
  return line.length <= 80 && letterCount >= 3 && line === line.toLocaleUpperCase("es-CL");
}

function parseAnnouncementBody(body: string): AnnouncementBodySection[] {
  const sections: AnnouncementBodySection[] = [];
  let current: AnnouncementBodySection = { heading: null, paragraphs: [], listItems: [] };
  let paragraphLines: string[] = [];
  let continuingList = false;

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      current.paragraphs.push(paragraphLines.join(" "));
      paragraphLines = [];
    }
    continuingList = false;
  };
  const saveSection = () => {
    if (current.heading || current.paragraphs.length > 0 || current.listItems.length > 0) {
      sections.push(current);
    }
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    if (isSectionHeading(line)) {
      flushParagraph();
      saveSection();
      current = { heading: toSentenceCase(line), paragraphs: [], listItems: [] };
      continue;
    }

    const bullet = line.match(/^(?:•|[-–])\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      current.listItems.push(bullet[1]);
      continuingList = true;
      continue;
    }

    if (continuingList && current.listItems.length > 0) {
      const lastIndex = current.listItems.length - 1;
      current.listItems[lastIndex] = `${current.listItems[lastIndex]} ${line}`;
    } else {
      paragraphLines.push(line);
    }
  }

  flushParagraph();
  saveSection();
  return sections;
}

function publishUnreadCount(count: number) {
  window.dispatchEvent(new CustomEvent("ventora:novedades-unread", { detail: count }));
}

export function ProductAnnouncementsFeed() {
  const [announcements, setAnnouncements] = useState<ProductAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [readingIds, setReadingIds] = useState<string[]>([]);
  const [readErrors, setReadErrors] = useState<Record<string, string>>({});

  const loadAnnouncements = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/novedades", { cache: "no-store" });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar las novedades.");
      const rows = payload.announcements ?? [];
      setAnnouncements(rows);
      publishUnreadCount(payload.unreadCount ?? rows.filter((item) => !item.isRead).length);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar las novedades.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadAnnouncements(); }, [loadAnnouncements]);

  async function markAsRead(announcement: ProductAnnouncement) {
    if (announcement.isRead || readingIds.includes(announcement.id)) return;
    setReadingIds((ids) => [...ids, announcement.id]);
    setReadErrors((errors) => ({ ...errors, [announcement.id]: "" }));
    try {
      const response = await fetch("/api/novedades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: announcement.id }),
      });
      const payload = (await response.json()) as { unreadCount?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos guardar la lectura.");
      setAnnouncements((items) => items.map((item) => item.id === announcement.id ? { ...item, isRead: true } : item));
      publishUnreadCount(payload.unreadCount ?? Math.max(0, announcements.filter((item) => !item.isRead).length - 1));
    } catch (readError) {
      setReadErrors((errors) => ({
        ...errors,
        [announcement.id]: readError instanceof Error ? readError.message : "No pudimos guardar la lectura.",
      }));
    } finally {
      setReadingIds((ids) => ids.filter((id) => id !== announcement.id));
    }
  }

  function toggleDetails(announcement: ProductAnnouncement) {
    const isExpanded = expandedIds.includes(announcement.id);
    if (isExpanded && !readErrors[announcement.id]) {
      setExpandedIds((ids) => ids.filter((id) => id !== announcement.id));
      return;
    }

    setExpandedIds((ids) => ids.includes(announcement.id) ? ids : [...ids, announcement.id]);
    if (isExpanded && readErrors[announcement.id]) {
      void markAsRead(announcement);
    } else if (!announcement.isRead) {
      void markAsRead(announcement);
    }
  }

  return (
    <main className={s.page}>
      <header className={s.header}>
        <span className={s.eyebrow}><LuMegaphone aria-hidden /> Actualizaciones del producto</span>
        <h1>Novedades de Ventora</h1>
        <p>Mejoras y funciones nuevas que incorporamos a partir de lo que necesitan los talleres.</p>
      </header>

      {error ? <div className={s.error} role="alert">{error}</div> : null}
      {isLoading ? (
        <div className={s.loadingState} role="status">Cargando novedades…</div>
      ) : announcements.length === 0 ? (
        <div className={s.emptyState}>
          <span className={s.emptyIcon}><LuMegaphone aria-hidden /></span>
          <strong>Todavía no hay novedades</strong>
          <span>Cuando publiquemos una mejora, aparecerá aquí.</span>
        </div>
      ) : (
        <section className={s.list} aria-label="Actualizaciones publicadas">
          {announcements.map((announcement) => {
            const categoryLabel = PRODUCT_ANNOUNCEMENT_CATEGORIES.find((item) => item.value === announcement.category)?.label ?? "Actualización";
            const presentation = ANNOUNCEMENT_PRESENTATION_OVERRIDES[announcement.id];
            const bodySections = presentation?.bodySections ?? parseAnnouncementBody(announcement.body);
            const isExpanded = expandedIds.includes(announcement.id);
            const isReading = readingIds.includes(announcement.id);
            const detailsId = `announcement-details-${announcement.id}`;
            const readError = readErrors[announcement.id];

            return (
              <article className={`${s.card} ${announcement.isRead ? "" : s.unread}`} key={announcement.id}>
                <div className={s.meta}>
                  <span className={s.category}>{categoryLabel}</span>
                  {!announcement.isRead ? <span className={s.newLabel}>Nueva</span> : null}
                  <time dateTime={announcement.publishedAt ?? undefined}>{formatDate(announcement.publishedAt)}</time>
                </div>
                <h2>{presentation?.title ?? announcement.title}</h2>
                <p className={s.summary}>{presentation?.summary ?? announcement.summary}</p>

                {isExpanded ? (
                  <div className={s.details} id={detailsId}>
                    <div className={s.readingContent}>
                      {bodySections.map((section, index) => (
                        section.heading ? (
                          <section className={s.bodySection} aria-labelledby={`${detailsId}-section-${index}`} key={`${index}-${section.heading}`}>
                            <h3 className={s.bodyHeading} id={`${detailsId}-section-${index}`}>{section.heading}</h3>
                            {section.paragraphs.map((paragraph, paragraphIndex) => (
                              <p className={s.bodyParagraph} key={`${index}-paragraph-${paragraphIndex}`}>{paragraph}</p>
                            ))}
                            {section.location ? (
                              <p className={s.bodyLocation} key={`${index}-location`}>
                                <strong>{section.locationLabel ?? "Dónde:"}</strong> {section.location}
                              </p>
                            ) : null}
                            {section.note ? (
                              <p className={s.bodyNote} key={`${index}-note`}>{section.note}</p>
                            ) : null}
                            {section.privacy ? (
                              <p className={s.bodyPrivacy} key={`${index}-privacy`}>{section.privacy}</p>
                            ) : null}
                            {section.listItems.length > 0 ? (
                              <ul className={s.bodyList}>
                                {section.listItems.map((item, itemIndex) => <li key={`${index}-item-${itemIndex}`}>{item}</li>)}
                              </ul>
                            ) : null}
                          </section>
                        ) : (
                          <div className={s.bodyIntro} key={`${index}-intro`}>
                            {section.paragraphs.map((paragraph, paragraphIndex) => (
                              <p className={s.bodyLead} key={`${index}-lead-${paragraphIndex}`}>{paragraph}</p>
                            ))}
                            {section.listItems.length > 0 ? (
                              <ul className={s.bodyList}>
                                {section.listItems.map((item, itemIndex) => <li key={`${index}-intro-item-${itemIndex}`}>{item}</li>)}
                              </ul>
                            ) : null}
                          </div>
                        )
                      ))}
                    </div>
                    {announcement.actionHref && announcement.actionLabel ? (
                      <Link className={s.actionLink} href={announcement.actionHref}>
                        {announcement.actionLabel}<LuArrowUpRight aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                <div className={s.cardFooter}>
                  {readError ? <p className={s.readError} role="alert">{readError}</p> : null}
                  <button
                    type="button"
                    className={s.readButton}
                    disabled={isReading}
                    aria-expanded={isExpanded}
                    aria-controls={isExpanded ? detailsId : undefined}
                    onClick={() => toggleDetails(announcement)}
                  >
                    <span>{isReading ? "Guardando lectura…" : isExpanded ? "Cerrar detalle" : "Ver actualización"}</span>
                    {isExpanded ? <LuChevronUp aria-hidden /> : <LuChevronDown aria-hidden />}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

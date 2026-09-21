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
                <h2>{announcement.title}</h2>
                <p className={s.summary}>{announcement.summary}</p>

                {isExpanded ? (
                  <div className={s.details} id={detailsId}>
                    <p className={s.body}>{announcement.body}</p>
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

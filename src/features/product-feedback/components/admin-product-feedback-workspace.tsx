"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuRefreshCw, LuSearch } from "react-icons/lu";

import {
  PRODUCT_FEEDBACK_CATEGORIES,
  PRODUCT_FEEDBACK_STATUSES,
  type AdminProductFeedbackWorkspace as Workspace,
  type ProductFeedbackStatus,
} from "@/features/product-feedback/types/product-feedback";
import s from "./admin-product-feedback-workspace.module.css";

type FeedbackApiResponse = {
  workspace?: Workspace;
  error?: string;
};

const EMPTY_WORKSPACE: Workspace = { summary: [], suggestions: [] };

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha desconocida";
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function AdminProductFeedbackWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<ProductFeedbackStatus | "all">("all");
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const loadWorkspace = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/sugerencias", { cache: "no-store" });
      const payload = (await response.json()) as FeedbackApiResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos cargar las sugerencias.");
      }
      setWorkspace(payload.workspace ?? EMPTY_WORKSPACE);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar las sugerencias.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const filteredSuggestions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (workspace?.suggestions ?? []).filter((suggestion) => {
      const matchesCategory = !activeCategory || suggestion.category === activeCategory;
      const matchesStatus = activeStatus === "all" || suggestion.status === activeStatus;
      const matchesSearch =
        !normalizedSearch ||
        suggestion.organizationName.toLowerCase().includes(normalizedSearch) ||
        (suggestion.description ?? "").toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [activeCategory, activeStatus, search, workspace]);

  async function updateStatus(id: string, status: ProductFeedbackStatus) {
    setUpdatingIds((current) => [...current, id]);
    setError(null);
    try {
      const response = await fetch(`/api/admin/sugerencias/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No pudimos actualizar el estado.");
      }

      setWorkspace((current) =>
        current
          ? {
              ...current,
              suggestions: current.suggestions.map((suggestion) =>
                suggestion.id === id ? { ...suggestion, status } : suggestion
              ),
            }
          : current
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No pudimos actualizar el estado.");
    } finally {
      setUpdatingIds((current) => current.filter((item) => item !== id));
    }
  }

  const summary = workspace?.summary ?? EMPTY_WORKSPACE.summary;

  return (
    <main className={s.page}>
      <header className={s.header}>
        <div>
          <h1>Propuestas de los talleres</h1>
          <p>Revisa los temas más solicitados y prioriza su seguimiento.</p>
        </div>
        <button className={s.refreshButton} type="button" onClick={() => void loadWorkspace()} disabled={isRefreshing}>
          <LuRefreshCw aria-hidden className={isRefreshing ? s.refreshing : undefined} />
          Actualizar
        </button>
      </header>

      {error ? <p className={s.errorBanner} role="alert">{error}</p> : null}

      <section className={s.summarySection} aria-label="Propuestas por área">
        <div className={s.summaryHeader}>
          <h2>Áreas más solicitadas</h2>
          <span>{workspace?.suggestions.length ?? 0} propuestas recibidas</span>
        </div>
        <div className={s.summaryList}>
          {summary.map((item) => (
            <button
              key={item.category}
              type="button"
              className={`${s.summaryItem} ${activeCategory === item.category ? s.summaryItemActive : ""}`}
              aria-pressed={activeCategory === item.category}
              onClick={() => setActiveCategory((current) => current === item.category ? null : item.category)}
            >
              <strong>{item.label}</strong>
              <span>{item.mentions} {item.mentions === 1 ? "mención" : "menciones"}</span>
              <small>{item.workshops} {item.workshops === 1 ? "taller" : "talleres"}</small>
            </button>
          ))}
        </div>
      </section>

      <section className={s.inboxSection} aria-label="Bandeja de propuestas">
        <div className={s.inboxHeader}>
          <div>
            <h2>Bandeja de propuestas</h2>
            <span>{filteredSuggestions.length} resultados</span>
          </div>
          <div className={s.filters}>
            <label className={s.searchField}>
              <LuSearch aria-hidden />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar propuesta o taller" />
            </label>
            <select
              aria-label="Filtrar por estado"
              value={activeStatus}
              onChange={(event) => setActiveStatus(event.target.value as ProductFeedbackStatus | "all")}
            >
              <option value="all">Todos los estados</option>
              {PRODUCT_FEEDBACK_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className={s.emptyState}>Cargando propuestas…</div>
        ) : filteredSuggestions.length === 0 ? (
          <div className={s.emptyState}>
            <strong>{workspace?.suggestions.length ? "No hay propuestas con estos filtros." : "Todavía no hay propuestas."}</strong>
            <span>{workspace?.suggestions.length ? "Prueba otra categoría, estado o búsqueda." : "Cuando un taller envíe una, aparecerá aquí."}</span>
          </div>
        ) : (
          <div className={s.suggestionList}>
            {filteredSuggestions.map((suggestion) => {
              const categoryLabel = PRODUCT_FEEDBACK_CATEGORIES.find((item) => item.value === suggestion.category)?.label ?? "Otro tema";
              return (
                <article className={s.suggestionRow} key={suggestion.id}>
                  <div className={s.suggestionCopy}>
                    <div className={s.suggestionMeta}>
                      <strong>{categoryLabel}</strong>
                      <span>{suggestion.organizationName}</span>
                      <time dateTime={suggestion.createdAt}>{formatDate(suggestion.createdAt)}</time>
                    </div>
                    <p>{suggestion.description || "El taller señaló esta área sin agregar un comentario."}</p>
                    {suggestion.pagePath ? <small>Desde {suggestion.pagePath}</small> : null}
                    {suggestion.status === "done" ? (
                      <Link className={s.announcementLink} href={`/admin/novedades?propuesta=${encodeURIComponent(suggestion.id)}`}>
                        Preparar novedad para los talleres
                      </Link>
                    ) : null}
                  </div>
                  <label className={s.statusControl}>
                    <span>Estado</span>
                    <select
                      value={suggestion.status}
                      disabled={updatingIds.includes(suggestion.id)}
                      onChange={(event) => void updateStatus(suggestion.id, event.target.value as ProductFeedbackStatus)}
                    >
                      {PRODUCT_FEEDBACK_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </label>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

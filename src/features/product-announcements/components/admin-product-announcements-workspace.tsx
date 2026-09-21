"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LuMegaphone, LuRefreshCw, LuSave } from "react-icons/lu";
import {
  PRODUCT_ANNOUNCEMENT_CATEGORIES,
  type AdminProductAnnouncement,
  type AdminProductAnnouncementWorkspace,
  type ProductAnnouncementCategory,
  type ProductAnnouncementInput,
  type ProductAnnouncementStatus,
} from "@/features/product-announcements/types/product-announcement";
import s from "./admin-product-announcements-workspace.module.css";

type FormState = {
  title: string;
  summary: string;
  body: string;
  category: ProductAnnouncementCategory;
  actionLabel: string;
  actionHref: string;
  relatedFeedbackId: string;
};

type ApiResponse = { workspace?: AdminProductAnnouncementWorkspace; id?: string; error?: string };
const EMPTY_WORKSPACE: AdminProductAnnouncementWorkspace = { announcements: [], completedSuggestions: [] };
const EMPTY_FORM: FormState = { title: "", summary: "", body: "", category: "mejora", actionLabel: "", actionHref: "", relatedFeedbackId: "" };
const STATUS_LABELS: Record<ProductAnnouncementStatus, string> = { draft: "Borrador", published: "Publicada", archived: "Archivada" };

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha desconocida";
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function toInput(form: FormState): ProductAnnouncementInput {
  return {
    title: form.title.trim(),
    summary: form.summary.trim(),
    body: form.body.trim(),
    category: form.category,
    actionLabel: form.actionLabel.trim() || null,
    actionHref: form.actionHref.trim() || null,
    relatedFeedbackId: form.relatedFeedbackId || null,
  };
}

function toForm(announcement: AdminProductAnnouncement): FormState {
  return {
    title: announcement.title,
    summary: announcement.summary,
    body: announcement.body,
    category: announcement.category,
    actionLabel: announcement.actionLabel ?? "",
    actionHref: announcement.actionHref ?? "",
    relatedFeedbackId: announcement.relatedFeedbackId ?? "",
  };
}

export function AdminProductAnnouncementsWorkspace() {
  const [workspace, setWorkspace] = useState<AdminProductAnnouncementWorkspace>(EMPTY_WORKSPACE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadWorkspace = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/novedades", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar las novedades.");
      const nextWorkspace = payload.workspace ?? EMPTY_WORKSPACE;
      setWorkspace(nextWorkspace);
      const querySuggestionId = new URLSearchParams(window.location.search).get("propuesta");
      if (querySuggestionId && nextWorkspace.completedSuggestions.some((item) => item.id === querySuggestionId)) {
        setForm((current) => ({ ...current, relatedFeedbackId: querySuggestionId }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar las novedades.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workspace.announcements;
    return workspace.announcements.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query));
  }, [search, workspace.announcements]);

  async function updateExisting(id: string, input: ProductAnnouncementInput, status: ProductAnnouncementStatus) {
    const response = await fetch(`/api/admin/novedades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, status }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No pudimos actualizar la novedad.");
  }

  async function save(status: "draft" | "published") {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const input = toInput(form);
      if (editingId) {
        await updateExisting(editingId, input, status);
      } else {
        const response = await fetch("/api/admin/novedades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.id) throw new Error(payload.error ?? "No pudimos guardar el borrador.");
        if (status === "published") await updateExisting(payload.id, input, "published");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setNotice(status === "published" ? "La novedad ya está publicada para todos los talleres." : "Borrador guardado.");
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pudimos guardar la novedad.");
    } finally {
      setIsSaving(false);
    }
  }

  function editAnnouncement(announcement: AdminProductAnnouncement) {
    setEditingId(announcement.id);
    setForm(toForm(announcement));
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeStatus(announcement: AdminProductAnnouncement, status: ProductAnnouncementStatus) {
    setIsSaving(true);
    setError(null);
    try {
      await updateExisting(announcement.id, toInput(toForm(announcement)), status);
      setNotice(status === "published" ? "Novedad publicada." : "Novedad archivada.");
      await loadWorkspace();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "No pudimos actualizar el estado.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={s.page}>
      <header className={s.header}>
        <div>
          <span className={s.eyebrow}><LuMegaphone aria-hidden /> Comunicación de producto</span>
          <h1>Novedades de Ventora</h1>
          <p>Cuenta a los talleres qué cambió y conecta cada mejora con las propuestas que la impulsaron.</p>
        </div>
        <button className={s.refreshButton} type="button" onClick={() => void loadWorkspace()} disabled={isLoading || isSaving}>
          <LuRefreshCw aria-hidden /> Actualizar
        </button>
      </header>

      {error ? <p className={s.error} role="alert">{error}</p> : null}
      {notice ? <p className={s.notice} role="status">{notice}</p> : null}

      <section className={s.composer} aria-labelledby="announcement-form-title">
        <div className={s.sectionHeading}>
          <div>
            <h2 id="announcement-form-title">{editingId ? "Editar novedad" : "Redactar novedad"}</h2>
            <p>Se mostrará en la app cuando la publiques.</p>
          </div>
          {editingId ? <button className={s.textButton} type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>Cancelar edición</button> : null}
        </div>
        <div className={s.formGrid}>
          <label className={s.field}>
            <span>Título <small>{form.title.length}/120</small></span>
            <input maxLength={120} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Ahora puedes elegir proveedor en Serie 42" />
          </label>
          <label className={s.field}>
            <span>Tipo</span>
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ProductAnnouncementCategory }))}>
              {PRODUCT_ANNOUNCEMENT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className={`${s.field} ${s.fullWidth}`}>
            <span>Resumen <small>{form.summary.length}/240</small></span>
            <input maxLength={240} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Una frase para explicar el cambio." />
          </label>
          <label className={`${s.field} ${s.fullWidth}`}>
            <span>Detalle <small>{form.body.length}/6000</small></span>
            <textarea maxLength={6000} rows={5} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} placeholder="Explica qué cambió y dónde lo encontrarán los talleres." />
          </label>
          <label className={`${s.field} ${s.fullWidth}`}>
            <span>Propuesta relacionada <small>Opcional</small></span>
            <select value={form.relatedFeedbackId} onChange={(event) => setForm((current) => ({ ...current, relatedFeedbackId: event.target.value }))}>
              <option value="">Sin propuesta asociada</option>
              {workspace.completedSuggestions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className={s.field}>
            <span>Texto del enlace <small>Opcional</small></span>
            <input maxLength={48} value={form.actionLabel} onChange={(event) => setForm((current) => ({ ...current, actionLabel: event.target.value }))} placeholder="Ver mis líneas" />
          </label>
          <label className={s.field}>
            <span>Ruta interna <small>Opcional</small></span>
            <input maxLength={180} value={form.actionHref} onChange={(event) => setForm((current) => ({ ...current, actionHref: event.target.value }))} placeholder="/configuracion/empresa/lineas-precios" />
          </label>
        </div>
        <div className={s.formFooter}>
          <span>Los borradores no se muestran a los talleres.</span>
          <div>
            <button className={s.secondaryButton} type="button" onClick={() => void save("draft")} disabled={isSaving || !form.title.trim() || !form.summary.trim() || !form.body.trim()}>
              <LuSave aria-hidden /> Guardar borrador
            </button>
            <button className={s.primaryButton} type="button" onClick={() => void save("published")} disabled={isSaving || !form.title.trim() || !form.summary.trim() || !form.body.trim()}>
              <LuMegaphone aria-hidden /> Publicar
            </button>
          </div>
        </div>
      </section>

      <section className={s.listSection} aria-labelledby="announcement-list-title">
        <div className={s.listHeader}>
          <div><h2 id="announcement-list-title">Publicaciones</h2><p>{workspace.announcements.length} novedades guardadas</p></div>
          <input aria-label="Buscar novedades" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título" />
        </div>
        {isLoading ? <div className={s.emptyState}>Cargando publicaciones…</div> : filteredAnnouncements.length === 0 ? (
          <div className={s.emptyState}>Aún no hay publicaciones. Guarda un borrador para empezar.</div>
        ) : (
          <div className={s.announcementList}>
            {filteredAnnouncements.map((announcement) => {
              const categoryLabel = PRODUCT_ANNOUNCEMENT_CATEGORIES.find((item) => item.value === announcement.category)?.label ?? "General";
              return (
                <article className={s.announcementRow} key={announcement.id}>
                  <div className={s.announcementCopy}>
                    <div className={s.meta}><span>{categoryLabel}</span><span className={`${s.status} ${s[`status_${announcement.status}`]}`}>{STATUS_LABELS[announcement.status]}</span><time>{formatDate(announcement.updatedAt)}</time></div>
                    <h3>{announcement.title}</h3>
                    <p>{announcement.summary}</p>
                  </div>
                  <div className={s.rowActions}>
                    <button className={s.textButton} type="button" onClick={() => editAnnouncement(announcement)} disabled={isSaving}>Editar</button>
                    {announcement.status === "draft" ? <button className={s.textButton} type="button" onClick={() => void changeStatus(announcement, "published")} disabled={isSaving}>Publicar</button> : null}
                    {announcement.status !== "archived" ? <button className={s.archiveButton} type="button" onClick={() => void changeStatus(announcement, "archived")} disabled={isSaving}>Archivar</button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

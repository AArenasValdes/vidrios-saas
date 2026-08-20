"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LuBookOpen, LuMonitor, LuPause, LuPlay, LuPlus, LuSmartphone } from "react-icons/lu";

import type {
  GrowthOnboardingDevice,
  GrowthOnboardingStep,
  GrowthOnboardingWorkspace,
} from "@/features/growth/types/growth-onboarding";
import s from "./admin-marketing-onboarding-control.module.css";

const STEPS: Array<{ value: GrowthOnboardingStep; label: string }> = [
  { value: "bienvenida", label: "Qué hace Ventora aquí" },
  { value: "primera_cotizacion", label: "Primera cotización" },
  { value: "pdf_whatsapp", label: "PDF y WhatsApp" },
  { value: "lineas_precios", label: "Líneas y precios" },
  { value: "solicitudes_clientes", label: "Solicitudes y clientes" },
  { value: "items_constructor", label: "Ítems y constructor" },
  { value: "pauta_interna", label: "Pauta interna" },
];

type VideoForm = {
  slug: string;
  titulo: string;
  resumen: string;
  paso: GrowthOnboardingStep;
  dispositivo: GrowthOnboardingDevice;
  duracionSegundos: string;
  videoUrl: string;
};

const EMPTY_VIDEO_FORM: VideoForm = {
  slug: "", titulo: "", resumen: "", paso: "bienvenida", dispositivo: "movil", duracionSegundos: "60", videoUrl: "",
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "Duración por definir";
  return seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`;
}

function deviceLabel(device: GrowthOnboardingDevice) {
  return device === "movil" ? "Celular" : device === "escritorio" ? "Computador" : "Ambos";
}

export function AdminMarketingOnboardingControl() {
  const [workspace, setWorkspace] = useState<GrowthOnboardingWorkspace | null>(null);
  const [videoForm, setVideoForm] = useState<VideoForm>(EMPTY_VIDEO_FORM);
  const [assignmentVideoId, setAssignmentVideoId] = useState("");
  const [assignmentOrganizationId, setAssignmentOrganizationId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/admin/marketing/onboarding", { cache: "no-store" });
    const payload = (await response.json()) as { workspace?: GrowthOnboardingWorkspace; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar onboarding.");
    setWorkspace(payload.workspace ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadOnboarding() {
      try {
        await load();
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : "Error al cargar onboarding."
          );
        }
      }
    }
    void loadOnboarding();
    return () => { active = false; };
  }, [load]);

  const videosReady = useMemo(() => workspace?.videos.filter((video) => video.estado === "listo") ?? [], [workspace]);
  const videoById = useMemo(() => new Map((workspace?.videos ?? []).map((video) => [video.id, video])), [workspace]);
  const organizationById = useMemo(() => new Map((workspace?.organizations ?? []).map((organization) => [organization.organizationId, organization])), [workspace]);
  const firstQuotes = workspace?.events.filter((event) => event.tipo === "primera_cotizacion_creada").length ?? 0;
  const firstPdfs = workspace?.events.filter((event) => event.tipo === "primer_pdf_descargado").length ?? 0;

  async function save(action: string, input: unknown, method: "POST" | "PATCH" = "POST"): Promise<boolean> {
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/admin/marketing/onboarding", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, input }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos guardar onboarding.");
      await load();
      setMessage("Guardado.");
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pudimos guardar onboarding.");
      return false;
    } finally { setIsSaving(false); }
  }

  return (
    <section className={s.section} aria-label="Onboarding medible">
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>Fase B · Activación</p>
          <h2>Videos y primeros resultados</h2>
          <p>Asigna una guía según dispositivo y mira quién llegó a su primera cotización y PDF.</p>
        </div>
        <div className={s.metrics}>
          <span><strong>{firstQuotes}</strong> primera cotización</span>
          <span><strong>{firstPdfs}</strong> primer PDF</span>
        </div>
      </header>

      {error ? <p className={s.error}>{error}</p> : null}
      {message ? <p className={s.success}>{message}</p> : null}

      <div className={s.grid}>
        <form className={s.panel} onSubmit={(event) => {
          event.preventDefault();
          void save("crear_video", { ...videoForm, duracionSegundos: Number(videoForm.duracionSegundos || 0) || null, videoUrl: videoForm.videoUrl || null })
            .then((saved) => { if (saved) setVideoForm(EMPTY_VIDEO_FORM); });
        }}>
          <div className={s.panelTitle}><LuBookOpen aria-hidden /><h3>Registrar video</h3></div>
          <label>Título<input required value={videoForm.titulo} onChange={(event) => setVideoForm({ ...videoForm, titulo: event.target.value })} placeholder="Bienvenida móvil" /></label>
          <label>Identificador<input required value={videoForm.slug} onChange={(event) => setVideoForm({ ...videoForm, slug: event.target.value })} placeholder="bienvenida-movil-v1" /></label>
          <div className={s.twoColumns}>
            <label>Dispositivo<select value={videoForm.dispositivo} onChange={(event) => setVideoForm({ ...videoForm, dispositivo: event.target.value as GrowthOnboardingDevice })}><option value="movil">Celular</option><option value="escritorio">Computador</option><option value="ambos">Ambos</option></select></label>
            <label>Paso<select value={videoForm.paso} onChange={(event) => setVideoForm({ ...videoForm, paso: event.target.value as GrowthOnboardingStep })}>{STEPS.map((step) => <option key={step.value} value={step.value}>{step.label}</option>)}</select></label>
          </div>
          <label>URL HTTPS del video<input type="url" value={videoForm.videoUrl} onChange={(event) => setVideoForm({ ...videoForm, videoUrl: event.target.value })} placeholder="https://youtube.com/..." /></label>
          <div className={s.twoColumns}>
            <label>Duración (seg.)<input type="number" min="15" max="900" value={videoForm.duracionSegundos} onChange={(event) => setVideoForm({ ...videoForm, duracionSegundos: event.target.value })} /></label>
            <label>Resumen<textarea value={videoForm.resumen} onChange={(event) => setVideoForm({ ...videoForm, resumen: event.target.value })} rows={2} placeholder="Qué verá el usuario." /></label>
          </div>
          <button className={s.primary} type="submit" disabled={isSaving}><LuPlus aria-hidden /> Registrar como borrador</button>
          <p className={s.help}>Un video sólo se puede dejar listo cuando tiene URL HTTPS. No se inventan enlaces ni promesas.</p>
        </form>

        <form className={s.panel} onSubmit={(event) => {
          event.preventDefault();
          if (!assignmentVideoId || !assignmentOrganizationId) { setError("Selecciona video y empresa antes de asignar."); return; }
          void save("asignar_video", { videoId: assignmentVideoId, organizationId: Number(assignmentOrganizationId) })
            .then((saved) => { if (saved) { setAssignmentVideoId(""); setAssignmentOrganizationId(""); } });
        }}>
          <div className={s.panelTitle}><LuPlay aria-hidden /><h3>Asignar a un piloto</h3></div>
          <label>Video disponible<select value={assignmentVideoId} onChange={(event) => setAssignmentVideoId(event.target.value)}><option value="">Seleccionar…</option>{videosReady.map((video) => <option key={video.id} value={video.id}>{video.titulo} · {deviceLabel(video.dispositivo)}</option>)}</select></label>
          <label>Empresa<select value={assignmentOrganizationId} onChange={(event) => setAssignmentOrganizationId(event.target.value)}><option value="">Seleccionar…</option>{workspace?.organizations.map((organization) => <option key={organization.organizationId} value={organization.organizationId}>{organization.empresaNombre}</option>)}</select></label>
          <button className={s.primary} type="submit" disabled={isSaving || videosReady.length === 0}>Asignar guía</button>
          <p className={s.help}>{videosReady.length === 0 ? "Primero deja listo un video con URL HTTPS." : "La guía aparece sólo al entrar a la activación desde el dispositivo correspondiente."}</p>
        </form>
      </div>

      <div className={s.listGrid}>
        <article className={s.panel}>
          <div className={s.panelTitle}><LuMonitor aria-hidden /><h3>Biblioteca</h3></div>
          {workspace === null ? <p className={s.muted}>Cargando…</p> : workspace.videos.length === 0 ? <p className={s.muted}>Aún no hay videos registrados.</p> : <div className={s.records}>{workspace.videos.map((video) => (
            <div className={s.record} key={video.id}>
              <div><strong>{video.titulo}</strong><span>{deviceLabel(video.dispositivo)} · {formatDuration(video.duracionSegundos)} · {STEPS.find((step) => step.value === video.paso)?.label}</span></div>
              <div className={s.recordActions}>
                {video.dispositivo === "movil" ? <LuSmartphone aria-label="Celular" /> : <LuMonitor aria-label="Computador" />}
                <button type="button" disabled={isSaving || video.estado === "archivado"} onClick={() => {
                  const videoUrl = window.prompt("URL HTTPS del video", video.videoUrl ?? "");
                  if (videoUrl !== null) void save("actualizar_video", { id: video.id, videoUrl: videoUrl || null }, "PATCH");
                }}>Editar URL</button>
                <button type="button" disabled={isSaving || video.estado === "archivado"} onClick={() => void save("actualizar_video", { id: video.id, estado: video.estado === "listo" ? "borrador" : "listo" }, "PATCH")}>{video.estado === "listo" ? "Pausar" : "Dejar listo"}</button>
              </div>
            </div>))}</div>}
        </article>

        <article className={s.panel}>
          <div className={s.panelTitle}><LuPlay aria-hidden /><h3>Asignaciones activas</h3></div>
          {workspace === null ? <p className={s.muted}>Cargando…</p> : workspace.assignments.length === 0 ? <p className={s.muted}>Aún no hay guías asignadas.</p> : <div className={s.records}>{workspace.assignments.map((assignment) => {
            const video = videoById.get(assignment.videoId); const organization = organizationById.get(assignment.organizationId);
            return <div className={s.record} key={assignment.id}><div><strong>{organization?.empresaNombre ?? `Empresa ${assignment.organizationId}`}</strong><span>{video?.titulo ?? "Video eliminado"} · {assignment.estado}{assignment.vistoEn ? " · visto" : ""}</span></div><button type="button" disabled={isSaving} onClick={() => void save("actualizar_asignacion", { id: assignment.id, estado: assignment.estado === "pausado" ? "pendiente" : "pausado" }, "PATCH")}>{assignment.estado === "pausado" ? "Reactivar" : <><LuPause aria-hidden /> Pausar</>}</button></div>;
          })}</div>}
        </article>
      </div>
    </section>
  );
}

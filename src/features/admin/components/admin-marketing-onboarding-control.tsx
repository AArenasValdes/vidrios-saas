"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuArrowLeft, LuCircleCheck, LuMonitor, LuPlay, LuSmartphone, LuVideo, LuX } from "react-icons/lu";

import type {
  GrowthOnboardingDevice,
  GrowthOnboardingVideo,
  GrowthOnboardingWorkspace,
} from "@/features/growth/types/growth-onboarding";
import s from "./admin-marketing-onboarding-control.module.css";

type AutomaticDevice = Exclude<GrowthOnboardingDevice, "ambos">;
type VideoForm = { slug: string; titulo: string; resumen: string; duracionSegundos: string; videoUrl: string };
type EditorState = { device: AutomaticDevice; video: GrowthOnboardingVideo | null };

const DEVICE_COPY: Record<AutomaticDevice, {
  label: string;
  description: string;
  Icon: typeof LuSmartphone;
}> = {
  movil: {
    label: "Celular",
    description: "Cotizar en terreno, generar PDF y enviarlo por WhatsApp.",
    Icon: LuSmartphone,
  },
  escritorio: {
    label: "Computador",
    description: "Configurar líneas y precios; también puede cotizar desde el celular.",
    Icon: LuMonitor,
  },
};

function buildForm(device: AutomaticDevice, video: GrowthOnboardingVideo | null): VideoForm {
  return {
    slug: video?.slug ?? `bienvenida-${device}-v1`,
    titulo: video?.titulo ?? (device === "movil" ? "Así cotizas desde el celular" : "Así ordenas líneas y precios en Ventora"),
    resumen: video?.resumen ?? DEVICE_COPY[device].description,
    duracionSegundos: String(video?.duracionSegundos ?? (device === "movil" ? 55 : 75)),
    videoUrl: video?.videoUrl ?? "",
  };
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Duración por definir";
  return seconds < 60 ? `${seconds} segundos` : `${Math.ceil(seconds / 60)} minuto${seconds >= 120 ? "s" : ""}`;
}

export function AdminMarketingOnboardingControl() {
  const [workspace, setWorkspace] = useState<GrowthOnboardingWorkspace | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form, setForm] = useState<VideoForm>(() => buildForm("movil", null));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/marketing/onboarding", { cache: "no-store" });
    const payload = (await response.json()) as { workspace?: GrowthOnboardingWorkspace; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "No pudimos cargar la configuración.");
    setWorkspace(payload.workspace ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadOnboarding() {
      try {
        await load();
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "No pudimos cargar el onboarding.");
      }
    }
    void loadOnboarding();
    return () => { active = false; };
  }, [load]);

  const defaults = useMemo(() => new Map(
    (workspace?.videos ?? [])
      .filter((video) => video.esPredeterminado && video.estado === "listo")
      .map((video) => [video.dispositivo, video])
  ), [workspace]);

  const funnel = useMemo(() => {
    const firstViewByOrganization = new Map<number, number>();
    for (const event of workspace?.events ?? []) {
      if (event.tipo !== "video_abierto") continue;
      const occurredAt = Date.parse(event.ocurridoEn);
      const current = firstViewByOrganization.get(event.organizationId);
      if (!current || occurredAt < current) firstViewByOrganization.set(event.organizationId, occurredAt);
    }
    const afterView = (type: "primera_cotizacion_creada" | "primer_pdf_descargado") => new Set(
      (workspace?.events ?? [])
        .filter((event) => event.tipo === type && Date.parse(event.ocurridoEn) >= (firstViewByOrganization.get(event.organizationId) ?? Infinity))
        .map((event) => event.organizationId)
    ).size;
    return {
      viewed: firstViewByOrganization.size,
      quoted: afterView("primera_cotizacion_creada"),
      pdf: afterView("primer_pdf_descargado"),
    };
  }, [workspace]);

  function openEditor(device: AutomaticDevice, video: GrowthOnboardingVideo | null) {
    setError(null); setMessage(null); setEditor({ device, video }); setForm(buildForm(device, video));
  }

  async function save() {
    if (!editor) return;
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const input = {
        ...(editor.video ? { id: editor.video.id } : {}),
        ...form,
        duracionSegundos: Number(form.duracionSegundos),
        videoUrl: form.videoUrl || null,
        estado: "listo",
        esPredeterminado: true,
        paso: "bienvenida",
        dispositivo: editor.device,
      };
      const response = await fetch("/api/admin/marketing/onboarding", {
        method: editor.video ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editor.video ? "actualizar_video_predeterminado" : "crear_video_predeterminado",
          input,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos guardar el video.");
      await load(); setEditor(null); setMessage(`Video de ${DEVICE_COPY[editor.device].label.toLowerCase()} activo para todas las cuentas nuevas.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pudimos guardar el video.");
    } finally { setIsSaving(false); }
  }

  async function pause(video: GrowthOnboardingVideo) {
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/admin/marketing/onboarding", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "actualizar_video_predeterminado", input: { id: video.id, estado: "borrador", esPredeterminado: false } }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos pausar el video.");
      await load(); setMessage("Onboarding automático pausado para este dispositivo.");
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : "No pudimos pausar el video.");
    } finally { setIsSaving(false); }
  }

  return (
    <div className={s.page} aria-label="Onboarding automático">
      <div className={s.backRow}><Link href="/admin/marketing"><LuArrowLeft aria-hidden /> Volver a marketing</Link></div>
      <header className={s.hero}>
        <div>
          <p className={s.eyebrow}>Activación automática</p>
          <h2>Explica Ventora sin perseguir a cada cuenta</h2>
          <p>Configura una vez el video para celular y el de computador. Toda cuenta nueva recibe el suyo al entrar a activación.</p>
        </div>
        <div className={s.heroState}><LuCircleCheck aria-hidden /><span>{defaults.size}/2 dispositivos configurados</span></div>
      </header>

      {error ? <p className={s.error}>{error}</p> : null}
      {message ? <p className={s.success}>{message}</p> : null}

      <section className={s.deviceGrid} aria-label="Videos predeterminados por dispositivo">
        {(["movil", "escritorio"] as const).map((device) => {
          const config = DEVICE_COPY[device]; const video = defaults.get(device) ?? null; const Icon = config.Icon;
          return <article className={s.deviceCard} key={device}>
            <div className={s.deviceIcon}><Icon aria-hidden /></div>
            <div className={s.deviceHeading}><span>Ruta automática</span><h3>{config.label}</h3></div>
            {video ? <>
              <strong>{video.titulo}</strong>
              <p>{video.resumen ?? config.description}</p>
              <div className={s.videoMeta}><LuPlay aria-hidden /> {formatDuration(video.duracionSegundos)} · activo para cuentas nuevas</div>
              <div className={s.actions}>
                <button type="button" onClick={() => openEditor(device, video)} disabled={isSaving}>Editar video</button>
                <button type="button" className={s.dangerAction} onClick={() => void pause(video)} disabled={isSaving}>Pausar</button>
              </div>
            </> : <>
              <strong>Aún no hay video activo</strong>
              <p>{config.description}</p>
              <button type="button" className={s.primary} onClick={() => openEditor(device, null)} disabled={isSaving}><LuVideo aria-hidden /> Configurar una vez</button>
            </>}
          </article>;
        })}
      </section>

      {editor ? <section className={s.editor} aria-label={`Configurar video de ${DEVICE_COPY[editor.device].label}`}>
        <div className={s.editorHeader}><div><span>Video para {DEVICE_COPY[editor.device].label.toLowerCase()}</span><h3>{editor.video ? "Editar video base" : "Agregar video base"}</h3></div><button type="button" className={s.close} onClick={() => setEditor(null)} aria-label="Cerrar"><LuX aria-hidden /></button></div>
        <div className={s.formGrid}>
          <label>Título<input value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} /></label>
          <label>URL HTTPS del video<input type="url" value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://youtube.com/..." /></label>
          <label>Duración (segundos)<input type="number" min="15" max="900" value={form.duracionSegundos} onChange={(event) => setForm({ ...form, duracionSegundos: event.target.value })} /></label>
          <label>Texto de apoyo<textarea rows={3} value={form.resumen} onChange={(event) => setForm({ ...form, resumen: event.target.value })} /></label>
        </div>
        <div className={s.editorFooter}><p>Se publicará automáticamente para toda cuenta nueva en {DEVICE_COPY[editor.device].label.toLowerCase()}. No hay asignaciones por empresa.</p><button type="button" className={s.primary} onClick={() => void save()} disabled={isSaving}>{editor.video ? "Guardar y mantener activo" : "Publicar para cuentas nuevas"}</button></div>
      </section> : null}

      <section className={s.funnel} aria-label="Resultados del onboarding automático">
        <div><p>Embudo desde que vio una guía</p><h3>¿La bienvenida está llevando al primer resultado?</h3></div>
        <div className={s.metrics}>
          <span><strong>{funnel.viewed}</strong> vieron la guía</span>
          <span><strong>{funnel.quoted}</strong> hicieron su primera cotización</span>
          <span><strong>{funnel.pdf}</strong> generaron su primer PDF</span>
        </div>
      </section>
    </div>
  );
}

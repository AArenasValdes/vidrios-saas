"use client";

import { useEffect, useState } from "react";
import { LuMonitor, LuPlay, LuSmartphone } from "react-icons/lu";

import s from "./onboarding-video-guide.module.css";

type Guide = {
  assignmentId: string | null;
  videoId: string;
  source: "predeterminada" | "piloto";
  titulo: string;
  resumen: string | null;
  dispositivo: "movil" | "escritorio" | "ambos";
  duracionSegundos: number | null;
  videoUrl: string;
};

type Device = "movil" | "escritorio";

function resolveDevice() {
  return window.matchMedia("(max-width: 767px)").matches ? "movil" : "escritorio";
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Video breve";
  return seconds < 60 ? `${seconds} segundos` : `${Math.ceil(seconds / 60)} minuto${seconds >= 120 ? "s" : ""}`;
}

export function OnboardingVideoGuide() {
  const [guides, setGuides] = useState<Record<Device, Guide | null>>({ movil: null, escritorio: null });
  const [device] = useState<Device>(() =>
    typeof window === "undefined" ? "movil" : resolveDevice()
  );

  useEffect(() => {
    let active = true;
    const devices: Device[] = ["movil", "escritorio"];
    void Promise.all(devices.map(async (requestedDevice) => {
      const response = await fetch(`/api/onboarding/videos?dispositivo=${requestedDevice}`, { cache: "no-store" });
      if (!response.ok) return [requestedDevice, null] as const;
      const payload = (await response.json()) as { guide?: Guide | null };
      return [requestedDevice, payload.guide ?? null] as const;
    }))
      .then((entries) => {
        if (!active) return;
        setGuides(Object.fromEntries(entries) as Record<Device, Guide | null>);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const guide = guides[device];
  const otherDevice: Device = device === "movil" ? "escritorio" : "movil";
  const otherGuide = guides[otherDevice];

  if (!guide) return null;
  const Icon = device === "escritorio" ? LuMonitor : LuSmartphone;
  const otherLabel = otherDevice === "movil" ? "celular" : "computador";

  function trackOpen(selectedGuide: Guide, selectedDevice: Device) {
    void fetch("/api/onboarding/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "abrir_video",
        videoId: selectedGuide.videoId,
        assignmentId: selectedGuide.assignmentId,
        source: selectedGuide.source,
        dispositivo: selectedDevice,
      }),
    });
  }

  return (
    <aside className={s.card} aria-label="Video recomendado para tu activación">
      <div className={s.icon}><Icon aria-hidden /></div>
      <div className={s.copy}>
        <span>Estás en {device === "movil" ? "celular" : "computador"} · {formatDuration(guide.duracionSegundos)}</span>
        <strong>{guide.titulo}</strong>
        <p>{guide.resumen ?? "Mira primero qué puedes resolver desde aquí y luego crea tu primera cotización."} {device === "movil" ? "Cuando estés en computador podrás configurar líneas y precios." : "Cuando estés en terreno también podrás cotizar y enviar PDFs desde el celular."}</p>
      </div>
      <a href={guide.videoUrl} target="_blank" rel="noreferrer" className={s.action} onClick={() => trackOpen(guide, device)}>
        <LuPlay aria-hidden /> Ver guía
      </a>
      {otherGuide ? (
        <div className={s.alternate}>
          <span>¿También usarás Ventora en {otherLabel}?</span>
          <a href={otherGuide.videoUrl} target="_blank" rel="noreferrer" onClick={() => trackOpen(otherGuide, otherDevice)}>
            Ver guía para {otherLabel}
          </a>
        </div>
      ) : null}
    </aside>
  );
}

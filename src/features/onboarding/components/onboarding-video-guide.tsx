"use client";

import { useEffect, useState } from "react";
import { LuMonitor, LuPlay, LuSmartphone } from "react-icons/lu";

import s from "./onboarding-video-guide.module.css";

type Guide = {
  assignmentId: string;
  titulo: string;
  resumen: string | null;
  dispositivo: "movil" | "escritorio" | "ambos";
  duracionSegundos: number | null;
  videoUrl: string;
};

function resolveDevice() {
  return window.matchMedia("(max-width: 767px)").matches ? "movil" : "escritorio";
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Video breve";
  return seconds < 60 ? `${seconds} segundos` : `${Math.ceil(seconds / 60)} minuto${seconds >= 120 ? "s" : ""}`;
}

export function OnboardingVideoGuide() {
  const [guide, setGuide] = useState<Guide | null>(null);

  useEffect(() => {
    let active = true;
    const device = resolveDevice();
    void fetch(`/api/onboarding/videos?dispositivo=${device}`, { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json()) as { guide?: Guide | null } : { guide: null })
      .then((payload) => { if (active) setGuide(payload.guide ?? null); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (!guide) return null;
  const Icon = guide.dispositivo === "escritorio" ? LuMonitor : LuSmartphone;

  return (
    <aside className={s.card} aria-label="Video recomendado para tu activación">
      <div className={s.icon}><Icon aria-hidden /></div>
      <div className={s.copy}>
        <span>Guía para este dispositivo · {formatDuration(guide.duracionSegundos)}</span>
        <strong>{guide.titulo}</strong>
        <p>{guide.resumen ?? "Mira primero qué puedes resolver desde aquí y luego crea tu primera cotización."}</p>
      </div>
      <a href={guide.videoUrl} target="_blank" rel="noreferrer" className={s.action} onClick={() => {
        void fetch("/api/onboarding/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "abrir_video", assignmentId: guide.assignmentId }) });
      }}>
        <LuPlay aria-hidden /> Ver guía
      </a>
    </aside>
  );
}

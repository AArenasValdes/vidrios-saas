"use client";

import { type FormEvent, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";

import s from "./landing-contact-section.module.css";

const WHATSAPP_LANDING_HREF =
  "https://wa.me/56977338906?text=Hola%20Ventora%2C%20quiero%20mi%20demo.";

export function LandingContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const hasStartedFormRef = useRef(false);

  function trackCta(location: string, channel: "whatsapp" | "internal") {
    if (channel === "whatsapp") {
      googleTagService.trackWhatsappClick({
        source: "landing",
        location,
        label: `landing:${location}`,
      });
      return;
    }

    googleTagService.trackEvent("landing_cta_click", {
      event_category: "landing",
      event_label: location,
      source: "landing",
      location,
    });
  }

  function trackFormStart() {
    if (hasStartedFormRef.current) {
      return;
    }

    hasStartedFormRef.current = true;
    googleTagService.trackFormStart({
      formName: "landing-demo",
      source: "landing",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const nombre = String(formData.get("nombre") ?? "").trim();
      const negocio = String(formData.get("empresa") ?? "").trim();
      const whatsapp = String(formData.get("telefono") ?? "").trim();
      const ayuda = String(formData.get("ayuda") ?? "demo").trim();
      const mensaje = [
        "Hola, quiero un piloto de Ventora para mi empresa.",
        nombre ? `Nombre: ${nombre}` : "",
        negocio ? `Tipo de negocio: ${negocio}` : "",
        whatsapp ? `WhatsApp: ${whatsapp}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const href = `https://wa.me/56977338906?text=${encodeURIComponent(mensaje)}`;

      const response = await fetch("/api/solicitudes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          empresa: negocio,
          correo: "",
          telefono: whatsapp,
          ayuda: ayuda === "cotizacion" || ayuda === "ventas" ? ayuda : "demo",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No pudimos guardar tus datos.");
      }

      googleTagService.trackFormSubmitIntent({
        formName: "landing-demo",
        source: "landing",
      });
      trackCta("formulario-demo", "whatsapp");
      setFeedback({
        kind: "success",
        message: "Datos guardados. Abrimos WhatsApp para coordinar tu piloto.",
      });
      window.location.href = href;
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos enviar tu solicitud. Intenta nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contacto" className={s.section} aria-labelledby="landing-contact-title">
      <div className={s.backdrop} aria-hidden="true">
        <div className={s.grid} />
      </div>

      <div className={s.container}>
        <header className={s.header}>
          <h2 id="landing-contact-title" className={s.title}>
            ¿Quieres ver Ventora funcionando en tu negocio?
          </h2>
          <p className={s.subtitle}>
            Te mostramos en 5 minutos cómo cotizar desde el celular, enviar el PDF por
            WhatsApp y dejar todo ordenado.
          </p>
        </header>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Quiero que me contacten</h3>
            <p>Déjame tus datos y te escribimos por WhatsApp.</p>
          </div>

          <form className={s.form} onSubmit={handleSubmit}>
            <input type="hidden" name="ayuda" value="demo" />

            <label className={s.field}>
              <span>Nombre</span>
              <input
                type="text"
                name="nombre"
                placeholder="Juan Pérez"
                autoComplete="name"
                onFocus={trackFormStart}
                required
              />
            </label>

            <label className={s.field}>
              <span>WhatsApp</span>
              <input
                type="tel"
                name="telefono"
                placeholder="+56 9 0000 0000"
                autoComplete="tel"
                inputMode="tel"
                onFocus={trackFormStart}
                required
              />
            </label>

            <label className={s.field}>
              <span>Tipo de negocio</span>
              <select name="empresa" defaultValue="" onFocus={trackFormStart} required>
                <option value="" disabled>
                  Selecciona una opción
                </option>
                <option value="maestro">Maestro independiente</option>
                <option value="vidrieria">Vidriería</option>
                <option value="taller">Taller / empresa</option>
                <option value="otro">Otro</option>
              </select>
            </label>

            <button
              type="submit"
              className={s.submit}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Quiero ver la demo"}
              <ArrowRight size={17} aria-hidden />
            </button>
          </form>

          {feedback ? (
            <p
              className={`${s.feedback} ${
                feedback.kind === "error" ? s.feedbackError : ""
              }`}
              role="status"
            >
              {feedback.message}
            </p>
          ) : null}

          <a
            className={s.whatsapp}
            href={WHATSAPP_LANDING_HREF}
            onClick={() => trackCta("contacto-whatsapp", "whatsapp")}
          >
            Hablar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

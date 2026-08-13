"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { COUNTRY_PRESET_OPTIONS } from "@/features/organization-region/config/country-presets";
import { getCountryPreset } from "@/features/organization-region/services/organization-region.service";
import type { SupportedCountryCode } from "@/features/organization-region/types/organization-region";

import s from "./landing-contact-section.module.css";

const WHATSAPP_LANDING_HREF =
  "https://wa.me/56977338906?text=Hola%20Ventora%2C%20quiero%20mi%20demo.";

export function LandingContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>("CL");
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const hasStartedFormRef = useRef(false);
  const phonePlaceholder = useMemo(
    () => getCountryPreset(countryCode).phonePlaceholder,
    [countryCode]
  );

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
      const pais = String(formData.get("pais") ?? countryCode).trim();
      const ayuda = String(formData.get("ayuda") ?? "demo").trim();

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
          countryCode: pais,
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
      trackCta("formulario-demo", "internal");
      form.reset();
      setCountryCode("CL");
      setFeedback({
        kind: "success",
        message: "Listo. Te escribimos a este WhatsApp. Si quieres partir ahora, crea tu cuenta.",
      });
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
            ¿Quieres que te contactemos?
          </h2>
          <p className={s.subtitle}>
            Déjanos tus datos. Te escribimos por WhatsApp. Si quieres partir ahora,
            crea tu cuenta y arranca 15 días gratis.
          </p>
        </header>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <h3>Quiero que me contacten</h3>
            <p>Guardamos tu consulta y te respondemos. No te saca de esta página.</p>
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
              <span>País</span>
              <select
                name="pais"
                value={countryCode}
                onChange={(event) =>
                  setCountryCode(event.target.value as SupportedCountryCode)
                }
                onFocus={trackFormStart}
                required
              >
                {COUNTRY_PRESET_OPTIONS.map((preset) => (
                  <option key={preset.countryCode} value={preset.countryCode}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={s.field}>
              <span>WhatsApp</span>
              <input
                type="tel"
                name="telefono"
                placeholder={phonePlaceholder}
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
              {isSubmitting ? "Enviando..." : "Quiero que me contacten"}
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

          <Link
            href="/registro"
            className={s.trial}
            prefetch={false}
            onClick={() => trackCta("contacto-registro", "internal")}
          >
            Empezar 15 días gratis
            <ArrowRight size={17} aria-hidden />
          </Link>

          <a
            className={s.whatsapp}
            href={WHATSAPP_LANDING_HREF}
            onClick={() => trackCta("contacto-whatsapp", "whatsapp")}
          >
            Escribir ahora por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

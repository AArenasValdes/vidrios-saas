"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  LuCheckCheck,
  LuLock,
  LuMessageCircleMore,
  LuSend,
} from "react-icons/lu";

import {
  formatChileMobilePhone,
  isValidChileMobilePhone,
  normalizeChileMobilePhone,
} from "@/utils/chile-mobile-phone";
import {
  buildPublicLeadWhatsappUrl,
  normalizeWhatsappPhone,
} from "@/utils/whatsapp";

import s from "./page.module.css";

type Props = {
  slug: string;
  empresaNombre: string;
  empresaTelefono: string;
  empresaEmail: string;
  privacidad: string;
  isAvailable: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  sourceUrl?: string;
  origin?: string;
};

type FormState = {
  nombre: string;
  contacto: string;
  tipoTrabajo: string;
  mensaje: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  nombre: "",
  contacto: "",
  tipoTrabajo: "",
  mensaje: "",
};

const QUICK_WORK_TYPES = [
  "Ventana",
  "Shower door",
  "Cierre de terraza",
  "Puerta de vidrio",
  "Mampara de baño",
  "Termopanel",
  "Otro",
] as const;

function validateNombre(value: string) {
  return value.trim().length >= 3 ? null : "Ingresa tu nombre completo.";
}

function validateContacto(value: string) {
  if (!value.trim()) {
    return "Ingresa tu WhatsApp.";
  }

  return isValidChileMobilePhone(value) ? null : "Ingresa un WhatsApp válido.";
}

function validateTipoTrabajo(value: string) {
  return value.trim().length >= 3
    ? null
    : "Cuéntanos brevemente qué necesitas.";
}

export function SolicitudEmpresaForm({
  slug,
  empresaNombre,
  empresaTelefono,
  empresaEmail,
  privacidad,
  isAvailable,
  utmSource,
  utmMedium,
  utmCampaign,
  sourceUrl,
  origin,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    nombre: false,
    contacto: false,
    tipoTrabajo: false,
    mensaje: false,
  });
  const [selectedWorkType, setSelectedWorkType] = useState<string | null>(null);
  const [resolvedSourceUrl, setResolvedSourceUrl] = useState<string | null>(
    sourceUrl ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sourceUrl) {
      setResolvedSourceUrl(sourceUrl);
      return;
    }

    if (typeof window !== "undefined") {
      setResolvedSourceUrl(window.location.href);
    }
  }, [sourceUrl]);

  const whatsappReady = Boolean(normalizeWhatsappPhone(empresaTelefono));

  const errors = useMemo<FieldErrors>(
    () => ({
      nombre: validateNombre(form.nombre) ?? undefined,
      contacto: validateContacto(form.contacto) ?? undefined,
      tipoTrabajo: validateTipoTrabajo(form.tipoTrabajo) ?? undefined,
    }),
    [form]
  );

  const normalizedClienteWhatsapp = useMemo(
    () => normalizeChileMobilePhone(form.contacto),
    [form.contacto]
  );
  const displayWhatsapp = useMemo(
    () =>
      normalizedClienteWhatsapp
        ? formatChileMobilePhone(normalizedClienteWhatsapp)
        : "",
    [normalizedClienteWhatsapp]
  );
  const isValid = !errors.nombre && !errors.contacto && !errors.tipoTrabajo;
  const resolvedOrigin = origin?.trim() || utmSource?.trim() || "solicitud-publica";
  const whatsappUrl = useMemo(() => {
    if (!whatsappReady) {
      return null;
    }

    return buildPublicLeadWhatsappUrl(empresaTelefono, {
      nombre: form.nombre,
      tipoTrabajo: form.tipoTrabajo,
      mensaje: form.mensaje,
    });
  }, [empresaTelefono, form.mensaje, form.nombre, form.tipoTrabajo, whatsappReady]);

  function handleFieldChange(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleBlur(field: keyof FormState) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function handleWorkTypeSelect(value: string) {
    setSelectedWorkType(value);

    if (value === "Otro") {
      handleFieldChange("tipoTrabajo", "");
      return;
    }

    handleFieldChange("tipoTrabajo", value);
    setTouched((current) => ({ ...current, tipoTrabajo: true }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      nombre: true,
      contacto: true,
      tipoTrabajo: true,
      mensaje: true,
    });

    if (!isValid || !normalizedClienteWhatsapp) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/solicitud/${slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          contacto: normalizedClienteWhatsapp,
          origen: resolvedOrigin,
          utmSource: utmSource ?? null,
          utmMedium: utmMedium ?? null,
          utmCampaign: utmCampaign ?? null,
          sourceUrl: resolvedSourceUrl,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ?? "No pudimos enviar tu solicitud. Intenta nuevamente."
        );
      }

      setSuccessMessage(
        `${empresaNombre} ya recibió tu solicitud. Te recomendamos seguir por WhatsApp si quieres acelerar respuesta.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos enviar tu solicitud. Intenta nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={s.formCard}>
      <div className={s.formHeader}>
        <div>
          <span className={s.formTag}>Deja tu solicitud</span>
          <h2 className={s.formTitle}>Te contactamos con contexto, no a ciegas.</h2>
        </div>

        {whatsappReady && whatsappUrl ? (
          <a
            className={s.formWhatsappButton}
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LuMessageCircleMore aria-hidden />
            Hablar por WhatsApp
          </a>
        ) : null}
      </div>

      <form className={s.form} onSubmit={handleSubmit}>
        <label className={s.field}>
          <span className={s.label}>Nombre</span>
          <input
            className={s.input}
            value={form.nombre}
            onChange={(event) => handleFieldChange("nombre", event.target.value)}
            onBlur={() => handleBlur("nombre")}
            placeholder="Ej: Alejandro Flores"
            autoComplete="name"
          />
          {touched.nombre && errors.nombre ? (
            <span className={s.fieldError}>{errors.nombre}</span>
          ) : null}
        </label>

        <label className={s.field}>
          <span className={s.label}>WhatsApp</span>
          <input
            className={s.input}
            value={form.contacto}
            onChange={(event) => handleFieldChange("contacto", event.target.value)}
            onBlur={() => handleBlur("contacto")}
            placeholder="+56 9 1234 5678"
            autoComplete="tel"
            inputMode="tel"
          />
          {displayWhatsapp ? (
            <span className={s.fieldHint}>Formato detectado: +56 9 {displayWhatsapp}</span>
          ) : null}
          {touched.contacto && errors.contacto ? (
            <span className={s.fieldError}>{errors.contacto}</span>
          ) : null}
        </label>

        <div className={s.field}>
          <span className={s.label}>Tipo de trabajo</span>
          <div className={s.chipGrid}>
            {QUICK_WORK_TYPES.map((workType) => {
              const isActive =
                selectedWorkType === workType ||
                (workType !== "Otro" && form.tipoTrabajo === workType);

              return (
                <button
                  key={workType}
                  type="button"
                  className={`${s.chipButton} ${isActive ? s.chipButtonActive : ""}`}
                  onClick={() => handleWorkTypeSelect(workType)}
                >
                  {workType}
                </button>
              );
            })}
          </div>
          <input
            className={s.input}
            value={form.tipoTrabajo}
            onChange={(event) => handleFieldChange("tipoTrabajo", event.target.value)}
            onBlur={() => handleBlur("tipoTrabajo")}
            placeholder="Ej: Ventana termopanel para living"
          />
          {touched.tipoTrabajo && errors.tipoTrabajo ? (
            <span className={s.fieldError}>{errors.tipoTrabajo}</span>
          ) : null}
        </div>

        <label className={s.field}>
          <span className={s.label}>Mensaje adicional</span>
          <textarea
            className={s.textarea}
            rows={4}
            value={form.mensaje}
            onChange={(event) => handleFieldChange("mensaje", event.target.value)}
            onBlur={() => handleBlur("mensaje")}
            placeholder="Cuéntanos medidas aproximadas, comuna, plazo o lo que ya tengas claro."
          />
        </label>

        {errorMessage ? <div className={s.errorBanner}>{errorMessage}</div> : null}

        {successMessage ? (
          <div className={s.successBanner}>
            <LuCheckCheck aria-hidden />
            <div>
              <strong>Solicitud enviada</strong>
              <p>{successMessage}</p>
            </div>
          </div>
        ) : null}

        <button className={s.submitButton} type="submit" disabled={isSubmitting}>
          <LuSend aria-hidden />
          {isSubmitting ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>

      <div className={s.formFooter}>
        <div className={s.formFooterItem}>
          <LuLock aria-hidden />
          <span>{privacidad}</span>
        </div>

        {!whatsappReady && empresaEmail ? (
          <div className={s.formFooterMuted}>
            Si esta empresa aún no configuró WhatsApp, puedes escribir a {empresaEmail}.
          </div>
        ) : null}

        {!isAvailable ? (
          <div className={s.formFooterMuted}>
            Si ahora están fuera de horario, tu solicitud igual queda guardada para seguimiento.
          </div>
        ) : null}
      </div>
    </section>
  );
}

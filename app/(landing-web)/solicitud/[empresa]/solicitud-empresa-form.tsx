"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LuBadgeCheck,
  LuCheck,
  LuCheckCheck,
  LuImagePlus,
  LuLock,
  LuMapPin,
  LuRuler,
  LuSend,
} from "react-icons/lu";

import {
  formatChileMobilePhone,
  isValidChileMobilePhone,
  normalizeChileMobilePhone,
} from "@/utils/chile-mobile-phone";

import s from "./page.module.css";

type Props = {
  slug: string;
  empresaTelefono: string;
  empresaEmail: string;
  privacidad: string;
  isAvailable: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  sourceUrl?: string;
  origin?: string;
  formTitle?: string;
  formSubtitle?: string;
};

type FormState = {
  nombre: string;
  contacto: string;
  tipoTrabajo: string;
  medidas: string;
  comuna: string;
  mensaje: string;
  consentimiento: boolean;
};

type QuickWorkType = {
  value: string;
  label: string;
  drawing: string;
};

function WorkTypeDrawing({ type }: { type: string }) {
  const glassFill = "rgba(103, 158, 219, 0.14)";
  const accentFill = "rgba(79, 125, 212, 0.18)";

  switch (type) {
    case "window":
      return (
        <svg viewBox="0 0 64 64" className={s.workTypeDrawingSvg} aria-hidden>
          <rect x="13" y="12" width="38" height="40" rx="5" fill={glassFill} />
          <rect x="13" y="12" width="38" height="40" rx="5" />
          <path d="M32 12V52" />
          <path d="M18 50H46" />
          <circle cx="29" cy="32" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="35" cy="32" r="1.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "shower":
      return (
        <svg viewBox="0 0 64 64" className={s.workTypeDrawingSvg} aria-hidden>
          <path d="M16 50V18h16v32" fill={glassFill} />
          <path d="M32 50V18h16v32" fill="rgba(79, 125, 212, 0.1)" />
          <path d="M16 50V18h16v32" />
          <path d="M32 50V18h16v32" />
          <path d="M16 18l6-6h26" />
          <path d="M24 34h4" />
          <path d="M40 34h4" />
          <path d="M14 52H50" />
        </svg>
      );
    case "terrace":
      return (
        <svg viewBox="0 0 64 64" className={s.workTypeDrawingSvg} aria-hidden>
          <rect x="10" y="15" width="44" height="34" rx="4" fill={glassFill} />
          <rect x="10" y="15" width="44" height="34" rx="4" />
          <path d="M24 15V49" />
          <path d="M40 15V49" />
          <path d="M10 24H54" opacity="0.8" />
          <path d="M10 49h44" />
          <circle cx="22" cy="33" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="38" cy="33" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "door":
      return (
        <svg viewBox="0 0 64 64" className={s.workTypeDrawingSvg} aria-hidden>
          <path d="M20 10h24v42H20z" fill={glassFill} />
          <path d="M20 10h24v42H20z" />
          <path d="M20 52h28" />
          <path d="M24 15h16v28" opacity="0.8" />
          <circle cx="38" cy="32" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "partition":
      return (
        <svg viewBox="0 0 64 64" className={s.workTypeDrawingSvg} aria-hidden>
          <rect x="12" y="12" width="18" height="38" rx="4" fill={glassFill} />
          <rect x="34" y="18" width="18" height="32" rx="4" fill="rgba(79, 125, 212, 0.1)" />
          <rect x="12" y="12" width="18" height="38" rx="4" />
          <rect x="34" y="18" width="18" height="32" rx="4" />
          <path d="M10 52H54" />
          <path d="M32 14V50" />
        </svg>
      );
    case "thermal":
      return (
        <svg viewBox="0 0 64 64" className={s.workTypeDrawingSvg} aria-hidden>
          <rect x="12" y="14" width="26" height="34" rx="4" fill={glassFill} />
          <rect x="26" y="14" width="26" height="34" rx="4" fill="rgba(79, 125, 212, 0.09)" />
          <rect x="12" y="14" width="26" height="34" rx="4" />
          <rect x="26" y="14" width="26" height="34" rx="4" />
          <path d="M46 10v10M46 42v10M40 16h12M40 46h12M41.5 14.5l9 9M50.5 14.5l-9 9M41.5 40.5l9 9M50.5 40.5l-9 9" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className={s.workTypeDrawingSvg} aria-hidden>
          <rect x="14" y="14" width="36" height="36" rx="6" fill={accentFill} />
          <rect x="14" y="14" width="36" height="36" rx="6" />
        </svg>
      );
  }
}

type FieldErrors = Partial<
  Record<"nombre" | "contacto" | "tipoTrabajo" | "consentimiento", string>
>;

const EMPTY_FORM: FormState = {
  nombre: "",
  contacto: "",
  tipoTrabajo: "",
  medidas: "",
  comuna: "",
  mensaje: "",
  consentimiento: false,
};

const QUICK_WORK_TYPES: QuickWorkType[] = [
  { value: "Ventana", label: "Ventana", drawing: "window" },
  { value: "Shower", label: "Shower", drawing: "shower" },
  { value: "Terraza", label: "Terraza", drawing: "terrace" },
  { value: "Puerta", label: "Puerta", drawing: "door" },
  { value: "Mampara", label: "Mampara", drawing: "partition" },
  { value: "Termopanel", label: "Termopanel", drawing: "thermal" },
] as const;

function validateNombre(value: string) {
  return value.trim().length >= 3 ? null : "Ingresa tu nombre completo.";
}

function validateContacto(value: string) {
  if (!value.trim()) {
    return "Ingresa tu WhatsApp.";
  }

  return isValidChileMobilePhone(value) ? null : "Ingresa un WhatsApp valido.";
}

function validateTipoTrabajo(value: string) {
  return value.trim().length >= 2 ? null : "Selecciona o escribe el trabajo.";
}

function validateConsentimiento(value: boolean) {
  return value ? null : "Debes aceptar el uso de datos para enviar la solicitud.";
}

export function SolicitudEmpresaForm({
  slug,
  empresaTelefono,
  empresaEmail,
  privacidad,
  isAvailable,
  utmSource,
  utmMedium,
  utmCampaign,
  sourceUrl,
  origin,
  formTitle,
  formSubtitle,
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedWorkType, setSelectedWorkType] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [resolvedSourceUrl, setResolvedSourceUrl] = useState<string | null>(
    sourceUrl ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sourceUrl) {
      setResolvedSourceUrl(sourceUrl);
      return;
    }

    if (typeof window !== "undefined") {
      setResolvedSourceUrl(window.location.href);
    }
  }, [sourceUrl]);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          root.dataset.solicitudFormActive = "true";
          return;
        }

        if (!section.contains(document.activeElement)) {
          delete root.dataset.solicitudFormActive;
        }
      },
      {
        threshold: 0.35,
        rootMargin: "0px 0px -18% 0px",
      }
    );

    const handleFocusIn = () => {
      root.dataset.solicitudFormActive = "true";
    };

    const handleFocusOut = () => {
      window.setTimeout(() => {
        if (!section.contains(document.activeElement)) {
          const rect = section.getBoundingClientRect();
          const isVisible =
            rect.top < window.innerHeight * 0.82 && rect.bottom > window.innerHeight * 0.18;

          if (!isVisible) {
            delete root.dataset.solicitudFormActive;
          }
        }
      }, 0);
    };

    observer.observe(section);
    section.addEventListener("focusin", handleFocusIn);
    section.addEventListener("focusout", handleFocusOut);

    return () => {
      observer.disconnect();
      section.removeEventListener("focusin", handleFocusIn);
      section.removeEventListener("focusout", handleFocusOut);

      if (root.dataset.solicitudFormActive === "true") {
        delete root.dataset.solicitudFormActive;
      }
    };
  }, []);

  const errors = useMemo<FieldErrors>(
    () => ({
      nombre: validateNombre(form.nombre) ?? undefined,
      contacto: validateContacto(form.contacto) ?? undefined,
      tipoTrabajo: validateTipoTrabajo(form.tipoTrabajo) ?? undefined,
      consentimiento: validateConsentimiento(form.consentimiento) ?? undefined,
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

  const isValid =
    !errors.nombre &&
    !errors.contacto &&
    !errors.tipoTrabajo &&
    !errors.consentimiento;

  const resolvedOrigin = origin?.trim() || utmSource?.trim() || "solicitud-publica";

  function handleFieldChange<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleBlur(field: keyof FormState) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function handleWorkTypeSelect(value: string) {
    setSelectedWorkType(value);
    handleFieldChange("tipoTrabajo", value);
    setTouched((current) => ({ ...current, tipoTrabajo: true }));
  }

  function handleReferenceChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setReferenceFile(nextFile);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setTouched({
      nombre: true,
      contacto: true,
      tipoTrabajo: true,
      consentimiento: true,
    });

    if (!isValid || !normalizedClienteWhatsapp) {
      return;
    }

    const messageParts = [
      form.mensaje.trim() || null,
      form.medidas.trim() ? `Medidas aprox: ${form.medidas.trim()}` : null,
      form.comuna.trim() ? `Comuna: ${form.comuna.trim()}` : null,
      referenceFile ? `Referencia adjunta: ${referenceFile.name}` : null,
    ].filter(Boolean);

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
          nombre: form.nombre,
          contacto: normalizedClienteWhatsapp,
          tipoTrabajo: form.tipoTrabajo,
          mensaje: messageParts.join("\n"),
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
        "Solicitud enviada. Te contactaremos por WhatsApp para continuar."
      );
      setForm(EMPTY_FORM);
      setSelectedWorkType(null);
      setReferenceFile(null);
      setTouched({});
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
    <section id="solicitud-rapida" className={s.formCard} ref={sectionRef}>
    <div className={s.formIntro}>
      <span className={s.sectionEyebrow}>Solicitud rapida</span>
      <h2 className={s.formTitle}>{formTitle ?? "Cuentanos que necesitas"}</h2>
      {formSubtitle ? (
        <p className={s.formSubtitle}>{formSubtitle}</p>
      ) : null}
    </div>

      <form className={s.form} onSubmit={handleSubmit}>
        <label className={s.field}>
          <span className={s.fieldLabel}>Nombre *</span>
          <input
            className={s.input}
            value={form.nombre}
            onChange={(event) => handleFieldChange("nombre", event.target.value)}
            onBlur={() => handleBlur("nombre")}
            placeholder="Tu nombre completo"
            autoComplete="name"
          />
          {touched.nombre && errors.nombre ? (
            <span className={s.fieldError}>{errors.nombre}</span>
          ) : null}
        </label>

        <label className={s.field}>
          <span className={s.fieldLabel}>WhatsApp *</span>
          <div className={s.phoneField}>
            <span className={s.phonePrefix}>+56</span>
            <input
              className={s.phoneInput}
              value={form.contacto}
              onChange={(event) => handleFieldChange("contacto", event.target.value)}
              onBlur={() => handleBlur("contacto")}
              placeholder="9 1234 5678"
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
          {touched.contacto && displayWhatsapp && !errors.contacto ? (
            <span className={s.fieldHint}>Formato detectado: +56 9 {displayWhatsapp}</span>
          ) : null}
          {touched.contacto && errors.contacto ? (
            <span className={s.fieldError}>{errors.contacto}</span>
          ) : null}
        </label>

        <div className={s.field}>
          <span className={s.fieldLabel}>Tipo de trabajo *</span>
          <div className={s.workTypeGrid}>
            {QUICK_WORK_TYPES.map((workType) => {
              const isActive = selectedWorkType === workType.value;

              return (
                <button
                  key={workType.value}
                  type="button"
                  className={`${s.workTypeButton}${isActive ? ` ${s.workTypeButtonActive}` : ""}`}
                  onClick={() => handleWorkTypeSelect(workType.value)}
                >
                  <span
                    className={`${s.workTypeCheck}${isActive ? ` ${s.workTypeCheckActive}` : ""}`}
                    aria-hidden
                  >
                    <LuCheck />
                  </span>
                  <span className={s.workTypeDrawing} aria-hidden>
                    <WorkTypeDrawing type={workType.drawing} />
                  </span>
                  <span>{workType.label}</span>
                </button>
              );
            })}
          </div>
          <input
            className={`${s.input} ${s.detailInput}`}
            value={form.tipoTrabajo}
            onChange={(event) => {
              setSelectedWorkType(null);
              handleFieldChange("tipoTrabajo", event.target.value);
            }}
            onBlur={() => handleBlur("tipoTrabajo")}
            placeholder="Si es otro trabajo, escribelo aqui"
          />
          {touched.tipoTrabajo && errors.tipoTrabajo ? (
            <span className={s.fieldError}>{errors.tipoTrabajo}</span>
          ) : null}
        </div>

        <details className={s.optionalDetails}>
          <summary className={s.optionalSummary}>Mas detalles para cotizar mejor</summary>

          <div className={s.optionalContent}>
            <div className={s.optionalGrid}>
              <label className={s.field}>
                <span className={s.fieldLabel}>Medidas <em>(opcional)</em></span>
                <div className={s.iconInput}>
                  <LuRuler aria-hidden />
                  <input
                    className={s.inlineInput}
                    value={form.medidas}
                    onChange={(event) => handleFieldChange("medidas", event.target.value)}
                    placeholder="1.2 x 0.8 m"
                  />
                </div>
              </label>

              <label className={s.field}>
                <span className={s.fieldLabel}>Comuna <em>(opcional)</em></span>
                <div className={s.iconInput}>
                  <LuMapPin aria-hidden />
                  <input
                    className={s.inlineInput}
                    value={form.comuna}
                    onChange={(event) => handleFieldChange("comuna", event.target.value)}
                    placeholder="Nunoa"
                  />
                </div>
              </label>
            </div>

            <label className={s.field}>
              <span className={s.fieldLabel}>Mensaje <em>(opcional)</em></span>
              <textarea
                className={s.textarea}
                rows={4}
                value={form.mensaje}
                onChange={(event) => handleFieldChange("mensaje", event.target.value)}
                placeholder="Cuentanos brevemente que necesitas..."
              />
            </label>

            <div className={s.field}>
              <span className={s.fieldLabel}>Foto o referencia <em>(opcional)</em></span>
              <label className={s.uploadCard}>
                <div className={s.uploadCardLeft}>
                  <div className={s.uploadIconWrap}>
                    <LuImagePlus aria-hidden />
                  </div>
                  <div className={s.uploadCopy}>
                    <strong>{referenceFile ? referenceFile.name : "Adjuntar foto"}</strong>
                    <span>Ayuda a cotizar mas rapido</span>
                  </div>
                </div>
                <span className={s.uploadPlus} aria-hidden>
                  +
                </span>
                <input type="file" accept="image/*" onChange={handleReferenceChange} />
              </label>
              <span className={s.fieldHint}>
                Si adjuntas una imagen, por ahora registramos su referencia para seguimiento.
              </span>
            </div>
          </div>
        </details>

        <label className={s.checkboxRow}>
          <input
            type="checkbox"
            checked={form.consentimiento}
            onChange={(event) =>
              handleFieldChange("consentimiento", event.target.checked)
            }
            onBlur={() => handleBlur("consentimiento")}
          />
          <span>Acepto que mis datos se usen solo para responder esta solicitud.</span>
        </label>
        {touched.consentimiento && errors.consentimiento ? (
          <span className={s.fieldError}>{errors.consentimiento}</span>
        ) : null}

        {errorMessage ? (
          <div className={s.errorBanner} role="alert">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className={s.successBanner} aria-live="polite">
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

        <div className={s.submitTrust}>
          <LuBadgeCheck aria-hidden />
          <span>Te contactaremos por WhatsApp.</span>
        </div>
      </form>

      <div className={s.formFooter}>
        <div className={s.formFooterItem}>
          <LuLock aria-hidden />
          <span>{privacidad}</span>
        </div>

        {!empresaTelefono && empresaEmail ? (
          <div className={s.formFooterMuted}>
            Si esta empresa aun no configuro WhatsApp, puedes escribir a {empresaEmail}.
          </div>
        ) : null}

        {!isAvailable ? (
          <div className={s.formFooterMuted}>
            Si estamos fuera de horario, igual guardamos tu solicitud.
          </div>
        ) : null}

        {referenceFile ? (
          <div className={s.formFooterMuted}>
            Referencia seleccionada: {referenceFile.name}
          </div>
        ) : null}
      </div>
    </section>
  );
}

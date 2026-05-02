"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LuCircleCheck,
  LuClock3,
  LuLock,
  LuMessageCircleMore,
  LuSend,
  LuShieldCheck,
  LuX,
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
  "Cierre terraza",
  "Puerta de vidrio",
  "Mampara baño",
  "Termopanel",
  "Otro",
] as const;

function validateNombre(value: string) {
  return value.trim().length >= 3 ? null : "Ingresa tu nombre completo.";
}

function validateContacto(value: string) {
  if (!value.trim()) {
    return "Ingresa un WhatsApp válido.";
  }

  return isValidChileMobilePhone(value) ? null : "Ingresa un WhatsApp válido.";
}

function validateTipoTrabajo(value: string) {
  return value.trim().length >= 3
    ? null
    : "Describe brevemente el trabajo que necesitas.";
}

export function SolicitudEmpresaForm({
  slug,
  empresaNombre,
  empresaTelefono,
  empresaEmail,
  privacidad,
  isAvailable,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [isClosingForm, setIsClosingForm] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    nombre: false,
    contacto: false,
    tipoTrabajo: false,
    mensaje: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const nombreInputRef = useRef<HTMLInputElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!showForm) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showForm]);

  useEffect(() => {
    if (!showForm) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      nombreInputRef.current?.focus();
    }, 180);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [showForm]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const whatsappReady = Boolean(normalizeWhatsappPhone(empresaTelefono));

  const errors = useMemo<FieldErrors>(
    () => ({
      nombre: validateNombre(form.nombre) ?? undefined,
      contacto: validateContacto(form.contacto) ?? undefined,
      tipoTrabajo: validateTipoTrabajo(form.tipoTrabajo) ?? undefined,
    }),
    [form]
  );

  const isValid = !errors.nombre && !errors.contacto && !errors.tipoTrabajo;
  const formattedWhatsappDigits = useMemo(
    () => formatChileMobilePhone(form.contacto),
    [form.contacto]
  );
  const normalizedClienteWhatsapp = useMemo(
    () => normalizeChileMobilePhone(form.contacto),
    [form.contacto]
  );

  const whatsappUrl = useMemo(
    () =>
      whatsappReady
        ? buildPublicLeadWhatsappUrl(empresaTelefono, {
            nombre: form.nombre,
            tipoTrabajo: form.tipoTrabajo,
            mensaje: form.mensaje,
          })
        : null,
    [empresaTelefono, form.mensaje, form.nombre, form.tipoTrabajo, whatsappReady]
  );

  const directWhatsappUrl = useMemo(
    () =>
      whatsappReady
        ? buildPublicLeadWhatsappUrl(empresaTelefono, {
            nombre: form.nombre,
            tipoTrabajo: form.tipoTrabajo,
            mensaje: form.mensaje
              ? `${form.mensaje}${normalizedClienteWhatsapp ? ` Mi WhatsApp es ${normalizedClienteWhatsapp}.` : ""}`
              : normalizedClienteWhatsapp
                ? `Mi WhatsApp es ${normalizedClienteWhatsapp}.`
                : null,
          })
        : null,
    [
      empresaTelefono,
      form.mensaje,
      form.nombre,
      form.tipoTrabajo,
      normalizedClienteWhatsapp,
      whatsappReady,
    ]
  );

  const openForm = () => {
    setIsClosingForm(false);
    setShowForm(true);
  };

  const closeForm = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setIsClosingForm(true);
    closeTimerRef.current = window.setTimeout(() => {
      setShowForm(false);
      setIsClosingForm(false);
      closeTimerRef.current = null;
    }, 220);
  };

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleTextBlur = (field: keyof FormState) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const handlePhoneBlur = () => {
    setTouched((current) => ({ ...current, contacto: true }));
  };

  const handleWorkTypeSelect = (value: string) => {
    setSelectedWorkType(value);

    if (value !== "Otro") {
      handleFieldChange("tipoTrabajo", value);
      setTouched((current) => ({ ...current, tipoTrabajo: true }));
      return;
    }

    handleFieldChange("tipoTrabajo", "");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      setSuccessMessage(
        `${empresaNombre} recibió tu solicitud. Puedes seguir por WhatsApp si quieres respuesta más rápida.`
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
  };

  return (
    <>
      <section className={s.ctaCard}>
        <div className={s.ctaStack}>
          {isAvailable ? (
            <>
              {whatsappUrl || directWhatsappUrl ? (
                <div className={s.primaryActionBlock}>
                  <a
                    className={`${s.primaryButton} ${s.whatsappPrimary}`}
                    href={
                      successMessage
                        ? whatsappUrl ?? directWhatsappUrl ?? "#"
                        : directWhatsappUrl ?? "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LuMessageCircleMore aria-hidden />
                    {successMessage
                      ? "Continuar por WhatsApp"
                      : "Hablar por WhatsApp"}
                  </a>
                  <p className={s.primaryHint}>
                    Recomendado · respuesta más rápida
                  </p>
                </div>
              ) : (
                <div className={s.whatsappWarning}>
                  <strong>Esta empresa aún no configuró su WhatsApp.</strong>
                  <span>
                    {empresaEmail
                      ? `Por ahora puedes usar el formulario o escribir a ${empresaEmail}.`
                      : "Por ahora puedes usar el formulario de solicitud rápida."}
                  </span>
                </div>
              )}

              <div className={s.dividerRow}>
                <span className={s.dividerLine} />
                <span className={s.dividerText}>o</span>
                <span className={s.dividerLine} />
              </div>

              <button className={s.secondaryButton} type="button" onClick={openForm}>
                Dejar solicitud rápida
              </button>
            </>
          ) : (
            <>
              <button className={s.primaryButton} type="button" onClick={openForm}>
                <LuSend aria-hidden />
                Dejar solicitud rápida
              </button>
              <p className={s.primaryHint}>
                Tu solicitud queda registrada para preparar tu cotización
              </p>

              <div className={s.dividerRow}>
                <span className={s.dividerLine} />
                <span className={s.dividerText}>o</span>
                <span className={s.dividerLine} />
              </div>

              {whatsappUrl || directWhatsappUrl ? (
                <a
                  className={s.secondaryButton}
                  href={directWhatsappUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LuMessageCircleMore aria-hidden />
                  Enviar WhatsApp igualmente
                </a>
              ) : (
                <div className={s.whatsappWarning}>
                  <strong>Esta empresa aún no configuró su WhatsApp.</strong>
                  <span>
                    {empresaEmail
                      ? `Por ahora puedes usar el formulario o escribir a ${empresaEmail}.`
                      : "Por ahora puedes usar el formulario de solicitud rápida."}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className={s.trustInfo}>
        <div className={s.trustItem}>
          <LuShieldCheck aria-hidden />
          <span>Sin compromiso</span>
        </div>
        <div className={s.trustItem}>
          <LuClock3 aria-hidden />
          <span>Respuesta por WhatsApp</span>
        </div>
      </section>

      <section className={s.howItWorksCard}>
        <p className={s.howItWorksText}>
          Deja tu solicitud para que no se pierda. La empresa te responderá
          directamente por WhatsApp.
        </p>
      </section>

      <footer className={s.ventoraFooter}>
        <span className={s.ventoraMark}>V</span>
        <span>Cotización gestionada con Ventora</span>
      </footer>

      {showForm ? (
        <>
          <button
            type="button"
            className={`${s.sheetBackdrop} ${isClosingForm ? s.sheetBackdropClosing : ""}`}
            aria-label="Cerrar solicitud rápida"
            onClick={closeForm}
          />
          <section
            className={`${s.sheet} ${isClosingForm ? s.sheetClosing : ""}`}
            aria-modal="true"
            role="dialog"
          >
            <div className={s.sheetHandle} />
            <div className={s.sheetHeader}>
              <div>
                <strong>Deja tu solicitud rápida</strong>
                <span>Quedará registrada para preparar tu cotización.</span>
              </div>
              <button
                type="button"
                className={s.sheetClose}
                onClick={closeForm}
                aria-label="Cerrar"
              >
                <LuX aria-hidden />
              </button>
            </div>

            <form className={s.form} onSubmit={handleSubmit} noValidate>
              <label className={s.field}>
                <span className={s.label}>Nombre</span>
                <input
                  ref={nombreInputRef}
                  className={`${s.input} ${
                    touched.nombre && errors.nombre ? s.inputError : ""
                  }`}
                  value={form.nombre}
                  onChange={(event) => handleFieldChange("nombre", event.target.value)}
                  onBlur={() => handleTextBlur("nombre")}
                  placeholder="Pedro Aguirre"
                  autoComplete="name"
                />
                {touched.nombre && errors.nombre ? (
                  <span className={s.errorText}>{errors.nombre}</span>
                ) : null}
              </label>

              <label className={s.field}>
                <span className={s.label}>Teléfono o WhatsApp</span>
                <div
                  className={`${s.phoneField} ${
                    touched.contacto && errors.contacto ? s.inputError : ""
                  }`}
                >
                  <span className={s.phonePrefix}>+56 9</span>
                  <input
                    className={s.phoneInput}
                    value={formattedWhatsappDigits}
                    onChange={(event) => handleFieldChange("contacto", event.target.value)}
                    onBlur={handlePhoneBlur}
                    placeholder="XXXX XXXX"
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                </div>
                {touched.contacto && errors.contacto ? (
                  <span className={s.errorText}>{errors.contacto}</span>
                ) : null}
              </label>

              <div className={s.field}>
                <span className={s.label}>Tipo de trabajo</span>
                <div className={s.chipGrid}>
                  {QUICK_WORK_TYPES.map((option) => {
                    const active =
                      option === "Otro"
                        ? selectedWorkType === option
                        : form.tipoTrabajo === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        className={`${s.choiceChip} ${active ? s.choiceChipActive : ""}`}
                        onClick={() => handleWorkTypeSelect(option)}
                      >
                        <span
                          className={`${s.choiceCheck} ${active ? s.choiceCheckVisible : ""}`}
                          aria-hidden
                        >
                          ✓
                        </span>
                        <span className={s.choiceLabel}>{option}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedWorkType === "Otro" ? (
                  <input
                    className={`${s.input} ${
                      touched.tipoTrabajo && errors.tipoTrabajo ? s.inputError : ""
                    }`}
                    value={form.tipoTrabajo}
                    onChange={(event) =>
                      handleFieldChange("tipoTrabajo", event.target.value)
                    }
                    onBlur={() => handleTextBlur("tipoTrabajo")}
                    placeholder="Ej: termopanel, espejo, otro"
                  />
                ) : null}
                {touched.tipoTrabajo && errors.tipoTrabajo ? (
                  <span className={s.errorText}>{errors.tipoTrabajo}</span>
                ) : null}
              </div>

              <label className={s.field}>
                <span className={s.label}>
                  Mensaje <span className={s.optionalLabel}>(opcional)</span>
                </span>
                <textarea
                  className={s.textarea}
                  value={form.mensaje}
                  onChange={(event) => handleFieldChange("mensaje", event.target.value)}
                  onBlur={() => handleTextBlur("mensaje")}
                  placeholder="Ej: quiero cotizar un shower door para baño"
                  rows={4}
                />
              </label>

              <div className={s.privacyBox}>
                <LuLock aria-hidden />
                <span>
                  Puedes enviar fotos o medidas después por WhatsApp. Tus datos se
                  usan solo para esta solicitud. {privacidad}
                </span>
              </div>

              {errorMessage ? (
                <div className={s.submitError}>{errorMessage}</div>
              ) : null}

              {successMessage ? (
                <div className={s.submitSuccess}>
                  <LuCircleCheck aria-hidden />
                  <span>{successMessage}</span>
                </div>
              ) : null}

              <div className={s.sheetSubmitBar}>
                {successMessage && (whatsappUrl || directWhatsappUrl) ? (
                  <a
                    className={`${s.submitButton} ${s.whatsappPrimary}`}
                    href={whatsappUrl ?? directWhatsappUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LuMessageCircleMore aria-hidden />
                    Continuar por WhatsApp
                  </a>
                ) : (
                  <button
                    className={s.submitButton}
                    type="submit"
                    disabled={isSubmitting || !isValid || !normalizedClienteWhatsapp}
                  >
                    <LuSend aria-hidden />
                    {isSubmitting ? "Enviando..." : "Enviar solicitud"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </>
      ) : null}
    </>
  );
}

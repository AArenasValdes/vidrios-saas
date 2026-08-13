"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2, MapPin, Phone, UserRound } from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";
import type { OAuthAccountCompletionValues } from "@/features/auth/services/auth-oauth-completion.service";
import { COUNTRY_PRESET_OPTIONS } from "@/features/organization-region/config/country-presets";
import { normalizePhoneToE164 } from "@/features/organization-region/services/phone-number.service";
import { getCountryPreset } from "@/features/organization-region/services/organization-region.service";
import type { SupportedCountryCode } from "@/features/organization-region/types/organization-region";
import s from "../../login/login.module.css";
import cs from "./completar-cuenta.module.css";

interface CompletarCuentaViewProps {
  nextPath: string;
  email: string;
  initialValues: OAuthAccountCompletionValues;
}

const copy = {
  title: "Completa tu cuenta",
  subtitle:
    "Estos datos dejan tu taller listo para cotizar y permiten ayudarte si lo necesitas.",
  nombreLabel: "Tu nombre",
  nombrePlaceholder: "Ej: Alessandro Gonzalez",
  empresaLabel: "Nombre del taller",
  empresaPlaceholder: "Ej: Vidrios del Sur",
  countryLabel: "Pais donde opera tu taller",
  whatsappLabel: "WhatsApp",
  ciudadLabel: "Ciudad o comuna (opcional)",
  ciudadPlaceholder: "Ej: Puente Alto",
  consent:
    "Acepto crear mi cuenta y que Ventora me contacte directamente por soporte o ayuda comercial. Esto no incluye campanas masivas.",
  submit: "Continuar a Ventora",
  submitting: "Guardando tu cuenta...",
  loginPrompt: "Quieres usar otra cuenta?",
  loginAction: "Volver al inicio de sesion",
  errorGeneric: "No pudimos completar tu cuenta. Intenta de nuevo.",
  identityConflict:
    "Este correo ya esta vinculado a otra cuenta de acceso. Contactanos si necesitas ayuda.",
};

function normalizeRequiredText(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export default function CompletarCuentaView({
  nextPath,
  email,
  initialValues,
}: CompletarCuentaViewProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(initialValues.nombre);
  const [empresaNombre, setEmpresaNombre] = useState(
    initialValues.empresaNombre,
  );
  const [whatsapp, setWhatsapp] = useState(initialValues.whatsapp);
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>(
    initialValues.countryCode,
  );
  const [ciudadComuna, setCiudadComuna] = useState(initialValues.ciudadComuna);
  const [consentimientoAceptado, setConsentimientoAceptado] = useState(
    initialValues.consentimientoAceptado,
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    googleTagService.trackEvent("google_signup_started", {
      event_category: "auth",
      event_label: "completar_cuenta_view",
      next_path: nextPath,
      oauth_provider: "google",
    });
  }, [nextPath]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cargando) {
      return;
    }

    const normalizedNombre = normalizeRequiredText(nombre);
    const normalizedEmpresa = normalizeRequiredText(empresaNombre);
    const normalizedCiudad = normalizeRequiredText(ciudadComuna);
    const normalizedWhatsapp = normalizePhoneToE164(whatsapp, countryCode);

    if (normalizedNombre.length < 2) {
      setError("Ingresa tu nombre.");
      return;
    }

    if (normalizedEmpresa.length < 2) {
      setError("Ingresa el nombre del taller.");
      return;
    }

    if (!normalizedWhatsapp) {
      setError("Ingresa un WhatsApp valido con codigo de pais.");
      return;
    }

    if (normalizedCiudad.length === 1) {
      setError("La ciudad o comuna debe tener al menos 2 caracteres.");
      return;
    }

    if (!consentimientoAceptado) {
      setError("Debes aceptar la creacion de la cuenta para continuar.");
      return;
    }

    setError(null);
    setCargando(true);

    try {
      const response = await fetch("/api/auth/oauth/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: normalizedNombre,
          empresaNombre: normalizedEmpresa,
          whatsapp: normalizedWhatsapp,
          countryCode,
          ciudadComuna: normalizedCiudad,
          consentimientoAceptado: true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        code?: string;
        alreadyProvisioned?: boolean;
        accountComplete?: boolean;
      } | null;

      if (!response.ok || !payload?.accountComplete) {
        if (payload?.code === "identity_conflict") {
          setError(copy.identityConflict);
          googleTagService.trackEvent("google_signup_abandoned", {
            event_category: "auth",
            event_label: "identity_conflict",
            oauth_provider: "google",
          });
          return;
        }

        setError(payload?.error ?? copy.errorGeneric);
        googleTagService.trackEvent("google_signup_abandoned", {
          event_category: "auth",
          event_label: payload?.code ?? "unknown",
          oauth_provider: "google",
        });
        return;
      }

      if (!payload.alreadyProvisioned) {
        googleTagService.trackEvent("trial_started", {
          event_category: "auth",
          event_label: "google_oauth_signup",
          next_path: nextPath,
          oauth_provider: "google",
        });
      }

      googleTagService.trackEvent("google_signup_completed", {
        event_category: "auth",
        event_label: payload.alreadyProvisioned
          ? "existing_org_completed"
          : "new_org",
        next_path: nextPath,
        oauth_provider: "google",
      });

      router.replace(nextPath);
    } catch {
      setError(copy.errorGeneric);
      googleTagService.trackEvent("google_signup_abandoned", {
        event_category: "auth",
        event_label: "network_error",
        oauth_provider: "google",
      });
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className={s.root}>
      <section className={s.formPanel}>
        <div className={`${s.formShell} ${cs.formShell}`}>
          <Link href="/" className={s.brand} aria-label="Ventora">
            <Image
              src="/brand/ventora-logo-premium-dark.svg"
              alt="Ventora"
              width={348}
              height={82}
              className={s.brandLogo}
              unoptimized
            />
          </Link>

          <div className={`${s.formCard} ${cs.formCard}`}>
            <header className={s.formHeader}>
              <p className={cs.stepLabel}>Un ultimo paso</p>
              <h1 className={s.formTitle}>{copy.title}</h1>
              <p className={s.formSubtitle}>{copy.subtitle}</p>
              <p className={cs.email}>{email}</p>
            </header>

            <form
              className={`${s.form} ${cs.form}`}
              onSubmit={onSubmit}
              noValidate
            >
              <div className={cs.fieldGrid}>
                <div className={s.field}>
                  <label className={s.fieldLabel} htmlFor="nombre">
                    {copy.nombreLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <UserRound size={18} aria-hidden />
                    <input
                      id="nombre"
                      name="nombre"
                      type="text"
                      className={s.fieldInput}
                      placeholder={copy.nombrePlaceholder}
                      value={nombre}
                      onChange={(event) => {
                        setNombre(event.target.value);
                        setError(null);
                      }}
                      autoComplete="name"
                      maxLength={120}
                      disabled={cargando}
                    />
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.fieldLabel} htmlFor="empresaNombre">
                    {copy.empresaLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <Building2 size={18} aria-hidden />
                    <input
                      id="empresaNombre"
                      name="empresaNombre"
                      type="text"
                      className={s.fieldInput}
                      placeholder={copy.empresaPlaceholder}
                      value={empresaNombre}
                      onChange={(event) => {
                        setEmpresaNombre(event.target.value);
                        setError(null);
                      }}
                      autoComplete="organization"
                      required
                      minLength={2}
                      maxLength={160}
                      disabled={cargando}
                    />
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.fieldLabel} htmlFor="countryCode">
                    {copy.countryLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <MapPin size={18} aria-hidden />
                    <select
                      id="countryCode"
                      name="countryCode"
                      className={s.fieldInput}
                      value={countryCode}
                      onChange={(event) => {
                        setCountryCode(
                          event.target.value as SupportedCountryCode,
                        );
                        setError(null);
                      }}
                      disabled={cargando}
                      required
                    >
                      {COUNTRY_PRESET_OPTIONS.map((preset) => (
                        <option
                          key={preset.countryCode}
                          value={preset.countryCode}
                        >
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.fieldLabel} htmlFor="whatsapp">
                    {copy.whatsappLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <Phone size={18} aria-hidden />
                    <input
                      id="whatsapp"
                      name="whatsapp"
                      type="tel"
                      inputMode="tel"
                      className={s.fieldInput}
                      placeholder={
                        getCountryPreset(countryCode).phonePlaceholder
                      }
                      value={whatsapp}
                      onChange={(event) => {
                        setWhatsapp(event.target.value);
                        setError(null);
                      }}
                      onBlur={() => {
                        const normalized = normalizePhoneToE164(
                          whatsapp,
                          countryCode,
                        );
                        if (normalized) {
                          setWhatsapp(normalized);
                        }
                      }}
                      autoComplete="tel"
                      required
                      maxLength={24}
                      disabled={cargando}
                    />
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.fieldLabel} htmlFor="ciudadComuna">
                    {copy.ciudadLabel}
                  </label>
                  <div className={s.fieldControl}>
                    <MapPin size={18} aria-hidden />
                    <input
                      id="ciudadComuna"
                      name="ciudadComuna"
                      type="text"
                      className={s.fieldInput}
                      placeholder={copy.ciudadPlaceholder}
                      value={ciudadComuna}
                      onChange={(event) => {
                        setCiudadComuna(event.target.value);
                        setError(null);
                      }}
                      autoComplete="address-level2"
                      maxLength={120}
                      disabled={cargando}
                    />
                  </div>
                </div>
              </div>

              <label className={cs.consent}>
                <input
                  type="checkbox"
                  checked={consentimientoAceptado}
                  onChange={(event) => {
                    setConsentimientoAceptado(event.target.checked);
                    setError(null);
                  }}
                  disabled={cargando}
                />
                <span>{copy.consent}</span>
              </label>

              {error ? (
                <div className={s.errorBox} role="alert" aria-live="polite">
                  <span className={s.errorMark} aria-hidden>
                    !
                  </span>
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                className={s.primaryButton}
                disabled={cargando}
              >
                <span className={s.buttonContent}>
                  {cargando ? <span className={s.spinner} aria-hidden /> : null}
                  {cargando ? copy.submitting : copy.submit}
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>
            </form>

            <p className={s.signupText}>
              <span>{copy.loginPrompt}</span>{" "}
              <Link href="/login">{copy.loginAction}</Link>
            </p>
          </div>
        </div>
      </section>

      <section className={s.visualPanel} aria-hidden>
        <Image
          src="/brand/login-hero-premium.png"
          alt=""
          fill
          priority
          sizes="(max-width: 920px) 100vw, 60vw"
          className={s.visualImage}
        />
        <div className={s.visualOverlay} />

        <div className={s.visualCopy}>
          <p className={s.visualEyebrow}>Prueba gratuita</p>
          <h2 className={s.visualTitle}>
            Tu taller listo para crear la primera cotizacion
          </h2>
          <p className={s.visualDescription}>
            Guardaremos estos datos una sola vez y los dejaremos precargados en
            la configuracion de tu empresa.
          </p>
        </div>
      </section>
    </main>
  );
}

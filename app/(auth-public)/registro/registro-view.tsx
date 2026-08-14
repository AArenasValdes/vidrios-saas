"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Gift,
  Globe2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { AuthOAuthProvider } from "@/features/auth/types/auth";
import { COUNTRY_PRESET_OPTIONS } from "@/features/organization-region/config/country-presets";
import {
  getWhatsappValidationHint,
  resolveAuthWhatsapp,
  sanitizeAuthWhatsappLocalInput,
} from "@/features/organization-region/services/phone-number.service";
import { getCountryPreset } from "@/features/organization-region/services/organization-region.service";
import type { SupportedCountryCode } from "@/features/organization-region/types/organization-region";
import { GoogleAuthButton } from "../_components/google-auth-button";
import s from "../login/login.module.css";
import rs from "./registro.module.css";

type RegistrationStep = "account" | "business";

const copy = {
  accountTitle: "Crea tu cuenta gratis",
  accountSubtitle:
    "Crea tu cuenta y prepara tu primera cotización. Tienes 15 días de acceso completo, sin tarjeta.",
  businessTitle: "Cuéntanos sobre tu empresa",
  businessSubtitle:
    "Usaremos esta información para dejar tus datos listos en Ventora y en tu primer PDF.",
  googlePrimary: "Continuar con Google",
  divider: "o",
  nameLabel: "Tu nombre",
  namePlaceholder: "Ej: Alessandro Gonzalez",
  emailLabel: "Correo electrónico",
  emailPlaceholder: "tu@empresa.cl",
  passwordLabel: "Contraseña",
  passwordHint: "Mínimo 8 caracteres.",
  passwordConfirmLabel: "Repite tu contraseña",
  empresaLabel: "Nombre de tu empresa o taller",
  empresaPlaceholder: "Ej: Vidrios del Sur",
  countryLabel: "País donde operas",
  countryHint: "No te preocupes, podrás cambiarlo más tarde.",
  whatsappLabel: "WhatsApp",
  whatsappHint: "Te contactaremos por este medio sólo si lo necesitas.",
  ciudadLabel: "Ciudad / localidad (opcional)",
  ciudadPlaceholder: "Ej: Puente Alto",
  accountSubmit: "Continuar",
  businessSubmit: "Enviar enlace de activaciÃ³n",
  submitting: "Creando tu cuenta…",
  loginPrompt: "¿Ya tienes una cuenta?",
  loginAction: "Inicia sesión",
  accountTerms: "Al continuar aceptas nuestros",
  terms: "Términos de servicio",
  and: "y",
  privacy: "Política de privacidad.",
  securityTitle: "Tu información está segura",
  securityText: "Protegemos la información de tu empresa y tus clientes.",
  trialStarts: "Tu prueba de 15 días comienza ahora",
  trialTitle: "Prueba todas las funciones",
  trialItems: [
    "15 días de acceso completo",
    "Sin tarjeta de crédito",
    "Cancela cuando quieras",
  ],
  assistanceTitle: "¿Necesitas ayuda para configurar Ventora?",
  assistanceText: "Nuestro equipo puede ayudarte a dejar todo listo.",
  assistanceAction: "Quiero ayuda para configurar",
  errorGeneric: "No pudimos crear tu cuenta. Intenta de nuevo.",
};

const REGISTRATION_SUPPORT_WHATSAPP_HREF = `https://wa.me/56977338906?text=${encodeURIComponent(
  "Hola Ventora, necesito ayuda para configurar mi cuenta.",
)}`;

type SignupApiPayload = {
  error?: string;
  code?: string;
  field?: string;
  accountComplete?: boolean;
  verificationRequired?: boolean;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

function resolveSignupErrorMessage(
  payload: SignupApiPayload | null,
  countryCode: SupportedCountryCode,
  localWhatsapp = "",
) {
  if (!payload?.error) return copy.errorGeneric;

  switch (payload.code) {
    case "invalid_whatsapp":
      return (
        payload.error ?? getWhatsappValidationHint(countryCode, localWhatsapp)
      );
    case "email_taken":
    case "identity_conflict":
      return payload.error ??
        "Este correo ya tiene una cuenta. Inicia sesión para continuar.";
    default:
      return payload.error;
  }
}

function Progress({
  step,
  onBack,
}: {
  step: RegistrationStep;
  onBack: () => void;
}) {
  const isBusiness = step === "business";

  return (
    <div className={rs.progress} aria-label={`Paso ${isBusiness ? 2 : 1} de 2`}>
      {isBusiness ? (
        <button
          type="button"
          className={rs.backButton}
          aria-label="Volver a crear cuenta"
          onClick={onBack}
        >
          <ArrowLeft size={22} aria-hidden />
        </button>
      ) : null}
      <span
        className={`${rs.stepBadge} ${isBusiness ? rs.stepDone : rs.stepCurrent}`}
      >
        {isBusiness ? <Check size={17} aria-hidden /> : "1"}
      </span>
      <span className={rs.stepLabel}>
        {isBusiness ? "Cuenta creada" : "Crear cuenta"}
      </span>
      <span
        className={`${rs.progressLine} ${isBusiness ? rs.progressLineDone : ""}`}
        aria-hidden
      />
      <span
        className={`${rs.stepBadge} ${isBusiness ? rs.stepCurrent : rs.stepUpcoming}`}
      >
        2
      </span>
      {isBusiness ? (
        <span className={rs.stepLabel}>Datos de tu empresa</span>
      ) : null}
    </div>
  );
}

export default function RegistroView() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth({ passive: true });
  const [step, setStep] = useState<RegistrationStep>("account");
  const [nombre, setNombre] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>("CL");
  const [whatsappLocal, setWhatsappLocal] = useState("");
  const whatsappInputRef = useRef<HTMLInputElement>(null);
  const [ciudadComuna, setCiudadComuna] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [cargandoOAuth, setCargandoOAuth] = useState<AuthOAuthProvider | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const selectedCountry = getCountryPreset(countryCode);
  const disabled = cargando || Boolean(cargandoOAuth);

  const handleOAuthSignup = async (provider: AuthOAuthProvider) => {
    if (disabled) return;

    setCargandoOAuth(provider);
    setError(null);
    googleTagService.trackEvent(`${provider}_oauth_started`, {
      event_category: "auth",
      event_label: "signup",
      next_path: "/activacion",
      oauth_provider: provider,
    });

    try {
      await signInWithGoogle({ intent: "signup", nextPath: "/activacion" });
    } catch {
      setError("No pudimos iniciar el registro con Google. Intenta de nuevo.");
      setCargandoOAuth(null);
    }
  };

  function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedNombre = normalizeText(nombre);
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedNombre.length < 2) {
      setError("Ingresa tu nombre.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/u.test(normalizedEmail)) {
      setError("Ingresa un correo válido.");
      return;
    }
    if (password.length < 8) {
      setError("Tu contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError(null);
    setStep("business");
  }

  async function handleBusinessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const normalizedNombre = normalizeText(nombre);
    const normalizedEmpresa = normalizeText(empresaNombre);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCiudad = normalizeText(ciudadComuna);
    const whatsappInput = event.currentTarget.querySelector(
      "#whatsapp",
    ) as HTMLInputElement | null;
    const rawWhatsapp =
      whatsappLocal.trim() ||
      whatsappInput?.value.trim() ||
      whatsappInputRef.current?.value.trim() ||
      "";
    const normalizedWhatsapp = resolveAuthWhatsapp(rawWhatsapp, countryCode);

    if (normalizedEmpresa.length < 2) {
      setError("Ingresa el nombre de tu empresa o taller.");
      return;
    }
    if (!normalizedWhatsapp) {
      setError(getWhatsappValidationHint(countryCode, rawWhatsapp));
      return;
    }
    if (normalizedCiudad.length === 1) {
      setError("La ciudad o localidad debe tener al menos 2 caracteres.");
      return;
    }

    setError(null);
    setCargando(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: normalizedNombre,
          empresaNombre: normalizedEmpresa,
          email: normalizedEmail,
          password,
          whatsapp: normalizedWhatsapp,
          whatsappLocal: rawWhatsapp,
          countryCode,
          ciudadComuna: normalizedCiudad,
          consentimientoAceptado: true,
        }),
      });
      const payload = (await response.json().catch(() => null)) as SignupApiPayload | null;

      if (!response.ok) {
        setError(resolveSignupErrorMessage(payload, countryCode, rawWhatsapp));
        return;
      }

      if (payload?.verificationRequired) {
        googleTagService.trackEvent("password_signup_verification_sent", {
          event_category: "auth",
          event_label: "email_verification",
          next_path: "/activacion",
        });
        setPassword("");
        setPasswordConfirmation("");
        setVerificationEmail(normalizedEmail);
        return;
      }

      if (!payload?.accountComplete) {
        setError(resolveSignupErrorMessage(payload, countryCode, rawWhatsapp));
        return;
      }

      googleTagService.trackEvent("trial_started", {
        event_category: "auth",
        event_label: "password_signup",
        next_path: "/activacion",
      });
      await signIn({ email: normalizedEmail, password });
      googleTagService.trackEvent("password_signup_completed", {
        event_category: "auth",
        event_label: "new_org",
        next_path: "/activacion",
      });
      router.replace("/activacion");
    } catch {
      setError(
        "Tu cuenta fue creada, pero no pudimos abrir la sesión. Inicia sesión con tu correo y contraseña.",
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className={rs.root}>
      <section className={rs.registrationShell}>
        <aside className={rs.valuePanel} aria-label="Beneficios de Ventora">
          <div className={rs.valuePanelTop}>
            <p className={rs.eyebrow}>VENTORA · PRUEBA GRATIS</p>
            <h2>Tu empresa lista para cotizar desde el primer día.</h2>
            <p className={rs.valueDescription}>
              Registra tu negocio una vez. Ventora deja listos tus datos para
              cotizar, enviar PDFs profesionales y atender nuevos trabajos.
            </p>
          </div>

          <ul className={rs.valueList}>
            <li>
              <span className={rs.valueIcon}>
                <Check size={17} aria-hidden />
              </span>
              <span>
                <strong>PDF con tu identidad</strong>
                Tu empresa y datos de contacto ya aparecen preparados.
              </span>
            </li>
            <li>
              <span className={rs.valueIcon}>
                <Check size={17} aria-hidden />
              </span>
              <span>
                <strong>15 días para probarlo en serio</strong>
                Acceso completo, sin tarjeta de crédito.
              </span>
            </li>
            <li>
              <span className={rs.valueIcon}>
                <Check size={17} aria-hidden />
              </span>
              <span>
                <strong>Soporte en español</strong>
                Te ayudamos si necesitas dejar algo configurado.
              </span>
            </li>
          </ul>

          <div className={rs.previewCard}>
            <div className={rs.previewCardTop}>
              <span className={rs.previewMark}>V</span>
              <span>
                <strong>Tu primer PDF</strong>
                <small>Quedará listo con tus datos</small>
              </span>
              <CheckCircle2 size={18} aria-hidden />
            </div>
            <span className={rs.previewLine} />
            <span className={rs.previewLineShort} />
            <div className={rs.previewMeta}>
              <span>Empresa</span>
              <span>WhatsApp</span>
              <span>País</span>
            </div>
          </div>
        </aside>

        <div className={rs.card}>
          {verificationEmail ? (
            <section className={s.successState} aria-live="polite">
              <CheckCircle2 size={44} aria-hidden />
              <h2>Revisa tu correo para activar Ventora</h2>
              <p>
                Enviamos un enlace de un solo uso a <strong>{verificationEmail}</strong>.
                Tu empresa y el trial se crearÃ¡n reciÃ©n cuando confirmes ese correo.
              </p>
              <div className={s.successActions}>
                <Link href="/login" className={s.primaryButton}>
                  Ir al inicio de sesiÃ³n
                </Link>
              </div>
            </section>
          ) : (
            <>
              <Progress
                step={step}
                onBack={() => {
                  setError(null);
                  setStep("account");
                }}
              />

          {step === "account" ? (
            <form className={rs.form} onSubmit={handleAccountSubmit} noValidate>
              <header className={rs.header}>
                <h1>{copy.accountTitle}</h1>
                <p>{copy.accountSubtitle}</p>
              </header>

              <GoogleAuthButton
                label={copy.googlePrimary}
                loading={cargandoOAuth === "google"}
                disabled={disabled}
                onClick={() => void handleOAuthSignup("google")}
              />

              <div className={s.divider}>
                <span aria-hidden />
                <p>{copy.divider}</p>
                <span aria-hidden />
              </div>

              <p className={rs.formSectionTitle}>Usa tu correo electrónico</p>
              <div className={rs.fieldGrid}>
                <label className={s.field} htmlFor="nombre">
                  <span className={s.fieldLabel}>{copy.nameLabel}</span>
                  <span className={s.fieldControl}>
                    <UserRound size={18} aria-hidden />
                    <input
                      id="nombre"
                      className={s.fieldInput}
                      value={nombre}
                      onChange={(event) => {
                        setNombre(event.target.value);
                        setError(null);
                      }}
                      placeholder={copy.namePlaceholder}
                      autoComplete="name"
                      minLength={2}
                      maxLength={120}
                      required
                      disabled={disabled}
                    />
                  </span>
                </label>
                <label className={s.field} htmlFor="email">
                  <span className={s.fieldLabel}>{copy.emailLabel}</span>
                  <span className={s.fieldControl}>
                    <Mail size={18} aria-hidden />
                    <input
                      id="email"
                      className={s.fieldInput}
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError(null);
                      }}
                      placeholder={copy.emailPlaceholder}
                      autoComplete="email"
                      inputMode="email"
                      type="email"
                      maxLength={320}
                      required
                      disabled={disabled}
                    />
                  </span>
                </label>
                <label className={s.field} htmlFor="password">
                  <span className={s.fieldLabel}>{copy.passwordLabel}</span>
                  <span className={s.fieldControl}>
                    <LockKeyhole size={18} aria-hidden />
                    <input
                      id="password"
                      className={s.fieldInput}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError(null);
                      }}
                      autoComplete="new-password"
                      type={mostrarPassword ? "text" : "password"}
                      minLength={8}
                      required
                      disabled={disabled}
                    />
                    <button
                      className={s.passwordToggle}
                      type="button"
                      aria-label={
                        mostrarPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      onClick={() => setMostrarPassword((value) => !value)}
                    >
                      {mostrarPassword ? (
                        <EyeOff size={18} aria-hidden />
                      ) : (
                        <Eye size={18} aria-hidden />
                      )}
                    </button>
                  </span>
                  <span className={rs.fieldHint}>{copy.passwordHint}</span>
                </label>
                <label className={s.field} htmlFor="passwordConfirmation">
                  <span className={s.fieldLabel}>
                    {copy.passwordConfirmLabel}
                  </span>
                  <span className={s.fieldControl}>
                    <LockKeyhole size={18} aria-hidden />
                    <input
                      id="passwordConfirmation"
                      className={s.fieldInput}
                      value={passwordConfirmation}
                      onChange={(event) => {
                        setPasswordConfirmation(event.target.value);
                        setError(null);
                      }}
                      autoComplete="new-password"
                      type={mostrarConfirmacion ? "text" : "password"}
                      minLength={8}
                      required
                      disabled={disabled}
                    />
                    <button
                      className={s.passwordToggle}
                      type="button"
                      aria-label={
                        mostrarConfirmacion
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      onClick={() => setMostrarConfirmacion((value) => !value)}
                    >
                      {mostrarConfirmacion ? (
                        <EyeOff size={18} aria-hidden />
                      ) : (
                        <Eye size={18} aria-hidden />
                      )}
                    </button>
                  </span>
                </label>
              </div>

              {error ? (
                <div className={s.errorBox} role="alert">
                  <span className={s.errorMark} aria-hidden>
                    !
                  </span>
                  <span>{error}</span>
                </div>
              ) : null}
              <button
                type="submit"
                className={s.primaryButton}
                disabled={disabled}
              >
                {copy.accountSubmit}
                <ArrowRight size={19} aria-hidden />
              </button>
              <p className={rs.loginPrompt}>
                {copy.loginPrompt} <Link href="/login">{copy.loginAction}</Link>
              </p>
              <aside className={rs.securityNote}>
                <span className={rs.noteIcon}>
                  <ShieldCheck size={23} aria-hidden />
                </span>
                <span>
                  <strong>{copy.securityTitle}</strong>
                  {copy.securityText}
                </span>
              </aside>
              <p className={rs.terms}>
                {copy.accountTerms} <Link href="/terms">{copy.terms}</Link>{" "}
                {copy.and} <Link href="/privacy">{copy.privacy}</Link>
              </p>
            </form>
          ) : (
            <form
              className={rs.form}
              onSubmit={handleBusinessSubmit}
              noValidate
            >
              <header className={rs.header}>
                <h1>{copy.businessTitle}</h1>
                <p>{copy.businessSubtitle}</p>
              </header>

              <label className={s.field} htmlFor="empresaNombre">
                <span className={s.fieldLabel}>{copy.empresaLabel}</span>
                <span className={s.fieldControl}>
                  <Building2 size={18} aria-hidden />
                  <input
                    id="empresaNombre"
                    className={s.fieldInput}
                    value={empresaNombre}
                    onChange={(event) => {
                      setEmpresaNombre(event.target.value);
                      setError(null);
                    }}
                    placeholder={copy.empresaPlaceholder}
                    autoComplete="organization"
                    minLength={2}
                    maxLength={160}
                    required
                    disabled={disabled}
                  />
                </span>
              </label>
              <div className={rs.businessFieldGrid}>
                <label className={s.field} htmlFor="countryCode">
                  <span className={s.fieldLabel}>{copy.countryLabel}</span>
                  <span className={`${s.fieldControl} ${rs.selectControl}`}>
                    <Globe2 size={18} aria-hidden />
                    <select
                      id="countryCode"
                      className={s.fieldInput}
                      value={countryCode}
                      onChange={(event) => {
                        const nextCountry = event.target
                          .value as SupportedCountryCode;
                        setCountryCode(nextCountry);
                        setWhatsappLocal("");
                        setError(null);
                      }}
                      disabled={disabled}
                    >
                      {COUNTRY_PRESET_OPTIONS.map((country) => (
                        <option
                          key={country.countryCode}
                          value={country.countryCode}
                        >
                          {country.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={18} aria-hidden />
                  </span>
                </label>
                <label className={s.field} htmlFor="ciudadComuna">
                  <span className={s.fieldLabel}>{copy.ciudadLabel}</span>
                  <span className={s.fieldControl}>
                    <MapPin size={18} aria-hidden />
                    <input
                      id="ciudadComuna"
                      className={s.fieldInput}
                      value={ciudadComuna}
                      onChange={(event) => {
                        setCiudadComuna(event.target.value);
                        setError(null);
                      }}
                      placeholder={copy.ciudadPlaceholder}
                      autoComplete="address-level2"
                      maxLength={120}
                      disabled={disabled}
                    />
                  </span>
                </label>
              </div>
              <p className={`${rs.fieldHint} ${rs.businessFieldGridHint}`}>
                {copy.countryHint}
              </p>
              <label className={s.field} htmlFor="whatsapp">
                <span className={s.fieldLabel}>{copy.whatsappLabel}</span>
                <span className={`${s.fieldControl} ${rs.phoneControl}`}>
                  <Phone size={18} aria-hidden />
                  <span className={rs.phonePrefix}>
                    {selectedCountry.phoneCountryCode}
                  </span>
                  <input
                    ref={whatsappInputRef}
                    id="whatsapp"
                    name="whatsappLocal"
                    className={s.fieldInput}
                    value={whatsappLocal}
                    onChange={(event) => {
                      setWhatsappLocal(
                        sanitizeAuthWhatsappLocalInput(event.target.value),
                      );
                      setError(null);
                    }}
                    placeholder={selectedCountry.phonePlaceholder.replace(
                      /^\+\d+\s*/u,
                      "",
                    )}
                    autoComplete="tel-national"
                    inputMode="numeric"
                    type="tel"
                    required
                    disabled={disabled}
                  />
                </span>
                <span className={rs.fieldHint}>{copy.whatsappHint}</span>
              </label>

              {error ? (
                <div className={s.errorBox} role="alert">
                  <span className={s.errorMark} aria-hidden>
                    !
                  </span>
                  <span>{error}</span>
                </div>
              ) : null}
              <button
                type="submit"
                className={s.primaryButton}
                disabled={disabled}
              >
                <span className={s.buttonContent}>
                  {cargando ? <span className={s.spinner} aria-hidden /> : null}
                  {cargando ? copy.submitting : copy.businessSubmit}
                </span>
                <ArrowRight size={19} aria-hidden />
              </button>
              <p className={rs.trialStarts}>
                <CheckCircle2 size={19} aria-hidden />
                {copy.trialStarts}
              </p>
              <aside className={rs.trialCard}>
                <span className={rs.noteIcon}>
                  <Gift size={24} aria-hidden />
                </span>
                <span>
                  <strong>{copy.trialTitle}</strong>
                  <ul>
                    {copy.trialItems.map((item) => (
                      <li key={item}>
                        <CheckCircle2 size={16} aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </span>
              </aside>
            </form>
          )}
            </>
          )}
        </div>

        <aside className={rs.assistance}>
          <span>
            <strong>{copy.assistanceTitle}</strong>
            {copy.assistanceText}
          </span>
          <a
            href={REGISTRATION_SUPPORT_WHATSAPP_HREF}
          >
            {copy.assistanceAction}
            <ArrowRight size={17} aria-hidden />
          </a>
        </aside>
        <footer className={rs.footer}>
          <span>
            <ShieldCheck size={18} aria-hidden />
            Datos protegidos
          </span>
          <span>
            <LockKeyhole size={18} aria-hidden />
            Sin compromiso
          </span>
          <span>
            <Phone size={18} aria-hidden />
            Soporte en español
          </span>
        </footer>
      </section>
    </main>
  );
}

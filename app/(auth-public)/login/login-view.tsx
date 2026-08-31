"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, PlayCircle, RefreshCcw } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { GoogleAuthButton } from "../_components/google-auth-button";
import type { AuthOAuthProvider } from "@/features/auth/types/auth";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { authDeviceRecoveryService } from "@/features/auth/services/auth-device-recovery.service";
import { authLoginDiagnosticsService } from "@/features/auth/services/auth-login-diagnostics.service";
import { authLoginRateLimitService } from "@/features/auth/services/auth-login-rate-limit.service";
import {
  AUTH_COOKIE_NOT_READY_SENTINEL,
  AUTH_LOGIN_TIMEOUT_SENTINEL,
  classifyAuthLoginError,
  getAuthLoginErrorDiagnosticDetail,
  getAuthLoginErrorCopy,
} from "@/features/auth/services/auth-login-error.service";
import type { AuthLoginErrorCode } from "@/features/auth/types/auth";
import { VENTORA_CONTACT } from "@/constants/ventora-brand";
import s from "./login.module.css";

interface LoginViewProps {
  oauthError: boolean;
  oauthNoEmailError: boolean;
  identityConflictError: boolean;
  nextPath: string | null;
  appResetDone: boolean;
}

const copy = {
  brand: "Ventora",
  title: "Bienvenido",
  subtitle: "Ingresa a tu panel comercial y responde con mas orden desde cualquier lugar.",
  emailLabel: "Correo",
  emailPlaceholder: "tu@empresa.cl",
  passwordLabel: "Contrasena",
  passwordPlaceholder: "Ingresa tu contrasena",
  rememberSession: "Mantener sesion",
  forgotPassword: "Olvide mi contrasena",
  submit: "Iniciar sesion",
  submitting: "Ingresando...",
  signupPrompt: "Aun no tienes acceso?",
  signupAction: "Solicitar cuenta",
  oauthError:
    "No pudimos completar el acceso social. Intenta con tu correo y contrasena.",
  localHint:
    "En este computador usas las mismas cuentas que en ventorap.cl. Si Google no vuelve, agrega http://localhost:3000/auth/callback en Supabase Auth.",
  oauthNoEmailError:
    "Tu cuenta social no compartio un correo. Usa otra cuenta o entra con correo y contrasena.",
  identityConflictError:
    "Este correo ya esta vinculado a otra cuenta de acceso. Usa el metodo con el que te dieron acceso o contactanos.",
  googleContinue: "Continuar con Google",
  divider: "o",
  authCodeLabel: "Codigo de acceso:",
  passwordShow: "Mostrar",
  passwordHide: "Ocultar",
  appResetDone:
    "Reiniciamos la app en este dispositivo. Intenta entrar de nuevo desde aqui.",
  recoveryText: "Si la app falla solo en este celular, puedes reiniciarla.",
  recoveryHint: "No borra tus datos.",
  recoveryAction: "Reiniciar esta app",
  recovering: "Reiniciando...",
  installHelpTitle: "¿Primera vez usando Ventora?",
  installHelpText: "Mira como usar Ventora desde tu celular.",
  androidVideo: "Video Android",
  iphoneVideo: "Video iPhone",
  diagnosticLabel: "Detalle tecnico:",
  diagnosticCopy: "Copiar diagnostico",
  diagnosticCopied: "Diagnostico copiado",
  rateLimitHelper: "Espera y vuelve a intentar sin repetir toques.",
  visualEyebrow: "Arquitectura comercial premium",
  visualTitle: "Gestiona tus cotizaciones con precision y profesionalismo",
  visualDescription:
    "Pensado para empresas de vidrios y aluminio que necesitan una presencia seria, movil y lista para responder mejor.",
};

const LOGIN_TIMEOUT_MS = 12000;
const LOGIN_COOKIE_READY_TIMEOUT_MS = 4000;
const LOGIN_COOKIE_POLL_INTERVAL_MS = 120;
const ANDROID_INSTALL_VIDEO_URL = "https://example.com/ventora-android";
const IPHONE_INSTALL_VIDEO_URL = "https://example.com/ventora-iphone";

type BrowserWindowWithIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

function waitForLoginTimeout() {
  return new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(new Error(AUTH_LOGIN_TIMEOUT_SENTINEL));
    }, LOGIN_TIMEOUT_MS);
  });
}

function hasSupabaseAuthCookie() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .some((chunk) => {
      const [name] = chunk.split("=", 1);
      return (
        name.startsWith("sb-") ||
        name.startsWith("supabase-auth-token") ||
        name.includes("-auth-token")
      );
    });
}

async function waitForAuthCookieReady() {
  if (typeof window === "undefined") {
    return;
  }

  if (hasSupabaseAuthCookie()) {
    return;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < LOGIN_COOKIE_READY_TIMEOUT_MS) {
    await new Promise((resolve) =>
      window.setTimeout(resolve, LOGIN_COOKIE_POLL_INTERVAL_MS)
    );

    if (hasSupabaseAuthCookie()) {
      return;
    }
  }

  throw new Error(AUTH_COOKIE_NOT_READY_SENTINEL);
}

function scheduleLoginPrefetch(callback: () => void, delayMs = 350) {
  if (typeof window === "undefined") {
    callback();
    return () => undefined;
  }

  const browserWindow = window as BrowserWindowWithIdleCallback;

  if (typeof browserWindow.requestIdleCallback === "function") {
    const handle = browserWindow.requestIdleCallback(callback, {
      timeout: Math.max(1200, delayMs),
    });

    return () => {
      browserWindow.cancelIdleCallback?.(handle);
    };
  }

  const timeoutId = window.setTimeout(callback, delayMs);
  return () => window.clearTimeout(timeoutId);
}

function getPlatformMode() {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches
  ) {
    return "standalone";
  }

  return "browser";
}

function formatRateLimitRemaining(remainingMs: number) {
  const totalSeconds = Math.max(Math.ceil(remainingMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function LoginView({
  oauthError,
  oauthNoEmailError,
  identityConflictError,
  nextPath,
  appResetDone,
}: LoginViewProps) {
  const { signIn, signInWithGoogle } = useAuth({ passive: true });
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [cargandoOAuth, setCargandoOAuth] = useState<AuthOAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthLoginErrorCode | null>(null);
  const [errorDiagnostic, setErrorDiagnostic] = useState<string | null>(null);
  const [copiedDiagnostic, setCopiedDiagnostic] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [isRecoveringApp, setIsRecoveringApp] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [rateLimitRemainingMs, setRateLimitRemainingMs] = useState(0);
  const [showLocalHint, setShowLocalHint] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    setShowLocalHint(hostname === "localhost" || hostname === "127.0.0.1");
  }, []);

  useEffect(() => {
    return scheduleLoginPrefetch(() => {
      router.prefetch("/dashboard");
    });
  }, [router]);

  const handleOAuthSignIn = async (provider: AuthOAuthProvider) => {
    if (cargandoOAuth || cargando) {
      return;
    }

    setCargandoOAuth(provider);
    setError(null);
    setErrorCode(null);
    setErrorDiagnostic(null);

    googleTagService.trackEvent(`${provider}_oauth_started`, {
      event_category: "auth",
      event_label: "login",
      next_path: nextPath ?? "/dashboard",
      platform_mode: getPlatformMode(),
      oauth_provider: provider,
    });

    try {
      await signInWithGoogle({
        intent: "login",
        nextPath,
      });
    } catch {
      setError(copy.oauthError);
      setErrorCode("unknown");
      googleTagService.trackEvent("login_failure", {
        event_category: "auth",
        event_label: `${provider}_oauth`,
        next_path: nextPath ?? "/dashboard",
        platform_mode: getPlatformMode(),
        oauth_provider: provider,
      });
      setCargandoOAuth(null);
    }
  };

  useEffect(() => {
    const syncRateLimit = () => {
      const activeUntil = authLoginRateLimitService.readUntil();
      setRateLimitUntil(activeUntil);
      setRateLimitRemainingMs(
        activeUntil ? authLoginRateLimitService.getRemainingMs() : 0
      );
    };

    syncRateLimit();

    const intervalId = window.setInterval(syncRateLimit, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleRecoverApp = async () => {
    setIsRecoveringApp(true);
    googleTagService.trackEvent("login_app_recovery", {
      event_category: "auth",
      event_label: "manual_reset",
      next_path: nextPath ?? "/dashboard",
      platform_mode: getPlatformMode(),
    });
    await authDeviceRecoveryService.resetCurrentDeviceAppState();
  };

  const handleCopyDiagnostic = async () => {
    const latestEntry = authLoginDiagnosticsService.readLatest();
    const snapshot = authLoginDiagnosticsService.buildSupportSnapshot(latestEntry);

    if (!snapshot || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(snapshot);
    setCopiedDiagnostic(true);
    window.setTimeout(() => {
      setCopiedDiagnostic(false);
    }, 1800);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const currentRateLimitUntil = authLoginRateLimitService.readUntil();

    if (currentRateLimitUntil) {
      setRateLimitUntil(currentRateLimitUntil);
      setRateLimitRemainingMs(authLoginRateLimitService.getRemainingMs());
      setError(getAuthLoginErrorCopy("rate_limited", { blocked: true }));
      setErrorCode("rate_limited");
      setErrorDiagnostic(null);
      return;
    }

    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setCargando(true);
    setError(null);
    setErrorCode(null);
    setErrorDiagnostic(null);
    setCopiedDiagnostic(false);
    let shouldReleaseSubmitLock = true;
    let loginSucceeded = false;

    const formData = new FormData(e.currentTarget);
    const submittedCorreo = String(formData.get("correo") ?? correo);
    const submittedPassword = String(formData.get("password") ?? password);

    if (submittedCorreo !== correo) {
      setCorreo(submittedCorreo);
    }

    if (submittedPassword !== password) {
      setPassword(submittedPassword);
    }

    authLoginDiagnosticsService.record({
      type: "attempt",
      code: "none",
      email: submittedCorreo,
      nextPath,
      detail: mantenerSesion ? "mantener-sesion" : "sesion-normal",
    });

    try {
      await Promise.race([
        signIn({
          email: submittedCorreo,
          password: submittedPassword,
        }),
        waitForLoginTimeout(),
      ]);
      await waitForAuthCookieReady();
      authLoginDiagnosticsService.record({
        type: "success",
        code: "none",
        email: submittedCorreo,
        nextPath,
      });
      googleTagService.trackEvent("login_success", {
        event_category: "auth",
        event_label: "email_password",
        next_path: nextPath ?? "/dashboard",
        remember_session: mantenerSesion,
        platform_mode: getPlatformMode(),
      });
      authLoginRateLimitService.clear();
      setRateLimitUntil(null);
      setRateLimitRemainingMs(0);
      loginSucceeded = true;
      shouldReleaseSubmitLock = false;
    } catch (signInError) {
      const classifiedError = classifyAuthLoginError(signInError);
      const detail =
        signInError instanceof Error ? signInError.message : "error-desconocido";

      const diagnosticEntry = authLoginDiagnosticsService.record({
        type:
          classifiedError.code === "cookie_not_ready"
            ? "cookie_wait_timeout"
            : "failure",
        code: classifiedError.code,
        email: submittedCorreo,
        nextPath,
        detail,
      });
      googleTagService.trackEvent("login_failure", {
        event_category: "auth",
        event_label: classifiedError.code,
        next_path: nextPath ?? "/dashboard",
        remember_session: mantenerSesion,
        online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
        platform_mode: getPlatformMode(),
      });

      let nextBlockedUntil: number | null = null;
      let nextRemainingMs = 0;

      if (classifiedError.code === "rate_limited") {
        const nextState = authLoginRateLimitService.registerRateLimitedResponse();
        nextBlockedUntil = nextState.blockedUntil;
        nextRemainingMs = nextBlockedUntil
          ? authLoginRateLimitService.getRemainingMs()
          : 0;
      } else if (rateLimitUntil) {
        authLoginRateLimitService.clear();
      }

      setError(
        getAuthLoginErrorCopy(classifiedError.code, {
          blocked: Boolean(nextBlockedUntil),
        })
      );
      setErrorCode(classifiedError.code);
      setErrorDiagnostic(
        getAuthLoginErrorDiagnosticDetail(signInError) ?? diagnosticEntry.detail
      );

      if (classifiedError.code === "rate_limited") {
        setRateLimitUntil(nextBlockedUntil);
        setRateLimitRemainingMs(nextRemainingMs);
      } else if (rateLimitUntil) {
        setRateLimitUntil(null);
        setRateLimitRemainingMs(0);
      }
    } finally {
      if (shouldReleaseSubmitLock) {
        submitLockRef.current = false;
        setCargando(false);
      }
    }

    if (loginSucceeded) {
      const redirectTarget =
        nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";

      window.location.replace(redirectTarget);
    }
  };

  return (
    <main className={s.root}>
      <section className={s.formPanel}>
        <div className={s.formShell}>
          <Link href="/" className={s.brand} aria-label={copy.brand}>
            <Image
              src="/brand/ventora-logo-premium-dark.svg"
              alt="Ventora"
              width={348}
              height={82}
              className={s.brandLogo}
              unoptimized
            />
          </Link>

          <div className={s.formCard}>
            <header className={s.formHeader}>
              <h1 className={s.formTitle}>{copy.title}</h1>
              <p className={s.formSubtitle}>{copy.subtitle}</p>
              {showLocalHint ? (
                <p className={s.localHint} role="note">
                  {copy.localHint}
                </p>
              ) : null}
            </header>

            <form
              className={s.form}
              onSubmit={onSubmit}
              noValidate
              method="post"
              action="javascript:void(0)"
            >
              <GoogleAuthButton
                label={copy.googleContinue}
                loading={cargandoOAuth === "google"}
                disabled={cargando || Boolean(cargandoOAuth) || rateLimitRemainingMs > 0}
                onClick={() => {
                  void handleOAuthSignIn("google");
                }}
              />

              <div className={s.divider}>
                <span aria-hidden />
                <p>{copy.divider}</p>
                <span aria-hidden />
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel} htmlFor="correo">
                  {copy.emailLabel}
                </label>
                <div className={s.fieldControl}>
                  <Mail size={18} aria-hidden />
                  <input
                    id="correo"
                    name="correo"
                    type="email"
                    className={s.fieldInput}
                    placeholder={copy.emailPlaceholder}
                    value={correo}
                    onChange={(e) => {
                      setCorreo(e.target.value);
                      setError(null);
                      setErrorCode(null);
                      setErrorDiagnostic(null);
                    }}
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </div>
              </div>

              <div className={s.field}>
                <label className={s.fieldLabel} htmlFor="password">
                  {copy.passwordLabel}
                </label>
                <div className={s.fieldControl}>
                  <Lock size={18} aria-hidden />
                  <input
                    id="password"
                    name="password"
                    type={mostrarPassword ? "text" : "password"}
                    className={s.fieldInput}
                    placeholder={copy.passwordPlaceholder}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                      setErrorCode(null);
                      setErrorDiagnostic(null);
                    }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className={s.passwordToggle}
                    onClick={() => setMostrarPassword((current) => !current)}
                    aria-label={mostrarPassword ? copy.passwordHide : copy.passwordShow}
                    aria-pressed={mostrarPassword}
                  >
                    {mostrarPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </div>
              </div>

              <div className={s.utilityRow}>
                <label className={s.checkboxLabel} htmlFor="mantener-sesion">
                  <input
                    id="mantener-sesion"
                    type="checkbox"
                    checked={mantenerSesion}
                    onChange={(e) => setMantenerSesion(e.target.checked)}
                  />
                  <span className={s.checkboxBox} aria-hidden />
                  <span>{copy.rememberSession}</span>
                </label>

                <a
                  className={s.textLink}
                  href={`${VENTORA_CONTACT.supportMailto}?subject=Recuperar%20acceso`}
                >
                  {copy.forgotPassword}
                </a>
              </div>

              {(oauthError || oauthNoEmailError || identityConflictError || error) && (
                <div className={s.errorBox} role="alert" aria-live="polite">
                  <span className={s.errorMark} aria-hidden>
                    !
                  </span>
                  <span>
                    {error ??
                      (oauthNoEmailError
                        ? copy.oauthNoEmailError
                        : identityConflictError
                          ? copy.identityConflictError
                          : copy.oauthError)}
                    {errorCode ? (
                      <>
                        {" "}
                        <strong>
                          {copy.authCodeLabel} {errorCode}
                        </strong>
                      </>
                    ) : null}
                    {errorCode === "unknown" || errorCode === "device_storage_blocked" ? (
                      <>
                        {" "}
                        {errorDiagnostic ? (
                          <span className={s.errorDiagnostic}>
                            {copy.diagnosticLabel} {errorDiagnostic}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className={s.errorDiagnosticButton}
                          onClick={handleCopyDiagnostic}
                        >
                          {copiedDiagnostic
                            ? copy.diagnosticCopied
                            : copy.diagnosticCopy}
                        </button>
                      </>
                    ) : null}
                  </span>
                </div>
              )}

              {appResetDone ? (
                <div className={s.successBox} role="status" aria-live="polite">
                  <span className={s.successMark} aria-hidden>
                    ✓
                  </span>
                  <span>{copy.appResetDone}</span>
                </div>
              ) : null}

              <button
                type="submit"
                className={s.primaryButton}
                disabled={cargando || Boolean(cargandoOAuth) || rateLimitRemainingMs > 0}
              >
                <span className={s.buttonContent}>
                  {cargando ? <span className={s.spinner} aria-hidden /> : null}
                  {cargando
                    ? copy.submitting
                    : rateLimitRemainingMs > 0
                    ? `Espera ${formatRateLimitRemaining(rateLimitRemainingMs)}`
                    : copy.submit}
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>

              {rateLimitRemainingMs > 0 ? (
                <p className={s.helperText}>{copy.rateLimitHelper}</p>
              ) : null}
            </form>

            <section className={s.recoveryCard} aria-label={copy.recoveryAction}>
              <div className={s.recoveryCopy}>
                <p className={s.recoveryText}>{copy.recoveryText}</p>
                <p className={s.recoveryHint}>{copy.recoveryHint}</p>
              </div>
              <button
                type="button"
                className={s.recoveryButton}
                disabled={isRecoveringApp}
                onClick={handleRecoverApp}
              >
                <RefreshCcw size={16} aria-hidden />
                {isRecoveringApp ? copy.recovering : copy.recoveryAction}
              </button>
            </section>

            <section className={s.installHelp} aria-label={copy.installHelpTitle}>
              <div>
                <p className={s.installHelpTitle}>{copy.installHelpTitle}</p>
                <p className={s.installHelpText}>{copy.installHelpText}</p>
              </div>
              <div className={s.installHelpActions}>
                <a href={ANDROID_INSTALL_VIDEO_URL} target="_blank" rel="noreferrer">
                  <PlayCircle size={15} aria-hidden />
                  {copy.androidVideo}
                </a>
                <a href={IPHONE_INSTALL_VIDEO_URL} target="_blank" rel="noreferrer">
                  <PlayCircle size={15} aria-hidden />
                  {copy.iphoneVideo}
                </a>
              </div>
            </section>

            <p className={s.signupText}>
              <span>{copy.signupPrompt}</span>{" "}
              <Link href="/registro">{copy.signupAction}</Link>
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
          <p className={s.visualEyebrow}>{copy.visualEyebrow}</p>
          <h2 className={s.visualTitle}>{copy.visualTitle}</h2>
          <p className={s.visualDescription}>{copy.visualDescription}</p>
        </div>
      </section>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail, RefreshCcw } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { googleTagService } from "@/features/analytics/services/google-tag.service";
import { authDeviceRecoveryService } from "@/features/auth/services/auth-device-recovery.service";
import { authLoginDiagnosticsService } from "@/features/auth/services/auth-login-diagnostics.service";
import {
  AUTH_COOKIE_NOT_READY_SENTINEL,
  AUTH_LOGIN_TIMEOUT_SENTINEL,
  classifyAuthLoginError,
  getAuthLoginErrorCopy,
} from "@/features/auth/services/auth-login-error.service";
import type { AuthLoginErrorCode } from "@/features/auth/types/auth";
import { VENTORA_CONTACT } from "@/constants/ventora-brand";
import s from "./login.module.css";

interface LoginViewProps {
  oauthError: boolean;
  nextPath: string | null;
  appResetDone: boolean;
}

const copy = {
  brand: "Ventora",
  title: "Bienvenido",
  subtitle: "Accede a tu cuenta y gestiona tus cotizaciones",
  emailLabel: "Email",
  emailPlaceholder: "tu@empresa.cl",
  passwordLabel: "Password",
  passwordPlaceholder: "Ingresa tu contrasena",
  rememberSession: "Mantener sesion",
  forgotPassword: "Olvide mi contrasena",
  submit: "Iniciar sesion",
  submitting: "Ingresando...",
  signupPrompt: "No tienes cuenta?",
  signupAction: "Crear cuenta",
  oauthError:
    "No pudimos completar el acceso con Google. Intenta con tu correo y contrasena.",
  authCodeLabel: "Codigo de acceso:",
  passwordShow: "Mostrar",
  passwordHide: "Ocultar",
  appResetDone:
    "Reiniciamos la app en este dispositivo. Intenta entrar de nuevo desde aqui.",
  recoveryText: "Si la app falla solo en este celular, puedes reiniciarla.",
  recoveryHint: "No borra tus datos.",
  recoveryAction: "Reiniciar esta app",
  recovering: "Reiniciando...",
  visualTitle: "Cotiza rapido, sin errores y desde cualquier lugar.",
};

const LOGIN_TIMEOUT_MS = 12000;
const LOGIN_COOKIE_READY_TIMEOUT_MS = 4000;
const LOGIN_COOKIE_POLL_INTERVAL_MS = 120;

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

export default function LoginView({
  oauthError,
  nextPath,
  appResetDone,
}: LoginViewProps) {
  const { signIn } = useAuth();
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AuthLoginErrorCode | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [isRecoveringApp, setIsRecoveringApp] = useState(false);

  useEffect(() => {
    return scheduleLoginPrefetch(() => {
      router.prefetch("/dashboard");
    });
  }, [router]);

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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setErrorCode(null);

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
    } catch (signInError) {
      const classifiedError = classifyAuthLoginError(signInError);
      const detail =
        signInError instanceof Error ? signInError.message : "error-desconocido";

      authLoginDiagnosticsService.record({
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

      setError(getAuthLoginErrorCopy(classifiedError.code));
      setErrorCode(classifiedError.code);
      setCargando(false);
      return;
    }

    const redirectTarget =
      nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";

    window.location.replace(redirectTarget);
  };

  return (
    <main className={s.root}>
      <section className={s.formPanel}>
        <div className={s.formShell}>
          <Link href="/" className={s.brand} aria-label={copy.brand}>
            <Image
              src="/brand/ventora-logo-light.svg"
              alt="Ventora"
              width={170}
              height={34}
              priority
              className={s.brandLogo}
            />
          </Link>

          <div className={s.formCard}>
            <header className={s.formHeader}>
              <h1 className={s.formTitle}>{copy.title}</h1>
              <p className={s.formSubtitle}>{copy.subtitle}</p>
            </header>

            <form
              className={s.form}
              onSubmit={onSubmit}
              noValidate
              method="post"
              action="javascript:void(0)"
            >
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

              {(oauthError || error) && (
                <div className={s.errorBox} role="alert" aria-live="polite">
                  <span className={s.errorMark} aria-hidden>
                    !
                  </span>
                  <span>
                    {error ?? copy.oauthError}
                    {errorCode ? (
                      <>
                        {" "}
                        <strong>
                          {copy.authCodeLabel} {errorCode}
                        </strong>
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
                disabled={cargando}
              >
                <span className={s.buttonContent}>
                  {cargando ? <span className={s.spinner} aria-hidden /> : null}
                  {cargando ? copy.submitting : copy.submit}
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>
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
          </div>

          <p className={s.signupText}>
            <span>{copy.signupPrompt}</span>{" "}
            <Link href="/planes">{copy.signupAction}</Link>
          </p>
        </div>
      </section>

      <section className={s.visualPanel} aria-hidden>
        <Image
          src="/brand/loginpng.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 920px) 100vw, 60vw"
          className={s.visualImage}
        />
        <div className={s.visualOverlay} />

        <div className={s.visualCopy}>
          <h2 className={s.visualTitle}>{copy.visualTitle}</h2>
        </div>
      </section>
    </main>
  );
}

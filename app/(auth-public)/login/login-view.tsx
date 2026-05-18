"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { VENTORA_CONTACT } from "@/constants/ventora-brand";
import s from "./login.module.css";

interface LoginViewProps {
  oauthError: boolean;
  nextPath: string | null;
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
  credentialError: "Correo o contrasena incorrectos",
  missingProfileError:
    "Este usuario no quedo vinculado a una empresa. Entra con un usuario valido o termina de vincularlo en base de datos.",
  brokenDatabasePermissionError:
    "Tu acceso esta bien, pero hubo un problema interno al abrir tu espacio. Intenta otra vez en unos segundos.",
  timeoutError:
    "No pudimos abrir tu sesion en este dispositivo. Cierra la ventana y vuelve a intentar.",
  visualTitle: "Cotiza rapido, sin errores y desde cualquier lugar.",
};

const LOGIN_TIMEOUT_MS = 12000;

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
      reject(new Error("LOGIN_TIMEOUT"));
    }, LOGIN_TIMEOUT_MS);
  });
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

export default function LoginView({ oauthError, nextPath }: LoginViewProps) {
  const { signIn } = useAuth();
  const router = useRouter();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return scheduleLoginPrefetch(() => {
      router.prefetch("/dashboard");
    });
  }, [router]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const submittedCorreo = String(formData.get("correo") ?? correo);
    const submittedPassword = String(formData.get("password") ?? password);

    if (submittedCorreo !== correo) {
      setCorreo(submittedCorreo);
    }

    if (submittedPassword !== password) {
      setPassword(submittedPassword);
    }

    try {
      await Promise.race([
        signIn({
          email: submittedCorreo,
          password: submittedPassword,
        }),
        waitForLoginTimeout(),
      ]);
    } catch (signInError) {
      const rawMessage =
        signInError instanceof Error ? signInError.message.toLowerCase() : "";
      const message =
        rawMessage.includes("login_timeout")
          ? copy.timeoutError
          : rawMessage.includes("get_org_id")
          ? copy.brokenDatabasePermissionError
          : rawMessage.includes("no esta vinculado a una empresa")
          ? copy.missingProfileError
          : copy.credentialError;

      setError(message);
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
                    type="password"
                    className={s.fieldInput}
                    placeholder={copy.passwordPlaceholder}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    autoComplete="current-password"
                    required
                  />
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
                  <span>{error ?? copy.oauthError}</span>
                </div>
              )}

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

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { useAuth } from "@/hooks/useAuth";
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
  passwordPlaceholder: "Ingresa tu contrase\u00f1a",
  rememberSession: "Mantener sesi\u00f3n",
  forgotPassword: "Olvid\u00e9 mi contrase\u00f1a",
  submit: "Iniciar sesi\u00f3n",
  submitting: "Ingresando...",
  divider: "O contin\u00faa con",
  google: "Continuar con Google",
  signupPrompt: "\u00bfNo tienes cuenta?",
  signupAction: "Crear cuenta",
  oauthError:
    "No pudimos completar el acceso con Google. Intenta con tu correo y contrase\u00f1a.",
  credentialError: "Correo o contrase\u00f1a incorrectos",
  googleHelper: "Acceso con Google disponible cuando tu empresa habilite OAuth.",
  visualTitle: "Cotiza rápido, sin errores y desde cualquier lugar.",
};

export default function LoginView({ oauthError, nextPath }: LoginViewProps) {
  const router = useRouter();
  const { signIn } = useAuth();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      await signIn({
        email: correo,
        password,
      });
    } catch {
      setError(copy.credentialError);
      setCargando(false);
      return;
    }

    const redirectTarget =
      nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";

    router.push(redirectTarget);
    router.refresh();
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

            <form className={s.form} onSubmit={onSubmit} noValidate>
              <div className={s.field}>
                <label className={s.fieldLabel} htmlFor="correo">
                  {copy.emailLabel}
                </label>
                <div className={s.fieldControl}>
                  <Mail size={18} aria-hidden />
                  <input
                    id="correo"
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
                  href="mailto:soporte@cotizapro.cl?subject=Recuperar%20acceso"
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

              <button type="submit" className={s.primaryButton} disabled={cargando}>
                <span className={s.buttonContent}>
                  {cargando ? <span className={s.spinner} aria-hidden /> : null}
                  {cargando ? copy.submitting : copy.submit}
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>

              <div className={s.divider} aria-hidden>
                <span />
                <p>{copy.divider}</p>
                <span />
              </div>

              <button type="button" className={s.googleButton} disabled>
                <FcGoogle size={20} aria-hidden />
                <span>{copy.google}</span>
              </button>

              <p className={s.helperText}>{copy.googleHelper}</p>
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
